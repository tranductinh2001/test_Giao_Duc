# 14. Tổng hợp thống kê học tập (Analytics & Statistics Engine)

Hệ thống thống kê giúp chuyển đổi dữ liệu thô từ các lượt thi (`ExamAttempt`) và các câu trả lời chi tiết (`ExamAttemptAnswer`) thành các biểu đồ trực quan, hỗ trợ người học điều chỉnh lộ trình ôn tập và Admin quản lý hiệu quả hoạt động hệ thống.

---

## 14.1. Các chỉ số thống kê cốt lõi (Key Metrics)

### Dành cho Người học (User Analytics)
1.  **Tần suất luyện tập:** Số lượt làm bài thi/luyện tập theo ngày trong 30 ngày gần nhất (biểu thị bằng biểu đồ cột hoặc biểu đồ đường).
2.  **Điểm số trung bình:** Xu hướng thay đổi điểm số qua các bài thi thử gần nhất (biểu đồ đường).
3.  **Tỷ lệ Đạt / Không đạt:** Tỷ lệ % số bài thi thử đạt trên 50% tổng số câu (biểu đồ tròn).
4.  **Phân bổ năng lực:** Điểm số chi tiết và xếp hạng mạnh/yếu theo từng chương mục luật pháp (biểu đồ cột hoặc biểu đồ Radar).

### Dành cho Quản trị viên (Admin Analytics)
1.  **Tăng trưởng người dùng:** Số tài khoản đăng ký mới theo tuần, tháng.
2.  **Thống kê License:** Tỷ lệ License chưa dùng (`UNUSED`), đã kích hoạt (`ACTIVATED`) và đã hết hạn (`EXPIRED`).
3.  **Độ bao phủ câu hỏi:** Số lượng câu hỏi hiện có phân bổ theo các category chính và độ khó.

---

## 14.2. Thiết kế các truy vấn cơ sở dữ liệu (Prisma Queries)

### 1. Truy vấn thống kê xu hướng điểm số gần nhất của học viên
```typescript
import { prisma } from "@/lib/prisma";

export async function getUserScoreTrend(userId: string, limit = 10) {
  const attempts = await prisma.examAttempt.findMany({
    where: {
      userId,
      status: "SUBMITTED"
    },
    orderBy: {
      startedAt: "asc" // Đọc từ cũ đến mới để vẽ xu hướng thời gian
    },
    take: limit,
    select: {
      startedAt: true,
      score: true,
      exam: { select: { title: true } }
    }
  });

  // Format dữ liệu phù hợp với định dạng đầu vào của Recharts
  return attempts.map(att => ({
    date: new Date(att.startedAt).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" }),
    score: att.score,
    examTitle: att.exam.title
  }));
}
```

### 2. Truy vấn phân tích tỷ lệ Đạt / Không đạt của học viên
```typescript
export async function getUserPassFailRatio(userId: string) {
  const attempts = await prisma.examAttempt.findMany({
    where: { userId, status: "SUBMITTED" },
    select: { score: true }
  });

  let passed = 0;
  let failed = 0;

  attempts.forEach(att => {
    if (att.score >= 50.0) { // Điểm đạt >= 50%
      passed++;
    } else {
      failed++;
    }
  });

  return [
    { name: "Đạt (>=50 điểm)", value: passed, color: "#10b981" },
    { name: "Không đạt (<50 điểm)", value: failed, color: "#ef4444" }
  ];
}
```

---

## 14.3. Định dạng tích hợp Recharts ở Frontend

Dữ liệu API trả về được map trực tiếp vào các component của thư viện **Recharts** để tạo giao diện biểu đồ động tương thích Responsive:

### Ví dụ tích hợp Biểu đồ Đường (Xu hướng điểm số)
```tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ScoreTrendChartProps {
  data: { date: string; score: number; examTitle: string }[];
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} />
          <Tooltip 
            formatter={(value: any, name: any, props: any) => [`${value} điểm`, props.payload.examTitle]}
          />
          <Line 
            type="monotone" 
            dataKey="score" 
            stroke="#6366f1" 
            strokeWidth={3} 
            activeDot={{ r: 8 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```
Các thiết kế biểu đồ khác (Radar Chart cho điểm mạnh/yếu, Bar Chart cho tần suất học tập) sẽ được cấu hình tương ứng để đem lại trải nghiệm giao diện trực quan và cao cấp nhất.
