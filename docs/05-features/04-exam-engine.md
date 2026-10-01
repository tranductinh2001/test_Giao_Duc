# 12. Cơ chế Sinh đề thi tự động & Điều phối (Exam Engine)

Bộ máy điều phối đề thi (Exam Engine) chịu trách nhiệm tự động tạo đề thi từ ma trận tỷ lệ chuyên đề, xáo trộn ngẫu nhiên câu hỏi/đáp án, kiểm soát thời gian làm bài thực tế để đảm bảo tính khách quan và bảo mật.

---

## 12.1. Thuật toán sinh đề từ Ma trận chuyên đề (Matrix Auto-Generation)

Khi người học hoặc Admin yêu cầu sinh đề thi ngẫu nhiên theo ma trận tỷ lệ (Ví dụ: Đề thi Công chức hành chính gồm 30 câu Luật Công chức, 15 câu Hiến pháp, 15 câu Luật Tổ chức chính phủ):

### Giải thuật ở tầng Database (PostgreSQL Query Optimization)
Để sinh đề tối ưu và tránh quá tải bộ nhớ RAM của Server khi ngân hàng câu hỏi lên đến hàng chục nghìn câu, chúng ta thực hiện truy vấn lấy các ID ngẫu nhiên trực tiếp từ Database bằng hàm `RANDOM()` của SQL, sau đó thực hiện lưu liên kết.

```typescript
import { prisma } from "@/lib/prisma";

interface MatrixItem {
  categoryId: string;
  count: number;
}

export async function generateExamFromMatrix(
  title: string,
  timeLimit: number, // tính bằng giây, ví dụ: 3600 (60 phút)
  matrix: MatrixItem[],
  categoryId?: string
) {
  const chosenQuestionIds: string[] = [];

  // 1. Duyệt qua từng dòng cấu hình trong ma trận
  for (const item of matrix) {
    // Truy vấn thô lấy ngẫu nhiên danh sách ID câu hỏi thuộc category và đã được phê duyệt
    const randomQuestions = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Question"
      WHERE "categoryId" = ${item.categoryId} AND "isDraft" = false
      ORDER BY RANDOM()
      LIMIT ${item.count}
    `;

    if (randomQuestions.length < item.count) {
      throw new Error(
        `Không đủ câu hỏi trong danh mục thuộc ID ${item.categoryId}. Yêu cầu: ${item.count}, Hiện có: ${randomQuestions.length}`
      );
    }

    randomQuestions.forEach((q) => chosenQuestionIds.push(q.id));
  }

  // 2. Tạo đề thi tĩnh mới (Exam) trong Database lưu cấu trúc đề vừa sinh
  const newExam = await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.create({
      data: {
        title,
        timeLimit,
        isPublished: true,
        matrix: JSON.stringify(matrix),
        categoryId
      }
    });

    // Tạo các bản ghi liên kết ExamQuestion
    const examQuestionsData = chosenQuestionIds.map((qId, idx) => ({
      examId: exam.id,
      questionId: qId,
      sortOrder: idx + 1
    }));

    await tx.examQuestion.createMany({
      data: examQuestionsData
    });

    return exam;
  });

  return newExam;
}
```

*Độ an toàn (Không trùng câu):* Các câu hỏi được lấy ngẫu nhiên và gán trực tiếp theo ID duy nhất vào bảng liên kết `ExamQuestion` trong một Transaction, bảo đảm đề thi cố định không bị trùng lặp câu hỏi giữa các lần truy xuất.

---

## 12.2. Thuật toán đảo câu hỏi và đáp án (Fisher-Yates Shuffle)

Để chống học vẹt và chống gian lận, khi người học bắt đầu một lượt thi thử (`ExamAttempt`), hệ thống sẽ tải danh sách câu hỏi gốc từ đề thi, sau đó đảo lộn thứ tự các câu hỏi và đảo lộn vị trí của 4 lựa chọn (A, B, C, D) trước khi gửi về giao diện Client.

Chúng ta sử dụng thuật toán **Fisher-Yates Shuffle** có độ phức tạp thời gian tối ưu $O(N)$:

```typescript
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
```

### Cách áp dụng khi nạp đề thi:
1.  Truy xuất danh sách câu hỏi thuộc đề thi kèm các lựa chọn phương án (`choices`).
2.  Ẩn trường `isCorrect` trong tất cả các lựa chọn để tránh người dùng xem trước đáp án qua DevTools của Chrome.
3.  Đảo lộn danh sách câu hỏi: `const shuffledQuestions = shuffleArray(originalQuestions)`.
4.  Duyệt qua từng câu hỏi và đảo lộn các lựa chọn phương án: `question.choices = shuffleArray(question.choices)`.
5.  Trả về dữ liệu đã xáo trộn cho Client.

---

## 12.3. Kiểm soát thời gian làm bài thi (Exam Expiration Control)

Hệ thống kết hợp kiểm soát thời gian ở hai đầu Client và Server để tránh việc người dùng gian lận kéo dài thời gian làm bài:

```
[Bắt đầu thi] ──────────> Client hiển thị đếm ngược (UI Timer)
   │
   ├─ Server ghi nhận: startedAt = Now()
   ├─ Server tính hạn nộp: expiresAt = startedAt + timeLimit + 30s (Grace Period)
   │
[Nộp bài] ──────────────> Client gửi đáp án lên Server
   │
   ├─ Server so khớp thời gian thực tế nộp: submitTime = Now()
   ├─ NẾU submitTime <= expiresAt:
   │    Accept & Chấm điểm toàn bộ.
   └─ NẾU submitTime > expiresAt:
        Từ chối hoặc Chỉ chấm các câu đã lưu nháp trước thời điểm expiresAt.
```

*Grace Period (Thời gian ân hạn):* Khoảng 30 giây được cộng thêm để bù trừ cho độ trễ truyền dẫn mạng Internet khi Client gửi Request nộp bài lên Server.
