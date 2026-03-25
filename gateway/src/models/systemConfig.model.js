import mongoose from 'mongoose';

const systemConfigSchema = new mongoose.Schema({
  backendUrl: { type: String, default: 'http://localhost:5001' },
  jwt: {
    issuer:        { type: String, default: 'http://localhost:5001' },
    jwksUri:       { type: String, default: 'http://localhost:5001/.well-known/jwks.json' },
    audience:      { type: String, default: 'api-gateway' },
    algorithms:    { type: [String], default: ['RS256'] },
  },
  enforcementMode: { type: String, enum: ['observe', 'enforce'], default: 'observe' },
  updatedAt: { type: Date, default: Date.now },
});

systemConfigSchema.statics.getOrCreate = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

export default mongoose.model('SystemConfig', systemConfigSchema, 'system_config');
