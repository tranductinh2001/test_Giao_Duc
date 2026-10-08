// Rule Evaluator
// Evaluates lesson plans holistically across all pages according to CV 5512 (THCS/THPT) and CV 2345 (Tiểu học)
// Accurately targets annotations to their actual pages, never pinning activity errors to Page 1!

import { Rule, RuleEvaluationResult, RuleIssue } from '@/types/rule';
import { DocumentIR, SemanticLabel } from '@/types/document';
import { Review, ReviewSeverity, ReviewType } from '@/types/review';

/**
 * Finds the primary anchor paragraph in the Activity Organization section (Tiến trình dạy học)
 * If the lesson plan has multiple pages, this anchor will point to Page 2+ or the last page, NEVER Page 1!
 */
export function findActivityProcessAnchor(document: DocumentIR): string {
  const paragraphs = document.paragraphs || [];
  if (paragraphs.length === 0) return 'p_0001';

  // 1. Look for Main Process container header (III. Tiến trình dạy học / Các hoạt động dạy học chủ yếu)
  const processHeader = paragraphs.find((p) =>
    /^(?:III\.|3\.|C\.)\s*(?:TIẾN TRÌNH|CÁC HOẠT ĐỘNG)/i.test(p.text.trim()) ||
    /^TIẾN TRÌNH DẠY HỌC/i.test(p.text.trim()) ||
    /^CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU/i.test(p.text.trim())
  );
  if (processHeader) return processHeader.id;

  // 2. Look for any activity in document.activities
  if (document.activities && document.activities.length > 0) {
    const act = document.activities[0];
    if (act.startParagraphId) return act.startParagraphId;
  }

  // 3. Look for paragraphs on later pages (page >= 2) with activity keywords
  const laterPageParas = paragraphs.filter((p) => p.page >= 2);
  if (laterPageParas.length > 0) {
    const actP = laterPageParas.find((p) =>
      /hoạt động|khởi động|khám phá|luyện tập|vận dụng|giáo viên|học sinh|bước 1|bước 2/i.test(p.text)
    );
    if (actP) return actP.id;
    return laterPageParas[0].id;
  }

  // 4. Fallback for single-page documents
  return paragraphs[paragraphs.length - 1]?.id || paragraphs[0]?.id || 'p_0001';
}

/**
 * Finds the anchor paragraph for the end of the activity process (useful for suggesting Hoạt động 4 / Vận dụng)
 */
export function findLastActivityAnchor(document: DocumentIR): string {
  const paragraphs = document.paragraphs || [];
  if (paragraphs.length === 0) return 'p_0001';

  if (document.activities && document.activities.length > 0) {
    const lastAct = document.activities[document.activities.length - 1];
    if (lastAct.endParagraphId) return lastAct.endParagraphId;
    if (lastAct.startParagraphId) return lastAct.startParagraphId;
  }

  const laterPageParas = paragraphs.filter((p) => p.page >= 2);
  if (laterPageParas.length > 0) {
    return laterPageParas[laterPageParas.length - 1].id;
  }

  return paragraphs[paragraphs.length - 1]?.id || 'p_0001';
}

/**
 * Finds the anchor paragraph for Teaching Materials & Equipment (Thiết bị dạy học và học liệu / Đồ dùng dạy học).
 * Holistic multi-page scan across ALL pages (Page 1, 2, 3...).
 * If found on Page 2+, returns that paragraph's id on Page 2+!
 * If missing, returns anchor immediately after objectives, NEVER p_0001 (lesson title / đầu bài)!
 */
export function findMaterialAnchor(document: DocumentIR): string {
  const paragraphs = document.paragraphs || [];
  if (paragraphs.length === 0) return 'p_0001';

  // 1. Scan all paragraphs across all pages for material headings
  const matHeading = paragraphs.find((p) =>
    /^(?:II\.|2\.|B\.|II\/|II\s*[-–—:]|PHẦN\s*II\.?)\s*(?:THIẾT BỊ|ĐỒ DÙNG|CHUẨN BỊ|HỌC LIỆU|PHƯƠNG TIỆN)/i.test(p.text.trim()) ||
    /^(?:II\.|2\.|B\.)?\s*ĐỒ DÙNG DẠY(?:\s*VÀ)?\s*HỌC/i.test(p.text.trim()) ||
    /^(?:II\.|2\.|B\.)?\s*THIẾT BỊ DẠY HỌC(?:\s*VÀ\s*HỌC LIỆU)?/i.test(p.text.trim()) ||
    /^(?:II\.|2\.|B\.)?\s*THIẾT BỊ VÀ HỌC LIỆU/i.test(p.text.trim()) ||
    /^(?:II\.|2\.|B\.)?\s*CHUẨN BỊ\s*(?:THIẾT BỊ|ĐỒ DÙNG|CỦA GV|DẠY HỌC|HỌC LIỆU)?/i.test(p.text.trim()) ||
    /^ĐỒ DÙNG DẠY HỌC/i.test(p.text.trim()) ||
    /^THIẾT BỊ DẠY HỌC/i.test(p.text.trim())
  );
  if (matHeading) return matHeading.id;

  // 2. Scan all paragraphs for material keywords / preparation content
  const matContent = paragraphs.find((p) =>
    /(?:đồ dùng dạy học|thiết bị dạy học|chuẩn bị của giáo viên|chuẩn bị của gv|đồ dùng dạy và học|thiết bị và học liệu|phương tiện dạy học|chuẩn bị thiết bị)/i.test(p.text) ||
    (/(?:giáo viên|gv):/i.test(p.text) && /sgk|máy chiếu|tivi|phiếu học tập|bảng phụ|tranh|ảnh|thước kẻ|bộ đồ dùng|vật thật|học liệu/i.test(p.text))
  );
  if (matContent) return matContent.id;

  // 3. Fallback when materials are truly missing:
  // Find the end of Objectives section (so the suggestion anchors right after objectives where Section II belongs!)
  const objIndices: number[] = [];
  paragraphs.forEach((p, idx) => {
    if (/kiến thức|năng lực|phẩm chất|yêu cầu cần đạt|mục tiêu/i.test(p.text)) {
      objIndices.push(idx);
    }
  });

  if (objIndices.length > 0) {
    const lastObjIdx = objIndices[objIndices.length - 1];
    // Return either the paragraph after the last objective, or the last objective itself
    if (lastObjIdx + 1 < paragraphs.length) {
      return paragraphs[lastObjIdx + 1].id;
    }
    return paragraphs[lastObjIdx].id;
  }

  // 4. If objectives couldn't be detected, anchor right before main process container
  const processHeaderIdx = paragraphs.findIndex((p) =>
    /^(?:III\.|3\.|C\.)\s*(?:TIẾN TRÌNH|CÁC HOẠT ĐỘNG)/i.test(p.text.trim())
  );
  if (processHeaderIdx > 0) {
    return paragraphs[processHeaderIdx - 1].id;
  }

  // 5. Ultimate fallback: Use second paragraph if available to avoid pinning to lesson title (p_0001)
  return paragraphs.length > 1 ? paragraphs[1].id : paragraphs[0]?.id || 'p_0001';
}

/**
 * Finds the primary anchor paragraph for Objectives (Mục tiêu bài dạy / Yêu cầu cần đạt).
 * Targets the actual objective content, NEVER the lesson title / đầu bài (p_0001)!
 */
export function findObjectiveAnchor(document: DocumentIR): string {
  const paragraphs = document.paragraphs || [];
  if (paragraphs.length === 0) return 'p_0001';

  // 1. Find objective header
  const objHeader = paragraphs.find((p) =>
    /^(?:I\.|1\.|A\.)\s*(?:MỤC TIÊU|YÊU CẦU CẦN ĐẠT)/i.test(p.text.trim()) ||
    /^MỤC TIÊU\s*(?:BÀI HỌC|BÀI DẠY)?[:\.\s]/i.test(p.text.trim()) ||
    /^YÊU CẦU CẦN ĐẠT[:\.\s]/i.test(p.text.trim())
  );
  if (objHeader) return objHeader.id;

  // 2. Find first paragraph mentioning knowledge/competence/qualities
  const objContent = paragraphs.find((p) =>
    /kiến thức|năng lực|phẩm chất|yêu cầu cần đạt/i.test(p.text)
  );
  if (objContent) return objContent.id;

  // 3. Fallback: Return second paragraph (after lesson title), or first if only 1 exists
  return paragraphs.length > 1 ? paragraphs[1].id : paragraphs[0]?.id || 'p_0001';
}

export function evaluateRule(
  rule: Rule,
  document: DocumentIR,
  semanticLabels: SemanticLabel[]
): RuleEvaluationResult {
  const issues: RuleIssue[] = [];

  // Get relevant elements based on rule categories
  const relevantElements = getRelevantElements(rule, document, semanticLabels);

  // Evaluate based on rule type
  switch (rule.ruleId) {
    case 'objective_001':
      return evaluateObjectiveRule(rule, document, semanticLabels);
    case 'activity_001':
      return evaluateActivityRule(rule, document);
    case 'gv_action_001':
      return evaluateGVActionRule(rule, document, semanticLabels);
    case 'hs_action_001':
      return evaluateHSActionRule(rule, document, semanticLabels);
    case 'material_001':
      return evaluateMaterialRule(rule, document, semanticLabels);
    case 'assessment_001':
      return evaluateAssessmentRule(rule, document, semanticLabels);
    case 'time_001':
      return evaluateTimeRule(rule, document);
    default:
      // Generic evaluation
      return {
        ruleId: rule.ruleId,
        pass: true,
        score: 100,
        maxScore: 100,
        issues: [],
        details: 'Rule evaluated successfully',
      };
  }
}

function getRelevantElements(
  rule: Rule,
  document: DocumentIR,
  semanticLabels: SemanticLabel[]
): { paragraphs: DocumentIR['paragraphs']; tables: DocumentIR['tables'] } {
  const relevantLabels = rule.categories || [];

  const relevantParagraphs = document.paragraphs.filter((p) => {
    const label = semanticLabels.find(
      (l) => l.targetId === p.id && l.targetType === 'paragraph'
    );
    return label && relevantLabels.some((cat) => cat.includes(label.label));
  });

  return {
    paragraphs: relevantParagraphs,
    tables: document.tables,
  };
}

function evaluateObjectiveRule(
  rule: Rule,
  document: DocumentIR,
  semanticLabels: SemanticLabel[]
): RuleEvaluationResult {
  const issues: RuleIssue[] = [];

  // Find objective paragraphs using semantic labels OR keyword matching
  const objectiveParagraphs = document.paragraphs.filter((p) => {
    const label = semanticLabels.find(
      (l) => l.targetId === p.id && l.targetType === 'paragraph'
    );
    const isSemanticMatch = label?.label === 'OBJECTIVE' || label?.label === 'LEARNING_OUTCOME';
    const isKeywordMatch = /mục tiêu|yêu cầu cần đạt/i.test(p.text);
    return isSemanticMatch || (p.page === 1 && isKeywordMatch);
  });

  if (objectiveParagraphs.length === 0) {
    // No objective found (objectives genuinely belong on Page 1)
    const firstParagraph = document.paragraphs[0];
    if (firstParagraph) {
      issues.push({
        targetId: firstParagraph.id,
        targetType: 'paragraph',
        severity: 'ERROR',
        type: 'MISSING_REQUIREMENT',
        message: 'Không tìm thấy mục tiêu bài học / Yêu cầu cần đạt',
        suggestion: 'Bổ sung phần mục tiêu bài học với đầy đủ 3 mặt: kiến thức, năng lực (chung & đặc thù), phẩm chất (theo CV 5512 / CV 2345)',
      });
    }

    return {
      ruleId: rule.ruleId,
      pass: false,
      score: 0,
      maxScore: 15,
      issues,
      details: 'Không tìm thấy mục tiêu bài học',
    };
  }

  // Check each objective for completeness
  let score = 10; // Base score
  const combinedObjText = objectiveParagraphs.map((p) => p.text).join(' ');
  const hasKnowledge = /kiến thức|công thức|nắm được|hiểu|biết được|yêu cầu cần đạt/i.test(combinedObjText);
  const hasSkill = /kỹ năng|năng lực|thực hiện|biết cách|giải quyết vấn đề/i.test(combinedObjText);
  const hasAttitude = /thái độ|ý thức|tích cực|phẩm chất|chăm chỉ|trung thực|trách nhiệm/i.test(combinedObjText);

  const knowledgeTargetId = objectiveParagraphs[0]?.id || '';
  const skillTargetId =
    objectiveParagraphs.find((p) => /năng lực|kỹ năng/i.test(p.text))?.id ||
    objectiveParagraphs[Math.min(1, objectiveParagraphs.length - 1)]?.id ||
    knowledgeTargetId;
  const attitudeTargetId =
    objectiveParagraphs.find((p) => /phẩm chất|thái độ/i.test(p.text))?.id ||
    objectiveParagraphs[Math.min(2, objectiveParagraphs.length - 1)]?.id ||
    knowledgeTargetId;

  if (!hasKnowledge) {
    issues.push({
      targetId: knowledgeTargetId,
      targetType: 'paragraph',
      severity: 'WARNING',
      type: 'INCOMPLETE',
      message: '[LỖI MỤC TIÊU] Mục tiêu bài dạy chưa lượng hóa rõ kiến thức & năng lực đặc thù',
      errorDetail:
        'Sai lầm sư phạm: Dùng các từ ngữ định tính chung chung ("nắm được", "hiểu bài") thay vì động từ hành vi cụ thể, khiến giáo viên không thể đo lường và đánh giá chính xác mức độ đạt được của học sinh sau bài dạy.',
      suggestion: 'Soạn lại theo chuẩn: Nêu rõ yêu cầu cần đạt bằng động từ hành vi đo lường được (Ví dụ: "Học sinh thực hiện được phép tính...", "Giải quyết được bài toán thực tế...").',
      suggestionExample:
        '1. Về kiến thức & năng lực đặc thù:\n- Nhận biết và phát biểu được định nghĩa...\n- Thực hiện thành thạo các bước giải bài tập...',
    });
    score -= 5;
  }

  if (!hasSkill) {
    issues.push({
      targetId: skillTargetId,
      targetType: 'paragraph',
      severity: 'WARNING',
      type: 'INCOMPLETE',
      message: '[LỖI CHỈ BÁO NĂNG LỰC] Mục tiêu bài dạy thiếu chỉ báo năng lực chung và năng lực đặc thù',
      errorDetail:
        'Sai lầm sư phạm: Bỏ qua mục tiêu hình thành các năng lực cốt lõi (tự chủ, giao tiếp, hợp tác nhóm), dẫn đến tiết dạy thiên về truyền thụ kiến thức thụ động thay vì phát triển phẩm chất năng lực theo Chương trình GDPT 2018.',
      suggestion: 'Bổ sung mục Năng lực: 1. Năng lực đặc thù môn học; 2. Năng lực chung (tự chủ và tự học, giao tiếp và hợp tác).',
      suggestionExample:
        '2. Về năng lực:\n- Năng lực tự chủ và tự học: Chủ động đọc SGK và hoàn thành phiếu học tập cá nhân.\n- Năng lực giao tiếp và hợp tác: Tích cực thảo luận nhóm và tự tin báo cáo kết quả.',
    });
    score -= 3;
  }

  if (!hasAttitude) {
    issues.push({
      targetId: attitudeTargetId,
      targetType: 'paragraph',
      severity: 'INFO',
      type: 'SUGGESTION',
      message: '[THIẾU CHỈ TIÊU PHẨM CHẤT] Kế hoạch bài dạy chưa nêu rõ phẩm chất chủ yếu cần bồi dưỡng',
      errorDetail:
        'Sai lầm sư phạm: Không lồng ghép mục tiêu giáo dục phẩm chất gắn liền với nội dung bài học, làm giảm tính giáo dục toàn diện của tiết dạy.',
      suggestion: 'Bổ sung mục Phẩm chất theo Chương trình GDPT 2018: Rèn luyện tính chăm chỉ, cẩn thận, trung thực và tinh thần trách nhiệm trong học tập và làm việc nhóm.',
      suggestionExample:
        '3. Về phẩm chất:\n- Chăm chỉ: Tích cực suy nghĩ và hoàn thành các bài tập.\n- Cẩn thận, trung thực: Tính toán chính xác và tôn trọng kết quả thực nghiệm.',
    });
    score -= 2;
  }

  return {
    ruleId: rule.ruleId,
    pass: score >= 10,
    score: Math.max(0, score),
    maxScore: 15,
    issues,
    details: score >= 10 ? 'Mục tiêu đạt yêu cầu' : 'Mục tiêu cần hoàn thiện',
  };
}

function evaluateActivityRule(
  rule: Rule,
  document: DocumentIR
): RuleEvaluationResult {
  const issues: RuleIssue[] = [];
  const paragraphs = document.paragraphs || [];

  // Holistic scan across all pages: check if activities exist anywhere in the document
  const hasParsedActivities = document.activities && document.activities.length > 0;
  const textHasActivities = paragraphs.some((p) =>
    /hoạt động\s*\d+|hđ\s*\d+|khởi động|khám phá|hình thành kiến thức|luyện tập|thực hành|vận dụng|mở đầu/i.test(p.text)
  );
  const textHasTeacherOrStudentSteps = paragraphs.some((p) =>
    /bước 1|bước 2|bước 3|bước 4|chuyển giao nhiệm vụ|thực hiện nhiệm vụ|báo cáo|thảo luận|kết luận|nhận định/i.test(p.text)
  );

  // If there are truly no activities in the entire lesson plan
  if (!hasParsedActivities && !textHasActivities && !textHasTeacherOrStudentSteps) {
    return {
      ruleId: rule.ruleId,
      pass: false,
      score: 0,
      maxScore: 35,
      issues: [
        {
          targetId: findActivityProcessAnchor(document),
          targetType: 'paragraph',
          severity: 'ERROR',
          type: 'MISSING_REQUIREMENT',
          message: '[LỖI CẤU TRÚC BÀI DẠY] Không tìm thấy chuỗi hoạt động dạy học',
          suggestion: 'Thiết kế chuỗi 4 hoạt động chuẩn: 1. Khởi động / Mở đầu; 2. Hình thành kiến thức mới / Khám phá; 3. Luyện tập / Thực hành; 4. Vận dụng.',
        },
      ],
      details: 'Không có hoạt động dạy học',
    };
  }

  let score = 25; // Base score for having activities

  const allText = paragraphs.map((p) => p.text).join(' ');
  const parsedTypes = new Set((document.activities || []).map((a) => a.type));

  const hasKhoiDong =
    parsedTypes.has('khoi_dong') ||
    /khởi động|mở đầu|tạo tâm thế|tình huống xuất phát/i.test(allText);
  const hasKhamPha =
    parsedTypes.has('hinh_thanh_kien_thuc') ||
    /khám phá|hình thành kiến thức|kiến thức mới|trải nghiệm/i.test(allText);
  const hasLuyenTap =
    parsedTypes.has('luyen_tap') ||
    /luyện tập|thực hành|bài tập 1|bài 1|bài tập/i.test(allText);
  const hasVanDung =
    parsedTypes.has('van_dung') ||
    parsedTypes.has('mo_rong') ||
    /vận dụng|mở rộng|trải nghiệm thực tế|về nhà/i.test(allText);

  // Safe anchors on the ACTUAL activity pages (Page 2+ or last page, never Page 1!)
  const startAnchor = findActivityProcessAnchor(document);
  const endAnchor = findLastActivityAnchor(document);

  if (!hasKhoiDong) {
    issues.push({
      targetId: startAnchor,
      targetType: 'paragraph',
      severity: 'WARNING',
      type: 'MISSING_REQUIREMENT',
      message: '[THIẾU HOẠT ĐỘNG KHỞI ĐỘNG] Tiết dạy chưa có hoạt động mở đầu kết nối tâm thế cho học sinh',
      errorDetail:
        'Sai lầm sư phạm: Bài dạy đi thẳng vào phần lý thuyết hoặc bài tập mà thiếu hoạt động khởi động, khiến học sinh chưa sẵn sàng về mặt tâm lý và thiếu sự kết nối liên hệ giữa kiến thức đã học với bài mới.',
      suggestion: 'Bổ sung Hoạt động 1 (Khởi động: 5-7 phút): Tổ chức trò chơi ngắn hoặc đặt câu hỏi tình huống thực tế để tạo tâm thế hứng thú và kết nối kiến thức cũ với bài mới.',
      suggestionExample:
        'Hoạt động 1: Khởi động (5 phút)\na) Mục tiêu: Tạo tâm thế hào hứng và gợi mở kiến thức.\nb) Tổ chức thực hiện: GV cho xem video ngắn 2 phút hoặc chơi trò chơi "Nhanh như chớp".',
    });
    score -= 4;
  }

  if (!hasKhamPha) {
    issues.push({
      targetId: startAnchor,
      targetType: 'paragraph',
      severity: 'WARNING',
      type: 'MISSING_REQUIREMENT',
      message: '[THIẾU HOẠT ĐỘNG KHÁM PHÁ] Chưa có hoạt động hình thành kiến thức mới',
      errorDetail:
        'Sai lầm sư phạm: Giáo viên áp đặt sẵn công thức/kết luận mà không xây dựng chuỗi thao tác khám phá từ trực quan sinh động đến tư duy trừu tượng.',
      suggestion: 'Bổ sung Hoạt động 2 (Hình thành kiến thức mới): Xây dựng tiến trình khám phá từ trực quan sinh động đến tư duy trừu tượng.',
      suggestionExample:
        'Hoạt động 2: Hình thành kiến thức mới (15 phút)\na) Mục tiêu: HS tự mình phát hiện ra quy tắc/công thức...\nb) Sản phẩm: Bảng kết quả ghi trên phiếu học tập nhóm.',
    });
    score -= 5;
  }

  if (!hasLuyenTap) {
    issues.push({
      targetId: endAnchor,
      targetType: 'paragraph',
      severity: 'WARNING',
      type: 'MISSING_REQUIREMENT',
      message: '[THIẾU HOẠT ĐỘNG LUYỆN TẬP / THỰC HÀNH] Học sinh chưa được thực hành củng cố kiến thức',
      errorDetail:
        'Sai lầm sư phạm: Tiết học kết thúc khi học sinh mới chỉ hiểu lý thuyết mà chưa được rèn luyện kỹ năng qua hệ thống bài tập phân hóa.',
      suggestion: 'Bổ sung Hoạt động 3 (Luyện tập): Thiết kế hệ thống bài tập phân hóa từ cơ bản đến nâng cao.',
      suggestionExample:
        'Hoạt động 3: Luyện tập (12 phút): Làm bài tập 1, 2 trong SGK để củng cố kỹ năng.',
    });
    score -= 4;
  }

  if (!hasVanDung) {
    issues.push({
      targetId: endAnchor,
      targetType: 'paragraph',
      severity: 'INFO',
      type: 'SUGGESTION',
      message: '[GỢI Ý HOẠT ĐỘNG VẬN DỤNG] Nên bổ sung hoạt động vận dụng vào thực tiễn đời sống',
      errorDetail:
        'Hoạt động vận dụng giúp học sinh liên hệ kiến thức bài học với các tình huống thực tế xung quanh.',
      suggestion: 'Bổ sung Hoạt động 4 (Vận dụng): Giao nhiệm vụ thực tế hoặc bài tập trải nghiệm ở nhà.',
      suggestionExample:
        'Hoạt động 4: Vận dụng (5 phút): Em hãy quan sát xung quanh nhà và ghi lại 2 ví dụ áp dụng kiến thức vừa học.',
    });
    score -= 2;
  }

  return {
    ruleId: rule.ruleId,
    pass: score >= 20,
    score: Math.max(0, score),
    maxScore: 35,
    issues,
    details: score >= 20 ? 'Cấu trúc hoạt động đạt yêu cầu' : 'Cần hoàn thiện chuỗi hoạt động',
  };
}

function evaluateHSActionRule(
  rule: Rule,
  document: DocumentIR,
  semanticLabels: SemanticLabel[]
): RuleEvaluationResult {
  const issues: RuleIssue[] = [];

  // Find student action paragraphs from semantic labels OR keyword matching
  const studentActionParagraphs = document.paragraphs.filter((p) => {
    const label = semanticLabels.find(
      (l) => l.targetId === p.id && l.targetType === 'paragraph'
    );
    const hasLabel = label?.label === 'STUDENT_ACTION';
    const hasKeyword = /học sinh:|hs:|làm việc nhóm|thảo luận nhóm|trả lời câu hỏi|thực hành làm bài|báo cáo kết quả/i.test(p.text);
    return hasLabel || hasKeyword;
  });

  const anchorId = studentActionParagraphs[0]?.id || findActivityProcessAnchor(document);

  if (studentActionParagraphs.length === 0) {
    issues.push({
      targetId: anchorId,
      targetType: 'paragraph',
      severity: 'WARNING',
      type: 'MISSING_REQUIREMENT',
      message: 'Không tìm thấy nội dung về hoạt động của học sinh trong tiến trình dạy học',
      errorDetail: 'Sai lầm sư phạm: Giáo án chỉ ghi hoạt động của giáo viên mà không có mục mô tả hoạt động của học sinh.',
      suggestion: 'Bổ sung phần mô tả hoạt động của HS trong giáo án theo 4 bước chuẩn.',
      suggestionExample: 'Học sinh tiếp nhận nhiệm vụ, thảo luận nhóm 4, trình bày kết quả và lắng nghe nhận xét.',
    });

    return {
      ruleId: rule.ruleId,
      pass: false,
      score: 0,
      maxScore: 15,
      issues,
      details: 'Không có hoạt động của HS',
    };
  }

  const combinedText = studentActionParagraphs.map((p) => p.text).join(' ');
  let score = 10;

  const hasGroupWork = /nhóm|chia nhóm|hợp tác|cặp đôi/i.test(combinedText);
  const hasPractice = /thực hành|làm bài|trả lời|giải|bài tập|sản phẩm/i.test(combinedText);

  if (!hasGroupWork) {
    issues.push({
      targetId: studentActionParagraphs[0].id,
      targetType: 'paragraph',
      severity: 'INFO',
      type: 'SUGGESTION',
      message: '[HỌC SINH THỤ ĐỘNG] Thiếu hoạt động thảo luận nhóm và tương tác học tập tích cực',
      errorDetail:
        'Sai lầm sư phạm: Học sinh chỉ làm việc độc lập hoặc nghe thụ động từ giáo viên, thiếu cơ hội giao tiếp, tranh luận và hỗ trợ lẫn nhau trong quá trình giải quyết vấn đề.',
      suggestion: 'Bổ sung hoạt động làm việc nhóm (cặp đôi hoặc nhóm 4): Học sinh cùng trao đổi, phân công nhiệm vụ, thảo luận cách giải và tự tin trình bày kết quả.',
      suggestionExample:
        'HS thảo luận nhóm 4 trong 5 phút: Nhóm trưởng điều hành, thư ký ghi chép phương án giải quyết vào bảng phụ, các thành viên phản biện và thống nhất kết quả.',
    });
    score -= 3;
  }

  if (!hasPractice) {
    issues.push({
      targetId: studentActionParagraphs[Math.min(1, studentActionParagraphs.length - 1)].id,
      targetType: 'paragraph',
      severity: 'INFO',
      type: 'SUGGESTION',
      message: '[THIẾU SẢN PHẨM HỌC TẬP] Hoạt động của học sinh chưa xác định rõ sản phẩm cụ thể cần hoàn thành',
      errorDetail:
        'Sai lầm sư phạm: Không quy định rõ sản phẩm đầu ra (phiếu bài tập, câu trả lời, sơ đồ tư duy) khiến hoạt động học tập của học sinh thiếu mục tiêu rõ ràng và giáo viên không có căn cứ đánh giá.',
      suggestion: 'Quy định rõ sản phẩm học sinh phải hoàn thành: "Học sinh hoàn thành phiếu học tập cá nhân, viết lời giải vào vở hoặc đính kết quả lên bảng nhóm".',
      suggestionExample:
        'Sản phẩm học tập: Phiếu học tập số 1 có chữ ký duyệt của nhóm trưởng hoặc bài giải toán hoàn chỉnh được viết vào vở thực hành.',
    });
    score -= 2;
  }

  return {
    ruleId: rule.ruleId,
    pass: score >= 8,
    score: Math.max(0, score),
    maxScore: 15,
    issues,
    details: score >= 8 ? 'Hoạt động HS đạt yêu cầu' : 'Cần bổ sung hoạt động cho HS',
  };
}

function evaluateGVActionRule(
  rule: Rule,
  document: DocumentIR,
  semanticLabels: SemanticLabel[]
): RuleEvaluationResult {
  const issues: RuleIssue[] = [];
  const gvParagraphs = document.paragraphs.filter((p) => {
    const label = semanticLabels.find(
      (l) => l.targetId === p.id && l.targetType === 'paragraph'
    );
    const hasLabel = label?.label === 'TEACHER_ACTION';
    const hasKeyword = /giáo viên:|gv:|thầy:|cô:|hướng dẫn|giao nhiệm vụ|yêu cầu học sinh|quan sát|chốt kiến thức|kết luận/i.test(p.text);
    return hasLabel || hasKeyword;
  });

  const targetId = gvParagraphs[0]?.id || findActivityProcessAnchor(document);
  const combinedText = gvParagraphs.map((p) => p.text).join(' ');

  let score = 12;
  const hasTaskAssignment = /giao nhiệm vụ|hướng dẫn|yêu cầu|cho học sinh/i.test(combinedText);
  const hasObservation = /quan sát|theo dõi|hỗ trợ|giúp đỡ/i.test(combinedText);
  const hasConclusion = /chuẩn hóa|kết luận|nhận xét|chốt kiến thức|tổng kết/i.test(combinedText);

  const targetId1 = gvParagraphs[0]?.id || targetId;
  const targetId2 = gvParagraphs[Math.min(1, gvParagraphs.length - 1)]?.id || targetId;
  const targetId4 = gvParagraphs[Math.min(2, gvParagraphs.length - 1)]?.id || targetId;

  if (!hasTaskAssignment) {
    issues.push({
      targetId: targetId1,
      targetType: 'paragraph',
      severity: 'WARNING',
      type: 'INCOMPLETE',
      message: '[LỖI 4 BƯỚC TỔ CHỨC] Giáo viên chưa thể hiện rõ Bước 1: Chuyển giao nhiệm vụ học tập',
      errorDetail:
        'Sai lầm sư phạm: Giao nhiệm vụ mập mờ, thiếu tiêu chí thời gian và hình thức làm việc, khiến học sinh bối rối, không biết cần làm gì và nộp sản phẩm ở đâu.',
      suggestion: 'Soạn cụ thể Bước 1: "GV nêu rõ yêu cầu nhiệm vụ, hình thức làm việc (cá nhân/nhóm), thời gian hoàn thành (5 phút) và tiêu chí sản phẩm cần đạt".',
      suggestionExample:
        'Bước 1: Chuyển giao nhiệm vụ\n- GV chiếu phiếu học tập lên màn hình, chia lớp thành 6 nhóm.\n- Yêu cầu: Đọc thông tin mục 2, thảo luận và hoàn thành câu hỏi 1, 2 trong 5 phút.',
    });
    score -= 4;
  }

  if (!hasObservation) {
    issues.push({
      targetId: targetId2,
      targetType: 'paragraph',
      severity: 'INFO',
      type: 'SUGGESTION',
      message: '[THIẾU BƯỚC QUAN SÁT/HỖ TRỢ] Chưa thể hiện vai trò theo dõi, trợ giúp học sinh khi làm bài',
      errorDetail:
        'Sai lầm sư phạm: Giáo viên đứng trên bục giảng mà không đi quan sát, không phát hiện kịp thời các khó khăn hoặc hiểu lầm của học sinh trong khi thực hiện nhiệm vụ.',
      suggestion: 'Mô tả cụ thể Bước 2: "GV đi quanh lớp quan sát tiến độ, kịp thời gợi ý và hướng dẫn các nhóm/học sinh còn lúng túng".',
      suggestionExample:
        'Bước 2: Thực hiện nhiệm vụ\n- HS làm việc theo nhóm.\n- GV luân phiên đến các bàn quan sát, đặt câu hỏi gợi mở cho các nhóm gặp vướng mắc.',
    });
    score -= 3;
  }

  if (!hasConclusion) {
    issues.push({
      targetId: targetId4,
      targetType: 'paragraph',
      severity: 'WARNING',
      type: 'INCOMPLETE',
      message: '[LỖI 4 BƯỚC TỔ CHỨC] Thiếu Bước 4: Đánh giá, kết luận và chuẩn hóa kiến thức',
      errorDetail:
        'Sai lầm sư phạm: Bỏ qua bước chốt kiến thức trọng tâm, khiến học sinh không đọng lại được kiến thức chuẩn xác sau khi thảo luận hoặc báo cáo.',
      suggestion: 'Bổ sung Bước 4: "GV tổng hợp nhận xét của học sinh, phân tích lỗi sai phổ biến và chốt lại kiến thức/quy tắc trọng tâm của bài học vào bảng".',
      suggestionExample:
        'Bước 4: Kết luận, nhận định\n- GV nhận xét tinh thần thảo luận của các nhóm.\n- Chuẩn hóa kiến thức: Chiếu slide đáp án chuẩn và yêu cầu HS ghi nhớ nội dung cốt lõi vào vở.',
    });
    score -= 4;
  }

  return {
    ruleId: rule.ruleId,
    pass: score >= 10,
    score: Math.max(0, score),
    maxScore: 15,
    issues,
    details: score >= 10 ? 'Hoạt động giáo viên đạt yêu cầu' : 'Cần hoàn thiện tiến trình hướng dẫn của giáo viên',
  };
}

function evaluateMaterialRule(
  rule: Rule,
  document: DocumentIR,
  semanticLabels: SemanticLabel[]
): RuleEvaluationResult {
  const issues: RuleIssue[] = [];
  const materialParagraphs = document.paragraphs.filter((p) => {
    const label = semanticLabels.find(
      (l) => l.targetId === p.id && l.targetType === 'paragraph'
    );
    return (
      label?.label === 'TEACHING_MATERIAL' ||
      /đồ dùng|thiết bị|học liệu|chuẩn bị/i.test(p.text) ||
      /(?:giáo viên|gv):.*(?:máy chiếu|sgk|phiếu|tranh|bảng|tivi|thẻ từ|dụng cụ|học liệu)/i.test(p.text) ||
      /(?:học sinh|hs):.*(?:sgk|vở|bút|thước|bảng con|dụng cụ)/i.test(p.text)
    );
  });

  const targetId = materialParagraphs[0]?.id || findMaterialAnchor(document);
  const combinedText = materialParagraphs.map((p) => p.text).join(' ');

  let score = 9;
  const hasDigital = /máy chiếu|tivi|video|hình ảnh|slide|powerpoint|cntt|phần mềm|máy tính|bài giảng điện tử|video clip/i.test(combinedText);
  const hasHandout = /phiếu học tập|bảng phụ|thẻ từ|dụng cụ|sgk|vật thật|vở bài tập|bảng con|tranh ảnh|học liệu|thước/i.test(combinedText);

  if (materialParagraphs.length === 0) {
    issues.push({
      targetId,
      targetType: 'paragraph',
      severity: 'WARNING',
      type: 'MISSING_REQUIREMENT',
      message: '[THIẾU ĐỒ DÙNG DẠY HỌC] Kế hoạch bài dạy chưa thể hiện rõ mục Thiết bị dạy học và học liệu',
      errorDetail:
        'Theo quy định công văn sư phạm, kế hoạch bài dạy cần xác định rõ đồ dùng, thiết bị phục vụ giảng dạy của giáo viên và phương tiện học tập của học sinh.',
      suggestion: 'Bổ sung mục "II. Thiết bị dạy học và học liệu" (hoặc "II. Đồ dùng dạy học"): Phân rõ 1. Giáo viên (máy tính, máy chiếu, phiếu học tập...); 2. Học sinh (SGK, vở bài tập, đồ dùng học tập...).',
      suggestionExample:
        'II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU:\n1. Giáo viên: Giáo án, bài giảng điện tử, máy chiếu, phiếu học tập.\n2. Học sinh: SGK, vở bài tập, thước kẻ, bút viết.',
    });
    score = 4;
  } else if (!hasDigital && !hasHandout) {
    issues.push({
      targetId,
      targetType: 'paragraph',
      severity: 'INFO',
      type: 'SUGGESTION',
      message: '[HỌC LIỆU CHƯA CỤ THỂ] Thiết bị và đồ dùng dạy học chưa gắn với từng hoạt động thực tế',
      errorDetail:
        'Sai lầm sư phạm: Liệt kê đồ dùng sơ sài ("SGK, vở ghi"), không có đồ dùng trực quan hoặc học liệu số để kích thích hứng thú học tập của học sinh.',
      suggestion: 'Phân loại chi tiết: 1. Đồ dùng của GV (Máy chiếu/Tivi, slide bài giảng điện tử, phiếu học tập A0); 2. Đồ dùng của HS (Vở bài tập, bộ đồ dùng học tập, bảng nhóm).',
      suggestionExample:
        '1. Giáo viên: Giáo án điện tử, máy tính, máy chiếu, 6 phiếu học tập A0, bộ thẻ số.\n2. Học sinh: SGK, vở bài tập, thước kẻ, bút dạ viết bảng nhóm.',
    });
    score -= 3;
  } else {
    // Both or either digital/handout present
    score = 10;
  }

  return {
    ruleId: rule.ruleId,
    pass: score >= 7,
    score: Math.max(0, score),
    maxScore: 10,
    issues,
    details: 'Thiết bị và học liệu dạy học',
  };
}

function evaluateAssessmentRule(
  rule: Rule,
  document: DocumentIR,
  semanticLabels: SemanticLabel[]
): RuleEvaluationResult {
  const issues: RuleIssue[] = [];
  const assessmentParagraphs = document.paragraphs.filter((p) => {
    const label = semanticLabels.find(
      (l) => l.targetId === p.id && l.targetType === 'paragraph'
    );
    return label?.label === 'ASSESSMENT' || /đánh giá|kiểm tra|tiêu chí|rubric|bảng kiểm|nhận xét/i.test(p.text);
  });

  const targetId = assessmentParagraphs[0]?.id || findLastActivityAnchor(document);
  const combinedText = assessmentParagraphs.map((p) => p.text).join(' ');

  let score = 7;
  const hasCriteria = /tiêu chí|rubric|bảng kiểm|yêu cầu sản phẩm/i.test(combinedText);
  const hasPeerAssessment = /đồng đẳng|tự đánh giá|nhận xét lẫn nhau|chéo/i.test(combinedText);

  if (!hasCriteria) {
    issues.push({
      targetId,
      targetType: 'paragraph',
      severity: 'INFO',
      type: 'SUGGESTION',
      message: '[THIẾU TIÊU CHÍ ĐÁNH GIÁ] Chưa có bảng tiêu chí hoặc Rubric đánh giá kết quả học tập',
      errorDetail:
        'Sai lầm sư phạm: Thiếu tiêu chí đánh giá rõ ràng dẫn đến việc đánh giá học sinh mang tính cảm tính, học sinh không tự soi chiếu được mức độ hoàn thành nhiệm vụ của mình.',
      suggestion: 'Bổ sung tiêu chí đánh giá sản phẩm học tập theo chuẩn: Tiêu chí nội dung (đúng/sai), hình thức trình bày và sự hợp tác nhóm.',
      suggestionExample:
        'Bảng kiểm đánh giá sản phẩm nhóm (Rubric):\n- Mức 1 (Đạt): Thực hiện đúng 70% yêu cầu phiếu học tập.\n- Mức 2 (Tốt): Hoàn thành 100% đúng hạn, trình bày lưu loát và tự tin trước lớp.',
    });
    score -= 2;
  }

  if (!hasPeerAssessment) {
    issues.push({
      targetId,
      targetType: 'paragraph',
      severity: 'INFO',
      type: 'SUGGESTION',
      message: '[THIẾU ĐÁNH GIÁ ĐỒNG ĐẲNG] Chưa tổ chức cho học sinh tự đánh giá và đánh giá lẫn nhau',
      errorDetail:
        'Sai lầm sư phạm: Chỉ có giáo viên nhận xét một chiều mà thiếu cơ hội để học sinh rèn luyện kỹ năng phản biện, lắng nghe và tự đánh giá sự tiến bộ của bản thân.',
      suggestion: 'Bổ sung hoạt động đánh giá chéo giữa các nhóm hoặc đánh giá đồng đẳng (Peer assessment).',
      suggestionExample:
        'Tổ chức đánh giá đồng đẳng: Sau khi Nhóm 1 báo cáo, Nhóm 2 và Nhóm 3 giơ thẻ màu nhận xét và đặt 1 câu hỏi phản biện.',
    });
    score -= 1;
  }

  const hasIntonationCriteria = /ngữ điệu|phát âm|dấu thanh|diễn cảm|ngắt nghỉ|chính tả/i.test(combinedText);
  if (!hasIntonationCriteria) {
    issues.push({
      targetId,
      targetType: 'paragraph',
      severity: 'INFO',
      type: 'SUGGESTION',
      message: '[TIÊU CHÍ NGỮ ĐIỆU & TIẾNG VIỆT] Cần bổ sung tiêu chí đánh giá ngữ điệu, phát âm và chuẩn mực Tiếng Việt',
      errorDetail:
        'Sai lầm sư phạm: Thiếu tiêu chí đánh giá về phát âm, thanh điệu và ngữ điệu đọc/nói khiến học sinh chưa được uốn nắn kỹ năng diễn đạt và cảm thụ tiếng Việt theo chuẩn GDPT 2018.',
      suggestion: 'Bổ sung tiêu chí đánh giá ngữ điệu: Đọc đúng âm/vần/dấu thanh, ngắt nghỉ hơi đúng dấu câu, ngữ điệu tự nhiên và truyền cảm.',
      suggestionExample:
        'Tiêu chí đánh giá nói & đọc:\n- Đọc đúng dấu câu và ngắt nghỉ hơi hợp lý (2đ)\n- Thể hiện đúng ngữ điệu câu hỏi, câu kể, câu cảm thán (2đ)\n- Phát âm chuẩn xác, không lẫn dấu thanh tiếng Việt (1đ)',
    });
  }

  return {
    ruleId: rule.ruleId,
    pass: score >= 6,
    score: Math.max(0, score),
    maxScore: 10,
    issues,
    details: 'Kiểm tra và đánh giá học sinh',
  };
}

function evaluateTimeRule(
  rule: Rule,
  document: DocumentIR
): RuleEvaluationResult {
  const issues: RuleIssue[] = [];
  const timeParagraphs = document.paragraphs.filter((p) => /\d+\s*phút/i.test(p.text));
  const targetId = timeParagraphs[0]?.id || findActivityProcessAnchor(document);

  let score = 8;
  if (timeParagraphs.length === 0) {
    issues.push({
      targetId,
      targetType: 'paragraph',
      severity: 'INFO',
      type: 'SUGGESTION',
      message: 'Nên ghi rõ thời lượng dự kiến cho từng hoạt động dạy học',
      suggestion: 'Phân bổ cụ thể thời gian: Khởi động (khoảng 5 phút), Khám phá kiến thức (15-18 phút), Luyện tập (10-12 phút), Vận dụng (5-7 phút) để đảm bảo tiến độ bài dạy.',
    });
    score -= 3;
  }

  return {
    ruleId: rule.ruleId,
    pass: score >= 6,
    score: Math.max(0, score),
    maxScore: 10,
    issues,
    details: 'Phân bổ thời gian bài dạy',
  };
}

export function evaluateAllRules(
  document: DocumentIR,
  semanticLabels: SemanticLabel[],
  rules: Rule[]
): RuleEvaluationResult[] {
  return rules
    .filter((r) => r.enabled)
    .map((rule) => evaluateRule(rule, document, semanticLabels));
}
