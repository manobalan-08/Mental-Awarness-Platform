// In-memory data store
const newId = () => require('crypto').randomUUID();

const db = {
  users: [],
  moodLogs: [],
  behaviorData: [],
  aiInsights: [],
  chatMessages: [],
  feedbacks: [],
  journals: [],
  habitLogs: [],
  weeklyPlans: [],
  experts: [],
  bookings: [],
  expertMessages: [],
  pollVotes: [],
  questCompletions: [],
  gameScores: [],
};

// Seed demo experts
db.experts = [
  { _id: 'exp1', name: 'Dr. Sarah Chen',   specialization: 'Anxiety & Stress',         experience: 8,  rating: 4.9, available: true,  bio: 'Cognitive behavioral therapist specializing in anxiety disorders and burnout recovery.',         avatar: '👩‍⚕️' },
  { _id: 'exp2', name: 'Dr. Marcus Reid',  specialization: 'Depression & Mood',         experience: 12, rating: 4.8, available: true,  bio: 'Clinical psychologist with expertise in mood disorders and emotional regulation.',              avatar: '👨‍⚕️' },
  { _id: 'exp3', name: 'Priya Sharma',     specialization: 'Mindfulness & Meditation',  experience: 6,  rating: 4.7, available: true,  bio: 'Certified mindfulness coach helping individuals build sustainable wellness habits.',             avatar: '🧘‍♀️' },
  { _id: 'exp4', name: 'Dr. James Okafor', specialization: 'Work-Life Balance',         experience: 10, rating: 4.8, available: false, bio: 'Occupational therapist focused on burnout prevention and productivity wellness.',                avatar: '👨‍💼' },
  { _id: 'exp5', name: 'Luna Torres',      specialization: 'Sleep & Recovery',          experience: 5,  rating: 4.6, available: true,  bio: 'Sleep health specialist helping clients restore healthy sleep patterns and energy.',             avatar: '🌙' },
  { _id: 'exp6', name: 'Dr. Aisha Patel',  specialization: 'Trauma & Resilience',       experience: 15, rating: 5.0, available: true,  bio: 'Trauma-informed therapist with a focus on post-traumatic growth and resilience building.',      avatar: '💜' },
];

// Safe find — returns [] if collection doesn't exist
const findById   = (col, id)   => (db[col] || []).find(r => r._id === id);
const findOne    = (col, pred) => (db[col] || []).find(pred);
const find       = (col, pred) => pred ? (db[col] || []).filter(pred) : [...(db[col] || [])];
const insert     = (col, doc)  => { if (!db[col]) db[col] = []; db[col].push(doc); return doc; };
const updateById = (col, id, updates) => {
  if (!db[col]) return null;
  const idx = db[col].findIndex(r => r._id === id);
  if (idx === -1) return null;
  db[col][idx] = { ...db[col][idx], ...updates };
  return db[col][idx];
};
const removeWhere = (col, pred) => { if (db[col]) db[col] = db[col].filter(r => !pred(r)); };

module.exports = { db, newId, findById, findOne, find, insert, updateById, removeWhere };
