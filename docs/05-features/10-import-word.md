# 10. Quy trình Import từ file Word (Word Import Engine)

Tính năng import từ file Word (.docx) giúp Admin tải hàng loạt hàng trăm câu hỏi có cấu trúc phức tạp (chứa bảng biểu, định dạng in đậm/nghiêng) lên hệ thống một cách nhanh chóng.

---

## 10.1. Mẫu định dạng File Word chuẩn (Document Template)

File Word tải lên cần tuân thủ cấu trúc cú pháp (Syntax rules) chuẩn để bộ máy phân tích (Parser) có thể nhận dạng chính xác:

```text
Câu 1: Theo Hiến pháp 2013, nước Cộng hòa xã hội chủ nghĩa Việt Nam là một nước độc lập, có chủ quyền, thống nhất và toàn vẹn lãnh thổ bao gồm:
A. Đất liền, hải đảo, vùng biển và vùng trời.
B. Đất liền, thềm lục địa, hải đảo và vùng biển.
C. Đất liền, vùng biển và vùng trời.
D. Đất liền, thềm lục địa và vùng trời.
Đáp án đúng: A
Giải thích: Căn cứ Điều 1 Hiến pháp 2013 quy định: Nước Cộng hòa xã hội chủ nghĩa Việt Nam là một nước độc lập, có chủ quyền, thống nhất và toàn vẹn lãnh thổ, bao gồm đất liền, hải đảo, vùng biển và vùng trời.
Độ khó: Dễ

Câu 2: ...
```

### Các quy tắc bắt buộc:
*   Mỗi câu hỏi bắt đầu bằng cụm từ `Câu [Số]:` (chấp nhận có dấu hai chấm hoặc khoảng trắng).
*   Các phương án lựa chọn bắt đầu bằng `A.`, `B.`, `C.`, `D.` (chữ in hoa kèm dấu chấm và một dấu cách).
*   Dòng đáp án bắt đầu bằng `Đáp án đúng:` hoặc `Đáp án:` sau đó là ký tự đáp án đúng (A, B, C hoặc D).
*   Dòng giải thích (không bắt buộc) bắt đầu bằng `Giải thích:`.
*   Dòng độ khó bắt đầu bằng `Độ khó:` nhận các giá trị: `Dễ`, `Trung bình`, `Khó` (nếu bỏ trống mặc định là `Trung bình`).

---

## 10.2. Giải pháp kỹ thuật & Thư viện (Technical Stack)

1.  **Thư viện xử lý:** Sử dụng **`mammoth`** (mammoth.js) để chuyển đổi cấu trúc file `.docx` sang định dạng HTML sạch. Mammoth giữ lại các thẻ định dạng định kiểu (`<strong>`, `<em>`, `<table>`, `<ul>`, v.v.) tốt hơn các bộ chuyển đổi text thô.
2.  **Parser Algorithm:** Áp dụng thuật toán **State Machine (Máy trạng thái)** kết hợp **Regular Expressions (Regex)** để bóc tách từng khối dữ liệu HTML.

---

## 10.3. Thuật toán bóc tách dữ liệu (Parsing Algorithm)

Hàm parser sẽ đọc file Word, chuyển sang HTML và duyệt qua từng đoạn văn (paragraphs) để phân loại trạng thái:

```typescript
import mammoth from "mammoth";

interface ParsedQuestion {
  content: string;
  choices: { content: string; isCorrect: boolean }[];
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export async function parseWordDocx(buffer: Buffer): Promise<{ questions: ParsedQuestion[]; errors: string[] }> {
  // 1. Chuyển đổi DOCX sang HTML
  const { value: html } = await mammoth.convertToHtml({ buffer });
  
  // 2. Chia nhỏ văn bản bằng các tag <p>
  // Mỗi thẻ <p> đại diện cho một dòng hoặc một đoạn văn bản trong Word
  const lines = html.split(/<\/p>/).map(line => line.replace(/<p>/g, "").trim()).filter(Boolean);

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];
  
  let currentQuestion: Partial<ParsedQuestion> & { rawChoices: { label: string; text: string }[] } = {
    content: "",
    rawChoices: [],
    explanation: "",
    difficulty: "MEDIUM"
  };

  let currentSection: "NONE" | "CONTENT" | "CHOICE" | "EXPLANATION" = "NONE";
  let questionIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Phát hiện bắt đầu một câu hỏi mới
    const questionMatch = line.match(/^Câu\s+(\d+)\s*:/i);
    if (questionMatch) {
      // Lưu câu hỏi trước đó nếu có dữ liệu hợp lệ
      if (currentQuestion.content) {
        validateAndPushQuestion(currentQuestion, questions, errors, questionIndex);
      }
      
      questionIndex = parseInt(questionMatch[1], 10);
      currentQuestion = {
        content: line.replace(/^Câu\s+(\d+)\s*:/i, "").trim(),
        rawChoices: [],
        explanation: "",
        difficulty: "MEDIUM"
      };
      currentSection = "CONTENT";
      continue;
    }

    // Phát hiện phương án lựa chọn A, B, C, D
    const choiceMatch = line.match(/^([A-D])\.\s*(.*)/i);
    if (choiceMatch && currentSection !== "NONE") {
      currentQuestion.rawChoices.push({
        label: choiceMatch[1].toUpperCase(),
        text: choiceMatch[2].trim()
      });
      currentSection = "CHOICE";
      continue;
    }

    // Phát hiện đáp án đúng
    const answerMatch = line.match(/^Đáp\s+án\s+đúng\s*:\s*([A-D])/i);
    if (answerMatch && currentSection !== "NONE") {
      currentQuestion.explanation = currentQuestion.explanation || ""; // Giữ chỗ
      (currentQuestion as any).correctLabel = answerMatch[1].toUpperCase();
      continue;
    }

    // Phát hiện giải thích đáp án
    const explanationMatch = line.match(/^Giải\s+thích\s*:\s*(.*)/i);
    if (explanationMatch && currentSection !== "NONE") {
      currentQuestion.explanation = explanationMatch[1].trim();
      currentSection = "EXPLANATION";
      continue;
    }

    // Phát hiện độ khó
    const difficultyMatch = line.match(/^Độ\s+khó\s*:\s*(Dễ|Trung\s+bình|Khó)/i);
    if (difficultyMatch && currentSection !== "NONE") {
      const diffText = difficultyMatch[1].trim();
      currentQuestion.difficulty = diffText === "Dễ" ? "EASY" : diffText === "Khó" ? "HARD" : "MEDIUM";
      continue;
    }

    // Xử lý dòng trôi nổi (nếu nội dung câu hỏi hoặc giải thích dài nhiều dòng)
    if (currentSection === "CONTENT") {
      currentQuestion.content += `<br/>${line}`;
    } else if (currentSection === "EXPLANATION") {
      currentQuestion.explanation += `<br/>${line}`;
    }
  }

  // Đẩy câu hỏi cuối cùng
  if (currentQuestion.content) {
    validateAndPushQuestion(currentQuestion, questions, errors, questionIndex);
  }

  return { questions, errors };
}

function validateAndPushQuestion(
  q: any,
  list: ParsedQuestion[],
  errors: string[],
  idx: number
) {
  if (q.rawChoices.length !== 4) {
    errors.push(`Câu ${idx}: Số lượng phương án lựa chọn không bằng 4 (Tìm thấy: ${q.rawChoices.length})`);
    return;
  }
  if (!q.correctLabel) {
    errors.push(`Câu ${idx}: Không tìm thấy thông tin đáp án đúng (ví dụ: Đáp án đúng: A)`);
    return;
  }

  const choices = q.rawChoices.map((rc: any) => ({
    content: rc.text,
    isCorrect: rc.label === q.correctLabel
  }));

  list.push({
    content: q.content,
    choices,
    explanation: q.explanation || "",
    difficulty: q.difficulty
  });
}
```

---

## 10.4. Xem trước & Xử lý phản hồi lỗi (Preview & UI Diagnostics)

*   **Hiển thị lỗi trực quan:** Các dòng lỗi trong mảng `errors` được hiển thị dạng danh sách cảnh báo màu đỏ kèm mã số câu hỏi để Admin dễ dàng chỉnh sửa lại file Word nguồn.
*   **Màn hình Preview:** Nếu file hoàn toàn hợp lệ hoặc chỉ có cảnh báo không nghiêm trọng, hiển thị toàn bộ danh sách câu hỏi đã bóc tách lên giao diện lưới (grid). Admin có thể chỉnh sửa nhanh nội dung hoặc sửa đáp án trực tiếp trên UI trước khi nhấn nút "Xác nhận lưu vào cơ sở dữ liệu".
