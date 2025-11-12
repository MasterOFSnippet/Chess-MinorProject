/**
 * Messages API Routes
 * REST endpoints for chat history
 */

const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Game = require('../models/Game');
const { protect } = require('../middleware/auth');

/**
 * @desc    Get chat history for a game
 * @route   GET /api/messages/:gameId
 * @access  Private
 * 
 * Query params:
 * - limit: Number of messages (default 50, max 100)
 * - before: Get messages before this timestamp (for pagination)
 */
router.get('/:gameId', protect, async (req, res) => {
  try {
    const { gameId } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const before = req.query.before ? new Date(req.query.before) : new Date();

    // Verify user is part of this game
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    const isPlayer = 
      game.players.white?.toString() === req.user.id ||
      game.players.black?.toString() === req.user.id;

    if (!isPlayer && !game.isBot) {
      return res.status(403).json({
        success: false,
        message: 'You are not a player in this game'
      });
    }

    // Fetch messages
    const messages = await Message.find({
      gameId,
      timestamp: { $lt: before }
    })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean(); // Convert to plain JS objects (faster)

    // Return in chronological order (oldest first)
    messages.reverse();

    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @desc    Delete a message (optional feature)
 * @route   DELETE /api/messages/:messageId
 * @access  Private
 */
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only message author can delete
    if (message.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }

    await message.deleteOne();

    // Notify via Socket.IO
    const io = req.app.get('io');
    io.to(message.gameId.toString()).emit('chat:message-deleted', {
      messageId: req.params.messageId
    });

    res.status(200).json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;