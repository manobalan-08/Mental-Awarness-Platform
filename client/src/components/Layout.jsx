import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Heart, MessageCircle, BarChart3, Zap,
  LogOut, Brain, BookOpen, CheckSquare, Calendar, Users, Menu, X, Gamepad2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FloatingAI from './FloatingAI';

const navItems = [
  { to: '/app',          icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/app/mood',     icon: Heart,           label: 'Mood' },
  { to: '/app/journal',  icon: BookOpen,        label: 'Journal' },
  { to: '/app/habits',   icon: CheckSquare,     label: 'Habits' },
  { to: '/app/plan',     icon: Calendar,        label: 'Weekly Plan' },
  { to: '/app/chat',     icon: MessageCircle,   label: 'AI Chat' },
  { to: '/app/insights', icon: BarChart3,       label: 'Insights' },
  { to: '/app/tools',    icon: Zap,             label: 'Tools' },
  { to: '/app/games',    icon: Gamepad2,        label: 'Games' },
  { to: '/app/experts',  icon: Users,           label: 'Experts' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };

  const Sidebar = ({ mobile = false }) => (
    <motion.aside
      initial={mobile ? { x: -280 } : { x: -80, opacity: 0 }}
      animate={mobile ? { x: 0 } : { x: 0, opacity: 1 }}
      className={`flex flex-col border-r border-white/5 z-20 ${
        mobile
          ? 'fixed inset-y-0 left-0 w-72 bg-slate-950/95 backdrop-blur-xl'
          : 'w-20 lg:w-64 glass rounded-none'
      }`}
    >
      {/* Logo */}
      <div className="p-4 lg:p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Brain size={20} className="text-white" />
        </div>
        <span className={`font-bold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent ${mobile ? 'block' : 'hidden lg:block'}`}>
          MindFlow
        </span>
        {mobile && (
          <button onClick={() => setMobileOpen(false)} className="ml-auto text-slate-400 hover:text-slate-200">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 lg:p-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
              ${isActive ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`
            }
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className={`text-sm font-medium ${mobile ? 'block' : 'hidden lg:block'}`}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 lg:p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className={`min-w-0 ${mobile ? 'block' : 'hidden lg:block'}`}>
            <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
            <p className="text-xs text-slate-500">Level {user?.mentalProfile?.level || 1} · {user?.mentalProfile?.streak || 0} day streak</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm">
          <LogOut size={16} />
          <span className={mobile ? 'block' : 'hidden lg:block'}>Logout</span>
        </button>
      </div>
    </motion.aside>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/50 z-10 md:hidden" />
            <Sidebar mobile />
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 p-4 border-b border-white/5 sticky top-0 bg-slate-950/80 backdrop-blur-xl z-10">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-slate-200">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Brain size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">MindFlow</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-4 lg:p-8 min-h-full"
        >
          <Outlet />
        </motion.div>
      </main>

      <FloatingAI />
    </div>
  );
}
