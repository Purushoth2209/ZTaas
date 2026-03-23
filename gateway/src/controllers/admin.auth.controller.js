import jwt from 'jsonwebtoken';

const ADMIN_SECRET = 'supersecret';
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin';

export const adminLogin = (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USER || password !== ADMIN_PASS) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = jwt.sign(
    { userId: 'admin', role: 'admin', type: 'admin' },
    ADMIN_SECRET,
    { expiresIn: '1h' }
  );

  res.json({ token });
};

export { ADMIN_SECRET };
