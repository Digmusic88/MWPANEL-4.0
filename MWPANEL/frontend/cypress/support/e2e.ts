// ***********************************************************
// This file is processed and loaded automatically before your test files.
// You can change the location of this file or turn off loading
// the support files with the 'supportFile' configuration option.
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
const app = window.top;
if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
  const style = app.document.createElement('style');
  style.innerHTML = '.command-name-request, .command-name-xhr { display: none }';
  style.setAttribute('data-hide-command-log-request', '');
  app.document.head.appendChild(style);
}

// Uncaught exception handler
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore ResizeObserver errors
  if (err.message.includes('ResizeObserver')) {
    return false;
  }
  // Ignore React hydration errors in development
  if (err.message.includes('Minified React error')) {
    return false;
  }
  return true;
});

// Before each test
beforeEach(() => {
  // Clear localStorage and sessionStorage
  cy.clearLocalStorage();
  cy.clearCookies();
  
  // Set viewport
  cy.viewport(1280, 720);
});

// After each test
afterEach(() => {
  // Log test completion
  cy.log('Test completed');
});