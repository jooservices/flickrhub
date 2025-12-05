# P1 - High Priority (Pre-Launch)

Items that **should** be fixed before public launch or major release.

---

## Observability & SLOs

### [P1] Detailed Observability & SLOs

**Status**: `[ ] Not Started`

**Category**: Observability

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Expand on P0 metrics with detailed SLO definitions, alerting rules, and dashboards.

### Why

- **Operations**: Need comprehensive monitoring for production
- **SLOs**: Define service level objectives for reliability
- **Alerting**: Proactive issue detection

### Acceptance Criteria

- [ ] Alerting rules:
  - Mover paused > 5 minutes
  - Queue depth > 10k per token
  - Redis memory usage > 80%
  - Mongo connection pool exhausted
  - Job expiration rate > 5%
  - Flickr 429 rate > 1%
- [ ] Grafana/DataDog dashboards for real-time monitoring
- [ ] SLO tracking and reporting
- [ ] On-call runbook integration

### Technical Notes

- Configure Prometheus alerting rules
- Create Grafana dashboards
- Set up alerting channels (PagerDuty, Slack, etc.)

### Related Issues

- Depends on: [P0] Implement Metrics & SLOs

### Estimated Effort

`M` (3-5 days)

---

## Resilience & Disaster Recovery

### [P1] Enhanced Resilience & DR

**Status**: `[ ] Not Started`

**Category**: Infrastructure

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Enhance resilience beyond P0 HA setup with additional DR procedures and chaos engineering.

### Why

- **Reliability**: Test and improve system resilience
- **Confidence**: Know system can handle failures
- **Recovery**: Faster recovery from incidents

### Acceptance Criteria

- [ ] Redis persistence: Configure AOF + RDB snapshots, test recovery
- [ ] Redis failover: Test Sentinel/Cluster auto-failover scenarios
- [ ] Mongo replica set: Configure with read preferences, test failover
- [ ] Recovery runbook: Document steps to recover lost jobs from Mongo metadata
- [ ] Chaos engineering: Test Redis failover, Mongo partition, Flickr outage scenarios
- [ ] Circuit breaker tuning: Test and tune under various failure modes
- [ ] Health checks: Implement `/healthz` and `/readyz` endpoints with dependency checks

### Technical Notes

- Use chaos engineering tools (Chaos Monkey, etc.)
- Document recovery procedures
- Test failover scenarios regularly

### Related Issues

- Depends on: [P0] High Availability Setup, [P0] Automated Backups

### Estimated Effort

`L` (1-2 weeks)

---

## Caching Strategy

### [P1] Enhanced Caching Strategy

**Status**: `[ ] Not Started`

**Category**: Performance

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Improve caching with better key format, TTL configuration, invalidation, and metrics.

### Why

- **Performance**: Better cache hit rates
- **Safety**: Prevent cache data leaks
- **Observability**: Track cache performance

### Acceptance Criteria

- [ ] Cache key format: SHA256(method + sorted(params) + token_id)
- [ ] TTL configuration: 5 min for GET-like methods, 1 min for search, configurable per method
- [ ] Cache size limits: Max 10GB Redis cache, LRU eviction policy
- [ ] Cache invalidation: Manual endpoint `/api/v1/cache/invalidate?token_id=xxx`
- [ ] Cache warming: Optional background job for popular queries
- [ ] Cache safety: Scope caches per token to prevent data leaks
- [ ] Cache bypass: Flag for debugging to force cache miss
- [ ] Cache metrics: Track hit rate, miss rate, eviction rate per method

### Technical Notes

- Update cache key generation in worker
- Add cache invalidation endpoint to API
- Implement cache warming job (optional)
- Add cache metrics to Prometheus

### Related Issues

- Related to: [P0] Implement Metrics & SLOs

### Estimated Effort

`M` (3-5 days)

---

## Storage & Data Retention

### [P1] Storage Schema & Retention Policies

**Status**: `[ ] Not Started`

**Category**: Infrastructure

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Optimize MongoDB schema design and implement data retention policies.

### Why

- **Performance**: Better query performance with proper indexes
- **Cost**: Reduce storage costs with retention policies
- **Compliance**: Meet data retention requirements

### Acceptance Criteria

- [ ] Mongo schema design:
  - `job_id` (unique index)
  - `token_id_hash` (indexed)
  - `created_at` (TTL index: 90 days)
  - `status` (indexed)
  - `method` (indexed for analytics)
  - `client_id` (indexed, optional)
- [ ] Retention policies:
  - Hot jobs (Redis): 24h TTL
  - Completed jobs (Mongo): 90 days
  - Expired jobs (Mongo): 30 days
  - Audit logs: 1 year (separate collection)
- [ ] Index optimization: Analyze query patterns and optimize indexes
- [ ] Data archival: Strategy for archiving old data to cold storage

### Technical Notes

- Create indexes in MongoDB
- Set up TTL indexes for automatic expiration
- Implement archival job for old data
- Monitor index usage and optimize

### Related Issues

- Related to: [P0] Automated Backups

### Estimated Effort

`M` (3-5 days)

---

## Idempotency & Deduplication

### [P1] Idempotency & Deduplication

**Status**: `[ ] Not Started`

**Category**: Performance

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Implement idempotency keys and deduplication to prevent duplicate job processing.

### Why

- **Reliability**: Prevent duplicate processing from retries
- **Cost**: Avoid duplicate API calls to Flickr
- **User experience**: Prevent confusion from duplicate results

### Acceptance Criteria

- [ ] Idempotency key: Support `X-Idempotency-Key` header (UUID or client-generated)
- [ ] Dedupe window: 24-hour deduplication window using Redis SET with TTL
- [ ] Key format: Hash(method + params + token_id + idempotency_key) for dedupe
- [ ] Upload dedupe: Special handling for uploads using hash(file_content_hash + params)
- [ ] Idempotent processing: Ensure all job processing is idempotent (safe to retry)
- [ ] Tests verify idempotency works correctly

### Technical Notes

- Add idempotency key support to API
- Implement deduplication logic in worker
- Use Redis SET with TTL for dedupe window
- Special handling for file uploads

### Related Issues

- Related to: [P0] Rate Limiting

### Estimated Effort

`M` (3-5 days)

---

## Testing Strategy

### [P1] Comprehensive Testing

**Status**: `[ ] Not Started`

**Category**: Testing

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Implement comprehensive testing strategy with unit, integration, E2E, and load tests.

### Why

- **Quality**: Ensure code quality and reliability
- **Confidence**: Confidence in deployments
- **Regression**: Prevent regressions

### Acceptance Criteria

- [ ] Unit tests: Achieve > 80% code coverage
- [ ] Integration tests: Test Redis, Mongo, Flickr mock integrations
- [ ] E2E tests: Full OAuth flow, complete job lifecycle
- [ ] Load testing: 10k concurrent requests, measure queue depth and latency
- [ ] Chaos tests: Redis failover, network partitions, Flickr API outages
- [ ] Security testing: Penetration testing, OWASP Top 10 validation
- [ ] Performance testing: Identify bottlenecks, optimize hot paths

### Technical Notes

- Use Jest or similar for unit tests
- Use Docker Compose for integration tests
- Use k6 or Artillery for load testing
- Use Chaos Monkey or similar for chaos tests

### Related Issues

- Related to: All P0 items

### Estimated Effort

`L` (1-2 weeks)

---

## Documentation

### [P1] Complete API Documentation

**Status**: `[ ] Not Started`

**Category**: Documentation

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Create complete OpenAPI/Swagger spec with examples and interactive API explorer.

### Why

- **Developer experience**: Easier API integration
- **Adoption**: Lower barrier to entry
- **Consistency**: Standardized API documentation

### Acceptance Criteria

- [ ] Complete OpenAPI/Swagger spec with all endpoints
- [ ] Interactive API explorer (Swagger UI)
- [ ] Code examples (curl, Node.js, Python)
- [ ] Error response documentation
- [ ] Authentication documentation
- [ ] Webhook documentation

### Technical Notes

- Use OpenAPI 3.0 spec
- Generate from code annotations or write manually
- Host Swagger UI
- Include examples for all endpoints

### Related Issues

- Related to: [P0] API Authentication

### Estimated Effort

`M` (3-5 days)

---

### [P1] Architecture Diagrams & Runbooks

**Status**: `[ ] Not Started`

**Category**: Documentation

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Create visual architecture diagrams and operational runbooks.

### Why

- **Understanding**: Visual diagrams help understand system
- **Operations**: Runbooks enable faster incident response
- **Onboarding**: Help new team members understand system

### Acceptance Criteria

- [ ] Architecture diagrams: Update diagrams with KMS, monitoring, failover flows
- [ ] Data flow diagrams
- [ ] Sequence diagrams for OAuth flow, job processing
- [ ] Runbooks: Operational runbooks for common scenarios
- [ ] Developer guide: Onboarding guide, local setup, testing procedures

### Technical Notes

- Use Mermaid, PlantUML, or draw.io for diagrams
- Create runbooks for common incidents
- Document in `docs/flickrhub/07-guides/runbooks/`

### Related Issues

- Related to: [P1] Enhanced Resilience & DR

### Estimated Effort

`M` (3-5 days)

---

## Summary

**Total P1 Items**: 8

**Estimated Total Effort**: ~6-8 weeks (with 1-2 engineers)

**Dependencies**: Most P1 items depend on P0 items being completed first.
