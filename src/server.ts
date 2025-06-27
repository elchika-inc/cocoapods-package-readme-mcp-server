import { BasePackageServer, ToolDefinition, createLogger } from '@elchika-inc/package-readme-shared';
import { getPackageReadme } from './tools/get-package-readme.js';
import { getPackageInfo } from './tools/get-package-info.js';
import { searchPackages } from './tools/search-packages.js';
import {
  GetPackageReadmeParams,
  GetPackageInfoParams,
  SearchPackagesParams,
} from './types/index.js';

const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  get_readme_from_cocoapods: {
    name: 'get_readme_from_cocoapods',
    description: 'Get CocoaPods package README and usage examples',
    inputSchema: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description: 'The name of the CocoaPods package (pod)',
        },
        version: {
          type: 'string',
          description: 'The version of the package (default: "latest")',
          default: 'latest',
        },
        include_examples: {
          type: 'boolean',
          description: 'Whether to include usage examples (default: true)',
          default: true,
        }
      },
      required: ['package_name'],
    },
  },
  get_package_info_from_cocoapods: {
    name: 'get_package_info_from_cocoapods',
    description: 'Get CocoaPods package basic information and dependencies',
    inputSchema: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description: 'The name of the CocoaPods package (pod)',
        },
        include_dependencies: {
          type: 'boolean',
          description: 'Whether to include dependencies (default: true)',
          default: true,
        },
        include_dev_dependencies: {
          type: 'boolean',
          description: 'Whether to include test/development dependencies (default: false)',
          default: false,
        }
      },
      required: ['package_name'],
    },
  },
  search_packages_from_cocoapods: {
    name: 'search_packages_from_cocoapods',
    description: 'Search for CocoaPods packages',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20,
          minimum: 1,
          maximum: 250,
        },
        quality: {
          type: 'number',
          description: 'Minimum quality score (0-1)',
          minimum: 0,
          maximum: 1,
        },
        popularity: {
          type: 'number',
          description: 'Minimum popularity score (0-1)',
          minimum: 0,
          maximum: 1,
        }
      },
      required: ['query'],
    },
  },
} as const;

export class CocoaPodsPackageReadmeMcpServer extends BasePackageServer {
  protected logger = createLogger({ silent: true });

  constructor() {
    super({
      name: 'cocoapods-package-readme-mcp',
      version: '0.1.0',
    });
  }

  protected getToolDefinitions(): Record<string, ToolDefinition> {
    return TOOL_DEFINITIONS;
  }

  protected async handleToolCall(name: string, args: unknown): Promise<unknown> {
    try {
      switch (name) {
        case 'get_readme_from_cocoapods':
          return await getPackageReadme(this.validateGetPackageReadmeParams(args));
        
        case 'get_package_info_from_cocoapods':
          return await getPackageInfo(this.validateGetPackageInfoParams(args));
        
        case 'search_packages_from_cocoapods':
          return await searchPackages(this.validateSearchPackagesParams(args));
        
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      // Log error for debugging but let the base class handle MCP error formatting
      this.logger.error(`Tool execution failed: ${name}`, { error: String(error) });
      throw error;
    }
  }

  private validateGetPackageReadmeParams(args: unknown): GetPackageReadmeParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const params = args as Record<string, unknown>;

    if (!params.package_name || typeof params.package_name !== 'string') {
      throw new Error('package_name is required and must be a string');
    }

    const result: GetPackageReadmeParams = {
      package_name: params.package_name,
    };
    
    if (params.version !== undefined) {
      if (typeof params.version !== 'string') {
        throw new Error('version must be a string');
      }
      result.version = params.version;
    }
    
    if (params.include_examples !== undefined) {
      if (typeof params.include_examples !== 'boolean') {
        throw new Error('include_examples must be a boolean');
      }
      result.include_examples = params.include_examples;
    }
    
    return result;
  }

  private validateGetPackageInfoParams(args: unknown): GetPackageInfoParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const params = args as Record<string, unknown>;

    if (!params.package_name || typeof params.package_name !== 'string') {
      throw new Error('package_name is required and must be a string');
    }

    const result: GetPackageInfoParams = {
      package_name: params.package_name,
    };
    
    if (params.include_dependencies !== undefined) {
      if (typeof params.include_dependencies !== 'boolean') {
        throw new Error('include_dependencies must be a boolean');
      }
      result.include_dependencies = params.include_dependencies;
    }
    
    if (params.include_dev_dependencies !== undefined) {
      if (typeof params.include_dev_dependencies !== 'boolean') {
        throw new Error('include_dev_dependencies must be a boolean');
      }
      result.include_dev_dependencies = params.include_dev_dependencies;
    }
    
    return result;
  }

  private validateSearchPackagesParams(args: unknown): SearchPackagesParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const params = args as Record<string, unknown>;

    if (!params.query || typeof params.query !== 'string') {
      throw new Error('query is required and must be a string');
    }

    const result: SearchPackagesParams = {
      query: params.query,
    };
    
    if (params.limit !== undefined) {
      if (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 250) {
        throw new Error('limit must be a number between 1 and 250');
      }
      result.limit = params.limit;
    }
    
    if (params.quality !== undefined) {
      if (typeof params.quality !== 'number' || params.quality < 0 || params.quality > 1) {
        throw new Error('quality must be a number between 0 and 1');
      }
      result.quality = params.quality;
    }
    
    if (params.popularity !== undefined) {
      if (typeof params.popularity !== 'number' || params.popularity < 0 || params.popularity > 1) {
        throw new Error('popularity must be a number between 0 and 1');
      }
      result.popularity = params.popularity;
    }
    
    return result;
  }
}

export default CocoaPodsPackageReadmeMcpServer;