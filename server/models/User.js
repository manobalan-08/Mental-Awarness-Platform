const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  preferences: {
    theme: { type: String, default: 'dark' },
    notifications: { type: Boolean, default: true },
    anonymousMode: { type: Boolean, default: false },
  },
  mentalProfile: {
    personalityType: String,
    stressors: [String],
    copingStrategies: [String],
    aiScore: { type: Number, default: 50 },
    level: { type: Number, default: 1 },
    xp: { type: Number, default: 0 },
    badges: [String],
    streak: { type: Number, default: 0 },
    lastLogDate: Date,
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
