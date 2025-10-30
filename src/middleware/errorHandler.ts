import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger'

interface ApiError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let { statusCode = 500, message } = err

  // Log error
  logger.error(`Error ${statusCode}: ${message}`, {
    error: err,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: err.stack,
  })

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    message = 'Resource not found'
    statusCode = 404
  }

  // Mongoose duplicate key
  if (err.message?.includes('duplicate key error')) {
    message = 'Duplicate field value entered'
    statusCode = 400
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = 'Validation Error'
    statusCode = 400
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token'
    statusCode = 401
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Token expired'
    statusCode = 401
  }

  // Multer errors
  if (err.message?.includes('LIMIT_FILE_SIZE')) {
    message = 'File too large'
    statusCode = 400
  }

  if (err.message?.includes('LIMIT_UNEXPECTED_FILE')) {
    message = 'Too many files'
    statusCode = 400
  }

  // Database connection errors
  if (err.message?.includes('ECONNREFUSED')) {
    message = 'Database connection failed'
    statusCode = 503
  }

  // Payment gateway errors
  if (err.message?.includes('PAYMENT_FAILED')) {
    message = 'Payment processing failed'
    statusCode = 400
  }

  // Rate limiting errors
  if (err.message?.includes('Too many requests')) {
    message = 'Too many requests, please try again later'
    statusCode = 429
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack,
        originalError: err.message 
      }),
    },
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
  })
}

// Async error handler wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

// Create custom error class
export class AppError extends Error {
  statusCode: number
  isOperational: boolean

  constructor(message: string, statusCode: number) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

// Error types for different scenarios
export const createError = {
  badRequest: (message: string = 'Bad Request') => new AppError(message, 400),
  unauthorized: (message: string = 'Unauthorized') => new AppError(message, 401),
  forbidden: (message: string = 'Forbidden') => new AppError(message, 403),
  notFound: (message: string = 'Not Found') => new AppError(message, 404),
  conflict: (message: string = 'Conflict') => new AppError(message, 409),
  unprocessableEntity: (message: string = 'Unprocessable Entity') => new AppError(message, 422),
  tooManyRequests: (message: string = 'Too Many Requests') => new AppError(message, 429),
  internalServer: (message: string = 'Internal Server Error') => new AppError(message, 500),
  badGateway: (message: string = 'Bad Gateway') => new AppError(message, 502),
  serviceUnavailable: (message: string = 'Service Unavailable') => new AppError(message, 503),
}