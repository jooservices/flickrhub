#!/usr/bin/env node
/**
 * Helper script to manage Docker lifecycle and required configuration.
 * Flow:
 * 1) Detect existing containers -> prompt upgrade or full reset (double confirm for reset).
 * 2) Prompt for OBS URL/key (always) and verify connectivity.
 * 3) Bring up docker compose (build if needed).
 * 4) Health check containers and API /health.
 * 5) Optional: collect Flickr API key/secret, run authorize CLI, and test flickr.test.echo.
 * 6) Print summary.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const envPath = path.join(process.cwd(), '.env');
const DEFAULT_OBS_URL = 'http://observability.jooservices.com';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadEnv = () => {
  if (!fs.existsSync(envPath)) return {};
  return fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .reduce((acc, line) => {
      if (line.startsWith('#')) return acc;
      const [k, ...rest] = line.split('=');
      if (!k) return acc;
      acc[k] = rest.join('=');
      return acc;
    }, {});
};

const saveEnv = (envObj) => {
  const body = Object.entries(envObj)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  fs.writeFileSync(envPath, body);
};

const run = (cmd) => execSync(cmd, { stdio: 'inherit' });

const verifyObs = (url, key) => {
  try {
    execSync(
      `node -e "fetch('${url}',{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':'${key}'},body:'{}'})"`,
      { stdio: 'ignore' }
    );
    return true;
  } catch {
    return false;
  }
};

const checkApiHealth = () => {
  try {
    const res = execSync(
      `node -e "fetch('http://localhost:3000/health',{timeout:3000}).then(r=>r.text()).then(t=>console.log(t)).catch(e=>{console.error(e.message);process.exit(1);})"`,
      { stdio: 'inherit' }
    );
    return true;
  } catch {
    return false;
  }
};

const waitForApiHealth = async (attempts = 10, delayMs = 3000) => {
  for (let i = 1; i <= attempts; i++) {
    const ok = checkApiHealth();
    if (ok) return true;
    console.log(`Health check attempt ${i}/${attempts} failed; retrying in ${delayMs / 1000}s...`);
    await sleep(delayMs);
  }
  return false;
};

const testFlickrEcho = (userId) => {
  const payload = {
    method: 'flickr.test.echo',
    params: { ping: 'pong' },
    user_id: userId,
    target: 'rest',
  };
  return fetch('http://localhost:3000/api/v1/flickr/rest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      console.log('flickr.test.echo status', res.status);
      const text = await res.text();
      console.log(text);
      return res.ok;
    })
    .catch((err) => {
      console.error('flickr.test.echo error:', err.message);
      return false;
    });
};

const runAuthFlow = async ({ apiBase, key, secret }) => {
  const startRes = await fetch(`${apiBase}/api/v1/auth/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: key, api_secret: secret }),
  });
  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(`auth/start failed (${startRes.status}): ${text}`);
  }
  const startBody = await startRes.json();
  const data = startBody.data || {};
  console.log('\nOpen this URL to authorize:');
  console.log(data.authorize_url || data.url || '(missing authorize_url)');

  const verifier = await ask('\nEnter oauth_verifier from Flickr (or leave blank to skip): ');
  if (!verifier) {
    console.log('Skipping auth/complete (no verifier provided).');
    return null;
  }

  const completeRes = await fetch(`${apiBase}/api/v1/auth/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oauth_token: data.oauth_token, oauth_verifier: verifier }),
  });
  if (!completeRes.ok) {
    const text = await completeRes.text();
    throw new Error(`auth/complete failed (${completeRes.status}): ${text}`);
  }
  const completeBody = await completeRes.json();
  const userId = completeBody.data?.user_id;
  console.log(`\n✅ Authorization complete. user_id=${userId || '(missing)'}`);
  return userId;
};

const main = async () => {
  const env = loadEnv();

  // Always prompt for OBS config (existing values shown as defaults)
  const currentObsUrl = env.OBS_API_URL || DEFAULT_OBS_URL;
  const obsUrl = (await ask(`OBS_API_URL [${currentObsUrl}]: `)) || currentObsUrl;
  let obsKey = env.OBS_API_KEY || '';
  const obsKeyInput = await ask(`OBS_API_KEY${obsKey ? ' [press Enter to keep existing]' : ' (required)'}: `);
  if (obsKeyInput) obsKey = obsKeyInput;
  while (!obsKey) {
    const retry = await ask('OBS_API_KEY is required. Enter key: ');
    if (retry) obsKey = retry;
  }

  const canConnectObs = verifyObs(obsUrl, obsKey);
  if (canConnectObs) {
    console.log('✅ OBS connectivity check passed.');
  } else {
    console.warn('⚠️  Unable to reach OBS endpoint with provided URL/key. Proceeding anyway.');
  }
  console.log('Proceeding to container setup and health checks...');

  // Prompt for service env label
  const currentServiceEnv = env.SERVICE_ENV || 'local';
  console.log('SERVICE_ENV is the environment label for OBS (e.g., local, dev, staging, prod).');
  const serviceEnv = (await ask(`SERVICE_ENV [${currentServiceEnv}]: `)) || currentServiceEnv;

  env.OBS_API_URL = obsUrl;
  env.OBS_API_KEY = obsKey;
  env.SERVICE_ENV = serviceEnv;
  // Preserve other existing env keys
  saveEnv(env);

  // Check existing services
  let services = [];
  try {
    const out = execSync('docker compose ps --services', { encoding: 'utf8' }).trim();
    services = out ? out.split('\n') : [];
  } catch (_) {
    // Ignore if compose not initialized yet
  }

  let actionTaken = false;
  if (services.length) {
    const reset = (await ask('Containers exist. Full reset (down -v, rebuild, up)? [y/N]: ')).toLowerCase() === 'y';
    if (reset) {
      const confirm = await ask('Type RESET to confirm full reset: ');
      if (confirm === 'RESET') {
        run('docker compose down -v --remove-orphans');
        run('docker compose up -d --build');
        actionTaken = true;
      } else {
        console.log('Full reset cancelled.');
      }
    } else {
      const upgrade = (await ask('Upgrade (rebuild & up)? [y/N]: ')).toLowerCase() === 'y';
      if (upgrade) {
        run('docker compose up -d --build');
        actionTaken = true;
      }
    }
    if (!actionTaken) {
      console.log('No reset/upgrade selected; leaving containers as-is.');
    }
  }
  if (!services.length || !actionTaken) {
    console.log('Bringing up stack...');
    run('docker compose up -d --build');
  }

  // Health summary
  try {
    const out = execSync('docker compose ps', { encoding: 'utf8' });
    console.log('\nService status:\n');
    console.log(out);
    const unhealthy = out
      .split('\n')
      .filter((line) => /unhealthy|exit|dead/i.test(line));
    if (unhealthy.length) {
      console.warn('Some services are not healthy. Check logs above.');
    } else {
      console.log('All services reported running/healthy.');
    }
  } catch (err) {
    console.warn('Failed to read service status:', err.message);
  }

  console.log('Waiting for API health...');
  const apiHealthy = await waitForApiHealth();
  if (!apiHealthy) {
    console.warn('⚠️  API health check failed after retries. Verify logs.');
  }

  // Optional Flickr key/secret + API auth flow + test
  const runApiAuth = (await ask('Run Flickr auth flow now (generate user_id via API)? [y/N]: ')).toLowerCase() === 'y';
  let userIdFromAuth = null;
  if (runApiAuth) {
    const flickrKey = (await ask(`FLICKR_API_KEY [${env.FLICKR_API_KEY || ''}]: `)) || env.FLICKR_API_KEY || '';
    const flickrSecret =
      (await ask(`FLICKR_API_SECRET [${env.FLICKR_API_SECRET || ''}]: `)) || env.FLICKR_API_SECRET || '';
    if (!flickrKey || !flickrSecret) {
      console.warn('⚠️  Flickr key/secret not provided; skipping auth flow.');
    } else {
      env.FLICKR_API_KEY = flickrKey;
      env.FLICKR_API_SECRET = flickrSecret;
      saveEnv(env);
      const apiBase = process.env.API_BASE || 'http://localhost:3000';
      try {
        userIdFromAuth = await runAuthFlow({ apiBase, key: flickrKey, secret: flickrSecret });
      } catch (err) {
        console.warn('Authorize via API failed:', err.message);
      }
    }
  }

  const testUserId =
    userIdFromAuth ||
    (await ask('Enter user_id to test flickr.test.echo (optional, press Enter to skip): '));
  if (testUserId) {
    const ok = await testFlickrEcho(testUserId);
    if (!ok) console.warn('⚠️  flickr.test.echo call failed. Check API logs.');
  }

  console.log('\n✅ Setup script completed.');
  console.log('- OBS connectivity:', canConnectObs ? 'OK' : 'FAILED');
  console.log('- API health:', apiHealthy ? 'OK' : 'FAILED (check logs)');
  if (env.FLICKR_API_KEY && env.FLICKR_API_SECRET) console.log('- Flickr creds saved to .env');
  if (userIdFromAuth) console.log(`- Authorized user_id: ${userIdFromAuth}`);

  rl.close();
};

main().catch((err) => {
  console.error('Setup failed:', err.message);
  rl.close();
  process.exit(1);
});
