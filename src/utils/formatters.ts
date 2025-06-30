/**
 * Common data formatting utilities for CocoaPods package information
 */

export interface AuthorInfo {
  name?: string;
  email?: string;
  [key: string]: any;
}

export interface RepositoryInfo {
  type: string;
  url: string;
  directory?: string;
}

/**
 * Formats author information into a consistent string format
 */
export function formatAuthorInfo(authorData: any, emailField?: string): string {
  if (!authorData) return 'Unknown';
  
  if (typeof authorData === 'string') {
    return authorData;
  }
  
  if (typeof authorData === 'object') {
    let result = authorData.name || 'Unknown';
    const email = authorData.email || emailField;
    if (email) {
      result += ` <${email}>`;
    }
    return result;
  }
  
  return 'Unknown';
}

/**
 * Builds repository information from various source formats
 */
export function buildRepositoryInfo(repoData: any, urlMappings?: Record<string, string>): RepositoryInfo | undefined {
  if (!repoData && !urlMappings) return undefined;
  
  // Direct repository object
  if (repoData?.type && repoData?.url) {
    return {
      type: repoData.type,
      url: repoData.url,
      directory: repoData.directory,
    };
  }
  
  // URL mappings (for project_urls style)
  if (urlMappings) {
    const repoKeys = ['Repository', 'Source', 'Source Code', 'Code', 'GitHub', 'GitLab', 'Bitbucket'];
    for (const key of repoKeys) {
      if (urlMappings[key]) {
        return {
          type: 'git',
          url: urlMappings[key],
        };
      }
    }
  }
  
  return undefined;
}

/**
 * Formats license information from various formats
 */
export function formatLicenseInfo(licenseData: any): string {
  if (!licenseData) return 'Unknown';
  
  if (typeof licenseData === 'string') {
    return licenseData;
  }
  
  if (typeof licenseData === 'object') {
    return licenseData.name || licenseData.type || 'Unknown';
  }
  
  return 'Unknown';
}

/**
 * Normalizes keywords/tags array
 */
export function normalizeKeywords(keywords: any): string[] {
  if (!keywords) return [];
  
  if (Array.isArray(keywords)) {
    return keywords
      .filter(k => k && typeof k === 'string')
      .map(k => k.trim())
      .filter(k => k.length > 0);
  }
  
  if (typeof keywords === 'string') {
    return keywords.split(/[,\s]+/)
      .map(k => k.trim())
      .filter(k => k.length > 0);
  }
  
  return [];
}

/**
 * Formats dependencies object for display
 */
export function formatDependencies(deps: any): Record<string, string> {
  if (!deps || typeof deps !== 'object') return {};
  
  const formatted: Record<string, string> = {};
  
  for (const [name, version] of Object.entries(deps)) {
    if (name && version) {
      formatted[name] = String(version);
    }
  }
  
  return formatted;
}

/**
 * Formats CocoaPods authors information
 */
export function formatCocoaPodsAuthors(authors: any): string {
  if (!authors) return 'Unknown';
  
  if (typeof authors === 'string') {
    return authors;
  }
  
  if (Array.isArray(authors)) {
    return authors.join(', ');
  }
  
  if (typeof authors === 'object') {
    // Handle case where authors is an object like { "Name": "email@example.com" }
    return Object.keys(authors).join(', ');
  }
  
  return 'Unknown';
}

/**
 * Formats CocoaPods dependencies structure
 */
export function formatCocoaPodsDependencies(deps: any): Record<string, string> | undefined {
  if (!deps || typeof deps !== 'object') return undefined;
  
  const dependencies: Record<string, string> = {};
  
  // CocoaPods dependencies structure can be complex
  // Handle different formats: string[], { name: version[] }
  for (const [depName, depVersions] of Object.entries(deps)) {
    if (Array.isArray(depVersions) && depVersions.length > 0) {
      // Use the first version constraint
      dependencies[depName] = depVersions[0];
    } else if (typeof depVersions === 'string') {
      dependencies[depName] = depVersions;
    } else {
      dependencies[depName] = '*';
    }
  }
  
  return Object.keys(dependencies).length > 0 ? dependencies : undefined;
}

/**
 * Formats CocoaPods test dependencies from testspecs
 */
export function formatCocoaPodsTestDependencies(testspecs: any): Record<string, string> | undefined {
  if (!testspecs || !Array.isArray(testspecs)) return undefined;
  
  const devDependencies: Record<string, string> = {};
  
  // Extract dependencies from test specs
  for (const testspec of testspecs) {
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
  
  return Object.keys(devDependencies).length > 0 ? devDependencies : undefined;
}