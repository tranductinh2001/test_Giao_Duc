/**
 * Batch Parser Verification
 * POST /api/test/batch-verify
 *
 * Runs verification on multiple lesson plans
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lessonPlanIds, fileType } = body;

    // Get all lesson plans if not specified
    let lessonPlans;
    if (lessonPlanIds && lessonPlanIds.length > 0) {
      lessonPlans = await prisma.lessonPlan.findMany({
        where: { id: { in: lessonPlanIds } },
        select: { id: true, title: true, originalFilename: true, mimeType: true },
      });
    } else if (fileType) {
      const mimeTypeMap: Record<string, string[]> = {
        'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'],
        'pdf': ['application/pdf'],
        'image': ['image/jpeg', 'image/png', 'image/jpg'],
      };
      const mimeTypes = mimeTypeMap[fileType] || [];
      lessonPlans = await prisma.lessonPlan.findMany({
        where: { mimeType: { in: mimeTypes } },
        select: { id: true, title: true, originalFilename: true, mimeType: true },
        take: 5,
      });
    } else {
      lessonPlans = await prisma.lessonPlan.findMany({
        select: { id: true, title: true, originalFilename: true, mimeType: true },
        take: 10,
      });
    }

    return NextResponse.json({
      lessonPlans: lessonPlans.map(lp => ({
        id: lp.id,
        filename: lp.originalFilename,
        mimeType: lp.mimeType,
      })),
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
