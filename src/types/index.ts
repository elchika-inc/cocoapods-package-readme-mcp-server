export interface UsageExample {
  title: string;
  description?: string | undefined;
  code: string;
  language: string; // 'swift', 'objective-c', 'ruby', 'bash', etc.
}

export interface InstallationInfo {
  podfile: string;      // "pod 'PodName'"
  carthage?: string;    // "github \"owner/repo\""
  spm?: string;        // "Swift Package Manager URL"
}

export interface AuthorInfo {
  name: string;
  email?: string;
  url?: string;
}

export interface RepositoryInfo {
  type: string;
  url: string;
  directory?: string | undefined;
}

export interface PackageBasicInfo {
  name: string;
  version: string;
  description: string;
  summary?: string | undefined;
  homepage?: string | undefined;
  source?: RepositoryInfo | undefined;
  license: string | { type: string; file?: string; text?: string };
  authors: string | AuthorInfo | AuthorInfo[];
  platforms: Record<string, string>; // { "ios": "11.0", "osx": "10.13" }
  swift_versions?: string[] | undefined;
}

export interface DownloadStats {
  last_day: number;
  last_week: number;  
  last_month: number;
}

export interface PackageSearchResult {
  name: string;
  version: string;
  description: string;
  summary: string;
  homepage?: string;
  authors: string;
  source?: RepositoryInfo;
  platforms: Record<string, string>;
  license?: string;
  swift_versions?: string[];
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;
      maintenance: number;
    };
  };
  searchScore: number;
}

// Tool Parameters
export interface GetPackageReadmeParams {
  package_name: string;    // Pod name (required)
  version?: string;        // Version specification (optional, default: "latest")
  include_examples?: boolean; // Whether to include examples (optional, default: true)
}

export interface GetPackageInfoParams {
  package_name: string;
  include_dependencies?: boolean; // Whether to include dependencies (default: true)
  include_dev_dependencies?: boolean; // Whether to include test dependencies (default: false)
}

export interface SearchPackagesParams {
  query: string;          // Search query
  limit?: number;         // Max number of results (default: 20)
  quality?: number;       // Min quality score (0-1)
  popularity?: number;    // Min popularity score (0-1)
}

// Tool Responses
export interface PackageReadmeResponse {
  package_name: string;
  version: string;
  description: string;
  readme_content: string;
  usage_examples: UsageExample[];
  installation: InstallationInfo;
  basic_info: PackageBasicInfo;
  repository?: RepositoryInfo | undefined;
  exists: boolean;
}

export interface PackageInfoResponse {
  package_name: string;
  latest_version: string;
  description: string;
  authors: string;
  license: string;
  platforms: Record<string, string>;
  swift_versions?: string[];
  dependencies?: Record<string, string> | undefined;
  dev_dependencies?: Record<string, string> | undefined;
  download_stats: DownloadStats;
  repository?: RepositoryInfo | undefined;
  exists: boolean;
}

export interface SearchPackagesResponse {
  query: string;
  total: number;
  packages: PackageSearchResult[];
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

// CocoaPods API Types
export interface CocoaPodsPackageInfo {
  name: string;
  version: string;
  summary: string;
  description?: string;
  homepage?: string;
  documentation_url?: string;
  source: {
    git: string;
    tag?: string;
    commit?: string;
    branch?: string;
  };
  authors: string | Record<string, string> | string[];
  license: string | { type: string; file?: string; text?: string };
  platforms: Record<string, string>;
  swift_versions?: string | string[];
  dependencies?: Record<string, string[]>;
  testspecs?: Array<{
    name: string;
    dependencies?: Record<string, string[]>;
  }>;
  subspecs?: Array<{
    name: string;
    dependencies?: Record<string, string[]>;
  }>;
  pushed_at: string;
  created_at: string;
  updated_at: string;
}

export interface CocoaPodsSearchResponse {
  pods: Array<{
    name: string;
    version: string;
    summary: string;
    description?: string;
    homepage?: string;
    source?: {
      git: string;
    };
    authors?: string | Record<string, string>;
    license?: string | { type: string };
    platforms?: Record<string, string>;
    swift_versions?: string | string[];
    pushed_at: string;
    created_at: string;
  }>;
  total: number;
}

// GitHub API Types
export interface GitHubReadmeResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content: string;
  encoding: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

// Error Types
export class PackageReadmeMcpError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PackageReadmeMcpError';
  }
}

export class PackageNotFoundError extends PackageReadmeMcpError {
  constructor(packageName: string) {
    super(`Pod '${packageName}' not found`, 'PACKAGE_NOT_FOUND', 404);
  }
}

export class VersionNotFoundError extends PackageReadmeMcpError {
  constructor(packageName: string, version: string) {
    super(`Version '${version}' of pod '${packageName}' not found`, 'VERSION_NOT_FOUND', 404);
  }
}

export class RateLimitError extends PackageReadmeMcpError {
  constructor(service: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${service}`, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
  }
}

export class NetworkError extends PackageReadmeMcpError {
  constructor(message: string, originalError?: Error) {
    super(`Network error: ${message}`, 'NETWORK_ERROR', undefined, originalError);
  }
}