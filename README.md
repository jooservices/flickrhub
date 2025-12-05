# FlickrHub

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue)](https://www.docker.com/)

> A production-ready hub/proxy for Flickr API with OAuth authentication, queued job processing, rate limiting, and zero-config Docker deployment.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [Project Status](#project-status)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

FlickrHub is a reliable, scalable proxy service for the Flickr API that handles OAuth authentication, job queuing, rate limiting, and caching. It provides a single unified API endpoint for all Flickr operations while managing complexity behind the scenes.

### Key Capabilities

- **OAuth 1.0a Authentication**: Secure token management with user isolation
- **Asynchronous Job Processing**: Queue-based architecture for reliable processing
- **Intelligent Caching**: Redis-based caching to reduce API calls
- **Rate Limiting**: Per-user rate limiting to respect Flickr API limits
- **Observability**: Comprehensive logging and monitoring integration
- **Zero-Config Deployment**: Docker Compose setup for instant deployment

---

## Features

### Core Features

- ✅ **Single API Endpoint**: Unified REST API (`POST /api/v1/flickr/rest`)
- ✅ **OAuth Flow**: Backend-managed OAuth 1.0a with OOB and callback support
- ✅ **Queue-Based Processing**: RabbitMQ for reliable asynchronous job processing
- ✅ **Multi-Queue Architecture**: Separate queues for REST, upload, and replace operations
- ✅ **Caching Layer**: Redis-based caching with configurable TTL
- ✅ **Retry Mechanism**: Automatic retries with configurable attempts and DLQ
- ✅ **Webhook Callbacks**: Optional webhook notifications with HMAC signatures
- ✅ **Observability**: Structured logging with OBS integration
- ✅ **Docker Deployment**: Complete Docker Compose setup

### Planned Features

- ⏳ **Rate Limiting**: Per-user rate limiting (3,500 req/hour) - _In Progress_
- ⏳ **Prometheus Metrics**: Comprehensive metrics and dashboards
- ⏳ **High Availability**: Redis Sentinel, MongoDB Replica Set
- ⏳ **API Authentication**: API key-based authentication
- ⏳ **Dashboard UI**: Web-based job management interface

---

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: 20.0.0 or higher ([Download](https://nodejs.org/))
- **Docker**: 20.10.0 or higher ([Download](https://www.docker.com/))
- **Docker Compose**: 2.0.0 or higher (included with Docker Desktop)
- **Git**: For cloning the repository
- **Flickr API Credentials**: API key and secret from [Flickr App Garden](https://www.flickr.com/services/apps/create/)

---

## Quick Start

### 1. Clone the Repository

```bash
git clone git@github.com:jooservices/flickrhub.git
cd flickrhub
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Flickr API credentials:

```env
FLICKR_API_KEY=your_api_key_here
FLICKR_API_SECRET=your_api_secret_here
```

### 3. Start Services

```bash
docker compose up -d --build
```

This starts:

- API server on `http://localhost:3000`
- Worker services (rest, upload, replace queues)
- Redis on `localhost:6380`
- MongoDB on `localhost:27019`
- RabbitMQ (internal)

### 4. Generate OAuth Token

```bash
MONGO_URL=mongodb://localhost:27019/flickrhub npm run cli:auth
```

Follow the prompts to complete OAuth flow. Save the returned `user_id`.

### 5. Make Your First API Call

```bash
curl -X POST http://localhost:3000/api/v1/flickr/rest \
  -H "Content-Type: application/json" \
  -d '{
    "method": "flickr.test.echo",
    "params": {"name": "Hello FlickrHub"},
    "user_id": "<your_user_id>",
    "target": "rest"
  }'
```

### 6. Check Job Status

```bash
curl -X POST http://localhost:3000/api/v1/flickr/jobs/status \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "<job_id_from_previous_response>",
    "user_id": "<your_user_id>"
  }'
```

**That's it!** You're ready to use FlickrHub.

For detailed instructions, see the [Getting Started Guide](docs/flickrhub/03-technical/getting-started/quick-start.md).

---

## Meta Field Pass-Through

FlickrHub supports passing custom metadata through your API requests that will be included in callback responses. This is useful for tracking sessions, job types, pagination state, and other contextual information.

### How It Works

When you include a `meta` field in your request, FlickrHub will:

1. Store it in MongoDB with the job
2. Pass it through the queue to workers
3. Include it in the callback response payload

This ensures your application context is preserved throughout the async job lifecycle.

### Request Format

Include a `meta` object in your request to `/api/v1/flickr/rest`:

```json
{
  "method": "flickr.contacts.getList",
  "params": {
    "per_page": 500,
    "page": 2
  },
  "user_id": "869737a6-71fb-435a-b686-0b1819d058ef",
  "target": "rest",
  "callback_url": "http://your-server.com/callback",
  "meta": {
    "session_id": "abc123",
    "job_type": "contacts_page",
    "page": 2,
    "per_page": 500
  }
}
```

### Callback Response Format

The callback will include your `meta` field unchanged:

```json
{
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "869737a6-71fb-435a-b686-0b1819d058ef",
  "queue": "flickr_rest",
  "state": "completed",
  "result": {
    /* Flickr API response */
  },
  "error": null,
  "from_cache": false,
  "attempts_made": 0,
  "max_attempts": 3,
  "timestamp": "2024-01-25T10:30:00.000Z",
  "trace_id": "req-123",
  "meta": {
    "session_id": "abc123",
    "job_type": "contacts_page",
    "page": 2,
    "per_page": 500
  }
}
```

### Use Cases

- **Session Tracking**: Link jobs to user sessions
- **Pagination Context**: Track page numbers and limits
- **Job Classification**: Categorize jobs by type or priority
- **Custom Identifiers**: Pass through application-specific IDs
- **Audit Information**: Include metadata for compliance/logging

### E2E Testing

FlickrHub includes a comprehensive E2E test tool that validates the complete flow including meta field pass-through:

```bash
# Run E2E test (automatically manages callback server)
node tools/e2e-test.js <your_user_id>

# Or specify custom API URL
node tools/e2e-test.js <your_user_id> http://localhost:3000
```

The tool will:

1. ✅ Start a temporary callback server
2. ✅ Send a test request with meta field
3. ✅ Wait for job completion
4. ✅ Validate callback includes meta field
5. ✅ Report detailed results with colored output
6. ✅ Clean up automatically

**Example output:**

```
============================================================
FlickrHub E2E Test - Meta Field Pass-Through
============================================================

[1/4] Starting callback server
✓ Callback server listening on http://127.0.0.1:4001/callback

[2/4] Sending test request to FlickrHub API
✓ Job enqueued: 550e8400-e29b-41d4-a716-446655440000

[3/4] Waiting for job completion
✓ Job completed

[4/4] Validating callback response
✓ Callback received
✓ Job ID matches
✓ State is completed
✓ Meta field matches expected values
  session_id: e2e-session-1234567890
  job_type: contacts_page
  page: 2
  per_page: 500

============================================================
🎉 ALL TESTS PASSED! 🎉
============================================================
```

For manual testing, you can use the separate tools:

```bash
# Terminal 1: Start callback server
PORT=3001 node tools/callback-server.js

# Terminal 2: Run test
node tools/test-callback-e2e.js <user-id>
```

---

## Architecture

### System Overview

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     ▼
┌─────────────────┐
│  API (Fastify)  │ ◄─── Health Check: /health
└────┬────────────┘
     │
     ├──► RabbitMQ ──► Worker ──► Flickr API
     │      (Queue)    (Jobs)
     │
     ├──► Redis (Cache)
     │
     └──► MongoDB (Tokens & Metadata)
```

### Components

- **API Server**: Fastify-based HTTP server handling OAuth and job enqueueing
- **Workers**: RabbitMQ consumers processing jobs from three queues (`flickr_rest`, `flickr_upload`, `flickr_replace`)
- **Redis**: Caching layer and future rate limiting
- **MongoDB**: Token storage and job metadata
- **RabbitMQ**: Message queue for asynchronous job processing

### Data Flow

1. Client sends request to API with `user_id`, `method`, and `params`
2. API validates request and enqueues job to appropriate RabbitMQ queue
3. Worker consumes job, checks Redis cache
4. If cache miss, worker calls Flickr API
5. Worker caches result, updates job status in MongoDB
6. Client polls job status endpoint for results

---

## Documentation

Comprehensive project documentation is under [`docs/flickrhub/`](docs/flickrhub/) (the `docs/master` directory hosts the architecture-center submodule and should remain untouched).

### Getting Started

- **[Installation Guide](docs/flickrhub/03-technical/getting-started/installation.md)** - Complete setup instructions
- **[Quick Start](docs/flickrhub/03-technical/getting-started/quick-start.md)** - 5-minute quick start
- **[Development Setup](docs/flickrhub/03-technical/getting-started/development-setup.md)** - Local development environment

### Guides

- **[Operations Guide](docs/flickrhub/07-guides/operations.md)** - Operations runbook
- **[Troubleshooting](docs/flickrhub/07-guides/troubleshooting.md)** - Common issues and solutions

### API Reference

- **[API Documentation](docs/flickrhub/03-technical/api/README.md)** - Complete API reference
- **[Authentication](docs/flickrhub/03-technical/api/README.md#oauth)** - OAuth flow documentation

### Architecture

- **[Architecture Overview](docs/flickrhub/02-architecture/README.md)** - System design
- **[Infrastructure](docs/flickrhub/05-systems/infrastructure/README.md)** - Infrastructure setup

### Reference

- **[Configuration](docs/flickrhub/04-data/configuration.md)** - All configuration options
- **[Environment Variables](docs/flickrhub/04-data/environment-variables.md)** - Complete env var reference
- **[Glossary](docs/flickrhub/04-data/glossary.md)** - Terms and definitions

### Reviews & Assessments

- **[Architecture Review](docs/flickrhub/01-governance/reviews/ARCHITECTURE_REVIEW.md)** - Senior SA assessment
- **[Code Review](docs/flickrhub/01-governance/reviews/CODE_REVIEW.md)** - Senior Developer assessment
- **[Design Review](docs/flickrhub/01-governance/reviews/DESIGN_REVIEW.md)** - Senior Designer assessment

### Planning

- **[Backlog](docs/flickrhub/06-product/backlog/README.md)** - Active backlog and roadmap
- **[AI Onboarding](docs/flickrhub/08-meta/AI_ONBOARDING.md)** - Context guide for AI assistants

---

## Development

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start services (Docker)
docker compose up -d

# Or run locally (requires local Redis, MongoDB, RabbitMQ)
npm run api      # Start API server
npm run worker   # Start worker
```

### Available Scripts

```bash
npm run api          # Start API server
npm run worker       # Start worker process
npm run cli:auth     # OAuth token generation CLI
npm run cli:tokens   # List stored tokens
npm test             # Run tests
```

### Project Structure

```
flickrhub/
├── apps/                    # Deployable applications
│   ├── api/                # Fastify API server
│   │   ├── server.js       # Main server file
│   │   └── services/       # Business logic services
│   ├── worker/             # RabbitMQ consumer
│   │   └── index.js        # Worker main file
│   ├── cli/                # CLI tools
│   │   ├── authorize.js   # OAuth token generation
│   │   └── list-tokens.js # Token listing
│   └── web/                # Web UI
│       └── public/         # Static files
│
├── packages/                # Shared libraries
│   ├── config/             # Configuration management
│   ├── core/               # Business logic
│   │   ├── token-store.js # Token storage (MongoDB)
│   │   └── job-store.js   # Job metadata storage
│   ├── flickr-client/      # Flickr API wrapper
│   ├── logger/             # Structured logging
│   ├── mq/                 # Queue utilities
│   └── rabbitmq/           # RabbitMQ client
│
├── docs/                    # Documentation
│   ├── master/             # Architecture Center (submodule; do not edit here)
│   └── flickrhub/          # Project docs (getting-started, guides, API, backlog, reviews, etc.)
│
├── tests/                   # Test files
├── tools/                   # Development tools
├── docker-compose.yml       # Docker orchestration
├── Dockerfile               # Container image
└── package.json             # Dependencies
```

---

## Tech Stack

### Runtime & Language

- **Node.js**: 20.0.0+
- **JavaScript**: ES2020+ (CommonJS modules)
- **Package Manager**: npm

### Core Dependencies

- **Fastify**: 4.26.2 - High-performance HTTP framework
- **RabbitMQ** (amqplib): 0.10.9 - Message queue
- **Redis** (ioredis): 5.4.1 - Caching and future rate limiting
- **MongoDB**: 6.7.0 - Database driver
- **PM2**: Process manager for production

### Infrastructure

- **Docker**: Containerization
- **Docker Compose**: Service orchestration
- **Redis**: 7-alpine
- **MongoDB**: 7
- **RabbitMQ**: 3-management-alpine

### Observability

- **OBS Integration**: External observability service
- **Structured Logging**: StealthFlow-compliant logs

---

## Project Status

### Current Version: 0.1.0 (Pre-Production)

**Status**: ⚠️ **Not Production Ready**

### Known Limitations

- ⚠️ Tokens stored in plaintext (encryption planned)
- ⚠️ No API-level authentication (planned)
- ⚠️ Rate limiting not fully implemented (in progress)
- ⚠️ No Prometheus metrics yet (planned)
- ⚠️ Minimal test coverage (improvement planned)

### Roadmap

See [Backlog](docs/flickrhub/06-product/backlog/README.md) for detailed roadmap:

- **P0 (Critical)**: Security fixes, rate limiting, HA setup
- **P1 (High)**: Metrics, testing, distributed tracing
- **P2 (Medium)**: Performance optimization, client SDKs

---

## Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes**
4. **Follow code style**: Use consistent formatting
5. **Add tests**: Ensure new features are tested
6. **Update documentation**: Keep docs in sync with code
7. **Commit**: Use conventional commit messages
8. **Push**: `git push origin feature/your-feature`
9. **Create Pull Request**: Describe your changes

### Code Style

- Follow existing code patterns
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

### Commit Messages

Use conventional commits:

- `feat: add rate limiting`
- `fix: token encryption bug`
- `docs: update API documentation`
- `refactor: improve error handling`

---

## Support

### Getting Help

- **Documentation**: Check [docs/flickrhub/](docs/flickrhub/) for guides and references
- **Troubleshooting**: See [Troubleshooting Guide](docs/flickrhub/07-guides/troubleshooting.md)
- **Issues**: Open an issue on [GitHub](https://github.com/jooservices/flickrhub/issues)

### Reporting Issues

When reporting issues, please include:

- Node.js version
- Docker version (if applicable)
- Error messages and logs
- Steps to reproduce
- Expected vs actual behavior

---

## Security

### Security Considerations

⚠️ **Important**: This project is in pre-production. Security improvements are planned:

- Token encryption (P0)
- API authentication (P0)
- Security headers (P0)
- Secret management (P0)

See [Security Documentation](docs/flickrhub/06-product/backlog/active/p0-critical.md#security) for details.

### Reporting Security Issues

If you discover a security vulnerability, please **do not** open a public issue. Instead, contact the maintainers privately.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Acknowledgments

- Built with [Fastify](https://www.fastify.io/)
- Uses [RabbitMQ](https://www.rabbitmq.com/) for message queuing
- Powered by [Flickr API](https://www.flickr.com/services/api/)

---

**Last Updated**: 2024-01-25  
**Maintainer**: JOOservices Development Team
