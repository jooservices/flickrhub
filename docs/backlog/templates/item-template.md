# Backlog Item Template

Copy this template when creating a new backlog item.

```markdown
## [PRIORITY] Item Title

**Status**: `[ ] Not Started` | `[~] In Progress` | `[x] Completed` | `[-] Cancelled`

**Category**: `Security` | `Performance` | `Infrastructure` | `Feature` | `Bug` | `Documentation` | `Testing`

**Created**: YYYY-MM-DD
**Updated**: YYYY-MM-DD
**Assignee**: @username (optional)
**Sprint**: Sprint name/number (optional)

### Description

Clear, concise description of what needs to be done. One or two sentences.

### Why

Business or technical rationale. Why is this important? What problem does it solve?

### Acceptance Criteria

- [ ] Criterion 1 (specific, measurable, testable)
- [ ] Criterion 2
- [ ] Criterion 3

### Technical Notes

Implementation details, considerations, dependencies, design decisions.

### Related Issues

- Related to: [Link to related item]
- Blocks: [What this blocks]
- Blocked by: [What blocks this]
- GitHub Issue: #123 (if applicable)

### Estimated Effort

`XS` (< 1 day) | `S` (1-2 days) | `M` (3-5 days) | `L` (1-2 weeks) | `XL` (> 2 weeks)

### Notes

Additional notes, updates, or context as work progresses.
```

---

## Example: Completed Item

```markdown
## [P1] Implement Rate Limiting

**Status**: `[x] Completed`

**Category**: Performance

**Created**: 2024-01-10
**Updated**: 2024-01-25
**Assignee**: @backend-dev
**Sprint**: Sprint 5

### Description

Implement rate limiting to prevent API abuse. Rate limit: 3,500 requests/hour per token.

### Why

- Prevent single user from hogging resources
- Respect Flickr API rate limits
- Cost control

### Acceptance Criteria

- [x] Redis-based sliding window rate limiter
- [x] 3,500 req/hour per `user_id`
- [x] Return 429 status code when limit exceeded
- [x] Include `Retry-After` header
- [x] Per-method rate limits
- [x] Metrics for rate limit hits
- [x] Tests verify rate limiting works

### Technical Notes

- Implemented in `packages/core/rate-limiter.js`
- Uses Redis sliding window algorithm
- Key format: `ratelimit:{user_id}:{method}`
- Integrated into Fastify middleware

### Related Issues

- Related to: [P1] Backpressure & QoS
- PR: #45

### Estimated Effort

`M` (3-5 days) - Actual: 4 days

### Notes

- Completed on 2024-01-25
- Deployed to staging, monitoring for 1 week before production
- Performance impact: < 5ms latency overhead
```

---

## Example: In Progress Item

```markdown
## [P0] Encrypt OAuth Tokens in MongoDB

**Status**: `[~] In Progress`

**Category**: Security

**Created**: 2024-01-15
**Updated**: 2024-01-22
**Assignee**: @security-team
**Sprint**: Sprint 5

### Description

Encrypt OAuth tokens before storing in MongoDB to prevent exposure if database is compromised.

### Why

- Critical security vulnerability
- Compliance requirement
- High risk if breached

### Acceptance Criteria

- [x] KMS integration (AWS KMS selected)
- [x] Encryption/decryption functions implemented
- [~] TokenStore updated to use encryption
- [ ] Migration script for existing tokens
- [ ] Tests for encryption/decryption
- [ ] Key rotation strategy documented
- [ ] Zero-downtime migration plan

### Technical Notes

- Using AWS KMS with envelope encryption
- Encryption key: `arn:aws:kms:us-east-1:123456789012:key/abc123`
- Migration will run during maintenance window
- Testing in staging environment

### Related Issues

- Blocks: Production deployment
- Related to: [P0] API Authentication
- GitHub Issue: #67

### Estimated Effort

`L` (1-2 weeks) - Estimated: 1.5 weeks remaining

### Notes

- 2024-01-22: KMS integration complete, working on TokenStore updates
- 2024-01-20: AWS KMS access configured, testing encryption functions
- Blocked by: AWS IAM permissions (resolved 2024-01-19)
```

---

## Tips

1. **Start with template**: Copy this template for consistency
2. **Update regularly**: Keep status and notes current
3. **Be specific**: Vague items are hard to estimate and complete
4. **Link related items**: Helps understand dependencies
5. **Document decisions**: Add notes when priorities or approach change
