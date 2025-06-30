import { BasePackageServer, ToolDefinition, createLogger } from '@elchika-inc/package-readme-shared';
import { getPackageReadme } from './tools/get-package-readme.js';
import { getPackageInfo } from './tools/get-package-info.js';
import { searchPackages } from './tools/search-packages.js';
import {
  GetPackageReadmeParams,
  GetPackageInfoParams,
  SearchPackagesParams,
} from './types/index.js';
import { validateParams, validatePodName, validateVersion, validateSearchQuery, validateLimit, validateScore } from './utils/validators.js';

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
    return validateParams<GetPackageReadmeParams>(args, {
      package_name: { 
        type: 'string', 
        required: true, 
        validator: validatePodName 
      },
      version: { 
        type: 'string', 
        required: false, 
        validator: (v: string) => v && validateVersion(v) 
      },
      include_examples: { 
        type: 'boolean', 
        required: false 
      }
    });
  }

  private validateGetPackageInfoParams(args: unknown): GetPackageInfoParams {
    return validateParams<GetPackageInfoParams>(args, {
      package_name: { 
        type: 'string', 
        required: true, 
        validator: validatePodName 
      },
      include_dependencies: { 
        type: 'boolean', 
        required: false 
      },
      include_dev_dependencies: { 
        type: 'boolean', 
        required: false 
      }
    });
  }

  private validateSearchPackagesParams(args: unknown): SearchPackagesParams {
    return validateParams<SearchPackagesParams>(args, {
      query: { 
        type: 'string', 
        required: true, 
        validator: validateSearchQuery 
      },
      limit: { 
        type: 'number', 
        required: false, 
        validator: validateLimit 
      },
      quality: { 
        type: 'number', 
        required: false, 
        validator: (v: number) => validateScore(v, 'quality') 
      },
      popularity: { 
        type: 'number', 
        required: false, 
        validator: (v: number) => validateScore(v, 'popularity') 
      }
    });
  }
}

export default CocoaPodsPackageReadmeMcpServer;