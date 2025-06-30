import type { 
  GetPackageInfoParams, 
  PackageInfoResponse, 
  DownloadStats,
  RepositoryInfo
} from '../types/index.js';
import { cocoaPodsAPI, CocoaPodsMockService } from '../services/cocoapods-api.js';
import { logger } from '../utils/logger.js';
import { validatePodName } from '../utils/validators.js';
import { PackageNotFoundError } from '../types/index.js';
import { formatCocoaPodsAuthors, formatLicenseInfo, formatCocoaPodsDependencies, formatCocoaPodsTestDependencies, buildRepositoryInfo } from '../utils/formatters.js';
import { buildNotFoundResponse, buildDownloadStats } from '../utils/response-builder.js';

export async function getPackageInfo(params: GetPackageInfoParams): Promise<PackageInfoResponse> {
  const { package_name, include_dependencies = true, include_dev_dependencies = false } = params;
  
  logger.info(`Getting package info for: ${package_name}`);

  // Validate inputs
  validatePodName(package_name);

  try {
    // Get pod info from CocoaPods API
    const podInfo = await cocoaPodsAPI.getPodInfo(package_name);
    
    const authorString = formatCocoaPodsAuthors(podInfo.authors);
    const licenseString = formatLicenseInfo(podInfo.license);

    const dependencies = include_dependencies 
      ? formatCocoaPodsDependencies(podInfo.dependencies) 
      : undefined;
    
    const devDependencies = include_dev_dependencies 
      ? formatCocoaPodsTestDependencies(podInfo.testspecs) 
      : undefined;

    const stats = await cocoaPodsAPI.getPodStatsPlaceholder(package_name);
    const downloadStats = buildDownloadStats(stats);

    const repoInfo = CocoaPodsMockService.extractRepositoryInfo(podInfo.source);
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
      return buildNotFoundResponse(package_name);
    }
    
    throw new Error(`Failed to get package info: ${error instanceof Error ? error.message : String(error)}`);
  }
}