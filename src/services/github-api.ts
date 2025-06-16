import type { GitHubReadmeResponse } from '../types/index.js';
import { NetworkError, RateLimitError } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/error-handler.js';
import { cache, CacheKeys } from './cache.js';

export class GitHubAPI {
  private readonly baseUrl: string;
  private readonly requestTimeout: number;
  private readonly token?: string;

  constructor() {
    this.baseUrl = 'https://api.github.com';
    this.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
    this.token = process.env.GITHUB_TOKEN;
    
    if (!this.token) {
      logger.warn('No GitHub token provided. Rate limits may be lower.');
    }
  }

  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    const headers: Record<string, string> = {
      'User-Agent': 'cocoapods-package-readme-mcp-server/0.1.0',
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers as Record<string, string>,
    };

    if (this.token) {
      headers['Authorization'] = `token ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
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

  private handleRateLimit(response: Response): void {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    
    if (remaining === '0' && reset) {
      const resetTime = parseInt(reset, 10) * 1000;
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      throw new RateLimitError('GitHub API', retryAfter);
    }
  }

  async getReadme(owner: string, repo: string): Promise<string | null> {
    logger.info(`Fetching README from GitHub: ${owner}/${repo}`);

    // Check cache first
    const cacheKey = CacheKeys.githubReadme(owner, repo);
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      logger.debug(`Using cached README for: ${owner}/${repo}`);
      return cached;
    }

    const url = `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`;
    
    return withRetry(async () => {
      logger.debug(`Making GitHub API request to: ${url}`);
      const response = await this.fetchWithTimeout(url);

      if (response.status === 404) {
        logger.info(`README not found for: ${owner}/${repo}`);
        return null;
      }

      if (response.status === 403) {
        this.handleRateLimit(response);
        throw new RateLimitError('GitHub API');
      }

      if (!response.ok) {
        throw new NetworkError(`GitHub API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as GitHubReadmeResponse;
      
      // Decode base64 content
      const readmeContent = Buffer.from(data.content, 'base64').toString('utf-8');
      
      // Cache the result
      cache.set(cacheKey, readmeContent);
      
      logger.info(`Successfully fetched README for: ${owner}/${repo}`);
      return readmeContent;
    });
  }

  async getReadmeRaw(owner: string, repo: string): Promise<string | null> {
    logger.info(`Fetching raw README from GitHub: ${owner}/${repo}`);

    // Check cache first
    const cacheKey = CacheKeys.githubReadme(owner, repo);
    const cached = cache.get<string>(cacheKey);
    if (cached) {
      logger.debug(`Using cached README for: ${owner}/${repo}`);
      return cached;
    }

    // Try different README file names
    const readmeFiles = ['README.md', 'readme.md', 'README.rst', 'README.txt', 'README'];
    
    for (const filename of readmeFiles) {
      const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/HEAD/${filename}`;
      
      try {
        const response = await this.fetchWithTimeout(url);
        
        if (response.ok) {
          const content = await response.text();
          
          // Cache the result
          cache.set(cacheKey, content);
          
          logger.info(`Successfully fetched raw README (${filename}) for: ${owner}/${repo}`);
          return content;
        }
      } catch (error) {
        logger.debug(`Failed to fetch ${filename} for ${owner}/${repo}:`, { error });
        continue;
      }
    }

    logger.info(`No README found for: ${owner}/${repo}`);
    return null;
  }

  async getRepositoryInfo(owner: string, repo: string): Promise<any> {
    logger.info(`Fetching repository info from GitHub: ${owner}/${repo}`);

    const url = `${this.baseUrl}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    
    return withRetry(async () => {
      logger.debug(`Making GitHub API request to: ${url}`);
      const response = await this.fetchWithTimeout(url);

      if (response.status === 404) {
        logger.info(`Repository not found: ${owner}/${repo}`);
        return null;
      }

      if (response.status === 403) {
        this.handleRateLimit(response);
        throw new RateLimitError('GitHub API');
      }

      if (!response.ok) {
        throw new NetworkError(`GitHub API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      logger.info(`Successfully fetched repository info for: ${owner}/${repo}`);
      return data;
    });
  }

  async checkRateLimit(): Promise<{ remaining: number; reset: number; limit: number }> {
    const url = `${this.baseUrl}/rate_limit`;
    
    const response = await this.fetchWithTimeout(url);
    
    if (!response.ok) {
      throw new NetworkError(`GitHub API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.rate;
  }
}

export const githubAPI = new GitHubAPI();