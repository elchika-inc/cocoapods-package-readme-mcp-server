/**
 * Response building utilities for CocoaPods package information
 */

import type { 
  PackageInfoResponse, 
  PackageReadmeResponse, 
  SearchPackagesResponse 
} from '../types/index.js';

/**
 * Builds a standard "package not found" response
 */
export function buildNotFoundResponse(packageName: string, version?: string): PackageInfoResponse {
  return {
    package_name: packageName,
    latest_version: version || 'unknown',
    description: 'Package not found',
    authors: 'Unknown',
    license: 'Unknown',
    platforms: {},
    download_stats: { 
      last_day: 0, 
      last_week: 0, 
      last_month: 0 
    },
    exists: false,
  };
}

/**
 * Builds a standard "README not found" response
 */
export function buildReadmeNotFoundResponse(packageName: string, version?: string): PackageReadmeResponse {
  return {
    package_name: packageName,
    version: version || 'latest',
    readme_content: '',
    description: 'Package or README not found',
    usage_examples: [],
    installation: { podfile: `pod '${packageName}'` },
    basic_info: {
      name: packageName,
      version: version || 'latest',
      description: 'Package not found',
      license: 'Unknown',
      authors: 'Unknown',
      platforms: {},
    },
    exists: false,
  };
}

/**
 * Builds a standard empty search response
 */
export function buildEmptySearchResponse(query: string): SearchPackagesResponse {
  return {
    packages: [],
    total: 0,
    query,
  };
}

/**
 * Builds download statistics with default values
 */
export function buildDownloadStats(data?: any): { last_day: number; last_week: number; last_month: number } {
  return {
    last_day: data?.last_day || 0,
    last_week: data?.last_week || 0,
    last_month: data?.last_month || 0,
  };
}