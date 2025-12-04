const parseRedisConnection = (url) => {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      db: parsed.pathname ? Number(parsed.pathname.replace('/', '')) || 0 : 0,
    };
  } catch (error) {
    return { host: '127.0.0.1', port: 6379 };
  }
};

const config = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  mongoUrl: process.env.MONGO_URL,
  rabbitUrl: process.env.RABBIT_URL || process.env.CLOUDAMQP_URL || 'amqp://localhost',
  server: {
    port: Number(process.env.PORT || 3000),
  },
  flickr: {
    key: process.env.FLICKR_API_KEY,
    secret: process.env.FLICKR_API_SECRET,
    endpoints: {
      rest: process.env.FLICKR_REST_URL || 'https://www.flickr.com/services/rest/',
      upload: process.env.FLICKR_UPLOAD_URL || 'https://up.flickr.com/services/upload/',
      replace: process.env.FLICKR_REPLACE_URL || 'https://up.flickr.com/services/replace/',
    },
  },
  obs: {
    url: process.env.OBS_API_URL,
    key: process.env.OBS_API_KEY,
    service: process.env.SERVICE_NAME || 'flickrhub-worker',
    env: process.env.SERVICE_ENV || process.env.NODE_ENV || 'local',
    debug: process.env.OBS_DEBUG === 'true',
  },
  oauth: {
    mode: (process.env.OAUTH_MODE || 'oob').toLowerCase(),
    callbackUrl: process.env.CALLBACK_URL,
  },
  jobs: {
    retryAttempts: Number(process.env.JOB_RETRY_ATTEMPTS || 3),
    ttlComplete: Number(process.env.JOB_TTL_COMPLETE || 0),
    ttlFail: Number(process.env.JOB_TTL_FAIL || 0),
    ttlCompleteDays: Number(process.env.JOB_TTL_COMPLETE_DAYS || 0),
    ttlFailDays: Number(process.env.JOB_TTL_FAIL_DAYS || 0),
    saveCompleted: process.env.SAVE_COMPLETED_TO_MONGO === 'true',
    saveFailed: process.env.SAVE_FAILED_TO_MONGO !== 'false',
    callbackEnabled: process.env.CALLBACK_ENABLED !== 'false',
    callbackRetryAttempts: Number(process.env.CALLBACK_RETRY_ATTEMPTS || 3),
    callbackRetryDelayMs: Number(process.env.CALLBACK_RETRY_DELAY_MS || 1000),
  },
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
    prefix: process.env.CACHE_PREFIX || 'flickrhub:cache:',
  },
  rateLimit: {
    perHour: Number(process.env.FLICKR_RATE_LIMIT_PER_HOUR || 3500),
    prefix: process.env.RATE_LIMIT_PREFIX || 'flickrhub:ratelimit:',
    perSecond: Number(process.env.FLICKR_RATE_LIMIT_PER_SECOND || 1),
    perSecondPrefix: process.env.RATE_LIMIT_SECOND_PREFIX || 'flickrhub:ratelimit:sec:',
  },
  worker: {
    queueName: process.env.QUEUE_NAME || 'flickr_rest',
    concurrency: Number(process.env.WORKER_CONCURRENCY || 1),
    perQueue: {
      rest: Number(process.env.WORKER_REST_CONCURRENCY || process.env.WORKER_CONCURRENCY || 1),
      upload: Number(process.env.WORKER_UPLOAD_CONCURRENCY || process.env.WORKER_CONCURRENCY || 1),
      replace: Number(process.env.WORKER_REPLACE_CONCURRENCY || process.env.WORKER_CONCURRENCY || 1),
    },
  },
  parseRedisConnection,
};

module.exports = { config };
