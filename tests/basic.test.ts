import { describe, it, expect } from '@jest/globals';
import { validatePodName, validateVersion, validateSearchQuery } from '../src/utils/validators.js';
import { PackageReadmeMcpError } from '../src/types/index.js';

describe('Validators', () => {
  describe('validatePodName', () => {
    it('should accept valid pod names', () => {
      expect(() => validatePodName('Alamofire')).not.toThrow();
      expect(() => validatePodName('AFNetworking')).not.toThrow();
      expect(() => validatePodName('SwiftyJSON')).not.toThrow();
      expect(() => validatePodName('My-Pod')).not.toThrow();
      expect(() => validatePodName('My_Pod')).not.toThrow();
    });

    it('should reject invalid pod names', () => {
      expect(() => validatePodName('')).toThrow(PackageReadmeMcpError);
      expect(() => validatePodName('-InvalidPod')).toThrow(PackageReadmeMcpError);
      expect(() => validatePodName('_InvalidPod')).toThrow(PackageReadmeMcpError);
      expect(() => validatePodName('Invalid Pod')).toThrow(PackageReadmeMcpError);
      expect(() => validatePodName('Invalid@Pod')).toThrow(PackageReadmeMcpError);
    });
  });

  describe('validateVersion', () => {
    it('should accept valid versions', () => {
      expect(() => validateVersion('latest')).not.toThrow();
      expect(() => validateVersion('1.0.0')).not.toThrow();
      expect(() => validateVersion('2.1.3')).not.toThrow();
      expect(() => validateVersion('1.0.0-beta.1')).not.toThrow();
    });

    it('should reject invalid versions', () => {
      expect(() => validateVersion('')).toThrow(PackageReadmeMcpError);
      expect(() => validateVersion('1.0')).toThrow(PackageReadmeMcpError);
      expect(() => validateVersion('v1.0.0')).toThrow(PackageReadmeMcpError);
      expect(() => validateVersion('invalid')).toThrow(PackageReadmeMcpError);
    });
  });

  describe('validateSearchQuery', () => {
    it('should accept valid search queries', () => {
      expect(() => validateSearchQuery('networking')).not.toThrow();
      expect(() => validateSearchQuery('HTTP client')).not.toThrow();
      expect(() => validateSearchQuery('JSON parsing')).not.toThrow();
    });

    it('should reject invalid search queries', () => {
      expect(() => validateSearchQuery('')).toThrow(PackageReadmeMcpError);
      expect(() => validateSearchQuery('   ')).toThrow(PackageReadmeMcpError);
      expect(() => validateSearchQuery('a'.repeat(501))).toThrow(PackageReadmeMcpError);
    });
  });
});