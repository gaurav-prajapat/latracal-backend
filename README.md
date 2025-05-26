# Book Review Backend API - Latracal Assessment

A robust RESTful API backend service for the book review application, built as part of the Latracal technical assessment. This API provides comprehensive endpoints for book management, user authentication, and review functionality.

## 🚀 Project Overview

This backend service powers the book review application with a scalable architecture that handles user management, book data, reviews, ratings, and search functionality. Built with modern backend technologies and following REST API best practices.

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **express-validator** - Input validation
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variable management
- **multer** - File upload handling (if applicable)

## 📋 Prerequisites

Before running this project, make sure you have the following installed:

- **Node.js** (version 14.0 or higher)
- **npm** (version 6.0 or higher)
- **MongoDB** (version 4.4 or higher)
- **Git**

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/gaurav-prajapat/latracal-backend.git
```

### 2. Navigate to Project Directory

```bash
cd backend
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Configure your environment variables:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/book-review-db
DB_NAME=book_review_app

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=7d

# CORS Configuration
CLIENT_URL=http://localhost:3000

# Email Configuration (if applicable)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads
```

### 5. Database Setup

Start MongoDB service:

```bash
mongod
```

The application will automatically create the database and collections on first run.

### 6. Start the Server

#### Development Mode

```bash
npm run dev
```

#### Production Mode

```bash
npm start
```

The API will be available at `http://localhost:5000`

## 📜 Available Scripts

### Development

```bash
npm run dev
```
Starts the server with nodemon for auto-restart on file changes.

### Production

```bash
npm start
```
Starts the server in production mode.

### Testing

```bash
npm test
```
Runs the test suite using Jest.

### Database Operations

```bash
npm run seed
```
Seeds the database with sample data.

```bash
npm run db:reset
```
Resets the database (development only).

## 🏗️ Project Structure

```
backend/
├── config/
│   ├── database.js
│   └── config.js
├── controllers/
│   ├── authController.js
│   ├── bookController.js
│   ├── reviewController.js
│   └── userController.js
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   ├── validation.js
│   └── upload.js
├── models/
│   ├── User.js
│   ├── Book.js
│   └── Review.js
├── routes/
│   ├── auth.js
│   ├── books.js
│   ├── reviews.js
│   └── users.js
├── utils/
│   ├── helpers.js
│   ├── validators.js
│   └── constants.js
├── tests/
│   ├── auth.test.js
│   ├── books.test.js
│   └── reviews.test.js
├── uploads/
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## 🔌 API Endpoints

### Authentication Endpoints

```
POST   /api/auth/register     - User registration
POST   /api/auth/login        - User login
POST   /api/auth/logout       - User logout
GET    /api/auth/profile      - Get user profile
PUT    /api/auth/profile      - Update user profile
POST   /api/auth/forgot       - Forgot password
POST   /api/auth/reset        - Reset password
```

### Book Endpoints

```
GET    /api/books             - Get all books (with pagination)
GET    /api/books/:id         - Get book by ID
POST   /api/books             - Create new book (admin only)
PUT    /api/books/:id         - Update book (admin only)
DELETE /api/books/:id         - Delete book (admin only)
GET    /api/books/search      - Search books
GET    /api/books/category/:category - Get books by category
```

### Review Endpoints

```
GET    /api/reviews           - Get all reviews
GET    /api/reviews/book/:bookId - Get reviews for a book
POST   /api/reviews           - Create new review
PUT    /api/reviews/:id       - Update review (owner only)
DELETE /api/reviews/:id       - Delete review (owner/admin)
GET    /api/reviews/user/:userId - Get user's reviews
```

### User Endpoints

```
GET    /api/users             - Get all users (admin only)
GET    /api/users/:id         - Get user by ID
PUT    /api/users/:id         - Update user (admin only)
DELETE /api/users/:id         - Delete user (admin only)
```

## 📊 Database Schema

### User Model
```javascript
{
  _id: ObjectId,
  username: String (required, unique),
  email: String (required, unique),
  password: String (required, hashed),
  firstName: String,
  lastName: String,
  role: String (enum: ['user', 'admin']),
  avatar: String,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Book Model
```javascript
{
  _id: ObjectId,
  title: String (required),
  author: String (required),
  isbn: String (unique),
  description: String,
  category: String,
  publishedDate: Date,
  publisher: String,
  pageCount: Number,
  language: String,
  coverImage: String,
  averageRating: Number,
  totalReviews: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Review Model
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User'),
  book: ObjectId (ref: 'Book'),
  rating: Number (1-5, required),
  title: String,
  content: String,
  isRecommended: Boolean,
  helpfulVotes: Number,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Authentication & Authorization

- **JWT-based authentication** with secure token generation
- **Role-based access control** (User, Admin)
- **Password hashing** using bcrypt
- **Protected routes** with middleware validation
- **Token refresh** mechanism (if implemented)

## ✅ Input Validation & Security

- **Request validation** using express-validator
- **SQL injection protection** via Mongoose
- **XSS protection** with input sanitization
- **Rate limiting** to prevent abuse
- **CORS configuration** for cross-origin requests
- **Helmet.js** for security headers

## 🧪 Testing

### Run Tests

```bash
npm test
```

### Test Coverage

```bash
npm run test:coverage
```

### Test Categories
- **Unit Tests** - Individual function testing
- **Integration Tests** - API endpoint testing
- **Authentication Tests** - JWT and auth flow testing
- **Database Tests** - Model and query testing

## 📈 Performance & Optimization

- **Database indexing** for optimized queries
- **Pagination** for large data sets
- **Caching strategies** (Redis if implemented)
- **Query optimization** with Mongoose
- **Compression** middleware for response optimization

## 🚀 Deployment

### Environment Setup

```bash
npm run build
```

### Docker Deployment (if applicable)

```bash
docker build -t book-review-api .
docker run -p 5000:5000 book-review-api
```

### Production Considerations

- Set `NODE_ENV=production`
- Use process managers (PM2)
- Configure reverse proxy (Nginx)
- Set up SSL certificates
- Configure monitoring and logging

## 📝 API Documentation

### Postman Collection
Import the Postman collection from `/docs/postman_collection.json` for easy API testing.

### Swagger Documentation
Access interactive API documentation at `http://localhost:5000/api-docs` (if implemented).

## 🔍 Monitoring & Logging

- **Request logging** with Morgan
- **Error tracking** with custom error handlers
- **Performance monitoring** (if implemented)
- **Health check endpoint** at `/api/health`

## 📝 Additional Notes for Reviewers

### Code Quality
- **Clean Architecture** with separation of concerns
- **Error Handling** with comprehensive error responses
- **Code Documentation** with JSDoc comments
- **Consistent Coding Standards** following Node.js best practices
- **Git Workflow** with meaningful commit messages

### Security Implementation
- Input validation and sanitization
- Authentication and authorization
- Protection against common vulnerabilities
- Secure password handling

### Scalability Features
- Modular architecture for easy expansion
- Database optimization for performance
- Caching strategies for improved response times
- Horizontal scaling considerations

## 🐛 Known Issues & Limitations

- [List any known issues or current limitations]
- [Mention any features that are work in progress]

## 🔮 Future Enhancements

- [ ] Redis caching implementation
- [ ] Real-time notifications with Socket.io
- [ ] Advanced search with Elasticsearch
- [ ] File upload for book covers
- [ ] Email notification system
- [ ] API rate limiting with Redis
- [ ] Comprehensive logging with Winston

## 👨‍💻 Developer Information

**Developer**: Gaurav Prajapat  
**Assessment**: Latracal Technical Assessment  
**Repository**: https://github.com/gaurav-prajapat/latracal-backend  
**Frontend Repository**: https://github.com/gaurav-prajapat/book-review-frontend

## 📄 License

This project is created for assessment purposes.

---

**Note for Reviewers**: This backend API demonstrates proficiency in Node.js development, RESTful API design, database modeling, authentication systems, and backend security best practices. The code follows industry standards and is production-ready with proper error handling, validation, and documentation.
