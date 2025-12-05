const { sendObservabilityLog } = require('../logger/observability');

const QUEUE_NAMES = {
  rest: 'flickr_rest',
  upload: 'flickr_upload',
  replace: 'flickr_replace',
  dlq: 'flickr_dlq',
};

const sanitizeName = (name) => (name.includes(':') ? name.replace(/:/g, '_') : name);

const validateJob = (job) => {
  const errors = [];
  if (!job || typeof job !== 'object') errors.push('job must be an object');
  if (!job.method || typeof job.method !== 'string' || !job.method.trim()) errors.push('method is required');
  if (!job.userId || typeof job.userId !== 'string' || !job.userId.trim()) errors.push('userId is required');
  if (!job.target || !['rest', 'upload', 'replace'].includes(job.target))
    errors.push('target must be rest|upload|replace');
  if (job.params && (typeof job.params !== 'object' || Array.isArray(job.params))) errors.push('params must be object');
  if (job.callbackUrl && typeof job.callbackUrl !== 'string') errors.push('callbackUrl must be string');
  if (job.callbackSecret && typeof job.callbackSecret !== 'string') errors.push('callbackSecret must be string');
  if (job.meta && (typeof job.meta !== 'object' || Array.isArray(job.meta))) errors.push('meta must be object');
  return errors;
};

const assertQueue = async (channel, name, { durable = true, lazy = true } = {}) => {
  try {
    await channel.assertQueue(sanitizeName(name), {
      durable,
      arguments: lazy ? { 'x-queue-mode': 'lazy' } : undefined,
    });
  } catch (err) {
    await sendObservabilityLog({
      level: 'ERROR',
      kind: 'SYSTEM',
      event: 'queue_assert_error',
      message: `Queue assertion failed for ${name}: ${err.message}`,
      context: { queue_name: name },
      payload: { error: err.message, stack: err.stack },
      tags: ['queue', 'error', 'assert'],
    }).catch(() => { });
    throw err;
  }
};

const publishJob = async (channel, queueName, payload, headers = {}) => {
  const name = sanitizeName(queueName);
  await assertQueue(channel, name);
  const ok = channel.sendToQueue(name, Buffer.from(JSON.stringify(payload)), {
    persistent: true,
    headers,
  });
  return ok;
};

module.exports = {
  QUEUE_NAMES,
  validateJob,
  assertQueue,
  publishJob,
  sanitizeName,
};
