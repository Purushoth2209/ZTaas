import { connectQueue, publishToQueue } from '../services/queue.service.js';

// Covers all three label outcomes: normal, borderline, anomaly
const TEST_MESSAGES = [
  {
    requestId: 'test-req-001',
    userId:    'user-normal',
    tenantId:  'default',
    timestamp: Date.now(),
    features: {
      requestsPerMin:  8,
      failureRate:     0.03,
      uniqueIPs:       1,
      avgResponseTime: 180
    }
  },
  {
    requestId: 'test-req-002',
    userId:    'user-borderline',
    tenantId:  'default',
    timestamp: Date.now(),
    features: {
      requestsPerMin:  35,
      failureRate:     0.35,
      uniqueIPs:       6,
      avgResponseTime: 900
    }
  },
  {
    requestId: 'test-req-003',
    userId:    'user-anomaly',
    tenantId:  'tenant-A',
    timestamp: Date.now(),
    features: {
      requestsPerMin:  95,
      failureRate:     0.88,
      uniqueIPs:       18,
      avgResponseTime: 5500
    }
  }
];

const run = async () => {
  console.log('\n[TEST] Connecting to RabbitMQ...');
  await connectQueue();

  console.log('\n[TEST] Publishing feature messages to "ml.features" queue...\n');

  let passed = 0;
  for (const msg of TEST_MESSAGES) {
    const ok     = publishToQueue(msg);
    const status = ok ? '✓ Published' : '✗ Failed   ';
    const f      = msg.features;
    console.log(
      `  ${status} → userId=${msg.userId.padEnd(16)} ` +
      `req/min=${f.requestsPerMin}  failRate=${f.failureRate}  ` +
      `IPs=${f.uniqueIPs}  respTime=${f.avgResponseTime}ms`
    );
    if (ok) passed++;
  }

  console.log(`\n[TEST] Result: ${passed}/${TEST_MESSAGES.length} messages published`);
  console.log('\n[TEST] Now check:');
  console.log('  1. RabbitMQ dashboard → http://localhost:15672 (guest/guest)');
  console.log('     Queues → ml.features → message count should be 0 (consumed by ML service)');
  console.log('  2. ML service terminal → should show score + label per message');
  console.log('  3. MongoDB → run: mongosh "mongodb://localhost:27017/ZTaaS" --eval "db.risk_scores.find().sort({timestamp:-1}).limit(3).pretty()"');

  setTimeout(() => process.exit(0), 500);
};

run();
