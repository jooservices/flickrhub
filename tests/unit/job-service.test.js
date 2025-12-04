const test = require('node:test');
const assert = require('node:assert');
const { JobService } = require('../../apps/api/services/job-service');

test('JobService', async (t) => {
    await t.test('enqueue adds job to store and queue', async () => {
        let storedJob = null;
        let queuedMessage = null;

        const mockChannel = {
            sendToQueue: (queue, buffer) => {
                queuedMessage = { queue, data: JSON.parse(buffer.toString()) };
                return true;
            },
            assertQueue: () => { },
        };
        const mockJobStore = {
            initJob: async (job) => {
                storedJob = job;
            },
        };
        const mockTokenStore = {
            getByUserId: async () => ({ oauth_token: 't', oauth_token_secret: 's' })
        };

        const service = new JobService({
            channel: mockChannel,
            jobStore: mockJobStore,
            tokenStore: mockTokenStore,
            config: {
                rabbitUrl: '',
                flickr: { endpoints: { rest: 'http://api.flickr.com' } }
            },
        });

        const result = await service.enqueue({
            method: 'flickr.test.echo',
            params: { foo: 'bar' },
            userId: 'user-1',
            target: 'rest',
        });

        assert.ok(result.id);
        assert.strictEqual(storedJob.jobId, result.id);
        assert.strictEqual(storedJob.userId, 'user-1');
        assert.strictEqual(queuedMessage.queue, 'flickr_rest');
        assert.strictEqual(queuedMessage.data.jobId, result.id);
        assert.deepStrictEqual(queuedMessage.data.params, { foo: 'bar' });
    });

    await t.test('enqueue throws on missing params', async () => {
        const service = new JobService({
            config: { flickr: { endpoints: { rest: 'http://api.flickr.com' } } },
            tokenStore: { getByUserId: async () => ({}) },
            jobStore: { initJob: async () => { } }
        });
        await assert.rejects(
            async () => await service.enqueue({ method: 'flickr.test.echo' }),
            /userId is required/
        );
    });

    await t.test('enqueue handles queue error', async () => {
        const mockChannel = {
            sendToQueue: () => { throw new Error('Queue full'); },
            assertQueue: () => { },
        };
        const mockJobStore = { initJob: async () => { } };
        const mockTokenStore = { getByUserId: async () => ({}) };

        const service = new JobService({
            channel: mockChannel,
            jobStore: mockJobStore,
            tokenStore: mockTokenStore,
            config: { flickr: { endpoints: { rest: 'http://api.flickr.com' } } },
        });

        await assert.rejects(
            async () => await service.enqueue({
                method: 'flickr.test.echo',
                params: {},
                userId: 'u1',
                target: 'rest'
            }),
            /Queue full/
        );
    });
});
