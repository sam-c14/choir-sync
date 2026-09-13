const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

async function main() {
  const director = await prisma.user.findUnique({ where: { email: 'director@test.local' } });
  const token = jwt.sign({ id: director.id, role: director.role, leadsVoicePart: director.leadsVoicePart }, JWT_SECRET);

  const resCurrent = await fetch(`http://localhost:3333/api/v1/uniforms?filter=current`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const current = await resCurrent.json();
  console.log('Current count:', current.length);
  console.log('Current contains Boundary Female?', current.some(u => u.femaleOutfit === 'Boundary Female'));

  const resPast = await fetch(`http://localhost:3333/api/v1/uniforms?filter=past`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const past = await resPast.json();
  console.log('Past count:', past.length);
  console.log('Past contains Boundary Female?', past.some(u => u.femaleOutfit === 'Boundary Female'));
}
main().catch(console.error).finally(() => prisma.$disconnect());
