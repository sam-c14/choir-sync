const { PrismaClient } = require('@prisma/client');

async function run() {
  const prodUrl = process.env.PROD_DB_URL;
  if (!prodUrl) {
    console.error('❌ Please provide your production database URL!');
    console.log('Usage: PROD_DB_URL="postgresql://..." node cleanup-prod.js');
    return;
  }

  const prisma = new PrismaClient({ datasources: { db: { url: prodUrl } } });

  console.log('Connecting to production database...');
  try {
    const parts = await prisma.songPart.findMany({
      include: { voiceSnippets: true }
    });
    
    let deleted = 0;
    for (const p of parts) {
      if ((!p.notes || p.notes.trim() === '') && p.voiceSnippets.length === 0) {
        await prisma.songPart.delete({ where: { id: p.id } });
        deleted++;
      }
    }
    console.log(`✅ Successfully cleaned up ${deleted} empty ghost parts from production!`);
  } catch (err) {
    console.error('Failed to cleanup:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
