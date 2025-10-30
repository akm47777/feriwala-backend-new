const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      images: true
    }
  });

  console.log('All Products:\n');
  products.forEach(p => {
    console.log(`${p.name}:`);
    console.log(`  Images: ${JSON.stringify(p.images)}\n`);
  });

  await prisma.$disconnect();
})();
