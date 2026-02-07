import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const JWT_CONFIG = {
  privateKey: fs.readFileSync(path.join(__dirname, '../keys/private.key'), 'utf8'),
  publicKey: fs.readFileSync(path.join(__dirname, '../keys/public.key'), 'utf8'),
  algorithm: 'RS256',
  kid: 'backend-key-1',
  issuer: 'http://localhost:5001',
  audience: 'api-gateway',
  expiresIn: '1h'
};
