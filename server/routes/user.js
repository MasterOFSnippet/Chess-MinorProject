const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @desc    Get all users (for finding opponents)
// @route   GET /api/users
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    // Exclude current user from list
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select('username rating gamesPlayed wins losses draws')
      .sort({ rating: -1 }); // Sort by rating

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username rating gamesPlayed wins losses draws createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;