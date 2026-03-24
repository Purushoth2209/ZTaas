import mongoose from 'mongoose';
import { log } from '../utils/logger.js';

const MONGO_URI = process.env.MONGO_URI;

export const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    log('[DB] Connected to MongoDB');
  } catch (err) {
    log(`[DB] MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};
