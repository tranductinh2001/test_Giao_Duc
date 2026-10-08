// Coordinate Mapper

import { DocumentIR, Paragraph, Table, Section, Activity, BoundingBox } from '@/types/document';
import { TableCell } from '@/types/document';

export interface ResolvedTarget {
  found: boolean;
  page?: number;
  bbox?: BoundingBox;
  type?: 'paragraph' | 'table_cell' | 'section' | 'activity';
  element?: Paragraph | TableCell | Section | Activity;
}

export function resolveTarget(
  targetId: string,
  document: DocumentIR
): ResolvedTarget {
  // Check paragraphs
  const paragraph = document.paragraphs.find((p) => p.id === targetId);
  if (paragraph) {
    return {
      found: true,
      page: paragraph.page,
      bbox: paragraph.bbox,
      type: 'paragraph',
      element: paragraph,
    };
  }

  // Check table cells
  for (const table of document.tables) {
    const cell = table.cells.find((c) => c.cellId === targetId);
    if (cell) {
      return {
        found: true,
        page: table.page,
        bbox: cell.bbox,
        type: 'table_cell',
        element: cell,
      };
    }
  }

  // Check sections
  const section = document.sections.find((s) => s.sectionId === targetId);
  if (section) {
    return resolveSectionBbox(section, document);
  }

  // Check activities
  const activity = document.activities.find((a) => a.activityId === targetId);
  if (activity) {
    return resolveActivityBbox(activity, document);
  }

  return { found: false };
}

function resolveSectionBbox(section: Section, document: DocumentIR): ResolvedTarget {
  const startParagraph = document.paragraphs.find(
    (p) => p.id === section.startParagraphId
  );
  const endParagraph = document.paragraphs.find(
    (p) => p.id === section.endParagraphId
  );

  if (!startParagraph) {
    return { found: false };
  }

  const endP = endParagraph || startParagraph;
  const minY = Math.min(startParagraph.bbox.y, endP.bbox.y);
  const maxY = Math.max(
    startParagraph.bbox.y + startParagraph.bbox.height,
    endP.bbox.y + endP.bbox.height
  );

  const bbox: BoundingBox = {
    x: Math.min(startParagraph.bbox.x, endP.bbox.x),
    y: minY,
    width: Math.max(startParagraph.bbox.width, endP.bbox.width),
    height: Math.max(maxY - minY, startParagraph.bbox.height),
  };

  return {
    found: true,
    page: section.startPage,
    bbox,
    type: 'section',
    element: section,
  };
}

function resolveActivityBbox(activity: Activity, document: DocumentIR): ResolvedTarget {
  const startParagraph = document.paragraphs.find(
    (p) => p.id === activity.startParagraphId
  );
  const endParagraph = document.paragraphs.find(
    (p) => p.id === activity.endParagraphId
  );

  if (!startParagraph) {
    return { found: false };
  }

  // If start and end are on the same page, encompass heading and introductory lines (max height 120pt)
  const isSamePage = endParagraph && endParagraph.page === startParagraph.page;
  const targetEndP = isSamePage ? endParagraph : startParagraph;

  const minY = Math.min(startParagraph.bbox.y, targetEndP.bbox.y);
  const rawMaxY = Math.max(
    startParagraph.bbox.y + startParagraph.bbox.height,
    targetEndP.bbox.y + targetEndP.bbox.height
  );
  // Cap height to max 100pt so it doesn't mask entire page
  const clampedHeight = Math.min(Math.max(rawMaxY - minY, startParagraph.bbox.height), 100);

  const bbox: BoundingBox = {
    x: Math.min(startParagraph.bbox.x, targetEndP.bbox.x),
    y: minY,
    width: Math.max(startParagraph.bbox.width, targetEndP.bbox.width),
    height: clampedHeight,
  };

  return {
    found: true,
    page: startParagraph.page || activity.startPage,
    bbox,
    type: 'activity',
    element: activity,
  };
}

export function pdfToScreen(
  bbox: BoundingBox,
  pageHeight: number,
  scale: number
): { x: number; y: number; width: number; height: number } {
  // DocumentIR coordinates are normalized top-down (origin at top-left, Y increases downward)
  return {
    x: bbox.x * scale,
    y: bbox.y * scale,
    width: bbox.width * scale,
    height: bbox.height * scale,
  };
}

export function screenToPdf(
  screenX: number,
  screenY: number,
  pageHeight: number,
  scale: number
): { x: number; y: number } {
  return {
    x: screenX / scale,
    y: screenY / scale,
  };
}

export interface AnnotationPosition {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function getAnnotationPosition(
  bbox: BoundingBox,
  pageHeight: number,
  scale: number
): AnnotationPosition {
  const screen = pdfToScreen(bbox, pageHeight, scale);
  return {
    left: screen.x,
    top: screen.y,
    width: screen.width,
    height: screen.height,
  };
}

export function validateBoundingBox(
  bbox: BoundingBox,
  pageSize: { width: number; height: number }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (bbox.x < 0) {
    errors.push('X must be >= 0');
  }
  if (bbox.y < 0) {
    errors.push('Y must be >= 0');
  }
  if (bbox.x + bbox.width > pageSize.width) {
    errors.push('BBox exceeds page width');
  }
  if (bbox.y + bbox.height > pageSize.height) {
    errors.push('BBox exceeds page height');
  }
  if (bbox.width <= 0) {
    errors.push('Width must be > 0');
  }
  if (bbox.height <= 0) {
    errors.push('Height must be > 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function expandBbox(
  bbox: BoundingBox,
  padding: number
): BoundingBox {
  return {
    x: bbox.x - padding,
    y: bbox.y - padding,
    width: bbox.width + padding * 2,
    height: bbox.height + padding * 2,
  };
}
