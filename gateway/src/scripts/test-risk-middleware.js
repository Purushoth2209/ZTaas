import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import TelemetryModel from '../models/telemetry.model.js';
import BaselineModel from '../models/baseline.model.js';
import { computeBaseline } from '../services/baseline.service.js';
import { calculateRisk } from '../services/risk.service.js';

const TENANT = 'default';
const NOW = Date.now();
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const run = async () => {
  await connectDB();

  // Clean
  await TelemetryModel.deleteMany({ tenantId: TENANT });
  await BaselineModel.deleteMany({ tenantId: TENANT });

  const docs = [];

  // --- Normal background traffic (past 60 min) to build baseline ---
  for (let min = 0; min < 60; min++) {
    const count = rand(5, 12);
    for (let i = 0; i < count; i++) {
      docs.push({
        requestId: `bg-${min}-${i}`,
        userId: pick(['normal-user-1', 'normal-user-2', 'normal-user-3']),
        role: 'user',
        tenantId: TENANT,
        ipAddress: `10.0.0.${rand(1, 3)}`,
        userAgent: 'normal-agent',
        endpoint: pick(['/api/data', '/api/users']),
        method: 'GET',
        timestamp: NOW - (60 - min) * 60000 + rand(0, 59999),
        authorizationResult: 'allowed',
        responseStatus: 200,
        requestDuration: rand(50, 200)
      });
    }
  }

  // --- LOW risk user: "safe-user" — minimal recent activity ---
  for (let i = 0; i < 3; i++) {
    docs.push({
      requestId: `safe-${i}`,
      userId: 'safe-user',
      role: 'user',
      tenantId: TENANT,
      ipAddress: '10.0.0.1',
      userAgent: 'normal-agent',
      endpoint: '/api/data',
      method: 'GET',
      timestamp: NOW - rand(0, 59999),
      authorizationResult: 'allowed',
      responseStatus: 200,
      requestDuration: rand(50, 150)
    });
  }

  // --- MEDIUM risk user: "suspect-user" — moderately elevated activity ---
  for (let i = 0; i < 40; i++) {
    docs.push({
      requestId: `suspect-${i}`,
      userId: 'suspect-user',
      role: 'user',
      tenantId: TENANT,
      ipAddress: `192.168.${rand(1, 10)}.${rand(1, 50)}`,
      userAgent: pick(['agent-a', 'agent-b']),
      endpoint: pick(['/api/data', '/api/users', '/api/admin']),
      method: pick(['GET', 'GET', 'POST', 'DELETE']),
      timestamp: NOW - rand(0, 59999),
      authorizationResult: pick(['allowed', 'allowed', 'denied']),
      responseStatus: pick([200, 200, 200, 400, 403]),
      requestDuration: rand(300, 2000)
    });
  }

  // --- HIGH risk user: "attacker" — extreme anomalous activity ---
  for (let i = 0; i < 120; i++) {
    docs.push({
      requestId: `attack-${i}`,
      userId: 'attacker',
      role: 'user',
      tenantId: TENANT,
      ipAddress: `192.168.${rand(1, 50)}.${rand(1, 254)}`,
      userAgent: pick(['bot-agent', 'curl/7.0', 'scanner-v2', 'exploit-kit']),
      endpoint: pick(['/api/admin', '/api/secrets', '/api/config']),
      method: pick(['POST', 'DELETE', 'PUT', 'PATCH']),
      timestamp: NOW - rand(0, 59999),
      authorizationResult: 'denied',
      responseStatus: pick([400, 401, 403, 500]),
      requestDuration: rand(2000, 8000)
    });
  }

  await TelemetryModel.insertMany(docs);
  console.log(`\n✅ Seeded ${docs.length} telemetry docs\n`);

  // Compute baseline from background traffic
  const baseline = await computeBaseline(TENANT, 3600000);
  console.log('✅ Baseline computed:', JSON.stringify(baseline.toObject(), null, 2));

  // --- Test all three risk levels ---
  console.log('\n========== RISK EVALUATION ==========\n');

  const testUsers = ['safe-user', 'suspect-user', 'attacker'];

  for (const userId of testUsers) {
    const risk = await calculateRisk(userId, TENANT);
    const action = risk.riskScore >= 0.8 ? 'BLOCK (403)'
      : risk.riskScore >= 0.5 ? 'STEP-UP (401)'
      : 'ALLOW (next)';

    console.log(`User: ${userId}`);
    console.log(`  Score:     ${risk.riskScore}`);
    console.log(`  Level:     ${risk.riskLevel}`);
    console.log(`  Action:    ${action}`);
    console.log(`  Breakdown: ${JSON.stringify(risk.breakdown)}`);
    console.log();
  }

  console.log('========== TEST COMPLETE ==========\n');
  console.log('To test via HTTP (start the gateway first):');
  console.log('  1. Get a token:  curl -X POST http://localhost:8081/auth/admin/login -H "Content-Type: application/json" -d \'{"username":"admin","password":"admin"}\'');
  console.log('  2. Hit a route:  curl -H "Authorization: Bearer <token>" http://localhost:8081/api/data');
  console.log();

  await mongoose.disconnect();
};

run().catch(console.error);
