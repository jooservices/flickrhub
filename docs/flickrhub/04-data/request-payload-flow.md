# Request/Payload Summary - Quick Reference

Tóm tắt nhanh các request/payload trong flow.

---

## 1. Client → FH API

**Endpoint:** `POST /api/v1/flickr/rest`

**Request:**

```json
{
  "method": "flickr.test.echo",
  "params": { "name": "test" },
  "user_id": "user-123",
  "target": "rest",
  "callback_url": "http://host.docker.internal:4001/callback",
  "callback_secret": "secret-123"
}
```

**Response (202):**

```json
{
  "request_id": "req-1e",
  "data": { "job_id": "job-uuid" },
  "error": null
}
```

---

## 2. FH → RabbitMQ

**Payload:**

```json
{
  "jobId": "job-uuid",
  "method": "flickr.test.echo",
  "params": { "name": "test" },
  "userId": "user-123",
  "target": "rest",
  "url": "https://api.flickr.com/services/rest",
  "callbackUrl": "http://host.docker.internal:4001/callback",
  "callbackSecret": "secret-123",
  "traceId": "req-1e",
  "requestMeta": { "ip": "...", "userAgent": "..." }
}
```

---

## 3. FH Worker → Flickr API

**Endpoint:** `POST https://api.flickr.com/services/rest`

**Body (form-urlencoded):**

```
method=flickr.test.echo
&format=json
&nojsoncallback=1
&name=test
&oauth_consumer_key=...
&oauth_token=...
&oauth_signature=...
[... OAuth parameters ...]
```

**Response:**

```json
{
  "stat": "ok",
  "method": { "_content": "flickr.test.echo" },
  "name": { "_content": "test" },
  [... response data ...]
}
```

---

## 4. FH Worker → Client Callback

**Endpoint:** `POST {callback_url}`

**Headers:**

```
Content-Type: application/json
X-Signature: HMAC-SHA256(json_body, callback_secret)
```

**Body:**

```json
{
  "job_id": "job-uuid",
  "user_id": "user-123",
  "queue": "flickr_rest",
  "state": "completed",
  "result": { ...flickr_response... },
  "error": null,
  "from_cache": false,
  "attempts_made": 0,
  "max_attempts": 3,
  "timestamp": "2025-12-03T23:07:17.963Z",
  "trace_id": "req-1e"
}
```

**Failed Job:**

```json
{
  "job_id": "job-uuid",
  "state": "failed",
  "result": null,
  "error": {
    "message": "Error message",
    "code": null
  },
  "attempts_made": 3,
  ...
}
```

---

## Flow Summary

```
Client → FH API (202 Accepted, job_id)
  ↓
FH API → RabbitMQ (job payload)
  ↓
Worker → Flickr API (OAuth authenticated)
  ↓
Flickr → Worker (API response)
  ↓
Worker → Client Callback (POST with result)
```

---

**Note:** For detailed investigation and analysis, see [Request Payload Flow Investigation](../09-archived/retrospectives/2024-12/request-payload-flow.md)
