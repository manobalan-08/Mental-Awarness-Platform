import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Brain, Shield, Zap, TrendingUp, MessageCircle, Heart } from 'lucide-react';

const features = [
  { icon: Brain, title: 'Emotional Pattern AI', desc: 'Detects burnout trends and hidden emotional decline before they escalate.' },
  { icon: MessageCircle, title: 'Emotional Memory Chatbot', desc: 'Aria remembers your history and responds with genuine empathy.' },
  { icon: TrendingUp, title: 'Predictive Alerts', desc: 'Get warned before entering a stress cycle — not after.' },
  { icon: Zap, title: 'Micro-Interventions', desc: '30-second breathing, grounding, and focus resets triggered automatically.' },
  { icon: Heart, title: 'Adaptive Recommendations', desc: 'Learns what works for you and personalizes suggestions over time.' },
  { icon: Shield, title: 'Privacy First', desc: 'End-to-end encrypted. Your mental health data stays yours.' },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">MindFlow</span>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/login')} className="btn-ghost text-sm py-2 px-4">Sign In</button>
          <button onClick={() => navigate('/register')} className="btn-primary text-sm py-2 px-4">Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 pt-20 pb-32 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-sm font-medium mb-6">
            AI-Powered Mental Wellness
          </span>
          <h1 className="text-5xl lg:text-7xl font-bold leading-tight mb-6">
            Your personal{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI therapist
            </span>
            {' '}& emotional companion
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            MindFlow goes beyond mood tracking. It understands your patterns, predicts stress cycles, and intervenes before burnout hits.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/register')}
              className="btn-primary text-lg px-8 py-4"
            >
              Start Your Journey — Free
            </motion.button>
            <button onClick={() => navigate('/login')} className="btn-ghost text-lg px-8 py-4">
              Sign In
            </button>
          </div>
        </motion.div>

        {/* Floating orbs */}
        <div className="absolute top-40 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-60 right-10 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Features */}
      <section className="px-6 pb-24 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-hover p-6 rounded-2xl"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                <Icon size={22} className="text-indigo-400" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass max-w-2xl mx-auto p-12 rounded-3xl"
        >
          <h2 className="text-3xl font-bold mb-4">Ready to understand yourself better?</h2>
          <p className="text-slate-400 mb-8">Join thousands building healthier mental habits with AI guidance.</p>
          <button onClick={() => navigate('/register')} className="btn-primary text-lg px-10 py-4">
            Get Started Free
          </button>
        </motion.div>
      </section>
    </div>
  );
}
