const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  mentor_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active'
  },
  title: {
    type: String,
    trim: true
  },
  ended_at: {
    type: Date
  }
}, {
  timestamps: true
});

// Ensure only 2 users max per session
sessionSchema.pre('save', function(next) {
  if (this.student_id && this.student_id.equals(this.mentor_id)) {
    return next(new Error('Mentor and student cannot be the same user'));
  }
  next();
});

// Index for performance
sessionSchema.index({ mentor_id: 1 });
sessionSchema.index({ student_id: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);