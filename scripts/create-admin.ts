#!/usr/bin/env tsx
/**
 * Script tạo tài khoản Admin
 * Chạy: npx tsx scripts/create-admin.ts
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

function generateSecurePassword(length: number = 16): string {
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
  console.log("\n🔐 Script tạo tài khoản Admin\n");
  console.log("═".repeat(50));

  // Input thông tin
  const name = await question("Tên Admin (mặc định: 'Admin'): ") || "Admin";
  const email = await question("Email Admin (mặc định: 'admin@example.com'): ") || "admin@example.com";

  console.log("\nChọn cách tạo mật khẩu:");
  console.log("1. Tự nhập mật khẩu");
  console.log("2. Tự động sinh mật khẩu mạnh (16 ký tự)");

  const choice = await question("\nLựa chọn (1/2): ");

  let password: string;
  let showPassword = false;

  if (choice === "1") {
    password = await question("Nhập mật khẩu (ít nhất 8 ký tự): ");

    if (password.length < 8) {
      console.error("\n❌ Mật khẩu phải có ít nhất 8 ký tự!");
      process.exit(1);
    }
  } else {
    password = generateSecurePassword(16);
    showPassword = true;
    console.log("\n✅ Mật khẩu đã được tạo tự động.");
  }

  // Kiểm tra email đã tồn tại
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log(`\n⚠️  Email "${email}" đã tồn tại trong hệ thống.`);
    const overwrite = await question("Bạn có muốn cập nhật tài khoản này? (y/n): ");

    if (overwrite.toLowerCase() !== "y") {
      console.log("\n❌ Hủy bỏ.");
      rl.close();
      await prisma.$disconnect();
      process.exit(0);
    }
  }

  // Hash mật khẩu
  const hashedPassword = await bcrypt.hash(password, 10);

  // Tạo hoặc cập nhật Admin
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      email,
      name,
      password: hashedPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log("\n" + "═".repeat(50));
  console.log("✅ Tài khoản Admin đã được tạo thành công!");
  console.log("═".repeat(50));
  console.log(`📧 Email:    ${admin.email}`);
  console.log(`👤 Tên:      ${admin.name}`);
  console.log(`🔑 Role:     ${admin.role}`);
  console.log(`📊 Status:   ${admin.status}`);

  if (showPassword) {
    console.log("\n" + "⚠".repeat(25));
    console.log(`🔐 MẬT KHẨU: ${password}`);
    console.log("⚠".repeat(25));
    console.log("\n⚠️  LƯU Ý: Hãy lưu mật khẩu này ngay! Nó sẽ không hiển thị lại.");
  }

  console.log("\n💡 Khuyến nghị bảo mật:");
  console.log("   1. Đổi mật khẩu ngay sau lần đăng nhập đầu tiên");
  console.log("   2. Bật xác thực 2 yếu tố (2FA) nếu có");
  console.log("   3. KHÔNG chia sẻ thông tin đăng nhập này");
  console.log("   4. Sử dụng email doanh nghiệp, không dùng email cá nhân");

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
