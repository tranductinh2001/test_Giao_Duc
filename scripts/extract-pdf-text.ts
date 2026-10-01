/**
 * Extract text from PDF for debugging
 */
import * as fs from 'fs';
import * as path from 'path';

async function extractPdfText() {
  const pdfPath = 'C:\\Users\\Admin\\Desktop\\MMO\\educations\\education-platform\\uploads\\lesson-plans\\1785174168613-1-pages-2.pdf';

  // Dynamic import pdf-parse
  const pdf = await import('pdf-parse');
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdf.default(dataBuffer);

  console.log('='.repeat(80));
  console.log('PDF CONTENT');
  console.log('='.repeat(80));
  console.log(data.text);
  console.log('='.repeat(80));
}

extractPdfText().catch(console.error);
