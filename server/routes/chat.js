const router = require('express').Router();
const auth = require('../middleware/auth');
const { find, insert, removeWhere, newId } = require('../store');

let OpenAI;
try { OpenAI = require('openai'); } catch {}

router.post('/', auth, async (req, res) => {
  try {
    const { message } = req.body;
    const user = req.user;

    const history = find('chatMessages', m => m.user === user._id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 10).reverse();

    const recentMoods = find('moodLogs', l => l.user === user._id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const recentMood = recentMoods[0];

    // Save user message
    insert('chatMessages', { _id: newId(), user: user._id, role: 'user', content: message, timestamp: new Date() });

    // Try OpenAI if key is set
    const apiKey = process.env.OPENAI_API_KEY;
    let reply;

    if (apiKey && apiKey !== 'your_openai_api_key_here' && OpenAI) {
      const openai = new OpenAI({ apiKey });
      const systemPrompt = `You are an empathetic AI mental wellness companion named "Aria".
You know the user's name is ${user.name}.
${recentMood ? `Their latest mood score is ${recentMood.mood}/10 with stress level ${recentMood.stressLevel}/10.` : ''}
Their mental health level is ${user.mentalProfile?.level || 1} and current streak is ${user.mentalProfile?.streak || 0} days.
Be warm, supportive, non-judgmental. Keep responses concise (2-4 sentences). Never give medical diagnoses.`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
        max_tokens: 200,
        temperature: 0.8,
      });
      reply = completion.choices[0].message.content;
    } else {
      // Fallback responses when no API key
      reply = getFallbackReply(message, user.name);
    }

    insert('chatMessages', { _id: newId(), user: user._id, role: 'assistant', content: reply, timestamp: new Date() });
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/history', auth, (req, res) => {
  const messages = find('chatMessages', m => m.user === req.user._id)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .slice(-50);
  res.json(messages);
});

router.delete('/history', auth, (req, res) => {
  removeWhere('chatMessages', m => m.user === req.user._id);
  res.json({ message: 'Chat history cleared' });
});

function getFallbackReply(message, name) {
  const msg = message.toLowerCase();
  if (msg.includes('anxious') || msg.includes('anxiety') || msg.includes('worried'))
    return `I hear you, ${name}. Anxiety can feel overwhelming. Try taking 3 slow deep breaths right now — inhale for 4 counts, hold for 4, exhale for 6. You're safe in this moment.`;
  if (msg.includes('stress') || msg.includes('overwhelm'))
    return `It sounds like you're carrying a lot right now. That's completely valid. Would you like to try a quick grounding exercise? It only takes a minute and can really help reset your nervous system.`;
  if (msg.includes('tired') || msg.includes('exhausted') || msg.includes('burnout'))
    return `Feeling exhausted is your body's way of asking for care. Rest isn't laziness — it's essential. Is there one small thing you could let go of today to give yourself a break?`;
  if (msg.includes('sad') || msg.includes('depress') || msg.includes('unhappy'))
    return `I'm really glad you shared that with me. It takes courage to acknowledge how you're feeling. You don't have to fix everything right now — just being here and checking in with yourself is a meaningful step.`;
  if (msg.includes('focus') || msg.includes('concentrate') || msg.includes('distract'))
    return `Struggling to focus is really common, especially when your mind is full. Try the 2-minute rule: just commit to working on one thing for 2 minutes. Often that's enough to get into flow.`;
  if (msg.includes('breath') || msg.includes('calm'))
    return `Let's do this together. Breathe in slowly for 4 counts... hold for 7... and exhale for 8. Repeat this 3 times. This activates your parasympathetic nervous system and signals safety to your brain.`;
  if (msg.includes('motivat') || msg.includes('lazy') || msg.includes('productive'))
    return `Motivation often follows action, not the other way around. Start with the smallest possible step — even 5 minutes. Progress, no matter how small, builds momentum.`;
  if (msg.includes('sleep') || msg.includes('insomnia'))
    return `Poor sleep affects everything — mood, focus, resilience. Try keeping your phone out of the bedroom tonight and doing a 5-minute body scan before bed. Your brain needs that wind-down signal.`;
  return `Thank you for sharing that with me, ${name}. I'm here to listen and support you. How long have you been feeling this way, and is there something specific that triggered it?`;
}

module.exports = router;
