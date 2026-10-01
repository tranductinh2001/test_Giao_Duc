/**
 * Knowledge Mapping Engine - Index
 *
 * Phase 2: Complete export of all modules
 */

// Types
export * from "./types";

// Repositories
export { LessonRepository, lessonRepository } from "./repositories/LessonRepository";
export { MappingResultRepository, mappingResultRepository } from "./repositories/MappingResultRepository";

// Services
export { ScoringService } from "./services/ScoringService";
export { MatchingService } from "./services/MatchingService";
export { LessonImporter, lessonImporter } from "./services/LessonImporter";
export { LessonCache, getLessonCache, createLessonCache, CACHE_KEYS } from "./services/LessonCache";

// Engine
export { KnowledgeMappingEngine, createMappingEngine } from "./engine/MappingEngine";
export type { DocumentSection, KnowledgeMappingInput } from "./engine/MappingEngine";
