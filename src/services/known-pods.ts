/**
 * Configuration for well-known CocoaPods packages
 * 
 * This centralized configuration replaces hardcoded values
 * and makes it easier to maintain pod information.
 */

export interface KnownPodConfig {
  name: string;
  githubUrl: string;
  summary: string;
  description: string;
  license?: string;
  homepage?: string;
}

export const KNOWN_PODS: Record<string, KnownPodConfig> = {
  'Alamofire': {
    name: 'Alamofire',
    githubUrl: 'https://github.com/Alamofire/Alamofire.git',
    summary: 'Elegant HTTP Networking in Swift',
    description: 'Alamofire is an HTTP networking library written in Swift.',
    license: 'MIT',
    homepage: 'https://alamofire.org'
  },
  'AFNetworking': {
    name: 'AFNetworking',
    githubUrl: 'https://github.com/AFNetworking/AFNetworking.git',
    summary: 'A delightful networking framework for iOS, macOS, watchOS, and tvOS',
    description: 'AFNetworking is a delightful networking library for iOS and Mac OS X.',
    license: 'MIT'
  },
  'SDWebImage': {
    name: 'SDWebImage',
    githubUrl: 'https://github.com/SDWebImage/SDWebImage.git',
    summary: 'Asynchronous image downloader with cache support',
    description: 'SDWebImage provides async image downloading with cache support.',
    license: 'MIT'
  },
  'Kingfisher': {
    name: 'Kingfisher',
    githubUrl: 'https://github.com/onevcat/Kingfisher.git',
    summary: 'A lightweight, pure-Swift library for downloading and caching images from the web',
    description: 'Kingfisher is a powerful, pure-Swift library for downloading and caching images.',
    license: 'MIT'
  },
  'SnapKit': {
    name: 'SnapKit',
    githubUrl: 'https://github.com/SnapKit/SnapKit.git',
    summary: 'A Swift Autolayout DSL for iOS & OS X',
    description: 'SnapKit is a DSL to make Auto Layout easy on both iOS and OS X.',
    license: 'MIT'
  },
  'RxSwift': {
    name: 'RxSwift',
    githubUrl: 'https://github.com/ReactiveX/RxSwift.git',
    summary: 'Reactive Programming in Swift',
    description: 'RxSwift is the reactive programming library for Swift.',
    license: 'MIT'
  },
  'Realm': {
    name: 'Realm',
    githubUrl: 'https://github.com/realm/realm-swift.git',
    summary: 'A mobile database that runs directly inside phones, tablets or wearables',
    description: 'Realm is a mobile database: a replacement for SQLite & Core Data.',
    license: 'Apache-2.0'
  }
};

export function getKnownPodConfig(podName: string): KnownPodConfig | null {
  return KNOWN_PODS[podName] || null;
}

export function isKnownPod(podName: string): boolean {
  return podName in KNOWN_PODS;
}