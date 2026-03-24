import 'dotenv/config';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { connectDB } from '../config/db.js';
import TelemetryModel from '../models/telemetry.model.js';
import BaselineModel from '../models/baseline.model.js';
import { computeBaseline } from '../services/baseline.service.js';
import { keyManager } from '../utils/keyManager.js';

const TENANT = 'default';
const PORT = 8081;
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const run = async () => {
  await connectDB();
  await TelemetryModel.deleteMany({ tenantId: TENANT });
  await BaselineModel.deleteMany({ tenantId: TENANT });

  const NOW = Date.now();
  const docs = [];

  // Background normal traffic (past 60 min) for baseline
  for (let min = 0; min < 60; min++) {
    const count = rand(5, 12);
    for (let i = 0; i < count; i++) {
      docs.push({
        requestId: `bg-${min}-${i}`, userId: pick(['normal-1', 'normal-2', 'normal-3']),
        role: 'user', tenantId: TENANT, ipAddress: `10.0.0.${rand(1, 3)}`,
        userAgent: 'normal-agent', endpoint: pick(['/api/data', '/api/users']),
        method: 'GET', timestamp: NOW - (60 - min) * 60000 + rand(0, 59999),
        authorizationResult: 'allowed', responseStatus: 200, requestDuration: rand(50, 200)
      });
    }
  }

  // Safe user — minimal recent activity (within last 30s to avoid expiry)
  for (let i = 0; i < 3; i++) {
    docs.push({
      requestId: `safe-${i}`, userId: 'safe-user', role: 'user', tenantId: TENANT,
      ipAddress: '10.0.0.1', userAgent: 'normal-agent', endpoint: '/api/data',
      method: 'GET', timestamp: NOW - rand(0, 30000),
      authorizationResult: 'allowed', responseStatus: 200, requestDuration: rand(50, 150)
    });
  }

  // Suspect user — moderate anomaly (within last 30s)
  for (let i = 0; i < 40; i++) {
    docs.push({
      requestId: `suspect-${i}`, userId: 'suspect-user', role: 'user', tenantId: TENANT,
      ipAddress: `192.168.${rand(1, 10)}.${rand(1, 50)}`, userAgent: pick(['agent-a', 'agent-b']),
      endpoint: pick(['/api/data', '/api/users', '/api/admin']),
      method: pick(['GET', 'GET', 'POST', 'DELETE']),
      timestamp: NOW - rand(0, 30000),
      authorizationResult: pick(['allowed', 'allowed', 'denied']),
      responseStatus: pick([200, 200, 200, 400, 403]),
      requestDuration: rand(300, 2000)
    });
  }

  // Attacker — extreme anomaly (within last 30s)
  for (let i = 0; i < 120; i++) {
    docs.push({
      requestId: `attack-${i}`, userId: 'attacker', role: 'user', tenantId: TENANT,
      ipAddress: `192.168.${rand(1, 50)}.${rand(1, 254)}`,
      userAgent: pick(['bot-agent', 'curl/7.0', 'scanner-v2', 'exploit-kit']),
      endpoint: pick(['/api/admin', '/api/secrets', '/api/config']),
      method: pick(['POST', 'DELETE', 'PUT', 'PATCH']),
      timestamp: NOW - rand(0, 30000),
      authorizationResult: 'denied',
      responseStatus: pick([400, 401, 403, 500]),
      requestDuration: rand(2000, 8000)
    });
  }

  await TelemetryModel.insertMany(docs);
  await computeBaseline(TENANT, 3600000);
  console.log(`Seeded ${docs.length} docs + baseline\n`);

  // Generate tokens
  const pk = keyManager.getPrivateKey();
  const kid = keyManager.getCurrentKey().kid;
  const makeToken = (username) => jwt.sign(
    { sub: username, username, role: 'user', tenant: 'default' },
    pk, { algorithm: 'RS256', issuer: 'https://gateway.internal', audience: 'api-gateway', expiresIn: '1h', keyid: kid }
  );

  // Test via HTTP
  const users = ['safe-user', 'suspect-user', 'attacker'];
  for (const user of users) {
    const token = makeToken(user);
    try {
      const res = await fetch(`http://localhost:${PORT}/api/data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const body = await res.text();
      let parsed;
      try { parsed = JSON.parse(body); } catch { parsed = body.substring(0, 80); }
      console.log(`${user}: STATUS=${res.status} BODY=${JSON.stringify(parsed)}`);
    } catch (err) {
      console.log(`${user}: ERROR=${err.message}`);
    }
  }

  await mongoose.disconnect();
};

run().catch(console.error);
