// AI Types

export type SemanticLabelType =
  | 'SECTION_HEADER'
  | 'OBJECTIVE'
  | 'LEARNING_OUTCOME'
  | 'TEACHER_ACTION'
  | 'STUDENT_ACTION'
  | 'TEACHING_MATERIAL'
  | 'QUESTION'
  | 'ASSESSMENT'
  | 'PRODUCT'
  | 'INSTRUCTION'
  | 'INTRODUCTION'
  | 'CONCLUSION'
  | 'HOMEWORK'
  | 'NOTE'
  | 'UNKNOWN';

export interface SemanticLabel {
  id: string;
  targetId: string;
  targetType: 'paragraph' | 'table_cell' | 'section' | 'activity';
  label: SemanticLabelType;
  confidence: number;
  source: 'ai' | 'rule' | 'heuristic' | 'fallback';
}

export interface AIConfig {
  provider: 'beeknoee';
  baseUrl: string;
  apiKey: string;
  model: string;
  visionModel: string;
  timeout: number;
  temperature: number;
  maxTokens: number;
}

export interface AIRequest {
  model: string;
  messages: AIMessage[];
  temperature: number;
  max_tokens: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | AIContentPart[];
}

export interface AIContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

export interface AIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: AIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AIChoice {
  index: number;
  message: {
    role: 'assistant';
    content: string;
  };
  finish_reason: 'stop' | 'length';
}

export interface AIError {
  type: 'PARSE_ERROR' | 'API_ERROR' | 'VALIDATION_ERROR' | 'TIMEOUT';
  message: string;
  statusCode?: number;
  retryable: boolean;
  rawResponse?: string;
}

export interface AIResult<T> {
  success: boolean;
  data?: T;
  error?: AIError;
}
