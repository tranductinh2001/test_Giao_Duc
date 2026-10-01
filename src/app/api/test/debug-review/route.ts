import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TemplateRepository } from "@/lib/repositories/TemplateRepository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonPlanId } = body;

    // Get template
    const repo = new TemplateRepository();
    const template = await repo.findDefault();

    if (!template) {
      return NextResponse.json({ error: "No default template" });
    }

    // Map like workflow-service does
    const dbTemplate = template as any;
    const sectionsMap = new Map((dbTemplate.rule_template_sections || []).map((s: any) => [s.id, s.code]));

    const mappedTemplate = {
      ...template,
      sections: dbTemplate.rule_template_sections || [],
      parserRules: (dbTemplate.section_parser_rules || []).map((r: any) => ({
        ...r,
        sectionCode: sectionsMap.get(r.sectionId) || r.sectionId,
      })),
      structureRules: (dbTemplate.section_structure_rules || []).map((r: any) => ({
        ...r,
        sectionCode: r.sectionId ? (sectionsMap.get(r.sectionId) || r.sectionId) : undefined,
      })),
      contentRules: (dbTemplate.section_content_rules || []).map((r: any) => ({
        ...r,
        sectionCode: sectionsMap.get(r.sectionId) || r.sectionId,
      })),
    };

    // Get workflow session
    const workflowSession = await prisma.workflowSession.findFirst({
      where: { lessonPlanId },
      orderBy: { createdAt: 'desc' },
    });

    // Simulate section matching
    const testSections = [
      { sectionCode: 'MUC_TIEU', sectionName: 'Mục tiêu' },
      { sectionCode: 'TIEN_TRINH', sectionName: 'Tiến trình dạy học' },
      { sectionCode: 'KIEN_THUC', sectionName: 'Kiến thức' },
    ];

    const matchingResults = testSections.map(section => {
      const rules = mappedTemplate.contentRules.filter((r: any) =>
        r.sectionCode === section.sectionCode || r.sectionId === section.sectionCode
      );

      return {
        sectionCode: section.sectionCode,
        matchedRules: rules.length,
        ruleSectionCodes: rules.map((r: any) => r.sectionCode),
      };
    });

    return NextResponse.json({
      templateCode: template.code,
      contentRulesCount: mappedTemplate.contentRules.length,
      contentRules: mappedTemplate.contentRules.map((r: any) => ({
        id: r.id,
        sectionId: r.sectionId,
        sectionCode: r.sectionCode,
        code: r.code,
        name: r.name,
      })),
      matchingResults,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
