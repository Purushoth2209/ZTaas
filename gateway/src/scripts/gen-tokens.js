import jwt from 'jsonwebtoken';
import { keyManager } from '../utils/keyManager.js';

const pk = keyManager.getPrivateKey();
const kid = keyManager.getCurrentKey().kid;

['safe-user', 'suspect-user', 'attacker'].forEach(u => {
  const t = jwt.sign(
    { sub: u, username: u, role: 'user', tenant: 'default' },
    pk,
    { algorithm: 'RS256', issuer: 'https://gateway.internal', audience: 'api-gateway', expiresIn: '1h', keyid: kid }
  );
  console.log(`${u}:\n${t}\n`);
});
