const jwt = require('jsonwebtoken');
const { findById } = require('../store');

const JWT_SECRET = 'mindflow_static_secret_2024';

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const { id } = jwt.verify(token, JWT_SECRET);
    const user = findById('users', id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
