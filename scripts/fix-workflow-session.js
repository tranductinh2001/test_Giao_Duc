const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zTLhji4ovXq1@ep-falling-river-ai2fe7pg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require';

async function runFix() {
  const pool = new Pool({ connectionString });

  try {
    // Add result column
    await pool.query(`
      ALTER TABLE "WorkflowSession" ADD COLUMN IF NOT EXISTS "result" JSONB;
    `);
    console.log('✅ Added result column to WorkflowSession');

    // Also check for other columns
    const columns = await pool.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'WorkflowSession';
    `);
    console.log('Current WorkflowSession columns:');
    console.log(columns.rows);

  } catch(e) {
    console.log('Error:', e.message);
  } finally {
    await pool.end();
  }
}

runFix();
