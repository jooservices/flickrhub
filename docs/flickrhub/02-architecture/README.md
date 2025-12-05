---
title: "Architecture Details"
type: "guideline"
what: "System architecture, components, data flow, and design principles for FlickrHub"
why: "Enable developers and architects to understand system design and component interactions"
how: "Review components, data flows, routing, caching, and deployment architecture"
owner: "Architecture Team"
status: "approved"
last_updated: "2024-12-04"
tags: ['architecture', 'system-design', 'components', 'data-flow']
ai_semantics:
  layer: "architecture"
  relates_to: ['api', 'workers', 'redis', 'mongodb', 'rabbitmq', 'observability']
---

# Architecture Details

## Components

- **API (Fastify)**: serves OAuth flow, enqueues Flickr jobs, exposes job status, serves Web UI. Uses Redis for queues and Mongo for tokens/job metadata.
- **Workers (RabbitMQ consumers)**: three services (`flickr_rest`, `flickr_upload`, `flickr_replace`), concurrency configurable. Calls Flickr via SDK, caches results in Redis, logs to OBS, DLQ on final failure, optional Mongo persistence.
- **Redis**: queue backend + cache; AOF enabled and volume mounted.
- **MongoDB**: stores tokens (`user_id` → tokens) and failed/optional completed jobs; indexes on `user_id` and `jobId`.
- **Observability (external)**: OBS logs for Flickr calls and job lifecycle; metrics pending (Prometheus not yet wired).
- **Web UI**: static SPA for OAuth (start → verifier → user_id).

## Data Flow

1. **OAuth**: API `/auth/start` → request token stored in Redis → user authorizes → `/auth/complete` exchanges verifier → tokens stored in Mongo, returning `user_id`.
2. **Enqueue**: Client POST `/flickr/rest` with `method`, `params`, `user_id`, `target` (`rest|upload|replace`) → job added to target queue.
3. **Process**: Worker consumes queue → checks Redis cache (per user) → calls Flickr (or mock) → logs OBS → optional persistence → response returned as job result.
4. **Status**: Client POST `/flickr/jobs/status` with `job_id`, `user_id` → returns state/result, ownership checked.
5. **Failures**: Retries per `JOB_RETRY_ATTEMPTS` with backoff; final failures pushed to DLQ and logged; optional Mongo archive.

## Routing & Queues

- `target` drives queue selection; URLs come from config per target.
- DLQ queue `flickr_dlq` holds exhausted jobs (no consumer yet).

## Caching

- Redis cache keyed by `user_id + method + params`; TTL configurable.
- Cache metrics not yet implemented.

## Persistence & Retention

- Redis AOF enabled; job retention controlled via `JOB_TTL_COMPLETE/FAIL`.
- Mongo: tokens collection (`user_id` unique), jobs collection (`jobId` unique, `user_id` index); completed jobs optional via env.

## Observability

- OBS logs: flickr_api_call (success/retry/fail), job_completed/failed/dlq/archived_mongo.
- Metrics: to be added (queue depth, latencies, cache hit/miss).

## Deployment

- Docker Compose: API, 3 workers, Redis (AOF, volume), Mongo (volume). UI served by API.
- Config via env/.env.example; compose copies .env.example if missing.

## Design Principles

- **Secret minimization**: Token values live only in Mongo; clients and logs see `user_id` handles. Why: reduce leak surface and ease multi-tenant support.
- **Deterministic routing**: API maps requests to queues by endpoint type (`rest`, `upload`, `replace`). Why: isolate workloads and scale independently.
- **Configurable resilience**: Retries/backoff, cache TTL, worker instances are all env-driven. Why: tune per environment without code changes.
- **Observability first**: Every call logs success/retry/final failure to OBS with bounded payload. Why: diagnose quickly without exposing secrets.
- **Persistence by default**: Mongo volume keeps tokens/failures across rebuilds. Why: avoid data loss on deploys.

## Code Structure

The project is a **Monorepo** managed with `pnpm workspaces`.

### Directory Layout

```
/
├── apps/               # Deployable applications
│   ├── api/            # Fastify API server
│   └── worker/         # Background worker process
├── packages/           # Shared libraries
│   ├── config/         # Environment configuration (Zod validation)
│   ├── core/           # Business logic, DB models, Repositories
│   ├── flickr-client/  # Flickr API wrapper with OAuth 1.0a
│   ├── logger/         # Structured logging (StealthFlow)
│   ├── mq/             # Queue management (RabbitMQ)
│   └── types/          # Shared TypeScript interfaces
├── infra/              # Infrastructure configuration
│   └── docker/         # Dockerfiles and config (Prometheus, Grafana)
├── docs/               # Documentation
│   ├── master/         # Architecture Center (submodule; do not edit here)
│   └── flickrhub/      # Project docs
└── docker-compose.yml  # Orchestration
```

### Key Connections

- **API -> RabbitMQ**: For queuing jobs.
- **API -> Redis**: Cache lookups and rate limiting (future).
- **API -> Mongo**: For storing Job metadata and OAuth Tokens (`@flickrhub/core`).
- **Worker -> RabbitMQ**: Consumes jobs.
- **Worker -> Redis**: Cache.
- **Worker -> Mongo**: Updates job status.
- **Worker -> Flickr API**: External HTTP calls (`@flickrhub/flickr-client`).
