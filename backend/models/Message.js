const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    role: {
      type: String,
      enum: ['mentor', 'student'],
      required: true
    }
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  messageType: {
    type: String,
    enum: ['text', 'system'],
    default: 'text'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
messageSchema.index({ sessionId: 1, timestamp: -1 });

// Index for cleanup (older messages)
messageSchema.index({ createdAt: 1 });

// Virtual for formatted timestamp
messageSchema.virtual('formattedTime').get(function() {
  return this.timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
});

// Ensure virtual fields are serialized
messageSchema.set('toJSON', { virtuals: true });
messageSchema.set('toObject', { virtuals: true });

// Static method to get messages for a session
messageSchema.statics.getSessionMessages = function(sessionId, limit = 50) {
  return this.find({ sessionId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .exec();
};

// Static method to clean old messages (keep last 1000 per session)
messageSchema.statics.cleanupOldMessages = async function(sessionId) {
  const messages = await this.find({ sessionId }).sort({ timestamp: -1 });
  if (messages.length > 1000) {
    const messagesToDelete = messages.slice(1000);
    const idsToDelete = messagesToDelete.map(msg => msg._id);
    await this.deleteMany({ _id: { $in: idsToDelete } });
  }
};

module.exports = mongoose.model('Message', messageSchema);