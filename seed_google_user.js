const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.user.create({
    data: {
      email: 'google-chorister@test.local',
      provider: 'GOOGLE',
      googleId: '1234567890',
      role: 'CHORISTER',
    }
  });
  console.log('Seeded Google user');
}

main().catch(console.error).finally(() => prisma.$disconnect());
