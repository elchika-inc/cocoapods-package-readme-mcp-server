import { PackageReadmeMcpError, NetworkError, RateLimitError } from '../types/index.js';
import { logger } from './logger.js';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableStatusCodes: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
};

export function isRetryableError(error: unknown): boolean {
  if (error instanceof PackageReadmeMcpError) {
    return error.statusCode !== undefined && 
           DEFAULT_RETRY_CONFIG.retryableStatusCodes.includes(error.statusCode);
  }
  
  // Network errors are retryable
  if (error instanceof NetworkError) {
    return true;
  }
  
  return false;
}

export function calculateDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
  const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5);
  return Math.min(jitteredDelay, config.maxDelay);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt > config.maxRetries) {
        logger.error(`Operation failed after ${config.maxRetries} retries`, { error });
        throw error;
      }
      
      if (!isRetryableError(error)) {
        logger.debug('Error is not retryable, throwing immediately', { error });
        throw error;
      }
      
      const delay = calculateDelay(attempt, config);
      logger.warn(`Operation failed, retrying in ${delay}ms (attempt ${attempt}/${config.maxRetries})`, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

export function createNetworkError(message: string, originalError?: Error): NetworkError {
  logger.debug('Creating network error', { message, originalError });
  return new NetworkError(message, originalError);
}

export function createRateLimitError(service: string, retryAfter?: number): RateLimitError {
  logger.warn('Rate limit exceeded', { service, retryAfter });
  return new RateLimitError(service, retryAfter);
}

export function handleHttpError(response: Response, context: string): PackageReadmeMcpError {
  const message = `HTTP ${response.status} ${response.statusText} while ${context}`;
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after');
    const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
    return createRateLimitError(context, retryAfterSeconds);
  }
  
  if (response.status >= 500) {
    return createNetworkError(message);
  }
  
  return new NetworkError(message);
}