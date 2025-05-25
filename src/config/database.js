const mysql = require('mysql2/promise');

let db;

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

const initDatabase = async () => {
  try {
    console.log('Attempting to connect to Hostinger MySQL database...');
    console.log('DB Host:', process.env.DB_HOST);
    console.log('DB Name:', process.env.DB_NAME);
    console.log('DB User:', process.env.DB_USER);
    console.log('DB Port:', process.env.DB_PORT);
    
    // Validate required environment variables
    if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD) {
      throw new Error('Missing required database environment variables');
    }
    
    // Hostinger MySQL configuration (NO SSL, clean config)
    const dbConfig = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      // NO SSL for Hostinger
      ssl: false,
      // Remove invalid options that cause warnings
      connectTimeout: 60000,
      // Charset setting
      charset: 'utf8mb4'
    };
    
    console.log('Creating connection pool with config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      ssl: dbConfig.ssl
    });
    
    // Create connection pool
    db = mysql.createPool(dbConfig);
    
    // Test the connection
    console.log('Testing database connection...');
    const [rows] = await db.execute('SELECT 1 as test');
    console.log('Database connection test successful:', rows);
    
    console.log('Connected to Hostinger MySQL database successfully');
    
    // Create tables if they don't exist
    await createTables();
    
    // Insert demo data if needed
    await insertDemoData();
    
  } catch (error) {
    console.error('Hostinger database connection failed:', error);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER
    });
    throw error;
  }
};

const createTables = async () => {
  try {
    console.log('Creating/verifying tables in Hostinger database...');
    
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Users table created/verified');

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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Books table created/verified');

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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✓ Reviews table created/verified');
    
    console.log('All tables created/verified successfully in Hostinger database');
  } catch (error) {
    console.error('Error creating tables in Hostinger database:', error);
    throw error;
  }
};

const insertDemoData = async () => {
  try {
    console.log('Checking for demo data...');
    
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
      console.log('✓ Demo admin user created');
    } else {
      console.log('✓ Admin user already exists');
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
      console.log('✓ Demo books created');
    } else {
      console.log('✓ Books already exist in database');
    }
  } catch (error) {
    console.error('Error inserting demo data:', error);
    // Don't throw here, as this is not critical for app startup
  }
};

module.exports = {
  initDatabase,
  getDB
};
