const formatSuccess = (request, data) => ({
  request_id: request.id,
  data,
  error: null,
});

const formatError = (request, code, message, details = null, statusCode = 400) => ({
  statusCode,
  body: {
    request_id: request.id,
    data: null,
    error: { code, message, details },
  },
});

module.exports = { formatSuccess, formatError };
