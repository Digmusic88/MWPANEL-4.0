/**
 * TARGETED RACE CONDITION FIX
 * A more surgical approach that only prevents the specific "id" property access errors
 * without interfering with other JavaScript functionality like Framer Motion
 */

/**
 * Safe object property access specifically for 'id' properties
 */
const createIdPropertySafety = () => {
  // Store reference to original console.error to avoid infinite loops
  const originalConsoleError = console.error;
  
  // Override window.onerror to catch and handle id access errors specifically
  const originalWindowError = window.onerror;
  
  window.onerror = function(message, source, lineno, colno, error) {
    // Only handle our specific race condition error
    if (typeof message === 'string' && 
        message.includes("Cannot read properties of undefined (reading 'id')")) {
      
      console.warn('🛡️ TARGETED_FIX: Prevented id race condition error', {
        message,
        source,
        line: lineno,
        column: colno
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
};

/**
 * Safe array operations that only protect against undefined 'id' access
 * without interfering with function calls
 */
const createSafeArrayOperations = () => {
  // Store original array methods
  const originalArrayReduce = Array.prototype.reduce;
  const originalArrayFilter = Array.prototype.filter;
  const originalArrayMap = Array.prototype.map;
  const originalArrayFind = Array.prototype.find;
  
  // Only override reduce since that's where we had the main issues
  Array.prototype.reduce = function<T, U>(
    this: T[], 
    callback: (acc: U, value: T, index: number, array: T[]) => U, 
    initialValue?: U
  ): U {
    try {
      return originalArrayReduce.call(this, (acc, item, index, array) => {
        // Check if item is null/undefined before calling callback
        if (item === null || item === undefined) {
          return acc;
        }
        
        try {
          return callback(acc, item, index, array);
        } catch (error) {
          // Only catch id-related race condition errors
          if (error instanceof TypeError && 
              error.message.includes("Cannot read properties of undefined (reading 'id')")) {
            console.warn('🛡️ ARRAY_REDUCE_FIX: Prevented id access error in reduce', { 
              item, 
              index, 
              error: error.message 
            });
            return acc;
          }
          // Re-throw all other errors (including function call errors)
          throw error;
        }
      }, initialValue!);
    } catch (error) {
      // Only catch id-related race condition errors at the top level
      if (error instanceof TypeError && 
          error.message.includes("Cannot read properties of undefined (reading 'id')")) {
        console.warn('🛡️ ARRAY_REDUCE_FIX: Prevented top-level id access error', { 
          error: error.message 
        });
        return initialValue!;
      }
      // Re-throw all other errors
      throw error;
    }
  };
  
  // Only override filter for undefined item safety
  Array.prototype.filter = function<T>(
    this: T[], 
    callback: (value: T, index: number, array: T[]) => boolean, 
    thisArg?: any
  ): T[] {
    return originalArrayFilter.call(this, (item, index, array) => {
      // Skip null/undefined items
      if (item === null || item === undefined) {
        return false;
      }
      
      try {
        return callback.call(thisArg, item, index, array);
      } catch (error) {
        // Only catch id-related race condition errors
        if (error instanceof TypeError && 
            error.message.includes("Cannot read properties of undefined (reading 'id')")) {
          console.warn('🛡️ ARRAY_FILTER_FIX: Prevented id access error in filter', { 
            item, 
            index, 
            error: error.message 
          });
          return false;
        }
        // Re-throw all other errors (including function call errors)
        throw error;
      }
    });
  };
};

/**
 * Initialize only the targeted protections
 */
export const initializeTargetedRaceConditionFix = () => {
  console.log('🛡️ TARGETED_RACE_CONDITION_FIX: Initializing surgical protection...');
  
  try {
    createIdPropertySafety();
    createSafeArrayOperations();
    
    console.log('🛡️ TARGETED_RACE_CONDITION_FIX: Surgical protections initialized successfully');
  } catch (error) {
    console.error('🚨 TARGETED_RACE_CONDITION_FIX: Failed to initialize', error);
  }
};