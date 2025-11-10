const Game = require('../models/Game');
const User = require('../models/User');
const { Chess } = require('chess.js');
const { updateRatings } = require('../utils/elo');
const { getStockfish } = require('../services/stockfishService');
const simpleAI = require('../services/simpleAI');


// @desc    Create a game against AI bot
// @route   POST /api/game/create-bot
// @access  Private
exports.createBotGame = async (req, res) => {
  try {
    // Randomly assign user as white or black
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

    // If bot is white, make first move
    if (!isUserWhite) {
      const { Chess } = require('chess.js');
      const chess = new Chess(game.fen);
      
      // Get bot move (using simple AI)
      const botMove = simpleAI.getSmartMove(game.fen);
      
      if (botMove) {
        const move = chess.move(botMove);
        
        if (move) {
          game.moves.push(move.san);
          game.fen = chess.fen();
          game.pgn = chess.pgn();
          game.currentTurn = 'black';
          await game.save();
        }
      }
    }

    // Populate user (only the one that exists)
    if (game.players.white) {
      await game.populate('players.white', 'username rating');
    }
    if (game.players.black) {
      await game.populate('players.black', 'username rating');
    }

    res.status(201).json({
      success: true,
      game
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

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (!game.isBot) {
      return res.status(400).json({
        success: false,
        message: 'This is not a bot game'
      });
    }

    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    // Validate and make user's move
    const { Chess } = require('chess.js');
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

    // Check if game is over after user move
    if (chess.isGameOver()) {
      game.status = 'completed';
      game.endedAt = new Date();

      if (chess.isCheckmate()) {
        game.winner = req.user.id;
        game.result = (game.players.white && game.players.white.toString() === req.user.id) ? '1-0' : '0-1';
        
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
      await game.populate('players.white players.black', 'username rating');

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

    // Get bot's move using simple AI
    const botMoveData = simpleAI.getSmartMove(game.fen);
    
    if (!botMoveData) {
      // Game over or no moves available
      game.status = 'completed';
      game.result = '1/2-1/2';
      await game.save();
      
      return res.status(200).json({
        success: true,
        game,
        gameStatus: { isGameOver: true, isDraw: true }
      });
    }

    const botMove = chess.move(botMoveData);

    if (botMove) {
      game.moves.push(botMove.san);
      game.fen = chess.fen();
      game.pgn = chess.pgn();
      game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';

      // Check if game is over after bot move
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

    // Populate user details
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

    // Validate opponent exists
    const opponent = await User.findById(opponentId);
    if (!opponent) {
      return res.status(404).json({
        success: false,
        message: 'Opponent not found'
      });
    }

    // Can't play against yourself
    if (req.user.id === opponentId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create game with yourself'
      });
    }

    // Randomly assign colors
    const isUserWhite = Math.random() < 0.5;

    const game = await Game.create({
      players: {
        white: isUserWhite ? req.user.id : opponentId,
        black: isUserWhite ? opponentId : req.user.id
      },
      status: 'active'
    });

    // Populate player details
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

    // Check if user is part of this game
    const isPlayer = 
      game.players.white._id.toString() === req.user.id ||
      game.players.black._id.toString() === req.user.id;

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

    // Check if game is still active
    if (game.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Game is not active'
      });
    }

    // Check if it's the user's turn
    const userColor = game.players.white._id.toString() === req.user.id ? 'white' : 'black';
    
    if (game.currentTurn !== userColor) {
      return res.status(400).json({
        success: false,
        message: 'Not your turn'
      });
    }

    // Validate move using chess.js
    const { Chess } = require('chess.js');
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

    // Update game state
    game.moves.push(moveResult.san);
    game.fen = chess.fen();
    game.pgn = chess.pgn();
    game.currentTurn = game.currentTurn === 'white' ? 'black' : 'white';

    // Check for game over
    if (chess.isGameOver()) {
      game.status = 'completed';
      game.endedAt = new Date();

      if (chess.isCheckmate()) {
        // Winner is the player who just moved
        game.winner = req.user.id;
        game.result = userColor === 'white' ? '1-0' : '0-1';

        // Calculate ELO changes
        const ratingChanges = updateRatings(
          game.players.white.rating,
          game.players.black.rating,
          game.result
        );

        console.log('🏆 ELO Changes:', ratingChanges);

        // Update white player
        await User.findByIdAndUpdate(game.players.white._id, {
          $inc: { 
            wins: userColor === 'white' ? 1 : 0,
            losses: userColor === 'white' ? 0 : 1,
            gamesPlayed: 1 
          },
          $set: { rating: ratingChanges.whiteRating }
        });

        // Update black player
        await User.findByIdAndUpdate(game.players.black._id, {
          $inc: { 
            wins: userColor === 'black' ? 1 : 0,
            losses: userColor === 'black' ? 0 : 1,
            gamesPlayed: 1 
          },
          $set: { rating: ratingChanges.blackRating }
        });

        console.log(`✅ Updated ratings - White: ${ratingChanges.whiteRating} (${ratingChanges.whiteChange > 0 ? '+' : ''}${ratingChanges.whiteChange}), Black: ${ratingChanges.blackRating} (${ratingChanges.blackChange > 0 ? '+' : ''}${ratingChanges.blackChange})`);

      } else if (chess.isDraw()) {
        game.result = '1/2-1/2';
        
        // Calculate ELO changes for draw
        const ratingChanges = updateRatings(
          game.players.white.rating,
          game.players.black.rating,
          game.result
        );

        console.log('🤝 Draw - ELO Changes:', ratingChanges);

        // Update both players for draw
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

    // Populate again after save
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

// @desc    Get all games for logged in user
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
    .sort({ startedAt: -1 }); // Most recent first

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

// @desc    Get all active games
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

// @desc    Resign from a game
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

    // Don't update ELO for bot games on resign
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

    // For human vs human games, update ELO
    const userColor = game.players.white._id.toString() === req.user.id ? 'white' : 'black';
    const winnerId = userColor === 'white' ? game.players.black._id : game.players.white._id;

    game.status = 'completed';
    game.result = userColor === 'white' ? '0-1' : '1-0';
    game.winner = winnerId;
    game.endedAt = new Date();

    // Calculate ELO (resigning = losing)
    const ratingChanges = updateRatings(
      game.players.white.rating,
      game.players.black.rating,
      game.result
    );

    console.log('🏳️ Resignation - ELO Changes:', ratingChanges);

    // Update both players
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