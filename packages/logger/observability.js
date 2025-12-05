const os = require('os');

const defaults = {
  apiUrl: 'http://observability.jooservices.com/api/v1/logs',
  // apiKey: No default - must be provided via OBS_API_KEY environment variable
  serviceName: 'flickrhub-worker',
  serviceEnv: 'local',
};

const randomId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const loadConfig = () => {
  const apiUrl = process.env.OBS_API_URL || defaults.apiUrl;
  const apiKey = process.env.OBS_API_KEY; // Required - no default for security
  if (!apiKey) {
    throw new Error('OBS_API_KEY environment variable is required');
  }
  const serviceName = process.env.SERVICE_NAME || defaults.serviceName;
  const serviceEnv = process.env.SERVICE_ENV || process.env.NODE_ENV || defaults.serviceEnv;
  const tenantId = process.env.TENANT_ID || undefined;
  const debug = process.env.OBS_DEBUG === 'true';
  return { apiUrl, apiKey, serviceName, serviceEnv, tenantId, debug };
};

const sendObservabilityLog = async ({
  level = 'INFO',
  kind = 'SYSTEM',
  category = 'flickr.api',
  event = 'flickr_api_call',
  message = '',
  context = {},
  payload = {},
  tags = ['flickr', 'api'],
}) => {
  const { apiUrl, apiKey, serviceName, serviceEnv, tenantId, debug } = loadConfig();

  const body = {
    schema_version: 1,
    log_id: randomId(),
    timestamp: new Date().toISOString(),
    level,
    service: serviceName,
    environment: serviceEnv,
    kind,
    category,
    event,
    message,
    context,
    payload,
    host: {
      hostname: os.hostname(),
      ip: (os.networkInterfaces().eth0 || []).find((i) => i.family === 'IPv4')?.address,
      container_id: process.env.HOSTNAME,
    },
    tags,
  };

  if (tenantId) body.tenant_id = tenantId;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(body),
    });
    const text = debug ? await res.text() : null;
    if (!res.ok) {
      // OBS logging failed - silently handle to avoid console output
      return { ok: false, status: res.status, body: text || null };
    }
    return { ok: true, status: res.status, body: text || null };
  } catch (err) {
    // OBS logging error - silently handle to avoid console output
    return { ok: false, error: err.message || String(err) };
  }
};

module.exports = {
  sendObservabilityLog,
};
