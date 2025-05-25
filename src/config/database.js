const mysql = require('mysql2/promise');

let db;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'book_review_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Remove these invalid options that cause warnings:
  // acquireTimeout, timeout, reconnect
  
  // Use these valid options instead:
  acquireTimeout: undefined, // Remove this line completely
  timeout: undefined,        // Remove this line completely
  reconnect: undefined,      // Remove this line completely
  
  // Add proper SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  
  // Add connection timeout settings
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

const initDatabase = async () => {
  try {
    console.log('Attempting to connect to database...');
    console.log('DB Host:', process.env.DB_HOST);
    console.log('DB Name:', process.env.DB_NAME);
    console.log('DB User:', process.env.DB_USER);
    
    // Create connection pool with corrected config
    db = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      connectTimeout: 60000
    });
    
    // Test the connection
    await db.execute('SELECT 1');
    console.log('Connected to MySQL database');
    
    // Create tables if they don't exist
    await createTables();
    
    // Insert demo data if needed
    await insertDemoData();
    
  } catch (error) {
    console.error('Database connection failed:', error);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    throw error;
  }
};

const createTables = async () => {
  try {
    console.log('Creating tables...');
    
    // Users table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_role (role)
      )
    `);
    console.log('Users table created/verified');

    // Books table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS books (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        description TEXT,
        isbn VARCHAR(20) UNIQUE,
        published_date DATE,
        genre VARCHAR(100),
        cover_image VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_title (title),
        INDEX idx_author (author),
        INDEX idx_genre (genre),
        INDEX idx_isbn (isbn),
        INDEX idx_published_date (published_date)
      )
    `);
    console.log('Books table created/verified');

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
        UNIQUE KEY unique_user_book (user_id, book_id),
        INDEX idx_user_id (user_id),
        INDEX idx_book_id (book_id),
        INDEX idx_rating (rating)
      )
    `);
    console.log('Reviews table created/verified');
    
    console.log('All tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const insertDemoData = async () => {
  try {
    // Check if admin user exists
    const [adminExists] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@bookreviews.com']
    );

    if (adminExists.length === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await db.execute(
        'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
        ['admin', 'admin@bookreviews.com', hashedPassword, 'admin']
      );
      console.log('Demo admin user created');
    }

    // Add some demo books if none exist
    const [booksCount] = await db.execute('SELECT COUNT(*) as count FROM books');
    if (booksCount[0].count === 0) {
      const demoBooks = [
        {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          description: 'A classic American novel set in the Jazz Age.',
          isbn: '9780743273565',
          published_date: '1925-04-10',
          genre: 'Fiction'
        },
        {
          title: 'To Kill a Mockingbird',
          author: 'Harper Lee',
          description: 'A gripping tale of racial injustice and childhood innocence.',
          isbn: '9780061120084',
          published_date: '1960-07-11',
          genre: 'Fiction'
        }
      ];

      for (const book of demoBooks) {
        await db.execute(
          'INSERT INTO books (title, author, description, isbn, published_date, genre) VALUES (?, ?, ?, ?, ?, ?)',
          [book.title, book.author, book.description, book.isbn, book.published_date, book.genre]
        );
      }
      console.log('Demo books created');
    }
  } catch (error) {
    console.error('Error inserting demo data:', error);
  }
};

module.exports = {
  initDatabase,
  getDB
};
