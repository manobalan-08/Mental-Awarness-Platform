const mongoose = require('mongoose');

const moodLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mood: { type: Number, required: true, min: 1, max: 10 }, // 1=very bad, 10=excellent
  stressLevel: { type: Number, required: true, min: 1, max: 10 },
  emotions: [String], // ['anxious', 'tired', 'hopeful']
  note: { type: String, maxlength: 500 },
  triggers: [String],
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('MoodLog', moodLogSchema);
