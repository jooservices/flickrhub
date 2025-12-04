const crypto = require('crypto');
const { sendObservabilityLog } = require('../../packages/logger/observability');

const safeStringify = (value) => {
    try {
        return JSON.stringify(value);
    } catch (err) {
        return '[unserializable]';
    }
};

const stableStringify = (value) => {
    const sorter = (obj) => {
        if (Array.isArray(obj)) return obj.map(sorter);
        if (obj && typeof obj === 'object') {
            return Object.keys(obj)
                .sort()
                .reduce((acc, key) => {
                    acc[key] = sorter(obj[key]);
                    return acc;
                }, {});
        }
        return obj;
    };
    return safeStringify(sorter(value));
};

const truncate = (str, max = 4000) => (str && str.length > max ? `${str.slice(0, max)}…` : str);

const createProcessor = ({
    tokenStore,
    flickr,
    redisClient,
    jobStore,
    config,
    queueName,
    maxAttemptsDefault,
}) => {
    const cacheEnabled = config.cache.enabled;
    const cachePrefix = config.cache.prefix;
    const cacheTtlSeconds = config.cache.ttlSeconds;

    const buildCacheKey = (method, params, userId) => {
        const payload = stableStringify({ method, params, userId });
        const hash = crypto.createHash('sha1').update(payload).digest('hex');
        return `${cachePrefix}${hash}`;
    };

    const getCached = async (key) => {
        if (!cacheEnabled) return null;
        try {
            const raw = await redisClient.get(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const ttl = await redisClient.ttl(key);
            return { ...parsed, ttl };
        } catch (err) {
            return null;
        }
    };

    const setCached = async (key, value) => {
        if (!cacheEnabled) return;
        try {
            await redisClient.setex(key, cacheTtlSeconds, JSON.stringify(value));
        } catch (err) {
            await sendObservabilityLog({
                level: 'ERROR',
                kind: 'SYSTEM',
                event: 'cache_set_error',
                message: `Failed to set cache for key: ${key}`,
                context: { queue: queueName },
                payload: { error: err.message },
                tags: ['cache', 'error'],
            }).catch(() => { });
        }
    };

    return async ({ method, params = {}, userId, jobId, attemptsMade, traceId }) => {
        const token = await tokenStore.getByUserId(userId);
        if (!token) {
            throw new Error(`Token not found for userId=${userId}`);
        }

        const { oauth_token: accessToken, oauth_token_secret: accessSecret } = token;
        if (!accessToken || !accessSecret) {
            throw new Error(`Invalid token shape for userId=${userId}`);
        }

        const cacheKey = buildCacheKey(method, params, userId);
        const cached = await getCached(cacheKey);
        if (cached) {
            await sendObservabilityLog({
                level: 'INFO',
                kind: 'SYSTEM',
                event: 'cache_hit',
                message: `${method} served from cache`,
                context: { user_id: userId, job_id: jobId, trace_id: traceId },
                payload: {
                    flickr_method: method,
                    params,
                    cache_ttl_seconds: cached.ttl,
                },
                tags: ['cache', 'hit'],
            }).catch(() => { });

            const cacheResult = {
                from_cache: true,
                cache_ttl_seconds: cached.ttl,
                flickr: cached.data,
                observability: { ok: true, cached: true },
            };

            await sendObservabilityLog({
                level: 'INFO',
                kind: 'SYSTEM',
                event: 'flickr_api_call',
                message: `${method} succeeded (from cache)`,
                context: { user_id: userId, job_id: jobId, trace_id: traceId },
                payload: {
                    flickr_method: method,
                    params,
                    response_code: 200,
                    response_time_ms: 0,
                    from_cache: true,
                    cache_ttl_seconds: cached.ttl,
                },
                tags: ['flickr', 'api', 'cache'],
            }).catch(() => { });

            return cacheResult;
        }

        const start = Date.now();
        try {
            const result = await flickr.callRest(method, params, accessToken, accessSecret);
            const latency = Date.now() - start;
            await setCached(cacheKey, { data: result, cachedAt: Date.now() });
            const obsResult = await sendObservabilityLog({
                level: 'INFO',
                kind: 'SYSTEM',
                event: 'flickr_api_call',
                message: `${method} succeeded`,
                context: { user_id: userId, job_id: jobId, trace_id: traceId },
                payload: {
                    flickr_method: method,
                    params,
                    response_code: 200,
                    response_time_ms: latency,
                    response_body: truncate(safeStringify(result), 4000),
                },
            });
            return { from_cache: false, flickr: result, observability: obsResult };
        } catch (error) {
            const latency = Date.now() - start;
            const currentAttempt = (attemptsMade || 0) + 1;
            const maxAttempts = maxAttemptsDefault;
            if (currentAttempt < maxAttempts) {
                await sendObservabilityLog({
                    level: 'WARN',
                    kind: 'SYSTEM',
                    event: 'flickr_api_call_retry',
                    message: `${method} retry attempt ${currentAttempt}/${maxAttempts}`,
                    context: {
                        user_id: userId,
                        job_id: jobId,
                        attempt: currentAttempt,
                        max_attempts: maxAttempts,
                        trace_id: traceId,
                    },
                    payload: {
                        flickr_method: method,
                        params,
                        response_code: error.status || error.code || null,
                        response_time_ms: latency,
                        response_body: truncate(error.body || error.message || '', 4000),
                    },
                    tags: ['flickr', 'api', 'retry'],
                }).catch(() => { });
            }
            const obsResult = await sendObservabilityLog({
                level: 'ERROR',
                kind: 'SYSTEM',
                event: 'flickr_api_call',
                message: `${method} failed: ${error.message}`,
                context: { user_id: userId, job_id: jobId, trace_id: traceId },
                payload: {
                    flickr_method: method,
                    params,
                    response_code: error.status || error.code || null,
                    response_time_ms: latency,
                    response_body: truncate(error.body || error.message || '', 4000),
                },
                tags: ['flickr', 'api', 'error'],
            });
            error.observability = obsResult;

            if (currentAttempt >= maxAttempts && process.env.SAVE_FAILED_TO_MONGO !== 'false') {
                const payload = {
                    state: 'failed',
                    error: error.message,
                    stacktrace: error.stack,
                    observability: obsResult,
                    method,
                    params,
                    userId,
                    failedAt: new Date(),
                    attempts_made: currentAttempt,
                    max_attempts: maxAttempts,
                };
                await jobStore
                    .save(jobId, payload)
                    .then(() =>
                        sendObservabilityLog({
                            level: 'INFO',
                            kind: 'SYSTEM',
                            event: 'job_archived_mongo',
                            message: `job ${jobId} archived to Mongo after failure`,
                            context: { user_id: userId, job_id: jobId, queue: queueName, trace_id: traceId },
                            payload: { method, attempts_made: currentAttempt, max_attempts: maxAttempts },
                            tags: ['job', 'dlq', 'mongo'],
                        })
                    )
                    .catch((err) =>
                        sendObservabilityLog({
                            level: 'ERROR',
                            kind: 'SYSTEM',
                            event: 'job_store_save_error',
                            message: `Failed to save job ${jobId} to MongoDB`,
                            context: { user_id: userId, job_id: jobId, queue: queueName, trace_id: traceId },
                            payload: { error: err.message },
                            tags: ['job', 'store', 'error'],
                        })
                    );
            }
            throw error;
        }
    };
};

module.exports = { createProcessor };
