import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { config } from './config/database'
import { logger } from './utils/logger'
import { errorHandler } from './middleware/errorHandler'
import { notFound } from './middleware/notFound'

// Route imports
import authRoutes from './routes/auth'
import userRoutes from './routes/users'
import productRoutes from './routes/products'
import categoryRoutes from './routes/categories'
import cartRoutes from './routes/cart'
import orderRoutes from './routes/orders'
import wishlistRoutes from './routes/wishlist'
import reviewRoutes from './routes/reviews'
import resellerRoutes from './routes/resellers'
import adminRoutes from './routes/admin'
import paymentRoutes from './routes/payments'
import uploadRoutes from './routes/upload'
import emailRoutes from './routes/emailRoutes'
import healthRoutes from './routes/health'
import sellerRoutes from './routes/seller'

const app = express()

// Trust proxy - needed for rate limiting behind Nginx/Vercel
app.set('trust proxy', 1)

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

app.use(limiter)

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Compression middleware
app.use(compression())

// Logging middleware
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim())
    }
  }))
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
  })
})

// API routes
const apiPrefix = process.env.API_PREFIX || '/api'

// Serve static files from uploads directory (through API prefix for HTTPS)
app.use(`${apiPrefix}/uploads`, express.static(path.join(__dirname, '../uploads')))

app.use(`${apiPrefix}/auth`, authRoutes)
app.use(`${apiPrefix}/users`, userRoutes)
app.use(`${apiPrefix}/products`, productRoutes)
app.use(`${apiPrefix}/categories`, categoryRoutes)
app.use(`${apiPrefix}/cart`, cartRoutes)
app.use(`${apiPrefix}/orders`, orderRoutes)
app.use(`${apiPrefix}/wishlist`, wishlistRoutes)
app.use(`${apiPrefix}/reviews`, reviewRoutes)
app.use(`${apiPrefix}/resellers`, resellerRoutes)
app.use(`${apiPrefix}/admin`, adminRoutes)
app.use(`${apiPrefix}/payments`, paymentRoutes)
app.use(`${apiPrefix}/upload`, uploadRoutes)
app.use(`${apiPrefix}/email`, emailRoutes)
app.use(`${apiPrefix}`, healthRoutes)
app.use(`${apiPrefix}`, sellerRoutes)

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Feriwala API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
  })
})

// Error handling middleware (must be last)
app.use(notFound)
app.use(errorHandler)

const PORT = process.env.PORT || 5000

const startServer = async () => {
  try {
    // Initialize database connection
    await config.initializeDatabase()
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`)
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`)
      logger.info(`📊 Health check: http://localhost:${PORT}/health`)
      logger.info(`🔗 API Base URL: http://localhost:${PORT}${apiPrefix}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err)
  process.exit(1)
})

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...')
  process.exit(0)
})

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...')
  process.exit(0)
})

if (process.env.NODE_ENV !== 'test') {
  startServer()
}

export default app