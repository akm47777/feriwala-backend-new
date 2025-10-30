import winston from 'winston'
import path from 'path'

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
}

winston.addColors(colors)

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
)

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }),
  
  // File transport for error logs
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
]

// Create logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
})

// Create a stream object for Morgan
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim())
  },
}

// Helper functions for different log levels
export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta)
}

export const logError = (message: string, error?: Error | any) => {
  if (error instanceof Error) {
    logger.error(message, {
      error: error.message,
      stack: error.stack,
      ...error,
    })
  } else {
    logger.error(message, error)
  }
}

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta)
}

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta)
}

export const logHttp = (message: string, meta?: any) => {
  logger.http(message, meta)
}

// Performance logging helper
export const logPerformance = (label: string, startTime: number) => {
  const duration = Date.now() - startTime
  logger.info(`Performance: ${label} took ${duration}ms`)
}

// Request logging helper
export const logRequest = (req: any, statusCode: number, duration: number) => {
  const { method, url, ip, headers } = req
  logger.http(`${method} ${url}`, {
    statusCode,
    duration: `${duration}ms`,
    ip,
    userAgent: headers['user-agent'],
  })
}

// Database query logging helper
export const logQuery = (query: string, params?: any[], duration?: number) => {
  logger.debug('Database Query', {
    query,
    params,
    duration: duration ? `${duration}ms` : undefined,
  })
}

// User action logging helper
export const logUserAction = (userId: string, action: string, meta?: any) => {
  logger.info(`User Action: ${action}`, {
    userId,
    action,
    timestamp: new Date().toISOString(),
    ...meta,
  })
}

// Security event logging helper
export const logSecurityEvent = (event: string, meta?: any) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...meta,
  })
}

// Business metric logging helper
export const logBusinessMetric = (metric: string, value: number, meta?: any) => {
  logger.info(`Business Metric: ${metric}`, {
    metric,
    value,
    timestamp: new Date().toISOString(),
    ...meta,
  })
}

export default logger