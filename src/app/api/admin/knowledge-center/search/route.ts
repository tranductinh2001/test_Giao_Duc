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
    const query = searchParams.get("q") || "";
    const type = searchParams.get("type"); // activity, lesson, subject, grade, book
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!query || query.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results: any[] = [];

    // Search activities by title, keywords, aliases
    if (!type || type === "activity") {
      const activities = await prisma.lessonActivity.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { keywords: { hasSome: [query.toLowerCase()] } },
            { aliases: { hasSome: [query.toLowerCase()] } },
            { knowledge: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        orderBy: { title: "asc" },
        include: {
          section: {
            include: {
              lesson: {
                include: {
                  subject: {
                    include: {
                      grade: {
                        include: { book: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      results.push(...activities.map(a => ({
        type: "activity",
        ...a,
        path: `${a.section.lesson.subject.grade.book.name} > ${a.section.lesson.subject.grade.name} > ${a.section.lesson.subject.name} > ${a.section.lesson.title} > ${a.section.name} > ${a.title}`,
      })));
    }

    // Search lessons by title
    if (!type || type === "lesson") {
      const lessons = await prisma.lesson.findMany({
        where: {
          isActive: true,
          title: { contains: query, mode: "insensitive" },
        },
        take: limit,
        orderBy: { title: "asc" },
        include: {
          subject: {
            include: {
              grade: {
                include: { book: true },
              },
            },
          },
        },
      });
      results.push(...lessons.map(l => ({
        type: "lesson",
        ...l,
        path: `${l.subject.grade.book.name} > ${l.subject.grade.name} > ${l.subject.name} > ${l.title}`,
      })));
    }

    // Search subjects by name
    if (!type || type === "subject") {
      const subjects = await prisma.lessonSubject.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { code: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        orderBy: { name: "asc" },
        include: {
          grade: {
            include: { book: true },
          },
        },
      });
      results.push(...subjects.map(s => ({
        type: "subject",
        ...s,
        path: `${s.grade.book.name} > ${s.grade.name} > ${s.name}`,
      })));
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Error searching knowledge center:", error);
    return NextResponse.json({ success: false, message: "Lỗi khi tìm kiếm" }, { status: 500 });
  }
}
