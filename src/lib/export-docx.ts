import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  CommentRangeStart,
  CommentRangeEnd,
  Comment,
 convertInchesToTwip,
} from "docx";
import { writeFile } from "fs/promises";
import path from "path";

interface Section {
  id: string;
  sectionType: string;
  sectionTitle: string;
  sectionOrder: number;
  rawContent: string;
}

interface Annotation {
  id: string;
  sectionId: string;
  severity: string;
  ruleCode: string;
  startPosition: number;
  endPosition: number;
  highlightedText: string;
  issue: string;
  explanation: string | null;
  suggestion: string | null;
  proposedContent: string | null;
  status: string;
}

interface LessonPlan {
  title: string;
  subject: string | null;
  gradeLevel: string | null;
  schoolYear: string | null;
}

/**
 * Export lesson plan to DOCX format with annotations
 */
export async function exportToDocx(
  lessonPlan: LessonPlan,
  sections: Section[],
  annotations: Annotation[],
  includeAnnotations: boolean = true
): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: lessonPlan.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // Metadata
          ...(lessonPlan.subject || lessonPlan.gradeLevel || lessonPlan.schoolYear
            ? [
                new Paragraph({
                  children: [
                    ...(lessonPlan.subject
                      ? [
                          new TextRun({ text: "Môn học: ", bold: true }),
                          new TextRun({ text: lessonPlan.subject }),
                          new TextRun({ text: " | " }),
                        ]
                      : []),
                    ...(lessonPlan.gradeLevel
                      ? [
                          new TextRun({ text: "Lớp: ", bold: true }),
                          new TextRun({ text: lessonPlan.gradeLevel }),
                          new TextRun({ text: " | " }),
                        ]
                      : []),
                    ...(lessonPlan.schoolYear
                      ? [
                          new TextRun({ text: "Năm học: ", bold: true }),
                          new TextRun({ text: lessonPlan.schoolYear }),
                        ]
                      : []),
                  ],
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 400 },
                }),
              ]
            : []),

          // Sections
          ...sections.flatMap((section) =>
            createSectionWithAnnotations(section, annotations, includeAnnotations)
          ),

          // Annotations Summary (if included)
          ...(includeAnnotations && annotations.length > 0
            ? createAnnotationsSummary(annotations)
            : []),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

/**
 * Create section paragraphs with inline annotation markers
 */
function createSectionWithAnnotations(
  section: Section,
  annotations: Annotation[],
  includeAnnotations: boolean
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Section title
  paragraphs.push(
    new Paragraph({
      text: section.sectionTitle,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );

  // Get annotations for this section
  const sectionAnnotations = annotations
    .filter((a) => a.sectionId === section.id)
    .sort((a, b) => a.startPosition - b.startPosition);

  // Map severity to colors
  const severityColors: Record<string, string> = {
    CRITICAL: "FF0000", // Red
    ERROR: "FF6600",   // Orange
    WARNING: "E6B800", // Dark Yellow
    INFO: "4477CC",    // Blue
  };
  const severityHighlights: Record<string, string> = {
    CRITICAL: "red",
    ERROR: "yellow",
    WARNING: "green",
    INFO: "gray",
  };

  if (!includeAnnotations || sectionAnnotations.length === 0) {
    // No annotations - just add content as-is
    const contentParagraphs = section.rawContent.split("\n").map(
      (line) =>
        new Paragraph({
          text: line,
          spacing: { after: 100 },
        })
    );
    paragraphs.push(...contentParagraphs);
  } else {
    // Add content with annotation markers
    let lastPos = 0;
    const content = section.rawContent;

    sectionAnnotations.forEach((ann, index) => {
      // Text before annotation
      if (ann.startPosition > lastPos) {
        const beforeText = content.substring(lastPos, ann.startPosition);
        if (beforeText.trim()) {
          paragraphs.push(
            new Paragraph({
              text: beforeText,
              spacing: { after: 100 },
            })
          );
        }
      }

      // Annotated text with color-coded highlight
      const annotatedText = content.substring(ann.startPosition, ann.endPosition);
      const color = severityColors[ann.severity] || "000000";
      const highlight = severityHighlights[ann.severity] || undefined;

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: annotatedText,
              highlight: highlight as any,
              color: color,
              bold: ann.severity === "CRITICAL" || ann.severity === "ERROR",
            }),
            new TextRun({
              text: ` [${index + 1}]`,
              superScript: true,
              color: color,
            }),
          ],
          spacing: { after: 100 },
        })
      );

      lastPos = ann.endPosition;
    });

    // Remaining text
    if (lastPos < content.length) {
      const remainingText = content.substring(lastPos);
      if (remainingText.trim()) {
        paragraphs.push(
          new Paragraph({
            text: remainingText,
            spacing: { after: 100 },
          })
        );
      }
    }
  }

  return paragraphs;
}

/**
 * Create annotations summary table at the end
 */
function createAnnotationsSummary(annotations: Annotation[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(
    new Paragraph({
      text: "Phụ lục: Các nhận xét từ AI",
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 600, after: 300 },
      pageBreakBefore: true,
    })
  );

  annotations.forEach((ann, index) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `[${index + 1}] `,
            bold: true,
            color: "FF0000",
          }),
          new TextRun({
            text: `${ann.ruleCode} - ${ann.severity}`,
            bold: true,
          }),
        ],
        spacing: { before: 200, after: 100 },
      })
    );

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Vấn đề: ", bold: true }),
          new TextRun({ text: ann.issue }),
        ],
        spacing: { after: 100 },
      })
    );

    if (ann.highlightedText) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Đoạn text: ", bold: true }),
            new TextRun({
              text: `"${ann.highlightedText}"`,
              italics: true,
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (ann.explanation) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Giải thích: ", bold: true }),
            new TextRun({ text: ann.explanation }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (ann.suggestion) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Đề xuất: ", bold: true }),
            new TextRun({ text: ann.suggestion }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    if (ann.proposedContent) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Nội dung đề xuất: ", bold: true }),
            new TextRun({
              text: ann.proposedContent,
              color: "008000",
            }),
          ],
          spacing: { after: 100 },
        })
      );
    }

    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Trạng thái: ", bold: true }),
          new TextRun({
            text: ann.status === "ACCEPTED" ? "Đã chấp nhận" : ann.status === "REJECTED" ? "Đã từ chối" : "Chờ xử lý",
            color: ann.status === "ACCEPTED" ? "008000" : ann.status === "REJECTED" ? "FF0000" : "FFA500",
          }),
        ],
        spacing: { after: 200 },
      })
    );
  });

  return paragraphs;
}

/**
 * Save DOCX buffer to file
 */
export async function saveDocxToFile(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const exportDir = path.join(process.cwd(), "uploads", "exports");
  const filePath = path.join(exportDir, filename);

  // Create directory if not exists
  const { mkdir } = await import("fs/promises");
  await mkdir(exportDir, { recursive: true });

  await writeFile(filePath, buffer);

  return `/uploads/exports/${filename}`;
}
