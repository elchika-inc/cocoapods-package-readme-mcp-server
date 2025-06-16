import { PackageReadmeMcpError } from '../types/index.js';

export function validatePodName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new PackageReadmeMcpError('Pod name is required and must be a string', 'INVALID_PACKAGE_NAME');
  }
  
  // CocoaPods pod names can contain letters, numbers, underscores, and hyphens
  // They should not start with a hyphen or underscore
  const podNameRegex = /^[a-zA-Z][a-zA-Z0-9_-]*$/;
  
  if (!podNameRegex.test(name)) {
    throw new PackageReadmeMcpError(
      'Invalid pod name format. Pod names must start with a letter and contain only letters, numbers, underscores, and hyphens',
      'INVALID_PACKAGE_NAME'
    );
  }
  
  if (name.length > 214) {
    throw new PackageReadmeMcpError('Pod name must be 214 characters or less', 'INVALID_PACKAGE_NAME');
  }
}

export function validateVersion(version: string): void {
  if (!version || typeof version !== 'string') {
    throw new PackageReadmeMcpError('Version must be a string', 'INVALID_VERSION');
  }
  
  // CocoaPods uses semantic versioning
  // Allow "latest" as a special case
  if (version === 'latest') {
    return;
  }
  
  // Basic semantic version pattern (simplified)
  const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:[-+][a-zA-Z0-9.-]+)?$/;
  
  if (!versionRegex.test(version)) {
    throw new PackageReadmeMcpError(
      'Invalid version format. Expected semantic version (e.g., "1.0.0") or "latest"',
      'INVALID_VERSION'
    );
  }
}

export function validateSearchQuery(query: string): void {
  if (!query || typeof query !== 'string') {
    throw new PackageReadmeMcpError('Search query is required and must be a string', 'INVALID_SEARCH_QUERY');
  }
  
  if (query.trim().length === 0) {
    throw new PackageReadmeMcpError('Search query cannot be empty', 'INVALID_SEARCH_QUERY');
  }
  
  if (query.length > 500) {
    throw new PackageReadmeMcpError('Search query must be 500 characters or less', 'INVALID_SEARCH_QUERY');
  }
}

export function validateLimit(limit: number): void {
  if (typeof limit !== 'number' || isNaN(limit)) {
    throw new PackageReadmeMcpError('Limit must be a number', 'INVALID_LIMIT');
  }
  
  if (limit < 1 || limit > 250) {
    throw new PackageReadmeMcpError('Limit must be between 1 and 250', 'INVALID_LIMIT');
  }
}

export function validateScore(score: number, fieldName: string): void {
  if (typeof score !== 'number' || isNaN(score)) {
    throw new PackageReadmeMcpError(`${fieldName} must be a number`, 'INVALID_SCORE');
  }
  
  if (score < 0 || score > 1) {
    throw new PackageReadmeMcpError(`${fieldName} must be between 0 and 1`, 'INVALID_SCORE');
  }
}

export function sanitizeSearchQuery(query: string): string {
  // Remove potentially dangerous characters and normalize whitespace
  return query
    .replace(/[<>\"'&]/g, '') // Remove HTML/XML dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}