const { getDB } = require('../config/database');

const getBooks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const genre = req.query.genre || '';
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder || 'DESC';
    const offset = (page - 1) * limit;

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

    if (search) {
      whereConditions.push('(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? OR b.description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (genre) {
      whereConditions.push('b.genre = ?');
      params.push(genre);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ` GROUP BY b.id ORDER BY ${validSortBy === 'average_rating' ? 'COALESCE(AVG(r.rating), 0)' : 'b.' + validSortBy} ${validSortOrder}`;
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const db = getDB();
    const [books] = await db.execute(query, params);
    
    let countQuery = 'SELECT COUNT(DISTINCT b.id) as total FROM books b';
    let countParams = [];
    
    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
      countParams = params.slice(0, -2);
    }
    
    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

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
};

const getBookById = async (req, res) => {
  try {
    const bookId = req.params.id;

    if (!bookId || isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const db = getDB();
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
};

const getFeaturedBooks = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    
    const db = getDB();
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
};

const getGenres = async (req, res) => {
  try {
    const db = getDB();
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
};

const getBooksByAuthor = async (req, res) => {
  try {
    const author = req.params.author;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!author || author.trim().length === 0) {
      return res.status(400).json({ error: 'Author name is required' });
    }

    const db = getDB();
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
};

const createBook = async (req, res) => {
  try {
    const { title, author, description, isbn, published_date, genre, cover_image } = req.body;
    
    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

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
      
      const db = getDB();
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

    const db = getDB();
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
};

const updateBook = async (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, author, description, isbn, published_date, genre, cover_image } = req.body;
    
    if (!bookId || isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    if (!title || !author) {
      return res.status(400).json({ error: 'Title and author are required' });
    }

    const db = getDB();
    const [existingBook] = await db.execute(
      'SELECT id, isbn FROM books WHERE id = ?',
      [bookId]
    );

    if (existingBook.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

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
};

const deleteBook = async (req, res) => {
  try {
    const bookId = req.params.id;

    if (!bookId || isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const db = getDB();
    const [existingBook] = await db.execute(
      'SELECT id, title FROM books WHERE id = ?',
      [bookId]
    );

    if (existingBook.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    await db.execute('START TRANSACTION');

    try {
      // Delete associated reviews and wishlist items first
      await db.execute('DELETE FROM reviews WHERE book_id = ?', [bookId]);
      await db.execute('DELETE FROM wishlist WHERE book_id = ?', [bookId]);
      
      // Delete the book
      await db.execute('DELETE FROM books WHERE id = ?', [bookId]);
      
      await db.execute('COMMIT');

      res.json({
        message: `Book "${existingBook[0].title}" and all associated data deleted successfully`,
        deletedBookId: parseInt(bookId)
      });
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getBookStats = async (req, res) => {
  try {
    const db = getDB();
    
    const [totalBooks] = await db.execute('SELECT COUNT(*) as total FROM books');
    
    const [genreStats] = await db.execute(
      `SELECT genre, COUNT(*) as count
       FROM books 
       WHERE genre IS NOT NULL AND genre != ''
       GROUP BY genre
       ORDER BY count DESC
       LIMIT 10`
    );

    const [recentBooks] = await db.execute(
      `SELECT COUNT(*) as count
       FROM books 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    const [topRated] = await db.execute(
      `SELECT b.title, b.author, COALESCE(AVG(r.rating), 0) as average_rating, COUNT(r.id) as review_count
       FROM books b
       LEFT JOIN reviews r ON b.id = r.book_id
       GROUP BY b.id, b.title, b.author
       HAVING review_count >= 3
       ORDER BY average_rating DESC, review_count DESC
       LIMIT 5`
    );

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
    console.error('Error fetching book stats:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const getRelatedBooks = async (req, res) => {
  try {
    const bookId = req.params.id;
    const limit = parseInt(req.query.limit) || 6;

    if (!bookId || isNaN(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }

    const db = getDB();
    
    // First get the current book's genre
    const [currentBook] = await db.execute(
      'SELECT genre FROM books WHERE id = ?',
      [bookId]
    );

    if (currentBook.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const genre = currentBook[0].genre;
    
    if (!genre) {
      return res.json([]);
    }

    // Get related books from the same genre
    const [relatedBooks] = await db.execute(
      `SELECT b.*, 
              COALESCE(AVG(r.rating), 0) as average_rating, 
              COUNT(r.id) as review_count
       FROM books b
       LEFT JOIN reviews r ON b.id = r.book_id
       WHERE b.genre = ? AND b.id != ?
       GROUP BY b.id
       ORDER BY average_rating DESC, review_count DESC
       LIMIT ?`,
      [genre, bookId, limit]
    );

    const formattedBooks = relatedBooks.map(book => ({
      ...book,
      average_rating: parseFloat(book.average_rating) || 0,
      review_count: parseInt(book.review_count) || 0,
      published_date: book.published_date ? book.published_date.toISOString().split('T')[0] : null
    }));

    res.json(formattedBooks);
  } catch (error) {
    console.error('Error fetching related books:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

const searchBooks = async (req, res) => {
  try {
    const { q, genre, author, minRating, maxRating, sortBy = 'relevance' } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    if (!q && !genre && !author) {
      return res.status(400).json({ error: 'At least one search parameter is required' });
    }

    let query = `
      SELECT b.*, 
             COALESCE(AVG(r.rating), 0) as average_rating, 
             COUNT(r.id) as review_count
      FROM books b
      LEFT JOIN reviews r ON b.id = r.book_id
    `;
    
    let whereConditions = [];
    let params = [];

    if (q) {
      whereConditions.push('(b.title LIKE ? OR b.author LIKE ? OR b.description LIKE ? OR b.isbn LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    if (genre) {
      whereConditions.push('b.genre = ?');
      params.push(genre);
    }

    if (author) {
      whereConditions.push('b.author LIKE ?');
      params.push(`%${author}%`);
    }

    if (whereConditions.length > 0) {
      query += ' WHERE ' + whereConditions.join(' AND ');
    }

    query += ' GROUP BY b.id';

    // Add rating filter after GROUP BY
    if (minRating || maxRating) {
      query += ' HAVING';
      const ratingConditions = [];
      
      if (minRating) {
        ratingConditions.push('COALESCE(AVG(r.rating), 0) >= ?');
        params.push(parseFloat(minRating));
      }
      
      if (maxRating) {
        ratingConditions.push('COALESCE(AVG(r.rating), 0) <= ?');
        params.push(parseFloat(maxRating));
      }
      
      query += ' ' + ratingConditions.join(' AND ');
    }

    // Add sorting
    switch (sortBy) {
      case 'title':
        query += ' ORDER BY b.title ASC';
        break;
      case 'author':
        query += ' ORDER BY b.author ASC';
        break;
      case 'rating':
        query += ' ORDER BY average_rating DESC';
        break;
      case 'newest':
        query += ' ORDER BY b.created_at DESC';
        break;
      case 'oldest':
        query += ' ORDER BY b.created_at ASC';
        break;
      default: // relevance
        query += ' ORDER BY review_count DESC, average_rating DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const db = getDB();
    const [books] = await db.execute(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(DISTINCT b.id) as total FROM books b';
    let countParams = [];
    
    if (whereConditions.length > 0) {
      countQuery += ' WHERE ' + whereConditions.join(' AND ');
      countParams = params.slice(0, whereConditions.length * (q ? 4 : 1));
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0].total;

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
      },
      searchParams: { q, genre, author, minRating, maxRating, sortBy }
    });
  } catch (error) {
    console.error('Error searching books:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
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
};

