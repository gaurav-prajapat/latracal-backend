const express = require('express');
const {
  getBooks,
  getBookById,
  getFeaturedBooks,
  getGenres,
  getBooksByAuthor,
  createBook,
  updateBook,
  deleteBook,
  getBookStats,
  getRelatedBooks,
  searchBooks
} = require('../controllers/bookController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getBooks);
router.get('/featured', getFeaturedBooks);
router.get('/genres', getGenres);
router.get('/search', searchBooks);
router.get('/author/:author', getBooksByAuthor);
router.get('/:id', getBookById);
router.get('/:id/related', getRelatedBooks);

// Admin only routes
router.post('/', authenticateToken, requireAdmin, createBook);
router.put('/:id', authenticateToken, requireAdmin, updateBook);
router.delete('/:id', authenticateToken, requireAdmin, deleteBook);
router.get('/admin/stats', authenticateToken, requireAdmin, getBookStats);

module.exports = router;