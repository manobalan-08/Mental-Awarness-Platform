import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FloatingAI() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 glass p-5 w-72 rounded-2xl shadow-2xl"
          >
            <p className="text-sm font-semibold text-indigo-300 mb-1">Aria — Your AI Companion</p>
            <p className="text-slate-400 text-sm mb-4">How are you feeling right now? I'm here to listen.</p>
            <button
              onClick={() => { navigate('/app/chat'); setOpen(false); }}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2"
            >
              <Send size={14} /> Open Full Chat
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-pulse-slow"
      >
        {open ? <X size={22} className="text-white" /> : <MessageCircle size={22} className="text-white" />}
      </motion.button>
    </div>
  );
}
