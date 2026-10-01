/**
 * DebugArtifactWriter
 *
 * Persists all intermediate artifacts for debugging.
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentIR, CoverageReport } from './DocumentIR';
import { getLogger } from '@/lib/logger';

const logger = getLogger();

/**
 * Artifact types
 */
export type ArtifactType =
  | 'vision.json'
  | 'document-ir.json'
  | 'semantic-prompt.txt'
  | 'semantic-response.txt'
  | 'semantic-labels.json'
  | 'mapping.json'
  | 'review.json'
  | 'coverage.json'
  | 'performance.json'
  | 'comparison.json';

/**
 * Debug Artifact Writer Config
 */
export interface DebugArtifactWriterConfig {
  outputDir: string;
  enabled: boolean;
  includeRawAIResponses: boolean;
  timestamp: string;
}

/**
 * Default config
 */
export function createDebugArtifactWriter(
  outputDir: string,
  enabled: boolean = true
): DebugArtifactWriter {
  return new DebugArtifactWriter({
    outputDir,
    enabled,
    includeRawAIResponses: true,
    timestamp: new Date().toISOString().replace(/[:.]/g, '-')
  });
}

/**
 * Debug Artifact Writer
 */
export class DebugArtifactWriter {
  private config: DebugArtifactWriterConfig;

  constructor(config: DebugArtifactWriterConfig) {
    this.config = config;

    // Create output directory
    if (this.config.enabled) {
      this.ensureDir(this.config.outputDir);
    }
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Write artifact to file
   */
  write(artifactType: ArtifactType, content: any): void {
    if (!this.config.enabled) {
      return;
    }

    const filename = this.getFilename(artifactType);
    const filepath = path.join(this.config.outputDir, filename);

    try {
      let contentStr: string;

      if (typeof content === 'string') {
        contentStr = content;
      } else {
        contentStr = JSON.stringify(content, null, 2);
      }

      fs.writeFileSync(filepath, contentStr, 'utf-8');
      logger.info(`[DebugArtifactWriter] Written: ${filename}`);

    } catch (error: any) {
      logger.error(`[DebugArtifactWriter] Failed to write ${filename}: ${error.message}`);
    }
  }

  /**
   * Write Vision JSON
   */
  writeVisionJSON(visionRaw: any): void {
    this.write('vision.json', visionRaw);
  }

  /**
   * Write Document IR
   */
  writeDocumentIR(docIR: DocumentIR): void {
    this.write('document-ir.json', {
      metadata: docIR.metadata,
      paragraphs: docIR.paragraphs.length,
      sections: docIR.sections.length,
      activities: docIR.activities.length,
      semanticLabels: docIR.semanticLabels.length,
      coverage: docIR.coverage,
      validation: docIR.validation
    });
  }

  /**
   * Write Semantic Prompt
   */
  writeSemanticPrompt(prompt: string): void {
    this.write('semantic-prompt.txt', prompt);
  }

  /**
   * Write Semantic Response
   */
  writeSemanticResponse(response: string): void {
    if (this.config.includeRawAIResponses) {
      this.write('semantic-response.txt', response);
    }
  }

  /**
   * Write Semantic Labels
   */
  writeSemanticLabels(labels: any[]): void {
    this.write('semantic-labels.json', labels);
  }

  /**
   * Write Mapping Result
   */
  writeMapping(mapping: any): void {
    this.write('mapping.json', mapping);
  }

  /**
   * Write Review
   */
  writeReview(review: any): void {
    this.write('review.json', review);
  }

  /**
   * Write Coverage
   */
  writeCoverage(coverage: CoverageReport): void {
    this.write('coverage.json', coverage);
  }

  /**
   * Write Performance Metrics
   */
  writePerformance(performance: PerformanceMetrics): void {
    this.write('performance.json', performance);
  }

  /**
   * Write Comparison
   */
  writeComparison(comparison: PipelineComparison): void {
    this.write('comparison.json', comparison);
  }

  /**
   * Get filename for artifact type
   */
  private getFilename(artifactType: ArtifactType): string {
    const prefix = this.config.timestamp || 'debug';
    return `${prefix}_${artifactType}`;
  }

  /**
   * Get output directory
   */
  getOutputDir(): string {
    return this.config.outputDir;
  }
}

/**
 * Performance Metrics
 */
export interface PerformanceMetrics {
  pipeline: string;
  timestamp: string;
  duration: {
    totalMs: number;
    visionMs: number;
    semanticMs: number;
    mappingMs: number;
    validationMs: number;
  };
  ai: {
    model: string;
    visionCalls: number;
    semanticCalls: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    estimatedCost: number;
  };
  data: {
    totalPages: number;
    totalParagraphs: number;
    labeledParagraphs: number;
    coveragePercent: number;
  };
}

/**
 * Pipeline Comparison
 */
export interface PipelineComparison {
  timestamp: string;
  oldPipeline: PipelineMetrics;
  newPipeline: PipelineMetrics;
  sections: {
    old: number;
    new: number;
    match: boolean;
  };
  activities: {
    old: number;
    new: number;
    match: boolean;
  };
  paragraphs: {
    old: number;
    new: number;
    match: boolean;
  };
  semanticLabels: {
    old: number;
    new: number;
    match: boolean;
  };
  coverage: {
    old: number;
    new: number;
    match: boolean;
  };
  confidence: {
    old: number;
    new: number;
    match: boolean;
  };
  cost: {
    old: number;
    new: number;
    difference: number;
  };
  duration: {
    old: number;
    new: number;
    difference: number;
  };
  functionalParity: boolean;
  recommendations: string[];
}

/**
 * Create empty performance metrics
 */
export function createEmptyPerformanceMetrics(pipeline: string): PerformanceMetrics {
  return {
    pipeline,
    timestamp: new Date().toISOString(),
    duration: {
      totalMs: 0,
      visionMs: 0,
      semanticMs: 0,
      mappingMs: 0,
      validationMs: 0
    },
    ai: {
      model: '',
      visionCalls: 0,
      semanticCalls: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
      estimatedCost: 0
    },
    data: {
      totalPages: 0,
      totalParagraphs: 0,
      labeledParagraphs: 0,
      coveragePercent: 0
    }
  };
}

/**
 * Compare two pipelines
 */
export function comparePipelines(
  oldMetrics: PerformanceMetrics,
  newMetrics: PerformanceMetrics,
  oldData: any,
  newData: any
): PipelineComparison {
  const comparison: PipelineComparison = {
    timestamp: new Date().toISOString(),
    oldPipeline: oldMetrics,
    newPipeline: newMetrics,
    sections: {
      old: oldData.sections?.length || 0,
      new: newData.sections?.length || 0,
      match: false
    },
    activities: {
      old: oldData.activities?.length || 0,
      new: newData.activities?.length || 0,
      match: false
    },
    paragraphs: {
      old: oldData.paragraphs?.length || 0,
      new: newData.paragraphs?.length || 0,
      match: false
    },
    semanticLabels: {
      old: oldData.labels?.length || 0,
      new: newData.labels?.length || 0,
      match: false
    },
    coverage: {
      old: oldData.coveragePercent || 0,
      new: newData.coveragePercent || 0,
      match: false
    },
    confidence: {
      old: oldData.confidence || 0,
      new: newData.confidence || 0,
      match: false
    },
    cost: {
      old: oldMetrics.ai.estimatedCost,
      new: newMetrics.ai.estimatedCost,
      difference: newMetrics.ai.estimatedCost - oldMetrics.ai.estimatedCost
    },
    duration: {
      old: oldMetrics.duration.totalMs,
      new: newMetrics.duration.totalMs,
      difference: newMetrics.duration.totalMs - oldMetrics.duration.totalMs
    },
    functionalParity: false,
    recommendations: []
  };

  // Check functional parity
  const sectionsMatch = comparison.sections.old === comparison.sections.new;
  const activitiesMatch = comparison.activities.old === comparison.activities.new;
  const coverageDiff = Math.abs(comparison.coverage.old - comparison.coverage.new);
  const coverageAcceptable = coverageDiff < 10; // 10% tolerance

  comparison.functionalParity = sectionsMatch && activitiesMatch && coverageAcceptable;

  // Generate recommendations
  if (!comparison.functionalParity) {
    if (!sectionsMatch) {
      comparison.recommendations.push(`Section count mismatch: old=${comparison.sections.old}, new=${comparison.sections.new}`);
    }
    if (!activitiesMatch) {
      comparison.recommendations.push(`Activity count mismatch: old=${comparison.activities.old}, new=${comparison.activities.new}`);
    }
    if (!coverageAcceptable) {
      comparison.recommendations.push(`Coverage difference too large: ${coverageDiff.toFixed(1)}%`);
    }
  } else {
    comparison.recommendations.push('Functional parity confirmed - pipelines produce equivalent results');
  }

  return comparison;
}
