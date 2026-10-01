// AI Models configuration - Single Source of Truth
// All AI model dropdowns in the system use this config

export interface AIModelConfig {
  id: string;
  displayName: string;
  provider: string;
  inputPrice: number;  // USD per 1M tokens
  outputPrice: number; // USD per 1M tokens
  unit: string;
  isActive: boolean;
  sortOrder: number;
}

// Model tiers for badge display
export type ModelTier = 'flash-lite' | 'flash' | 'pro' | 'preview';

export function getModelTier(modelId: string): ModelTier {
  const id = modelId.toLowerCase();
  if (id.includes('flash-lite')) return 'flash-lite';
  if (id.includes('flash')) return 'flash';
  if (id.includes('pro')) return 'pro';
  if (id.includes('preview')) return 'preview';
  return 'flash';
}

export function getTierBadge(tier: ModelTier): { label: string; color: string } {
  switch (tier) {
    case 'flash-lite':
      return { label: 'Flash Lite', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
    case 'flash':
      return { label: 'Flash', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
    case 'pro':
      return { label: 'Pro', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' };
    case 'preview':
      return { label: 'Preview', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    default:
      return { label: tier, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' };
  }
}

// Single Source of Truth - All models
export const AI_MODELS: AIModelConfig[] = [
  {
    id: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash Lite',
    provider: 'Gemini',
    inputPrice: 0.10,
    outputPrice: 0.40,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    displayName: 'Google Gemini 2.5 Flash Lite',
    provider: 'Google',
    inputPrice: 0.10,
    outputPrice: 0.40,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'gemini-3.1-flash-lite',
    displayName: 'Gemini 3.1 Flash Lite',
    provider: 'Gemini',
    inputPrice: 0.25,
    outputPrice: 1.50,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'google/gemini-3.1-flash-lite',
    displayName: 'Google Gemini 3.1 Flash Lite',
    provider: 'Google',
    inputPrice: 0.25,
    outputPrice: 1.50,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'gemini-3.1-flash-lite-preview',
    displayName: 'Gemini 3.1 Flash Lite Preview',
    provider: 'Gemini',
    inputPrice: 0.25,
    outputPrice: 1.50,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 'google/gemini-3.1-flash-lite-preview',
    displayName: 'Google Gemini 3.1 Flash Lite Preview',
    provider: 'Google',
    inputPrice: 0.25,
    outputPrice: 1.50,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 6,
  },
  {
    id: 'google/gemini-2.5-flash',
    displayName: 'Google Gemini 2.5 Flash',
    provider: 'Google',
    inputPrice: 0.30,
    outputPrice: 2.50,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 7,
  },
  {
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    provider: 'Gemini',
    inputPrice: 0.63,
    outputPrice: 5.00,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 8,
  },
  {
    id: 'google/gemini-2.5-pro',
    displayName: 'Google Gemini 2.5 Pro',
    provider: 'Google',
    inputPrice: 1.25,
    outputPrice: 10.00,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 9,
  },
  {
    id: 'google/gemini-3.5-flash-lite',
    displayName: 'Google Gemini 3.5 Flash Lite',
    provider: 'Google',
    inputPrice: 0.30,
    outputPrice: 2.50,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 10,
  },
  {
    id: 'google/gemini-3.5-flash',
    displayName: 'Google Gemini 3.5 Flash',
    provider: 'Google',
    inputPrice: 1.50,
    outputPrice: 9.00,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 11,
  },
  {
    id: 'google/gemini-3.6-flash',
    displayName: 'Google Gemini 3.6 Flash',
    provider: 'Google',
    inputPrice: 1.50,
    outputPrice: 7.50,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 12,
  },
  {
    id: 'gemini-3.1-pro-preview',
    displayName: 'Gemini 3.1 Pro Preview',
    provider: 'Gemini',
    inputPrice: 2.00,
    outputPrice: 12.00,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 13,
  },
  {
    id: 'google/gemini-3.1-pro-preview',
    displayName: 'Google Gemini 3.1 Pro Preview',
    provider: 'Google',
    inputPrice: 2.00,
    outputPrice: 12.00,
    unit: 'USD / 1M Tokens',
    isActive: true,
    sortOrder: 14,
  },
];

// Sorted helpers
export function getActiveModels(): AIModelConfig[] {
  return AI_MODELS.filter(m => m.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getModelById(id: string): AIModelConfig | undefined {
  return AI_MODELS.find(m => m.id === id);
}

export function getDefaultModel(): AIModelConfig {
  return getActiveModels()[0];
}

// Legacy support - export as object for backward compatibility
export const AI_MODELS_MAP: Record<string, AIModelConfig> = AI_MODELS.reduce((acc, model) => {
  acc[model.id] = model;
  return acc;
}, {} as Record<string, AIModelConfig>);

// Legacy type alias
export type AIModelType = string;

// User subscription pricing tiers (different from AI models)
export interface PricingTierConfig {
  name: string;
  price: number;
  quota: {
    monthlyReviews: number;
    allowedModels: string[];
  };
  features: string[];
}

export const PRICING_TIERS: Record<string, PricingTierConfig> = {
  free: {
    name: "Miễn phí",
    price: 0,
    quota: {
      monthlyReviews: 10,
      allowedModels: ["gemini-2.5-flash-lite", "google/gemini-2.5-flash-lite"],
    },
    features: ["10 bài review/tháng", "Flash models"],
  },
  pro: {
    name: "Pro",
    price: 99000,
    quota: {
      monthlyReviews: 100,
      allowedModels: ["gemini-2.5-flash-lite", "google/gemini-2.5-flash-lite", "gemini-2.5-pro", "google/gemini-2.5-pro"],
    },
    features: ["100 bài review/tháng", "Flash & Pro models", "Priority support"],
  },
  unlimited: {
    name: "Unlimited",
    price: 299000,
    quota: {
      monthlyReviews: -1, // -1 means unlimited
      allowedModels: AI_MODELS.map(m => m.id),
    },
    features: ["Unlimited reviews", "All models", "24/7 support"],
  },
};

// Legacy pricing helpers (for backward compatibility)
export function formatCostVND(usdCost: number): string {
  const vndCost = usdCost * 24000;
  if (vndCost < 10) {
    return `< 10 đ`;
  }
  if (vndCost < 100) {
    return `~${Math.round(vndCost)} đ`;
  }
  return `~${Math.round(vndCost).toLocaleString("vi-VN")} đ`;
}

export function formatCostUSD(usdCost: number): string {
  if (usdCost < 0.001) {
    return `< $0.001`;
  }
  return `$${usdCost.toFixed(4)}`;
}

export function calculateEstimatedCost(
  inputTokens: number,
  outputTokens: number,
  modelId: string
): number {
  const model = getModelById(modelId);
  if (!model) return 0;
  const inputCost = (inputTokens / 1000000) * model.inputPrice;
  const outputCost = (outputTokens / 1000000) * model.outputPrice;
  return inputCost + outputCost;
}

export function estimateLessonPlanReviewCost(
  lessonPlanWordCount: number,
  modelId: string
): {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  costVND: string;
  costUSD: string;
} {
  const contentChars = lessonPlanWordCount * 4;
  const inputTokens = Math.ceil(contentChars / 3) + 2000;
  const outputTokens = 4000;

  const totalCost = calculateEstimatedCost(inputTokens, outputTokens, modelId);

  return {
    inputTokens,
    outputTokens,
    totalCost,
    costVND: formatCostVND(totalCost),
    costUSD: formatCostUSD(totalCost),
  };
}
