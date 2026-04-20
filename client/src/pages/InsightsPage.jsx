import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell
} from 'recharts';
import { Brain, TrendingUp, AlertTriangle, Sparkles, RefreshCw, Download, Calendar } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const riskColors = {
  low: { text: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' },
  moderate: { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  high: { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  critical: { text: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
};

function ScoreRing({ score, label, color }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="90" height="90" viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <motion.circle
          cx="45" cy="45" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          transform="rotate(-90 45 45)"
        />
        <text x="45" y="50" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{score}</text>
      </svg>
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

export default function InsightsPage() {
  const [insights, setInsights] = useState([]);
  const [latest, setLatest] = useState(null);
  const [moodLogs, setMoodLogs] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [insightsRes, latestRes, moodsRes] = await Promise.allSettled([
        api.get('/insights'),
        api.get('/insights/latest'),
        api.get('/mood?days=30'),
      ]);
      if (insightsRes.status === 'fulfilled') setInsights(insightsRes.value.data);
      if (latestRes.status === 'fulfilled') setLatest(latestRes.value.data);
      if (moodsRes.status === 'fulfilled') setMoodLogs(moodsRes.value.data.slice(0, 30).reverse());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const generateInsight = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post('/insights/generate');
      if (data.message) {
        toast(data.message, { icon: '📊' });
      } else {
        setLatest(data);
        setInsights(prev => [data, ...prev]);
        toast.success('Weekly report generated!');
      }
    } catch {
      toast.error('Failed to generate. Check OpenAI API key.');
    } finally {
      setGenerating(false);
    }
  };

  const chartData = moodLogs.map(l => ({
    date: new Date(l.timestamp).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    mood: l.mood,
    stress: l.stressLevel,
  }));

  // Weekly averages for bar chart
  const weeklyData = [];
  for (let i = 0; i < Math.min(insights.length, 6); i++) {
    const ins = insights[i];
    weeklyData.unshift({
      week: `W${insights.length - i}`,
      score: ins.aiMentalHealthScore || 0,
      burnout: ins.burnoutScore || 0,
    });
  }

  const risk = latest?.burnoutRisk || 'low';
  const riskStyle = riskColors[risk] || riskColors.low;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Insights & Reports</h1>
          <p className="text-slate-400 text-sm mt-1">AI-generated analysis of your mental wellness patterns</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={generateInsight}
          disabled={generating}
          className="btn-primary flex items-center gap-2 text-sm py-2.5"
        >
          {generating ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
          {generating ? 'Generating...' : 'Generate Report'}
        </motion.button>
      </div>

      {/* Score rings */}
      {latest && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold flex items-center gap-2"><Brain size={16} className="text-indigo-400" /> Latest Report</h2>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Calendar size={12} /> {new Date(latest.createdAt).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          <div className="flex items-center justify-around mb-6">
            <ScoreRing score={latest.aiMentalHealthScore || 0} label="Mental Health Score" color="#6366f1" />
            <ScoreRing score={latest.burnoutScore || 0} label="Burnout Score" color={latest.burnoutScore > 60 ? '#ef4444' : '#f97316'} />
            <div className={`px-4 py-2 rounded-xl border ${riskStyle.bg} ${riskStyle.border} text-center`}>
              <p className="text-xs text-slate-400 mb-1">Burnout Risk</p>
              <p className={`font-bold capitalize text-lg ${riskStyle.text}`}>{risk}</p>
            </div>
          </div>

          {latest.weeklyReport && (
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">{latest.weeklyReport}</p>
            </div>
          )}
        </motion.div>
      )}

      {!latest && (
        <div className="card text-center py-12 space-y-3">
          <Sparkles size={40} className="text-indigo-400 mx-auto" />
          <h2 className="font-semibold">No reports yet</h2>
          <p className="text-slate-400 text-sm">Log your mood for a few days, then generate your first AI report.</p>
        </div>
      )}

      {/* 30-day mood chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-indigo-400" /> 30-Day Mood & Stress</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[1, 10]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0', fontSize: 12 }} />
              <Line type="monotone" dataKey="mood" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="stress" stroke="#f97316" strokeWidth={2} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-0.5 bg-indigo-500 inline-block rounded" /> Mood</span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-0.5 bg-orange-500 inline-block rounded" /> Stress</span>
          </div>
        </div>
      )}

      {/* Weekly progress bar chart */}
      {weeklyData.length > 1 && (
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={16} className="text-orange-400" /> Weekly Score Comparison</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} barGap={4}>
              <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#e2e8f0', fontSize: 12 }} />
              <Bar dataKey="score" fill="#6366f1" radius={[6, 6, 0, 0]} name="Health Score" />
              <Bar dataKey="burnout" fill="#f97316" radius={[6, 6, 0, 0]} name="Burnout Score" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Past reports list */}
      {insights.length > 1 && (
        <div className="card">
          <h2 className="font-semibold mb-4">Past Reports</h2>
          <div className="space-y-3">
            {insights.slice(1).map((ins, i) => {
              const r = ins.burnoutRisk || 'low';
              const s = riskColors[r] || riskColors.low;
              return (
                <div key={i} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{new Date(ins.createdAt).toLocaleDateString('en', { month: 'long', day: 'numeric' })}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{ins.weeklyReport?.slice(0, 80)}...</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-indigo-400 text-sm font-semibold">{ins.aiMentalHealthScore}/100</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${s.bg} ${s.text} border ${s.border}`}>{r}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
