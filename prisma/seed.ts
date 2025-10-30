import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample categories
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
      isActive: true,
    },
  });

  const clothing = await prisma.category.create({
    data: {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel for all',
      image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
      isActive: true,
    },
  });

  const home = await prisma.category.create({
    data: {
      name: 'Home & Kitchen',
      slug: 'home-kitchen',
      description: 'Home essentials and kitchen appliances',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
      isActive: true,
    },
  });

  const beauty = await prisma.category.create({
    data: {
      name: 'Beauty & Personal Care',
      slug: 'beauty-personal-care',
      description: 'Beauty products and personal care items',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
      isActive: true,
    },
  });

  console.log('✅ Categories created');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@feriwala.com',
      password: adminPassword,
      phone: '+91-9876543210',
      role: 'ADMIN',
      isVerified: true,
    },
  });

  console.log('✅ Admin user created');

  // Create sample regular user
  const userPassword = await bcrypt.hash('user123', 12);
  const regularUser = await prisma.user.create({
    data: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: userPassword,
      phone: '+91-9876543211',
      role: 'CUSTOMER',
      isVerified: true,
    },
  });

  console.log('✅ Regular user created');

  // Create sample reseller
  const resellerPassword = await bcrypt.hash('reseller123', 12);
  const resellerUser = await prisma.user.create({
    data: {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      password: resellerPassword,
      phone: '+91-9876543212',
      role: 'RESELLER',
      isVerified: true,
      reseller: {
        create: {
          businessName: 'Jane\'s Fashion Store',
          gstNumber: 'GST123456789',
          panNumber: 'ABCDE1234F',
          accountNumber: '1234567890',
          ifscCode: 'SBIN0001234',
          accountHolderName: 'Jane Smith',
          bankName: 'State Bank of India',
          branchName: 'Main Branch',
          commissionRate: 15.0,
          referralCode: 'JANE001',
        },
      },
    },
  });

  console.log('✅ Reseller created');

  // Create sample products
  const products = [
    {
      name: 'Wireless Bluetooth Headphones',
      description: 'High-quality wireless headphones with noise cancellation',
      shortDescription: 'Premium wireless headphones',
      price: 2999.99,
      originalPrice: 4999.99,
      brand: 'TechPro',
      sku: 'WBH001',
      stock: 50,
      categoryId: electronics.id,
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
        'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500',
      ],
      tags: ['wireless', 'bluetooth', 'headphones', 'audio'],
      isActive: true,
      weight: 0.3,
      seoTitle: 'Wireless Bluetooth Headphones - Premium Audio',
      seoDescription: 'Experience premium sound quality with our wireless bluetooth headphones',
    },
    {
      name: 'Cotton T-Shirt - Unisex',
      description: 'Comfortable 100% cotton t-shirt suitable for all occasions',
      shortDescription: 'Comfortable cotton t-shirt',
      price: 599.99,
      originalPrice: 899.99,
      brand: 'FashionForward',
      sku: 'CTS001',
      stock: 100,
      categoryId: clothing.id,
      images: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500',
        'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=500',
      ],
      tags: ['cotton', 't-shirt', 'unisex', 'casual'],
      isActive: true,
      weight: 0.2,
      material: 'Cotton',
      seoTitle: 'Cotton T-Shirt Unisex - Comfortable Wear',
      seoDescription: 'Soft and comfortable cotton t-shirt for everyday wear',
    },
    {
      name: 'Stainless Steel Water Bottle',
      description: 'Eco-friendly stainless steel water bottle with temperature retention',
      shortDescription: 'Eco-friendly water bottle',
      price: 899.99,
      originalPrice: 1299.99,
      brand: 'EcoLife',
      sku: 'SSWB001',
      stock: 75,
      categoryId: home.id,
      images: [
        'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500',
        'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=500',
      ],
      tags: ['water bottle', 'stainless steel', 'eco-friendly', 'reusable'],
      isActive: true,
      weight: 0.5,
      seoTitle: 'Stainless Steel Water Bottle - Eco Friendly',
      seoDescription: 'Keep your drinks at perfect temperature with our stainless steel bottle',
    },
    {
      name: 'Organic Face Moisturizer',
      description: 'Natural organic face moisturizer for all skin types',
      shortDescription: 'Organic face moisturizer',
      price: 1299.99,
      originalPrice: 1899.99,
      brand: 'NaturalGlow',
      sku: 'OFM001',
      stock: 30,
      categoryId: beauty.id,
      images: [
        'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500',
        'https://images.unsplash.com/photo-1570194065650-d99eed0d5b2d?w=500',
      ],
      tags: ['organic', 'moisturizer', 'skincare', 'natural'],
      isActive: true,
      weight: 0.1,
      seoTitle: 'Organic Face Moisturizer - Natural Skincare',
      seoDescription: 'Nourish your skin with our organic face moisturizer',
    },
  ];

  for (const product of products) {
    await prisma.product.create({
      data: product,
    });
  }

  console.log('✅ Products created');

  // Create sample reviews
  // Note: Reviews require orderId, but we don't have orders yet
  // const productList = await prisma.product.findMany();
  
  // for (const product of productList) {
  //   // Create reviews for each product
  //   await prisma.review.createMany({
  //     data: [
  //       {
  //         userId: regularUser.id,
  //         productId: product.id,
  //         orderId: 'some-order-id', // Would need actual order
  //         rating: 5,
  //         title: 'Excellent product!',
  //         comment: 'Really happy with this purchase. Great quality and fast delivery.',
  //         isVerified: true,
  //       },
  //     ],
  //   });
  // }

  console.log('✅ Reviews section skipped (requires orders)');

  // Get created products for cart and wishlist
  const createdProducts = await prisma.product.findMany();

  // Create sample cart items
  if (createdProducts.length >= 2) {
    await prisma.cartItem.createMany({
      data: [
        {
          userId: regularUser.id,
          productId: createdProducts[0].id,
          quantity: 1,
        },
        {
          userId: regularUser.id,
          productId: createdProducts[1].id,
          quantity: 2,
        },
      ],
    });
  }

  console.log('✅ Cart items created');

  // Create sample wishlist items
  if (createdProducts.length >= 4) {
    await prisma.wishlistItem.createMany({
      data: [
        {
          userId: regularUser.id,
          productId: createdProducts[2].id,
        },
        {
          userId: regularUser.id,
          productId: createdProducts[3].id,
        },
      ],
    });
  }

  console.log('✅ Wishlist items created');

  // Create sample address
  await prisma.address.create({
    data: {
      userId: regularUser.id,
      type: 'HOME',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+91-9876543211',
      addressLine1: '123 Main Street',
      addressLine2: 'Apartment 4B',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India',
      isDefault: true,
    },
  });

  console.log('✅ Address created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Categories: ${await prisma.category.count()}`);
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log(`- Products: ${await prisma.product.count()}`);
  console.log(`- Reviews: ${await prisma.review.count()}`);
  console.log(`- Cart Items: ${await prisma.cartItem.count()}`);
  console.log(`- Wishlist Items: ${await prisma.wishlistItem.count()}`);
  console.log(`- Addresses: ${await prisma.address.count()}`);
  console.log('\n🔐 Login Credentials:');
  console.log('Admin: admin@feriwala.com / admin123');
  console.log('User: john.doe@example.com / user123');
  console.log('Reseller: jane.smith@example.com / reseller123');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });