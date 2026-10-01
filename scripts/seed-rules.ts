/**
 * Complete Seed Script for CV958 Template Rules
 * Creates ALL rules for all 16 sections: Parser, Structure, Content, Fix, Scoring
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function seed() {
  console.log("=== SEEDING COMPLETE CV958 RULES ===\n");

  try {
    // Get or find template
    const template = await prisma.rule_templates.findFirst({
      where: { code: "CV958" }
    });

    if (!template) {
      console.log("ERROR: Template CV958 not found. Please create it first.");
      process.exit(1);
    }

    const templateId = template.id;
    console.log(`Template: ${template.name} (${templateId})`);

    // Clear existing rules
    console.log("Clearing existing rules...");
    await prisma.section_parser_rules.deleteMany({ where: { templateId } });
    await prisma.section_structure_rules.deleteMany({ where: { templateId } });
    await prisma.section_content_rules.deleteMany({ where: { templateId } });
    await prisma.section_fix_rules.deleteMany({ where: { templateId } });
    await prisma.section_scoring_rules.deleteMany({ where: { templateId } });
    await prisma.rule_template_sections.deleteMany({ where: { templateId } });

    // Create sections with UUIDs
    const sectionIds: Record<string, string> = {};
    const sections = [
      { code: "MUC_TIEU", name: "Mục tiêu", order: 1 },
      { code: "PHAM_CHAT", name: "Phẩm chất", order: 2 },
      { code: "NANG_LUC_CHUNG", name: "Năng lực chung", order: 3 },
      { code: "NANG_LUC_DAC_THU", name: "Năng lực đặc thù", order: 4 },
      { code: "KIEN_THUC", name: "Kiến thức", order: 5 },
      { code: "KY_NANG", name: "Kỹ năng", order: 6 },
      { code: "THAI_DO", name: "Thái độ", order: 7 },
      { code: "THIET_BI", name: "Thiết bị dạy học", order: 8 },
      { code: "HOC_LIEU", name: "Học liệu", order: 9 },
      { code: "TIEN_TRINH", name: "Tiến trình dạy học", order: 10 },
      { code: "KHOI_DONG", name: "Khởi động", order: 11 },
      { code: "HINH_THANH_KT", name: "Hình thành kiến thức", order: 12 },
      { code: "LUYEN_TAP", name: "Luyện tập", order: 13 },
      { code: "VAN_DUNG", name: "Vận dụng", order: 14 },
      { code: "DANH_GIA", name: "Đánh giá", order: 15 },
      { code: "HUONG_DAN", name: "Hướng dẫn về nhà", order: 16 },
    ];

    console.log("Creating sections...");
    for (const s of sections) {
      const id = generateId();
      sectionIds[s.code] = id;
      await prisma.rule_template_sections.create({
        data: {
          id,
          templateId,
          code: s.code,
          name: s.name,
          order: s.order,
          level: 1,
          updatedAt: new Date(),
        }
      });
    }
    console.log(`Created ${sections.length} sections`);

    // ============================================================
    // PARSER RULES - 1 per section (16 rules)
    // ============================================================
    const parserRules = [
      { section: "MUC_TIEU", pattern: "mục tiêu", priority: 100, aliases: ["muc tieu", "yêu cầu cần đạt", "mục tiêu bài học"] },
      { section: "PHAM_CHAT", pattern: "phẩm chất", priority: 90, aliases: ["pham chat", "phẩm chất cần hình thành"] },
      { section: "NANG_LUC_CHUNG", pattern: "năng lực chung", priority: 90, aliases: ["nang luc chung", "năng lực chung"] },
      { section: "NANG_LUC_DAC_THU", pattern: "năng lực đặc thù", priority: 90, aliases: ["nang luc dac thu", "năng lực môn học"] },
      { section: "KIEN_THUC", pattern: "kiến thức", priority: 80, aliases: ["kien thuc", "nội dung kiến thức"] },
      { section: "KY_NANG", pattern: "kỹ năng", priority: 80, aliases: ["ky nang", "kỹ năng cần đạt"] },
      { section: "THAI_DO", pattern: "thái độ", priority: 80, aliases: ["thai do", "thái độ học tập"] },
      { section: "THIET_BI", pattern: "thiết bị dạy học", priority: 75, aliases: ["thiet bi day hoc", "đồ dùng dạy học", "phương tiện"] },
      { section: "HOC_LIEU", pattern: "học liệu", priority: 75, aliases: ["hoc lieu", "sách giáo khoa", "tài liệu tham khảo"] },
      { section: "TIEN_TRINH", pattern: "tiến trình dạy học", priority: 70, aliases: ["tien trinh day hoc", "hoạt động dạy học", "quy trình"] },
      { section: "KHOI_DONG", pattern: "khởi động", priority: 85, aliases: ["khoi dong", "mở đầu", "hoạt động khởi động"] },
      { section: "HINH_THANH_KT", pattern: "hình thành kiến thức", priority: 80, aliases: ["hinh thanh kien thuc", "hoạt động hình thành"] },
      { section: "LUYEN_TAP", pattern: "luyện tập", priority: 80, aliases: ["luyen tap", "thực hành", "bài tập"] },
      { section: "VAN_DUNG", pattern: "vận dụng", priority: 80, aliases: ["van dung", "áp dụng", "liên hệ thực tế"] },
      { section: "DANH_GIA", pattern: "đánh giá", priority: 80, aliases: ["danh gia", "kiểm tra", "đánh giá kết quả"] },
      { section: "HUONG_DAN", pattern: "hướng dẫn về nhà", priority: 75, aliases: ["huong dan ve nha", "dặn dò", "bài tập về nhà"] },
    ];

    console.log("Creating parser rules...");
    for (const r of parserRules) {
      const sectionId = sectionIds[r.section];
      if (!sectionId) continue;

      await prisma.section_parser_rules.create({
        data: {
          id: generateId(),
          templateId,
          sectionId,
          type: "KEYWORD",
          pattern: r.pattern,
          priority: r.priority,
          confidence: 0.85,
          ignoreCase: true,
          ignoreAccent: true,
          ignoreSpace: false,
          normalizeText: true,
          aliases: r.aliases,
          isActive: true,
          updatedAt: new Date(),
        }
      });
    }
    console.log(`Created ${parserRules.length} parser rules`);

    // ============================================================
    // STRUCTURE RULES - 2 per section (32 rules)
    // ============================================================
    const structureRules = [];
    for (const s of sections) {
      const sectionId = sectionIds[s.code];
      // Rule 1: Section exists (use HEADING for presence)
      structureRules.push({
        section: s.code,
        sectionId,
        code: `${s.code}_EXISTS`,
        name: `${s.name} tồn tại`,
        description: `Kiểm tra xem phần ${s.name} có trong giáo án không`,
        type: "HEADING",
        severity: s.code === "MUC_TIEU" || s.code === "TIEN_TRINH" ? "ERROR" : "WARNING",
        penaltyScore: 5,
      });
      // Rule 2: Has content
      structureRules.push({
        section: s.code,
        sectionId,
        code: `${s.code}_HAS_CONTENT`,
        name: `${s.name} có nội dung`,
        description: `Kiểm tra phần ${s.name} có nội dung không trống`,
        type: "FORMAT",
        severity: "WARNING",
        penaltyScore: 3,
      });
    }

    console.log("Creating structure rules...");
    for (const r of structureRules) {
      await prisma.section_structure_rules.create({
        data: {
          id: generateId(),
          templateId,
          sectionId: r.sectionId,
          code: r.code,
          name: r.name,
          description: r.description,
          type: r.type as any,
          severity: r.severity as any,
          penaltyScore: r.penaltyScore,
          isActive: true,
          updatedAt: new Date(),
        }
      });
    }
    console.log(`Created ${structureRules.length} structure rules`);

    // ============================================================
    // CONTENT RULES - 1-2 per section (18 rules)
    // ============================================================
    const contentRules = [
      // MUC_TIEU - Objectives (2 rules)
      { section: "MUC_TIEU", sectionId: sectionIds["MUC_TIEU"], code: "MUC_TIEU_KT", name: "Mục tiêu có kiến thức", description: "Kiểm tra mục tiêu về kiến thức", checkType: "PRESENCE", severity: "ERROR", systemPrompt: "Bạn là chuyên gia đánh giá giáo án. Hãy kiểm tra nội dung mục tiêu bài học.", userPrompt: "Phần mục tiêu có đề cập đến KIẾN THỨC cần đạt được không? Kiến thức là những gì học sinh cần biết, hiểu, nhớ được.", penaltyScore: 15 },
      { section: "MUC_TIEU", sectionId: sectionIds["MUC_TIEU"], code: "MUC_TIEU_KN", name: "Mục tiêu có kỹ năng", description: "Kiểm tra mục tiêu về kỹ năng", checkType: "PRESENCE", severity: "ERROR", systemPrompt: "Bạn là chuyên gia đánh giá giáo án. Hãy kiểm tra nội dung mục tiêu bài học.", userPrompt: "Phần mục tiêu có đề cập đến KỸ NĂNG cần đạt được không? Kỹ năng là những gì học sinh cần làm được, thực hiện được.", penaltyScore: 15 },
      // PHAM_CHAT - Qualities (1 rule)
      { section: "PHAM_CHAT", sectionId: sectionIds["PHAM_CHAT"], code: "PHAM_CHAT_EXISTS", name: "Có phẩm chất", description: "Kiểm tra phần phẩm chất", checkType: "PRESENCE", severity: "WARNING", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần PHẨM CHẤT có nội dung không? Các phẩm chất cần phát triển: yêu nước, nhân ái, chăm chỉ, trách nhiệm, trung thực, chăm sóc.", penaltyScore: 10 },
      // NANG_LUC_CHUNG - Core competencies (1 rule)
      { section: "NANG_LUC_CHUNG", sectionId: sectionIds["NANG_LUC_CHUNG"], code: "NANG_LUC_CHUNG_EXISTS", name: "Có năng lực chung", description: "Kiểm tra phần năng lực chung", checkType: "PRESENCE", severity: "WARNING", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần NĂNG LỰC CHUNG có nội dung không? Các năng lực chung: tự chủ và tự học, giao tiếp và hợp tác, giải quyết vấn đề và sáng tạo.", penaltyScore: 10 },
      // NANG_LUC_DAC_THU - Specific competencies (1 rule)
      { section: "NANG_LUC_DAC_THU", sectionId: sectionIds["NANG_LUC_DAC_THU"], code: "NANG_LUC_DAC_THU_EXISTS", name: "Có năng lực đặc thù", description: "Kiểm tra phần năng lực đặc thù", checkType: "PRESENCE", severity: "WARNING", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần NĂNG LỰC ĐẶC THÙ có nội dung không? Năng lực đặc thù là năng lực đặc trưng của từng môn học.", penaltyScore: 10 },
      // KIEN_THUC - Knowledge (1 rule)
      { section: "KIEN_THUC", sectionId: sectionIds["KIEN_THUC"], code: "KIEN_THUC_EXISTS", name: "Có kiến thức", description: "Kiểm tra phần kiến thức", checkType: "PRESENCE", severity: "WARNING", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần KIẾN THỨC có nội dung không? Kiến thức là nội dung bài học mà học sinh cần tiếp nhận.", penaltyScore: 5 },
      // KY_NANG - Skills (1 rule)
      { section: "KY_NANG", sectionId: sectionIds["KY_NANG"], code: "KY_NANG_EXISTS", name: "Có kỹ năng", description: "Kiểm tra phần kỹ năng", checkType: "PRESENCE", severity: "WARNING", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần KỸ NĂNG có nội dung không? Kỹ năng là những gì học sinh cần thực hành, luyện tập.", penaltyScore: 5 },
      // THAI_DO - Attitude (1 rule)
      { section: "THAI_DO", sectionId: sectionIds["THAI_DO"], code: "THAI_DO_EXISTS", name: "Có thái độ", description: "Kiểm tra phần thái độ", checkType: "PRESENCE", severity: "INFO", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần THÁI ĐỘ có nội dung không? Thái độ là thói quen, đức tính cần hình thành ở học sinh.", penaltyScore: 3 },
      // THIET_BI - Teaching aids (1 rule)
      { section: "THIET_BI", sectionId: sectionIds["THIET_BI"], code: "THIET_BI_EXISTS", name: "Có thiết bị dạy học", description: "Kiểm tra phần thiết bị", checkType: "PRESENCE", severity: "WARNING", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần THIẾT BỊ DẠY HỌC có nội dung không? Liệt kê các thiết bị, đồ dùng cần chuẩn bị.", penaltyScore: 5 },
      // HOC_LIEU - Materials (1 rule)
      { section: "HOC_LIEU", sectionId: sectionIds["HOC_LIEU"], code: "HOC_LIEU_EXISTS", name: "Có học liệu", description: "Kiểm tra phần học liệu", checkType: "PRESENCE", severity: "WARNING", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần HỌC LIỆU có nội dung không? Học liệu: sách giáo khoa, tài liệu, video, website.", penaltyScore: 5 },
      // TIEN_TRINH - Teaching process (1 rule)
      { section: "TIEN_TRINH", sectionId: sectionIds["TIEN_TRINH"], code: "TIEN_TRINH_TIME", name: "Tiến trình có thời gian", description: "Kiểm tra tiến trình có phân bổ thời gian", checkType: "PRESENCE", severity: "ERROR", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần TIẾN TRÌNH DẠY HỌC có ghi rõ THỜI GIAN cho từng hoạt động không? (ví dụ: 5 phút, 10 phút)", penaltyScore: 15 },
      // KHOI_DONG - Warm up (1 rule)
      { section: "KHOI_DONG", sectionId: sectionIds["KHOI_DONG"], code: "KHOI_DONG_EXISTS", name: "Có hoạt động khởi động", description: "Kiểm tra phần khởi động", checkType: "PRESENCE", severity: "INFO", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần KHỞI ĐỘNG có nội dung hoạt động không? Hoạt động khởi động tạo hứng thú cho bài học.", penaltyScore: 3 },
      // HINH_THANH_KT - Knowledge formation (1 rule)
      { section: "HINH_THANH_KT", sectionId: sectionIds["HINH_THANH_KT"], code: "HINH_THANH_KT_EXISTS", name: "Có hoạt động hình thành kiến thức", description: "Kiểm tra phần hình thành kiến thức", checkType: "PRESENCE", severity: "WARNING", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần HÌNH THÀNH KIẾN THỨC có nội dung hoạt động không? Đây là phần học sinh tìm hiểu kiến thức mới.", penaltyScore: 10 },
      // LUYEN_TAP - Practice (1 rule)
      { section: "LUYEN_TAP", sectionId: sectionIds["LUYEN_TAP"], code: "LUYEN_TAP_EXISTS", name: "Có hoạt động luyện tập", description: "Kiểm tra phần luyện tập", checkType: "PRESENCE", severity: "WARNING", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần LUYỆN TẬP có nội dung bài tập, hoạt động thực hành không?", penaltyScore: 10 },
      // VAN_DUNG - Application (1 rule)
      { section: "VAN_DUNG", sectionId: sectionIds["VAN_DUNG"], code: "VAN_DUNG_EXISTS", name: "Có hoạt động vận dụng", description: "Kiểm tra phần vận dụng", checkType: "PRESENCE", severity: "INFO", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần VẬN DỤNG có nội dung hoạt động vận dụng kiến thức không?", penaltyScore: 3 },
      // DANH_GIA - Assessment (1 rule)
      { section: "DANH_GIA", sectionId: sectionIds["DANH_GIA"], code: "DANH_GIA_CRITERIA", name: "Đánh giá có tiêu chí", description: "Kiểm tra phần đánh giá có tiêu chí", checkType: "PRESENCE", severity: "ERROR", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần ĐÁNH GIÁ có nội dung và TIÊU CHÍ cụ thể không?", penaltyScore: 15 },
      // HUONG_DAN - Home work (1 rule)
      { section: "HUONG_DAN", sectionId: sectionIds["HUONG_DAN"], code: "HUONG_DAN_EXISTS", name: "Có hướng dẫn về nhà", description: "Kiểm tra phần hướng dẫn về nhà", checkType: "PRESENCE", severity: "INFO", systemPrompt: "Bạn là chuyên gia đánh giá giáo án.", userPrompt: "Phần HƯỚNG DẪN VỀ NHÀ có nội dung bài tập về nhà không?", penaltyScore: 3 },
    ];

    console.log("Creating content rules...");
    for (const r of contentRules) {
      await prisma.section_content_rules.create({
        data: {
          id: generateId(),
          templateId,
          sectionId: r.sectionId,
          code: r.code,
          name: r.name,
          description: r.description,
          checkType: r.checkType as any,
          severity: r.severity as any,
          systemPrompt: r.systemPrompt,
          userPrompt: r.userPrompt,
          penaltyScore: r.penaltyScore,
          isActive: true,
          aiModel: "gemini-3.1-flash-lite",
          useAI: true,
          updatedAt: new Date(),
        }
      });
    }
    console.log(`Created ${contentRules.length} content rules`);

    // ============================================================
    // FIX RULES - 1 per section (16 rules)
    // ============================================================
    const fixRules = sections.map(s => ({
      code: `FIX_${s.code}`,
      name: `Sửa ${s.name}`,
      description: `Đề xuất sửa nội dung phần ${s.name}`,
      issueType: s.code,
      instructions: `Hướng dẫn sửa nội dung phần ${s.name} trong giáo án`,
    }));

    console.log("Creating fix rules...");
    for (const r of fixRules) {
      await prisma.section_fix_rules.create({
        data: {
          id: generateId(),
          templateId,
          code: r.code,
          name: r.name,
          description: r.description,
          issueType: r.issueType,
          issueSeverity: "WARNING",
          fixType: "MANUAL",
          instructions: r.instructions,
          isActive: true,
          aiModel: "gemini-3.1-flash-lite",
          updatedAt: new Date(),
        }
      });
    }
    console.log(`Created ${fixRules.length} fix rules`);

    // ============================================================
    // SCORING RULES - 2 per section (32 rules)
    // ============================================================
    const scoringRules = [];
    for (const s of sections) {
      // Missing section penalty
      scoringRules.push({
        code: `SCORE_${s.code}_MISSING`,
        name: `${s.name} thiếu`,
        description: `Trừ điểm nếu phần ${s.name} trống`,
        issueType: s.code,
        severity: s.code === "MUC_TIEU" || s.code === "TIEN_TRINH" || s.code === "DANH_GIA" ? "ERROR" : "WARNING",
        penalty: s.code === "MUC_TIEU" || s.code === "TIEN_TRINH" || s.code === "DANH_GIA" ? 10 : 5,
      });
      // Empty content penalty
      scoringRules.push({
        code: `SCORE_${s.code}_EMPTY`,
        name: `${s.name} trống`,
        description: `Trừ điểm nếu phần ${s.name} không có nội dung`,
        issueType: s.code,
        severity: "WARNING",
        penalty: 3,
      });
    }

    console.log("Creating scoring rules...");
    for (const r of scoringRules) {
      await prisma.section_scoring_rules.create({
        data: {
          id: generateId(),
          templateId,
          code: r.code,
          name: r.name,
          description: r.description,
          issueType: r.issueType,
          severity: r.severity as any,
          penalty: r.penalty,
          isActive: true,
          updatedAt: new Date(),
        }
      });
    }
    console.log(`Created ${scoringRules.length} scoring rules`);

    console.log("\n=== SEED COMPLETE ===");

    // Verify
    const counts = {
      sections: await prisma.rule_template_sections.count({ where: { templateId } }),
      parserRules: await prisma.section_parser_rules.count({ where: { templateId } }),
      structureRules: await prisma.section_structure_rules.count({ where: { templateId } }),
      contentRules: await prisma.section_content_rules.count({ where: { templateId } }),
      fixRules: await prisma.section_fix_rules.count({ where: { templateId } }),
      scoringRules: await prisma.section_scoring_rules.count({ where: { templateId } }),
    };

    console.log("\nVerification:");
    console.log(`  Sections: ${counts.sections}`);
    console.log(`  Parser Rules: ${counts.parserRules} (1 per section)`);
    console.log(`  Structure Rules: ${counts.structureRules} (2 per section)`);
    console.log(`  Content Rules: ${counts.contentRules} (AI-powered)`);
    console.log(`  Fix Rules: ${counts.fixRules} (1 per section)`);
    console.log(`  Scoring Rules: ${counts.scoringRules} (2 per section)`);
    console.log(`  Total: ${counts.parserRules + counts.structureRules + counts.contentRules + counts.fixRules + counts.scoringRules} rules`);

    const totalPerSection = 1 + 2 + Math.ceil(contentRules.length / sections.length) + 1 + 2;
    console.log(`\nRules per section: ~${totalPerSection} (5 rule types)`);
    console.log(`Expected coverage: 100% (all 16 sections have all rule types)`);

  } catch (error) {
    console.error("Seed error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
