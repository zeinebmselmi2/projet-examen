const { Kafka, logLevel } = require('kafkajs');

const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const CLIENT_ID = process.env.KAFKA_CLIENT_ID || 'smartreserve';

const kafka = new Kafka({
  clientId: CLIENT_ID,
  brokers: [KAFKA_BROKER],
  logLevel: logLevel.ERROR,
  retry: {
    initialRetryTime: 100,
    retries: 2,
  },
});

const TOPICS = {
  USER_REGISTERED: 'user.registered',
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
};

async function createProducer(clientId) {
  const producer = kafka.producer({ allowAutoTopicCreation: true });
  try {
    await producer.connect();
    return producer;
  } catch (err) {
    console.warn(`[Kafka] Connexion producteur impossible (${clientId}):`, err.message);
    return null;
  }
}

async function createConsumer(groupId, topics) {
  const consumer = kafka.consumer({ groupId, allowAutoTopicCreation: true });
  try {
    await consumer.connect();
    for (const topic of topics) {
      await consumer.subscribe({ topic, fromBeginning: false });
    }
    return consumer;
  } catch (err) {
    console.warn(`[Kafka] Connexion consommateur impossible (${groupId}):`, err.message);
    return null;
  }
}

async function sendEvent(producer, topic, key, payload) {
  if (!producer) return;
  try {
    await producer.send({
      topic,
      messages: [
        {
          key: key || null,
          value: JSON.stringify({
            ...payload,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  } catch (err) {
    console.warn(`[Kafka] Envoi événement ${topic} impossible:`, err.message);
  }
}

module.exports = {
  kafka,
  TOPICS,
  createProducer,
  createConsumer,
  sendEvent,
};
