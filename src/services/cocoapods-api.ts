import type { CocoaPodsPackageInfo, CocoaPodsSearchResponse } from '../types/index.js';
import { PackageNotFoundError, NetworkError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { withRetry, handleHttpError } from '../utils/error-handler.js';
import { cache, CacheKeys } from './cache.js';

export class CocoaPodsAPI {
  private readonly baseUrl: string;
  private readonly requestTimeout: number;

  constructor() {
    this.baseUrl = 'https://cocoapods.org/api/v1';
    this.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'cocoapods-package-readme-mcp-server/0.1.0',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new NetworkError(`Request timeout after ${this.requestTimeout}ms`);
      }
      
      throw new NetworkError(`Network request failed: ${error instanceof Error ? error.message : String(error)}`, error as Error);
    }
  }

  async getPodInfo(podName: string): Promise<CocoaPodsPackageInfo> {
    logger.info(`Fetching pod info for: ${podName}`);

    // Check cache first
    const cacheKey = CacheKeys.podInfo(podName);
    const cached = cache.get<CocoaPodsPackageInfo>(cacheKey);
    if (cached) {
      logger.debug(`Using cached pod info for: ${podName}`);
      return cached;
    }

    const url = `${this.baseUrl}/pods/${encodeURIComponent(podName)}`;
    
    return withRetry(async () => {
      logger.debug(`Making API request to: ${url}`);
      const response = await this.fetchWithTimeout(url);

      if (response.status === 404) {
        throw new PackageNotFoundError(podName);
      }

      if (!response.ok) {
        throw handleHttpError(response, `fetching pod info for ${podName}`);
      }

      const data = await response.json() as CocoaPodsPackageInfo;
      
      // Cache the result
      cache.set(cacheKey, data);
      
      logger.info(`Successfully fetched pod info for: ${podName}`);
      return data;
    });
  }

  async searchPods(query: string, limit: number = 20): Promise<CocoaPodsSearchResponse> {
    logger.info(`Searching pods with query: "${query}", limit: ${limit}`);

    // Check cache first
    const cacheKey = CacheKeys.searchResults(query, limit);
    const cached = cache.get<CocoaPodsSearchResponse>(cacheKey);
    if (cached) {
      logger.debug(`Using cached search results for query: ${query}`);
      return cached;
    }

    const params = new URLSearchParams({
      query: query.trim(),
      amount: limit.toString(),
    });

    const url = `${this.baseUrl}/search?${params.toString()}`;
    
    return withRetry(async () => {
      logger.debug(`Making search API request to: ${url}`);
      const response = await this.fetchWithTimeout(url, {
        method: 'GET',
      });

      if (!response.ok) {
        throw handleHttpError(response, `searching pods with query "${query}"`);
      }

      const data = await response.json() as CocoaPodsSearchResponse;
      
      // Cache the result (with shorter TTL for search results)
      cache.set(cacheKey, data, 600000); // 10 minutes
      
      logger.info(`Search completed: ${data.pods?.length || 0} pods found for query "${query}"`);
      return data;
    });
  }

  async getPodVersions(podName: string): Promise<string[]> {
    logger.info(`Fetching versions for pod: ${podName}`);
    
    // CocoaPods API doesn't have a dedicated versions endpoint
    // We get versions from the main pod info
    const podInfo = await this.getPodInfo(podName);
    
    // The main response contains the latest version
    // For comprehensive version list, we'd need to use the Specs repo or other endpoints
    // For now, return the current version
    return [podInfo.version];
  }

  async getPodStatsPlaceholder(podName: string): Promise<{ downloads: number }> {
    // CocoaPods doesn't provide download statistics via their public API
    // This is a placeholder that returns mock data
    // In a real implementation, you might integrate with:
    // - GitHub API for star/fork counts
    // - Custom analytics if available
    // - Pod popularity metrics from other sources
    
    logger.debug(`Getting placeholder stats for pod: ${podName}`);
    
    const cacheKey = CacheKeys.downloadStats(podName);
    const cached = cache.get<{ downloads: number }>(cacheKey);
    if (cached) {
      return cached;
    }

    // Return mock data for now
    const stats = { downloads: 0 };
    
    // Cache for a shorter period since this is mock data
    cache.set(cacheKey, stats, 300000); // 5 minutes
    
    return stats;
  }

  // Helper method to extract repository info from source
  static extractRepositoryInfo(source: CocoaPodsPackageInfo['source']): { owner: string; repo: string } | null {
    if (!source?.git) {
      return null;
    }

    try {
      const url = new URL(source.git);
      const pathParts = url.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
      
      if (pathParts.length >= 2) {
        return {
          owner: pathParts[0],
          repo: pathParts[1],
        };
      }
    } catch (error) {
      logger.debug(`Failed to parse repository URL: ${source.git}`, { error });
    }

    return null;
  }
}

export const cocoaPodsAPI = new CocoaPodsAPI();