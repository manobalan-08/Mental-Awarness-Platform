import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, CheckCircle, ChevronDown, ChevronUp, Moon, Monitor, BookOpen, AlertTriangle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';

const moods = [
  { score: 1, emoji: '😔', label: 'Very Low' },
  { score: 2, emoji: '😟', label: 'Low' },
  { score: 3, emoji: '😕', label: 'Meh' },
  { score: 4, emoji: '😐', label: 'Okay' },
  { score: 5, emoji: '🙂', label: 'Decent' },
  { score: 6, emoji: '😊', label: 'Good' },
  { score: 7, emoji: '😄', label: 'Great' },
  { score: 8, emoji: '🤩', label: 'Amazing' },
  { score: 9, emoji: '🥳', label: 'Fantastic' },
  { score: 10, emoji: '🌟', label: 'Perfect' },
];

const tags = ['Anxious', 'Tired', 'Focused', 'Overwhelmed', 'Grateful', 'Lonely', 'Motivated', 'Calm', 'Irritable', 'Happy'];

export default function MoodTracker() {
  const [step, setStep] = useState(1); // 1=mood, 2=context, 3=done
  const [form, setForm] = useState({
    mood: null, stressLevel: 5, note: '', tags: [],
    sleepHours: 7, screenTime: 4, studyWorkHours: 6,
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [anomaly, setAnomaly] = useState(null);

  useEffect(() => {
    api.get('/mood?days=14').then(r => setLogs(r.data.slice(0, 14).reverse())).catch(() => {});
  }, []);

  const toggleTag = (tag) => {
    setForm(p => ({
      ...p,
      tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag],
    }));
  };

  const submit = async () => {
    if (!form.mood) return toast.error('Please select a mood');
    setLoading(true);
    try {
      const { data } = await api.post('/mood', {
        mood: form.mood,
        stressLevel: form.stressLevel,
        note: form.note,
        tags: form.tags,
      });
      await api.post('/behavior', {
        sleepHours: form.sleepHours,
        screenTime: form.screenTime,
        studyWorkHours: form.studyWorkHours,
      });

      if (data.anomaly) setAnomaly(data.anomaly);

      toast.success('Logged! +10 XP earned');
      setStep(3);
      const r = await api.get('/mood?days=14');
      setLogs(r.data.slice(0, 14).reverse());
    } catch {
      toast.error('Failed to save. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = logs.map(l => ({
    date: new Date(l.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    mood: l.mood,
    stress: l.stressLevel,
  }));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Mood Tracker</h1>
        <p className="text-slate-400 text-sm mt-1">Log how you're feeling — takes under a minute</p>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card space-y-6">
            <div>
              <p className="text-sm font-medium text-slate-300 mb-4">How's your mood right now?</p>
              <div className="grid grid-cols-5 gap-2">
                {moods.map(({ score, emoji, label }) => (
                  <motion.button
                    key={score}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setForm(p => ({ ...p, mood: score }))}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                      form.mood === score ? 'bg-indigo-500/30 ring-2 ring-indigo-500' : 'hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs text-slate-400">{label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Stress Level</span>
                <span className="font-semibold text-orange-400">{form.stressLevel}/10</span>
              </div>
              <input
                type="range" min="1" max="10" value={form.stressLevel}
                onChange={e => setForm(p => ({ ...p, stressLevel: +e.target.value }))}
                className="w-full accent-orange-500"
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>Relaxed</span><span>Overwhelmed</span>
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-400 mb-2">How are you feeling? (pick all that apply)</p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      form.tags.includes(tag) ? 'bg-indigo-500/40 text-indigo-300 border border-indigo-500/50' : 'bg-white/5 text-slate-400 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              placeholder="Any thoughts you want to capture? (optional)"
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              rows={3}
              className="input-field resize-none"
            />

            <button
              onClick={() => form.mood ? setStep(2) : toast.error('Select a mood first')}
              className="btn-primary w-full"
            >
              Next: Log Context →
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card space-y-6">
            <p className="text-sm font-medium text-slate-300">Help the AI understand your context today</p>

            {[
              { key: 'sleepHours', label: 'Sleep Hours', icon: Moon, min: 0, max: 12, unit: 'hrs', color: 'accent-blue-500' },
              { key: 'screenTime', label: 'Screen Time', icon: Monitor, min: 0, max: 16, unit: 'hrs', color: 'accent-purple-500' },
              { key: 'studyWorkHours', label: 'Study / Work', icon: BookOpen, min: 0, max: 16, unit: 'hrs', color: 'accent-indigo-500' },
            ].map(({ key, label, icon: Icon, min, max, unit, color }) => (
              <div key={key}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-slate-400"><Icon size={14} />{label}</span>
                  <span className="font-semibold text-slate-200">{form[key]} {unit}</span>
                </div>
                <input
                  type="range" min={min} max={max} value={form[key]}
                  onChange={e => setForm(p => ({ ...p, [key]: +e.target.value }))}
                  className={`w-full ${color}`}
                />
              </div>
            ))}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="btn-ghost flex-1">← Back</button>
              <button onClick={submit} disabled={loading} className="btn-primary flex-1">
                {loading ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card text-center space-y-4 py-10">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <CheckCircle size={56} className="text-green-400 mx-auto" />
            </motion.div>
            <h2 className="text-xl font-bold">Entry saved!</h2>
            <p className="text-slate-400 text-sm">Your mood and context have been logged. Keep the streak going!</p>

            {/* Anomaly alert */}
            {anomaly && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`mx-auto max-w-sm rounded-xl p-4 border text-left space-y-2 ${
                  anomaly.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                  anomaly.severity === 'high'     ? 'bg-orange-500/10 border-orange-500/30' :
                                                    'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className={
                    anomaly.severity === 'critical' ? 'text-red-400' :
                    anomaly.severity === 'high'     ? 'text-orange-400' : 'text-yellow-400'
                  } />
                  <span className={`text-xs font-semibold uppercase tracking-wide ${
                    anomaly.severity === 'critical' ? 'text-red-400' :
                    anomaly.severity === 'high'     ? 'text-orange-400' : 'text-yellow-400'
                  }`}>Pattern Alert · {anomaly.severity}</span>
                </div>
                {anomaly.alerts.map((alert, i) => (
                  <p key={i} className="text-xs text-slate-300 leading-relaxed">{alert}</p>
                ))}
              </motion.div>
            )}

            <button onClick={() => { setStep(1); setAnomaly(null); setForm({ mood: null, stressLevel: 5, note: '', tags: [], sleepHours: 7, screenTime: 4, studyWorkHours: 6 }); }}
              className="btn-primary mx-auto">
              Log Another
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History chart */}
      {logs.length > 0 && (
        <div className="card">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-sm font-medium"
          >
            <span className="flex items-center gap-2"><Heart size={15} className="text-pink-400" /> Mood History (14 days)</span>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="moodG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[1, 10]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0', fontSize: 12 }} />
                      <Area type="monotone" dataKey="mood" stroke="#6366f1" strokeWidth={2} fill="url(#moodG)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {[...logs].reverse().map((log, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 text-sm">
                      <span className="text-slate-500">{new Date(log.timestamp).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="text-2xl">{moods[log.mood - 1]?.emoji}</span>
                      <span className="text-slate-400">Stress: <span className="text-orange-400">{log.stressLevel}/10</span></span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
