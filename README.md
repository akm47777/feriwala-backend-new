# Feriwala Backend API

E-commerce platform backend with reseller functionality, built with Node.js, Express, and MongoDB.

![Deploy Status](https://github.com/akm47777/feriwala/actions/workflows/deploy.yml/badge.svg)

## 🚀 Live API

- **Production**: `https://feriwala-backend.onrender.com`
- **Health Check**: `https://feriwala-backend.onrender.com/api/health`
- **API Docs**: Coming soon

## ✨ Features

- 🔐 JWT Authentication with refresh tokens
- 👤 User management (Customers, Sellers, Admins)
- 🛍️ Product catalog with categories
- 🛒 Shopping cart functionality
- 📦 Order management system
- 💰 Payment integration ready
- 📧 Email notifications (OTP verification)
- 🔍 Search and filtering
- ⭐ Product reviews and ratings
- 📊 Seller dashboard
- 🎯 Reseller functionality
- 🔒 Role-based access control

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB Atlas
- **ORM**: Prisma
- **Authentication**: JWT
- **Email**: Nodemailer (Zoho SMTP)
- **Deployment**: Render
- **CI/CD**: GitHub Actions

## 📋 Prerequisites

- Node.js 18 or higher
- MongoDB database
- npm or yarn

## 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/akm47777/feriwala.git
cd feriwala

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy
```

## 🌱 Environment Variables

Create a `.env` file:

```env
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=your_mongodb_connection_string

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Email
SMTP_HOST=smtp.zoho.in
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password

# URLs
FRONTEND_URL=https://www.feriwala.in
BACKEND_URL=https://api.feriwala.in
CORS_ORIGIN=https://feriwala.in,https://www.feriwala.in

# Security
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=your_session_secret
```

## 🚀 Running Locally

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/verify-otp` - Verify OTP

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/:id` - Get user by ID (Admin)

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (Seller)
- `PUT /api/products/:id` - Update product (Seller)
- `DELETE /api/products/:id` - Delete product (Seller)

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category (Admin)

### Cart
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:id` - Update cart item
- `DELETE /api/cart/:id` - Remove from cart

### Orders
- `GET /api/orders` - List user orders
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create order
- `PUT /api/orders/:id` - Update order status (Seller)

### Reviews
- `GET /api/products/:id/reviews` - Get product reviews
- `POST /api/products/:id/reviews` - Add review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

## 🔐 Authentication

Use JWT tokens in the Authorization header:

```bash
Authorization: Bearer <your_token>
```

## 📊 Health Checks

### Basic Health Check
```bash
curl https://feriwala-backend.onrender.com/api/health
```

### Detailed Health Check
```bash
curl https://feriwala-backend.onrender.com/api/health/detailed
```

## 🚢 Deployment

### Automatic Deployment (Render)

1. Push to `main` branch
2. GitHub Actions runs tests
3. Render automatically deploys
4. Visit your live API

### Manual Deployment

```bash
# Build
npm run build

# Deploy to Render
git push origin main
```

## 📈 Monitoring

- **Logs**: Render Dashboard > Logs
- **Metrics**: Render Dashboard > Metrics
- **Health**: `/api/health`

## 🔒 Security

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Password hashing with bcrypt
- JWT token expiration
- Input validation
- SQL injection protection (Prisma)

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [GitHub Secrets Setup](./GITHUB_SECRETS_SETUP.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 👥 Team

- **Developer**: Ankush Kumar
- **Email**: verify@feriwala.in

## 🐛 Support

For issues and questions:
- Create an issue on GitHub
- Email: verify@feriwala.in

## 🎯 Roadmap

- [ ] API documentation with Swagger
- [ ] Webhook support
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] GraphQL API
- [ ] Real-time notifications
- [ ] Payment gateway integration
- [ ] Inventory management
- [ ] Shipping integration

---

Made with ❤️ for Feriwala