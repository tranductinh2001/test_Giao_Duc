import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { QuestionInput, ExcelRowSchema, QuestionSchema } from "../schemas";

export interface ParsedQuestion {
  content: string;
  explanation: string | null;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  categoryId: string;
  choices: {
    content: string;
    isCorrect: boolean;
  }[];
}

export class ImportService {
  async parseJsonFile(
    buffer: Buffer,
    categoryId: string
  ): Promise<{ questions: ParsedQuestion[]; errors: string[] }> {
    const errors: string[] = [];
    const questions: ParsedQuestion[] = [];

    try {
      const rawText = buffer.toString("utf8").trim();
      const payload = JSON.parse(rawText);
      const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.questions) ? payload.questions : null;

      if (!rows) {
        return {
          questions: [],
          errors: [
            "File JSON phai la mot mang doi tuong cau hoi, hoac mot object co thuoc tinh questions la mang cau hoi.",
          ],
        };
      }

      rows.forEach((item: any, idx: number) => {
        const normalized = this.normalizeJsonQuestion(item, categoryId);
        if (!normalized) {
          errors.push(`Phan tu JSON thu ${idx + 1} khong hop le.`);
          return;
        }

        const parsed = QuestionSchema.safeParse(normalized);
        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          Object.entries(fieldErrors).forEach(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages.join(", ") : messages;
            errors.push(`Cau ${idx + 1}: Cot [${field}] - ${msg}`);
          });
          return;
        }

        questions.push({
          content: parsed.data.content,
          explanation: parsed.data.explanation || null,
          difficulty: parsed.data.difficulty,
          categoryId: parsed.data.categoryId,
          choices: parsed.data.choices.map((choice) => ({
            content: choice.content,
            isCorrect: choice.isCorrect,
          })),
        });
      });
    } catch (error: any) {
      errors.push(`Khong the doc file JSON. Chi tiet loi: ${error.message}`);
    }

    return { questions, errors };
  }

  /**
   * Parses a Word (.docx) document buffer into standard ParsedQuestion objects.
   */
  async parseWordDocx(
    buffer: Buffer,
    categoryId: string
  ): Promise<{ questions: ParsedQuestion[]; errors: string[] }> {
    const errors: string[] = [];
    const questions: ParsedQuestion[] = [];

    try {
      // 1. Convert DOCX to HTML
      const { value: html } = await mammoth.convertToHtml({ buffer });

      // 2. Extract answer key mappings from HTML tables (e.g. at the end of doc)
      const answerMap: Record<number, string> = {};
      const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
      let tableMatch;
      while ((tableMatch = tableRegex.exec(html)) !== null) {
        const tableBody = tableMatch[1];
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;
        while ((rowMatch = rowRegex.exec(tableBody)) !== null) {
          const rowContent = rowMatch[1];
          const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
          let cellMatch;
          const cells: string[] = [];
          while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
            const cellText = cellMatch[1].replace(/<[^>]+>/g, "").trim();
            cells.push(cellText);
          }

          // Process cells in pairs
          for (let i = 0; i < cells.length; i += 2) {
            const qNumText = cells[i];
            const ansLetter = cells[i + 1];
            if (qNumText && ansLetter) {
              const qNum = parseInt(qNumText, 10);
              const letter = ansLetter.toUpperCase().trim();
              if (!isNaN(qNum) && ["A", "B", "C", "D"].includes(letter)) {
                answerMap[qNum] = letter;
              }
            }
          }
        }
      }

      // 3. Split HTML by closing </p> tag
      const lines = html
        .split(/<\/p>/)
        .map((line) => line.replace(/<p>/g, "").trim())
        .filter(Boolean);

      // 4. Extract answer key mappings from plain paragraphs (e.g. "Câu 1: A" or "1. B" or "1-C")
      lines.forEach((line) => {
        const cleanLine = line.replace(/<[^>]+>/g, "").trim();
        const textMatch = cleanLine.match(/^(?:Câu\s+)?(\d+)\s*[\.\-:\s]\s*([A-D])$/i);
        if (textMatch) {
          const qNum = parseInt(textMatch[1], 10);
          const letter = textMatch[2].toUpperCase();
          if (!answerMap[qNum]) {
            answerMap[qNum] = letter;
          }
        }
      });

      let currentQuestion: any = {
        content: "",
        rawChoices: [],
        explanation: "",
        difficulty: "MEDIUM",
      };

      let currentSection: "NONE" | "CONTENT" | "CHOICE" | "EXPLANATION" = "NONE";
      let questionIndex = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const cleanLine = line.replace(/<[^>]+>/g, "").trim();

        // Match "Câu [STT]:"
        const questionMatch = cleanLine.match(/^Câu\s+(\d+)\s*:/i);
        if (questionMatch) {
          // Push previous question if exists
          if (currentQuestion.content) {
            this.validateAndPushWordQuestion(
              currentQuestion,
              questions,
              errors,
              questionIndex,
              categoryId,
              answerMap
            );
          }

          questionIndex = parseInt(questionMatch[1], 10);
          currentQuestion = {
            content: cleanLine.replace(/^Câu\s+(\d+)\s*:/i, "").trim(),
            rawChoices: [],
            explanation: "",
            difficulty: "MEDIUM",
          };
          currentSection = "CONTENT";
          continue;
        }

        // Match Choice A, B, C, D
        const choiceMatch = cleanLine.match(/^([A-D])\.\s*(.*)/i);
        if (choiceMatch && currentSection !== "NONE") {
          currentQuestion.rawChoices.push({
            label: choiceMatch[1].toUpperCase(),
            text: choiceMatch[2].trim(),
          });
          currentSection = "CHOICE";
          continue;
        }

        // Match Correct Answer (Inline)
        const answerMatch = cleanLine.match(/^Đáp\s+án\s+đúng\s*:\s*([A-D])/i);
        if (answerMatch && currentSection !== "NONE") {
          currentQuestion.correctLabel = answerMatch[1].toUpperCase();
          continue;
        }

        // Match Explanation
        const explanationMatch = cleanLine.match(/^Giải\s+thích\s*:\s*(.*)/i);
        if (explanationMatch && currentSection !== "NONE") {
          currentQuestion.explanation = explanationMatch[1].trim();
          currentSection = "EXPLANATION";
          continue;
        }

        // Match Difficulty
        const difficultyMatch = cleanLine.match(/^Độ\s+khó\s*:\s*(Dễ|Trung\s+bình|Khó)/i);
        if (difficultyMatch && currentSection !== "NONE") {
          const diffText = difficultyMatch[1].trim();
          currentQuestion.difficulty =
            diffText === "Dễ" ? "EASY" : diffText === "Khó" ? "HARD" : "MEDIUM";
          continue;
        }

        // Handle multiline contents (using original line content to preserve formatting)
        if (currentSection === "CONTENT") {
          currentQuestion.content += `<br/>${line}`;
        } else if (currentSection === "EXPLANATION") {
          currentQuestion.explanation += `<br/>${line}`;
        }
      }

      // Push final question
      if (currentQuestion.content) {
        this.validateAndPushWordQuestion(
          currentQuestion,
          questions,
          errors,
          questionIndex,
          categoryId,
          answerMap
        );
      }
    } catch (error: any) {
      errors.push(`Lỗi đọc file Word: ${error.message}`);
    }

    return { questions, errors };
  }

  private normalizeJsonQuestion(item: any, fallbackCategoryId: string) {
    if (!item || typeof item !== "object") return null;

    const content = typeof item.content === "string"
      ? item.content
      : typeof item.QuestionContent === "string"
        ? item.QuestionContent
        : "";

    const explanation = typeof item.explanation === "string"
      ? item.explanation
      : typeof item.Explanation === "string"
        ? item.Explanation
        : null;

    const difficultyRaw = typeof item.difficulty === "string"
      ? item.difficulty
      : typeof item.Difficulty === "string"
        ? item.Difficulty
        : "MEDIUM";

    const categoryId = typeof item.categoryId === "string"
      ? item.categoryId
      : typeof item.CategoryId === "string"
        ? item.CategoryId
        : fallbackCategoryId;

    const choices = Array.isArray(item.choices)
      ? item.choices
      : Array.isArray(item.Choices)
        ? item.Choices
        : this.buildChoicesFromColumns(item);

    if (!content || !categoryId || !Array.isArray(choices) || choices.length === 0) {
      return null;
    }

    return {
      content,
      explanation,
      difficulty: String(difficultyRaw).toUpperCase(),
      categoryId,
      choices: choices.map((choice: any) => ({
        content: typeof choice.content === "string"
          ? choice.content
          : typeof choice.text === "string"
            ? choice.text
            : "",
        isCorrect: !!choice.isCorrect,
      })),
    };
  }

  private buildChoicesFromColumns(item: any) {
    const correctAnswerRaw =
      item.correctAnswer ?? item.CorrectAnswer ?? item.correct ?? item.Correct;
    const correctAnswer = typeof correctAnswerRaw === "string"
      ? correctAnswerRaw.trim().toUpperCase()
      : "";

    return ["A", "B", "C", "D"].map((label) => ({
      content: item[`choice${label}`] ?? item[`Choice${label}`] ?? "",
      isCorrect: correctAnswer === label,
    }));
  }

  /**
   * Helper to validate a Word-parsed question and format it properly
   */
  private validateAndPushWordQuestion(
    q: any,
    list: ParsedQuestion[],
    errors: string[],
    idx: number,
    categoryId: string,
    answerMap: Record<number, string>
  ) {
    if (q.rawChoices.length !== 4) {
      errors.push(
        `Câu ${idx}: Số lượng phương án lựa chọn phải bằng 4 (Tìm thấy: ${q.rawChoices.length})`
      );
      return;
    }

    const correctLabel = q.correctLabel || answerMap[idx];
    if (!correctLabel) {
      errors.push(`Câu ${idx}: Không tìm thấy thông tin đáp án đúng (cả inline lẫn ở bảng đáp án cuối trang)`);
      return;
    }

    const choices = q.rawChoices.map((rc: any) => ({
      content: rc.text,
      isCorrect: rc.label === correctLabel,
    }));

    list.push({
      content: q.content,
      choices,
      explanation: q.explanation || null,
      difficulty: q.difficulty,
      categoryId,
    });
  }

  /**
   * Parses an Excel (.xlsx) file buffer into standard ParsedQuestion objects.
   */
  async parseExcelFile(
    buffer: Buffer,
    categoryId: string
  ): Promise<{ questions: ParsedQuestion[]; errors: string[] }> {
    const errors: string[] = [];
    const questions: ParsedQuestion[] = [];

    try {
      // 1. Read workbook from Buffer
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // 2. Convert sheet to JSON array
      const rawData = XLSX.utils.sheet_to_json(worksheet);

      // 3. Process and validate each row
      rawData.forEach((row: any, idx) => {
        const rowIndex = idx + 2; // Row index in Excel (1-based, plus header row)

        const parsed = ExcelRowSchema.safeParse(row);
        if (!parsed.success) {
          const fieldErrors = parsed.error.flatten().fieldErrors;
          Object.entries(fieldErrors).forEach(([field, messages]) => {
            const msg = Array.isArray(messages) ? messages.join(", ") : messages;
            errors.push(`Dòng ${rowIndex} (Câu ${row.No || "?"}): Cột [${field}] - ${msg}`);
          });
          return;
        }

        const data = parsed.data;

        const question: ParsedQuestion = {
          content: data.QuestionContent,
          difficulty: data.Difficulty as "EASY" | "MEDIUM" | "HARD",
          explanation: data.Explanation || null,
          categoryId,
          choices: [
            { content: data.ChoiceA, isCorrect: data.CorrectAnswer === "A" },
            { content: data.ChoiceB, isCorrect: data.CorrectAnswer === "B" },
            { content: data.ChoiceC, isCorrect: data.CorrectAnswer === "C" },
            { content: data.ChoiceD, isCorrect: data.CorrectAnswer === "D" },
          ],
        };

        questions.push(question);
      });
    } catch (error: any) {
      errors.push(`Không thể đọc file Excel. Chi tiết lỗi: ${error.message}`);
    }

    return { questions, errors };
  }
}
