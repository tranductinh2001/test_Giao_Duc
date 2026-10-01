import PizZip from "pizzip";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

export interface AIReviewComment {
  sectionId: string;
  sectionTitle: string;
  paragraphId?: string;
  startOffset?: number;
  endOffset?: number;
  severity: "CRITICAL" | "ERROR" | "WARNING" | "INFO";
  status: "failed" | "passed" | "warning";
  reason: string;
  suggestion: string;
  rewriteContent?: string;
  highlightedText?: string;
}

/**
 * Inject AI review comments into DOCX file
 */
export async function injectCommentsToDocx(
  filePath: string,
  comments: AIReviewComment[],
  outputPath?: string
): Promise<string> {
  try {
    // Read DOCX file
    const content = await readFile(filePath);
    const zip = new PizZip(content);

    // Extract document.xml
    const documentXml = zip.file("word/document.xml")?.asText();
    if (!documentXml) {
      throw new Error("Cannot find document.xml in DOCX");
    }

    // Extract comments.xml if exists
    let commentsXml = zip.file("word/comments.xml")?.asText() || createEmptyCommentsXml();

    // Parse existing comments count
    const commentIdMatches = commentsXml.match(/w:id="(\d+)"/g) || [];
    let nextCommentId = commentIdMatches.length > 0
      ? Math.max(...commentIdMatches.map(m => parseInt(m.match(/\d+/)?.[0] || "0"))) + 1
      : 1;

    // Inject comments
    let modifiedDocumentXml = documentXml;
    const newComments: string[] = [];

    for (const comment of comments) {
      const commentId = nextCommentId++;

      // Create comment XML
      const commentXml = createCommentXml(commentId, comment);
      newComments.push(commentXml);

      // Add comment markers to document
      // This is simplified - in production, you need to properly parse XML and find paragraphs
      if (comment.highlightedText) {
        // Find and wrap the text with comment markers
        const textToFind = escapeXml(comment.highlightedText);
        const commentStart = `<w:commentRangeStart w:id="${commentId}"/>`;
        const commentEnd = `<w:commentRangeEnd w:id="${commentId}"/><w:r><w:commentReference w:id="${commentId}"/></w:r>`;

        // Simple text replacement (in production, use proper XML parsing)
        modifiedDocumentXml = modifiedDocumentXml.replace(
          new RegExp(`(<w:t[^>]*>)(${textToFind})(</w:t>)`, "g"),
          `$1${commentStart}$2${commentEnd}$3`
        );
      }
    }

    // Insert new comments into comments.xml
    if (newComments.length > 0) {
      const commentsToInsert = newComments.join("\n");
      commentsXml = commentsXml.replace(
        "</w:comments>",
        `${commentsToInsert}\n</w:comments>`
      );
    }

    // Update ZIP
    zip.file("word/document.xml", modifiedDocumentXml);
    zip.file("word/comments.xml", commentsXml);

    // Ensure comments.xml is in [Content_Types].xml
    let contentTypes = zip.file("[Content_Types].xml")?.asText() || "";
    if (!contentTypes.includes("word/comments.xml")) {
      contentTypes = contentTypes.replace(
        "</Types>",
        '<Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/>\n</Types>'
      );
      zip.file("[Content_Types].xml", contentTypes);
    }

    // Ensure comments.xml is in word/_rels/document.xml.rels
    let documentRels = zip.file("word/_rels/document.xml.rels")?.asText() || "";
    if (!documentRels.includes("comments.xml")) {
      const relsIdMatch = documentRels.match(/Id="rId(\d+)"/g);
      const nextRelsId = relsIdMatch
        ? Math.max(...relsIdMatch.map(m => parseInt(m.match(/\d+/)?.[0] || "0"))) + 1
        : 1;

      documentRels = documentRels.replace(
        "</Relationships>",
        `<Relationship Id="rId${nextRelsId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>\n</Relationships>`
      );
      zip.file("word/_rels/document.xml.rels", documentRels);
    }

    // Generate output file
    const output = outputPath || filePath.replace(".docx", "_commented.docx");
    const buffer = zip.generate({ type: "nodebuffer" });
    await writeFile(output, buffer);

    return output;
  } catch (error) {
    console.error("Error injecting comments to DOCX:", error);
    throw error;
  }
}

/**
 * Create empty comments.xml structure
 */
function createEmptyCommentsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
</w:comments>`;
}

/**
 * Create comment XML element
 */
function createCommentXml(commentId: number, comment: AIReviewComment): string {
  const severityIcon = {
    CRITICAL: "❌",
    ERROR: "⚠️",
    WARNING: "⚠️",
    INFO: "ℹ️",
  }[comment.severity];

  const commentText = `${severityIcon} ${comment.reason}

Đề xuất: ${comment.suggestion}${comment.rewriteContent ? `

Viết lại:
${comment.rewriteContent}` : ""}`;

  return `  <w:comment w:id="${commentId}" w:author="AI Review" w:date="${new Date().toISOString()}" w:initials="AI">
    <w:p>
      <w:pPr>
        <w:pStyle w:val="CommentText"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:sz w:val="20"/>
        </w:rPr>
        <w:t xml:space="preserve">${escapeXml(commentText)}</w:t>
      </w:r>
    </w:p>
  </w:comment>`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Add highlight to text in DOCX
 */
export async function highlightTextInDocx(
  filePath: string,
  highlights: Array<{ text: string; color: "yellow" | "red" | "green" }>,
  outputPath?: string
): Promise<string> {
  try {
    const content = await readFile(filePath);
    const zip = new PizZip(content);

    let documentXml = zip.file("word/document.xml")?.asText();
    if (!documentXml) {
      throw new Error("Cannot find document.xml");
    }

    // Add highlighting to specified text
    for (const { text, color } of highlights) {
      const escapedText = escapeXml(text);
      const highlightXml = `<w:highlight w:val="${color}"/>`;

      // Find and add highlight (simplified - use proper XML parsing in production)
      documentXml = documentXml.replace(
        new RegExp(`(<w:rPr>)([^]*?)(<w:t[^>]*>${escapedText}</w:t>)`, "g"),
        `$1${highlightXml}$2$3`
      );
    }

    zip.file("word/document.xml", documentXml);

    const output = outputPath || filePath.replace(".docx", "_highlighted.docx");
    const buffer = zip.generate({ type: "nodebuffer" });
    await writeFile(output, buffer);

    return output;
  } catch (error) {
    console.error("Error highlighting text in DOCX:", error);
    throw error;
  }
}
