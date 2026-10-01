#!/usr/bin/env tsx
/**
 * Script để remove tất cả isDraft field khỏi codebase
 * Chạy: npx tsx scripts/remove-isDraft.ts
 */

import * as fs from "fs";
import * as path from "path";

const filesToFix = [
  "src/features/questions/services/CategoryService.ts",
  "src/features/exams/services/ExamService.ts",
  "src/app/api/admin/questions/route.ts",
  "src/app/api/admin/questions/export/route.ts",
  "src/features/questions/services/ImportService.ts",
];

function removeIsDraftFromFile(filePath: string) {
  console.log(`\n📝 Đang xử lý: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File không tồn tại, bỏ qua.`);
    return;
  }

  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;

  // Pattern 1: where: { isDraft: false },
  if (content.includes("isDraft: false,")) {
    content = content.replace(/isDraft:\s*false,\s*/g, "");
    modified = true;
    console.log(`   ✅ Đã xóa: isDraft: false,`);
  }

  // Pattern 2: where: { isDraft: true },
  if (content.includes("isDraft: true,")) {
    content = content.replace(/isDraft:\s*true,\s*/g, "");
    modified = true;
    console.log(`   ✅ Đã xóa: isDraft: true,`);
  }

  // Pattern 3: isDraft,
  const isDraftInParamsRegex = /,?\s*isDraft[,\s]/g;
  if (isDraftInParamsRegex.test(content)) {
    content = content.replace(isDraftInParamsRegex, "");
    modified = true;
    console.log(`   ✅ Đã xóa: isDraft trong params`);
  }

  // Pattern 4: if (isDraft !== undefined) where.isDraft = isDraft;
  const isDraftAssignmentRegex = /if\s*\(\s*isDraft\s*!==\s*undefined\s*\)\s*where\.isDraft\s*=\s*isDraft;?\s*/g;
  if (isDraftAssignmentRegex.test(content)) {
    content = content.replace(isDraftAssignmentRegex, "");
    modified = true;
    console.log(`   ✅ Đã xóa: where.isDraft assignment`);
  }

  // Pattern 5: const isDraftStr = searchParams.get("isDraft");
  const isDraftGetRegex = /const\s+isDraftStr\s*=\s*searchParams\.get\("isDraft"\);?\s*/g;
  if (isDraftGetRegex.test(content)) {
    content = content.replace(isDraftGetRegex, "");
    modified = true;
    console.log(`   ✅ Đã xóa: isDraftStr getter`);
  }

  // Pattern 6: const isDraft = isDraftStr === "true" ? true : isDraftStr === "false" ? false : undefined;
  const isDraftParseRegex = /const\s+isDraft\s*=\s*isDraftStr\s*===\s*"true"\s*\?\s*true\s*:\s*isDraftStr\s*===\s*"false"\s*\?\s*false\s*:\s*undefined;?\s*/g;
  if (isDraftParseRegex.test(content)) {
    content = content.replace(isDraftParseRegex, "");
    modified = true;
    console.log(`   ✅ Đã xóa: isDraft parser`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`   💾 File đã được cập nhật`);
  } else {
    console.log(`   ℹ️  Không có thay đổi`);
  }
}

console.log("🚀 Bắt đầu xóa isDraft field khỏi codebase...\n");
console.log("═".repeat(60));

filesToFix.forEach(removeIsDraftFromFile);

console.log("\n" + "═".repeat(60));
console.log("✅ Hoàn tất!\n");
console.log("📝 Lưu ý:");
console.log("   - Các file frontend (page.tsx) cần sửa thủ công");
console.log("   - ImportService.ts cần review lại logic");
console.log("   - Chạy: npm run dev để kiểm tra\n");
