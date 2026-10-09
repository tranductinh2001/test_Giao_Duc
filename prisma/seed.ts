import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  // Hash default passwords
  const adminPassword = await bcrypt.hash("admin12345", 10);
  const staffPassword = await bcrypt.hash("staff12345", 10);
  const userPassword = await bcrypt.hash("user12345", 10);

  // 1. Seed Users (3 Main Roles: Admin, Nhân viên, Khách hàng)
  const admin = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {},
    create: {
      email: "admin@gmail.com",
      name: "Quản Trị Viên (Admin)",
      password: adminPassword,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "nhanvien@gmail.com" },
    update: {},
    create: {
      email: "nhanvien@gmail.com",
      name: "Nhân Viên Thẩm Định (Cô Lan Anh)",
      password: staffPassword,
      role: "TEACHER",
      status: "ACTIVE",
      monthlyReviewsUsed: 12,
      licenseExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: "khachhang@gmail.com" },
    update: {},
    create: {
      email: "khachhang@gmail.com",
      name: "Khách Hàng (Học Viên Online)",
      password: userPassword,
      role: "LEARNER",
      status: "ACTIVE",
      monthlyReviewsUsed: 0,
      licenseExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days active license
    },
  });

  console.log("Users seeded successfully:", {
    admin: admin.email,
    staff: staff.email,
    customer: customer.email,
  });

  // 2. Seed Categories
  const generalKnowledge = await prisma.category.create({
    data: {
      name: "Kiến thức chung",
      description: "Các văn bản luật pháp, hệ thống chính trị, hiến pháp",
    },
  });

  const constitutionCategory = await prisma.category.create({
    data: {
      name: "Hiến pháp 2013",
      description: "Hiến pháp nước Cộng hòa xã hội chủ nghĩa Việt Nam",
      parentId: generalKnowledge.id,
    },
  });

  const civilServantLaw = await prisma.category.create({
    data: {
      name: "Luật Cán bộ, công chức 2008",
      description: "Luật Cán bộ, công chức số 22/2008/QH12 và sửa đổi 2019",
      parentId: generalKnowledge.id,
    },
  });

  console.log("Categories seeded successfully.");

  // 3. Seed Sample Questions & Choices
  await prisma.question.create({
    data: {
      content: "<p>Theo Hiến pháp 2013, nước Cộng hòa xã hội chủ nghĩa Việt Nam là một nước độc lập, có chủ quyền, thống nhất và toàn vẹn lãnh thổ bao gồm:</p>",
      explanation: "<p>Căn cứ Điều 1 Hiến pháp 2013 quy định đất nước bao gồm đất liền, hải đảo, vùng biển và vùng trời.</p>",
      difficulty: "EASY",
      categoryId: constitutionCategory.id,
      choices: {
        create: [
          { content: "Đất liền, hải đảo, vùng biển và vùng trời.", isCorrect: true },
          { content: "Đất liền, thềm lục địa, hải đảo và vùng biển.", isCorrect: false },
          { content: "Đất liền, vùng biển và vùng trời.", isCorrect: false },
          { content: "Đất liền, thềm lục địa và vùng trời.", isCorrect: false },
        ]
      }
    }
  });

  await prisma.question.create({
    data: {
      content: "<p>Theo Hiến pháp 2013, quyền lực nhà nước là thống nhất, có sự phân công, phối hợp, kiểm soát giữa:</p>",
      explanation: "<p>Điều 2 Hiến pháp 2013 quy định: Quyền lực nhà nước là thống nhất, có sự phân công, phối hợp, kiểm soát giữa các cơ quan nhà nước trong việc thực hiện các quyền lập pháp, hành pháp, tư pháp.</p>",
      difficulty: "MEDIUM",
      categoryId: constitutionCategory.id,
      choices: {
        create: [
          { content: "Các cơ quan nhà nước trong việc thực hiện các quyền lập pháp, hành pháp, tư pháp.", isCorrect: true },
          { content: "Đảng Cộng sản Việt Nam, Nhà nước và Mặt trận Tổ quốc.", isCorrect: false },
          { content: "Quốc hội, Chính phủ và Tòa án nhân dân tối cao.", isCorrect: false },
          { content: "Trung ương và địa phương trong bộ máy nhà nước.", isCorrect: false },
        ]
      }
    }
  });

  await prisma.question.create({
    data: {
      content: "<p>Hiến pháp 2013 quy định, công dân có quyền tự do tín ngưỡng, tôn giáo, theo hoặc không theo một tôn giáo nào. Việc thực hiện quyền này phải tuân theo:</p>",
      explanation: "<p>Điều 24 Hiến pháp 2013 quy định mọi người có quyền tự do tín ngưỡng, tôn giáo, theo hoặc không theo một tôn giáo nào. Các tôn giáo bình đẳng trước pháp luật. Nhà nước tôn trọng và bảo hộ quyền tự do tín ngưỡng, tôn giáo. Không ai được xâm phạm tự do tín ngưỡng, tôn giáo hoặc lợi dụng tín ngưỡng, tôn giáo để vi phạm pháp luật.</p>",
      difficulty: "EASY",
      categoryId: constitutionCategory.id,
      choices: {
        create: [
          { content: "Pháp luật", isCorrect: true },
          { content: "Quy định của tôn giáo", isCorrect: false },
          { content: "Truyền thống địa phương", isCorrect: false },
          { content: "Quyết định của chính quyền địa phương", isCorrect: false },
        ]
      }
    }
  });

  await prisma.question.create({
    data: {
      content: "<p>Theo Hiến pháp 2013, Quốc hội là cơ quan:</p>",
      explanation: "<p>Điều 69 Hiến pháp 2013 quy định: Quốc hội là cơ quan đại biểu cao nhất của nhân dân, cơ quan quyền lực nhà nước cao nhất của nước Cộng hòa xã hội chủ nghĩa Việt Nam.</p>",
      difficulty: "EASY",
      categoryId: constitutionCategory.id,
      choices: {
        create: [
          { content: "Đại biểu cao nhất của nhân dân, cơ quan quyền lực nhà nước cao nhất", isCorrect: true },
          { content: "Hành pháp cao nhất của nhà nước", isCorrect: false },
          { content: "Tư pháp cao nhất của nhà nước", isCorrect: false },
          { content: "Giám sát cao nhất của nhà nước", isCorrect: false },
        ]
      }
    }
  });

  await prisma.question.create({
    data: {
      content: "<p>Chủ tịch nước có quyền quyết định đại xá sau khi được phê chuẩn của:</p>",
      explanation: "<p>Điều 88 Hiến pháp 2013 quy định: Chủ tịch nước quyết định đại xá sau khi được Quốc hội phê chuẩn.</p>",
      difficulty: "MEDIUM",
      categoryId: constitutionCategory.id,
      choices: {
        create: [
          { content: "Quốc hội", isCorrect: true },
          { content: "Chính phủ", isCorrect: false },
          { content: "Ủy ban Thường vụ Quốc hội", isCorrect: false },
          { content: "Hội đồng Dân tộc", isCorrect: false },
        ]
      }
    }
  });

  await prisma.question.create({
    data: {
      content: "<p>Theo Luật Cán bộ, công chức 2008, nghĩa vụ của cán bộ, công chức đối với Đảng, Nhà nước và nhân dân bao gồm mấy nghĩa vụ chính?</p>",
      explanation: "<p>Căn cứ Điều 8 Luật Cán bộ, công chức 2008 quy định có 4 nghĩa vụ đối với Đảng, Nhà nước và nhân dân.</p>",
      difficulty: "MEDIUM",
      categoryId: civilServantLaw.id,
      choices: {
        create: [
          { content: "3 nghĩa vụ", isCorrect: false },
          { content: "4 nghĩa vụ", isCorrect: true },
          { content: "5 nghĩa vụ", isCorrect: false },
          { content: "6 nghĩa vụ", isCorrect: false },
        ]
      }
    }
  });

  await prisma.question.create({
    data: {
      content: "<p>Công chức phải có phẩm chất chính trị, đạo đức, có lối sống:</p>",
      explanation: "<p>Điều 4 Luật Cán bộ, công chức 2008 quy định: Công chức phải có phẩm chất chính trị, đạo đức; có lối sống lành mạnh, gương mẫu.</p>",
      difficulty: "EASY",
      categoryId: civilServantLaw.id,
      choices: {
        create: [
          { content: "Lành mạnh, gương mẫu", isCorrect: true },
          { content: "Giản dị, tiết kiệm", isCorrect: false },
          { content: "Khiêm tốn, chân thành", isCorrect: false },
          { content: "Tích cực, nhiệt tình", isCorrect: false },
        ]
      }
    }
  });

  await prisma.question.create({
    data: {
      content: "<p>Công chức được tuyển dụng, bổ nhiệm vào ngạch nào khi có đủ tiêu chuẩn, điều kiện theo quy định?</p>",
      explanation: "<p>Điều 17 Luật Cán bộ, công chức 2008 quy định: Công chức được tuyển dụng, bổ nhiệm vào ngạch tương ứng khi có đủ tiêu chuẩn, điều kiện theo quy định của Luật này và pháp luật có liên quan.</p>",
      difficulty: "EASY",
      categoryId: civilServantLaw.id,
      choices: {
        create: [
          { content: "Ngạch tương ứng với trình độ đào tạo", isCorrect: true },
          { content: "Ngạch cao nhất trong cơ quan", isCorrect: false },
          { content: "Ngạch mà cơ quan cần tuyển", isCorrect: false },
          { content: "Ngạch theo nguyện vọng cá nhân", isCorrect: false },
        ]
      }
    }
  });

  await prisma.question.create({
    data: {
      content: "<p>Công chức có quyền được nghỉ hằng năm, nghỉ lễ, tết theo quy định của:</p>",
      explanation: "<p>Điều 21 Luật Cán bộ, công chức 2008 quy định: Công chức có quyền được nghỉ hằng năm, nghỉ lễ, tết theo quy định của Bộ luật Lao động.</p>",
      difficulty: "EASY",
      categoryId: civilServantLaw.id,
      choices: {
        create: [
          { content: "Bộ luật Lao động", isCorrect: true },
          { content: "Luật Cán bộ, công chức", isCorrect: false },
          { content: "Quy chế của cơ quan", isCorrect: false },
          { content: "Quy định của Chính phủ", isCorrect: false },
        ]
      }
    }
  });

  await prisma.question.create({
    data: {
      content: "<p>Công chức không được thực hiện hành vi nào sau đây?</p>",
      explanation: "<p>Điều 20 Luật Cán bộ, công chức 2008 cấm công chức lợi dụng chức vụ, quyền hạn để thực hiện hành vi trái pháp luật, gây phiền hà, sách nhiễu, cản trở lợi ích hợp pháp của cơ quan, tổ chức, cá nhân; tham nhũng, lãng phí.</p>",
      difficulty: "MEDIUM",
      categoryId: civilServantLaw.id,
      choices: {
        create: [
          { content: "Lợi dụng chức vụ, quyền hạn để gây phiền hà, sách nhiễu", isCorrect: true },
          { content: "Tham gia các tổ chức chính trị - xã hội", isCorrect: false },
          { content: "Góp ý về chính sách, pháp luật", isCorrect: false },
          { content: "Học tập nâng cao trình độ", isCorrect: false },
        ]
      }
    }
  });

  console.log("Sample questions seeded successfully - 10 questions created.");

  // 4. Seed Sample Licenses
  await prisma.license.createMany({
    data: [
      { code: "VIC-8888-9999-0000", durationDays: 90, status: "UNUSED" },
      { code: "VIC-1111-2222-3333", durationDays: 180, status: "UNUSED" },
      { code: "VIC-5555-6666-7777", durationDays: 365, status: "UNUSED" },
    ],
  });

  console.log("Sample licenses seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
