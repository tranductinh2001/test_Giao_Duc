# 05. Database Schema - Part 2 (Tiếp theo)

## Các Model còn lại

### 5.3.9. License - Mã kích hoạt bản quyền

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `code` | String (unique) | Mã license (VIC-XXXX-XXXX-XXXX) |
| `durationDays` | Int | Số ngày sử dụng (30, 90, 180, 365) |
| `status` | LicenseStatus | Trạng thái mã |
| `activatedAt` | DateTime? | Thời điểm kích hoạt |
| `activatedByUserId` | String? | FK -> User.id |
| `createdAt` | DateTime | Ngày tạo mã |
| `updatedAt` | DateTime | Ngày cập nhật cuối |

**Indexes:**
- `@@index([code])` - Tra cứu nhanh khi kích hoạt

---

### 5.3.10. Category - Danh mục câu hỏi

Cấu trúc cây phân cấp để tổ chức câu hỏi theo chuyên đề luật.

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `name` | String | Tên danh mục |
| `description` | String? | Mô tả chi tiết |
| `parentId` | String? | FK -> Category.id (null = root) |
| `createdAt` | DateTime | Ngày tạo |
| `updatedAt` | DateTime | Ngày cập nhật cuối |

**Indexes:**
- `@@index([parentId])` - Query danh mục con nhanh

**Relations:**
- `parent`: Danh mục cha
- `children`: Các danh mục con
- `questions`: Câu hỏi thuộc danh mục này
- `exams`: Đề thi thuộc danh mục này

---

### 5.3.11. Question - Ngân hàng câu hỏi

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `content` | String (Text) | Nội dung câu hỏi (hỗ trợ HTML) |
| `explanation` | String? (Text) | Giải thích đáp án đúng |
| `difficulty` | Difficulty | Độ khó (EASY/MEDIUM/HARD) |
| `categoryId` | String | FK -> Category.id |
| `createdAt` | DateTime | Ngày tạo |
| `updatedAt` | DateTime | Ngày cập nhật cuối |

**Indexes:**
- `@@index([categoryId])` 
- `@@index([difficulty])`
- `@@index([categoryId, difficulty])` - Composite index

---

### 5.3.12. Choice - Phương án lựa chọn

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `questionId` | String | FK -> Question.id |
| `content` | String (Text) | Nội dung phương án |
| `isCorrect` | Boolean | Đáp án đúng hay sai |

---

### 5.3.13. Exam - Đề thi

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `title` | String | Tiêu đề đề thi |
| `description` | String? (Text) | Mô tả chi tiết |
| `timeLimit` | Int | Thời gian làm bài (giây) |
| `isPublished` | Boolean | Đã xuất bản chưa (default: false) |
| `matrix` | Json? | Ma trận sinh đề tự động |
| `categoryId` | String? | FK -> Category.id |
| `isCustom` | Boolean | Đề tự tạo hay admin tạo |
| `userId` | String? | FK -> User.id (nếu custom) |
| `createdAt` | DateTime | Ngày tạo |
| `updatedAt` | DateTime | Ngày cập nhật cuối |

---

### 5.3.14. ExamQuestion - Liên kết Đề thi và Câu hỏi

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `examId` | String | FK -> Exam.id |
| `questionId` | String | FK -> Question.id |
| `sortOrder` | Int | Thứ tự câu hỏi trong đề |

**Primary Key:** `@@id([examId, questionId])`

---

### 5.3.15. ExamAttempt - Lượt làm bài thi

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `userId` | String | FK -> User.id |
| `examId` | String | FK -> Exam.id |
| `score` | Float | Điểm số (0-100) |
| `correctCount` | Int | Số câu đúng |
| `totalCount` | Int | Tổng số câu |
| `startedAt` | DateTime | Thời điểm bắt đầu |
| `submittedAt` | DateTime? | Thời điểm nộp bài |
| `status` | AttemptStatus | Trạng thái bài thi |
| `timeSpent` | Int? | Thời gian làm thực tế (giây) |
| `savedAnswers` | Json? | Lưu tạm đáp án |

---

### 5.3.16. ExamAttemptAnswer - Đáp án chi tiết

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `attemptId` | String | FK -> ExamAttempt.id |
| `questionId` | String | FK -> Question.id |
| `selectedChoiceId` | String? | FK -> Choice.id |
| `isCorrect` | Boolean | Trả lời đúng hay sai |
| `timeSpent` | Int? | Thời gian trả lời (giây) |

---

### 5.3.17. UserWrongAnswer - Kho câu hỏi làm sai

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `userId` | String | FK -> User.id |
| `questionId` | String | FK -> Question.id |
| `wrongCount` | Int | Số lần làm sai |
| `lastAnsweredAt` | DateTime | Lần sai gần nhất |

**Unique:** `@@unique([userId, questionId])`

---

### 5.3.18. Bookmark - Câu hỏi yêu thích

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `userId` | String | FK -> User.id |
| `questionId` | String | FK -> Question.id |
| `createdAt` | DateTime | Ngày đánh dấu |

**Unique:** `@@unique([userId, questionId])`

---

### 5.3.19. UserQuestionProgress - Tiến độ học chi tiết

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `userId` | String | FK -> User.id |
| `questionId` | String | FK -> Question.id |
| `timesEncountered` | Int | Số lần gặp |
| `timesCorrect` | Int | Số lần đúng |
| `timesWrong` | Int | Số lần sai |
| `accuracy` | Float | Tỷ lệ chính xác % |
| `avgTimeSpent` | Float? | Thời gian TB |
| `lastReviewedAt` | DateTime? | Lần ôn gần nhất |
| `masteryLevel` | Int | Độ thành thạo 0-5 |
| `nextReviewDate` | DateTime? | Ngày cần ôn lại |
| `createdAt` | DateTime | Ngày tạo |
| `updatedAt` | DateTime | Ngày cập nhật |

**Unique:** `@@unique([userId, questionId])`

---

### 5.3.20. QuestionStats - Thống kê câu hỏi

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `id` | String (UUID) | Khóa chính |
| `questionId` | String (unique) | FK -> Question.id |
| `totalAttempts` | Int | Tổng lượt làm |
| `correctCount` | Int | Số lượt đúng |
| `wrongCount` | Int | Số lượt sai |
| `successRate` | Float | Tỷ lệ đúng % |
| `avgTimeSpent` | Float? | Thời gian TB |
| `calculatedDifficulty` | String? | Độ khó thực tế |
| `updatedAt` | DateTime | Ngày cập nhật |

---

## 5.4. Performance Optimization

### Indexes quan trọng:
- User: `email`
- License: `code`
- Category: `parentId`
- Question: `categoryId`, `difficulty`, `(categoryId, difficulty)`
- ExamAttempt: `userId`, `examId`, `status`, `(userId, status)`
- LoginAttempt: `(email, createdAt)`, `(ipAddress, createdAt)`

---

## 5.5. Data Size Estimation

Ước tính cho 10,000 users:
- Core data: ~100 MB
- Exam attempts: ~900 MB
- Logs: ~650 MB
- **Total: ~1.65 GB/năm**

---

## 5.6. Backup Strategy

- **Automatic:** Daily backups (Supabase/Neon)
- **Manual:** `pg_dump` khi cần
- **Recovery:** Point-in-time restore lên đến 7 ngày

