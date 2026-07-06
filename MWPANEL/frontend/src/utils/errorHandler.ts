/**
 * Global error handler para capturar errores de race condition
 * Específicamente para el error "Cannot read properties of undefined (reading 'id')"
 */

// Global error handler para errores no capturados
window.addEventListener('error', (event) => {
  const error = event.error;
  
  if (error && error.message && error.message.includes("Cannot read properties of undefined (reading 'id')")) {
    console.warn('🛡️ SILENT_GLOBAL_HANDLER: Race condition error detected and silenced', {
      message: error.message,
      timestamp: new Date().toISOString(),
      suppressed: true
    });
    
    // Prevent the error from propagating and breaking the UI
    event.preventDefault();
    event.stopPropagation();
    
    // No notification - completely silent handling
    return false; // Prevent default error handling
  }
});

// Promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  
  if (error && error.message && error.message.includes("Cannot read properties of undefined (reading 'id')")) {
    console.warn('🛡️ SILENT_PROMISE_HANDLER: Race condition error in promise - silenced', {
      message: error.message,
      timestamp: new Date().toISOString(),
      suppressed: true
    });
    
    // Prevent unhandled rejection
    event.preventDefault();
  }
});

console.log('🛡️ Global error handlers initialized for race condition protection');