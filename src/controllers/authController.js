const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');

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

const register = async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const userRole = role === 'admin' ? 'admin' : 'user';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const db = getDB();
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
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const db = getDB();
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
};

const demoLogin = async (req, res) => {
  try {
    const { userType } = req.body;
    
    if (!demoUsers[userType]) {
      return res.status(400).json({ error: 'Invalid demo user type' });
    }

    const demoUser = demoUsers[userType];
    
    const db = getDB();
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
};

module.exports = { register, login, demoLogin };