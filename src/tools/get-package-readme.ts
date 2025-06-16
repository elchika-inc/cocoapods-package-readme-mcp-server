import type { 
  GetPackageReadmeParams, 
  PackageReadmeResponse, 
  UsageExample,
  InstallationInfo,
  PackageBasicInfo,
  RepositoryInfo
} from '../types/index.js';
import { cocoaPodsAPI, CocoaPodsAPI } from '../services/cocoapods-api.js';
import { githubAPI } from '../services/github-api.js';
import { ReadmeParser } from '../services/readme-parser.js';
import { logger } from '../utils/logger.js';
import { validatePodName, validateVersion } from '../utils/validators.js';
import { PackageNotFoundError, VersionNotFoundError } from '../types/index.js';
import { searchPackages } from './search-packages.js';

export async function getPackageReadme(params: GetPackageReadmeParams): Promise<PackageReadmeResponse> {
  const { package_name, version = 'latest', include_examples = true } = params;
  
  logger.info(`Getting package README for: ${package_name}@${version}`);

  // Validate inputs
  validatePodName(package_name);
  if (version !== 'latest') {
    validateVersion(version);
  }

  try {
    // First, search to verify package exists
    logger.debug(`Searching for package existence: ${package_name}`);
    const searchResult = await searchPackages({ query: package_name, limit: 10 });
    
    // Check if the exact package name exists in search results
    const exactMatch = searchResult.packages.find((pod: any) => pod.name === package_name);
    if (!exactMatch) {
      throw new Error(`Package '${package_name}' not found in CocoaPods registry`);
    }
    
    logger.debug(`Package found in search results: ${package_name}`);

    // Get pod info from CocoaPods API
    const podInfo = await cocoaPodsAPI.getPodInfo(package_name);
    
    // Verify version if not latest
    if (version !== 'latest' && podInfo.version !== version) {
      // For now, we only support the latest version since CocoaPods API returns single version
      // In a full implementation, you'd need to check the Specs repository
      logger.warn(`Specific version ${version} not available, using latest: ${podInfo.version}`);
    }

    // Extract repository info for README fetching
    const repoInfo = CocoaPodsAPI.extractRepositoryInfo(podInfo.source);
    let readmeContent = '';
    let usageExamples: UsageExample[] = [];

    if (repoInfo) {
      logger.debug(`Fetching README from GitHub: ${repoInfo.owner}/${repoInfo.repo}`);
      
      try {
        const readme = await githubAPI.getReadmeRaw(repoInfo.owner, repoInfo.repo);
        
        if (readme) {
          readmeContent = ReadmeParser.cleanReadmeContent(readme);
          
          if (include_examples) {
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
      logger.warn(`No repository information found for pod: ${package_name}`);
      readmeContent = podInfo.description || podInfo.summary || 'No README available';
    }

    // Build installation info
    const installation: InstallationInfo = {
      podfile: `pod '${package_name}'`,
    };

    // Add Carthage info if GitHub repo is available
    if (repoInfo) {
      installation.carthage = `github "${repoInfo.owner}/${repoInfo.repo}"`;
      installation.spm = `https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`;
    }

    // Extract additional installation instructions from README
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

    // Build basic info
    const basicInfo: PackageBasicInfo = {
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
      authors: typeof podInfo.authors === 'string' 
        ? podInfo.authors 
        : Array.isArray(podInfo.authors) 
          ? podInfo.authors.map(author => typeof author === 'string' ? { name: author } : author)
          : typeof podInfo.authors === 'object' && podInfo.authors !== null
            ? Object.entries(podInfo.authors as Record<string, string>).map(([name, email]) => ({ name, email }))
            : 'Unknown',
      platforms: podInfo.platforms || {},
      swift_versions: Array.isArray(podInfo.swift_versions) 
        ? podInfo.swift_versions 
        : typeof podInfo.swift_versions === 'string' 
          ? [podInfo.swift_versions] 
          : undefined,
    };

    // Build repository info
    const repository: RepositoryInfo | undefined = repoInfo ? {
      type: 'git',
      url: `https://github.com/${repoInfo.owner}/${repoInfo.repo}`,
    } : undefined;

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
      // Return exists: false response instead of throwing
      return {
        package_name: package_name,
        version: version || 'latest',
        description: '',
        readme_content: '',
        usage_examples: [],
        installation: { podfile: `pod '${package_name}'` },
        basic_info: {
          name: package_name,
          version: version || 'latest',
          description: '',
          license: '',
          authors: '',
          platforms: {},
        },
        exists: false,
      };
    }
    
    throw new Error(`Failed to get package README: ${error instanceof Error ? error.message : String(error)}`);
  }
}