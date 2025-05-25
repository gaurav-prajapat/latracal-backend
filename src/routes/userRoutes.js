const express = require('express');
const {
  getUsers,
  getUserById,
  updateUser,
  updateUserRole,
  deleteUser,
  changePassword,
  getUserStats,
  getUserProfile,
  updateUserProfile
} = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Protected routes (user's own profile)
router.get('/profile', authenticateToken, getUserProfile);
router.put('/profile', authenticateToken, updateUserProfile);
router.put('/:id/password', authenticateToken, changePassword);

// Public/Protected routes
router.get('/:id', authenticateToken, getUserById);
router.put('/:id', authenticateToken, updateUser);

// Admin only routes
router.get('/', authenticateToken, requireAdmin, getUsers);
router.put('/:id/role', authenticateToken, requireAdmin, updateUserRole);
router.delete('/:id', authenticateToken, requireAdmin, deleteUser);
router.get('/admin/stats', authenticateToken, requireAdmin, getUserStats);

module.exports = router;