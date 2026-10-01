# 11. Quy trình Import từ file Excel (Excel Import Engine)

Tương tự như file Word, import từ Excel (.xlsx) phù hợp cho việc nạp ngân hàng câu hỏi dạng văn bản thuần túy với cấu trúc dạng bảng có tính tổ chức cao.

---

## 11.1. Cấu trúc Cột dữ liệu Excel mẫu (Template Columns)

Bảng tính Excel tải lên phải chứa các tiêu đề cột (Headers) chính xác tại hàng đầu tiên (Row 1):

| Cột | Tên Cột (Header) | Kiểu dữ liệu | Mô tả / Ràng buộc |
| :--- | :--- | :---: | :--- |
| **A** | `No` | Số (Number) | Số thứ tự câu hỏi để đối chiếu báo lỗi. |
| **B** | `QuestionContent` | Văn bản (Text) | Nội dung câu hỏi trắc nghiệm (hỗ trợ text hoặc HTML). |
| **C** | `ChoiceA` | Văn bản (Text) | Nội dung phương án lựa chọn A. |
| **D** | `ChoiceB` | Văn bản (Text) | Nội dung phương án lựa chọn B. |
| **E** | `ChoiceC` | Văn bản (Text) | Nội dung phương án lựa chọn C. |
| **F** | `ChoiceD` | Văn bản (Text) | Nội dung phương án lựa chọn D. |
| **G** | `CorrectAnswer` | Văn bản (Text) | Phải là một trong bốn ký tự: **A**, **B**, **C**, **D**. |
| **H** | `Explanation` | Văn bản (Text) | Giải thích đáp án đúng (tùy chọn). |
| **I** | `Difficulty` | Văn bản (Text) | Nhận giá trị: `EASY` (Dễ), `MEDIUM` (TB), `HARD` (Khó). Mặc định là `MEDIUM`. |

---

## 11.2. Thư viện & Zod Schema Validation

1.  **Thư viện xử lý:** Sử dụng **`xlsx`** (SheetJS) để chuyển đổi tệp tin Excel từ Buffer sang định dạng JSON Array nhanh chóng ở phía Server.
2.  **Validation Layer:** Dùng **Zod** định nghĩa Schema kiểm tra từng hàng dữ liệu để tránh dữ liệu rác phá vỡ tính nhất quán của cơ sở dữ liệu.

```typescript
import { z } from "zod";

export const ExcelRowSchema = z.object({
  No: z.number().or(z.string().transform(val => parseInt(val, 10))),
  QuestionContent: z.string().min(5, "Nội dung câu hỏi tối thiểu phải có 5 ký tự"),
  ChoiceA: z.string().min(1, "Phương án A không được để trống"),
  ChoiceB: z.string().min(1, "Phương án B không được để trống"),
  ChoiceC: z.string().min(1, "Phương án C không được để trống"),
  ChoiceD: z.string().min(1, "Phương án D không được để trống"),
  CorrectAnswer: z.string().toUpperCase().refine((val) => ["A", "B", "C", "D"].includes(val), {
    message: "Đáp án đúng phải là A, B, C hoặc D"
  }),
  Explanation: z.string().optional().default(""),
  Difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM")
});

export type ExcelRowData = z.infer<typeof ExcelRowSchema>;
```

---

## 11.3. Mã nguồn bộ máy Parser Excel (Server-side Parser)

Đoạn mã xử lý phân tích và bắt lỗi chi tiết từng hàng của tệp tin Excel:

```typescript
import * as XLSX from "xlsx";
import { ExcelRowSchema } from "./schemas";

interface ImportedQuestion {
  content: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  explanation: string;
  choices: { content: string; isCorrect: boolean }[];
}

export async function parseExcelFile(
  buffer: Buffer
): Promise<{ questions: ImportedQuestion[]; errors: string[] }> {
  const errors: string[] = [];
  const questions: ImportedQuestion[] = [];

  try {
    // 1. Đọc workbook từ Buffer
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // 2. Chuyển đổi sheet sang dạng JSON Array
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    // 3. Duyệt và validate từng hàng dữ liệu
    rawData.forEach((row: any, idx) => {
      const rowIndex = idx + 2; // Hàng thứ 2 trong Excel (trừ đi header)
      
      const parsed = ExcelRowSchema.safeParse(row);
      if (!parsed.success) {
        // Gom các lỗi validate của Zod theo từng dòng
        const fieldErrors = parsed.error.flatten().fieldErrors;
        Object.entries(fieldErrors).forEach(([field, msg]) => {
          errors.push(`Dòng ${rowIndex} (Câu STT ${row.No || "?"}): Cột [${field}] - ${msg}`);
        });
        return;
      }

      const data = parsed.data;

      // 4. Định dạng lại cấu trúc câu hỏi và phương án để lưu vào DB
      const question: ImportedQuestion = {
        content: data.QuestionContent,
        difficulty: data.Difficulty,
        explanation: data.Explanation,
        choices: [
          { content: data.ChoiceA, isCorrect: data.CorrectAnswer === "A" },
          { content: data.ChoiceB, isCorrect: data.CorrectAnswer === "B" },
          { content: data.ChoiceC, isCorrect: data.CorrectAnswer === "C" },
          { content: data.ChoiceD, isCorrect: data.CorrectAnswer === "D" }
        ]
      };

      questions.push(question);
    });

  } catch (error: any) {
    errors.push(`Không thể đọc tệp tin Excel. Chi tiết lỗi: ${error.message}`);
  }

  return { questions, errors };
}
```

---

## 11.4. Quy trình xử lý lỗi & Lưu trữ hàng loạt (Bulk Insert)

1.  **Thông báo lỗi:** Khi phát hiện bất kỳ dòng nào không hợp lệ (ví dụ: Thiếu phương án C, Đáp án đúng ghi chữ `E`), hệ thống sẽ ngắt quy trình lưu và hiển thị chi tiết dòng lỗi kèm cột gây lỗi để Admin biết và sửa đổi.
2.  **Giao diện xem trước (Data Preview Grid):** Khi tệp tin không có lỗi nghiêm trọng, hiển thị toàn bộ câu hỏi lên giao diện dạng Table. Admin kiểm tra trực quan lần cuối trước khi click "Import".
3.  **Lưu Database dạng giao dịch (Bulk Save Transaction):** Để tránh việc tạo nhiều kết nối đơn lẻ, sử dụng `prisma.question.create` kết hợp nested writes cho `choices` trong một vòng lặp, hoặc chuyển đổi dữ liệu để thực thi bằng lệnh `createMany` nếu cơ sở dữ liệu hỗ trợ tốt.
