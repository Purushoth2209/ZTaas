import { getAllOrders, getOrdersByUser } from '../services/order.service.js';
import { randomDelay } from '../utils/delay.js';

export const getOrders = async (req, res) => {
  await randomDelay();
  
  const identity = req.authzIdentity;
  const orders = identity.role === 'admin' 
    ? getAllOrders() 
    : getOrdersByUser(identity.userId);

  res.json({ orders, requestedBy: identity.username });
};
