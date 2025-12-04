# API Documentation

Base URL: `http://localhost:3000`

## OAuth

### POST /api/v1/auth/start

- Body: `{ "api_key": string, "api_secret": string }`
- Response: `{ authorize_url, oauth_token, state, mode }`
- Mode: `oob` (default) unless `OAUTH_MODE=callback` and `CALLBACK_URL` set.

### POST /api/v1/auth/complete

- Body: `{ "oauth_token": string, "oauth_verifier": string }`
- Response: `{ "user_id": string }`
- Returns 400 if invalid token/verifier.

### GET /api/v1/auth/callback

- Query: `oauth_token`, `oauth_verifier`
- Response: `{ status: "ok", user_id }`
- Use when `OAUTH_MODE=callback` with a registered callback URL.

## Jobs

### POST /api/v1/flickr/rest

- Purpose: enqueue a Flickr call.
- Body:

  ```json
  {
    "method": "flickr.test.login",
    "params": {},
    "user_id": "<user_id>",
    "target": "rest" | "upload" | "replace",
    "callback_url": "https://client.example.com/webhook",   // optional
    "callback_secret": "hmac-secret"                       // optional, used to sign callback
  }
  ```

  - `target` required; selects queue and endpoint (defaults to `rest` if omitted).

- Response envelope:
  ```json
  {
    "request_id": "<uuid>",
    "data": { "job_id": "<id>" },
    "error": null
  }
  ```
- Errors: `ERR_INVALID_REQUEST`, `ERR_TOKEN_NOT_FOUND`.

### POST /api/v1/flickr/jobs/status

- Purpose: fetch job status/result.
- Body: `{ "job_id": "<id>", "user_id": "<user_id>" }`
- Response envelope:
  ```json
  {
    "request_id": "<uuid>",
    "id": "1",
    "state": "completed" | "failed" | ...,
    "returnvalue": { "flickr": {..}, "observability": {..}, "from_cache": bool },
    "failedReason": null,
    "stacktrace": [],
    "queue": "flickr_rest"
  }
  ```
- Errors: `ERR_INVALID_REQUEST`, `ERR_JOB_NOT_FOUND` (includes user ownership check).

## Callback (optional, implemented with retry)

- If `callback_url` is provided in enqueue, worker POSTs on completion or final failure (best-effort with retry/backoff controlled by `CALLBACK_RETRY_ATTEMPTS` and `CALLBACK_RETRY_DELAY_MS`):
  - Payload:
    ```json
    {
      "job_id": "<id>",
      "user_id": "<user_id>",
      "queue": "flickr_rest",
      "state": "completed" | "failed",
      "result": { ... } | null,
      "error": { "message": "...", "code": null } | null,
      "from_cache": bool,
      "attempts_made": <number>,
      "max_attempts": <number>,
      "timestamp": "<iso>"
    }
    ```
  - Headers: if `callback_secret` was provided, header `X-Signature` = HMAC-SHA256(JSON body, secret).
  - Callback is best-effort; no retry policy specified here.

## Notes

- `user_id` is obtained via OAuth (CLI or Web UI); tokens are stored only in Mongo.
- Cache keys are per `user_id` + `method` + `params`.
- DLQ: jobs that exhaust retries are pushed to `flickr_dlq`.
- Mock mode: set `MOCK_FLICKR=true` to bypass real Flickr calls (for dev/test).
