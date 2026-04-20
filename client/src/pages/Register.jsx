import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! Welcome to MindFlow.');
      navigate('/app');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass w-full max-w-md p-8 rounded-3xl"
      >
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain size={18} className="text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">MindFlow</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">Start your journey</h1>
        <p className="text-slate-400 text-sm mb-8">Create your free account — no credit card needed</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Your name" required className="input-field"
            value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <input type="email" placeholder="Email address" required className="input-field"
            value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <input type="password" placeholder="Password (min 6 chars)" required className="input-field"
            value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
