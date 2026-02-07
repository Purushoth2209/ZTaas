import { authenticateUser } from '../services/auth.service.js';
import { randomDelay } from '../utils/delay.js';

export const login = async (req, res) => {
  await randomDelay();

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const result = authenticateUser(username, password);

  if (!result) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json(result);
};
