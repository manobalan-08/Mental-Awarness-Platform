const router = require('express').Router();
const auth = require('../middleware/auth');
const { find, insert, updateById, findOne, newId, db } = require('../store');

// ── Mood Poll ────────────────────────────────────────────────────────────────
// POST anonymous vote
router.post('/poll/vote', auth, (req, res) => {
  const { mood } = req.body;
  if (!mood) return res.status(400).json({ message: 'mood required' });

  const today = new Date().toDateString();
  // One vote per user per day
  const existing = findOne('pollVotes', v => v.user === req.user._id && new Date(v.date).toDateString() === today);
  if (existing) {
    updateById('pollVotes', existing._id, { mood });
    return res.json({ message: 'Vote updated' });
  }
  insert('pollVotes', { _id: newId(), user: req.user._id, mood, date: new Date() });
  res.status(201).json({ message: 'Vote recorded' });
});

// GET today's poll results (anonymous aggregates only)
router.get('/poll/results', auth, (req, res) => {
  const today = new Date().toDateString();
  const votes = find('pollVotes', v => new Date(v.date).toDateString() === today);
  const counts = {};
  votes.forEach(v => { counts[v.mood] = (counts[v.mood] || 0) + 1; });
  const total = votes.length;
  const results = Object.entries(counts).map(([mood, count]) => ({
    mood, count, pct: total ? Math.round((count / total) * 100) : 0,
  })).sort((a, b) => b.count - a.count);
  res.json({ results, total, userVote: find('pollVotes', v => v.user === req.user._id && new Date(v.date).toDateString() === today)[0]?.mood || null });
});

// ── Mood Quest ───────────────────────────────────────────────────────────────
const QUESTS = {
  anxious:    [{ id: 'breathing', title: '4-7-8 Breathing', desc: 'Complete one breathing cycle', xp: 50, emoji: '🌬️' }, { id: 'journal', title: 'Write it out', desc: 'Write a journal entry about what\'s worrying you', xp: 40, emoji: '📝' }],
  sad:        [{ id: 'gratitude', title: 'Gratitude moment', desc: 'Name 3 things you\'re grateful for today', xp: 40, emoji: '🙏' }, { id: 'walk', title: '5-min walk', desc: 'Step outside for 5 minutes', xp: 50, emoji: '🚶' }],
  angry:      [{ id: 'grounding', title: 'Grounding exercise', desc: 'Complete the 5-4-3-2-1 grounding technique', xp: 50, emoji: '⚓' }, { id: 'breathe', title: 'Box breathing', desc: 'Breathe in 4, hold 4, out 4, hold 4', xp: 40, emoji: '📦' }],
  tired:      [{ id: 'hydrate', title: 'Hydrate', desc: 'Drink a full glass of water right now', xp: 20, emoji: '💧' }, { id: 'stretch', title: 'Quick stretch', desc: 'Do 2 minutes of light stretching', xp: 30, emoji: '🧘' }],
  motivated:  [{ id: 'goal', title: 'Set a micro-goal', desc: 'Write down one thing to accomplish today', xp: 40, emoji: '🎯' }, { id: 'share', title: 'Share the energy', desc: 'Send an encouraging message to someone', xp: 50, emoji: '⚡' }],
  joy:        [{ id: 'celebrate', title: 'Celebrate it', desc: 'Write what made you feel this way', xp: 30, emoji: '🎉' }, { id: 'spread', title: 'Spread the joy', desc: 'Do something kind for someone today', xp: 50, emoji: '💛' }],
  default:    [{ id: 'checkin', title: 'Daily check-in', desc: 'Log your mood to start earning XP', xp: 30, emoji: '📊' }, { id: 'breathe_default', title: 'Mindful minute', desc: 'Take 60 seconds to breathe slowly', xp: 20, emoji: '🌿' }],
};

router.get('/quests', auth, (req, res) => {
  const today = new Date().toDateString();
  const latestMood = find('moodLogs', l => l.user === req.user._id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

  // Map numeric mood to emotion label
  let moodLabel = 'default';
  if (latestMood) {
    const m = latestMood.mood;
    const emotions = latestMood.emotions || latestMood.tags || [];
    if (emotions.includes('Anxious') || emotions.includes('anxious')) moodLabel = 'anxious';
    else if (emotions.includes('Tired') || emotions.includes('tired')) moodLabel = 'tired';
    else if (m <= 3) moodLabel = 'sad';
    else if (m <= 5) moodLabel = 'anxious';
    else if (m >= 8) moodLabel = 'joy';
    else if (m >= 6) moodLabel = 'motivated';
  }

  const quests = QUESTS[moodLabel] || QUESTS.default;

  // Check which are completed today
  const completedToday = find('questCompletions', c => c.user === req.user._id && new Date(c.date).toDateString() === today).map(c => c.questId);

  res.json({
    quests: quests.map(q => ({ ...q, completed: completedToday.includes(q.id) })),
    moodLabel,
    latestMood: latestMood?.mood || null,
  });
});

router.post('/quests/complete', auth, (req, res) => {
  const { questId, xp } = req.body;
  const today = new Date().toDateString();
  const already = findOne('questCompletions', c => c.user === req.user._id && c.questId === questId && new Date(c.date).toDateString() === today);
  if (already) return res.json({ message: 'Already completed', xp: 0 });

  insert('questCompletions', { _id: newId(), user: req.user._id, questId, xp, date: new Date() });

  // Award XP
  const user = findOne('users', u => u._id === req.user._id);
  if (user) {
    let { xp: currentXp, level, badges } = user.mentalProfile;
    currentXp += xp;
    if (currentXp >= level * 100) { level += 1; badges = [...badges, `Level ${level} Achieved`]; }
    updateById('users', user._id, { mentalProfile: { ...user.mentalProfile, xp: currentXp, level, badges } });
  }

  res.json({ message: 'Quest completed!', xp });
});

// ── Streak Leaderboard ───────────────────────────────────────────────────────
router.get('/leaderboard', auth, (req, res) => {
  const users = find('users', () => true)
    .map(u => ({
      name: u.preferences?.anonymousMode ? 'Anonymous' : u.name.split(' ')[0],
      streak: u.mentalProfile?.streak || 0,
      level: u.mentalProfile?.level || 1,
      isYou: u._id === req.user._id,
    }))
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 10);
  res.json(users);
});

// ── Bubble Wrap score save ───────────────────────────────────────────────────
router.post('/bubblewrap/score', auth, (req, res) => {
  const { pops, duration } = req.body;
  insert('gameScores', { _id: newId(), user: req.user._id, game: 'bubblewrap', pops, duration, date: new Date() });
  res.json({ message: 'Score saved', pops });
});

module.exports = router;
