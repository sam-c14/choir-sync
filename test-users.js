const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

async function main() {
  const director = await prisma.user.findUnique({ where: { email: 'director@test.local' } });
  const chorister = await prisma.user.findUnique({ where: { email: 'chorister@test.local' } });

  const tokenDirector = jwt.sign({ id: director.id, role: director.role }, JWT_SECRET);
  const tokenChorister = jwt.sign({ id: chorister.id, role: chorister.role }, JWT_SECRET);

  const fetchWithToken = async (url, method, token, body = null) => {
    const res = await fetch(`http://localhost:3333/api/v1/users${url}`, {
      method,
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined
    });
    return res.status;
  };

  console.log('Testing GET /');
  console.log('Director:', await fetchWithToken('', 'GET', tokenDirector));
  console.log('Chorister:', await fetchWithToken('', 'GET', tokenChorister));

  console.log('\nTesting PATCH /:id/role to demote the ONLY director');
  console.log('Director Demote Self:', await fetchWithToken(`/${director.id}/role`, 'PATCH', tokenDirector, { role: 'CHORISTER' }));

  console.log('\nTesting DELETE /:id on the director');
  console.log('Director Delete Self:', await fetchWithToken(`/${director.id}`, 'DELETE', tokenDirector));
}
main().catch(console.error).finally(() => prisma.$disconnect());
