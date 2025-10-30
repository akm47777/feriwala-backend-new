import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting production database seeding...');

  // Create essential categories
  const categories = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
      isActive: true,
    },
    {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel for all',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
      isActive: true,
    },
    {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Home essentials and kitchen appliances',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
      isActive: true,
    },
    {
      name: 'Beauty & Personal Care',
      slug: 'beauty-personal-care',
      description: 'Beauty products and personal care items',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
      isActive: true,
    },
    {
      name: 'Sports & Fitness',
      slug: 'sports-fitness',
      description: 'Sports equipment and fitness accessories',
      image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400',
      isActive: true,
    },
    {
      name: 'Books & Media',
      slug: 'books-media',
      description: 'Books, magazines, and media products',
      image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400',
      isActive: true,
    },
  ];

  for (const categoryData of categories) {
    await prisma.category.upsert({
      where: { slug: categoryData.slug },
      update: {},
      create: categoryData,
    });
  }

  console.log('✅ Essential categories created');

  // Create admin user (only if not exists)
  const adminPassword = await bcrypt.hash('Admin@2025!SecurePassword', 12);
  await prisma.user.upsert({
    where: { email: 'admin@feriwala.com' },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@feriwala.com',
      password: adminPassword,
      phone: '+91-9999999999',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  console.log('✅ Admin user created');

  console.log('🎉 Production database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Categories: ${await prisma.category.count()}`);
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log('\n🔐 Admin Login Credentials:');
  console.log('Email: admin@feriwala.com');
  console.log('Password: Admin@2025!SecurePassword');
  console.log('\n⚠️  IMPORTANT: Change the admin password immediately after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
