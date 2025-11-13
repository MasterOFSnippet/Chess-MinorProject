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
  }
});

module.exports = mongoose.model('Game', gameSchema);