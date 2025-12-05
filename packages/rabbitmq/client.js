const amqp = require('amqplib');
const { sendObservabilityLog } = require('../logger/observability');

const connectRabbit = async (url) => {
  let connection;
  try {
    connection = await amqp.connect(url);
  } catch (err) {
    await sendObservabilityLog({
      level: 'ERROR',
      kind: 'SYSTEM',
      event: 'rabbitmq_connection_error',
      message: `RabbitMQ connection failed: ${err.message}`,
      context: { rabbit_url: url },
      payload: { error: err.message, stack: err.stack },
      tags: ['rabbitmq', 'error', 'connection'],
    }).catch(() => { });
    throw err;
  }

  let channel;
  try {
    channel = await connection.createChannel();
  } catch (err) {
    await sendObservabilityLog({
      level: 'ERROR',
      kind: 'SYSTEM',
      event: 'rabbitmq_channel_error',
      message: `RabbitMQ channel creation failed: ${err.message}`,
      context: { rabbit_url: url },
      payload: { error: err.message, stack: err.stack },
      tags: ['rabbitmq', 'error', 'channel'],
    }).catch(() => { });
    await connection.close().catch(() => { });
    throw err;
  }

  return { connection, channel };
};

module.exports = { connectRabbit };
