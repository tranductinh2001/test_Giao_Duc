import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SmartExamGeneratorService } from "@/features/exams/services/SmartExamGeneratorService";

const SAMPLE_PRACTICE_QUESTIONS = [
  {
    id: "sample-q1",
    content: "Theo Luật Viên chức 2010 (sửa đổi, bổ sung 2019), viên chức có bao nhiêu quyền về hoạt động nghề nghiệp?",
    explanation: "Theo Điều 11 Luật Viên chức 2010, viên chức có 7 quyền về hoạt động nghề nghiệp (được pháp luật bảo vệ, đào tạo bồi dưỡng, trang bị phương tiện làm việc...).",
    categoryName: "Luật Viên Chức & Quản Lý Nhà Nước",
    choices: [
      { id: "c1-1", content: "07 quyền", isCorrect: true },
      { id: "c1-2", content: "05 quyền", isCorrect: false },
      { id: "c1-3", content: "06 quyền", isCorrect: false },
      { id: "c1-4", content: "08 quyền", isCorrect: false },
    ],
  },
  {
    id: "sample-q2",
    content: "Theo Công văn 5512/BGDĐT, tiến trình dạy học mỗi bài học được xây dựng theo chuỗi mấy hoạt động học?",
    explanation: "Chuỗi 4 hoạt động gồm: 1. Khởi động / Mở đầu; 2. Hình thành kiến thức mới; 3. Luyện tập; 4. Vận dụng.",
    categoryName: "Phương Pháp Dạy Học & CV 5512",
    choices: [
      { id: "c2-1", content: "04 hoạt động học", isCorrect: true },
      { id: "c2-2", content: "03 hoạt động học", isCorrect: false },
      { id: "c2-3", content: "05 hoạt động học", isCorrect: false },
      { id: "c2-4", content: "06 hoạt động học", isCorrect: false },
    ],
  },
  {
    id: "sample-q3",
    content: "Mỗi hoạt động dạy học theo hướng dẫn Công văn 5512/BGDĐT phải được tổ chức thực hiện rõ ràng theo mấy bước?",
    explanation: "4 bước tổ chức: 1. Chuyển giao nhiệm vụ học tập; 2. Thực hiện nhiệm vụ học tập; 3. Báo cáo kết quả và thảo luận; 4. Đánh giá kết quả, thực hiện nhiệm vụ học tập (Kết luận, nhận định).",
    categoryName: "Phương Pháp Dạy Học & CV 5512",
    choices: [
      { id: "c3-1", content: "04 bước", isCorrect: true },
      { id: "c3-2", content: "03 bước", isCorrect: false },
      { id: "c3-3", content: "05 bước", isCorrect: false },
      { id: "c3-4", content: "02 bước", isCorrect: false },
    ],
  },
  {
    id: "sample-q4",
    content: "Theo Luật Giáo dục 2019, độ tuổi của học sinh vào học lớp một là bao nhiêu tuổi?",
    explanation: "Theo Điều 28 Luật Giáo dục 2019: 'Tuổi của học sinh vào học lớp một là 06 tuổi và được tính theo năm'.",
    categoryName: "Luật Giáo Dục 2019",
    choices: [
      { id: "c4-1", content: "06 tuổi", isCorrect: true },
      { id: "c4-2", content: "05 tuổi", isCorrect: false },
      { id: "c4-3", content: "07 tuổi", isCorrect: false },
      { id: "c4-4", content: "Tùy theo sự phát triển thể lực của trẻ", isCorrect: false },
    ],
  },
  {
    id: "sample-q5",
    content: "Theo Thông tư 20/2018/TT-BGDĐT, chuẩn nghề nghiệp giáo viên cơ sở giáo dục phổ thông gồm bao nhiêu tiêu chuẩn và tiêu chí?",
    explanation: "Quy định chuẩn nghề nghiệp giáo viên cơ sở giáo dục phổ thông gồm 5 tiêu chuẩn với 15 tiêu chí đánh giá.",
    categoryName: "Nghiệp Vụ Sư Phạm & Chuẩn Nghề Nghiệp",
    choices: [
      { id: "c5-1", content: "05 tiêu chuẩn và 15 tiêu chí", isCorrect: true },
      { id: "c5-2", content: "04 tiêu chuẩn và 12 tiêu chí", isCorrect: false },
      { id: "c5-3", content: "06 tiêu chuẩn và 18 tiêu chí", isCorrect: false },
      { id: "c5-4", content: "05 tiêu chuẩn và 20 tiêu chí", isCorrect: false },
    ],
  },
];

// POST /api/practice/start - Start practice session
export async function POST(req: Request) {
  try {
    const session = await auth().catch(() => null);

    // If session exists, try database selection
    if (session?.user?.id) {
      try {
        const categories = await prisma.category.findMany({
          select: { id: true },
        });

        if (categories.length > 0) {
          const smartService = new SmartExamGeneratorService();
          const questionIds = await smartService.generateSmartExam(
            session.user.id,
            categories.map((c) => c.id),
            10
          );

          if (questionIds.length > 0) {
            const questions = await prisma.question.findMany({
              where: { id: { in: questionIds } },
              select: {
                id: true,
                content: true,
                explanation: true,
                category: { select: { name: true } },
                choices: {
                  select: {
                    id: true,
                    content: true,
                    isCorrect: true,
                  },
                },
              },
            });

            if (questions.length > 0) {
              const formattedQuestions = questions.map((q) => ({
                id: q.id,
                content: q.content,
                explanation: q.explanation,
                categoryName: q.category?.name || "Chung",
                choices: q.choices,
              }));

              return NextResponse.json({
                success: true,
                data: {
                  sessionId: `session-${Date.now()}`,
                  questions: formattedQuestions,
                },
              });
            }
          }
        }
      } catch (dbErr) {
        console.warn("[PracticeStart] DB query failed, falling back to sample questions");
      }
    }

    // Fallback: return curated high-yield questions for practice
    return NextResponse.json({
      success: true,
      data: {
        sessionId: `sample-session-${Date.now()}`,
        questions: SAMPLE_PRACTICE_QUESTIONS,
      },
    });
  } catch (error: unknown) {
    console.error("Practice start error:", error);
    return NextResponse.json({
      success: true,
      data: {
        sessionId: `sample-session-${Date.now()}`,
        questions: SAMPLE_PRACTICE_QUESTIONS,
      },
    });
  }
}
