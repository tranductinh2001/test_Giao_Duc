/**
 * Lesson Plan Pipeline - Index
 *
 * Phase 1: Pipeline for parsing and structure detection
 */

// Main Pipeline
export { LessonPlanPipeline, createPipeline, executePipeline } from "./Pipeline";

// Types
export * from "./types";

// Parsers
export { parseDocx } from "./parsers/DocxParser";
export { SectionDetector, createSectionDetector } from "./parsers/SectionDetector";
export { ActivityDetector } from "./parsers/ActivityDetector";
