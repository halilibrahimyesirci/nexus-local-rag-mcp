/**
 * Test Setup: Configure Transformers.js for test environment
 * Disable remote model downloads, use local only
 */

import { env } from '@xenova/transformers';

// Configure Transformers.js for offline testing
env.allowLocalModels = true;
env.allowRemoteModels = true; // Allow first-time download in CI
env.cacheDir = './.transformers-cache'; // Custom cache directory

if (typeof process !== 'undefined') {
  process.env.TRANSFORMERS_CACHE = './.transformers-cache';
  // Tests use an ephemeral in-memory database so they never touch the real .nexus.db
  process.env.NEXUS_DB_PATH = ':memory:';
}

export const TEST_CONFIG = {
  // Use in-memory database for tests (no file I/O)
  testDb: ':memory:',
  
  // Test fixtures
  sampleMdContent: `# Test Document
  
This is a test markdown document with some content.

## Section 1
Content about authentication and security.

## Section 2
More details about database design.`,
  
  samplePdfContent: 'Test PDF content',
  
  // Timeouts
  modelInitTimeout: 60000, // 60 seconds for model download
  testTimeout: 30000, // 30 seconds per test
};
