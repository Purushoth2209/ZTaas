import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import TelemetryModel from '../models/telemetry.model.js';

const TENANT = 'default';
const NOW = Date.now();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const USERS = [
  // Normal users — steady low traffic, mostly 200s, single IP
  { username: 'alice',   role: 'admin',   category: 'normal' },
  { username: 'bob',     role: 'admin',   category: 'normal' },
  { username: 'carol',   role: 'analyst', category: 'normal' },
  { username: 'dave',    role: 'analyst', category: 'normal' },
  { username: 'frank',   role: 'user',    category: 'normal' },
  { username: 'grace',   role: 'user',    category: 'normal' },
  { username: 'henry',   role: 'user',    category: 'normal' },
  { username: 'iris',    role: 'user',    category: 'normal' },
  { username: 'jack',    role: 'user',    category: 'normal' },
  { username: 'karen',   role: 'user',    category: 'normal' },
  { username: 'leo',     role: 'user',    category: 'normal' },
  { username: 'mia',     role: 'user',    category: 'normal' },

  // Suspects — elevated failure rate, occasional IP switches, moderate volume
  { username: 'eve',     role: 'analyst', category: 'suspect' },
  { username: 'nathan',  role: 'user',    category: 'suspect' },
  { username: 'olivia',  role: 'user',    category: 'suspect' },
  { username: 'peter',   role: 'analyst', category: 'suspect' },
  { username: 'quinn',   role: 'user',    category: 'suspect' },

  // Attackers — high volume, high failure, many IPs, lots of write methods
  { username: 'ryan',    role: 'user',    category: 'attacker' },
  { username: 'sara',    role: 'user',    category: 'attacker' },
  { username: 'tom',     role: 'user',    category: 'attacker' },
  { username: 'uma',     role: 'analyst', category: 'attacker' },
  { username: 'victor',  role: 'user',    category: 'attacker' },
];

const ENDPOINTS = ['/api/users', '/api/orders', '/api/data', '/api/health', '/api/profile', '/api/admin'];
const WRITE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
const READ_METHODS  = ['GET'];

function buildProfile(category) {
  switch (category) {
    case 'normal':
      return {
        requestsPerWindow: randomInt(3, 8),
        ipPool: [`192.168.1.${randomInt(1, 5)}`],
        statusWeights: [200, 200, 200, 201, 201, 400, 404],  // small failure rate for std variance
        methodWeights: [...READ_METHODS, ...READ_METHODS, ...READ_METHODS, 'POST'],
        durationRange: [50, 400],
        authDenied: 0.03,
      };
    case 'suspect':
      return {
        requestsPerWindow: randomInt(10, 25),
        ipPool: Array.from({ length: 3 }, (_, i) => `10.0.${randomInt(0, 5)}.${randomInt(1, 50) + i}`),
        statusWeights: [200, 200, 400, 401, 403, 500],
        methodWeights: [...READ_METHODS, 'POST', 'PUT', 'DELETE'],
        durationRange: [100, 1500],
        authDenied: 0.15,
      };
    case 'attacker':
      return {
        requestsPerWindow: randomInt(150, 250),   // always well above baseline
        ipPool: Array.from({ length: 10 }, (_, i) => `172.16.${randomInt(0, 20)}.${randomInt(1, 254) + i}`),
        statusWeights: [200, 400, 401, 403, 404, 500, 500, 500],
        methodWeights: [...WRITE_METHODS, ...WRITE_METHODS, 'GET'],
        durationRange: [10, 5000],
        authDenied: 0.4,
      };
  }
}

function buildDocs(user, windowMins) {
  const profile = buildProfile(user.category);
  const docs = [];
  for (let min = 0; min < windowMins; min++) {
    for (let i = 0; i < profile.requestsPerWindow; i++) {
      const status = pick(profile.statusWeights);
      docs.push({
        requestId:           `req-${user.username}-${min}-${i}`,
        userId:              user.username,
        role:                user.role,
        tenantId:            TENANT,
        ipAddress:           pick(profile.ipPool),
        userAgent:           pick(['Mozilla/5.0', 'curl/7.68', 'python-requests/2.28', 'PostmanRuntime/7.32']),
        endpoint:            pick(ENDPOINTS),
        method:              pick(profile.methodWeights),
        timestamp:           NOW - (windowMins - min) * 60000 + randomInt(0, 59999),
        authorizationResult: Math.random() < profile.authDenied ? 'denied' : 'allowed',
        responseStatus:      status,
        requestDuration:     randomInt(...profile.durationRange),
      });
    }
  }
  return docs;
}

const seed = async () => {
  await connectDB();
  await TelemetryModel.deleteMany({ tenantId: TENANT });
  console.log('Cleared existing telemetry for tenant:', TENANT);

  const BaselineModel = (await import('../models/baseline.model.js')).default;
  await BaselineModel.deleteMany({ tenantId: TENANT });
  console.log('Cleared existing baselines for tenant:', TENANT);

  const RiskPolicyModel = (await import('../models/riskPolicy.model.js')).default;
  await RiskPolicyModel.deleteMany({ tenantId: TENANT });
  console.log('Cleared existing risk policies for tenant:', TENANT);

  const docs = [];

  // Step 1: seed normal users across 60 mins — this forms the baseline
  const normalUsers = USERS.filter(u => u.category === 'normal');
  for (const user of normalUsers) {
    const userDocs = buildDocs(user, 60);
    docs.push(...userDocs);
    console.log(`  [normal]   ${user.username} — ${userDocs.length} records (60 min)`);
  }

  await TelemetryModel.insertMany(docs);

  // Step 2: compute baseline from normal traffic only
  const { computeBaseline } = await import('../services/baseline.service.js');
  const baseline = await computeBaseline(TENANT, 60 * 60 * 1000);
  console.log(`\nBaseline computed → avgReq/min: ${baseline.avgRequestsPerMin?.toFixed(2)}, avgFailureRate: ${baseline.avgFailureRate?.toFixed(3)}`);

  // Step 3: seed suspects + attackers within last 9 mins (inside 10-min risk window)
  const anomalousUsers = USERS.filter(u => u.category !== 'normal');
  const anomalousDocs = [];
  for (const user of anomalousUsers) {
    const userDocs = buildDocs(user, 9);
    anomalousDocs.push(...userDocs);
    console.log(`  [${user.category.padEnd(8)}] ${user.username} — ${userDocs.length} records (9 min)`);
  }

  await TelemetryModel.insertMany(anomalousDocs);

  const total = docs.length + anomalousDocs.length;
  console.log(`\nTotal seeded: ${total} records for ${USERS.length} users`);
  await mongoose.disconnect();
};

seed().catch(console.error);
