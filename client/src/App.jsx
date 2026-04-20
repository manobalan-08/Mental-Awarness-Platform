import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MoodTracker from './pages/MoodTracker';
import ChatInterface from './pages/ChatInterface';
import InsightsPage from './pages/InsightsPage';
import MicroTools from './pages/MicroTools';
import Journal from './pages/Journal';
import HabitTracker from './pages/HabitTracker';
import WeeklyPlan from './pages/WeeklyPlan';
import Experts from './pages/Experts';
import Layout from './components/Layout';
import Games from './pages/Games';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ style: { background: '#1e1b4b', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' } }} />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="mood" element={<MoodTracker />} />
            <Route path="chat" element={<ChatInterface />} />
            <Route path="insights" element={<InsightsPage />} />
            <Route path="tools" element={<MicroTools />} />
            <Route path="journal" element={<Journal />} />
            <Route path="habits" element={<HabitTracker />} />
            <Route path="plan" element={<WeeklyPlan />} />
            <Route path="experts" element={<Experts />} />
            <Route path="games" element={<Games />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
