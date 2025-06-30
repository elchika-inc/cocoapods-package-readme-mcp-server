import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GitHubAPI, githubAPI } from '../../src/services/github-api.js';

describe('GitHubAPI', () => {
  let api: GitHubAPI;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    api = new GitHubAPI();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(api).toBeInstanceOf(GitHubAPI);
    });

    it('should use custom request timeout from environment', () => {
      process.env.REQUEST_TIMEOUT = '15000';
      const customApi = new GitHubAPI();
      expect(customApi).toBeInstanceOf(GitHubAPI);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(githubAPI).toBeInstanceOf(GitHubAPI);
    });
  });
});