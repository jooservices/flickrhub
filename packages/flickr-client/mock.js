class MockFlickrClient {
  constructor({ apiKey, apiSecret } = {}) {
    this.apiKey = apiKey || 'mock-key';
    this.apiSecret = apiSecret || 'mock-secret';
  }

  async getRequestToken(callback = 'oob') {
    return {
      oauth_token: 'mock_oauth_token',
      oauth_token_secret: 'mock_oauth_token_secret',
      oauth_callback_confirmed: 'true',
      callback,
    };
  }

  async getAccessToken() {
    return {
      oauth_token: 'mock_access_token',
      oauth_token_secret: 'mock_access_secret',
      user_nsid: 'mock_user_nsid',
      username: 'mock_user',
    };
  }

  async callRest(methodName) {
    return {
      stat: 'ok',
      method: methodName,
      mock: true,
    };
  }
}

module.exports = { MockFlickrClient };
