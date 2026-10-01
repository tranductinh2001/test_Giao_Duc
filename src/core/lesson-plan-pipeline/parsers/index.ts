/**
 * Parsers Index
 */

export { parseDocx, type ParseDocxResult } from "./DocxParser";
export { SectionDetector, createSectionDetector, type SectionDetectionResult } from "./SectionDetector";
export { ActivityDetector, SubActivityDetector, type ActivityDetectionOptions } from "./ActivityDetector";
export { TextNormalizer } from "../../rule-engine-v2/parsers/TextNormalizer";
