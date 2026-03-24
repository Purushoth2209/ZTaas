import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { computeBaseline } from '../services/baseline.service.js';

const TENANT = 'tenant-test-1';

const run = async () => {
  await connectDB();
  const baseline = await computeBaseline(TENANT, 3600000);
  if (baseline) {
    console.log('\nBaseline saved (not cleaned up):');
    console.log(JSON.stringify(baseline.toObject(), null, 2));
  } else {
    console.log('No telemetry found. Run seed-telemetry.js first.');
  }
  await mongoose.disconnect();
};

run().catch(console.error);
