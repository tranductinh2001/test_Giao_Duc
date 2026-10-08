// Annotation Types

import { BoundingBox } from './document';

export type TargetType = 'paragraph' | 'table_cell' | 'section' | 'activity';

export type AnnotationType = 'highlight' | 'underline' | 'strikethrough' | 'comment';

export interface Comment {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Annotation {
  annotationId: string;
  type: AnnotationType;
  reviewId: string;
  targetId: string;
  targetType: TargetType;
  page: number;
  bbox: BoundingBox;
  color: string;
  opacity: number;
  comments: Comment[];
  resolved: boolean;
}

export interface AnnotationStyle {
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  highlightColor: string;
  iconColor: string;
}

export const SEVERITY_COLORS: Record<string, AnnotationStyle> = {
  INFO: {
    severity: 'INFO',
    highlightColor: '#E3F2FD',
    iconColor: '#2196F3',
  },
  WARNING: {
    severity: 'WARNING',
    highlightColor: '#FFF3E0',
    iconColor: '#FF9800',
  },
  ERROR: {
    severity: 'ERROR',
    highlightColor: '#FFEBEE',
    iconColor: '#F44336',
  },
  CRITICAL: {
    severity: 'CRITICAL',
    highlightColor: '#B71C1C',
    iconColor: '#B71C1C',
  },
};
