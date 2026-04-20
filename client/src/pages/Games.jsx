import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Layers, PenLine, Type, Swords, Leaf, Brain,
  BarChart2, Trophy, CheckCircle, RefreshCw, Star, Zap
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

// ─────────────────────────────────────────────────────────────────────────────
// 1. BUBBLE WRAP POPPER
// ─────────────────────────────────────────────────────────────────────────────
function BubbleWrap() {
  const ROWS = 8, COLS = 10;
  const total = ROWS * COLS;
  const [popped, setPopped] = useState(() => new Array(total).fill(false));
  const [count, setCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [done, setDone] = useState(false);
  const savedRef = useRef(false);

  const pop = (i) => {
    if (popped[i] || done) return;
    const next = [...popped];
    next[i] = true;
    setPopped(next);
    const newCount = count + 1;
    setCount(newCount);
    if (newCount === total) setDone(true);
  };

  useEffect(() => {
    if (done && !savedRef.current) {
      savedRef.current = true;
      const duration = Math.round((Date.now() - startTime) / 1000);
      api.post('/games/bubblewrap/score', { pops: total, duration }).catch(() => {});
      toast.success(`All ${total} bubbles popped! Stress released 🫧`);
    }
  }, [done]);

  const reset = () => { setPopped(new Array(total).fill(false)); setCount(0); setDone(false); savedRef.current = false; };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm">Pop every bubble — satisfying stress relief</p>
          <p className="text-indigo-400 font-semibold mt-1">{count} / {total} popped</p>
        </div>
        <button onClick={reset} className="btn-ghost text-sm py-2 px-4 flex items-center gap-2">
          <RefreshCw size={14} /> Reset
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          animate={{ width: `${(count / total) * 100}%` }} transition={{ type: 'spring', stiffness: 100 }} />
      </div>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
        {popped.map((isPopped, i) => (
          <motion.button
            key={i}
            onClick={() => pop(i)}
            whileTap={!isPopped ? { scale: 0.7 } : {}}
            className={`aspect-square rounded-full border-2 transition-all cursor-pointer select-none ${
              isPopped
                ? 'bg-transparent border-white/5 cursor-default'
                : 'bg-indigo-400/20 border-indigo-400/40 hover:bg-indigo-400/40 hover:border-indigo-400/70 shadow-lg shadow-indigo-500/10'
            }`}
          >
            {!isPopped && (
              <motion.div
                className="w-full h-full rounded-full bg-gradient-to-br from-indigo-300/30 to-purple-400/20"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: (i * 0.05) % 1 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {done && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="card text-center py-6 space-y-2 border border-green-500/30 bg-green-500/10">
          <p className="text-2xl">🫧</p>
          <p className="font-semibold text-green-400">All bubbles popped!</p>
          <p className="text-slate-400 text-sm">Stress level: significantly reduced</p>
          <button onClick={reset} className="btn-primary text-sm py-2 mx-auto">Pop Again</button>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DOODLE CANVAS
// ─────────────────────────────────────────────────────────────────────────────
const PALETTES = [
  { name: 'Calm', colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e0e7ff'] },
  { name: 'Ocean', colors: ['#0ea5e9', '#06b6d4', '#67e8f9', '#a5f3fc', '#e0f2fe'] },
  { name: 'Forest', colors: ['#22c55e', '#16a34a', '#4ade80', '#86efac', '#dcfce7'] },
  { name: 'Sunset', colors: ['#f97316', '#ef4444', '#fb923c', '#fca5a5', '#fed7aa'] },
  { name: 'Night', colors: ['#1e1b4b', '#312e81', '#4338ca', '#6366f1', '#818cf8'] },
];

function DoodleCanvas() {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const lastPos = useRef(null);
  const [color, setColor] = useState('#6366f1');
  const [brushSize, setBrushSize] = useState(6);
  const [palette, setPalette] = useState(0);
  const [tool, setTool] = useState('brush'); // brush | eraser

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
  };

  const draw = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = tool === 'eraser' ? '#0f172a' : color;
    ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
  }, [color, brushSize, tool]);

  const stopDraw = () => { drawing.current = false; lastPos.current = null; };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const currentPalette = PALETTES[palette];

  return (
    <div className="space-y-4">
      <p className="text-slate-400 text-sm">Draw freely — no rules, no wrong answers</p>

      {/* Palette selector */}
      <div className="flex gap-2 flex-wrap">
        {PALETTES.map((p, i) => (
          <button key={p.name} onClick={() => setPalette(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${palette === i ? 'border-white/40 text-white bg-white/10' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
            {p.name}
          </button>
        ))}
      </div>

      {/* Color swatches */}
      <div className="flex items-center gap-3">
        <div className="flex gap-2">
          {currentPalette.colors.map(c => (
            <button key={c} onClick={() => { setColor(c); setTool('brush'); }}
              className={`w-7 h-7 rounded-full border-2 transition-all ${color === c && tool === 'brush' ? 'border-white scale-125' : 'border-transparent hover:scale-110'}`}
              style={{ background: c }} />
          ))}
        </div>
        <div className="h-6 w-px bg-white/10" />
        <button onClick={() => setTool(tool === 'eraser' ? 'brush' : 'eraser')}
          className={`px-3 py-1 rounded-lg text-xs border transition-all ${tool === 'eraser' ? 'bg-white/20 border-white/40 text-white' : 'border-white/10 text-slate-400 hover:border-white/20'}`}>
          Eraser
        </button>
        <button onClick={clear} className="px-3 py-1 rounded-lg text-xs border border-white/10 text-slate-400 hover:border-red-500/40 hover:text-red-400 transition-all">
          Clear
        </button>
      </div>

      {/* Brush size */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 w-16">Size: {brushSize}px</span>
        <input type="range" min={2} max={24} value={brushSize}
          onChange={e => setBrushSize(+e.target.value)} className="flex-1 accent-indigo-500" />
      </div>

      <canvas
        ref={canvasRef}
        width={600} height={340}
        className="w-full rounded-xl border border-white/10 cursor-crosshair touch-none"
        style={{ background: '#0f172a' }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. WORD SCRAMBLE — affirmations
// ─────────────────────────────────────────────────────────────────────────────
const AFFIRMATIONS = [
  'I am enough', 'I choose peace', 'I am resilient', 'I trust myself',
  'I am worthy of love', 'I embrace change', 'I am growing every day',
  'I release what I cannot control', 'I am stronger than I think',
  'I deserve rest and joy', 'I am proud of my progress',
  'I handle challenges with grace',
];

function scramble(word) {
  const arr = word.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

function WordScramble() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * AFFIRMATIONS.length));
  const [guess, setGuess] = useState('');
  const [scrambled, setScrambled] = useState('');
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [hint, setHint] = useState(false);
  const inputRef = useRef(null);

  const affirmation = AFFIRMATIONS[idx];
  // Scramble each word individually
  const scrambledPhrase = scrambled;

  useEffect(() => {
    const words = affirmation.split(' ');
    const s = words.map(w => w.length > 3 ? scramble(w) : w).join(' ');
    setScrambled(s);
    setGuess('');
    setSolved(false);
    setHint(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [idx]);

  const check = () => {
    if (guess.trim().toLowerCase() === affirmation.toLowerCase()) {
      setSolved(true);
      setScore(s => s + 1);
      toast.success('+1 affirmation unlocked ✨');
    } else {
      toast.error('Not quite — try again!');
    }
  };

  const next = () => setIdx(i => (i + 1) % AFFIRMATIONS.length);

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">Unscramble the affirmation to unlock it</p>
        <span className="flex items-center gap-1.5 text-yellow-400 text-sm font-semibold">
          <Star size={14} /> {score} solved
        </span>
      </div>

      <div className="card text-center space-y-4 py-8">
        <p className="text-xs text-slate-500 uppercase tracking-widest">Unscramble this</p>
        <motion.p key={scrambledPhrase} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-indigo-300 tracking-wide">
          {scrambledPhrase}
        </motion.p>

        {hint && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-xs text-slate-500 italic">
            Hint: starts with "{affirmation.split(' ')[0]}"
          </motion.p>
        )}

        {solved ? (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-3">
            <p className="text-green-400 font-semibold text-lg">✨ {affirmation}</p>
            <p className="text-slate-400 text-sm">Say it out loud. Mean it.</p>
            <button onClick={next} className="btn-primary text-sm py-2 mx-auto">Next Affirmation →</button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            <input
              ref={inputRef}
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && check()}
              placeholder="Type your answer..."
              className="input-field text-center text-base"
            />
            <div className="flex gap-2 justify-center">
              <button onClick={() => setHint(true)} className="btn-ghost text-sm py-2 px-4">Hint</button>
              <button onClick={check} className="btn-primary text-sm py-2 px-6">Check</button>
              <button onClick={next} className="btn-ghost text-sm py-2 px-4">Skip</button>
            </div>
          </div>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {AFFIRMATIONS.map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? 'bg-indigo-400 w-4' : 'bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. MOOD QUEST
// ─────────────────────────────────────────────────────────────────────────────
function MoodQuest() {
  const [quests, setQuests] = useState([]);
  const [moodLabel, setMoodLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);

  useEffect(() => {
    api.get('/games/quests').then(r => {
      setQuests(r.data.quests);
      setMoodLabel(r.data.moodLabel);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const complete = async (quest) => {
    if (quest.completed) return;
    setCompleting(quest.id);
    try {
      const { data } = await api.post('/games/quests/complete', { questId: quest.id, xp: quest.xp });
      toast.success(`Quest complete! +${quest.xp} XP 🎉`);
      setQuests(prev => prev.map(q => q.id === quest.id ? { ...q, completed: true } : q));
    } catch { toast.error('Failed to complete quest'); }
    finally { setCompleting(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  const moodEmojis = { anxious: '😰', sad: '😢', angry: '😤', tired: '😴', motivated: '🚀', joy: '😄', default: '🌿' };

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div className="card border border-indigo-500/30 bg-indigo-500/5 text-center py-5 space-y-1">
        <p className="text-3xl">{moodEmojis[moodLabel] || '🌿'}</p>
        <p className="font-semibold text-slate-200">
          {moodLabel === 'default' ? "Today's quests" : `Quests for your ${moodLabel} mood`}
        </p>
        <p className="text-xs text-slate-500">Complete quests to earn XP and level up</p>
      </div>

      <div className="space-y-3">
        {quests.map((quest) => (
          <motion.div key={quest.id} layout
            className={`card border transition-all ${quest.completed ? 'border-green-500/30 bg-green-500/5 opacity-75' : 'border-white/10 hover:border-indigo-500/30'}`}>
            <div className="flex items-center gap-4">
              <span className="text-3xl flex-shrink-0">{quest.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold ${quest.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>{quest.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{quest.desc}</p>
              </div>
              <div className="flex-shrink-0 text-right space-y-1">
                <p className="text-xs text-yellow-400 font-semibold">+{quest.xp} XP</p>
                {quest.completed ? (
                  <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle size={12} /> Done</span>
                ) : (
                  <button onClick={() => complete(quest)} disabled={completing === quest.id}
                    className="btn-primary text-xs py-1.5 px-3">
                    {completing === quest.id ? '...' : 'Complete'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {quests.every(q => q.completed) && quests.length > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="card text-center py-8 space-y-2 border border-yellow-500/30 bg-yellow-500/5">
          <p className="text-3xl">🏆</p>
          <p className="font-semibold text-yellow-400">All quests complete!</p>
          <p className="text-slate-400 text-sm">Come back tomorrow for new quests</p>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. HABIT STREAK GARDEN
// ─────────────────────────────────────────────────────────────────────────────
const PLANTS = [
  { minStreak: 0,  emoji: '🌱', name: 'Seedling',   desc: 'Just getting started' },
  { minStreak: 3,  emoji: '🌿', name: 'Sprout',     desc: '3-day streak' },
  { minStreak: 7,  emoji: '🌾', name: 'Sapling',    desc: '7-day streak' },
  { minStreak: 14, emoji: '🌳', name: 'Young Tree',  desc: '14-day streak' },
  { minStreak: 30, emoji: '🌲', name: 'Tall Tree',   desc: '30-day streak' },
  { minStreak: 60, emoji: '🌴', name: 'Palm Tree',   desc: '60-day streak' },
  { minStreak: 90, emoji: '🎋', name: 'Bamboo',      desc: '90-day streak' },
];

function HabitGarden() {
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [lastLog, setLastLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/mood?days=1').then(r => {
      // Get streak from auth context via a simple profile call
    }).catch(() => {});
    // Fetch user profile for streak
    api.get('/auth/me').then(r => {
      setStreak(r.data.mentalProfile?.streak || 0);
      setLevel(r.data.mentalProfile?.level || 1);
      setLastLog(r.data.mentalProfile?.lastLogDate);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const plant = [...PLANTS].reverse().find(p => streak >= p.minStreak) || PLANTS[0];
  const nextPlant = PLANTS.find(p => p.minStreak > streak);
  const daysToNext = nextPlant ? nextPlant.minStreak - streak : null;

  // Generate garden grid — filled based on streak
  const gardenSize = 25;
  const filledCount = Math.min(streak, gardenSize);

  const isLoggedToday = lastLog && new Date(lastLog).toDateString() === new Date().toDateString();

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      {/* Main plant display */}
      <div className="card text-center py-8 space-y-3 border border-green-500/20 bg-green-500/5">
        <motion.p
          className="text-7xl"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {plant.emoji}
        </motion.p>
        <div>
          <p className="font-bold text-xl text-green-400">{plant.name}</p>
          <p className="text-slate-400 text-sm">{streak} day streak</p>
        </div>
        {nextPlant && (
          <p className="text-xs text-slate-500">
            {daysToNext} more day{daysToNext !== 1 ? 's' : ''} to grow into a <span className="text-green-400">{nextPlant.name} {nextPlant.emoji}</span>
          </p>
        )}
        {!isLoggedToday && (
          <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
            className="text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2 mx-auto inline-block">
            ⚠️ Log your mood today to keep your plant alive!
          </motion.div>
        )}
      </div>

      {/* Garden grid */}
      <div className="card space-y-3">
        <p className="text-sm font-medium text-slate-300">Your garden ({Math.min(streak, gardenSize)} / {gardenSize} plots)</p>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: gardenSize }).map((_, i) => (
            <motion.div key={i}
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.02 }}
              className={`aspect-square rounded-xl flex items-center justify-center text-xl border ${
                i < filledCount
                  ? 'bg-green-500/20 border-green-500/30'
                  : 'bg-white/5 border-white/5'
              }`}>
              {i < filledCount ? '🌱' : ''}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Plant evolution timeline */}
      <div className="card space-y-3">
        <p className="text-sm font-medium text-slate-300">Growth stages</p>
        <div className="space-y-2">
          {PLANTS.map((p) => (
            <div key={p.minStreak} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${streak >= p.minStreak ? 'bg-green-500/10' : 'opacity-40'}`}>
              <span className="text-xl">{p.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-slate-500">{p.desc}</p>
              </div>
              {streak >= p.minStreak && <CheckCircle size={14} className="text-green-400" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. MEMORY MATCH — stressors ↔ coping strategies
// ─────────────────────────────────────────────────────────────────────────────
const PAIRS = [
  { stressor: '😰 Anxiety',        coping: '🌬️ Deep breathing' },
  { stressor: '😴 Poor sleep',     coping: '📵 No screens 1hr before bed' },
  { stressor: '😤 Anger',          coping: '🚶 Take a walk' },
  { stressor: '😢 Sadness',        coping: '📝 Journal your feelings' },
  { stressor: '🤯 Overwhelm',      coping: '✅ Break tasks into steps' },
  { stressor: '😔 Low motivation', coping: '🎯 Set one small goal' },
];

function MemoryMatch() {
  const buildDeck = () => {
    const cards = PAIRS.flatMap((p, i) => [
      { id: `s${i}`, pairId: i, text: p.stressor, type: 'stressor' },
      { id: `c${i}`, pairId: i, text: p.coping,   type: 'coping' },
    ]);
    // Fisher-Yates shuffle
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  };

  const [cards, setCards] = useState(buildDeck);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [checking, setChecking] = useState(false);

  const flip = (card) => {
    if (checking || flipped.length === 2 || flipped.find(c => c.id === card.id) || matched.includes(card.pairId)) return;
    const newFlipped = [...flipped, card];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      setChecking(true);
      if (newFlipped[0].pairId === newFlipped[1].pairId) {
        setMatched(prev => [...prev, newFlipped[0].pairId]);
        setFlipped([]);
        setChecking(false);
        if (matched.length + 1 === PAIRS.length) toast.success('All matched! You know your coping strategies 🧠');
      } else {
        setTimeout(() => { setFlipped([]); setChecking(false); }, 1000);
      }
    }
  };

  const reset = () => { setCards(buildDeck()); setFlipped([]); setMatched([]); setMoves(0); setChecking(false); };

  const isFlipped = (card) => flipped.find(c => c.id === card.id) || matched.includes(card.pairId);
  const isMatched = (card) => matched.includes(card.pairId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">Match each stressor with its coping strategy</p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{moves} moves · {matched.length}/{PAIRS.length} matched</span>
          <button onClick={reset} className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5">
            <RefreshCw size={13} /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {cards.map(card => (
          <motion.button
            key={card.id}
            onClick={() => flip(card)}
            whileTap={!isFlipped(card) ? { scale: 0.95 } : {}}
            className={`aspect-square rounded-xl border text-xs font-medium p-2 flex items-center justify-center text-center leading-tight transition-all ${
              isMatched(card)
                ? 'bg-green-500/20 border-green-500/40 text-green-300'
                : isFlipped(card)
                  ? card.type === 'stressor'
                    ? 'bg-orange-500/20 border-orange-500/40 text-orange-200'
                    : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
                  : 'bg-white/5 border-white/10 text-slate-600 hover:border-white/20 hover:text-slate-400 cursor-pointer'
            }`}
          >
            {isFlipped(card) ? card.text : '?'}
          </motion.button>
        ))}
      </div>

      {matched.length === PAIRS.length && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="card text-center py-6 space-y-2 border border-green-500/30 bg-green-500/10">
          <p className="text-2xl">🧠</p>
          <p className="font-semibold text-green-400">All pairs matched in {moves} moves!</p>
          <button onClick={reset} className="btn-primary text-sm py-2 mx-auto">Play Again</button>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. ANONYMOUS MOOD POLL
// ─────────────────────────────────────────────────────────────────────────────
const POLL_MOODS = [
  { key: 'great',    emoji: '😄', label: 'Great',    color: 'bg-green-500' },
  { key: 'good',     emoji: '🙂', label: 'Good',     color: 'bg-teal-500' },
  { key: 'okay',     emoji: '😐', label: 'Okay',     color: 'bg-blue-500' },
  { key: 'stressed', emoji: '😰', label: 'Stressed', color: 'bg-orange-500' },
  { key: 'low',      emoji: '😔', label: 'Low',      color: 'bg-purple-500' },
];

function MoodPoll() {
  const [results, setResults] = useState(null);
  const [userVote, setUserVote] = useState(null);
  const [voting, setVoting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    try {
      const { data } = await api.get('/games/poll/results');
      setResults(data);
      setUserVote(data.userVote);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchResults(); }, []);

  const vote = async (mood) => {
    setVoting(true);
    try {
      await api.post('/games/poll/vote', { mood });
      setUserVote(mood);
      await fetchResults();
      toast.success('Vote recorded!');
    } catch { toast.error('Failed to vote'); }
    finally { setVoting(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5 max-w-lg mx-auto">
      <div className="card space-y-4">
        <div>
          <p className="font-semibold text-slate-200">How is the community feeling today?</p>
          <p className="text-xs text-slate-500 mt-1">Anonymous · resets daily · {results?.total || 0} votes so far</p>
        </div>

        {/* Vote buttons */}
        <div className="grid grid-cols-5 gap-2">
          {POLL_MOODS.map(m => (
            <motion.button key={m.key} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => !voting && vote(m.key)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                userVote === m.key
                  ? 'bg-indigo-500/30 border-indigo-500/50'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}>
              <span className="text-2xl">{m.emoji}</span>
              <span className="text-xs text-slate-400">{m.label}</span>
            </motion.button>
          ))}
        </div>

        {userVote && <p className="text-xs text-center text-slate-500">You voted: <span className="text-indigo-400">{POLL_MOODS.find(m => m.key === userVote)?.label}</span></p>}
      </div>

      {/* Results heatmap */}
      {results?.results?.length > 0 && (
        <div className="card space-y-4">
          <p className="text-sm font-medium text-slate-300">Community mood heatmap</p>
          <div className="space-y-3">
            {POLL_MOODS.map(m => {
              const r = results.results.find(x => x.mood === m.key);
              const pct = r?.pct || 0;
              const count = r?.count || 0;
              return (
                <div key={m.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-400">{m.emoji} {m.label}</span>
                    <span className="text-slate-500">{count} votes · {pct}%</span>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${m.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-600 text-center">All votes are anonymous. No personal data is shared.</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. STREAK LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────
function StreakLeaderboard() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/games/leaderboard').then(r => setBoard(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="card border border-yellow-500/20 bg-yellow-500/5 text-center py-4 space-y-1">
        <p className="text-2xl">🏆</p>
        <p className="font-semibold text-yellow-400">Daily Check-in Leaderboard</p>
        <p className="text-xs text-slate-500">Ranked by streak length · No mood data shared</p>
      </div>

      <div className="card space-y-2">
        {board.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-6">No data yet — start logging to appear here!</p>
        ) : (
          board.map((entry, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${
                entry.isYou ? 'bg-indigo-500/15 border-indigo-500/30' : 'bg-white/3 border-white/5'
              }`}>
              <span className="text-xl w-8 text-center">{medals[i] || `${i + 1}`}</span>
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {entry.name} {entry.isYou && <span className="text-xs text-indigo-400">(you)</span>}
                </p>
                <p className="text-xs text-slate-500">Level {entry.level}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-orange-400">{entry.streak}</p>
                <p className="text-xs text-slate-500">day streak</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN GAMES PAGE
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'bubblewrap',   label: 'Bubble Wrap',   emoji: '🫧', category: 'Stress Relief',  component: BubbleWrap },
  { id: 'doodle',       label: 'Doodle',         emoji: '🎨', category: 'Stress Relief',  component: DoodleCanvas },
  { id: 'scramble',     label: 'Word Scramble',  emoji: '✨', category: 'Stress Relief',  component: WordScramble },
  { id: 'quest',        label: 'Mood Quest',     emoji: '⚔️', category: 'Gamified',       component: MoodQuest },
  { id: 'garden',       label: 'Habit Garden',   emoji: '🌱', category: 'Gamified',       component: HabitGarden },
  { id: 'memory',       label: 'Memory Match',   emoji: '🧠', category: 'Gamified',       component: MemoryMatch },
  { id: 'poll',         label: 'Mood Poll',      emoji: '📊', category: 'Social',         component: MoodPoll },
  { id: 'leaderboard',  label: 'Leaderboard',    emoji: '🏆', category: 'Social',         component: StreakLeaderboard },
];

const CATEGORIES = ['All', 'Stress Relief', 'Gamified', 'Social'];

export default function Games() {
  const [activeTab, setActiveTab] = useState('bubblewrap');
  const [filter, setFilter] = useState('All');

  const filtered = filter === 'All' ? TABS : TABS.filter(t => t.category === filter);
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component || BubbleWrap;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gamepad2 size={24} className="text-indigo-400" /> Wellness Games
        </h1>
        <p className="text-slate-400 text-sm mt-1">Play your way to better mental health</p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              filter === cat ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* Game selector grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {filtered.map(tab => (
          <motion.button key={tab.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(tab.id)}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === tab.id
                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                : 'bg-white/3 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'
            }`}>
            <span className="text-2xl block mb-1">{tab.emoji}</span>
            <span className="text-xs font-medium leading-tight block">{tab.label}</span>
            <span className="text-xs text-slate-600 mt-0.5 block">{tab.category}</span>
          </motion.button>
        ))}
      </div>

      {/* Active game */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="card">
          <div className="flex items-center gap-2 mb-5 pb-4 border-b border-white/5">
            <span className="text-xl">{TABS.find(t => t.id === activeTab)?.emoji}</span>
            <h2 className="font-semibold">{TABS.find(t => t.id === activeTab)?.label}</h2>
            <span className="ml-auto text-xs text-slate-600 bg-white/5 px-2 py-0.5 rounded-full">
              {TABS.find(t => t.id === activeTab)?.category}
            </span>
          </div>
          <ActiveComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
