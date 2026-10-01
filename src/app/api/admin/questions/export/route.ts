import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

async function getSubcategoryIds(parentId: string): Promise<string[]> {
  const subcats = await prisma.category.findMany({
    where: { parentId },
    select: { id: true },
  });
  const ids = subcats.map((s) => s.id);
  for (const id of ids) {
    const childrenIds = await getSubcategoryIds(id);
    ids.push(...childrenIds);
  }
  return ids;
}

// GET /api/admin/questions/export?categoryId=xxx&difficulty=xxx&search=xxx
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId") || undefined;
    const difficulty = searchParams.get("difficulty") as "EASY" | "MEDIUM" | "HARD" | undefined;
    const search = searchParams.get("search") || undefined;

    const where: any = {};
    if (categoryId) {
      const subcategories = await getSubcategoryIds(categoryId);
      where.categoryId = { in: [categoryId, ...subcategories] };
    }
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where.OR = [
        { content: { contains: search, mode: "insensitive" } },
        { explanation: { contains: search, mode: "insensitive" } },
      ];
    }

    const questions = await prisma.question.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        choices: true,
        category: { select: { name: true } },
      },
    });

    // Build Excel rows matching the ExcelRowSchema for re-import
    const rows = questions.map((q, index) => {
      const choices = q.choices;
      const correctIdx = choices.findIndex((c) => c.isCorrect);
      const correctLetter = correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : "A";

      return {
        No: index + 1,
        QuestionContent: q.content.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, ""),
        ChoiceA: choices[0]?.content || "",
        ChoiceB: choices[1]?.content || "",
        ChoiceC: choices[2]?.content || "",
        ChoiceD: choices[3]?.content || "",
        CorrectAnswer: correctLetter,
        Explanation: q.explanation?.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "") || "",
        Difficulty: q.difficulty,
        Category: q.category?.name || "",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto-size columns
    const colWidths = [
      { wch: 5 },   // No
      { wch: 80 },  // QuestionContent
      { wch: 40 },  // ChoiceA
      { wch: 40 },  // ChoiceB
      { wch: 40 },  // ChoiceC
      { wch: 40 },  // ChoiceD
      { wch: 14 },  // CorrectAnswer
      { wch: 50 },  // Explanation
      { wch: 10 },  // Difficulty
      { wch: 30 },  // Category
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Questions");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="ngan-hang-cau-hoi-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: "INTERNAL_SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
