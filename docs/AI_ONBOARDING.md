# AI Onboarding Guide - FlickrHub Project

This document provides comprehensive context for AI assistants working on the FlickrHub project. Read this first to understand the project architecture, codebase structure, and development practices.

---

## 📋 Project Overview

**FlickrHub** is a production-ready hub/proxy for Flickr API with:

- OAuth 1.0a authentication
- Queue-based job processing (RabbitMQ)
- Rate limiting and caching (Redis)
- Token storage (MongoDB)
- Observability logging (OBS integration)
- Zero-config Docker deployment

**Purpose**: Provide a reliable, scalable proxy layer for Flickr API calls with OAuth handling, rate limiting, and job queuing.

**Status**: Pre-production. Critical security and infrastructure items need to be addressed before production deployment.

---

## 🏗️ Architecture Overview

### System Components

```
Client → API (Fastify) → RabbitMQ → Worker → Flickr API
                ↓              ↓
            MongoDB        Redis (Cache)
```

### Key Services

1. **API Service** (`apps/api/`)
   - Fastify HTTP server
   - OAuth flow handling
   - Job enqueueing
   - Job status queries
   - Port: 3000

2. **Worker Services** (`apps/worker/`)
   - RabbitMQ consumers (3 queues: rest, upload, replace)
   - Flickr API calls
   - Caching (Redis)
   - Observability logging
   - Configurable instances per queue

3. **CLI Tools** (`apps/cli/`)
   - OAuth token generation
   - Token management

4. **Web UI** (`apps/web/`)
   - Static SPA for OAuth flow
   - Served by API service

### Data Stores

- **MongoDB**: Token storage (`user_id` → OAuth tokens), job metadata
- **Redis**: Cache layer, rate limiting (future)
- **RabbitMQ**: Job queues (`flickr_rest`, `flickr_upload`, `flickr_replace`, `flickr_dlq`)

---

## 📁 Codebase Structure

```
flickrhub/
├── apps/                    # Deployable applications
│   ├── api/                # Fastify API server
│   │   ├── server.js       # Main server file
│   │   └── services/       # Business logic services
│   ├── worker/             # RabbitMQ consumer
│   │   └── index.js        # Worker main file
│   ├── cli/                # CLI tools
│   │   ├── authorize.js    # OAuth token generation
│   │   └── list-tokens.js  # Token listing
│   └── web/                # Web UI
│       └── public/         # Static files
│
├── packages/                # Shared libraries
│   ├── config/             # Configuration (Zod validation)
│   │   └── index.js
│   ├── core/               # Business logic
│   │   ├── token-store.js  # Token storage (MongoDB)
│   │   └── job-store.js    # Job metadata storage
│   ├── flickr-client/      # Flickr API wrapper
│   │   ├── index.js        # OAuth 1.0a client
│   │   └── mock.js          # Mock client for testing
│   ├── logger/             # Structured logging
│   │   └── observability.js # OBS integration
│   ├── mq/                 # Queue management
│   │   └── index.js        # Queue utilities
│   └── rabbitmq/           # RabbitMQ client
│       └── client.js
│
├── docs/                    # Documentation
│   ├── AI_ONBOARDING.md    # This file
│   ├── api/                # API documentation
│   ├── architecture/       # Architecture docs
│   ├── backlog/            # Backlog management
│   ├── guides/             # How-to guides
│   └── infrastructure/     # Infrastructure docs
│
├── infra/                   # Infrastructure
│   └── docker/             # Docker configs
│
├── docker-compose.yml      # Docker orchestration
├── Dockerfile              # Container image
├── ecosystem.config.js     # PM2 configuration
└── package.json            # Dependencies
```

---

## 🔑 Key Concepts

### User ID vs Token

- **`user_id`**: UUID identifier exposed to clients
- **Token**: OAuth tokens stored in MongoDB, never exposed
- **Principle**: Secret minimization - clients only see `user_id`

### Job Flow

1. Client POST `/api/v1/flickr/rest` with `{method, params, user_id, target}`
2. API validates, enqueues to RabbitMQ queue
3. Worker consumes job, checks Redis cache
4. If cache miss, calls Flickr API
5. Worker caches result, updates job status
6. Client polls `/api/v1/flickr/jobs/status` for result

### Queue Routing

- `target: "rest"` → `flickr_rest` queue
- `target: "upload"` → `flickr_upload` queue
- `target: "replace"` → `flickr_replace` queue
- Failed jobs (after retries) → `flickr_dlq` queue

### Caching Strategy

- **Key**: `SHA1(method + params + user_id)`
- **TTL**: Configurable (default 300 seconds)
- **Scope**: Per user_id to prevent data leaks

---

## 🛠️ Technology Stack

### Runtime & Language

- **Node.js**: 20+
- **Language**: JavaScript (TypeScript mentioned in docs but code is JS)
- **Package Manager**: npm (pnpm mentioned in docs but package-lock.json exists)

### Core Dependencies

- **Fastify**: HTTP framework
- **RabbitMQ**: Message queue (amqplib)
- **Redis**: Cache (ioredis)
- **MongoDB**: Database (mongodb driver)
- **PM2**: Process manager

### Infrastructure

- **Docker**: Containerization
- **Docker Compose**: Orchestration
- **Redis**: 7-alpine
- **MongoDB**: 7
- **RabbitMQ**: 3-management-alpine

---

## 🔐 Security Model (Current State)

### Current Implementation

- ✅ OAuth tokens stored in MongoDB (but **NOT encrypted** - CRITICAL ISSUE)
- ✅ Clients only see `user_id`, never tokens
- ✅ HMAC signatures for webhook callbacks
- ❌ No API-level authentication (CRITICAL ISSUE)
- ❌ CORS open to all origins (CRITICAL ISSUE)
- ❌ No security headers (Helmet.js)

### Security Issues (P0 - Must Fix)

See `docs/backlog/active/p0-critical.md` for details:

1. **Token Encryption**: Tokens stored plaintext in MongoDB
2. **API Authentication**: No API key/auth system
3. **CORS**: Too permissive
4. **Security Headers**: Missing

---

## 📊 Observability

### Current Implementation

- **Logging**: OBS integration (`packages/logger/observability.js`)
- **Events Tracked**:
  - `job_enqueued`
  - `job_completed`
  - `job_dlq`
  - `flickr_api_call` (success/retry/fail)
  - `callback_success`/`callback_exhausted`

### Missing (P0)

- ❌ Prometheus metrics
- ❌ SLO definitions
- ❌ Alerting rules
- ❌ Grafana dashboards

---

## 🚀 Development Workflow

### Local Setup

```bash
# Install dependencies
npm install

# Start services (Docker)
docker compose up -d --build

# Generate OAuth token
MONGO_URL=mongodb://localhost:27019/flickrhub npm run cli:auth

# Start API (if not using Docker)
npm run api

# Start Worker (if not using Docker)
npm run worker
```

### Environment Variables

Key variables (see `.env.example`):

- `FLICKR_API_KEY`, `FLICKR_API_SECRET`: Flickr credentials
- `MONGO_URL`: MongoDB connection
- `REDIS_URL`: Redis connection
- `RABBIT_URL`: RabbitMQ connection
- `OBS_API_URL`, `OBS_API_KEY`: Observability service
- `JOB_RETRY_ATTEMPTS`: Retry configuration
- `CACHE_TTL_SECONDS`: Cache TTL

### Testing

- **Current**: Minimal tests (`tests/mq.test.js`)
- **Target**: > 80% coverage (P1 backlog item)

---

## 📝 Code Patterns

### Error Handling

- Use try/catch blocks
- Return structured errors: `{request_id, data, error: {code, message}}`
- Log errors to OBS before throwing

### Configuration

- Centralized in `packages/config/index.js`
- Environment variable based
- No hardcoded values

### Logging

- Use `sendObservabilityLog()` from `packages/logger/observability.js`
- Structured format with context, payload, tags
- Never log secrets or tokens

### Job Processing

- Idempotent operations (safe to retry)
- Cache before external API calls
- Retry with exponential backoff
- DLQ for exhausted retries

---

## 🐛 Known Issues & Limitations

### Critical (P0)

1. **Tokens not encrypted** - Security vulnerability
2. **No API authentication** - Anyone with user_id can call API
3. **No rate limiting** - Mentioned in docs but not implemented
4. **No HA** - Single instances of Redis, MongoDB, RabbitMQ
5. **No backups** - Risk of data loss

### High Priority (P1)

1. **No metrics** - Only logging, no Prometheus
2. **No distributed tracing** - Trace IDs not correlated
3. **Low test coverage** - Only 1 test file
4. **No idempotency keys** - Duplicate job risk

See `docs/backlog/active/` for complete list.

---

## 📚 Documentation Structure

### Key Documents

- **Architecture**: `docs/architecture/README.md`
- **API Docs**: `docs/api/README.md`
- **Operations**: `docs/guides/operations.md`
- **Backlog**: `docs/backlog/README.md`
- **Infrastructure**: `docs/infrastructure.md`
- **Architecture Review**: `docs/reviews/ARCHITECTURE_REVIEW.md`

### Documentation Principles

- User-centric organization
- Progressive disclosure (simple → detailed)
- One topic per file
- Clear naming conventions

---

## 🎯 Development Priorities

### Before Production (P0)

1. Security fixes (encryption, auth, CORS)
2. Rate limiting
3. High availability
4. Backups & DR
5. Metrics & alerting

### Before Launch (P1)

1. Comprehensive testing
2. Distributed tracing
3. Enhanced caching
4. Complete API docs

### Post-Launch (P2)

1. Performance optimization
2. Client SDKs
3. Feature enhancements

See `docs/backlog/active/` for detailed items.

---

## 🔄 Common Tasks

### Adding a New Feature

1. Check backlog for related items
2. Create backlog item if new
3. Follow code patterns (error handling, logging, config)
4. Add tests
5. Update documentation

### Fixing a Bug

1. Reproduce issue
2. Check existing tests
3. Fix and add test
4. Update docs if API changes

### Modifying API

1. Update `docs/api/README.md`
2. Add examples if needed
3. Update OpenAPI spec (when created)
4. Consider backward compatibility

### Infrastructure Changes

1. Update `docker-compose.yml` if needed
2. Update `docs/infrastructure/`
3. Test in local Docker environment
4. Document deployment steps

---

## 🤖 AI Assistant Guidelines

### When Working on This Project

1. **Read Context First**
   - Start with this file (`AI_ONBOARDING.md`)
   - Check `docs/backlog/active/` for current priorities
   - Review architecture docs before major changes

2. **Follow Patterns**
   - Use existing error handling patterns
   - Follow logging conventions
   - Maintain configuration approach

3. **Security First**
   - Never log secrets or tokens
   - Consider security implications
   - Check P0 security items in backlog

4. **Update Documentation**
   - Update relevant docs when code changes
   - Add examples for new features
   - Keep backlog items updated

5. **Test Changes**
   - Add tests for new features
   - Test in Docker environment
   - Verify error handling

6. **Check Dependencies**
   - Review `package.json` for available packages
   - Don't add unnecessary dependencies
   - Consider security of dependencies

---

## 📖 Quick Reference

### Key Files

- **API Server**: `apps/api/server.js`
- **Worker**: `apps/worker/index.js`
- **Config**: `packages/config/index.js`
- **Token Store**: `packages/core/token-store.js`
- **Flickr Client**: `packages/flickr-client/index.js`
- **Observability**: `packages/logger/observability.js`

### Key Endpoints

- `POST /api/v1/auth/start` - Start OAuth flow
- `POST /api/v1/auth/complete` - Complete OAuth flow
- `POST /api/v1/flickr/rest` - Enqueue job
- `POST /api/v1/flickr/jobs/status` - Get job status
- `GET /health` - Health check

### Key Environment Variables

- `FLICKR_API_KEY`, `FLICKR_API_SECRET`
- `MONGO_URL`, `REDIS_URL`, `RABBIT_URL`
- `OBS_API_URL`, `OBS_API_KEY`
- `JOB_RETRY_ATTEMPTS`, `CACHE_TTL_SECONDS`

### Key Collections/Queues

- **MongoDB**: `tokens`, `jobs`
- **RabbitMQ**: `flickr_rest`, `flickr_upload`, `flickr_replace`, `flickr_dlq`
- **Redis**: Cache keys prefixed with `flickrhub:cache:`

---

## 🚨 Important Notes

1. **Security**: Tokens are NOT encrypted - this is a critical issue
2. **TypeScript**: Docs mention TypeScript but code is JavaScript
3. **Rate Limiting**: Mentioned in docs but not implemented
4. **Metrics**: Only logging, no Prometheus metrics yet
5. **Tests**: Minimal test coverage - needs improvement

---

## 🔗 Related Documents

- [Architecture Review](reviews/ARCHITECTURE_REVIEW.md) - Detailed SA assessment
- [Backlog Guide](backlog/README.md) - How to manage backlog
- [Operations Guide](guides/operations.md) - Operational runbook
- [API Documentation](api/README.md) - API reference

---

**Last Updated**: 2024-01-25  
**Maintainer**: Development Team
