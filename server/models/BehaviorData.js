const mongoose = require('mongoose');

const behaviorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sleepHours: { type: Number, min: 0, max: 24 },
  screenTime: { type: Number, min: 0 }, // hours
  studyWorkHours: { type: Number, min: 0 },
  exerciseMinutes: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('BehaviorData', behaviorSchema);
