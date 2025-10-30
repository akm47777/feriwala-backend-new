const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('📊 Current Database Content:\n');
  
  const users = await prisma.user.findMany({ 
    select: { 
      email: true, 
      firstName: true, 
      lastName: true, 
      role: true 
    } 
  });
  
  console.log(`👥 Users (${users.length}):`);
  users.forEach(u => {
    console.log(`   - ${u.email} (${u.firstName} ${u.lastName}) - ${u.role}`);
  });
  
  const products = await prisma.product.findMany({ 
    select: { 
      name: true, 
      price: true 
    } 
  });
  
  console.log(`\n📦 Products (${products.length}):`);
  products.forEach(p => {
    console.log(`   - ${p.name} - ₹${p.price}`);
  });
  
  await prisma.$disconnect();
}

check();
