import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_DIR = path.join(__dirname, '../keys');
const KEYS_CONFIG_FILE = path.join(KEYS_DIR, 'keys.json');

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

class KeyManager {
  constructor() {
    this.keys = this.loadKeys();
  }

  loadKeys() {
    if (fs.existsSync(KEYS_CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(KEYS_CONFIG_FILE, 'utf8'));
    }
    return { keys: [], currentKid: null };
  }

  saveKeys() {
    fs.writeFileSync(KEYS_CONFIG_FILE, JSON.stringify(this.keys, null, 2));
  }

  generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    const kid = `gateway-key-${Date.now()}`;
    const keyPath = path.join(KEYS_DIR, `${kid}`);

    // Save keys to files
    fs.writeFileSync(`${keyPath}.private.pem`, privateKey);
    fs.writeFileSync(`${keyPath}.public.pem`, publicKey);

    // Add to keys registry
    const keyEntry = {
      kid,
      algorithm: 'RS256',
      use: 'sig',
      createdAt: new Date().toISOString(),
      privateKeyPath: `${keyPath}.private.pem`,
      publicKeyPath: `${keyPath}.public.pem`,
      active: true
    };

    this.keys.keys.push(keyEntry);
    if (!this.keys.currentKid) {
      this.keys.currentKid = kid;
    }

    this.saveKeys();
    return keyEntry;
  }

  getCurrentKey() {
    if (!this.keys.currentKid) {
      return this.generateKeyPair();
    }
    return this.keys.keys.find(key => key.kid === this.keys.currentKid);
  }

  getPrivateKey(kid = null) {
    const keyEntry = kid ? 
      this.keys.keys.find(key => key.kid === kid) : 
      this.getCurrentKey();
    
    if (!keyEntry) return null;
    return fs.readFileSync(keyEntry.privateKeyPath, 'utf8');
  }

  getPublicKey(kid = null) {
    const keyEntry = kid ? 
      this.keys.keys.find(key => key.kid === kid) : 
      this.getCurrentKey();
    
    if (!keyEntry) return null;
    return fs.readFileSync(keyEntry.publicKeyPath, 'utf8');
  }

  getJWKS() {
    const jwks = {
      keys: this.keys.keys.filter(key => key.active).map(keyEntry => {
        const publicKey = crypto.createPublicKey(this.getPublicKey(keyEntry.kid));
        const jwk = publicKey.export({ format: 'jwk' });
        
        return {
          kty: jwk.kty,
          use: keyEntry.use,
          alg: keyEntry.algorithm,
          kid: keyEntry.kid,
          n: jwk.n,
          e: jwk.e
        };
      })
    };
    return jwks;
  }

  rotateKey() {
    const newKey = this.generateKeyPair();
    this.keys.currentKid = newKey.kid;
    this.saveKeys();
    return newKey;
  }
}

export const keyManager = new KeyManager();