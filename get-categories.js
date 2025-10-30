const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        subcategories: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('=== CATEGORIES AND SUBCATEGORIES ===\n');
    categories.forEach(cat => {
      console.log(`📁 ${cat.name} (ID: ${cat.id})`);
      if (cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories.forEach(sub => {
          console.log(`   └─ ${sub.name} (ID: ${sub.id})`);
        });
      } else {
        console.log(`   └─ No subcategories`);
      }
      console.log('');
    });

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

getCategories();
