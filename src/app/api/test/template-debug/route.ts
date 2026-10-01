import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Get default template
    const template = await prisma.rule_templates.findFirst({
      where: { isDefault: true, isActive: true },
      include: {
        rule_template_sections: {
          orderBy: { order: 'asc' },
        },
        section_parser_rules: {
          where: { isActive: true },
          take: 10,
        },
        section_content_rules: {
          where: { isActive: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: "No default template found" });
    }

    return NextResponse.json({
      template: {
        id: template.id,
        code: template.code,
        name: template.name,
      },
      sections: template.rule_template_sections.map(s => ({
        id: s.id,
        code: s.code,
        name: s.name,
        order: s.order,
      })),
      parserRules: template.section_parser_rules.map(r => ({
        id: r.id,
        sectionId: r.sectionId,
        pattern: r.pattern,
      })),
      contentRules: template.section_content_rules.map(r => ({
        id: r.id,
        sectionId: r.sectionId,
        code: r.code,
        name: r.name,
      })),
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
