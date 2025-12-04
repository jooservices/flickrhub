const { v4: uuidv4 } = require('uuid');
const { QUEUE_NAMES, publishJob, sanitizeName } = require('../../../packages/mq');
const { sendObservabilityLog } = require('../../../packages/logger/observability');

class JobService {
  constructor({ channel, tokenStore, jobStore, config, redisClient }) {
    this.channel = channel;
    this.tokenStore = tokenStore;
    this.jobStore = jobStore;
    this.config = config;
    this.redis = redisClient;
  }

  chooseQueueName(target) {
    if (target === 'upload') return QUEUE_NAMES.upload;
    if (target === 'replace') return QUEUE_NAMES.replace;
    return QUEUE_NAMES.rest;
  }

  resolveUrl(target) {
    if (target === 'upload') return this.config.flickr.endpoints.upload;
    if (target === 'replace') return this.config.flickr.endpoints.replace;
    return this.config.flickr.endpoints.rest;
  }

  async enqueue({ method, params, userId, target, callbackUrl, callbackSecret, traceId, requestMeta, meta }) {
    const queueName = this.chooseQueueName(target);
    const resolvedUrl = this.resolveUrl(target);
    const jobId = uuidv4();

    const token = await this.tokenStore.getByUserId(userId);
    if (!token) {
      const err = new Error('token_not_found');
      err.statusCode = 404;
      err.details = { userId, mongoUrl: this.tokenStore.mongoUrl, dbName: this.tokenStore.dbName };
      throw err;
    }

    await this.jobStore.initJob({
      jobId,
      userId,
      method,
      params,
      target,
      callbackUrl,
      callbackSecret,
      queue: sanitizeName(queueName),
      traceId,
      requestMeta,
      meta,
    });

    const payload = {
      jobId,
      method,
      params,
      userId,
      target,
      url: resolvedUrl,
      ...(callbackUrl && { callbackUrl }),
      ...(callbackSecret && { callbackSecret }),
      traceId,
      requestMeta,
      ...(meta !== undefined && { meta }),
    };

    try {
      await publishJob(this.channel, queueName, payload, { attempts: 0 });
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'queue_publish_error',
        message: `Failed to publish job ${jobId} to ${queueName}: ${err.message}`,
        context: { user_id: userId, job_id: jobId, queue: queueName },
        payload: { method, params, error: err.message },
        tags: ['queue', 'publish', 'error'],
      }).catch(() => { });
      throw err;
    }

    return { id: jobId };
  }

  async status({ jobId, userId }) {
    const job = await this.jobStore.get(jobId);
    if (!job || job.user_id !== userId) {
      const err = new Error('job_not_found');
      err.statusCode = 404;
      throw err;
    }
    return {
      id: job.jobId,
      state: job.state,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      queue: job.target ? this.chooseQueueName(job.target) : null,
    };
  }
}

module.exports = { JobService };
