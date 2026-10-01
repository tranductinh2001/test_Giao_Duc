import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const bookId = searchParams.get("bookId");
    const gradeId = searchParams.get("gradeId");
    const subjectId = searchParams.get("subjectId");
    const lessonId = searchParams.get("lessonId");
    const sectionId = searchParams.get("sectionId");
    const expand = searchParams.get("expand");

    // If sectionId provided, get activities
    if (sectionId) {
      const activities = await prisma.lessonActivity.findMany({
        where: { sectionId, isActive: true },
        orderBy: { order: "asc" },
      });
      return NextResponse.json({ success: true, data: activities });
    }

    // If lessonId provided, get sections
    if (lessonId) {
      const sections = await prisma.lessonSection.findMany({
        where: { lessonId, isActive: true },
        orderBy: { order: "asc" },
        include: {
          _count: { select: { activities: true } },
        },
      });
      return NextResponse.json({ success: true, data: sections });
    }

    // If subjectId provided, get lessons
    if (subjectId) {
      const lessons = await prisma.lesson.findMany({
        where: { subjectId, isActive: true },
        orderBy: { order: "asc" },
        include: {
          _count: { select: { lessonSections: true } },
        },
      });
      return NextResponse.json({ success: true, data: lessons });
    }

    // If gradeId provided, get subjects
    if (gradeId) {
      const subjects = await prisma.lessonSubject.findMany({
        where: { gradeId, isActive: true },
        orderBy: { order: "asc" },
        include: {
          _count: { select: { lessons: true } },
        },
      });
      return NextResponse.json({ success: true, data: subjects });
    }

    // If bookId provided, get grades
    if (bookId) {
      const grades = await prisma.lessonGrade.findMany({
        where: { bookId, isActive: true },
        orderBy: { order: "asc" },
        include: {
          _count: { select: { subjects: true } },
        },
      });
      return NextResponse.json({ success: true, data: grades });
    }

    // Default: get all books
    const books = await prisma.lessonBook.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: {
        grades: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          include: {
            _count: { select: { subjects: true } },
          },
        },
      },
    });

    // Get counts for each level
    const [totalGrades, totalSubjects, totalLessons, totalSections, totalActivities] = await Promise.all([
      prisma.lessonGrade.count({ where: { isActive: true } }),
      prisma.lessonSubject.count({ where: { isActive: true } }),
      prisma.lesson.count({ where: { isActive: true } }),
      prisma.lessonSection.count({ where: { isActive: true } }),
      prisma.lessonActivity.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: books,
      counts: {
        books: books.length,
        grades: totalGrades,
        subjects: totalSubjects,
        lessons: totalLessons,
        sections: totalSections,
        activities: totalActivities,
      },
    });
  } catch (error) {
    console.error("Error fetching knowledge center:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi tải dữ liệu" }, { status: 500 });
  }
}

// POST - Create new activity
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Không có quyền truy cập" }, { status: 403 });
    }

    const body = await req.json();
    const { action, data } = body;

    if (action === "createActivity") {
      const { sectionId, code, title, summary, knowledge, keywords, aliases, teachingMethod, expectedTeacherActions, expectedStudentActions, expectedOutcome, estimatedMinutes } = data;

      if (!sectionId || !code || !title) {
        return NextResponse.json({ success: false, message: "Thiếu thông tin bắt buộc" }, { status: 400 });
      }

      const activity = await prisma.lessonActivity.create({
        data: {
          sectionId,
          code,
          title,
          summary,
          knowledge,
          keywords: keywords || [],
          aliases: aliases || [],
          teachingMethod,
          expectedTeacherActions,
          expectedStudentActions,
          expectedOutcome,
          estimatedMinutes,
        },
      });

      return NextResponse.json({ success: true, data: activity, message: "Tạo hoạt động thành công" });
    }

    return NextResponse.json({ success: false, message: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error) {
    console.error("Error in knowledge center POST:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi xử lý" }, { status: 500 });
  }
}
