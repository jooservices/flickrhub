---
title: "Infrastructure Overview"
type: "guideline"
what: "Docker infrastructure setup, services, and deployment configuration for FlickrHub"
why: "Enable operators to understand and manage the infrastructure stack"
how: "Review service descriptions, dependencies, and configuration options"
owner: "DevOps Team"
status: "approved"
last_updated: "2024-12-04"
tags: ['infrastructure', 'docker', 'deployment', 'services']
ai_semantics:
  layer: "system"
  relates_to: ['docker', 'rabbitmq', 'redis', 'mongodb', 'deployment']
---

# Infrastructure Overview

## Docker Infrastructure

The system is orchestrated using Docker Compose and consists of the following services connected via a bridge network.

### Services (current compose)

1. **api**
   - Image: built from repo `Dockerfile`
   - Port: 3000 exposed to host
   - Role: Fastify API; enqueues jobs and exposes job status.
   - Depends: redis, mongo.

2. **worker_rest**, **worker_upload**, **worker_replace**
   - Image: same build as api (pm2 profile).
   - Instances: configured via `.env` (`WORKER_*_INSTANCES`).
   - Role: consume RabbitMQ queues `flickr_rest`, `flickr_upload`, `flickr_replace`; call Flickr via SDK; cache responses; log to OBS; persist failures.
   - Depends: rabbit, redis, mongo.

3. **rabbit**
   - Image: `rabbitmq:3-management-alpine`
   - Ports: not exposed externally (internal-only)
   - Role: message broker for Flickr jobs + DLQ.

4. **redis**
   - Image: `redis:7-alpine`
   - Ports: not exposed externally (internal-only)
   - Role: cache (ioredis).

5. **mongo**
   - Image: `mongo:7`
   - Ports: not exposed externally (internal-only)
   - Volume: `mongo_data` named volume (persists across rebuilds).
   - Role: store tokens (`user_id` → token), failed jobs, etc.

> Note: No reverse proxy/prometheus/grafana in current compose; add separately if needed.
