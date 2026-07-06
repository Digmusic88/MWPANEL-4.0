import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    chromeWebSecurity: false,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    
    setupNodeEvents(on, config) {
      // Implement node event listeners here
      
      // Code coverage
      require('@cypress/code-coverage/task')(on, config);
      
      // Environment variables
      config.env = {
        ...config.env,
        API_URL: process.env.VITE_API_URL || 'http://localhost:3000/api',
        ADMIN_EMAIL: 'admin@mwpanel.com',
        ADMIN_PASSWORD: 'admin123',
        TEACHER_EMAIL: 'profesor@mwpanel.com',
        TEACHER_PASSWORD: 'profesor123',
        STUDENT_EMAIL: 'estudiante@mwpanel.com',
        STUDENT_PASSWORD: 'estudiante123',
        FAMILY_EMAIL: 'familia@mwpanel.com',
        FAMILY_PASSWORD: 'familia123',
      };
      
      return config;
    },
    
    // Retry configuration for flaky tests
    retries: {
      runMode: 2,
      openMode: 0,
    },
    
    // Exclude test files
    excludeSpecPattern: [
      '*.hot-update.js',
      '**/__tests__/**',
      '**/__mocks__/**',
    ],
    
    // Test isolation
    testIsolation: true,
  },
  
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    specPattern: 'src/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/component.ts',
  },
});