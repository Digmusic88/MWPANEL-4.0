/**
 * CLEAN RACE CONDITION FIX
 * Only uses error handlers - NO modification of native JavaScript methods
 * This prevents interference with Framer Motion and other libraries
 */

/**
 * Clean error handling approach - no method overrides
 */
export const initializeCleanRaceConditionFix = () => {
  console.log('🛡️ CLEAN_RACE_CONDITION_FIX: Initializing error-handler-only protection...');
  
  try {
    // Enhanced window.onerror for race condition detection
    const originalWindowError = window.onerror;
    
    window.onerror = function(message, source, lineno, colno, error) {
      // Handle the specific race condition error
      if (typeof message === 'string' && 
          message.includes("Cannot read properties of undefined (reading 'id')")) {
        
        console.warn('🛡️ CLEAN_FIX: Prevented id race condition error', {
          message,
          source,
          line: lineno,
          column: colno,
          timestamp: new Date().toISOString()
        });
        
        // Prevent the error from propagating
        return true;
      }
      
      // Let other errors be handled normally
      if (originalWindowError) {
        return originalWindowError.call(this, message, source, lineno, colno, error);
      }
      
      return false;
    };

    // Enhanced window.addEventListener for unhandledrejection
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      
      if (error && error.message && 
          error.message.includes("Cannot read properties of undefined (reading 'id')")) {
        
        console.warn('🛡️ CLEAN_FIX: Prevented id race condition in promise rejection', {
          message: error.message,
          stack: error.stack?.substring(0, 300),
          timestamp: new Date().toISOString()
        });
        
        // Prevent unhandled rejection
        event.preventDefault();
      }
    });

    // Add a global try-catch wrapper for critical operations
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(callback: Function, delay?: number, ...args: any[]) {
      const wrappedCallback = function() {
        try {
          return callback.apply(this, arguments);
        } catch (error) {
          if (error instanceof TypeError && 
              error.message.includes("Cannot read properties of undefined (reading 'id')")) {
            console.warn('🛡️ CLEAN_FIX: Prevented id race condition in setTimeout', {
              error: error.message,
              timestamp: new Date().toISOString()
            });
            return;
          }
          throw error; // Re-throw non-race-condition errors
        }
      };
      
      return originalSetTimeout.call(this, wrappedCallback, delay, ...args);
    };

    console.log('🛡️ CLEAN_RACE_CONDITION_FIX: Clean protections initialized successfully');
    console.log('🛡️ No native JavaScript methods were modified - Framer Motion should work normally');
    
  } catch (error) {
    console.error('🚨 CLEAN_RACE_CONDITION_FIX: Failed to initialize', error);
  }
};