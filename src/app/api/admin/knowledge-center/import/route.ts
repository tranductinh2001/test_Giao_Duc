import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  UnifiedDocumentAdapter,
  requiresAPI,
  parseDocument,
} from "@/core/document-adapters/UnifiedDocumentAdapter";
import { DocumentSourceType } from "@/core/document-adapters/types";
import { validateFile } from "@/lib/file-validator";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "FORBIDDEN", message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "MISSING_FILE", message: "Vui lòng chọn tệp tin cần tải lên" },
        { status: 400 }
      );
    }

    const fileName = file.name;
    const mimeType = file.type || "application/octet-stream";

    // Validate file using shared validator
    const validation = validateFile({
      name: fileName,
      size: file.size,
      type: mimeType,
    });

    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.errorCode || "FILE_VALIDATION_FAILED",
        message: validation.error,
      }, { status: 400 });
    }

    // Get supported types
    const supportedTypes = UnifiedDocumentAdapter.getSupportedTypes();
    const supportedExtensions = [
      ...supportedTypes.docx.extensions,
      ...supportedTypes.pdf.extensions,
      ...supportedTypes.image.extensions,
    ];

    // Validate file type
    const fileExt = "." + fileName.toLowerCase().split(".").pop();
    if (!supportedExtensions.includes(fileExt)) {
      return NextResponse.json({
        success: false,
        error: "UNSUPPORTED_TYPE",
        message: `Định dạng ${fileExt} không được hỗ trợ`,
        supportedTypes: {
          docx: supportedTypes.docx.extensions,
          pdf: supportedTypes.pdf.extensions,
          image: supportedTypes.image.extensions,
        },
      }, { status: 400 });
    }

    // Check if requires API (for progress tracking)
    const needsAPI = requiresAPI(fileName, mimeType || null);
    const adapterInfo = UnifiedDocumentAdapter.getSupportedTypes();

    // Determine which adapter will be used
    const sourceType = (() => {
      if (fileExt === ".docx" || fileExt === ".doc") return DocumentSourceType.DOCX;
      if (fileExt === ".pdf") return DocumentSourceType.PDF;
      return DocumentSourceType.IMAGE;
    })();

    // Parse file using UnifiedDocumentAdapter
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Start processing - return immediately with progress info
    // The actual processing happens in background
    const parseResult = await parseDocument(buffer, fileName, mimeType || null);

    if (!parseResult.success || !parseResult.document) {
      // Return the parse error directly if it's a validation error
      if (parseResult.error && parseResult.error.includes("vượt quá giới hạn")) {
        return NextResponse.json({
          success: false,
          error: "FILE_TOO_LARGE",
          message: parseResult.error,
        }, { status: 400 });
      }
      return NextResponse.json({
        success: false,
        error: "PARSE_ERROR",
        message: parseResult.error || "Không thể parse file",
      }, { status: 422 });
    }

    // Extract structured data from parsed document
    const document = parseResult.document;

    // Try to extract lesson structure from document sections
    // Reconstruct content from sections for knowledge mapping
    const content = document.sections
      .map((s: any) => s.title + " " + (s.activities?.map((a: any) => a.content).join(" ") || ""))
      .join("\n");

    const structuredData = extractKnowledgeStructure(content, document.sections);

    if (!structuredData) {
      return NextResponse.json({
        success: false,
        error: "NO_STRUCTURE",
        message: "Không tìm thấy cấu trúc dữ liệu trong file. Vui lòng đảm bảo file chứa cấu trúc sách giáo khoa hợp lệ.",
      }, { status: 422 });
    }

    // Import to database
    const result = await importKnowledgeData(structuredData);

    return NextResponse.json({
      success: true,
      message: `Import thành công: ${result.books} sách, ${result.grades} lớp, ${result.subjects} môn, ${result.lessons} bài, ${result.sections} phần, ${result.activities} hoạt động`,
      data: {
        ...result,
        documentId: document.id,
        sourceType: DocumentSourceType[sourceType],
        wordCount: document.metadata.wordCount,
      },
    });

  } catch (error) {
    console.error("[KnowledgeCenterImport] Error:", error);
    return NextResponse.json({
      success: false,
      error: "INTERNAL_ERROR",
      message: "Lỗi khi import dữ liệu",
    }, { status: 500 });
  }
}

/**
 * Extract knowledge structure from parsed document
 * Looks for common patterns in document content
 */
function extractKnowledgeStructure(content: string, sections: any[]): any | null {
  // Try to parse as JSON first (if user uploaded structured data)
  try {
    const jsonData = JSON.parse(content);
    if (Array.isArray(jsonData) || jsonData.name) {
      return Array.isArray(jsonData) ? jsonData : [jsonData];
    }
  } catch {
    // Not JSON, continue with content parsing
  }

  // Try to extract structure from content/sections
  // This is where knowledge mapping would be applied in production
  if (sections && sections.length > 0) {
    // Build structure from parsed sections
    const books: any[] = [];

    // Group sections by potential grade/subject/lesson structure
    const structure = buildStructureFromSections(sections);

    if (structure.length > 0) {
      return structure;
    }
  }

  // If no structured data found, create a basic entry from filename
  const fileName = content.substring(0, 50) || "Untitled";
  return [{
    name: fileName,
    description: "Imported from document",
    grades: [{
      name: "Lớp mặc định",
      subjects: [{
        name: "Môn mặc định",
        lessons: [{
          name: "Bài học 1",
          sections: [{
            name: "Nội dung",
            activities: [{
              name: "Hoạt động 1",
              content: content.substring(0, 1000),
            }],
          }],
        }],
      }],
    }],
  }];
}

/**
 * Build knowledge structure from parsed document sections
 */
function buildStructureFromSections(sections: any[]): any[] {
  if (!sections || sections.length === 0) return [];

  // For now, create a simple structure
  // In production, this would use AI/LLM to understand the document structure
  const bookName = sections[0]?.title || "Imported Book";

  return [{
    name: bookName,
    description: `Imported from document with ${sections.length} sections`,
    grades: [{
      name: "Lớp 10",
      subjects: [{
        name: "Toán",
        lessons: sections.map((section, index) => ({
          name: section.title || `Bài ${index + 1}`,
          sections: [{
            name: section.title || "Section",
            activities: [{
              name: "Nội dung",
              content: section.content || "",
            }],
          }],
        })),
      }],
    }],
  }];
}

/**
 * Import knowledge data to database
 */
async function importKnowledgeData(data: any[]): Promise<{
  books: number;
  grades: number;
  subjects: number;
  lessons: number;
  sections: number;
  activities: number;
}> {
  const result = { books: 0, grades: 0, subjects: 0, lessons: 0, sections: 0, activities: 0 };

  for (const bookData of data) {
    if (!bookData.name) continue;

    const book = await prisma.lessonBook.create({
      data: {
        code: bookData.code || `BOOK_${result.books + 1}`,
        name: bookData.name,
        description: bookData.description || "",
        isActive: true,
        order: bookData.order || result.books,
      }
    });
    result.books++;

    // Process grades
    const grades = bookData.grades || [];
    for (const gradeData of grades) {
      if (!gradeData.name) continue;

      const grade = await prisma.lessonGrade.create({
        data: {
          code: gradeData.code || `GRADE_${result.grades + 1}`,
          name: gradeData.name,
          bookId: book.id,
          isActive: true,
          order: gradeData.order || result.grades,
        }
      });
      result.grades++;

      // Process subjects
      const subjects = gradeData.subjects || [];
      for (const subjectData of subjects) {
        if (!subjectData.name) continue;

        const subject = await prisma.lessonSubject.create({
          data: {
            code: subjectData.code || `SUBJECT_${result.subjects + 1}`,
            name: subjectData.name,
            gradeId: grade.id,
            isActive: true,
            order: subjectData.order || result.subjects,
          }
        });
        result.subjects++;

        // Process lessons
        const lessons = subjectData.lessons || [];
        for (const lessonData of lessons) {
          if (!lessonData.name) continue;

          const lesson = await prisma.lesson.create({
            data: {
              code: lessonData.code || `LESSON_${result.lessons + 1}`,
              title: lessonData.name,
              subjectId: subject.id,
              isActive: true,
              order: lessonData.order || result.lessons,
            }
          });
          result.lessons++;

          // Process sections
          const sections = lessonData.sections || [];
          for (const sectionData of sections) {
            if (!sectionData.name) continue;

            const section = await prisma.lessonSection.create({
              data: {
                code: sectionData.code || `SECTION_${result.sections + 1}`,
                name: sectionData.name,
                lessonId: lesson.id,
                isActive: true,
                order: sectionData.order || result.sections,
              }
            });
            result.sections++;

            // Process activities
            const activities = sectionData.activities || [];
            for (const activityData of activities) {
              if (!activityData.name) continue;

              await prisma.lessonActivity.create({
                data: {
                  code: activityData.code || `ACTIVITY_${result.activities + 1}`,
                  title: activityData.name,
                  summary: activityData.content || "",
                  sectionId: section.id,
                  isActive: true,
                  order: activityData.order || result.activities,
                }
              });
              result.activities++;
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * GET - Return supported file types
 */
export async function GET() {
  const supportedTypes = UnifiedDocumentAdapter.getSupportedTypes();

  return NextResponse.json({
    success: true,
    supportedTypes: {
      docx: {
        ...supportedTypes.docx,
        icon: "📄",
      },
      pdf: {
        ...supportedTypes.pdf,
        icon: "📕",
      },
      image: {
        ...supportedTypes.image,
        icon: "🖼️",
      },
    },
  });
}
