const router = require('express').Router();
const auth = require('../middleware/auth');
const { find, insert, newId } = require('../store');

router.post('/', auth, (req, res) => {
  const fb = insert('feedbacks', { _id: newId(), user: req.user._id, ...req.body, timestamp: new Date() });
  res.status(201).json(fb);
});

router.get('/effective', auth, (req, res) => {
  const feedbacks = find('feedbacks', f => f.user === req.user._id && f.helpful === true)
    .sort((a, b) => (b.effectivenessScore || 0) - (a.effectivenessScore || 0))
    .slice(0, 5);
  const types = [...new Set(feedbacks.map(f => f.interventionType))];
  res.json({ effectiveTypes: types, feedbacks });
});

module.exports = router;
