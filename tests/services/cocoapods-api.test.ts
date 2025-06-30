import { describe, it, expect, beforeEach } from 'vitest';
import { CocoaPodsMockService, cocoaPodsAPI } from '../../src/services/cocoapods-api.js';

describe('CocoaPodsMockService', () => {
  let api: CocoaPodsMockService;

  beforeEach(() => {
    api = new CocoaPodsMockService();
  });

  describe('constructor', () => {
    it('should initialize with default values', () => {
      expect(api).toBeInstanceOf(CocoaPodsMockService);
    });

    it('should use custom request timeout from environment', () => {
      const originalTimeout = process.env.REQUEST_TIMEOUT;
      process.env.REQUEST_TIMEOUT = '15000';
      
      const customApi = new CocoaPodsMockService();
      expect(customApi).toBeInstanceOf(CocoaPodsMockService);
      
      if (originalTimeout) {
        process.env.REQUEST_TIMEOUT = originalTimeout;
      } else {
        delete process.env.REQUEST_TIMEOUT;
      }
    });
  });

  describe('getPodInfo', () => {
    it('should generate mock data for any pod', async () => {
      const result = await api.getPodInfo('TestPod');

      expect(result.name).toBe('TestPod');
      expect(result.version).toBe('latest');
      expect(result.summary).toBe('CocoaPods package: TestPod');
      expect(result.source.git).toBe('https://github.com/TestPod/TestPod.git');
    });

    it('should use known repository URLs for popular pods', async () => {
      const result = await api.getPodInfo('Alamofire');

      expect(result.name).toBe('Alamofire');
      expect(result.source.git).toBe('https://github.com/Alamofire/Alamofire.git');
      expect(result.summary).toBe('Elegant HTTP Networking in Swift');
    });

    it('should handle all known pods correctly', async () => {
      const knownPods = [
        'Alamofire', 'AFNetworking', 'SDWebImage', 
        'Kingfisher', 'SnapKit', 'RxSwift', 'Realm'
      ];

      for (const podName of knownPods) {
        const result = await api.getPodInfo(podName);
        expect(result.name).toBe(podName);
        expect(result.summary).toBeDefined();
        expect(result.source.git).toContain('github.com');
      }
    });
  });

  describe('searchPods', () => {
    it('should return mock search results', async () => {
      const result = await api.searchPods('Alamofire');

      expect(result.pods).toHaveLength(1);
      expect(result.pods[0].name).toBe('Alamofire');
      expect(result.total).toBe(1);
      expect(result.pods[0].summary).toContain('Mock search result');
    });

    it('should handle search with custom limit', async () => {
      const result = await api.searchPods('test', 50);

      expect(result.pods).toHaveLength(1);
      expect(result.pods[0].name).toBe('test');
      expect(result.total).toBe(1);
    });

    it('should handle empty search query', async () => {
      const result = await api.searchPods('');

      expect(result.pods).toHaveLength(1);
      expect(result.pods[0].name).toBe('');
      expect(result.total).toBe(1);
    });
  });

  describe('getPodVersions', () => {
    it('should return versions from pod info', async () => {
      const result = await api.getPodVersions('Alamofire');

      expect(result).toEqual(['latest']);
    });
  });

  describe('getPodStatsPlaceholder', () => {
    it('should generate mock stats', async () => {
      const result = await api.getPodStatsPlaceholder('Alamofire');

      expect(result).toEqual({ downloads: 0 });
    });
  });

  describe('extractRepositoryInfo', () => {
    it('should extract owner and repo from GitHub URL', () => {
      const source = { git: 'https://github.com/Alamofire/Alamofire.git' };
      const result = CocoaPodsMockService.extractRepositoryInfo(source);

      expect(result).toEqual({
        owner: 'Alamofire',
        repo: 'Alamofire',
      });
    });

    it('should extract owner and repo from GitHub URL without .git extension', () => {
      const source = { git: 'https://github.com/ReactiveX/RxSwift' };
      const result = CocoaPodsMockService.extractRepositoryInfo(source);

      expect(result).toEqual({
        owner: 'ReactiveX',
        repo: 'RxSwift',
      });
    });

    it('should return null for invalid URLs', () => {
      const source = { git: 'invalid-url' };
      const result = CocoaPodsMockService.extractRepositoryInfo(source);

      expect(result).toBeNull();
    });

    it('should return null for URLs with insufficient path parts', () => {
      const source = { git: 'https://github.com/Alamofire' };
      const result = CocoaPodsMockService.extractRepositoryInfo(source);

      expect(result).toBeNull();
    });

    it('should return null for empty source', () => {
      const result = CocoaPodsMockService.extractRepositoryInfo({ git: '' });
      expect(result).toBeNull();
    });

    it('should return null for null source', () => {
      const result = CocoaPodsMockService.extractRepositoryInfo(null as any);
      expect(result).toBeNull();
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(cocoaPodsAPI).toBeInstanceOf(CocoaPodsMockService);
    });
  });
});