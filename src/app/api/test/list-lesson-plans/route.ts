import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const lessonPlans = await prisma.lessonPlan.findMany({
      select: {
        id: true,
        title: true,
        filePath: true,
        originalFilename: true,
        mimeType: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Group by file type
    const docx: any[] = [];
    const pdf: any[] = [];
    const images: any[] = [];

    for (const lp of lessonPlans) {
      const ext = lp.originalFilename?.toLowerCase() || '';
      if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
        docx.push(lp);
      } else if (ext.endsWith('.pdf')) {
        pdf.push(lp);
      } else if (ext.endsWith('.jpg') || ext.endsWith('.png') || ext.endsWith('.jpeg')) {
        images.push(lp);
      }
    }

    return NextResponse.json({
      docx: docx.slice(0, 10),
      pdf: pdf.slice(0, 15),
      images,
      summary: {
        docx: docx.length,
        pdf: pdf.length,
        images: images.length,
        total: lessonPlans.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
