#!/usr/bin/env node

import { logger } from './utils/logger.js';
import { cache } from './services/cache.js';
import CocoaPodsPackageReadmeMcpServer from './server.js';

async function main(): Promise<void> {
  let server: CocoaPodsPackageReadmeMcpServer | null = null;

  try {
    logger.info('Initializing CocoaPods package-readme-mcp server');
    
    // Create and start the server
    server = new CocoaPodsPackageReadmeMcpServer();
    await server.run();
    
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }

  // Handle graceful shutdown
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    try {
      if (server) {
        await server.stop();
      }
      
      // Clean up cache
      cache.destroy();
      
      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', { error });
      process.exit(1);
    }
  };

  // Register signal handlers
  const signalNames = ['SIGINT', 'SIGTERM'] as const;
  signalNames.forEach(signal => {
    process.on(signal, () => handleShutdown(signal));
  });
  
  // Handle uncaught exceptions and rejections
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
    process.exit(1);
  });
}

// Run the server
main().catch((error) => {
  logger.error('Failed to start application', { error });
  process.exit(1);
});