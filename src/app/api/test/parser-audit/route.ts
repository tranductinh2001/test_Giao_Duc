/**
 * Parser Audit API
 * GET /api/test/parser-audit?lessonPlanId=xxx
 *
 * Traces full pipeline:
 * Raw BrightOne → Document Tree → Parser Tree → Database Tree → Workspace Tree
 *
 * Outputs comparison metrics for each node
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BrightOneVisionAdapter } from "@/core/document-adapters";
import { readFile } from "fs/promises";
import path from "path";

interface TreeNode {
  id: string;
  type: 'document' | 'section' | 'subsection' | 'activity' | 'paragraph' | 'table' | 'image' | 'heading';
  title?: string;
  content?: string;
  order?: number;
  level?: number;
  children?: TreeNode[];
  metadata?: Record<string, any>;
  // Audit fields
  confidence?: number;
  ruleMatched?: string;
  aliasMatched?: string;
  aiFallback?: boolean;
  source?: string;
  originalIndex?: number;
  charCount?: number;
  wordCount?: number;
}

interface AuditResult {
  lessonPlanId: string;
  fileName: string;
  fileType: string;

  // Raw BrightOne output
  brightoneRaw: {
    rawMarkdown?: string;
    blocks?: number;
    pages?: number;
    sections?: any[];
  };

  // Document Tree (from BrightOne)
  documentTree: TreeNode;

  // Parser Tree (after SectionParser)
  parserTree: TreeNode;

  // Database Tree (from DB)
  databaseTree: TreeNode;

  // Workspace Tree (final)
  workspaceTree: TreeNode;

  // Comparison metrics
  statistics: {
    // Headings
    totalHeadings: number;
    parserHeadings: number;
    headingErrors: {
      missing: number;
      extra: number;
      wrong: number;
    };

    // Sections
    totalSections: number;
    parserSections: number;
    sectionErrors: {
      missing: number;
      extra: number;
      wrong: number;
      merged: number;
      split: number;
    };

    // Paragraphs
    totalParagraphs: number;
    parserParagraphs: number;
    paragraphErrors: {
      missing: number;
      extra: number;
      wrong: number;
    };

    // Tables
    totalTables: number;
    parserTables: number;
    tableErrors: {
      missing: number;
      extra: number;
    };

    // Images
    totalImages: number;
    parserImages: number;
    imageErrors: {
      missing: number;
      extra: number;
    };
  };

  // Per-section details
  sectionDetails: Array<{
    sectionCode: string;
    sectionName: string;
    confidence: number;
    ruleMatched: string | null;
    aliasMatched: string | null;
    aiFallback: boolean;
    source: string;
    rawContentLength: number;
    wordCount: number;
  }>;

  // Issues found
  issues: Array<{
    type: 'merge' | 'split' | 'missing' | 'extra' | 'wrong';
    location: string;
    expected: string;
    actual: string;
    severity: 'critical' | 'warning' | 'info';
  }>;

  // Accuracy scores
  accuracy: {
    heading: number;
    section: number;
    paragraph: number;
    table: number;
    image: number;
    overall: number;
  };
}

function buildTreeFromSections(sections: any[], activities: any[] = [], nodeType: 'section' | 'document' = 'section'): TreeNode {
  // Group activities by section
  const activitiesBySection = new Map<string, any[]>();
  for (const activity of activities) {
    const existing = activitiesBySection.get(activity.sectionId) || [];
    existing.push(activity);
    activitiesBySection.set(activity.sectionId, existing);
  }

  const nodes: TreeNode[] = sections.map((s, idx) => {
    const sectionActivities = activitiesBySection.get(s.id) || [];

    // Extract paragraphs from parsedContent if available
    let paragraphChildren: TreeNode[] = [];
    let activityChildren: TreeNode[] = [];

    const parsed = s.parsedContent as any;
    if (parsed) {
      // If parsedContent has paragraphs directly (expanded from activity)
      if (parsed.paragraphs && Array.isArray(parsed.paragraphs)) {
        paragraphChildren = parsed.paragraphs.map((p: any, pi: number) => ({
          id: p.id || `para-${idx}-${pi}`,
          type: 'paragraph' as const,
          content: p.content || '',
          order: p.order ?? pi,
        }));
      }

      // If parsedContent has activities (not expanded)
      if (parsed.activities && Array.isArray(parsed.activities)) {
        activityChildren = parsed.activities.map((a: any, ai: number) => ({
          id: a.id || `activity-${idx}-${ai}`,
          type: 'activity' as const,
          title: a.title,
          order: a.order ?? ai,
          children: a.paragraphs?.map((p: any, pi: number) => ({
            id: p.id || `para-${idx}-${ai}-${pi}`,
            type: 'paragraph' as const,
            content: p.content || '',
            order: p.order ?? pi,
          })) || [],
        }));
      }
    }

    // Combine: prefer paragraph children if available, otherwise use activity children
    const children = paragraphChildren.length > 0 ? paragraphChildren :
                     activityChildren.length > 0 ? activityChildren :
                     (sectionActivities.length > 0 ? sectionActivities.map((a: any, ai: number) => ({
                       id: a.id || `activity-${idx}-${ai}`,
                       type: 'activity' as const,
                       title: a.title,
                       content: a.summary || a.content || '',
                       order: a.order || ai,
                     })) : undefined);

    return {
      id: s.id || `node-${idx}`,
      type: nodeType,
      title: s.sectionTitle || s.title,
      content: s.rawContent || s.content || '',
      order: s.sectionOrder || idx,
      level: s.headingLevel,
      charCount: s.charCount || (s.rawContent?.length || 0),
      wordCount: s.wordCount || (s.rawContent?.split(/\s+/).filter(Boolean).length || 0),
      children,
    } as TreeNode;
  });

  return {
    id: 'root',
    type: 'document',
    title: 'Lesson Plan',
    children: nodes,
  };
}

function compareTrees(expected: TreeNode, actual: TreeNode): any {
  // Simplified comparison - returns differences
  const differences: string[] = [];

  function countNodes(node: TreeNode, type: string): number {
    if (node.type === type) return 1;
    return (node.children || []).reduce((sum, child) => sum + countNodes(child, type), 0);
  }

  return { differences };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lessonPlanId = searchParams.get('lessonPlanId');

    if (!lessonPlanId) {
      return NextResponse.json(
        { success: false, message: "lessonPlanId is required" },
        { status: 400 }
      );
    }

    // 1. Get lesson plan from database
    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id: lessonPlanId },
      select: {
        id: true,
        title: true,
        mimeType: true,
        filePath: true,
        sections: {
          orderBy: { sectionOrder: 'asc' },
        },
        reviewResults: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    // Get activities separately
    const activities = await prisma.lessonActivity.findMany({
      where: {
        sectionId: { in: lessonPlan?.sections.map(s => s.id) || [] },
      },
      orderBy: { order: 'asc' },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Lesson plan not found" },
        { status: 404 }
      );
    }

    // 2. Get file path for BrightOne parsing
    const filePath = lessonPlan.filePath;
    if (!filePath) {
      return NextResponse.json(
        { success: false, message: "No file attached to lesson plan" },
        { status: 400 }
      );
    }

    // 3. Parse with BrightOne
    const fullPath = filePath.startsWith('/uploads')
      ? path.join(process.cwd(), filePath)
      : filePath;

    let brightoneRaw: any = {};
    let documentTree: TreeNode = { id: 'root', type: 'document', title: 'Lesson Plan', children: [] };

    try {
      const fileBuffer = await readFile(fullPath);
      const fileName = path.basename(fullPath);
      const adapter = new BrightOneVisionAdapter();
      const result = await adapter.parse(fileBuffer, fileName);

      brightoneRaw = {
        rawMarkdown: result.document?.rawMarkdown?.substring(0, 5000),
        blocks: result.rawData?.blocks?.length,
        pages: result.rawData?.pages,
        sections: result.document?.sections?.map((s: any) => ({
          id: s.id,
          title: s.title,
          type: s.type,
          order: s.order,
          activitiesCount: s.activities?.length || 0,
        })),
      };

      // Build Document Tree from BrightOne
      documentTree = {
        id: 'root',
        type: 'document',
        title: result.document?.title || 'Lesson Plan',
        children: result.document?.sections?.map((s: any, sIdx: number) => ({
          id: s.id || `section-${sIdx}`,
          type: 'section',
          title: s.title,
          order: s.order,
          level: s.headingLevel,
          metadata: { source: 'brightone' },
          children: s.activities?.map((a: any, aIdx: number) => ({
            id: a.id || `activity-${sIdx}-${aIdx}`,
            type: 'activity',
            title: a.title,
            order: a.order,
            children: [
              ...(a.paragraphs || []).map((p: any, pIdx: number) => ({
                id: p.id || `paragraph-${sIdx}-${aIdx}-${pIdx}`,
                type: 'paragraph',
                content: p.content,
                order: p.order || pIdx,
              })),
              ...(a.tables || []).map((t: any, tIdx: number) => ({
                id: t.id || `table-${sIdx}-${aIdx}-${tIdx}`,
                type: 'table',
                title: t.title,
                order: t.order || tIdx,
              })),
              ...(a.images || []).map((i: any, iIdx: number) => ({
                id: i.id || `image-${sIdx}-${aIdx}-${iIdx}`,
                type: 'image',
                title: i.title,
                order: i.order || iIdx,
              })),
            ],
          })) || [],
        })) || [],
      };
    } catch (err: any) {
      brightoneRaw.error = err.message;
    }

    // 4. Build Parser Tree (from DB sections - after processing)
    const parserTree: TreeNode = buildTreeFromSections(lessonPlan.sections, activities);

    // 5. Database Tree (same as parser - raw from DB)
    const databaseTree: TreeNode = buildTreeFromSections(lessonPlan.sections, activities);

    // 6. Workspace Tree (final - same as DB for now)
    const workspaceTree: TreeNode = buildTreeFromSections(lessonPlan.sections, activities);

    // 7. Calculate statistics
    // Count from BrightOne (expected)
    const countByType = (node: TreeNode, type: string): number => {
      if (node.type === type) return 1;
      return (node.children || []).reduce((sum, child) => sum + countByType(child, type), 0);
    };

    const totalHeadings = countByType(documentTree, 'section');
    const totalSections = countByType(documentTree, 'section');
    const totalParagraphs = countByType(documentTree, 'paragraph');
    const totalTables = countByType(documentTree, 'table');
    const totalImages = countByType(documentTree, 'image');

    const parserHeadings = countByType(parserTree, 'section');
    const parserSections = countByType(parserTree, 'section');
    const parserParagraphs = countByType(parserTree, 'paragraph');
    const parserTables = countByType(parserTree, 'table');
    const parserImages = countByType(parserTree, 'image');

    // 8. Section details
    const sectionDetails = lessonPlan.sections.map((s: any) => ({
      sectionCode: s.sectionType || 'UNKNOWN',
      sectionName: s.sectionTitle || s.title || '',
      confidence: s.confidence || 0,
      ruleMatched: s.matchedRule || null,
      aliasMatched: s.aliasMatched || null,
      aiFallback: s.aiUsed || false,
      source: s.rawContent ? 'brightone' : 'parser',
      rawContentLength: s.rawContent?.length || 0,
      wordCount: s.wordCount || 0,
    }));

    // 9. Detect issues
    const issues: AuditResult['issues'] = [];

    // Check for missing sections
    if (parserSections < totalSections) {
      issues.push({
        type: 'missing',
        location: 'sections',
        expected: `Expected ${totalSections} sections`,
        actual: `Found ${parserSections} sections`,
        severity: totalSections - parserSections > 2 ? 'critical' : 'warning',
      });
    }

    // Check for extra sections
    if (parserSections > totalSections) {
      issues.push({
        type: 'extra',
        location: 'sections',
        expected: `Expected ${totalSections} sections`,
        actual: `Found ${parserSections} sections`,
        severity: 'warning',
      });
    }

    // Check for missing paragraphs
    if (parserParagraphs < totalParagraphs) {
      issues.push({
        type: 'missing',
        location: 'paragraphs',
        expected: `Expected ${totalParagraphs} paragraphs`,
        actual: `Found ${parserParagraphs} paragraphs`,
        severity: totalParagraphs - parserParagraphs > 5 ? 'critical' : 'warning',
      });
    }

    // Check for empty content sections
    const emptySections = lessonPlan.sections.filter((s: any) =>
      !s.rawContent || s.rawContent.length < 10
    );
    if (emptySections.length > 0) {
      issues.push({
        type: 'missing',
        location: 'content',
        expected: 'All sections should have content',
        actual: `${emptySections.length} sections have empty or minimal content`,
        severity: emptySections.length > 2 ? 'critical' : 'warning',
      });
    }

    // 10. Calculate accuracy
    const calcAccuracy = (expected: number, actual: number): number => {
      if (expected === 0) return actual === 0 ? 100 : 0;
      return Math.max(0, Math.min(100, (actual / expected) * 100));
    };

    const headingAccuracy = calcAccuracy(totalHeadings, parserHeadings);
    const sectionAccuracy = calcAccuracy(totalSections, parserSections);
    const paragraphAccuracy = calcAccuracy(totalParagraphs, parserParagraphs);
    const tableAccuracy = calcAccuracy(totalTables, parserTables);
    const imageAccuracy = calcAccuracy(totalImages, parserImages);

    const overallAccuracy = (
      headingAccuracy * 0.3 +
      sectionAccuracy * 0.3 +
      paragraphAccuracy * 0.2 +
      tableAccuracy * 0.1 +
      imageAccuracy * 0.1
    );

    const result: AuditResult = {
      lessonPlanId,
      fileName: path.basename(filePath),
      fileType: lessonPlan?.mimeType || 'unknown',

      brightoneRaw,
      documentTree,
      parserTree,
      databaseTree,
      workspaceTree,

      statistics: {
        totalHeadings,
        parserHeadings,
        headingErrors: {
          missing: Math.max(0, totalHeadings - parserHeadings),
          extra: Math.max(0, parserHeadings - totalHeadings),
          wrong: 0,
        },

        totalSections,
        parserSections,
        sectionErrors: {
          missing: Math.max(0, totalSections - parserSections),
          extra: Math.max(0, parserSections - totalSections),
          wrong: 0,
          merged: 0,
          split: 0,
        },

        totalParagraphs,
        parserParagraphs,
        paragraphErrors: {
          missing: Math.max(0, totalParagraphs - parserParagraphs),
          extra: Math.max(0, parserParagraphs - totalParagraphs),
          wrong: 0,
        },

        totalTables,
        parserTables,
        tableErrors: {
          missing: Math.max(0, totalTables - parserTables),
          extra: Math.max(0, parserTables - totalTables),
        },

        totalImages,
        parserImages,
        imageErrors: {
          missing: Math.max(0, totalImages - parserImages),
          extra: Math.max(0, parserImages - totalImages),
        },
      },

      sectionDetails,
      issues,

      accuracy: {
        heading: headingAccuracy,
        section: sectionAccuracy,
        paragraph: paragraphAccuracy,
        table: tableAccuracy,
        image: imageAccuracy,
        overall: overallAccuracy,
      },
    };

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[Parser Audit] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
