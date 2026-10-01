/**
 * Lesson Importer Service
 *
 * Phase 2: Import lessons from JSON, DOCX, Markdown
 */

import * as fs from "fs/promises";
import * as path from "path";
import mammoth from "mammoth";
import { lessonRepository } from "../repositories/LessonRepository";
import type {
  BookDTO,
  GradeDTO,
  SubjectDTO,
  LessonDTO,
  LessonSectionDTO,
  LessonActivityDTO,
  ImportResult,
  ImportRecord,
} from "../types";
import { ImportFormat } from "../types";

export interface ImportOptions {
  format: ImportFormat;
  filePath?: string;
  content?: string;
  bookCode?: string;
  gradeCode?: string;
  subjectCode?: string;
  overwrite?: boolean;
}

interface JsonLessonStructure {
  book?: {
    code: string;
    name: string;
    description?: string;
  };
  grades?: Array<{
    code: string;
    name: string;
    subjects?: Array<{
      code: string;
      name: string;
      lessons?: Array<{
        code: string;
        title: string;
        description?: string;
        sections?: Array<{
          code: string;
          name: string;
          description?: string;
          activities?: Array<{
            code: string;
            title: string;
            summary?: string;
            teachingIntent?: string;
            knowledge?: string;
            keywords?: string[];
            teachingMethod?: string;
            expectedTeacherActions?: string;
            expectedStudentActions?: string;
            expectedOutcome?: string;
            estimatedMinutes?: number;
            aliases?: string[];
          }>;
        }>;
      }>;
    }>;
  }>;
}

export class LessonImporter {
  /**
   * Import lessons from file or content
   */
  async import(options: ImportOptions): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: {
        books: 0,
        grades: 0,
        subjects: 0,
        lessons: 0,
        sections: 0,
        activities: 0,
      },
      errors: [],
      warnings: [],
    };

    try {
      let content = options.content;

      if (!content && options.filePath) {
        content = await fs.readFile(options.filePath, "utf-8");
      }

      if (!content) {
        result.errors.push("No content provided for import");
        return result;
      }

      // Parse content based on format
      let data: JsonLessonStructure;

      switch (options.format) {
        case ImportFormat.JSON:
          data = this.parseJson(content);
          break;
        case ImportFormat.DOCX:
          data = await this.parseDocx(content);
          break;
        case ImportFormat.MARKDOWN:
          data = this.parseMarkdown(content);
          break;
        default:
          result.errors.push(`Unsupported format: ${options.format}`);
          return result;
      }

      // Process the data
      const importResult = await this.processImport(data, options);
      result.imported = importResult.imported;
      result.errors.push(...importResult.errors);
      result.warnings.push(...importResult.warnings);
      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : "Unknown import error");
    }

    return result;
  }

  /**
   * Import from JSON string
   */
  async importFromJson(jsonContent: string, bookCode?: string): Promise<ImportResult> {
    return this.import({
      format: ImportFormat.JSON,
      content: jsonContent,
      bookCode,
    });
  }

  /**
   * Import from file
   */
  async importFromFile(filePath: string, format?: ImportFormat): Promise<ImportResult> {
    const ext = path.extname(filePath).toLowerCase();
    const formatMap: Record<string, ImportFormat> = {
      ".json": ImportFormat.JSON,
      ".docx": ImportFormat.DOCX,
      ".md": ImportFormat.MARKDOWN,
      ".markdown": ImportFormat.MARKDOWN,
    };

    const detectedFormat = format || formatMap[ext];
    if (!detectedFormat) {
      return {
        success: false,
        imported: { books: 0, grades: 0, subjects: 0, lessons: 0, sections: 0, activities: 0 },
        errors: [`Unsupported file extension: ${ext}`],
        warnings: [],
      };
    }

    return this.import({ format: detectedFormat, filePath });
  }

  /**
   * Parse JSON content
   */
  private parseJson(content: string): JsonLessonStructure {
    try {
      return JSON.parse(content);
    } catch {
      throw new Error("Invalid JSON format");
    }
  }

  /**
   * Parse DOCX content (Buffer)
   */
  private async parseDocx(content: string | Buffer): Promise<JsonLessonStructure> {
    // If content is a base64 string, convert to buffer
    const buffer = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content, "base64");

    const result = await mammoth.extractRawText({ buffer });
    return this.parseMarkdownToStructure(result.value);
  }

  /**
   * Parse Markdown content
   */
  private parseMarkdown(content: string): JsonLessonStructure {
    return this.parseMarkdownToStructure(content);
  }

  /**
   * Convert markdown text to structured data
   */
  private parseMarkdownToStructure(markdown: string): JsonLessonStructure {
    const lines = markdown.split("\n").filter((l) => l.trim());
    const structure: JsonLessonStructure = {
      book: undefined,
      grades: [],
    };

    // Use explicit types to avoid complex type inference
    type GradeType = { code: string; name: string; subjects: any[] };
    type SubjectType = { code: string; name: string; lessons: any[] };
    type LessonType = { code: string; title: string; sections: any[] };
    type SectionType = { code: string; name: string; activities: any[] };

    let currentGrade: GradeType | null = null;
    let currentSubject: SubjectType | null = null;
    let currentLesson: LessonType | null = null;
    let currentSection: SectionType | null = null;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check for heading levels
      if (trimmed.startsWith("# ")) {
        // Book title
        structure.book = {
          code: this.slugify(trimmed.slice(2)),
          name: trimmed.slice(2),
        };
      } else if (trimmed.startsWith("## ")) {
        // Grade
        if (currentSection) {
          currentLesson?.sections?.push(currentSection);
          currentSection = null;
        }
        if (currentLesson) {
          currentSubject?.lessons?.push(currentLesson);
          currentLesson = null;
        }
        if (currentSubject) {
          currentGrade?.subjects?.push(currentSubject);
          currentSubject = null;
        }

        currentGrade = {
          code: this.slugify(trimmed.slice(3)),
          name: trimmed.slice(3),
          subjects: [],
        };
        structure.grades = structure.grades || [];
        structure.grades.push(currentGrade);
      } else if (trimmed.startsWith("### ")) {
        // Subject
        if (currentSection) {
          currentLesson?.sections?.push(currentSection);
          currentSection = null;
        }
        if (currentLesson) {
          currentSubject?.lessons?.push(currentLesson);
          currentLesson = null;
        }

        currentSubject = {
          code: this.slugify(trimmed.slice(4)),
          name: trimmed.slice(4),
          lessons: [],
        };
        currentGrade?.subjects?.push(currentSubject);
      } else if (trimmed.startsWith("#### ")) {
        // Lesson
        if (currentSection) {
          currentLesson?.sections?.push(currentSection);
          currentSection = null;
        }

        currentLesson = {
          code: this.slugify(trimmed.slice(5)),
          title: trimmed.slice(5),
          sections: [],
        };
        currentSubject?.lessons?.push(currentLesson);
      } else if (trimmed.startsWith("##### ")) {
        // Section
        if (currentSection) {
          currentLesson?.sections?.push(currentSection);
        }

        currentSection = {
          code: this.slugify(trimmed.slice(6)),
          name: trimmed.slice(6),
          activities: [],
        };
      } else if (trimmed.startsWith("- ") && currentSection) {
        // Activity
        const activityTitle = trimmed.slice(2);
        currentSection.activities.push({
          code: this.slugify(activityTitle),
          title: activityTitle,
        });
      }
    }

    // Push remaining items
    if (currentSection) {
      currentLesson?.sections?.push(currentSection);
    }
    if (currentLesson) {
      currentSubject?.lessons?.push(currentLesson);
    }
    if (currentSubject) {
      currentGrade?.subjects?.push(currentSubject);
    }

    return structure;
  }

  /**
   * Process import data
   */
  private async processImport(
    data: JsonLessonStructure,
    options: ImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      imported: {
        books: 0,
        grades: 0,
        subjects: 0,
        lessons: 0,
        sections: 0,
        activities: 0,
      },
      errors: [],
      warnings: [],
    };

    if (!data.book) {
      result.errors.push("No book information in import data");
      result.success = false;
      return result;
    }

    // Create or get book
    let book = await lessonRepository.getBookByCode(data.book.code);
    if (!book) {
      book = await lessonRepository.createBook({
        code: data.book.code,
        name: data.book.name,
        description: data.book.description,
      });
      result.imported.books++;
    } else if (options.overwrite) {
      await lessonRepository.updateBook(book.id, {
        name: data.book.name,
        description: data.book.description,
      });
      result.warnings.push(`Book ${data.book.code} already exists, updated`);
    } else {
      result.warnings.push(`Book ${data.book.code} already exists, skipping`);
    }

    if (!book) {
      result.errors.push("Failed to create book");
      return result;
    }

    // Process grades
    if (data.grades) {
      for (let i = 0; i < data.grades.length; i++) {
        const gradeData = data.grades[i];
        let grade = (await lessonRepository.getGradesByBook(book.id)).find(
          (g) => g.code === gradeData.code
        );

        if (!grade) {
          grade = await lessonRepository.createGrade({
            bookId: book.id,
            code: gradeData.code,
            name: gradeData.name,
            order: i,
          });
          result.imported.grades++;
        }

        // Process subjects
        if (gradeData.subjects) {
          for (let j = 0; j < gradeData.subjects.length; j++) {
            const subjectData = gradeData.subjects[j];
            let subject = (await lessonRepository.getSubjectsByGrade(grade.id)).find(
              (s) => s.code === subjectData.code
            );

            if (!subject) {
              subject = await lessonRepository.createSubject({
                gradeId: grade.id,
                code: subjectData.code,
                name: subjectData.name,
                order: j,
              });
              result.imported.subjects++;
            }

            // Process lessons
            if (subjectData.lessons) {
              for (let k = 0; k < subjectData.lessons.length; k++) {
                const lessonData = subjectData.lessons[k];
                const existingLessons = await lessonRepository.getLessonsBySubject(subject.id);
                let lesson = existingLessons.find((l) => l.code === lessonData.code);

                if (!lesson) {
                  lesson = await lessonRepository.createLesson({
                    subjectId: subject.id,
                    code: lessonData.code,
                    title: lessonData.title,
                    description: lessonData.description,
                    order: k,
                  });
                  result.imported.lessons++;
                }

                // Process sections
                if (lessonData.sections) {
                  for (let m = 0; m < lessonData.sections.length; m++) {
                    const sectionData = lessonData.sections[m];
                    const existingSections = await lessonRepository.getSectionsByLesson(lesson.id);
                    let section = existingSections.find((s) => s.code === sectionData.code);

                    if (!section) {
                      section = await lessonRepository.createSection({
                        lessonId: lesson.id,
                        code: sectionData.code,
                        name: sectionData.name,
                        description: sectionData.description,
                        order: m,
                      });
                      result.imported.sections++;
                    }

                    // Process activities
                    if (sectionData.activities) {
                      for (let n = 0; n < sectionData.activities.length; n++) {
                        const activityData = sectionData.activities[n];
                        const existingActivities = await lessonRepository.getActivitiesBySection(section.id);
                        const activityExists = existingActivities.some(
                          (a) => a.code === activityData.code
                        );

                        if (!activityExists) {
                          await lessonRepository.createActivity({
                            sectionId: section.id,
                            code: activityData.code,
                            title: activityData.title,
                            summary: activityData.summary,
                            teachingIntent: activityData.teachingIntent,
                            knowledge: activityData.knowledge,
                            keywords: activityData.keywords,
                            teachingMethod: activityData.teachingMethod,
                            expectedTeacherActions: activityData.expectedTeacherActions,
                            expectedStudentActions: activityData.expectedStudentActions,
                            expectedOutcome: activityData.expectedOutcome,
                            estimatedMinutes: activityData.estimatedMinutes,
                            aliases: activityData.aliases,
                            order: n,
                          });
                          result.imported.activities++;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Generate slug from text
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
}

export const lessonImporter = new LessonImporter();
