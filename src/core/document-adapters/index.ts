/**
 * Document Adapters Index
 *
 * Unified exports for all document adapters
 */

// Types
export * from "./types";

// Base Adapter
export * from "./DocumentAdapter";

// Adapters
export { DocxAdapter, docxAdapter } from "./DocxAdapter";
export { BrightOneAdapter, brightOneAdapter } from "./BrightOneAdapter";
export { BrightOneVisionAdapter, brightOneVisionAdapter } from "./BrightOneVisionAdapter";

// Unified Adapter
export {
  UnifiedDocumentAdapter,
  parseDocument,
  validateDocument,
  requiresAPI,
} from "./UnifiedDocumentAdapter";
