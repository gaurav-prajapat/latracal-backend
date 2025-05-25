const express = require('express');
const {
  getReviews,
  getRecentReviews,
  getUserReviews,
  createReview,
  updateReview,
  deleteReview,
  getReviewStats,
  getBookReviewSummary
} = require('../controllers/reviewController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getReviews);
router.get('/recent', getRecentReviews);
router.get('/book/:bookId/summary', getBookReviewSummary);

// Protected routes
router.get('/user/:userId', authenticateToken, getUserReviews);
router.post('/', authenticateToken, createReview);
router.put('/:id', authenticateToken, updateReview);
router.delete('/:id', authenticateToken, deleteReview);

// Admin only routes
router.get('/admin/stats', authenticateToken, requireAdmin, getReviewStats);

module.exports = router;