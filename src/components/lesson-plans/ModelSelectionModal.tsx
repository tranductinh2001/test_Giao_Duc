"use client";

import { useState, useEffect } from "react";
import { X, Zap, DollarSign, Sparkles } from "lucide-react";
import Button from "@/components/ui/button";
import {
  getActiveModels,
  getModelById,
  getDefaultModel,
  getModelTier,
  getTierBadge,
  type AIModelConfig,
  type ModelTier,
} from "@/lib/ai-models";

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (modelId: string) => void;
  wordCount: number;
  operation: "parse" | "review";
}

export default function ModelSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  wordCount,
  operation,
}: ModelSelectionModalProps) {
  const models = getActiveModels();
  const defaultModel = getDefaultModel();

  const [selectedModelId, setSelectedModelId] = useState<string>(defaultModel.id);

  useEffect(() => {
    if (isOpen) {
      setSelectedModelId(defaultModel.id);
    }
  }, [isOpen, defaultModel.id]);

  const handleConfirm = () => {
    onConfirm(selectedModelId);
    onClose();
  };

  if (!isOpen) return null;

  const operationText = operation === "parse" ? "phân tích" : "review";
  const selectedModel = getModelById(selectedModelId);

  // Calculate cost estimate (simplified)
  const estimateCost = (model: AIModelConfig) => {
    const inputTokens = Math.ceil(wordCount / 4) + 2000;
    const outputTokens = 4000;
    const inputCost = (inputTokens / 1000000) * model.inputPrice;
    const outputCost = (outputTokens / 1000000) * model.outputPrice;
    const totalUSD = inputCost + outputCost;
    const totalVND = totalUSD * 24000;
    return { totalUSD, totalVND };
  };

  // Group models by tier for display
  const groupedModels = models.reduce((acc, model) => {
    const tier = getModelTier(model.id);
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(model);
    return acc;
  }, {} as Record<ModelTier, AIModelConfig[]>);

  // Sort tiers: flash-lite, flash, pro, preview
  const tierOrder: ModelTier[] = ['flash-lite', 'flash', 'pro', 'preview'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Chọn AI Model để {operationText}
              </h2>
              <p className="text-sm text-muted-foreground">
                Chọn model phù hợp với nhu cầu và ngân sách của bạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Info Box */}
          <div className="mb-6 p-4 rounded-lg bg-info/10 border border-info/20">
            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-info mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-info mb-1">
                  Chi phí ước tính
                </h3>
                <p className="text-xs text-info/80">
                  Giáo án của bạn có khoảng <strong>{wordCount.toLocaleString()}</strong> từ.
                  Chi phí thực tế có thể thay đổi tùy theo độ phức tạp của phân tích.
                </p>
              </div>
            </div>
          </div>

          {/* Model Cards by Tier */}
          <div className="space-y-6">
            {tierOrder.map((tier) => {
              const tierModels = groupedModels[tier];
              if (!tierModels || tierModels.length === 0) return null;

              const badge = getTierBadge(tier);

              return (
                <div key={tier}>
                  {/* Tier Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({tierModels.length} model{tierModels.length > 1 ? 's' : ''})
                    </span>
                  </div>

                  {/* Models in this tier */}
                  <div className="space-y-2">
                    {tierModels.map((model) => {
                      const cost = estimateCost(model);
                      const isSelected = selectedModelId === model.id;

                      return (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModelId(model.id)}
                          className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              {/* Radio */}
                              <div className="mt-1">
                                <div
                                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected
                                      ? "border-primary bg-primary"
                                      : "border-border"
                                  }`}
                                >
                                  {isSelected && (
                                    <div className="w-2 h-2 rounded-full bg-white" />
                                  )}
                                </div>
                              </div>

                              {/* Content */}
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-semibold text-foreground">
                                    {model.displayName}
                                  </h3>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">
                                  Provider: <strong>{model.provider}</strong>
                                </p>

                                {/* Pricing */}
                                <div className="flex items-center gap-4 text-xs">
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Input:</span>
                                    <span className="font-medium text-foreground">
                                      ${model.inputPrice.toFixed(2)} / 1M
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-muted-foreground">Output:</span>
                                    <span className="font-medium text-foreground">
                                      ${model.outputPrice.toFixed(2)} / 1M
                                    </span>
                                  </div>
                                </div>

                                {/* Estimate */}
                                <div className="mt-2 text-xs">
                                  <span className="text-muted-foreground">Ước tính: </span>
                                  <span className="font-medium text-foreground">
                                    ~{cost.totalVND.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ
                                  </span>
                                  <span className="text-muted-foreground"> (${cost.totalUSD.toFixed(4)})</span>
                                </div>
                              </div>
                            </div>

                            {/* Model ID */}
                            <div className="text-right">
                              <code className="text-xs bg-muted px-2 py-1 rounded text-foreground">
                                {model.id}
                              </code>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing Note */}
          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              💡 Lưu ý về chi phí
            </h4>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Chi phí được tính dựa trên số lượng tokens (đơn vị từ) xử lý</li>
              <li>• Tỷ giá: 1 USD = 24,000 VNĐ (ước tính)</li>
              <li>• Model Flash Lite rẻ nhất, phù hợp cho phân tích cơ bản</li>
              <li>• Model Flash cân bằng giữa tốc độ và chất lượng</li>
              <li>• Model Pro có chất lượng cao nhất, phù hợp cho phân tích chuyên sâu</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {selectedModel && (
                <>
                  Model đã chọn: <strong className="text-foreground">{selectedModel.displayName}</strong>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose}>
                Hủy
              </Button>
              <Button variant="primary" onClick={handleConfirm}>
                <Zap className="w-4 h-4 mr-2" />
                Xác nhận và {operationText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
