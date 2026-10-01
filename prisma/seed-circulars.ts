import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const CIRCULAR_5512_CONTENT = `THÔNG TƯ 32/2018/TT-BGDĐT
BAN HÀNH CHƯƠNG TRÌNH GIÁO DỤC PHỔ THÔNG

Căn cứ Luật Giáo dục ngày 14 tháng 6 năm 2005; Luật sửa đổi, bổ sung một số điều của Luật Giáo dục ngày 25 tháng 11 năm 2009;

Căn cứ Nghị định số 32/2008/NĐ-CP ngày 19 tháng 3 năm 2008 của Chính phủ quy định chức năng, nhiệm vụ, quyền hạn và cơ cấu tổ chức của Bộ Giáo dục và Đào tạo;

Căn cứ Nghị định số 16/2015/NĐ-CP ngày 14 tháng 02 năm 2015 của Chính phủ về việc ban hành Quy chế tổ chức và hoạt động của Hội đồng Quốc gia thẩm định chương trình giáo dục phổ thông;

Theo đề nghị của Vụ trưởng Vụ Giáo dục Trung học;

Bộ trưởng Bộ Giáo dục và Đào tạo ban hành Thông tư ban hành chương trình giáo dục phổ thông.

CHƯƠNG I: QUY ĐỊNH CHUNG

Điều 1. Phạm vi điều chỉnh và đối tượng áp dụng

1. Thông tư này quy định về chương trình giáo dục phổ thông, bao gồm: chương trình tổng thể và chương trình các môn học, hoạt động giáo dục.

2. Thông tư này áp dụng đối với: cơ sở giáo dục phổ thông; cơ quan quản lý giáo dục; tổ chức, cá nhân có liên quan đến hoạt động giáo dục phổ thông.

Điều 2. Mục tiêu của chương trình giáo dục phổ thông

1. Phát triển phẩm chất và năng lực học sinh, chuẩn bị cho học sinh có khả năng học tập suốt đời và phát triển nghề nghiệp.

2. Hình thành và phát triển ở học sinh những phẩm chất chủ yếu: yêu nước, nhân ái, chăm chỉ, trung thực, trách nhiệm.

3. Hình thành và phát triển ở học sinh những năng lực chung: tự chủ và tự học, giao tiếp và hợp tác, giải quyết vấn đề và sáng tạo.

4. Hình thành và phát triển ở học sinh những năng lực đặc thù của từng môn học.

CHƯƠNG II: CẤU TRÚC CHƯƠNG TRÌNH GIÁO DỤC PHỔ THÔNG

Điều 3. Cấu trúc chương trình

1. Chương trình giáo dục phổ thông bao gồm: chương trình giáo dục tiểu học (lớp 1 đến lớp 5); chương trình giáo dục trung học cơ sở (lớp 6 đến lớp 9); chương trình giáo dục trung học phổ thông (lớp 10 đến lớp 12).

2. Chương trình mỗi cấp học gồm:
   a) Các môn học bắt buộc
   b) Các môn học tự chọn hoặc hoạt động giáo dục
   c) Nội dung giáo dục địa phương

Điều 4. Các môn học và hoạt động giáo dục

Cấp Tiểu học:
- Tiếng Việt
- Toán
- Ngoại ngữ (từ lớp 3)
- Đạo đức
- Tự nhiên và Xã hội
- Lịch sử và Địa lí (lớp 4, 5)
- Khoa học (lớp 4, 5)
- Tin học và Công nghệ
- Giáo dục thể chất
- Nghệ thuật (Âm nhạc, Mĩ thuật)
- Hoạt động trải nghiệm

CHƯƠNG III: NỘI DUNG GIÁO DỤC

Điều 5. Yêu cầu về nội dung giáo dục

1. Nội dung giáo dục phải đảm bảo tính phổ thông, hiện đại, thiết thực, hệ thống; có tính liên thông giữa các cấp học và các môn học.

2. Nội dung giáo dục phải bảo đảm cân bằng giữa kiến thức, kĩ năng và thái độ; phù hợp với tâm sinh lý lứa tuổi học sinh.

3. Nội dung giáo dục phải đáp ứng mục tiêu giáo dục; phát huy cao nhất khả năng tự học, sáng tạo của học sinh.

Điều 6. Phương pháp giáo dục

1. Phát huy tính tích cực, tự giác, chủ động, sáng tạo của học sinh; phù hợp với đặc điểm của từng lớp học, môn học.

2. Bồi dưỡng phương pháp tự học, khả năng làm việc theo nhóm; rèn luyện kĩ năng vận dụng kiến thức vào thực tiễn; tác động đến tình cảm, đem lại niềm vui, hứng thú học tập cho học sinh.

3. Phát triển năng lực toàn diện, cá tính học sinh; khuyến khích học sinh phát triển năng khiếu, sở trường.

CHƯƠNG IV: ĐÁNH GIÁ GIÁO DỤC

Điều 7. Nguyên tắc đánh giá

1. Đánh giá dựa trên yêu cầu cần đạt về phẩm chất và năng lực của học sinh.

2. Đánh giá toàn diện, chính xác, công bằng, khách quan, trung thực.

3. Đánh giá thường xuyên, liên tục trong quá trình giáo dục; kết hợp đánh giá của giáo viên với tự đánh giá và đánh giá của bạn học.

Điều 8. Hình thức và phương pháp đánh giá

1. Đánh giá thường xuyên: kiểm tra miệng, kiểm tra viết, làm bài tập, thực hành, thí nghiệm.

2. Đánh giá định kì: kiểm tra giữa học kì, kiểm tra cuối học kì; kiểm tra cuối năm học.

3. Phương pháp đánh giá: quan sát, phỏng vấn, viết, thực hành; đánh giá theo nhận xét, theo điểm số.

CHƯƠNG V: ĐIỀU KHOẢN THI HÀNH

Điều 9. Trách nhiệm tổ chức thực hiện

1. Sở Giáo dục và Đào tạo có trách nhiệm:
   - Triển khai chương trình giáo dục phổ thông tại địa phương
   - Hướng dẫn, kiểm tra, giám sát việc thực hiện chương trình
   - Tổ chức bồi dưỡng giáo viên, cán bộ quản lí

2. Các cơ sở giáo dục phổ thông có trách nhiệm:
   - Tổ chức thực hiện đầy đủ, nghiêm túc chương trình
   - Xây dựng kế hoạch giáo dục phù hợp
   - Tạo điều kiện cho giáo viên và học sinh thực hiện chương trình

Điều 10. Hiệu lực thi hành

Thông tư này có hiệu lực từ ngày 01 tháng 8 năm 2020.

Bộ trưởng
Phùng Xuân Nhạ`;

const CIRCULAR_2345_CONTENT = `CÔNG VĂN 2345/BGDĐT-GDTrH
VỀ HƯỚNG DẪN THỰC HIỆN CHƯƠNG TRÌNH GIÁO DỤC TIỂU HỌC

Kính gửi: Sở Giáo dục và Đào tạo các tỉnh, thành phố trực thuộc Trung ương

Thực hiện Thông tư 32/2018/TT-BGDĐT ngày 26 tháng 12 năm 2018 của Bộ trưởng Bộ Giáo dục và Đào tạo ban hành chương trình giáo dục phổ thông, Bộ Giáo dục và Đào tạo hướng dẫn Sở Giáo dục và Đào tạo các tỉnh, thành phố về việc tổ chức thực hiện chương trình giáo dục tiểu học như sau:

I. MỤC ĐÍCH, YÊU CẦU

1. Mục đích
- Hướng dẫn các địa phương, cơ sở giáo dục triển khai chương trình giáo dục tiểu học đảm bảo đúng định hướng, mục tiêu.
- Tạo điều kiện thuận lợi cho giáo viên, học sinh thực hiện chương trình hiệu quả.

2. Yêu cầu
- Đảm bảo thực hiện đầy đủ, nghiêm túc các quy định của chương trình.
- Linh hoạt, sáng tạo trong tổ chức dạy học phù hợp với điều kiện thực tế.
- Lấy phát triển phẩm chất, năng lực học sinh làm trọng tâm.

II. NỘI DUNG HƯỚNG DẪN

1. Về tổ chức dạy học

a) Lập kế hoạch giáo dục:
- Căn cứ chương trình, giáo viên xây dựng kế hoạch giáo dục cả năm, kế hoạch học kì, tuần, ngày.
- Kế hoạch cần thể hiện rõ mục tiêu phát triển phẩm chất, năng lực; nội dung dạy học; phương pháp, hình thức tổ chức; đánh giá kết quả.

b) Thiết kế bài dạy:
- Xác định rõ yêu cầu cần đạt về phẩm chất, năng lực.
- Lựa chọn phương pháp dạy học tích cực, phù hợp với nội dung, đối tượng học sinh.
- Thiết kế các hoạt động học tập giúp học sinh tích cực, chủ động trong học tập.
- Chuẩn bị đầy đủ phương tiện, tài liệu dạy học.

c) Tổ chức hoạt động dạy học:
- Tạo không khí học tập thoải mái, vui vẻ, tin cậy; khơi dậy hứng thú, động lực học tập.
- Tổ chức các hoạt động học tập đa dạng: cá nhân, nhóm, cả lớp.
- Khuyến khích học sinh đặt câu hỏi, trao đổi, tranh luận, sáng tạo.
- Quan tâm đến sự khác biệt của từng học sinh; có phương pháp hỗ trợ học sinh yếu, phát triển học sinh khá, giỏi.

2. Về đánh giá kết quả học tập

a) Đánh giá thường xuyên:
- Đánh giá quá trình học tập của học sinh qua các hoạt động: trả lời câu hỏi, thảo luận nhóm, làm bài tập, thực hành.
- Ghi nhận kịp thời những tiến bộ, khuyến khích, động viên học sinh.
- Phát hiện khó khăn, hạn chế để có biện pháp hỗ trợ kịp thời.

b) Đánh giá định kì:
- Đánh giá giữa học kì, cuối học kì bằng nhiều hình thức: viết, nói, thực hành.
- Nội dung đánh giá tập trung vào phẩm chất, năng lực học sinh.
- Đảm bảo đánh giá toàn diện, chính xác, công bằng.

c) Nhận xét, xếp loại:
- Nhận xét học sinh theo các tiêu chí về phẩm chất, năng lực.
- Xếp loại học lực: Hoàn thành tốt, Hoàn thành, Chưa hoàn thành.
- Xếp loại hạnh kiểm: Tốt, Khá, Đạt.

3. Về sử dụng sách giáo khoa, tài liệu

a) Sách giáo khoa:
- Sử dụng sách giáo khoa do Bộ Giáo dục và Đào tạo phê duyệt.
- Không sử dụng các tài liệu không được phê duyệt trong dạy học chính khóa.

b) Tài liệu tham khảo:
- Giáo viên có thể sử dụng các tài liệu tham khảo phù hợp để nâng cao chất lượng dạy học.
- Khuyến khích học sinh đọc sách, tài liệu ngoại khóa phù hợp lứa tuổi.

4. Về cơ sở vật chất, thiết bị dạy học

a) Phòng học:
- Bố trí phòng học sáng, thoáng, đủ diện tích theo quy định.
- Trang bị bàn ghế phù hợp với lứa tuổi học sinh.
- Trang trí phòng học tạo môi trường học tập thân thiện, sinh động.

b) Thiết bị dạy học:
- Trang bị đầy đủ thiết bị, đồ dùng dạy học theo quy định.
- Sử dụng hiệu quả các thiết bị công nghệ thông tin trong dạy học.
- Xây dựng, khai thác thư viện phục vụ dạy và học.

III. TỔ CHỨC THỰC HIỆN

1. Sở Giáo dục và Đào tạo

- Xây dựng kế hoạch triển khai chương trình phù hợp với điều kiện địa phương.
- Tổ chức bồi dưỡng giáo viên, cán bộ quản lí về chương trình, phương pháp dạy học.
- Kiểm tra, giám sát, đánh giá việc thực hiện chương trình tại các cơ sở giáo dục.
- Hỗ trợ các trường có điều kiện khó khăn trong việc thực hiện chương trình.

2. Các trường tiểu học

- Xây dựng kế hoạch giáo dục năm học, học kì, tuần cụ thể.
- Tổ chức các hoạt động chuyên môn: tập huấn, sinh hoạt tổ chuyên môn, dự giờ, rút kinh nghiệm.
- Tạo điều kiện cho giáo viên tham gia bồi dưỡng, học tập nâng cao trình độ.
- Thực hiện tốt công tác đánh giá học sinh theo quy định.
- Phối hợp với gia đình học sinh trong việc giáo dục, chăm sóc học sinh.

3. Giáo viên

- Nghiên cứu kĩ chương trình, sách giáo khoa, tài liệu hướng dẫn.
- Xây dựng kế hoạch giáo dục, thiết kế bài dạy cẩn thận, đầy đủ.
- Tổ chức dạy học theo phương pháp tích cực, lấy học sinh làm trung tâm.
- Đánh giá học sinh toàn diện, chính xác, công bằng.
- Không ngừng học tập, bồi dưỡng nâng cao năng lực chuyên môn, nghiệp vụ.

IV. KIỂM TRA, ĐÁNH GIÁ

1. Nội dung kiểm tra, đánh giá

- Việc tổ chức thực hiện chương trình tại các cơ sở giáo dục.
- Kết quả phát triển phẩm chất, năng lực học sinh.
- Hiệu quả của các biện pháp hỗ trợ, bồi dưỡng giáo viên.

2. Hình thức kiểm tra, đánh giá

- Kiểm tra định kì và đột xuất.
- Giám sát qua hồ sơ, tài liệu và dự giờ.
- Khảo sát, đánh giá học sinh.

3. Xử lí kết quả

- Tổng hợp, phân tích kết quả kiểm tra, đánh giá.
- Kịp thời biểu dương những tập thể, cá nhân thực hiện tốt.
- Chỉ ra những tồn tại, hạn chế và đề ra biện pháp khắc phục.

Trên đây là hướng dẫn của Bộ Giáo dục và Đào tạo về việc thực hiện chương trình giáo dục tiểu học. Đề nghị Sở Giáo dục và Đào tạo các tỉnh, thành phố triển khai thực hiện nghiêm túc, hiệu quả.

Nơi nhận:
- Như trên;
- Bộ trưởng (để báo cáo);
- Các Vụ: GDTrH, GDTX, KH-TC (để phối hợp);
- Lưu: VT, GDTrH.

KT. BỘ TRƯỞNG
THỨ TRƯỞNG`;

async function seedCircularDocuments() {
  console.log("🌱 Seeding circular documents...");

  try {
    // Check if circulars already exist
    const existing5512 = await prisma.circularDocument.findUnique({
      where: { code: "32/2018/TT-BGDĐT" },
    });

    const existing2345 = await prisma.circularDocument.findUnique({
      where: { code: "2345/BGDĐT-GDTrH" },
    });

    if (existing5512 && existing2345) {
      console.log("✅ Circular documents already exist. Skipping seed.");
      return;
    }

    // Create Circular 5512 (Thông tư 32)
    if (!existing5512) {
      await prisma.circularDocument.create({
        data: {
          code: "32/2018/TT-BGDĐT",
          title: "Thông tư 32/2018/TT-BGDĐT - Ban hành Chương trình giáo dục phổ thông",
          type: "REGULATION",
          content: CIRCULAR_5512_CONTENT,
          summary:
            "Quy định về chương trình giáo dục phổ thông: mục tiêu, cấu trúc, nội dung, phương pháp và đánh giá giáo dục. Áp dụng cho cấp Tiểu học, THCS và THPT.",
          issuedDate: new Date("2018-12-26"),
          effectiveDate: new Date("2020-08-01"),
          applicableLevel: ["PRIMARY", "SECONDARY", "HIGH_SCHOOL"],
          applicableSubjects: [
            "Tiếng Việt",
            "Toán",
            "Ngoại ngữ",
            "Đạo đức",
            "Tự nhiên và Xã hội",
            "Lịch sử và Địa lí",
            "Khoa học",
            "Tin học và Công nghệ",
            "Giáo dục thể chất",
            "Nghệ thuật",
          ],
          isActive: true,
        },
      });
      console.log("✅ Created circular: Thông tư 32/2018/TT-BGDĐT");
    }

    // Create Circular 2345
    if (!existing2345) {
      await prisma.circularDocument.create({
        data: {
          code: "2345/BGDĐT-GDTrH",
          title: "Công văn 2345/BGDĐT-GDTrH - Hướng dẫn thực hiện chương trình giáo dục tiểu học",
          type: "GUIDELINE",
          content: CIRCULAR_2345_CONTENT,
          summary:
            "Hướng dẫn chi tiết về tổ chức dạy học, đánh giá kết quả học tập, sử dụng sách giáo khoa và cơ sở vật chất cho bậc Tiểu học.",
          issuedDate: new Date("2020-09-15"),
          effectiveDate: new Date("2020-09-15"),
          applicableLevel: ["PRIMARY"],
          applicableSubjects: [
            "Tiếng Việt",
            "Toán",
            "Ngoại ngữ",
            "Đạo đức",
            "Tự nhiên và Xã hội",
            "Lịch sử và Địa lí",
            "Khoa học",
            "Tin học và Công nghệ",
            "Giáo dục thể chất",
            "Nghệ thuật",
          ],
          isActive: true,
        },
      });
      console.log("✅ Created circular: Công văn 2345/BGDĐT-GDTrH");
    }

    console.log("🎉 Circular documents seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding circular documents:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedCircularDocuments()
  .then(() => {
    console.log("✅ Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
