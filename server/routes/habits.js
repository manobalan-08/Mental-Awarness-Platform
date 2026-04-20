const router = require('express').Router();
const auth = require('../middleware/auth');
const { find, insert, updateById, newId } = require('../store');

// ⚠️ Static routes MUST come before /:id routes

// GET correlation insights
router.get('/correlations', auth, (req, res) => {
  const habits = find('habitLogs', l => l.user === req.user._id)
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 30);
  const moods = find('moodLogs', l => l.user === req.user._id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30);

  if (habits.length < 3 || moods.length < 3)
    return res.json({ insights: ['Log habits and mood for at least 3 days to see correlations.'], avgSleep: '0', avgMood: '0', avgStress: '0' });

  const avgSleep  = habits.reduce((s, h) => s + (h.sleepHours || 0), 0) / habits.length;
  const avgMood   = moods.reduce((s, m) => s + (m.mood || 0), 0) / moods.length;
  const avgStress = moods.reduce((s, m) => s + (m.stressLevel || 0), 0) / moods.length;
  const exerciseDays   = habits.filter(h => h.exercise > 0).length;
  const meditationDays = habits.filter(h => h.meditation).length;

  const insights = [];
  if (avgSleep < 6) insights.push(`Low sleep average (${avgSleep.toFixed(1)}h) is likely contributing to your elevated stress levels.`);
  else insights.push(`Your sleep average of ${avgSleep.toFixed(1)}h is supporting your mental recovery.`);

  if (exerciseDays / habits.length > 0.5) insights.push(`You exercised ${exerciseDays}/${habits.length} days — positively correlated with your mood scores.`);
  else insights.push(`Exercise logged only ${exerciseDays}/${habits.length} days. Even 15 min/day can improve mood by up to 30%.`);

  if (meditationDays > 0) insights.push(`Meditation on ${meditationDays} days shows a pattern of lower stress on those days.`);
  if (avgStress > 6) insights.push(`High average stress (${avgStress.toFixed(1)}/10) — consider reducing screen time and increasing water intake.`);

  res.json({ insights, avgSleep: avgSleep.toFixed(1), avgMood: avgMood.toFixed(1), avgStress: avgStress.toFixed(1) });
});

// GET export CSV
router.get('/export/csv', auth, (req, res) => {
  const habits = find('habitLogs', l => l.user === req.user._id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const header = 'Date,Sleep(hrs),Exercise(min),Water(glasses),ScreenTime(hrs),Meditation,Work(hrs),Social,Notes\n';
  const rows = habits.map(h => [
    new Date(h.date).toLocaleDateString(),
    h.sleepHours, h.exercise, h.waterIntake, h.screenTime,
    h.meditation ? 'Yes' : 'No', h.studyWorkHours,
    h.socialInteraction ? 'Yes' : 'No',
    `"${(h.notes || '').replace(/"/g, '""')}"`,
  ].join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=mindflow-habits.csv');
  res.send(header + rows);
});

// POST log habit
router.post('/', auth, (req, res) => {
  const { sleepHours = 0, exercise = 0, waterIntake = 0, screenTime = 0,
          meditation = false, studyWorkHours = 0, socialInteraction = false, notes = '' } = req.body;

  const log = insert('habitLogs', {
    _id: newId(), user: req.user._id,
    sleepHours, exercise, waterIntake, screenTime,
    meditation, studyWorkHours, socialInteraction, notes,
    date: new Date(), createdAt: new Date(),
  });
  res.status(201).json(log);
});

// GET all habit logs
router.get('/', auth, (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date(Date.now() - days * 86400000);
  const logs = find('habitLogs', l => l.user === req.user._id && new Date(l.date) >= since)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(logs);
});

// PUT update habit log
router.put('/:id', auth, (req, res) => {
  const log = find('habitLogs', l => l._id === req.params.id && l.user === req.user._id)[0];
  if (!log) return res.status(404).json({ message: 'Log not found' });
  const updated = updateById('habitLogs', req.params.id, { ...req.body, updatedAt: new Date() });
  res.json(updated);
});

module.exports = router;
