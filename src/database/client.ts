import { PrismaClient } from '@prisma/client'

// Global instance to prevent multiple connections in development
declare global {
  var __prisma: PrismaClient | undefined
}

const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export default prisma

// Helper function to connect to database
export const connectDB = async () => {
  try {
    await prisma.$connect()
    console.log('📄 Database connected successfully')
  } catch (error) {
    console.error('Database connection failed:', error)
    process.exit(1)
  }
}

// Helper function to disconnect from database
export const disconnectDB = async () => {
  try {
    await prisma.$disconnect()
    console.log('📄 Database disconnected successfully')
  } catch (error) {
    console.error('Database disconnection failed:', error)
  }
}

// Handle application shutdown
process.on('SIGINT', async () => {
  await disconnectDB()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await disconnectDB()
  process.exit(0)
})