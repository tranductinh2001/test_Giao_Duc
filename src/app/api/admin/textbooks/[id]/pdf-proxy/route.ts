import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get book info from database
    const book = await prisma.textbookBook.findUnique({
      where: { id },
    });

    if (!book || !book.pdfPath) {
      return NextResponse.json(
        { success: false, message: "PDF not found" },
        { status: 404 }
      );
    }

    // Resolve the PDF file path
    const pdfPath = path.join(process.cwd(), book.pdfPath);

    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { success: false, message: "PDF file not found on disk" },
        { status: 404 }
      );
    }

    // Read and serve the PDF
    const fileBuffer = fs.readFileSync(pdfPath);

    // Encode filename for proper UTF-8 support
    const filename = book.name.replace(/[^\x00-\x7F]/g, '_');
    const encodedFilename = encodeURIComponent(book.name);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}.pdf"; filename*=UTF-8''${encodedFilename}`,
        "Content-Security-Policy": "frame-ancestors *",
        "X-Frame-Options": "ALLOWALL",
      },
    });
  } catch (error) {
    console.error("PDF proxy error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, message: "Error loading PDF: " + message },
      { status: 500 }
    );
  }
}
