#!/usr/bin/env node
/**
 * Enhanced E2E Test Tool for FlickrHub
 *
 * Features:
 * - Load test configuration from JSON files
 * - Flexible validation rules (exists, equals)
 * - Support for nested paths and array indexing
 * - Colored output with detailed results
 *
 * Usage:
 *   node tools/e2e-test.js <user_id> <test_config_file> [api_url]
 *
 * Example:
 *   node tools/e2e-test.js user-123 tests/e2e/meta-field-test.json
 *   node tools/e2e-test.js user-123 tests/e2e/simple-test.json http://localhost:3000
 *
 * Test Config Format:
 * {
 *   "name": "Test Name",
 *   "description": "Test description",
 *   "payload": {
 *     "method": "flickr.method",
 *     "params": {...},
 *     "target": "rest",
 *     "meta": {...}
 *   },
 *   "validations": [
 *     {
 *       "description": "Field should exist",
 *       "type": "exists",
 *       "path": "field.path"
 *     },
 *     {
 *       "description": "Field should equal value",
 *       "type": "equals",
 *       "path": "field.path",
 *       "expected": "value"
 *     }
 *   ]
 * }
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (num, total, msg) =>
    console.log(`\n${colors.cyan}[${num}/${total}]${colors.reset} ${colors.bright}${msg}${colors.reset}`),
  header: (msg) =>
    console.log(
      `\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n${colors.bright}${msg}${colors.reset}\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`
    ),
  validation: (passed, msg) => console.log(`  ${passed ? colors.green + '✓' : colors.red + '✗'}${colors.reset} ${msg}`),
};

// Configuration
const USER_ID = process.argv[2];
const TEST_CONFIG_FILE = process.argv[3];
const API_URL = process.argv[4] || process.env.API_URL || 'http://localhost:3000';
const CALLBACK_PORT = 4001;
const CALLBACK_HOST = '127.0.0.1';
const CALLBACK_URL = `http://host.docker.internal:${CALLBACK_PORT}/callback`;
const MAX_WAIT_MS = 60000; // 60 seconds

if (process.argv.length < 4) { // Need at least node, script, user_id, test_config_file
  console.log('Usage: node tests/e2e/run.js <user_id> <test_config_file> [api_url]');
  console.log('Example: node tests/e2e/run.js user-123 tests/e2e/meta-field-test.json');
  process.exit(1);
}

// Load test configuration
let testConfig;
try {
  const configPath = path.resolve(process.cwd(), TEST_CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    console.error(`${colors.red}Error:${colors.reset} Test config file not found: ${configPath}`);
    process.exit(1);
  }
  const configContent = fs.readFileSync(configPath, 'utf8');
  testConfig = JSON.parse(configContent);

  // Validate config structure
  if (!testConfig.payload) {
    throw new Error('Test config must have "payload" field');
  }
  if (!testConfig.validations || !Array.isArray(testConfig.validations)) {
    throw new Error('Test config must have "validations" array');
  }
} catch (err) {
  console.error(`${colors.red}Error loading test config:${colors.reset} ${err.message}`);
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// HTTP request helper
const makeRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (err) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

/**
 * Get value from object using dot notation path with array support
 * Examples:
 *   - "user.name" -> obj.user.name
 *   - "users[0].name" -> obj.users[0].name
 *   - "data.items[1].value" -> obj.data.items[1].value
 */
const getValueByPath = (obj, path) => {
  if (!path) return obj;

  // Split path by dots and array brackets
  const parts = path.split(/\.|\[|\]/).filter((p) => p !== '');

  let current = obj;
  for (const part of parts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }

  return current;
};

/**
 * Validation rule engine
 */
const validators = {
  exists: (value, expected, path) => {
    const exists = value !== undefined && value !== null;
    return {
      passed: exists,
      message: exists ? `Field '${path}' exists` : `Field '${path}' does not exist`,
    };
  },

  equals: (value, expected, path) => {
    const isEqual = JSON.stringify(value) === JSON.stringify(expected);
    return {
      passed: isEqual,
      message: isEqual
        ? `Field '${path}' equals expected value`
        : `Field '${path}' mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`,
    };
  },
};

/**
 * Run validation rules against callback payload
 */
const runValidations = (callbackPayload, validations) => {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const validation of validations) {
    const { type, path, expected, description } = validation;

    if (!validators[type]) {
      results.push({
        passed: false,
        description: description || `Unknown validation type: ${type}`,
        message: `Unknown validation type: ${type}`,
      });
      failed++;
      continue;
    }

    const value = getValueByPath(callbackPayload, path);
    const result = validators[type](value, expected, path);

    results.push({
      passed: result.passed,
      description: description || result.message,
      message: result.message,
      path,
      expected,
      actual: value,
    });

    if (result.passed) {
      passed++;
    } else {
      failed++;
    }
  }

  return { results, passed, failed, total: validations.length };
};

// Callback server management
class CallbackServer {
  constructor() {
    this.server = null;
    this.callbacks = [];
    this.isRunning = false;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.method !== 'POST' || req.url !== '/callback') {
          res.writeHead(404);
          return res.end('not found');
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
          if (body.length > 1e6) req.socket.destroy();
        });

        req.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(body || '{}');
          } catch (err) {
            parsed = { parse_error: err.message, raw: body };
          }

          const signature = req.headers['x-signature'] || null;
          const callbackData = {
            timestamp: new Date().toISOString(),
            signature,
            payload: parsed,
          };

          this.callbacks.push(callbackData);
          log.info(`Callback received for job ${parsed.job_id || 'unknown'}`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok' }));
        });
      });

      this.server.on('error', reject);

      this.server.listen(CALLBACK_PORT, CALLBACK_HOST, () => {
        this.isRunning = true;
        log.success(`Callback server listening on http://${CALLBACK_HOST}:${CALLBACK_PORT}/callback`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.isRunning = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  findCallback(jobId) {
    return this.callbacks.find((cb) => cb.payload && cb.payload.job_id === jobId);
  }
}

// Main test flow
const runTest = async () => {
  const callbackServer = new CallbackServer();
  let jobId = null;

  // Cleanup handler
  const cleanup = async () => {
    log.info('Cleaning up...');
    await callbackServer.stop();
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  try {
    log.header(`FlickrHub E2E Test: ${testConfig.name || 'Unnamed Test'}`);
    if (testConfig.description) {
      console.log(`${colors.cyan}Description:${colors.reset} ${testConfig.description}\n`);
    }
    log.info(`API URL: ${API_URL}`);
    log.info(`User ID: ${USER_ID}`);
    log.info(`Test Config: ${TEST_CONFIG_FILE}`);

    // Step 1: Start callback server
    log.step(1, 4, 'Starting callback server');
    await callbackServer.start();

    // Step 2: Send test request
    log.step(2, 4, 'Sending test request to FlickrHub API');

    // Merge user_id and callback_url into payload
    const requestPayload = {
      ...testConfig.payload,
      user_id: USER_ID,
      callback_url: CALLBACK_URL,
    };

    log.info('Request payload:');
    console.log(JSON.stringify(requestPayload, null, 2));

    const enqueueResponse = await makeRequest('POST', '/api/v1/flickr/rest', requestPayload);

    if (enqueueResponse.status !== 202) {
      log.error('Failed to enqueue job');
      log.error(`Status: ${enqueueResponse.status}`);
      log.error(`Response: ${JSON.stringify(enqueueResponse.body, null, 2)}`);
      await cleanup();
      process.exit(1);
    }

    jobId = enqueueResponse.body?.data?.job_id;
    if (!jobId) {
      log.error('No job_id in response');
      log.error(`Response: ${JSON.stringify(enqueueResponse.body, null, 2)}`);
      await cleanup();
      process.exit(1);
    }

    log.success(`Job enqueued: ${jobId}`);

    // Step 3: Wait for job completion
    log.step(3, 4, 'Waiting for job completion');
    let jobCompleted = false;
    const startTime = Date.now();

    while (!jobCompleted && Date.now() - startTime < MAX_WAIT_MS) {
      await sleep(1000);

      const statusResponse = await makeRequest('POST', '/api/v1/flickr/jobs/status', {
        job_id: jobId,
        user_id: USER_ID,
      });

      if (statusResponse.status === 200 && statusResponse.body?.data) {
        const state = statusResponse.body.data.state;
        process.stdout.write(`\r${colors.yellow}⏳${colors.reset} Job state: ${state}...`);

        if (state === 'completed') {
          jobCompleted = true;
          process.stdout.write('\n');
          log.success('Job completed');
        } else if (state === 'failed') {
          process.stdout.write('\n');
          log.error('Job failed');
          log.error(`Reason: ${statusResponse.body.data.failedReason}`);
          await cleanup();
          process.exit(1);
        }
      }
    }

    if (!jobCompleted) {
      log.error('Job did not complete within timeout');
      await cleanup();
      process.exit(1);
    }

    // Step 4: Validate callback
    log.step(4, 4, 'Validating callback response');
    await sleep(2000);

    const callbackEntry = callbackServer.findCallback(jobId);

    if (!callbackEntry) {
      log.error('Callback not received');
      log.error(`Expected callback for job: ${jobId}`);
      log.error(`Callbacks received: ${callbackServer.callbacks.length}`);
      await cleanup();
      process.exit(1);
    }

    log.success('Callback received');

    // Run validations
    console.log('\n' + colors.bright + 'Running Validations:' + colors.reset);
    const validationResults = runValidations(callbackEntry.payload, testConfig.validations);

    validationResults.results.forEach((result) => {
      log.validation(result.passed, result.description);
      if (!result.passed && result.message !== result.description) {
        console.log(`    ${colors.yellow}→${colors.reset} ${result.message}`);
      }
    });

    // Summary
    console.log('\n' + colors.bright + 'Validation Summary:' + colors.reset);
    console.log(`  ${colors.green}Passed:${colors.reset} ${validationResults.passed}/${validationResults.total}`);
    console.log(`  ${colors.red}Failed:${colors.reset} ${validationResults.failed}/${validationResults.total}`);

    if (validationResults.failed > 0) {
      log.error(`\n${validationResults.failed} validation(s) failed`);

      console.log('\n' + colors.bright + 'Callback Payload:' + colors.reset);
      console.log(JSON.stringify(callbackEntry.payload, null, 2));

      await cleanup();
      process.exit(1);
    }

    // Success!
    log.header('🎉 ALL TESTS PASSED! 🎉');
    console.log(`\n${colors.green}✓${colors.reset} All ${validationResults.total} validation(s) passed`);
    console.log(`${colors.green}✓${colors.reset} Callback received with expected data\n`);

    await cleanup();
    process.exit(0);
  } catch (err) {
    log.error(`Test failed with error: ${err.message}`);
    console.error(err);
    await cleanup();
    process.exit(1);
  }
};

runTest();
