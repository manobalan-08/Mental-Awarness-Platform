import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, Anchor, Focus, Zap, CheckCircle, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const tools = [
  {
    id: 'breathing',
    icon: Wind,
    title: '4-7-8 Breathing',
    desc: 'Calm your nervous system in 30 seconds',
    duration: 32,
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    iconColor: 'text-blue-400',
    phases: [
      { label: 'Inhale', duration: 4, color: '#3b82f6' },
      { label: 'Hold', duration: 7, color: '#8b5cf6' },
      { label: 'Exhale', duration: 8, color: '#06b6d4' },
    ],
  },
  {
    id: 'grounding',
    icon: Anchor,
    title: '5-4-3-2-1 Grounding',
    desc: 'Reconnect with the present moment',
    duration: 60,
    color: 'from-green-500 to-emerald-500',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
    iconColor: 'text-green-400',
    steps: [
      { count: 5, sense: 'things you can SEE', emoji: '👁️' },
      { count: 4, sense: 'things you can TOUCH', emoji: '✋' },
      { count: 3, sense: 'things you can HEAR', emoji: '👂' },
      { count: 2, sense: 'things you can SMELL', emoji: '👃' },
      { count: 1, sense: 'thing you can TASTE', emoji: '👅' },
    ],
  },
  {
    id: 'focus',
    icon: Focus,
    title: 'Focus Reset',
    desc: 'Clear mental fog and regain clarity',
    duration: 45,
    color: 'from-purple-500 to-indigo-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    iconColor: 'text-purple-400',
    steps: [
      { text: 'Close your eyes and take 3 deep breaths', emoji: '😌' },
      { text: 'Name one thing you want to accomplish right now', emoji: '🎯' },
      { text: 'Visualize completing it successfully', emoji: '✨' },
      { text: 'Open your eyes — you\'re ready', emoji: '🚀' },
    ],
  },
];

function BreathingTool({ tool, onComplete }) {
  const [phase, setPhase] = useState(0);
  const [count, setCount] = useState(tool.phases[0].duration);
  const [cycles, setCycles] = useState(0);
  const [done, setDone] = useState(false);
  const totalCycles = 3;

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          setPhase(p => {
            const next = (p + 1) % tool.phases.length;
            if (next === 0) {
              setCycles(cy => {
                if (cy + 1 >= totalCycles) { setDone(true); clearInterval(timer); }
                return cy + 1;
              });
            }
            return next;
          });
          return tool.phases[(phase + 1) % tool.phases.length].duration;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, done]);

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-6">
      <CheckCircle size={48} className="text-green-400 mx-auto" />
      <p className="font-semibold">Breathing complete!</p>
      <p className="text-slate-400 text-sm">Your nervous system is calmer now.</p>
      <button onClick={onComplete} className="btn-primary">Done</button>
    </motion.div>
  );

  const currentPhase = tool.phases[phase];
  const progress = 1 - (count / currentPhase.duration);

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r="60" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
          <motion.circle
            cx="72" cy="72" r="60" fill="none" stroke={currentPhase.color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 60}`}
            animate={{ strokeDashoffset: (1 - progress) * 2 * Math.PI * 60 }}
            transition={{ duration: 0.9, ease: 'linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={phase}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold"
            style={{ color: currentPhase.color }}
          >
            {count}
          </motion.span>
          <span className="text-xs text-slate-400 mt-1">{currentPhase.label}</span>
        </div>
      </div>
      <p className="text-slate-300 font-medium">{currentPhase.label}...</p>
      <p className="text-xs text-slate-500">Cycle {Math.min(cycles + 1, totalCycles)} of {totalCycles}</p>
    </div>
  );
}

function GroundingTool({ tool, onComplete }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [inputs, setInputs] = useState(Array(5).fill(''));
  const [done, setDone] = useState(false);
  const step = tool.steps[stepIdx];

  const next = () => {
    if (stepIdx < tool.steps.length - 1) setStepIdx(s => s + 1);
    else setDone(true);
  };

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-6">
      <CheckCircle size={48} className="text-green-400 mx-auto" />
      <p className="font-semibold">You're grounded!</p>
      <p className="text-slate-400 text-sm">You've reconnected with the present moment.</p>
      <button onClick={onComplete} className="btn-primary">Done</button>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div key={stepIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 py-2">
        <div className="text-center">
          <span className="text-4xl">{step.emoji}</span>
          <p className="mt-3 font-medium">Name <span className="text-green-400 font-bold">{step.count}</span> {step.sense}</p>
        </div>
        <div className="space-y-2">
          {Array.from({ length: step.count }).map((_, i) => (
            <input
              key={i}
              placeholder={`${i + 1}.`}
              value={inputs[stepIdx * 5 + i] || ''}
              onChange={e => {
                const newInputs = [...inputs];
                newInputs[stepIdx * 5 + i] = e.target.value;
                setInputs(newInputs);
              }}
              className="input-field text-sm py-2"
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{stepIdx + 1} / {tool.steps.length}</span>
          <button onClick={next} className="btn-primary text-sm py-2 px-5">
            {stepIdx < tool.steps.length - 1 ? 'Next →' : 'Finish'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function FocusTool({ tool, onComplete }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const step = tool.steps[stepIdx];

  const next = () => {
    if (stepIdx < tool.steps.length - 1) setStepIdx(s => s + 1);
    else setDone(true);
  };

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4 py-6">
      <CheckCircle size={48} className="text-green-400 mx-auto" />
      <p className="font-semibold">Focus reset complete!</p>
      <p className="text-slate-400 text-sm">You're clear and ready to go.</p>
      <button onClick={onComplete} className="btn-primary">Done</button>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div key={stepIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center space-y-6 py-4">
        <span className="text-5xl">{step.emoji}</span>
        <p className="text-slate-200 font-medium text-lg leading-relaxed">{step.text}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Step {stepIdx + 1} of {tool.steps.length}</span>
          <button onClick={next} className="btn-primary text-sm py-2 px-5">
            {stepIdx < tool.steps.length - 1 ? 'Next →' : 'Finish'}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function MicroTools() {
  const [active, setActive] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [completedTool, setCompletedTool] = useState(null);

  const handleComplete = (toolId) => {
    setActive(null);
    setCompletedTool(toolId);
    setShowFeedback(true);
  };

  const submitFeedback = async (helpful) => {
    try {
      await api.post('/feedback', {
        interventionType: completedTool,
        helpful,
        effectivenessScore: helpful ? 8 : 3,
      });
      toast.success(helpful ? 'Great! We\'ll recommend this more.' : 'Thanks — we\'ll adjust your recommendations.');
    } catch {}
    setShowFeedback(false);
    setCompletedTool(null);
  };

  const activeTool = tools.find(t => t.id === active);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Micro-Intervention Tools</h1>
        <p className="text-slate-400 text-sm mt-1">Quick mental resets — under 60 seconds each</p>
      </div>

      {/* Feedback modal */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="card border border-indigo-500/30 text-center space-y-4"
          >
            <p className="font-semibold">Did this help you?</p>
            <p className="text-slate-400 text-sm">Your feedback helps personalize future suggestions</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => submitFeedback(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30 transition-all text-sm font-medium">
                <ThumbsUp size={16} /> Yes, it helped
              </button>
              <button onClick={() => submitFeedback(false)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition-all text-sm font-medium">
                <ThumbsDown size={16} /> Not really
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active tool modal */}
      <AnimatePresence>
        {active && activeTool && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="card border border-white/20"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${activeTool.color} flex items-center justify-center`}>
                  <activeTool.icon size={16} className="text-white" />
                </div>
                <span className="font-semibold">{activeTool.title}</span>
              </div>
              <button onClick={() => setActive(null)} className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-white/10 transition-all">
                <X size={18} />
              </button>
            </div>

            {active === 'breathing' && <BreathingTool tool={activeTool} onComplete={() => handleComplete(active)} />}
            {active === 'grounding' && <GroundingTool tool={activeTool} onComplete={() => handleComplete(active)} />}
            {active === 'focus' && <FocusTool tool={activeTool} onComplete={() => handleComplete(active)} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool cards */}
      {!active && (
        <div className="space-y-4">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`card border ${tool.border} ${tool.bg} hover:border-white/20 transition-all cursor-pointer group`}
              onClick={() => setActive(tool.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                  <tool.icon size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{tool.title}</h3>
                  <p className="text-slate-400 text-sm mt-0.5">{tool.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs text-slate-500">{tool.duration}s</span>
                  <div className="mt-1">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r ${tool.color} text-white font-medium`}
                    >
                      Start
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tips */}
      {!active && (
        <div className="card border border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-start gap-3">
            <Zap size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-indigo-300">When to use these tools</p>
              <ul className="text-xs text-slate-400 mt-2 space-y-1">
                <li>• Breathing — when you feel anxious or panicked</li>
                <li>• Grounding — when you feel disconnected or overwhelmed</li>
                <li>• Focus Reset — when you can't concentrate or feel scattered</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
