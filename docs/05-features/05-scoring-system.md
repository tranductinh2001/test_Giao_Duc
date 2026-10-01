# 13. Hệ thống Chấm điểm & Phân tích kết quả (Scoring & Analytics System)

Sau khi người học hoàn tất nộp bài thi, hệ thống sẽ thực hiện chấm điểm tự động, lưu trữ chi tiết lượt làm bài và tính toán phân tích điểm mạnh, điểm yếu theo từng danh mục chuyên đề luật.

---

## 13.1. Quy trình chấm điểm tự động (Grading Engine)

Quy trình chấm điểm được thực thi hoàn toàn ở phía Server để tránh người dùng sửa đổi điểm số ở Client-side.

```
[Nhận Payload đáp án]
        │
        ▼
[Tải danh sách đáp án đúng từ DB]
        │
        ▼
[So khớp từng câu và chấm điểm] ───> Tính toán: Điểm số, Số câu Đúng/Sai
        │
        ▼
[Lưu thông tin lượt thi (Attempt)] ───> Lưu Transaction (ExamAttempt & ExamAttemptAnswer)
        │
        ▼
[Cập nhật Kho câu sai & Phân tích] ───> Cập nhật UserWrongAnswer & Thống kê năng lực chuyên đề
```

### Thuật toán chấm điểm trong Service Layer
```typescript
import { prisma } from "@/lib/prisma";

interface SubmissionAnswer {
  questionId: string;
  selectedChoiceId: string | null;
}

export async function scoreExamAttempt(attemptId: string, userAnswers: SubmissionAnswer[]) {
  return await prisma.$transaction(async (tx) => {
    // 1. Lấy thông tin lượt thi và đề thi liên quan
    const attempt = await tx.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            examQuestions: {
              include: {
                question: {
                  include: { choices: true }
                }
              }
            }
          }
        }
      }
    });

    if (!attempt) throw new Error("Không tìm thấy lượt làm bài thi.");
    if (attempt.status !== "IN_PROGRESS") throw new Error("Lượt thi này đã được nộp và chấm điểm trước đó.");

    const examQuestions = attempt.exam.examQuestions;
    const totalCount = examQuestions.length;
    let correctCount = 0;
    
    const answersToCreate = [];
    const wrongAnswersToUpsert = [];

    // 2. Chấm điểm chi tiết từng câu hỏi
    for (const eq of examQuestions) {
      const q = eq.question;
      const correctChoice = q.choices.find(c => c.isCorrect);
      const userAns = userAnswers.find(ua => ua.questionId === q.id);
      
      const selectedChoiceId = userAns?.selectedChoiceId || null;
      const isCorrect = selectedChoiceId === correctChoice?.id;

      if (isCorrect) {
        correctCount++;
      } else {
        // Gom các câu làm sai để cập nhật vào kho ôn câu sai
        wrongAnswersToUpsert.push({
          userId: attempt.userId,
          questionId: q.id
        });
      }

      answersToCreate.push({
        attemptId: attempt.id,
        questionId: q.id,
        selectedChoiceId,
        isCorrect
      });
    }

    // Tính điểm trên thang 100
    const score = parseFloat(((correctCount / totalCount) * 100).toFixed(2));
    const now = new Date();

    // 3. Cập nhật kết quả bảng ExamAttempt
    await tx.examAttempt.update({
      where: { id: attempt.id },
      data: {
        score,
        correctCount,
        totalCount,
        status: "SUBMITTED",
        submittedAt: now
      }
    });

    // 4. Lưu câu trả lời chi tiết của người dùng
    await tx.examAttemptAnswer.createMany({
      data: answersToCreate
    });

    // 5. Cập nhật Kho câu hỏi làm sai (UserWrongAnswer)
    for (const item of wrongAnswersToUpsert) {
      await tx.userWrongAnswer.upsert({
        where: {
          userId_questionId: {
            userId: item.userId,
            questionId: item.questionId
          }
        },
        create: {
          userId: item.userId,
          questionId: item.questionId,
          wrongCount: 1,
          lastAnsweredAt: now
        },
        update: {
          wrongCount: { increment: 1 },
          lastAnsweredAt: now
        }
      });
    }

    return {
      score,
      correctCount,
      totalCount
    };
  });
}
```

---

## 13.2. Cơ chế xóa câu hỏi khỏi Kho câu sai khi làm đúng lại

Để tránh kho câu hỏi sai tích lũy vô hạn, khi học viên thực hiện làm bài ôn tập trong "Kho câu sai":
*   Nếu học viên trả lời **Đúng** câu hỏi đó trong lượt làm bài ôn tập: Hệ thống sẽ tự động giảm `wrongCount` đi 1 đơn vị hoặc **Xóa hoàn toàn** bản ghi `UserWrongAnswer` tương ứng khỏi Database. Điều này giúp tối ưu hóa dung lượng lưu trữ và động viên tinh thần người học.

---

## 13.3. Thuật toán phân tích năng lực (Strength & Weakness Analysis)

Hệ thống tính toán tỷ lệ làm đúng trên từng chuyên đề lớn/nhỏ dựa trên dữ liệu lịch sử làm bài thi thực tế để đưa ra cảnh báo:

$$\text{Tỷ lệ trả lời đúng của chuyên đề (Category)} = \frac{\sum \text{Các câu trả lời đúng thuộc Category}}{\sum \text{Tổng số câu thuộc Category đã làm}} \times 100\%$$

### Tiêu chuẩn phân loại năng lực:
*   🟢 **MẠNH (Excellent/Strong):** Tỷ lệ đúng $\ge 80\%$. Người học đã nắm chắc kiến thức phần này.
*   🟡 **TRUNG BÌNH (Medium):** Tỷ lệ đúng từ $50\% \to 79\%$. Cần cải thiện thêm, dễ mất điểm ở các câu hỏi bẫy.
*   🔴 **YẾU (Weak/Critical):** Tỷ lệ đúng $< 50\%$. Cần đọc lại ngay văn bản luật nguồn của chuyên đề này.
