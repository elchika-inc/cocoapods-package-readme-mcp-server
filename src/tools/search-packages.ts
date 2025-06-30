import type { 
  SearchPackagesParams, 
  SearchPackagesResponse, 
  PackageSearchResult,
  RepositoryInfo
} from '../types/index.js';
import { cocoaPodsAPI, CocoaPodsMockService } from '../services/cocoapods-api.js';
import { logger } from '../utils/logger.js';
import { validateSearchQuery, validateLimit, validateScore, sanitizeSearchQuery } from '../utils/validators.js';

export async function searchPackages(params: SearchPackagesParams): Promise<SearchPackagesResponse> {
  const { query, limit = 20, quality, popularity } = params;
  
  logger.info(`Searching packages with query: "${query}", limit: ${limit}`);

  // Validate inputs
  validateSearchQuery(query);
  validateLimit(limit);
  
  if (quality !== undefined) {
    validateScore(quality, 'quality');
  }
  
  if (popularity !== undefined) {
    validateScore(popularity, 'popularity');
  }

  const sanitizedQuery = sanitizeSearchQuery(query);
  
  try {
    // Search pods using CocoaPods API
    const searchResults = await cocoaPodsAPI.searchPods(sanitizedQuery, limit);
    
    // Transform results to match our interface
    const packages: PackageSearchResult[] = searchResults.pods.map(pod => {
      // Extract author information
      let authorString = '';
      if (typeof pod.authors === 'string') {
        authorString = pod.authors;
      } else if (typeof pod.authors === 'object' && pod.authors !== null) {
        authorString = Object.keys(pod.authors).join(', ');
      }

      // Extract license information
      let licenseString = '';
      if (typeof pod.license === 'string') {
        licenseString = pod.license;
      } else if (typeof pod.license === 'object' && pod.license !== null) {
        licenseString = pod.license.type || 'Unknown';
      }

      // Build repository info
      let repository: RepositoryInfo | undefined;
      if (pod.source?.git) {
        const repoInfo = CocoaPodsMockService.extractRepositoryInfo({ git: pod.source.git });
        if (repoInfo) {
          repository = {
            type: 'git',
            url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
          };
        }
      }

      // Calculate a simple score (CocoaPods doesn't provide scores)
      // This is a placeholder - in a real implementation you might use:
      // - GitHub stars/forks
      // - Last update time
      // - Download statistics
      // - Community metrics
      const baseScore = Math.random() * 0.5 + 0.3; // Random score between 0.3-0.8
      const ageBonus = pod.pushed_at ? 
        Math.max(0, 1 - (Date.now() - new Date(pod.pushed_at).getTime()) / (365 * 24 * 60 * 60 * 1000)) * 0.2 : 0;
      
      const finalScore = Math.min(baseScore + ageBonus, 1);
      
      // Extract Swift versions
      const swiftVersions = Array.isArray(pod.swift_versions) 
        ? pod.swift_versions 
        : typeof pod.swift_versions === 'string' 
          ? [pod.swift_versions] 
          : undefined;

      const result: PackageSearchResult = {
        name: pod.name,
        version: pod.version,
        description: pod.description || pod.summary || '',
        summary: pod.summary,
        homepage: pod.homepage,
        authors: authorString,
        source: repository,
        platforms: pod.platforms || {},
        license: licenseString,
        swift_versions: swiftVersions,
        score: {
          final: finalScore,
          detail: {
            quality: Math.max(0.1, finalScore - 0.1),
            popularity: Math.max(0.1, finalScore - 0.2),
            maintenance: Math.max(0.1, finalScore + 0.1),
          },
        },
        searchScore: finalScore,
      };

      return result;
    });

    // Apply quality and popularity filters if specified
    let filteredPackages = packages;
    
    if (quality !== undefined) {
      filteredPackages = filteredPackages.filter(pkg => pkg.score.detail.quality >= quality);
    }
    
    if (popularity !== undefined) {
      filteredPackages = filteredPackages.filter(pkg => pkg.score.detail.popularity >= popularity);
    }

    // Sort by search score (descending)
    filteredPackages.sort((a, b) => b.searchScore - a.searchScore);

    const response: SearchPackagesResponse = {
      query: sanitizedQuery,
      total: searchResults.total,
      packages: filteredPackages,
    };

    logger.info(`Search completed: ${filteredPackages.length} packages found for query "${sanitizedQuery}"`);
    return response;

  } catch (error) {
    logger.error(`Failed to search packages with query: "${query}"`, { error });
    throw new Error(`Failed to search packages: ${error instanceof Error ? error.message : String(error)}`);
  }
}