const Game = require('../models/Game');
const User = require('../models/User');
const { Chess } = require('chess.js');
const { updateRatings } = require('../utils/elo');
const simpleAI = require('../services/simpleAI');

// ============================================
// 🎯 HELPER: CHECK IF USER IS IN ACTIVE GAME
// ============================================
async function isUserBusy(userId) {
  const activeGame = await Game.findOne({
    $or: [
      { 'players.white': userId },
      { 'players.black': userId }
    ],
    status: 'active'
  });
  
  return !!activeGame; // Returns true if user has an active game
}

// @desc    Create a new game (with busy check)
// @route   POST /api/game/create
// @access  Private
exports.createGame = async (req, res) => {
  try {
    const { opponentId } = req.body;

    // ✅ VALIDATION: Opponent exists
    const opponent = await User.findById(opponentId);
    if (!opponent) {
      return res.status(404).json({
        success: false,
        message: 'Opponent not found'
      });
    }

    // ✅ VALIDATION: Can't play yourself
    if (req.user.id === opponentId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create game with yourself'
      });
    }

    // ✅ VALIDATION: Check if YOU are already in a game
    const userBusy = await isUserBusy(req.user.id);
    if (userBusy) {
      return res.status(400).json({
        success: false,
        message: '⚠️ You are already in an active game! Finish it before starting a new one.',
        errorCode: 'USER_BUSY'
      });
    }

    // ✅ VALIDATION: Check if OPPONENT is already in a game
    const opponentBusy = await isUserBusy(opponentId);
    if (opponentBusy) {
      return res.status(400).json({
        success: false,
        message: `⚠️ ${opponent.username} is currently in another game. Please wait until they finish.`,
        errorCode: 'OPPONENT_BUSY'
      });
    }

    // ✅ ALL CHECKS PASSED - Create game
    const isUserWhite = Math.random() < 0.5;

    const game = await Game.create({
      players: {
        white: isUserWhite ? req.user.id : opponentId,
        black: isUserWhite ? opponentId : req.user.id
      },
      status: 'active'
    });

    await game.populate('players.white players.black', 'username rating');

    console.log(`✅ Game created: ${game._id} | ${game.players.white.username} vs ${game.players.black.username}`);

    res.status(201).json({
      success: true,
      game,
      message: `Game started! You play as ${isUserWhite ? 'White' : 'Black'}.`
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create a game against AI bot (with busy check)
// @route   POST /api/game/create-bot
// @access  Private
exports.createBotGame = async (req, res) => {
  try {
    // ✅ VALIDATION: Check if user is already in a game
    const userBusy = await isUserBusy(req.user.id);
    if (userBusy) {
      return res.status(400).json({
        success: false,
        message: '⚠️ You are already in an active game! Finish it before starting a new one.',
        errorCode: 'USER_BUSY'
      });
    }

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

    // If bot plays White, make first move immediately
    if (!isUserWhite) {
      const chess = new Chess(game.fen);
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const botMoveData = simpleAI.getSmartMove(game.fen);
      
      if (botMoveData) {
        let move;
        try {
          move = chess.move(botMoveData);
        } catch (err) {
          console.error('❌ Bot opening move failed:', err);
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
          game.lastMoveTime = new Date();
          await game.save();
        }
      }
    }

    if (game.players.white) {
      await game.populate('players.white', 'username rating');
    }
    if (game.players.black) {
      await game.populate('players.black', 'username rating');
    }

    console.log(`✅ Bot game created: ${game._id} | User plays as ${isUserWhite ? 'White' : 'Black'}`);

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

// @desc    Make a move in a human vs human game
// @route   POST /api/game/:id/move
// @access  Private
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
    game.lastMoveTime = new Date();
    game.timeoutWarnings.white = false;
    game.timeoutWarnings.black = false;

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
    
    const io = req.app.get('io');
    io.to(game._id.toString()).emit('game:timeout-warning-cleared');

    const thinkingTime = 1500 + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, thinkingTime));

    const botMoveData = simpleAI.getSmartMove(game.fen);
    
    if (!botMoveData) {
      game.status = 'completed';
      game.result = '1/2-1/2';
      await game.save();
      
      return res.status(200).json({
        success: true,
        game,
        gameStatus: { isGameOver: true, isDraw: true }
      });
    }

    let botMove;
    try {
      botMove = chess.move(botMoveData);
    } catch (err) {
      console.error('❌ Bot move failed:', err);
      try {
        botMove = chess.move(botMoveData.san || botMoveData);
      } catch (err2) {
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

// @desc    Get my games
// @route   GET /api/game/my-games
// @access  Private
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

// @desc    Get active games
// @route   GET /api/game/active
// @access  Private
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

// @desc    Abort game
// @route   POST /api/game/:id/abort
// @access  Private
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

// @desc    Resign from game
// @route   POST /api/game/:id/resign
// @access  Private
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