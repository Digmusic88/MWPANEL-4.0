/**
 * Utility functions for safe object access to prevent race condition errors
 * Specifically designed to handle "Cannot read properties of undefined (reading 'id')" errors
 */

/**
 * Safely accesses the 'id' property of an object with comprehensive error handling
 */
export const safeId = (obj: any, fallback: string | number | null = null): string | number | null => {
  try {
    if (obj === null || obj === undefined) {
      return fallback;
    }
    
    if (typeof obj !== 'object') {
      return fallback;
    }
    
    if (!obj.hasOwnProperty('id')) {
      return fallback;
    }
    
    const id = obj.id;
    if (id === null || id === undefined) {
      return fallback;
    }
    
    return id;
  } catch (error) {
    console.warn('🛡️ SAFE_ID: Error accessing id property', { obj, error: error.message });
    return fallback;
  }
};

/**
 * Safely accesses nested properties with dot notation
 */
export const safeGet = (obj: any, path: string, fallback: any = null): any => {
  try {
    if (!obj || typeof obj !== 'object') {
      return fallback;
    }
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return fallback;
      }
      
      if (typeof current !== 'object' || !current.hasOwnProperty(key)) {
        return fallback;
      }
      
      current = current[key];
    }
    
    return current !== null && current !== undefined ? current : fallback;
  } catch (error) {
    console.warn('🛡️ SAFE_GET: Error accessing nested property', { path, error: error.message });
    return fallback;
  }
};

/**
 * Safely filters array ensuring all items exist and have required properties
 */
export const safeArrayFilter = <T>(arr: T[], filterFn: (item: T) => boolean): T[] => {
  try {
    if (!Array.isArray(arr)) {
      return [];
    }
    
    return arr.filter(item => {
      if (item === null || item === undefined) {
        return false;
      }
      
      try {
        return filterFn(item);
      } catch (error) {
        console.warn('🛡️ SAFE_ARRAY_FILTER: Error in filter function', { item, error: error.message });
        return false;
      }
    });
  } catch (error) {
    console.warn('🛡️ SAFE_ARRAY_FILTER: Error processing array', { error: error.message });
    return [];
  }
};

/**
 * Safely reduces array with comprehensive error handling
 */
export const safeArrayReduce = <T, R>(
  arr: T[], 
  reduceFn: (acc: R, item: T, index: number) => R, 
  initialValue: R
): R => {
  try {
    if (!Array.isArray(arr)) {
      return initialValue;
    }
    
    return arr.reduce((acc, item, index) => {
      if (item === null || item === undefined) {
        return acc;
      }
      
      try {
        return reduceFn(acc, item, index);
      } catch (error) {
        console.warn('🛡️ SAFE_ARRAY_REDUCE: Error in reduce function', { item, index, error: error.message });
        return acc;
      }
    }, initialValue);
  } catch (error) {
    console.warn('🛡️ SAFE_ARRAY_REDUCE: Error processing array', { error: error.message });
    return initialValue;
  }
};

/**
 * Creates a safe wrapper for any function that might access undefined properties
 */
export const safeWrapper = <T extends (...args: any[]) => any>(
  fn: T,
  fallback: ReturnType<T> | null = null
): T => {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      return fn(...args);
    } catch (error) {
      if (error.message.includes("Cannot read properties of undefined")) {
        console.warn('🛡️ SAFE_WRAPPER: Prevented race condition error', { 
          functionName: fn.name, 
          error: error.message,
          stack: error.stack?.substring(0, 200)
        });
        return fallback;
      }
      throw error; // Re-throw non-race-condition errors
    }
  }) as T;
};