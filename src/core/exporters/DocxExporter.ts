/**
 * DOCX Exporter
 *
 * Converts our document model to DOCX files
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
} from "docx";
import type { DocumentRootNode, DocumentNode, TextNode } from "../document/types";

// ============================================================================
// Export Options
// ============================================================================

export interface DocxExportOptions {
  /** Include annotations as comments */
  includeAnnotations?: boolean;
  /** Document title */
  title?: string;
  /** Creator name */
  creator?: string;
  /** Description */
  description?: string;
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  error?: string;
}

// ============================================================================
// DOCX Exporter
// ============================================================================

export class DocxExporter {
  /**
   * Export document to DOCX
   */
  async export(
    document: DocumentRootNode,
    options: DocxExportOptions = {}
  ): Promise<ExportResult> {
    try {
      const docxSections = this.convertToDocx(document, options);

      const doc = new Document({
        creator: options.creator || "Education Platform",
        title: options.title || document.attrs?.title || "Lesson Plan",
        description: options.description || "",
        sections: [
          {
            children: docxSections,
          },
        ],
      });

      const blob = await Packer.toBlob(doc);

      return {
        success: true,
        blob,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Export failed",
      };
    }
  }

  /**
   * Convert document model to DOCX paragraphs
   */
  private convertToDocx(
    document: DocumentRootNode,
    options: DocxExportOptions
  ): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    const traverse = (node: DocumentNode) => {
      switch (node.type) {
        case "section": {
          const section = node as any;
          // Section heading
          paragraphs.push(
            new Paragraph({
              text: section.attrs?.title || "Section",
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 },
            })
          );

          // Section content
          if (section.content) {
            for (const child of section.content) {
              traverse(child);
            }
          }
          break;
        }

        case "heading": {
          const heading = node as any;
          const level = heading.attrs?.level || 1;
          const headingLevels = [
            HeadingLevel.HEADING_1,
            HeadingLevel.HEADING_2,
            HeadingLevel.HEADING_3,
            HeadingLevel.HEADING_4,
            HeadingLevel.HEADING_5,
            HeadingLevel.HEADING_6,
          ];

          const textContent = this.extractText(heading);
          paragraphs.push(
            new Paragraph({
              text: textContent,
              heading: headingLevels[level - 1] || HeadingLevel.HEADING_1,
              spacing: { before: 300, after: 150 },
            })
          );
          break;
        }

        case "paragraph": {
          const para = node as any;
          const textRuns = this.convertTextNodes(para.content || []);

          paragraphs.push(
            new Paragraph({
              children: textRuns,
              spacing: { before: 100, after: 100 },
              alignment:
                para.attrs?.align === "center"
                  ? AlignmentType.CENTER
                  : para.attrs?.align === "right"
                  ? AlignmentType.RIGHT
                  : AlignmentType.LEFT,
            })
          );
          break;
        }

        case "objective":
        case "activity": {
          const custom = node as any;
          // Render as paragraph with prefix
          const prefix = node.type === "objective" ? "Objective:" : "Activity:";
          const textContent = this.extractText(custom);

          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({ text: prefix, bold: true }),
                new TextRun({ text: " " }),
                new TextRun({ text: textContent }),
              ],
              spacing: { before: 200, after: 100 },
            })
          );
          break;
        }

        case "list": {
          const list = node as any;
          if (list.content) {
            for (const item of list.content) {
              const textContent = this.extractText(item);
              paragraphs.push(
                new Paragraph({
                  text: textContent,
                  bullet: { level: 0 },
                  spacing: { before: 50, after: 50 },
                })
              );
            }
          }
          break;
        }

        default:
          // Recursively process children
          if ("content" in node && Array.isArray((node as any).content)) {
            for (const child of (node as any).content) {
              traverse(child);
            }
          }
      }
    };

    traverse(document);
    return paragraphs;
  }

  /**
   * Convert text nodes to TextRuns
   */
  private convertTextNodes(nodes: DocumentNode[]): TextRun[] {
    const runs: TextRun[] = [];

    for (const node of nodes) {
      if (node.type === "text") {
        const textNode = node as TextNode;
        const marks = textNode.marks || [];

        const isBold = marks.some((m) => m.type === "bold");
        const isItalic = marks.some((m) => m.type === "italic");
        const isUnderline = marks.some((m) => m.type === "underline");

        runs.push(
          new TextRun({
            text: textNode.text,
            bold: isBold,
            italics: isItalic,
            underline: isUnderline ? {} : undefined,
          })
        );
      }
    }

    return runs;
  }

  /**
   * Extract plain text from node
   */
  private extractText(node: DocumentNode): string {
    if (node.type === "text") {
      return (node as TextNode).text;
    }

    if ("content" in node && Array.isArray((node as any).content)) {
      return (node as any).content.map((child: DocumentNode) => this.extractText(child)).join("");
    }

    return "";
  }
}

// ============================================================================
// Helper: Export to File
// ============================================================================

export async function exportDocxFile(
  document: DocumentRootNode,
  filename: string,
  options?: DocxExportOptions
): Promise<ExportResult> {
  const exporter = new DocxExporter();
  const result = await exporter.export(document, options);

  if (result.success && result.blob) {
    // Trigger download
    const url = URL.createObjectURL(result.blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".docx") ? filename : `${filename}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return result;
}
