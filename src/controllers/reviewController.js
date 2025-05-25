const { getDB } = require('../config/database');

const getReviews = async (req, res) => {
  try {
    const bookId = req.query.book_id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    if (!bookId) {
      return res.status(400).json({ error: 'Book ID is required' });
    }

    if (isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const db = getDB();
    const [reviews] = await db.execute(
      `SELECT r.*, u.username, u.id as user_id
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.book_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [bookId, limit, offset]
    );

    // Get total count for pagination
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM reviews WHERE book_id = ?',
      [bookId]
    );

    const total = countResult[0].total;

    // Format reviews
    const formattedReviews = reviews.map(review => ({
      ...review,
      created_at: review.created_at.toISOString(),
      updated_at: review.updated_at ? review.updated_at.toISOString() : review.created_at.toISOString()
    }));

    res.json({
      reviews: formattedReviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getRecentReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;

    const db = getDB();
    const [reviews] = await db.execute(
      `SELECT r.*, u.username, b.title as book_title, b.id as book_id
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN books b ON r.book_id = b.id
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [limit]
    );

    const formattedReviews = reviews.map(review => ({
      ...review,
      created_at: review.created_at.toISOString(),
      updated_at: review.updated_at ? review.updated_at.toISOString() : review.created_at.toISOString()
    }));

    res.json(formattedReviews);
  } catch (error) {
    console.error('Error fetching recent reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserReviews = async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const db = getDB();
    const [reviews] = await db.execute(
      `SELECT r.*, b.title as book_title, b.id as book_id
       FROM reviews r
       JOIN books b ON r.book_id = b.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // Get total count
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM reviews WHERE user_id = ?',
      [userId]
    );

    const total = countResult[0].total;

    const formattedReviews = reviews.map(review => ({
      ...review,
      created_at: review.created_at.toISOString(),
      updated_at: review.updated_at ? review.updated_at.toISOString() : review.created_at.toISOString()
    }));

    res.json({
      reviews: formattedReviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const createReview = async (req, res) => {
  try {
    const { book_id, rating, comment } = req.body;
    
    if (!book_id || !rating) {
      return res.status(400).json({ error: 'Book ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const db = getDB();

    // Check if book exists
    const [books] = await db.execute(
      'SELECT id FROM books WHERE id = ?',
      [book_id]
    );

    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Check if user already reviewed this book
    const [existingReview] = await db.execute(
      'SELECT id FROM reviews WHERE user_id = ? AND book_id = ?',
      [req.user.userId, book_id]
    );

    if (existingReview.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this book' });
    }

    const [result] = await db.execute(
      'INSERT INTO reviews (user_id, book_id, rating, comment, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [req.user.userId, book_id, rating, comment || null]
    );

    // Get the created review with user info
    const [newReview] = await db.execute(
      `SELECT r.*, u.username
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [result.insertId]
    );

    const formattedReview = {
      ...newReview[0],
      created_at: newReview[0].created_at.toISOString(),
      updated_at: newReview[0].updated_at.toISOString()
    };

    res.status(201).json({
      message: 'Review submitted successfully',
      reviewId: result.insertId,
      review: formattedReview
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateReview = async (req, res) => {
  try {
    const reviewId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating) {
      return res.status(400).json({ error: 'Rating is required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const db = getDB();

    // Check if review exists and belongs to user
    const [existingReview] = await db.execute(
      'SELECT user_id FROM reviews WHERE id = ?',
      [reviewId]
    );

    if (existingReview.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (existingReview[0].user_id !== req.user.userId) {
      return res.status(403).json({
                error: 'You can only edit your own reviews'
      });
    }

    await db.execute(
      'UPDATE reviews SET rating = ?, comment = ?, updated_at = NOW() WHERE id = ?',
      [rating, comment || null, reviewId]
    );

    // Get updated review
    const [updatedReview] = await db.execute(
      `SELECT r.*, u.username
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.id = ?`,
      [reviewId]
    );

    const formattedReview = {
      ...updatedReview[0],
      created_at: updatedReview[0].created_at.toISOString(),
      updated_at: updatedReview[0].updated_at.toISOString()
    };

    res.json({
      message: 'Review updated successfully',
      review: formattedReview
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const reviewId = req.params.id;

    const db = getDB();

    // Check if review exists and belongs to user or user is admin
    const [existingReview] = await db.execute(
      'SELECT user_id FROM reviews WHERE id = ?',
      [reviewId]
    );

    if (existingReview.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user owns the review or is admin
    const [user] = await db.execute(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    const isAdmin = user[0]?.role === 'admin';
    const isOwner = existingReview[0].user_id === req.user.userId;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own reviews' });
    }

    await db.execute(
      'DELETE FROM reviews WHERE id = ?',
      [reviewId]
    );

    res.json({
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getReviewStats = async (req, res) => {
  try {
    const db = getDB();

    // Get total reviews count
    const [totalReviews] = await db.execute(
      'SELECT COUNT(*) as total FROM reviews'
    );

    // Get average rating across all books
    const [avgRating] = await db.execute(
      'SELECT AVG(rating) as average FROM reviews'
    );

    // Get reviews by rating distribution
    const [ratingDistribution] = await db.execute(
      `SELECT rating, COUNT(*) as count
       FROM reviews
       GROUP BY rating
       ORDER BY rating DESC`
    );

    // Get most active reviewers
    const [topReviewers] = await db.execute(
      `SELECT u.username, u.id, COUNT(r.id) as review_count
       FROM users u
       JOIN reviews r ON u.id = r.user_id
       GROUP BY u.id, u.username
       ORDER BY review_count DESC
       LIMIT 10`
    );

    // Get recent review activity (last 30 days)
    const [recentActivity] = await db.execute(
      `SELECT COUNT(*) as count
       FROM reviews
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    res.json({
      totalReviews: totalReviews[0].total,
      averageRating: parseFloat(avgRating[0].average || 0).toFixed(2),
      recentActivity: recentActivity[0].count,
      ratingDistribution: ratingDistribution.map(item => ({
        rating: item.rating,
        count: item.count,
        percentage: ((item.count / totalReviews[0].total) * 100).toFixed(1)
      })),
      topReviewers: topReviewers.map(reviewer => ({
        ...reviewer,
        review_count: parseInt(reviewer.review_count)
      }))
    });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getBookReviewSummary = async (req, res) => {
  try {
    const bookId = req.params.bookId;

    if (!bookId || isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const db = getDB();

    // Check if book exists
    const [book] = await db.execute(
      'SELECT id, title FROM books WHERE id = ?',
      [bookId]
    );

    if (book.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Get review statistics for this book
    const [stats] = await db.execute(
      `SELECT 
         COUNT(*) as total_reviews,
         AVG(rating) as average_rating,
         MIN(rating) as min_rating,
         MAX(rating) as max_rating
       FROM reviews 
       WHERE book_id = ?`,
      [bookId]
    );

    // Get rating distribution for this book
    const [ratingDistribution] = await db.execute(
      `SELECT rating, COUNT(*) as count
       FROM reviews
       WHERE book_id = ?
       GROUP BY rating
       ORDER BY rating DESC`,
      [bookId]
    );

    // Get recent reviews for this book
    const [recentReviews] = await db.execute(
      `SELECT r.rating, r.comment, r.created_at, u.username
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.book_id = ?
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [bookId]
    );

    const totalReviews = stats[0].total_reviews;

    res.json({
      bookId: parseInt(bookId),
      bookTitle: book[0].title,
      totalReviews: totalReviews,
      averageRating: parseFloat(stats[0].average_rating || 0).toFixed(2),
      minRating: stats[0].min_rating || 0,
      maxRating: stats[0].max_rating || 0,
      ratingDistribution: ratingDistribution.map(item => ({
        rating: item.rating,
        count: item.count,
        percentage: totalReviews > 0 ? ((item.count / totalReviews) * 100).toFixed(1) : '0'
      })),
      recentReviews: recentReviews.map(review => ({
        ...review,
        created_at: review.created_at.toISOString()
      }))
    });
  } catch (error) {
    console.error('Error fetching book review summary:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getReviews,
  getRecentReviews,
  getUserReviews,
  createReview,
  updateReview,
  deleteReview,
  getReviewStats,
  getBookReviewSummary
};
