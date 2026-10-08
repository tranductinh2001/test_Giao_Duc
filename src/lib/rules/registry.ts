// Rule Registry

import { Rule, RulePriority } from '@/types/rule';

export const DEFAULT_RULES: Rule[] = [
  {
    ruleId: 'objective_001',
    name: 'Mục tiêu bài học',
    description: 'Mục tiêu phải đầy đủ 3 mặt: kiến thức, kỹ năng, thái độ',
    priority: 'HIGH',
    enabled: true,
    prompt: `Đánh giá mục tiêu bài học:
1. Có đề cập kiến thức cần đạt không?
2. Có đề cập kỹ năng cần hình thành không?
3. Có đề cập thái độ/hành vi cần tạo dựng không?
4. Mục tiêu có cụ thể, đo được không?`,
    categories: ['Mục tiêu'],
  },
  {
    ruleId: 'activity_001',
    name: 'Cấu trúc hoạt động',
    description: 'Phải có đủ 3 giai đoạn: khởi động, hình thành kiến thức, luyện tập',
    priority: 'HIGH',
    enabled: true,
    prompt: `Đánh giá cấu trúc hoạt động:
1. Có hoạt động khởi động không?
2. Có hoạt động hình thành kiến thức không?
3. Có hoạt động luyện tập/vận dụng không?
4. Thời gian phân bổ hợp lý không?`,
    categories: ['Hoạt động'],
  },
  {
    ruleId: 'gv_action_001',
    name: 'Hoạt động giáo viên',
    description: 'Hoạt động của GV phải rõ ràng, hướng dẫn cụ thể',
    priority: 'MEDIUM',
    enabled: true,
    prompt: `Đánh giá hoạt động giáo viên:
1. Có hướng dẫn cụ thể cho từng bước không?
2. Có câu hỏi gợi mở phù hợp không?
3. Có sử dụng CNTT/phương tiện dạy học không?`,
    categories: ['Hoạt động', 'GV'],
  },
  {
    ruleId: 'hs_action_001',
    name: 'Hoạt động học sinh',
    description: 'Học sinh phải được hoạt động, thực hành',
    priority: 'HIGH',
    enabled: true,
    prompt: `Đánh giá hoạt động học sinh:
1. HS có được hoạt động hay chỉ nghe giảng?
2. Có hoạt động nhóm/hợp tác không?
3. Có hoạt động thực hành không?
4. Sản phẩm của HS có được đề cập không?`,
    categories: ['Hoạt động', 'HS'],
  },
  {
    ruleId: 'material_001',
    name: 'Đồ dùng dạy học',
    description: 'Phải có đủ thiết bị, phương tiện dạy học',
    priority: 'MEDIUM',
    enabled: true,
    prompt: `Đánh giá đồ dùng dạy học:
1. Có liệt kê đủ thiết bị cần thiết không?
2. Thiết bị có phù hợp với nội dung bài học không?
3. Có hướng dẫn chuẩn bị cho HS không?`,
    categories: ['Phương tiện'],
  },
  {
    ruleId: 'assessment_001',
    name: 'Đánh giá',
    description: 'Phải có đa dạng hình thức đánh giá',
    priority: 'MEDIUM',
    enabled: true,
    prompt: `Đánh giá hệ thống đánh giá:
1. Có đánh giá quá trình (trong bài)?
2. Có đánh giá tổng kết (cuối bài)?
3. Hình thức đánh giá có đa dạng không?
4. Tiêu chí đánh giá có rõ ràng không?`,
    categories: ['Đánh giá'],
  },
  {
    ruleId: 'time_001',
    name: 'Phân bổ thời gian',
    description: 'Thời gian phải hợp lý, cân đối',
    priority: 'LOW',
    enabled: true,
    prompt: `Đánh giá phân bổ thời gian:
1. Tổng thời gian có phù hợp (45 phút)?
2. Thời gian cho mỗi hoạt động có hợp lý không?
3. Có dự phòng thời gian cho tình huống phát sinh không?`,
    categories: ['Thời gian'],
  },
];

export function getRuleRegistry(): Rule[] {
  return DEFAULT_RULES;
}

export function getRule(ruleId: string): Rule | undefined {
  return DEFAULT_RULES.find((r) => r.ruleId === ruleId);
}

export function getRulesByCategory(category: string): Rule[] {
  return DEFAULT_RULES.filter((r) => r.categories?.includes(category));
}

export function getRulesByPriority(priority: RulePriority): Rule[] {
  return DEFAULT_RULES.filter((r) => r.priority === priority);
}

export function getEnabledRules(): Rule[] {
  return DEFAULT_RULES.filter((r) => r.enabled);
}

export function getCategories(): string[] {
  const categories = new Set<string>();
  for (const rule of DEFAULT_RULES) {
    if (rule.categories) {
      for (const cat of rule.categories) {
        categories.add(cat);
      }
    }
  }
  return Array.from(categories).sort();
}
