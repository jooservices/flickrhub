# Installation Guide

Complete installation instructions for FlickrHub.

---

## Prerequisites

### Required

- **Node.js**: 20+ ([Download](https://nodejs.org/))
- **Docker**: 20+ ([Download](https://www.docker.com/))
- **Docker Compose**: 2.0+ (included with Docker Desktop)
- **Git**: For cloning the repository

### Optional

- **MongoDB**: 7+ (if not using Docker)
- **Redis**: 7+ (if not using Docker)
- **RabbitMQ**: 3+ (if not using Docker)

---

## Installation Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd flickrhub
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Flickr API Credentials (Required)
FLICKR_API_KEY=your_api_key
FLICKR_API_SECRET=your_api_secret

# Database & Cache (Docker defaults)
REDIS_URL=redis://redis:6379
MONGO_URL=mongodb://mongo:27017/flickrhub
RABBIT_URL=amqp://rabbit:5672

# Observability (Optional)
OBS_API_URL=http://observability.jooservices.com/api/v1/logs
OBS_API_KEY=your_obs_key
SERVICE_NAME=flickrhub-worker
SERVICE_ENV=local

# Flickr Endpoints (Defaults)
FLICKR_REST_URL=https://www.flickr.com/services/rest/
FLICKR_UPLOAD_URL=https://up.flickr.com/services/upload/
FLICKR_REPLACE_URL=https://up.flickr.com/services/replace/

# Configuration
JOB_RETRY_ATTEMPTS=3
CACHE_TTL_SECONDS=300
CACHE_ENABLED=true
```

### 4. Start Services

#### Option A: Docker Compose (Recommended)

```bash
docker compose up -d --build
```

This starts:

- API service on `localhost:3000`
- Worker services (rest, upload, replace)
- Redis on `localhost:6380` (host port)
- MongoDB on `localhost:27019` (host port)
- RabbitMQ (internal only)

#### Option B: Manual Setup

If you prefer to run services manually:

1. **Start MongoDB**:

   ```bash
   mongod --dbpath /path/to/data
   ```

2. **Start Redis**:

   ```bash
   redis-server
   ```

3. **Start RabbitMQ**:

   ```bash
   rabbitmq-server
   ```

4. **Start API**:

   ```bash
   npm run api
   ```

5. **Start Worker**:
   ```bash
   npm run worker
   ```

### 5. Verify Installation

Check health endpoint:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{ "status": "ok" }
```

---

## Post-Installation

### Generate OAuth Token

```bash
MONGO_URL=mongodb://localhost:27019/flickrhub npm run cli:auth
```

This will:

1. Start OAuth flow
2. Print authorization URL
3. Ask for verifier (OOB mode)
4. Store token in MongoDB
5. Return `user_id` (UUID)

Save the `user_id` for API calls.

### Test API

```bash
curl -X POST http://localhost:3000/api/v1/flickr/rest \
  -H "Content-Type: application/json" \
  -d '{
    "method": "flickr.test.echo",
    "params": {"name": "test"},
    "user_id": "<your_user_id>",
    "target": "rest"
  }'
```

---

## Configuration

### Environment Variables

See [Environment Variables Reference](../04-data/environment-variables.md) for complete list.

### Key Settings

- **`JOB_RETRY_ATTEMPTS`**: Number of retries (default: 3)
- **`CACHE_TTL_SECONDS`**: Cache TTL (default: 300)
- **`CACHE_ENABLED`**: Enable/disable caching (default: true)
- **`WORKER_*_INSTANCES`**: Worker instances per queue (default: 5)
- **`WORKER_*_CONCURRENCY`**: Concurrency per worker (default: 1)

---

## Troubleshooting

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the port
lsof -i :3000
lsof -i :27019
lsof -i :6380

# Change ports in docker-compose.yml or .env
```

### Docker Issues

```bash
# View logs
docker compose logs -f api
docker compose logs -f worker_rest

# Restart services
docker compose restart api

# Rebuild containers
docker compose up -d --build
```

### MongoDB Connection

```bash
# Test connection
mongosh mongodb://localhost:27019/flickrhub

# Check if running
docker compose ps mongo
```

### Redis Connection

```bash
# Test connection
redis-cli -h localhost -p 6380 ping

# Check if running
docker compose ps redis
```

---

## Next Steps

- **[Quick Start Guide](quick-start.md)** - Extended quick start
- **[Development Setup](development-setup.md)** - Local development
- **[API Documentation](../03-technical/api/README.md)** - API reference
- **[Operations Guide](../07-guides/operations.md)** - Operations runbook

---

## Uninstallation

### Docker Compose

```bash
# Stop and remove containers
docker compose down

# Remove volumes (WARNING: deletes data)
docker compose down -v
```

### Manual

Stop all services and remove data directories.

---

**Need help?** Check [Troubleshooting](../07-guides/troubleshooting.md)
