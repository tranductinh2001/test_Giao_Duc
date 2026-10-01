/**
 * AI Suggestion Engine
 *
 * Phase 8: Main export for AI Suggestion Engine
 */

// Types
export * from "./types";

// Engine
export {
  SuggestionEngine,
  ConflictEngine,
  GeminiSuggestionGenerator,
} from "./engine";

// Services
export { PatchService, SuggestionService } from "./services";

// Validators
export { PatchValidator } from "./validators";
