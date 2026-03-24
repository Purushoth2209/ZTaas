// Standalone test - run with: node gateway/test-feature-standalone.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: './gateway/.env' });

import { getUserFeatures } from './src/services/feature.service.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB\n');

  // Test with a known user (use large window to catch existing data)
  for (const userId of ['alice', 'bob', 'nobody']) {
    console.log(`\n--- Features for "${userId}" (last 10 min) ---`);
    const features = await getUserFeatures(userId, 600000);
    console.log(JSON.stringify(features, null, 2));
  }

  await mongoose.disconnect();
};

run().catch(console.error);
