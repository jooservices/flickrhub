# Operations Guide (WHAT / WHY / HOW)

## WHAT (user flow)

- Issue Flickr OAuth token via CLI, store in Mongo with a generated `user_id` (UUID). Clients only see `user_id`.
- Enqueue Flickr calls via API `/api/v1/flickr/rest` with `{method, params, user_id, target?}`.
- Worker pulls from the appropriate queue, calls Flickr, caches responses (Redis), logs to OBS, and persists final failures to Mongo.
- Fetch job result via `/api/v1/flickr/jobs/:id`.

## WHY (principles)

- **Separation of secrets**: Tokens live only in Mongo; API/OBS logs use `user_id` (no token leakage).
- **Reliability**: RabbitMQ with configurable retries/backoff; failed jobs recorded in Mongo for audit; callbacks retried with backoff.
- **Observability**: Logs to OBS on success/retry/final failure, DLQ, archived, callbacks; optional `OBS_DEBUG` for troubleshooting.
- **Scalability**: Workers per queue, PM2 instance counts from `.env`; Redis for cache; Mongo persisted via volume.

## HOW (runbook)

1. **Configure** `.env` (key fields)
   - Flickr creds: `FLICKR_API_KEY`, `FLICKR_API_SECRET`
   - Redis/Mongo (compose): `REDIS_URL=redis://redis:6379`, `MONGO_URL=mongodb://mongo:27017/flickrhub`
   - Flickr endpoints: `FLICKR_REST_URL`, `FLICKR_UPLOAD_URL`, `FLICKR_REPLACE_URL`
   - Observability: `OBS_API_URL`, `OBS_API_KEY`, `SERVICE_NAME`, `SERVICE_ENV`, `OBS_DEBUG`
   - Retry/cache: `JOB_RETRY_ATTEMPTS`, `CACHE_ENABLED`, `CACHE_TTL_SECONDS`
   - Job retention/persistence: `JOB_TTL_COMPLETE`, `JOB_TTL_FAIL`, `JOB_TTL_COMPLETE_DAYS`, `JOB_TTL_FAIL_DAYS`, `SAVE_COMPLETED_TO_MONGO`, `SAVE_FAILED_TO_MONGO`
   - Callbacks: `CALLBACK_ENABLED`, `CALLBACK_RETRY_ATTEMPTS`, `CALLBACK_RETRY_DELAY_MS`
   - Mocking: `MOCK_FLICKR=true|false` (bypass real Flickr for dev)
   - Worker scaling: `WORKER_REST_INSTANCES`, `WORKER_UPLOAD_INSTANCES`, `WORKER_REPLACE_INSTANCES`, per-queue concurrency vars

2. **Start stack** (Docker)

   ```bash
   docker compose up -d --build
   ```

   - API: localhost:3000
   - Redis: localhost:6380 (host)
   - Mongo: localhost:27019 (host, mapped to container `mongo:27017`)

3. **Register user/token**

   ```bash
   # leave --token-id blank to auto-generate user_id (UUID)
   MONGO_URL=mongodb://localhost:27019/flickrhub npm run cli:auth -- --token-id=<optional_user_id>
   ```

   - Output `user_id` → use in all API calls.

4. **Enqueue call**
   - With URL (explicit routing):
     ```bash
     curl -X POST http://localhost:3000/api/v1/flickr/rest \
       -H "Content-Type: application/json" \
       -d '{"method":"flickr.test.echo","params":{"name":"value"},"user_id":"<user_id>","url":"https://www.flickr.com/services/rest/?method=flickr.test.echo&name=value"}'
     ```
   - Without URL, using `target` (uses `.env` endpoints):
     ```bash
     curl -X POST http://localhost:3000/api/v1/flickr/rest \
       -H "Content-Type: application/json" \
       -d '{"method":"flickr.test.echo","params":{"name":"value"},"user_id":"<user_id>","target":"rest"}'
     ```
   - Queue mapping: `/services/rest` → `flickr_upload`, `/services/upload` → `flickr_rest`, `/services/replace` → `flickr_replace`.

5. **Poll result**

   ```bash
   curl -X POST http://localhost:3000/api/v1/flickr/jobs/status \
     -H "Content-Type: application/json" \
     -d '{"job_id":"<job_id>","user_id":"<user_id>"}'
   ```

   - `returnvalue`: `{ from_cache, flickr, observability }`
   - On failure after retries, details also saved in Mongo `jobs` collection.

6. **Web UI (React SPA, OOB-first)**
   - Open `apps/web/public/index.html` (or serve the folder) to register OAuth via UI.
   - Steps: enter key/secret → open authorize URL → paste verifier → UI shows `user_id`.

7. **Scaling workers**
   - Adjust `WORKER_*_INSTANCES` in `.env`, then `docker compose up -d --build` (or `pm2 restart` if running host).

8. **Troubleshooting**
   - Logs: `docker compose logs -f api worker_rest worker_upload worker_replace`
   - OBS debug: set `OBS_DEBUG=true` to print OBS responses.
   - Token lookup: `npm run cli:tokens` to list `user_id` entries (no secrets).
