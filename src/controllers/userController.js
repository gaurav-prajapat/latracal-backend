const { getDB } = require('../config/database');
const bcrypt = require('bcryptjs');

const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = `
      SELECT u.id, u.username, u.email, u.role, u.created_at,
             COUNT(r.id) as review_count
      FROM users u
      LEFT JOIN reviews r ON u.id = r.user_id
    `;
    let params = [];

    if (search) {
      query += ' WHERE u.username LIKE ? OR u.email LIKE ?';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const db = getDB();
    const [users] = await db.execute(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM users';
    let countParams = [];
    
    if (search) {
      countQuery += ' WHERE username LIKE ? OR email LIKE ?';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    const formattedUsers = users.map(user => ({
      ...user,
      created_at: user.created_at.toISOString(),
      review_count: parseInt(user.review_count) || 0
    }));

    res.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const db = getDB();
    const [users] = await db.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's review statistics
    const [reviewStats] = await db.execute(
      `SELECT 
         COUNT(*) as total_reviews,
         AVG(rating) as average_rating
       FROM reviews 
       WHERE user_id = ?`,
      [userId]
    );

    // Get user's recent reviews
    const [recentReviews] = await db.execute(
      `SELECT r.*, b.title as book_title, b.id as book_id
       FROM reviews r
       JOIN books b ON r.book_id = b.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [userId]
    );

    const user = {
      ...users[0],
      created_at: users[0].created_at.toISOString(),
      stats: {
        totalReviews: reviewStats[0].total_reviews,
        averageRating: parseFloat(reviewStats[0].average_rating || 0).toFixed(2)
      },
      recentReviews: recentReviews.map(review => ({
        ...review,
        created_at: review.created_at.toISOString(),
        updated_at: review.updated_at ? review.updated_at.toISOString() : review.created_at.toISOString()
      }))
    };

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    // Check if user is updating their own profile or is admin
    const db = getDB();
    const [currentUser] = await db.execute(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    const isAdmin = currentUser[0]?.role === 'admin';
    const isOwner = parseInt(userId) === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if user exists
    const [existingUser] = await db.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for duplicate email (excluding current user)
    const [duplicateEmail] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );

    if (duplicateEmail.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Check for duplicate username (excluding current user)
    const [duplicateUsername] = await db.execute(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );

    if (duplicateUsername.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    await db.execute(
      'UPDATE users SET username = ?, email = ?, updated_at = NOW() WHERE id = ?',
      [username.trim(), email.trim(), userId]
    );

    // Get updated user data
    const [updatedUser] = await db.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...updatedUser[0],
        created_at: updatedUser[0].created_at.toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email or username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent admin from changing their own role
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const db = getDB();
    const [result] = await db.execute(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
            [role, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const db = getDB();

    // Check if user exists
    const [existingUser] = await db.execute(
      'SELECT id, username FROM users WHERE id = ?',
      [userId]
    );

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Start transaction for data integrity
    await db.execute('START TRANSACTION');

    try {
      // Delete user's reviews first (due to foreign key constraints)
      await db.execute('DELETE FROM reviews WHERE user_id = ?', [userId]);
      
      // Delete user's wishlist items
      await db.execute('DELETE FROM wishlist WHERE user_id = ?', [userId]);
      
      // Delete the user
      await db.execute('DELETE FROM users WHERE id = ?', [userId]);
      
      await db.execute('COMMIT');

      res.json({
        message: `User "${existingUser[0].username}" and all associated data deleted successfully`
      });
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Check if user is changing their own password
    if (parseInt(userId) !== req.user.userId) {
      return res.status(403).json({ error: 'You can only change your own password' });
    }

    const db = getDB();

    // Get current user data
    const [users] = await db.execute(
      'SELECT password FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedNewPassword, userId]
    );

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserStats = async (req, res) => {
  try {
    const db = getDB();

    // Get total users count
    const [totalUsers] = await db.execute(
      'SELECT COUNT(*) as total FROM users'
    );

    // Get users by role
    const [roleStats] = await db.execute(
      `SELECT role, COUNT(*) as count
       FROM users
       GROUP BY role
       ORDER BY count DESC`
    );

    // Get new users (last 30 days)
    const [newUsers] = await db.execute(
      `SELECT COUNT(*) as count
       FROM users
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    // Get most active users (by review count)
    const [activeUsers] = await db.execute(
      `SELECT u.id, u.username, u.email, COUNT(r.id) as review_count
       FROM users u
       LEFT JOIN reviews r ON u.id = r.user_id
       GROUP BY u.id, u.username, u.email
       ORDER BY review_count DESC
       LIMIT 10`
    );

    // Get users without reviews
    const [usersWithoutReviews] = await db.execute(
      `SELECT COUNT(*) as count
       FROM users u
       LEFT JOIN reviews r ON u.id = r.user_id
       WHERE r.id IS NULL`
    );

    res.json({
      totalUsers: totalUsers[0].total,
      newUsers: newUsers[0].count,
      usersWithoutReviews: usersWithoutReviews[0].count,
      roleDistribution: roleStats,
      mostActiveUsers: activeUsers.map(user => ({
        ...user,
        review_count: parseInt(user.review_count) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Get from authenticated user

    const db = getDB();
    const [users] = await db.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's review statistics
    const [reviewStats] = await db.execute(
      `SELECT 
         COUNT(*) as total_reviews,
         AVG(rating) as average_rating,
         MIN(created_at) as first_review_date,
         MAX(created_at) as last_review_date
       FROM reviews 
       WHERE user_id = ?`,
      [userId]
    );

    // Get user's favorite genres (based on reviews)
    const [favoriteGenres] = await db.execute(
      `SELECT b.genre, COUNT(*) as review_count, AVG(r.rating) as avg_rating
       FROM reviews r
       JOIN books b ON r.book_id = b.id
       WHERE r.user_id = ? AND b.genre IS NOT NULL
       GROUP BY b.genre
       ORDER BY review_count DESC, avg_rating DESC
       LIMIT 5`,
      [userId]
    );

    const user = {
      ...users[0],
      created_at: users[0].created_at.toISOString(),
      stats: {
        totalReviews: reviewStats[0].total_reviews || 0,
        averageRating: parseFloat(reviewStats[0].average_rating || 0).toFixed(2),
        firstReviewDate: reviewStats[0].first_review_date ? reviewStats[0].first_review_date.toISOString() : null,
        lastReviewDate: reviewStats[0].last_review_date ? reviewStats[0].last_review_date.toISOString() : null
      },
      favoriteGenres: favoriteGenres.map(genre => ({
        ...genre,
        review_count: parseInt(genre.review_count),
        avg_rating: parseFloat(genre.avg_rating).toFixed(2)
      }))
    };

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // Get from authenticated user
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    const db = getDB();

    // Check for duplicate email (excluding current user)
    const [duplicateEmail] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, userId]
    );

    if (duplicateEmail.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Check for duplicate username (excluding current user)
    const [duplicateUsername] = await db.execute(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username, userId]
    );

    if (duplicateUsername.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    await db.execute(
      'UPDATE users SET username = ?, email = ?, updated_at = NOW() WHERE id = ?',
      [username.trim(), email.trim(), userId]
    );

    // Get updated user data
    const [updatedUser] = await db.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: {
        ...updatedUser[0],
        created_at: updatedUser[0].created_at.toISOString()
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email or username already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  updateUserRole,
  deleteUser,
  changePassword,
  getUserStats,
  getUserProfile,
  updateUserProfile
};
