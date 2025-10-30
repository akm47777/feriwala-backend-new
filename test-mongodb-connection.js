require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connection...\n');
    
    await prisma.$connect();
    console.log('✅ MongoDB connected successfully!');
    
    const userCount = await prisma.user.count();
    console.log('👥 Total users:', userCount);
    
    const categoryCount = await prisma.category.count();
    console.log('📦 Total categories:', categoryCount);
    
    const productCount = await prisma.product.count();
    console.log('🛍️  Total products:', productCount);
    
    await prisma.$disconnect();
    console.log('\n✅ Database connection test PASSED!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection test FAILED!');
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
