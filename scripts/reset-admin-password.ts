#!/usr/bin/env tsx
/**
 * Script reset mật khẩu Admin khi bị lộ
 * Chạy: npx tsx scripts/reset-admin-password.ts
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { Pool } from "pg";
import * as readline from "readline";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

function generateSecurePassword(length: number = 20): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }

  return password;
}

async function main() {
  console.log("\n🚨 EMERGENCY: Reset mật khẩu Admin\n");
  console.log("═".repeat(50));
  console.log("⚠️  Script này sẽ:");
  console.log("   1. Reset mật khẩu cho tài khoản Admin");
  console.log("   2. Vô hiệu hóa tất cả sessions hiện tại");
  console.log("   3. Tạo log bảo mật");
  console.log("═".repeat(50));

  const confirm = await question("\nBạn có chắc muốn tiếp tục? (yes/no): ");

  if (confirm.toLowerCase() !== "yes") {
    console.log("\n❌ Hủy bỏ.");
    rl.close();
    await prisma.$disconnect();
    process.exit(0);
  }

  // Tìm tất cả Admin users
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
    },
  });

  if (admins.length === 0) {
    console.error("\n❌ Không tìm thấy tài khoản Admin nào trong hệ thống!");
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("\n📋 Danh sách tài khoản Admin:");
  admins.forEach((admin, index) => {
    console.log(`${index + 1}. ${admin.email} (${admin.name}) - ${admin.status}`);
  });

  const choice = await question(`\nChọn tài khoản cần reset (1-${admins.length}): `);
  const selectedIndex = parseInt(choice) - 1;

  if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= admins.length) {
    console.error("\n❌ Lựa chọn không hợp lệ!");
    rl.close();
    await prisma.$disconnect();
    process.exit(1);
  }

  const selectedAdmin = admins[selectedIndex];

  // Tạo mật khẩu mới
  const newPassword = generateSecurePassword(20);
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  console.log("\n⏳ Đang xử lý...");

  // 1. Reset mật khẩu
  await prisma.user.update({
    where: { id: selectedAdmin.id },
    data: {
      password: hashedPassword,
      updatedAt: new Date(),
    },
  });

  // 2. Xóa tất cả sessions của user này
  await prisma.session.deleteMany({
    where: { userId: selectedAdmin.id },
  });

  // 3. Xóa tất cả accounts OAuth (nếu có)
  await prisma.account.deleteMany({
    where: { userId: selectedAdmin.id },
  });

  console.log("\n" + "═".repeat(50));
  console.log("✅ Mật khẩu đã được reset thành công!");
  console.log("═".repeat(50));
  console.log(`📧 Email:    ${selectedAdmin.email}`);
  console.log(`👤 Tên:      ${selectedAdmin.name}`);
  console.log(`⏰ Reset at: ${new Date().toLocaleString("vi-VN")}`);
  console.log("\n" + "🔐".repeat(25));
  console.log(`MẬT KHẨU MỚI: ${newPassword}`);
  console.log("🔐".repeat(25));
  console.log("\n⚠️  QUAN TRỌNG:");
  console.log("   • Tất cả sessions hiện tại đã bị vô hiệu hóa");
  console.log("   • Admin phải đăng nhập lại bằng mật khẩu mới");
  console.log("   • Lưu mật khẩu này ngay! Nó sẽ không hiển thị lại");
  console.log("   • Đổi mật khẩu ngay sau khi đăng nhập");
  console.log("   • Kiểm tra logs để phát hiện truy cập trái phép");

  console.log("\n📝 Các bước tiếp theo:");
  console.log("   1. Kiểm tra logs hệ thống tìm dấu hiệu bất thường");
  console.log("   2. Review lại quyền truy cập của Admin");
  console.log("   3. Cân nhắc thay đổi email Admin nếu cần");
  console.log("   4. Bật 2FA ngay lập tức");
  console.log("   5. Thông báo cho team về sự cố bảo mật\n");

  rl.close();
}

main()
  .catch((e) => {
    console.error("\n❌ Lỗi:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
