# P0 - Critical (Before Production)

Items that **must** be fixed before production deployment.

> Note: current implementation uses `user_id` (UUID) as the client handle; any `token_id` mention below should be read as `user_id` or its hash.

---

## Security

### [P0] Encrypt OAuth Tokens in MongoDB

**Status**: `[ ] Not Started`

**Category**: Security

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Currently, OAuth tokens are stored in plaintext in MongoDB. This is a critical security vulnerability. If MongoDB is compromised, all tokens are exposed.

### Why

- **Security**: Tokens in plaintext = critical vulnerability
- **Compliance**: May violate data protection regulations (GDPR, etc.)
- **Risk**: High impact if breached - all user tokens exposed

### Acceptance Criteria

- [ ] Integrate KMS (AWS KMS / Google Cloud KMS / HashiCorp Vault)
- [ ] Encrypt tokens before storing in MongoDB
- [ ] Decrypt tokens when reading from MongoDB
- [ ] Separate encryption keys for app credentials vs user tokens
- [ ] Key rotation strategy documented and implemented (90-day rotation)
- [ ] Key derivation using HKDF for per-token keys
- [ ] Zero-downtime migration of existing tokens
- [ ] Tests verify encryption/decryption works correctly
- [ ] Audit logging for all key rotation events

### Technical Notes

- Use envelope encryption pattern
- Store encrypted tokens in `tokens` collection
- Update `TokenStore` class to handle encryption/decryption
- Migration script needed for existing tokens
- Consider using MongoDB Client-Side Field Level Encryption

### Related Issues

- Blocks: Production deployment
- Related to: [P0] API Authentication

### Estimated Effort

`L` (1-2 weeks)

---

### [P0] Implement API Authentication

**Status**: `[ ] Not Started`

**Category**: Security

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Currently, any client with a `user_id` can call the API. There is no API-level authentication, which is a critical security risk.

### Why

- **Security**: Unauthorized access if `user_id` is leaked
- **Audit**: No way to track who is making API calls
- **Rate limiting**: Cannot implement per-client rate limiting
- **Compliance**: May violate security standards

### Acceptance Criteria

- [ ] API key management system
- [ ] Store API keys as bcrypt hashes in database (never plaintext)
- [ ] HMAC implementation with SHA-256 and clock skew tolerance (±5 minutes)
- [ ] Rate limiting per API key (1000 req/min per key)
- [ ] Optional IP whitelisting per API key
- [ ] Audit trail: Log all API key usage with IP, timestamp, endpoint, token_id
- [ ] API key rotation support
- [ ] Tests verify authentication works correctly

### Technical Notes

- Create `api_keys` collection in MongoDB
- Store keys as bcrypt hashes
- Implement HMAC middleware for Fastify
- Support both API key and HMAC authentication methods
- Document authentication in API docs

### Related Issues

- Blocks: Production deployment
- Related to: [P0] Encrypt OAuth Tokens, [P0] Rate Limiting

### Estimated Effort

`L` (1-2 weeks)

---

### [P0] Restrict CORS and Enable Security Headers

**Status**: `[ ] Not Started`

**Category**: Security

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Currently CORS is set to `origin: true` (allows all origins), and there are no security headers enabled. This exposes the API to CSRF attacks and other security risks.

### Why

- **CSRF protection**: Open CORS allows cross-origin attacks
- **Security headers**: Prevent XSS, clickjacking, etc.
- **Best practices**: Industry standard security measures

### Acceptance Criteria

- [ ] Restrict CORS to known origins only (configurable via env)
- [ ] Enable Helmet.js with appropriate security headers
- [ ] CSP (Content Security Policy) headers
- [ ] HSTS (HTTP Strict Transport Security) headers
- [ ] X-Frame-Options headers
- [ ] X-Content-Type-Options headers
- [ ] Document allowed origins in configuration
- [ ] Tests verify CORS restrictions work

### Technical Notes

- Use `@fastify/helmet` plugin
- Configure CORS with specific origins from env var
- Add security headers middleware
- Update API documentation with CORS requirements

### Related Issues

- Related to: [P0] API Authentication

### Estimated Effort

`S` (1-2 days)

---

### [P0] Enforce Payload Size Limits

**Status**: `[ ] Not Started`

**Category**: Security

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

No payload size limits are enforced, which could lead to DoS attacks via large payloads.

### Why

- **DoS protection**: Prevent resource exhaustion
- **Cost control**: Prevent unexpected costs
- **Performance**: Large payloads degrade performance

### Acceptance Criteria

- [ ] Max 100MB for upload endpoints
- [ ] Max 10MB for REST endpoints
- [ ] Return 413 (Payload Too Large) when limit exceeded
- [ ] Content-type validation per endpoint
- [ ] Document allowed content types
- [ ] Tests verify limits are enforced

### Technical Notes

- Configure Fastify body size limits
- Add middleware for content-type validation
- Update API documentation with limits

### Related Issues

- Related to: [P0] API Authentication

### Estimated Effort

`XS` (< 1 day)

---

## Performance

### [P0] Implement Rate Limiting

**Status**: `[ ] Not Started`

**Category**: Performance

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Rate limiting is mentioned in docs (3,500 req/hour per token) but not implemented in code. This is critical to prevent API abuse and ensure fair usage.

### Why

- **Fair usage**: Prevent single user from hogging resources
- **Cost control**: Prevent unexpected costs from abuse
- **Flickr limits**: Respect Flickr API rate limits (3,500 req/hour)
- **Stability**: Prevent system overload

### Acceptance Criteria

- [ ] Redis-based sliding window rate limiter
- [ ] 3,500 req/hour per `user_id` (or API key)
- [ ] Return 429 status code when limit exceeded
- [ ] Include `Retry-After` header in 429 responses
- [ ] Per-method rate limits (read vs upload operations)
- [ ] Metrics for rate limit hits
- [ ] Tests verify rate limiting works correctly

### Technical Notes

- Use Redis with sliding window algorithm
- Key format: `ratelimit:{user_id}:{method}`
- Store in `packages/core/rate-limiter.js`
- Integrate into Fastify middleware
- Consider using `ioredis` rate limiter library

### Related Issues

- Blocks: Production deployment
- Related to: [P0] API Authentication, [P1] Backpressure & QoS

### Estimated Effort

`M` (3-5 days)

---

### [P0] Implement Backpressure & QoS

**Status**: `[ ] Not Started`

**Category**: Performance

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

No limits on pending jobs per client, which allows a single client to fill the queue and block others. Need backpressure mechanism and quality of service controls.

### Why

- **Fairness**: Prevent single client from monopolizing resources
- **Stability**: Prevent queue overflow
- **User experience**: Ensure all users get service

### Acceptance Criteria

- [ ] Hard limit: Max 1000 pending jobs per client
- [ ] Max 100MB upload size enforced
- [ ] Circuit breaker: 3 consecutive 429s → pause 5 min, exponential backoff with jitter
- [ ] Priority queue: Weighted round-robin per client_id
- [ ] Quota per method: Separate quotas for read vs upload
- [ ] Max job age: 24h with automatic expiration
- [ ] Backpressure signaling: Return 503 with Retry-After when buffer full
- [ ] Tests verify backpressure works

### Technical Notes

- Track pending jobs per `user_id` in Redis
- Implement circuit breaker pattern
- Use RabbitMQ priority queues
- Add job expiration logic

### Related Issues

- Related to: [P0] Rate Limiting

### Estimated Effort

`L` (1-2 weeks)

---

## Infrastructure

### [P0] High Availability Setup

**Status**: `[ ] Not Started`

**Category**: Infrastructure

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Current setup uses single instances of Redis, MongoDB, and RabbitMQ. No high availability, which means single point of failure.

### Why

- **Reliability**: Prevent service outages
- **Data loss prevention**: HA prevents data loss
- **Production readiness**: Required for production deployment

### Acceptance Criteria

- [ ] Redis Sentinel or Cluster setup with auto-failover
- [ ] MongoDB Replica Set with read preferences
- [ ] RabbitMQ clustering or mirrored queues
- [ ] Test failover scenarios
- [ ] Document HA architecture
- [ ] Health checks for all services

### Technical Notes

- Redis: Use Sentinel for HA or Cluster mode
- MongoDB: Configure replica set (minimum 3 nodes)
- RabbitMQ: Use mirrored queues or cluster
- Update docker-compose or use Kubernetes for orchestration

### Related Issues

- Blocks: Production deployment
- Related to: [P0] Backup & Disaster Recovery

### Estimated Effort

`XL` (> 2 weeks)

---

### [P0] Automated Backups & Disaster Recovery

**Status**: `[ ] Not Started`

**Category**: Infrastructure

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

No automated backup strategy for MongoDB and Redis. No disaster recovery plan. Risk of permanent data loss.

### Why

- **Data protection**: Prevent permanent data loss
- **Business continuity**: Enable recovery from disasters
- **Compliance**: May be required by regulations

### Acceptance Criteria

- [ ] Daily automated MongoDB backups with retention policy
- [ ] Redis RDB snapshots + AOF with schedule
- [ ] Backup storage in separate location (S3, etc.)
- [ ] Recovery runbook documented
- [ ] Test recovery procedures
- [ ] Backup monitoring and alerts
- [ ] Retention policy: 30 days daily, 12 months monthly

### Technical Notes

- MongoDB: Use `mongodump` or cloud backup service
- Redis: Configure RDB snapshots + AOF persistence
- Store backups in S3 or similar
- Automate with cron or cloud scheduler

### Related Issues

- Related to: [P0] High Availability Setup

### Estimated Effort

`L` (1-2 weeks)

---

## Observability

### [P0] Implement Metrics & SLOs

**Status**: `[ ] Not Started`

**Category**: Observability

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Currently only have logging (OBS). No Prometheus metrics, no SLO definitions, no alerting. Cannot monitor system health or performance.

### Why

- **Monitoring**: Need metrics to monitor system health
- **SLOs**: Define service level objectives for reliability
- **Alerting**: Need alerts for critical issues
- **Production readiness**: Required for production operations

### Acceptance Criteria

- [ ] Prometheus metrics exporter
- [ ] Key metrics:
  - `queue_depth_per_token` (gauge)
  - `job_lifecycle_duration` (histogram)
  - `cache_hit_rate` (gauge)
  - `flickr_api_error_rate_by_code` (counter)
  - `api_request_latency` (histogram)
  - `worker_processing_time` (histogram)
- [ ] SLO definitions:
  - P95 API ingress latency: < 500ms
  - P99 time-to-complete: < 5 min (normal), < 30 min (peak)
  - Job expiration rate: < 1%
  - Flickr 429 rate: < 0.1%
- [ ] Alerting rules configured
- [ ] Grafana dashboards created

### Technical Notes

- Use `prom-client` for Prometheus metrics
- Expose `/metrics` endpoint
- Configure Prometheus to scrape metrics
- Set up Grafana dashboards
- Configure alerting rules

### Related Issues

- Blocks: Production deployment
- Related to: [P1] Observability & SLOs (detailed)

### Estimated Effort

`L` (1-2 weeks)

---

## OAuth

### [P0] Verify OAuth OOB Viability

**Status**: `[ ] Not Started`

**Category**: OAuth

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Need to verify that Flickr still supports `oauth_callback=oob` (Out-of-Band) before relying on it. OOB may be deprecated.

### Why

- **Risk**: OOB may not be supported by Flickr
- **Strategy**: Need to decide on OAuth flow before production
- **Testing**: Must test OAuth flow end-to-end

### Acceptance Criteria

- [ ] Verify Flickr supports OOB callback
- [ ] Test OOB flow end-to-end
- [ ] Implement HTTPS callback fallback (ngrok/cloudflared) behind feature flag
- [ ] Document OAuth strategy decision
- [ ] Test both OOB and HTTPS callback flows

### Technical Notes

- Test with Flickr API
- If OOB not supported, implement HTTPS callback
- Use feature flag to switch between modes
- Document decision and rationale

### Related Issues

- Blocks: Production deployment if OOB not supported

### Estimated Effort

`S` (1-2 days)

---

## Summary

**Total P0 Items**: 10

**Estimated Total Effort**: ~8-12 weeks (with 1-2 engineers)

**Critical Path**:

1. Security (Token Encryption, API Auth) - Blocks everything
2. Infrastructure (HA, Backups) - Required for production
3. Observability (Metrics) - Required for operations
4. Performance (Rate Limiting) - Required for stability
