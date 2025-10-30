import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdminAccount() {
  try {
    console.log('👑 Creating admin account...');

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@2025', 10);

    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@feriwala.in' }
    });

    if (existingAdmin) {
      console.log('✅ Admin account already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Role:', existingAdmin.role);
      return existingAdmin;
    }

    // Create admin account
    const admin = await prisma.user.create({
      data: {
        email: 'admin@feriwala.in',
        password: hashedPassword,
        firstName: 'Feriwala',
        lastName: 'Admin',
        role: 'ADMIN',
        phone: '+91-9876543211',
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    });

    console.log('✅ Admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 ADMIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: admin@feriwala.in');
    console.log('🔐 Password: Admin@2025');
    console.log('👤 Role:', admin.role);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🌐 Login URL: https://frontend-two-psi-33.vercel.app/auth/login');
    console.log('📊 Admin Dashboard: https://frontend-two-psi-33.vercel.app/admin/AdminDashboard');
    console.log('');
    console.log('⚠️  IMPORTANT: Change this password after first login!');

    return admin;
  } catch (error) {
    console.error('❌ Error creating admin account:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
createAdminAccount()
  .then(() => {
    console.log('✅ Admin setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
