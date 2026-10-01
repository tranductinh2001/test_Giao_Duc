/**
 * AI Payload Optimizer
 * Removes duplicates, compresses whitespace, removes empty pages
 * Optimizes payload before sending to BrightOne API
 */

import crypto from "crypto";

export interface OptimizedPayload {
  content: string;
  originalLength: number;
  optimizedLength: number;
  savings: number;
  removedElements: string[];
  metadata: {
    deduplicated: boolean;
    whitespaceCompressed: boolean;
    emptyPagesRemoved: boolean;
    formatPreserved: boolean;
  };
}

export interface PageAnalysis {
  pageNumber: number;
  hasContent: boolean;
  isDuplicate: boolean;
  contentDensity: number;
  textContent: string;
}

/**
 * Analyze a page for optimization opportunities
 */
export function analyzePage(text: string, pageNumber: number): PageAnalysis {
  const trimmed = text.trim();
  const hasContent = trimmed.length > 0;

  // Calculate content density (non-whitespace ratio)
  const whitespace = trimmed.replace(/\S/g, "").length;
  const contentDensity = trimmed.length > 0 ? 1 - whitespace / trimmed.length : 0;

  return {
    pageNumber,
    hasContent,
    isDuplicate: false, // Will be set by deduplication
    contentDensity,
    textContent: trimmed,
  };
}

/**
 * Remove duplicate pages based on content hash
 */
export function deduplicatePages(pages: string[]): {
  uniquePages: string[];
  duplicateIndices: number[];
  removedCount: number;
} {
  const seen = new Map<string, number>();
  const uniquePages: string[] = [];
  const duplicateIndices: number[] = [];

  for (let i = 0; i < pages.length; i++) {
    const content = pages[i].trim();
    if (content.length === 0) continue; // Skip empty pages

    const hash = crypto.createHash("md5").update(content).digest("hex");

    if (seen.has(hash)) {
      duplicateIndices.push(i);
    } else {
      seen.set(hash, i);
      uniquePages.push(pages[i]);
    }
  }

  return {
    uniquePages,
    duplicateIndices,
    removedCount: duplicateIndices.length,
  };
}

/**
 * Compress whitespace while preserving structure
 */
export function compressWhitespaceText(text: string): string {
  return text
    // Remove multiple spaces
    .replace(/[ \t]+/g, " ")
    // Remove multiple newlines (keep paragraph breaks)
    .replace(/\n{3,}/g, "\n\n")
    // Remove trailing whitespace per line
    .replace(/[ \t]+$/gm, "")
    // Remove leading whitespace per line
    .replace(/^[ \t]+/gm, "")
    // Remove empty lines at start/end
    .trim();
}

/**
 * Detect and remove header/footer patterns
 */
export function removeHeadersFooters(
  text: string,
  options: {
    removePageNumbers?: boolean;
    removeHeaders?: boolean;
    removeFooters?: boolean;
  } = {}
): string {
  let result = text;

  const { removePageNumbers = true, removeHeaders = true, removeFooters = true } = options;

  if (removePageNumbers) {
    // Common page number patterns
    result = result.replace(/^\s*[-—–]*\s*(trang|page)\s*\d+\s*[-—–]*\s*$/gim, "");
    result = result.replace(/\s*[-—–]*\s*(trang|page)\s*\d+\s*[-—–]*\s*$/gim, "");
    result = result.replace(/^\s*\|\s*\d+\s*\|$/gm, "");
  }

  if (removeHeaders) {
    // Remove repeated header lines (appears at top of multiple pages)
    result = result.replace(/^(Môn:\s*.+|Tiết:\s*.+|Ngày:\s*.+)$/gim, "");
  }

  if (removeFooters) {
    // Remove copyright/footer lines
    result = result.replace(/^.*©.*\d{4}.*$/gim, "");
    result = result.replace(/^.*Nhà xuất bản.*$/gim, "");
  }

  return compressWhitespaceText(result);
}

/**
 * Optimize PDF text content for AI processing
 */
export function optimizePayload(
  content: string,
  options: {
    deduplicate?: boolean;
    compressWhitespace?: boolean;
    removeHeadersAndFooters?: boolean;
    preserveFormatting?: boolean;
  } = {}
): OptimizedPayload {
  const {
    deduplicate = true,
    compressWhitespace = true,
    removeHeadersAndFooters = true,
    preserveFormatting = true,
  } = options;

  const originalLength = content.length;
  const removedElements: string[] = [];

  let optimized = content;

  // Step 1: Remove headers and footers
  if (removeHeadersAndFooters) {
    const before = optimized.length;
    optimized = removeHeadersFooters(optimized, {
      removePageNumbers: true,
      removeHeaders: true,
      removeFooters: true,
    });
    if (optimized.length < before) {
      removedElements.push("headers_footers");
    }
  }

  // Step 2: Deduplicate pages
  if (deduplicate) {
    const pages = optimized.split(/\n\s*\n/);
    const { uniquePages, removedCount } = deduplicatePages(pages);

    if (removedCount > 0) {
      optimized = uniquePages.join("\n\n");
      removedElements.push(`${removedCount} duplicate pages`);
    }
  }

  // Step 3: Compress whitespace
  if (compressWhitespace) {
    const before = optimized.length;
    optimized = compressWhitespaceText(optimized);
    if (optimized.length < before) {
      removedElements.push("whitespace");
    }
  }

  // Calculate savings
  const optimizedLength = optimized.length;
  const savings = originalLength > 0 ? ((originalLength - optimizedLength) / originalLength) * 100 : 0;

  return {
    content: optimized,
    originalLength,
    optimizedLength,
    savings: Math.round(savings * 100) / 100,
    removedElements,
    metadata: {
      deduplicated: deduplicate && removedElements.some(e => e.includes("duplicate")),
      whitespaceCompressed: compressWhitespace && removedElements.includes("whitespace"),
      emptyPagesRemoved: removedElements.some(e => e.includes("empty")),
      formatPreserved: preserveFormatting,
    },
  };
}

/**
 * Batch optimize multiple pages
 */
export function optimizePages(
  pages: string[],
  options: {
    deduplicate?: boolean;
    compressWhitespace?: boolean;
    removeHeadersAndFooters?: boolean;
  } = {}
): {
  optimizedPages: string[];
  pageAnalysis: PageAnalysis[];
  totalSavings: number;
  removedPages: number;
} {
  const { deduplicate = true, compressWhitespace = true, removeHeadersAndFooters = true } = options;

  // First pass: analyze all pages
  const analysis = pages.map((page, i) => analyzePage(page, i + 1));

  // Filter out empty pages
  const nonEmptyPages: { page: string; index: number }[] = [];
  const emptyPageIndices: number[] = [];

  pages.forEach((page, i) => {
    const trimmed = page.trim();
    if (trimmed.length === 0) {
      emptyPageIndices.push(i);
    } else {
      nonEmptyPages.push({ page, index: i });
    }
  });

  let optimizedPages = nonEmptyPages.map(p => p.page);

  // Apply optimizations
  if (deduplicate) {
    const { uniquePages, removedCount } = deduplicatePages(optimizedPages);
    optimizedPages = uniquePages;
    if (removedCount > 0) {
      analysis.forEach((a, i) => {
        if (i >= uniquePages.length) {
          a.isDuplicate = true;
        }
      });
    }
  }

  if (compressWhitespace || removeHeadersAndFooters) {
    optimizedPages = optimizedPages.map(page => {
      let optimized = page;
      if (removeHeadersAndFooters) {
        optimized = removeHeadersFooters(optimized);
      }
      if (compressWhitespace) {
        optimized = compressWhitespaceText(optimized);
      }
      return optimized;
    });
  }

  // Calculate totals
  const totalOriginal = pages.reduce((sum, p) => sum + p.length, 0);
  const totalOptimized = optimizedPages.reduce((sum, p) => sum + p.length, 0);
  const totalSavings = totalOriginal > 0 ? ((totalOriginal - totalOptimized) / totalOriginal) * 100 : 0;

  return {
    optimizedPages,
    pageAnalysis: analysis,
    totalSavings: Math.round(totalSavings * 100) / 100,
    removedPages: emptyPageIndices.length + (pages.length - optimizedPages.length),
  };
}

/**
 * Estimate token count (rough estimate for cost calculation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for Vietnamese text
  return Math.ceil(text.length / 4);
}

/**
 * Calculate cost savings from optimization
 */
export function calculateCostSavings(
  originalTokens: number,
  optimizedTokens: number,
  costPer1MTokens: number = 0.0
): {
  originalCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercent: number;
} {
  const originalCost = (originalTokens / 1_000_000) * costPer1MTokens;
  const optimizedCost = (optimizedTokens / 1_000_000) * costPer1MTokens;
  const savings = originalCost - optimizedCost;
  const savingsPercent = originalCost > 0 ? (savings / originalCost) * 100 : 0;

  return {
    originalCost: Math.round(originalCost * 10000) / 10000,
    optimizedCost: Math.round(optimizedCost * 10000) / 10000,
    savings: Math.round(savings * 10000) / 10000,
    savingsPercent: Math.round(savingsPercent * 100) / 100,
  };
}
