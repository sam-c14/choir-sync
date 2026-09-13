const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

async function main() {
  const localChorister = await prisma.user.findUnique({ where: { email: 'chorister@test.local' } });
  const googleChorister = await prisma.user.findUnique({ where: { email: 'google-chorister@test.local' } });

  const tokenLocal = jwt.sign(
    { id: localChorister.id, role: localChorister.role, leadsVoicePart: localChorister.leadsVoicePart },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  const tokenGoogle = jwt.sign(
    { id: googleChorister.id, role: googleChorister.role, leadsVoicePart: googleChorister.leadsVoicePart },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('Local token payload:', jwt.decode(tokenLocal));
  console.log('Google token payload:', jwt.decode(tokenGoogle));
}

main().catch(console.error).finally(() => prisma.$disconnect());
