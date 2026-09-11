const router = require('express').Router();
const auth = require('../middleware/auth');
const { find, insert, newId } = require('../store');

/**
 * POST /api/eye-scan
 * Save a completed eye scan session with emotion result + XAI explanation
 */
router.post('/', auth, (req, res) => {
  const {
    emotion,
    confidence,
    duration,
    features,
    explanation,
    allProbabilities,
    emotionTimeline,
  } = req.body;

  if (!emotion) return res.status(400).json({ message: 'emotion is required' });

  const session = insert('eyeScans', {
    _id: newId(),
    user: req.user._id,
    emotion,
    confidence: Math.round((confidence || 0) * 100) / 100,
    duration: duration || 0,
    features: features || {},
    explanation: explanation || null,
    allProbabilities: allProbabilities || {},
    emotionTimeline: emotionTimeline || [],
    timestamp: new Date(),
  });

  res.status(201).json(session);
});

/**
 * GET /api/eye-scan
 * Get user's eye scan history (most recent first)
 */
router.get('/', auth, (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const sessions = find('eyeScans', s => s.user === req.user._id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit);
  res.json(sessions);
});

/**
 * GET /api/eye-scan/summary
 * Emotion frequency summary across all sessions
 */
router.get('/summary', auth, (req, res) => {
  const sessions = find('eyeScans', s => s.user === req.user._id);
  if (!sessions.length) return res.json({ summary: [], dominantEmotion: null, totalSessions: 0 });

  const counts = {};
  for (const s of sessions) {
    counts[s.emotion] = (counts[s.emotion] || 0) + 1;
  }

  const summary = Object.entries(counts)
    .map(([emotion, count]) => ({
      emotion,
      count,
      pct: Math.round((count / sessions.length) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  res.json({
    summary,
    dominantEmotion: summary[0]?.emotion,
    totalSessions: sessions.length,
  });
});

module.exports = router;
