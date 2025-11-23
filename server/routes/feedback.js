/**
 * Feedback API Routes
 */

const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const { protect } = require('../middleware/auth');

/**
 * @desc    Submit feedback
 * @route   POST /api/feedback
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { type, title, description, email } = req.body;

    // Validation
    if (!type || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Please provide type, title, and description'
      });
    }

    // Spam prevention
    const recentFeedback = await Feedback.countDocuments({
      email: email || 'anonymous',
      createdAt: { $gte: new Date(Date.now() - 60000) }
    });

    if (recentFeedback >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Too many submissions. Please try again later.'
      });
    }

    // Create feedback
    const feedbackData = {
      type,
      title,
      description,
      email: email || undefined,
      metadata: {
        userAgent: req.headers['user-agent'],
        url: req.body.url || req.headers.referer,
        timestamp: new Date()
      }
    };

    // Add user info if authenticated
    if (req.user) {
      feedbackData.userId = req.user.id;
      feedbackData.username = req.user.username;
    }

    const feedback = await Feedback.create(feedbackData);

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you!',
      feedbackId: feedback._id
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit feedback'
    });
  }
});

/**
 * @desc    Get all feedback (Admin only - future feature)
 * @route   GET /api/feedback
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const feedback = await Feedback.find(query)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Feedback.countDocuments(query);

    res.status(200).json({
      success: true,
      feedback,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;