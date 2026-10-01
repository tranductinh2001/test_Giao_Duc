/**
 * Workflow Test Script
 * Tests the unified workflow pipeline
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_zTLhji4ovXq1@ep-falling-river-ai2fe7pg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['error'] });

async function testWorkflow() {
  console.log('=== Testing Workflow Pipeline ===\n');

  try {
    // Get a lesson plan with sections
    const lessonPlan = await prisma.lessonPlan.findFirst({
      where: {
        sections: {
          some: {
            rawContent: {
              not: ''
            }
          }
        }
      },
      include: {
        sections: {
          where: { versionNumber: 1 },
          orderBy: { sectionOrder: 'asc' }
        }
      }
    });

    if (!lessonPlan) {
      console.log('No lesson plan with content found!');
      return;
    }

    console.log('Testing with lesson plan:');
    console.log('  ID:', lessonPlan.id);
    console.log('  Title:', lessonPlan.title);
    console.log('  Status:', lessonPlan.status);
    console.log('  Sections:', lessonPlan.sections.length);

    // Get first user for testing
    const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) {
      console.log('No admin user found!');
      return;
    }
    console.log('  User:', user.email);

    // Create a workflow session
    console.log('\nCreating workflow session...');
    const session = await prisma.workflowSession.create({
      data: {
        lessonPlanId: lessonPlan.id,
        userId: user.id,
        status: 'PENDING',
        currentStep: 'PENDING',
        progress: 0,
      }
    });
    console.log('  Session ID:', session.id);

    // Update to PARSING
    await prisma.workflowSession.update({
      where: { id: session.id },
      data: {
        status: 'PARSING',
        currentStep: 'PARSING',
        progress: 10,
        startedAt: new Date(),
      }
    });
    console.log('  Status: PARSING');

    // Check sections exist
    const sections = lessonPlan.sections;
    console.log('\nSection Analysis:');
    console.log('  Total sections:', sections.length);
    console.log('  Total content size:', sections.reduce((sum, s) => sum + (s.rawContent?.length || 0), 0), 'chars');

    // Create a simple test
    console.log('\n=== Testing Parser ===');
    const { SectionParser } = require('./src/core/rule-engine-v2/parsers/SectionParser');
    const { TemplateRepository } = require('./src/lib/repositories/TemplateRepository');

    const repo = new TemplateRepository();
    const template = await repo.findDefault();

    if (template) {
      console.log('  Template loaded:', template.name);
      console.log('  Parser rules:', template.parserRules?.length || 0);
      console.log('  Structure rules:', template.structureRules?.length || 0);
      console.log('  Content rules:', template.contentRules?.length || 0);
    } else {
      console.log('  No default template found!');
    }

    console.log('\n=== Test Complete ===');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

testWorkflow();
