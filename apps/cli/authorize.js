const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { FlickrClient } = require('../../packages/flickr-client');
const { TokenStore } = require('../../packages/core/token-store');

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

  const apiKey = process.env.FLICKR_API_KEY;
  const apiSecret = process.env.FLICKR_API_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('Missing FLICKR_API_KEY or FLICKR_API_SECRET. Add them to .env.');
    process.exit(1);
  }

  const client = new FlickrClient({ apiKey, apiSecret });

  console.log('Requesting temporary token from Flickr...');
  const requestTokens = await client.getRequestToken('oob');
  const { oauth_token: oauthToken, oauth_token_secret: oauthTokenSecret } = requestTokens;

  console.log('\n1) Open this URL in your browser and authorize the app:');
  console.log(`https://www.flickr.com/services/oauth/authorize?oauth_token=${oauthToken}&perms=write`);
  console.log('\n2) After authorizing, Flickr will give you a verifier code (oauth_verifier).');

  const verifier = await prompt('\nEnter the verifier code: ');
  if (!verifier) {
    console.error('No verifier provided, aborting.');
    process.exit(1);
  }

  console.log('\nExchanging verifier for access tokens...');
  const accessTokens = await client.getAccessToken({
    oauthToken,
    oauthTokenSecret,
    verifier,
  });

  console.log('\nSuccess! Store these safely:');
  console.log(`oauth_token=${accessTokens.oauth_token}`);
  console.log(`oauth_token_secret=${accessTokens.oauth_token_secret}`);
  if (accessTokens.user_nsid) console.log(`user_nsid=${accessTokens.user_nsid}`);
  if (accessTokens.username) console.log(`username=${accessTokens.username}`);

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
    console.log(`Saved token under user_id="${userId}" (use this in API requests)`);
  }

  try {
    console.log('\nQuick check via flickr.test.login ...');
    const result = await client.callRest(
      'flickr.test.login',
      {},
      accessTokens.oauth_token,
      accessTokens.oauth_token_secret
    );
    console.log('API call response:', result);
  } catch (error) {
    console.warn('REST quick check failed:', error.message);
  }
};

main().catch((error) => {
  console.error('CLI failed:', error);
  process.exit(1);
});
