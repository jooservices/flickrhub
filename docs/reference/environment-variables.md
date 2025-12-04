# Environment Variables Reference

Complete reference for all environment variables used in FlickrHub.

---

## Required Variables

### Flickr API Credentials

| Variable            | Description       | Example     |
| ------------------- | ----------------- | ----------- |
| `FLICKR_API_KEY`    | Flickr API key    | `abc123...` |
| `FLICKR_API_SECRET` | Flickr API secret | `xyz789...` |

**Required**: Yes  
**Default**: None  
**Note**: Get from [Flickr API](https://www.flickr.com/services/api/)

---

## Database & Cache

### MongoDB

| Variable           | Description               | Example                           |
| ------------------ | ------------------------- | --------------------------------- |
| `MONGO_URL`        | MongoDB connection string | `mongodb://mongo:27017/flickrhub` |
| `MONGO_DB`         | Database name             | `flickrhub`                       |
| `TOKEN_COLLECTION` | Tokens collection name    | `tokens`                          |

**Required**: Yes (if using MongoDB)  
**Default**: `mongodb://localhost:27017/flickrhub`

### Redis

| Variable    | Description             | Example              |
| ----------- | ----------------------- | -------------------- |
| `REDIS_URL` | Redis connection string | `redis://redis:6379` |

**Required**: Yes  
**Default**: `redis://localhost:6379`

### RabbitMQ

| Variable        | Description                        | Example                       |
| --------------- | ---------------------------------- | ----------------------------- |
| `RABBIT_URL`    | RabbitMQ connection string         | `amqp://rabbit:5672`          |
| `CLOUDAMQP_URL` | CloudAMQP connection (alternative) | `amqp://user:pass@host/vhost` |

**Required**: Yes  
**Default**: `amqp://localhost:5672`

---

## Server Configuration

| Variable   | Description      | Example                     |
| ---------- | ---------------- | --------------------------- |
| `PORT`     | API server port  | `3000`                      |
| `NODE_ENV` | Node environment | `production`, `development` |

**Required**: No  
**Default**: `PORT=3000`, `NODE_ENV=production`

---

## Flickr Endpoints

| Variable             | Description       | Example                                   |
| -------------------- | ----------------- | ----------------------------------------- |
| `FLICKR_REST_URL`    | REST API endpoint | `https://www.flickr.com/services/rest/`   |
| `FLICKR_UPLOAD_URL`  | Upload endpoint   | `https://up.flickr.com/services/upload/`  |
| `FLICKR_REPLACE_URL` | Replace endpoint  | `https://up.flickr.com/services/replace/` |

**Required**: No  
**Default**: Flickr production URLs

---

## OAuth Configuration

| Variable       | Description        | Example                         |
| -------------- | ------------------ | ------------------------------- |
| `OAUTH_MODE`   | OAuth mode         | `oob`, `callback`               |
| `CALLBACK_URL` | OAuth callback URL | `https://your-app.com/callback` |

**Required**: No  
**Default**: `OAUTH_MODE=oob`

**Note**: `callback` mode requires `CALLBACK_URL`

---

## Job Configuration

| Variable                  | Description                      | Example            |
| ------------------------- | -------------------------------- | ------------------ |
| `JOB_RETRY_ATTEMPTS`      | Max retry attempts               | `3`                |
| `JOB_TTL_COMPLETE`        | TTL for completed jobs (seconds) | `0` (keep forever) |
| `JOB_TTL_FAIL`            | TTL for failed jobs (seconds)    | `0` (keep forever) |
| `JOB_TTL_COMPLETE_DAYS`   | TTL for completed jobs (days)    | `90`               |
| `JOB_TTL_FAIL_DAYS`       | TTL for failed jobs (days)       | `30`               |
| `SAVE_COMPLETED_TO_MONGO` | Save completed jobs to MongoDB   | `true`, `false`    |
| `SAVE_FAILED_TO_MONGO`    | Save failed jobs to MongoDB      | `true`, `false`    |

**Required**: No  
**Default**:

- `JOB_RETRY_ATTEMPTS=3`
- `JOB_TTL_COMPLETE=0`
- `JOB_TTL_FAIL=0`
- `SAVE_COMPLETED_TO_MONGO=true`
- `SAVE_FAILED_TO_MONGO=true`

---

## Cache Configuration

| Variable            | Description          | Example            |
| ------------------- | -------------------- | ------------------ |
| `CACHE_ENABLED`     | Enable/disable cache | `true`, `false`    |
| `CACHE_TTL_SECONDS` | Cache TTL in seconds | `300`              |
| `CACHE_PREFIX`      | Cache key prefix     | `flickrhub:cache:` |

**Required**: No  
**Default**:

- `CACHE_ENABLED=true`
- `CACHE_TTL_SECONDS=300`
- `CACHE_PREFIX=flickrhub:cache:`

---

## Worker Configuration

| Variable                     | Description                | Example       |
| ---------------------------- | -------------------------- | ------------- |
| `QUEUE_NAME`                 | Queue name for worker      | `flickr_rest` |
| `WORKER_CONCURRENCY`         | Default worker concurrency | `1`           |
| `WORKER_REST_INSTANCES`      | Rest worker instances      | `5`           |
| `WORKER_REST_CONCURRENCY`    | Rest worker concurrency    | `1`           |
| `WORKER_UPLOAD_INSTANCES`    | Upload worker instances    | `5`           |
| `WORKER_UPLOAD_CONCURRENCY`  | Upload worker concurrency  | `1`           |
| `WORKER_REPLACE_INSTANCES`   | Replace worker instances   | `5`           |
| `WORKER_REPLACE_CONCURRENCY` | Replace worker concurrency | `1`           |

**Required**: No  
**Default**:

- `WORKER_CONCURRENCY=1`
- `WORKER_*_INSTANCES=5`
- `WORKER_*_CONCURRENCY=1`

---

## Observability

| Variable       | Description                  | Example                                            |
| -------------- | ---------------------------- | -------------------------------------------------- |
| `OBS_API_URL`  | Observability API URL        | `http://observability.jooservices.com/api/v1/logs` |
| `OBS_API_KEY`  | Observability API key        | `abc123...`                                        |
| `SERVICE_NAME` | Service name for logs        | `flickrhub-worker`                                 |
| `SERVICE_ENV`  | Service environment          | `production`, `staging`, `local`                   |
| `TENANT_ID`    | Tenant ID (optional)         | `tenant-123`                                       |
| `OBS_DEBUG`    | Enable debug logging         | `true`, `false`                                    |
| `OBS_ENABLED`  | Enable/disable observability | `true`, `false`                                    |

**Required**: No  
**Default**:

- `SERVICE_NAME=flickrhub-worker`
- `SERVICE_ENV=local`
- `OBS_DEBUG=false`
- `OBS_ENABLED=true`

---

## Callback Configuration

| Variable                  | Description                 | Example         |
| ------------------------- | --------------------------- | --------------- |
| `CALLBACK_ENABLED`        | Enable webhook callbacks    | `true`, `false` |
| `CALLBACK_RETRY_ATTEMPTS` | Max callback retry attempts | `3`             |
| `CALLBACK_RETRY_DELAY_MS` | Callback retry delay (ms)   | `1000`          |

**Required**: No  
**Default**:

- `CALLBACK_ENABLED=true`
- `CALLBACK_RETRY_ATTEMPTS=3`
- `CALLBACK_RETRY_DELAY_MS=1000`

---

## Development & Testing

| Variable      | Description               | Example                 |
| ------------- | ------------------------- | ----------------------- |
| `MOCK_FLICKR` | Use mock Flickr client    | `true`, `false`         |
| `API_BASE`    | API base URL (for Web UI) | `http://localhost:3000` |

**Required**: No  
**Default**:

- `MOCK_FLICKR=false`
- `API_BASE=http://localhost:3000`

---

## Docker Compose Overrides

These are set in `docker-compose.yml` and can be overridden:

| Variable                   | Description              | Default                    |
| -------------------------- | ------------------------ | -------------------------- |
| `PM2_TARGET`               | PM2 target process       | `api`, `worker-rest`, etc. |
| `WORKER_REST_INSTANCES`    | Rest worker instances    | `5`                        |
| `WORKER_UPLOAD_INSTANCES`  | Upload worker instances  | `5`                        |
| `WORKER_REPLACE_INSTANCES` | Replace worker instances | `5`                        |

---

## Environment-Specific Examples

### Local Development

```env
NODE_ENV=development
OBS_DEBUG=true
MOCK_FLICKR=false
REDIS_URL=redis://localhost:6379
MONGO_URL=mongodb://localhost:27017/flickrhub
RABBIT_URL=amqp://localhost:5672
```

### Docker Compose

```env
REDIS_URL=redis://redis:6379
MONGO_URL=mongodb://mongo:27017/flickrhub
RABBIT_URL=amqp://rabbit:5672
```

### Production

```env
NODE_ENV=production
OBS_DEBUG=false
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
JOB_RETRY_ATTEMPTS=3
SAVE_COMPLETED_TO_MONGO=true
SAVE_FAILED_TO_MONGO=true
```

---

## Validation

Configuration is validated in `packages/config/index.js` using environment variables.

Invalid values will cause startup errors.

---

## Security Notes

⚠️ **Never commit `.env` files to version control**

- Use `.env.example` for templates
- Use secret management in production
- Rotate secrets regularly

---

## Related Documentation

- [Configuration Reference](configuration.md)
- [Installation Guide](../getting-started/installation.md)
- [Operations Guide](../guides/operations.md)

---

**Last Updated**: 2024-01-25
