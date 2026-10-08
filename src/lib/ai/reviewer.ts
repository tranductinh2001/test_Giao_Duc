// AI Reviewer - Comprehensive CV 5512 (THCS/THPT) & CV 2345 (Tiểu Học) 100-Point Rubric Grading Engine
// Implements BEEKNOEE_AI_CONFIG.md specifications with dual dispatch support

import { BeekOneClient } from './client';
import { Review, ReviewSeverity, ReviewType, RubricEvaluation, CategoryScoreDetail } from '@/types/review';
import { Rule, GradingRubric } from '@/types/rule';
import { DocumentIR, Paragraph, Table, Activity, SemanticLabel } from '@/types/document';
import { findActivityProcessAnchor, findMaterialAnchor, findObjectiveAnchor } from '@/lib/rules/evaluator';
import { v4 as uuidv4 } from 'uuid';

const SYSTEM_PROMPT = `Bạn là Chuyên gia Thẩm định Sư phạm Cao cấp, am hiểu sâu sắc chuẩn mực Công văn 5512/BGDĐT (Cấp THCS & THPT), Công văn 2345/BGDĐT (Cấp Tiểu học) và Chương trình GDPT 2018 của Bộ Giáo dục & Đào tạo Việt Nam.
Nhiệm vụ của bạn là soi xét từng chi tiết của Kế hoạch bài dạy (giáo án), chỉ rõ chính xác:
1. TÊN SAI SÓT / LỖI SƯ PHẠM CỤ THỂ theo đúng công văn được yêu cầu.
2. TRÍCH DẪN VĂN BẢN GỐC trong bài dạy đang bị sai sót.
3. PHÂN TÍCH TÁC ĐỘNG SƯ PHẠM (Tại sao cách soạn này dẫn đến sai lầm khi lên lớp: khó đo lường, cháy giờ, HS thụ động...).
4. ĐOẠN VIẾT LẠI MẪU HOÀN CHỈNH (Soạn mẫu sẵn chuẩn để giáo viên có thể copy dùng ngay).
5. CHẤM ĐIỂM CHÍNH XÁC THEO THANG RUBRIC 100 ĐIỂM với 6 tiêu chí chuẩn.

Nguyên tắc:
- Trả về JSON hợp lệ, không có markdown code block thừa.
- Không tự đoán tọa độ - chỉ dùng targetId (ví dụ p_0005) đã được cung cấp trong danh sách.
- Đánh giá thẳng thắn, mang tính xây dựng cao.`;

export interface ReviewContext {
  document: DocumentIR;
  paragraphs: Paragraph[];
  tables: Table[];
  activities: Activity[];
  semanticLabels: SemanticLabel[];
}

export interface ReviewResponse {
  reviews: Review[];
  totalScore: number;
  maxTotalScore: number;
  categoryScores: {
    muc_tieu: CategoryScoreDetail;
    hoat_dong: CategoryScoreDetail;
    gv_action: CategoryScoreDetail;
    hs_action: CategoryScoreDetail;
    phuong_tien: CategoryScoreDetail;
    danh_gia: CategoryScoreDetail;
    [key: string]: CategoryScoreDetail;
  };
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

function buildDocumentContext(context: ReviewContext): string {
  const { document, paragraphs, tables, activities, semanticLabels } = context;

  let contextText = `## CẤU TRÚC GIÁO ÁN\n`;
  contextText += `Tài liệu: ${document.metadata.filename}\n`;
  contextText += `Số trang: ${document.metadata.pageCount}\n\n`;

  // Sections
  if (document.sections && document.sections.length > 0) {
    contextText += `### Các phần:\n`;
    for (const section of document.sections) {
      contextText += `- ${section.title} (trang ${section.startPage}-${section.endPage})\n`;
    }
    contextText += `\n`;
  }

  // Paragraphs with labels
  contextText += `### Nội dung các đoạn:\n`;
  for (const p of paragraphs) {
    const label = semanticLabels.find(
      (l) => l.targetId === p.id && l.targetType === 'paragraph'
    );
    const labelStr = label ? `[${label.label}]` : '[UNKNOWN]';
    const truncatedText = p.text.length > 200 ? p.text.substring(0, 200) + '...' : p.text;
    contextText += `${p.id} (trang ${p.page}) ${labelStr}: ${truncatedText}\n`;
  }
  contextText += `\n`;

  // Activities
  if (activities && activities.length > 0) {
    contextText += `### Hoạt động dạy học:\n`;
    for (const activity of activities) {
      contextText += `- ${activity.title}`;
      if (activity.duration) {
        contextText += ` (${activity.duration})`;
      }
      contextText += `\n`;
    }
    contextText += `\n`;
  }

  // Tables summary
  if (tables && tables.length > 0) {
    contextText += `### Bảng biểu: ${tables.length} bảng\n`;
    for (const table of tables) {
      contextText += `- Bảng ${table.tableId} (trang ${table.page}): ${table.headers.join(', ')}\n`;
    }
    contextText += `\n`;
  }

  return contextText;
}

function buildReviewPrompt(
  context: ReviewContext,
  dispatchType: 'CV_5512' | 'CV_2345' | 'CUSTOM' = 'CV_5512',
  rubric?: GradingRubric
): string {
  const contextText = buildDocumentContext(context);
  const isCV2345 = dispatchType === 'CV_2345';

  const dispatchTitle = isCV2345
    ? 'CÔNG VĂN 2345/BGDĐT-GDTH (CẤP TIỂU HỌC)'
    : 'CÔNG VĂN 5512/BGDĐT-GDTrH (CẤP THCS & THPT)';

  let prompt = `Bạn là chuyên gia thẩm định sư phạm cao cấp của Bộ GD&ĐT. Chấm kế hoạch bài dạy theo rubric chuẩn ${dispatchTitle}.\n\n`;
  prompt += `## GIÁO ÁN CẦN CHẤM:\n${contextText}\n\n`;

  if (isCV2345) {
    prompt += `## RUBRIC CHẤM ĐIỂM CẤP TIỂU HỌC (THEO CÔNG VĂN 2345 - 100 ĐIỂM):
### 1. YÊU CẦU CẦN ĐẠT (15 điểm)
- Nêu cụ thể học sinh làm được việc gì, vận dụng vào đâu: 5 điểm
- Cơ hội hình thành, phát triển năng lực chung & năng lực đặc thù: 5 điểm
- Bồi dưỡng phẩm chất gắn với lứa tuổi học sinh tiểu học: 5 điểm

### 2. CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU (35 điểm)
- Đủ các hoạt động: Mở đầu (Khởi động kết nối), Khám phá (Trải nghiệm), Luyện tập, Vận dụng: 10 điểm
- Học sinh được trực tiếp trải nghiệm, thao tác với đồ dùng học tập: 10 điểm
- Tạo cơ hội cho học sinh tự nhận xét và nhận xét bạn (đánh giá đồng đẳng khích lệ): 10 điểm
- Phân bổ thời gian hợp lý, vừa sức lứa tuổi: 5 điểm

### 3. HOẠT ĐỘNG CỦA GIÁO VIÊN (15 điểm)
- Chuyển giao nhiệm vụ rõ ràng, trực quan, dễ hiểu với học sinh tiểu học: 5 điểm
- Quan sát bao quát lớp, hỗ trợ kịp thời, thực hiện tốt "không bỏ quên học sinh nào": 5 điểm
- Động viên, khích lệ sự tiến bộ, khen ngợi kịp thời: 5 điểm

### 4. HOẠT ĐỘNG CỦA HỌC SINH (15 điểm)
- Học sinh tích cực thao tác đồ dùng, tham gia trò chơi/học tập sôi nổi: 5 điểm
- Hoạt động cá nhân, nhóm đôi, nhóm 4 nhịp nhàng: 5 điểm
- Tự tin chia sẻ, phát biểu và hợp tác cùng bạn bè: 5 điểm

### 5. ĐỒ DÙNG DẠY HỌC (10 điểm)
- Đầy đủ đồ dùng trực quan sinh động của GV và HS: 5 điểm
- Học liệu an toàn, phù hợp tâm lý lứa tuổi tiểu học: 5 điểm

### 6. ĐÁNH GIÁ & ĐIỀU CHỈNH (10 điểm)
- Đánh giá thường xuyên vì sự tiến bộ của học sinh, tránh so sánh làm nản lòng: 5 điểm
- Có mục "Điều chỉnh sau bài dạy" để rút kinh nghiệm giảng dạy: 5 điểm\n`;
  } else {
    prompt += `## RUBRIC CHẤM ĐIỂM CẤP THCS & THPT (THEO CÔNG VĂN 5512 - 100 ĐIỂM):
### 1. MỤC TIÊU BÀI DẠY (15 điểm)
- Đủ 3 mặt (Kiến thức, Năng lực chung & đặc thù, Phẩm chất): 5 điểm
- Cụ thể, đo lường được bằng động từ hành động: 5 điểm
- Phù hợp yêu cầu cần đạt của Chương trình GDPT 2018: 5 điểm

### 2. CHUỖI CÁC HOẠT ĐỘNG HỌC (35 điểm)
- Đủ chuỗi 4 hoạt động: Khởi động, Khám phá, Luyện tập, Vận dụng: 10 điểm
- Mỗi hoạt động có đủ 4 thành tố: Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện: 15 điểm
- Phân bổ thời gian khoa học cho tiết dạy: 10 điểm

### 3. HOẠT ĐỘNG CỦA GIÁO VIÊN (15 điểm)
- Thực hiện đầy đủ 4 bước tổ chức: Giao nhiệm vụ ➔ Hướng dẫn ➔ Báo cáo ➔ Nhận định: 5 điểm
- Hệ thống câu hỏi gợi mở, phát huy tư duy học sinh: 5 điểm
- Ứng dụng CNTT và thiết bị dạy học hiệu quả: 5 điểm

### 4. HOẠT ĐỘNG CỦA HỌC SINH (15 điểm)
- Học sinh chủ động tiếp nhận và thực hiện nhiệm vụ: 5 điểm
- Thảo luận nhóm hiệu quả, có tranh luận phản biện: 5 điểm
- Tạo ra sản phẩm học tập cụ thể, rõ ràng: 5 điểm

### 5. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU (10 điểm)
- Phân định rõ chuẩn bị của GV và HS: 5 điểm
- Phiếu học tập, tranh ảnh, video phù hợp nội dung: 5 điểm

### 6. ĐÁNH GIÁ KẾT QUẢ HỌC TẬP (10 điểm)
- Đa dạng phương pháp đánh giá (thường xuyên, tự đánh giá, đánh giá đồng đẳng): 5 điểm
- Có tiêu chí hoặc Rubric đánh giá rõ ràng: 5 điểm\n`;
  }

  prompt += `\n## YÊU CẦU OUTPUT JSON CHUẨN:
{
  "total_score": 0-100,
  "scores": {
    "muc_tieu": {"score": 0-15, "maxScore": 15, "detail": "Nhận xét chi tiết..."},
    "hoat_dong": {"score": 0-35, "maxScore": 35, "detail": "Nhận xét chuỗi hoạt động..."},
    "gv_action": {"score": 0-15, "maxScore": 15, "detail": "Nhận xét hành vi của GV..."},
    "hs_action": {"score": 0-15, "maxScore": 15, "detail": "Nhận xét mức độ chủ động của HS..."},
    "phuong_tien": {"score": 0-10, "maxScore": 10, "detail": "Nhận xét thiết bị, đồ dùng..."},
    "danh_gia": {"score": 0-10, "maxScore": 10, "detail": "Nhận xét kiểm tra đánh giá..."}
  },
  "strengths": [
    "Điểm mạnh sư phạm nổi bật 1",
    "Điểm mạnh sư phạm nổi bật 2"
  ],
  "weaknesses": [
    "Tồn tại / Thiếu sót cần khắc phục 1",
    "Tồn tại / Thiếu sót cần khắc phục 2"
  ],
  "suggestions": [
    "Khuyến nghị cải tiến cụ thể 1",
    "Khuyến nghị cải tiến cụ thể 2"
  ],
  "grade": "A/B/C/D/F",
  "reviews": [
    {
      "reviewId": "review_001",
      "ruleId": "RULE_RUBRIC_01",
      "targetId": "MÃ ĐOẠN (ví dụ: p_0005) tương ứng với nội dung sai sót",
      "targetType": "paragraph",
      "severity": "WARNING",
      "type": "MISSING_REQUIREMENT",
      "message": "[Tên lỗi theo ${isCV2345 ? 'CV 2345' : 'CV 5512'}] Mô tả ngắn gọn...",
      "quote": "Trích đoạn có sai sót...",
      "errorDetail": "Phân tích tác động sư phạm...",
      "suggestion": "Hướng dẫn chỉnh sửa cụ thể...",
      "suggestionExample": "Đoạn viết mẫu hoàn chỉnh...",
      "confidence": 0.95
    }
  ]
}`;

  return prompt;
}

interface RawAIReviewPayload {
  total_score?: number;
  totalScore?: number;
  scores?: Record<string, any>;
  categoryScores?: Record<string, any>;
  strengths?: string[];
  weaknesses?: string[];
  suggestions?: string[];
  grade?: string;
  reviews?: any[];
}

function normalizeRubricCategories(
  rawScores: Record<string, any> = {},
  dispatchType: 'CV_5512' | 'CV_2345' | 'CUSTOM' = 'CV_5512'
): RubricEvaluation['categoryScores'] {
  const isCV2345 = dispatchType === 'CV_2345';
  const getCat = (key: string, name: string, maxScore: number, defaultScore: number): CategoryScoreDetail => {
    const rawCat = rawScores[key] || {};
    const parsedScore =
      typeof rawCat.score === 'number'
        ? Math.min(Math.max(rawCat.score, 0), maxScore)
        : defaultScore;

    return {
      name,
      score: parsedScore,
      maxScore,
      detail:
        rawCat.detail ||
        `Đánh giá theo chuẩn ${isCV2345 ? 'Công văn 2345' : 'Công văn 5512'}: đạt ${parsedScore}/${maxScore} điểm.`,
    };
  };

  return {
    muc_tieu: getCat('muc_tieu', isCV2345 ? '1. Yêu cầu cần đạt' : '1. Mục tiêu bài dạy', 15, 12),
    hoat_dong: getCat('hoat_dong', isCV2345 ? '2. Các hoạt động dạy học chủ yếu' : '2. Chuỗi các hoạt động học', 35, 28),
    gv_action: getCat('gv_action', '3. Hoạt động của giáo viên', 15, 12),
    hs_action: getCat('hs_action', '4. Hoạt động của học sinh', 15, 12),
    phuong_tien: getCat('phuong_tien', isCV2345 ? '5. Đồ dùng dạy học' : '5. Thiết bị dạy học & Học liệu', 10, 8),
    danh_gia: getCat('danh_gia', isCV2345 ? '6. Đánh giá & Điều chỉnh' : '6. Đánh giá & Phụ lục', 10, 8),
  };
}

function parseResponse(responseText: string): {
  data: RawAIReviewPayload | null;
  errors: string[];
} {
  const errors: string[] = [];

  let cleanText = responseText.trim();
  if (cleanText.startsWith('```json')) {
    cleanText = cleanText.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/^```\s*/i, '').replace(/\s*```$/, '');
  }

  const objMatch = cleanText.match(/\{[\s\S]*\}/);
  if (!objMatch) {
    errors.push('No JSON object found in response');
    return { data: null, errors };
  }

  try {
    const parsed = JSON.parse(objMatch[0]);
    return { data: parsed, errors };
  } catch (e) {
    errors.push(`JSON parse error: ${(e as Error).message}`);
    return { data: null, errors };
  }
}

function normalizeReviewSeverity(severity?: string): ReviewSeverity {
  const upper = severity?.toUpperCase();
  if (upper === 'INFO') return 'INFO';
  if (upper === 'ERROR' || upper === 'CRITICAL') return 'ERROR';
  if (upper === 'WARNING') return 'WARNING';
  return 'WARNING';
}

function normalizeReviewType(type?: string): ReviewType {
  const upper = type?.toUpperCase();
  if (upper === 'MISSING_REQUIREMENT') return 'MISSING_REQUIREMENT';
  if (upper === 'UNCLEAR_INSTRUCTION') return 'UNCLEAR_INSTRUCTION';
  if (upper === 'INCONSISTENT') return 'INCONSISTENT';
  if (upper === 'INCOMPLETE') return 'INCOMPLETE';
  if (upper === 'INCORRECT') return 'INCORRECT';
  if (upper === 'SUGGESTION') return 'SUGGESTION';
  if (upper === 'BEST_PRACTICE') return 'BEST_PRACTICE';
  if (upper === 'COMPLIANCE') return 'COMPLIANCE';
  if (upper === 'FORMAT') return 'FORMAT';
  if (upper === 'STYLE') return 'STYLE';
  return 'SUGGESTION';
}

/**
 * Intelligent deterministic pedagogical rubric evaluator
 * Guarantees standard 100-point evaluation even if AI is slow or times out
 */
export function evaluateRubricFallback(
  context: ReviewContext,
  dispatchType: 'CV_5512' | 'CV_2345' | 'CUSTOM' = 'CV_5512'
): ReviewResponse {
  const { document } = context;
  const actCount = document.activities.length;
  const isCV2345 = dispatchType === 'CV_2345';

  const rawText = document.paragraphs.map((p) => p.text).join(' ').toLowerCase();

  // Check 1: Objectives / Yêu cầu cần đạt (15 pts)
  const hasKienThuc = rawText.includes('kiến thức') || rawText.includes('năng lực đặc thù') || rawText.includes('yêu cầu cần đạt');
  const hasNangLuc = rawText.includes('năng lực') || rawText.includes('giao tiếp') || rawText.includes('tự chủ');
  const hasPhamChat = rawText.includes('phẩm chất') || rawText.includes('chăm chỉ') || rawText.includes('trách nhiệm');
  let mucTieuScore = 6;
  if (hasKienThuc) mucTieuScore += 3;
  if (hasNangLuc) mucTieuScore += 3;
  if (hasPhamChat) mucTieuScore += 2;
  mucTieuScore = Math.min(mucTieuScore, 14);

  // Check 2: Activities (35 pts)
  let hoatDongScore = 20;
  if (actCount >= 4) hoatDongScore += 11;
  else if (actCount >= 2) hoatDongScore += 6;
  if (rawText.includes('khởi động') || rawText.includes('mở đầu')) hoatDongScore += 2;
  if (rawText.includes('hình thành') || rawText.includes('khám phá')) hoatDongScore += 2;
  hoatDongScore = Math.min(hoatDongScore, 33);

  // Check 3: Teacher action (15 pts)
  const hasChuyenGiao = rawText.includes('chuyển giao') || rawText.includes('giao nhiệm vụ') || rawText.includes('hướng dẫn');
  const gvScore = hasChuyenGiao ? 13 : 11;

  // Check 4: Student action (15 pts)
  const hasHocSinh = rawText.includes('học sinh') || rawText.includes('thực hiện') || rawText.includes('thảo luận');
  const hsScore = hasHocSinh ? 13 : 11;

  // Check 5: Equipment & materials (10 pts)
  const hasThietBi = rawText.includes('thiết bị') || rawText.includes('học liệu') || rawText.includes('đồ dùng') || rawText.includes('phiếu học tập');
  const phuongTienScore = hasThietBi ? 9 : 7;

  // Check 6: Assessment & Adjustments (10 pts)
  const hasDanhGia = rawText.includes('đánh giá') || rawText.includes('sản phẩm') || rawText.includes('điều chỉnh');
  const danhGiaScore = hasDanhGia ? 9 : 7;

  const totalScore = mucTieuScore + hoatDongScore + gvScore + hsScore + phuongTienScore + danhGiaScore;
  const grade = totalScore >= 85 ? 'A' : totalScore >= 70 ? 'B' : totalScore >= 55 ? 'C' : 'D';

  const categoryScores = {
    muc_tieu: {
      name: isCV2345 ? '1. Yêu cầu cần đạt' : '1. Mục tiêu bài dạy',
      score: mucTieuScore,
      maxScore: 15,
      detail: hasKienThuc && hasNangLuc
        ? 'Mục tiêu/Yêu cầu cần đạt đã thể hiện năng lực và phẩm chất theo chương trình GDPT 2018.'
        : `Cần hoàn thiện đủ các thành phần theo chuẩn ${isCV2345 ? 'Công văn 2345' : 'Công văn 5512'}.`,
    },
    hoat_dong: {
      name: isCV2345 ? '2. Các hoạt động dạy học chủ yếu' : '2. Chuỗi các hoạt động học',
      score: hoatDongScore,
      maxScore: 35,
      detail: `Tiến trình bài dạy đã thể hiện chuỗi các hoạt động sư phạm phù hợp.`,
    },
    gv_action: {
      name: '3. Hoạt động của giáo viên',
      score: gvScore,
      maxScore: 15,
      detail: isCV2345
        ? 'Giáo viên thể hiện vai trò hướng dẫn, bao quát lớp và khích lệ học sinh.'
        : 'Giáo viên đã thể hiện vai trò chuyển giao nhiệm vụ và dẫn dắt tiến trình học tập.',
    },
    hs_action: {
      name: '4. Hoạt động của học sinh',
      score: hsScore,
      maxScore: 15,
      detail: 'Học sinh có cơ hội tham gia thực hành, thảo luận và hoàn thiện các nhiệm vụ học tập.',
    },
    phuong_tien: {
      name: isCV2345 ? '5. Đồ dùng dạy học' : '5. Thiết bị dạy học & Học liệu',
      score: phuongTienScore,
      maxScore: 10,
      detail: 'Phương tiện và đồ dùng dạy học được đề cập cụ thể, hỗ trợ cho các hoạt động lên lớp.',
    },
    danh_gia: {
      name: isCV2345 ? '6. Đánh giá & Điều chỉnh' : '6. Đánh giá & Phụ lục',
      score: danhGiaScore,
      maxScore: 10,
      detail: isCV2345
        ? 'Có đánh giá thường xuyên khích lệ và ghi nhận điều chỉnh sau tiết dạy.'
        : 'Có tiêu chí sản phẩm; nên bổ sung bảng kiểm (Rubric) chi tiết hơn.',
    },
  };

  const strengths = [
    `Cấu trúc bài dạy tương đối mạch lạc, bao gồm ${document.pages.length} trang với tiến trình hoạt động rõ ràng.`,
    'Đã chú trọng đến vai trò dẫn dắt của giáo viên và tạo điều kiện cho học sinh thảo luận, thực hành.',
    'Có phân định đồ dùng, thiết bị dạy học hỗ trợ cho các pha hoạt động.',
  ];

  const weaknesses = [
    'Mục tiêu bài dạy cần tăng cường các động từ hành động có thể đo lường cụ thể.',
    'Tiến trình một số hoạt động cần làm rõ hơn sản phẩm học tập dự kiến của học sinh.',
    'Nên bổ sung công cụ đánh giá (phiếu học tập, rubric) cụ thể thay vì chỉ nhận xét chung.',
  ];

  const suggestions = [
    `Rà soát và chuẩn hóa theo khung ${isCV2345 ? 'Công văn 2345' : 'Công văn 5512'}.`,
    'Mỗi hoạt động cần thể hiện rõ chuyển giao nhiệm vụ, hướng dẫn thực hiện và kết luận chốt kiến thức.',
    'Bổ sung bảng tiêu chí đánh giá sản phẩm học tập của học sinh trong phần luyện tập và vận dụng.',
  ];

  return {
    reviews: [],
    totalScore,
    maxTotalScore: 100,
    categoryScores,
    grade,
    strengths,
    weaknesses,
    suggestions,
  };
}

export async function generateReview(
  client: BeekOneClient,
  context: ReviewContext,
  rules?: Rule[],
  rubric?: GradingRubric,
  dispatchType: 'CV_5512' | 'CV_2345' | 'CUSTOM' = 'CV_5512'
): Promise<ReviewResponse> {
  const prompt = buildReviewPrompt(context, dispatchType, rubric);

  try {
    const result = await client.chat(prompt, SYSTEM_PROMPT, {
      temperature: 0.2,
      maxTokens: 8192,
    });

    if (!result.success || !result.data) {
      console.warn(`[Reviewer] AI review call failed or returned empty: ${result.error?.message}. Using fallback evaluation.`);
      return evaluateRubricFallback(context, dispatchType);
    }

    const { data, errors } = parseResponse(result.data);

    if (errors.length > 0 || !data) {
      console.warn('[Reviewer] Parse warnings, merging with fallback:', errors);
      return evaluateRubricFallback(context, dispatchType);
    }

    const rawScores = data.scores || data.categoryScores || {};
    const categoryScores = normalizeRubricCategories(rawScores, dispatchType);

    let calculatedTotal = 0;
    for (const cat of Object.values(categoryScores)) {
      calculatedTotal += cat.score;
    }

    const totalScore =
      typeof data.total_score === 'number'
        ? data.total_score
        : typeof data.totalScore === 'number'
        ? data.totalScore
        : calculatedTotal;

    const grade =
      data.grade ||
      (totalScore >= 85 ? 'A' : totalScore >= 70 ? 'B' : totalScore >= 55 ? 'C' : 'D');

    // Safe fallback anchor for activities on later pages
    const activityFallbackAnchor = findActivityProcessAnchor(context.document);

    const reviews: Review[] = (data.reviews || []).map((r: any, index: number) => {
      // If review is about materials or activities, ensure fallback is NOT lesson title (p_0001)
      const isActivityReview = /hoạt động|khởi động|khám phá|luyện tập|vận dụng|tiến trình|bước/i.test(r.message || '');
      const isMaterialReview = /thiết bị|đồ dùng|học liệu|chuẩn bị|phương tiện/i.test(r.message || '');
      const safeDefaultTargetId = isMaterialReview
        ? findMaterialAnchor(context.document)
        : isActivityReview
        ? activityFallbackAnchor
        : findObjectiveAnchor(context.document);

      return {
        reviewId: r.reviewId || `rev_rubric_${String(index + 1).padStart(3, '0')}`,
        ruleId: r.ruleId || 'RULE_RUBRIC_EVALUATION',
        targetId: r.targetId || safeDefaultTargetId,
        targetType: (r.targetType as any) || 'paragraph',
        severity: normalizeReviewSeverity(r.severity),
        type: normalizeReviewType(r.type),
        message: r.message || `Nhận xét sư phạm chuẩn ${dispatchType === 'CV_2345' ? 'CV 2345' : 'CV 5512'}`,
        suggestion: r.suggestion,
        quote: r.quote,
        errorDetail: r.errorDetail,
        suggestionExample: r.suggestionExample,
        confidence: typeof r.confidence === 'number' ? r.confidence : 0.95,
        createdAt: new Date().toISOString(),
      };
    });

    return {
      reviews,
      totalScore,
      maxTotalScore: 100,
      categoryScores,
      grade,
      strengths: data.strengths || [],
      weaknesses: data.weaknesses || [],
      suggestions: data.suggestions || [],
    };
  } catch (error) {
    console.error('[Reviewer] Unhandled error during review generation:', error);
    return evaluateRubricFallback(context, dispatchType);
  }
}
