import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

async function main() {
  const lessonPlans = await prisma.lessonPlan.findMany({
    select: {
      id: true,
      title: true,
      filePath: true,
      originalFilename: true,
      mimeType: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // Group by file type
  const docx: any[] = [];
  const pdfText: any[] = [];
  const pdfScan: any[] = [];
  const images: any[] = [];

  for (const lp of lessonPlans) {
    const ext = lp.originalFilename?.toLowerCase() || '';
    if (ext.endsWith('.docx') || ext.endsWith('.doc')) {
      docx.push(lp);
    } else if (ext.endsWith('.pdf')) {
      pdfText.push(lp);
    } else if (ext.endsWith('.jpg') || ext.endsWith('.png') || ext.endsWith('.jpeg')) {
      images.push(lp);
    }
  }

  console.log('=== DOCX Files ===');
  console.log(JSON.stringify(docx.slice(0, 10), null, 2));

  console.log('\n=== PDF Files (first 15) ===');
  console.log(JSON.stringify(pdfText.slice(0, 15), null, 2));

  console.log('\n=== Image Files ===');
  console.log(JSON.stringify(images, null, 2));

  console.log('\n=== Summary ===');
  console.log(`DOCX: ${docx.length}`);
  console.log(`PDF: ${pdfText.length}`);
  console.log(`Images: ${images.length}`);
  console.log(`Total: ${lessonPlans.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
