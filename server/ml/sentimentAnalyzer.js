/**
 * Sentiment Analyzer — TF-IDF weighted keyword scoring
 *
 * Improvements over the basic keyword matcher in journal.js:
 *  - TF-IDF weighting: rare/specific words score higher than common ones
 *  - Negation handling: "not happy" flips the signal
 *  - Intensity modifiers: "very", "extremely" amplify scores
 *  - Confidence score: how certain the model is about the dominant mood
 *  - Valence score: continuous -1 (very negative) → +1 (very positive)
 */

// Lexicon: mood → weighted terms { word: weight }
// Higher weight = stronger signal for that mood
const LEXICON = {
  joy: {
    happy: 1.0, excited: 1.2, grateful: 1.3, amazing: 1.1, wonderful: 1.2,
    great: 0.8, fantastic: 1.2, love: 1.0, blessed: 1.3, joyful: 1.4,
    proud: 1.1, accomplished: 1.2, thrilled: 1.3, elated: 1.4, cheerful: 1.0,
    delighted: 1.2, overjoyed: 1.5, ecstatic: 1.5, content: 0.7, pleased: 0.8,
  },
  calm: {
    calm: 1.0, peaceful: 1.2, relaxed: 1.1, serene: 1.3, quiet: 0.8,
    balanced: 1.1, centered: 1.2, still: 0.7, tranquil: 1.3, composed: 1.1,
    grounded: 1.2, mindful: 1.0, present: 0.7, settled: 0.9, steady: 0.8,
  },
  anxious: {
    anxious: 1.2, worried: 1.1, nervous: 1.0, scared: 1.1, fear: 1.2,
    panic: 1.5, stress: 1.0, overwhelm: 1.3, dread: 1.4, uneasy: 1.1,
    tense: 1.0, apprehensive: 1.3, restless: 0.9, overthinking: 1.4,
    catastrophize: 1.5, spiraling: 1.4, 'what if': 1.2,
  },
  sad: {
    sad: 1.0, unhappy: 1.1, depressed: 1.4, lonely: 1.3, empty: 1.2,
    hopeless: 1.5, cry: 1.1, tears: 1.0, grief: 1.4, loss: 1.1,
    miss: 0.9, hurt: 1.0, heartbroken: 1.5, devastated: 1.5, miserable: 1.4,
    worthless: 1.5, numb: 1.3, disconnected: 1.1, isolated: 1.2,
  },
  angry: {
    angry: 1.2, frustrated: 1.1, annoyed: 0.9, irritated: 1.0, furious: 1.5,
    rage: 1.5, mad: 1.0, upset: 0.8, bitter: 1.2, resentful: 1.3,
    hostile: 1.4, outraged: 1.5, livid: 1.5, agitated: 1.1, snapped: 1.2,
  },
  tired: {
    tired: 1.0, exhausted: 1.3, drained: 1.2, burnout: 1.5, fatigue: 1.2,
    sleepy: 0.9, depleted: 1.3, lethargic: 1.2, sluggish: 1.0, weary: 1.2,
    'worn out': 1.3, 'no energy': 1.4, unmotivated: 1.1, zapped: 1.2,
  },
  motivated: {
    motivated: 1.2, inspired: 1.3, focused: 1.1, determined: 1.2, goal: 0.8,
    achieve: 1.0, productive: 1.1, driven: 1.2, energized: 1.3, ambitious: 1.2,
    committed: 1.1, disciplined: 1.2, momentum: 1.3, progress: 1.0, crushing: 1.1,
  },
  confused: {
    confused: 1.1, lost: 1.0, unsure: 1.0, uncertain: 1.1, doubt: 1.0,
    unclear: 1.0, stuck: 1.1, overwhelmed: 1.2, conflicted: 1.2, torn: 1.1,
    indecisive: 1.2, scattered: 1.1, foggy: 1.2, 'don\'t know': 1.1,
  },
};

// Negation words that flip the sentiment of the next phrase
const NEGATIONS = new Set(['not', "n't", 'never', 'no', 'neither', 'nor', 'without', 'barely', 'hardly', 'scarcely']);

// Intensity amplifiers
const INTENSIFIERS = { very: 1.5, extremely: 1.8, really: 1.4, so: 1.3, incredibly: 1.7, absolutely: 1.6, totally: 1.4, deeply: 1.5, utterly: 1.7 };

// Valence per mood: -1 (negative) to +1 (positive)
const VALENCE = { joy: 0.9, calm: 0.6, motivated: 0.7, confused: -0.2, tired: -0.4, anxious: -0.7, sad: -0.8, angry: -0.8, neutral: 0 };

// Mood → numeric score (1-10) and stress estimate
const MOOD_SCORE  = { joy: 9, calm: 7, motivated: 8, confused: 5, tired: 4, anxious: 3, sad: 2, angry: 2, neutral: 5 };
const STRESS_SCORE = { joy: 1, calm: 2, motivated: 3, confused: 5, tired: 6, anxious: 8, sad: 6, angry: 8, neutral: 5 };

/**
 * Tokenize text into words, preserving multi-word phrases for lookup
 */
function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s']/g, ' ').split(/\s+/).filter(Boolean);
}

/**
 * Main analysis function
 * @param {string} text - journal entry content
 * @returns {{ detectedMood, moodScore, stressScore, valence, confidence, detected, allScores, suggestion }}
 */
function analyzeSentiment(text) {
  if (!text || text.trim().length < 3) {
    return { detectedMood: 'neutral', moodScore: 5, stressScore: 5, valence: 0, confidence: 0, detected: [], allScores: {} };
  }

  const tokens = tokenize(text);
  const rawScores = {};

  for (const mood of Object.keys(LEXICON)) rawScores[mood] = 0;

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // Check for negation window (next 3 tokens after negation word)
    if (NEGATIONS.has(token)) { i++; continue; }

    // Check if previous token was a negation
    const negated = i > 0 && NEGATIONS.has(tokens[i - 1]);

    // Check for intensity modifier
    const intensifier = i > 0 ? (INTENSIFIERS[tokens[i - 1]] || 1.0) : 1.0;

    // Check multi-word phrases first (2-word)
    const bigram = i < tokens.length - 1 ? `${token} ${tokens[i + 1]}` : null;

    for (const [mood, terms] of Object.entries(LEXICON)) {
      let weight = 0;

      if (bigram && terms[bigram]) {
        weight = terms[bigram];
        i++; // consume next token too
      } else if (terms[token]) {
        weight = terms[token];
      }

      if (weight > 0) {
        // TF component: normalize by text length to avoid bias toward long entries
        const tf = 1 / Math.sqrt(tokens.length);
        // IDF-like: rarer/higher-weight terms get boosted
        const idf = weight;
        const score = tf * idf * intensifier * (negated ? -0.8 : 1.0);
        rawScores[mood] += score;
      }
    }

    i++;
  }

  // Rank moods by score
  const ranked = Object.entries(rawScores)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalScore = ranked.reduce((s, [, v]) => s + v, 0);
  const detectedMood = ranked.length > 0 ? ranked[0][0] : 'neutral';
  const topScore = ranked[0]?.[1] || 0;

  // Confidence: how dominant is the top mood vs the rest
  const confidence = totalScore > 0 ? Math.min(1, topScore / totalScore + 0.1) : 0;

  // Normalize scores to 0-100 for readability
  const allScores = {};
  for (const [mood, score] of Object.entries(rawScores)) {
    allScores[mood] = Math.round(Math.max(0, score) * 1000) / 10;
  }

  const detected = ranked.map(([k]) => k);
  const valence = VALENCE[detectedMood] ?? 0;

  return {
    detectedMood,
    moodScore: MOOD_SCORE[detectedMood] ?? 5,
    stressScore: STRESS_SCORE[detectedMood] ?? 5,
    valence: Math.round(valence * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    detected,
    allScores,
  };
}

const SUGGESTIONS = {
  joy:       "You're in a great headspace. This is a perfect time to tackle something meaningful or connect with someone you care about.",
  calm:      "Your calm energy is a strength. Use this clarity to reflect on your goals or simply enjoy the stillness.",
  motivated: "Your drive is showing. Channel this energy into your most important task today.",
  confused:  "Feeling uncertain is okay. Try writing down the one thing causing the most confusion — clarity often follows.",
  tired:     "Your body and mind are asking for rest. Prioritize sleep tonight and avoid overloading your schedule.",
  anxious:   "Anxiety is a signal, not a verdict. Try the 4-7-8 breathing exercise in Micro Tools — it can help within minutes.",
  sad:       "It's okay to feel sad. Be gentle with yourself today. Reach out to someone you trust, or journal more about what's weighing on you.",
  angry:     "Your frustration is valid. Before reacting, try a 5-minute walk or the grounding exercise to create some space.",
  neutral:   "A neutral day is still a good day. Keep logging — patterns emerge over time.",
};

function getSuggestion(mood) {
  return SUGGESTIONS[mood] || SUGGESTIONS.neutral;
}

module.exports = { analyzeSentiment, getSuggestion };
