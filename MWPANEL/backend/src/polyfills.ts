/**
 * Polyfills for Node.js compatibility with @nestjs/schedule
 * This file must be imported before any NestJS modules
 */

import { webcrypto } from 'crypto';

// Add crypto global for @nestjs/schedule compatibility with Node.js 18+
// Check if crypto is already available (Node.js 20+ has it built-in)
try {
  if (typeof (global as any).crypto === 'undefined') {
    (global as any).crypto = webcrypto;
  }
  if (typeof (globalThis as any).crypto === 'undefined') {
    (globalThis as any).crypto = webcrypto;
  }
} catch (error) {
  // In Node.js 20+, crypto might be read-only, which is fine since it's already available
  console.log('ℹ️  Crypto is already available globally in Node.js 20+');
}

// Ensure crypto.randomUUID is available
try {
  if (!(global as any).crypto?.randomUUID) {
    if ((global as any).crypto) {
      // Try to extend existing crypto object
      Object.defineProperty((global as any).crypto, 'randomUUID', {
        value: webcrypto.randomUUID.bind(webcrypto),
        writable: false,
        enumerable: true,
        configurable: true
      });
    } else {
      (global as any).crypto = {
        randomUUID: webcrypto.randomUUID.bind(webcrypto)
      };
    }
  }
} catch (error) {
  // randomUUID might already be available
  console.log('ℹ️  crypto.randomUUID is already available');
}

console.log('✅ Crypto polyfill loaded');
console.log('✅ Global crypto available:', typeof (global as any).crypto !== 'undefined');
console.log('✅ Crypto.randomUUID available:', typeof (global as any).crypto?.randomUUID === 'function');

// Export for explicit imports if needed
export { webcrypto as crypto };