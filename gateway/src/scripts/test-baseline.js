import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import TelemetryModel from '../models/telemetry.model.js';
import { computeBaseline, getBaseline } from '../services/baseline.service.js';
import BaselineModel from '../models/baseline.model.js';

const TENANT = 'tenant-test-1';

const test = async () => {
  await connectDB();

  // --- Test 1: computeBaseline with existing data ---
  console.log('\n=== Test 1: computeBaseline ===');
  const baseline = await computeBaseline(TENANT, 3600000);
  if (!baseline) {
    console.error('FAIL: No baseline returned. Did you run seed-telemetry.js first?');
    await mongoose.disconnect();
    return;
  }

  const fields = [
    'avgRequestsPerMin', 'stdRequestsPerMin',
    'avgFailureRate', 'stdFailureRate',
    'avgUniqueIPs', 'stdUniqueIPs',
    'avgResponseTime', 'stdResponseTime'
  ];

  let pass = true;
  for (const f of fields) {
    if (typeof baseline[f] !== 'number' || isNaN(baseline[f])) {
      console.error(`FAIL: ${f} is invalid (${baseline[f]})`);
      pass = false;
    }
  }
  if (pass) console.log('PASS: All baseline fields are valid numbers');
  console.log('Baseline:', JSON.stringify(baseline.toObject(), null, 2));

  // --- Test 2: getBaseline returns cached result ---
  console.log('\n=== Test 2: getBaseline (cached) ===');
  const cached = await getBaseline(TENANT);
  if (cached && cached.tenantId === TENANT) {
    console.log('PASS: getBaseline returned cached baseline');
  } else {
    console.error('FAIL: getBaseline did not return expected baseline');
  }

  // --- Test 3: getBaseline for unknown tenant triggers compute ---
  console.log('\n=== Test 3: getBaseline (unknown tenant) ===');
  const unknown = await getBaseline('tenant-nonexistent');
  if (unknown === null) {
    console.log('PASS: Returns null for tenant with no telemetry');
  } else {
    console.error('FAIL: Expected null for unknown tenant');
  }

  // --- Test 4: Upsert — running compute again should update, not duplicate ---
  console.log('\n=== Test 4: Upsert check ===');
  await computeBaseline(TENANT, 3600000);
  const count = await BaselineModel.countDocuments({ tenantId: TENANT, windowMs: 3600000 });
  if (count === 1) {
    console.log('PASS: Only one baseline doc exists (upsert works)');
  } else {
    console.error(`FAIL: Expected 1 baseline doc, found ${count}`);
  }

  // Cleanup
  await BaselineModel.deleteMany({ tenantId: TENANT });
  await BaselineModel.deleteMany({ tenantId: 'tenant-nonexistent' });
  console.log('\nDone. Cleaned up baseline docs.');
  await mongoose.disconnect();
};

test().catch(console.error);
