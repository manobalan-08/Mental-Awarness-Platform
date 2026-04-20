import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, Trash2, Edit3, Save, X,
  Sparkles, ChevronDown, ChevronUp, Tag
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const moodMeta = {
  joy:       { emoji: '😄', color: 'text-yellow-400',  bg: 'bg-yellow-500/15',  border: 'border-yellow-500/30' },
  calm:      { emoji: '😌', color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/30' },
  motivated: { emoji: '🚀', color: 'text-green-400',   bg: 'bg-green-500/15',   border: 'border-green-500/30' },
  confused:  { emoji: '😕', color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30' },
  tired:     { emoji: '😴', color: 'text-slate-400',   bg: 'bg-slate-500/15',   border: 'border-slate-500/30' },
  anxious:   { emoji: '😰', color: 'text-purple-400',  bg: 'bg-purple-500/15',  border: 'border-purple-500/30' },
  sad:       { emoji: '😢', color: 'text-indigo-400',  bg: 'bg-indigo-500/15',  border: 'border-indigo-500/30' },
  angry:     { emoji: '😤', color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30' },
  neutral:   { emoji: '😐', color: 'text-slate-400',   bg: 'bg-slate-500/15',   border: 'border-slate-500/30' },
};

const suggestedTags = ['Work', 'Family', 'Health', 'Goals', 'Gratitude', 'Relationships', 'Personal', 'Reflection'];

function MoodBadge({ mood }) {
  const meta = moodMeta[mood] || moodMeta.neutral;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.bg} ${meta.border} ${meta.color}`}>
      {meta.emoji} {mood}
    </span>
  );
}

function MoodAnalysisCard({ analysis }) {
  const meta = moodMeta[analysis.detectedMood] || moodMeta.neutral;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 border ${meta.bg} ${meta.border} space-y-2`}
    >
      <div className="flex items-center gap-2">
        <Sparkles size={14} className={meta.color} />
        <span className={`text-sm font-semibold ${meta.color}`}>AI Mood Detection</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-2xl">{meta.emoji}</span>
        <span className="font-bold capitalize text-slate-100">{analysis.detectedMood}</span>
        {analysis.detected?.filter(m => m !== analysis.detectedMood).slice(0, 3).map(m => (
          <MoodBadge key={m} mood={m} />
        ))}
      </div>
      <p className="text-sm text-slate-300 leading-relaxed">{analysis.suggestion}</p>
      <div className="flex gap-4 text-xs text-slate-500 pt-1">
        <span>Mood score: <span className="text-slate-300">{analysis.moodScore}/10</span></span>
        <span>Stress: <span className="text-slate-300">{analysis.stressScore}/10</span></span>
      </div>
    </motion.div>
  );
}

function EntryCard({ entry, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const meta = moodMeta[entry.moodAnalysis?.detectedMood] || moodMeta.neutral;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card hover:border-white/20 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-lg">{meta.emoji}</span>
            <h3 className="font-semibold text-slate-100 truncate">{entry.title}</h3>
            {entry.moodAnalysis?.detectedMood && <MoodBadge mood={entry.moodAnalysis.detectedMood} />}
          </div>
          <p className="text-xs text-slate-500">
            {new Date(entry.createdAt).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(entry)} className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
            <Edit3 size={15} />
          </button>
          <button onClick={() => onDelete(entry._id)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 size={15} />
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all">
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Preview */}
      {!expanded && (
        <p className="text-sm text-slate-400 mt-2 line-clamp-2 leading-relaxed">{entry.content}</p>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-slate-300 mt-3 leading-relaxed whitespace-pre-wrap">{entry.content}</p>

            {entry.moodAnalysis && (
              <div className="mt-4">
                <MoodAnalysisCard analysis={entry.moodAnalysis} />
              </div>
            )}

            {entry.tags?.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-3">
                {entry.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Editor({ initial, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [content, setContent] = useState(initial?.content || '');
  const [tags, setTags] = useState(initial?.tags || []);
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const toggleTag = (tag) => setTags(p => p.includes(tag) ? p.filter(t => t !== tag) : [...p, tag]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <BookOpen size={16} className="text-indigo-400" />
          {initial ? 'Edit Entry' : 'New Journal Entry'}
        </h2>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-white/5 transition-all">
          <X size={18} />
        </button>
      </div>

      <input
        placeholder="Give this entry a title..."
        value={title}
        onChange={e => setTitle(e.target.value)}
        className="input-field text-base font-medium"
      />

      <div className="relative">
        <textarea
          placeholder="What's on your mind? Write freely — the AI will detect your mood as you write..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={8}
          className="input-field resize-none leading-relaxed"
        />
        <span className="absolute bottom-3 right-3 text-xs text-slate-600">{wordCount} words</span>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Tag size={11} /> Add tags</p>
        <div className="flex flex-wrap gap-2">
          {suggestedTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-xs transition-all border ${
                tags.includes(tag)
                  ? 'bg-indigo-500/30 text-indigo-300 border-indigo-500/50'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onCancel} className="btn-ghost flex-1 text-sm py-2.5">Cancel</button>
        <button
          onClick={() => onSave({ title, content, tags })}
          disabled={!content.trim() || saving}
          className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-2"
        >
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
          {saving ? 'Analysing mood...' : 'Save & Analyse'}
        </button>
      </div>
    </motion.div>
  );
}

export default function Journal() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    try {
      const [entriesRes, statsRes] = await Promise.allSettled([
        api.get('/journal'),
        api.get('/journal/stats/mood-summary'),
      ]);
      if (entriesRes.status === 'fulfilled') setEntries(entriesRes.value.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleSave = async ({ title, content, tags }) => {
    setSaving(true);
    try {
      if (editingEntry) {
        await api.patch(`/journal/${editingEntry._id}`, { title, content, tags });
        toast.success('Entry updated');
      } else {
        await api.post('/journal', { title, content, tags });
        toast.success('Entry saved — mood detected!');
      }
      setShowEditor(false);
      setEditingEntry(null);
      fetchEntries();
    } catch {
      toast.error('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    await api.delete(`/journal/${id}`);
    setEntries(prev => prev.filter(e => e._id !== id));
    toast.success('Entry deleted');
    fetchEntries();
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setShowEditor(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Journal</h1>
          <p className="text-slate-400 text-sm mt-1">Write freely — AI detects your mood automatically</p>
        </div>
        {!showEditor && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setEditingEntry(null); setShowEditor(true); }}
            className="btn-primary flex items-center gap-2 text-sm py-2.5"
          >
            <Plus size={16} /> New Entry
          </motion.button>
        )}
      </div>

      {/* Mood summary stats */}
      {stats?.summary?.length > 0 && (
        <div className="card">
          <p className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-400" /> Your Journal Mood Patterns
          </p>
          <div className="flex flex-wrap gap-2">
            {stats.summary.map(({ mood, count, pct }) => {
              const meta = moodMeta[mood] || moodMeta.neutral;
              return (
                <div key={mood} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${meta.bg} ${meta.border}`}>
                  <span>{meta.emoji}</span>
                  <div>
                    <p className={`text-xs font-semibold capitalize ${meta.color}`}>{mood}</p>
                    <p className="text-xs text-slate-500">{count} entries · {pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
          {stats.dominantMood && (
            <p className="text-xs text-slate-500 mt-3">
              Your most frequent journal mood is <span className={`font-medium ${(moodMeta[stats.dominantMood] || moodMeta.neutral).color}`}>{stats.dominantMood}</span> across {stats.totalEntries} entries.
            </p>
          )}
        </div>
      )}

      {/* Editor */}
      <AnimatePresence>
        {showEditor && (
          <Editor
            initial={editingEntry}
            onSave={handleSave}
            onCancel={() => { setShowEditor(false); setEditingEntry(null); }}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {/* Entries list */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 && !showEditor ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card text-center py-14 space-y-3">
          <BookOpen size={40} className="text-indigo-400 mx-auto" />
          <h2 className="font-semibold">Your journal is empty</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">Write your first entry and the AI will detect your mood, give you insights, and track patterns over time.</p>
          <button onClick={() => setShowEditor(true)} className="btn-primary mx-auto flex items-center gap-2 text-sm">
            <Plus size={15} /> Write First Entry
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <EntryCard key={entry._id} entry={entry} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
