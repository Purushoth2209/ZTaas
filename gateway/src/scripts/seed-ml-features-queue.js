/**
 * Simulates many gateway "risk feature" publishes by enqueueing ml.features messages.
 * Run with ML consumer + RabbitMQ so documents land in MongoDB ZTaaS.risk_scores.
 *
 * Usage:
 *   node src/scripts/seed-ml-features-queue.js [count]
 *   COUNT=5000 node src/scripts/seed-ml-features-queue.js
 *
 * Env: RABBITMQ_URL (optional), MONGO_URI not needed here.
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { connectQueue, publishToQueue } from '../services/queue.service.js';

const DEFAULT_COUNT = Number(process.env.COUNT) || 2500;
const TENANTS = ['default', 'default', 'default', 'tenant-A', 'tenant-B'];

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function randFloat(min, max) {
  return min + Math.random() * (max - min);
}

/** Pools so the same synthetic users appear repeatedly (more realistic). */
const POOLS = {
  normal: Array.from({ length: 45 }, (_, i) => `user-normal-${i}`),
  power: Array.from({ length: 20 }, (_, i) => `user-power-${i}`),
  suspect: Array.from({ length: 25 }, (_, i) => `user-suspect-${i}`),
  attacker: Array.from({ length: 18 }, (_, i) => `user-attacker-${i}`),
  bot: Array.from({ length: 12 }, (_, i) => `svc-bot-${i}`)
};

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

/**
 * Weighted persona → feature vector ranges mimicking traffic classes.
 * cumulative weights: normal 52%, power 18%, suspect 15%, attacker 10%, bot 5%
 */
function samplePersona() {
  const r = Math.random();
  if (r < 0.52) return 'normal';
  if (r < 0.7) return 'power';
  if (r < 0.85) return 'suspect';
  if (r < 0.95) return 'attacker';
  return 'bot';
}

function featuresForPersona(persona) {
  switch (persona) {
    case 'normal':
      return {
        requestsPerMin: randFloat(4, 22),
        failureRate: randFloat(0.01, 0.1),
        uniqueIPs: randInt(1, 3),
        avgResponseTime: randFloat(100, 320)
      };
    case 'power':
      return {
        requestsPerMin: randFloat(22, 48),
        failureRate: randFloat(0.04, 0.14),
        uniqueIPs: randInt(2, 5),
        avgResponseTime: randFloat(180, 520)
      };
    case 'suspect':
      return {
        requestsPerMin: randFloat(35, 85),
        failureRate: randFloat(0.18, 0.48),
        uniqueIPs: randInt(4, 11),
        avgResponseTime: randFloat(450, 2200)
      };
    case 'attacker':
      return {
        requestsPerMin: randFloat(90, 220),
        failureRate: randFloat(0.55, 0.95),
        uniqueIPs: randInt(14, 40),
        avgResponseTime: randFloat(2500, 9000)
      };
    case 'bot':
      return {
        requestsPerMin: randFloat(120, 400),
        failureRate: randFloat(0.02, 0.12),
        uniqueIPs: randInt(1, 4),
        avgResponseTime: randFloat(40, 180)
      };
    default:
      return featuresForPersona('normal');
  }
}

function userIdForPersona(persona) {
  return pick(POOLS[persona] || POOLS.normal);
}

/** Spread timestamps over the last ~14 days (newest-heavy bias optional). */
function randomPastTimestampMs() {
  const windowMs = 14 * 24 * 60 * 60 * 1000;
  const skew = Math.pow(Math.random(), 1.4);
  return Date.now() - Math.floor(skew * windowMs);
}

function buildMessage() {
  const persona = samplePersona();
  const f = featuresForPersona(persona);
  return {
    requestId: randomUUID(),
    userId: userIdForPersona(persona),
    tenantId: pick(TENANTS),
    timestamp: randomPastTimestampMs(),
    features: {
      requestsPerMin: +f.requestsPerMin.toFixed(3),
      failureRate: +f.failureRate.toFixed(4),
      uniqueIPs: f.uniqueIPs,
      avgResponseTime: +f.avgResponseTime.toFixed(2)
    },
    _seedPersona: persona
  };
}

const run = async () => {
  const count = Math.max(1, parseInt(process.argv[2], 10) || DEFAULT_COUNT);

  console.log(`\n[SEED] Target messages: ${count}`);
  console.log('[SEED] Connecting to RabbitMQ...');
  await connectQueue();

  let published = 0;
  let failed = 0;
  const personaCounts = {};

  const t0 = Date.now();
  for (let i = 0; i < count; i++) {
    const msg = buildMessage();
    const persona = msg._seedPersona;
    delete msg._seedPersona;

    personaCounts[persona] = (personaCounts[persona] || 0) + 1;

    if (publishToQueue(msg)) published++;
    else failed++;

    if ((i + 1) % 500 === 0) {
      console.log(`[SEED] … ${i + 1}/${count} enqueued`);
    }
  }

  const ms = Date.now() - t0;
  console.log('\n[SEED] Done.');
  console.log(`  Published: ${published}  Failed: ${failed}  (${ms} ms)`);
  console.log('  Persona mix:', personaCounts);
  console.log('\n[SEED] Ensure ML consumer is running — rows appear in ZTaaS.risk_scores.');
  console.log('  Verify: mongosh mongodb://localhost:27017/ZTaaS --eval "db.risk_scores.countDocuments()"');

  setTimeout(() => process.exit(failed > 0 ? 1 : 0), 400);
};

run().catch((err) => {
  console.error('[SEED] Fatal:', err);
  process.exit(1);
});
