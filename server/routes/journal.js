const router = require('express').Router();
const auth = require('../middleware/auth');
const { find, insert, updateById, removeWhere, newId } = require('../store');
const { analyzeSentiment, getSuggestion } = require('../ml/sentimentAnalyzer');

// Create journal entry
router.post('/', auth, (req, res) => {
  const { title, content, tags = [] } = req.body;
  if (!content?.trim()) return res.status(400).json({ message: 'Content is required' });

  const analysis   = analyzeSentiment(content);
  const suggestion = getSuggestion(analysis.detectedMood);

  const entry = insert('journals', {
    _id: newId(),
    user: req.user._id,
    title: title || 'Untitled Entry',
    content,
    tags,
    moodAnalysis: { ...analysis, suggestion },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  res.status(201).json(entry);
});

// Get all journal entries
router.get('/', auth, (req, res) => {
  const entries = find('journals', j => j.user === req.user._id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(entries);
});

// Get single entry
router.get('/:id', auth, (req, res) => {
  const entry = find('journals', j => j._id === req.params.id && j.user === req.user._id)[0];
  if (!entry) return res.status(404).json({ message: 'Entry not found' });
  res.json(entry);
});

// Update entry
router.patch('/:id', auth, (req, res) => {
  const entry = find('journals', j => j._id === req.params.id && j.user === req.user._id)[0];
  if (!entry) return res.status(404).json({ message: 'Entry not found' });

  const { title, content, tags } = req.body;
  const analysis   = content ? analyzeSentiment(content) : entry.moodAnalysis;
  const suggestion = content ? getSuggestion(analysis.detectedMood) : entry.moodAnalysis?.suggestion;

  const updated = updateById('journals', req.params.id, {
    ...(title && { title }),
    ...(content && { content }),
    ...(tags && { tags }),
    moodAnalysis: { ...analysis, suggestion },
    updatedAt: new Date(),
  });
  res.json(updated);
});

// Delete entry
router.delete('/:id', auth, (req, res) => {
  removeWhere('journals', j => j._id === req.params.id && j.user === req.user._id);
  res.json({ message: 'Deleted' });
});

// Mood summary across all journal entries
router.get('/stats/mood-summary', auth, (req, res) => {
  const entries = find('journals', j => j.user === req.user._id);
  if (!entries.length) return res.json({ summary: [], dominantMood: null });

  const counts = {};
  entries.forEach(e => {
    const m = e.moodAnalysis?.detectedMood || 'neutral';
    counts[m] = (counts[m] || 0) + 1;
  });

  const summary = Object.entries(counts)
    .map(([mood, count]) => ({ mood, count, pct: Math.round((count / entries.length) * 100) }))
    .sort((a, b) => b.count - a.count);

  res.json({ summary, dominantMood: summary[0]?.mood, totalEntries: entries.length });
});

module.exports = router;
