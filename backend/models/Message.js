const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  session_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  message_type: {
    type: String,
    enum: ['text', 'code', 'system'],
    default: 'text'
  }
}, {
  timestamps: { createdAt: 'timestamp' }
});

// Indexes for performance
messageSchema.index({ session_id: 1 });
messageSchema.index({ sender_id: 1 });
messageSchema.index({ timestamp: -1 });
messageSchema.index({ session_id: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);