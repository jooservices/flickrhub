const { MongoClient } = require('mongodb');
const { sendObservabilityLog } = require('../logger/observability');

class JobStore {
  constructor({
    mongoUrl = process.env.MONGO_URL,
    dbName = process.env.MONGO_DB || 'flickrhub',
    collectionName = process.env.JOB_COLLECTION || 'jobs',
    ttlCompleteDays = Number(process.env.JOB_TTL_COMPLETE_DAYS || 0),
    ttlFailDays = Number(process.env.JOB_TTL_FAIL_DAYS || 0),
  } = {}) {
    this.mongoUrl = mongoUrl;
    this.dbName = dbName;
    this.collectionName = collectionName;
    this.ttlCompleteDays = ttlCompleteDays;
    this.ttlFailDays = ttlFailDays;
    this.client = null;
    this.collection = null;
  }

  async close() {
    if (this.client) {
      await this.client.close().catch(() => { });
      this.client = null;
      this.collection = null;
    }
  }

  async _ensureConnection() {
    if (!this.mongoUrl) {
      throw new Error('MONGO_URL is required for JobStore');
    }
    if (this.collection) return true;
    try {
      this.client = new MongoClient(this.mongoUrl);
      await this.client.connect();
      const db = this.client.db(this.dbName);
      this.collection = db.collection(this.collectionName);
      const indexes = await this.collection.indexes().catch(() => []);
      const legacyJobIdIndex = indexes.find((idx) => idx.name === 'job_id_1' || (idx.key && idx.key.job_id));
      if (legacyJobIdIndex) {
        await this.collection.dropIndex(legacyJobIdIndex.name).catch(() => { });
      }
      await this.collection.createIndex({ jobId: 1 }, { unique: true, name: 'jobId_1' });
      await this.collection.createIndex({ user_id: 1 }, { name: 'user_id_1' });
      await this.collection.createIndex({ state: 1 }, { name: 'state_1' });
      await this.collection.createIndex({ createdAt: 1 }, { name: 'createdAt_1' });
      await this.collection.createIndex({ method: 1 }, { name: 'method_1' });
      if (this.ttlCompleteDays > 0) {
        await this.collection.createIndex(
          { completedAt: 1 },
          { expireAfterSeconds: this.ttlCompleteDays * 24 * 60 * 60 }
        );
      }
      if (this.ttlFailDays > 0) {
        await this.collection.createIndex({ failedAt: 1 }, { expireAfterSeconds: this.ttlFailDays * 24 * 60 * 60 });
      }
      return true;
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'job_store_connection_error',
        message: `MongoDB connection failed for JobStore: ${err.message}`,
        context: { mongo_url: this.mongoUrl, db_name: this.dbName },
        payload: { error: err.message, stack: err.stack },
        tags: ['job_store', 'error', 'mongodb'],
      }).catch(() => { });
      throw err;
    }
  }

  async save(jobId, payload) {
    if (!jobId) throw new Error('jobId is required');
    await this._ensureConnection();
    const userId = payload?.userId || payload?.user_id || null;
    await this.collection.updateOne(
      { jobId },
      {
        $set: {
          jobId,
          user_id: userId,
          ...payload,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
  }

  async initJob({ jobId, userId, method, params, target, callbackUrl, callbackSecret, queue, meta, requestMeta }) {
    try {
      await this._ensureConnection();
      const doc = {
        jobId,
        user_id: userId,
        method,
        params,
        target,
        queue,
        callbackUrl,
        callbackSecret,
        state: 'queued',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      if (meta !== undefined) doc.meta = meta;
      if (requestMeta !== undefined) doc.requestMeta = requestMeta;
      await this.collection.updateOne({ jobId }, { $set: doc }, { upsert: true });
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'job_store_init_error',
        message: `Job initialization failed for ${jobId}: ${err.message}`,
        context: { job_id: jobId, user_id: userId },
        payload: { error: err.message, stack: err.stack },
        tags: ['job_store', 'error', 'init'],
      }).catch(() => { });
      throw err;
    }
  }

  async updateJob(jobId, patch) {
    try {
      await this._ensureConnection();
      await this.collection.updateOne({ jobId }, { $set: { ...patch, updatedAt: new Date() } });
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'job_store_update_error',
        message: `Job update failed for ${jobId}: ${err.message}`,
        context: { job_id: jobId },
        payload: { error: err.message, stack: err.stack },
        tags: ['job_store', 'error', 'update'],
      }).catch(() => { });
      throw err;
    }
  }

  async get(jobId) {
    await this._ensureConnection();
    return this.collection.findOne({ jobId });
  }
}

module.exports = {
  JobStore,
};
