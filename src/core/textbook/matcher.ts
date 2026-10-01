/**
 * Smart Textbook Matcher Service
 * Multi-stage matching with confidence scoring
 */

import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export interface MatchCandidate {
  chapterId: string;
  chapterTitle: string;
  bookId: string;
  bookName: string;
  startPage: number;
  endPage: number;
  confidence: number;
  matchedBy: MatchMethod;
}

export interface MatchResult {
  success: boolean;
  lessonId?: string;
  chapter?: {
    id: string;
    title: string;
    startPage: number;
    endPage: number;
    confidence: number;
  };
  book?: {
    id: string;
    code: string;
    name: string;
    grade: string;
    subject: string;
  };
  confidence: number;
  matchedBy: MatchMethod | null;
  candidates: MatchCandidate[];
  requiresManualSelection: boolean;
}

export type MatchMethod =
  | "exact"
  | "alias"
  | "normalized"
  | "keyword"
  | "fuzzy"
  | "ai_fallback"
  | "advanced_heuristic";

interface ChapterWithBook {
  id: string;
  title: string;
  aliases: string[];
  startPage: number;
  endPage: number;
  confidence: number;
  bookId: string;
  bookCode: string;
  bookName: string;
  bookGrade: string;
  bookSubject: string;
}

/**
 * Normalize Vietnamese text for matching
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\sàáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Extract keywords from text
 */
function extractKeywords(text: string): string[] {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/);

  // Filter out common Vietnamese words
  const stopWords = new Set([
    "và", "của", "trong", "là", "có", "được", "với", "cho", "để", "từ",
    "về", "phép", "toán", "bài", "học", "chương", "ôn", "tập"
  ]);

  return words.filter(w => w.length > 2 && !stopWords.has(w));
}

/**
 * Calculate keyword similarity score
 */
function keywordSimilarity(text1: string, text2: string): number {
  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);

  if (keywords1.length === 0 || keywords2.length === 0) return 0;

  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  const intersection = [...set1].filter(x => set2.has(x)).length;
  const union = new Set([...set1, ...set2]).size;

  return union > 0 ? intersection / union : 0;
}

/**
 * Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

/**
 * Calculate fuzzy similarity (0-1)
 */
function fuzzySimilarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * Get all chapters for matching across textbooks
 */
async function getAllChapters(grade?: string, subject?: string): Promise<ChapterWithBook[]> {
  const textbooks = await prisma.textbookBook.findMany({
    where: {
      isActive: true,
      tocStatus: "COMPLETED",
      ...(grade && { grade }),
      ...(subject && { subject }),
    },
    select: {
      id: true,
      code: true,
      name: true,
      grade: true,
      subject: true,
      chapters: {
        where: { isActive: true },
        select: {
          id: true,
          title: true,
          aliases: true,
          startPage: true,
          endPage: true,
          confidence: true,
        },
      },
    },
  });

  const chapters: ChapterWithBook[] = [];
  for (const book of textbooks) {
    for (const chapter of book.chapters) {
      chapters.push({
        id: chapter.id,
        title: chapter.title || "",
        aliases: chapter.aliases || [],
        startPage: chapter.startPage ?? 1,
        endPage: chapter.endPage ?? 1,
        confidence: chapter.confidence ?? 0,
        bookId: book.id,
        bookCode: book.code,
        bookName: book.name,
        bookGrade: book.grade || "",
        bookSubject: book.subject || "",
      });
    }
  }

  return chapters;
}

/**
 * Stage 1: Exact match
 */
function stage1ExactMatch(lessonTitle: string, chapters: ChapterWithBook[]): MatchCandidate | null {
  const normalized = normalizeText(lessonTitle);

  const match = chapters.find(c => normalizeText(c.title) === normalized);
  if (match) {
    return {
      chapterId: match.id,
      chapterTitle: match.title,
      bookId: match.bookId,
      bookName: match.bookName,
      startPage: match.startPage,
      endPage: match.endPage,
      confidence: 1.0,
      matchedBy: "exact",
    };
  }

  return null;
}

/**
 * Stage 2: Alias match
 */
function stage2AliasMatch(lessonTitle: string, chapters: ChapterWithBook[]): MatchCandidate | null {
  const normalized = normalizeText(lessonTitle);

  for (const chapter of chapters) {
    for (const alias of chapter.aliases) {
      if (normalizeText(alias) === normalized) {
        return {
          chapterId: chapter.id,
          chapterTitle: chapter.title,
          bookId: chapter.bookId,
          bookName: chapter.bookName,
          startPage: chapter.startPage,
          endPage: chapter.endPage,
          confidence: 0.95,
          matchedBy: "alias",
        };
      }
    }
  }

  return null;
}

/**
 * Stage 3: Normalized match (numbers in different formats)
 */
function stage3NormalizedMatch(lessonTitle: string, chapters: ChapterWithBook[]): MatchCandidate | null {
  const normalized = normalizeText(lessonTitle);

  // Convert numbers to common format
  const numberMap: Record<string, string> = {
    "1": "một", "2": "hai", "3": "ba", "4": "bốn", "5": "năm",
    "6": "sáu", "7": "bảy", "8": "tám", "9": "chín", "10": "mười",
    "i": "một", "ii": "hai", "iii": "ba", "iv": "bốn", "v": "năm",
  };

  let converted = normalized;
  for (const [num, word] of Object.entries(numberMap)) {
    converted = converted.replace(new RegExp(`\\b${num}\\b`, "g"), word);
    converted = converted.replace(new RegExp(`\\b${word}\\b`, "g"), num);
  }

  if (converted !== normalized) {
    const match = chapters.find(c => normalizeText(c.title).includes(converted) || converted.includes(normalizeText(c.title)));
    if (match) {
      return {
        chapterId: match.id,
        chapterTitle: match.title,
        bookId: match.bookId,
        bookName: match.bookName,
        startPage: match.startPage,
        endPage: match.endPage,
        confidence: 0.9,
        matchedBy: "normalized",
      };
    }
  }

  return null;
}

/**
 * Stage 4: Keyword similarity match
 */
function stage4KeywordMatch(lessonTitle: string, chapters: ChapterWithBook[], threshold = 0.5): MatchCandidate | null {
  const keywords = extractKeywords(lessonTitle);

  if (keywords.length === 0) return null;

  let bestMatch: MatchCandidate | null = null;
  let bestScore = threshold;

  for (const chapter of chapters) {
    const score = keywordSimilarity(lessonTitle, chapter.title);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        bookId: chapter.bookId,
        bookName: chapter.bookName,
        startPage: chapter.startPage,
        endPage: chapter.endPage,
        confidence: score,
        matchedBy: "keyword",
      };
    }
  }

  return bestMatch;
}

/**
 * Stage 5: Fuzzy search
 */
function stage5FuzzyMatch(lessonTitle: string, chapters: ChapterWithBook[], threshold = 0.6): MatchCandidate | null {
  const normalized = normalizeText(lessonTitle);

  let bestMatch: MatchCandidate | null = null;
  let bestScore = threshold;

  for (const chapter of chapters) {
    const chapterNormalized = normalizeText(chapter.title);

    // Check if one contains the other
    let score = 0;
    if (chapterNormalized.includes(normalized)) {
      score = normalized.length / chapterNormalized.length;
    } else if (normalized.includes(chapterNormalized)) {
      score = chapterNormalized.length / normalized.length;
    } else {
      score = fuzzySimilarity(normalized, chapterNormalized);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        bookId: chapter.bookId,
        bookName: chapter.bookName,
        startPage: chapter.startPage,
        endPage: chapter.endPage,
        confidence: score * 0.8,
        matchedBy: "fuzzy",
      };
    }
  }

  return bestMatch;
}

/**
 * Stage 6: Advanced heuristic fallback using multiple strategies
 * This provides AI-like matching without requiring external API calls
 */
async function stage6AIFallback(
  lessonTitle: string,
  chapters: ChapterWithBook[],
  grade?: string,
  subject?: string
): Promise<MatchCandidate[]> {
  const candidates: MatchCandidate[] = [];
  const normalizedLesson = normalizeText(lessonTitle);
  const lessonWords = normalizedLesson.split(/\s+/).filter(w => w.length > 1);

  // Vietnamese number word mapping
  const numberWords: Record<string, number> = {
    "một": 1, "mốt": 1, "hai": 2, "ba": 3, "bốn": 4, "tư": 4,
    "năm": 5, "sáu": 6, "bảy": 7, "tám": 8, "chín": 9, "mười": 10,
    "mười một": 11, "mười hai": 12, "mười ba": 13, "mười bốn": 14,
    "mười lăm": 15, "chương": 0, "bài": 0, "phần": 0
  };

  // Extract lesson number from title
  const extractLessonNumber = (text: string): number | null => {
    const numPattern = /(\d+)/g;
    const matches = text.match(numPattern);
    if (matches) return parseInt(matches[0], 10);

    // Check Vietnamese number words
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const twoWord = words.slice(i, i + 2).join(" ");
      if (numberWords[twoWord]) return numberWords[twoWord];
      if (numberWords[words[i]]) return numberWords[words[i]];
    }
    return null;
  };

  const lessonNumber = extractLessonNumber(normalizedLesson);

  for (const chapter of chapters) {
    const normalizedChapter = normalizeText(chapter.title);
    const chapterNumber = extractLessonNumber(normalizedChapter);

    let score = 0;
    const reasons: string[] = [];

    // Strategy 1: Same lesson number
    if (lessonNumber && chapterNumber && lessonNumber === chapterNumber) {
      score += 0.8;
      reasons.push("cùng số bài");
    }

    // Strategy 2: Word overlap
    const chapterWords = normalizedChapter.split(/\s+/).filter(w => w.length > 1);
    const commonWords = lessonWords.filter(w =>
      chapterWords.some(cw => cw.includes(w) || w.includes(cw))
    );

    if (commonWords.length > 0) {
      const wordScore = commonWords.length / Math.max(lessonWords.length, chapterWords.length);
      score += wordScore * 0.6;
      if (wordScore > 0.5) reasons.push("từ khóa trùng");
    }

    // Strategy 3: Sequence position (nearby lessons often referenced together)
    if (lessonNumber && chapterNumber) {
      const distance = Math.abs(lessonNumber - chapterNumber);
      if (distance === 1) {
        score += 0.3;
        reasons.push("bài liền kề");
      } else if (distance === 2) {
        score += 0.15;
        reasons.push("gần bài");
      }
    }

    // Strategy 4: Substring match
    if (normalizedLesson.includes(normalizedChapter) || normalizedChapter.includes(normalizedLesson)) {
      score += 0.4;
      reasons.push("chứa nhau");
    }

    if (score >= 0.2) {
      candidates.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        bookId: chapter.bookId,
        bookName: chapter.bookName,
        startPage: chapter.startPage,
        endPage: chapter.endPage,
        confidence: Math.min(score, 0.7),
        matchedBy: "advanced_heuristic",
      });
    }
  }

  // Sort by confidence and return top candidates
  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

/**
 * Multi-stage smart matching
 */
export async function smartMatch(
  lessonTitle: string,
  options: {
    grade?: string;
    subject?: string;
    bookId?: string;
    requireAllStages?: boolean;
  } = {}
): Promise<MatchResult> {
  const { grade, subject, bookId, requireAllStages = false } = options;
  const startTime = Date.now();

  // Get chapters
  let chapters = await getAllChapters(grade, subject);

  // Filter by book if specified
  if (bookId) {
    chapters = chapters.filter(c => c.bookId === bookId);
  }

  if (chapters.length === 0) {
    return {
      success: false,
      confidence: 0,
      matchedBy: null,
      candidates: [],
      requiresManualSelection: true,
    };
  }

  const candidates: MatchCandidate[] = [];
  let bestMatch: MatchCandidate | null = null;

  // Stage 1: Exact match
  bestMatch = stage1ExactMatch(lessonTitle, chapters);
  if (bestMatch) {
    return {
      success: true,
      lessonId: bestMatch.chapterId,
      chapter: {
        id: bestMatch.chapterId,
        title: bestMatch.chapterTitle,
        startPage: bestMatch.startPage,
        endPage: bestMatch.endPage,
        confidence: bestMatch.confidence,
      },
      book: chapters.find(c => c.id === bestMatch!.chapterId) ? {
        id: chapters.find(c => c.id === bestMatch!.chapterId)!.bookId,
        code: chapters.find(c => c.id === bestMatch!.chapterId)!.bookCode,
        name: chapters.find(c => c.id === bestMatch!.chapterId)!.bookName,
        grade: chapters.find(c => c.id === bestMatch!.chapterId)!.bookGrade,
        subject: chapters.find(c => c.id === bestMatch!.chapterId)!.bookSubject,
      } : undefined,
      confidence: bestMatch.confidence,
      matchedBy: bestMatch.matchedBy,
      candidates: [bestMatch],
      requiresManualSelection: false,
    };
  }

  // Stage 2: Alias match
  bestMatch = stage2AliasMatch(lessonTitle, chapters);
  if (bestMatch) {
    candidates.push(bestMatch);
    if (!requireAllStages) {
      return createMatchResult(bestMatch, chapters, Date.now() - startTime < 100);
    }
  }

  // Stage 3: Normalized match
  bestMatch = stage3NormalizedMatch(lessonTitle, chapters);
  if (bestMatch) {
    candidates.push(bestMatch);
    if (!requireAllStages) {
      return createMatchResult(bestMatch, chapters, Date.now() - startTime < 100);
    }
  }

  // Stage 4: Keyword similarity
  bestMatch = stage4KeywordMatch(lessonTitle, chapters, 0.4);
  if (bestMatch) {
    candidates.push(bestMatch);
    if (!requireAllStages && bestMatch.confidence >= 0.7) {
      return createMatchResult(bestMatch, chapters, Date.now() - startTime < 100);
    }
  }

  // Stage 5: Fuzzy search
  bestMatch = stage5FuzzyMatch(lessonTitle, chapters, 0.5);
  if (bestMatch) {
    candidates.push(bestMatch);
  }

  // If we have a good enough match, return it
  if (bestMatch && bestMatch.confidence >= 0.5) {
    return createMatchResult(bestMatch, chapters, false);
  }

  // Stage 6: AI fallback for remaining candidates
  const aiCandidates = await stage6AIFallback(lessonTitle, chapters, grade, subject);
  candidates.push(...aiCandidates);

  // Sort all candidates by confidence
  candidates.sort((a, b) => b.confidence - a.confidence);
  const uniqueCandidates = deduplicateCandidates(candidates);

  // Return best match or candidates for manual selection
  if (uniqueCandidates.length > 0) {
    const best = uniqueCandidates[0];
    return createMatchResult(best, chapters, false, uniqueCandidates.slice(0, 5));
  }

  return {
    success: false,
    confidence: 0,
    matchedBy: null,
    candidates: [],
    requiresManualSelection: true,
  };
}

function createMatchResult(
  candidate: MatchCandidate,
  chapters: ChapterWithBook[],
  isFast: boolean,
  allCandidates: MatchCandidate[] = []
): MatchResult {
  const chapter = chapters.find(c => c.id === candidate.chapterId);

  return {
    success: true,
    lessonId: candidate.chapterId,
    chapter: {
      id: candidate.chapterId,
      title: candidate.chapterTitle,
      startPage: candidate.startPage,
      endPage: candidate.endPage,
      confidence: candidate.confidence,
    },
    book: chapter ? {
      id: chapter.bookId,
      code: chapter.bookCode,
      name: chapter.bookName,
      grade: chapter.bookGrade,
      subject: chapter.bookSubject,
    } : undefined,
    confidence: candidate.confidence,
    matchedBy: candidate.matchedBy,
    candidates: allCandidates.length > 0 ? allCandidates : [candidate],
    requiresManualSelection: candidate.confidence < 0.7 || !isFast,
  };
}

function deduplicateCandidates(candidates: MatchCandidate[]): MatchCandidate[] {
  const seen = new Map<string, MatchCandidate>();

  for (const candidate of candidates) {
    const key = `${candidate.bookId}:${candidate.chapterId}`;
    const existing = seen.get(key);

    if (!existing || candidate.confidence > existing.confidence) {
      seen.set(key, candidate);
    }
  }

  return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get available textbooks for matching
 */
export async function getAvailableTextbooks(grade?: string, subject?: string) {
  return prisma.textbookBook.findMany({
    where: {
      isActive: true,
      tocStatus: "COMPLETED",
      ...(grade && { grade }),
      ...(subject && { subject }),
    },
    select: {
      id: true,
      code: true,
      name: true,
      grade: true,
      subject: true,
      pageCount: true,
      _count: { select: { chapters: true } },
    },
    orderBy: { name: "asc" },
  });
}

/**
 * Get chapters for manual selection
 */
export async function getTextbookChapters(bookId: string) {
  return prisma.textbookChapter.findMany({
    where: { bookId, isActive: true },
    orderBy: { startPage: "asc" },
    select: {
      id: true,
      title: true,
      aliases: true,
      startPage: true,
      endPage: true,
      confidence: true,
    },
  });
}

/**
 * Legacy function for backward compatibility
 */
export async function findTextbookContext(
  grade: string,
  subject: string,
  lessonTitle: string
): Promise<{
  book: {
    id: string;
    code: string;
    name: string;
    grade: string;
    subject: string;
  } | null;
  chapter: {
    id: string;
    title: string;
    startPage: number;
    endPage: number;
    confidence: number;
  } | null;
  method: "exact" | "alias" | "fuzzy" | null;
  requiresManualSelection: boolean;
}> {
  const result = await smartMatch(lessonTitle, { grade, subject });

  if (result.success && result.chapter && result.book) {
    return {
      book: result.book,
      chapter: result.chapter,
      method: result.matchedBy as "exact" | "alias" | "fuzzy",
      requiresManualSelection: result.requiresManualSelection,
    };
  }

  return {
    book: null,
    chapter: null,
    method: null,
    requiresManualSelection: true,
  };
}
