import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/lesson-plans/[id]/export - Export lesson plan to file
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Chưa đăng nhập" },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const body = await req.json();
    const format = body.format || "DOCX";
    const includeAnnotations = body.includeAnnotations || false;

    const lessonPlan = await prisma.lessonPlan.findUnique({
      where: { id },
      select: {
        userId: true,
        title: true,
        subject: true,
        gradeLevel: true,
        schoolYear: true,
        currentVersion: true,
        collaborators: {
          where: { userId: session.user.id },
        },
      },
    });

    if (!lessonPlan) {
      return NextResponse.json(
        { success: false, message: "Không tìm thấy giáo án" },
        { status: 404 }
      );
    }

    const isOwner = lessonPlan.userId === session.user.id;
    const isCollaborator = lessonPlan.collaborators.length > 0;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isCollaborator && !isAdmin) {
      return NextResponse.json(
        { success: false, message: "Không có quyền truy cập" },
        { status: 403 }
      );
    }

    const sections = await prisma.lessonPlanSection.findMany({
      where: {
        lessonPlanId: id,
        versionNumber: lessonPlan.currentVersion,
      },
      orderBy: { sectionOrder: "asc" },
    });

    // Fetch annotations if requested
    let annotations: any[] = [];
    if (includeAnnotations) {
      annotations = await prisma.annotation.findMany({
        where: {
          reviewResult: { lessonPlanId: id },
          status: { in: ["PENDING", "ACCEPTED"] },
        },
        include: {
          section: true,
          rule: true,
        },
        orderBy: { startPosition: "asc" },
      });
    }

    if (format === "DOCX") {
      // Build document sections with annotations
      const docChildren: Paragraph[] = [
        new Paragraph({
          text: lessonPlan.title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Môn học: " + (lessonPlan.subject ?? "N/A") + " | ",
            }),
            new TextRun({
              text: "Lớp: " + (lessonPlan.gradeLevel ?? "N/A") + " | ",
            }),
            new TextRun({
              text: "Năm học: " + (lessonPlan.schoolYear ?? "N/A"),
            }),
          ],
          alignment: AlignmentType.CENTER,
        }),
        new Paragraph({ text: "" }),
      ];

      // Add sections with annotations
      for (const section of sections) {
        docChildren.push(
          new Paragraph({
            text: section.sectionTitle ?? "",
            heading: HeadingLevel.HEADING_2,
          })
        );

        if (includeAnnotations) {
          const sectionAnnotations = annotations.filter(a => a.sectionId === section.id);

          if (sectionAnnotations.length > 0) {
            docChildren.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `[Có ${sectionAnnotations.length} nhận xét]`,
                    italics: true,
                    color: "FF6B6B",
                  }),
                ],
              })
            );
          }
        }

        docChildren.push(
          new Paragraph({
            text: section.rawContent ?? "",
          }),
          new Paragraph({ text: "" })
        );

        // Add annotations as comments
        if (includeAnnotations) {
          const sectionAnnotations = annotations.filter(a => a.sectionId === section.id);

          if (sectionAnnotations.length > 0) {
            docChildren.push(
              new Paragraph({
                text: "Nhận xét:",
                heading: HeadingLevel.HEADING_3,
              })
            );

            for (const annotation of sectionAnnotations) {
              docChildren.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `• [${annotation.severity}] `,
                      bold: true,
                      color: annotation.severity === "CRITICAL" ? "DC2626" :
                             annotation.severity === "ERROR" ? "EF4444" :
                             annotation.severity === "WARNING" ? "F59E0B" : "3B82F6",
                    }),
                    new TextRun({
                      text: annotation.issue,
                    }),
                  ],
                })
              );

              if (annotation.explanation) {
                docChildren.push(
                  new Paragraph({
                    text: `  Giải thích: ${annotation.explanation}`,
                    indent: { left: 720 },
                  })
                );
              }

              if (annotation.suggestion) {
                docChildren.push(
                  new Paragraph({
                    text: `  Đề xuất: ${annotation.suggestion}`,
                    indent: { left: 720 },
                  })
                );
              }

              docChildren.push(new Paragraph({ text: "" }));
            }
          }
        }
      }

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docChildren,
          },
        ],
      });

      const buffer = await Packer.toBuffer(doc);

      // Save to public/exports directory
      const exportsDir = join(process.cwd(), "public", "exports");
      if (!existsSync(exportsDir)) {
        await mkdir(exportsDir, { recursive: true });
      }

      const filename = `${lessonPlan.title.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.docx`;
      const filepath = join(exportsDir, filename);
      await writeFile(filepath, buffer);

      return NextResponse.json({
        success: true,
        message: "Export thành công",
        data: {
          downloadUrl: `/exports/${filename}`,
          filename,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Format không hợp lệ" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error exporting:", error);
    return NextResponse.json(
      { success: false, message: "Lỗi khi export" },
      { status: 500 }
    );
  }
}
