/**
 * API to Document Model Adapter
 *
 * Converts API response to our new document model
 */

import {
  createDocument,
  createSection,
  createParagraph,
  createText,
  type DocumentRootNode,
  type Mark,
  MarkType,
} from "@/core";

// ============================================================================
// API Types (from existing system)
// ============================================================================

export interface APISection {
  id: string;
  sectionType: string;
  sectionTitle: string;
  sectionOrder: number;
  rawContent: string;
  annotationCount?: number;
}

export interface APIAnnotation {
  id: string;
  sectionId: string;
  severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO";
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  startPosition: number;
  endPosition: number;
  highlightedText: string;
  message: string;
  explanation: string | null;
  suggestion: string | null;
  proposedContent: string | null;
}

// ============================================================================
// Adapter Functions
// ============================================================================

/**
 * Convert API sections + annotations to document model
 */
export function sectionsToDocument(
  sections: APISection[],
  annotations: APIAnnotation[],
  title?: string
): DocumentRootNode {
  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.sectionOrder - b.sectionOrder);

  // Convert each section
  const documentSections = sortedSections.map((section) => {
    // Get annotations for this section
    const sectionAnnotations = annotations.filter((a) => a.sectionId === section.id);

    // Parse content with annotations
    const paragraphs = parseContentWithAnnotations(
      section.rawContent,
      sectionAnnotations
    );

    return createSection(
      section.sectionType,
      section.sectionTitle,
      paragraphs,
      {
        order: section.sectionOrder,
        metadata: {
          apiId: section.id,
          annotationCount: section.annotationCount || 0,
        },
      }
    );
  });

  return createDocument(documentSections, {
    title: title || "Lesson Plan",
    metadata: {
      importedFrom: "api",
      importedAt: new Date(),
    },
  });
}

/**
 * Parse text content with annotations into paragraphs
 */
function parseContentWithAnnotations(
  content: string,
  annotations: APIAnnotation[]
) {
  // Split into paragraphs
  const paragraphTexts = content.split("\n\n").filter((p) => p.trim());

  return paragraphTexts.map((paraText) => {
    // Find annotations that overlap with this paragraph
    const currentOffset = content.indexOf(paraText);
    const paraEnd = currentOffset + paraText.length;

    const overlappingAnnotations = annotations.filter(
      (ann) =>
        (ann.startPosition >= currentOffset && ann.startPosition < paraEnd) ||
        (ann.endPosition > currentOffset && ann.endPosition <= paraEnd) ||
        (ann.startPosition <= currentOffset && ann.endPosition >= paraEnd)
    );

    // If no annotations, simple paragraph
    if (overlappingAnnotations.length === 0) {
      return createParagraph([createText(paraText)]);
    }

    // Build text segments with marks
    const segments = buildTextSegments(
      paraText,
      currentOffset,
      overlappingAnnotations
    );

    return createParagraph(segments);
  });
}

/**
 * Build text segments with annotation marks
 */
function buildTextSegments(
  text: string,
  baseOffset: number,
  annotations: APIAnnotation[]
) {
  // Sort annotations by start position
  const sorted = [...annotations].sort((a, b) => a.startPosition - b.startPosition);

  const segments = [];
  let lastIndex = 0;

  for (const ann of sorted) {
    const relStart = Math.max(0, ann.startPosition - baseOffset);
    const relEnd = Math.min(text.length, ann.endPosition - baseOffset);

    // Text before annotation
    if (relStart > lastIndex) {
      segments.push(createText(text.slice(lastIndex, relStart)));
    }

    // Annotated text with highlight + comment mark
    const marks: Mark[] = [
      { type: MarkType.Highlight },
      {
        type: MarkType.Comment,
        attrs: {
          commentId: ann.id,
        },
      },
    ];

    segments.push(createText(text.slice(relStart, relEnd), marks));

    lastIndex = relEnd;
  }

  // Remaining text
  if (lastIndex < text.length) {
    segments.push(createText(text.slice(lastIndex)));
  }

  return segments;
}

/**
 * Convert document model back to API sections
 * (for saving changes)
 */
export function documentToSections(document: DocumentRootNode): APISection[] {
  const sections: APISection[] = [];

  document.content.forEach((node) => {
    if (node.type === "section") {
      const section = node as any;

      // Extract text content
      let rawContent = "";
      if (section.content) {
        for (const child of section.content) {
          if (child.type === "paragraph") {
            const para = child as any;
            if (para.content) {
              for (const text of para.content) {
                if (text.type === "text") {
                  rawContent += text.text;
                }
              }
            }
            rawContent += "\n\n";
          }
        }
      }

      sections.push({
        id: section.metadata?.apiId || section.id,
        sectionType: section.attrs.sectionType,
        sectionTitle: section.attrs.title,
        sectionOrder: section.attrs.order,
        rawContent: rawContent.trim(),
      });
    }
  });

  return sections;
}

/**
 * Extract annotations from document
 */
export function extractAnnotationsFromDocument(
  document: DocumentRootNode
): APIAnnotation[] {
  const annotations: APIAnnotation[] = [];
  let globalOffset = 0;

  document.content.forEach((node) => {
    if (node.type === "section") {
      const section = node as any;
      const sectionId = section.metadata?.apiId || section.id;

      if (section.content) {
        for (const child of section.content) {
          if (child.type === "paragraph") {
            const para = child as any;
            if (para.content) {
              for (const text of para.content) {
                if (text.type === "text" && text.marks) {
                  const commentMark = text.marks.find(
                    (m: Mark) => m.type === MarkType.Comment
                  );

                  if (commentMark && (commentMark as any).attrs?.commentId) {
                    // This is an annotated text
                    // Note: This is simplified - full implementation would track positions
                    annotations.push({
                      id: (commentMark as any).attrs.commentId,
                      sectionId,
                      severity: "INFO", // Default, should be stored in annotation registry
                      status: "PENDING",
                      startPosition: globalOffset,
                      endPosition: globalOffset + text.text.length,
                      highlightedText: text.text,
                      message: "",
                      explanation: null,
                      suggestion: null,
                      proposedContent: null,
                    });
                  }
                }

                if (text.type === "text") {
                  globalOffset += text.text.length;
                }
              }

              globalOffset += 2; // For paragraph break
            }
          }
        }
      }
    }
  });

  return annotations;
}
