import amqp from 'amqplib';
import { log } from '../utils/logger.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME   = 'ml.features';
const RETRY_DELAY  = 5000;
const MAX_RETRIES  = 10;

let channel    = null;
let connection = null;
let isConnecting = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectQueue = async (attempt = 1) => {
  if (channel) return;
  if (isConnecting) return;

  isConnecting = true;

  while (attempt <= MAX_RETRIES) {
    try {
      connection = await amqp.connect(RABBITMQ_URL);
      channel    = await connection.createChannel();

      await channel.assertQueue(QUEUE_NAME, { durable: true });

      connection.on('close', () => {
        log('[QUEUE] Connection closed — scheduling reconnect...');
        channel = null;
        connection = null;
        isConnecting = false;
        setTimeout(() => connectQueue(), RETRY_DELAY);
      });

      connection.on('error', (err) => {
        log(`[QUEUE] Connection error: ${err.message}`);
      });

      log(`[QUEUE] Connected to RabbitMQ — queue "${QUEUE_NAME}" ready`);
      isConnecting = false;
      return;
    } catch (err) {
      log(`[QUEUE] Connection attempt ${attempt}/${MAX_RETRIES} failed: ${err.message}`);

      if (attempt >= MAX_RETRIES) {
        log('[QUEUE] Max retries reached — RabbitMQ unavailable. Gateway continues without queue.');
        isConnecting = false;
        return;
      }

      await sleep(RETRY_DELAY);
      attempt++;
    }
  }
};

export const publishToQueue = (message) => {
  if (!channel) {
    log('[QUEUE] Publish skipped — channel not ready');
    return false;
  }

  try {
    const payload = Buffer.from(JSON.stringify(message));
    channel.sendToQueue(QUEUE_NAME, payload, { persistent: true });
    return true;
  } catch (err) {
    log(`[QUEUE] Publish failed: ${err.message}`);
    return false;
  }
};

export default { connectQueue, publishToQueue };
