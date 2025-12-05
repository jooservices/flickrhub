---
title: "Job Result API"
type: "guideline"
what: "API reference for retrieving job status and results via jobId"
why: "Enable clients to check job status and retrieve Flickr API results"
how: "Use POST endpoint with job_id and user_id to query job status"
owner: "API Team"
status: "approved"
last_updated: "2024-12-04"
tags: ['api', 'reference', 'jobs', 'status']
ai_semantics:
  layer: "data"
  relates_to: ['api', 'jobs', 'status', 'results']
---

# Job Result API

## Current API

### POST /api/v1/flickr/jobs/status

**Endpoint:** `POST /api/v1/flickr/jobs/status`

**Purpose:** Get job status and result via jobId

**Request Body:**

```json
{
  "job_id": "<job-id>",
  "user_id": "<your-user-id>"
}
```

**Response:**

```json
{
  "request_id": "req-xxx",
  "data": {
    "id": "<job-id>",
    "state": "completed",
    "returnvalue": {
      "from_cache": false,
      "flickr": {
        "stat": "ok",
        "method": { "_content": "flickr.test.echo" },
        "name": { "_content": "callback-test" },
        ...
      },
      "observability": {
        "ok": true,
        "status": 202,
        ...
      }
    },
    "failedReason": null,
    "stacktrace": [],
    "queue": "flickr_rest"
  },
  "error": null
}
```

**Response when Job Failed:**

```json
{
  "request_id": "req-xxx",
  "data": {
    "id": "<job-id>",
    "state": "failed",
    "returnvalue": null,
    "failedReason": "Token not found for userId=...",
    "stacktrace": ["Error: ...", "at ..."],
    "queue": "flickr_rest"
  },
  "error": null
}
```

**Error Responses:**

- `400`: Missing `job_id` or `user_id`
- `404`: Job not found or user ownership mismatch

---

## Features

### ✅ Includes:

1. **User Ownership Check:** Ensures only the user who created the job can retrieve the result
2. **Full Status Info:** Returns state, returnvalue, failedReason, stacktrace
3. **Result Structure:** Includes `flickr` response, `observability`, `from_cache` flag

### ⚠️ Limitations:

1. **POST Request:** Not GET (more RESTful if it were GET)
2. **Requires user_id:** Must provide user_id to verify ownership
3. **Full Response:** Returns much info, not just the result alone

---

## Code Implementation

### API Endpoint (`apps/api/server.js:186`)

```javascript
app.post('/api/v1/flickr/jobs/status', async (request, reply) => {
  const { job_id: jobId, user_id: userId } = request.body || {};
  if (!jobId || !userId) {
    return reply.code(400).send({
      request_id: request.id,
      data: null,
      error: { code: 'ERR_INVALID_REQUEST', message: 'job_id and user_id are required' },
    });
  }
  try {
    const result = await jobService.status({ jobId, userId });
    return reply.send({ request_id: request.id, data: result, error: null });
  } catch (err) {
    if (err.statusCode === 404)
      return reply.code(404).send({
        request_id: request.id,
        data: null,
        error: { code: 'ERR_JOB_NOT_FOUND', message: 'job_not_found' },
      });
    throw err;
  }
});
```

### JobService Method (`apps/api/services/job-service.js:87`)

```javascript
async status({ jobId, userId }) {
  const job = await this.jobStore.get(jobId);
  if (!job || job.user_id !== userId) {
    const err = new Error('job_not_found');
    err.statusCode = 404;
    throw err;
  }
  return {
    id: job.jobId,
    state: job.state,
    returnvalue: job.returnvalue,
    failedReason: job.failedReason,
    stacktrace: job.stacktrace,
    queue: job.target ? this.chooseQueueName(job.target) : null,
  };
}
```

---

## Response Structure

### Completed Job

```json
{
  "id": "job-uuid",
  "state": "completed",
  "returnvalue": {
    "from_cache": false,
    "flickr": {
      /* Flickr API response */
    },
    "observability": {
      /* Observability data */
    }
  },
  "failedReason": null,
  "stacktrace": [],
  "queue": "flickr_rest"
}
```

### Failed Job

```json
{
  "id": "job-uuid",
  "state": "failed",
  "returnvalue": null,
  "failedReason": "Error message",
  "stacktrace": ["Error: ...", "at ..."],
  "queue": "flickr_rest"
}
```

### Job States

- `"queued"`: Job is in queue
- `"retrying"`: Job is retrying
- `"completed"`: Job completed successfully
- `"failed"`: Job failed after all retries

---

## Usage Example

### cURL

```bash
curl -X POST http://localhost:3000/api/v1/flickr/jobs/status \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "<job-id>",
    "user_id": "<your-user-id>"
  }'
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/api/v1/flickr/jobs/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    job_id: '<job-id>',
    user_id: '<your-user-id>',
  }),
});

const data = await response.json();
const result = data.data.returnvalue?.flickr; // Flickr API response
```

### Python

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

## Conclusion

### ✅ There is an API to get result via jobId:

- **Endpoint:** `POST /api/v1/flickr/jobs/status`
- **Requirements:** `job_id` + `user_id` (ownership check)
- **Returns:** Full job status + result in `returnvalue.flickr`

### 📝 Notes:

1. Must provide `user_id` to verify ownership
2. Is a POST request (not GET)
3. Result is located in `data.returnvalue.flickr`
4. Can check `state` to know if job has completed

---

## Suggestions (If Needed)

If you want a simpler API:

1. **GET endpoint:** `GET /api/v1/flickr/jobs/:jobId`
   - Only need jobId in URL
   - Still has ownership check but can use API key/token

2. **Result-only endpoint:** `GET /api/v1/flickr/jobs/:jobId/result`
   - Only returns result, no status info

3. **Public job access:** With shareable token or public job IDs

---

**Current Status:** ✅ API is already available  
**Recommendation:** Can be improved further if needed
