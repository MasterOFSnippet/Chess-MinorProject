/**
 * Feedback Model
 * Stores user feedback and bug reports
 */

const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  // User Info (optional - allows anonymous feedback)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  username: {
    type: String,
    default: 'Anonymous'
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    required: false
  },
  
  // Feedback Content
  type: {
    type: String,
    enum: ['bug', 'feature', 'improvement', 'other'],
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['new', 'in-review', 'resolved', 'wont-fix'],
    default: 'new'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  
  // Metadata for debugging
  metadata: {
    userAgent: String,
    url: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  
  // Admin notes
  adminNotes: {
    type: String,
    default: ''
  },
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Indexes for efficient queries
feedbackSchema.index({ status: 1, createdAt: -1 });
feedbackSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Feedback', feedbackSchema);