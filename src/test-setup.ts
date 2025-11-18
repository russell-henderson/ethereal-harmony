// src/test-setup.ts
// Vitest setup file for test environment configuration
import { beforeEach, afterEach } from 'vitest';

// Ensure localStorage is properly mocked for jsdom
// jsdom should provide localStorage, but we ensure it's available and cleared
beforeEach(() => {
  // Clear localStorage before each test
  if (typeof Storage !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
});

afterEach(() => {
  // Clean up after each test
  if (typeof Storage !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
});
