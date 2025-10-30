#!/bin/bash

# Feriwala Seller Account Setup Script
# Run this on the EC2 server

echo "🏪 Creating Feriwala Seller Account..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Navigate to backend directory
cd /home/ubuntu/feriwala/backend

# Create the seller account using Node.js
cat > /tmp/create-seller.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createSeller() {
  try {
    const hashedPassword = await bcrypt.hash('Seller@2025', 10);
    
    const seller = await prisma.user.upsert({
      where: { email: 'seller@feriwala.in' },
      update: {},
      create: {
        email: 'seller@feriwala.in',
        password: hashedPassword,
        firstName: 'Feriwala',
        lastName: 'Seller',
        role: 'SELLER',
        phone: '+91-9876543210',
        isVerified: true,
      }
    });

    console.log('\n✅ Seller Account Created!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: seller@feriwala.in');
    console.log('🔐 Password: Seller@2025');
    console.log('👤 Role:', seller.role);
    console.log('🌐 Login URL: https://frontend-two-psi-33.vercel.app/auth/login');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createSeller();
EOF

# Run the script
node /tmp/create-seller.js

# Cleanup
rm /tmp/create-seller.js

echo ""
echo "✨ Setup complete!"
echo "🚀 You can now login and start uploading products"
