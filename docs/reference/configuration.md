# Configuration Reference

Complete reference for all configuration options in FlickrHub.

---

## Configuration Source

Configuration is loaded from:

1. Environment variables (primary)
2. `.env` file (if present)
3. Default values (fallback)

Configuration is centralized in `packages/config/index.js`.

---

## Server Configuration

### Port

```javascript
server: {
  port: Number(process.env.PORT || 3000);
}
```

**Environment Variable**: `PORT`  
**Default**: `3000`  
**Description**: HTTP server port

---

## Flickr API Configuration

### API Credentials

```javascript
flickr: {
  key: process.env.FLICKR_API_KEY,
  secret: process.env.FLICKR_API_SECRET,
  endpoints: {
    rest: process.env.FLICKR_REST_URL || 'https://www.flickr.com/services/rest/',
    upload: process.env.FLICKR_UPLOAD_URL || 'https://up.flickr.com/services/upload/',
    replace: process.env.FLICKR_REPLACE_URL || 'https://up.flickr.com/services/replace/'
  }
}
```

**Environment Variables**:

- `FLICKR_API_KEY` (required)
- `FLICKR_API_SECRET` (required)
- `FLICKR_REST_URL` (optional)
- `FLICKR_UPLOAD_URL` (optional)
- `FLICKR_REPLACE_URL` (optional)

**Defaults**: Flickr production URLs

---

## Database Configuration

### MongoDB

```javascript
mongoUrl: process.env.MONGO_URL;
```

**Environment Variable**: `MONGO_URL`  
**Default**: None (required)  
**Example**: `mongodb://mongo:27017/flickrhub`

### Redis

```javascript
redisUrl: process.env.REDIS_URL || 'redis://localhost:6379';
```

**Environment Variable**: `REDIS_URL`  
**Default**: `redis://localhost:6379`

### RabbitMQ

```javascript
rabbitUrl: process.env.RABBIT_URL || process.env.CLOUDAMQP_URL || 'amqp://localhost';
```

**Environment Variables**: `RABBIT_URL` or `CLOUDAMQP_URL`  
**Default**: `amqp://localhost`

---

## OAuth Configuration

```javascript
oauth: {
  mode: (process.env.OAUTH_MODE || 'oob').toLowerCase(),
  callbackUrl: process.env.CALLBACK_URL
}
```

**Environment Variables**:

- `OAUTH_MODE`: `oob` or `callback` (default: `oob`)
- `CALLBACK_URL`: Required if `OAUTH_MODE=callback`

---

## Job Configuration

```javascript
jobs: {
  retryAttempts: Number(process.env.JOB_RETRY_ATTEMPTS || 3),
  ttlComplete: Number(process.env.JOB_TTL_COMPLETE || 0),
  ttlFail: Number(process.env.JOB_TTL_FAIL || 0),
  ttlCompleteDays: Number(process.env.JOB_TTL_COMPLETE_DAYS || 0),
  ttlFailDays: Number(process.env.JOB_TTL_FAIL_DAYS || 0),
  saveCompleted: process.env.SAVE_COMPLETED_TO_MONGO === 'true',
  saveFailed: process.env.SAVE_FAILED_TO_MONGO !== 'false',
  callbackEnabled: process.env.CALLBACK_ENABLED !== 'false',
  callbackRetryAttempts: Number(process.env.CALLBACK_RETRY_ATTEMPTS || 3),
  callbackRetryDelayMs: Number(process.env.CALLBACK_RETRY_DELAY_MS || 1000)
}
```

**Environment Variables**:

- `JOB_RETRY_ATTEMPTS`: Max retry attempts (default: 3)
- `JOB_TTL_COMPLETE`: TTL for completed jobs in seconds (default: 0 = keep forever)
- `JOB_TTL_FAIL`: TTL for failed jobs in seconds (default: 0 = keep forever)
- `JOB_TTL_COMPLETE_DAYS`: TTL for completed jobs in days (default: 0)
- `JOB_TTL_FAIL_DAYS`: TTL for failed jobs in days (default: 0)
- `SAVE_COMPLETED_TO_MONGO`: Save completed jobs (default: true)
- `SAVE_FAILED_TO_MONGO`: Save failed jobs (default: true)
- `CALLBACK_ENABLED`: Enable webhook callbacks (default: true)
- `CALLBACK_RETRY_ATTEMPTS`: Max callback retries (default: 3)
- `CALLBACK_RETRY_DELAY_MS`: Callback retry delay in ms (default: 1000)

---

## Cache Configuration

```javascript
cache: {
  enabled: process.env.CACHE_ENABLED !== 'false',
  ttlSeconds: Number(process.env.CACHE_TTL_SECONDS || 300),
  prefix: process.env.CACHE_PREFIX || 'flickrhub:cache:'
}
```

**Environment Variables**:

- `CACHE_ENABLED`: Enable/disable cache (default: true)
- `CACHE_TTL_SECONDS`: Cache TTL in seconds (default: 300)
- `CACHE_PREFIX`: Cache key prefix (default: `flickrhub:cache:`)

---

## Worker Configuration

```javascript
worker: {
  queueName: process.env.QUEUE_NAME || 'flickr_rest',
  concurrency: Number(process.env.WORKER_CONCURRENCY || 1),
  perQueue: {
    rest: Number(process.env.WORKER_REST_CONCURRENCY || process.env.WORKER_CONCURRENCY || 1),
    upload: Number(process.env.WORKER_UPLOAD_CONCURRENCY || process.env.WORKER_CONCURRENCY || 1),
    replace: Number(process.env.WORKER_REPLACE_CONCURRENCY || process.env.WORKER_CONCURRENCY || 1)
  }
}
```

**Environment Variables**:

- `QUEUE_NAME`: Queue name for worker (default: `flickr_rest`)
- `WORKER_CONCURRENCY`: Default concurrency (default: 1)
- `WORKER_REST_CONCURRENCY`: Rest queue concurrency (default: 1)
- `WORKER_UPLOAD_CONCURRENCY`: Upload queue concurrency (default: 1)
- `WORKER_REPLACE_CONCURRENCY`: Replace queue concurrency (default: 1)

**Docker Compose Overrides**:

- `WORKER_REST_INSTANCES`: Number of rest worker instances (default: 5)
- `WORKER_UPLOAD_INSTANCES`: Number of upload worker instances (default: 5)
- `WORKER_REPLACE_INSTANCES`: Number of replace worker instances (default: 5)

---

## Observability Configuration

```javascript
obs: {
  url: process.env.OBS_API_URL,
  key: process.env.OBS_API_KEY,
  service: process.env.SERVICE_NAME || 'flickrhub-worker',
  env: process.env.SERVICE_ENV || process.env.NODE_ENV || 'local',
  debug: process.env.OBS_DEBUG === 'true'
}
```

**Environment Variables**:

- `OBS_API_URL`: Observability API URL
- `OBS_API_KEY`: Observability API key
- `SERVICE_NAME`: Service name for logs (default: `flickrhub-worker`)
- `SERVICE_ENV`: Service environment (default: `local`)
- `OBS_DEBUG`: Enable debug logging (default: false)
- `OBS_ENABLED`: Enable/disable observability (default: true)
- `TENANT_ID`: Tenant ID (optional)

---

## Configuration Validation

Configuration is loaded at startup. Invalid values may cause errors:

- **Missing required variables**: Startup will fail
- **Invalid URLs**: Connection errors
- **Invalid numbers**: May default to 0 or cause errors

---

## Configuration Examples

### Minimal Configuration

```env
FLICKR_API_KEY=your_key
FLICKR_API_SECRET=your_secret
MONGO_URL=mongodb://localhost:27017/flickrhub
REDIS_URL=redis://localhost:6379
RABBIT_URL=amqp://localhost:5672
```

### Production Configuration

```env
NODE_ENV=production
FLICKR_API_KEY=your_key
FLICKR_API_SECRET=your_secret
MONGO_URL=mongodb://mongo:27017/flickrhub
REDIS_URL=redis://redis:6379
RABBIT_URL=amqp://rabbit:5672
OBS_API_URL=https://obs.example.com/api/v1/logs
OBS_API_KEY=your_obs_key
SERVICE_NAME=flickrhub-worker
SERVICE_ENV=production
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
JOB_RETRY_ATTEMPTS=3
SAVE_COMPLETED_TO_MONGO=true
SAVE_FAILED_TO_MONGO=true
```

### Development Configuration

```env
NODE_ENV=development
OBS_DEBUG=true
MOCK_FLICKR=false
REDIS_URL=redis://localhost:6379
MONGO_URL=mongodb://localhost:27017/flickrhub
RABBIT_URL=amqp://localhost:5672
```

---

## Related Documentation

- [Environment Variables Reference](environment-variables.md)
- [Installation Guide](../getting-started/installation.md)
- [Operations Guide](../guides/operations.md)

---

**Last Updated**: 2024-01-25
