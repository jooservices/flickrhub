# Quick Start Guide

Extended quick start guide with examples and common workflows.

---

## Prerequisites

- Docker installed and running
- Flickr API credentials (get from [Flickr API](https://www.flickr.com/services/api/))

---

## Step-by-Step Guide

### 1. Setup Project

```bash
git clone <repo-url>
cd flickrhub
npm install
cp .env.example .env
```

### 2. Configure Environment

Edit `.env`:

```env
FLICKR_API_KEY=your_key_here
FLICKR_API_SECRET=your_secret_here
```

### 3. Start Services

```bash
docker compose up -d --build
```

Wait for services to be healthy (check with `docker compose ps`).

### 4. Generate OAuth Token

```bash
MONGO_URL=mongodb://localhost:27019/flickrhub npm run cli:auth
```

**OOB Flow**:

1. CLI prints authorization URL
2. Open URL in browser
3. Authorize application
4. Copy verifier code from Flickr
5. Paste verifier in CLI
6. CLI returns `user_id` (UUID)

**Save the `user_id`!**

### 5. Enqueue Your First Job

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

Response:

```json
{
  "request_id": "...",
  "data": {
    "job_id": "abc123..."
  },
  "error": null
}
```

### 6. Check Job Status

```bash
curl -X POST http://localhost:3000/api/v1/flickr/jobs/status \
  -H "Content-Type: application/json" \
  -d '{
    "job_id": "<job_id>",
    "user_id": "<user_id>"
  }'
```

Response (completed):

```json
{
  "request_id": "...",
  "data": {
    "id": "abc123...",
    "state": "completed",
    "returnvalue": {
      "from_cache": false,
      "flickr": {
        "stat": "ok",
        "method": "flickr.test.echo",
        "name": "Hello FlickrHub"
      }
    }
  },
  "error": null
}
```

---

## Common Workflows

### Upload a Photo

```bash
curl -X POST http://localhost:3000/api/v1/flickr/rest \
  -H "Content-Type: application/json" \
  -d '{
    "method": "flickr.photos.upload",
    "params": {
      "photo": "<base64_encoded_image>",
      "title": "My Photo"
    },
    "user_id": "<user_id>",
    "target": "upload"
  }'
```

### Search Photos

```bash
curl -X POST http://localhost:3000/api/v1/flickr/rest \
  -H "Content-Type: application/json" \
  -d '{
    "method": "flickr.photos.search",
    "params": {
      "text": "sunset",
      "per_page": 10
    },
    "user_id": "<user_id>",
    "target": "rest"
  }'
```

### With Webhook Callback

```bash
curl -X POST http://localhost:3000/api/v1/flickr/rest \
  -H "Content-Type: application/json" \
  -d '{
    "method": "flickr.test.echo",
    "params": {"name": "test"},
    "user_id": "<user_id>",
    "target": "rest",
    "callback_url": "https://your-app.com/webhook",
    "callback_secret": "your_secret"
  }'
```

Worker will POST to your webhook when job completes.

---

## Web UI (OAuth)

1. Open `apps/web/public/index.html` in browser
2. Enter Flickr API key and secret
3. Click "Start Authorization"
4. Authorize in new window
5. Paste verifier code
6. Get `user_id`

---

## Monitoring

### View Logs

```bash
# API logs
docker compose logs -f api

# Worker logs
docker compose logs -f worker_rest

# All logs
docker compose logs -f
```

### Check Service Status

```bash
docker compose ps
```

### Health Check

```bash
curl http://localhost:3000/health
```

---

## Next Steps

- **[API Documentation](../03-technical/api/README.md)** - Complete API reference
- **[Operations Guide](../07-guides/operations.md)** - Operations runbook
- **[Architecture](../02-architecture/README.md)** - System architecture
- **[Development Setup](development-setup.md)** - Local development

---

## Troubleshooting

### Job Stuck in Queue

```bash
# Check RabbitMQ management UI
# (if exposed) http://localhost:15672
# Default: guest/guest

# Check worker logs
docker compose logs worker_rest
```

### Token Not Found

```bash
# List tokens
npm run cli:tokens

# Regenerate token
npm run cli:auth
```

### Cache Issues

```bash
# Clear Redis cache (if needed)
docker compose exec redis redis-cli FLUSHDB
```

---

**Ready for more?** → [Development Setup](development-setup.md)
