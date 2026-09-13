const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.uniformSchedule.create({
    data: {
      serviceDate: today,
      femaleOutfit: 'Boundary Female',
      maleOutfit: 'Boundary Male'
    }
  });
  console.log('Seeded today uniform');
}
main().catch(console.error).finally(() => prisma.$disconnect());
