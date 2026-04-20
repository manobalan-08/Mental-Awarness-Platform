const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  emotion: String, // detected emotion in message
  timestamp: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
