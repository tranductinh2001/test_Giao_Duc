const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zTLhji4ovXq1@ep-falling-river-ai2fe7pg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require';

async function runFix() {
  const pool = new Pool({ connectionString });

  try {
    // Add all missing TextbookIndexJob columns from schema
    const columns = [
      { name: 'errorMessage', type: 'TEXT' },
      { name: 'extractionLog', type: 'JSONB' },
      { name: 'startedAt', type: 'TIMESTAMP' },
      { name: 'completedAt', type: 'TIMESTAMP' },
    ];

    for (const col of columns) {
      try {
        await pool.query(`
          ALTER TABLE "TextbookIndexJob" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.type};
        `);
        console.log(`✅ Added ${col.name} column to TextbookIndexJob`);
      } catch (error) {
        if (error.code === '42701' && error.message.includes('already exists')) {
          console.log(`ℹ️  ${col.name} column already exists`);
        } else {
          console.error(`❌ Error adding ${col.name}:`, error.message);
        }
      }
    }

    console.log('\n✅ All TextbookIndexJob fixes applied!');
  } finally {
    await pool.end();
  }
}

runFix();
