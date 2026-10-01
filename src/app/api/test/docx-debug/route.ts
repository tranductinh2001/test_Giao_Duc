/**
 * DOCX Debug API
 */
import { NextRequest, NextResponse } from "next/server";
import { BrightOneVisionAdapter } from "@/core/document-adapters";
import { readFile } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonPlanId } = body;

    const { prisma } = await import("@/lib/prisma");
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: lessonPlanId },
    });

    if (!lessonPlan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const filePath = lessonPlan.filePath;
    const fullPath = filePath.startsWith('/uploads')
      ? path.join(process.cwd(), filePath)
      : filePath;

    console.log('[Debug] Loading file:', fullPath);

    const fileBuffer = await readFile(fullPath);
    const fileName = lessonPlan.originalFilename || 'document.docx';

    console.log('[Debug] File size:', fileBuffer.length);
    console.log('[Debug] File name:', fileName);

    const adapter = new BrightOneVisionAdapter();
    const result = await adapter.parse(fileBuffer, fileName);

    console.log('[Debug] BrightOne result success:', result.success);
    console.log('[Debug] BrightOne error:', result.error);

    return NextResponse.json({
      success: result.success,
      error: result.error,
      document: result.document ? {
        title: result.document.title,
        sectionsCount: result.document.sections?.length || 0,
        sections: result.document.sections?.map((s: any) => ({
          title: s.title,
          activitiesCount: s.activities?.length || 0,
        })),
      } : null,
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
