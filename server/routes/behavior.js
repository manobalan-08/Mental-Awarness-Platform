const router = require('express').Router();
const auth = require('../middleware/auth');
const { find, insert, newId } = require('../store');

router.post('/', auth, (req, res) => {
  const data = insert('behaviorData', { _id: newId(), user: req.user._id, ...req.body, date: new Date() });
  res.status(201).json(data);
});

router.get('/', auth, (req, res) => {
  const days = parseInt(req.query.days) || 7;
  const since = new Date(Date.now() - days * 86400000);
  const data = find('behaviorData', b => b.user === req.user._id && new Date(b.date) >= since)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(data);
});

router.get('/context-suggestion', auth, (req, res) => {
  const records = find('behaviorData', b => b.user === req.user._id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = records[0];

  if (!latest) return res.json({ suggestion: 'Start logging your daily habits for personalized suggestions.', alertType: 'info' });

  const { sleepHours, screenTime, studyWorkHours } = latest;
  let suggestion, alertType;

  if (sleepHours < 5 && studyWorkHours > 8) {
    suggestion = 'You slept less than 5 hours and worked over 8 hours. Your body needs rest — skip productivity tasks and take a proper break.';
    alertType = 'warning';
  } else if (sleepHours < 6) {
    suggestion = 'Low sleep detected. Avoid high-focus tasks. Try a 20-min nap or light stretching.';
    alertType = 'warning';
  } else if (screenTime > 8) {
    suggestion = 'High screen time detected. Take a 10-minute screen break and do some eye exercises.';
    alertType = 'info';
  } else if (studyWorkHours > 10) {
    suggestion = "You've been working intensely. A short walk or breathing exercise will help reset your focus.";
    alertType = 'info';
  } else {
    suggestion = 'Your habits look balanced today. Keep it up!';
    alertType = 'success';
  }

  res.json({ suggestion, alertType, data: latest });
});

module.exports = router;
