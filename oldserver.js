const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'book_review_platform'
};

let db;

async function initDatabase() {
  try {
    db = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL database');
    
    // Create tables if they don't exist
    await createTables();
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

async function createTables() {
  try {
    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Books table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        description TEXT,
        isbn VARCHAR(20),
        published_year INT,
        genre VARCHAR(100),
        cover_image VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Reviews table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_book (user_id, book_id)
      )
    `);

    console.log('Database tables created/verified successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    const [users] = await db.execute(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (users[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Demo users for testing
const demoUsers = {
  admin: {
    email: 'admin@demo.com',
    password: 'admin123',
    username: 'Demo Admin',
    role: 'admin'
  },
  user: {
    email: 'user@demo.com',
    password: 'user123',
    username: 'Demo User',
    role: 'user'
  }
};

// Routes

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Only allow admin role if explicitly set and user is already admin
    const userRole = role === 'admin' ? 'admin' : 'user';

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const [result] = await db.execute(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, userRole]
    );

    const token = jwt.sign(
      { userId: result.insertId, username, role: userRole },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: result.insertId, username, email, role: userRole }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Demo login endpoint
app.post('/api/auth/demo-login', async (req, res) => {
  try {
    const { userType } = req.body;
    
    if (!demoUsers[userType]) {
      return res.status(400).json({ error: 'Invalid demo user type' });
    }

    const demoUser = demoUsers[userType];
    
    // Check if demo user exists, create if not
    let [users] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [demoUser.email]
    );

    let user;
    if (users.length === 0) {
      const hashedPassword = await bcrypt.hash(demoUser.password, 10);
      const [result] = await db.execute(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        [demoUser.username, demoUser.email, hashedPassword, demoUser.role]
      );
      user = { id: result.insertId, ...demoUser };
    } else {
      user = users[0];
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Book routes
app.get('/api/books', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const genre = req.query.genre || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';
    const offset = (page - 1) * limit;

    // Validate sortBy parameter
    const validSortFields = ['created_at', 'title', 'author', 'published_date', 'average_rating', 'review_count'];
    const validSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    let query = `
      SELECT b.*, 
             COALESCE(AVG(r.rating), 0) as average_rating, 
             COUNT(r.id) as review_count
      FROM books b
      LEFT JOIN reviews r ON b.id = r.book_id
    `;
    let params = [];
    let whereConditions = [];

    // Add search conditions
    if (search) {
      whereConditions.push('(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Add genre filter
    if (genre) {
      whereConditions.push('b.genre = ?');
      params.push(genre);
    }

    // Add WHERE clause if conditions exist
    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    // Add GROUP BY and ORDER BY
    query += ` GROUP BY b.id ORDER BY ${validSortBy === 'average_rating' ? 'COALESCE(AVG(r.rating), 0)' : 'b.' + validSortBy} ${validSortOrder}`;
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [books] = await db.execute(query, params);
    
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(DISTINCT b.id) as total FROM books b';
    let countParams = [];
    
    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
      // Remove the last two params (limit, offset) and use the rest for count
      countParams = params.slice(0, -2);
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

    // Format the response data
    const formattedBooks = books.map(book => ({
      ...book,
      average_rating: parseFloat(book.average_rating) || 0,
      review_count: parseInt(book.review_count) || 0,
      published_date: book.published_date ? book.published_date.toISOString().split('T')[0] : null
    }));

    res.json({
      books: formattedBooks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/books/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    const [books] = await db.execute(
      `SELECT b.*, 
              COALESCE(AVG(r.rating), 0) as average_rating, 
              COUNT(r.id) as review_count
       FROM books b
       LEFT JOIN reviews r ON b.id = r.book_id
       GROUP BY b.id
       HAVING average_rating >= 4.0 OR review_count >= 5
       ORDER BY average_rating DESC, review_count DESC
       LIMIT ?`,
      [limit]
    );

    const formattedBooks = books.map(book => ({
      ...book,
      average_rating: parseFloat(book.average_rating) || 0,
      review_count: parseInt(book.review_count) || 0,
      published_date: book.published_date ? book.published_date.toISOString().split('T')[0] : null
    }));

    res.json(formattedBooks);
  } catch (error) {
    console.error('Error fetching featured books:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/books/genres', async (req, res) => {
  try {
    const [genres] = await db.execute(
      `SELECT genre, COUNT(*) as book_count
       FROM books 
       WHERE genre IS NOT NULL AND genre != ''
       GROUP BY genre
       ORDER BY book_count DESC, genre ASC`
    );

    res.json(genres);
  } catch (error) {
    console.error('Error fetching genres:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const bookId = req.params.id;

    // Validate book ID
    if (!bookId || isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const [books] = await db.execute(
      `SELECT b.*, 
              COALESCE(AVG(r.rating), 0) as average_rating, 
              COUNT(r.id) as review_count
       FROM books b
       LEFT JOIN reviews r ON b.id = r.book_id
       WHERE b.id = ?
       GROUP BY b.id`,
      [bookId]
    );

    if (books.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const book = {
      ...books[0],
      average_rating: parseFloat(books[0].average_rating) || 0,
      review_count: parseInt(books[0].review_count) || 0,
      published_date: books[0].published_date ? books[0].published_date.toISOString().split('T')[0] : null
    };

    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin only route for adding books
app.post('/api/books', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, author, description, isbn, published_date, genre, cover_image } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    // Validate and clean title and author
    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();
    
    if (cleanTitle.length < 1 || cleanAuthor.length < 1) {
      return res.status(400).json({ error: 'Title and author cannot be empty' });
    }

    // Validate ISBN if provided
    if (isbn) {
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      if (!/^(?:\d{10}|\d{13})$/.test(cleanIsbn)) {
        return res.status(400).json({ error: 'Invalid ISBN format. Must be 10 or 13 digits.' });
      }
      
      // Check for duplicate ISBN
      const [existingIsbn] = await db.execute(
        'SELECT id FROM books WHERE isbn = ? AND isbn IS NOT NULL',
        [isbn.trim()]
      );
      
      if (existingIsbn.length > 0) {
        return res.status(400).json({ error: 'A book with this ISBN already exists' });
      }
    }

    // Validate published_date if provided
    if (published_date) {
      const date = new Date(published_date);
      if (isNaN(date.getTime()) || date > new Date()) {
        return res.status(400).json({ error: 'Invalid published date or date cannot be in the future' });
      }
    }

    // Validate cover_image URL if provided
    if (cover_image) {
      try {
        new URL(cover_image);
        if (!/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(cover_image)) {
          return res.status(400).json({ error: 'Cover image must be a valid image URL (jpg, png, gif, webp, svg)' });
        }
      } catch {
        return res.status(400).json({ error: 'Invalid cover image URL' });
      }
    }

    const [result] = await db.execute(
      `INSERT INTO books (title, author, description, isbn, published_date, genre, cover_image, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        cleanTitle,
        cleanAuthor,
        description?.trim() || null,
        isbn?.trim() || null,
        published_date || null,
        genre?.trim() || null,
        cover_image?.trim() || null
      ]
    );

    // Get the created book with ratings
    const [newBook] = await db.execute(
      `SELECT b.*, 
              COALESCE(AVG(r.rating), 0) as average_rating, 
              COUNT(r.id) as review_count
       FROM books b
       LEFT JOIN reviews r ON b.id = r.book_id
       WHERE b.id = ?
       GROUP BY b.id`,
      [result.insertId]
    );

    const formattedBook = {
      ...newBook[0],
      average_rating: 0,
      review_count: 0,
      published_date: newBook[0].published_date ? newBook[0].published_date.toISOString().split('T')[0] : null
    };

    res.status(201).json({
      message: 'Book added successfully',
      bookId: result.insertId,
      book: formattedBook
    });
  } catch (error) {
    console.error('Error adding book:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A book with this information already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin only route for updating books
app.put('/api/books/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, author, description, isbn, published_date, genre, cover_image } = req.body;
    
    // Validate book ID
    if (!bookId || isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    // Check if book exists
    const [existingBook] = await db.execute(
      'SELECT id, isbn FROM books WHERE id = ?',
      [bookId]
    );

    if (existingBook.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Validate and clean title and author
    const cleanTitle = title.trim();
    const cleanAuthor = author.trim();
    
    if (cleanTitle.length < 1 || cleanAuthor.length < 1) {
      return res.status(400).json({ error: 'Title and author cannot be empty' });
    }

    // Validate ISBN if provided and different from current
    if (isbn && isbn.trim() !== existingBook[0].isbn) {
      const cleanIsbn = isbn.replace(/[-\s]/g, '');
      if (!/^(?:\d{10}|\d{13})$/.test(cleanIsbn)) {
        return res.status(400).json({ error: 'Invalid ISBN format. Must be 10 or 13 digits.' });
      }
      
      // Check for duplicate ISBN
      const [duplicateIsbn] = await db.execute(
        'SELECT id FROM books WHERE isbn = ? AND id != ? AND isbn IS NOT NULL',
        [isbn.trim(), bookId]
      );
      
      if (duplicateIsbn.length > 0) {
        return res.status(400).json({ error: 'A book with this ISBN already exists' });
      }
    }

    // Validate published_date if provided
    if (published_date) {
      const date = new Date(published_date);
      if (isNaN(date.getTime()) || date > new Date()) {
        return res.status(400).json({ error: 'Invalid published date or date cannot be in the future' });
      }
    }

    // Validate cover_image URL if provided
    if (cover_image) {
      try {
        new URL(cover_image);
        if (!/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(cover_image)) {
          return res.status(400).json({ error: 'Cover image must be a valid image URL (jpg, png, gif, webp, svg)' });
        }
      } catch {
        return res.status(400).json({ error: 'Invalid cover image URL' });
      }
    }

    await db.execute(
      `UPDATE books 
       SET title = ?, author = ?, description = ?, isbn = ?, published_date = ?, 
           genre = ?, cover_image = ?, updated_at = NOW() 
       WHERE id = ?`,
      [
        cleanTitle,
        cleanAuthor,
        description?.trim() || null,
        isbn?.trim() || null,
        published_date || null,
        genre?.trim() || null,
        cover_image?.trim() || null,
        bookId
      ]
    );

    // Get the updated book with ratings
    const [updatedBook] = await db.execute(
      `SELECT b.*, 
              COALESCE(AVG(r.rating), 0) as average_rating, 
              COUNT(r.id) as review_count
       FROM books b
       LEFT JOIN reviews r ON b.id = r.book_id
       WHERE b.id = ?
       GROUP BY b.id`,
      [bookId]
    );

    const formattedBook = {
      ...updatedBook[0],
      average_rating: parseFloat(updatedBook[0].average_rating) || 0,
      review_count: parseInt(updatedBook[0].review_count) || 0,
      published_date: updatedBook[0].published_date ? updatedBook[0].published_date.toISOString().split('T')[0] : null
    };

    res.json({
      message: 'Book updated successfully',
      book: formattedBook
    });
  } catch (error) {
        console.error('Error updating book:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'A book with this information already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin only route for deleting books
app.delete('/api/books/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookId = req.params.id;

    // Validate book ID
    if (!bookId || isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    // Check if book exists
    const [existingBook] = await db.execute(
      'SELECT id, title FROM books WHERE id = ?',
      [bookId]
    );

    if (existingBook.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    // Start transaction for data integrity
    await db.execute('START TRANSACTION');

    try {
      // Delete associated reviews first
      await db.execute(
        'DELETE FROM reviews WHERE book_id = ?',
        [bookId]
      );

      // Delete the book
      const [deleteResult] = await db.execute(
        'DELETE FROM books WHERE id = ?',
        [bookId]
      );

      // Commit transaction
      await db.execute('COMMIT');

      res.json({
        message: `Book "${existingBook[0].title}" and all associated reviews deleted successfully`,
        deletedBookId: parseInt(bookId)
      });
    } catch (error) {
      // Rollback transaction on error
      await db.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get books by specific author
app.get('/api/books/author/:author', async (req, res) => {
  try {
    const author = req.params.author;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!author || author.trim().length === 0) {
      return res.status(400).json({ error: 'Author name is required' });
    }

    const [books] = await db.execute(
      `SELECT b.*, 
              COALESCE(AVG(r.rating), 0) as average_rating, 
              COUNT(r.id) as review_count
       FROM books b
       LEFT JOIN reviews r ON b.id = r.book_id
       WHERE b.author LIKE ?
       GROUP BY b.id
       ORDER BY b.published_date DESC, b.title ASC
       LIMIT ? OFFSET ?`,
      [`%${author}%`, limit, offset]
    );

    // Get total count
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM books WHERE author LIKE ?',
      [`%${author}%`]
    );

    const total = countResult[0].total;

    const formattedBooks = books.map(book => ({
      ...book,
      average_rating: parseFloat(book.average_rating) || 0,
      review_count: parseInt(book.review_count) || 0,
      published_date: book.published_date ? book.published_date.toISOString().split('T')[0] : null
    }));

    res.json({
      books: formattedBooks,
      author: author,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching books by author:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get book statistics for admin dashboard
app.get('/api/books/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get total books count
    const [totalBooks] = await db.execute(
      'SELECT COUNT(*) as total FROM books'
    );

    // Get books by genre
    const [genreStats] = await db.execute(
      `SELECT genre, COUNT(*) as count
       FROM books 
       WHERE genre IS NOT NULL AND genre != ''
       GROUP BY genre
       ORDER BY count DESC
       LIMIT 10`
    );

    // Get recent books (last 30 days)
    const [recentBooks] = await db.execute(
      `SELECT COUNT(*) as count
       FROM books 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    // Get top rated books
    const [topRated] = await db.execute(
      `SELECT b.title, b.author, COALESCE(AVG(r.rating), 0) as average_rating, COUNT(r.id) as review_count
       FROM books b
       LEFT JOIN reviews r ON b.id = r.book_id
       GROUP BY b.id, b.title, b.author
       HAVING review_count >= 3
       ORDER BY average_rating DESC, review_count DESC
       LIMIT 5`
    );

    // Get books without reviews
    const [booksWithoutReviews] = await db.execute(
      `SELECT COUNT(*) as count
       FROM books b
       LEFT JOIN reviews r ON b.id = r.book_id
       WHERE r.id IS NULL`
    );

    res.json({
      totalBooks: totalBooks[0].total,
      recentBooks: recentBooks[0].count,
      booksWithoutReviews: booksWithoutReviews[0].count,
      genreDistribution: genreStats,
      topRatedBooks: topRated.map(book => ({
        ...book,
        average_rating: parseFloat(book.average_rating) || 0,
        review_count: parseInt(book.review_count) || 0
      }))
    });
  } catch (error) {
    console.error('Error fetching book statistics:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bulk operations for admin
app.post('/api/books/bulk', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { action, bookIds } = req.body;

    if (!action || !bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
      return res.status(400).json({ error: 'Action and book IDs are required' });
    }

    // Validate book IDs
    const validIds = bookIds.filter(id => !isNaN(id) && parseInt(id) > 0);
    if (validIds.length === 0) {
      return res.status(400).json({ error: 'No valid book IDs provided' });
    }

    const placeholders = validIds.map(() => '?').join(',');

    switch (action) {
      case 'delete':
        await db.execute('START TRANSACTION');
        try {
          // Delete reviews first
          await db.execute(
            `DELETE FROM reviews WHERE book_id IN (${placeholders})`,
            validIds
          );
          
          // Delete books
          const [deleteResult] = await db.execute(
            `DELETE FROM books WHERE id IN (${placeholders})`,
            validIds
          );
          
          await db.execute('COMMIT');
          
          res.json({
            message: `${deleteResult.affectedRows} books deleted successfully`,
            deletedCount: deleteResult.affectedRows
          });
        } catch (error) {
          await db.execute('ROLLBACK');
          throw error;
        }
        break;

      case 'update_genre':
        const { genre } = req.body;
        if (!genre) {
          return res.status(400).json({ error: 'Genre is required for update operation' });
        }

        const [updateResult] = await db.execute(
          `UPDATE books SET genre = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
          [genre, ...validIds]
        );

        res.json({
          message: `${updateResult.affectedRows} books updated successfully`,
          updatedCount: updateResult.affectedRows
        });
        break;

      default:
        return res.status(400).json({ error: 'Invalid action. Supported actions: delete, update_genre' });
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Review routes
app.get('/api/books/:id/reviews', async (req, res) => {
  try {
    const [reviews] = await db.execute(
      `SELECT r.*, u.username 
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.book_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/books/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const bookId = req.params.id;
    
    if (!rating) {
      return res.status(400).json({ error: 'Rating is required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if user already reviewed this book
    const [existingReview] = await db.execute(
      'SELECT id FROM reviews WHERE user_id = ? AND book_id = ?',
      [req.user.userId, bookId]
    );

    if (existingReview.length > 0) {
      return res.status(400).json({ error: 'You have already reviewed this book' });
    }

        const [result] = await db.execute(
      'INSERT INTO reviews (user_id, book_id, rating, comment) VALUES (?, ?, ?, ?)',
      [req.user.userId, bookId, rating, comment]
    );

    res.status(201).json({
      message: 'Review submitted successfully',
      reviewId: result.insertId
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get recent reviews for admin dashboard
app.get('/api/reviews/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    
    const [reviews] = await db.execute(
      `SELECT r.*, u.username, b.title as book_title
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       JOIN books b ON r.book_id = b.id
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [limit]
    );

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update review
app.put('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const reviewId = req.params.id;
    
    if (!rating) {
      return res.status(400).json({ error: 'Rating is required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if review exists and belongs to user
    const [reviews] = await db.execute(
      'SELECT user_id FROM reviews WHERE id = ?',
      [reviewId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (reviews[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this review' });
    }

    const [result] = await db.execute(
      'UPDATE reviews SET rating = ?, comment = ? WHERE id = ?',
      [rating, comment, reviewId]
    );

    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete review
app.delete('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const reviewId = req.params.id;
    
    // Check if review exists and belongs to user (or user is admin)
    const [reviews] = await db.execute(
      'SELECT user_id FROM reviews WHERE id = ?',
      [reviewId]
    );

    if (reviews.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Check if user owns the review or is admin
    const [users] = await db.execute(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    const isAdmin = users[0]?.role === 'admin';
    const isOwner = reviews[0].user_id === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized to delete this review' });
    }

    const [result] = await db.execute(
      'DELETE FROM reviews WHERE id = ?',
      [reviewId]
    );

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// User routes
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.execute(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's reviews
    const [reviews] = await db.execute(
      `SELECT r.*, b.title as book_title
       FROM reviews r
       JOIN books b ON r.book_id = b.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({
      ...users[0],
      reviews
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's reviews
app.get('/api/users/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user is requesting their own reviews or is admin
    const [users] = await db.execute(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    const isAdmin = users[0]?.role === 'admin';
    const isOwner = parseInt(userId) === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const [reviews] = await db.execute(
      `SELECT r.*, b.title as book_title, b.id as book_id
       FROM reviews r
       JOIN books b ON r.book_id = b.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if user is updating their own profile or is admin
    const [users] = await db.execute(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    const isAdmin = users[0]?.role === 'admin';
    const isOwner = parseInt(userId) === req.user.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { username, email } = req.body;
    
    const [result] = await db.execute(
      'UPDATE users SET username = ?, email = ? WHERE id = ?',
      [username, email, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin routes for user management
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
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

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user role (admin only)
app.put('/api/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Prevent admin from changing their own role
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const [result] = await db.execute(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Prevent admin from deleting themselves
    if (parseInt(userId) === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const [result] = await db.execute(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Dashboard stats (admin only)
app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [bookCount] = await db.execute('SELECT COUNT(*) as count FROM books');
    const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
    const [reviewCount] = await db.execute('SELECT COUNT(*) as count FROM reviews');
    const [avgRating] = await db.execute('SELECT AVG(rating) as avg FROM reviews');

    res.json({
      totalBooks: bookCount[0].count,
      totalUsers: userCount[0].count,
      totalReviews: reviewCount[0].count,
      averageRating: parseFloat(avgRating[0].avg || 0).toFixed(1)
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (db) {
    await db.end();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  if (db) {
    await db.end();
  }
  process.exit(0);
});

