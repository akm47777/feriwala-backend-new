#!/bin/bash

# Admin Account Setup Script for Feriwala
# This script creates an admin account in the database

echo "👑 Creating Admin Account..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create a temporary Node.js script
cat > /tmp/create-admin-temp.js << 'EOFJS'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('Admin@2025', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@feriwala.in' },
      update: {},
      create: {
        email: 'admin@feriwala.in',
        password: hashedPassword,
        firstName: 'Feriwala',
        lastName: 'Admin',
        role: 'ADMIN',
        phone: '+91-9876543211',
        isVerified: true
      }
    });

    console.log('\n✅ Admin Account Created!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 ADMIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: admin@feriwala.in');
    console.log('🔐 Password: Admin@2025');
    console.log('👤 Role: ADMIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 Login URL: https://frontend-two-psi-33.vercel.app/auth/login');
    console.log('📊 Admin Dashboard: https://frontend-two-psi-33.vercel.app/admin/AdminDashboard');
    console.log('\n⚠️  Change password after first login!\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createAdmin();
EOFJS

# Run the Node.js script
cd /home/ubuntu/feriwala/backend
node /tmp/create-admin-temp.js

# Clean up
rm -f /tmp/create-admin-temp.js

echo ""
echo "✅ Admin setup complete!"
