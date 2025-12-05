const fs = require('fs');
const path = require('path');
const fastify = require('fastify');
const cors = require('@fastify/cors');
const fastifyStatic = require('@fastify/static');
const Redis = require('ioredis');
const { connectRabbit } = require('../../packages/rabbitmq/client');
const { TokenStore } = require('../../packages/core/token-store');
const { JobStore } = require('../../packages/core/job-store');
const { config } = require('../../packages/config');
const { AuthService } = require('./services/auth-service');
const { JobService } = require('./services/job-service');
const { validateJob } = require('../../packages/mq');
const { sendObservabilityLog } = require('../../packages/logger/observability');

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    const value = rest.join('=');
    if (!process.env[key]) process.env[key] = value;
  });
};

loadEnvFile(path.join(process.cwd(), '.env'));

const port = config.server.port;
const endpointUrls = config.flickr.endpoints;
const oauthMode = config.oauth.mode; // oob | callback
const callbackUrl = config.oauth.callbackUrl;

const buildServer = async () => {
  const app = fastify({ logger: true });
  app.register(cors, { origin: true });
  const uiPath = path.join(process.cwd(), 'apps', 'web', 'public');
  if (fs.existsSync(uiPath)) {
    app.register(fastifyStatic, {
      root: uiPath,
      prefix: '/',
      index: ['index.html'],
    });
    app.get('/__config.js', async (_req, reply) => {
      const apiBase = process.env.API_BASE || `http://localhost:${port}`;
      reply.type('application/javascript').send(`window.API_BASE = "${apiBase}";`);
    });
  }

  // Dependencies
  const tokenStore = new TokenStore();
  let redisClient;
  let jobStore;
  let connection;
  let channel;

  try {
    redisClient = new Redis(config.redisUrl);
    await redisClient.ping();
  } catch (err) {
    await sendObservabilityLog({
      level: 'ERROR',
      kind: 'SYSTEM',
      event: 'api_dependency_error',
      message: `Redis connection failed: ${err.message}`,
      context: { redis_url: config.redisUrl },
      payload: { error: err.message },
      tags: ['api', 'startup', 'error', 'redis'],
    }).catch(() => { });
    throw err;
  }

  try {
    jobStore = new JobStore({
      ttlCompleteDays: config.jobs.ttlCompleteDays,
      ttlFailDays: config.jobs.ttlFailDays,
    });
    await jobStore._ensureConnection();
  } catch (err) {
    await sendObservabilityLog({
      level: 'ERROR',
      kind: 'SYSTEM',
      event: 'api_dependency_error',
      message: `MongoDB connection failed: ${err.message}`,
      context: { mongo_url: config.mongoUrl },
      payload: { error: err.message },
      tags: ['api', 'startup', 'error', 'mongodb'],
    }).catch(() => { });
    throw err;
  }

  try {
    const rabbitResult = await connectRabbit(config.rabbitUrl);
    connection = rabbitResult.connection;
    channel = rabbitResult.channel;
  } catch (err) {
    await sendObservabilityLog({
      level: 'ERROR',
      kind: 'SYSTEM',
      event: 'api_dependency_error',
      message: `RabbitMQ connection failed: ${err.message}`,
      context: { rabbit_url: config.rabbitUrl },
      payload: { error: err.message },
      tags: ['api', 'startup', 'error', 'rabbitmq'],
    }).catch(() => { });
    throw err;
  }

  const authService = new AuthService({
    tokenStore,
    redisClient,
    oauthMode,
    callbackUrl,
    mock: process.env.MOCK_FLICKR === 'true',
  });
  const jobService = new JobService({ channel, tokenStore, jobStore, config, redisClient });

  // Routes
  app.post('/api/v1/auth/start', async (request, reply) => {
    const { api_key: apiKey, api_secret: apiSecret } = request.body || {};
    if (!apiKey || !apiSecret) {
      await sendObservabilityLog({
        level: 'WARN',
        kind: 'SYSTEM',
        event: 'api_request_validation_error',
        message: 'Missing api_key or api_secret in auth/start request',
        context: { request_id: request.id, ip: request.ip },
        payload: { endpoint: '/api/v1/auth/start' },
        tags: ['api', 'auth', 'validation_error'],
      }).catch(() => { });
      return reply.code(400).send({
        request_id: request.id,
        data: null,
        error: { code: 'ERR_INVALID_REQUEST', message: 'api_key and api_secret are required' },
      });
    }
    try {
      const result = await authService.start({ apiKey, apiSecret });
      await sendObservabilityLog({
        level: 'INFO',
        kind: 'SYSTEM',
        event: 'auth_start_success',
        message: 'OAuth start successful',
        context: { request_id: request.id, ip: request.ip },
        payload: {
          oauth_mode: result.mode,
          has_state: !!result.state,
        },
        tags: ['api', 'auth', 'success'],
      }).catch(() => { });
      return reply.send({ request_id: request.id, data: result, error: null });
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'auth_start_failure',
        message: `OAuth start failed: ${err.message}`,
        context: { request_id: request.id, ip: request.ip },
        payload: { error: err.message },
        tags: ['api', 'auth', 'error'],
      }).catch(() => { });
      throw err;
    }
  });

  app.post('/api/v1/auth/complete', async (request, reply) => {
    const { oauth_token: oauthToken, oauth_verifier: verifier } = request.body || {};
    if (!oauthToken || !verifier) {
      await sendObservabilityLog({
        level: 'WARN',
        kind: 'SYSTEM',
        event: 'api_request_validation_error',
        message: 'Missing oauth_token or oauth_verifier in auth/complete request',
        context: { request_id: request.id, ip: request.ip },
        payload: { endpoint: '/api/v1/auth/complete' },
        tags: ['api', 'auth', 'validation_error'],
      }).catch(() => { });
      return reply.code(400).send({
        request_id: request.id,
        data: null,
        error: { code: 'ERR_INVALID_REQUEST', message: 'oauth_token and oauth_verifier are required' },
      });
    }
    try {
      const result = await authService.complete({ oauthToken, verifier });
      await sendObservabilityLog({
        level: 'INFO',
        kind: 'SYSTEM',
        event: 'auth_complete_success',
        message: 'OAuth complete successful, user created',
        context: { request_id: request.id, user_id: result.user_id, ip: request.ip },
        tags: ['api', 'auth', 'success'],
      }).catch(() => { });
      return reply.send({ request_id: request.id, data: result, error: null });
    } catch (err) {
      if (err.message === 'invalid_state_or_token') {
        await sendObservabilityLog({
          level: 'WARN',
          kind: 'SYSTEM',
          event: 'auth_invalid_state',
          message: 'Invalid state or token in auth/complete',
          context: { request_id: request.id, ip: request.ip },
          payload: { oauth_token: oauthToken ? 'provided' : 'missing' },
          tags: ['api', 'auth', 'invalid_state'],
        }).catch(() => { });
        return reply.code(400).send({
          request_id: request.id,
          data: null,
          error: { code: 'ERR_INVALID_STATE', message: 'invalid_state_or_token' },
        });
      }
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'auth_complete_failure',
        message: `OAuth complete failed: ${err.message}`,
        context: { request_id: request.id, ip: request.ip },
        payload: { error: err.message },
        tags: ['api', 'auth', 'error'],
      }).catch(() => { });
      throw err;
    }
  });

  app.get('/api/v1/auth/callback', async (request, reply) => {
    const { oauth_token: oauthToken, oauth_verifier: verifier } = request.query || {};
    if (!oauthToken || !verifier) {
      await sendObservabilityLog({
        level: 'WARN',
        kind: 'SYSTEM',
        event: 'api_request_validation_error',
        message: 'Missing oauth_token or oauth_verifier in auth/callback request',
        context: { request_id: request.id, ip: request.ip },
        payload: { endpoint: '/api/v1/auth/callback' },
        tags: ['api', 'auth', 'validation_error'],
      }).catch(() => { });
      return reply.code(400).send({
        request_id: request.id,
        data: null,
        error: { code: 'ERR_INVALID_REQUEST', message: 'oauth_token and oauth_verifier are required' },
      });
    }
    try {
      const result = await authService.complete({ oauthToken, verifier });
      await sendObservabilityLog({
        level: 'INFO',
        kind: 'SYSTEM',
        event: 'auth_callback_success',
        message: 'OAuth callback successful, user created',
        context: { request_id: request.id, user_id: result.user_id, ip: request.ip },
        tags: ['api', 'auth', 'success'],
      }).catch(() => { });
      return reply.send({ request_id: request.id, data: { status: 'ok', ...result }, error: null });
    } catch (err) {
      if (err.message === 'invalid_state_or_token') {
        await sendObservabilityLog({
          level: 'WARN',
          kind: 'SYSTEM',
          event: 'auth_invalid_state',
          message: 'Invalid state or token in auth/callback',
          context: { request_id: request.id, ip: request.ip },
          payload: { oauth_token: oauthToken ? 'provided' : 'missing' },
          tags: ['api', 'auth', 'invalid_state'],
        }).catch(() => { });
        return reply.code(400).send({
          request_id: request.id,
          data: null,
          error: { code: 'ERR_INVALID_STATE', message: 'invalid_state_or_token' },
        });
      }
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'auth_callback_failure',
        message: `OAuth callback failed: ${err.message}`,
        context: { request_id: request.id, ip: request.ip },
        payload: { error: err.message },
        tags: ['api', 'auth', 'error'],
      }).catch(() => { });
      throw err;
    }
  });

  app.post('/api/v1/flickr/rest', async (request, reply) => {
    const {
      method,
      params = {},
      user_id: userId,
      target,
      callback_url: cbUrl,
      callback_secret: cbSecret,
      meta,
    } = request.body || {};
    const resolvedTarget = target || 'rest';
    const job = {
      method,
      params,
      userId,
      url: endpointUrls[resolvedTarget],
      target: resolvedTarget,
      callbackUrl: cbUrl,
      callbackSecret: cbSecret,
      meta,
    };
    const errors = validateJob(job);
    if (errors.length) {
      await sendObservabilityLog({
        level: 'WARN',
        kind: 'SYSTEM',
        event: 'api_request_validation_error',
        message: 'Job validation failed',
        context: { request_id: request.id, user_id: userId, ip: request.ip },
        payload: { errors, method, target: resolvedTarget },
        tags: ['api', 'validation_error'],
      }).catch(() => { });
      return reply.code(400).send({
        request_id: request.id,
        data: null,
        error: { code: 'ERR_INVALID_REQUEST', message: 'Invalid request', details: errors },
      });
    }

    try {
      const addedJob = await jobService.enqueue({
        method,
        params,
        userId,
        target: resolvedTarget,
        callbackUrl: cbUrl,
        callbackSecret: cbSecret,
        traceId: request.id,
        requestMeta: {
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        },
        meta,
      });
      sendObservabilityLog({
        level: 'INFO',
        kind: 'SYSTEM',
        event: 'job_enqueued',
        message: `Job ${addedJob.id} enqueued`,
        context: { user_id: userId, job_id: addedJob.id, queue: resolvedTarget, trace_id: request.id },
        payload: { method, target: resolvedTarget },
        tags: ['job', 'enqueue'],
      }).catch(() => { });
      return reply.code(202).send({ request_id: request.id, data: { job_id: addedJob.id }, error: null });
    } catch (err) {
      if (err.statusCode === 404 && err.message === 'token_not_found') {
        await sendObservabilityLog({
          level: 'WARN',
          kind: 'SYSTEM',
          event: 'api_error',
          message: `Token not found for user ${userId}`,
          context: { request_id: request.id, user_id: userId, ip: request.ip },
          payload: { error: 'token_not_found' },
          tags: ['api', 'error', 'token_not_found'],
        }).catch(() => { });
        return reply.code(404).send({
          request_id: request.id,
          data: null,
          error: { code: 'ERR_TOKEN_NOT_FOUND', message: 'token_not_found', details: err.details },
        });
      }
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'api_unhandled_error',
        message: `Unhandled error in /api/v1/flickr/rest: ${err.message}`,
        context: { request_id: request.id, user_id: userId, ip: request.ip },
        payload: { error: err.message, stack: err.stack ? err.stack.substring(0, 1000) : null },
        tags: ['api', 'error', 'unhandled'],
      }).catch(() => { });
      throw err;
    }
  });

  app.post('/api/v1/flickr/jobs/status', async (request, reply) => {
    const { job_id: jobId, user_id: userId } = request.body || {};
    if (!jobId || !userId) {
      await sendObservabilityLog({
        level: 'WARN',
        kind: 'SYSTEM',
        event: 'api_request_validation_error',
        message: 'Missing job_id or user_id in status request',
        context: { request_id: request.id, ip: request.ip },
        payload: { endpoint: '/api/v1/flickr/jobs/status' },
        tags: ['api', 'validation_error'],
      }).catch(() => { });
      return reply.code(400).send({
        request_id: request.id,
        data: null,
        error: { code: 'ERR_INVALID_REQUEST', message: 'job_id and user_id are required' },
      });
    }

    await sendObservabilityLog({
      level: 'INFO',
      kind: 'SYSTEM',
      event: 'job_status_requested',
      message: `Job status requested for ${jobId}`,
      context: { request_id: request.id, user_id: userId, job_id: jobId, ip: request.ip },
      tags: ['api', 'job_status'],
    }).catch(() => { });

    try {
      const result = await jobService.status({ jobId, userId });
      return reply.send({ request_id: request.id, data: result, error: null });
    } catch (err) {
      if (err.statusCode === 404) {
        await sendObservabilityLog({
          level: 'WARN',
          kind: 'SYSTEM',
          event: 'job_status_not_found',
          message: `Job ${jobId} not found or unauthorized for user ${userId}`,
          context: { request_id: request.id, user_id: userId, job_id: jobId, ip: request.ip },
          tags: ['api', 'job_status', 'not_found'],
        }).catch(() => { });
        return reply.code(404).send({
          request_id: request.id,
          data: null,
          error: { code: 'ERR_JOB_NOT_FOUND', message: 'job_not_found' },
        });
      }
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'api_unhandled_error',
        message: `Unhandled error in /api/v1/flickr/jobs/status: ${err.message}`,
        context: { request_id: request.id, user_id: userId, job_id: jobId, ip: request.ip },
        payload: { error: err.message },
        tags: ['api', 'error', 'unhandled'],
      }).catch(() => { });
      throw err;
    }
  });

  app.get('/health', async (request) => {
    sendObservabilityLog({
      level: 'INFO',
      kind: 'SYSTEM',
      event: 'health_check',
      message: 'Health check requested',
      context: { request_id: request.id, ip: request.ip },
      tags: ['api', 'health'],
    }).catch(() => { });
    return { status: 'ok' };
  });

  const shutdown = async () => {
    try {
      await tokenStore.close();
      await jobStore.close();
      await channel.close();
      await connection.close();
      if (redisClient) await redisClient.quit();
      await app.close();
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'api_shutdown_error',
        message: `API graceful shutdown failed: ${err.message}`,
        payload: { error: err.message },
        tags: ['api', 'shutdown', 'error'],
      }).catch(() => { });
      app.log.warn({ err }, 'Graceful shutdown error');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  return app;
};

if (require.main === module) {
  buildServer()
    .then((app) =>
      app.listen({ port, host: '0.0.0.0' }).catch((err) => {
        app.log.error(err);
        process.exit(1);
      })
    )
    .catch(async (err) => {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'api_startup_error',
        message: `API server failed to start: ${err.message}`,
        payload: { error: err.message, stack: err.stack ? err.stack.substring(0, 1000) : null },
        tags: ['api', 'startup', 'error'],
      }).catch(() => { });
      process.exit(1);
    });
}

module.exports = { buildServer };
