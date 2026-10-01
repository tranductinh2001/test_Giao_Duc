import PizZip from "pizzip";
import { readFile, writeFile } from "fs/promises";
import crypto from "crypto";

export interface TrackChange {
  type: "INSERT" | "DELETE" | "REPLACE";
  author: string;
  date: Date;
  originalText?: string;
  newText?: string;
  startPosition?: number;
  endPosition?: number;
}

/**
 * Add track changes to DOCX file
 */
export async function addTrackChangesToDocx(
  filePath: string,
  changes: TrackChange[],
  outputPath?: string
): Promise<string> {
  try {
    const content = await readFile(filePath);
    const zip = new PizZip(content);

    // Extract document.xml
    let documentXml = zip.file("word/document.xml")?.asText();
    if (!documentXml) {
      throw new Error("Cannot find document.xml");
    }

    // Process each change
    let changeId = 1;

    for (const change of changes) {
      switch (change.type) {
        case "INSERT":
          if (change.newText) {
            documentXml = addInsertTrackChange(
              documentXml,
              changeId++,
              change.author,
              change.date,
              change.newText
            );
          }
          break;

        case "DELETE":
          if (change.originalText) {
            documentXml = addDeleteTrackChange(
              documentXml,
              changeId++,
              change.author,
              change.date,
              change.originalText
            );
          }
          break;

        case "REPLACE":
          if (change.originalText && change.newText) {
            // Delete original, then insert new
            documentXml = addDeleteTrackChange(
              documentXml,
              changeId++,
              change.author,
              change.date,
              change.originalText
            );
            documentXml = addInsertTrackChange(
              documentXml,
              changeId++,
              change.author,
              change.date,
              change.newText
            );
          }
          break;
      }
    }

    zip.file("word/document.xml", documentXml);

    const output = outputPath || filePath.replace(".docx", "_tracked.docx");
    const buffer = zip.generate({ type: "nodebuffer" });
    await writeFile(output, buffer);

    return output;
  } catch (error) {
    console.error("Error adding track changes:", error);
    throw error;
  }
}

/**
 * Add INSERT track change
 */
function addInsertTrackChange(
  xml: string,
  changeId: number,
  author: string,
  date: Date,
  text: string
): string {
  const escapedText = escapeXml(text);
  const insertXml = `<w:ins w:id="${changeId}" w:author="${escapeXml(author)}" w:date="${date.toISOString()}">
    <w:r>
      <w:rPr>
        <w:highlight w:val="green"/>
      </w:rPr>
      <w:t xml:space="preserve">${escapedText}</w:t>
    </w:r>
  </w:ins>`;

  // Find last paragraph and insert before closing tag
  return xml.replace(/(.*<w:p[^>]*>)([\s\S]*?)(<\/w:p>)/, `$1$2${insertXml}$3`);
}

/**
 * Add DELETE track change
 */
function addDeleteTrackChange(
  xml: string,
  changeId: number,
  author: string,
  date: Date,
  text: string
): string {
  const escapedText = escapeXml(text);

  // Find the text to delete and wrap it
  const regex = new RegExp(`(<w:t[^>]*>)(${escapedText})(</w:t>)`, "g");

  return xml.replace(regex, (match, open, content, close) => {
    return `<w:del w:id="${changeId}" w:author="${escapeXml(author)}" w:date="${date.toISOString()}">
      <w:r>
        <w:rPr>
          <w:strike/>
          <w:highlight w:val="red"/>
        </w:rPr>
        ${open}${content}${close}
      </w:r>
    </w:del>`;
  });
}

/**
 * Accept all track changes in DOCX
 */
export async function acceptAllTrackChanges(
  filePath: string,
  outputPath?: string
): Promise<string> {
  try {
    const content = await readFile(filePath);
    const zip = new PizZip(content);

    let documentXml = zip.file("word/document.xml")?.asText();
    if (!documentXml) {
      throw new Error("Cannot find document.xml");
    }

    // Remove all <w:ins> tags but keep content
    documentXml = documentXml.replace(/<w:ins[^>]*>([\s\S]*?)<\/w:ins>/g, "$1");

    // Remove all <w:del> tags and content
    documentXml = documentXml.replace(/<w:del[^>]*>[\s\S]*?<\/w:del>/g, "");

    zip.file("word/document.xml", documentXml);

    const output = outputPath || filePath.replace(".docx", "_accepted.docx");
    const buffer = zip.generate({ type: "nodebuffer" });
    await writeFile(output, buffer);

    return output;
  } catch (error) {
    console.error("Error accepting track changes:", error);
    throw error;
  }
}

/**
 * Reject all track changes in DOCX
 */
export async function rejectAllTrackChanges(
  filePath: string,
  outputPath?: string
): Promise<string> {
  try {
    const content = await readFile(filePath);
    const zip = new PizZip(content);

    let documentXml = zip.file("word/document.xml")?.asText();
    if (!documentXml) {
      throw new Error("Cannot find document.xml");
    }

    // Remove all <w:ins> tags and content
    documentXml = documentXml.replace(/<w:ins[^>]*>[\s\S]*?<\/w:ins>/g, "");

    // Remove <w:del> tags but keep content
    documentXml = documentXml.replace(/<w:del[^>]*>([\s\S]*?)<\/w:del>/g, "$1");

    zip.file("word/document.xml", documentXml);

    const output = outputPath || filePath.replace(".docx", "_rejected.docx");
    const buffer = zip.generate({ type: "nodebuffer" });
    await writeFile(output, buffer);

    return output;
  } catch (error) {
    console.error("Error rejecting track changes:", error);
    throw error;
  }
}

/**
 * Apply AI rewrite with track changes
 */
export async function applyAIRewriteWithTracking(
  filePath: string,
  rewrites: Array<{
    originalText: string;
    newText: string;
    author?: string;
  }>,
  outputPath?: string
): Promise<string> {
  const changes: TrackChange[] = rewrites.map((rewrite) => ({
    type: "REPLACE",
    author: rewrite.author || "AI Assistant",
    date: new Date(),
    originalText: rewrite.originalText,
    newText: rewrite.newText,
  }));

  return addTrackChangesToDocx(filePath, changes, outputPath);
}

/**
 * Extract track changes from DOCX
 */
export async function extractTrackChanges(filePath: string): Promise<TrackChange[]> {
  try {
    const content = await readFile(filePath);
    const zip = new PizZip(content);

    const documentXml = zip.file("word/document.xml")?.asText();
    if (!documentXml) {
      throw new Error("Cannot find document.xml");
    }

    const changes: TrackChange[] = [];

    // Extract INSERT changes
    const insertRegex = /<w:ins[^>]*w:id="(\d+)"[^>]*w:author="([^"]*)"[^>]*w:date="([^"]*)"[^>]*>([\s\S]*?)<\/w:ins>/g;
    let match;

    while ((match = insertRegex.exec(documentXml)) !== null) {
      const [, id, author, date, content] = match;
      const textMatch = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/);

      if (textMatch) {
        changes.push({
          type: "INSERT",
          author: unescapeXml(author),
          date: new Date(date),
          newText: unescapeXml(textMatch[1]),
        });
      }
    }

    // Extract DELETE changes
    const deleteRegex = /<w:del[^>]*w:id="(\d+)"[^>]*w:author="([^"]*)"[^>]*w:date="([^"]*)"[^>]*>([\s\S]*?)<\/w:del>/g;

    while ((match = deleteRegex.exec(documentXml)) !== null) {
      const [, id, author, date, content] = match;
      const textMatch = content.match(/<w:t[^>]*>([^<]*)<\/w:t>/);

      if (textMatch) {
        changes.push({
          type: "DELETE",
          author: unescapeXml(author),
          date: new Date(date),
          originalText: unescapeXml(textMatch[1]),
        });
      }
    }

    return changes;
  } catch (error) {
    console.error("Error extracting track changes:", error);
    throw error;
  }
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
 * Unescape XML special characters
 */
function unescapeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
