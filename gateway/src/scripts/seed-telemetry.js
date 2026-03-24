import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import TelemetryModel from '../models/telemetry.model.js';

const TENANT = 'tenant-test-1';
const NOW = Date.now();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

const seed = async () => {
  await connectDB();

  await TelemetryModel.deleteMany({ tenantId: TENANT });

  const docs = [];
  // 60 minutes of data, ~5-15 requests per minute
  for (let min = 0; min < 60; min++) {
    const count = randomInt(5, 15);
    for (let i = 0; i < count; i++) {
      docs.push({
        requestId: `req-${min}-${i}`,
        userId: pick(['user-a', 'user-b', 'user-c']),
        role: 'user',
        tenantId: TENANT,
        ipAddress: `192.168.1.${randomInt(1, 10)}`,
        userAgent: 'test-agent',
        endpoint: pick(['/api/data', '/api/users', '/api/health']),
        method: pick(['GET', 'GET', 'GET', 'POST', 'DELETE']),
        timestamp: NOW - (60 - min) * 60000 + randomInt(0, 59999),
        authorizationResult: 'allowed',
        responseStatus: pick([200, 200, 200, 200, 201, 400, 500]),
        requestDuration: randomInt(10, 500)
      });
    }
  }

  await TelemetryModel.insertMany(docs);
  console.log(`Seeded ${docs.length} telemetry docs for ${TENANT}`);
  await mongoose.disconnect();
};

seed().catch(console.error);
