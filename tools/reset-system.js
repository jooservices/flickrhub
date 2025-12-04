const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const path = require('path');
const fs = require('fs');

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
};

reset().catch((err) => {
    console.error(err);
    process.exit(1);
});
