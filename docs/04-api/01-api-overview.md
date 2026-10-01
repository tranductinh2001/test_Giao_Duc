# 06. Thiết kế API (API Specifications)

Hệ thống cung cấp giao diện lập trình RESTful API thông qua Next.js Route Handlers. Tất cả API phản hồi dữ liệu ở định dạng JSON và yêu cầu Header `Content-Type: application/json` ngoại trừ các cổng Upload file.

---

## 6.1. Định dạng Phản hồi Chuẩn (Standard Response Format)

### Phản hồi Thành công (Success Response)
```json
{
  "success": true,
  "data": { ... }
}
```

### Phản hồi Lỗi (Error Response)
```json
{
  "success": false,
  "error": "ERR_CODE",
  "message": "Thông điệp mô tả lỗi dễ hiểu cho người dùng.",
  "details": [] 
}
```

Một số mã lỗi chuẩn:
*   `UNAUTHORIZED`: Chưa đăng nhập hoặc token hết hạn.
*   `FORBIDDEN`: Đăng nhập thành công nhưng không đủ quyền truy cập.
*   `NOT_FOUND`: Thực thể yêu cầu không tồn tại.
*   `VALIDATION_ERROR`: Lỗi định dạng dữ liệu đầu vào.
*   `LICENSE_EXPIRED`: License của tài khoản đã hết hạn.
*   `INTERNAL_SERVER_ERROR`: Lỗi hệ thống phát sinh từ máy chủ.

---

## 6.2. Danh sách Endpoints Chi tiết (Endpoint Registry)

### 6.2.1. Xác thực & Tài khoản (Authentication)

#### 1. Đăng ký tài khoản (Register)
*   **Method:** `POST`
*   **Path:** `/api/auth/register`
*   **Request Body (Zod Validation Schema):**
    ```typescript
    const RegisterSchema = zod.object({
      name: zod.string().min(2, "Tên phải có ít nhất 2 ký tự"),
      email: zod.string().email("Định dạng email không hợp lệ"),
      password: zod.string().min(6, "Mật khẩu phải dài hơn 6 ký tự")
    });
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "userId": "usr-123-abc",
        "name": "Nguyen Van A",
        "email": "vana@gmail.com",
        "role": "LEARNER"
      }
    }
    ```

---

### 6.2.2. Hệ thống License (License System)

#### 1. Kích hoạt License Code
*   **Method:** `POST`
*   **Path:** `/api/license/activate`
*   **Headers:** `Authorization: Bearer <Token>`
*   **Request Body:**
    ```json
    {
      "code": "VIC-ABCD-1234"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "message": "Kích hoạt license thành công",
        "expiresAt": "2026-09-20T11:34:15.000Z",
        "durationDays": 90
      }
    }
    ```

#### 2. Sinh mã License hàng loạt (Admin Only)
*   **Method:** `POST`
*   **Path:** `/api/admin/license/generate`
*   **Headers:** `Authorization: Bearer <Token>` (Phải là Admin)
*   **Request Body:**
    ```json
    {
      "durationDays": 90,
      "count": 5
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "licenses": [
          { "id": "lic-1", "code": "VIC-8A7B-9C0D", "durationDays": 90 },
          { "id": "lic-2", "code": "VIC-2E3F-4G5H", "durationDays": 90 }
        ]
      }
    }
    ```

---

### 6.2.3. Quản lý Ngân hàng Câu hỏi (Question Bank - Admin Only)

#### 1. Lấy danh sách câu hỏi có phân trang & lọc
*   **Method:** `GET`
*   **Path:** `/api/admin/questions?page=1&limit=10&categoryId=cat-123`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "questions": [
          {
            "id": "q-1",
            "content": "<p>Luật Viên chức được ban hành năm nào?</p>",
            "difficulty": "EASY",
            "category": { "name": "Luật Viên chức 2010" }
          }
        ],
        "pagination": { "page": 1, "limit": 10, "total": 1250 }
      }
    }
    ```

#### 2. Import câu hỏi từ file Word (.docx)
*   **Method:** `POST`
*   **Path:** `/api/admin/questions/import-word`
*   **Content-Type:** `multipart/form-data`
*   **Request Payload:**
    *   `file`: Binary (tệp tin `.docx`)
    *   `categoryId`: String (UUID của danh mục đích)
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "importedCount": 45,
        "warnings": [
          "Dòng 12: Câu hỏi số 5 thiếu giải thích đáp án (đã import không giải thích)"
        ]
      }
    }
    ```

---

### 6.2.4. Động cơ Đề thi & Kết quả (Exam Engine)

#### 1. Sinh đề thi tự động ngẫu nhiên theo ma trận
*   **Method:** `POST`
*   **Path:** `/api/exams/generate`
*   **Request Body:**
    ```json
    {
      "title": "Đề ôn tập tự sinh số 1",
      "timeLimit": 3600,
      "matrix": [
        { "categoryId": "cat-luat-vienchuc", "count": 15 },
        { "categoryId": "cat-luat-congchuc", "count": 15 }
      ]
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "examId": "ex-generated-xyz",
        "title": "Đề ôn tập tự sinh số 1",
        "timeLimit": 3600,
        "questionsCount": 30
      }
    }
    ```

#### 2. Bắt đầu lượt thi thử (Start Attempt)
*   **Method:** `POST`
*   **Path:** `/api/exams/:id/start`
*   **Response (200 OK):**
    *   *Lưu ý:* Các câu hỏi trả về được xáo trộn thứ tự, các đáp án `choices` cũng được xáo trộn ngẫu nhiên. Trường `isCorrect` của `Choice` bị ẩn đi để bảo mật đáp án.
    ```json
    {
      "success": true,
      "data": {
        "attemptId": "att-9988",
        "startedAt": "2026-06-20T11:45:00.000Z",
        "expiresAt": "2026-06-20T12:45:00.000Z",
        "questions": [
          {
            "id": "q-1",
            "content": "Nội dung câu hỏi trắc nghiệm đã đảo...",
            "choices": [
              { "id": "ch-a", "content": "Đáp án A" },
              { "id": "ch-b", "content": "Đáp án B" }
            ]
          }
        ]
      }
    }
    ```

#### 3. Nộp bài thi (Submit Attempt)
*   **Method:** `POST`
*   **Path:** `/api/exams/attempts/:attemptId/submit`
*   **Request Body:**
    ```json
    {
      "answers": [
        { "questionId": "q-1", "selectedChoiceId": "ch-b" },
        { "questionId": "q-2", "selectedChoiceId": null }
      ]
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "attemptId": "att-9988",
        "score": 85.0,
        "correctCount": 51,
        "totalCount": 60,
        "status": "SUBMITTED"
      }
    }
    ```

---

### 6.2.5. Thống kê & Phân tích Học tập (Learner Stats)

#### 1. Lấy báo cáo năng lực chi tiết theo chuyên đề
*   **Method:** `GET`
*   **Path:** `/api/stats/skills`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "skills": [
          {
            "categoryId": "cat-luat-vienchuc",
            "categoryName": "Luật Viên chức 2010",
            "totalAttempted": 100,
            "correctRate": 0.85,
            "level": "MẠNH"
          },
          {
            "categoryId": "cat-luat-phongchongthamnhung",
            "categoryName": "Luật Phòng chống tham nhũng",
            "totalAttempted": 40,
            "correctRate": 0.35,
            "level": "YẾU"
          }
        ]
      }
    }
    ```

---

### 6.2.6. Quản lý Categories (Danh mục)

#### 1. Lấy danh sách categories (Public)
*   **Method:** `GET`
*   **Path:** `/api/categories`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "categories": [
          {
            "id": "cat-1",
            "name": "Kiến thức chung",
            "description": "Các môn kiến thức chung cho thi công chức",
            "parentId": null,
            "children": [
              {
                "id": "cat-2",
                "name": "Luật Viên chức 2010",
                "parentId": "cat-1"
              }
            ]
          }
        ]
      }
    }
    ```

#### 2. Tạo category mới (Admin Only)
*   **Method:** `POST`
*   **Path:** `/api/admin/categories`
*   **Request Body:**
    ```json
    {
      "name": "Luật Công chức 2008",
      "description": "Các điều khoản trong Luật Công chức năm 2008",
      "parentId": "cat-1"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "id": "cat-3",
        "name": "Luật Công chức 2008",
        "parentId": "cat-1"
      }
    }
    ```

#### 3. Cập nhật category (Admin Only)
*   **Method:** `PATCH`
*   **Path:** `/api/admin/categories/:id`
*   **Request Body:**
    ```json
    {
      "name": "Luật Công chức 2008 (Sửa đổi 2019)",
      "description": "Cập nhật mô tả mới"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "cat-3",
        "name": "Luật Công chức 2008 (Sửa đổi 2019)"
      }
    }
    ```

#### 4. Xóa category (Admin Only)
*   **Method:** `DELETE`
*   **Path:** `/api/admin/categories/:id`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Đã xóa danh mục thành công"
    }
    ```

---

### 6.2.7. Quản lý Users (Admin Only)

#### 1. Lấy danh sách users với phân trang
*   **Method:** `GET`
*   **Path:** `/api/admin/users?page=1&limit=20&role=LEARNER&status=ACTIVE`
*   **Query Params:**
    *   `page`: Trang hiện tại (default: 1)
    *   `limit`: Số users/trang (default: 20)
    *   `role`: Filter theo role (`ADMIN` | `LEARNER`)
    *   `status`: Filter theo status (`ACTIVE` | `LOCKED`)
    *   `search`: Tìm kiếm theo name hoặc email
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "users": [
          {
            "id": "usr-1",
            "name": "Nguyen Van A",
            "email": "vana@example.com",
            "role": "LEARNER",
            "status": "ACTIVE",
            "licenseExpiresAt": "2026-12-31T00:00:00.000Z",
            "level": 5,
            "xp": 1250,
            "streak": 7,
            "createdAt": "2026-01-15T10:00:00.000Z"
          }
        ],
        "pagination": {
          "page": 1,
          "limit": 20,
          "total": 150,
          "totalPages": 8
        }
      }
    }
    ```

#### 2. Khóa/Mở khóa tài khoản user
*   **Method:** `PATCH`
*   **Path:** `/api/admin/users/:id/status`
*   **Request Body:**
    ```json
    {
      "status": "LOCKED",
      "reason": "Vi phạm điều khoản sử dụng"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "usr-1",
        "status": "LOCKED"
      }
    }
    ```

#### 3. Cấp/Thu hồi role Admin
*   **Method:** `PATCH`
*   **Path:** `/api/admin/users/:id/role`
*   **Request Body:**
    ```json
    {
      "role": "ADMIN"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "usr-1",
        "role": "ADMIN"
      }
    }
    ```

#### 4. Gia hạn license cho user
*   **Method:** `POST`
*   **Path:** `/api/admin/users/:id/extend-license`
*   **Request Body:**
    ```json
    {
      "durationDays": 90
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "userId": "usr-1",
        "licenseExpiresAt": "2027-03-31T00:00:00.000Z"
      }
    }
    ```

---

### 6.2.8. Recruitment Posts (Tuyển dụng)

#### 1. Lấy danh sách bài tuyển dụng (Public)
*   **Method:** `GET`
*   **Path:** `/api/recruitment?page=1&limit=10&status=ACTIVE`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "posts": [
          {
            "id": "rec-1",
            "title": "Tuyển dụng Viên chức Sở Giáo dục 2026",
            "content": "<p>Nội dung chi tiết...</p>",
            "status": "ACTIVE",
            "viewCount": 1250,
            "publishedAt": "2026-05-01T00:00:00.000Z",
            "createdAt": "2026-04-28T10:00:00.000Z"
          }
        ],
        "pagination": {
          "page": 1,
          "limit": 10,
          "total": 25
        }
      }
    }
    ```

#### 2. Lấy chi tiết bài tuyển dụng (Public)
*   **Method:** `GET`
*   **Path:** `/api/recruitment/:id`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "rec-1",
        "title": "Tuyển dụng Viên chức Sở Giáo dục 2026",
        "content": "<p>Nội dung đầy đủ...</p>",
        "status": "ACTIVE",
        "viewCount": 1251,
        "publishedAt": "2026-05-01T00:00:00.000Z"
      }
    }
    ```

#### 3. Tạo bài tuyển dụng (Admin Only)
*   **Method:** `POST`
*   **Path:** `/api/admin/recruitment`
*   **Request Body:**
    ```json
    {
      "title": "Tuyển dụng công chức tỉnh Hà Nội",
      "content": "<p>Nội dung chi tiết...</p>",
      "status": "ACTIVE"
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "data": {
        "id": "rec-2",
        "title": "Tuyển dụng công chức tỉnh Hà Nội",
        "status": "ACTIVE"
      }
    }
    ```

#### 4. Cập nhật bài tuyển dụng (Admin Only)
*   **Method:** `PATCH`
*   **Path:** `/api/admin/recruitment/:id`
*   **Request Body:**
    ```json
    {
      "title": "Tuyển dụng công chức tỉnh Hà Nội (Cập nhật)",
      "content": "<p>Nội dung mới...</p>",
      "status": "INACTIVE"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "id": "rec-2",
        "title": "Tuyển dụng công chức tỉnh Hà Nội (Cập nhật)"
      }
    }
    ```

#### 5. Xóa bài tuyển dụng (Admin Only)
*   **Method:** `DELETE`
*   **Path:** `/api/admin/recruitment/:id`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "message": "Đã xóa bài tuyển dụng thành công"
    }
    ```

---

### 6.2.9. Export & Download

#### 1. Export kết quả thi sang PDF
*   **Method:** `POST`
*   **Path:** `/api/exams/attempts/:attemptId/export`
*   **Response (200 OK):**
    *   **Content-Type:** `application/pdf`
    *   **Headers:** `Content-Disposition: attachment; filename="ket-qua-thi-att-123.pdf"`
    *   Binary PDF file

#### 2. Export danh sách câu hỏi sang PDF (Admin Only)
*   **Method:** `POST`
*   **Path:** `/api/admin/questions/export`
*   **Request Body:**
    ```json
    {
      "categoryId": "cat-1",
      "difficulty": "MEDIUM"
    }
    ```
*   **Response (200 OK):**
    *   **Content-Type:** `application/pdf`
    *   Binary PDF file with questions

#### 3. Export danh sách license (Admin Only)
*   **Method:** `GET`
*   **Path:** `/api/admin/license/export?status=ACTIVE&format=csv`
*   **Query Params:**
    *   `status`: `ACTIVE` | `USED` | `EXPIRED`
    *   `format`: `csv` | `json`
*   **Response (200 OK):**
    *   **Content-Type:** `text/csv` hoặc `application/json`
    *   File download

---

### 6.2.10. Gamification & Progress

#### 1. Lấy thông tin user progress (XP, Level, Streak)
*   **Method:** `GET`
*   **Path:** `/api/profile/progress`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "usr-1",
          "name": "Nguyen Van A",
          "level": 5,
          "xp": 1250,
          "requiredXP": 1687,
          "streak": 7,
          "lastActiveDate": "2026-06-24T00:00:00.000Z",
          "badges": ["first_exam", "streak_7", "level_5"]
        },
        "stats": {
          "totalExams": 15,
          "totalQuestions": 450,
          "averageScore": 85.5,
          "totalTimeSpent": 27000
        }
      }
    }
    ```

#### 2. Lấy bảng xếp hạng (Leaderboard)
*   **Method:** `GET`
*   **Path:** `/api/leaderboard?timeframe=week&limit=50`
*   **Query Params:**
    *   `timeframe`: `all` | `week` | `month`
    *   `limit`: Số lượng users (default: 50)
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "leaderboard": [
          {
            "rank": 1,
            "userId": "usr-1",
            "name": "Nguyen Van A",
            "level": 12,
            "xp": 5230,
            "streak": 30,
            "badges": 8
          },
          {
            "rank": 2,
            "userId": "usr-2",
            "name": "Tran Thi B",
            "level": 11,
            "xp": 4850,
            "streak": 15,
            "badges": 6
          }
        ]
      }
    }
    ```

#### 3. Lấy danh sách câu hỏi cần ôn tập (Spaced Repetition)
*   **Method:** `GET`
*   **Path:** `/api/practice/due`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "dueQuestions": [
          {
            "questionId": "q-1",
            "content": "<p>Câu hỏi cần ôn...</p>",
            "masteryLevel": 2,
            "nextReviewDate": "2026-06-24T00:00:00.000Z",
            "accuracy": 75.0,
            "timesEncountered": 4
          }
        ],
        "count": 12
      }
    }
    ```

---

### 6.2.11. Security & Audit

#### 1. Lấy audit logs (Admin Only)
*   **Method:** `GET`
*   **Path:** `/api/admin/audit?page=1&limit=50&event=USER_LOGIN&userId=usr-1`
*   **Query Params:**
    *   `page`, `limit`: Phân trang
    *   `event`: Filter theo loại event
    *   `userId`: Filter theo user
    *   `startDate`, `endDate`: Filter theo thời gian
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "logs": [
          {
            "id": "log-1",
            "userId": "usr-1",
            "event": "USER_LOGIN",
            "details": {
              "provider": "credentials",
              "method": "email"
            },
            "ipAddress": "192.168.1.100",
            "userAgent": "Mozilla/5.0...",
            "success": true,
            "createdAt": "2026-06-24T10:30:00.000Z"
          }
        ],
        "pagination": {
          "page": 1,
          "limit": 50,
          "total": 2500
        }
      }
    }
    ```

#### 2. Lấy login attempts (Admin Only)
*   **Method:** `GET`
*   **Path:** `/api/admin/security/login-attempts?page=1&success=false`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "attempts": [
          {
            "id": "att-1",
            "email": "test@example.com",
            "ipAddress": "192.168.1.100",
            "success": false,
            "failReason": "WRONG_PASSWORD",
            "createdAt": "2026-06-24T10:25:00.000Z"
          }
        ],
        "pagination": {
          "page": 1,
          "limit": 50,
          "total": 125
        }
      }
    }
    ```

#### 3. Lấy security dashboard stats (Admin Only)
*   **Method:** `GET`
*   **Path:** `/api/admin/security/dashboard`
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "failedLogins24h": 45,
        "suspiciousIPs": [
          {
            "ipAddress": "192.168.1.50",
            "failedAttempts": 12,
            "lastAttempt": "2026-06-24T10:00:00.000Z"
          }
        ],
        "securityAlerts": 2,
        "activeUsers24h": 350
      }
    }
    ```

---

## 6.3. Error Handling Best Practices

### HTTP Status Codes sử dụng

| Status | Mã | Khi nào sử dụng |
|--------|-----|----------------|
| 200 OK | `200` | Request thành công, có data trả về |
| 201 Created | `201` | Tạo resource mới thành công |
| 400 Bad Request | `400` | Validation error, dữ liệu đầu vào không hợp lệ |
| 401 Unauthorized | `401` | Chưa đăng nhập hoặc token không hợp lệ |
| 403 Forbidden | `403` | Đã đăng nhập nhưng không đủ quyền |
| 404 Not Found | `404` | Resource không tồn tại |
| 409 Conflict | `409` | Xung đột dữ liệu (vd: email đã tồn tại) |
| 429 Too Many Requests | `429` | Rate limit exceeded |
| 500 Internal Server Error | `500` | Lỗi server không dự đoán được |

### Ví dụ Error Response chi tiết

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Dữ liệu đầu vào không hợp lệ",
  "details": [
    {
      "field": "email",
      "message": "Email không hợp lệ"
    },
    {
      "field": "password",
      "message": "Mật khẩu phải dài ít nhất 6 ký tự"
    }
  ]
}
```

---

## 6.4. Rate Limiting

Tất cả API endpoints đều áp dụng rate limiting để chống spam và DDoS:

| Endpoint Pattern | Limit |
|-----------------|-------|
| `/api/auth/login` | 5 requests / 5 phút / IP |
| `/api/auth/register` | 3 requests / 10 phút / IP |
| `/api/*` (General) | 60 requests / 1 phút / IP |
| `/api/admin/*` | 100 requests / 1 phút / IP |

Khi vượt quá giới hạn, API trả về:

```json
{
  "success": false,
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Quá nhiều requests. Vui lòng thử lại sau.",
  "retryAfter": 60
}
```

**Headers:**
- `X-RateLimit-Remaining`: Số requests còn lại
- `Retry-After`: Số giây cần đợi trước khi thử lại

---

## 6.5. Authentication Headers

Hầu hết các protected endpoints yêu cầu authentication. NextAuth.js tự động quản lý session qua **httpOnly cookies**, không cần gửi token thủ công trong header.

**Đối với API calls từ Client:**
```typescript
// Client-side (Next.js App Router)
const response = await fetch('/api/exams/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data),
  credentials: 'include' // Quan trọng: gửi cookies
});
```

**Middleware tự động kiểm tra session:**
- Nếu chưa đăng nhập → 401 Unauthorized
- Nếu không đủ quyền → 403 Forbidden
- Nếu license hết hạn → 402 Payment Required

---

## 6.6. Pagination Pattern

Tất cả list endpoints đều hỗ trợ pagination với query params chuẩn:

**Query Parameters:**
- `page`: Trang hiện tại (default: 1)
- `limit`: Số items/trang (default: 20, max: 100)
- `sortBy`: Field để sort (vd: `createdAt`, `name`)
- `sortOrder`: `asc` hoặc `desc` (default: `desc`)

**Response format:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 6.7. Webhook & Real-time Events (Future)

Hiện tại hệ thống chưa implement webhooks. Trong tương lai có thể thêm:

- Webhook khi user hoàn thành bài thi
- Webhook khi license sắp hết hạn
- Real-time notifications qua WebSocket
- Server-Sent Events (SSE) cho live leaderboard

---

## 6.8. API Versioning Strategy

Hiện tại: **No versioning** (v1 implicit)

Khi có breaking changes trong tương lai:
- Tạo prefix `/api/v2/...`
- Maintain `/api/v1/...` trong 6 tháng
- Deprecation warnings trong response headers

---

## 6.9. Testing APIs

### Postman Collection

Có thể tạo Postman collection với:
- Pre-request script để login và lấy session cookie
- Environment variables cho BASE_URL
- Test scripts để validate response schema

### Example cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"Test123456"}'

# Activate License
curl -X POST http://localhost:3000/api/license/activate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"code":"VIC-ABCD-1234"}'

# Generate Exam
curl -X POST http://localhost:3000/api/exams/generate \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"Đề test","timeLimit":3600,"matrix":[{"categoryId":"cat-1","count":30}]}'
```
