# FlickrHub E2E Testing - Complete Guide

## Overview

FlickrHub E2E testing tool supports two modes:

1. **JSON-based tests** - Load payload and validations from JSON files (recommended)
2. **Quick tests** - Hardcoded test for rapid validation

## Quick Start with JSON Tests

### 1. Ensure Services Are Running

```bash
docker-compose up -d
```

Verify services:

```bash
docker-compose ps
```

You should see all services running (api, worker_rest, worker_upload, worker_replace, mongo, redis, rabbit).

### 2. Get a User ID

If you don't have a user_id yet, run the OAuth flow:

```bash
# E2E Testing Guide

> **Note**: E2E tests require a valid, pre-authorized `user_id`. These tests cannot be fully automated in CI/CD without a persistent test user.

## Prerequisites
1.  **FlickrHub Stack**: Ensure API, Worker, Redis, Mongo, RabbitMQ are running.
2.  **Authorized User**: You must have a `user_id` that exists in the database and has valid Flickr tokens.

## Running Tests
Use the `tests/e2e/run.js` tool:

```bash
node tests/e2e/run.js <user_id> <test_config_file> [api_url]
```

Example:

```bash
node tools/e2e-test.js 869737a6-71fb-435a-b686-0b1819d058ef tests/e2e/meta-field-test.json
```

## Test Configuration Format

Test configuration files use JSON format with three main sections:

```json
{
  "name": "Test Name",
  "description": "What this test validates",
  "payload": {
    "method": "flickr.method.name",
    "params": {...},
    "target": "rest",
    "meta": {...}
  },
  "validations": [...]
}
```

### Payload Section

The `payload` section defines the request to send to FlickrHub API:

```json
{
  "payload": {
    "method": "flickr.contacts.getList",
    "params": {
      "per_page": 500,
      "page": 2
    },
    "target": "rest",
    "meta": {
      "session_id": "test-session-123",
      "job_type": "contacts_page",
      "page": 2,
      "custom_data": {
        "user": "xyz",
        "tags": ["important", "test"]
      }
    }
  }
}
```

**Note:** `user_id` and `callback_url` are automatically added by the test tool.

### Validations Section

The `validations` section defines flexible validation rules:

#### Validation Types

**1. `exists` - Check if field exists**

```json
{
  "description": "Meta field should exist",
  "type": "exists",
  "path": "meta"
}
```

**2. `equals` - Check if field equals expected value**

```json
{
  "description": "Session ID should match",
  "type": "equals",
  "path": "meta.session_id",
  "expected": "test-session-123"
}
```

#### Path Syntax

Support for nested objects and arrays:

**Nested object access:**

```json
{
  "type": "equals",
  "path": "meta.custom_data.user",
  "expected": "xyz"
}
```

**Array element access:**

```json
{
  "type": "equals",
  "path": "meta.custom_data.tags[0]",
  "expected": "important"
}
```

**Deep nested arrays:**

```json
{
  "type": "equals",
  "path": "result.contacts.contact[0].username",
  "expected": "john_doe"
}
```

### Complete Example

Here's a complete test configuration:

```json
{
  "name": "Meta Field Pass-Through Test",
  "description": "Validates meta field is correctly passed through",
  "payload": {
    "method": "flickr.contacts.getList",
    "params": {
      "per_page": 500,
      "page": 2
    },
    "target": "rest",
    "meta": {
      "session_id": "test-session-123",
      "job_type": "contacts_page",
      "custom_data": {
        "user": "xyz",
        "tags": ["important", "test"]
      }
    }
  },
  "validations": [
    {
      "description": "Job should complete",
      "type": "equals",
      "path": "state",
      "expected": "completed"
    },
    {
      "description": "Meta field should exist",
      "type": "exists",
      "path": "meta"
    },
    {
      "description": "Session ID should match",
      "type": "equals",
      "path": "meta.session_id",
      "expected": "test-session-123"
    },
    {
      "description": "Custom user should be xyz",
      "type": "equals",
      "path": "meta.custom_data.user",
      "expected": "xyz"
    },
    {
      "description": "First tag should be important",
      "type": "equals",
      "path": "meta.custom_data.tags[0]",
      "expected": "important"
    }
  ]
}
```

### Expected Output

```
============================================================
FlickrHub E2E Test - Meta Field Pass-Through
============================================================

ℹ API URL: http://localhost:3000
ℹ User ID: 869737a6-71fb-435a-b686-0b1819d058ef
ℹ Session ID: e2e-session-1733280000000

[1/4] Starting callback server
✓ Callback server listening on http://127.0.0.1:4001/callback

[2/4] Sending test request to FlickrHub API
ℹ Request payload:
{
  "method": "flickr.contacts.getList",
  "params": {
    "per_page": 500,
    "page": 2,
    "callback_url": "http://host.docker.internal:4001/callback"
  },
  "user_id": "869737a6-71fb-435a-b686-0b1819d058ef",
  "target": "rest",
  "callback_url": "http://host.docker.internal:4001/callback",
  "meta": {
    "session_id": "e2e-session-1733280000000",
    "job_type": "contacts_page",
    "page": 2,
    "per_page": 500
  }
}
✓ Job enqueued: 550e8400-e29b-41d4-a716-446655440000

[3/4] Waiting for job completion
⏳ Job state: processing...
✓ Job completed

[4/4] Validating callback response
ℹ Callback received for job 550e8400-e29b-41d4-a716-446655440000
✓ Callback received

Callback Details:
{
  "timestamp": "2024-12-04T01:53:20.123Z",
  "signature": "abc123...",
  "payload": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "869737a6-71fb-435a-b686-0b1819d058ef",
    "queue": "flickr_rest",
    "state": "completed",
    "result": {...},
    "error": null,
    "from_cache": false,
    "attempts_made": 0,
    "max_attempts": 3,
    "timestamp": "2024-12-04T01:53:20.000Z",
    "trace_id": "req-123",
    "meta": {
      "session_id": "e2e-session-1733280000000",
      "job_type": "contacts_page",
      "page": 2,
      "per_page": 500
    }
  }
}

Validation Results:
✓ Job ID matches
✓ State is completed
✓ Meta field matches expected values
  session_id: e2e-session-1733280000000
  job_type: contacts_page
  page: 2
  per_page: 500
✓ Signature header present

============================================================
🎉 ALL TESTS PASSED! 🎉
============================================================

✓ Meta field is correctly passed through from request to callback
✓ Job processed successfully
✓ Callback received with all expected data
```

## Troubleshooting

### Services Not Running

```bash
# Restart services
docker-compose down
docker-compose up -d --build

# Check logs
docker-compose logs -f api
docker-compose logs -f worker_rest
```

### No User ID

Run OAuth flow:

```bash
MONGO_URL=mongodb://localhost:27019/flickrhub npm run cli:auth
```

### Connection Refused

Make sure the API is accessible:

```bash
curl http://localhost:3000/health
```

Should return: `{"status":"ok"}`

### Test Timeout

- Check if worker is processing jobs: `docker-compose logs worker_rest`
- Verify Flickr API credentials in `.env`
- Check RabbitMQ queue: visit http://localhost:15672 (guest/guest)

## Manual Testing

If you prefer manual testing:

### Terminal 1: Start Callback Server

```bash
PORT=4001 node tools/callback-server.js
```

### Terminal 2: Run Test

```bash
node tools/test-callback-e2e.js <your_user_id>
```

### Terminal 3: Watch Logs

```bash
tail -f callback.log
```

## Production Usage

In production, include `meta` field in your API calls:

```bash
curl -X POST https://your-flickrhub.com/api/v1/flickr/rest \
  -H "Content-Type: application/json" \
  -d '{
    "method": "flickr.contacts.getList",
    "params": {
      "per_page": 500,
      "page": 2
    },
    "user_id": "your-user-id",
    "target": "rest",
    "callback_url": "https://your-app.com/webhook/flickr",
    "meta": {
      "session_id": "user-session-abc123",
      "job_type": "contacts_page",
      "page": 2,
      "per_page": 500,
      "custom_field": "any value you want"
    }
  }'
```

Your callback endpoint will receive the complete payload including the unchanged `meta` field.

## What Gets Tested

The E2E test validates:

1. ✅ Callback server starts successfully
2. ✅ Request is accepted by FlickrHub API
3. ✅ Job is enqueued with meta field
4. ✅ Worker processes the job
5. ✅ Meta field is stored in MongoDB
6. ✅ Meta field is passed through the queue
7. ✅ Callback is sent with complete payload
8. ✅ Meta field in callback matches request exactly
9. ✅ HMAC signature is present (if secret provided)
10. ✅ Cleanup completes successfully

## Next Steps

After successful testing:

1. **Integrate**: Update your client application to send meta fields
2. **Monitor**: Check callback logs in production
3. **Customize**: Adjust meta field structure for your use case
4. **Scale**: Use meta field for pagination, session tracking, etc.

## Support

For issues or questions:

- Check documentation: [README.md](../README.md)
- Review code: [Implementation Plan](/.gemini/antigravity/brain/3d015710-13dd-47f9-aa69-d38cbbbe475b/implementation_plan.md)
- Read walkthrough: [Walkthrough](/.gemini/antigravity/brain/3d015710-13dd-47f9-aa69-d38cbbbe475b/walkthrough.md)
