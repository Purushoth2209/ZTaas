import { getAllUsers, getUserById } from '../services/user.service.js';
import { randomDelay } from '../utils/delay.js';

// Phase 4: Execution-only backend
// Valid JWT = authorized request (gateway already decided)
export const getUsers = async (req, res) => {
  await randomDelay();
  res.json({ 
    users: getAllUsers(), 
    requestedBy: req.user.sub,
    tenant: req.user.ten
  });
};

export const getUser = async (req, res) => {
  await randomDelay();
  const user = getUserById(req.params.id);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ 
    user, 
    requestedBy: req.user.sub,
    tenant: req.user.ten
  });
};
