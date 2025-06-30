import { describe, it, expect } from 'vitest';
import { ReadmeParser } from '../../src/services/readme-parser.js';

describe('ReadmeParser', () => {
  describe('parseUsageExamples', () => {
    it('should return empty array for invalid input', () => {
      expect(ReadmeParser.parseUsageExamples('')).toEqual([]);
      expect(ReadmeParser.parseUsageExamples(null as any)).toEqual([]);
      expect(ReadmeParser.parseUsageExamples(undefined as any)).toEqual([]);
    });

    it('should extract code blocks from usage sections', () => {
      const readme = `
# My Library

## Usage

Here's how to use this library:

\`\`\`swift
import MyLibrary

let manager = MyLibrary.Manager()
manager.doSomething()
\`\`\`

## Installation

Install via CocoaPods:

\`\`\`ruby
pod 'MyLibrary'
\`\`\`
      `;

      const examples = ReadmeParser.parseUsageExamples(readme);
      
      expect(examples).toHaveLength(2);
      expect(examples[0].title).toBe('Usage');
      expect(examples[0].language).toBe('swift');
      expect(examples[0].code).toContain('import MyLibrary');
      
      expect(examples[1].title).toBe('Installation');
      expect(examples[1].language).toBe('ruby');
      expect(examples[1].code).toContain("pod 'MyLibrary'");
    });

    it('should search globally when no usage sections found', () => {
      const readme = `
# My Library

Some description.

\`\`\`swift
import MyLibrary
let instance = MyLibrary()
\`\`\`

More text here.
      `;

      const examples = ReadmeParser.parseUsageExamples(readme);
      
      expect(examples).toHaveLength(1);
      expect(examples[0].title).toBe('General Usage');
      expect(examples[0].language).toBe('swift');
    });

    it('should filter out irrelevant code blocks', () => {
      const readme = `
## Usage

\`\`\`
1.0.0
\`\`\`

\`\`\`
https://github.com/user/repo
\`\`\`

\`\`\`swift
import MyLibrary
let manager = MyLibrary.Manager()
\`\`\`
      `;

      const examples = ReadmeParser.parseUsageExamples(readme);
      
      expect(examples).toHaveLength(1);
      expect(examples[0].language).toBe('swift');
      expect(examples[0].code).toContain('import MyLibrary');
    });

    it('should detect iOS/Swift keywords', () => {
      const readme = `
## Usage

\`\`\`
class MyViewController: UIViewController {
    @IBOutlet weak var label: UILabel!
    
    override func viewDidLoad() {
        super.viewDidLoad()
    }
}
\`\`\`
      `;

      const examples = ReadmeParser.parseUsageExamples(readme);
      
      expect(examples).toHaveLength(1);
      expect(examples[0].language).toBe('swift');
    });
  });

  describe('cleanReadmeContent', () => {
    it('should return empty string for invalid input', () => {
      expect(ReadmeParser.cleanReadmeContent('')).toBe('');
      expect(ReadmeParser.cleanReadmeContent(null as any)).toBe('');
      expect(ReadmeParser.cleanReadmeContent(undefined as any)).toBe('');
    });

    it('should remove badges and shields', () => {
      const readme = `
# My Library

[![Build Status](https://img.shields.io/badge/build-passing-green)](https://example.com)

![License](https://img.shields.io/badge/license-MIT-blue)

Some content here.
      `;

      const cleaned = ReadmeParser.cleanReadmeContent(readme);
      
      expect(cleaned).not.toContain('shields.io');
      expect(cleaned).not.toContain('[![');
      expect(cleaned).toContain('Some content here.');
    });

    it('should remove HTML comments', () => {
      const readme = `
# My Library

<!-- This is a comment -->
Some content here.
<!-- Another comment
spanning multiple lines -->
More content.
      `;

      const cleaned = ReadmeParser.cleanReadmeContent(readme);
      
      expect(cleaned).not.toContain('<!--');
      expect(cleaned).not.toContain('-->');
      expect(cleaned).toContain('Some content here.');
      expect(cleaned).toContain('More content.');
    });

    it('should clean up multiple empty lines', () => {
      const readme = `
# My Library



Some content here.




More content.
      `;

      const cleaned = ReadmeParser.cleanReadmeContent(readme);
      
      expect(cleaned).not.toMatch(/\n\s*\n\s*\n/);
      expect(cleaned).toContain('Some content here.');
      expect(cleaned).toContain('More content.');
    });
  });

  describe('extractInstallationInstructions', () => {
    it('should extract Podfile instructions', () => {
      const readme = `
## Installation

Add this to your Podfile:

\`\`\`ruby
pod 'MyLibrary', '~> 1.0'
\`\`\`
      `;

      const instructions = ReadmeParser.extractInstallationInstructions(readme);
      
      expect(instructions.podfile).toBe("pod 'MyLibrary'");
    });

    it('should extract Carthage instructions', () => {
      const readme = `
## Installation

Add this to your Cartfile:

\`\`\`
github "user/MyLibrary" ~> 1.0
\`\`\`
      `;

      const instructions = ReadmeParser.extractInstallationInstructions(readme);
      
      expect(instructions.carthage).toBe('github "user/MyLibrary"');
    });

    it('should extract Swift Package Manager URL', () => {
      const readme = `
## Installation

Add this package to your dependencies:

https://github.com/user/MyLibrary

Or use Xcode's package manager.
      `;

      const instructions = ReadmeParser.extractInstallationInstructions(readme);
      
      expect(instructions.spm).toBe('https://github.com/user/MyLibrary');
    });

    it('should return empty object when no instructions found', () => {
      const readme = `
# My Library

This is a library without installation instructions.
      `;

      const instructions = ReadmeParser.extractInstallationInstructions(readme);
      
      expect(instructions).toEqual({});
    });
  });
});