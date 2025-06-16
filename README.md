# CocoaPods Package README MCP Server

An MCP (Model Context Protocol) server for fetching CocoaPods package README and usage information.

## Features

- **Package README Retrieval**: Get comprehensive README content and usage examples from CocoaPods packages
- **Package Information**: Fetch detailed package metadata, dependencies, and platform support
- **Package Search**: Search the CocoaPods registry with filtering capabilities
- **Smart Caching**: Efficient caching system to reduce API calls
- **GitHub Integration**: Automatically fetches README content from GitHub repositories
- **Swift/iOS Focused**: Optimized for iOS development with Swift and Objective-C code examples

## Installation

```bash
npm install cocoapods-package-readme-mcp-server
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "cocoapods-readme": {
      "command": "node",
      "args": ["path/to/cocoapods-package-readme-mcp-server/dist/index.js"],
      "env": {
        "GITHUB_TOKEN": "your-github-token-here"
      }
    }
  }
}
```

### Environment Variables

- `GITHUB_TOKEN` (optional): GitHub personal access token for higher API rate limits
- `LOG_LEVEL` (optional): Logging level (debug, info, warn, error) - default: info
- `CACHE_TTL` (optional): Cache TTL in milliseconds - default: 3600000 (1 hour)
- `CACHE_MAX_SIZE` (optional): Maximum cache entries - default: 1000
- `REQUEST_TIMEOUT` (optional): HTTP request timeout in milliseconds - default: 30000

## Available Tools

### get_package_readme

Get package README and usage examples from CocoaPods registry.

**Parameters:**
- `package_name` (string, required): The name of the CocoaPods package
- `version` (string, optional): The version of the package (default: "latest")
- `include_examples` (boolean, optional): Whether to include usage examples (default: true)

**Example:**
```json
{
  "package_name": "Alamofire",
  "version": "latest",
  "include_examples": true
}
```

### get_package_info

Get package basic information and dependencies from CocoaPods registry.

**Parameters:**
- `package_name` (string, required): The name of the CocoaPods package
- `include_dependencies` (boolean, optional): Whether to include dependencies (default: true)
- `include_dev_dependencies` (boolean, optional): Whether to include test dependencies (default: false)

**Example:**
```json
{
  "package_name": "AFNetworking",
  "include_dependencies": true,
  "include_dev_dependencies": false
}
```

### search_packages

Search for packages in CocoaPods registry.

**Parameters:**
- `query` (string, required): The search query
- `limit` (number, optional): Maximum number of results to return (default: 20, max: 250)
- `quality` (number, optional): Minimum quality score (0-1)
- `popularity` (number, optional): Minimum popularity score (0-1)

**Example:**
```json
{
  "query": "networking",
  "limit": 10,
  "quality": 0.5
}
```

## Supported Package Examples

- **Alamofire**: Modern HTTP networking library for Swift
- **AFNetworking**: Objective-C HTTP networking library
- **SwiftyJSON**: JSON parsing library for Swift
- **SnapKit**: Auto Layout DSL for Swift
- **Realm**: Mobile database framework
- **Charts**: Beautiful charts library
- **Kingfisher**: Image downloading and caching library

## API Integration

This server integrates with:
- **CocoaPods API** (`https://cocoapods.org/api/v1`) for package information and search
- **GitHub API** for README content retrieval
- **Local caching** for performance optimization

## Development

### Setup

```bash
git clone <repository-url>
cd cocoapods-package-readme-mcp-server
npm install
```

### Build

```bash
npm run build
```

### Development Server

```bash
npm run dev
```

### Testing

```bash
npm test
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│   CocoaPods     │───▶│  CocoaPods API  │
│   (Claude)      │    │  README Server  │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   GitHub API    │
                       │  (README fetch) │
                       └─────────────────┘
```

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request