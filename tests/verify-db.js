/**
 * Database Verification Script
 * Uses the same Prisma setup as the app
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zTLhji4ovXq1@ep-falling-river-ai2fe7pg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function verifyDatabase() {
  console.log('=== Database Verification ===\n');

  try {
    // Check Lesson Plans
    const lessonPlans = await prisma.lessonPlan.findMany({
      take: 5,
      select: { id: true, title: true, status: true, userId: true }
    });
    console.log(`Lesson Plans: ${lessonPlans.length} found`);
    if (lessonPlans.length > 0) {
      console.log(lessonPlans.map(lp => `  - ${lp.id.substring(0,8)}: ${lp.title?.substring(0,30)} (${lp.status})`).join('\n'));
    }

    // Check Users
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, name: true, email: true, role: true }
    });
    console.log(`\nUsers: ${users.length} found`);
    if (users.length > 0) {
      console.log(users.map(u => `  - ${u.name} (${u.email?.substring(0,20)}) - ${u.role}`).join('\n'));
    }

    // Check Templates
    const templates = await prisma.rule_templates.findMany({
      take: 5,
      select: { id: true, name: true, code: true, isActive: true }
    });
    console.log(`\nTemplates: ${templates.length} found`);
    if (templates.length > 0) {
      console.log(templates.map(t => `  - ${t.name} (${t.code}) - Active: ${t.isActive}`).join('\n'));
    }

    // Check Workflow Sessions
    const sessions = await prisma.workflowSession.findMany({
      take: 5,
      select: { id: true, lessonPlanId: true, status: true, createdAt: true }
    });
    console.log(`\nWorkflow Sessions: ${sessions.length} found`);
    if (sessions.length > 0) {
      console.log(sessions.map(s => `  - ${s.id.substring(0,8)}: ${s.status} (${s.createdAt})`).join('\n'));
    }

    // Check Review Results
    const reviews = await prisma.reviewResult.findMany({
      take: 5,
      select: { id: true, lessonPlanId: true, overallScore: true, status: true }
    });
    console.log(`\nReview Results: ${reviews.length} found`);
    if (reviews.length > 0) {
      console.log(reviews.map(r => `  - ${r.id.substring(0,8)}: Score ${r.overallScore} (${r.status})`).join('\n'));
    }

    console.log('\n=== Database Verified ===');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

verifyDatabase();
