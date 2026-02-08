import { getAllOrders } from '../services/order.service.js';
import { randomDelay } from '../utils/delay.js';

// Phase 4: Execution-only backend
// Valid JWT = authorized request (gateway already decided)
export const getOrders = async (req, res) => {
  await randomDelay();
  
  // Gateway already authorized this request
  // Just execute business logic - no role checks
  const orders = getAllOrders();

  res.json({ 
    orders, 
    requestedBy: req.user.sub,
    tenant: req.user.ten
  });
};
