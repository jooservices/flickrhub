const crypto = require('crypto');

const REQUEST_TOKEN_URL = 'https://www.flickr.com/services/oauth/request_token';
const ACCESS_TOKEN_URL = 'https://www.flickr.com/services/oauth/access_token';
const REST_ENDPOINT = 'https://api.flickr.com/services/rest';

const percentEncode = (value) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

const buildNonce = (length = 32) => crypto.randomBytes(length).toString('hex');

const parseQueryString = (input) =>
  input
    .trim()
    .split('&')
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, ...rest] = pair.split('=');
      acc[decodeURIComponent(key)] = decodeURIComponent(rest.join('='));
      return acc;
    }, {});

class FlickrClient {
  constructor({ apiKey, apiSecret, fetchImpl } = {}) {
    if (!apiKey || !apiSecret) {
      throw new Error('FlickrClient requires apiKey and apiSecret');
    }
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.fetch = fetchImpl || global.fetch;
    if (!this.fetch) {
      throw new Error('Fetch implementation is required (Node 18+ has global fetch)');
    }
  }

  async getRequestToken(callback = 'oob') {
    const oauthParams = this._buildOAuthParams({ oauth_callback: callback });
    return this._postForTokens(REQUEST_TOKEN_URL, oauthParams);
  }

  async getAccessToken({ oauthToken, oauthTokenSecret, verifier }) {
    if (!oauthToken || !oauthTokenSecret || !verifier) {
      throw new Error('oauthToken, oauthTokenSecret, and verifier are required');
    }
    const oauthParams = this._buildOAuthParams({
      oauth_token: oauthToken,
      oauth_verifier: verifier,
    });
    return this._postForTokens(ACCESS_TOKEN_URL, oauthParams, oauthTokenSecret);
  }

  async callRest(methodName, params = {}, accessToken, accessSecret) {
    if (!methodName) throw new Error('methodName is required');
    if (!accessToken || !accessSecret) {
      throw new Error('accessToken and accessSecret are required to call the REST API');
    }

    const queryParams = {
      method: methodName,
      format: 'json',
      nojsoncallback: '1',
      ...params,
    };

    const oauthParams = this._buildOAuthParams({
      oauth_token: accessToken,
    });

    const allParams = { ...queryParams, ...oauthParams };
    const signature = this._signRequest('GET', REST_ENDPOINT, allParams, accessSecret);
    const authHeader = this._buildAuthHeader({ ...oauthParams, oauth_signature: signature });

    const url = `${REST_ENDPOINT}?${new URLSearchParams(queryParams).toString()}`;
    const response = await this.fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`REST call failed (${response.status}): ${body}`);
    }

    try {
      return JSON.parse(body);
    } catch (error) {
      return body;
    }
  }

  _postForTokens(url, oauthParams, tokenSecret = '') {
    const signature = this._signRequest('POST', url, oauthParams, tokenSecret);
    const authHeader = this._buildAuthHeader({
      ...oauthParams,
      oauth_signature: signature,
    });

    return this.fetch(url, {
      method: 'POST',
      headers: { Authorization: authHeader },
    }).then(async (response) => {
      const body = await response.text();
      if (!response.ok) {
        throw new Error(`OAuth request failed (${response.status}): ${body}`);
      }
      return parseQueryString(body);
    });
  }

  _buildOAuthParams(extra = {}) {
    const base = {
      oauth_consumer_key: this.apiKey,
      oauth_nonce: buildNonce(8),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
    };
    return Object.fromEntries(Object.entries({ ...base, ...extra }).filter(([, value]) => value !== undefined));
  }

  _signRequest(method, url, params, tokenSecret = '') {
    const baseUrl = this._baseUrl(url);
    const encodedParams = Object.keys(params)
      .sort()
      .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
      .join('&');

    const signatureBase = [method.toUpperCase(), percentEncode(baseUrl), percentEncode(encodedParams)].join('&');

    const signingKey = `${percentEncode(this.apiSecret)}&${percentEncode(tokenSecret)}`;
    return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
  }

  _buildAuthHeader(params) {
    const headerParams = Object.keys(params)
      .sort()
      .map((key) => `${percentEncode(key)}="${percentEncode(params[key])}"`)
      .join(', ');
    return `OAuth ${headerParams}`;
  }

  _baseUrl(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch (error) {
      return url.split('?')[0];
    }
  }
}

module.exports = {
  FlickrClient,
  percentEncode,
};
