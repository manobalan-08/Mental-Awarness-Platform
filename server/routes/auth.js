const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { find, findOne, insert, updateById, newId } = require('../store');
const auth = require('../middleware/auth');

const JWT_SECRET = 'mindflow_static_secret_2024';
const signToken = (id) => jwt.sign({ id }, JWT_SECRET, { expiresIn: '7d' });

const safeUser = (u) => ({
  id: u._id, name: u.name, email: u.email,
  mentalProfile: u.mentalProfile, preferences: u.preferences,
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields are required' });
    if (findOne('users', u => u.email === email.toLowerCase()))
      return res.status(400).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 12);
    const user = insert('users', {
      _id: newId(), name, email: email.toLowerCase(), password: hashed,
      preferences: { theme: 'dark', notifications: true, anonymousMode: false },
      mentalProfile: { level: 1, xp: 0, streak: 0, badges: [], lastLogDate: null, aiScore: 50 },
      createdAt: new Date(),
    });

    res.status(201).json({ token: signToken(user._id), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = findOne('users', u => u.email === email?.toLowerCase());
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ token: signToken(user._id), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get profile
router.get('/me', auth, (req, res) => res.json(safeUser(req.user)));

// Update preferences
router.patch('/preferences', auth, (req, res) => {
  const updated = updateById('users', req.user._id, { preferences: { ...req.user.preferences, ...req.body } });
  res.json(safeUser(updated));
});

module.exports = router;
