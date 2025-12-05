const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { FlickrClient } = require('../../packages/flickr-client');
const { TokenStore } = require('../../packages/core/token-store');
const { sendObservabilityLog } = require('../../packages/logger/observability');

const envPath = path.join(process.cwd(), '.env');

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    if (!key) return;
    const value = rest.join('=');
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
};

const prompt = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

const parseTokenIdArg = () => {
  const tokenArg = process.argv.find((arg) => arg.startsWith('--token-id='));
  if (tokenArg) return tokenArg.split('=')[1];
  if (process.env.TOKEN_ID) return process.env.TOKEN_ID;
  return null;
};

const main = async () => {
  loadEnvFile(envPath);

  await sendObservabilityLog({
    level: 'INFO',
    kind: 'SYSTEM',
    event: 'cli_authorize_start',
    message: 'CLI authorize started',
    context: { tenant_id: process.env.TENANT_ID },
    tags: ['cli', 'authorize', 'start'],
  }).catch(() => { });

  const apiKey = process.env.FLICKR_API_KEY;
  const apiSecret = process.env.FLICKR_API_SECRET;

  if (!apiKey || !apiSecret) {
    await sendObservabilityLog({
      level: 'ERROR',
      kind: 'SYSTEM',
      event: 'cli_authorize_error',
      message: 'Missing Flickr API credentials',
      context: { tenant_id: process.env.TENANT_ID },
      payload: { error: 'missing_api_credentials' },
      tags: ['cli', 'authorize', 'error'],
    }).catch(() => { });
    process.exit(1);
  }

  const client = new FlickrClient({ apiKey, apiSecret });

  await sendObservabilityLog({
    level: 'INFO',
    kind: 'SYSTEM',
    event: 'cli_authorize_request_token',
    message: 'Requesting temporary token from Flickr',
    context: { tenant_id: process.env.TENANT_ID },
    tags: ['cli', 'authorize'],
  }).catch(() => { });

  const requestTokens = await client.getRequestToken('oob');
  const { oauth_token: oauthToken, oauth_token_secret: oauthTokenSecret } = requestTokens;

  await sendObservabilityLog({
    level: 'INFO',
    kind: 'SYSTEM',
    event: 'cli_authorize_url_generated',
    message: 'OAuth authorization URL generated',
    context: { tenant_id: process.env.TENANT_ID, oauth_token: oauthToken },
    payload: { authorize_url: `https://www.flickr.com/services/oauth/authorize?oauth_token=${oauthToken}&perms=write` },
    tags: ['cli', 'authorize'],
  }).catch(() => { });

  const verifier = await prompt('\nEnter the verifier code: ');
  if (!verifier) {
    await sendObservabilityLog({
      level: 'ERROR',
      kind: 'SYSTEM',
      event: 'cli_authorize_error',
      message: 'Verifier missing',
      context: { tenant_id: process.env.TENANT_ID },
      payload: { error: 'missing_verifier' },
      tags: ['cli', 'authorize', 'error'],
    }).catch(() => { });
    process.exit(1);
  }

  await sendObservabilityLog({
    level: 'INFO',
    kind: 'SYSTEM',
    event: 'cli_authorize_exchanging',
    message: 'Exchanging verifier for access tokens',
    context: { tenant_id: process.env.TENANT_ID },
    tags: ['cli', 'authorize'],
  }).catch(() => { });

  const accessTokens = await client.getAccessToken({
    oauthToken,
    oauthTokenSecret,
    verifier,
  });

  await sendObservabilityLog({
    level: 'INFO',
    kind: 'SYSTEM',
    event: 'cli_authorize_tokens_received',
    message: 'Access tokens received',
    context: { tenant_id: process.env.TENANT_ID, user_nsid: accessTokens.user_nsid, username: accessTokens.username },
    tags: ['cli', 'authorize'],
  }).catch(() => { });

  if (process.env.MONGO_URL) {
    const presetTokenId = parseTokenIdArg();
    const userIdInput = presetTokenId || (await prompt('\nEnter user_id to save (blank = auto-generate UUID): ')) || '';
    const store = new TokenStore();
    const userId = await store.put(userIdInput || undefined, {
      oauth_token: accessTokens.oauth_token,
      oauth_token_secret: accessTokens.oauth_token_secret,
      user_nsid: accessTokens.user_nsid,
      username: accessTokens.username,
    });
    await sendObservabilityLog({
      level: 'INFO',
      kind: 'SYSTEM',
      event: 'cli_authorize_token_saved',
      message: `Token saved under user_id: ${userId}`,
      context: { tenant_id: process.env.TENANT_ID, user_id: userId },
      tags: ['cli', 'authorize'],
    }).catch(() => { });
  }

  try {
    await sendObservabilityLog({
      level: 'INFO',
      kind: 'SYSTEM',
      event: 'cli_authorize_test_login',
      message: 'Testing token with flickr.test.login',
      context: { tenant_id: process.env.TENANT_ID },
      tags: ['cli', 'authorize'],
    }).catch(() => { });

    const result = await client.callRest(
      'flickr.test.login',
      {},
      accessTokens.oauth_token,
      accessTokens.oauth_token_secret
    );
    await sendObservabilityLog({
      level: 'INFO',
      kind: 'SYSTEM',
      event: 'cli_authorize_test_login_success',
      message: 'flickr.test.login succeeded',
      context: { tenant_id: process.env.TENANT_ID },
      payload: { result },
      tags: ['cli', 'authorize'],
    }).catch(() => { });
  } catch (error) {
    await sendObservabilityLog({
      level: 'WARN',
      kind: 'SYSTEM',
      event: 'cli_authorize_test_login_failed',
      message: `REST quick check failed: ${error.message}`,
      context: { tenant_id: process.env.TENANT_ID },
      payload: { error: error.message },
      tags: ['cli', 'authorize', 'warning'],
    }).catch(() => { });
  }

  await sendObservabilityLog({
    level: 'INFO',
    kind: 'SYSTEM',
    event: 'cli_authorize_success',
    message: 'CLI authorize completed successfully',
    context: { tenant_id: process.env.TENANT_ID },
    tags: ['cli', 'authorize', 'success'],
  }).catch(() => { });
};

main().catch((error) => {
  sendObservabilityLog({
    level: 'ERROR',
    kind: 'SYSTEM',
    event: 'cli_authorize_failure',
    message: error.message,
    context: { tenant_id: process.env.TENANT_ID },
    payload: { error: error.message, stack: error.stack ? error.stack.substring(0, 1000) : null },
    tags: ['cli', 'authorize', 'failure'],
  }).catch(() => { }).finally(() => process.exit(1));
});
