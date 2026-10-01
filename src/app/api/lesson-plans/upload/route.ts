import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import {
  validateFile,
  requiresAPI,
  ALLOWED_MIME_TYPES,
  getFileSizeConfig,
  getBrightOneErrorMessage,
} from "@/lib/file-validator";

const uploadSchema = z.object({
  title: z.string().optional(),
  subject: z.string().optional(),
  gradeLevel: z.string().optional(),
  schoolYear: z.string().optional(),
  circularId: z.string().uuid({ message: "ID Công văn không hợp lệ" }).optional().nullable(),
});

// GET /api/lesson-plans/upload - Get active circulars for selection
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    // Get active circulars for selection
    const circulars = await prisma.circularDocument.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        title: true,
        type: true,
        applicableLevel: true,
        applicableSubjects: true,
      },
      orderBy: [{ code: "asc" }],
    });

    return NextResponse.json({
      success: true,
      data: circulars,
    });
  } catch (error) {
    console.error("Error fetching circulars:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi tải danh sách Công văn" },
      { status: 500 }
    );
  }
}

// POST /api/lesson-plans/upload
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Vui lòng chọn file" },
        { status: 400 }
      );
    }

    // Validate file type and size using shared validator
    const validation = validateFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.error, errorCode: validation.errorCode },
        { status: 400 }
      );
    }

    // Check if file requires API (PDF/Image)
    const needsAPI = requiresAPI(file.name, file.type);
    if (needsAPI) {
      console.log(`[Upload] File ${file.name} requires BrightOne API for processing`);
    }

    // Parse metadata
    const title = formData.get("title") as string | null;
    const subject = formData.get("subject") as string | null;
    const gradeLevel = formData.get("gradeLevel") as string | null;
    const schoolYear = formData.get("schoolYear") as string | null;
    const circularId = formData.get("circularId") as string | null;

    // Parse textbook context
    const textbookBookId = formData.get("textbookBookId") as string | null;
    const textbookLessonTitle = formData.get("textbookLessonTitle") as string | null;

    // Validate textbook if provided
    let textbookBook = null;
    if (textbookBookId) {
      textbookBook = await prisma.textbookBook.findUnique({
        where: { id: textbookBookId },
        select: { id: true, name: true, code: true, tocStatus: true },
      });

      if (!textbookBook) {
        return NextResponse.json(
          { success: false, message: "Sách giáo khoa không tồn tại" },
          { status: 400 }
        );
      }

      if (textbookBook.tocStatus !== "COMPLETED") {
        return NextResponse.json(
          { success: false, message: "Sách chưa được đánh chỉ mục, vui lòng rebuild TOC trước" },
          { status: 400 }
        );
      }
    }

    // Validate circularId if provided
    if (circularId) {
      const circular = await prisma.circularDocument.findUnique({
        where: { id: circularId },
        select: { id: true, isActive: true },
      });

      if (!circular || !circular.isActive) {
        return NextResponse.json(
          { success: false, message: "Công văn không hợp lệ hoặc đã bị vô hiệu hóa" },
          { status: 400 }
        );
      }
    }

    // Create upload directory if not exists
    // eslint-disable-next-line turbopack/no-turbopack-imports
    const uploadDir = path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads", "lesson-plans");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${sanitizedFilename}`;
    // eslint-disable-next-line turbopack/no-turbopack-imports
    const filePath = path.join(/*turbopackIgnore: true*/ uploadDir, filename);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Create lesson plan record
    const lessonPlan = await prisma.lessonPlan.create({
      data: {
        userId: session.user.id,
        title: title || file.name,
        subject,
        gradeLevel,
        schoolYear,
        circularId: circularId || null,
        originalFilename: file.name,
        filePath: `/uploads/lesson-plans/${filename}`,
        fileSize: BigInt(file.size),
        mimeType: file.type,
        status: "UPLOADED",
        currentVersion: 1,
        textbookBookId: textbookBookId || null,
        textbookLessonTitle: textbookLessonTitle || null,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        subject: true,
        gradeLevel: true,
        schoolYear: true,
        circularId: true,
        originalFilename: true,
        fileSize: true,
        mimeType: true,
        status: true,
        currentVersion: true,
        createdAt: true,
        updatedAt: true,
        circular: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
          },
        },
      },
    });

    // Create history entry
    await prisma.reviewHistory.create({
      data: {
        lessonPlanId: lessonPlan.id,
        actionType: "CREATED",
        actionData: {
          originalFilename: file.name,
          fileSize: file.size,
          circularId: circularId,
        },
        performedBy: session.user.id,
      },
    });

    // Convert BigInt to string for JSON serialization
    const response = {
      ...lessonPlan,
      fileSize: Number(lessonPlan.fileSize),
    };

    return NextResponse.json({
      success: true,
      message: "Upload giáo án thành công",
      data: response,
    });
  } catch (error) {
    console.error("Error uploading lesson plan:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi upload file" },
      { status: 500 }
    );
  }
}
