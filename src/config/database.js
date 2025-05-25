const mysql = require('mysql2/promise');

let db = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'book_review_platform',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

const initDatabase = async () => {
  try {
    // Create connection pool
    db = mysql.createPool(dbConfig);
    
    console.log('Connected to MySQL database');
    
    // Create tables if they don't exist
    await createTables();
    
    // Insert demo data if needed
    await insertDemoData();
    
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

const createTables = async () => {
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
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_username (username),
        INDEX idx_role (role)
      )
    `);

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
        INDEX idx_published_date (published_date),
        FULLTEXT idx_search (title, author, description)
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
        UNIQUE KEY unique_user_book (user_id, book_id),
        INDEX idx_book_id (book_id),
        INDEX idx_user_id (user_id),
        INDEX idx_rating (rating),
        INDEX idx_created_at (created_at)
      )
    `);

    // Wishlist table (optional feature)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        book_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_book_wishlist (user_id, book_id),
        INDEX idx_user_wishlist (user_id),
        INDEX idx_book_wishlist (book_id)
      )
    `);

    console.log('Database tables created/verified successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
};

const insertDemoData = async () => {
  try {
    // Check if demo data already exists
    const [existingBooks] = await db.execute('SELECT COUNT(*) as count FROM books');
    if (existingBooks[0].count > 0) {
      console.log('Demo data already exists, skipping insertion');
      return;
    }

    console.log('Inserting demo data...');

    // Insert demo books
    const demoBooks = [
      {
        title: 'To Kill a Mockingbird',
        author: 'Harper Lee',
        description: 'A gripping, heart-wrenching, and wholly remarkable tale of coming-of-age in a South poisoned by virulent prejudice.',
        isbn: '9780061120084',
        published_date: '1960-07-11',
        genre: 'Fiction',
        cover_image: 'https://images-na.ssl-images-amazon.com/images/I/51IXWZzlgSL._SX330_BO1,204,203,200_.jpg'
      },
      {
        title: '1984',
        author: 'George Orwell',
        description: 'A dystopian social science fiction novel that follows the life of Winston Smith, a low-ranking member of the Party.',
        isbn: '9780451524935',
        published_date: '1949-06-08',
        genre: 'Science Fiction',
        cover_image: 'https://images-na.ssl-images-amazon.com/images/I/51Dd6aUVqQL._SX331_BO1,204,203,200_.jpg'
      },
      {
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
                description: 'A romantic novel that follows the character development of Elizabeth Bennet, the dynamic protagonist.',
        isbn: '9780141439518',
        published_date: '1813-01-28',
        genre: 'Romance',
        cover_image: 'https://images-na.ssl-images-amazon.com/images/I/51wScUt0gQL._SX331_BO1,204,203,200_.jpg'
      },
      {
        title: 'The Great Gatsby',
        author: 'F. Scott Fitzgerald',
        description: 'A classic American novel set in the Jazz Age that tells the story of Jay Gatsby and his pursuit of the American Dream.',
        isbn: '9780743273565',
        published_date: '1925-04-10',
        genre: 'Fiction',
        cover_image: 'https://images-na.ssl-images-amazon.com/images/I/51XlnZTRnTL._SX331_BO1,204,203,200_.jpg'
      },
      {
        title: 'The Catcher in the Rye',
        author: 'J.D. Salinger',
        description: 'A controversial novel that has become a classic of American literature, following teenager Holden Caulfield.',
        isbn: '9780316769174',
        published_date: '1951-07-16',
        genre: 'Fiction',
        cover_image: 'https://images-na.ssl-images-amazon.com/images/I/51icVOTqlvL._SX331_BO1,204,203,200_.jpg'
      },
      {
        title: 'Harry Potter and the Philosopher\'s Stone',
        author: 'J.K. Rowling',
        description: 'The first novel in the Harry Potter series, following a young wizard\'s journey at Hogwarts School.',
        isbn: '9780747532699',
        published_date: '1997-06-26',
        genre: 'Fantasy',
        cover_image: 'https://images-na.ssl-images-amazon.com/images/I/51HSkTKlauL._SX346_BO1,204,203,200_.jpg'
      },
      {
        title: 'The Lord of the Rings',
        author: 'J.R.R. Tolkien',
        description: 'An epic high fantasy novel that follows the quest to destroy the One Ring and defeat the Dark Lord Sauron.',
        isbn: '9780544003415',
        published_date: '1954-07-29',
        genre: 'Fantasy',
        cover_image: 'https://images-na.ssl-images-amazon.com/images/I/51EstVXM1UL._SX331_BO1,204,203,200_.jpg'
      },
      {
        title: 'The Hobbit',
        author: 'J.R.R. Tolkien',
        description: 'A fantasy novel that follows the journey of Bilbo Baggins as he joins a group of dwarves on a quest.',
        isbn: '9780547928227',
        published_date: '1937-09-21',
        genre: 'Fantasy',
        cover_image: 'https://images-na.ssl-images-amazon.com/images/I/51M8dY7s7cL._SX331_BO1,204,203,200_.jpg'
      },
      {
        title: 'Dune',
        author: 'Frank Herbert',
        description: 'A science fiction novel set in the distant future amidst a feudal interstellar society.',
        isbn: '9780441172719',
        published_date: '1965-08-01',
        genre: 'Science Fiction',
        cover_image: 'https://images-na.ssl-images-amazon.com/images/I/51cUVaBosEL._SX331_BO1,204,203,200_.jpg'
      },
      {
        title: 'The Hitchhiker\'s Guide to the Galaxy',
        author: 'Douglas Adams',
        description: 'A comedic science fiction series that follows the adventures of Arthur Dent.',
        isbn: '9780345391803',
        published_date: '1979-10-12',
        genre: 'Science Fiction',
        cover_image: 'https://images-na.ssl-images-amazon.com/images/I/51MzUz8rQcL._SX331_BO1,204,203,200_.jpg'
      }
    ];

    for (const book of demoBooks) {
      await db.execute(
        `INSERT INTO books (title, author, description, isbn, published_date, genre, cover_image) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [book.title, book.author, book.description, book.isbn, book.published_date, book.genre, book.cover_image]
      );
    }

    console.log('Demo books inserted successfully');
  } catch (error) {
    console.error('Error inserting demo data:', error);
    // Don't throw error here as it's not critical for app functionality
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

const closeDatabase = async () => {
  if (db) {
    await db.end();
    db = null;
    console.log('Database connection closed');
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const connection = await db.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
};

module.exports = {
  initDatabase,
  getDB,
  closeDatabase,
  testConnection
};

