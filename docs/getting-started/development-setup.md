# Development Setup

Guide for setting up a local development environment.

---

## Prerequisites

- Node.js 20+
- Docker (optional, for services)
- Git
- Code editor (VS Code recommended)

---

## Development Environment Setup

### 1. Clone and Install

```bash
git clone <repo-url>
cd flickrhub
npm install
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Development-specific settings:

```env
# Development mode
NODE_ENV=development
OBS_DEBUG=true
MOCK_FLICKR=false  # Set to true to bypass real Flickr calls

# Local services (if not using Docker)
REDIS_URL=redis://localhost:6379
MONGO_URL=mongodb://localhost:27017/flickrhub
RABBIT_URL=amqp://localhost:5672
```

### 3. Start Services

#### Option A: Docker Compose (Recommended)

```bash
docker compose up -d
```

#### Option B: Local Services

```bash
# MongoDB
mongod --dbpath ./data/mongo

# Redis
redis-server

# RabbitMQ
rabbitmq-server
```

### 4. Run Development Servers

#### Terminal 1: API Server

```bash
npm run api
```

API runs on `http://localhost:3000`

#### Terminal 2: Worker

```bash
npm run worker
```

Worker consumes from RabbitMQ queues.

---

## Development Workflow

### Making Changes

1. **Edit code** in `apps/` or `packages/`
2. **Restart service** (API or Worker)
3. **Test changes** via API calls
4. **Check logs** for errors

### Hot Reload

For faster development, consider using `nodemon`:

```bash
npm install -g nodemon
nodemon apps/api/server.js
```

### Testing

```bash
# Run tests
npm test

# Run specific test
node --test tests/mq.test.js
```

---

## Code Structure

### Adding a New Endpoint

1. Add route in `apps/api/server.js`:

   ```javascript
   app.post('/api/v1/new-endpoint', async (request, reply) => {
     // Handler logic
   });
   ```

2. Add service method in `apps/api/services/` if needed

3. Update `docs/api/README.md`

### Adding a New Package

1. Create directory in `packages/`
2. Add module exports
3. Require in consuming code
4. Update documentation

### Modifying Worker Logic

1. Edit `apps/worker/index.js`
2. Test with mock Flickr (`MOCK_FLICKR=true`)
3. Check observability logs

---

## Debugging

### Enable Debug Logging

```env
OBS_DEBUG=true
```

### View Logs

```bash
# Docker logs
docker compose logs -f api
docker compose logs -f worker_rest

# Local logs
# Check console output
```

### Debug MongoDB

```bash
# Connect to MongoDB
mongosh mongodb://localhost:27019/flickrhub

# List collections
show collections

# Query tokens
db.tokens.find()

# Query jobs
db.jobs.find()
```

### Debug Redis

```bash
# Connect to Redis
redis-cli -h localhost -p 6380

# List keys
KEYS *

# Get cache key
GET flickrhub:cache:abc123
```

### Debug RabbitMQ

```bash
# Management UI (if exposed)
# http://localhost:15672
# guest/guest

# List queues
rabbitmqctl list_queues
```

---

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
# Start services
docker compose up -d

# Run integration tests
npm run test:integration
```

### Manual Testing

1. **Mock Mode**: Set `MOCK_FLICKR=true` to bypass real Flickr calls
2. **Test OAuth**: Use CLI or Web UI
3. **Test API**: Use curl or Postman
4. **Check Results**: Query job status

---

## Code Quality

### Linting

```bash
# Check if ESLint is configured
npm run lint
```

### Formatting

```bash
# Check if Prettier is configured
npm run format
```

### Type Checking

```bash
# If TypeScript is added
npm run type-check
```

---

## Common Development Tasks

### Adding a New Feature

1. Create backlog item in `docs/backlog/active/`
2. Implement feature
3. Add tests
4. Update documentation
5. Update backlog status

### Fixing a Bug

1. Reproduce bug
2. Write test that fails
3. Fix bug
4. Verify test passes
5. Update documentation if needed

### Refactoring

1. Ensure tests exist
2. Refactor code
3. Run tests
4. Update documentation

---

## IDE Setup

### VS Code

Recommended extensions:

- ESLint
- Prettier
- Docker
- MongoDB

### Settings

`.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript"]
}
```

---

## Git Workflow

### Branching

- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `fix/*`: Bug fix branches

### Commits

Follow conventional commits:

- `feat: add rate limiting`
- `fix: token encryption bug`
- `docs: update API documentation`

---

## Performance Testing

### Load Testing

```bash
# Install k6 or Artillery
npm install -g k6

# Run load test
k6 run load-test.js
```

### Profile Performance

```bash
# Node.js profiling
node --prof apps/api/server.js
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Services Not Starting

```bash
# Check Docker logs
docker compose logs

# Check service health
docker compose ps
```

### Dependencies Issues

```bash
# Clear node_modules
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

- **[API Documentation](../api/README.md)** - API reference
- **[Architecture](../architecture/README.md)** - System design
- **[Backlog](../backlog/README.md)** - Current work items

---

**Happy coding!** 🚀
