const crypto = require('crypto');
const { FlickrClient } = require('../../../packages/flickr-client');
const { MockFlickrClient } = require('../../../packages/flickr-client/mock');

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
    const requestTokens = await client.getRequestToken(cb);
    const { oauth_token: oauthToken, oauth_token_secret: oauthTokenSecret } = requestTokens;
    const state = crypto.randomUUID();
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
    const access = await client.getAccessToken({
      oauthToken,
      oauthTokenSecret,
      verifier,
    });
    const userId = crypto.randomUUID();
    await this.tokenStore.put(userId, {
      api_key: apiKey,
      api_secret: apiSecret,
      oauth_token: access.oauth_token,
      oauth_token_secret: access.oauth_token_secret,
      user_nsid: access.user_nsid,
      username: access.username,
    });
    await this.redisClient.del(`oauth:req:${oauthToken}`);
    return { user_id: userId };
  }
}

module.exports = { AuthService };
