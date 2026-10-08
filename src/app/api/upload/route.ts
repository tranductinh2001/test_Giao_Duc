import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { parsePDF, extractTables, validateDocumentIR } from '@/lib/pdf-parser';
import { parseDOCX } from '@/lib/docx-parser';
import { logger } from '@/lib/utils/logger';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // 2 minutes for processing large files

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập để tải lên và phân tích giáo án' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng chọn file PDF hoặc Word (.docx) để tải lên' },
        { status: 400 }
      );
    }

    const lowerName = file.name.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf');
    const isDocx = lowerName.endsWith('.docx');

    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { success: false, error: 'Chỉ hỗ trợ định dạng file PDF (.pdf) hoặc Word (.docx)' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        {
          success: false,
          error: `Dung lượng file (${fileSizeMB}MB) vượt quá giới hạn 100MB cho phép. Vui lòng nén hoặc chọn file nhỏ hơn.`,
        },
        { status: 400 }
      );
    }

    logger.info('Processing upload', {
      filename: file.name,
      size: file.size,
      format: isPdf ? 'pdf' : 'docx',
    });

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    let document;
    let rawText = '';
    let textCount = 0;

    if (isDocx) {
      const docxResult = await parseDOCX(arrayBuffer, file.name);
      document = docxResult.document;
      rawText = docxResult.rawText;
      textCount = document.paragraphs.length;
    } else {
      // Parse PDF
      const parseResult = await parsePDF(arrayBuffer);
      document = parseResult.document;
      document.metadata.filename = file.name;

      // Extract tables
      const tables = extractTables(parseResult.textItems);
      document.tables = tables;
      rawText = parseResult.rawText;
      textCount = parseResult.textItems.length;
    }

    // Validate
    const validation = validateDocumentIR(document);
    if (!validation.valid) {
      logger.warn('Document validation warnings', { errors: validation.errors });
    }

    logger.info('Upload processed successfully', {
      documentId: document.documentId,
      pages: document.pages.length,
      paragraphs: document.paragraphs.length,
      tables: document.tables.length,
    });

    return NextResponse.json({
      success: true,
      document,
      rawText,
      textCount,
    });
  } catch (error) {
    logger.error('Upload failed', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
