import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createSellerAccount() {
  try {
    console.log('🏪 Creating seller account...');

    // Hash password
    const hashedPassword = await bcrypt.hash('Seller@2025', 10);

    // Check if seller already exists
    const existingSeller = await prisma.user.findUnique({
      where: { email: 'seller@feriwala.in' }
    });

    if (existingSeller) {
      console.log('✅ Seller account already exists!');
      console.log('Email:', existingSeller.email);
      console.log('Role:', existingSeller.role);
      return existingSeller;
    }

    // Create seller account
    const seller = await prisma.user.create({
      data: {
        email: 'seller@feriwala.in',
        password: hashedPassword,
        firstName: 'Feriwala',
        lastName: 'Seller',
        role: 'RESELLER',
        phone: '+91-9876543210',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    console.log('✅ Seller account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: seller@feriwala.in');
    console.log('🔐 Password: Seller@2025');
    console.log('👤 Role:', seller.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return seller;
  } catch (error) {
    console.error('❌ Error creating seller account:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createSellerAccount()
  .then(() => {
    console.log('\n✨ Seller account setup complete!');
    console.log('🚀 You can now login at: https://frontend-two-psi-33.vercel.app/auth/login');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to create seller account:', error);
    process.exit(1);
  });
