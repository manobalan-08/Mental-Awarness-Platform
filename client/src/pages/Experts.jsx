import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Zap, Calendar, MessageCircle, Send, X, Shield, ChevronDown, Search } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const specializations = ['All', 'Anxiety & Stress', 'Depression & Mood', 'Mindfulness & Meditation', 'Work-Life Balance', 'Sleep & Recovery', 'Trauma & Resilience'];

function ExpertCard({ expert, onChat, onBook }) {
  return (
    <motion.div whileHover={{ y: -2 }} className="card hover:border-white/20 transition-all">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-indigo-500/20 flex items-center justify-center text-2xl flex-shrink-0">
          {expert.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-100">{expert.name}</h3>
              <p className="text-xs text-indigo-400 mt-0.5">{expert.specialization}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-semibold text-yellow-400">{expert.rating}</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{expert.bio}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-slate-500">{expert.experience} yrs exp</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${expert.available ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
              {expert.available ? '● Available' : '○ Busy'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onChat(expert)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/30 transition-all text-sm font-medium">
          <MessageCircle size={14} /> Chat
        </button>
        <button onClick={() => onBook(expert)} disabled={!expert.available}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-all text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
          <Calendar size={14} /> Book
        </button>
      </div>
    </motion.div>
  );
}

function ChatModal({ expert, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    api.get(`/experts/${expert._id}/messages`).then(r => setMessages(r.data)).catch(() => {});
  }, [expert._id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const { data } = await api.post(`/experts/${expert._id}/messages`, { content: text, anonymous });
      setMessages(prev => [...prev, data.userMsg, data.expertMsg]);
    } catch { toast.error('Failed to send'); }
    finally { setSending(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ y: 50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 50, scale: 0.95 }}
        className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col" style={{ height: '80vh' }}>

        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-xl">
            {expert.avatar}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">{expert.name}</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-slate-400">{expert.specialization}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAnonymous(!anonymous)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all border ${anonymous ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
              <Shield size={12} /> {anonymous ? 'Anonymous' : 'Visible'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/10 transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-8">
              <p>Start a conversation with {expert.name}</p>
              <p className="text-xs mt-1">Responses are simulated for demo purposes</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            return (
              <div key={i} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-white/10'}`}>
                  {isUser ? '👤' : expert.avatar}
                </div>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${isUser ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white/8 border border-white/10 text-slate-200 rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          {sending && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-sm">{expert.avatar}</div>
              <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                {[0,1,2].map(i => <motion.span key={i} animate={{ y: [0,-4,0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i*0.15 }} className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/10 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={anonymous ? 'Sending anonymously...' : 'Type a message...'}
            className="input-field flex-1 text-sm py-2.5" />
          <button onClick={send} disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 flex items-center justify-center transition-colors">
            <Send size={16} className="text-white" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BookModal({ expert, onClose }) {
  const [form, setForm] = useState({ date: '', time: '10:00', anonymous: false, notes: '' });
  const [saving, setSaving] = useState(false);

  const book = async () => {
    if (!form.date) return toast.error('Select a date');
    setSaving(true);
    try {
      await api.post('/experts/book', { expertId: expert._id, ...form });
      toast.success(`Session booked with ${expert.name}!`);
      onClose();
    } catch { toast.error('Booking failed'); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Book a Session</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-white/10 transition-all"><X size={18} /></button>
        </div>
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
          <span className="text-2xl">{expert.avatar}</span>
          <div>
            <p className="font-medium text-sm">{expert.name}</p>
            <p className="text-xs text-indigo-400">{expert.specialization}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              min={new Date().toISOString().split('T')[0]} className="input-field text-sm" />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Time</label>
            <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className="input-field text-sm" />
          </div>
          <textarea placeholder="Any notes for the expert? (optional)" value={form.notes}
            onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="input-field resize-none text-sm" />
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10">
            <div className="flex items-center gap-2 text-sm text-slate-300"><Shield size={14} className="text-purple-400" /> Anonymous session</div>
            <button onClick={() => setForm(p => ({ ...p, anonymous: !p.anonymous }))}
              className={`w-10 h-5 rounded-full transition-all relative ${form.anonymous ? 'bg-purple-600' : 'bg-white/10'}`}>
              <motion.span animate={{ x: form.anonymous ? 20 : 2 }} className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow" />
            </button>
          </div>
        </div>
        <button onClick={book} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Calendar size={15} />}
          {saving ? 'Booking...' : 'Confirm Booking'}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function Experts() {
  const [experts, setExperts] = useState([]);
  const [matched, setMatched] = useState(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [chatExpert, setChatExpert] = useState(null);
  const [bookExpert, setBookExpert] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [randomLoading, setRandomLoading] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      api.get('/experts'),
      api.get('/experts/match'),
      api.get('/experts/bookings'),
    ]).then(([expRes, matchRes, bookRes]) => {
      if (expRes.status === 'fulfilled') setExperts(expRes.value.data);
      if (matchRes.status === 'fulfilled') setMatched(matchRes.value.data);
      if (bookRes.status === 'fulfilled') setBookings(bookRes.value.data);
    }).finally(() => setLoading(false));
  }, []);

  const connectRandom = async () => {
    setRandomLoading(true);
    try {
      const { data } = await api.get('/experts/random');
      setChatExpert(data);
      toast.success(`Connected with ${data.name}!`);
    } catch { toast.error('No experts available right now'); }
    finally { setRandomLoading(false); }
  };

  const filtered = experts.filter(e => {
    const matchFilter = filter === 'All' || e.specialization === filter;
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.specialization.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expert Connect</h1>
          <p className="text-slate-400 text-sm mt-1">Talk to real mental wellness professionals</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={connectRandom} disabled={randomLoading}
          className="btn-primary flex items-center gap-2 text-sm py-2.5">
          {randomLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Zap size={15} />}
          Connect Now
        </motion.button>
      </div>

      {/* Smart match */}
      {matched?.recommended && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="card border border-indigo-500/30 bg-indigo-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-indigo-400" />
            <span className="text-sm font-semibold text-indigo-300">Smart Match — Based on your data</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-3xl">{matched.recommended.avatar}</span>
            <div className="flex-1">
              <p className="font-semibold">{matched.recommended.name}</p>
              <p className="text-xs text-indigo-400">{matched.recommended.specialization}</p>
              <p className="text-xs text-slate-400 mt-1">Matched based on avg stress {matched.avgStress}/10 · mood {matched.avgMood}/10</p>
            </div>
            <button onClick={() => setChatExpert(matched.recommended)} className="btn-primary text-sm py-2 px-4">Chat Now</button>
          </div>
        </motion.div>
      )}

      {/* Search + filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search experts..." className="input-field pl-9 text-sm py-2.5" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field text-sm py-2.5 w-auto">
          {specializations.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Expert grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(expert => (
          <ExpertCard key={expert._id} expert={expert} onChat={setChatExpert} onBook={setBookExpert} />
        ))}
      </div>

      {/* Bookings */}
      {bookings.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Calendar size={16} className="text-indigo-400" /> Your Bookings</h2>
          <div className="space-y-3">
            {bookings.map((b, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium">{b.expertName}</p>
                  <p className="text-xs text-slate-500">{b.expertSpecialization}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-indigo-400">{b.date} at {b.time}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">{b.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {chatExpert && <ChatModal expert={chatExpert} onClose={() => setChatExpert(null)} />}
        {bookExpert && <BookModal expert={bookExpert} onClose={() => { setBookExpert(null); api.get('/experts/bookings').then(r => setBookings(r.data)).catch(() => {}); }} />}
      </AnimatePresence>
    </div>
  );
}
