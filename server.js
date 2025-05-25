const express = require('express');
const cors = require('cors');
const { initDatabase } = require('./src/config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/books', require('./src/routes/bookRoutes'));
app.use('/api/reviews', require('./src/routes/reviewRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  try {
    console.log('Starting server...');
    console.log('Environment:', process.env.NODE_ENV || 'development');
    
    // Add retry logic for database connection
    let retries = 5;
    while (retries > 0) {
      try {
        await initDatabase();
        break;
      } catch (error) {
        console.error(`Database connection attempt failed. Retries left: ${retries - 1}`);
        if (retries === 1) throw error;
        retries--;
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retry
      }
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer();
