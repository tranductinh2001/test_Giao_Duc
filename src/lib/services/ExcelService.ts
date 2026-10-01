import * as XLSX from 'xlsx';

// ============================================================
// RuleExcelRow - Map chinh xac voi Form Rule
// Form: SectionRuleFormData
// ============================================================
export interface RuleExcelRow {
  // === BASIC INFO ===
  stt: number;                    // order (number)
  nhomTieuChi: string;            // sectionType (string - OBJECTIVES, PREPARATION, etc.)
  tenTieuChi: string;             // title (string)

  // === CONTENT ===
  noiDungDanhGia: string;         // requirements (string)
  viDuDung: string;               // correctExample (string)
  viDuSai: string;                // incorrectExample (string)

  // === AI ===
  promptAI: string;               // aiPrompt (string)

  // === SCORING ===
  diem: number;                   // priority (number)
  trongSo: number;                // weight (number)
  capDo: number;                  // level (number: 1=Muc lon, 2=Muc nho, 3=Section, 4=Subsection)
  tieuChiCha: string | null;       // parentId - tên tiêu chí cha

  // === STATUS ===
  batBuoc: boolean;               // isActive (boolean)
  ghiChu: string;                // (string)
}

export interface RuleValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ImportResult {
  success: boolean;
  newCount: number;
  updateCount: number;
  errorCount: number;
  errors: RuleValidationError[];
  preview: RuleExcelRow[];
}

const SECTION_TYPES = [
  'OBJECTIVES',
  'PREPARATION',
  'ACTIVITY',
  'EVALUATION',
  'MATERIALS',
  'HOMEWORK',
  'NOTES',
] as const;

export class ExcelService {
  /**
   * Generate Excel template for Rules
   * Header chinh xac voi Form Rule (SectionRuleFormData)
   */
  static generateTemplate(circularCode: string, existingRules?: any[]): Buffer {
    const wb = XLSX.utils.book_new();
    wb.Props = {
      Title: `Mau Rule - ${circularCode}`,
      Subject: 'Mau import Rule',
      Author: 'Education Platform',
      CreatedDate: new Date(),
    };

    const ws = XLSX.utils.aoa_to_sheet([]);

    // Headers - Dong bo voi Form Rule
    const headers = [
      'STT',                      // order
      'Nhom tieu chi',            // sectionType
      'Ten tieu chi',             // title
      'Noi dung danh gia',       // requirements
      'Vi du dung',               // correctExample
      'Vi du sai',                // incorrectExample
      'Prompt AI',                // aiPrompt
      'Diem',                     // priority
      'Trong so',                 // weight
      'Cap do',                   // level (1=Muc lon, 2=Muc nho, 3=Section, 4=Subsection)
      'Tieu chi cha',             // parentId (ten tieu chi cha)
      'Bat buoc',                 // isActive
      'Ghi chu',                  // (string)
    ];

    XLSX.utils.sheet_add_aoa(ws, [headers], { origin: 'A1' });

    // Example row
    const exampleRow = [
      1,
      'OBJECTIVES',
      'Ten tieu chi vi du',
      'Noi dung danh gia chi tiet',
      'Vi du noi dung dung',
      'Vi du noi dung sai',
      'Prompt AI tuy chinh (de trong = dung mac dinh)',
      10,
      1.0,
      3,
      '',
      'TRUE',
      'Ghi chu them (tuy chon)',
    ];
    XLSX.utils.sheet_add_aoa(ws, [exampleRow], { origin: 'A2' });

    // If there are existing rules, add them starting from row 3
    if (existingRules && existingRules.length > 0) {
      // Build parent map for lookup
      const parentMap = new Map(existingRules.map(r => [r.id, r.title]));

      const ruleRows = existingRules.map((rule, index) => [
        index + 1,
        rule.sectionType || '',
        rule.title || '',
        rule.requirements || '',
        rule.correctExample || '',
        rule.incorrectExample || '',
        rule.aiPrompt || '',
        rule.priority || 0,
        rule.weight || 1.0,
        rule.level || 3,
        rule.parentId ? (parentMap.get(rule.parentId) || '') : '',
        rule.isActive ? 'TRUE' : 'FALSE',
        '',
      ]);
      XLSX.utils.sheet_add_aoa(ws, ruleRows, { origin: 'A3' });
    }

    // Column widths - Dong bo voi Form Rule
    ws['!cols'] = [
      { wch: 5 },   // STT
      { wch: 18 },  // Nhom tieu chi
      { wch: 30 },  // Ten tieu chi
      { wch: 40 },  // Noi dung danh gia
      { wch: 35 },  // Vi du dung
      { wch: 35 },  // Vi du sai
      { wch: 40 },  // Prompt AI
      { wch: 8 },   // Diem
      { wch: 8 },   // Trong so
      { wch: 8 },   // Cap do
      { wch: 20 },  // Tieu chi cha
      { wch: 10 },  // Bat buoc
      { wch: 25 },  // Ghi chu
    ];

    // Instructions sheet - Dong bo voi Form Rule
    const wsInstructions = XLSX.utils.aoa_to_sheet([]);
    XLSX.utils.sheet_add_aoa(wsInstructions, [
      ['HUONG DAN DIEN FILE EXCEL'],
    ]);
    XLSX.utils.sheet_add_aoa(wsInstructions, [
      [],
      ['Cot', 'Mo ta', 'Vi du', 'Luu y'],
    ]);
    XLSX.utils.sheet_add_aoa(wsInstructions, [
      [],
      ['STT', 'So thu tu tu dong', '1, 2, 3...', 'Khong can dien'],
      ['Nhom tieu chi', 'Loai section', 'OBJECTIVES', 'Chon: OBJECTIVES, PREPARATION, ACTIVITY, EVALUATION, MATERIALS, HOMEWORK, NOTES'],
      ['Ten tieu chi', 'Ten cua tieu chi', 'Ten tieu chi', 'Bat buoc - dung de mapping khi import'],
      ['Noi dung danh gia', 'Mo ta chi tiet tieu chi', 'Noi dung...', 'Tuy chon'],
      ['Vi du dung', 'Vi du noi dung dung', 'Vi du...', 'Tuy chon'],
      ['Vi du sai', 'Vi du noi dung sai', 'Vi du...', 'Tuy chon'],
      ['Prompt AI', 'Prompt tuy chinh cho AI', 'Prompt...', 'De trong dung prompt mac dinh'],
      ['Diem', 'Diem so', '10', 'So nguyen, mac dinh 0'],
      ['Trong so', 'Trong so', '1.0', 'So thap phan, mac dinh 1.0'],
      ['Cap do', 'Cap do (1=Muc lon, 2=Muc nho, 3=Section, 4=Subsection)', '3', 'So tu 1 den 4, mac dinh 3'],
      ['Tieu chi cha', 'Ten tieu chi cha (neu co)', 'Ten tieu chi cha', 'Tuy chon - de trong neu khong co'],
      ['Bat buoc', 'Tieu chi bat buoc', 'TRUE/FALSE', 'TRUE = bat buoc, mac dinh TRUE'],
      ['Ghi chu', 'Ghi chu them', 'Ghi chu...', 'Tuy chon'],
    ]);

    wsInstructions['!cols'] = [
      { wch: 18 },
      { wch: 35 },
      { wch: 30 },
      { wch: 40 },
    ];

    // Freeze header
    ws['!freeze'] = { x: 0, y: 1 };

    XLSX.utils.book_append_sheet(wb, ws, 'Rules');
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'HuongDan');

    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }

  /**
   * Parse Excel file and validate data
   */
  static parseAndValidateExcel(buffer: Buffer, existingRules: any[]): ImportResult {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets['Rules'];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

    if (data.length < 3) {
      return {
        success: false,
        newCount: 0,
        updateCount: 0,
        errorCount: 1,
        errors: [{ row: 0, field: 'general', message: 'File Excel không có dữ liệu' }],
        preview: [],
      };
    }

    const headers = data[0].map((h) => String(h).trim());
    const headerMap = this.getHeaderMap(headers);

    // Create map of existing rules by title + sectionType for matching
    const existingRuleMap = new Map<string, any>();
    existingRules.forEach((rule) => {
      const key = `${rule.sectionType}_${rule.title}`.toLowerCase();
      existingRuleMap.set(key, rule);
    });

    const errors: RuleValidationError[] = [];
    const preview: RuleExcelRow[] = [];
    let newCount = 0;
    let updateCount = 0;

    // Start from row 2 (row 1 is headers, row 2 is example)
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0 || this.isRowEmpty(row)) continue;

      const rowNum = i + 1;
      const validationErrors = this.validateRow(row, headerMap, rowNum);

      if (validationErrors.length > 0) {
        errors.push(...validationErrors);
        continue;
      }

      const parsedRow = this.parseRow(row, headerMap, rowNum);
      if (parsedRow) {
        // Check if rule exists by matching title + sectionType
        const matchKey = `${parsedRow.nhomTieuChi}_${parsedRow.tenTieuChi}`.toLowerCase();
        if (existingRuleMap.has(matchKey)) {
          updateCount++;
        } else {
          newCount++;
        }
        preview.push(parsedRow);
      }
    }

    return {
      success: errors.length === 0,
      newCount,
      updateCount,
      errorCount: errors.length,
      errors,
      preview,
    };
  }

  /**
   * Get header column mapping - Dong bo voi Form Rule
   */
  private static getHeaderMap(headers: string[]): Record<string, number> {
    const map: Record<string, number> = {};
    headers.forEach((h, idx) => {
      const normalized = h.toLowerCase().trim().replace(/\s+/g, ' ');
      // STT
      if (normalized === 'stt' || normalized.includes('stt')) map.stt = idx;
      // Nhom tieu chi (sectionType)
      else if (normalized.includes('nhom') && normalized.includes('tieu')) map.nhomTieuChi = idx;
      // Ten tieu chi (title)
      else if (normalized.includes('ten') && normalized.includes('tieu')) map.tenTieuChi = idx;
      // Noi dung danh gia (requirements)
      else if (normalized.includes('noi dung') && normalized.includes('danh')) map.noiDungDanhGia = idx;
      // Vi du dung (correctExample)
      else if ((normalized.includes('vi du') || normalized.includes('vidu')) && normalized.includes('dung')) map.viDuDung = idx;
      // Vi du sai (incorrectExample)
      else if ((normalized.includes('vi du') || normalized.includes('vidu')) && normalized.includes('sai')) map.viDuSai = idx;
      // Prompt AI
      else if (normalized.includes('prompt') || normalized.includes('ai')) map.promptAI = idx;
      // Diem (priority)
      else if (normalized === 'diem' || normalized.includes('diem')) map.diem = idx;
      // Trong so (weight)
      else if (normalized.includes('trong') && normalized.includes('so')) map.trongSo = idx;
      // Cap do (level)
      else if (normalized.includes('cap') && normalized.includes('do')) map.capDo = idx;
      // Tieu chi cha (parentId)
      else if (normalized.includes('tieu') && normalized.includes('cha')) map.tieuChiCha = idx;
      // Bat buoc (isActive)
      else if (normalized.includes('bat') && normalized.includes('buoc')) map.batBuoc = idx;
      // Ghi chu
      else if (normalized.includes('ghi') && normalized.includes('chu')) map.ghiChu = idx;
    });
    return map;
  }

  /**
   * Validate a row of data - Dong bo voi Form Rule
   */
  private static validateRow(
    row: any[],
    headerMap: Record<string, number>,
    rowNum: number
  ): RuleValidationError[] {
    const errors: RuleValidationError[] = [];

    // Required: Ten tieu chi
    const tenTieuChi = this.getCellValue(row, headerMap.tenTieuChi);
    if (!tenTieuChi || String(tenTieuChi).trim() === '') {
      errors.push({ row: rowNum, field: 'tenTieuChi', message: 'Ten tieu chi khong duoc de trong' });
    }

    // Required: Nhom tieu chi
    const nhomTieuChi = this.getCellValue(row, headerMap.nhomTieuChi);
    if (!nhomTieuChi || String(nhomTieuChi).trim() === '') {
      errors.push({ row: rowNum, field: 'nhomTieuChi', message: 'Nhom tieu chi khong duoc de trong' });
    } else if (!SECTION_TYPES.includes(String(nhomTieuChi).toUpperCase() as typeof SECTION_TYPES[number])) {
      errors.push({
        row: rowNum,
        field: 'nhomTieuChi',
        message: `Nhom tieu chi khong hop le. Phai la: ${SECTION_TYPES.join(', ')}`,
      });
    }

    // Validate: Diem (priority) - must be number
    const diem = this.getCellValue(row, headerMap.diem);
    if (diem !== undefined && diem !== '' && isNaN(Number(diem))) {
      errors.push({ row: rowNum, field: 'diem', message: 'Diem phai la so' });
    }

    // Validate: Trong so (weight) - must be number
    const trongSo = this.getCellValue(row, headerMap.trongSo);
    if (trongSo !== undefined && trongSo !== '' && isNaN(Number(trongSo))) {
      errors.push({ row: rowNum, field: 'trongSo', message: 'Trong so phai la so' });
    }

    // Validate: Cap do (level) - must be 1-4
    const capDo = this.getCellValue(row, headerMap.capDo);
    if (capDo !== undefined && capDo !== '') {
      const level = Number(capDo);
      if (isNaN(level) || level < 1 || level > 4) {
        errors.push({ row: rowNum, field: 'capDo', message: 'Cap do phai la so tu 1 den 4 (1=Muc lon, 2=Muc nho, 3=Section, 4=Subsection)' });
      }
    }

    // Validate: Bat buoc (isActive) - must be TRUE/FALSE
    const batBuoc = this.getCellValue(row, headerMap.batBuoc);
    if (batBuoc !== undefined && batBuoc !== '') {
      const normalized = String(batBuoc).toUpperCase().trim();
      if (normalized !== 'TRUE' && normalized !== 'FALSE') {
        errors.push({ row: rowNum, field: 'batBuoc', message: 'Bat buoc phai la TRUE hoac FALSE' });
      }
    }

    return errors;
  }

  private static getCellValue(row: any[], index?: number): any {
    if (index === undefined || index < 0 || index >= row.length) return undefined;
    return row[index];
  }

  private static isRowEmpty(row: any[]): boolean {
    return row.every((cell) => cell === undefined || cell === null || String(cell).trim() === '');
  }

  /**
   * Parse row into RuleExcelRow
   */
  /**
   * Parse Excel row to RuleExcelRow - Dong bo voi Form Rule
   */
  private static parseRow(row: any[], headerMap: Record<string, number>, rowNum: number): RuleExcelRow | null {
    try {
      return {
        stt: Number(this.getCellValue(row, headerMap.stt)) || rowNum - 1,
        nhomTieuChi: String(this.getCellValue(row, headerMap.nhomTieuChi) || '').trim(),
        tenTieuChi: String(this.getCellValue(row, headerMap.tenTieuChi) || '').trim(),
        noiDungDanhGia: String(this.getCellValue(row, headerMap.noiDungDanhGia) || '').trim(),
        viDuDung: String(this.getCellValue(row, headerMap.viDuDung) || '').trim(),
        viDuSai: String(this.getCellValue(row, headerMap.viDuSai) || '').trim(),
        promptAI: String(this.getCellValue(row, headerMap.promptAI) || '').trim(),
        diem: Number(this.getCellValue(row, headerMap.diem)) || 0,
        trongSo: Number(this.getCellValue(row, headerMap.trongSo)) || 1.0,
        capDo: Number(this.getCellValue(row, headerMap.capDo)) || 3,
        tieuChiCha: String(this.getCellValue(row, headerMap.tieuChiCha) || '').trim() || null,
        batBuoc: this.parseBoolean(this.getCellValue(row, headerMap.batBuoc), true),
        ghiChu: String(this.getCellValue(row, headerMap.ghiChu) || '').trim(),
      };
    } catch (e) {
      return null;
    }
  }

  private static parseBoolean(value: any, defaultValue: boolean): boolean {
    if (value === undefined || value === null) return defaultValue;
    const normalized = String(value).toUpperCase().trim();
    return normalized === 'TRUE';
  }

  /**
   * Export rules to Excel
   */
  static exportRules(circularCode: string, rules: any[]): Buffer {
    return this.generateTemplate(circularCode, rules);
  }

  /**
   * Convert Excel rows to rules for database
   * Maps by: title + sectionType
   */
  /**
   * Convert Excel rows to database rules - Dong bo voi Form Rule
   */
  static convertToRules(rows: RuleExcelRow[], circularId: string, createdBy: string, existingRules: any[] = []): any[] {
    // Build lookup maps
    const titleToRuleMap = new Map(existingRules.map(r => [r.title.toLowerCase(), r]));
    const sectionTypeToRulesMap = new Map<string, any[]>();
    existingRules.forEach(r => {
      const arr = sectionTypeToRulesMap.get(r.sectionType) || [];
      arr.push(r);
      sectionTypeToRulesMap.set(r.sectionType, arr);
    });

    return rows.map((row) => {
      // Find parent ID if specified
      let parentId = null;
      if (row.tieuChiCha) {
        const parentRule = titleToRuleMap.get(row.tieuChiCha.toLowerCase());
        parentId = parentRule?.id || null;
      }

      return {
        circularId,
        sectionType: row.nhomTieuChi,
        title: row.tenTieuChi,
        requirements: row.noiDungDanhGia,
        correctExample: row.viDuDung || '',
        incorrectExample: row.viDuSai || '',
        aiPrompt: row.promptAI || '',
        priority: row.diem || 0,
        weight: row.trongSo || 1.0,
        level: row.capDo || 3,
        order: row.stt || 0,
        parentId,
        isActive: row.batBuoc,
        createdBy,
      };
    });
  }

  /**
   * Match existing rule by title + sectionType
   */
  static matchExistingRule(row: RuleExcelRow, existingRules: any[]): any | null {
    const matchKey = `${row.nhomTieuChi}_${row.tenTieuChi}`.toLowerCase();
    return existingRules.find(
      (rule) => `${rule.sectionType}_${rule.title}`.toLowerCase() === matchKey
    ) || null;
  }
}
