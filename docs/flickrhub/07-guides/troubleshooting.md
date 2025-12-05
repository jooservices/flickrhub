# Troubleshooting Guide

Common issues and solutions for FlickrHub.

---

## General Issues

### Services Not Starting

**Symptoms**: Docker containers fail to start or crash immediately.

**Solutions**:

1. Check logs:

   ```bash
   docker compose logs
   ```

2. Verify ports are available:

   ```bash
   lsof -i :3000
   lsof -i :27019
   lsof -i :6380
   ```

3. Check Docker resources:

   ```bash
   docker system df
   docker system prune  # If needed
   ```

4. Rebuild containers:
   ```bash
   docker compose down
   docker compose up -d --build
   ```

---

## API Issues

### API Not Responding

**Symptoms**: `curl http://localhost:3000/health` returns connection refused.

**Solutions**:

1. Check if API container is running:

   ```bash
   docker compose ps api
   ```

2. Check API logs:

   ```bash
   docker compose logs -f api
   ```

3. Verify environment variables:

   ```bash
   docker compose exec api env | grep -E "MONGO|REDIS|RABBIT"
   ```

4. Restart API:
   ```bash
   docker compose restart api
   ```

### 404 Errors

**Symptoms**: API returns 404 for valid endpoints.

**Solutions**:

1. Verify endpoint path (should start with `/api/v1/`)
2. Check API routes in `apps/api/server.js`
3. Verify API is running latest code

---

## Worker Issues

### Jobs Not Processing

**Symptoms**: Jobs enqueued but not processed.

**Solutions**:

1. Check worker logs:

   ```bash
   docker compose logs -f worker_rest
   ```

2. Verify RabbitMQ connection:

   ```bash
   docker compose exec worker_rest ping rabbit
   ```

3. Check queue status:

   ```bash
   # Access RabbitMQ management UI (if exposed)
   # http://localhost:15672
   # guest/guest
   ```

4. Verify worker is consuming:

   ```bash
   docker compose logs worker_rest | grep "consume"
   ```

5. Restart worker:
   ```bash
   docker compose restart worker_rest
   ```

### Jobs Failing

**Symptoms**: Jobs move to DLQ or fail repeatedly.

**Solutions**:

1. Check worker logs for error messages
2. Verify Flickr API credentials:

   ```bash
   docker compose exec worker_rest env | grep FLICKR
   ```

3. Check token validity:

   ```bash
   npm run cli:tokens
   ```

4. Test Flickr API directly:
   ```bash
   # Use mock mode to test
   MOCK_FLICKR=true docker compose up worker_rest
   ```

---

## Database Issues

### MongoDB Connection Failed

**Symptoms**: "MongoServerError: connect ECONNREFUSED"

**Solutions**:

1. Check MongoDB container:

   ```bash
   docker compose ps mongo
   docker compose logs mongo
   ```

2. Test connection:

   ```bash
   mongosh mongodb://localhost:27019/flickrhub
   ```

3. Verify MONGO_URL:

   ```bash
   echo $MONGO_URL
   # Should be: mongodb://mongo:27017/flickrhub (inside Docker)
   # Or: mongodb://localhost:27019/flickrhub (from host)
   ```

4. Restart MongoDB:
   ```bash
   docker compose restart mongo
   ```

### Token Not Found

**Symptoms**: "ERR_TOKEN_NOT_FOUND" when calling API.

**Solutions**:

1. List tokens:

   ```bash
   npm run cli:tokens
   ```

2. Verify user_id is correct
3. Regenerate token:

   ```bash
   npm run cli:auth
   ```

4. Check MongoDB:
   ```bash
   mongosh mongodb://localhost:27019/flickrhub
   db.tokens.find()
   ```

---

## Cache Issues

### Redis Connection Failed

**Symptoms**: "Error: connect ECONNREFUSED" from Redis.

**Solutions**:

1. Check Redis container:

   ```bash
   docker compose ps redis
   docker compose logs redis
   ```

2. Test connection:

   ```bash
   redis-cli -h localhost -p 6380 ping
   ```

3. Verify REDIS_URL:

   ```bash
   echo $REDIS_URL
   # Should be: redis://redis:6379 (inside Docker)
   # Or: redis://localhost:6380 (from host)
   ```

4. Restart Redis:
   ```bash
   docker compose restart redis
   ```

### Cache Not Working

**Symptoms**: All requests hit Flickr API, no cache hits.

**Solutions**:

1. Verify cache is enabled:

   ```bash
   docker compose exec worker_rest env | grep CACHE_ENABLED
   # Should be: CACHE_ENABLED=true
   ```

2. Check Redis keys:

   ```bash
   redis-cli -h localhost -p 6380 KEYS "flickrhub:cache:*"
   ```

3. Check cache TTL:

   ```bash
   docker compose exec worker_rest env | grep CACHE_TTL
   ```

4. Clear cache if needed:
   ```bash
   redis-cli -h localhost -p 6380 FLUSHDB
   ```

---

## OAuth Issues

### OAuth Flow Fails

**Symptoms**: Cannot complete OAuth, verifier not accepted.

**Solutions**:

1. Verify API key and secret are correct
2. Check OAuth mode:

   ```bash
   echo $OAUTH_MODE
   # Should be: oob or callback
   ```

3. For OOB mode:
   - Make sure to copy entire verifier code
   - Check for extra spaces
   - Try regenerating token

4. For callback mode:
   - Verify CALLBACK_URL is set
   - Check callback URL is accessible
   - Verify OAuth mode is set to "callback"

### Token Expired

**Symptoms**: "invalid_token" errors from Flickr API.

**Solutions**:

1. Regenerate token:

   ```bash
   npm run cli:auth
   ```

2. Update user_id in API calls
3. Check token in MongoDB:
   ```bash
   mongosh mongodb://localhost:27019/flickrhub
   db.tokens.find({user_id: "your_user_id"})
   ```

---

## Queue Issues

### RabbitMQ Connection Failed

**Symptoms**: "Error: connect ECONNREFUSED" from RabbitMQ.

**Solutions**:

1. Check RabbitMQ container:

   ```bash
   docker compose ps rabbit
   docker compose logs rabbit
   ```

2. Verify RABBIT_URL:

   ```bash
   echo $RABBIT_URL
   # Should be: amqp://rabbit:5672 (inside Docker)
   ```

3. Test connection:

   ```bash
   docker compose exec api ping rabbit
   ```

4. Restart RabbitMQ:
   ```bash
   docker compose restart rabbit
   ```

### Queue Backup

**Symptoms**: Jobs piling up in queue, not processing fast enough.

**Solutions**:

1. Increase worker instances:

   ```env
   WORKER_REST_INSTANCES=10
   ```

2. Increase worker concurrency:

   ```env
   WORKER_REST_CONCURRENCY=5
   ```

3. Check worker logs for errors
4. Verify Flickr API is responding

---

## Observability Issues

### Logs Not Sending

**Symptoms**: No logs appearing in OBS service.

**Solutions**:

1. Check OBS configuration:

   ```bash
   docker compose exec worker_rest env | grep OBS
   ```

2. Enable debug mode:

   ```env
   OBS_DEBUG=true
   ```

3. Check OBS API is accessible:

   ```bash
   curl $OBS_API_URL
   ```

4. Verify OBS_API_KEY is correct

---

## Performance Issues

### Slow API Responses

**Symptoms**: API takes long time to respond.

**Solutions**:

1. Check API logs for slow operations
2. Verify database connections
3. Check Redis cache hit rate
4. Monitor queue depth

### High Memory Usage

**Symptoms**: Containers using too much memory.

**Solutions**:

1. Check memory usage:

   ```bash
   docker stats
   ```

2. Reduce worker instances if needed
3. Check for memory leaks in logs
4. Restart containers periodically

---

## Getting More Help

1. Check [Operations Guide](operations.md)
2. Review [Architecture Documentation](../02-architecture/README.md)
3. Check [Backlog](../06-product/backlog/active/) for known issues
4. Open an issue on GitHub

---

**Last Updated**: 2024-01-25
