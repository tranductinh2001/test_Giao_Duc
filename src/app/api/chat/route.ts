// API Route: Interactive AI Q&A for Lesson Plan (Công văn 5512)

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getBeekOneClient } from '@/lib/ai/client';
import { DocumentIR } from '@/types/document';
import { Review } from '@/types/review';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `Bạn là Chuyên gia Tư vấn Sư phạm AI hàng đầu Việt Nam, am hiểu sâu sắc Công văn 5512/BGDĐT của Bộ Giáo dục & Đào tạo về xây dựng và tổ chức kế hoạch bài dạy.
Nhiệm vụ của bạn là đồng hành, giải đáp và hỗ trợ giáo viên hoàn thiện giáo án:
1. Phân tích đối chiếu trực tiếp với các tiêu chuẩn của Công văn 5512 (Mục tiêu 3 mặt: kiến thức - năng lực - phẩm chất; Chuỗi 4 hoạt động: Khởi động - Khám phá - Luyện tập - Vận dụng; 4 bước tổ chức GV-HS: Chuyển giao - Thực hiện - Báo cáo - Kết luận; Thiết bị & Học liệu; Kiểm tra đánh giá).
2. Khi giáo viên hỏi về một mục hoặc đoạn cụ thể, hãy đưa ra ví dụ viết lại (soạn mẫu) cụ thể, sinh động, có thể áp dụng được ngay vào lớp học.
3. Giữ thái độ hỗ trợ, tôn trọng, ngôn ngữ sư phạm chuẩn mực, định dạng markdown rõ ràng (tiêu đề, gạch đầu dòng, bảng biểu nếu cần).`;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng đăng nhập để sử dụng trợ lý hỏi đáp AI' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      message,
      history = [],
      document,
      reviews = [],
      selectedContext,
    } = body as {
      message: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      document?: DocumentIR;
      reviews?: Review[];
      selectedContext?: {
        text: string;
        page: number;
        targetId?: string;
      };
    };

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Thiếu nội dung câu hỏi' },
        { status: 400 }
      );
    }

    // Build context prompt
    let contextStr = '';
    if (document) {
      contextStr += `\n### THÔNG TIN GIÁO ÁN:\n`;
      contextStr += `- Tài liệu: ${document.metadata.filename}\n`;
      contextStr += `- Số trang: ${document.pages.length} trang, ${document.paragraphs.length} đoạn văn bản, ${document.activities.length} hoạt động.\n`;

      if (document.sections.length > 0) {
        contextStr += `- Các phần chính: ${document.sections.map((s) => s.title).join(' | ')}\n`;
      }
      if (document.activities.length > 0) {
        contextStr += `- Các hoạt động: ${document.activities.map((a) => a.title).join(' | ')}\n`;
      }
    }

    if (reviews.length > 0) {
      contextStr += `\n### CÁC ĐÁNH GIÁ SƯ PHẠM HIỆN TẠI THEO CV 5512:\n`;
      reviews.slice(0, 8).forEach((r, idx) => {
        contextStr += `${idx + 1}. [${r.severity}] ${r.message}`;
        if (r.suggestion) contextStr += ` (Gợi ý: ${r.suggestion})`;
        contextStr += `\n`;
      });
    }

    if (selectedContext?.text) {
      contextStr += `\n### ĐOẠN VĂN BẢN ĐANG ĐƯỢC CHỌN (Trang ${selectedContext.page}):\n"${selectedContext.text}"\n`;
    }

    // Build prompt with conversation history
    let fullPrompt = `${contextStr}\n\n### LỊCH SỬ HỎI ĐÁP GẦN ĐÂY:\n`;
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      fullPrompt += `${h.role === 'user' ? 'Giáo viên' : 'Chuyên gia AI'}: ${h.content}\n\n`;
    }

    fullPrompt += `Giáo viên hỏi: ${message}\n\nHãy trả lời chi tiết, chuẩn xác theo chuẩn sư phạm Công văn 5512:`;

    const client = getBeekOneClient();
    const result = await client.chat(fullPrompt, SYSTEM_PROMPT, {
      temperature: 0.3,
      maxTokens: 3000,
    });

    if (!result.success || !result.data) {
      throw new Error(result.error?.message || 'Không thể tạo phản hồi từ AI');
    }

    return NextResponse.json({
      success: true,
      answer: result.data,
    });
  } catch (error) {
    logger.error('Chat API failed', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Lỗi xử lý hỏi đáp AI',
      },
      { status: 500 }
    );
  }
}
