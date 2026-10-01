import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ExamResult {
  examTitle: string;
  userName: string;
  score: number;
  correctCount: number;
  totalCount: number;
  startedAt: string;
  submittedAt: string | null;
  timeSpent: number | null;
  questions: {
    questionText: string;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: string | null;
  }[];
}

export async function generateExamResultPDF(result: ExamResult): Promise<Blob> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("KẾT QUẢ BÀI THI", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 10;

  // Exam Info
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Bài thi: ${result.examTitle}`, 20, yPosition);
  yPosition += 7;
  doc.text(`Thí sinh: ${result.userName}`, 20, yPosition);
  yPosition += 7;
  doc.text(
    `Ngày thi: ${new Date(result.submittedAt || result.startedAt).toLocaleString("vi-VN")}`,
    20,
    yPosition
  );
  yPosition += 7;

  // Score Box
  doc.setFillColor(124, 58, 237);
  doc.rect(20, yPosition, pageWidth - 40, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(
    `ĐIỂM: ${result.score.toFixed(0)} / 100`,
    pageWidth / 2,
    yPosition + 12,
    { align: "center" }
  );
  doc.setFontSize(12);
  doc.text(
    `${result.correctCount}/${result.totalCount} câu đúng`,
    pageWidth / 2,
    yPosition + 22,
    { align: "center" }
  );
  yPosition += 40;

  // Time info
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (result.timeSpent) {
    const minutes = Math.floor(result.timeSpent / 60);
    const seconds = result.timeSpent % 60;
    doc.text(
      `Thời gian làm bài: ${minutes} phút ${seconds} giây`,
      20,
      yPosition
    );
    yPosition += 7;
  }
  doc.text(
    `Kết quả: ${result.score >= 50 ? "ĐẠT" : "KHÔNG ĐẠT"}`,
    20,
    yPosition
  );
  yPosition += 15;

  // Questions Table
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("CHI TIẾT CÂU HỎI", 20, yPosition);
  yPosition += 10;

  const tableData = result.questions.map((q, idx) => [
    `Câu ${idx + 1}`,
    q.questionText.substring(0, 80) + (q.questionText.length > 80 ? "..." : ""),
    q.userAnswer || "Không trả lời",
    q.correctAnswer,
    q.isCorrect ? "✓" : "✗",
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [["#", "Câu hỏi", "Câu trả lời của bạn", "Đáp án đúng", "Kết quả"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [124, 58, 237],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 60 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 15, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const isCorrect = data.cell.raw === "✓";
        data.cell.styles.textColor = isCorrect ? [34, 197, 94] : [239, 68, 68];
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Footer
  const finalY = (doc as any).lastAutoTable.finalY || yPosition;
  if (finalY < pageHeight - 30) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Tạo bởi CivilPrep - civilprep.vn",
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  }

  return doc.output("blob");
}

export function downloadPDF(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
