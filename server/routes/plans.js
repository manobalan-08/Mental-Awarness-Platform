const router = require('express').Router();
const auth = require('../middleware/auth');
const { find, insert, updateById, newId } = require('../store');

let OpenAI;
try { OpenAI = require('openai'); } catch {}

function generateFallbackPlan(weaknesses, avgMood, avgStress) {
  const taskBank = {
    sleep:     ['Go to bed 30 min earlier tonight', 'No screens 1 hour before bed', 'Try a 5-min body scan before sleeping', 'Set a consistent wake-up alarm'],
    exercise:  ['Take a 10-min walk outside', 'Do 5 min of stretching after waking', '20 jumping jacks before lunch', 'Walk instead of sitting during a call'],
    water:     ['Drink a glass of water right now', 'Set 3 water reminders on your phone', 'Have water before every meal', 'Replace one drink with water today'],
    screen:    ['Take a 10-min screen break every 2 hours', 'No phone for the first 30 min of your day', 'Enable grayscale mode for 2 hours', 'Read a physical book for 15 min'],
    meditation:['Try a 2-min breathing exercise', 'Sit quietly for 5 min with no distractions', 'Use the Micro Tools breathing exercise', 'Write 3 things you\'re grateful for'],
    social:    ['Send a message to one friend today', 'Schedule a 15-min call with someone you trust', 'Smile and greet one person today', 'Share how you\'re feeling with someone close'],
    stress:    ['Write down your top 3 worries and one action for each', 'Do the 4-7-8 breathing exercise', 'Take a 5-min walk outside', 'List 3 things in your control right now'],
    mood:      ['Do one thing today that brings you joy', 'Listen to your favourite song', 'Step outside for natural light', 'Write one positive thing about today'],
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const plan = {};

  days.forEach((day, i) => {
    const tasks = [];
    const focus = weaknesses[i % weaknesses.length] || 'mood';
    const pool = taskBank[focus] || taskBank.mood;
    tasks.push(pool[i % pool.length]);

    const secondary = weaknesses[(i + 1) % weaknesses.length] || 'stress';
    const pool2 = taskBank[secondary] || taskBank.stress;
    tasks.push(pool2[(i + 2) % pool2.length]);

    plan[day] = tasks;
  });

  return plan;
}

function detectWeaknesses(habits, moods) {
  const weaknesses = [];
  if (!habits.length) return ['mood', 'stress', 'meditation'];

  const avg = (arr, key) => arr.reduce((s, h) => s + (h[key] || 0), 0) / arr.length;

  if (avg(habits, 'sleepHours') < 6.5) weaknesses.push('sleep');
  if (avg(habits, 'exercise') < 20) weaknesses.push('exercise');
  if (avg(habits, 'waterIntake') < 6) weaknesses.push('water');
  if (avg(habits, 'screenTime') > 7) weaknesses.push('screen');
  if (habits.filter(h => h.meditation).length / habits.length < 0.4) weaknesses.push('meditation');
  if (habits.filter(h => h.socialInteraction).length / habits.length < 0.4) weaknesses.push('social');
  if (moods.length && moods.reduce((s, m) => s + m.stressLevel, 0) / moods.length > 6) weaknesses.push('stress');
  if (moods.length && moods.reduce((s, m) => s + m.mood, 0) / moods.length < 6) weaknesses.push('mood');

  return weaknesses.length ? weaknesses : ['mood', 'meditation'];
}

router.post('/generate', auth, async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const habits = find('habitLogs', l => l.user === req.user._id && new Date(l.date) >= weekAgo);
    const moods = find('moodLogs', l => l.user === req.user._id && new Date(l.timestamp) >= weekAgo);

    const weaknesses = detectWeaknesses(habits, moods);
    const avgMood = moods.length ? (moods.reduce((s, m) => s + m.mood, 0) / moods.length).toFixed(1) : 5;
    const avgStress = moods.length ? (moods.reduce((s, m) => s + m.stressLevel, 0) / moods.length).toFixed(1) : 5;

    let plan;
    const apiKey = process.env.OPENAI_API_KEY;

    if (apiKey && apiKey !== 'your_openai_api_key_here' && OpenAI) {
      const openai = new OpenAI({ apiKey });
      const prompt = `Create a 7-day mental wellness plan for someone with:
- Average mood: ${avgMood}/10, Average stress: ${avgStress}/10
- Weak areas: ${weaknesses.join(', ')}
Rules: tasks must be under 15 minutes, simple, actionable, and gradually increase in difficulty.
Return ONLY valid JSON: { "Monday": ["task1","task2"], "Tuesday": [...], ... } for all 7 days.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
      });
      try {
        plan = JSON.parse(completion.choices[0].message.content);
      } catch {
        plan = generateFallbackPlan(weaknesses, avgMood, avgStress);
      }
    } else {
      plan = generateFallbackPlan(weaknesses, avgMood, avgStress);
    }

    const record = insert('weeklyPlans', {
      _id: newId(), user: req.user._id,
      plan, weaknesses, avgMood, avgStress,
      progress: {}, createdAt: new Date(),
    });

    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/latest', auth, (req, res) => {
  const plans = find('weeklyPlans', p => p.user === req.user._id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(plans[0] || null);
});

// Mark task done
router.patch('/:id/progress', auth, (req, res) => {
  const { day, taskIndex, done } = req.body;
  const plan = find('weeklyPlans', p => p._id === req.params.id && p.user === req.user._id)[0];
  if (!plan) return res.status(404).json({ message: 'Plan not found' });

  const progress = { ...plan.progress };
  if (!progress[day]) progress[day] = {};
  progress[day][taskIndex] = done;

  const updated = updateById('weeklyPlans', req.params.id, { progress });
  res.json(updated);
});

module.exports = router;
