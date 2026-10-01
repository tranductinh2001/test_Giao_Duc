/**
 * Golden Dataset Manager
 *
 * Quản lý golden dataset để benchmark parser.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface GoldenRecord {
  id: string;
  filename: string;
  paragraphs: GoldenParagraph[];
  activities: GoldenActivity[];
  sections: GoldenSection[];
  semantic: GoldenSemantic[];
}

export interface GoldenParagraph {
  id: string;
  content: string;
  expectedLabel: string;
  expectedActivity: string;
  expectedSection: string;
}

export interface GoldenActivity {
  id: string;
  title: string;
  type: string;
  paragraphIds: string[];
}

export interface GoldenSection {
  id: string;
  title: string;
  type: string;
  paragraphIds: string[];
}

export interface GoldenSemantic {
  paragraphId: string;
  type: string;
  confidence: number;
}

export interface GoldenDataset {
  version: string;
  createdAt: string;
  records: GoldenRecord[];
}

/**
 * Golden Dataset Manager
 */
export class GoldenDatasetManager {
  private datasetDir: string;

  constructor(datasetDir: string = './golden') {
    this.datasetDir = datasetDir;
    this.ensureDir();
  }

  /**
   * Ensure directory exists
   */
  private ensureDir(): void {
    if (!fs.existsSync(this.datasetDir)) {
      fs.mkdirSync(this.datasetDir, { recursive: true });
    }
  }

  /**
   * Load golden dataset
   */
  load(): GoldenDataset {
    const indexPath = path.join(this.datasetDir, 'index.json');

    if (!fs.existsSync(indexPath)) {
      return { version: '1.0', createdAt: new Date().toISOString(), records: [] };
    }

    const data = fs.readFileSync(indexPath, 'utf-8');
    return JSON.parse(data);
  }

  /**
   * Save golden dataset
   */
  save(dataset: GoldenDataset): void {
    const indexPath = path.join(this.datasetDir, 'index.json');
    fs.writeFileSync(indexPath, JSON.stringify(dataset, null, 2), 'utf-8');
  }

  /**
   * Add a golden record
   */
  addRecord(record: GoldenRecord): void {
    const dataset = this.load();

    // Check for duplicate
    const existing = dataset.records.findIndex(r => r.id === record.id);
    if (existing >= 0) {
      dataset.records[existing] = record;
    } else {
      dataset.records.push(record);
    }

    this.save(dataset);
    console.log(`[Golden] Added record: ${record.filename}`);
  }

  /**
   * Get record by ID
   */
  getRecord(id: string): GoldenRecord | undefined {
    const dataset = this.load();
    return dataset.records.find(r => r.id === id);
  }

  /**
   * Get all records
   */
  getAllRecords(): GoldenRecord[] {
    return this.load().records;
  }

  /**
   * Create golden record from DocumentIR
   */
  createFromDocumentIR(docIR: any, sourceFile: string): GoldenRecord {
    const record: GoldenRecord = {
      id: `lesson_${Date.now()}`,
      filename: sourceFile,
      paragraphs: [],
      activities: [],
      sections: [],
      semantic: [],
    };

    // Copy paragraphs
    if (docIR.paragraphs) {
      for (const para of docIR.paragraphs) {
        record.paragraphs.push({
          id: para.id,
          content: para.content,
          expectedLabel: '',
          expectedActivity: '',
          expectedSection: '',
        });
      }
    }

    // Copy activities
    if (docIR.activities) {
      record.activities = docIR.activities.map((a: any) => ({
        id: a.id,
        title: a.title,
        type: a.type || 'CUSTOM',
        paragraphIds: a.paragraphIds || [],
      }));
    }

    // Copy sections
    if (docIR.sections) {
      record.sections = docIR.sections.map((s: any) => ({
        id: s.id,
        title: s.title,
        type: s.type || 'OTHER',
        paragraphIds: s.paragraphIds || [],
      }));
    }

    return record;
  }

  /**
   * Validate against golden
   */
  validate(docIR: any, goldenId: string): GoldenValidationResult {
    const golden = this.getRecord(goldenId);
    if (!golden) {
      return { valid: false, errors: ['Golden record not found'] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Compare paragraphs
    if (docIR.paragraphs?.length !== golden.paragraphs?.length) {
      errors.push(`Paragraph count mismatch: ${docIR.paragraphs.length} vs ${golden.paragraphs.length}`);
    }

    // Compare activities
    if (docIR.activities?.length !== golden.activities?.length) {
      errors.push(`Activity count mismatch: ${docIR.activities.length} vs ${golden.activities.length}`);
    }

    // Compare sections
    if (docIR.sections?.length !== golden.sections?.length) {
      errors.push(`Section count mismatch: ${docIR.sections.length} vs ${golden.sections.length}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Export to file
   */
  exportToFile(record: GoldenRecord, filename?: string): string {
    const name = filename || `${record.id}.json`;
    const filepath = path.join(this.datasetDir, name);
    fs.writeFileSync(filepath, JSON.stringify(record, null, 2), 'utf-8');
    return filepath;
  }

  /**
   * Import from file
   */
  importFromFile(filepath: string): GoldenRecord {
    const data = fs.readFileSync(filepath, 'utf-8');
    const record = JSON.parse(data) as GoldenRecord;
    this.addRecord(record);
    return record;
  }

  /**
   * List all golden files
   */
  listFiles(): string[] {
    const files = fs.readdirSync(this.datasetDir);
    return files.filter(f => f.endsWith('.json') && f !== 'index.json');
  }
}

export interface GoldenValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Create golden dataset manager
 */
export function createGoldenDatasetManager(datasetDir?: string): GoldenDatasetManager {
  return new GoldenDatasetManager(datasetDir);
}
