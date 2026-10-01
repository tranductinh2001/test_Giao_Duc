/**
 * Seed Default Template - 5-Step Lesson Plan
 *
 * Seeds the database with default template and rules
 */

import { prisma } from '../src/lib/prisma';
import { DEFAULT_TEMPLATE_5STEP } from '../src/core/rule-engine-v2/seed/default-template';

async function seedDefaultTemplate() {
  console.log('[Seed] Starting Rule Engine v2.0 seed...');

  // Check if template already exists
  const existing = await prisma.rule_templates.findUnique({
    where: { code: DEFAULT_TEMPLATE_5STEP.code },
  });

  if (existing) {
    console.log('[Seed] Template already exists, skipping...');
    return;
  }

  console.log('[Seed] Creating template:', DEFAULT_TEMPLATE_5STEP.name);

  // Create template with all relations
  const template = await prisma.rule_templates.create({
    data: {
      id: `tpl-${Date.now()}`,
      code: DEFAULT_TEMPLATE_5STEP.code,
      name: DEFAULT_TEMPLATE_5STEP.name,
      description: DEFAULT_TEMPLATE_5STEP.description,
      category: DEFAULT_TEMPLATE_5STEP.category,
      isActive: DEFAULT_TEMPLATE_5STEP.isActive,
      isDefault: DEFAULT_TEMPLATE_5STEP.isDefault,
      version: DEFAULT_TEMPLATE_5STEP.version,
      updatedAt: new Date(),

      // Create sections
      rule_template_sections: {
        create: DEFAULT_TEMPLATE_5STEP.sections.map((section, idx) => ({
          id: `sec-${Date.now()}-${idx}`,
          code: section.code,
          name: section.name,
          order: section.order,
          isRequired: section.isRequired,
          numberingStyle: section.numberingStyle,
          headingLevel: section.headingLevel,
          updatedAt: new Date(),
        })),
      },
    },
    include: {
      rule_template_sections: true,
    },
  });

  console.log(`[Seed] Created template with ${template.rule_template_sections.length} sections`);

  // Create parser rules
  console.log('[Seed] Creating parser rules...');
  for (const rule of DEFAULT_TEMPLATE_5STEP.parserRules) {
    const section = template.rule_template_sections.find((s) => s.code === rule.sectionId);
    if (!section) {
      console.warn(`[Seed] Section not found for rule: ${rule.sectionId}`);
      continue;
    }

    await prisma.section_parser_rules.create({
      data: {
        id: `pr-${Date.now()}-${Math.random()}`,
        templateId: template.id,
        sectionId: section.id,
        type: rule.type as any,
        pattern: rule.pattern,
        priority: rule.priority,
        ignoreCase: rule.ignoreCase,
        ignoreAccent: rule.ignoreAccent,
        ignoreSpace: false,
        normalizeText: rule.normalizeText,
        fuzzyThreshold: rule.fuzzyThreshold,
        aliases: rule.aliases,
        isActive: true,
        confidence: rule.confidence,
        learnedFromAI: false,
        usageCount: 0,
        successCount: 0,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`[Seed] Created ${DEFAULT_TEMPLATE_5STEP.parserRules.length} parser rules`);

  // Create structure rules
  console.log('[Seed] Creating structure rules...');
  for (const rule of DEFAULT_TEMPLATE_5STEP.structureRules) {
    await prisma.section_structure_rules.create({
      data: {
        id: `sr-${Date.now()}-${Math.random()}`,
        templateId: template.id,
        code: rule.code,
        name: rule.name,
        type: rule.type as any,
        severity: rule.severity as any,
        expectedValue: rule.expectedValue,
        allowedValues: rule.allowedValues,
        penaltyScore: rule.penaltyScore,
        errorMessage: rule.errorMessage,
        suggestionText: rule.suggestionText,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`[Seed] Created ${DEFAULT_TEMPLATE_5STEP.structureRules.length} structure rules`);

  // Create content rules
  console.log('[Seed] Creating content rules...');
  for (const rule of DEFAULT_TEMPLATE_5STEP.contentRules) {
    const section = template.rule_template_sections.find((s) => s.code === rule.sectionId);
    if (!section) {
      console.warn(`[Seed] Section not found for rule: ${rule.sectionId}`);
      continue;
    }

    await prisma.section_content_rules.create({
      data: {
        id: `cr-${Date.now()}-${Math.random()}`,
        templateId: template.id,
        sectionId: section.id,
        code: rule.code,
        name: rule.name,
        checkType: rule.checkType as any,
        severity: rule.severity as any,
        systemPrompt: rule.systemPrompt,
        userPrompt: rule.userPrompt,
        criteria: rule.criteria,
        penaltyScore: rule.penaltyScore,
        useAI: rule.useAI,
        aiModel: rule.aiModel,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`[Seed] Created ${DEFAULT_TEMPLATE_5STEP.contentRules.length} content rules`);

  // Create fix rules
  console.log('[Seed] Creating fix rules...');
  for (const rule of DEFAULT_TEMPLATE_5STEP.fixRules) {
    await prisma.section_fix_rules.create({
      data: {
        id: `fr-${Date.now()}-${Math.random()}`,
        templateId: template.id,
        code: rule.code,
        name: rule.name,
        issueType: rule.issueType,
        issueSeverity: rule.issueSeverity as any,
        fixType: rule.fixType as any,
        fixTemplate: rule.fixTemplate,
        instructions: rule.instructions,
        autoApply: rule.autoApply,
        requiresApproval: rule.requiresApproval,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`[Seed] Created ${DEFAULT_TEMPLATE_5STEP.fixRules.length} fix rules`);

  // Create scoring rules
  console.log('[Seed] Creating scoring rules...');
  for (const rule of DEFAULT_TEMPLATE_5STEP.scoringRules) {
    await prisma.section_scoring_rules.create({
      data: {
        id: `scr-${Date.now()}-${Math.random()}`,
        templateId: template.id,
        code: rule.code,
        name: rule.issueType,
        issueType: rule.issueType,
        severity: rule.severity as any,
        penalty: rule.penalty,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }
  console.log(`[Seed] Created ${DEFAULT_TEMPLATE_5STEP.scoringRules.length} scoring rules`);

  console.log('[Seed] ✅ Rule Engine v2.0 seed complete!');
  console.log('[Seed] Template ID:', template.id);
}

async function main() {
  try {
    await seedDefaultTemplate();
  } catch (error) {
    console.error('[Seed] Error:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
