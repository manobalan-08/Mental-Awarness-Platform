const router = require('express').Router();
const auth = require('../middleware/auth');
const { find, insert, newId } = require('../store');

let OpenAI;
try { OpenAI = require('openai'); } catch {}

router.post('/generate', auth, async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const moods = find('moodLogs', l => l.user === req.user._id && new Date(l.timestamp) >= weekAgo);
    const behaviors = find('behaviorData', b => b.user === req.user._id && new Date(b.date) >= weekAgo);
    const feedbacks = find('feedbacks', f => f.user === req.user._id && new Date(f.timestamp) >= weekAgo);

    if (moods.length === 0)
      return res.json({ message: 'Not enough data yet. Log your mood daily for a few days first.' });

    const avgMood = (moods.reduce((s, m) => s + m.mood, 0) / moods.length).toFixed(1);
    const avgStress = (moods.reduce((s, m) => s + m.stressLevel, 0) / moods.length).toFixed(1);
    const avgSleep = behaviors.length
      ? (behaviors.reduce((s, b) => s + (b.sleepHours || 0), 0) / behaviors.length).toFixed(1)
      : null;
    const burnoutScore = Math.min(100, Math.round((avgStress / 10) * 60 + (10 - avgMood) / 10 * 40));
    const burnoutRisk = burnoutScore > 75 ? 'critical' : burnoutScore > 55 ? 'high' : burnoutScore > 35 ? 'moderate' : 'low';
    const aiMentalHealthScore = Math.max(0, Math.min(100,
      Math.round((avgMood / 10) * 50 + (1 - avgStress / 10) * 30 + (avgSleep ? Math.min(avgSleep / 8, 1) * 20 : 10))
    ));

    let weeklyReport;
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && apiKey !== 'your_openai_api_key_here' && OpenAI) {
      const openai = new OpenAI({ apiKey });
      const prompt = `You are an empathetic AI mental health assistant. Based on this week's data:
- Average mood: ${avgMood}/10
- Average stress: ${avgStress}/10
- Average sleep: ${avgSleep || 'N/A'} hours
- Burnout score: ${burnoutScore}/100 (${burnoutRisk} risk)
- Mood logs: ${moods.length} entries
Write a warm, supportive 3-paragraph weekly mental health report (under 200 words). Include patterns noticed, what's going well, and 2-3 actionable recommendations.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
      });
      weeklyReport = completion.choices[0].message.content;
    } else {
      weeklyReport = generateFallbackReport(avgMood, avgStress, avgSleep, burnoutRisk, moods.length);
    }

    const insight = insert('aiInsights', {
      _id: newId(), user: req.user._id,
      weekStart: weekAgo, weekEnd: new Date(),
      burnoutScore, burnoutRisk, weeklyReport, aiMentalHealthScore,
      createdAt: new Date(),
    });

    res.json(insight);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/latest', auth, (req, res) => {
  const insights = find('aiInsights', i => i.user === req.user._id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(insights[0] || null);
});

router.get('/', auth, (req, res) => {
  const insights = find('aiInsights', i => i.user === req.user._id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);
  res.json(insights);
});

function generateFallbackReport(avgMood, avgStress, avgSleep, burnoutRisk, logCount) {
  const moodLabel = avgMood >= 7 ? 'positive' : avgMood >= 5 ? 'moderate' : 'low';
  const stressLabel = avgStress >= 7 ? 'high' : avgStress >= 5 ? 'moderate' : 'manageable';

  return `This week, your mood has been ${moodLabel} with an average score of ${avgMood}/10, and your stress levels have been ${stressLabel} at ${avgStress}/10. You logged your mood ${logCount} time(s) this week — consistency is key to understanding your patterns.

${burnoutRisk === 'high' || burnoutRisk === 'critical'
  ? "Your burnout indicators are elevated. This is a signal to slow down and prioritize recovery over productivity."
  : "Your overall wellness indicators look reasonable. Keep maintaining the habits that are working for you."}
${avgSleep ? `Your average sleep of ${avgSleep} hours ${parseFloat(avgSleep) < 7 ? 'is below the recommended 7-9 hours — improving sleep quality could significantly boost your mood and resilience.' : 'is within a healthy range, which is great for mental recovery.'}` : ''}

Recommendations for next week: (1) Continue daily mood logging to build a clearer picture of your patterns. (2) ${parseFloat(avgStress) > 6 ? 'Try one micro-intervention daily — even 30 seconds of breathing can lower cortisol.' : 'Maintain your current stress management habits.'} (3) ${parseFloat(avgMood) < 6 ? 'Reach out to someone you trust — social connection is one of the strongest mood boosters.' : 'Celebrate your consistency — you\'re building real self-awareness.'}`;
}

module.exports = router;
