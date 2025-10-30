import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDemoData() {
  console.log('🧹 Cleaning demo/test data from database...\n');

  try {
    // Delete test/demo products (those with demo/test/sample in name or description)
    const demoProducts = await prisma.product.deleteMany({
      where: {
        OR: [
          { name: { contains: 'demo', mode: 'insensitive' } },
          { name: { contains: 'test', mode: 'insensitive' } },
          { name: { contains: 'sample', mode: 'insensitive' } },
          { description: { contains: 'demo', mode: 'insensitive' } },
          { description: { contains: 'test', mode: 'insensitive' } },
          { description: { contains: 'sample', mode: 'insensitive' } },
        ],
      },
    });
    console.log(`✅ Deleted ${demoProducts.count} demo products`);

    // Delete test users (those with example.com email or test/demo in name)
    const demoUsers = await prisma.user.deleteMany({
      where: {
        OR: [
          { email: { contains: 'example.com' } },
          { email: { contains: 'test' } },
          { email: { contains: 'demo' } },
          { firstName: { contains: 'test', mode: 'insensitive' } },
          { firstName: { contains: 'demo', mode: 'insensitive' } },
        ],
      },
    });
    console.log(`✅ Deleted ${demoUsers.count} demo users`);

    // Delete expired OTPs
    const expiredOtps = await prisma.otp.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    console.log(`✅ Deleted ${expiredOtps.count} expired OTPs`);

    // Count remaining data
    const productCount = await prisma.product.count();
    const userCount = await prisma.user.count();
    const otpCount = await prisma.otp.count();

    console.log('\n📊 Database Summary:');
    console.log(`   Products: ${productCount}`);
    console.log(`   Users: ${userCount}`);
    console.log(`   Active OTPs: ${otpCount}`);

    console.log('\n✨ Demo data cleanup complete!');
  } catch (error) {
    console.error('❌ Error cleaning demo data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDemoData();
