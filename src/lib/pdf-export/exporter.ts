// PDF Annotated Exporter using pdf-lib & @pdf-lib/fontkit
// Supports full Vietnamese diacritics, intonations, tone marks, stamps highlights, badges, callout notes, and executive CV 5512 report page

import { PDFDocument, rgb, StandardFonts, RGB, PDFFont } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { DocumentIR } from '@/types/document';
import { Review, ReviewSeverity } from '@/types/review';
import { Annotation } from '@/types/annotation';

export interface ExportOptions {
  includeCoverReport?: boolean;
  includeMarginBadges?: boolean;
  includeCalloutBubbles?: boolean;
}

function toAsciiText(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
    .trim();
}

function wrapText(text: string, maxCharsPerLine: number = 70): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function loadFontBuffer(filename: string): Promise<ArrayBuffer | null> {
  // 1. Try Browser Fetch
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch(`/fonts/${filename}`);
      if (res.ok) {
        return await res.arrayBuffer();
      }
    } catch {
      // ignore browser fetch error
    }
    return null;
  }

  // 2. Try Node.js File System
  try {
    const nodeRequire = eval('require');
    const fs = nodeRequire('fs');
    const path = nodeRequire('path');
    
    // Project public/fonts folder
    const localPath = path.join(process.cwd(), 'public', 'fonts', filename);
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath).buffer;
    }

    // Windows standard Fonts folder
    const winPath = path.join('C:\\Windows\\Fonts', filename);
    if (fs.existsSync(winPath)) {
      return fs.readFileSync(winPath).buffer;
    }
  } catch {
    // ignore node fs error
  }

  return null;
}

export async function exportAnnotatedPDF(
  pdfBuffer: ArrayBuffer,
  document: DocumentIR,
  reviews: Review[],
  annotations: Annotation[],
  options: ExportOptions = {}
): Promise<Uint8Array> {
  const {
    includeCoverReport = true,
    includeMarginBadges = true,
    includeCalloutBubbles = true,
  } = options;

  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  pdfDoc.registerFontkit(fontkit);

  let fontRegular: PDFFont;
  let fontBold: PDFFont;
  let hasVietnameseFont = false;

  try {
    const regularBuf = await loadFontBuffer('arial.ttf');
    const boldBuf = await loadFontBuffer('arialbd.ttf');

    if (regularBuf && boldBuf) {
      fontRegular = await pdfDoc.embedFont(regularBuf);
      fontBold = await pdfDoc.embedFont(boldBuf);
      hasVietnameseFont = true;
    } else {
      throw new Error('Font files not found');
    }
  } catch {
    // Graceful fallback to Standard Helvetica
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    hasVietnameseFont = false;
  }

  // Helper text formatter: keeps Vietnamese diacritics & intonation if font supports it, else ASCII fallback
  const fmt = (str: string | undefined | null): string => {
    if (!str) return '';
    return hasVietnameseFont ? str.trim() : toAsciiText(str);
  };

  const totalPages = pdfDoc.getPageCount();

  // Create lookup map from reviewId to index (1-based #1, #2, ...)
  const reviewIndexMap = new Map<string, number>();
  reviews.forEach((r, idx) => {
    reviewIndexMap.set(r.reviewId, idx + 1);
  });

  // Calculate assessment score
  let currentScore = 100;
  let criticalCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const r of reviews) {
    if (r.severity === 'CRITICAL') {
      currentScore -= 15;
      criticalCount++;
    } else if (r.severity === 'ERROR') {
      currentScore -= 10;
      errorCount++;
    } else if (r.severity === 'WARNING') {
      currentScore -= 5;
      warningCount++;
    } else {
      infoCount++;
    }
  }
  const finalScore = Math.max(currentScore, 30);
  const gradeLabel =
    finalScore >= 85
      ? fmt('XUẤT SẮC (CHUẨN CV 5512)')
      : finalScore >= 70
      ? fmt('ĐẠT YÊU CẦU SƯ PHẠM')
      : fmt('CẦN ĐIỀU CHỈNH NHIỀU');

  // 1. Process each page to draw bounding box highlights, pins, and non-overlapping speech bubbles
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageNum = pageIdx + 1; // 1-based
    const page = pdfDoc.getPage(pageIdx);
    const originalWidth = page.getWidth();
    const pageHeight = page.getHeight();

    const pageAnnotations = annotations.filter((a) => a.page === pageNum);

    // If callout bubbles are enabled, expand the page width to create a dedicated comment column
    const calloutMarginWidth = 220;
    const bubbleWidth = 205;
    const bubbleX = originalWidth + 8;

    if (includeCalloutBubbles) {
      page.setSize(originalWidth + calloutMarginWidth, pageHeight);

      // Draw light subtle margin sidebar background
      page.drawRectangle({
        x: originalWidth,
        y: 0,
        width: calloutMarginWidth,
        height: pageHeight,
        color: rgb(0.975, 0.98, 0.995),
      });

      // Divider line between document and margin
      page.drawLine({
        start: { x: originalWidth, y: 0 },
        end: { x: originalWidth, y: pageHeight },
        thickness: 1,
        color: rgb(0.85, 0.88, 0.94),
      });

      // Sidebar Header Bar
      page.drawRectangle({
        x: originalWidth,
        y: pageHeight - 26,
        width: calloutMarginWidth,
        height: 26,
        color: rgb(0.12, 0.22, 0.44),
      });

      page.drawText(fmt('HỘP THOẠI NHẬN XÉT (CV 5512)'), {
        x: originalWidth + 12,
        y: pageHeight - 17,
        size: 8,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText(fmt(`Trang ${pageNum}/${totalPages}`), {
        x: originalWidth + calloutMarginWidth - 55,
        y: pageHeight - 17,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.85, 0.9, 1),
      });
    }

    // A. Draw Highlights and Pin Badges on the Document
    let lastBadgeY = 9999;
    for (let annIdx = 0; annIdx < pageAnnotations.length; annIdx++) {
      const ann = pageAnnotations[annIdx];
      const review = reviews.find((r) => r.reviewId === ann.reviewId);
      const reviewNum = review ? reviewIndexMap.get(review.reviewId) || 1 : 1;
      const severity = review?.severity || 'INFO';

      // Colors by severity
      let fillColor: RGB = rgb(0.89, 0.94, 1.0); // Soft Blue
      let borderColor: RGB = rgb(0.23, 0.51, 0.96); // Blue
      let badgeBg: RGB = rgb(0.14, 0.38, 0.92);

      if (severity === 'CRITICAL' || severity === 'ERROR') {
        fillColor = rgb(1.0, 0.88, 0.88); // Soft Red
        borderColor = rgb(0.93, 0.27, 0.27);
        badgeBg = rgb(0.86, 0.15, 0.15);
      } else if (severity === 'WARNING') {
        fillColor = rgb(1.0, 0.94, 0.82); // Soft Orange
        borderColor = rgb(0.96, 0.62, 0.04);
        badgeBg = rgb(0.85, 0.45, 0.0);
      }

      // ann.bbox is top-down (distance from top). PDF coordinates have Y starting from bottom.
      const pdfY = Math.max(10, pageHeight - (ann.bbox.y + ann.bbox.height));
      const pdfX = Math.max(10, Math.min(ann.bbox.x, originalWidth - 60));
      const pdfW = Math.max(30, Math.min(ann.bbox.width, originalWidth - pdfX - 10));
      const pdfH = Math.max(12, Math.min(ann.bbox.height, pageHeight - 20));

      // Draw Highlight Box directly on the text
      page.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: pdfW,
        height: pdfH,
        color: fillColor,
        opacity: 0.38,
        borderColor: borderColor,
        borderWidth: 1.5,
      });

      // Draw Badge Pin [#1] on highlight edge with collision avoidance
      if (includeMarginBadges) {
        const badgeWidth = 26;
        const badgeHeight = 14;
        let badgeX = Math.min(originalWidth - badgeWidth - 4, pdfX + pdfW - 14);
        let badgeY = Math.min(pageHeight - badgeHeight - 4, pdfY + pdfH - 7);

        // Avoid overlapping badges if two highlights are close vertically
        if (Math.abs(badgeY - lastBadgeY) < 16) {
          badgeY = Math.max(10, lastBadgeY - 16);
        }
        lastBadgeY = badgeY;

        page.drawRectangle({
          x: badgeX,
          y: badgeY,
          width: badgeWidth,
          height: badgeHeight,
          color: badgeBg,
          borderColor: rgb(1, 1, 1),
          borderWidth: 1,
        });

        page.drawText(`#${reviewNum}`, {
          x: badgeX + 4,
          y: badgeY + 3.5,
          size: 7.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
      }
    }

    // B. Draw Speech Bubbles with Intelligent Anti-Collision Layout
    if (includeCalloutBubbles) {
      interface BubblePlan {
        ann: Annotation;
        review: Review;
        reviewNum: number;
        severity: ReviewSeverity;
        badgeBg: RGB;
        borderColor: RGB;
        targetX: number;
        targetY: number;
        height: number;
        placedY: number;
        headerText: string;
        quoteLines: string[];
        msgLines: string[];
        errorLines: string[];
        sugLines: string[];
      }

      const bubblePlans: BubblePlan[] = [];

      for (const ann of pageAnnotations) {
        const review = reviews.find((r) => r.reviewId === ann.reviewId);
        if (!review) continue;

        const reviewNum = reviewIndexMap.get(review.reviewId) || 1;
        const severity = review.severity || 'INFO';

        let borderColor: RGB = rgb(0.23, 0.51, 0.96);
        let badgeBg: RGB = rgb(0.14, 0.38, 0.92);
        let headerCategory = fmt('GỢI Ý CẢI TIẾN');

        if (severity === 'CRITICAL' || severity === 'ERROR') {
          borderColor = rgb(0.93, 0.27, 0.27);
          badgeBg = rgb(0.86, 0.15, 0.15);
          headerCategory = fmt('LỖI SƯ PHẠM (5512)');
        } else if (severity === 'WARNING') {
          borderColor = rgb(0.96, 0.62, 0.04);
          badgeBg = rgb(0.85, 0.45, 0.0);
          headerCategory = fmt('CẢNH BÁO TIẾN TRÌNH');
        }

        const cleanMsg = fmt(review.message);
        const cleanQuote = review.quote ? fmt(review.quote) : '';
        const cleanError = review.errorDetail ? fmt(review.errorDetail) : '';
        const cleanSug = review.suggestion ? fmt(review.suggestion) : '';

        const quoteLines = cleanQuote ? wrapText(fmt(`Trích: "${cleanQuote}"`), 42) : [];
        const msgLines = wrapText(cleanMsg, 42);
        const errorLines = cleanError ? wrapText(fmt(`Lỗi sư phạm: ${cleanError}`), 42) : [];
        const sugLines = cleanSug ? wrapText(fmt(`Gợi ý: ${cleanSug}`), 42) : [];

        // Compact lines limit so bubble fits well
        const totalLines =
          quoteLines.slice(0, 2).length +
          msgLines.slice(0, 3).length +
          errorLines.slice(0, 2).length +
          sugLines.slice(0, 3).length;

        const calculatedHeight = Math.max(38, 16 + totalLines * 8.5 + 8);

        const pdfY = Math.max(10, pageHeight - (ann.bbox.y + ann.bbox.height));
        const pdfX = Math.max(10, Math.min(ann.bbox.x, originalWidth - 60));
        const pdfW = Math.max(30, Math.min(ann.bbox.width, originalWidth - pdfX - 10));
        const pdfH = Math.max(12, Math.min(ann.bbox.height, pageHeight - 20));

        bubblePlans.push({
          ann,
          review,
          reviewNum,
          severity,
          badgeBg,
          borderColor,
          targetX: Math.min(originalWidth - 8, pdfX + pdfW),
          targetY: pdfY + pdfH / 2,
          height: calculatedHeight,
          placedY: 0,
          headerText: headerCategory,
          quoteLines: quoteLines.slice(0, 2),
          msgLines: msgLines.slice(0, 3),
          errorLines: errorLines.slice(0, 2),
          sugLines: sugLines.slice(0, 3),
        });
      }

      // Sort by targetY descending (from top of page to bottom)
      bubblePlans.sort((a, b) => b.targetY - a.targetY);

      // Top-down placement pass
      const minGap = 10;
      let topBoundary = pageHeight - 34;

      for (const b of bubblePlans) {
        let idealY = b.targetY - b.height / 2;
        b.placedY = Math.min(topBoundary - b.height, idealY);
        topBoundary = b.placedY - minGap;
      }

      // Bottom-up correction pass if lowest bubbles pushed below bottom margin (20)
      let bottomBoundary = 18;
      for (let i = bubblePlans.length - 1; i >= 0; i--) {
        const b = bubblePlans[i];
        if (b.placedY < bottomBoundary) {
          b.placedY = bottomBoundary;
        }
        bottomBoundary = b.placedY + b.height + minGap;
      }

      // Final top clamp if pushed too high
      if (bubblePlans.length > 0 && bubblePlans[0].placedY + bubblePlans[0].height > pageHeight - 32) {
        const shift = bubblePlans[0].placedY + bubblePlans[0].height - (pageHeight - 32);
        for (const b of bubblePlans) {
          b.placedY = Math.max(15, b.placedY - shift);
        }
      }

      // Render each non-overlapping speech bubble card
      for (const b of bubblePlans) {
        const bubbleCardY = b.placedY;
        const bubbleCardHeight = b.height;
        const bubbleMidY = bubbleCardY + bubbleCardHeight / 2;

        // 1. Draw connecting pointer line between text highlight and speech bubble
        page.drawCircle({
          x: b.targetX,
          y: b.targetY,
          size: 2.2,
          color: b.borderColor,
        });

        page.drawLine({
          start: { x: b.targetX, y: b.targetY },
          end: { x: bubbleX - 1, y: bubbleMidY },
          thickness: 1,
          color: b.borderColor,
          opacity: 0.75,
        });

        // 2. Speech Bubble Tail (Triangle pointing to left)
        const tailSize = 4;
        page.drawRectangle({
          x: bubbleX - 3,
          y: bubbleMidY - tailSize / 2,
          width: 4,
          height: tailSize,
          color: b.badgeBg,
        });

        // 3. Speech Bubble Outer Card
        page.drawRectangle({
          x: bubbleX,
          y: bubbleCardY,
          width: bubbleWidth,
          height: bubbleCardHeight,
          color: rgb(1, 1, 1),
          borderColor: b.borderColor,
          borderWidth: 1.2,
          opacity: 0.98,
        });

        // 4. Speech Bubble Header Bar
        page.drawRectangle({
          x: bubbleX,
          y: bubbleCardY + bubbleCardHeight - 14,
          width: bubbleWidth,
          height: 14,
          color: b.badgeBg,
        });

        page.drawText(`[#${b.reviewNum}] ${b.headerText}`, {
          x: bubbleX + 5,
          y: bubbleCardY + bubbleCardHeight - 10.5,
          size: 6.8,
          font: fontBold,
          color: rgb(1, 1, 1),
        });

        // 5. Draw Content Lines
        let currentLineY = bubbleCardY + bubbleCardHeight - 22;

        // Quote line
        for (const line of b.quoteLines) {
          page.drawText(line, {
            x: bubbleX + 5,
            y: currentLineY,
            size: 5.8,
            font: fontRegular,
            color: rgb(0.45, 0.48, 0.55),
          });
          currentLineY -= 7.8;
        }

        // Message lines
        for (const line of b.msgLines) {
          page.drawText(line, {
            x: bubbleX + 5,
            y: currentLineY,
            size: 6.5,
            font: fontBold,
            color: rgb(0.12, 0.16, 0.25),
          });
          currentLineY -= 8.2;
        }

        // Error Detail lines (Pedagogical mistake)
        for (const line of b.errorLines) {
          page.drawText(line, {
            x: bubbleX + 5,
            y: currentLineY,
            size: 5.8,
            font: fontRegular,
            color: rgb(0.75, 0.2, 0.2),
          });
          currentLineY -= 7.8;
        }

        // Suggestion lines
        for (const line of b.sugLines) {
          page.drawText(line, {
            x: bubbleX + 5,
            y: currentLineY,
            size: 6.0,
            font: fontRegular,
            color: rgb(0.08, 0.52, 0.35),
          });
          currentLineY -= 7.8;
        }
      }
    }
  }

  // 2. Insert Cover / Evaluation Summary Page at Page 1 (index 0)
  if (includeCoverReport) {
    const reportPage = pdfDoc.insertPage(0, includeCalloutBubbles ? [815, 842] : [595, 842]);
    const { width: rW, height: rH } = reportPage.getSize();

    // Top Header Banner (Indigo/Navy)
    reportPage.drawRectangle({
      x: 0,
      y: rH - 85,
      width: rW,
      height: 85,
      color: rgb(0.09, 0.18, 0.39), // Dark Blue
    });

    reportPage.drawText(fmt('HỆ THỐNG THẨM ĐỊNH KẾ HOẠCH BÀI DẠY AI (CV 5512)'), {
      x: 35,
      y: rH - 35,
      size: 15,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    reportPage.drawText(fmt('Phiếu Đánh Giá & Tổng Hợp Nhận Xét Sư Phạm Chi Tiết'), {
      x: 35,
      y: rH - 55,
      size: 10,
      font: fontRegular,
      color: rgb(0.8, 0.88, 1),
    });

    const todayStr = new Date().toLocaleDateString('vi-VN');
    reportPage.drawText(fmt(`Ngày đánh giá: ${todayStr}`), {
      x: rW - 160,
      y: rH - 55,
      size: 9,
      font: fontRegular,
      color: rgb(0.8, 0.88, 1),
    });

    // Score & Document Metadata Card
    reportPage.drawRectangle({
      x: 30,
      y: rH - 165,
      width: rW - 60,
      height: 68,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.85, 0.88, 0.93),
      borderWidth: 1,
    });

    // File name
    const cleanFilename = fmt(document.metadata.filename || 'Giao_An.pdf');
    reportPage.drawText(fmt(`Tài liệu: ${cleanFilename}`), {
      x: 45,
      y: rH - 118,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.25),
    });

    reportPage.drawText(
      fmt(`Quy mô: ${totalPages} trang  |  Hoạt động dạy học: ${document.activities.length}  |  Tổng số nhận xét: ${reviews.length}`),
      {
        x: 45,
        y: rH - 134,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.35, 0.4, 0.5),
      }
    );

    // Score Box
    reportPage.drawRectangle({
      x: rW - 190,
      y: rH - 158,
      width: 145,
      height: 54,
      color: rgb(1, 1, 1),
      borderColor:
        finalScore >= 85
          ? rgb(0.2, 0.7, 0.4)
          : finalScore >= 70
          ? rgb(0.2, 0.5, 0.9)
          : rgb(0.9, 0.3, 0.3),
      borderWidth: 1.5,
    });

    reportPage.drawText(fmt(`ĐIỂM: ${finalScore} / 100`), {
      x: rW - 175,
      y: rH - 128,
      size: 13,
      font: fontBold,
      color:
        finalScore >= 85
          ? rgb(0.1, 0.55, 0.3)
          : finalScore >= 70
          ? rgb(0.1, 0.4, 0.8)
          : rgb(0.8, 0.2, 0.2),
    });

    reportPage.drawText(gradeLabel, {
      x: rW - 180,
      y: rH - 146,
      size: 7,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.45),
    });

    // Summary Statistics Pills
    reportPage.drawText(
      fmt(`Thống kê: ${criticalCount + errorCount} lỗi | ${warningCount} cảnh báo | ${infoCount} gợi ý sư phạm`),
      {
        x: 45,
        y: rH - 152,
        size: 8.5,
        font: fontBold,
        color: rgb(0.2, 0.3, 0.45),
      }
    );

    // Table Header
    const tableTop = rH - 185;
    reportPage.drawRectangle({
      x: 30,
      y: tableTop - 20,
      width: rW - 60,
      height: 20,
      color: rgb(0.2, 0.28, 0.45),
    });

    reportPage.drawText(fmt('STT'), { x: 38, y: tableTop - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    reportPage.drawText(fmt('VỊ TRÍ'), { x: 68, y: tableTop - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    reportPage.drawText(fmt('MỨC ĐỘ'), { x: 108, y: tableTop - 14, size: 8, font: fontBold, color: rgb(1, 1, 1) });
    reportPage.drawText(fmt('NỘI DUNG GÓP Ý & ĐỀ XUẤT CẢI TIẾN THEO CV 5512'), {
      x: 175,
      y: tableTop - 14,
      size: 8,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // List reviews rows
    let currentY = tableTop - 22;
    const maxReviewsOnFirstPage = 8;
    const displayReviews = reviews.slice(0, maxReviewsOnFirstPage);

    displayReviews.forEach((rev, idx) => {
      const revNum = idx + 1;
      const annotation = annotations.find((a) => a.reviewId === rev.reviewId);
      const pageText = annotation ? fmt(`Trang ${annotation.page}`) : fmt('Toàn bài');

      const sevText =
        rev.severity === 'CRITICAL'
          ? fmt('NGHIÊM TRỌNG')
          : rev.severity === 'ERROR'
          ? fmt('LỖI')
          : rev.severity === 'WARNING'
          ? fmt('CẢNH BÁO')
          : fmt('GỢI Ý');

      const sevColor =
        rev.severity === 'CRITICAL' || rev.severity === 'ERROR'
          ? rgb(0.8, 0.15, 0.15)
          : rev.severity === 'WARNING'
          ? rgb(0.8, 0.45, 0)
          : rgb(0.15, 0.45, 0.85);

      const msgLines = wrapText(fmt(rev.message), 72);
      const quoteLines = rev.quote ? wrapText(fmt(`Trích đoạn: "${rev.quote}"`), 72) : [];
      const sugLines = rev.suggestion
        ? wrapText(fmt('Gợi ý: ' + rev.suggestion), 72)
        : [];

      const totalLines = msgLines.length + quoteLines.length + sugLines.length;
      const rowHeight = Math.max(38, totalLines * 10 + 12);

      // Zebra background
      reportPage.drawRectangle({
        x: 30,
        y: currentY - rowHeight,
        width: rW - 60,
        height: rowHeight,
        color: idx % 2 === 0 ? rgb(1, 1, 1) : rgb(0.97, 0.98, 1),
        borderColor: rgb(0.88, 0.9, 0.93),
        borderWidth: 0.5,
      });

      // STT
      reportPage.drawText(`#${revNum}`, {
        x: 40,
        y: currentY - 14,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.35),
      });

      // Page
      reportPage.drawText(pageText, {
        x: 68,
        y: currentY - 14,
        size: 8,
        font: fontRegular,
        color: rgb(0.3, 0.35, 0.45),
      });

      // Severity
      reportPage.drawText(sevText, {
        x: 108,
        y: currentY - 14,
        size: 7.5,
        font: fontBold,
        color: sevColor,
      });

      // Message lines
      let textLineY = currentY - 13;
      msgLines.forEach((line) => {
        reportPage.drawText(line, {
          x: 175,
          y: textLineY,
          size: 7.5,
          font: fontBold,
          color: rgb(0.15, 0.2, 0.3),
        });
        textLineY -= 9.5;
      });

      // Quote lines
      quoteLines.forEach((line) => {
        reportPage.drawText(line, {
          x: 175,
          y: textLineY,
          size: 6.8,
          font: fontRegular,
          color: rgb(0.3, 0.35, 0.45),
        });
        textLineY -= 8.5;
      });

      // Suggestion lines
      sugLines.forEach((line) => {
        reportPage.drawText(line, {
          x: 175,
          y: textLineY,
          size: 7,
          font: fontRegular,
          color: rgb(0.1, 0.45, 0.25),
        });
        textLineY -= 9;
      });

      currentY -= rowHeight + 2;
    });

    // Note at bottom of cover page
    reportPage.drawText(
      fmt('* Chú ý: Các trang tiếp theo của tài liệu đã được đóng dấu nhận xét (highlights & callouts) với đầy đủ dấu ngữ điệu tiếng Việt chuẩn mực.'),
      {
        x: 35,
        y: 25,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.55),
      }
    );
  }

  // Save the modified PDF
  const modifiedPdfBytes = await pdfDoc.save();
  return modifiedPdfBytes;
}

export function downloadAnnotatedPDFBlob(
  pdfBytes: Uint8Array,
  originalFilename: string
): void {
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const baseName = originalFilename.replace(/\.[^/.]+$/, '');
  a.download = `[Da-Tham-Dinh]-${baseName}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
