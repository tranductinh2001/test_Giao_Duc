/**
 * Lesson Cache Service
 *
 * Phase 2: In-memory cache for lesson data
 */

import type { LessonActivity } from "@prisma/client";
import type { CacheEntry, CacheStats } from "../types";

export class LessonCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private ttl: number;
  private maxSize: number;
  private stats: CacheStats;

  constructor(ttl = 3600000, maxSize = 1000) {
    this.cache = new Map();
    this.ttl = ttl;
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRate: 0,
    };
  }

  /**
   * Set cache entry
   */
  set<T>(key: string, data: T): void {
    // Evict if at max size
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.ttl,
    });
  }

  /**
   * Get cache entry
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check expiration
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    return entry.data as T;
  }

  /**
   * Check if key exists (valid, not expired)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  /**
   * Get cache stats
   */
  getStats(): CacheStats {
    return { ...this.stats, size: this.cache.size };
  }

  /**
   * Update TTL
   */
  setTTL(ttl: number): void {
    this.ttl = ttl;
  }

  /**
   * Get TTL
   */
  getTTL(): number {
    return this.ttl;
  }

  /**
   * Evict oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// Global cache instance
let globalCache: LessonCache | null = null;

export function getLessonCache(): LessonCache {
  if (!globalCache) {
    globalCache = new LessonCache();
  }
  return globalCache;
}

export function createLessonCache(ttl = 3600000, maxSize = 1000): LessonCache {
  return new LessonCache(ttl, maxSize);
}

// Cache keys
export const CACHE_KEYS = {
  allActivities: () => "lesson:activities:all",
  activitiesBySection: (sectionId: string) => `lesson:activities:section:${sectionId}`,
  activitiesByKeywords: (keywords: string[]) =>
    `lesson:activities:keywords:${keywords.sort().join(",")}`,
  section: (id: string) => `lesson:section:${id}`,
  lesson: (id: string) => `lesson:lesson:${id}`,
  subject: (id: string) => `lesson:subject:${id}`,
  grade: (id: string) => `lesson:grade:${id}`,
  book: (id: string) => `lesson:book:${id}`,
};
