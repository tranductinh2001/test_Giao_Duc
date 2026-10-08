// Section Criteria & Evaluation Policy Configuration Types
// Supports full alignment with Official Dispatch 5512 (CV 5512/BGDĐT-GDTrH) and Official Dispatch 2345 (CV 2345/BGDĐT-GDTH)
// Flexible switching, preset storage, and custom section criteria

import { Paragraph, Activity } from './document';

export type DispatchType = 'CV_5512' | 'CV_2345' | 'CUSTOM';

export type LessonPlanSectionKey =
  | 'muc_tieu'
  | 'thiet_bi'
  | 'khoi_dong'
  | 'kham_pha'
  | 'luyen_tap'
  | 'van_dung'
  | 'dieu_chinh'
  | 'danh_gia'
  | 'ngu_dieu_tieng_viet'
  | 'custom'
  | string;

export interface SectionCriteriaConfig {
  key: LessonPlanSectionKey | string;
  title: string;
  shortLabel: string;
  enabled: boolean;
  weight: number; // Điểm tối đa, ví dụ: 15, 20, 25
  description: string;
  criteriaChecklist: string[];
  promptInstructions: string;
  strictCv5512?: boolean;
  strictCv2345?: boolean;
}

export interface EvaluationPolicyConfig {
  policyId: string;
  name: string;
  description: string;
  dispatchType: DispatchType;
  enableMissingSectionWarning: boolean;
  chunkedEvaluation: boolean; // Bóc tách thẩm định độc lập từng phần
  evaluateVietnameseIntonation?: boolean; // Thẩm định dấu ngữ điệu, dấu câu & diễn đạt Tiếng Việt
  sections: SectionCriteriaConfig[];
  updatedAt?: string;
}

export interface SavedPolicyProfile {
  id: string;
  name: string;
  description: string;
  dispatchType: DispatchType;
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
  policy: EvaluationPolicyConfig;
}

export interface DetectedSection {
  key: LessonPlanSectionKey | string;
  title: string;
  matchedTitle?: string;
  isDetected: boolean;
  headingParagraphId?: string;
  startPage: number;
  endPage: number;
  paragraphs: Paragraph[];
  activities: Activity[];
  confidence: number;
}

// =========================================================================
// 1. CÔNG VĂN 5512/BGDĐT-GDTrH (CẤP THCS & THPT)
// Dựa trên Phụ lục IV: Khung kế hoạch bài dạy chuẩn Bộ GD&ĐT
// =========================================================================
export const POLICY_CV5512_STANDARD: EvaluationPolicyConfig = {
  policyId: 'policy_cv5512_standard',
  name: 'Chuẩn Công Văn 5512/BGDĐT (Cấp THCS & THPT)',
  description: 'Thẩm định kế hoạch bài dạy theo đúng khung Phụ lục IV Công văn 5512/BGDĐT-GDTrH cho THCS và THPT',
  dispatchType: 'CV_5512',
  enableMissingSectionWarning: true,
  chunkedEvaluation: true,
  evaluateVietnameseIntonation: true,
  sections: [
    {
      key: 'muc_tieu',
      title: 'I. Mục tiêu bài dạy (Kiến thức, Năng lực, Phẩm chất)',
      shortLabel: 'I. Mục tiêu (5512)',
      enabled: true,
      weight: 15,
      description: 'Đánh giá 3 mặt mục tiêu theo CV 5512: 1. Kiến thức; 2. Năng lực (chung & đặc thù); 3. Phẩm chất',
      criteriaChecklist: [
        '1. Về kiến thức: Nêu cụ thể nội dung kiến thức học sinh cần học theo yêu cầu cần đạt của chương trình',
        '2. Về năng lực: Nêu cụ thể học sinh làm được gì; phân định rõ năng lực chung và năng lực đặc thù',
        '3. Về phẩm chất: Nêu cụ thể yêu cầu về hành vi, thái độ gắn với nội dung bài dạy cần phát triển',
        'Mục tiêu lượng hóa bằng động từ hành động cụ thể, đo lường được, tránh mơ hồ ("hiểu sâu", "nắm được")',
        'Ngôn ngữ sư phạm chuẩn xác, ngữ điệu rõ ràng, chính xác dấu thanh tiếng Việt',
      ],
      promptInstructions:
        'Soi xét kỹ mục tiêu theo Công văn 5512: Có phân định đủ 3 mục (1. Kiến thức; 2. Năng lực; 3. Phẩm chất) không; động từ có đo lường được kết quả đầu ra cụ thể không.',
      strictCv5512: true,
    },
    {
      key: 'thiet_bi',
      title: 'II. Thiết bị dạy học và học liệu (Chuẩn bị GV & HS)',
      shortLabel: 'II. Thiết bị (5512)',
      enabled: true,
      weight: 10,
      description: 'Đánh giá sự chuẩn bị thiết bị, học liệu dạy học của Giáo viên và của Học sinh',
      criteriaChecklist: [
        'Phân định rành mạch thiết bị, học liệu chuẩn bị của Giáo viên và của Học sinh',
        'Liệt kê cụ thể phiếu học tập, tranh ảnh, video, đồ dùng thí nghiệm, phần mềm trực quan',
        'Đảm bảo tính khả thi, phù hợp chuỗi hoạt động dạy học',
      ],
      promptInstructions:
        'Kiểm tra danh mục thiết bị và học liệu: Đã tách riêng phần chuẩn bị của GV và HS chưa, có đầy đủ phiếu học tập và phương tiện phục vụ hoạt động học không.',
      strictCv5512: true,
    },
    {
      key: 'khoi_dong',
      title: 'Hoạt động 1: Xác định vấn đề / Nhiệm vụ học tập / Mở đầu (Khởi động)',
      shortLabel: 'HĐ 1: Mở đầu',
      enabled: true,
      weight: 15,
      description: 'Tạo tình huống có vấn đề, gợi nhớ kiến thức nền tảng, tạo tâm thế hứng thú vào bài mới',
      criteriaChecklist: [
        'a) Mục tiêu: Giúp học sinh xác định vấn đề/nhiệm vụ cần giải quyết hoặc cách thức thực hiện',
        'b) Nội dung: Yêu cầu/nhiệm vụ cụ thể (xử lí tình huống, câu hỏi, bài tập, thí nghiệm, thực hành)',
        'c) Sản phẩm: Kết quả xử lí tình huống, đáp án câu hỏi, bài tập, giải pháp thực hiện',
        'd) Tổ chức thực hiện: Đủ 4 bước (Giao nhiệm vụ ➔ Thực hiện ➔ Báo cáo/thảo luận ➔ Kết luận/nhận định)',
        'Thời lượng phù hợp (khoảng 3-7 phút), tránh lan man chiếm thời gian bài mới',
      ],
      promptInstructions:
        'Phân tích Hoạt động 1 theo CV 5512: Có đủ 4 thành tố (Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện 4 bước); có tạo được tình huống xuất phát dẫn nhập không.',
      strictCv5512: true,
    },
    {
      key: 'kham_pha',
      title: 'Hoạt động 2: Hình thành kiến thức mới / Giải quyết vấn đề / Khám phá',
      shortLabel: 'HĐ 2: Khám phá',
      enabled: true,
      weight: 25,
      description: 'Học sinh làm việc với SGK, thiết bị, học liệu để chiếm lĩnh kiến thức mới, học sinh là chủ thể',
      criteriaChecklist: [
        'a) Mục tiêu: Giúp học sinh thực hiện nhiệm vụ học tập để chiếm lĩnh kiến thức mới/giải quyết vấn đề',
        'b) Nội dung: Nhiệm vụ cụ thể của học sinh làm việc với SGK, học liệu (đọc/xem/nghe/nói/làm)',
        'c) Sản phẩm: Kiến thức mới/kết quả giải quyết vấn đề mà học sinh cần viết ra, trình bày được',
        'd) Tổ chức thực hiện: Đầy đủ 4 bước tổ chức chuẩn mực của Công văn 5512',
        'Giáo viên có bước thể chế hóa, chốt kiến thức chuẩn mực, giải đáp hiểu lầm của học sinh',
      ],
      promptInstructions:
        'Đánh giá Hoạt động 2: Học sinh có thực sự tự làm việc không hay GV thuyết trình áp đặt; đủ 4 thành tố Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện 4 bước.',
      strictCv5512: true,
    },
    {
      key: 'luyen_tap',
      title: 'Hoạt động 3: Luyện tập / Thực hành',
      shortLabel: 'HĐ 3: Luyện tập',
      enabled: true,
      weight: 20,
      description: 'Hệ thống câu hỏi, bài tập, bài thực hành nhằm củng cố và khắc sâu kiến thức',
      criteriaChecklist: [
        'a) Mục tiêu: Vận dụng kiến thức đã học và phát triển các kĩ năng vận dụng cho học sinh',
        'b) Nội dung: Hệ thống câu hỏi, bài tập, bài thực hành, thí nghiệm giao cho học sinh',
        'c) Sản phẩm: Đáp án, lời giải của câu hỏi, bài tập, bài thực hành do học sinh thực hiện',
        'd) Tổ chức thực hiện: Giao nhiệm vụ, hướng dẫn hỗ trợ, kiểm tra đánh giá kết quả',
        'Có cơ hội để học sinh tự đánh giá, đánh giá đồng đẳng hoặc nhận xét lẫn nhau',
      ],
      promptInstructions:
        'Đánh giá Hoạt động 3: Hệ thống bài tập có bám sát mục tiêu vừa học không; đủ 4 thành tố Mục tiêu, Nội dung, Sản phẩm, Tổ chức thực hiện.',
      strictCv5512: true,
    },
    {
      key: 'van_dung',
      title: 'Hoạt động 4: Vận dụng / Mở rộng vào thực tiễn',
      shortLabel: 'HĐ 4: Vận dụng',
      enabled: true,
      weight: 15,
      description: 'Nhiệm vụ vận dụng kiến thức, kĩ năng vào giải quyết tình huống thực tế đời sống',
      criteriaChecklist: [
        'a) Mục tiêu: Phát triển năng lực học sinh thông qua nhiệm vụ vận dụng vào thực tiễn',
        'b) Nội dung: Yêu cầu học sinh phát hiện/đề xuất tình huống thực tiễn gắn với bài học để giải quyết',
        'c) Sản phẩm: Báo cáo phát hiện và giải quyết tình huống/vấn đề trong thực tiễn',
        'd) Tổ chức thực hiện: Giao thực hiện ngoài giờ lên lớp và nộp báo cáo chia sẻ phù hợp',
        'Tính khả thi cao, khuyến khích sáng tạo và tìm tòi khám phá',
      ],
      promptInstructions:
        'Soi xét Hoạt động 4: Nhiệm vụ có gắn với thực tiễn đời sống không hay chỉ là bài tập nâng cao; hướng dẫn giao nhiệm vụ và kiểm tra sản phẩm có khả thi không.',
      strictCv5512: true,
    },
  ],
};

// =========================================================================
// 2. CÔNG VĂN 2345/BGDĐT-GDTH (CẤP TIỂU HỌC)
// Dựa trên Phụ lục 3: Khung kế hoạch bài dạy chuẩn Bộ GD&ĐT cho Tiểu học
// =========================================================================
export const POLICY_CV2345_TIEU_HOC: EvaluationPolicyConfig = {
  policyId: 'policy_cv2345_tieuhoc',
  name: 'Chuẩn Công Văn 2345/BGDĐT (Cấp Tiểu Học)',
  description: 'Thẩm định kế hoạch bài dạy theo đúng khung Phụ lục 3 Công văn 2345/BGDĐT-GDTH cho cấp Tiểu học',
  dispatchType: 'CV_2345',
  enableMissingSectionWarning: true,
  chunkedEvaluation: true,
  evaluateVietnameseIntonation: true,
  sections: [
    {
      key: 'muc_tieu',
      title: '1. Yêu cầu cần đạt (Phẩm chất, Năng lực & Kiến thức)',
      shortLabel: '1. Yêu cầu cần đạt (2345)',
      enabled: true,
      weight: 20,
      description: 'Đánh giá yêu cầu cần đạt theo CV 2345: Học sinh làm được việc gì, vận dụng vào đâu, phẩm chất năng lực gì',
      criteriaChecklist: [
        'Nêu cụ thể học sinh thực hiện được việc gì sau bài học',
        'Nêu cụ thể học sinh vận dụng được những gì vào giải quyết vấn đề trong thực tế cuộc sống',
        'Có cơ hội hình thành, phát triển phẩm chất, năng lực gì phù hợp với lứa tuổi tiểu học',
        'Bám sát yêu cầu cần đạt của mạch nội dung môn học trong Chương trình GDPT 2018 cấp Tiểu học',
        'Sử dụng ngôn ngữ sư phạm chuẩn xác, phát âm chuẩn, đúng dấu thanh và ngữ điệu Tiếng Việt',
      ],
      promptInstructions:
        'Thẩm định mục tiêu bài học cấp Tiểu học theo Công văn 2345/BGDĐT: Kiểm tra 3 câu hỏi cốt lõi: Học sinh làm được việc gì? Vận dụng được gì vào thực tế? Cơ hội phát triển phẩm chất, năng lực gì.',
      strictCv2345: true,
    },
    {
      key: 'thiet_bi',
      title: '2. Đồ dùng dạy học (Chuẩn bị GV & HS)',
      shortLabel: '2. Đồ dùng dạy học (2345)',
      enabled: true,
      weight: 10,
      description: 'Nêu các thiết bị, đồ dùng trực quan, học liệu phục vụ cho tiết dạy của GV và HS',
      criteriaChecklist: [
        'Nêu cụ thể đồ dùng cần chuẩn bị của Giáo viên (giáo án điện tử, bài giảng powerpoint, tranh ảnh, video, vật thật, thẻ từ)',
        'Nêu cụ thể đồ dùng của Học sinh (SGK, vở bài tập, bộ đồ dùng học tập, bảng con)',
        'Đảm bảo tính trực quan sinh động, an toàn và hấp dẫn đối với học sinh tiểu học',
      ],
      promptInstructions:
        'Kiểm tra đồ dùng dạy học theo CV 2345: Phân rõ đồ dùng của GV và HS, bảo đảm trực quan sinh động cho học sinh tiểu học.',
      strictCv2345: true,
    },
    {
      key: 'khoi_dong',
      title: 'Hoạt động Mở đầu: Khởi động, kết nối',
      shortLabel: 'HĐ Mở đầu (2345)',
      enabled: true,
      weight: 15,
      description: 'Tạo tâm thế vui tươi, hào hứng, kết nối kiến thức cũ với bài mới qua bài hát, trò chơi, câu đố',
      criteriaChecklist: [
        'Tổ chức sinh động qua trò chơi, bài hát, câu đố hoặc video ngắn kích thích hứng thú (3-5 phút)',
        'Tạo không khí lớp học vui tươi, thoải mái, dẫn dắt kết nối tự nhiên vào bài học',
        'Nhiệm vụ rõ ràng, phù hợp khả năng học sinh tiểu học, thu hút tất cả học sinh tham gia',
      ],
      promptInstructions:
        'Đánh giá hoạt động mở đầu tiểu học theo CV 2345: Có tạo được tâm thế hứng thú, kết nối tự nhiên không hay gượng ép, khô cứng.',
      strictCv2345: true,
    },
    {
      key: 'kham_pha',
      title: 'Hoạt động Hình thành kiến thức mới (Trải nghiệm, Khám phá)',
      shortLabel: 'HĐ Khám phá (2345)',
      enabled: true,
      weight: 25,
      description: 'Tổ chức cho học sinh trải nghiệm, quan sát trực quan, thao tác đồ dùng để tự chiếm lĩnh kiến thức',
      criteriaChecklist: [
        'Học sinh được trải nghiệm, thao tác với học liệu/vật thật, quan sát tranh ảnh hoặc thảo luận',
        'Hình thức tổ chức linh hoạt (cá nhân, nhóm đôi, nhóm 4), quán triệt nguyên tắc "không bỏ quên học sinh nào"',
        'Giáo viên quan sát, phát hiện kịp thời khó khăn và hỗ trợ; nhận xét khích lệ tạo niềm tin học tập',
        'Chốt và chính xác hóa kiến thức một cách ngắn gọn, trực quan, dễ nhớ đối với lứa tuổi tiểu học',
      ],
      promptInstructions:
        'Đánh giá hoạt động khám phá tiểu học theo CV 2345: Giáo viên có tạo cơ hội cho học sinh thao tác trải nghiệm không; có bao quát hỗ trợ kịp thời học sinh gặp khó khăn không.',
      strictCv2345: true,
    },
    {
      key: 'luyen_tap',
      title: 'Hoạt động Luyện tập, thực hành',
      shortLabel: 'HĐ Luyện tập (2345)',
      enabled: true,
      weight: 20,
      description: 'Hệ thống bài tập phân hóa, thực hành rèn luyện kỹ năng, đánh giá đồng đẳng khích lệ',
      criteriaChecklist: [
        'Hệ thống bài tập phân hóa phù hợp trình độ, từ làm mẫu đến làm bài độc lập và theo nhóm',
        'Học sinh được tự nhận xét và nhận xét bài của bạn/nhóm bạn (đánh giá đồng đẳng bằng lời khích lệ)',
        'Giáo viên quan sát, sửa lỗi kịp thời, uốn nắn phát âm, dấu thanh, chữ viết cho học sinh',
        'Động viên, biểu dương sự tiến bộ của từng học sinh, tránh so sánh làm nản lòng',
      ],
      promptInstructions:
        'Đánh giá hoạt động luyện tập tiểu học: Hệ thống bài tập có phù hợp sức học không; có tạo điều kiện cho học sinh tự nhận xét và nhận xét bạn không.',
      strictCv2345: true,
    },
    {
      key: 'van_dung',
      title: 'Hoạt động Vận dụng, trải nghiệm (nếu có)',
      shortLabel: 'HĐ Vận dụng (2345)',
      enabled: true,
      weight: 10,
      description: 'Vận dụng kiến thức vào thực tế đời sống, gia đình và môi trường xung quanh học sinh tiểu học',
      criteriaChecklist: [
        'Ứng dụng kiến thức bài học vào đời sống sinh hoạt, gia đình và cộng đồng xung quanh',
        'Khuyến khích học sinh chia sẻ điều học được với người thân, rèn thói quen tự tin giao tiếp',
        'Nhiệm vụ nhẹ nhàng, mang tính trải nghiệm thực tế, không gây quá tải áp lực bài tập về nhà',
      ],
      promptInstructions:
        'Đánh giá hoạt động vận dụng theo CV 2345: Nhiệm vụ có gần gũi với đời sống học sinh tiểu học không, có tránh quá tải không.',
      strictCv2345: true,
    },
    {
      key: 'dieu_chinh',
      title: '4. Điều chỉnh sau bài dạy (Rút kinh nghiệm sư phạm)',
      shortLabel: '4. Điều chỉnh (2345)',
      enabled: false, // Tùy chọn bổ sung
      weight: 0,
      description: 'Ghi nhận rút kinh nghiệm sau khi dạy: nội dung khó khăn, bất cập hoặc nội dung tâm đắc hiệu quả',
      criteriaChecklist: [
        'Có mục điều chỉnh sau bài dạy theo đúng khung Phụ lục 3 CV 2345',
        'Ghi nhận những nội dung học sinh còn lúng túng hoặc điểm tâm đắc tổ chức dạy học hiệu quả',
      ],
      promptInstructions:
        'Kiểm tra kế hoạch bài dạy có mục "Điều chỉnh sau bài dạy" theo khung mẫu Phụ lục 3 Công văn 2345 không.',
      strictCv2345: true,
    },
  ],
};

// Backward-compatible alias
export const DEFAULT_EVALUATION_POLICY = POLICY_CV5512_STANDARD;

// 3. MẪU CHUYÊN SÂU: MÔN TIẾNG VIỆT & NGỮ VĂN (TRỌNG TÂM DẤU THANH, NGỮ ĐIỆU & ĐỌC DIỄN CẢM)
export const POLICY_TIENG_VIET_NGU_DIEU: EvaluationPolicyConfig = {
  policyId: 'policy_tieng_viet_ngu_dieu',
  name: 'Môn Tiếng Việt / Ngữ Văn (Trọng tâm Dấu Thanh, Ngữ Điệu & Đọc Diễn Cảm)',
  description: 'Thẩm định chuyên sâu việc rèn luyện phát âm chuẩn, dấu thanh tiếng Việt, ngắt nghỉ câu và ngữ điệu đọc/nói',
  dispatchType: 'CV_5512',
  enableMissingSectionWarning: true,
  chunkedEvaluation: true,
  evaluateVietnameseIntonation: true,
  sections: [
    {
      key: 'muc_tieu',
      title: 'I. Mục tiêu bài dạy (Năng lực ngôn ngữ & Ngữ điệu)',
      shortLabel: 'Mục tiêu ngôn ngữ',
      enabled: true,
      weight: 20,
      description: 'Mục tiêu phát triển năng lực đọc đúng ngữ điệu, ngắt giọng chuẩn xác, cảm thụ văn học',
      criteriaChecklist: [
        'Xác định rõ yêu cầu đọc đúng âm, vần, dấu thanh (sắc, huyền, hỏi, ngã, nặng) và ngắt nghỉ đúng dấu câu',
        'Có mục tiêu rèn luyện ngữ điệu đọc diễn cảm phù hợp với kiểu câu (kể, hỏi, cảm, khiến) và ngữ cảnh',
        'Đủ 3 thành phần: Năng lực đặc thù (ngôn ngữ, văn học), Năng lực chung và Phẩm chất theo GDPT 2018',
        'Dùng động từ hành động chuẩn xác: đọc đúng ngữ điệu, phân biệt dấu thanh, đọc phân vai, phát biểu diễn cảm',
      ],
      promptInstructions:
        'Kiểm tra mục tiêu: Có chỉ rõ yêu cầu cần đạt về ngữ điệu, dấu thanh, cách ngắt giọng theo dấu câu và diễn cảm không; động từ có đo lường được năng lực phát âm và ngữ điệu của học sinh không.',
      strictCv5512: true,
    },
    {
      key: 'thiet_bi',
      title: 'II. Thiết bị dạy học & Học liệu luyện phát âm / Ngữ điệu',
      shortLabel: 'Học liệu & Phương tiện',
      enabled: true,
      weight: 10,
      description: 'Học liệu trực quan, thẻ từ ngữ, băng mẫu phát âm chuẩn và phiếu luyện đọc',
      criteriaChecklist: [
        'Có thẻ từ ngữ chứa dấu thanh dễ lẫn (hỏi/ngã, sắc/nặng) hoặc bảng phụ kẻ sẵn câu có đánh dấu ngắt nghỉ hơi',
        'Ứng dụng âm thanh, video hoặc giọng đọc mẫu chuẩn ngữ điệu của giáo viên / học liệu số',
        'Phiếu bài tập luyện đọc theo cặp / nhóm và bảng tiêu chí nhận xét phát âm',
      ],
      promptInstructions:
        'Đánh giá học liệu: Có bảng phụ ngắt giọng, thẻ dấu thanh hoặc phương tiện hỗ trợ luyện ngữ điệu và sửa phát âm cho học sinh không.',
      strictCv5512: true,
    },
    {
      key: 'khoi_dong',
      title: 'Hoạt động 1: Khởi động (Luyện khẩu hình & Tạo tâm thế ngữ điệu)',
      shortLabel: 'HĐ Khởi động',
      enabled: true,
      weight: 15,
      description: 'Khởi động qua bài hát, câu đố hoặc trò chơi từ ngữ kích thích hứng thú nói và đọc',
      criteriaChecklist: [
        'Tạo không khí sôi nổi, kích hoạt vốn từ ngữ và giọng điệu tự nhiên của học sinh',
        'Gắn kết khéo léo với chủ điểm bài đọc/viết mới, gợi mở cảm xúc',
        'Tiến trình 4 bước sư phạm rõ ràng, có học sinh tham gia phát biểu',
      ],
      promptInstructions:
        'Soi xét hoạt động khởi động: Có tạo tâm thế hào hứng và liên hệ trực tiếp đến âm điệu, nội dung bài mới không.',
      strictCv5512: true,
    },
    {
      key: 'kham_pha',
      title: 'Hoạt động 2: Đọc mẫu chuẩn ngữ điệu & Tìm hiểu bài',
      shortLabel: 'HĐ Khám phá',
      enabled: true,
      weight: 25,
      description: 'Giáo viên đọc mẫu chuẩn mực ngữ điệu; hướng dẫn học sinh ngắt giọng, nhấn giọng và chiếm lĩnh kiến thức',
      criteriaChecklist: [
        'Giáo viên có chỉ dẫn cụ thể về ngữ điệu: ngắt hơi sau dấu phẩy, nghỉ sau dấu chấm, nâng giọng ở câu hỏi, hạ giọng ở câu kể',
        'Giải thích nghĩa các từ ngữ khó, từ ngữ mang tính biểu cảm, từ ngữ địa phương (nếu có)',
        'Học sinh được đọc nối tiếp câu, đoạn; giáo viên kịp thời uốn nắn lỗi phát âm và dấu thanh',
        'Hệ thống câu hỏi tìm hiểu bài kích thích học sinh trả lời trọn câu, diễn đạt tự tin',
      ],
      promptInstructions:
        'Đánh giá hoạt động khám phá: Giáo viên có hướng dẫn kỹ thuật ngắt nghỉ câu, đọc diễn cảm theo dấu câu và sắc thái nhân vật không; học sinh có được sửa lỗi phát âm và dấu thanh kịp thời không.',
      strictCv5512: true,
    },
    {
      key: 'luyen_tap',
      title: 'Hoạt động 3: Luyện đọc diễn cảm & Thực hành theo ngữ điệu',
      shortLabel: 'HĐ Luyện tập',
      enabled: true,
      weight: 20,
      description: 'Luyện đọc phân vai, đọc theo nhóm với các sắc thái biểu cảm, bài tập chính tả dấu thanh',
      criteriaChecklist: [
        'Tổ chức luyện đọc phân vai, thi đọc diễn cảm giữa các nhóm có nhận xét góp ý',
        'Học sinh tự nhận xét và đánh giá đồng đẳng về ngữ điệu, tốc độ đọc và độ chính xác của bạn',
        'Có bài tập phân biệt dấu thanh (hỏi - ngã), âm đầu hoặc vần dễ sai chính tả',
        'Giáo viên khen ngợi, động viên học sinh có ngữ điệu đọc truyền cảm và tự tin',
      ],
      promptInstructions:
        'Phân tích hoạt động luyện tập: Học sinh có được thực hành đọc diễn cảm, thể hiện đúng ngữ điệu của từng nhân vật hoặc đoạn thơ không; có tiêu chí nhận xét bạn rõ ràng không.',
      strictCv5512: true,
    },
    {
      key: 'van_dung',
      title: 'Hoạt động 4: Vận dụng giao tiếp & Kể chuyện diễn cảm',
      shortLabel: 'HĐ Vận dụng',
      enabled: true,
      weight: 10,
      description: 'Vận dụng ngôn ngữ vào giao tiếp hằng ngày, kể lại câu chuyện với ngữ điệu sinh động',
      criteriaChecklist: [
        'Khuyến khích học sinh kể lại câu chuyện hoặc đọc bài thơ cho người thân nghe với ngữ điệu diễn cảm',
        'Giao nhiệm vụ tìm thêm các câu văn, câu thơ có ngữ điệu hoặc hình ảnh tương tự',
        'Hướng dẫn nhẹ nhàng, phù hợp lứa tuổi, không gây quá tải áp lực về nhà',
      ],
      promptInstructions:
        'Kiểm tra hoạt động vận dụng: Hướng dẫn giao việc có gắn với giao tiếp thực tế và rèn thói quen nói/đọc đúng ngữ điệu trong gia đình không.',
      strictCv5512: true,
    },
  ],
};

// 4. MẪU CHỈ 4 HOẠT ĐỘNG LÊN LỚP (BỎ QUA MỤC TIÊU VÀ THIẾT BỊ)
export const POLICY_4_ACTIVITIES: EvaluationPolicyConfig = {
  policyId: 'policy_4_activities',
  name: 'Chỉ 4 Hoạt Động Lên Lớp (Khởi động, Khám phá, Luyện tập, Vận dụng)',
  description: 'Chỉ tập trung thẩm định cấu trúc 4 bước tổ chức và sản phẩm học sinh trong 4 hoạt động lên lớp',
  dispatchType: 'CV_5512',
  enableMissingSectionWarning: false,
  chunkedEvaluation: true,
  evaluateVietnameseIntonation: false,
  sections: [
    {
      key: 'khoi_dong',
      title: 'Hoạt động 1: Mở đầu / Khởi động',
      shortLabel: 'HĐ Khởi động',
      enabled: true,
      weight: 20,
      description: 'Tạo tâm thế hứng thú, tình huống xuất phát dẫn nhập vào bài',
      criteriaChecklist: [
        'Mục tiêu khởi động kích thích tò mò',
        'Đủ 4 bước sư phạm: Chuyển giao -> Thực hiện -> Báo cáo -> Kết luận',
        'Sản phẩm học sinh rõ ràng (câu trả lời, phương án dự đoán)',
      ],
      promptInstructions: 'Kiểm tra 4 bước tổ chức và sản phẩm học sinh ở hoạt động khởi động.',
      strictCv5512: true,
    },
    {
      key: 'kham_pha',
      title: 'Hoạt động 2: Hình thành kiến thức mới / Khám phá',
      shortLabel: 'HĐ Khám phá',
      enabled: true,
      weight: 35,
      description: 'Học sinh tự chiếm lĩnh tri thức mới, học sinh là trung tâm',
      criteriaChecklist: [
        'Học sinh tích cực thảo luận, thực hành, tự phát hiện kiến thức',
        'Đầy đủ 4 bước tổ chức chuẩn mực Công văn 5512',
        'Sản phẩm học tập cụ thể, phản ánh đúng kiến thức bài học',
        'Giáo viên có bước chuẩn hóa kiến thức',
      ],
      promptInstructions: 'Đánh giá tiến trình khám phá: học sinh có tự làm việc không, đủ 4 bước tổ chức không.',
      strictCv5512: true,
    },
    {
      key: 'luyen_tap',
      title: 'Hoạt động 3: Luyện tập / Thực hành',
      shortLabel: 'HĐ Luyện tập',
      enabled: true,
      weight: 30,
      description: 'Củng cố và rèn luyện kỹ năng qua hệ thống bài tập',
      criteriaChecklist: [
        'Hệ thống bài tập phân hóa từ dễ đến khó',
        'Đủ quy trình 4 bước sư phạm',
        'Có tiêu chí hoặc đáp án mẫu đánh giá bài làm',
      ],
      promptInstructions: 'Kiểm tra hoạt động luyện tập: bài tập bám sát mục tiêu, học sinh được thực hành đủ.',
      strictCv5512: true,
    },
    {
      key: 'van_dung',
      title: 'Hoạt động 4: Vận dụng / Mở rộng',
      shortLabel: 'HĐ Vận dụng',
      enabled: true,
      weight: 15,
      description: 'Vận dụng kiến thức giải quyết vấn đề thực tế đời sống',
      criteriaChecklist: [
        'Gắn với đời sống thực tiễn',
        'Giao nhiệm vụ cụ thể, tiêu chí nộp bài khả thi',
      ],
      promptInstructions: 'Soi xét hoạt động vận dụng: có gắn với thực tiễn và tính khả thi của nhiệm vụ.',
      strictCv5512: true,
    },
  ],
};

// 5. MẪU CHỈ MỤC TIÊU & THIẾT BỊ HỌC LIỆU
export const POLICY_OBJECTIVES_ONLY: EvaluationPolicyConfig = {
  policyId: 'policy_objectives_only',
  name: 'Chỉ Mục Tiêu Bài Dạy & Thiết Bị Học Liệu',
  description: 'Thẩm định tính chuẩn mực của việc xác định 3 mặt mục tiêu và sự chuẩn bị phương tiện dạy học',
  dispatchType: 'CV_5512',
  enableMissingSectionWarning: false,
  chunkedEvaluation: true,
  evaluateVietnameseIntonation: false,
  sections: [
    {
      key: 'muc_tieu',
      title: 'I. Mục tiêu bài dạy (Yêu cầu cần đạt)',
      shortLabel: 'Mục tiêu bài dạy',
      enabled: true,
      weight: 60,
      description: 'Đánh giá 3 mặt mục tiêu (Kiến thức, Năng lực, Phẩm chất), mức độ đo lường được',
      criteriaChecklist: [
        'Đủ 3 thành phần: Kiến thức, Năng lực (chung & đặc thù), Phẩm chất',
        'Mục tiêu lượng hóa bằng động từ hành động cụ thể',
        'Bám sát Chương trình GDPT 2018',
      ],
      promptInstructions: 'Soi xét kỹ động từ hành động và 3 mặt mục tiêu bài dạy.',
      strictCv5512: true,
    },
    {
      key: 'thiet_bi',
      title: 'II. Thiết bị dạy học và học liệu',
      shortLabel: 'Thiết bị & Học liệu',
      enabled: true,
      weight: 40,
      description: 'Chuẩn bị của giáo viên và học sinh, ứng dụng CNTT',
      criteriaChecklist: [
        'Phân định rõ của Giáo viên và của Học sinh',
        'Liệt kê cụ thể phương tiện, phiếu bài tập, máy chiếu, tranh ảnh',
      ],
      promptInstructions: 'Kiểm tra danh mục thiết bị và học liệu tách riêng GV và HS.',
      strictCv5512: true,
    },
  ],
};

// DANH SÁCH TẤT CẢ CÁC PROFILES TÍCH HỢP SẴN
export const BUILT_IN_POLICY_PROFILES: SavedPolicyProfile[] = [
  {
    id: 'profile_cv5512_standard',
    name: '1. Chuẩn CV 5512/BGDĐT (Cấp THCS & THPT)',
    description: 'Thẩm định toàn diện theo khung Phụ lục IV Công văn 5512 (100 điểm)',
    dispatchType: 'CV_5512',
    isBuiltIn: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
    policy: POLICY_CV5512_STANDARD,
  },
  {
    id: 'profile_cv2345_tieuhoc',
    name: '2. Chuẩn CV 2345/BGDĐT (Cấp Tiểu Học)',
    description: 'Thẩm định kế hoạch bài dạy theo khung Phụ lục 3 Công văn 2345 cho Tiểu học (100 điểm)',
    dispatchType: 'CV_2345',
    isBuiltIn: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
    policy: POLICY_CV2345_TIEU_HOC,
  },
  {
    id: 'profile_tieng_viet_ngu_dieu',
    name: '3. Môn Tiếng Việt / Ngữ Văn (Trọng tâm Dấu Thanh & Ngữ Điệu)',
    description: 'Chuyên sâu thẩm định việc rèn luyện phát âm chuẩn, dấu ngữ điệu, ngắt giọng và đọc diễn cảm',
    dispatchType: 'CV_5512',
    isBuiltIn: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
    policy: POLICY_TIENG_VIET_NGU_DIEU,
  },
  {
    id: 'profile_4_activities',
    name: '4. Chỉ 4 Hoạt Động Lên Lớp',
    description: 'Tập trung chuyên sâu chuỗi 4 pha hoạt động sư phạm lên lớp (100 điểm)',
    dispatchType: 'CV_5512',
    isBuiltIn: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
    policy: POLICY_4_ACTIVITIES,
  },
  {
    id: 'profile_objectives_only',
    name: '5. Chỉ Mục Tiêu & Thiết Bị Học Liệu',
    description: 'Rà soát nhanh phần mở đầu: mục tiêu đầu ra và phương tiện chuẩn bị',
    dispatchType: 'CV_5512',
    isBuiltIn: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-10-06T00:00:00.000Z',
    policy: POLICY_OBJECTIVES_ONLY,
  },
];

// ==================== STORAGE & IMPORT/EXPORT UTILITIES ====================

const STORAGE_KEY_PROFILES = 'khbd_evaluation_profiles_v3';
const STORAGE_KEY_ACTIVE_POLICY = 'khbd_evaluation_policy_active';
const STORAGE_KEY_ACTIVE_DISPATCH = 'khbd_active_dispatch_type';
const STORAGE_KEY_POLICY_5512 = 'khbd_saved_policy_cv5512';
const STORAGE_KEY_POLICY_2345 = 'khbd_saved_policy_cv2345';

export function loadSavedProfiles(): SavedPolicyProfile[] {
  if (typeof window === 'undefined') return BUILT_IN_POLICY_PROFILES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    if (!raw) return BUILT_IN_POLICY_PROFILES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const savedIds = new Set(parsed.map((p: SavedPolicyProfile) => p.id));
      const merged = [...parsed];
      for (const bp of BUILT_IN_POLICY_PROFILES) {
        if (!savedIds.has(bp.id)) {
          merged.push(bp);
        }
      }
      return merged;
    }
  } catch (err) {
    console.warn('Failed to load saved policy profiles from localStorage:', err);
  }
  return BUILT_IN_POLICY_PROFILES;
}

export function saveProfilesToStorage(profiles: SavedPolicyProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (err) {
    console.error('Failed to save policy profiles to localStorage:', err);
  }
}

export function getActiveDispatchType(): DispatchType {
  if (typeof window === 'undefined') return 'CV_5512';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_DISPATCH);
    if (saved === 'CV_2345' || saved === 'CV_5512' || saved === 'CUSTOM') {
      return saved as DispatchType;
    }
  } catch {
    // ignore
  }
  return 'CV_5512';
}

export function setActiveDispatchType(type: DispatchType): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_DISPATCH, type);
  } catch {
    // ignore
  }
}

export function loadPolicyForDispatch(type: 'CV_5512' | 'CV_2345'): EvaluationPolicyConfig {
  if (typeof window === 'undefined') {
    return type === 'CV_2345' ? POLICY_CV2345_TIEU_HOC : POLICY_CV5512_STANDARD;
  }
  try {
    const key = type === 'CV_2345' ? STORAGE_KEY_POLICY_2345 : STORAGE_KEY_POLICY_5512;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sections)) {
        return parsed;
      }
    }
  } catch {
    // fallback to builtin
  }
  return type === 'CV_2345' ? POLICY_CV2345_TIEU_HOC : POLICY_CV5512_STANDARD;
}

export function savePolicyForDispatch(type: 'CV_5512' | 'CV_2345', policy: EvaluationPolicyConfig): void {
  if (typeof window === 'undefined') return;
  try {
    const key = type === 'CV_2345' ? STORAGE_KEY_POLICY_2345 : STORAGE_KEY_POLICY_5512;
    localStorage.setItem(key, JSON.stringify(policy));
  } catch {
    // ignore
  }
}

export function loadActivePolicyFromStorage(): EvaluationPolicyConfig {
  if (typeof window === 'undefined') return POLICY_CV5512_STANDARD;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACTIVE_POLICY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.sections && Array.isArray(parsed.sections)) {
        return parsed;
      }
    }
    // Check dispatch type
    const dispatchType = getActiveDispatchType();
    return loadPolicyForDispatch(dispatchType === 'CV_2345' ? 'CV_2345' : 'CV_5512');
  } catch (err) {
    console.warn('Failed to load active policy from localStorage:', err);
  }
  return POLICY_CV5512_STANDARD;
}

export function saveActivePolicyToStorage(policy: EvaluationPolicyConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_POLICY, JSON.stringify(policy));
    if (policy.dispatchType === 'CV_5512' || policy.dispatchType === 'CV_2345') {
      savePolicyForDispatch(policy.dispatchType, policy);
      setActiveDispatchType(policy.dispatchType);
    }
  } catch (err) {
    console.error('Failed to save active policy to localStorage:', err);
  }
}

export function exportPolicyToJson(policy: EvaluationPolicyConfig): string {
  return JSON.stringify(
    {
      format: 'KHBD_EVALUATION_POLICY_V3',
      dispatchType: policy.dispatchType || 'CV_5512',
      exportedAt: new Date().toISOString(),
      policy,
    },
    null,
    2
  );
}

export function downloadPolicyJsonFile(policy: EvaluationPolicyConfig): void {
  if (typeof window === 'undefined') return;
  const jsonStr = exportPolicyToJson(policy);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (policy.name || 'cau-hinh-danh-gia')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  a.download = `khbd_config_${policy.dispatchType || 'cv5512'}_${safeName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function validateAndParsePolicyJson(jsonString: string): EvaluationPolicyConfig | null {
  try {
    const parsed = JSON.parse(jsonString);
    const candidate = parsed.policy || parsed;
    if (candidate && candidate.sections && Array.isArray(candidate.sections)) {
      return {
        policyId: candidate.policyId || `policy_imported_${Date.now()}`,
        name: candidate.name || 'Cấu hình đã nhập',
        description: candidate.description || 'Cấu hình tiêu chí đánh giá được nhập từ file JSON',
        dispatchType: candidate.dispatchType || (parsed.dispatchType as DispatchType) || 'CV_5512',
        enableMissingSectionWarning: candidate.enableMissingSectionWarning ?? true,
        chunkedEvaluation: candidate.chunkedEvaluation ?? true,
        evaluateVietnameseIntonation: candidate.evaluateVietnameseIntonation ?? true,
        sections: candidate.sections.map((s: any, idx: number) => ({
          key: s.key || `custom_section_${idx + 1}`,
          title: s.title || `Phần ${idx + 1}`,
          shortLabel: s.shortLabel || `Phần ${idx + 1}`,
          enabled: Boolean(s.enabled),
          weight: typeof s.weight === 'number' ? s.weight : 15,
          description: s.description || '',
          criteriaChecklist: Array.isArray(s.criteriaChecklist) ? s.criteriaChecklist : [],
          promptInstructions: s.promptInstructions || '',
          strictCv5512: Boolean(s.strictCv5512),
          strictCv2345: Boolean(s.strictCv2345),
        })),
        updatedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error('Failed to parse policy JSON:', err);
  }
  return null;
}
