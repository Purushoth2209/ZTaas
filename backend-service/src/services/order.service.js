const orders = [
  { id: 1, userId: 1, product: 'Laptop', amount: 1200 },
  { id: 2, userId: 1, product: 'Mouse', amount: 25 },
  { id: 3, userId: 2, product: 'Keyboard', amount: 75 }
];

export const getAllOrders = () => orders;

export const getOrdersByUser = (userId) => {
  return orders.filter(o => o.userId === userId);
};
