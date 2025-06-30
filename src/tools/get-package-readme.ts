import type { 
  GetPackageReadmeParams, 
  PackageReadmeResponse, 
  UsageExample,
  InstallationInfo,
  PackageBasicInfo,
  RepositoryInfo,
  CocoaPodsPackageInfo
} from '../types/index.js';
import { cocoaPodsAPI, CocoaPodsMockService } from '../services/cocoapods-api.js';
import { githubAPI } from '../services/github-api.js';
import { ReadmeParser } from '../services/readme-parser.js';
import { logger } from '../utils/logger.js';
import { validatePodName, validateVersion } from '../utils/validators.js';
import { PackageNotFoundError, VersionNotFoundError } from '../types/index.js';
import { searchPackages } from './search-packages.js';
import { formatCocoaPodsAuthors, formatLicenseInfo, normalizeKeywords } from '../utils/formatters.js';
import { buildReadmeNotFoundResponse } from '../utils/response-builder.js';

async function verifyPackageExists(packageName: string): Promise<void> {
  logger.debug(`Searching for package existence: ${packageName}`);
  const searchResult = await searchPackages({ query: packageName, limit: 10 });
  
  const exactMatch = searchResult.packages.find((pod: any) => pod.name === packageName);
  if (!exactMatch) {
    throw new Error(`Package '${packageName}' not found in CocoaPods registry`);
  }
  
  logger.debug(`Package found in search results: ${packageName}`);
}

async function fetchPodInfo(packageName: string, version: string): Promise<CocoaPodsPackageInfo> {
  const podInfo = await cocoaPodsAPI.getPodInfo(packageName);
  
  if (version !== 'latest' && podInfo.version !== version) {
    logger.warn(`Specific version ${version} not available, using latest: ${podInfo.version}`);
  }
  
  return podInfo;
}

async function fetchReadmeContent(podInfo: CocoaPodsPackageInfo, includeExamples: boolean): Promise<{ content: string; examples: UsageExample[] }> {
  const repoInfo = CocoaPodsMockService.extractRepositoryInfo(podInfo.source);
  let readmeContent = '';
  let usageExamples: UsageExample[] = [];

  if (repoInfo) {
    logger.debug(`Fetching README from GitHub: ${repoInfo.owner}/${repoInfo.repo}`);
    
    try {
      const readme = await githubAPI.getReadmeRaw(repoInfo.owner, repoInfo.repo);
      
      if (readme) {
        readmeContent = ReadmeParser.cleanReadmeContent(readme);
        
        if (includeExamples) {
          usageExamples = ReadmeParser.parseUsageExamples(readme);
        }
      } else {
        logger.warn(`No README found for ${repoInfo.owner}/${repoInfo.repo}`);
        readmeContent = podInfo.description || podInfo.summary || 'No README available';
      }
    } catch (error) {
      logger.warn(`Failed to fetch README from GitHub: ${error instanceof Error ? error.message : String(error)}`);
      readmeContent = podInfo.description || podInfo.summary || 'README not available';
    }
  } else {
    logger.warn(`No repository information found for pod: ${podInfo.name}`);
    readmeContent = podInfo.description || podInfo.summary || 'No README available';
  }

  return { content: readmeContent, examples: usageExamples };
}

function buildInstallationInfo(podInfo: CocoaPodsPackageInfo, readmeContent: string): InstallationInfo {
  const repoInfo = CocoaPodsMockService.extractRepositoryInfo(podInfo.source);
  
  const installation: InstallationInfo = {
    podfile: `pod '${podInfo.name}'`,
  };

  if (repoInfo) {
    installation.carthage = `github "${repoInfo.owner}/${repoInfo.repo}"`;
    installation.spm = `https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`;
  }

  const readmeInstructions = ReadmeParser.extractInstallationInstructions(readmeContent);
  if (readmeInstructions.podfile) {
    installation.podfile = readmeInstructions.podfile;
  }
  if (readmeInstructions.carthage) {
    installation.carthage = readmeInstructions.carthage;
  }
  if (readmeInstructions.spm) {
    installation.spm = readmeInstructions.spm;
  }

  return installation;
}

function buildBasicInfo(podInfo: CocoaPodsPackageInfo): PackageBasicInfo {
  return {
    name: podInfo.name,
    version: podInfo.version,
    description: podInfo.description || podInfo.summary || '',
    summary: podInfo.summary,
    homepage: podInfo.homepage,
    source: podInfo.source ? {
      type: 'git',
      url: podInfo.source.git,
    } : undefined,
    license: podInfo.license,
    authors: formatCocoaPodsAuthors(podInfo.authors),
    platforms: podInfo.platforms || {},
    swift_versions: Array.isArray(podInfo.swift_versions) 
      ? podInfo.swift_versions 
      : typeof podInfo.swift_versions === 'string' 
        ? [podInfo.swift_versions] 
        : undefined,
  };
}

function buildRepositoryInfo(podInfo: CocoaPodsPackageInfo): RepositoryInfo | undefined {
  const repoInfo = CocoaPodsMockService.extractRepositoryInfo(podInfo.source);
  return repoInfo ? {
    type: 'git',
    url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
  } : undefined;
}

export async function getPackageReadme(params: GetPackageReadmeParams): Promise<PackageReadmeResponse> {
  const { package_name, version = 'latest', include_examples = true } = params;
  
  logger.info(`Getting package README for: ${package_name}@${version}`);

  // Validate inputs
  validatePodName(package_name);
  if (version !== 'latest') {
    validateVersion(version);
  }

  try {
    await verifyPackageExists(package_name);
    const podInfo = await fetchPodInfo(package_name, version);
    const { content: readmeContent, examples: usageExamples } = await fetchReadmeContent(podInfo, include_examples);
    
    const installation = buildInstallationInfo(podInfo, readmeContent);
    const basicInfo = buildBasicInfo(podInfo);
    const repository = buildRepositoryInfo(podInfo);

    const response: PackageReadmeResponse = {
      package_name: package_name,
      version: podInfo.version,
      description: podInfo.description || podInfo.summary || '',
      readme_content: readmeContent,
      usage_examples: usageExamples,
      installation,
      basic_info: basicInfo,
      repository,
      exists: true,
    };

    logger.info(`Successfully retrieved README for: ${package_name}@${podInfo.version}`);
    return response;

  } catch (error) {
    logger.error(`Failed to get package README for: ${package_name}`, { error });
    
    if (error instanceof PackageNotFoundError || error instanceof VersionNotFoundError) {
      return buildReadmeNotFoundResponse(package_name, version);
    }
    
    throw new Error(`Failed to get package README: ${error instanceof Error ? error.message : String(error)}`);
  }
}