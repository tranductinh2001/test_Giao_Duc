import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Get template
    const template = await prisma.rule_templates.findFirst({
      where: { isDefault: true, isActive: true },
      include: {
        rule_template_sections: {
          orderBy: { order: 'asc' },
        },
        section_parser_rules: true,
        section_structure_rules: true,
        section_content_rules: true,
        section_fix_rules: true,
        section_scoring_rules: true,
      },
    });

    if (!template) {
      return NextResponse.json({ error: "No default template found" });
    }

    // Build coverage report
    const sections = template.rule_template_sections;
    const sectionCoverage = sections.map(section => {
      const parserRules = template.section_parser_rules.filter(r => r.sectionId === section.id);
      const structureRules = template.section_structure_rules.filter(r => r.sectionId === section.id);
      const contentRules = template.section_content_rules.filter(r => r.sectionId === section.id);
      // Fix rules use issueType (equals section code), not sectionId
      const fixRules = template.section_fix_rules.filter(r => r.issueType === section.code);
      // Scoring rules use issueType (equals section code), not sectionId
      const scoringRules = template.section_scoring_rules.filter(r => r.issueType === section.code);

      const totalRules = parserRules.length + structureRules.length + contentRules.length + fixRules.length + scoringRules.length;

      return {
        code: section.code,
        name: section.name,
        parserRules: parserRules.length,
        structureRules: structureRules.length,
        contentRules: contentRules.length,
        fixRules: fixRules.length,
        scoringRules: scoringRules.length,
        totalRules: totalRules,
        hasCompleteRules: totalRules >= 5,
      };
    });

    const totalSections = sectionCoverage.length;
    const completeSections = sectionCoverage.filter(s => s.hasCompleteRules).length;

    return NextResponse.json({
      template: {
        id: template.id,
        code: template.code,
        name: template.name,
      },
      summary: {
        totalSections,
        completeSections,
        coveragePercent: Math.round((completeSections / totalSections) * 100),
      },
      sections: sectionCoverage,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
