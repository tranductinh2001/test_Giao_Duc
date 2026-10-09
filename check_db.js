const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.user.count();
    console.log('Database connected! User count:', count);
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    });
    console.log('Existing users:', JSON.stringify(users, null, 2));
  } catch (err) {
    console.log('Database connection error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
