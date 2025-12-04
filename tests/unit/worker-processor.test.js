const test = require('node:test');
const assert = require('node:assert');
const { createProcessor } = require('../../apps/worker/processor');

test('Worker Processor', async (t) => {
    const mockConfig = {
        cache: { enabled: true, prefix: 'test:', ttlSeconds: 60 },
    };

    await t.test('processes job successfully', async () => {
        const mockTokenStore = {
            getByUserId: async () => ({ oauth_token: 't', oauth_token_secret: 's' }),
        };
        const mockFlickr = {
            callRest: async (method, params) => ({ stat: 'ok', method, params }),
        };
        const mockRedis = {
            get: async () => null,
            setex: async () => { },
        };
        const mockJobStore = {};

        const processor = createProcessor({
            tokenStore: mockTokenStore,
            flickr: mockFlickr,
            redisClient: mockRedis,
            jobStore: mockJobStore,
            config: mockConfig,
            queueName: 'test_queue',
            maxAttemptsDefault: 3,
        });

        const result = await processor({
            method: 'flickr.test.echo',
            params: { foo: 'bar' },
            userId: 'user-1',
            jobId: 'job-1',
        });

        assert.strictEqual(result.from_cache, false);
        assert.strictEqual(result.flickr.stat, 'ok');
        assert.strictEqual(result.flickr.method, 'flickr.test.echo');
        assert.deepStrictEqual(result.flickr.params, { foo: 'bar' });
    });

    await t.test('serves from cache', async () => {
        const mockTokenStore = {
            getByUserId: async () => ({ oauth_token: 't', oauth_token_secret: 's' }),
        };
        const mockFlickr = {
            callRest: async () => { throw new Error('Should not be called'); },
        };
        const mockRedis = {
            get: async () => JSON.stringify({ data: { stat: 'ok', cached: true } }),
            ttl: async () => 50,
        };
        const mockJobStore = {};

        const processor = createProcessor({
            tokenStore: mockTokenStore,
            flickr: mockFlickr,
            redisClient: mockRedis,
            jobStore: mockJobStore,
            config: mockConfig,
            queueName: 'test_queue',
            maxAttemptsDefault: 3,
        });

        const result = await processor({
            method: 'flickr.test.echo',
            userId: 'user-1',
            jobId: 'job-1',
        });

        assert.strictEqual(result.from_cache, true);
        assert.strictEqual(result.flickr.cached, true);
        assert.strictEqual(result.cache_ttl_seconds, 50);
    });

    await t.test('throws on missing token', async () => {
        const mockTokenStore = { getByUserId: async () => null };
        const processor = createProcessor({
            tokenStore: mockTokenStore,
            config: mockConfig,
        });

        await assert.rejects(
            async () => await processor({ userId: 'u1', jobId: 'j1' }),
            /Token not found/
        );
    });

    await t.test('handles api error', async () => {
        const mockTokenStore = {
            getByUserId: async () => ({ oauth_token: 't', oauth_token_secret: 's' }),
        };
        const mockFlickr = {
            callRest: async () => { throw new Error('API Down'); },
        };
        const mockRedis = { get: async () => null };

        // Mock sendObservabilityLog to avoid errors during test
        // In a real unit test we might want to mock the logger module itself
        // For now we assume the processor handles the logging internally or we mock dependencies better
        // But here we are testing the processor logic which calls sendObservabilityLog
        // Since we can't easily mock the required module here without a test runner that supports it (like jest/sinon),
        // we rely on the fact that the processor catches errors or we'd need to refactor to inject logger.
        // However, looking at processor.js, it imports sendObservabilityLog directly. 
        // This makes unit testing side effects hard without mocking the module.
        // For this specific test, we expect the processor to re-throw the error after logging.

        const processor = createProcessor({
            tokenStore: mockTokenStore,
            flickr: mockFlickr,
            redisClient: mockRedis,
            jobStore: { save: async () => { } }, // Mock jobStore for error saving
            config: mockConfig,
            queueName: 'q',
            maxAttemptsDefault: 1,
        });

        await assert.rejects(
            async () => await processor({ userId: 'u1', jobId: 'j1', method: 'm' }),
            /API Down/
        );
    });
});
