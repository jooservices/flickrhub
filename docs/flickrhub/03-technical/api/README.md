---
title: "API Documentation"
type: "guideline"
what: "Complete API reference for FlickrHub endpoints, authentication, and webhook callbacks"
why: "Enable developers to integrate with FlickrHub API for Flickr operations"
how: "Use HTTP requests with JSON payloads to interact with OAuth, job enqueue, and status endpoints"
owner: "API Team"
status: "approved"
last_updated: "2024-12-04"
tags: ['api', 'reference', 'flickr', 'oauth', 'webhooks']
ai_semantics:
  layer: "technical"
  relates_to: ['api', 'oauth', 'jobs', 'callbacks', 'flickr']
---

# API Documentation

**Base URL:** `http://localhost:3000` (development)  
**Production:** Configure via environment variables

---

## Authentication (OAuth)

### POST /api/v1/auth/start

**Purpose:** Initiate OAuth 1.0a flow to obtain user credentials.

**Request Body:**
```json
{
  "api_key": "string (required)",
  "api_secret": "string (required)"
}
```

**Response:**
```json
{
  "authorize_url": "string",
  "oauth_token": "string",
  "state": "string",
  "mode": "oob" | "callback"
}
```

**Notes:**
- Mode defaults to `oob` (out-of-band) unless `OAUTH_MODE=callback` and `CALLBACK_URL` are set
- User must visit `authorize_url` to authorize the application
- Save `oauth_token` and `state` for the next step

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/start \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your_flickr_api_key",
    "api_secret": "your_flickr_api_secret"
  }'
```

---

### POST /api/v1/auth/complete

**Purpose:** Complete OAuth flow and obtain `user_id`.

**Request Body:**
```json
{
  "oauth_token": "string (required)",
  "oauth_verifier": "string (required)"
}
```

**Response:**
```json
{
  "user_id": "string (UUID)"
}
```

**Errors:**
- `400`: Invalid token/verifier combination

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/v1/auth/complete \
  -H "Content-Type: application/json" \
  -d '{
    "oauth_token": "token_from_start",
    "oauth_verifier": "verifier_from_authorization"
  }'
```

---

### GET /api/v1/auth/callback

**Purpose:** OAuth callback endpoint (when `OAUTH_MODE=callback`).

**Query Parameters:**
- `oauth_token` (required): Token from `/auth/start`
- `oauth_verifier` (required): Verifier from Flickr authorization

**Response:**
```json
{
  "status": "ok",
  "user_id": "string (UUID)"
}
```

**Note:** Use this endpoint when `OAUTH_MODE=callback` with a registered callback URL.

---

## Jobs

### POST /api/v1/flickr/rest

**Purpose:** Enqueue a Flickr API call for asynchronous processing.

**Request Body:**
```json
{
  "method": "string (required)",
  "params": "object (required)",
  "user_id": "string (required)",
  "target": "rest" | "upload" | "replace",
  "callback_url": "string (optional)",
  "callback_secret": "string (optional)",
  "meta": "object (optional)"
}
```

**Field Descriptions:**
- `method` (required, string): Flickr API method name (e.g., `flickr.test.echo`, `flickr.photos.search`)
- `params` (required, object): Parameters for the Flickr API method
- `user_id` (required, string): User ID obtained from OAuth flow
- `target` (optional, string): Queue target - `"rest"` | `"upload"` | `"replace"` (defaults to `"rest"`)
- `callback_url` (optional, string): URL to receive webhook callback when job completes
- `callback_secret` (optional, string): Secret for HMAC-SHA256 signature in callback header
- `meta` (optional, object): Client metadata to be echoed in callback payload

**Response:**
```json
{
  "request_id": "string (UUID)",
  "data": {
    "job_id": "string (UUID)"
  },
  "error": null
}
```

**HTTP Status:** `202 Accepted`

**Errors:**
- `400`: `ERR_INVALID_REQUEST` - Invalid request body or missing required fields
- `404`: `ERR_TOKEN_NOT_FOUND` - User token not found in database

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/v1/flickr/rest \
  -H "Content-Type: application/json" \
  -d '{
    "method": "flickr.test.echo",
    "params": {"name": "test"},
    "user_id": "<your-user-id>",
    "target": "rest",
    "callback_url": "https://client.example.com/webhook",
    "callback_secret": "hmac-secret",
    "meta": {
      "session_id": "session-123",
      "job_type": "contacts_page",
      "page": 1
    }
  }'
```

**Example (Node.js):**
```javascript
const response = await fetch('http://localhost:3000/api/v1/flickr/rest', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    method: 'flickr.test.echo',
    params: { name: 'test' },
    user_id: '<your-user-id>',
    target: 'rest',
    callback_url: 'https://client.example.com/webhook',
    callback_secret: 'hmac-secret',
    meta: {
      session_id: 'session-123',
      job_type: 'contacts_page'
    }
  })
});

const data = await response.json();
console.log('Job ID:', data.data.job_id);
```

**Example (Python):**
```python
import requests

response = requests.post(
    'http://localhost:3000/api/v1/flickr/rest',
    json={
        'method': 'flickr.test.echo',
        'params': {'name': 'test'},
        'user_id': '<your-user-id>',
        'target': 'rest',
        'callback_url': 'https://client.example.com/webhook',
        'callback_secret': 'hmac-secret',
        'meta': {
            'session_id': 'session-123',
            'job_type': 'contacts_page'
        }
    }
)

data = response.json()
print('Job ID:', data['data']['job_id'])
```

---

### POST /api/v1/flickr/jobs/status

**Purpose:** Fetch job status and result.

**Request Body:**
```json
{
  "job_id": "string (required)",
  "user_id": "string (required)"
}
```

**Response:**
```json
{
  "request_id": "string (UUID)",
  "data": {
    "id": "string (UUID)",
    "state": "completed" | "failed" | "queued" | "retrying",
    "returnvalue": {
      "from_cache": "boolean",
      "flickr": { /* Flickr API response */ },
      "observability": { /* Observability data */ }
    },
    "failedReason": "string | null",
    "stacktrace": "array | null",
    "queue": "string"
  },
  "error": null
}
```

**Errors:**
- `400`: `ERR_INVALID_REQUEST` - Missing `job_id` or `user_id`
- `404`: `ERR_JOB_NOT_FOUND` - Job not found or user ownership mismatch

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/v1/flickr/jobs/status \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "<job-id>",
    "user_id": "<your-user-id>"
  }'
```

**Example (Node.js):**
```javascript
const response = await fetch('http://localhost:3000/api/v1/flickr/jobs/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    job_id: '<job-id>',
    user_id: '<your-user-id>'
  })
});

const data = await response.json();
const result = data.data.returnvalue?.flickr; // Flickr API response
```

**Example (Python):**
```python
import requests

response = requests.post(
    'http://localhost:3000/api/v1/flickr/jobs/status',
    json={
        'job_id': '<job-id>',
        'user_id': '<your-user-id>'
    }
)

data = response.json()
result = data['data']['returnvalue']['flickr']  # Flickr API response
```

---

## Webhook Callbacks

**Purpose:** Receive job completion notifications via HTTP POST.

**When:** If `callback_url` is provided in the enqueue request, worker POSTs to this URL on completion or final failure.

**Retry Policy:** Best-effort with retry/backoff controlled by:
- `CALLBACK_RETRY_ATTEMPTS` (default: 3)
- `CALLBACK_RETRY_DELAY_MS` (default: 1000ms)

### Callback Payload (Completed Job)

**Endpoint:** `POST {callback_url}` (from original request)

**Headers:**
```
Content-Type: application/json
X-Signature: <hmac-sha256-hex> (if callback_secret provided)
```

**Signature Calculation:**
```
HMAC-SHA256(JSON.stringify(payload), callback_secret)
```

**Payload:**
```json
{
  "job_id": "string (UUID)",
  "user_id": "string (UUID)",
  "queue": "flickr_rest" | "flickr_upload" | "flickr_replace",
  "state": "completed",
  "result": { /* Flickr API response */ },
  "error": null,
  "from_cache": "boolean",
  "attempts_made": "number",
  "max_attempts": "number",
  "timestamp": "string (ISO 8601)",
  "trace_id": "string (UUID)",
  "meta": "object | null"
}
```

### Callback Payload (Failed Job)

**Payload:**
```json
{
  "job_id": "string (UUID)",
  "user_id": "string (UUID)",
  "queue": "flickr_rest" | "flickr_upload" | "flickr_replace",
  "state": "failed",
  "result": null,
  "error": {
    "message": "string",
    "code": "string | null"
  },
  "from_cache": false,
  "attempts_made": "number",
  "max_attempts": "number",
  "timestamp": "string (ISO 8601)",
  "trace_id": "string (UUID)",
  "meta": "object | null"
}
```

**Field Descriptions:**
- `job_id` (string): Job ID returned from enqueue endpoint
- `user_id` (string): User ID from original request
- `queue` (string): Queue name where job was processed
- `state` (string): Job state - `"completed"` | `"failed"`
- `result` (object | null): Flickr API response (if completed)
- `error` (object | null): Error details (if failed)
- `from_cache` (boolean): Whether result was served from cache
- `attempts_made` (number): Number of processing attempts
- `max_attempts` (number): Maximum retry attempts configured
- `timestamp` (string): ISO 8601 timestamp when callback is sent
- `trace_id` (string): Request trace ID for correlation (from original request)
- `meta` (object | null): Client metadata echoed from original request

**Signature Verification (Node.js):**
```javascript
const crypto = require('crypto');

function verifyCallbackSignature(body, signature, secret) {
  const jsonString = JSON.stringify(body);
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(jsonString)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  );
}

// Usage
const isValid = verifyCallbackSignature(
  callbackBody,
  req.headers['x-signature'],
  callbackSecret
);
```

**Signature Verification (Python):**
```python
import hmac
import hashlib
import json

def verify_callback_signature(body, signature, secret):
    json_string = json.dumps(body, sort_keys=True)
    expected_sig = hmac.new(
        secret.encode('utf-8'),
        json_string.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected_sig)

# Usage
is_valid = verify_callback_signature(
    callback_body,
    request.headers['X-Signature'],
    callback_secret
)
```

---

## Health Check

### GET /health

**Purpose:** Health check endpoint for monitoring and load balancers.

**Response:**
```json
{
  "status": "ok"
}
```

**HTTP Status:** `200 OK`

---

## Notes

- **Authentication:** `user_id` is obtained via OAuth flow (CLI or Web UI); tokens are stored only in MongoDB
- **Caching:** Cache keys are per `user_id` + `method` + `params`; TTL configurable
- **DLQ:** Jobs that exhaust retries are pushed to `flickr_dlq` queue
- **Mock Mode:** Set `MOCK_FLICKR=true` to bypass real Flickr calls (for dev/test)
- **Rate Limiting:** Per-user rate limiting (configurable, future enhancement)
- **Observability:** All operations logged to external OBS system

---

## Error Codes

| Code | Description |
|------|-------------|
| `ERR_INVALID_REQUEST` | Request validation failed (missing/invalid fields) |
| `ERR_TOKEN_NOT_FOUND` | User token not found in database |
| `ERR_JOB_NOT_FOUND` | Job not found or user ownership mismatch |

---

**Last Updated:** 2024-12-04
