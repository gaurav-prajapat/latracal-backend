const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const validateRegister = [
  body('username')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Username must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

const validateBook = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required and must be less than 255 characters'),
  
  body('author')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Author is required and must be less than 255 characters'),
  
  body('isbn')
    .optional()
    .matches(/^(?:\d{10}|\d{13}|[\d-]{10,17})$/)
    .withMessage('Invalid ISBN format'),
  
  body('published_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format'),
  
  body('genre')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Genre must be less than 100 characters'),
  
  body('cover_image')
    .optional()
    .isURL()
    .withMessage('Cover image must be a valid URL'),
  
  handleValidationErrors
];

const validateReview = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must be less than 1000 characters'),
  
  body('book_id')
    .isInt({ min: 1 })
    .withMessage('Valid book ID is required'),
  
  handleValidationErrors
];

const validateUserId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required'),
  
  handleValidationErrors
];

const validateBookId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid book ID is required'),
  
  handleValidationErrors
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

module.exports = {
  validateRegister,
  validateLogin,
  validateBook,
  validateReview,
  validateUserId,
  validateBookId,
  validatePagination,
  handleValidationErrors
};