/**
 * Beeknoee Billing & Token Economics System
 * Tài liệu tham khảo: https://platform.beeknoee.com/docs/pricing-explained
 *
 * Quy tắc tính tiền & thứ tự trừ tài nguyên:
 * 1. Thứ tự trừ tiền:
 *    - B1: Free Quota (Lượt thử miễn phí / Định mức cấp phát)
 *    - B2: Gói Token (Token trả trước mua theo gói)
 *    - B3: Ví VND (Số dư tiền mặt quy đổi theo tỷ giá cố định 1 USD = 27.500đ)
 * 2. Tỷ giá quy đổi cố định: 1 USD = 27.500 VND
 * 3. Đơn giá Beeknoee cho mô hình chuẩn:
 *    - Input / Prompt Tokens: $0.3 / 1,000,000 tokens ($0.0000003 / token)
 *    - Output / Completion Tokens: $1.2 / 1,000,000 tokens ($0.0000012 / token)
 * 4. Sàn phí tối thiểu mỗi request: 1 VND (trừ khi dùng Free Quota hoặc chi phí = 0đ)
 */

export const BEEKNOEE_CONFIG = {
  USD_TO_VND_RATE: 27500,
  PROMPT_PRICE_PER_1M_USD: 0.3,     // $0.3 per 1M prompt tokens
  COMPLETION_PRICE_PER_1M_USD: 1.2, // $1.2 per 1M completion tokens
  MIN_FEE_VND: 1,                   // Sàn phí tối thiểu mỗi request có phí
  ESTIMATED_TOKENS_PER_KHBD: 18500, // Ước tính trung bình 1 bài KHBD tiêu thụ ~18.5k tokens
} as const;

export interface TokenUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  costVnd: number;
  formattedUsd: string;
  formattedVnd: string;
}

export type DeductionSource = 'FREE_QUOTA' | 'TOKEN_PACKAGE' | 'VND_WALLET' | 'EXHAUSTED';

export interface DeductionResult {
  source: DeductionSource;
  canProceed: boolean;
  message: string;
  remainingQuota?: number;
  tokensDeducted?: number;
  vndDeducted?: number;
}

/**
 * Tính toán chi phí chính xác theo chuẩn Beeknoee API
 */
export function calculateBeeknoeeCost(
  promptTokens: number = 0,
  completionTokens: number = 0
): TokenUsageMetrics {
  const safePrompt = Math.max(0, promptTokens);
  const safeCompletion = Math.max(0, completionTokens);
  const totalTokens = safePrompt + safeCompletion;

  const promptCostUsd = (safePrompt * BEEKNOEE_CONFIG.PROMPT_PRICE_PER_1M_USD) / 1_000_000;
  const completionCostUsd = (safeCompletion * BEEKNOEE_CONFIG.COMPLETION_PRICE_PER_1M_USD) / 1_000_000;
  const costUsd = promptCostUsd + completionCostUsd;

  let costVnd = 0;
  if (costUsd > 0) {
    const rawVnd = Math.round(costUsd * BEEKNOEE_CONFIG.USD_TO_VND_RATE);
    costVnd = Math.max(BEEKNOEE_CONFIG.MIN_FEE_VND, rawVnd);
  }

  return {
    promptTokens: safePrompt,
    completionTokens: safeCompletion,
    totalTokens,
    costUsd,
    costVnd,
    formattedUsd: `$${costUsd.toFixed(6)}`,
    formattedVnd: `${costVnd.toLocaleString('vi-VN')} đ`,
  };
}

/**
 * Phân luồng trừ tài nguyên theo 3 bậc Beeknoee:
 * Free Quota -> Gói Token -> Ví VND
 */
export function resolveResourceDeduction(params: {
  isAdmin?: boolean;
  reviewQuotaTotal: number;
  reviewQuotaUsed: number;
  tokenBalance?: number;
  vndBalance?: number;
  costVnd: number;
  totalTokens: number;
}): DeductionResult {
  // Admin luôn có quyền vô hạn, không trừ quota
  if (params.isAdmin) {
    return {
      source: 'FREE_QUOTA',
      canProceed: true,
      message: 'Tài khoản Quản trị viên: Miễn phí & Vô hạn lượt thử.',
      remainingQuota: 999999,
      vndDeducted: 0,
    };
  }

  // Bậc 1: Free Quota (Lượt thử được cấp phát)
  const remainingReviews = Math.max(0, params.reviewQuotaTotal - params.reviewQuotaUsed);
  if (remainingReviews > 0) {
    return {
      source: 'FREE_QUOTA',
      canProceed: true,
      message: `Đã trừ 1 lượt thử miễn phí (Free Quota). Còn lại ${remainingReviews - 1} lượt.`,
      remainingQuota: remainingReviews - 1,
      vndDeducted: 0,
    };
  }

  // Bậc 2: Gói Token (Nếu có)
  const tokenBalance = params.tokenBalance || 0;
  if (tokenBalance >= params.totalTokens) {
    return {
      source: 'TOKEN_PACKAGE',
      canProceed: true,
      message: `Đã trừ ${params.totalTokens.toLocaleString('vi-VN')} tokens từ Gói Token đã mua.`,
      tokensDeducted: params.totalTokens,
      vndDeducted: 0,
    };
  }

  // Bậc 3: Ví VND (Số dư tài khoản)
  const vndBalance = params.vndBalance || 0;
  if (vndBalance >= params.costVnd) {
    return {
      source: 'VND_WALLET',
      canProceed: true,
      message: `Đã trừ ${params.costVnd.toLocaleString('vi-VN')} đ từ Ví VND (Tỷ giá 1 USD = 27.500đ).`,
      vndDeducted: params.costVnd,
    };
  }

  // Hết tài nguyên
  return {
    source: 'EXHAUSTED',
    canProceed: false,
    message: `Bạn đã sử dụng hết lượt thử miễn phí và số dư ví không đủ ${params.costVnd.toLocaleString('vi-VN')} đ. Vui lòng liên hệ Nhân viên/Admin để được cấp thêm hạn mức hoặc nạp tiền ví.`,
    remainingQuota: 0,
  };
}

/**
 * Hạn mức mặc định theo vai trò trong hệ thống
 */
export const ROLE_DEFAULT_QUOTAS = {
  ADMIN: {
    totalQuota: 999999,
    description: 'Vô hạn lượt, toàn quyền hệ thống',
  },
  TEACHER: {
    totalQuota: 50,
    description: '50 lượt thẩm định KHBD / tháng, hỗ trợ khách hàng',
  },
  LEARNER: {
    totalQuota: 10,
    description: '10 lượt thẩm định KHBD dùng thử ban đầu',
  },
} as const;
