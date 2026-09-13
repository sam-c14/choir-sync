const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

async function main() {
  const director = await prisma.user.findUnique({ where: { email: 'director@test.local' } });
  const chorister = await prisma.user.findUnique({ where: { email: 'chorister@test.local' } });

  const tokenDirector = jwt.sign({ id: director.id, role: director.role, leadsVoicePart: director.leadsVoicePart }, JWT_SECRET);
  const tokenChorister = jwt.sign({ id: chorister.id, role: chorister.role, leadsVoicePart: chorister.leadsVoicePart }, JWT_SECRET);

  const fetchWithToken = async (url, method, token, body = null) => {
    const res = await fetch(`http://localhost:3333/api/v1/uniforms${url}`, {
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
  console.log('Director:', await fetchWithToken('?filter=current', 'GET', tokenDirector));
  console.log('Chorister:', await fetchWithToken('?filter=current', 'GET', tokenChorister));
  console.log('No token:', await fetchWithToken('?filter=current', 'GET', null));

  console.log('\nTesting POST /');
  console.log('Director:', await fetchWithToken('', 'POST', tokenDirector, { serviceDate: new Date().toISOString(), femaleOutfit: 'Dress', maleOutfit: 'Suit' }));
  console.log('Chorister:', await fetchWithToken('', 'POST', tokenChorister, { serviceDate: new Date().toISOString(), femaleOutfit: 'Dress', maleOutfit: 'Suit' }));
  console.log('No token:', await fetchWithToken('', 'POST', null, { serviceDate: new Date().toISOString(), femaleOutfit: 'Dress', maleOutfit: 'Suit' }));
}

main().catch(console.error).finally(() => prisma.$disconnect());
