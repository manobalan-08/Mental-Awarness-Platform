const router = require('express').Router();
const auth = require('../middleware/auth');
const { find, insert, updateById, newId } = require('../store');
const { detectAnomalies, summarizeAnomalies } = require('../ml/anomalyDetector');

// Log mood
router.post('/', auth, (req, res) => {
  try {
    const log = insert('moodLogs', {
      _id: newId(), user: req.user._id, ...req.body, timestamp: new Date(),
    });

    // Update streak + XP
    const user = req.user;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const last = user.mentalProfile.lastLogDate;
    let { streak, xp, level, badges } = user.mentalProfile;

    if (!last || new Date(last).toDateString() === yesterday) streak += 1;
    else if (new Date(last).toDateString() !== today) streak = 1;

    xp += 10;
    if (xp >= level * 100) { level += 1; badges = [...badges, `Level ${level} Achieved`]; }

    updateById('users', user._id, {
      mentalProfile: { ...user.mentalProfile, streak, xp, level, badges, lastLogDate: new Date() },
    });

    // Run anomaly detection against user's mood history
    const history = find('moodLogs', l => l.user === req.user._id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Grab latest behavior log if available
    const behaviorLog = find('behaviorData', b => b.user === req.user._id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;

    const anomalyReport = detectAnomalies(log, history, behaviorLog);
    const anomalySummary = summarizeAnomalies(anomalyReport);

    res.status(201).json({
      log,
      streak,
      xp,
      anomaly: anomalyReport.hasAnomaly ? {
        severity: anomalyReport.overallSeverity,
        alerts: anomalyReport.alerts,
        summary: anomalySummary,
        details: anomalyReport.anomalies,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get mood logs
router.get('/', auth, (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date(Date.now() - days * 86400000);
  const logs = find('moodLogs', l => l.user === req.user._id && new Date(l.timestamp) >= since)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(logs);
});

// On-demand anomaly analysis for the last N logs
router.get('/anomaly', auth, (req, res) => {
  const history = find('moodLogs', l => l.user === req.user._id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (!history.length) return res.json({ hasAnomaly: false, reason: 'no_logs' });

  const behaviorLog = find('behaviorData', b => b.user === req.user._id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;

  const report  = detectAnomalies(history[0], history, behaviorLog);
  const summary = summarizeAnomalies(report);

  res.json({ ...report, summary });
});

// Trend analysis
router.get('/trend', auth, (req, res) => {
  const logs = find('moodLogs', l => l.user === req.user._id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 14);

  if (logs.length < 3) return res.json({ trend: 'insufficient_data' });

  const avgMood = logs.reduce((s, l) => s + l.mood, 0) / logs.length;
  const avgStress = logs.reduce((s, l) => s + l.stressLevel, 0) / logs.length;
  const recentAvg = logs.slice(0, 3).reduce((s, l) => s + l.mood, 0) / 3;

  const trend = recentAvg < avgMood - 1.5 ? 'declining' : recentAvg > avgMood + 1.5 ? 'improving' : 'stable';
  const burnoutRisk = avgStress > 7 ? 'high' : avgStress > 5 ? 'moderate' : 'low';

  res.json({ trend, avgMood: avgMood.toFixed(1), avgStress: avgStress.toFixed(1), burnoutRisk, logsCount: logs.length });
});

module.exports = router;
