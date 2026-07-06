// ***********************************************************
// This file is processed and loaded automatically before your component test files.
// You can change the location of this file or turn off loading
// the support files with the 'supportFile' configuration option.
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Import global styles
import '../../src/index.css';

// Mount function for React components
import { mount } from 'cypress/react18';

// Augment the Cypress namespace to include type definitions for
// your custom command.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add('mount', mount);

// Example use:
// cy.mount(<MyComponent />)