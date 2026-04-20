import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Zap,
  Heart, Star, Flame, Brain, ChevronRight, Bell
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const moodEmojis = ['😔', '😟', '😐', '🙂', '😊', '😄', '🤩'];

function BurnoutMeter({ score }) {
  const color = score > 75 ? '#ef4444' : score > 55 ? '#f97316' : score > 35 ? '#eab308' : '#22c55e';
  const label = score > 75 ? 'Critical' : score > 55 ? 'High' : score > 35 ? 'Moderate' : 'Low';
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Burnout Risk</span>
        <span style={{ color }} className="font-semibold">{label}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, #22c55e, ${color})` }}
        />
      </div>
      <p className="text-xs text-slate-500">{score}/100</p>
    </div>
  );
}

function MoodQuickLog({ onLogged }) {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const log = async (mood) => {
    setSelected(mood);
    setLoading(true);
    try {
      await api.post('/mood', { mood, stressLevel: Math.max(1, 10 - mood), note: '' });
      toast.success('Mood logged!');
      onLogged();
    } catch {
      toast.error('Failed to log mood');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <p className="text-sm text-slate-400 mb-3">How are you feeling right now?</p>
      <div className="flex gap-2 flex-wrap">
        {moodEmojis.map((emoji, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => log(i + 1)}
            disabled={loading}
            className={`text-2xl p-2 rounded-xl transition-all ${selected === i + 1 ? 'bg-indigo-500/30 ring-2 ring-indigo-500' : 'hover:bg-white/10'}`}
          >
            {emoji}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [moodData, setMoodData] = useState([]);
  const [trend, setTrend] = useState(null);
  const [insight, setInsight] = useState(null);
  const [contextSuggestion, setContextSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [moodsRes, trendRes, insightRes, ctxRes] = await Promise.allSettled([
        api.get('/mood?days=14'),
        api.get('/mood/trend'),
        api.get('/insights/latest'),
        api.get('/behavior/context-suggestion'),
      ]);
      if (moodsRes.status === 'fulfilled') {
        const logs = moodsRes.value.data.slice(0, 14).reverse();
        setMoodData(logs.map(l => ({
          date: new Date(l.timestamp).toLocaleDateString('en', { weekday: 'short' }),
          mood: l.mood,
          stress: l.stressLevel,
        })));
      }
      if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data);
      if (insightRes.status === 'fulfilled') setInsight(insightRes.value.data);
      if (ctxRes.status === 'fulfilled') setContextSuggestion(ctxRes.value.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const TrendIcon = trend?.trend === 'improving' ? TrendingUp : trend?.trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend?.trend === 'improving' ? 'text-green-400' : trend?.trend === 'declining' ? 'text-red-400' : 'text-yellow-400';

  const alertColor = contextSuggestion?.alertType === 'warning' ? 'border-orange-500/40 bg-orange-500/10'
    : contextSuggestion?.alertType === 'success' ? 'border-green-500/40 bg-green-500/10'
    : 'border-indigo-500/40 bg-indigo-500/10';

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {user?.name?.split(' ')[0]}
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Here's your mental wellness overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-2">
            <Flame size={16} className="text-orange-400" />
            <span className="text-sm font-semibold">{user?.mentalProfile?.streak || 0} day streak</span>
          </div>
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-2">
            <Star size={16} className="text-yellow-400" />
            <span className="text-sm font-semibold">Lv {user?.mentalProfile?.level || 1}</span>
          </div>
        </div>
      </div>

      {/* Quick mood log */}
      <MoodQuickLog onLogged={fetchData} />

      {/* Context suggestion alert */}
      {contextSuggestion?.suggestion && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`card border ${alertColor} flex items-start gap-3`}
        >
          <Bell size={18} className="text-indigo-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-200">Context-Aware Suggestion</p>
            <p className="text-sm text-slate-400 mt-1">{contextSuggestion.suggestion}</p>
          </div>
        </motion.div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Mood', value: trend?.avgMood ? `${trend.avgMood}/10` : '—', icon: Heart, color: 'text-pink-400' },
          { label: 'Avg Stress', value: trend?.avgStress ? `${trend.avgStress}/10` : '—', icon: AlertTriangle, color: 'text-orange-400' },
          { label: 'Mood Trend', value: trend?.trend || '—', icon: TrendIcon, color: trendColor },
          { label: 'AI Score', value: insight?.aiMentalHealthScore ? `${insight.aiMentalHealthScore}` : '—', icon: Brain, color: 'text-indigo-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div key={label} whileHover={{ y: -2 }} className="card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
              <Icon size={16} className={color} />
            </div>
            <p className={`text-2xl font-bold capitalize ${color}`}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Chart + Burnout */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Mood Trend (14 days)</h2>
            <button onClick={() => navigate('/app/insights')} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Full report <ChevronRight size={12} />
            </button>
          </div>
          {moodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={moodData}>
                <defs>
                  <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[1, 10]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Area type="monotone" dataKey="mood" stroke="#6366f1" strokeWidth={2} fill="url(#moodGrad)" dot={{ fill: '#6366f1', r: 3 }} />
                <Line type="monotone" dataKey="stress" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-500 text-sm">
              Log your mood daily to see trends here
            </div>
          )}
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-0.5 bg-indigo-500 inline-block rounded" /> Mood</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-0.5 bg-orange-500 inline-block rounded border-dashed" /> Stress</span>
          </div>
        </div>

        <div className="card space-y-6">
          <h2 className="font-semibold">Wellness Indicators</h2>
          {trend ? (
            <>
              <BurnoutMeter score={insight?.burnoutScore || (trend.avgStress > 7 ? 70 : trend.avgStress > 5 ? 45 : 20)} />
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Mental Health Score</span>
                  <span className="text-indigo-400 font-semibold">{insight?.aiMentalHealthScore ?? '—'}/100</span>
                </div>
                {insight?.aiMentalHealthScore && (
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${insight.aiMentalHealthScore}%` }}
                      transition={{ duration: 1 }}
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-slate-500 text-sm">Log mood for 3+ days to unlock indicators</p>
          )}
          <button onClick={() => navigate('/app/mood')} className="btn-primary w-full text-sm py-2.5 flex items-center justify-center gap-2">
            <Heart size={15} /> Log Detailed Mood
          </button>
        </div>
      </div>

      {/* AI Insight preview */}
      {insight?.weeklyReport && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card border border-indigo-500/20">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-indigo-400" />
            <h2 className="font-semibold text-sm">Latest AI Insight</h2>
            <span className="ml-auto text-xs text-slate-500">{new Date(insight.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{insight.weeklyReport}</p>
          <button onClick={() => navigate('/app/insights')} className="text-indigo-400 text-xs mt-3 hover:text-indigo-300 flex items-center gap-1">
            Read full report <ChevronRight size={12} />
          </button>
        </motion.div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'AI Chat', desc: 'Talk to Aria', icon: Brain, path: '/app/chat', color: 'from-indigo-500 to-purple-600' },
          { label: 'Micro Tools', desc: 'Quick relief', icon: Zap, path: '/app/tools', color: 'from-purple-500 to-pink-600' },
          { label: 'Insights', desc: 'Weekly report', icon: TrendingUp, path: '/app/insights', color: 'from-blue-500 to-indigo-600' },
          { label: 'Mood Log', desc: 'Detailed entry', icon: Heart, path: '/app/mood', color: 'from-pink-500 to-rose-600' },
        ].map(({ label, desc, icon: Icon, path, color }) => (
          <motion.button
            key={label}
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(path)}
            className="card text-left hover:border-white/20 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
              <Icon size={18} className="text-white" />
            </div>
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
