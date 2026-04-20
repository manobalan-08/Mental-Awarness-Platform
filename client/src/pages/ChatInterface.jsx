import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Trash2, Brain, User, Loader2, Sparkles } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const quickPrompts = [
  "I'm feeling overwhelmed today",
  "Help me with a breathing exercise",
  "I can't focus on anything",
  "I'm anxious about tomorrow",
  "I need some motivation",
];

function Message({ msg, onFeedback }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-purple-500 to-indigo-600'
      }`}>
        {isUser ? <User size={14} className="text-white" /> : <Brain size={14} className="text-white" />}
      </div>
      <div className={`max-w-[75%] space-y-1 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-white/8 border border-white/10 text-slate-200 rounded-tl-sm'
        }`}>
          {msg.content}
        </div>
        {!isUser && onFeedback && (
          <div className="flex gap-2 px-1">
            <button onClick={() => onFeedback(true)} className="text-xs text-slate-600 hover:text-green-400 transition-colors">👍 Helpful</button>
            <button onClick={() => onFeedback(false)} className="text-xs text-slate-600 hover:text-red-400 transition-colors">👎</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function ChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    api.get('/chat/history')
      .then(r => setMessages(r.data))
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await api.post('/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timestamp: new Date() }]);
    } catch {
      toast.error('Aria is unavailable right now. Check your API key.');
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearHistory = async () => {
    if (!confirm('Clear all chat history?')) return;
    await api.delete('/chat/history');
    setMessages([]);
    toast.success('Chat cleared');
  };

  const handleFeedback = async (helpful) => {
    try {
      await api.post('/feedback', {
        interventionType: 'ai_chat',
        helpful,
        effectivenessScore: helpful ? 8 : 3,
      });
      toast.success(helpful ? 'Glad it helped!' : 'Thanks for the feedback');
    } catch {}
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold">Aria</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-slate-400">Your AI wellness companion</span>
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/10">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {historyLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : messages.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
              <Sparkles size={28} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Hi {user?.name?.split(' ')[0]}, I'm Aria</h2>
              <p className="text-slate-400 text-sm mt-1 max-w-xs">Your personal AI wellness companion. I'm here to listen, support, and guide you.</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {quickPrompts.map(p => (
                <button key={p} onClick={() => send(p)}
                  className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-slate-200 hover:border-indigo-500/40 transition-all">
                  {p}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <Message
                key={i}
                msg={msg}
                onFeedback={msg.role === 'assistant' && i === messages.length - 1 ? handleFeedback : null}
              />
            ))}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Brain size={14} className="text-white" />
                </div>
                <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.span key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                      className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts (when has messages) */}
      {messages.length > 0 && !loading && (
        <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
          {quickPrompts.slice(0, 3).map(p => (
            <button key={p} onClick={() => send(p)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400 hover:text-slate-200 hover:border-indigo-500/40 transition-all">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex gap-3">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Share what's on your mind..."
          className="input-field flex-1"
          disabled={loading}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
        >
          <Send size={18} className="text-white" />
        </motion.button>
      </div>
    </div>
  );
}
