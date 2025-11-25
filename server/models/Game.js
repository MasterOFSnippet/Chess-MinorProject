const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  players: {
    white: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        // Only required if it's not a bot game
        return !this.isBot;
      }
    },
    black: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function() {
        // Only required if it's not a bot game
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
    index: true // Index for efficient timeout queries
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

// ADDED METHOD TO CHECK IF GAME SHOULD TIMEOUT
gameSchema.methods.shouldTimeout = function(timeoutDuration = 90000) {
  // 90000ms = 1.5 minutes
  if (this.status !== 'active') return false;
  
  const timeSinceLastMove = Date.now() - this.lastMoveTime;
  return timeSinceLastMove >= timeoutDuration;
};

// ADDED METHOD TO CHECK IF WARNING SHOULD BE SENT
gameSchema.methods.shouldWarn = function(warningTime = 60000) {
  // Warn at 60 seconds (30 seconds before timeout)
  if (this.status !== 'active') return false;
  
  const timeSinceLastMove = Date.now() - this.lastMoveTime;
  const currentPlayer = this.currentTurn;
  const hasBeenWarned = this.timeoutWarnings[currentPlayer];
  
  return timeSinceLastMove >= warningTime && !hasBeenWarned;
};

module.exports = mongoose.model('Game', gameSchema);