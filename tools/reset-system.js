const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const path = require('path');
const fs = require('fs');
const { sendObservabilityLog } = require('../packages/logger/observability');

// Load env
const loadEnvFile = (filePath) => {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const [key, ...rest] = trimmed.split('=');
        if (!key) return;
        const value = rest.join('=');
        if (!process.env[key]) process.env[key] = value;
    });
};
loadEnvFile(path.join(process.cwd(), '.env'));

const mongoUrl = process.env.MONGO_URL;
const dbName = process.env.MONGO_DB || 'flickrhub';
const redisUrl = process.env.REDIS_URL;

const reset = async () => {
    if (process.argv[2] !== '--force') {
        console.log('⚠️  WARNING: This will WIPE ALL DATA from Mongo and Redis.');
        console.log('Use --force to skip delay.');
        console.log('Starting in 5 seconds...');
        await new Promise((r) => setTimeout(r, 5000));
    }

    await sendObservabilityLog({
        level: 'WARN',
        kind: 'SYSTEM',
        event: 'reset_system_start',
        message: 'System reset starting',
        context: { mongo_url: mongoUrl, redis_url: redisUrl },
        tags: ['tool', 'reset'],
    }).catch(() => { });

    console.log('Resetting MongoDB...');
    const client = new MongoClient(mongoUrl);
    await client.connect();
    const db = client.db(dbName);
    await db.dropDatabase();
    await client.close();
    console.log('MongoDB reset.');

    console.log('Resetting Redis...');
    const redis = new Redis(redisUrl);
    await redis.flushall();
    await redis.quit();
    console.log('Redis reset.');

    console.log('✅ System reset complete.');

    await sendObservabilityLog({
        level: 'INFO',
        kind: 'SYSTEM',
        event: 'reset_system_complete',
        message: 'System reset completed',
        context: { mongo_url: mongoUrl, redis_url: redisUrl },
        tags: ['tool', 'reset', 'success'],
    }).catch(() => { });
};

reset().catch((err) => {
    console.error(err);
    sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'reset_system_failure',
        message: err.message || String(err),
        context: { mongo_url: mongoUrl, redis_url: redisUrl },
        payload: { error: err.message || String(err), stack: err.stack ? err.stack.substring(0, 1000) : null },
        tags: ['tool', 'reset', 'failure'],
    }).catch(() => { }).finally(() => process.exit(1));
});
