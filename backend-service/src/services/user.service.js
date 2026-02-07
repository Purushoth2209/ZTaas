import { users } from '../data/users.js';

export const getAllUsers = () => {
  return users.map(({ password, ...user }) => user);
};

export const getUserById = (id) => {
  const user = users.find(u => u.id === parseInt(id));
  if (!user) return null;
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
};
