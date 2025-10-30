const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteDuplicateProducts() {
  try {
    console.log('🔍 Finding duplicate products...\n');

    // Get all products
    const allProducts = await prisma.product.findMany({
      orderBy: {
        createdAt: 'asc' // Keep the oldest version of each duplicate
      }
    });

    console.log(`Total products: ${allProducts.length}\n`);

    // Group by name to find duplicates
    const productsByName = {};
    allProducts.forEach(product => {
      if (!productsByName[product.name]) {
        productsByName[product.name] = [];
      }
      productsByName[product.name].push(product);
    });

    // Find and delete duplicates
    let deletedCount = 0;
    for (const [name, products] of Object.entries(productsByName)) {
      if (products.length > 1) {
        console.log(`📦 Found ${products.length} copies of "${name}"`);
        
        // Keep the first (oldest) one, delete the rest
        const toDelete = products.slice(1);
        
        for (const product of toDelete) {
          console.log(`   ❌ Deleting duplicate: ${product.id} (created: ${product.createdAt})`);
          await prisma.product.delete({
            where: { id: product.id }
          });
          deletedCount++;
        }
        
        console.log(`   ✅ Kept: ${products[0].id} (created: ${products[0].createdAt})\n`);
      }
    }

    if (deletedCount === 0) {
      console.log('✨ No duplicate products found!');
    } else {
      console.log(`\n✅ Deleted ${deletedCount} duplicate product(s)`);
      
      // Show remaining products
      const remaining = await prisma.product.count();
      console.log(`📊 Remaining products: ${remaining}`);
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

deleteDuplicateProducts();
