const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('password123', 10);
  
  await prisma.user.createMany({
    data: [
      {
        email: 'director@test.local',
        passwordHash: hash,
        role: 'DIRECTOR'
      },
      {
        email: 'alto-lead@test.local',
        passwordHash: hash,
        role: 'SECTION_LEADER',
        leadsVoicePart: 'ALTO'
      },
      {
        email: 'chorister@test.local',
        passwordHash: hash,
        role: 'CHORISTER'
      }
    ],
    skipDuplicates: true
  });
  console.log('Seeded users');
}

main().catch(console.error).finally(() => prisma.$disconnect());
