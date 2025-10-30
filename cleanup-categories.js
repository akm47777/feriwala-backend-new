const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupCategories() {
  try {
    console.log('🔍 Finding duplicate categories...\n');

    // Get all categories
    const allCategories = await prisma.category.findMany({
      orderBy: {
        createdAt: 'asc' // Keep the oldest version
      }
    });

    console.log(`Total categories: ${allCategories.length}\n`);

    // Group by name
    const categoriesByName = {};
    allCategories.forEach(cat => {
      if (!categoriesByName[cat.name]) {
        categoriesByName[cat.name] = [];
      }
      categoriesByName[cat.name].push(cat);
    });

    // Find and delete duplicates
    let deletedCount = 0;
    for (const [name, categories] of Object.entries(categoriesByName)) {
      if (categories.length > 1) {
        console.log(`📁 Found ${categories.length} copies of "${name}"`);
        
        // Keep the first (oldest) one, delete the rest
        const toDelete = categories.slice(1);
        
        for (const category of toDelete) {
          console.log(`   ❌ Deleting duplicate: ${category.id} (created: ${category.createdAt})`);
          
          // First update all products to use the kept category
          await prisma.product.updateMany({
            where: { categoryId: category.id },
            data: { categoryId: categories[0].id }
          });
          
          // Then delete the duplicate category
          await prisma.category.delete({
            where: { id: category.id }
          });
          deletedCount++;
        }
        
        console.log(`   ✅ Kept: ${categories[0].id} (created: ${categories[0].createdAt})\n`);
      }
    }

    if (deletedCount === 0) {
      console.log('✨ No duplicate categories found!');
    } else {
      console.log(`\n✅ Deleted ${deletedCount} duplicate category(ies)`);
      
      // Show remaining categories
      const remaining = await prisma.category.findMany({
        orderBy: { name: 'asc' }
      });
      
      console.log(`\n📊 Remaining categories: ${remaining.length}`);
      remaining.forEach(cat => {
        console.log(`   📁 ${cat.name} (ID: ${cat.id})`);
      });
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

cleanupCategories();
