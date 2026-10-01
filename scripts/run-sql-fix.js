const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zTLhji4ovXq1@ep-falling-river-ai2fe7pg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require';

async function runFix() {
  const pool = new Pool({ connectionString });

  try {
    // Add chaptersFound column
    await pool.query(`
      ALTER TABLE "TextbookIndexJob" ADD COLUMN IF NOT EXISTS "chaptersFound" INTEGER DEFAULT 0;
    `);
    console.log('✅ Added chaptersFound column to TextbookIndexJob');

    // Also add chaptersSaved if missing (from schema)
    await pool.query(`
      ALTER TABLE "TextbookIndexJob" ADD COLUMN IF NOT EXISTS "chaptersSaved" INTEGER DEFAULT 0;
    `);
    console.log('✅ Added chaptersSaved column to TextbookIndexJob');

    console.log('\n✅ All fixes applied successfully!');
  } catch (error) {
    if (error.code === '42701' && error.message.includes('already exists')) {
      console.log('ℹ️  Column already exists');
    } else {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runFix();
