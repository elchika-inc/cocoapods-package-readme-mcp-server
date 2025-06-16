import type { CacheEntry, CacheOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtl: number;
  private readonly maxSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: CacheOptions = {}) {
    this.defaultTtl = options.ttl || 3600000; // 1 hour in milliseconds
    this.maxSize = options.maxSize || 1000; // Max 1000 entries
    
    // Start cleanup interval to remove expired entries
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanExpired();
    }, 300000); // Clean every 5 minutes
  }

  private cleanExpired(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      logger.debug(`Cache cleanup removed ${removedCount} expired entries`);
    }
  }

  private evictOldest(): void {
    // Simple LRU: remove oldest entry based on timestamp
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
      logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    };
    
    this.cache.set(key, entry as CacheEntry<unknown>);
    logger.debug(`Cache set: ${key} (TTL: ${entry.ttl}ms)`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      logger.debug(`Cache miss: ${key}`);
      return null;
    }
    
    const now = Date.now();
    
    // Check if entry has expired
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      logger.debug(`Cache expired: ${key}`);
      return null;
    }
    
    logger.debug(`Cache hit: ${key}`);
    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    const now = Date.now();
    
    // Check if entry has expired
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache delete: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Cache cleared: ${size} entries removed`);
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  getStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
    logger.info('Cache destroyed');
  }
}

// Default cache instance
export const cache = new MemoryCache({
  ttl: parseInt(process.env.CACHE_TTL || '3600000', 10), // 1 hour
  maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000', 10),
});

// Cache key generators
export const CacheKeys = {
  podInfo: (podName: string): string => `pod_info:${podName}`,
  podReadme: (podName: string, version: string): string => `pod_readme:${podName}:${version}`,
  searchResults: (query: string, limit: number): string => {
    const queryHash = Buffer.from(query).toString('base64').slice(0, 16);
    return `search:${queryHash}:${limit}`;
  },
  downloadStats: (podName: string): string => {
    const today = new Date().toISOString().split('T')[0];
    return `stats:${podName}:${today}`;
  },
  githubReadme: (owner: string, repo: string): string => `github_readme:${owner}:${repo}`,
} as const;