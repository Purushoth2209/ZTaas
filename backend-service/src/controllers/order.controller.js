import { getAllOrders, getOrdersByUser } from '../services/order.service.js';
import { randomDelay } from '../utils/delay.js';

export const getOrders = async (req, res) => {
  await randomDelay();
  
  const orders = req.user.role === 'admin' 
    ? getAllOrders() 
    : getOrdersByUser(req.user.userId);

  res.json({ orders, requestedBy: req.user.username });
};
