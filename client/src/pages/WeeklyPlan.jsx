import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Sparkles, RefreshCw, CheckCircle, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const dayEmojis = { Monday: '🌅', Tuesday: '💪', Wednesday: '🧘', Thursday: '🎯', Friday: '🌟', Saturday: '🌿', Sunday: '💤' };

export default function WeeklyPlan() {
  const [plan, setPlan] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState(days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);

  useEffect(() => {
    api.get('/plans/latest').then(r => setPlan(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/plans/generate');
      setPlan(data);
      toast.success('7-day plan generated!');
    } catch { toast.error('Failed to generate plan'); }
    finally { setGenerating(false); }
  };

  const toggleTask = async (day, taskIndex, done) => {
    if (!plan) return;
    try {
      const { data } = await api.patch(`/plans/${plan._id}/progress`, { day, taskIndex, done });
      setPlan(data);
    } catch {}
  };

  const totalTasks = plan ? days.reduce((s, d) => s + (plan.plan[d]?.length || 0), 0) : 0;
  const doneTasks = plan ? days.reduce((s, d) => {
    const dayProgress = plan.progress?.[d] || {};
    return s + Object.values(dayProgress).filter(Boolean).length;
  }, 0) : 0;
  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">7-Day Wellness Plan</h1>
          <p className="text-slate-400 text-sm mt-1">Personalized daily tasks based on your habits and mood</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={generate} disabled={generating}
          className="btn-primary flex items-center gap-2 text-sm py-2.5">
          {generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {generating ? 'Generating...' : plan ? 'Regenerate' : 'Generate Plan'}
        </motion.button>
      </div>

      {!plan ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center py-14 space-y-4">
          <Calendar size={48} className="text-indigo-400 mx-auto" />
          <h2 className="font-semibold text-lg">No plan yet</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">Generate your first personalized 7-day plan. It adapts to your mood logs and habit data.</p>
          <button onClick={generate} disabled={generating} className="btn-primary mx-auto flex items-center gap-2">
            {generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {generating ? 'Generating...' : 'Generate My Plan'}
          </button>
        </motion.div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="card space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Weekly Progress</span>
              <span className="font-semibold text-indigo-400">{doneTasks}/{totalTasks} tasks</span>
            </div>
            <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>{pct}% complete</span>
              <span>Generated {new Date(plan.createdAt).toLocaleDateString()}</span>
            </div>
            {plan.weaknesses?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-slate-500">Focus areas:</span>
                {plan.weaknesses.map(w => (
                  <span key={w} className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-xs text-indigo-300 capitalize">{w}</span>
                ))}
              </div>
            )}
          </div>

          {/* Day cards */}
          <div className="space-y-3">
            {days.map((day) => {
              const tasks = plan.plan?.[day] || [];
              const dayProgress = plan.progress?.[day] || {};
              const dayDone = Object.values(dayProgress).filter(Boolean).length;
              const isExpanded = expandedDay === day;
              const isToday = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === day;

              return (
                <motion.div key={day} layout className={`card border transition-all ${isToday ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-white/10'}`}>
                  <button onClick={() => setExpandedDay(isExpanded ? null : day)} className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{dayEmojis[day]}</span>
                      <div className="text-left">
                        <p className="font-medium text-sm flex items-center gap-2">
                          {day}
                          {isToday && <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-xs">Today</span>}
                        </p>
                        <p className="text-xs text-slate-500">{dayDone}/{tasks.length} done</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: tasks.length ? `${(dayDone / tasks.length) * 100}%` : '0%' }} />
                      </div>
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-4 space-y-2">
                          {tasks.map((task, i) => {
                            const done = dayProgress[i] === true;
                            return (
                              <motion.button key={i} whileHover={{ x: 2 }}
                                onClick={() => toggleTask(day, i, !done)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${done ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-white/10 hover:border-white/20'}`}>
                                {done
                                  ? <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                                  : <Circle size={18} className="text-slate-500 flex-shrink-0" />}
                                <span className={`text-sm ${done ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task}</span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
