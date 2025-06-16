import type { 
  GetPackageInfoParams, 
  PackageInfoResponse, 
  DownloadStats,
  RepositoryInfo
} from '../types/index.js';
import { cocoaPodsAPI, CocoaPodsAPI } from '../services/cocoapods-api.js';
import { logger } from '../utils/logger.js';
import { validatePodName } from '../utils/validators.js';
import { PackageNotFoundError } from '../types/index.js';

export async function getPackageInfo(params: GetPackageInfoParams): Promise<PackageInfoResponse> {
  const { package_name, include_dependencies = true, include_dev_dependencies = false } = params;
  
  logger.info(`Getting package info for: ${package_name}`);

  // Validate inputs
  validatePodName(package_name);

  try {
    // Get pod info from CocoaPods API
    const podInfo = await cocoaPodsAPI.getPodInfo(package_name);
    
    // Extract author information
    let authorString = '';
    if (typeof podInfo.authors === 'string') {
      authorString = podInfo.authors;
    } else if (Array.isArray(podInfo.authors)) {
      authorString = podInfo.authors.join(', ');
    } else if (typeof podInfo.authors === 'object' && podInfo.authors !== null) {
      // Handle case where authors is an object like { "Name": "email@example.com" }
      authorString = Object.keys(podInfo.authors).join(', ');
    }

    // Extract license information
    let licenseString = '';
    if (typeof podInfo.license === 'string') {
      licenseString = podInfo.license;
    } else if (typeof podInfo.license === 'object' && podInfo.license !== null) {
      licenseString = podInfo.license.type || 'Unknown';
    }

    // Extract dependencies
    let dependencies: Record<string, string> | undefined;
    let devDependencies: Record<string, string> | undefined;

    if (include_dependencies && podInfo.dependencies) {
      dependencies = {};
      
      // CocoaPods dependencies structure can be complex
      // Handle different formats: string[], { name: version[] }
      for (const [depName, depVersions] of Object.entries(podInfo.dependencies)) {
        if (Array.isArray(depVersions) && depVersions.length > 0) {
          // Use the first version constraint
          dependencies[depName] = depVersions[0];
        } else if (typeof depVersions === 'string') {
          dependencies[depName] = depVersions;
        } else {
          dependencies[depName] = '*';
        }
      }
    }

    if (include_dev_dependencies && podInfo.testspecs) {
      devDependencies = {};
      
      // Extract dependencies from test specs
      for (const testspec of podInfo.testspecs) {
        if (testspec.dependencies) {
          for (const [depName, depVersions] of Object.entries(testspec.dependencies)) {
            if (Array.isArray(depVersions) && depVersions.length > 0) {
              devDependencies[depName] = depVersions[0];
            } else if (typeof depVersions === 'string') {
              devDependencies[depName] = depVersions;
            } else {
              devDependencies[depName] = '*';
            }
          }
        }
      }
    }

    // Get download stats (placeholder - CocoaPods doesn't provide this)
    const stats = await cocoaPodsAPI.getPodStatsPlaceholder(package_name);
    const downloadStats: DownloadStats = {
      last_day: stats.downloads,
      last_week: stats.downloads,
      last_month: stats.downloads,
    };

    // Build repository info
    const repoInfo = CocoaPodsAPI.extractRepositoryInfo(podInfo.source);
    const repository: RepositoryInfo | undefined = repoInfo ? {
      type: 'git',
      url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
    } : undefined;

    // Extract Swift versions
    const swiftVersions = Array.isArray(podInfo.swift_versions) 
      ? podInfo.swift_versions 
      : typeof podInfo.swift_versions === 'string' 
        ? [podInfo.swift_versions] 
        : undefined;

    const response: PackageInfoResponse = {
      package_name: package_name,
      latest_version: podInfo.version,
      description: podInfo.description || podInfo.summary || '',
      authors: authorString,
      license: licenseString,
      platforms: podInfo.platforms || {},
      swift_versions: swiftVersions,
      dependencies: dependencies,
      dev_dependencies: devDependencies,
      download_stats: downloadStats,
      repository,
      exists: true,
    };

    logger.info(`Successfully retrieved package info for: ${package_name}`);
    return response;

  } catch (error) {
    logger.error(`Failed to get package info for: ${package_name}`, { error });
    
    if (error instanceof PackageNotFoundError) {
      // Return exists: false response instead of throwing
      return {
        package_name: package_name,
        latest_version: '',
        description: '',
        authors: '',
        license: '',
        platforms: {},
        download_stats: { last_day: 0, last_week: 0, last_month: 0 },
        exists: false,
      };
    }
    
    throw new Error(`Failed to get package info: ${error instanceof Error ? error.message : String(error)}`);
  }
}