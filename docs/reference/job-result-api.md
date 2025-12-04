# Job Result API - Hiện Trạng

## API Hiện Tại

### POST /api/v1/flickr/jobs/status

**Endpoint:** `POST /api/v1/flickr/jobs/status`

**Purpose:** Lấy job status và result thông qua jobId

**Request Body:**

```json
{
  "job_id": "e6b6634c-e07c-43f0-88b3-9516590aad77",
  "user_id": "09b4e414-4f70-4226-9ee8-f9e815fc2539"
}
```

**Response:**

```json
{
  "request_id": "req-xxx",
  "data": {
    "id": "e6b6634c-e07c-43f0-88b3-9516590aad77",
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

**Response khi Job Failed:**

```json
{
  "request_id": "req-xxx",
  "data": {
    "id": "job-id",
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

## Đặc Điểm

### ✅ Có:

1. **User Ownership Check:** Đảm bảo chỉ user tạo job mới lấy được result
2. **Full Status Info:** Trả về state, returnvalue, failedReason, stacktrace
3. **Result Structure:** Có `flickr` response, `observability`, `from_cache` flag

### ⚠️ Hạn chế:

1. **POST Request:** Không phải GET (RESTful hơn nếu là GET)
2. **Cần user_id:** Phải provide user_id để verify ownership
3. **Full Response:** Trả về nhiều info, không chỉ result thuần

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

- `"queued"`: Job đang trong queue
- `"retrying"`: Job đang retry
- `"completed"`: Job hoàn thành thành công
- `"failed"`: Job thất bại sau tất cả retries

---

## Usage Example

### cURL

```bash
curl -X POST http://localhost:3000/api/v1/flickr/jobs/status \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "e6b6634c-e07c-43f0-88b3-9516590aad77",
    "user_id": "09b4e414-4f70-4226-9ee8-f9e815fc2539"
  }'
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:3000/api/v1/flickr/jobs/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    job_id: 'e6b6634c-e07c-43f0-88b3-9516590aad77',
    user_id: '09b4e414-4f70-4226-9ee8-f9e815fc2539',
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
        'job_id': 'e6b6634c-e07c-43f0-88b3-9516590aad77',
        'user_id': '09b4e414-4f70-4226-9ee8-f9e815fc2539'
    }
)

data = response.json()
result = data['data']['returnvalue']['flickr']  # Flickr API response
```

---

## Kết Luận

### ✅ Có API để lấy result qua jobId:

- **Endpoint:** `POST /api/v1/flickr/jobs/status`
- **Yêu cầu:** `job_id` + `user_id` (ownership check)
- **Trả về:** Full job status + result trong `returnvalue.flickr`

### 📝 Lưu ý:

1. Phải provide `user_id` để verify ownership
2. Là POST request (không phải GET)
3. Result nằm trong `data.returnvalue.flickr`
4. Có thể check `state` để biết job đã complete chưa

---

## Đề Xuất (Nếu Cần)

Nếu muốn có API đơn giản hơn:

1. **GET endpoint:** `GET /api/v1/flickr/jobs/:jobId`
   - Chỉ cần jobId trong URL
   - Vẫn có ownership check nhưng có thể dùng API key/token

2. **Result-only endpoint:** `GET /api/v1/flickr/jobs/:jobId/result`
   - Chỉ trả về result, không có status info

3. **Public job access:** Với shareable token hoặc public job IDs

---

**Current Status:** ✅ API đã có sẵn  
**Recommendation:** Có thể cải thiện thêm nếu cần
