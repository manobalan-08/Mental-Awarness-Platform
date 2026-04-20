const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  interventionType: { type: String, required: true }, // 'breathing', 'grounding', 'suggestion'
  interventionId: String,
  helpful: Boolean,
  effectivenessScore: { type: Number, min: 1, max: 5 },
  note: String,
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Feedback', feedbackSchema);
