import { connectQueue, publishToQueue } from '../services/queue.service.js';

const TEST_MESSAGES = [
  {
    userId: 'test-user-001',
    tenantId: 'default',
    riskScore: 0.12,
    riskLevel: 'LOW',
    breakdown: { requestsScore: 0.1, failureScore: 0.05, ipScore: 0.02, responseTimeScore: 0.05 },
    timestamp: Date.now()
  },
  {
    userId: 'test-user-002',
    tenantId: 'default',
    riskScore: 0.74,
    riskLevel: 'HIGH',
    breakdown: { requestsScore: 0.8, failureScore: 0.6, ipScore: 0.7, responseTimeScore: 0.8 },
    timestamp: Date.now()
  },
  {
    userId: 'test-user-003',
    tenantId: 'tenant-A',
    riskScore: 0.45,
    riskLevel: 'MEDIUM',
    breakdown: { requestsScore: 0.4, failureScore: 0.5, ipScore: 0.3, responseTimeScore: 0.6 },
    timestamp: Date.now()
  }
];

const run = async () => {
  console.log('\n[TEST] Connecting to RabbitMQ...');
  await connectQueue();

  console.log('\n[TEST] Publishing test messages to "ml.features" queue...\n');

  let passed = 0;
  for (const msg of TEST_MESSAGES) {
    const ok = publishToQueue(msg);
    const status = ok ? '✓ Published' : '✗ Failed';
    console.log(`  ${status} → userId=${msg.userId} | risk=${msg.riskScore} (${msg.riskLevel})`);
    if (ok) passed++;
  }

  console.log(`\n[TEST] Result: ${passed}/${TEST_MESSAGES.length} messages published successfully`);

  if (passed === TEST_MESSAGES.length) {
    console.log('[TEST] All messages published. Check the RabbitMQ dashboard:');
    console.log('       → http://localhost:15672  (guest / guest)');
    console.log('       → Queues → ml.features → "Ready" count should show 3\n');
  } else {
    console.log('[TEST] Some messages failed. Is RabbitMQ running? Try: docker ps\n');
  }

  setTimeout(() => process.exit(0), 500);
};

run();
