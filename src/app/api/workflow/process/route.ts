/**
 * Unified Workflow API - Production Phase Integration
 *
 * Complete workflow: Upload → Detect textbook → Match lesson → Load cache →
 * Extract pages → Optimize payload → BrightOne → Parse → Save to database
 *
 * POST /api/workflow/process
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";
import { smartMatch, MatchResult } from "@/core/textbook/matcher";
import { extractChapter, getTextbookContext } from "@/core/textbook/extractor";
import { optimizePayload } from "@/core/textbook/optimizer";
import { getCachedPdf } from "@/core/textbook/cache";
import { detectTextbook } from "@/lib/textbook-workflow";

interface TextbookDetectionResult {
  detected: boolean;
  bookId?: string;
  bookName?: string;
  confidence: number;
}
import { parseDocument, UnifiedDocumentAdapter } from "@/core/document-adapters/UnifiedDocumentAdapter";
import { TemplateRepository } from "@/lib/repositories/TemplateRepository";
import { getBrightOneErrorMessage } from "@/lib/file-validator";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { lessonPlanId, autoMatch = true, forceRefresh = false } = body;

    if (!lessonPlanId) {
      return NextResponse.json(
        { success: false, message: "lessonPlanId là bắt buộc" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const metrics: Record<string, number> = {};

    // 1. Get lesson plan
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: lessonPlanId },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    if (lessonPlan.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    // Update status to PARSING
    await prisma.lessonPlan.update({
      where: { id: lessonPlanId },
      data: { status: "PARSING" },
    });

    let textbookResult: TextbookDetectionResult | null = null;
    let matchResult: MatchResult | null = null;
    let extractedBuffer: Buffer | null = null;
    let optimizationResult: any = null;
    const parseResult: any = null;

    try {
      // 2. Load the file - use path from database directly (no public prefix)
      const fileLoadStart = Date.now();
      // eslint-disable-next-line turbopack/no-turbopack-imports
      const filePath = join(/*turbopackIgnore: true*/ process.cwd(), lessonPlan.filePath);
      extractedBuffer = await readFile(filePath);
      metrics.fileLoadTime = Date.now() - fileLoadStart;
      console.log(`[Workflow] Loaded file in ${metrics.fileLoadTime}ms`);

      // 3. Detect textbook (if not already associated)
      const detectStart = Date.now();
      if (!lessonPlan.textbookBookId && autoMatch) {
        textbookResult = await detectTextbook(extractedBuffer, lessonPlan.originalFilename);
        metrics.detectionTime = Date.now() - detectStart;
        console.log(`[Workflow] Textbook detection in ${metrics.detectionTime}ms:`, textbookResult);

        if (textbookResult.detected && textbookResult.bookId) {
          // Update lesson plan with textbook info
          await prisma.lessonPlan.update({
            where: { id: lessonPlanId },
            data: {
              textbookBookId: textbookResult.bookId,
            },
          });
        }
      } else if (lessonPlan.textbookBookId) {
        textbookResult = {
          detected: true,
          bookId: lessonPlan.textbookBookId,
          bookName: "",
          confidence: 1.0,
        };
      }
      metrics.detectionTime = Date.now() - detectStart;

      // 4. Match with textbook chapter
      const matchStart = Date.now();
      if (textbookResult?.detected && textbookResult.bookId) {
        const lessonTitle = lessonPlan.textbookLessonTitle || lessonPlan.title;
        matchResult = await smartMatch(lessonTitle, {
          bookId: textbookResult.bookId,
          requireAllStages: false,
        });

        if (matchResult.success && matchResult.chapter) {
          console.log(`[Workflow] Matched chapter:`, matchResult.chapter.title, matchResult.matchedBy);
        }
      }
      metrics.matchingTime = Date.now() - matchStart;

      // 5. Extract pages from textbook (if matched)
      let extractionResult: any = null;
      const extractStart = Date.now();

      if (matchResult?.success && matchResult.chapter) {
        // Check cache first
        const chapter = matchResult.chapter;
        const cacheResult = await getCachedPdf(textbookResult!.bookId!, chapter.id);

        if (cacheResult.found && cacheResult.buffer && !forceRefresh) {
          extractedBuffer = cacheResult.buffer;
          extractionResult = { fromCache: true, cacheHit: true };
          console.log(`[Workflow] Using cached extraction`);
        } else {
          // Extract from PDF
          const result = await extractChapter(chapter.id);
          if (result.success && result.buffer) {
            extractedBuffer = result.buffer;
            extractionResult = {
              fromCache: false,
              cacheHit: false,
              extractionTime: result.extractionTime,
              pageCount: result.pageCount,
            };
          }
        }
      }
      metrics.extractionTime = Date.now() - extractStart;

      // 6. Optimize payload
      const optimizeStart = Date.now();
      if (extractedBuffer) {
        const textContent = extractedBuffer.toString("utf-8");
        optimizationResult = optimizePayload(textContent, {
          deduplicate: true,
          compressWhitespace: true,
          removeHeadersAndFooters: true,
        });
        console.log(`[Workflow] Optimization: ${optimizationResult.savings.toFixed(1)}% savings`);
      }
      metrics.optimizationTime = Date.now() - optimizeStart;

      // 7. Parse document using unified adapter (automatically selects correct adapter)
      const parseStart = Date.now();
      const parseResult = await parseDocument(
        extractedBuffer || Buffer.from(lessonPlan.title),
        lessonPlan.originalFilename,
        lessonPlan.mimeType
      );
      metrics.parseTime = Date.now() - parseStart;

      console.log(`[Workflow] Document parse: ${parseResult.success ? 'success' : 'failed'} in ${metrics.parseTime}ms`);

      // Handle parse failure - return its error instead of generic error
      if (!parseResult.success) {
        const parseError = parseResult.error;
        const userMessage = getBrightOneErrorMessage(parseError);

        // Update status to FAILED
        await prisma.lessonPlan.update({
          where: { id: lessonPlanId },
          data: { status: "FAILED" },
        });

        // Create history entry with error
        await prisma.reviewHistory.create({
          data: {
            lessonPlanId,
            actionType: "FAILED",
            actionData: {
              error: parseError,
              errorMessage: userMessage,
              metrics,
            },
            performedBy: session.user.id,
          },
        });

        return NextResponse.json(
          {
            success: false,
            message: userMessage,
            error: parseError,
            errorCode: "OCR_FAILED",
          },
          { status: 422 } // Unprocessable Entity - validation failed on external service
        );
      }

      // 8. Save sections to database
      const saveStart = Date.now();

      // Delete existing sections
      await prisma.lessonPlanSection.deleteMany({
        where: { lessonPlanId },
      });

      // Create new sections from parsed content
      if (parseResult.success && parseResult.document) {
        const doc = parseResult.document;

        // Create sections from document sections
        if (doc.sections && doc.sections.length > 0) {
          for (let i = 0; i < doc.sections.length; i++) {
            const section = doc.sections[i];
            // Extract content from activities and paragraphs
            const sectionContent = section.activities?.map(a =>
              a.paragraphs?.map(p => p.content).join(" ") || a.title
            ).join("\n\n") || "";

            await prisma.lessonPlanSection.create({
              data: {
                id: crypto.randomUUID(),
                lessonPlanId,
                versionNumber: lessonPlan.currentVersion,
                sectionType: section.type || `SECTION_${i}`,
                sectionTitle: section.title || section.type || `Section ${i + 1}`,
                rawContent: sectionContent || lessonPlan.title,
                sectionOrder: section.order ?? i,
                contentType: "TEXT",
                wordCount: sectionContent.split(/\s+/).length,
                charCount: sectionContent.length,
              },
            });
          }
        } else {
          // Fallback: create single section with full content
          await prisma.lessonPlanSection.create({
            data: {
              id: crypto.randomUUID(),
              lessonPlanId,
              versionNumber: lessonPlan.currentVersion,
              sectionType: "MAIN",
              sectionTitle: "Nội dung chính",
              rawContent: doc.metadata?.wordCount ? `Word count: ${doc.metadata.wordCount}` : lessonPlan.title,
              sectionOrder: 0,
              contentType: "TEXT",
              wordCount: 1,
              charCount: lessonPlan.title.length,
            },
          });
        }
      } else {
        // BrightOne failed - create placeholder section
        await prisma.lessonPlanSection.create({
          data: {
            id: crypto.randomUUID(),
            lessonPlanId,
            versionNumber: lessonPlan.currentVersion,
            sectionType: "MAIN",
            sectionTitle: "Nội dung chính",
            rawContent: lessonPlan.title,
            sectionOrder: 0,
            contentType: "TEXT",
            wordCount: lessonPlan.title.split(/\s+/).length,
            charCount: lessonPlan.title.length,
          },
        });
      }

      metrics.saveTime = Date.now() - saveStart;

      // 10. Update lesson plan status
      await prisma.lessonPlan.update({
        where: { id: lessonPlanId },
        data: { status: "PARSED" },
      });

      // 11. Create history entry
      await prisma.reviewHistory.create({
        data: {
          lessonPlanId,
          actionType: "PARSED",
          actionData: {
            textbookBookId: textbookResult?.bookId,
            chapterId: matchResult?.chapter?.id,
            metrics,
          },
          performedBy: session.user.id,
        },
      });

      metrics.totalTime = Date.now() - startTime;

      // Log performance metrics
      console.log("[Workflow] Performance metrics:", {
        total: metrics.totalTime,
        fileLoad: metrics.fileLoadTime,
        detection: metrics.detectionTime,
        matching: metrics.matchingTime,
        extraction: metrics.extractionTime,
        optimization: metrics.optimizationTime,
        parse: metrics.parseTime,
        save: metrics.saveTime,
      });

      return NextResponse.json({
        success: true,
        message: "Xử lý giáo án hoàn tất",
        data: {
          lessonPlanId,
          status: "PARSED",
          textbook: textbookResult ? {
            bookId: textbookResult.bookId,
            bookName: textbookResult.bookName,
            confidence: textbookResult.confidence,
          } : null,
          chapter: matchResult?.success ? {
            chapterId: matchResult.chapter?.id,
            chapterTitle: matchResult.chapter?.title,
            startPage: matchResult.chapter?.startPage,
            endPage: matchResult.chapter?.endPage,
            confidence: matchResult.confidence,
            matchedBy: matchResult.matchedBy,
          } : null,
          extraction: extractionResult,
          optimization: optimizationResult ? {
            originalLength: optimizationResult.originalLength,
            optimizedLength: optimizationResult.optimizedLength,
            savings: optimizationResult.savings,
          } : null,
          sectionsCount: parseResult.success ? parseResult.document?.sections?.length || 1 : 1,
          metrics: {
            totalTime: metrics.totalTime,
            fileLoadTime: metrics.fileLoadTime,
            detectionTime: metrics.detectionTime,
            matchingTime: metrics.matchingTime,
            extractionTime: metrics.extractionTime,
            optimizationTime: metrics.optimizationTime,
            parseTime: metrics.parseTime,
            saveTime: metrics.saveTime,
          },
        },
      });

    } catch (processingError) {
      // Update status to FAILED
      await prisma.lessonPlan.update({
        where: { id: lessonPlanId },
        data: { status: "FAILED" },
      });

      const errorMessage = processingError instanceof Error ? processingError.message : "Unknown error";
      console.error("[Workflow] Processing failed:", errorMessage);

      return NextResponse.json(
        {
          success: false,
          message: `Lỗi xử lý: ${errorMessage}`,
          error: errorMessage,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Workflow] Error:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi server" },
      { status: 500 }
    );
  }
}

// Import crypto for UUID generation
import crypto from "crypto";
