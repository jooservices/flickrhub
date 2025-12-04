const crypto = require('crypto');
const { MongoClient, ObjectId } = require('mongodb');

class TokenStore {
  constructor({
    mongoUrl = process.env.MONGO_URL,
    dbName = process.env.MONGO_DB || 'flickrhub',
    collectionName = process.env.TOKEN_COLLECTION || 'tokens',
  } = {}) {
    this.mongoUrl = mongoUrl;
    this.dbName = dbName;
    this.collectionName = collectionName;
    this.memory = new Map();
    this.client = null;
    this.collection = null;
  }

  async close() {
    if (this.client) {
      await this.client.close().catch(() => {});
      this.client = null;
      this.collection = null;
    }
  }

  parseId(input) {
    if (!input) return new ObjectId();
    try {
      return new ObjectId(input);
    } catch (err) {
      return null;
    }
  }

  async _ensureConnection() {
    if (!this.mongoUrl) {
      throw new Error('MONGO_URL is required for TokenStore');
    }
    if (this.collection) return true;
    this.client = new MongoClient(this.mongoUrl);
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.collection = db.collection(this.collectionName);
    await this.collection.createIndex({ user_id: 1 }, { unique: true });
    return true;
  }

  async getByUserId(userId) {
    if (!userId) return null;
    const hasMongo = await this._ensureConnection();
    if (hasMongo) {
      const doc = await this.collection.findOne({ user_id: userId });
      return doc ? doc.token : null;
    }
    return this.memory.get(userId) || null;
  }

  async put(userId, token) {
    if (!token) throw new Error('token is required');
    const uid = userId && userId.trim().length ? userId.trim() : crypto.randomUUID();
    const objectId = this.parseId();
    const hasMongo = await this._ensureConnection();
    if (hasMongo) {
      await this.collection.updateOne(
        { user_id: uid },
        {
          $set: { token, user_id: uid, updatedAt: new Date() },
          $setOnInsert: { _id: objectId, createdAt: new Date() },
        },
        { upsert: true }
      );
      return uid;
    }
    this.memory.set(uid, token);
    return uid;
  }
}

module.exports = {
  TokenStore,
};
