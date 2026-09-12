import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Director
  await prisma.user.upsert({
    where: { email: 'director@test.local' },
    update: {},
    create: {
      email: 'director@test.local',
      passwordHash,
      role: 'DIRECTOR',
    },
  });

  // Alto Section Leader
  await prisma.user.upsert({
    where: { email: 'alto-lead@test.local' },
    update: {},
    create: {
      email: 'alto-lead@test.local',
      passwordHash,
      role: 'SECTION_LEADER',
      leadsVoicePart: 'ALTO',
    },
  });

  // Chorister
  await prisma.user.upsert({
    where: { email: 'chorister@test.local' },
    update: {},
    create: {
      email: 'chorister@test.local',
      passwordHash,
      role: 'CHORISTER',
    },
  });

  console.log('Test users seeded successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
