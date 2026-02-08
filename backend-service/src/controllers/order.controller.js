import { getAllOrders, getOrdersByUser } from '../services/order.service.js';
import { randomDelay } from '../utils/delay.js';

// Phase 3: No authorization logic - gateway is the sole authority
// If request reaches here, it is authorized by gateway
export const getOrders = async (req, res) => {
  await randomDelay();
  
  const identity = req.authzIdentity;
  
  // Business logic only - no role checks
  // Gateway already enforced authorization
  const orders = identity.role === 'admin' 
    ? getAllOrders() 
    : getOrdersByUser(identity.userId);

  res.json({ orders, requestedBy: identity.username });
};
