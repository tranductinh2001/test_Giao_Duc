// Stage 1: Lesson Plan Section Detector & Segmenter
// Analyzes DocumentIR (paragraphs, sections, activities, tables) to detect, classify and group paragraphs by section
// Supports full multi-page holistic segmentation for CV 5512 (THCS/THPT) and CV 2345 (Tiểu học)

import { DocumentIR, Paragraph, Activity } from '@/types/document';
import {
  DetectedSection,
  LessonPlanSectionKey,
  SectionCriteriaConfig,
} from '@/types/section-config';

interface SectionBoundaryMarker {
  key: LessonPlanSectionKey;
  title: string;
  matchedTitle: string;
  paragraphIndex: number;
  paragraphId: string;
  page: number;
  confidence: number;
}

interface PatternRule {
  key: LessonPlanSectionKey;
  defaultTitle: string;
  patterns: RegExp[];
  keywordBonus: RegExp;
}

const SECTION_DETECTION_PATTERNS: PatternRule[] = [
  {
    key: 'muc_tieu',
    defaultTitle: 'I. Mục tiêu bài dạy (Yêu cầu cần đạt)',
    patterns: [
      /^(?:I\.|1\.|A\.)\s*(?:MỤC TIÊU|YÊU CẦU CẦN ĐẠT|MỤC ĐÍCH)/i,
      /^MỤC TIÊU\s*(?:BÀI HỌC|BÀI DẠY|CỦA BÀI)?[:\.\s]/i,
      /^YÊU CẦU CẦN ĐẠT[:\.\s]/i,
      /^1\.\s*YÊU CẦU CẦN ĐẠT/i,
      /^I\.\s*MỤC TIÊU/i,
    ],
    keywordBonus: /kiến thức|năng lực|phẩm chất|yêu cầu cần đạt|năng lực đặc thù|năng lực chung/i,
  },
  {
    key: 'thiet_bi',
    defaultTitle: 'II. Thiết bị dạy học và học liệu (Đồ dùng dạy học)',
    patterns: [
      /^(?:II\.|2\.|B\.|II\/|II\s*[-–—:]|PHẦN\s*II\.?)\s*(?:THIẾT BỊ|ĐỒ DÙNG|CHUẨN BỊ|HỌC LIỆU|PHƯƠNG TIỆN)/i,
      /^(?:II\.|2\.|B\.)?\s*ĐỒ DÙNG DẠY(?:\s*VÀ)?\s*HỌC/i,
      /^(?:II\.|2\.|B\.)?\s*THIẾT BỊ DẠY HỌC(?:\s*VÀ\s*HỌC LIỆU)?/i,
      /^(?:II\.|2\.|B\.)?\s*THIẾT BỊ VÀ HỌC LIỆU/i,
      /^(?:II\.|2\.|B\.)?\s*CHUẨN BỊ\s*(?:THIẾT BỊ|ĐỒ DÙNG|CỦA GV|DẠY HỌC|HỌC LIỆU)?/i,
      /^THIẾT BỊ DẠY HỌC/i,
      /^ĐỒ DÙNG DẠY HỌC/i,
      /^CHUẨN BỊ CỦA\s*(?:GIÁO VIÊN|GV)/i,
      /^CHUẨN BỊ[:\.\s\-–—]/i,
      /^2\.\s*ĐỒ DÙNG DẠY HỌC/i,
      /^II\.\s*THIẾT BỊ DẠY HỌC/i,
    ],
    keywordBonus: /giáo viên:|học sinh:|gv:|hs:|phiếu học tập|máy chiếu|học liệu|sgk|bảng phụ|vật thật|thẻ từ|dụng cụ|tranh ảnh/i,
  },
  {
    key: 'khoi_dong',
    defaultTitle: 'Hoạt động 1: Mở đầu / Khởi động',
    patterns: [
      /^(?:(?:1\.|A\.|I\.)\s*)?(?:Hoạt động|HĐ)\s*1[:\.\s]*/i,
      /^(?:(?:1\.|A\.|I\.)\s*)?(?:(?:Hoạt động|HĐ)\s*1[:\.\s]*)?(?:Mở đầu|Khởi động|Tạo tâm thế|Tình huống xuất phát|Xác định vấn đề)/i,
      /^KHỞI ĐỘNG[:\.\s]/i,
      /^MỞ ĐẦU[:\.\s]/i,
      /^1\.\s*KHỞI ĐỘNG/i,
      /^Hoạt động mở đầu[:\.\s]/i,
      /^Khởi động, kết nối[:\.\s]/i,
    ],
    keywordBonus: /khởi động|trò chơi|bài hát|tâm thế|tình huống xuất phát|kết nối|đố vui/i,
  },
  {
    key: 'kham_pha',
    defaultTitle: 'Hoạt động 2: Hình thành kiến thức mới / Khám phá',
    patterns: [
      /^(?:(?:2\.|B\.|II\.)\s*)?(?:Hoạt động|HĐ)\s*2[:\.\s]*/i,
      /^(?:(?:2\.|B\.|II\.)\s*)?(?:(?:Hoạt động|HĐ)\s*2[:\.\s]*)?(?:Hình thành kiến thức|Khám phá|Khám phá kiến thức|Tìm tòi|Trải nghiệm)/i,
      /^KHÁM PHÁ[:\.\s]/i,
      /^HÌNH THÀNH KIẾN THỨC[:\.\s]/i,
      /^2\.\s*KHÁM PHÁ/i,
      /^2\.\s*HÌNH THÀNH KIẾN THỨC/i,
      /^Trải nghiệm, khám phá[:\.\s]/i,
      /^Hoạt động hình thành kiến thức[:\.\s]/i,
    ],
    keywordBonus: /khám phá|kiến thức mới|chiếm lĩnh|quan sát tranh|thảo luận nhóm|trải nghiệm|hình thành kiến thức/i,
  },
  {
    key: 'luyen_tap',
    defaultTitle: 'Hoạt động 3: Luyện tập / Thực hành',
    patterns: [
      /^(?:(?:3\.|C\.|III\.)\s*)?(?:Hoạt động|HĐ)\s*3[:\.\s]*/i,
      /^(?:(?:3\.|C\.|III\.)\s*)?(?:(?:Hoạt động|HĐ)\s*3[:\.\s]*)?(?:Luyện tập|Thực hành|Luyện tập thực hành|Củng cố)/i,
      /^LUYỆN TẬP[:\.\s]/i,
      /^THỰC HÀNH[:\.\s]/i,
      /^3\.\s*LUYỆN TẬP/i,
      /^3\.\s*THỰC HÀNH/i,
      /^Luyện tập, thực hành[:\.\s]/i,
      /^Hoạt động luyện tập[:\.\s]/i,
    ],
    keywordBonus: /luyện tập|thực hành|bài tập|làm bài|phiếu bài tập|bài 1|bài 2|thảo luận làm bài/i,
  },
  {
    key: 'van_dung',
    defaultTitle: 'Hoạt động 4: Vận dụng / Mở rộng',
    patterns: [
      /^(?:(?:4\.|D\.|IV\.)\s*)?(?:Hoạt động|HĐ)\s*4[:\.\s]*/i,
      /^(?:(?:4\.|D\.|IV\.)\s*)?(?:(?:Hoạt động|HĐ)\s*4[:\.\s]*)?(?:Vận dụng|Mở rộng|Vận dụng trải nghiệm|Trải nghiệm thực tế)/i,
      /^VẬN DỤNG[:\.\s]/i,
      /^MỞ RỘNG[:\.\s]/i,
      /^4\.\s*VẬN DỤNG/i,
      /^4\.\s*MỞ RỘNG/i,
      /^Vận dụng, trải nghiệm[:\.\s]/i,
      /^Hoạt động vận dụng[:\.\s]/i,
      /^Vận dụng và mở rộng[:\.\s]/i,
    ],
    keywordBonus: /vận dụng|thực tế|đời sống|ở nhà|liên hệ|mở rộng|trải nghiệm|chia sẻ với người thân/i,
  },
  {
    key: 'dieu_chinh',
    defaultTitle: '4. Điều chỉnh sau bài dạy (Rút kinh nghiệm)',
    patterns: [
      /^(?:IV\.|4\.|D\.)\s*(?:ĐIỀU CHỈNH SAU BÀI DẠY|RÚT KINH NGHIỆM)/i,
      /^ĐIỀU CHỈNH SAU BÀI DẠY[:\.\s]/i,
      /^RÚT KINH NGHIỆM SAU TIẾT DẠY[:\.\s]/i,
      /^NHẬN XÉT, RÚT KINH NGHIỆM[:\.\s]/i,
    ],
    keywordBonus: /điều chỉnh sau bài dạy|rút kinh nghiệm|học sinh còn lúng túng|nội dung cần khắc phục/i,
  },
  {
    key: 'danh_gia',
    defaultTitle: 'Đánh giá & Phụ lục (Rubric / Bảng kiểm)',
    patterns: [
      /^(?:IV\.|V\.|4\.|5\.)\s*(?:ĐÁNH GIÁ|PHỤ LỤC|RUBRIC)/i,
      /^HỒ SƠ DẠY HỌC|BẢNG KIỂM|RUBRIC/i,
      /^PHỤ LỤC[:\.\s]/i,
    ],
    keywordBonus: /rubric|bảng kiểm|thang đo|tiêu chí đánh giá|phiếu nhận xét/i,
  },
];

// Major Process Headers (Tiến trình dạy học / Các hoạt động dạy học chủ yếu)
const MAIN_PROCESS_PATTERNS = [
  /^(?:III\.|3\.|C\.)\s*(?:TIẾN TRÌNH DẠY HỌC|CÁC HOẠT ĐỘNG DẠY HỌC|HOẠT ĐỘNG DẠY HỌC)/i,
  /^TIẾN TRÌNH DẠY HỌC[:\.\s]/i,
  /^TIẾN TRÌNH BÀI DẠY[:\.\s]/i,
  /^CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU[:\.\s]/i,
  /^3\.\s*CÁC HOẠT ĐỘNG DẠY HỌC CHỦ YẾU/i,
  /^TỔ CHỨC CÁC HOẠT ĐỘNG DẠY HỌC[:\.\s]/i,
];

export function detectLessonPlanSections(
  document: DocumentIR,
  configuredSections?: SectionCriteriaConfig[]
): DetectedSection[] {
  const paragraphs = document.paragraphs || [];
  const activities = document.activities || [];
  const markers: SectionBoundaryMarker[] = [];

  let mainProcessMarker: {
    paragraphIndex: number;
    paragraphId: string;
    page: number;
    title: string;
  } | null = null;

  // Step 1: Scan paragraphs to locate major process container and individual section headers
  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = p.text.trim();
    if (text.length === 0) continue;

    // Check for Main Process Container header (e.g. III. Tiến trình dạy học / III. Các hoạt động dạy học chủ yếu)
    if (!mainProcessMarker) {
      for (const mPattern of MAIN_PROCESS_PATTERNS) {
        if (mPattern.test(text)) {
          mainProcessMarker = {
            paragraphIndex: i,
            paragraphId: p.id,
            page: p.page,
            title: text.substring(0, 80),
          };
          break;
        }
      }
    }

    // Check against individual section patterns
    for (const rule of SECTION_DETECTION_PATTERNS) {
      if (markers.some((m) => m.key === rule.key)) continue;

      let matched = false;
      let matchedTitle = '';

      for (const pattern of rule.patterns) {
        const match = text.match(pattern);
        if (match) {
          matched = true;
          matchedTitle = match[0];
          break;
        }
      }

      if (matched) {
        markers.push({
          key: rule.key,
          title: rule.defaultTitle,
          matchedTitle: text.substring(0, 80),
          paragraphIndex: i,
          paragraphId: p.id,
          page: p.page,
          confidence: 0.95,
        });
        break;
      }
    }
  }

  // Step 2: Correlate with parsed document activities if any activity sections were missed
  for (const act of activities) {
    let actKey: LessonPlanSectionKey | null = null;
    if (act.type === 'khoi_dong') actKey = 'khoi_dong';
    else if (act.type === 'hinh_thanh_kien_thuc') actKey = 'kham_pha';
    else if (act.type === 'luyen_tap') actKey = 'luyen_tap';
    else if (act.type === 'van_dung' || act.type === 'mo_rong') actKey = 'van_dung';

    if (actKey && !markers.some((m) => m.key === actKey)) {
      const pIdx = paragraphs.findIndex((p) => p.id === act.startParagraphId);
      if (pIdx !== -1) {
        markers.push({
          key: actKey,
          title: act.title,
          matchedTitle: act.title,
          paragraphIndex: pIdx,
          paragraphId: act.startParagraphId,
          page: act.startPage || paragraphs[pIdx].page,
          confidence: 0.9,
        });
      }
    }
  }

  // Step 2.5: Holistic Multi-Page Scan for Teaching Materials & Equipment (thiet_bi)
  // Teachers often place "Đồ dùng dạy học" or "Thiết bị dạy học" on Page 2 or inside tables.
  // We scan all paragraphs across Page 1, Page 2, Page 3+ so it is never falsely marked as missing on Page 1!
  if (!markers.some((m) => m.key === 'thiet_bi')) {
    const matHeadingPattern = /^(?:II\.|2\.|B\.|II\/|II\s*[-–—:]|PHẦN\s*II\.?)?\s*(?:đồ dùng dạy(?:\s*và)?\s*học|thiết bị dạy học|chuẩn bị của giáo viên|chuẩn bị của gv|thiết bị và học liệu|phương tiện dạy học|chuẩn bị thiết bị)/i;

    // First check for headings or paragraphs matching matHeadingPattern across all pages
    let matIdx = paragraphs.findIndex((p) => matHeadingPattern.test(p.text.trim()));

    // If not found by heading, check for dual GV & HS material preparations anywhere in the document
    if (matIdx === -1) {
      matIdx = paragraphs.findIndex((p) => {
        const t = p.text.toLowerCase();
        const hasGV = t.includes('giáo viên:') || t.includes('gv:');
        const hasHS = t.includes('học sinh:') || t.includes('hs:');
        const hasMat = /sgk|máy chiếu|tivi|phiếu học tập|bảng phụ|tranh|ảnh|thước kẻ|bộ đồ dùng|vật thật|học liệu|thẻ từ/i.test(t);
        return (hasGV || hasHS) && hasMat;
      });
    }

    if (matIdx !== -1) {
      const p = paragraphs[matIdx];
      markers.push({
        key: 'thiet_bi',
        title: 'II. Thiết bị dạy học và học liệu (Đồ dùng dạy học)',
        matchedTitle: p.text.substring(0, 80),
        paragraphIndex: matIdx,
        paragraphId: p.id,
        page: p.page,
        confidence: 0.9,
      });
    }
  }

  // Step 3: Holistic Fallback for Activity Organization in multi-page lesson plans
  // If the document has a Main Process header (e.g. III. Tiến trình dạy học / Các hoạt động dạy học chủ yếu)
  // or contains activity terms on later/last pages, discover them holistically!
  const activityKeys: LessonPlanSectionKey[] = ['khoi_dong', 'kham_pha', 'luyen_tap', 'van_dung'];
  const hasAnyActivityMarker = markers.some((m) => activityKeys.includes(m.key));

  if (!hasAnyActivityMarker && mainProcessMarker) {
    // We have a clear Main Process container starting at mainProcessMarker.paragraphIndex
    // Scan inside this container for activity stages
    const processStartIndex = mainProcessMarker.paragraphIndex;
    
    // Look for Khởi động / Mở đầu
    const kdIdx = paragraphs.findIndex(
      (p, idx) => idx >= processStartIndex && /khởi động|mở đầu|tạo tâm thế|tình huống/i.test(p.text)
    );
    if (kdIdx !== -1 && !markers.some((m) => m.key === 'khoi_dong')) {
      markers.push({
        key: 'khoi_dong',
        title: 'Hoạt động 1: Mở đầu / Khởi động',
        matchedTitle: paragraphs[kdIdx].text.substring(0, 80),
        paragraphIndex: kdIdx,
        paragraphId: paragraphs[kdIdx].id,
        page: paragraphs[kdIdx].page,
        confidence: 0.85,
      });
    }

    // Look for Khám phá / Hình thành kiến thức
    const kpIdx = paragraphs.findIndex(
      (p, idx) => idx >= processStartIndex && /khám phá|hình thành kiến thức|kiến thức mới|trải nghiệm/i.test(p.text)
    );
    if (kpIdx !== -1 && !markers.some((m) => m.key === 'kham_pha')) {
      markers.push({
        key: 'kham_pha',
        title: 'Hoạt động 2: Hình thành kiến thức mới / Khám phá',
        matchedTitle: paragraphs[kpIdx].text.substring(0, 80),
        paragraphIndex: kpIdx,
        paragraphId: paragraphs[kpIdx].id,
        page: paragraphs[kpIdx].page,
        confidence: 0.85,
      });
    }

    // Look for Luyện tập / Thực hành
    const ltIdx = paragraphs.findIndex(
      (p, idx) => idx >= processStartIndex && /luyện tập|thực hành|bài tập/i.test(p.text)
    );
    if (ltIdx !== -1 && !markers.some((m) => m.key === 'luyen_tap')) {
      markers.push({
        key: 'luyen_tap',
        title: 'Hoạt động 3: Luyện tập / Thực hành',
        matchedTitle: paragraphs[ltIdx].text.substring(0, 80),
        paragraphIndex: ltIdx,
        paragraphId: paragraphs[ltIdx].id,
        page: paragraphs[ltIdx].page,
        confidence: 0.85,
      });
    }

    // Look for Vận dụng / Mở rộng
    const vdIdx = paragraphs.findIndex(
      (p, idx) => idx >= processStartIndex && /vận dụng|mở rộng|trải nghiệm thực tế|ở nhà/i.test(p.text)
    );
    if (vdIdx !== -1 && !markers.some((m) => m.key === 'van_dung')) {
      markers.push({
        key: 'van_dung',
        title: 'Hoạt động 4: Vận dụng / Mở rộng',
        matchedTitle: paragraphs[vdIdx].text.substring(0, 80),
        paragraphIndex: vdIdx,
        paragraphId: paragraphs[vdIdx].id,
        page: paragraphs[vdIdx].page,
        confidence: 0.85,
      });
    }
  }

  // Step 4: Check if activity organization is situated entirely on the later/last page
  // (e.g. Activity organization is on Page 2 or the last page, but Page 1 only has objectives & equipment)
  const lastPageNumber = document.pages.length > 0 ? document.pages[document.pages.length - 1].pageNumber : 1;
  if (!markers.some((m) => activityKeys.includes(m.key)) && lastPageNumber > 1) {
    // Check paragraphs on later pages (page >= 2) for activity keywords or table organization
    const laterPageParas = paragraphs.filter((p) => p.page >= 2);
    const hasActivityContentOnLaterPages = laterPageParas.some((p) =>
      /hoạt động|khởi động|khám phá|luyện tập|vận dụng|giáo viên|học sinh|bước 1|bước 2|bước 3|bước 4/i.test(p.text)
    );

    if (hasActivityContentOnLaterPages && laterPageParas.length > 0) {
      // The activity organization is definitely on later pages!
      const firstLaterPara = laterPageParas[0];
      const pIdx = paragraphs.findIndex((p) => p.id === firstLaterPara.id);
      
      // Assign at least an overarching activity section on the actual later page so Page 1 is never falsely blamed
      markers.push({
        key: 'kham_pha',
        title: 'Hoạt động 2: Hình thành kiến thức / Khám phá (Trang ' + firstLaterPara.page + ')',
        matchedTitle: firstLaterPara.text.substring(0, 80),
        paragraphIndex: pIdx,
        paragraphId: firstLaterPara.id,
        page: firstLaterPara.page,
        confidence: 0.8,
      });
    }
  }

  // Sort markers chronologically by paragraph index
  markers.sort((a, b) => a.paragraphIndex - b.paragraphIndex);

  // Determine sections keys to evaluate: use configured or standard list
  const targetKeys: LessonPlanSectionKey[] = configuredSections
    ? (configuredSections.map((s) => s.key) as LessonPlanSectionKey[])
    : SECTION_DETECTION_PATTERNS.map((p) => p.key);

  const detectedSections: DetectedSection[] = [];

  // Determine standard start page for activity sections if missing
  // (If activities are missing, their representative page should be the process start page or the last page, NEVER page 1 if document has >1 pages!)
  const processOrLastPage = mainProcessMarker
    ? mainProcessMarker.page
    : lastPageNumber > 1
    ? 2
    : 1;

  for (const targetKey of targetKeys) {
    const markerIndex = markers.findIndex((m) => m.key === targetKey);
    const ruleInfo = SECTION_DETECTION_PATTERNS.find((r) => r.key === targetKey);
    const defaultTitle = ruleInfo?.defaultTitle || targetKey;

    if (markerIndex === -1) {
      // Missing section
      // Crucial: Objectives ('muc_tieu') naturally belong to Page 1.
      // Equipment ('thiet_bi') belongs right after objectives (Page 1 or Page 2).
      // Activity sections belong to the lesson process (Page 2+ or last page).
      let missingPage = 1;
      if (targetKey === 'muc_tieu') {
        missingPage = 1;
      } else if (targetKey === 'thiet_bi') {
        const mucTieuMarker = markers.find((m) => m.key === 'muc_tieu');
        missingPage = mucTieuMarker ? mucTieuMarker.page : (mainProcessMarker ? mainProcessMarker.page : 1);
      } else {
        missingPage = processOrLastPage;
      }

      detectedSections.push({
        key: targetKey,
        title: defaultTitle,
        isDetected: false,
        startPage: missingPage,
        endPage: missingPage,
        paragraphs: [],
        activities: [],
        confidence: 0,
      });
      continue;
    }

    const currentMarker = markers[markerIndex];
    const nextMarker = markers[markerIndex + 1];

    const startIndex = currentMarker.paragraphIndex;
    const endIndex = nextMarker ? nextMarker.paragraphIndex - 1 : paragraphs.length - 1;

    const sectionParagraphs = paragraphs.slice(startIndex, Math.max(startIndex, endIndex + 1));
    const sectionStartPage = sectionParagraphs[0]?.page || currentMarker.page;
    const sectionEndPage = sectionParagraphs[sectionParagraphs.length - 1]?.page || sectionStartPage;

    // Filter activities that fall into this page/paragraph range
    const sectionActivities = activities.filter((act) => {
      const actStartIdx = paragraphs.findIndex((p) => p.id === act.startParagraphId);
      return actStartIdx >= startIndex && actStartIdx <= endIndex;
    });

    detectedSections.push({
      key: targetKey,
      title: defaultTitle,
      matchedTitle: currentMarker.matchedTitle,
      isDetected: true,
      headingParagraphId: currentMarker.paragraphId,
      startPage: sectionStartPage,
      endPage: sectionEndPage,
      paragraphs: sectionParagraphs,
      activities: sectionActivities,
      confidence: currentMarker.confidence,
    });
  }

  return detectedSections;
}

export function buildSectionEvaluationPrompt(
  section: DetectedSection,
  config: SectionCriteriaConfig,
  dispatchType: 'CV_5512' | 'CV_2345' | 'CUSTOM' = 'CV_5512'
): string {
  const isCV2345 = dispatchType === 'CV_2345';
  const dispatchName = isCV2345
    ? 'CÔNG VĂN 2345/BGDĐT-GDTH (CẤP TIỂU HỌC)'
    : 'CÔNG VĂN 5512/BGDĐT-GDTrH (CẤP THCS & THPT)';

  let prompt = `BẠN ĐANG THẨM ĐỊNH RIÊNG PHẦN: "${section.title}" CỦA KẾ HOẠCH BÀI DẠY THEO CHUẨN ${dispatchName}.\n\n`;
  prompt += `### TIÊU CHÍ ĐÁNH GIÁ RIÊNG CHO PHẦN NÀY (Trọng số: ${config.weight} điểm):\n`;
  for (const crit of config.criteriaChecklist) {
    prompt += `- ${crit}\n`;
  }
  prompt += `\n### HƯỚNG DẪN THẨM ĐỊNH ĐẶC THÙ:\n${config.promptInstructions}\n\n`;

  prompt += `### NỘI DUNG VĂN BẢN TRÍCH TỪ PHẦN NÀY (${section.paragraphs.length} đoạn, từ trang ${section.startPage} đến ${section.endPage}):\n`;
  for (const p of section.paragraphs) {
    const textSnippet = p.text.length > 300 ? p.text.substring(0, 300) + '...' : p.text;
    prompt += `[${p.id}] (Trang ${p.page}): ${textSnippet}\n`;
  }

  if (section.activities.length > 0) {
    prompt += `\n### CÁC HOẠT ĐỘNG THUỘC PHẦN NÀY:\n`;
    for (const act of section.activities) {
      prompt += `- ${act.title} (Thời lượng: ${act.duration || 'không ghi'})\n`;
    }
  }

  prompt += `\n## YÊU CẦU ĐỐI VỚI KẾT QUẢ ĐÁNH GIÁ:
1. Trả về đúng JSON format:
{
  "sectionKey": "${section.key}",
  "sectionTitle": "${section.title}",
  "score": 0-${config.weight},
  "maxScore": ${config.weight},
  "grade": "ĐẠT" | "CHƯA ĐẠT" | "XUẤT SẮC",
  "summary": "Nhận xét tổng quan về phần này...",
  "reviews": [
    {
      "targetId": "MÃ ĐOẠN CHÍNH XÁC (ví dụ: ${section.paragraphs[0]?.id || 'p_0001'}) nằm trong khoảng trang ${section.startPage}-${section.endPage}",
      "severity": "WARNING" | "ERROR" | "INFO",
      "type": "MISSING_REQUIREMENT" | "UNCLEAR_INSTRUCTION" | "INCONSISTENT" | "SUGGESTION",
      "message": "[Tên lỗi cụ thể theo ${isCV2345 ? 'CV 2345' : 'CV 5512'}] Mô tả ngắn gọn lỗi...",
      "quote": "Trích dẫn nguyên văn đoạn văn bản từ bài dạy đang có lỗi",
      "errorDetail": "Phân tích tác động sư phạm (tại sao cách soạn này chưa ổn khi giảng dạy)",
      "suggestion": "Hướng dẫn cụ thể cách chỉnh sửa",
      "suggestionExample": "Đoạn văn bản soạn lại mẫu hoàn chỉnh chuẩn ${isCV2345 ? 'CV 2345' : 'CV 5512'} để giáo viên dùng ngay"
    }
  ]
}
2. Ngôn ngữ thẩm định: Sử dụng tiếng Việt chuẩn mực, đầy đủ dấu thanh tiếng Việt (sắc, huyền, hỏi, ngã, nặng) và dấu ngữ điệu câu (chấm, phẩy, hỏi, cảm thán); góp ý cụ thể về phát âm và ngữ điệu đọc/nói trong tiến trình dạy học.
${isCV2345 ? '3. Lưu ý sư phạm Tiểu học (CV 2345): Đánh giá khích lệ, động viên sự tiến bộ, không so sánh học sinh; chú trọng hoạt động trực quan, thao tác đồ dùng và nguyên tắc không bỏ quên học sinh nào.' : ''}
LƯU Ý QUAN TRỌNG: Chỉ dùng các targetId có thực trong danh sách đoạn trên thuộc khoảng trang ${section.startPage}-${section.endPage}. Tuyệt đối không trỏ về trang đầu tiên nếu phần này nằm ở các trang sau. Nếu phần này đã chuẩn mực, trả về mảng "reviews": [] và điểm tối đa.`;

  return prompt;
}
