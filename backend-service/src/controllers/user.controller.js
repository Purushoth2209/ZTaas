import { getAllUsers, getUserById } from '../services/user.service.js';
import { randomDelay } from '../utils/delay.js';

// Phase 3: No authorization logic - gateway is the sole authority
// If request reaches here, it is authorized by gateway
export const getUsers = async (req, res) => {
  await randomDelay();
  res.json({ users: getAllUsers(), requestedBy: req.authzIdentity.username });
};

export const getUser = async (req, res) => {
  await randomDelay();
  const user = getUserById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user, requestedBy: req.authzIdentity.username });
};
