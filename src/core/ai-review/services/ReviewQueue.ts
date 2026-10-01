/**
 * Review Queue Service
 *
 * Phase 4: Sequential job processing with retry, timeout, cancel
 */

import { ReviewJob, QueueConfig, QueueStatus, ReviewStatus, DEFAULT_QUEUE_CONFIG } from "../types";

export interface QueueOptions {
  onJobStart?: (job: ReviewJob) => void;
  onJobComplete?: (job: ReviewJob) => void;
  onJobError?: (job: ReviewJob, error: string) => void;
  onJobRetry?: (job: ReviewJob, attempt: number) => void;
}

export class ReviewQueue {
  private config: QueueConfig;
  private jobs: Map<string, ReviewJob> = new Map();
  private processingQueue: ReviewJob[] = [];
  private status: QueueStatus = QueueStatus.IDLE;
  private options: QueueOptions;
  private isProcessing = false;
  private currentJobId: string | null = null;

  constructor(config: Partial<QueueConfig> = {}, options: QueueOptions = {}) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
    this.options = options;
  }

  /**
   * Add job to queue
   */
  enqueue(job: ReviewJob): void {
    this.jobs.set(job.jobId, {
      ...job,
      status: ReviewStatus.QUEUED,
      createdAt: job.createdAt || new Date(),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
    });

    this.processingQueue.push(this.jobs.get(job.jobId)!);
    this.process();
  }

  /**
   * Add multiple jobs
   */
  enqueueMany(jobs: ReviewJob[]): void {
    for (const job of jobs) {
      this.enqueue(job);
    }
  }

  /**
   * Process queue
   */
  private async process(): Promise<void> {
    if (this.isProcessing || this.status === QueueStatus.PAUSED) {
      return;
    }

    if (this.processingQueue.length === 0) {
      this.status = QueueStatus.IDLE;
      return;
    }

    this.isProcessing = true;
    this.status = QueueStatus.PROCESSING;

    while (this.processingQueue.length > 0 && this.status === QueueStatus.PROCESSING) {
      const job = this.processingQueue[0];

      if (job.status === ReviewStatus.CANCELLED) {
        this.processingQueue.shift();
        continue;
      }

      await this.processJob(job);
    }

    this.isProcessing = false;

    if (this.processingQueue.length === 0) {
      this.status = QueueStatus.IDLE;
    }
  }

  /**
   * Process single job
   */
  private async processJob(job: ReviewJob): Promise<void> {
    this.currentJobId = job.jobId;
    job.status = ReviewStatus.PROCESSING;
    job.startedAt = new Date();

    this.options.onJobStart?.(job);

    try {
      // Execute with timeout
      const result = await this.executeWithTimeout(job);

      job.status = ReviewStatus.COMPLETED;
      job.completedAt = new Date();
      job.result = result;

      this.options.onJobComplete?.(job);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (this.config.enableRetry && job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = ReviewStatus.QUEUED;
        job.error = errorMessage;

        this.options.onJobRetry?.(job, job.retryCount);

        // Re-queue with delay
        await this.sleep(this.config.retryDelay * job.retryCount);
        this.processingQueue.push(this.processingQueue.shift()!);
      } else {
        job.status = ReviewStatus.FAILED;
        job.completedAt = new Date();
        job.error = errorMessage;

        this.options.onJobError?.(job, errorMessage);
      }
    }

    // Remove from queue
    this.processingQueue.shift();
    this.currentJobId = null;
  }

  /**
   * Execute job with timeout
   */
  private executeWithTimeout(job: ReviewJob): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Job timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      // This should be overridden by the engine
      // For now, just resolve with undefined (to be implemented)
      job.result = undefined;
      clearTimeout(timeout);
      resolve(job.result);
    });
  }

  /**
   * Cancel job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (job.status === ReviewStatus.PROCESSING) {
      job.status = ReviewStatus.CANCELLED;
      job.error = "Cancelled by user";
    } else if (job.status === ReviewStatus.QUEUED) {
      job.status = ReviewStatus.CANCELLED;
      // Remove from queue
      const idx = this.processingQueue.findIndex((j) => j.jobId === jobId);
      if (idx !== -1) {
        this.processingQueue.splice(idx, 1);
      }
    }

    return true;
  }

  /**
   * Pause queue
   */
  pause(): void {
    this.status = QueueStatus.PAUSED;
  }

  /**
   * Resume queue
   */
  resume(): void {
    this.status = QueueStatus.PROCESSING;
    this.process();
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.pause();
    this.jobs.clear();
    this.processingQueue = [];
    this.status = QueueStatus.IDLE;
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): ReviewJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): ReviewJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get queue status
   */
  getStatus(): QueueStatus {
    return this.status;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.processingQueue.length;
  }

  /**
   * Get processing job
   */
  getCurrentJob(): ReviewJob | null {
    if (!this.currentJobId) return null;
    return this.jobs.get(this.currentJobId) || null;
  }

  /**
   * Update config
   */
  updateConfig(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set processor function
   */
  setProcessor(processor: (job: ReviewJob) => Promise<any>): void {
    this.executeWithTimeout = (job: ReviewJob) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Job timeout after ${this.config.timeout}ms`));
        }, this.config.timeout);

        processor(job)
          .then((result) => {
            clearTimeout(timeout);
            resolve(result);
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      });
    };
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      queued: jobs.filter((j) => j.status === ReviewStatus.QUEUED).length,
      processing: jobs.filter((j) => j.status === ReviewStatus.PROCESSING).length,
      completed: jobs.filter((j) => j.status === ReviewStatus.COMPLETED).length,
      failed: jobs.filter((j) => j.status === ReviewStatus.FAILED).length,
      cancelled: jobs.filter((j) => j.status === ReviewStatus.CANCELLED).length,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const reviewQueue = new ReviewQueue();
