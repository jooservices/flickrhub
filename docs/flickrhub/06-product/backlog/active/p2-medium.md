# P2 - Medium Priority (Post-Launch)

Items that are **nice to have** and can be done post-launch based on capacity and business needs.

---

## Performance Optimization

### [P2] Performance Optimization

**Status**: `[ ] Not Started`

**Category**: Performance

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Optimize performance based on production metrics and load testing results.

### Why

- **Efficiency**: Improve resource utilization
- **Cost**: Reduce infrastructure costs
- **User experience**: Faster response times

### Acceptance Criteria

- [ ] Queue optimization: Tune RabbitMQ prefetch/concurrency, batch sizes
- [ ] Cache optimization: Analyze cache patterns, adjust TTLs
- [ ] Database optimization: Query optimization, connection pooling tuning
- [ ] Network optimization: HTTP/2, connection reuse, compression

### Technical Notes

- Profile production workloads
- Analyze slow queries
- Tune based on metrics

### Related Issues

- Depends on: [P0] Implement Metrics & SLOs

### Estimated Effort

`M` (3-5 days)

---

## Feature Enhancements

### [P2] Webhook Retry with Exponential Backoff

**Status**: `[ ] Not Started`

**Category**: Feature

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Enhance webhook callback retry mechanism with exponential backoff (currently has basic retry).

### Why

- **Reliability**: Better retry strategy reduces failures
- **Efficiency**: Exponential backoff reduces unnecessary retries

### Acceptance Criteria

- [ ] Exponential backoff with jitter for webhook retries
- [ ] Configurable max retries and backoff parameters
- [ ] Metrics for webhook retry attempts
- [ ] Tests verify exponential backoff works

### Technical Notes

- Update callback retry logic in worker
- Add exponential backoff with jitter
- Make parameters configurable

### Related Issues

- Enhancement of existing callback feature

### Estimated Effort

`S` (1-2 days)

---

### [P2] Job Prioritization

**Status**: `[ ] Not Started`

**Category**: Feature

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Support priority levels (high/normal/low) for jobs to allow important jobs to be processed first.

### Why

- **User experience**: Important jobs processed faster
- **Business value**: Support premium features

### Acceptance Criteria

- [ ] Support priority levels: high, normal, low
- [ ] Priority queue implementation in RabbitMQ
- [ ] API accepts priority parameter
- [ ] Worker processes high priority jobs first
- [ ] Metrics for priority-based processing
- [ ] Tests verify prioritization works

### Technical Notes

- Use RabbitMQ priority queues
- Add priority field to job schema
- Update API and worker to handle priority

### Related Issues

- Related to: [P0] Backpressure & QoS

### Estimated Effort

`M` (3-5 days)

---

### [P2] Batch Operations

**Status**: `[ ] Not Started`

**Category**: Feature

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Support batch job submission with atomic processing to reduce API overhead.

### Why

- **Efficiency**: Reduce API calls for multiple jobs
- **User experience**: Faster bulk operations
- **Cost**: Lower API overhead

### Acceptance Criteria

- [ ] Batch job submission endpoint
- [ ] Atomic processing (all or nothing)
- [ ] Batch size limits (max 100 jobs per batch)
- [ ] Batch status tracking
- [ ] Tests verify batch processing works

### Technical Notes

- Add `/api/v1/flickr/batch` endpoint
- Implement atomic batch processing
- Track batch status

### Related Issues

- Related to: [P0] Rate Limiting

### Estimated Effort

`M` (3-5 days)

---

### [P2] Job Cancellation

**Status**: `[ ] Not Started`

**Category**: Feature

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Allow clients to cancel pending jobs that haven't started processing yet.

### Why

- **User experience**: Users can cancel mistaken submissions
- **Efficiency**: Free up queue space

### Acceptance Criteria

- [ ] Cancel job endpoint: `/api/v1/flickr/jobs/:id/cancel`
- [ ] Only cancel jobs in pending/queued state
- [ ] Return appropriate error if job already processing
- [ ] Update job status to cancelled
- [ ] Tests verify cancellation works

### Technical Notes

- Add cancel endpoint to API
- Check job status before cancellation
- Update job status in Redis/Mongo

### Related Issues

- Related to: Job status tracking

### Estimated Effort

`S` (1-2 days)

---

### [P2] Job History API

**Status**: `[ ] Not Started`

**Category**: Feature

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

API to query job history per token_id with pagination for users to see their job history.

### Why

- **User experience**: Users can see their job history
- **Debugging**: Help users debug issues
- **Analytics**: Users can analyze their usage

### Acceptance Criteria

- [ ] Job history endpoint: `/api/v1/flickr/jobs/history`
- [ ] Filter by token_id (user_id)
- [ ] Pagination support
- [ ] Filter by status, date range, method
- [ ] Tests verify history API works

### Technical Notes

- Query MongoDB jobs collection
- Implement pagination
- Add filters for status, date, method

### Related Issues

- Related to: [P1] Storage Schema & Retention Policies

### Estimated Effort

`M` (3-5 days)

---

## Documentation

### [P2] Client SDK

**Status**: `[ ] Not Started`

**Category**: Documentation

**Created**: 2024-01-15
**Updated**: 2024-01-15

### Description

Create client SDKs (Node.js, Python) to simplify API usage for developers.

### Why

- **Developer experience**: Easier integration
- **Adoption**: Lower barrier to entry
- **Consistency**: Standardized usage patterns

### Acceptance Criteria

- [ ] Node.js SDK published to NPM
- [ ] Python SDK published to PyPI
- [ ] TypeScript types for Node.js SDK
- [ ] Authentication helper methods
- [ ] Job submission with retry logic
- [ ] Result polling with backoff
- [ ] Error handling
- [ ] Documentation with examples
- [ ] Tests with > 80% coverage

### Technical Notes

- Use TypeScript for Node.js SDK
- Publish to NPM as `@flickrhub/sdk`
- Follow SDK best practices
- Consider other languages based on demand

### Related Issues

- Related to: [P1] Complete API Documentation

### Estimated Effort

`L` (1-2 weeks per SDK)

---

## Summary

**Total P2 Items**: 7

**Estimated Total Effort**: ~6-10 weeks (with 1-2 engineers)

**Note**: P2 items can be prioritized based on user feedback and business needs post-launch.
