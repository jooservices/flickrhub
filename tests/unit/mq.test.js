const test = require('node:test');
const assert = require('node:assert');
const { validateJob, QUEUE_NAMES } = require('../../packages/mq');

test('validateJob detects missing fields', () => {
  const errors = validateJob({});
  assert(errors.includes('method is required'));
  assert(errors.includes('userId is required'));
});

test('validateJob passes valid job', () => {
  const errors = validateJob({
    method: 'flickr.test.echo',
    userId: 'user-1',
    target: 'rest',
    params: {},
  });
  assert.strictEqual(errors.length, 0);
});

test('queue names are stable', () => {
  assert.strictEqual(QUEUE_NAMES.rest, 'flickr_rest');
  assert.strictEqual(QUEUE_NAMES.upload, 'flickr_upload');
  assert.strictEqual(QUEUE_NAMES.replace, 'flickr_replace');
});
