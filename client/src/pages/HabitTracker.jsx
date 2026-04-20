import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon, Dumbbell, Droplets, Monitor, Brain, BookOpen, Users, CheckCircle, Download, TrendingUp, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import toast from 'react-hot-toast';

const habits = [
  { key: 'sleepHours',       label: 'Sleep',           icon: Moon,      type: 'slider', min: 0, max: 12, unit: 'hrs',     color: '#6366f1' },
  { key: 'exercise',         label: 'Exercise',        icon: Dumbbell,  type: 'slider', min: 0, max: 120, unit: 'min',    color: '#22c55e' },
  { key: 'waterIntake',      label: 'Water Intake',    icon: Droplets,  type: 'slider', min: 0, max: 12, unit: 'glasses', color: '#06b6d4' },
  { key: 'screenTime',       label: 'Screen Time',     icon: Monitor,   type: 'slider', min: 0, max: 16, unit: 'hrs',     color: '#f97316' },
  { key: 'studyWorkHours',   label: 'Study / Work',    icon: BookOpen,  type: 'slider', min: 0, max: 16, unit: 'hrs',     color: '#8b5cf6' },
  { key: 'meditation',       label: 'Meditation',      icon: Brain,     type: 'toggle', color: '#a78bfa' },
  { key: 'socialInteraction',label: 'Social Time',     icon: Users,     type: 'toggle', color: '#f472b6' },
];

const defaultForm = { sleepHours: 7, exercise: 0, waterIntake: 6, screenTime: 4, studyWorkHours: 6, meditation: false, socialInteraction: false, notes: '' };

export default function HabitTracker() {
  const [form, setForm] = useState(defaultForm);
  const [logs, setLogs] = useState([]);
  const [correlations, setCorrelations] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState('log'); // log | history | insights

  useEffect(() => {
    api.get('/habits?days=14').then(r => setLogs(r.data)).catch(() => {});
    api.get('/habits/correlations').then(r => setCorrelations(r.data)).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/habits', form);
      toast.success('Habits logged! +5 XP');
      setSaved(true);
      setForm(defaultForm);
      const [logsRes, corrRes] = await Promise.allSettled([api.get('/habits?days=14'), api.get('/habits/correlations')]);
      if (logsRes.status === 'fulfilled') setLogs(logsRes.value.data);
      if (corrRes.status === 'fulfilled') setCorrelations(corrRes.value.data);
      setTimeout(() => setSaved(false), 3000);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleExport = () => {
    window.open('/api/habits/export/csv', '_blank');
  };

  const chartData = logs.slice(0, 7).reverse().map(l => ({
    date: new Date(l.date).toLocaleDateString('en', { weekday: 'short' }),
    Sleep: l.sleepHours,
    Exercise: Math.round(l.exercise / 10),
    Screen: l.screenTime,
    Work: l.studyWorkHours,
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Habit Tracker</h1>
          <p className="text-slate-400 text-sm mt-1">Log daily habits — correlate with your emotional wellbeing</p>
        </div>
        <button onClick={handleExport} className="btn-ghost text-sm py-2 px-4 flex items-center gap-2">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
        {[['log', 'Log Today'], ['history', 'History'], ['insights', 'Insights']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'log' && (
          <motion.div key="log" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {saved ? (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="card text-center py-10 space-y-3">
                <CheckCircle size={48} className="text-green-400 mx-auto" />
                <p className="font-semibold text-lg">Habits logged!</p>
                <p className="text-slate-400 text-sm">Your data is being analysed for patterns.</p>
                <button onClick={() => setSaved(false)} className="btn-primary text-sm py-2">Log Again</button>
              </motion.div>
            ) : (
              <div className="card space-y-5">
                <p className="text-sm font-medium text-slate-300">How did today go?</p>

                {habits.map(({ key, label, icon: Icon, type, min, max, unit, color }) => (
                  <div key={key}>
                    {type === 'slider' ? (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="flex items-center gap-2 text-slate-400"><Icon size={14} style={{ color }} />{label}</span>
                          <span className="font-semibold text-slate-200">{form[key]} {unit}</span>
                        </div>
                        <input type="range" min={min} max={max} value={form[key]}
                          onChange={e => setForm(p => ({ ...p, [key]: +e.target.value }))}
                          className="w-full" style={{ accentColor: color }} />
                        <div className="flex justify-between text-xs text-slate-600 mt-0.5">
                          <span>{min} {unit}</span><span>{max} {unit}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm text-slate-400"><Icon size={14} style={{ color }} />{label}</span>
                        <button onClick={() => setForm(p => ({ ...p, [key]: !p[key] }))}
                          className={`w-12 h-6 rounded-full transition-all relative ${form[key] ? 'bg-indigo-600' : 'bg-white/10'}`}>
                          <motion.span animate={{ x: form[key] ? 24 : 2 }}
                            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                <textarea placeholder="Any notes about today? (optional)" value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} className="input-field resize-none text-sm" />

                <button onClick={handleSave} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle size={16} />}
                  {saving ? 'Saving...' : 'Save Today\'s Habits'}
                </button>
              </div>
            )}
          </motion.div>
        )}

        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {chartData.length > 0 && (
              <div className="card">
                <h2 className="font-semibold mb-4 flex items-center gap-2"><BarChart2 size={16} className="text-indigo-400" /> 7-Day Overview</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} barGap={2}>
                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="Sleep" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Screen" fill="#f97316" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Work" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {logs.length === 0 ? (
              <div className="card text-center py-10 text-slate-500 text-sm">No habit logs yet. Start logging today!</div>
            ) : (
              <div className="space-y-3">
                {logs.map((log, i) => (
                  <div key={i} className="card">
                    <p className="text-sm font-medium text-slate-300 mb-3">
                      {new Date(log.date).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {[
                        { label: 'Sleep', value: `${log.sleepHours}h`, color: '#6366f1' },
                        { label: 'Exercise', value: `${log.exercise}min`, color: '#22c55e' },
                        { label: 'Water', value: `${log.waterIntake}g`, color: '#06b6d4' },
                        { label: 'Screen', value: `${log.screenTime}h`, color: '#f97316' },
                        { label: 'Work', value: `${log.studyWorkHours}h`, color: '#8b5cf6' },
                        { label: 'Meditated', value: log.meditation ? '✅' : '❌', color: '#a78bfa' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-white/5 rounded-lg p-2 text-center">
                          <p className="text-slate-500">{label}</p>
                          <p className="font-semibold mt-0.5" style={{ color }}>{value}</p>
                        </div>
                      ))}
                    </div>
                    {log.notes && <p className="text-xs text-slate-500 mt-2 italic">"{log.notes}"</p>}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'insights' && (
          <motion.div key="insights" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="card space-y-4">
              <h2 className="font-semibold flex items-center gap-2"><TrendingUp size={16} className="text-indigo-400" /> Habit-Emotion Correlations</h2>
              {correlations?.insights?.length > 0 ? (
                <div className="space-y-3">
                  {correlations.insights.map((insight, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <span className="text-indigo-400 mt-0.5 flex-shrink-0">💡</span>
                      <p className="text-sm text-slate-300">{insight}</p>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">Log habits for 3+ days to see correlations.</p>
              )}
              {correlations && (
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {[
                    { label: 'Avg Sleep', value: `${correlations.avgSleep}h`, color: 'text-indigo-400' },
                    { label: 'Avg Mood', value: `${correlations.avgMood}/10`, color: 'text-green-400' },
                    { label: 'Avg Stress', value: `${correlations.avgStress}/10`, color: 'text-orange-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className={`font-bold text-lg mt-1 ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
