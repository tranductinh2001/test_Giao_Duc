# 21. Đề xuất Cải tiến & Tính năng Mới (Feature Improvements)

Tài liệu này liệt kê các tính năng và cải tiến được đề xuất để nâng cao trải nghiệm người dùng, tăng hiệu quả quản trị và mở rộng khả năng phục vụ khách hàng.

---

## 21.1. Sửa lỗi hiện tại (Bug Fixes)

### 21.1.1. Vấn đề đếm câu hỏi trong danh mục

**Mô tả lỗi:** Giao diện admin chỉ hiển thị "1 câu hỏi" cho tất cả danh mục dù đã thêm nhiều câu hỏi.

**Nguyên nhân:** 
- Logic đếm câu hỏi trong `CategoryService.ts` chỉ đếm câu hỏi có `isDraft: false`
- Khi admin tạo câu hỏi mới, mặc định có thể được set `isDraft: true`
- Database chỉ có 2 câu hỏi mẫu từ seed

**Giải pháp:**
1. Kiểm tra xem câu hỏi được tạo có thuộc tính `isDraft` mặc định là gì
2. Thêm toggle trong giao diện admin để hiển thị cả câu hỏi Draft
3. Thêm badge phân biệt câu hỏi "Đã duyệt" và "Bản nháp"
4. Seed thêm nhiều câu hỏi mẫu cho các danh mục

**File cần sửa:**
- `src/features/questions/services/CategoryService.ts` - Thêm option đếm cả draft
- `src/app/admin/categories/page.tsx` - Thêm toggle hiển thị draft count
- `prisma/seed.ts` - Thêm nhiều câu hỏi mẫu hơn

---

## 21.2. Cải tiến UX/UI (User Experience Improvements)

### 21.2.1. Dashboard học viên nâng cao

**Mục tiêu:** Giúp học viên nắm bắt tiến độ học tập trực quan hơn

**Tính năng:**
- **Biểu đồ tiến độ:** Line chart hiển thị điểm số qua các lần thi
- **Heatmap luyện tập:** Lịch nhiệt hiển thị số câu đã làm mỗi ngày (như GitHub contribution)
- **Phân tích điểm yếu:** Top 5 chuyên đề có tỷ lệ sai cao nhất
- **Mục tiêu cá nhân:** Đặt mục tiêu số câu hỏi/ngày, streak days
- **Badge thành tựu:** Huy hiệu cho các cột mốc (100 câu, 7 ngày liên tiếp, 90% đúng...)

**Lợi ích:**
- Tăng động lực học tập thông qua gamification
- Giúp học viên tự đánh giá và điều chỉnh lộ trình
- Tăng retention rate (tỷ lệ người dùng quay lại)

### 21.2.2. Chế độ ôn tập thông minh (Smart Review Mode)

**Mục tiêu:** Tối ưu hóa việc ôn lại câu sai theo thuật toán Spaced Repetition

**Tính năng:**
- Thuật toán lặp lại ngắt quãng dựa trên số lần sai và thời gian
- Ưu tiên câu sai nhiều lần và lâu chưa ôn lại
- Thông báo nhắc nhở ôn tập định kỳ
- Dashboard hiển thị số câu cần ôn hôm nay

**Công thức ưu tiên:**
```
Priority Score = (wrongCount * 2) + daysSinceLastAnswer + (1 - averageScore)
```

**Lợi ích:**
- Tăng hiệu quả ghi nhớ theo nghiên cứu khoa học
- Tiết kiệm thời gian ôn tập cho học viên

### 21.2.3. Chế độ thi nhanh (Quick Test Mode)

**Mục tiêu:** Cho phép học viên làm bài thi nhanh mà không cần cấu hình phức tạp

**Tính năng:**
- 3 chế độ sẵn có: "10 câu - 10 phút", "20 câu - 20 phút", "50 câu - 60 phút"
- Tự động lấy câu hỏi từ các danh mục đã học gần đây
- Bắt đầu ngay với 1 click, không cần setup
- Hiển thị kết quả ngay lập tức sau khi submit

**Lợi ích:**
- Giảm friction, tăng tần suất làm bài
- Phù hợp cho người bận rộn, muốn ôn nhanh

---

## 21.3. Tính năng Quản trị nâng cao (Admin Features)

### 21.3.1. Import hàng loạt từ Excel/Word nâng cao

**Hiện tại:** Hỗ trợ import cơ bản từ .docx và .xlsx

**Cải tiến:**
- **Template chuẩn:** Cung cấp template Excel/Word mẫu để tải về
- **Validation chi tiết:** Hiển thị lỗi cụ thể từng dòng trước khi confirm
- **Preview trước khi import:** Xem trước 5-10 câu đầu tiên
- **Xử lý ảnh trong Word:** Tự động extract và upload ảnh từ file .docx
- **Import từ PDF:** OCR + AI để parse câu hỏi từ file PDF scan

**Lợi ích:**
- Tiết kiệm hàng giờ nhập liệu thủ công
- Giảm lỗi nhập sai format
- Dễ dàng migrate từ ngân hàng đề cũ

### 21.3.2. Quản lý phiên bản câu hỏi (Question Versioning)

**Mục tiêu:** Theo dõi lịch sử thay đổi câu hỏi, cho phép rollback

**Tính năng:**
- Lưu các version cũ khi edit câu hỏi
- Xem diff giữa các version
- Restore về version cũ nếu cần
- Log người sửa, thời gian sửa

**Schema mới:**
```prisma
model QuestionVersion {
  id          String   @id @default(uuid())
  questionId  String
  version     Int
  content     String   @db.Text
  explanation String?  @db.Text
  choices     Json     // Snapshot của choices tại thời điểm đó
  editedBy    String
  editedAt    DateTime @default(now())
  
  question    Question @relation(fields: [questionId], references: [id])
  editor      User     @relation(fields: [editedBy], references: [id])
}
```

**Lợi ích:**
- Tránh mất dữ liệu khi sửa nhầm
- Audit trail cho compliance
- Phát hiện ai sửa sai, sửa khi nào

### 21.3.3. Hệ thống phân quyền chi tiết (Role-Based Access Control)

**Hiện tại:** Chỉ có 2 role: ADMIN và LEARNER

**Đề xuất thêm:**
- **CONTENT_EDITOR:** Chỉ được tạo/sửa câu hỏi, không truy cập user/license
- **LICENSE_MANAGER:** Chỉ quản lý license, không truy cập câu hỏi
- **SUPPORT:** Xem thông tin user, reset password, không sửa câu hỏi
- **SUPER_ADMIN:** Full quyền, quản lý các admin khác

**Permission Matrix:**
```
Role              | Questions | Categories | Exams | Users | Licenses | Settings
------------------|-----------|------------|-------|-------|----------|----------
LEARNER          | View Own  | View       | Take  | Own   | Activate | Own
CONTENT_EDITOR   | Full      | Full       | View  | -     | -        | -
LICENSE_MANAGER  | -         | -          | -     | View  | Full     | -
SUPPORT          | View      | View       | View  | Edit  | View     | -
ADMIN            | Full      | Full       | Full  | Full  | Full     | View
SUPER_ADMIN      | Full      | Full       | Full  | Full  | Full     | Full
```

**Lợi ích:**
- Phân công công việc rõ ràng
- Tăng bảo mật, giảm rủi ro
- Phù hợp với tổ chức lớn

### 21.3.4. Phân tích thống kê nâng cao

**Mục tiêu:** Dashboard analytics cho admin để ra quyết định kinh doanh

**Metrics cần theo dõi:**
- **Người dùng:**
  - Số user mới mỗi ngày/tuần/tháng
  - Tỷ lệ retention (7-day, 30-day)
  - Active users (DAU, WAU, MAU)
  - Churn rate (tỷ lệ rời bỏ)

- **Engagement:**
  - Số bài thi được tạo mỗi ngày
  - Số câu hỏi được làm mỗi ngày
  - Thời gian sử dụng trung bình
  - Tỷ lệ hoàn thành bài thi

- **Doanh thu:**
  - Số license đã bán theo package
  - Revenue theo tháng
  - Average Revenue Per User (ARPU)
  - License expiry calendar

- **Chất lượng nội dung:**
  - Top câu hỏi bị sai nhiều nhất (có thể câu hỏi sai hoặc khó hiểu)
  - Câu hỏi ít được làm (có thể cần review)
  - Danh mục phổ biến nhất

**Lợi ích:**
- Ra quyết định dựa trên dữ liệu
- Phát hiện vấn đề sớm
- Tối ưu chiến lược marketing

---

## 21.4. Tính năng Kinh doanh (Business Features)

### 21.4.1. Gói đăng ký định kỳ (Subscription Plans)

**Hiện tại:** Chỉ có license 1 lần, nhập code kích hoạt

**Đề xuất:**
- **Subscription tự động gia hạn:** Tích hợp payment gateway (VNPay, MoMo, ZaloPay)
- **3 gói cơ bản:**
  - **Basic** (99k/tháng): 500 câu hỏi, 20 đề thi, email support
  - **Pro** (199k/tháng): Không giới hạn, AI giải thích, priority support
  - **Team** (499k/tháng cho 5 user): Tất cả tính năng Pro + dashboard quản lý team

**Lợi ích:**
- Doanh thu ổn định, dự đoán được
- Tăng lifetime value của khách hàng
- Giảm tải công việc quản lý license thủ công

### 21.4.2. Chương trình Giới thiệu (Referral Program)

**Mục tiêu:** Tăng trưởng organic thông qua word-of-mouth

**Cơ chế:**
- Mỗi user có referral code riêng
- Người được giới thiệu nhập code khi đăng ký → được giảm 20% tháng đầu
- Người giới thiệu nhận 30 ngày miễn phí cho mỗi người bạn subscribe
- Leaderboard top referrer hàng tháng, thưởng gói 1 năm free cho top 3

**Lợi ích:**
- Chi phí marketing thấp (chỉ trả khi có kết quả)
- Khách hàng từ referral có retention cao hơn
- Tạo community xung quanh sản phẩm

### 21.4.3. Tích hợp Cộng đồng (Community Features)

**Mục tiêu:** Xây dựng cộng đồng học viên tương tác, chia sẻ

**Tính năng:**
- **Diễn đàn Q&A:** Học viên hỏi đáp về nội dung câu hỏi
- **Chia sẻ đề thi:** User tạo đề custom và chia sẻ cho người khác
- **Bình luận câu hỏi:** Thảo luận về câu hỏi khó, tranh luận đáp án
- **Live sessions:** Admin/giảng viên tổ chức buổi livestream ôn tập

**Lợi ích:**
- Tăng thời gian ở lại trên platform
- User-generated content giảm công việc content creation
- Tạo network effect

---

## 21.5. Tích hợp AI/ML (AI/ML Integration)

### 21.5.1. Trợ lý AI giải thích câu hỏi

**Mục tiêu:** Giải thích chi tiết, đơn giản hóa câu hỏi khó

**Tính năng:**
- Button "Giải thích bằng AI" bên cạnh explanation
- AI đọc câu hỏi + đáp án + explanation → viết lại dễ hiểu hơn
- Có thể hỏi thêm: "Tại sao đáp án B sai?", "Cho ví dụ thực tế"
- Sử dụng Claude API hoặc GPT-4

**Lợi ích:**
- Tăng hiểu biết sâu cho học viên
- Differentiation so với đối thủ
- Giảm số câu hỏi support về giải thích

### 21.5.2. Gợi ý câu hỏi tương tự (Similar Questions Recommendation)

**Mục tiêu:** Giúp học viên luyện tập theo chủ đề sâu

**Thuật toán:**
- Embedding câu hỏi bằng sentence transformers
- Tính cosine similarity giữa câu hiện tại và ngân hàng
- Gợi ý 5 câu tương tự nhất

**Lợi ích:**
- Tăng số câu được làm
- Cải thiện hiệu quả học tập
- Khám phá nội dung mới

### 21.5.3. Phát hiện câu hỏi trùng lặp (Duplicate Detection)

**Mục tiêu:** Tự động cảnh báo khi admin thêm câu hỏi giống câu đã có

**Thuật toán:**
- Khi admin tạo câu hỏi mới, so sánh embedding với DB
- Nếu similarity > 0.85 → warning "Câu hỏi có thể trùng với #123"
- Admin xem và quyết định có merge/xóa không

**Lợi ích:**
- Giữ ngân hàng sạch, không duplicate
- Tiết kiệm storage
- Tránh học viên làm câu giống nhau nhiều lần

---

## 21.6. Mobile App (Ứng dụng Di động)

### 21.6.1. Progressive Web App (PWA)

**Giai đoạn 1:** Tối ưu responsive và thêm PWA manifest

**Tính năng:**
- Install app về home screen
- Offline mode: Cache đề thi đã load, làm bài không cần mạng
- Push notifications: Nhắc ôn tập, thông báo hết hạn license

**Lợi ích:**
- Không tốn chi phí phát triển native app
- Hoạt động trên cả iOS và Android
- Tăng engagement qua notifications

### 21.6.2. React Native App (Giai đoạn 2)

**Khi nào:** Khi có >10,000 active users

**Tính năng thêm so với PWA:**
- Tốc độ mượt mà hơn
- Tích hợp sâu với hệ điều hành
- Voice input để trả lời câu hỏi
- Biometric authentication (FaceID, vân tay)

---

## 21.7. Tích hợp bên thứ 3 (Third-party Integrations)

### 21.7.1. Zalo Mini App

**Mục tiêu:** Tiếp cận 70 triệu người dùng Zalo tại Việt Nam

**Tính năng:**
- Mini app nhẹ trong Zalo
- Login bằng Zalo account
- Chia sẻ kết quả thi lên timeline
- Zalo Pay cho subscription

**Lợi ích:**
- Viral growth qua Zalo network
- Thanh toán dễ dàng hơn (nhiều người có Zalo Pay)
- Reach thị trường lớn

### 21.7.2. Google Classroom Integration

**Mục tiêu:** Phục vụ trường học, tổ chức đào tạo

**Tính năng:**
- Giáo viên tạo lớp học trên platform
- Giao bài thi cho học viên
- Tự động đồng bộ điểm về Google Classroom
- Export báo cáo theo lớp

**Lợi ích:**
- Mở rộng sang segment B2B (trường học)
- Tăng số user dạng bulk
- Upsell team subscription

---

## 21.8. Lộ trình triển khai (Implementation Roadmap)

### Phase 1: Foundation (Tháng 1-2)
- ✅ Sửa bug đếm câu hỏi
- Seed nhiều câu hỏi mẫu hơn
- Dashboard học viên nâng cao
- Chế độ thi nhanh
- PWA optimization

### Phase 2: Growth (Tháng 3-4)
- Subscription plans + payment gateway
- Referral program
- Smart review mode
- Admin analytics dashboard
- AI explanation (beta)

### Phase 3: Scale (Tháng 5-6)
- Role-based access control
- Question versioning
- Community features (forum, share)
- Similar questions recommendation
- Zalo Mini App (beta)

### Phase 4: Enterprise (Tháng 7+)
- Google Classroom integration
- React Native app
- Advanced ML features
- White-label solution cho tổ chức

---

## 21.9. Ước tính chi phí & ROI

### Chi phí ước tính (6 tháng đầu):
- **Development:** 3 devs x 6 tháng x 30M = 540M VND
- **Infra:** Database + Hosting + CDN = 20M VND
- **AI API:** Claude/GPT API = 10M VND
- **Marketing:** Ads + Referral rewards = 50M VND
- **Tổng:** ~620M VND

### ROI dự kiến (sau 6 tháng):
- **Giả định:** 5,000 paid users (conservative)
- **ARPU:** 150k/tháng (mix Basic + Pro)
- **MRR:** 750M VND/tháng
- **Annual run rate:** 9B VND
- **Break-even:** Tháng 1
- **ROI:** 1400% sau 12 tháng

---

## 21.10. Rủi ro & Mitigation

### Rủi ro kỹ thuật:
- **Scalability:** Dùng Vercel Edge + Neon Postgres autoscaling
- **Database bottleneck:** Caching với Redis, optimize queries
- **AI cost:** Implement rate limiting, cache responses

### Rủi ro kinh doanh:
- **Competition:** Focus niche (công chức), build community moat
- **Churn:** Implement retention tactics (streaks, notifications)
- **Payment fraud:** Verify phone/email, limit free trials

---

**Tài liệu này sẽ được cập nhật liên tục khi có thêm insights từ user feedback và market research.**
