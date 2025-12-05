# Glossary

Terms and definitions used in FlickrHub documentation.

---

## A

### API Key

Flickr API credentials (key and secret) used for OAuth authentication.

### Authentication

Process of verifying user identity. Currently uses OAuth 1.0a with Flickr.

---

## B

### Backpressure

Mechanism to prevent system overload by limiting incoming requests when system is busy.

### BullMQ

Redis-based queue system (not currently used, using RabbitMQ instead).

---

## C

### Cache

Redis-based caching layer to store Flickr API responses and reduce external API calls.

### Callback URL

URL where webhook notifications are sent when jobs complete.

### Circuit Breaker

Pattern to prevent cascading failures by stopping requests when service is failing.

---

## D

### DLQ (Dead Letter Queue)

Queue for jobs that have exhausted all retry attempts.

### Docker Compose

Tool for defining and running multi-container Docker applications.

---

## E

### Enqueue

Process of adding a job to a queue for processing.

---

## F

### Fastify

Fast and low overhead web framework for Node.js (used for API server).

### Flickr API

External API provided by Flickr for photo management.

---

## G

### Grafana

Open-source analytics and monitoring platform (planned, not yet implemented).

---

## H

### Health Check

Endpoint (`/health`) to verify service is running.

### HMAC

Hash-based Message Authentication Code used for webhook signature verification.

---

## I

### Idempotency

Property where an operation can be applied multiple times without changing the result.

### ioredis

Redis client for Node.js.

---

## J

### Job

Unit of work representing a Flickr API call request.

### Job ID

Unique identifier for a job (UUID).

### Job Store

MongoDB collection storing job metadata and results.

---

## K

### KMS (Key Management Service)

Service for managing encryption keys (planned, not yet implemented).

---

## L

### Lazy Queue

RabbitMQ queue mode that stores messages on disk to reduce memory usage.

---

## M

### MongoDB

NoSQL database used for storing tokens and job metadata.

### Mock Mode

Development mode (`MOCK_FLICKR=true`) that bypasses real Flickr API calls.

---

## O

### OAuth 1.0a

Authentication protocol used by Flickr API.

### OBS (Observability)

External logging service for structured logs.

### OOB (Out-of-Band)

OAuth callback mode where user manually enters verifier code.

---

## P

### PM2

Process manager for Node.js applications.

### Prometheus

Monitoring and alerting toolkit (planned, not yet implemented).

---

## Q

### Queue

Message queue (RabbitMQ) for asynchronous job processing.

### Queue Name

Identifier for RabbitMQ queue (`flickr_rest`, `flickr_upload`, `flickr_replace`).

---

## R

### Rate Limiting

Mechanism to limit number of requests per time period (planned, not yet implemented).

### Redis

In-memory data store used for caching.

### Retry

Automatic re-attempt of failed operations.

---

## S

### SLO (Service Level Objective)

Target level of service reliability (planned, not yet implemented).

### StealthFlow

Observability logging format (compliance requirement).

---

## T

### Target

Queue selection parameter (`rest`, `upload`, `replace`).

### Token

OAuth access token and secret stored in MongoDB.

### Token Store

MongoDB collection storing OAuth tokens mapped to `user_id`.

### Trace ID

Unique identifier for tracking requests across services.

---

## U

### User ID

UUID identifier exposed to clients (not the actual OAuth token).

---

## W

### Webhook

HTTP callback for notifying clients when jobs complete.

### Worker

Background process that consumes jobs from RabbitMQ queues.

---

## Acronyms

- **API**: Application Programming Interface
- **CRUD**: Create, Read, Update, Delete
- **DLQ**: Dead Letter Queue
- **HA**: High Availability
- **HMAC**: Hash-based Message Authentication Code
- **HTTP**: Hypertext Transfer Protocol
- **JSON**: JavaScript Object Notation
- **KMS**: Key Management Service
- **OOB**: Out-of-Band
- **OBS**: Observability Service
- **PM2**: Process Manager 2
- **QoS**: Quality of Service
- **REST**: Representational State Transfer
- **SLO**: Service Level Objective
- **SPA**: Single Page Application
- **TTL**: Time To Live
- **UUID**: Universally Unique Identifier

---

## Technical Terms

### Envelope Encryption

Encryption pattern where data is encrypted with a data key, which is encrypted with a master key.

### Idempotency Key

Unique key provided by client to prevent duplicate processing.

### Sliding Window

Rate limiting algorithm that tracks requests in a time window.

### Circuit Breaker Pattern

Design pattern to prevent cascading failures by stopping requests when service is failing.

### Backpressure

Mechanism to prevent system overload by limiting incoming requests.

---

## FAQ

### What is the difference between `user_id` and token?

- **`user_id`**: UUID identifier exposed to clients
- **Token**: OAuth credentials stored securely in MongoDB (not exposed)

### What is the difference between queue and cache?

- **Queue**: RabbitMQ for job processing (temporary, processed once)
- **Cache**: Redis for storing API responses (temporary, can be reused)

### What is OOB mode?

OOB (Out-of-Band) is an OAuth callback mode where the user manually enters a verifier code instead of automatic redirect.

### What is a DLQ?

Dead Letter Queue - queue for jobs that have failed after all retry attempts.

---

**Last Updated**: 2024-01-25
