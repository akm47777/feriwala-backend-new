require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { category: true, subcategory: true }
    });
    
    console.log('\n📦 Recent Products in Database:\n');
    products.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   Category: ${p.category.name}`);
      console.log(`   Subcategory: ${p.subcategory?.name || 'None'}`);
      console.log(`   Active: ${p.isActive ? '✅' : '❌'}`);
      console.log(`   Created: ${p.createdAt}`);
      console.log('');
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkProducts();
