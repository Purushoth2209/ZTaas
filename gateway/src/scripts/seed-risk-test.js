import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import TelemetryModel from '../models/telemetry.model.js';
import BaselineModel from '../models/baseline.model.js';
import { computeBaseline } from '../services/baseline.service.js';

const TENANT = 'default';
const NOW = Date.now();
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const run = async () => {
  await connectDB();

  // Clean old data for this tenant
  await TelemetryModel.deleteMany({ tenantId: TENANT });
  await BaselineModel.deleteMany({ tenantId: TENANT });

  const docs = [];

  // --- Normal traffic: 60 minutes, ~5-12 req/min from multiple users ---
  for (let min = 0; min < 60; min++) {
    const count = rand(5, 12);
    for (let i = 0; i < count; i++) {
      docs.push({
        requestId: `norm-${min}-${i}`,
        userId: pick(['bob', 'charlie', 'dave', 'alice']),
        role: 'user',
        tenantId: TENANT,
        ipAddress: `10.0.0.${rand(1, 5)}`,
        userAgent: 'normal-agent',
        endpoint: pick(['/api/data', '/api/users', '/api/health']),
        method: pick(['GET', 'GET', 'GET', 'POST']),
        timestamp: NOW - (60 - min) * 60000 + rand(0, 59999),
        authorizationResult: 'allowed',
        responseStatus: pick([200, 200, 200, 200, 201]),
        requestDuration: rand(50, 300)
      });
    }
  }

  // --- Normal recent traffic: bob in the LAST 60 seconds ---
  // Slightly above average but within baseline — should score LOW
  for (let i = 0; i < 12; i++) {
    docs.push({
      requestId: `bob-recent-${i}`,
      userId: 'bob',
      role: 'user',
      tenantId: TENANT,
      ipAddress: `10.0.0.${rand(1, 3)}`,
      userAgent: 'normal-agent',
      endpoint: pick(['/api/data', '/api/users', '/api/health']),
      method: pick(['GET', 'GET', 'GET', 'POST']),
      timestamp: NOW - rand(0, 59999),
      authorizationResult: 'allowed',
      responseStatus: pick([200, 200, 200, 200, 201, 400]),
      requestDuration: rand(100, 400)
    });
  }

  // --- Anomalous traffic: alice in the LAST 60 seconds ---
  // High request rate, many failures, multiple IPs, slow responses
  for (let i = 0; i < 80; i++) {
    docs.push({
      requestId: `anomaly-${i}`,
      userId: 'alice',
      role: 'user',
      tenantId: TENANT,
      ipAddress: `192.168.${rand(1, 30)}.${rand(1, 254)}`,
      userAgent: pick(['bot-agent', 'curl/7.0', 'scanner-v2']),
      endpoint: pick(['/api/admin', '/api/secrets', '/api/data']),
      method: pick(['POST', 'DELETE', 'PUT', 'PATCH']),
      timestamp: NOW - rand(0, 59999),
      authorizationResult: pick(['allowed', 'denied', 'denied']),
      responseStatus: pick([200, 400, 401, 403, 500, 500]),
      requestDuration: rand(800, 5000)
    });
  }

  await TelemetryModel.insertMany(docs);
  console.log(`Seeded ${docs.length} docs (normal + anomalous) for tenant "${TENANT}"`);

  // Compute baseline from the normal traffic
  const baseline = await computeBaseline(TENANT, 3600000);
  console.log('Baseline computed:', JSON.stringify(baseline.toObject(), null, 2));

  await mongoose.disconnect();
  console.log('\nDone! Now test with:');
  console.log('  curl "http://localhost:8081/admin/risk/alice?tenantId=default" -H "Authorization: Bearer <token>"');
};

run().catch(console.error);
