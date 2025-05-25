# Book Review Platform

A full-stack web application for browsing books, reading reviews, and rating books. Built with React frontend and Node.js/Express backend with MySQL database.

## Features

### User Features
- User registration and authentication
- Browse books with search and pagination
- View detailed book information
- Read and write book reviews
- Rate books (1-5 stars)
- User profile management
- View personal review history

### Admin Features
- All user features
- Add new books to the platform
- Admin-only access to book management

## Tech Stack

### Frontend
- React.js with functional components and hooks
- React Router for navigation
- Context API for state management
- Axios for API calls
- CSS3 for styling (responsive design)

### Backend
- Node.js with Express.js
- MySQL database
- JWT authentication
- bcryptjs for password hashing
- CORS enabled
- Input validation and sanitization

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Backend Setup

1. Clone the repository and navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=book_review_db
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

5. Set up the database:
```bash
mysql -u your_username -p < database/init.sql
```

6. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Books
- `GET /api/books` - Get all books (with pagination and search)
- `GET /api/books/:id` - Get specific book
- `POST /api/books` - Add new book (admin only)

### Reviews
- `GET /api/reviews?book_id=:id` - Get reviews for a book
- `POST /api/reviews` - Submit a review (authenticated users)

### Users
- `GET /api/users/:id` - Get user profile (authenticated)
- `PUT /api/users/:id` - Update user profile (authenticated)

## Default Admin Account

A default admin account is created during database initialization:
- **Email**: admin@bookreviews.com
- **Password**: admin123
- **Role**: admin

**Important**: Change the default admin password in production!

## Project Structure

```
book-review-platform/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.js
│   └── package.json
├── backend/
│   ├── database/
│   ├── routes/
│   ├── middleware/
│   ├── models/
│   ├── server.js
│   └── package.json
└── README.md
```

## Features in Detail

### User Authentication
- Secure JWT-based authentication
- Password hashing with bcrypt
- Role-based access control (user/admin)
- Protected routes on both frontend and backend

### Book Management
- Comprehensive book information (title, author, description, ISBN, genre, etc.)
- Search functionality by title and author
- Pagination for better performance
- Admin-only book addition

### Review System
- 5-star rating system
- Text reviews with comments
- One review per user per book
- Review aggregation and display

### Responsive Design
- Mobile-first approach
- Responsive grid layouts
- Touch-friendly interface
- Cross-browser compatibility

## Security Features

- JWT token authentication
- Password hashing
- Input validation and sanitization
- CORS configuration
- Rate limiting
- SQL injection prevention
- XSS protection

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@bookreviews.com or create an issue in the GitHub repository.

## Deployment

### Production Deployment

#### Backend Deployment (Heroku/Railway/DigitalOcean)

1. Set production environment variables:
```env
NODE_ENV=production
DB_HOST=your_production_db_host
DB_NAME=your_production_db_name
DB_USER=your_production_db_user
DB_PASSWORD=your_production_db_password
JWT_SECRET=your_production_jwt_secret
FRONTEND_URL=https://your-frontend-domain.com
```

2. Update CORS settings for production
3. Ensure database is properly configured
4. Deploy using your preferred platform

#### Frontend Deployment (Netlify/Vercel)

1. Build the production version:
```bash
npm run build
```

2. Set environment variables:
```env
REACT_APP_API_URL=https://your-backend-domain.com/api
```

3. Deploy the `build` folder to your hosting platform

### Database Migration

For production, ensure you run the database initialization script:
```sql
mysql -u username -p production_db < database/init.sql
```

## Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## Performance Considerations

- Implement database indexing for frequently queried fields
- Use pagination for large datasets
- Implement caching strategies (Redis)
- Optimize images and assets
- Use CDN for static assets
- Implement lazy loading for components

## Future Enhancements

- [ ] Book cover image uploads
- [ ] Advanced search filters (genre, rating, publication date)
- [ ] User book collections/wishlists
- [ ] Social features (follow users, share reviews)
- [ ] Email notifications for new reviews
- [ ] Book recommendation system
- [ ] Export reviews to PDF
- [ ] Dark mode theme
- [ ] Multi-language support
- [ ] Mobile app (React Native)

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **CORS Errors**
   - Verify frontend URL in backend CORS configuration
   - Check API URL in frontend environment variables

3. **Authentication Issues**
   - Verify JWT secret is consistent
   - Check token expiration settings
   - Clear browser localStorage if needed

4. **Book Addition Fails**
   - Ensure user has admin role
   - Check required fields are provided
   - Verify authentication token is valid

### Debug Mode

Enable debug mode by setting:
```env
NODE_ENV=development
DEBUG=true
```

## API Documentation

### Error Responses

All API endpoints return consistent error responses:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": "2023-12-01T10:30:00Z"
}
```

### Success Responses

Successful responses include relevant data and metadata:

```json
{
  "data": {},
  "message": "Success message",
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Code Quality

### ESLint Configuration
The project uses ESLint for code quality:
```bash
npm run lint
```

### Prettier Configuration
Code formatting with Prettier:
```bash
npm run format
```

### Git Hooks
Pre-commit hooks ensure code quality:
- Lint checking
- Format checking
- Test execution

## Environment Variables Reference

### Backend (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=book_review_db
DB_USER=root
DB_PASSWORD=password

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# Server
PORT=5000
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:3000

# Optional
DEBUG=false
LOG_LEVEL=info
```

### Frontend (.env)
```env
# API Configuration
REACT_APP_API_URL=http://localhost:5000/api

# Optional
REACT_APP_DEBUG=false
REACT_APP_VERSION=1.0.0
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Books Table
```sql
CREATE TABLE books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description TEXT,
  isbn VARCHAR(20),
  published_date DATE,
  genre VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Reviews Table
```sql
CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  book_id INT NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_book_review (user_id, book_id)
);
```

## Contributing Guidelines

### Code Style
- Use meaningful variable and function names
- Write clear comments for complex logic
- Follow React best practices (hooks, functional components)
- Use async/await for asynchronous operations
- Implement proper error handling

### Pull Request Process
1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update the README if necessary
5. Request review from maintainers

### Issue Reporting
When reporting issues, please include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser/Node.js version
- Error messages or screenshots

## Acknowledgments

- React.js community for excellent documentation
- Express.js for the robust backend framework
- MySQL for reliable database management
- All contributors who helped improve this project

---

**Built with ❤️ by the Book Review Platform Team**

For more information, visit our [GitHub repository](https://github.com/your-username/book-review-platform)
```

Now let's create a package.json for the frontend:

```json:frontend/package.json
{
  "name": "book-review-frontend",
  "version": "1.0.0",
  "description": "Frontend for Book Review Platform",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.1",
    "axios": "^1.3.4",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject",
    "lint": "eslint src/**/*.{js,jsx}",
    "lint:fix": "eslint src/**/*.{js,jsx} --fix",
    "format": "prettier --write src/**/*.{js,jsx,css}"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "eslint": "^8.36.0",
    "prettier": "^2.8.4"
  },
  "proxy": "http://localhost:5000"
}
```

Finally, let's create a .gitignore file for the entire project:

```gitignore:.gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Production builds
/frontend/build
/backend/dist

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite
*.sqlite3

# Logs
logs
*.log

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Temporary folders
tmp/
temp/

# Build artifacts
build/
dist/

# Test artifacts
test-results/
coverage/

# Package lock files (choose one)
package-lock.json
# yarn.lock
