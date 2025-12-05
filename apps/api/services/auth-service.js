const crypto = require('crypto');
const { FlickrClient } = require('../../../packages/flickr-client');
const { MockFlickrClient } = require('../../../packages/flickr-client/mock');
const { sendObservabilityLog } = require('../../../packages/logger/observability');

class AuthService {
  constructor({ tokenStore, redisClient, oauthMode, callbackUrl, mock = false }) {
    this.tokenStore = tokenStore;
    this.redisClient = redisClient;
    this.oauthMode = oauthMode || 'oob';
    this.callbackUrl = callbackUrl || null;
    this.mock = mock;
  }

  async start({ apiKey, apiSecret }) {
    const client = this.mock ? new MockFlickrClient({ apiKey, apiSecret }) : new FlickrClient({ apiKey, apiSecret });
    const cb = this.oauthMode === 'callback' && this.callbackUrl ? this.callbackUrl : 'oob';
    let requestTokens;
    try {
      requestTokens = await client.getRequestToken(cb);
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'auth_token_request_failed',
        message: `getRequestToken failed: ${err.message}`,
        context: { oauth_mode: cb },
        payload: { error: err.message, stack: err.stack },
        tags: ['auth', 'error', 'flickr_api'],
      }).catch(() => { });
      throw err;
    }
    const { oauth_token: oauthToken, oauth_token_secret: oauthTokenSecret } = requestTokens;
    const state = crypto.randomUUID();
    try {
      await this.redisClient.setex(
        `oauth:req:${oauthToken}`,
        600,
        JSON.stringify({
          oauth_token_secret: oauthTokenSecret,
          apiKey,
          apiSecret,
          state,
          callback: cb,
        })
      );
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'auth_redis_store_failed',
        message: `Redis storage failed for OAuth request token: ${err.message}`,
        context: { oauth_token: oauthToken },
        payload: { error: err.message, stack: err.stack },
        tags: ['auth', 'error', 'redis'],
      }).catch(() => { });
      throw err;
    }
    return {
      authorize_url: `https://www.flickr.com/services/oauth/authorize?oauth_token=${oauthToken}&perms=write`,
      oauth_token: oauthToken,
      state,
      mode: cb === 'oob' ? 'oob' : 'callback',
    };
  }

  async complete({ oauthToken, verifier }) {
    const raw = await this.redisClient.get(`oauth:req:${oauthToken}`);
    if (!raw) throw new Error('invalid_state_or_token');
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch (err) {
      throw new Error('invalid_state_or_token');
    }
    const { apiKey, apiSecret, oauth_token_secret: oauthTokenSecret } = stored;
    const client = this.mock ? new MockFlickrClient({ apiKey, apiSecret }) : new FlickrClient({ apiKey, apiSecret });
    let access;
    try {
      access = await client.getAccessToken({
        oauthToken,
        oauthTokenSecret,
        verifier,
      });
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'auth_token_access_failed',
        message: `getAccessToken failed: ${err.message}`,
        context: { oauth_token: oauthToken },
        payload: { error: err.message, stack: err.stack },
        tags: ['auth', 'error', 'flickr_api'],
      }).catch(() => { });
      throw err;
    }
    const userId = crypto.randomUUID();
    try {
      await this.tokenStore.put(userId, {
        api_key: apiKey,
        api_secret: apiSecret,
        oauth_token: access.oauth_token,
        oauth_token_secret: access.oauth_token_secret,
        user_nsid: access.user_nsid,
        username: access.username,
      });
    } catch (err) {
      await sendObservabilityLog({
        level: 'ERROR',
        kind: 'SYSTEM',
        event: 'auth_token_store_failed',
        message: `MongoDB token storage failed: ${err.message}`,
        context: { user_id: userId },
        payload: { error: err.message, stack: err.stack },
        tags: ['auth', 'error', 'mongodb'],
      }).catch(() => { });
      throw err;
    }
    await this.redisClient.del(`oauth:req:${oauthToken}`);
    return { user_id: userId };
  }
}

module.exports = { AuthService };
