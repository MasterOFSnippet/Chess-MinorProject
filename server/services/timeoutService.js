const Game = require('../models/Game');
const User = require('../models/User');
const { updateRatings } = require('../utils/elo');

class TimeoutService {
  constructor(io) {
    this.io = io; // Socket.IO instance
    this.checkInterval = null;
    this.WARNING_TIME = 60000; // 60 seconds
    this.TIMEOUT_DURATION = 90000; // 90 seconds (1.5 minutes)
  }

  /**
   * Start the timeout checker
   * Runs every 10 seconds to check for inactive games
   */
  start() {
    console.log('⏰ Timeout service started');
    
    // Check immediately on start
    this.checkTimeouts();
    
    // Then check every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkTimeouts();
    }, 10000);
  }

  /**
   * Stop the timeout checker
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('⏰ Timeout service stopped');
    }
  }

  /**
   * Main timeout checking logic
   */
  async checkTimeouts() {
    try {
      // Find all active games
      const activeGames = await Game.find({ 
        status: 'active',
        lastMoveTime: { $exists: true }
      })
      .populate('players.white players.black', 'username rating');

      //console.log(`⏰ Checking ${activeGames.length} active games for timeouts`);
      let warningsSent = 0;
      let gamesTimedOut = 0;

      for (const game of activeGames) {
        // Skip bot games (they respond instantly)
        if (game.isBot) continue;

        // Check if warning should be sent
        if (game.shouldWarn(this.WARNING_TIME)) {
          await this.sendWarning(game);
          warningsSent++;
        }

        // Check if game should timeout
        if (game.shouldTimeout(this.TIMEOUT_DURATION)) {
          await this.handleTimeout(game);
          gamesTimedOut++;
        }
      }
      if (warningsSent > 0 || gamesTimedOut > 0) {
      console.log(`⏰ Timeout check complete: ${warningsSent} warnings, ${gamesTimedOut} timeouts`);
      }
    } catch (error) {
      console.error('❌ Timeout check error:', error);
    }
  }

  /**
   * Send warning to inactive player
   */
  async sendWarning(game) {
    try {
      const currentPlayer = game.currentTurn;
      
      // Mark as warned
      game.timeoutWarnings[currentPlayer] = true;
      await game.save();

      // Calculate remaining time
      const timeSinceLastMove = Date.now() - game.lastMoveTime;
      const remainingTime = Math.max(0, this.TIMEOUT_DURATION - timeSinceLastMove);

      // Send Socket.IO warning to game room
      this.io.to(game._id.toString()).emit('game:timeout-warning', {
        currentPlayer,
        remainingTime,
        message: `⚠️ ${currentPlayer.toUpperCase()} has ${Math.ceil(remainingTime / 1000)} seconds to move or will lose by timeout!`
      });

      console.log(`⚠️ Timeout warning sent for game ${game._id} (${currentPlayer})`);
    } catch (error) {
      console.error('❌ Warning send error:', error);
    }
  }

  /**
   * Handle game timeout - award win to opponent
   */
  async handleTimeout(game) {
    try {
      const abandonedPlayer = game.currentTurn; // Player whose turn it is
      const winningPlayer = abandonedPlayer === 'white' ? 'black' : 'white';

      console.log(`⏰ Game ${game._id} timed out - ${abandonedPlayer} abandoned`);

      // Determine winner and loser IDs
      const winnerId = game.players[winningPlayer]._id;
      const loserId = game.players[abandonedPlayer]._id;

      // Update game status
      game.status = 'completed';
      game.result = winningPlayer === 'white' ? '1-0' : '0-1';
      game.winner = winnerId;
      game.abandonedBy = abandonedPlayer;
      game.endedAt = new Date();

      // Calculate ELO changes
      const ratingChanges = updateRatings(
        game.players.white.rating,
        game.players.black.rating,
        game.result
      );

      // Update winner stats
      await User.findByIdAndUpdate(winnerId, {
        $inc: {
          wins: 1,
          gamesPlayed: 1
        },
        $set: {
          rating: winningPlayer === 'white' 
            ? ratingChanges.whiteRating 
            : ratingChanges.blackRating
        }
      });

      // Update loser stats (with abandonment penalty)
      const loserRating = abandonedPlayer === 'white' 
        ? ratingChanges.whiteRating 
        : ratingChanges.blackRating;

      await User.findByIdAndUpdate(loserId, {
        $inc: {
          losses: 1,
          gamesPlayed: 1
        },
        $set: {
          rating: Math.max(100, loserRating - 10) // Extra -10 penalty for abandoning
        }
      });

      await game.save();

      // Notify all players in game room via Socket.IO
      this.io.to(game._id.toString()).emit('game:timeout', {
        gameId: game._id,
        abandonedPlayer,
        winner: winningPlayer,
        message: `⏰ ${abandonedPlayer.toUpperCase()} ran out of time! ${winningPlayer.toUpperCase()} wins!`,
        game: {
          status: game.status,
          result: game.result,
          winner: game.winner,
          endedAt: game.endedAt
        }
      });

      console.log(`✅ Game ${game._id} ended by timeout - ${winningPlayer} wins`);
    } catch (error) {
      console.error('❌ Timeout handling error:', error);
    }
  }
}

module.exports = TimeoutService;