/**
 * Socket.IO Handler
 * Manages real-time game events and chat functionality
 * 
 * Architecture Decision:
 * - Room-based: Each game has its own room (gameId)
 * - Event-driven: Emit/listen pattern for clean separation
 * - Stateless: Game state stored in DB, socket only for communication
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');
const Message = require('../models/Message');

// In-memory store for active users (could move to Redis for scaling)
const activeUsers = new Map(); // userId -> { socketId, gameId, username }

const socketHandler = (io) => {
  
  // ============================================
  // AUTHENTICATION MIDDLEWARE
  // ============================================
  // Why: Verify JWT before allowing socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      // Attach user to socket for later use
      socket.userId = user._id.toString();
      socket.username = user.username;
      
      console.log(`✅ User authenticated: ${user.username} (${socket.id})`);
      next();
    } catch (error) {
      console.error('Socket auth error:', error.message);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // ============================================
  // CONNECTION HANDLER
  // ============================================
  io.on('connection', (socket) => {
    console.log(`🔌 New connection: ${socket.username} (${socket.id})`);

    // Track active user
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      username: socket.username,
      gameId: null
    });

    // Broadcast online users count
    io.emit('users:count', activeUsers.size);

    // ============================================
    // GAME EVENTS
    // ============================================

    /**
     * JOIN GAME ROOM
     * When a player opens a game page, they join that game's room
     * Why rooms? Allows targeted broadcasts to only players in that game
     */
    socket.on('game:join', async (gameId) => {
      try {
        console.log(`🎮 ${socket.username} joining game ${gameId}`);

        // Validate game exists
        const game = await Game.findById(gameId)
          .populate('players.white players.black', 'username rating');
        
        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Check if user is a player in this game
        const isPlayer = 
          game.players.white?._id.toString() === socket.userId ||
          game.players.black?._id.toString() === socket.userId;

        if (!isPlayer && !game.isBot) {
          socket.emit('error', { message: 'You are not a player in this game' });
          return;
        }

        // Join the room
        socket.join(gameId);
        socket.currentGame = gameId;

        // Update active users map
        const userData = activeUsers.get(socket.userId);
        if (userData) {
          userData.gameId = gameId;
        }

        // Notify others in the room
        socket.to(gameId).emit('game:player-joined', {
          username: socket.username,
          userId: socket.userId
        });

        // Send current game state to joining player
        socket.emit('game:state', game);

        console.log(`✅ ${socket.username} joined game ${gameId}`);
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    /**
     * MAKE MOVE
     * When a player makes a move, validate and broadcast to opponent
     */
    socket.on('game:move', async ({ gameId, move }) => {
      try {
        console.log(`♟️ ${socket.username} attempting move in ${gameId}:`, move);

        const game = await Game.findById(gameId)
          .populate('players.white players.black', 'username rating');

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        // Verify it's player's turn
        const isWhitePlayer = game.players.white?._id.toString() === socket.userId;
        const isBlackPlayer = game.players.black?._id.toString() === socket.userId;
        const currentTurn = game.currentTurn;

        if ((currentTurn === 'white' && !isWhitePlayer) || 
            (currentTurn === 'black' && !isBlackPlayer)) {
          socket.emit('error', { message: 'Not your turn' });
          return;
        }

        // Broadcast move to all players in the room
        // The actual move validation happens on the backend via REST API
        // Socket.IO just provides real-time notification
        io.to(gameId).emit('game:move-made', {
          move,
          playerId: socket.userId,
          username: socket.username
        });

        console.log(`✅ Move broadcast to game ${gameId}`);
      } catch (error) {
        console.error('Error handling move:', error);
        socket.emit('error', { message: 'Failed to process move' });
      }
    });

    /**
     * LEAVE GAME ROOM
     */
    socket.on('game:leave', (gameId) => {
      console.log(`👋 ${socket.username} leaving game ${gameId}`);
      socket.leave(gameId);
      socket.to(gameId).emit('game:player-left', {
        username: socket.username,
        userId: socket.userId
      });

      // Update active users map
      const userData = activeUsers.get(socket.userId);
      if (userData) {
        userData.gameId = null;
      }
    });

    // ============================================
    // CHAT EVENTS
    // ============================================

    /**
     * SEND MESSAGE
     * Store in DB and broadcast to game room
     */
    socket.on('chat:message', async ({ gameId, message }) => {
      try {
        console.log(`💬 ${socket.username} in game ${gameId}: ${message}`);

        // Validate message
        if (!message || message.trim().length === 0) {
          return;
        }

        if (message.length > 500) {
          socket.emit('error', { message: 'Message too long (max 500 chars)' });
          return;
        }

        // Save message to DB
        const newMessage = await Message.create({
          gameId,
          userId: socket.userId,
          username: socket.username,
          message: message.trim(),
          timestamp: new Date()
        });

        // Broadcast to all players in game room
        io.to(gameId).emit('chat:message', {
          _id: newMessage._id,
          userId: socket.userId,
          username: socket.username,
          message: message.trim(),
          timestamp: newMessage.timestamp
        });

        console.log(`✅ Message saved and broadcast`);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    /**
     * TYPING INDICATOR
     * Show when opponent is typing (not persisted)
     */
    socket.on('chat:typing', ({ gameId, isTyping }) => {
      socket.to(gameId).emit('chat:user-typing', {
        username: socket.username,
        isTyping
      });
    });

    // ============================================
    // DISCONNECTION
    // ============================================
    socket.on('disconnect', (reason) => {
      console.log(`❌ ${socket.username} disconnected (${reason})`);

      // Remove from active users
      activeUsers.delete(socket.userId);

      // Notify game room if in a game
      if (socket.currentGame) {
        socket.to(socket.currentGame).emit('game:player-disconnected', {
          username: socket.username,
          userId: socket.userId
        });
      }

      // Broadcast updated user count
      io.emit('users:count', activeUsers.size);
    });

    // ============================================
    // ERROR HANDLING
    // ============================================
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.username}:`, error);
    });
  });
};

module.exports = socketHandler;