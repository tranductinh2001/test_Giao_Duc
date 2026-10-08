// Document IR Types
import { SemanticLabel } from './ai';
import { Review } from './review';
import { Annotation } from './annotation';

export type { SemanticLabel, Review, Annotation };

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DocumentMetadata {
  title?: string;
  filename: string;
  pageCount: number;
  fileSize: number;
  hash: string;
}

export interface Page {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
}

export interface ParagraphStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  isItalic?: boolean;
  isUnderline?: boolean;
  leftIndent?: number;
  leftMargin?: number;
  lineHeight?: number;
}

export type ParagraphType =
  | 'heading_1'
  | 'heading_2'
  | 'heading_3'
  | 'paragraph'
  | 'list_item'
  | 'table_caption'
  | 'figure_caption'
  | 'footnote'
  | 'footer'
  | 'activity'
  | 'unknown';

export interface Paragraph {
  id: string;
  page: number;
  text: string;
  type: ParagraphType;
  bbox: BoundingBox;
  style?: ParagraphStyle;
}

export interface TableCell {
  cellId: string;
  row: number;
  column: number;
  rowSpan: number;
  colSpan: number;
  text: string;
  bbox: BoundingBox;
  isHeader: boolean;
}

export interface Table {
  tableId: string;
  page: number;
  caption?: string;
  bbox: BoundingBox;
  rows: number;
  columns: number;
  cells: TableCell[];
  headers: string[];
}

export type ActivityType =
  | 'khoi_dong'
  | 'hinh_thanh_kien_thuc'
  | 'luyen_tap'
  | 'van_dung'
  | 'mo_rong'
  | 'on_tap'
  | 'khao_sat'
  | 'unknown';

export interface Activity {
  activityId: string;
  title: string;
  type: ActivityType;
  startParagraphId: string;
  endParagraphId: string;
  startPage: number;
  endPage: number;
  duration?: string;
  teacherActionIds: string[];
  studentActionIds: string[];
  productIds: string[];
}

export interface Section {
  sectionId: string;
  title: string;
  level: number;
  startParagraphId: string | null;
  endParagraphId: string | null;
  startPage: number;
  endPage: number;
}

export interface DocumentIR {
  documentId: string;
  metadata: DocumentMetadata;
  pages: Page[];
  sections: Section[];
  paragraphs: Paragraph[];
  tables: Table[];
  activities: Activity[];
  semanticLabels: SemanticLabel[];
  reviews: Review[];
  annotations: Annotation[];
  createdAt: string;
  updatedAt: string;
}
