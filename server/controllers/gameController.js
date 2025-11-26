const Game = require('../models/Game');
const User = require('../models/User');
const { Chess } = require('chess.js');
const { updateRatings } = require('../utils/elo');
const simpleAI = require('../services/simpleAI');

// @desc    Create a game against AI bot
// @route   POST /api/game/create-bot
// @access  Private
exports.createBotGame = async (req, res) => {
  try {
    const isUserWhite = Math.random() < 0.5;

    const game = await Game.create({
      players: {
        white: isUserWhite ? req.user.id : null,
        black: isUserWhite ? null : req.user.id
      },
      isBot: true,
      botDifficulty: Math.max(5, Math.min(20, Math.floor(req.user.rating / 150))),
      status: 'active'
    });

    // ✅ FIX: If bot plays White, make first move immediately
    if (!isUserWhite) {
      const chess = new Chess(game.fen);
      
      // Add realistic thinking delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const botMoveData = simpleAI.getSmartMove(game.fen);
      console.log('🤖 Bot opening move:', botMoveData);
      
      if (botMoveData) {
        let move;
        try {
          move = chess.move(botMoveData);
          console.log('✅ Bot played:', move.san);
        } catch (err) {
          console.error('❌ Bot opening move failed:', err);
          // Try fallback
          try {
            move = chess.move({ from: botMoveData.from, to: botMoveData.to });
          } catch (err2) {
            console.error('❌ Fallback failed too');
          }
        }
        
        if (move) {
          game.moves.push(move.san);
          game.fen = chess.fen();
          game.pgn = chess.pgn();
          game.currentTurn = 'black';
          await game.save();
        }
      }
    }

    // Populate user
    if (game.players.white) {
      await game.populate('players.white', 'username rating');
    }
    if (game.players.black) {
      await game.populate('players.black', 'username rating');
    }

    res.status(201).json({
      success: true,
      game,
      message: isUserWhite ? 'You play as White. Make your move!' : 'Bot played first move as White.'
    });
  } catch (error) {
    console.error('Create bot game error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Make a move in a bot game
// @route   POST /api/game/:id/move-bot
// @access  Private
exports.makeBotMove = async (req, res) => {
  try {
    const { move } = req.body;

    const game = await Game.findById(req.params.id);

    if (!game || !game.isBot) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot game'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    // Validate and make user's move
    const chess = new Chess(game.fen);

    let moveResult;
    try {
      moveResult = chess.move(move);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid move'
      });
    }

    if (!moveResult) {
      return res.status(400).json({
        success: false,
        message: 'Invalid move'
      });
    }

    // Update game with user's move
    game.moves.push(moveResult.san);
    game.fen = chess.fen();
    game.pgn = chess.pgn();
    game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';
    // RESET TIMER AFTER USER MOVE
    game.lastMoveTime = new Date();
    game.timeoutWarnings.white = false;
    game.timeoutWarnings.black = false;

    // Check if game is over after user move
    if (chess.isGameOver()) {
      game.status = 'completed';
      game.endedAt = new Date();

      if (chess.isCheckmate()) {
        game.winner = req.user.id;
        const userIsWhite = game.players.white && game.players.white.toString() === req.user.id;
        game.result = userIsWhite ? '1-0' : '0-1';
        
        await User.findByIdAndUpdate(req.user.id, {
          $inc: { wins: 1, gamesPlayed: 1, rating: 10 }
        });
      } else if (chess.isDraw()) {
        game.result = '1/2-1/2';
        await User.findByIdAndUpdate(req.user.id, {
          $inc: { draws: 1, gamesPlayed: 1 }
        });
      }

      await game.save();
      
      if (game.players.white) {
        await game.populate('players.white', 'username rating');
      }
      if (game.players.black) {
        await game.populate('players.black', 'username rating');
      }

      return res.status(200).json({
        success: true,
        game,
        moveResult: {
          from: moveResult.from,
          to: moveResult.to,
          san: moveResult.san
        },
        gameStatus: {
          isCheck: chess.isCheck(),
          isCheckmate: chess.isCheckmate(),
          isDraw: chess.isDraw(),
          isGameOver: chess.isGameOver()
        }
      });
    }

    await game.save();
    // NEW: Notify clients to clear warning UI
    const io = req.app.get('io');
    io.to(game._id.toString()).emit('game:timeout-warning-cleared');

    // ✅ Artificial thinking delay (realistic bot "thinking" time)
    const thinkingTime = 1500 + Math.random() * 1000; // 1.5-2.5 seconds
    console.log(`🤔 Bot thinking for ${Math.round(thinkingTime)}ms...`);
    await new Promise(resolve => setTimeout(resolve, thinkingTime));

    // Bot's move logic...
    const botMoveData = simpleAI.getSmartMove(game.fen);
    
    // console.log('🤖 Bot selected move:', botMoveData);
    
    if (!botMoveData) {
      console.log('⚠️ No valid bot move available');
      game.status = 'completed';
      game.result = '1/2-1/2';
      await game.save();
      
      return res.status(200).json({
        success: true,
        game,
        gameStatus: { isGameOver: true, isDraw: true }
      });
    }

    // ✅ FIX: Ensure correct format for chess.js
    let botMove;
    try {
      botMove = chess.move(botMoveData);
      console.log('✅ Bot move executed:', botMove.san);
    } catch (err) {
      console.error('❌ Bot move failed:', err, 'Move data:', botMoveData);
      
      // Fallback: try as SAN notation
      try {
        botMove = chess.move(botMoveData.san || botMoveData);
      } catch (err2) {
        console.error('❌ Fallback also failed');
        game.status = 'completed';
        game.result = '1/2-1/2';
        await game.save();
        
        return res.status(200).json({
          success: true,
          game,
          gameStatus: { isGameOver: true, isDraw: true }
        });
      }
    }

    if (botMove) {
      game.moves.push(botMove.san);
      game.fen = chess.fen();
      game.pgn = chess.pgn();
      game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';
      // RESET TIMER AFTER BOT MOVE TOO
      game.lastMoveTime = new Date();
      game.timeoutWarnings.white = false;
      game.timeoutWarnings.black = false;

      if (chess.isGameOver()) {
        game.status = 'completed';
        game.endedAt = new Date();

        if (chess.isCheckmate()) {
          game.result = (game.players.white && game.players.white.toString()) ? '1-0' : '0-1';
          
          await User.findByIdAndUpdate(req.user.id, {
            $inc: { losses: 1, gamesPlayed: 1, rating: -10 }
          });
        } else if (chess.isDraw()) {
          game.result = '1/2-1/2';
          await User.findByIdAndUpdate(req.user.id, {
            $inc: { draws: 1, gamesPlayed: 1 }
          });
        }
      }

      await game.save();
    }

    if (game.players.white) {
      await game.populate('players.white', 'username rating');
    }
    if (game.players.black) {
      await game.populate('players.black', 'username rating');
    }

    res.status(200).json({
      success: true,
      game,
      userMove: {
        from: moveResult.from,
        to: moveResult.to,
        san: moveResult.san
      },
      botMove: botMove ? {
        from: botMove.from,
        to: botMove.to,
        san: botMove.san
      } : null,
      gameStatus: {
        isCheck: chess.isCheck(),
        isCheckmate: chess.isCheckmate(),
        isDraw: chess.isDraw(),
        isGameOver: chess.isGameOver()
      }
    });
  } catch (error) {
    console.error('Bot move error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create a new game
// @route   POST /api/game/create
// @access  Private
exports.createGame = async (req, res) => {
  try {
    const { opponentId } = req.body;

    const opponent = await User.findById(opponentId);
    if (!opponent) {
      return res.status(404).json({
        success: false,
        message: 'Opponent not found'
      });
    }

    if (req.user.id === opponentId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create game with yourself'
      });
    }

    const isUserWhite = Math.random() < 0.5;

    const game = await Game.create({
      players: {
        white: isUserWhite ? req.user.id : opponentId,
        black: isUserWhite ? opponentId : req.user.id
      },
      status: 'active'
    });

    await game.populate('players.white players.black', 'username rating');

    res.status(201).json({
      success: true,
      game
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get a specific game
// @route   GET /api/game/:id
// @access  Private
exports.getGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('players.white players.black', 'username rating')
      .populate('winner', 'username');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    const isPlayer = 
      (game.players.white && game.players.white._id.toString() === req.user.id) ||
      (game.players.black && game.players.black._id.toString() === req.user.id);

    if (!isPlayer) {
      return res.status(403).json({
        success: false,
        message: 'You are not a player in this game'
      });
    }

    res.status(200).json({
      success: true,
      game
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.makeMove = async (req, res) => {
  try {
    const { move } = req.body;

    const game = await Game.findById(req.params.id)
      .populate('players.white players.black', 'username rating');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    const userColor = game.players.white._id.toString() === req.user.id ? 'white' : 'black';
    
    if (game.currentTurn !== userColor) {
      return res.status(400).json({
        success: false,
        message: 'Not your turn'
      });
    }

    const chess = new Chess(game.fen);
    
    let moveResult;
    try {
      moveResult = chess.move(move);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid move'
      });
    }

    if (!moveResult) {
      return res.status(400).json({
        success: false,
        message: 'Invalid move'
      });
    }

    game.moves.push(moveResult.san);
    game.fen = chess.fen();
    game.pgn = chess.pgn();
    game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';
    // CRITICAL: Reset timeout timer and warnings
    game.lastMoveTime = new Date();
    game.timeoutWarnings.white = false;
    game.timeoutWarnings.black = false;

    if (chess.isGameOver()) {
      game.status = 'completed';
      game.endedAt = new Date();

      if (chess.isCheckmate()) {
        game.winner = req.user.id;
        game.result = userColor === 'white' ? '1-0' : '0-1';

        const ratingChanges = updateRatings(
          game.players.white.rating,
          game.players.black.rating,
          game.result
        );

        await User.findByIdAndUpdate(game.players.white._id, {
          $inc: { 
            wins: userColor === 'white' ? 1 : 0,
            losses: userColor === 'white' ? 0 : 1,
            gamesPlayed: 1 
          },
          $set: { rating: ratingChanges.whiteRating }
        });

        await User.findByIdAndUpdate(game.players.black._id, {
          $inc: { 
            wins: userColor === 'black' ? 1 : 0,
            losses: userColor === 'black' ? 0 : 1,
            gamesPlayed: 1 
          },
          $set: { rating: ratingChanges.blackRating }
        });

      } else if (chess.isDraw()) {
        game.result = '1/2-1/2';
        
        const ratingChanges = updateRatings(
          game.players.white.rating,
          game.players.black.rating,
          game.result
        );

        await User.findByIdAndUpdate(game.players.white._id, {
          $inc: { draws: 1, gamesPlayed: 1 },
          $set: { rating: ratingChanges.whiteRating }
        });

        await User.findByIdAndUpdate(game.players.black._id, {
          $inc: { draws: 1, gamesPlayed: 1 },
          $set: { rating: ratingChanges.blackRating }
        });
      }
    }

    await game.save();
    // NEW: Notify clients to clear warning UI
    const io = req.app.get('io');
    io.to(game._id.toString()).emit('game:timeout-warning-cleared');
    await game.populate('players.white players.black', 'username rating');

    res.status(200).json({
      success: true,
      game,
      moveResult: {
        from: moveResult.from,
        to: moveResult.to,
        piece: moveResult.piece,
        captured: moveResult.captured,
        promotion: moveResult.promotion,
        san: moveResult.san
      },
      gameStatus: {
        isCheck: chess.isCheck(),
        isCheckmate: chess.isCheckmate(),
        isDraw: chess.isDraw(),
        isStalemate: chess.isStalemate(),
        isGameOver: chess.isGameOver()
      }
    });
  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getMyGames = async (req, res) => {
  try {
    const games = await Game.find({
      $or: [
        { 'players.white': req.user.id },
        { 'players.black': req.user.id }
      ]
    })
    .populate('players.white players.black', 'username rating')
    .populate('winner', 'username')
    .sort({ startedAt: -1 });

    res.status(200).json({
      success: true,
      count: games.length,
      games
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getActiveGames = async (req, res) => {
  try {
    const games = await Game.find({
      status: 'active',
      $or: [
        { 'players.white': req.user.id },
        { 'players.black': req.user.id }
      ]
    })
    .populate('players.white players.black', 'username rating')
    .sort({ startedAt: -1 });

    res.status(200).json({
      success: true,
      count: games.length,
      games
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ NEW: Abort game
exports.abortGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('players.white players.black', 'username rating');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    if (game.moves.length >= 2) {
      return res.status(400).json({
        success: false,
        message: 'Cannot abort game with 2+ moves. Use resign instead.'
      });
    }

    game.status = 'abandoned';
    game.endedAt = new Date();
    await game.save();

    res.status(200).json({
      success: true,
      message: 'Game aborted successfully',
      game
    });
  } catch (error) {
    console.error('Abort error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.resignGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('players.white players.black', 'username rating');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    if (game.isBot) {
      game.status = 'completed';
      game.endedAt = new Date();
      
      const userColor = (game.players.white && game.players.white._id.toString() === req.user.id) ? 'white' : 'black';
      game.result = userColor === 'white' ? '0-1' : '1-0';
      
      await game.save();
      
      await User.findByIdAndUpdate(req.user.id, {
        $inc: { losses: 1, gamesPlayed: 1, rating: -5 }
      });

      return res.status(200).json({
        success: true,
        message: 'You have resigned from the game',
        game
      });
    }

    const userColor = game.players.white._id.toString() === req.user.id ? 'white' : 'black';
    const winnerId = userColor === 'white' ? game.players.black._id : game.players.white._id;

    game.status = 'completed';
    game.result = userColor === 'white' ? '0-1' : '1-0';
    game.winner = winnerId;
    game.endedAt = new Date();

    const ratingChanges = updateRatings(
      game.players.white.rating,
      game.players.black.rating,
      game.result
    );

    await User.findByIdAndUpdate(game.players.white._id, {
      $inc: { 
        wins: userColor === 'black' ? 1 : 0,
        losses: userColor === 'white' ? 1 : 0,
        gamesPlayed: 1 
      },
      $set: { rating: ratingChanges.whiteRating }
    });

    await User.findByIdAndUpdate(game.players.black._id, {
      $inc: { 
        wins: userColor === 'white' ? 1 : 0,
        losses: userColor === 'black' ? 1 : 0,
        gamesPlayed: 1 
      },
      $set: { rating: ratingChanges.blackRating }
    });

    await game.save();

    res.status(200).json({
      success: true,
      message: 'You have resigned from the game',
      game
    });
  } catch (error) {
    console.error('Resign error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};