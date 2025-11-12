/**
 * Message Model
 * Stores chat messages for each game
 * 
 * Design Decision:
 * - Store messages in separate collection (not embedded in Game)
 * - Why? Keeps Game model lean, allows efficient pagination of chat history
 * - TTL Index: Auto-delete old messages after 30 days to save space
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true,
    index: true // Index for fast queries by game
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
    // Denormalized for performance - avoid extra User lookups
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // Index for sorting by time
  }
});

// Compound index for efficient game-specific message queries
messageSchema.index({ gameId: 1, timestamp: -1 });

// TTL index - auto-delete messages older than 30 days
// Why? Chat history doesn't need to be stored forever
messageSchema.index({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

module.exports = mongoose.model('Message', messageSchema);