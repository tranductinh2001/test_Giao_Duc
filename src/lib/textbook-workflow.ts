/**
 * Enhanced Workflow Service - Textbook Integration
 * Full workflow: Upload → Detect textbook → Match lesson → Load cached → Extract → Optimize → BrightOne → Review
 */

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { smartMatch, MatchResult } from "@/core/textbook/matcher";
import { validateToc, TocValidationResult } from "@/core/textbook/validator";
import { getIndexStats, getChaptersToProcess, needsExtraction } from "@/core/textbook/indexer";
import { extractChapter, extractPages, getTextbookContext } from "@/core/textbook/extractor";
import { optimizePayload, OptimizedPayload } from "@/core/textbook/optimizer";
import { getCachedPdf } from "@/core/textbook/cache";
import { createJob, completeJob, failJob, startJob, updateJobProgress, QueueJob } from "@/core/textbook/queue";
import { brightOneAdapter } from "@/core/document-adapters/BrightOneAdapter";
import crypto from "crypto";

export interface TextbookWorkflowOptions {
  lessonPlanId: string;
  userId: string;
  autoMatch?: boolean;
  requireExactMatch?: boolean;
}

export interface TextbookWorkflowResult {
  success: boolean;
  lessonPlanId: string;
  textbook?: {
    bookId: string;
    bookName: string;
    grade: string;
    subject: string;
  };
  chapter?: {
    chapterId: string;
    chapterTitle: string;
    startPage: number;
    endPage: number;
    confidence: number;
    matchedBy: string;
  };
  extraction?: {
    fromCache: boolean;
    extractionTime: number;
    pageCount: number;
  };
  optimization?: {
    originalLength: number;
    optimizedLength: number;
    savings: number;
  };
  review?: {
    score: number;
    issues: number;
    suggestions: string[];
  };
  metrics: {
    totalTime: number;
    matchingTime: number;
    extractionTime: number;
    optimizationTime: number;
    reviewTime: number;
    cacheHit: boolean;
  };
  error?: string;
}

/**
 * Execute full textbook-enhanced workflow
 */
export async function executeTextbookWorkflow(
  options: TextbookWorkflowOptions
): Promise<TextbookWorkflowResult> {
  const startTime = Date.now();
  const { lessonPlanId, userId, autoMatch = true, requireExactMatch = false } = options;

  let matchingTime = 0;
  let extractionTime = 0;
  let optimizationTime = 0;
  let cacheHit = false;

  try {
    // 1. Get lesson plan
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: lessonPlanId },
    });

    if (!lessonPlan) {
      throw new Error("Lesson plan not found");
    }

    // 2. Match with textbook (if auto-match enabled)
    let matchResult: MatchResult | null = null;
    let matchedBookId: string | undefined;
    let matchedChapterId: string | undefined;

    if (autoMatch && lessonPlan.gradeLevel && lessonPlan.subject) {
      const matchStart = Date.now();
      matchResult = await smartMatch(lessonPlan.title, {
        grade: lessonPlan.gradeLevel,
        subject: lessonPlan.subject,
      });
      matchingTime = Date.now() - matchStart;

      if (matchResult.success && matchResult.chapter && matchResult.book) {
        // Check if exact match required
        if (requireExactMatch && matchResult.confidence < 1.0) {
          return {
            success: false,
            lessonPlanId,
            metrics: {
              totalTime: Date.now() - startTime,
              matchingTime,
              extractionTime,
              optimizationTime,
              reviewTime: 0,
              cacheHit,
            },
            error: "Exact match required but confidence too low",
          };
        }

        matchedBookId = matchResult.book.id;
        matchedChapterId = matchResult.chapter.id;
      }
    }

    // 3. Use provided textbook if not auto-matched
    if (!matchedBookId && lessonPlan.textbookBookId) {
      matchedBookId = lessonPlan.textbookBookId;

      // Try to find chapter
      if (lessonPlan.textbookLessonTitle) {
        const chapters = await prisma.textbookChapter.findMany({
          where: { bookId: matchedBookId, isActive: true },
          orderBy: { startPage: "asc" },
        });

        // Find matching chapter by title
        const normalizedTitle = lessonPlan.textbookLessonTitle.toLowerCase().trim();
        const chapter = chapters.find(
          c => (c.title || "").toLowerCase().trim() === normalizedTitle ||
               c.aliases?.some(a => a.toLowerCase().trim() === normalizedTitle)
        );

        if (chapter) {
          matchedChapterId = chapter.id;
        }
      }
    }

    // 4. Extract pages (with caching)
    let extractedBuffer: Buffer | null = null;
    const pdfBuffer: Buffer | null = null;

    if (matchedBookId && matchedChapterId) {
      const extractStart = Date.now();

      // Check cache first
      const cached = await getCachedPdf(matchedBookId, matchedChapterId);
      if (cached.found && cached.buffer) {
        extractedBuffer = cached.buffer;
        cacheHit = true;
      } else {
        // Extract from PDF
        const extraction = await extractChapter(matchedChapterId);
        if (extraction.success && extraction.buffer) {
          extractedBuffer = extraction.buffer;
        }
      }

      extractionTime = Date.now() - extractStart;
    }

    // 5. Optimize payload
    let optimizedPayload: OptimizedPayload | null = null;
    let reviewText = "";

    if (extractedBuffer) {
      const optStart = Date.now();

      // Convert buffer to text (simplified - would use OCR in production)
      const text = extractedBuffer.toString("utf-8");

      optimizedPayload = optimizePayload(text, {
        deduplicate: true,
        compressWhitespace: true,
        removeHeadersAndFooters: true,
        preserveFormatting: true,
      });

      reviewText = optimizedPayload.content;
      optimizationTime = Date.now() - optStart;
    }

    // 6. Send to BrightOne for review (if we have content)
    let reviewResult: { score: number; issues: number; suggestions: string[] } | null = null;

    if (reviewText || extractedBuffer) {
      const reviewStart = Date.now();

      try {
        // Use BrightOne to parse the extracted content
        const buffer = extractedBuffer || Buffer.from(reviewText);

        const parseResult = await brightOneAdapter.parse(buffer, `lesson-${lessonPlan.id}.txt`);

        if (parseResult.success) {
          // Basic review result based on extraction success
          reviewResult = {
            score: 80, // Default score since we don't have detailed review
            issues: 0,
            suggestions: [],
          };
        }
      } catch (e) {
        // Review failed but don't fail the whole workflow
        console.error("[TextbookWorkflow] Review failed:", e);
      }

      // metrics.reviewTime = Date.now() - reviewStart;
    }

    // 7. Get textbook info for response
    let textbookInfo: { bookId: string; bookName: string; grade: string; subject: string } | undefined;
    let chapterInfo: { chapterId: string; chapterTitle: string; startPage: number; endPage: number; confidence: number; matchedBy: string } | undefined;

    if (matchedBookId) {
      const book = await prisma.textbookBook.findUnique({
        where: { id: matchedBookId },
      });

      if (book) {
        textbookInfo = {
          bookId: book.id,
          bookName: book.name,
          grade: book.grade || "",
          subject: book.subject || "",
        };
      }
    }

    if (matchedChapterId) {
      const chapter = await prisma.textbookChapter.findUnique({
        where: { id: matchedChapterId },
      });

      if (chapter) {
        chapterInfo = {
          chapterId: chapter.id,
          chapterTitle: chapter.title || "",
          startPage: chapter.startPage ?? 1,
          endPage: chapter.endPage ?? 1,
          confidence: chapter.confidence ?? 0,
          matchedBy: matchResult?.matchedBy || "manual",
        };
      }
    }

    return {
      success: true,
      lessonPlanId,
      textbook: textbookInfo,
      chapter: chapterInfo,
      extraction: matchedChapterId ? {
        fromCache: cacheHit,
        extractionTime,
        pageCount: chapterInfo ? chapterInfo.endPage - chapterInfo.startPage + 1 : 0,
      } : undefined,
      optimization: optimizedPayload ? {
        originalLength: optimizedPayload.originalLength,
        optimizedLength: optimizedPayload.optimizedLength,
        savings: optimizedPayload.savings,
      } : undefined,
      review: reviewResult || undefined,
      metrics: {
        totalTime: Date.now() - startTime,
        matchingTime,
        extractionTime,
        optimizationTime,
        reviewTime: 0,
        cacheHit,
      },
    };
  } catch (error) {
    return {
      success: false,
      lessonPlanId,
      metrics: {
        totalTime: Date.now() - startTime,
        matchingTime,
        extractionTime,
        optimizationTime,
        reviewTime: 0,
        cacheHit,
      },
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Detect textbook from uploaded file
 */
export async function detectTextbook(
  pdfBuffer: Buffer,
  fileName: string
): Promise<{
  detected: boolean;
  bookId?: string;
  bookName?: string;
  confidence: number;
  chapters?: Array<{
    id: string;
    title: string;
    startPage: number;
    endPage: number;
  }>;
}> {
  try {
    // Use BrightOne to detect textbook metadata
    const result = await brightOneAdapter.parse(pdfBuffer, fileName);

    if (!result.success || !result.document) {
      return { detected: false, confidence: 0 };
    }

    const docTitle = result.document.title;
    const metadata = result.document.metadata;

    // Try to find matching textbook in database
    const books = await prisma.textbookBook.findMany({
      where: {
        isActive: true,
        tocStatus: "COMPLETED",
      },
    });

    // Match by title (primary matching)
    for (const book of books) {
      if (docTitle && book.name.toLowerCase().includes(docTitle.toLowerCase())) {
        const chapters = await prisma.textbookChapter.findMany({
          where: { bookId: book.id, isActive: true },
          orderBy: { startPage: "asc" },
          select: {
            id: true,
            title: true,
            startPage: true,
            endPage: true,
          },
        });

        return {
          detected: true,
          bookId: book.id,
          bookName: book.name,
          confidence: 0.8,
          chapters: chapters.map(c => ({
            id: c.id,
            title: c.title || "",
            startPage: c.startPage ?? 1,
            endPage: c.endPage ?? 1,
          })),
        };
      }
    }

    return { detected: false, confidence: 0 };
  } catch (error) {
    console.error("[TextbookWorkflow] Detect failed:", error);
    return { detected: false, confidence: 0 };
  }
}

/**
 * Process queue job for textbook operations
 */
export async function processTextbookJob(job: QueueJob): Promise<void> {
  const { type, payload } = job;

  switch (type) {
    case "TEXTBOOK_INDEX":
      // Handle indexing job
      const { runTocIndexing } = await import("@/core/textbook/indexer");
      await runTocIndexing(payload.bookId);
      break;

    case "TEXTBOOK_EXTRACT":
      // Handle extraction job
      const result = await extractChapter(payload.chapterId);
      if (!result.success) {
        throw new Error(result.error || "Extraction failed");
      }
      break;

    default:
      console.warn(`[TextbookWorkflow] Unknown job type: ${type}`);
  }
}

/**
 * Create background job for textbook indexing
 */
export async function scheduleTextbookIndexing(bookId: string): Promise<string> {
  return createJob("TEXTBOOK_INDEX", { bookId }, { priority: 5 });
}

/**
 * Validate TOC and return issues
 */
export async function validateTextbookToc(bookId: string): Promise<TocValidationResult> {
  return validateToc(bookId);
}

/**
 * Get textbook processing status
 */
export async function getTextbookStatus(bookId: string): Promise<{
  indexStatus: {
    bookStatus: "NEW" | "UPDATED" | "UNCHANGED";
    totalChapters: number;
    newChapters: number;
    updatedChapters: number;
    unchangedChapters: number;
    lastIndexed: Date | null;
  };
  tocValidation: TocValidationResult | null;
  queueStatus: {
    pending: number;
    running: number;
  };
}> {
  const indexStatus = await getIndexStats(bookId);
  const tocValidation = await validateToc(bookId);
  const queueStatus = await prisma.textbookQueueJob.count({
    where: {
      payload: { path: ["bookId"], equals: bookId },
      status: { in: ["PENDING", "RUNNING"] },
    },
  });

  return {
    indexStatus,
    tocValidation,
    queueStatus: {
      pending: queueStatus,
      running: 0,
    },
  };
}
