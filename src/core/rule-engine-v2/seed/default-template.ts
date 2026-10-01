/**
 * Rule Engine v2.0 - Seed Data
 *
 * Default template: Giáo án 5 bước (5-step lesson plan)
 */

export const DEFAULT_TEMPLATE_5STEP = {
  code: '5STEP',
  name: 'Giáo án 5 bước',
  description: 'Template chuẩn giáo án 5 bước: Mục tiêu, Chuẩn bị, Hoạt động, Củng cố, Đánh giá',
  category: 'PRIMARY',
  isActive: true,
  isDefault: true,
  version: 1,

  sections: [
    {
      code: 'OBJECTIVE',
      name: 'Mục tiêu bài học',
      order: 1,
      isRequired: true,
      numberingStyle: '1.',
      headingLevel: 2,
    },
    {
      code: 'PREPARATION',
      name: 'Chuẩn bị',
      order: 2,
      isRequired: true,
      numberingStyle: '2.',
      headingLevel: 2,
    },
    {
      code: 'ACTIVITY',
      name: 'Hoạt động dạy học',
      order: 3,
      isRequired: true,
      numberingStyle: '3.',
      headingLevel: 2,
    },
    {
      code: 'CONSOLIDATION',
      name: 'Củng cố - Dặn dò',
      order: 4,
      isRequired: true,
      numberingStyle: '4.',
      headingLevel: 2,
    },
    {
      code: 'ASSESSMENT',
      name: 'Đánh giá',
      order: 5,
      isRequired: true,
      numberingStyle: '5.',
      headingLevel: 2,
    },
  ],

  parserRules: [
    // OBJECTIVE section
    {
      type: 'KEYWORD',
      sectionId: 'OBJECTIVE',
      pattern: 'Mục tiêu',
      priority: 100,
      ignoreCase: true,
      ignoreAccent: true,
      normalizeText: true,
      aliases: ['Mục đích', 'Yêu cầu cần đạt', 'Mục tiêu bài học'],
      confidence: 1.0,
    },
    {
      type: 'REGEX',
      sectionId: 'OBJECTIVE',
      pattern: '^[1I]\\.?\\s*Mục\\s*tiêu',
      priority: 95,
      ignoreCase: true,
      ignoreAccent: true,
      normalizeText: true,
      aliases: [],
      confidence: 0.95,
    },
    {
      type: 'FUZZY',
      sectionId: 'OBJECTIVE',
      pattern: 'Mục tiêu bài học',
      priority: 80,
      fuzzyThreshold: 0.8,
      ignoreCase: true,
      ignoreAccent: true,
      normalizeText: true,
      aliases: [],
      confidence: 0.85,
    },

    // PREPARATION section
    {
      type: 'KEYWORD',
      sectionId: 'PREPARATION',
      pattern: 'Chuẩn bị',
      priority: 100,
      ignoreCase: true,
      ignoreAccent: true,
      normalizeText: true,
      aliases: ['Đồ dùng dạy học', 'Phương tiện dạy học'],
      confidence: 1.0,
    },

    // ACTIVITY section
    {
      type: 'KEYWORD',
      sectionId: 'ACTIVITY',
      pattern: 'Hoạt động',
      priority: 100,
      ignoreCase: true,
      ignoreAccent: true,
      normalizeText: true,
      aliases: ['Hoạt động dạy học', 'Các hoạt động', 'Tiến trình dạy học'],
      confidence: 1.0,
    },

    // CONSOLIDATION section
    {
      type: 'KEYWORD',
      sectionId: 'CONSOLIDATION',
      pattern: 'Củng cố',
      priority: 100,
      ignoreCase: true,
      ignoreAccent: true,
      normalizeText: true,
      aliases: ['Củng cố - Dặn dò', 'Củng cố kiến thức', 'Nhắc nhở'],
      confidence: 1.0,
    },

    // ASSESSMENT section
    {
      type: 'KEYWORD',
      sectionId: 'ASSESSMENT',
      pattern: 'Đánh giá',
      priority: 100,
      ignoreCase: true,
      ignoreAccent: true,
      normalizeText: true,
      aliases: ['Kiểm tra đánh giá', 'Nhận xét'],
      confidence: 1.0,
    },
  ],

  structureRules: [
    {
      code: 'SECTION_ORDER',
      name: 'Thứ tự các phần',
      type: 'ORDER',
      severity: 'ERROR',
      expectedValue: {
        order: {
          OBJECTIVE: 1,
          PREPARATION: 2,
          ACTIVITY: 3,
          CONSOLIDATION: 4,
          ASSESSMENT: 5,
        },
      },
      penaltyScore: 10,
      errorMessage: 'Các phần không đúng thứ tự chuẩn',
      suggestionText: 'Sắp xếp lại theo thứ tự: Mục tiêu → Chuẩn bị → Hoạt động → Củng cố → Đánh giá',
    },
    {
      code: 'HEADING_NUMBERING',
      name: 'Kiểu đánh số tiêu đề',
      type: 'NUMBERING',
      severity: 'WARNING',
      allowedValues: {
        styles: ['1.', '2.', '3.', '4.', '5.'],
      },
      penaltyScore: 2,
      errorMessage: 'Kiểu đánh số không đúng chuẩn',
      suggestionText: 'Sử dụng số thứ tự 1., 2., 3., ...',
    },
  ],

  contentRules: [
    {
      sectionId: 'OBJECTIVE',
      code: 'HAS_KNOWLEDGE',
      name: 'Có mục tiêu về kiến thức',
      checkType: 'PRESENCE',
      severity: 'ERROR',
      systemPrompt: 'Bạn là chuyên gia đánh giá giáo án.',
      userPrompt: 'Kiểm tra xem mục tiêu có đề cập đến KIẾN THỨC học sinh cần đạt được không?',
      criteria: {
        mustHave: ['kiến thức', 'biết', 'nhận biết', 'hiểu'],
      },
      penaltyScore: 15,
      useAI: true,
      aiModel: 'gemini-3.1-flash-lite',
    },
    {
      sectionId: 'OBJECTIVE',
      code: 'HAS_COMPETENCY',
      name: 'Có năng lực chung',
      checkType: 'PRESENCE',
      severity: 'ERROR',
      systemPrompt: 'Bạn là chuyên gia đánh giá giáo án.',
      userPrompt: 'Kiểm tra xem có đề cập đến NĂNG LỰC CHUNG (tự học, giao tiếp, hợp tác, giải quyết vấn đề) không?',
      criteria: {
        mustHave: ['năng lực', 'tự học', 'giao tiếp', 'hợp tác', 'giải quyết vấn đề'],
      },
      penaltyScore: 10,
      useAI: true,
      aiModel: 'gemini-3.1-flash-lite',
    },
    {
      sectionId: 'OBJECTIVE',
      code: 'HAS_QUALITY',
      name: 'Có phẩm chất',
      checkType: 'PRESENCE',
      severity: 'WARNING',
      systemPrompt: 'Bạn là chuyên gia đánh giá giáo án.',
      userPrompt: 'Kiểm tra xem có đề cập đến PHẨM CHẤT (yêu nước, nhân ái, chăm chỉ, trách nhiệm) không?',
      criteria: {
        mustHave: ['phẩm chất', 'yêu nước', 'nhân ái', 'trách nhiệm'],
      },
      penaltyScore: 5,
      useAI: true,
      aiModel: 'gemini-3.1-flash-lite',
    },
  ],

  fixRules: [
    {
      code: 'ADD_KNOWLEDGE_OBJECTIVE',
      name: 'Thêm mục tiêu kiến thức',
      issueType: 'HAS_KNOWLEDGE',
      issueSeverity: 'ERROR',
      fixType: 'TEMPLATE',
      fixTemplate: '- Kiến thức: Học sinh biết...',
      instructions: 'Thêm mục tiêu kiến thức vào phần Mục tiêu',
      autoApply: false,
      requiresApproval: true,
    },
    {
      code: 'ADD_COMPETENCY',
      name: 'Thêm năng lực chung',
      issueType: 'HAS_COMPETENCY',
      issueSeverity: 'ERROR',
      fixType: 'TEMPLATE',
      fixTemplate: '- Năng lực: Phát triển năng lực...',
      instructions: 'Thêm năng lực chung vào phần Mục tiêu',
      autoApply: false,
      requiresApproval: true,
    },
  ],

  scoringRules: [
    { code: 'MISSING_SECTION', issueType: 'SECTION_ORDER', severity: 'ERROR', penalty: 10 },
    { code: 'WRONG_ORDER', issueType: 'SECTION_ORDER', severity: 'ERROR', penalty: 5 },
    { code: 'WRONG_NUMBERING', issueType: 'HEADING_NUMBERING', severity: 'WARNING', penalty: 2 },
    { code: 'MISSING_KNOWLEDGE', issueType: 'HAS_KNOWLEDGE', severity: 'ERROR', penalty: 15 },
    { code: 'MISSING_COMPETENCY', issueType: 'HAS_COMPETENCY', severity: 'ERROR', penalty: 10 },
    { code: 'MISSING_QUALITY', issueType: 'HAS_QUALITY', severity: 'WARNING', penalty: 5 },
  ],
};
