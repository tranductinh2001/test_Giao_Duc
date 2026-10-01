/**
 * DOCX Importer
 *
 * Converts DOCX files to our document model
 */

import mammoth from "mammoth";
import type { DocumentRootNode, DocumentNode } from "../document/types";
import { createDocument, createSection, createParagraph, createText } from "../document/nodes/factory";

// ============================================================================
// Import Options
// ============================================================================

export interface DocxImportOptions {
  /** Extract images */
  extractImages?: boolean;
  /** Preserve styles */
  preserveStyles?: boolean;
  /** Custom style mapping */
  styleMap?: Record<string, string>;
}

export interface ImportResult {
  success: boolean;
  document?: DocumentRootNode;
  error?: string;
  metadata?: {
    wordCount?: number;
    paragraphCount?: number;
    imageCount?: number;
  };
}

// ============================================================================
// DOCX Importer
// ============================================================================

export class DocxImporter {
  /**
   * Import DOCX file from buffer
   */
  async import(
    buffer: ArrayBuffer,
    options: DocxImportOptions = {}
  ): Promise<ImportResult> {
    try {
      // Convert DOCX to HTML
      const result = await mammoth.convertToHtml(
        { arrayBuffer: buffer },
        options.styleMap ? { styleMap: options.styleMap as any } : undefined
      );

      const html = result.value;

      // Parse HTML to document model
      const document = this.parseHtml(html, options);

      // Calculate metadata
      const metadata = {
        wordCount: this.countWords(document),
        paragraphCount: this.countNodes(document, "paragraph"),
        imageCount: this.countNodes(document, "image"),
      };

      return {
        success: true,
        document,
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Import failed",
      };
    }
  }

  /**
   * Parse HTML to document model
   */
  private parseHtml(html: string, options: DocxImportOptions): DocumentRootNode {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const sections: DocumentNode[] = [];
    let currentSection: DocumentNode[] = [];
    let sectionOrder = 0;

    // Process body content
    const bodyElements = Array.from(doc.body.children);

    for (const element of bodyElements) {
      const tagName = element.tagName.toLowerCase();

      // Heading = new section
      if (tagName.match(/^h[1-6]$/)) {
        // Save previous section
        if (currentSection.length > 0) {
          sections.push(
            createSection(
              "content",
              "Section " + sectionOrder,
              currentSection,
              { order: sectionOrder }
            )
          );
          sectionOrder++;
          currentSection = [];
        }

        // Create new section with heading
        const headingText = element.textContent || "";
        sections.push(
          createSection(
            "content",
            headingText,
            [],
            { order: sectionOrder, level: parseInt(tagName[1]) }
          )
        );
        sectionOrder++;
      } else if (tagName === "p") {
        // Paragraph
        const text = element.textContent || "";
        if (text.trim()) {
          const paragraph = createParagraph([createText(text)]);
          currentSection.push(paragraph);
        }
      }
    }

    // Save last section
    if (currentSection.length > 0) {
      sections.push(
        createSection(
          "content",
          "Section " + sectionOrder,
          currentSection,
          { order: sectionOrder }
        )
      );
    }

    // Create document
    return createDocument(sections, {
      title: "Imported Document",
      version: 1,
    });
  }

  /**
   * Count words in document
   */
  private countWords(document: DocumentRootNode): number {
    let count = 0;

    const traverse = (node: DocumentNode) => {
      if (node.type === "text") {
        const textNode = node as any;
        count += textNode.text.split(/\s+/).filter((w: string) => w.length > 0).length;
      }

      if ("content" in node && Array.isArray((node as any).content)) {
        for (const child of (node as any).content) {
          traverse(child);
        }
      }
    };

    traverse(document);
    return count;
  }

  /**
   * Count nodes of specific type
   */
  private countNodes(document: DocumentRootNode, type: string): number {
    let count = 0;

    const traverse = (node: DocumentNode) => {
      if (node.type === type) {
        count++;
      }

      if ("content" in node && Array.isArray((node as any).content)) {
        for (const child of (node as any).content) {
          traverse(child);
        }
      }
    };

    traverse(document);
    return count;
  }
}

// ============================================================================
// Helper: Import from File
// ============================================================================

export async function importDocxFile(
  file: File,
  options?: DocxImportOptions
): Promise<ImportResult> {
  const importer = new DocxImporter();
  const buffer = await file.arrayBuffer();
  return importer.import(buffer, options);
}

// ============================================================================
// Helper: Import from URL
// ============================================================================

export async function importDocxFromUrl(
  url: string,
  options?: DocxImportOptions
): Promise<ImportResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch: ${response.statusText}`,
      };
    }

    const buffer = await response.arrayBuffer();
    const importer = new DocxImporter();
    return importer.import(buffer, options);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Fetch failed",
    };
  }
}
