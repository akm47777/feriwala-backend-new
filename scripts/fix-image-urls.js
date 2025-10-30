const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixImageUrls() {
  console.log('🔧 Fixing image URLs to include backend domain...\n');

  // Find all products with relative URLs in images array
  const products = await prisma.product.findMany({
    where: {
      images: {
        isEmpty: false
      }
    }
  });

  console.log(`Found ${products.length} products with images\n`);

  const backendUrl = 'https://www.feriwala.in/api';
  let fixedCount = 0;

  for (const product of products) {
    // Check if any image starts with /uploads/ or has the old IP address
    const hasRelativeUrls = product.images.some(img => 
      img.startsWith('/uploads/') || img.includes('13.233.244.213')
    );
    
    if (hasRelativeUrls) {
      const updatedImages = product.images.map((img) => {
        if (img.startsWith('/uploads/')) {
          return `${backendUrl}${img}`;
        }
        if (img.includes('13.233.244.213')) {
          return img.replace('http://13.233.244.213', backendUrl);
        }
        return img;
      });

      await prisma.product.update({
        where: { id: product.id },
        data: { images: updatedImages }
      });
      
      fixedCount++;
      console.log(`✅ Fixed: ${product.name}`);
      console.log(`   Old: ${product.images[0]}`);
      console.log(`   New: ${updatedImages[0]}\n`);
    }
  }

  console.log(`✨ Fixed ${fixedCount} products!`);
  await prisma.$disconnect();
}

fixImageUrls();
