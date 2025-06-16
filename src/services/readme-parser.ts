import type { UsageExample } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class ReadmeParser {
  private static readonly USAGE_SECTION_PATTERNS = [
    /^#{1,4}\s*(usage|how to use|getting started|quick start|example|examples)/i,
    /^#{1,4}\s*(installation|install)/i,
    /^#{1,4}\s*(implementation|integration)/i,
    /^#{1,4}\s*(setup|configuration)/i,
  ];

  private static readonly CODE_BLOCK_PATTERN = /```(\w+)?\s*\n([\s\S]*?)\n```/g;
  private static readonly INLINE_CODE_PATTERN = /`([^`\n]+)`/g;

  static parseUsageExamples(readme: string): UsageExample[] {
    logger.debug('Parsing usage examples from README');
    
    if (!readme || typeof readme !== 'string') {
      logger.warn('Invalid README content provided');
      return [];
    }

    const examples: UsageExample[] = [];
    const lines = readme.split('\n');
    let currentSection = '';
    let isInUsageSection = false;
    let sectionContent: string[] = [];

    // Parse by sections
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is a heading
      if (line.match(/^#{1,4}\s/)) {
        // Process previous section if it was a usage section
        if (isInUsageSection && sectionContent.length > 0) {
          const sectionExamples = this.extractCodeBlocksFromSection(
            currentSection,
            sectionContent.join('\n')
          );
          examples.push(...sectionExamples);
        }

        // Check if new section is usage-related
        currentSection = line.replace(/^#{1,4}\s*/, '').trim();
        isInUsageSection = this.USAGE_SECTION_PATTERNS.some(pattern => 
          pattern.test(line)
        );
        sectionContent = [];
      } else if (isInUsageSection) {
        sectionContent.push(line);
      }
    }

    // Process the last section if it was a usage section
    if (isInUsageSection && sectionContent.length > 0) {
      const sectionExamples = this.extractCodeBlocksFromSection(
        currentSection,
        sectionContent.join('\n')
      );
      examples.push(...sectionExamples);
    }

    // If no examples found in sections, try to find code blocks globally
    if (examples.length === 0) {
      logger.debug('No section-based examples found, searching globally');
      const globalExamples = this.extractCodeBlocksFromSection('General Usage', readme);
      examples.push(...globalExamples);
    }

    logger.info(`Parsed ${examples.length} usage examples from README`);
    return this.deduplicateExamples(examples);
  }

  private static extractCodeBlocksFromSection(sectionTitle: string, content: string): UsageExample[] {
    const examples: UsageExample[] = [];
    const codeBlocks = this.extractCodeBlocks(content);

    codeBlocks.forEach((block, index) => {
      if (this.isRelevantCodeBlock(block.code, block.language)) {
        examples.push({
          title: codeBlocks.length === 1 ? sectionTitle : `${sectionTitle} ${index + 1}`,
          description: this.extractBlockDescription(content, block.originalIndex),
          code: block.code.trim(),
          language: block.language || this.detectLanguage(block.code),
        });
      }
    });

    return examples;
  }

  private static extractCodeBlocks(content: string): Array<{
    code: string;
    language: string;
    originalIndex: number;
  }> {
    const blocks: Array<{ code: string; language: string; originalIndex: number }> = [];
    let match;

    // Reset regex state
    this.CODE_BLOCK_PATTERN.lastIndex = 0;

    while ((match = this.CODE_BLOCK_PATTERN.exec(content)) !== null) {
      blocks.push({
        code: match[2] || '',
        language: match[1] || '',
        originalIndex: match.index,
      });
    }

    return blocks;
  }

  private static isRelevantCodeBlock(code: string, language: string): boolean {
    if (!code || code.trim().length < 10) {
      return false;
    }

    // Filter out code blocks that are likely not usage examples
    const irrelevantPatterns = [
      /^(version|changelog|license|copyright)/i,
      /^\d+\.\d+\.\d+/, // Version numbers
      /^https?:\/\//, // URLs only
      /^[\w\s]*:[\w\s]*$/, // Simple key-value pairs
      /^\s*#\s*\w+\s*$/, // Just comments
    ];

    if (irrelevantPatterns.some(pattern => pattern.test(code.trim()))) {
      return false;
    }

    // Prefer iOS/Swift related code blocks
    const relevantLanguages = ['swift', 'objc', 'objective-c', 'ruby', 'bash', 'shell', 'json', 'plist'];
    if (language && relevantLanguages.includes(language.toLowerCase())) {
      return true;
    }

    // Check for iOS/Swift keywords in the code
    const iosKeywords = [
      'import\\s+\\w+', // import statements
      'class\\s+\\w+', // class definitions
      'func\\s+\\w+', // function definitions
      'pod\\s+[\'"]', // Podfile entries
      'CocoaPods', 'Podfile', 'Podspec',
      'UIKit', 'Foundation', 'SwiftUI',
      '@IBOutlet', '@IBAction', '@objc',
      'viewDidLoad', 'override\\s+func',
    ];

    const hasIosKeywords = iosKeywords.some(keyword => 
      new RegExp(keyword, 'i').test(code)
    );

    return hasIosKeywords || (!language && code.length > 20);
  }

  private static detectLanguage(code: string): string {
    // Simple language detection based on code patterns
    if (/^\s*pod\s+['"]/.test(code)) {
      return 'ruby'; // Podfile
    }
    
    if (/import\s+\w+|func\s+\w+|class\s+\w+.*\{|var\s+\w+|let\s+\w+/.test(code)) {
      return 'swift';
    }
    
    if (/@interface|@implementation|@property|\*\w+|#import/.test(code)) {
      return 'objective-c';
    }
    
    if (/\$\s*\w+|sudo|brew|curl|git\s+clone/.test(code)) {
      return 'bash';
    }
    
    if (/^\s*\{[\s\S]*\}\s*$/.test(code.trim()) && /["'][\w-]+["']\s*:/.test(code)) {
      return 'json';
    }

    return 'text';
  }

  private static extractBlockDescription(content: string, blockIndex: number): string | undefined {
    // Try to find descriptive text before the code block
    const beforeBlock = content.substring(0, blockIndex);
    const lines = beforeBlock.split('\n').reverse();
    
    // Look for non-empty lines that could be descriptions
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.match(/^#{1,6}\s/) && trimmed.length > 10) {
        return trimmed;
      }
    }
    
    return undefined;
  }

  private static deduplicateExamples(examples: UsageExample[]): UsageExample[] {
    const seen = new Set<string>();
    const unique: UsageExample[] = [];

    for (const example of examples) {
      // Create a hash of the code content (normalized)
      const normalizedCode = example.code.replace(/\s+/g, ' ').trim().toLowerCase();
      const hash = `${example.language}:${normalizedCode}`;

      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push(example);
      }
    }

    return unique;
  }

  static cleanReadmeContent(readme: string): string {
    if (!readme || typeof readme !== 'string') {
      return '';
    }

    logger.debug('Cleaning README content');

    // Remove or replace problematic content
    const cleaned = readme
      // Remove badges (shields.io, etc.)
      .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '')
      .replace(/!\[.*?\]\(.*?shields\.io.*?\)/g, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Clean up multiple empty lines
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // Trim whitespace
      .trim();

    return cleaned;
  }

  static extractInstallationInstructions(readme: string): {
    podfile?: string;
    carthage?: string;
    spm?: string;
  } {
    logger.debug('Extracting installation instructions from README');

    const instructions: { podfile?: string; carthage?: string; spm?: string } = {};

    // Extract Podfile installation
    const podfileMatch = readme.match(/pod\s+['"][^'"]+['"]/i);
    if (podfileMatch) {
      instructions.podfile = podfileMatch[0];
    }

    // Extract Carthage installation
    const carthageMatch = readme.match(/github\s+['"][^'"]+\/[^'"]+['"]/i);
    if (carthageMatch) {
      instructions.carthage = carthageMatch[0];
    }

    // Extract Swift Package Manager URL
    const spmMatch = readme.match(/https:\/\/github\.com\/[^\s)]+/);
    if (spmMatch) {
      instructions.spm = spmMatch[0];
    }

    return instructions;
  }
}