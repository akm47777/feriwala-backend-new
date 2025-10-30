const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSubcategories() {
  try {
    console.log('🏗️  Creating subcategories...\n');

    // Get all categories
    const categories = await prisma.category.findMany();
    
    const subcategoriesData = {
      'Electronics': ['Headphones', 'Chargers', 'Cables', 'Power Banks', 'Phone Cases', 'Speakers'],
      'Clothing': ["Men's Shirts", "Women's Shirts", "Men's Pants", "Women's Pants", "Jeans", "Dresses", "T-Shirts", "Jackets", "Sweaters"],
      'Beauty & Personal Care': ['Skincare', 'Haircare', 'Makeup', 'Fragrances', 'Personal Hygiene', 'Bath & Body'],
      'Home & Kitchen': ['Cookware', 'Storage', 'Appliances', 'Utensils', 'Decor', 'Bedding', 'Towels']
    };

    for (const category of categories) {
      const subcategories = subcategoriesData[category.name];
      
      if (subcategories) {
        console.log(`📁 ${category.name}`);
        
        for (const subName of subcategories) {
          // Check if subcategory already exists
          const existing = await prisma.subcategory.findFirst({
            where: {
              name: subName,
              categoryId: category.id
            }
          });

          if (!existing) {
            await prisma.subcategory.create({
              data: {
                name: subName,
                slug: subName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                categoryId: category.id
              }
            });
            console.log(`   ✅ Created: ${subName}`);
          } else {
            console.log(`   ⏭️  Skipped (exists): ${subName}`);
          }
        }
        console.log('');
      }
    }

    console.log('\n✅ Subcategories created successfully!');
    
    // Show final structure
    const finalCategories = await prisma.category.findMany({
      include: {
        subcategories: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log('\n📊 Final Category Structure:\n');
    finalCategories.forEach(cat => {
      console.log(`📁 ${cat.name} (${cat.subcategories.length} subcategories)`);
      cat.subcategories.forEach(sub => {
        console.log(`   └─ ${sub.name}`);
      });
      console.log('');
    });

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createSubcategories();
