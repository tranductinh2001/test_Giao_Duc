/**
 * Semantic Ontology Module
 *
 * Defines the 11 canonical semantic types for lesson plan analysis.
 * Each type has:
 * - id: unique identifier
 * - name: display name
 * - description: definition
 * - keywords: trigger keywords for classification
 * - priority: higher = more specific (for conflict resolution)
 * - color: UI color code
 */

export type SemanticTypeId =
  | 'TEACHER_ACTION'
  | 'STUDENT_ACTION'
  | 'TEACHING_MATERIAL'
  | 'LEARNING_OUTCOME'
  | 'QUESTION'
  | 'ASSESSMENT'
  | 'SECTION_HEADER'
  | 'PRODUCT'
  | 'OBJECTIVE'
  | 'INSTRUCTION'
  | 'UNKNOWN';

export interface SemanticType {
  id: SemanticTypeId;
  name: string;
  nameVi: string;  // Vietnamese name
  description: string;
  descriptionVi: string;
  keywords: string[];
  patterns: RegExp[];
  priority: number;  // Higher = more specific
  color: string;
  examples: string[];
}

/**
 * The 11 Semantic Types
 */
export const SEMANTIC_TYPES: Record<SemanticTypeId, SemanticType> = {
  TEACHER_ACTION: {
    id: 'TEACHER_ACTION',
    name: 'Teacher Action',
    nameVi: 'Hành động của Giáo viên',
    description: 'Actions performed by the teacher',
    descriptionVi: 'Các hành động của giáo viên',
    keywords: [
      'giáo viên', 'gv', 'giáo viên hướng dẫn', 'giáo viên trình bày',
      'hướng dẫn', 'trình chiếu', 'yêu cầu', 'gọi', 'nhận xét',
      'tuyên dương', 'cho hs', 'hỏi', 'trình bày', 'giảng giải',
      'minh họa', 'tổ chức', 'điều khiển', 'đánh giá', 'kiểm tra'
    ],
    patterns: [
      /^gv\s*:/i,
      /^giáo viên\s*:/i,
      /^(giáo viên|hướng dẫn|trình bày|yêu cầu|cho hs|hỏi|gọi)/i
    ],
    priority: 10,
    color: '#3B82F6', // Blue
    examples: [
      'GV hướng dẫn HS đọc bài',
      'Giáo viên trình chiếu video',
      'GV yêu cầu HS thảo luận nhóm'
    ]
  },

  STUDENT_ACTION: {
    id: 'STUDENT_ACTION',
    name: 'Student Action',
    nameVi: 'Hành động của Học sinh',
    description: 'Actions performed by students',
    descriptionVi: 'Các hành động của học sinh',
    keywords: [
      'học sinh', 'hs', 'hs làm', 'hs thực hiện', 'hs trả lời',
      'đọc', 'viết', 'thảo luận', 'làm bài', 'trình bày',
      'quan sát', 'lắng nghe', 'nhận xét', 'đánh giá', 'tự đánh giá'
    ],
    patterns: [
      /^hs\s*:/i,
      /^học sinh\s*:/i,
      /^(hs|học sinh)\s+(đọc|viết|làm|thảo luận|trình bày|quan sát)/i
    ],
    priority: 10,
    color: '#10B981', // Green
    examples: [
      'HS đọc bài trong SGK',
      'HS thảo luận nhóm đôi',
      'HS trình bày kết quả'
    ]
  },

  TEACHING_MATERIAL: {
    id: 'TEACHING_MATERIAL',
    name: 'Teaching Material',
    nameVi: 'Học liệu',
    description: 'Learning materials and resources',
    descriptionVi: 'Học liệu và tài nguyên dạy học',
    keywords: [
      'sgk', 'sách giáo khoa', 'máy chiếu', 'video', 'hình ảnh',
      'bài giảng', 'slide', 'powerpoint', 'đồ dùng', 'tranh',
      'bản đồ', 'phiếu học tập', 'thẻ', 'flashcard', 'nhạc',
      'trang web', 'phần mềm', 'ứng dụng'
    ],
    patterns: [
      /^(sgk|sách giáo khoa|máy chiếu|video|bài giảng|slide)/i,
      /(sách giáo khoa|máy chiếu|đồ dùng|học tập)/i
    ],
    priority: 8,
    color: '#8B5CF6', // Purple
    examples: [
      'Sách giáo khoa Tiếng Việt 3',
      'Máy chiếu PowerPoint',
      'Video minh họa'
    ]
  },

  LEARNING_OUTCOME: {
    id: 'LEARNING_OUTCOME',
    name: 'Learning Outcome',
    nameVi: 'Kết quả học tập',
    description: 'Expected learning outcomes',
    descriptionVi: 'Kết quả mong đợi sau bài học',
    keywords: [
      'hs có thể', 'yêu cầu cần đạt', 'mục tiêu', 'kết quả',
      'biết', 'hiểu', 'vận dụng', 'thực hiện được', 'nắm vững',
      'phát triển', 'hình thành', 'tự đánh giá'
    ],
    patterns: [
      /^(hs|học sinh)\s+(có thể|biết|hiểu|vận dụng)/i,
      /yêu cầu cần đạt/i,
      /mục tiêu\s*(bài học)?/i,
      /kết quả\s*(học tập)?/i
    ],
    priority: 9,
    color: '#F59E0B', // Amber
    examples: [
      'HS có thể đọc thành tiếng các từ ngữ',
      'Yêu cầu cần đạt: HS hiểu nội dung bài',
      'Mục tiêu: Phát triển kỹ năng đọc'
    ]
  },

  QUESTION: {
    id: 'QUESTION',
    name: 'Question',
    nameVi: 'Câu hỏi',
    description: 'Questions for students',
    descriptionVi: 'Câu hỏi dành cho học sinh',
    keywords: [
      'câu hỏi', 'hỏi', 'nêu câu hỏi', 'đặt câu hỏi',
      'trả lời câu hỏi', '?', 'thắc mắc', 'tự hỏi'
    ],
    patterns: [
      /^câu hỏi\s*:/i,
      /^hỏi\s*:/i,
      /\?$/m,
      /^(em| các em)\s+(hãy|hãy nêu|trả lời)/i
    ],
    priority: 7,
    color: '#EF4444', // Red
    examples: [
      'Câu hỏi: Em hãy kể tên các đồ dùng học tập?',
      'GV hỏi: Bài học hôm nay có nội dung gì?'
    ]
  },

  ASSESSMENT: {
    id: 'ASSESSMENT',
    name: 'Assessment',
    nameVi: 'Đánh giá',
    description: 'Assessment methods and criteria',
    descriptionVi: 'Các phương pháp và tiêu chí đánh giá',
    keywords: [
      'đánh giá', 'nhận xét', 'tuyên dương', 'góp ý',
      'kiểm tra', 'đánh giá', 'chấm điểm', 'nhận xét',
      'tự đánh giá', 'đánh giá đồng đẳng'
    ],
    patterns: [
      /^(đánh giá|nhận xét|tuyên dương|chấm)/i,
      /đánh giá\s+(hs|học sinh)/i
    ],
    priority: 7,
    color: '#EC4899', // Pink
    examples: [
      'GV nhận xét, tuyên dương các nhóm',
      'Đánh giá qua quan sát',
      'HS tự đánh giá bài làm'
    ]
  },

  SECTION_HEADER: {
    id: 'SECTION_HEADER',
    name: 'Section Header',
    nameVi: 'Tiêu đề phần',
    description: 'Section or part titles',
    descriptionVi: 'Tiêu đề các phần của bài học',
    keywords: [
      'hoạt động', 'phần', 'mục', 'tiêu đề', 'i.', 'ii.', 'iii.',
      '1.', '2.', '3.', 'a.', 'b.', 'c.', 'khởi động', 'củng cố',
      'luyện tập', 'vận dụng', 'mở rộng'
    ],
    patterns: [
      /^(i+|ii|iii|iv|v|vi|vii|viii|ix|x)\s*[-.\)]/i,
      /^[1-9]\d*[\.\)]\s*\w+/,
      /^(hoạt động|phần|mục)\s+/i,
      /^(khởi động|củng cố|luyện tập|vận dụng|mở rộng)/i
    ],
    priority: 5,
    color: '#6B7280', // Gray
    examples: [
      'I. Mục tiêu',
      'II. Đồ dùng dạy học',
      'Hoạt động 1: Khởi động'
    ]
  },

  PRODUCT: {
    id: 'PRODUCT',
    name: 'Student Product',
    nameVi: 'Sản phẩm học sinh',
    description: 'Products students create',
    descriptionVi: 'Sản phẩm học sinh cần tạo ra',
    keywords: [
      'sản phẩm', 'bài làm', 'bài tập', 'vở bài tập',
      'bản vẽ', 'thiết kế', 'trình bày', 'hoàn thành'
    ],
    patterns: [
      /sản phẩm/i,
      /bài làm/i,
      /hoàn thành\s+(bài|vở|sản phẩm)/i
    ],
    priority: 6,
    color: '#14B8A6', // Teal
    examples: [
      'HS hoàn thành bài tập trong vở bài tập',
      'HS vẽ tranh minh họa',
      'HS nộp sản phẩm'
    ]
  },

  OBJECTIVE: {
    id: 'OBJECTIVE',
    name: 'Objective',
    nameVi: 'Mục tiêu',
    description: 'Learning objectives',
    descriptionVi: 'Mục tiêu bài học',
    keywords: [
      'mục tiêu', 'yêu cầu', 'đạt được', 'hoàn thành',
      'nắm vững', 'biết', 'hiểu', 'vận dụng'
    ],
    patterns: [
      /^(mục tiêu|yêu cầu)\s*(bài học)?/i,
      /sau\s+bài\s+học/i,
      /đạt\s+được/i
    ],
    priority: 8,
    color: '#F97316', // Orange
    examples: [
      'Mục tiêu: HS biết đọc thành tiếng',
      'Yêu cầu: Nắm vững kiến thức bài học'
    ]
  },

  INSTRUCTION: {
    id: 'INSTRUCTION',
    name: 'Instruction',
    nameVi: 'Hướng dẫn',
    description: 'Instructions for activities',
    descriptionVi: 'Hướng dẫn thực hiện hoạt động',
    keywords: [
      'hướng dẫn', 'cách', 'thực hiện', 'tiến hành',
      'làm theo', 'theo dõi', 'quan sát'
    ],
    patterns: [
      /^(hướng dẫn|cách|thực hiện)\s+/i,
      /tiến\s+hành/i,
      /làm\s+theo/i
    ],
    priority: 6,
    color: '#06B6D4', // Cyan
    examples: [
      'Hướng dẫn HS cách đọc',
      'Cách thực hiện: ...',
      'Tiến hành theo các bước'
    ]
  },

  UNKNOWN: {
    id: 'UNKNOWN',
    name: 'Unknown',
    nameVi: 'Không xác định',
    description: 'Unclassified content',
    descriptionVi: 'Nội dung không thể phân loại',
    keywords: [],
    patterns: [],
    priority: 0,
    color: '#9CA3AF', // Light Gray
    examples: []
  }
};

/**
 * Get all semantic types as array
 */
export function getAllSemanticTypes(): SemanticType[] {
  return Object.values(SEMANTIC_TYPES);
}

/**
 * Get semantic type by ID
 */
export function getSemanticType(id: SemanticTypeId): SemanticType {
  return SEMANTIC_TYPES[id] || SEMANTIC_TYPES.UNKNOWN;
}

/**
 * Classify a paragraph by semantic type using keyword matching
 */
export function classifyParagraph(content: string): SemanticTypeId {
  if (!content || !content.trim()) {
    return 'UNKNOWN';
  }

  const lowerContent = content.toLowerCase();

  // Score each type
  const scores: Record<SemanticTypeId, number> = {
    TEACHER_ACTION: 0,
    STUDENT_ACTION: 0,
    TEACHING_MATERIAL: 0,
    LEARNING_OUTCOME: 0,
    QUESTION: 0,
    ASSESSMENT: 0,
    SECTION_HEADER: 0,
    PRODUCT: 0,
    OBJECTIVE: 0,
    INSTRUCTION: 0,
    UNKNOWN: 0
  };

  // Check keywords
  for (const [typeId, type] of Object.entries(SEMANTIC_TYPES)) {
    for (const keyword of type.keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        scores[typeId as SemanticTypeId] += 1;
      }
    }
  }

  // Check patterns
  for (const [typeId, type] of Object.entries(SEMANTIC_TYPES)) {
    for (const pattern of type.patterns) {
      if (pattern.test(content)) {
        scores[typeId as SemanticTypeId] += 2;  // Patterns worth more
      }
    }
  }

  // Find highest scoring type
  let maxScore = 0;
  let maxType: SemanticTypeId = 'UNKNOWN';

  for (const [typeId, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = typeId as SemanticTypeId;
    }
  }

  // If no score, return UNKNOWN
  return maxScore > 0 ? maxType : 'UNKNOWN';
}

/**
 * Get display color for semantic type
 */
export function getSemanticTypeColor(typeId: SemanticTypeId): string {
  return getSemanticType(typeId).color;
}

/**
 * Get Vietnamese name for semantic type
 */
export function getSemanticTypeNameVi(typeId: SemanticTypeId): string {
  return getSemanticType(typeId).nameVi;
}
