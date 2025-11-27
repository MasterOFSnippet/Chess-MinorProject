const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  players: {
    white: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return !this.isBot;
      }
    },
    black: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        return !this.isBot;
      }
    }
  },
  isBot: {
    type: Boolean,
    default: false
  },
  botDifficulty: {
    type: Number,
    default: 10
  },
  moves: [{
    type: String
  }],
  pgn: {
    type: String,
    default: ''
  },
  fen: {
    type: String,
    default: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'completed', 'abandoned'],
    default: 'waiting'
  },
  result: {
    type: String,
    enum: ['1-0', '0-1', '1/2-1/2', 'aborted', 'ongoing'],
    default: 'ongoing'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  currentTurn: {
    type: String,
    enum: ['white', 'black'],
    default: 'white'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  lastMoveTime: {
    type: Date,
    default: Date.now,
    index: true 
  },
  timeoutWarnings: {
    white: {
      type: Boolean,
      default: false
    },
    black: {
      type: Boolean,
      default: false
    }
  },
  abandonedBy: {
    type: String,
    enum: ['white', 'black', null],
    default: null
  }
});

// ============================================
//  PRODUCTION-READY INDEXES
// ============================================

// 1. Query: Find active games by player
// Used by: isUserBusy() in gameController.js
gameSchema.index({ status: 1, 'players.white': 1 });
gameSchema.index({ status: 1, 'players.black': 1 });

// 2. Query: Find all games for a user (getMyGames)
gameSchema.index({ 'players.white': 1, startedAt: -1 });
gameSchema.index({ 'players.black': 1, startedAt: -1 });

// 3. Query: Timeout checker (checks lastMoveTime)
gameSchema.index({ status: 1, lastMoveTime: 1 });

// 4. General status queries
gameSchema.index({ status: 1, startedAt: -1 });

// ============================================
// METHODS
// ============================================
gameSchema.methods.shouldTimeout = function(timeoutDuration = 90000) {
  if (this.status !== 'active') return false;
  
  const timeSinceLastMove = Date.now() - this.lastMoveTime;
  return timeSinceLastMove >= timeoutDuration;
};

gameSchema.methods.shouldWarn = function(warningTime = 60000) {
  if (this.status !== 'active') return false;
  
  const timeSinceLastMove = Date.now() - this.lastMoveTime;
  const currentPlayer = this.currentTurn;
  const hasBeenWarned = this.timeoutWarnings[currentPlayer];
  
  return timeSinceLastMove >= warningTime && !hasBeenWarned;
};

module.exports = mongoose.model('Game', gameSchema);