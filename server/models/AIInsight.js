const mongoose = require('mongoose');

const aiInsightSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekStart: Date,
  weekEnd: Date,
  burnoutScore: { type: Number, min: 0, max: 100 },
  burnoutRisk: { type: String, enum: ['low', 'moderate', 'high', 'critical'] },
  weeklyReport: String,
  patterns: [String],
  recommendations: [String],
  alerts: [{ type: String, triggeredAt: Date }],
  aiMentalHealthScore: { type: Number, min: 0, max: 100 },
}, { timestamps: true });

module.exports = mongoose.model('AIInsight', aiInsightSchema);
