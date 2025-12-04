const amqp = require('amqplib');

const connectRabbit = async (url) => {
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();
  return { connection, channel };
};

module.exports = { connectRabbit };
