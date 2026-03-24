import jwt from 'jsonwebtoken';
import { keyManager } from '../utils/keyManager.js';

const pk = keyManager.getPrivateKey();
const kid = keyManager.getCurrentKey().kid;
const token = jwt.sign(
  { sub: 'brand-new-user', username: 'brand-new-user', role: 'user', tenant: 'default' },
  pk, { algorithm: 'RS256', issuer: 'https://gateway.internal', audience: 'api-gateway', expiresIn: '1h', keyid: kid }
);

const res = await fetch('http://localhost:8081/api/data', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const body = await res.text();
console.log(`Cold start test → STATUS: ${res.status}`);
try { console.log('BODY:', JSON.parse(body)); } catch { console.log('BODY:', body.substring(0, 100)); }
