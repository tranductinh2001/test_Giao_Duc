import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as fs from 'fs';
import * as path from 'path';
import { parsePDF, extractTables, validateDocumentIR } from '@/lib/pdf-parser';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập để xem giáo án mẫu' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const samplePath = path.join(process.cwd(), 'samples', 'khbd-synthetic.pdf');
    if (!fs.existsSync(samplePath)) {
      return NextResponse.json(
        { success: false, error: 'File mẫu không tồn tại trên hệ thống.' },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(samplePath);

    // Return raw PDF binary when ?raw=true
    if (searchParams.get('raw') === 'true') {
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="Giao-an-Mau-Toan-Lop-3.pdf"',
        },
      });
    }

    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const parseResult = await parsePDF(arrayBuffer);
    const document = parseResult.document;
    document.metadata.filename = 'Giao-an-Mau-Toan-Lop-3.pdf';

    const tables = extractTables(parseResult.textItems);
    document.tables = tables;

    const validation = validateDocumentIR(document);
    if (!validation.valid) {
      logger.warn('Sample document validation warnings', { errors: validation.errors });
    }

    return NextResponse.json({
      success: true,
      document,
      rawText: parseResult.rawText,
      textCount: parseResult.textItems.length,
    });
  } catch (error) {
    logger.error('Failed to load sample PDF', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Không thể tải giáo án mẫu',
      },
      { status: 500 }
    );
  }
}
