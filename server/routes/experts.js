const router = require('express').Router();
const auth = require('../middleware/auth');
const { db, find, insert, updateById, newId } = require('../store');

// GET all experts
router.get('/', auth, (req, res) => {
  const { specialization } = req.query;
  let experts = [...db.experts];
  if (specialization) experts = experts.filter(e => e.specialization.toLowerCase().includes(specialization.toLowerCase()));
  res.json(experts);
});

// Smart match based on user's stress/mood
router.get('/match', auth, (req, res) => {
  const moods = find('moodLogs', l => l.user === req.user._id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 7);
  const habits = find('habitLogs', l => l.user === req.user._id)
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);

  const avgStress = moods.length ? moods.reduce((s, m) => s + m.stressLevel, 0) / moods.length : 5;
  const avgSleep = habits.length ? habits.reduce((s, h) => s + h.sleepHours, 0) / habits.length : 7;
  const avgMood = moods.length ? moods.reduce((s, m) => s + m.mood, 0) / moods.length : 5;

  let recommended;
  if (avgStress > 7) recommended = db.experts.find(e => e.specialization.includes('Anxiety') || e.specialization.includes('Stress'));
  else if (avgMood < 4) recommended = db.experts.find(e => e.specialization.includes('Depression') || e.specialization.includes('Mood'));
  else if (avgSleep < 6) recommended = db.experts.find(e => e.specialization.includes('Sleep'));
  else recommended = db.experts.find(e => e.specialization.includes('Mindfulness'));

  res.json({ recommended: recommended || db.experts[0], avgStress: avgStress.toFixed(1), avgMood: avgMood.toFixed(1) });
});

// Random connect
router.get('/random', auth, (req, res) => {
  const available = db.experts.filter(e => e.available);
  if (!available.length) return res.status(404).json({ message: 'No experts available right now' });
  const expert = available[Math.floor(Math.random() * available.length)];
  res.json(expert);
});

// Book a session
router.post('/book', auth, (req, res) => {
  const { expertId, date, time, anonymous = false, notes = '' } = req.body;
  const expert = db.experts.find(e => e._id === expertId);
  if (!expert) return res.status(404).json({ message: 'Expert not found' });

  const booking = insert('bookings', {
    _id: newId(), user: req.user._id, expertId,
    expertName: expert.name, expertSpecialization: expert.specialization,
    date, time, anonymous, notes, status: 'confirmed', createdAt: new Date(),
  });
  res.status(201).json(booking);
});

// Get user bookings
router.get('/bookings', auth, (req, res) => {
  const bookings = find('bookings', b => b.user === req.user._id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(bookings);
});

// Get chat messages with expert
router.get('/:expertId/messages', auth, (req, res) => {
  const messages = find('expertMessages', m =>
    m.user === req.user._id && m.expertId === req.params.expertId
  ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  res.json(messages);
});

// Send message to expert (simulated reply)
router.post('/:expertId/messages', auth, (req, res) => {
  const { content, anonymous = false } = req.body;
  const expert = db.experts.find(e => e._id === req.params.expertId);
  if (!expert) return res.status(404).json({ message: 'Expert not found' });

  const userMsg = insert('expertMessages', {
    _id: newId(), user: req.user._id, expertId: req.params.expertId,
    role: 'user', content, anonymous,
    senderName: anonymous ? 'Anonymous' : req.user.name,
    timestamp: new Date(),
  });

  // Simulated expert reply after short delay
  const replies = [
    `Thank you for sharing that. It takes courage to reach out. Can you tell me more about how long you've been feeling this way?`,
    `I hear you. What you're experiencing is valid, and you're not alone in this. Let's work through it together.`,
    `That's really insightful self-awareness. Based on what you've shared, I'd suggest we explore some coping strategies that fit your lifestyle.`,
    `I appreciate your openness. Many of my clients have felt similarly. The good news is there are effective approaches we can try.`,
    `You're doing the right thing by talking about this. Let's schedule a proper session so we can dive deeper — would that work for you?`,
  ];
  const replyContent = replies[Math.floor(Math.random() * replies.length)];

  const expertMsg = insert('expertMessages', {
    _id: newId(), user: req.user._id, expertId: req.params.expertId,
    role: 'expert', content: replyContent,
    senderName: expert.name, avatar: expert.avatar,
    timestamp: new Date(Date.now() + 1500),
  });

  res.status(201).json({ userMsg, expertMsg });
});

module.exports = router;
