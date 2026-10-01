/**
 * Core Selection Module
 *
 * Main entry point for selection system
 */

export {
  SelectionState,
  rangesOverlap,
  rangeUnion,
  rangeIntersection,
  rangeContains,
  isValidPosition,
  normalizePosition,
} from "./SelectionState";

export type { Selection, Range } from "./SelectionState";
