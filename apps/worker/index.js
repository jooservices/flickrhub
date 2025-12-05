const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const amqp = require('amqplib');
const Redis = require('ioredis');
const { TokenStore } = require('../../packages/core/token-store');
const { JobStore } = require('../../packages/core/job-store');
const { FlickrClient } = require('../../packages/flickr-client');
const { MockFlickrClient } = require('../../packages/flickr-client/mock');
const { sendObservabilityLog } = require('../../packages/logger/observability');
const { config } = require('../../packages/config');

const { createProcessor } = require('./processor');

const redisUrl = config.redisUrl;
const flickrKey = config.flickr.key;
const flickrSecret = config.flickr.secret;
const queueName = process.env.QUEUE_NAME || config.worker.queueName || 'flickr_rest';
const maxAttemptsDefault = config.jobs.retryAttempts;
const concurrencyDefault = config.worker.concurrency;
const mockFlickr = process.env.MOCK_FLICKR === 'true';
const queueConcurrency = (() => {
  if (queueName === 'flickr_rest' && config.worker.perQueue.rest) return config.worker.perQueue.rest;
  if (queueName === 'flickr_upload' && config.worker.perQueue.upload) return config.worker.perQueue.upload;
  if (queueName === 'flickr_replace' && config.worker.perQueue.replace) return config.worker.perQueue.replace;
  return concurrencyDefault;
})();
const rabbitUrl = config.rabbitUrl;
const dlqName = 'flickr_dlq';
const callbackEnabled = config.jobs.callbackEnabled !== false;
const callbackRetryAttempts = config.jobs.callbackRetryAttempts;
const callbackRetryDelayMs = config.jobs.callbackRetryDelayMs;
const perSecondLimit = config.rateLimit.perSecond || 0;
const perSecondPrefix = config.rateLimit.perSecondPrefix || 'flickrhub:ratelimit:sec:';

const tokenStore = new TokenStore();
const flickr = mockFlickr
  ? new MockFlickrClient({ apiKey: flickrKey, apiSecret: flickrSecret })
  : new FlickrClient({ apiKey: flickrKey, apiSecret: flickrSecret });
const redisClient = new Redis(redisUrl);
const jobStore = new JobStore({
  ttlCompleteDays: config.jobs.ttlCompleteDays,
  ttlFailDays: config.jobs.ttlFailDays,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const truncate = (str, max = 4000) => (str && str.length > max ? `${str.slice(0, max)}…` : str);

const checkPerSecond = async (userId) => {
  if (!perSecondLimit || perSecondLimit <= 0) return { ok: true };
  const nowSec = Math.floor(Date.now() / 1000);
  const key = `${perSecondPrefix}${userId}:${nowSec}`;
  try {
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, 2);
    }
    if (count > perSecondLimit) {
      return { ok: false, count };
    }
    return { ok: true, count };
  } catch (err) {
    return { ok: true };
  }
};

const processor = createProcessor({
  tokenStore,
  flickr,
  redisClient,
  jobStore,
  config,
  queueName,
  maxAttemptsDefault,
});

const sendCallback = async ({ callbackUrl, callbackSecret, body }) => {
  if (!callbackEnabled || !callbackUrl) return { sent: false, reason: 'disabled_or_missing' };
  const json = JSON.stringify(body);
  const headers = { 'Content-Type': 'application/json' };
  if (callbackSecret) {
    const sig = crypto.createHmac('sha256', callbackSecret).update(json).digest('hex');
    headers['X-Signature'] = sig;
  }

  const callbackStartTime = Date.now();

  await sendObservabilityLog({
    level: 'INFO',
    kind: 'SYSTEM',
    event: 'callback_started',
    message: `Starting callback for job ${body.job_id}`,
    context: { user_id: body.user_id, job_id: body.job_id, trace_id: body.trace_id },
    payload: {
      callback_url: callbackUrl.substring(0, 100),
      state: body.state,
      has_secret: !!callbackSecret,
    },
    tags: ['callback', 'start'],
  }).catch(() => { });

  for (let attempt = 1; attempt <= callbackRetryAttempts; attempt += 1) {
    try {
      const res = await fetch(callbackUrl, { method: 'POST', headers, body: json });
      const latency = Date.now() - callbackStartTime;
      if (res.ok) {
        await sendObservabilityLog({
          level: 'INFO',
          kind: 'SYSTEM',
          event: 'callback_success',
          message: `Callback sent successfully for job ${body.job_id}`,
          context: { user_id: body.user_id, job_id: body.job_id, trace_id: body.trace_id },
          payload: {
            http_status: res.status,
            attempts: attempt,
            latency_ms: latency,
          },
          tags: ['callback', 'success'],
        }).catch(() => { });
        return { sent: true, status: res.status, attempts: attempt };
      }
      await sendObservabilityLog({
        level: 'WARN',
        kind: 'SYSTEM',
        event: 'callback_failure',
        message: `Callback POST returned non-OK status for job ${body.job_id}`,
        context: { user_id: body.user_id, job_id: body.job_id, trace_id: body.trace_id },
        payload: {
          http_status: res.status,
          attempts: attempt,
          max_attempts: callbackRetryAttempts,
        },
        tags: ['callback', 'failure'],
      }).catch(() => { });
    } catch (err) {
      await sendObservabilityLog({
        level: 'WARN',
        kind: 'SYSTEM',
        event: 'callback_failure',
        message: `Callback POST failed for job ${body.job_id}: ${err.message}`,
        context: { user_id: body.user_id, job_id: body.job_id, trace_id: body.trace_id },
        payload: {
          error: err.message,
          attempts: attempt,
          max_attempts: callbackRetryAttempts,
        },
        tags: ['callback', 'failure'],
      }).catch(() => { });

      if (attempt === callbackRetryAttempts) {
        await sendObservabilityLog({
          level: 'ERROR',
          kind: 'SYSTEM',
          event: 'callback_exhausted',
          message: `Callback exhausted all retries for job ${body.job_id}`,
          context: { user_id: body.user_id, job_id: body.job_id, trace_id: body.trace_id },
          payload: {
            error: err.message,
            attempts: attempt,
            max_attempts: callbackRetryAttempts,
          },
          tags: ['callback', 'exhausted'],
        }).catch(() => { });
        return { sent: false, reason: err.message, attempts: attempt };
      }
    }
    if (attempt < callbackRetryAttempts) await sleep(callbackRetryDelayMs);
  }

  await sendObservabilityLog({
    level: 'ERROR',
    kind: 'SYSTEM',
    event: 'callback_exhausted',
    message: `Callback exhausted for job ${body.job_id}`,
    context: { user_id: body.user_id, job_id: body.job_id, trace_id: body.trace_id },
    payload: {
      attempts: callbackRetryAttempts,
      max_attempts: callbackRetryAttempts,
    },
    tags: ['callback', 'exhausted'],
  }).catch(() => { });

  return { sent: false, reason: 'unknown', attempts: callbackRetryAttempts };
};

const start = async () => {
  try {
    if (!flickrKey || !flickrSecret) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'worker_startup_error',
        message: 'Missing FLICKR_API_KEY/FLICKR_API_SECRET in environment',
        context: { queue: queueName },
        tags: ['worker', 'startup', 'error'],
      }).catch(() => { });
      process.exit(1);
    }
    if (!queueName) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'worker_startup_error',
        message: 'Missing QUEUE_NAME in environment',
        tags: ['worker', 'startup', 'error'],
      }).catch(() => { });
      process.exit(1);
    }

    let connection;
    let channel;
    try {
      connection = await amqp.connect(rabbitUrl);
      channel = await connection.createChannel();
      await channel.assertQueue(queueName, { durable: true, arguments: { 'x-queue-mode': 'lazy' } });
      await channel.assertQueue(dlqName, { durable: true, arguments: { 'x-queue-mode': 'lazy' } });
      channel.prefetch(queueConcurrency);
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'worker_rabbitmq_connect_error',
        message: `RabbitMQ connection failed at startup: ${err.message}`,
        context: { queue: queueName, rabbit_url: rabbitUrl },
        payload: { error: err.message, stack: err.stack },
        tags: ['worker', 'startup', 'error', 'rabbitmq'],
      }).catch(() => { });
      throw err;
    }

    try {
      await jobStore._ensureConnection();
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'worker_mongodb_connect_error',
        message: `MongoDB connection failed at startup: ${err.message}`,
        context: { queue: queueName },
        payload: { error: err.message, stack: err.stack },
        tags: ['worker', 'startup', 'error', 'mongodb'],
      }).catch(() => { });
      throw err;
    }

    try {
      await redisClient.ping();
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'worker_redis_connect_error',
        message: `Redis connection failed at startup: ${err.message}`,
        context: { queue: queueName, redis_url: redisUrl },
        payload: { error: err.message, stack: err.stack },
        tags: ['worker', 'startup', 'error', 'redis'],
      }).catch(() => { });
      throw err;
    }

    const handleMessage = async (msg) => {
      if (!msg) return;
      const content = msg.content.toString();
      let data;
      try {
        data = JSON.parse(content);
      } catch (err) {
        await sendObservabilityLog({
          level: 'ERROR',
          kind: 'SYSTEM',
          event: 'queue_consume_error',
          message: 'Invalid message payload, acked',
          context: { queue: queueName },
          payload: { error: err.message },
          tags: ['queue', 'consume', 'error'],
        }).catch(() => { });
        channel.ack(msg);
        return;
      }
      const jobId = data.jobId || data.id;
      const attemptsMade = Number(msg.properties.headers?.attempts || 0);
      let jobMeta = data.meta;

      try {
        const rateCheck = await checkPerSecond(data.userId);
        if (!rateCheck.ok) {
          await sendObservabilityLog({
            level: 'WARN',
            kind: 'SYSTEM',
            event: 'rate_limit_exceeded',
            message: `Rate limit exceeded for user ${data.userId}, requeuing job ${jobId}`,
            context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
            payload: {
              rate_limit: perSecondLimit,
              current_count: rateCheck.count,
            },
            tags: ['rate_limit', 'exceeded'],
          }).catch(() => { });

          setTimeout(() => {
            channel.sendToQueue(queueName, Buffer.from(content), {
              persistent: true,
              headers: msg.properties.headers,
            });
          }, 1000);
          channel.ack(msg);
          return;
        }

        const result = await processor({ ...data, jobId, attemptsMade });
        await jobStore.updateJob(jobId, { state: 'completed', returnvalue: result, traceId: data.traceId });

        let resolvedCallbackUrl = data.callbackUrl;
        let resolvedCallbackSecret = data.callbackSecret;
        let jobDoc;
        if (!resolvedCallbackUrl || jobMeta === undefined) {
          try {
            jobDoc = await jobStore.get(jobId);
            if (jobDoc?.callbackUrl) {
              resolvedCallbackUrl = jobDoc.callbackUrl;
              resolvedCallbackSecret = jobDoc.callbackSecret || resolvedCallbackSecret;
              await sendObservabilityLog({
                level: 'INFO',
                kind: 'SYSTEM',
                event: 'callback_url_restored',
                message: `Callback URL restored from MongoDB for job ${jobId}`,
                context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
                payload: {
                  callback_url: resolvedCallbackUrl.substring(0, 100),
                },
                tags: ['callback', 'restore'],
              }).catch(() => { });
            }
            if (jobMeta === undefined && jobDoc?.meta !== undefined) {
              jobMeta = jobDoc.meta;
            }
          } catch (err) {
            await sendObservabilityLog({
              level: 'ERROR',
              kind: 'SYSTEM',
              event: 'job_store_read_error',
              message: `Failed to read job ${jobId} from MongoDB`,
              context: { user_id: data.userId, job_id: jobId, queue: queueName },
              payload: { error: err.message },
              tags: ['job', 'store', 'error'],
            }).catch(() => { });
          }
        }

        await sendObservabilityLog({
          level: 'INFO',
          kind: 'SYSTEM',
          event: 'job_completed',
          message: `job ${jobId} completed`,
          context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
          payload: { method: data.method, from_cache: result?.from_cache || false, attempts_made: attemptsMade },
          tags: ['job', 'completed'],
        }).catch(() => { });

        const callbackPayload = {
          job_id: jobId,
          user_id: data.userId,
          queue: queueName,
          state: 'completed',
          result: result?.flickr || result,
          error: null,
          from_cache: result?.from_cache || false,
          attempts_made: attemptsMade,
          max_attempts: maxAttemptsDefault,
          timestamp: new Date().toISOString(),
          trace_id: data.traceId,
          meta: jobMeta ?? null,
        };

        const cbResult = await sendCallback({
          callbackUrl: resolvedCallbackUrl,
          callbackSecret: resolvedCallbackSecret,
          body: callbackPayload,
        });

        if (cbResult?.sent) {
          await sendObservabilityLog({
            level: 'INFO',
            kind: 'SYSTEM',
            event: 'callback_success',
            message: `callback sent for job ${jobId}`,
            context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
            payload: { status: cbResult.status, attempts: cbResult.attempts || 1 },
            tags: ['callback', 'success'],
          }).catch(() => { });
        } else if (resolvedCallbackUrl) {
          await sendObservabilityLog({
            level: 'ERROR',
            kind: 'SYSTEM',
            event: 'callback_exhausted',
            message: `callback failed for job ${jobId}`,
            context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
            payload: { attempts: cbResult?.attempts || callbackRetryAttempts, reason: cbResult?.reason },
            tags: ['callback', 'failed', 'exhausted'],
          }).catch(() => { });
        }

        if (process.env.SAVE_COMPLETED_TO_MONGO === 'true') {
          await jobStore
            .save(jobId, {
              state: 'completed',
              returnvalue: result,
              method: data.method,
              params: data.params,
              userId: data.userId,
              completedAt: new Date(),
            })
            .then(() =>
              sendObservabilityLog({
                level: 'INFO',
                kind: 'SYSTEM',
                event: 'job_archived_mongo',
                message: `job ${jobId} archived to Mongo after completion`,
                context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
                payload: { method: data.method },
                tags: ['job', 'completed', 'mongo'],
              })
            )
            .catch((err) =>
              sendObservabilityLog({
                level: 'ERROR',
                kind: 'SYSTEM',
                event: 'job_store_save_error',
                message: `Failed to save completed job ${jobId} to MongoDB`,
                context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
                payload: { error: err.message },
                tags: ['job', 'store', 'error'],
              })
            );
        }
        channel.ack(msg);
      } catch (err) {
        const nextAttempt = attemptsMade + 1;
        if (nextAttempt < maxAttemptsDefault) {
          await sendObservabilityLog({
            level: 'WARN',
            kind: 'SYSTEM',
            event: 'job_retrying',
            message: `Retrying job ${jobId} attempt ${nextAttempt}/${maxAttemptsDefault}`,
            context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
            payload: {
              method: data.method,
              attempt: nextAttempt,
              max_attempts: maxAttemptsDefault,
              error: err.message,
            },
            tags: ['job', 'retry'],
          }).catch(() => { });

          await jobStore.updateJob(jobId, { state: 'retrying', attempts: nextAttempt, failedReason: err.message });
          channel.ack(msg);
          channel.sendToQueue(queueName, Buffer.from(content), {
            persistent: true,
            headers: { attempts: nextAttempt },
          });
        } else {
          await sendObservabilityLog({
            level: 'ERROR',
            kind: 'SYSTEM',
            event: 'job_dlq',
            message: `job ${jobId} moved to DLQ after ${nextAttempt} attempts`,
            context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
            payload: { method: data.method, attempts_made: nextAttempt, error: err.message },
            tags: ['job', 'dlq'],
          }).catch(() => { });

          await jobStore.updateJob(jobId, {
            state: 'failed',
            failedReason: err.message,
            stacktrace: truncate(err.stack, 4000),
            failedAt: new Date(),
          });
          channel.ack(msg);
          channel.sendToQueue(dlqName, Buffer.from(content), {
            persistent: true,
            headers: { attempts: nextAttempt, failed: true },
          });

          let failedCallbackUrl = data.callbackUrl;
          let failedCallbackSecret = data.callbackSecret;
          if (!failedCallbackUrl || jobMeta === undefined) {
            try {
              const failedJobDoc = await jobStore.get(jobId);
              if (failedJobDoc?.callbackUrl) {
                failedCallbackUrl = failedJobDoc.callbackUrl;
                failedCallbackSecret = failedJobDoc.callbackSecret || failedCallbackSecret;
              }
              if (jobMeta === undefined && failedJobDoc?.meta !== undefined) {
                jobMeta = failedJobDoc.meta;
              }
            } catch (storeErr) {
              await sendObservabilityLog({
                level: 'ERROR',
                kind: 'SYSTEM',
                event: 'job_store_read_error',
                message: `Failed to read job ${jobId} from MongoDB for failed callback`,
                context: { user_id: data.userId, job_id: jobId, queue: queueName },
                payload: { error: storeErr.message },
                tags: ['job', 'store', 'error'],
              }).catch(() => { });
            }
          }

          const failedCallbackPayload = {
            job_id: jobId,
            user_id: data.userId,
            queue: queueName,
            state: 'failed',
            result: null,
            error: { message: err.message, code: null },
            from_cache: false,
            attempts_made: nextAttempt,
            max_attempts: maxAttemptsDefault,
            timestamp: new Date().toISOString(),
            trace_id: data.traceId,
            meta: jobMeta ?? null,
          };

          const cbResult = await sendCallback({
            callbackUrl: failedCallbackUrl,
            callbackSecret: failedCallbackSecret,
            body: failedCallbackPayload,
          });

          if (cbResult?.sent) {
            await sendObservabilityLog({
              level: 'INFO',
              kind: 'SYSTEM',
              event: 'callback_success',
              message: `callback sent for failed job ${jobId}`,
              context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
              payload: { status: cbResult.status, attempts: cbResult.attempts || 1 },
              tags: ['callback', 'success'],
            }).catch(() => { });
          } else if (failedCallbackUrl) {
            await sendObservabilityLog({
              level: 'ERROR',
              kind: 'SYSTEM',
              event: 'callback_exhausted',
              message: `callback failed for failed job ${jobId}`,
              context: { user_id: data.userId, job_id: jobId, queue: queueName, trace_id: data.traceId },
              payload: { attempts: cbResult?.attempts || callbackRetryAttempts, reason: cbResult?.reason },
              tags: ['callback', 'failed', 'exhausted'],
            }).catch(() => { });
          }
        }
      }
    };

    await sendObservabilityLog({
      level: 'INFO',
      kind: 'SYSTEM',
      event: 'worker_started',
      message: `Worker started for ${queueName} concurrency=${queueConcurrency}`,
      context: { queue: queueName, concurrency: queueConcurrency },
      tags: ['worker', 'startup'],
    }).catch(() => { });

    channel.consume(queueName, handleMessage, { noAck: false });

    const shutdown = async () => {
      try {
        await redisClient.quit();
        await jobStore.close();
        await channel.close();
        await connection.close();
        await sendObservabilityLog({
          level: 'INFO',
          kind: 'SYSTEM',
          event: 'worker_shutdown',
          message: `Worker shutting down for ${queueName}`,
          context: { queue: queueName },
          tags: ['worker', 'shutdown'],
        }).catch(() => { });
        process.exit(0);
      } catch (err) {
        await sendObservabilityLog({
          level: 'ERROR',
          kind: 'SYSTEM',
          event: 'worker_shutdown_error',
          message: `Worker graceful shutdown failed: ${err.message}`,
          context: { queue: queueName },
          payload: { error: err.message },
          tags: ['worker', 'shutdown', 'error'],
        }).catch(() => { });
        process.exit(1);
      }
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    await sendObservabilityLog({
      level: 'ERROR',
      kind: 'SYSTEM',
      event: 'worker_startup_error',
      message: `Worker failed to start: ${err.message}`,
      context: { queue: queueName },
      payload: { error: err.message, stack: truncate(err.stack, 2000) },
      tags: ['worker', 'startup', 'error'],
    }).catch(() => { });
    process.exit(1);
  }
};

start().catch(async (err) => {
  await sendObservabilityLog({
    level: 'ERROR',
    kind: 'SYSTEM',
    event: 'worker_startup_error',
    message: `Worker startup exception: ${err.message}`,
    payload: { error: err.message, stack: truncate(err.stack, 2000) },
    tags: ['worker', 'startup', 'error'],
  }).catch(() => { });
  process.exit(1);
});
