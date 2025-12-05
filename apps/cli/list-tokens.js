const path = require('path');
const fs = require('fs');
const { TokenStore } = require('../../packages/core/token-store');
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

const main = async () => {
  loadEnvFile(path.join(process.cwd(), '.env'));
  await sendObservabilityLog({
    level: 'INFO',
    kind: 'SYSTEM',
    event: 'cli_list_tokens_start',
    message: 'CLI list-tokens started',
    context: { tenant_id: process.env.TENANT_ID },
    tags: ['cli', 'list-tokens', 'start'],
  }).catch(() => { });

  const store = new TokenStore();
  const client = await store._ensureConnection();
  const docs = await store.collection.find({}).project({ token: 0 }).toArray();
  if (!docs.length) {
    await sendObservabilityLog({
      level: 'INFO',
      kind: 'SYSTEM',
      event: 'cli_list_tokens_empty',
      message: 'No tokens found',
      context: { tenant_id: process.env.TENANT_ID },
      tags: ['cli', 'list-tokens'],
    }).catch(() => { });
  } else {
    await sendObservabilityLog({
      level: 'INFO',
      kind: 'SYSTEM',
      event: 'cli_list_tokens_found',
      message: `Found ${docs.length} token(s)`,
      context: { tenant_id: process.env.TENANT_ID, token_count: docs.length },
      payload: {
        tokens: docs.map((doc) => ({
          user_id: doc.user_id,
          _id: doc._id,
          created: doc.createdAt || null,
          updated: doc.updatedAt || null,
        })),
      },
      tags: ['cli', 'list-tokens'],
    }).catch(() => { });
  }
  await sendObservabilityLog({
    level: 'INFO',
    kind: 'SYSTEM',
    event: 'cli_list_tokens_success',
    message: 'CLI list-tokens completed',
    context: { tenant_id: process.env.TENANT_ID, token_count: docs.length },
    tags: ['cli', 'list-tokens', 'success'],
  }).catch(() => { });
  if (store.client && client) await store.client.close();
};

main().catch((err) => {
  sendObservabilityLog({
    level: 'ERROR',
    kind: 'SYSTEM',
    event: 'cli_list_tokens_failure',
    message: err.message || String(err),
    context: { tenant_id: process.env.TENANT_ID },
    payload: { error: err.message || String(err), stack: err.stack ? err.stack.substring(0, 1000) : null },
    tags: ['cli', 'list-tokens', 'failure'],
  }).catch(() => { }).finally(() => process.exit(1));
});
