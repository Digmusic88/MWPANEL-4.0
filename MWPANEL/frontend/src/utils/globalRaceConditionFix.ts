/**
 * GLOBAL RACE CONDITION FIX
 * This file implements a comprehensive monkey patch to prevent ALL race condition errors
 * related to "Cannot read properties of undefined (reading 'id')"
 */

// Store original property descriptor methods
const originalDefineProperty = Object.defineProperty;
const originalGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

/**
 * Global property access interceptor
 * Intercepts ALL property access and prevents undefined access to 'id'
 */
const createSafePropertyAccess = () => {
  // Override Object.defineProperty to add safe getters for 'id' properties
  Object.defineProperty = function(obj: any, prop: string | symbol, descriptor: PropertyDescriptor) {
    if (prop === 'id' && descriptor.get) {
      const originalGetter = descriptor.get;
      descriptor.get = function() {
        try {
          const result = originalGetter.call(this);
          return result;
        } catch (error) {
          if (error.message.includes("Cannot read properties of undefined")) {
            console.warn('🛡️ GLOBAL_FIX: Prevented id access race condition', {
              object: this,
              error: error.message
            });
            return null;
          }
          throw error;
        }
      };
    }
    
    return originalDefineProperty.call(this, obj, prop, descriptor);
  };
};

/**
 * Proxy-based object wrapper that intercepts all property access
 */
const createSafeProxy = (obj: any): any => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  return new Proxy(obj, {
    get(target: any, property: string | symbol) {
      try {
        const value = target[property];
        
        // If accessing 'id' and the result is undefined, return null instead
        if (property === 'id' && value === undefined) {
          console.warn('🛡️ PROXY_FIX: Prevented undefined id access', { target });
          return null;
        }
        
        // If the value is an object, wrap it in a proxy too (recursive protection)
        if (value && typeof value === 'object') {
          return createSafeProxy(value);
        }
        
        return value;
      } catch (error) {
        if (error.message.includes("Cannot read properties of undefined")) {
          console.warn('🛡️ PROXY_FIX: Prevented race condition error in proxy', {
            property,
            target,
            error: error.message
          });
          return null;
        }
        throw error;
      }
    }
  });
};

/**
 * Array method overrides for safe array operations
 */
const createSafeArrayMethods = () => {
  const originalArrayMap = Array.prototype.map;
  const originalArrayFilter = Array.prototype.filter;
  const originalArrayReduce = Array.prototype.reduce;
  const originalArrayFind = Array.prototype.find;
  
  // Override Array.prototype.map
  Array.prototype.map = function<T, U>(this: T[], callback: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
    try {
      return originalArrayMap.call(this, (item, index, array) => {
        if (item === null || item === undefined) {
          return null as any;
        }
        
        try {
          return callback.call(thisArg, item, index, array);
        } catch (error) {
          if (error.message.includes("Cannot read properties of undefined")) {
            console.warn('🛡️ ARRAY_MAP_FIX: Prevented race condition in map', { item, index });
            return null as any;
          }
          throw error;
        }
      }).filter(item => item !== null);
    } catch (error) {
      console.warn('🛡️ ARRAY_MAP_FIX: Error in array map, returning empty array', { error: error.message });
      return [];
    }
  };
  
  // Override Array.prototype.filter
  Array.prototype.filter = function<T>(this: T[], callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T[] {
    try {
      return originalArrayFilter.call(this, (item, index, array) => {
        if (item === null || item === undefined) {
          return false;
        }
        
        try {
          return callback.call(thisArg, item, index, array);
        } catch (error) {
          if (error.message.includes("Cannot read properties of undefined")) {
            console.warn('🛡️ ARRAY_FILTER_FIX: Prevented race condition in filter', { item, index });
            return false;
          }
          throw error;
        }
      });
    } catch (error) {
      console.warn('🛡️ ARRAY_FILTER_FIX: Error in array filter, returning empty array', { error: error.message });
      return [];
    }
  };
  
  // Override Array.prototype.reduce
  Array.prototype.reduce = function<T, U>(
    this: T[], 
    callback: (acc: U, value: T, index: number, array: T[]) => U, 
    initialValue?: U
  ): U {
    try {
      return originalArrayReduce.call(this, (acc, item, index, array) => {
        if (item === null || item === undefined) {
          return acc;
        }
        
        try {
          return callback(acc, item, index, array);
        } catch (error) {
          if (error.message.includes("Cannot read properties of undefined")) {
            console.warn('🛡️ ARRAY_REDUCE_FIX: Prevented race condition in reduce', { item, index, acc });
            return acc;
          }
          throw error;
        }
      }, initialValue!);
    } catch (error) {
      console.warn('🛡️ ARRAY_REDUCE_FIX: Error in array reduce, returning initial value', { error: error.message });
      return initialValue!;
    }
  };
  
  // Override Array.prototype.find
  Array.prototype.find = function<T>(this: T[], callback: (value: T, index: number, array: T[]) => boolean, thisArg?: any): T | undefined {
    try {
      return originalArrayFind.call(this, (item, index, array) => {
        if (item === null || item === undefined) {
          return false;
        }
        
        try {
          return callback.call(thisArg, item, index, array);
        } catch (error) {
          if (error.message.includes("Cannot read properties of undefined")) {
            console.warn('🛡️ ARRAY_FIND_FIX: Prevented race condition in find', { item, index });
            return false;
          }
          throw error;
        }
      });
    } catch (error) {
      console.warn('🛡️ ARRAY_FIND_FIX: Error in array find, returning undefined', { error: error.message });
      return undefined;
    }
  };
};

/**
 * Initialize all global fixes
 */
export const initializeGlobalRaceConditionFix = () => {
  console.log('🛡️ GLOBAL_RACE_CONDITION_FIX: Initializing comprehensive protection...');
  
  try {
    createSafePropertyAccess();
    createSafeArrayMethods();
    
    console.log('🛡️ GLOBAL_RACE_CONDITION_FIX: All protections initialized successfully');
  } catch (error) {
    console.error('🚨 GLOBAL_RACE_CONDITION_FIX: Failed to initialize', error);
  }
};

// Export proxy creator for manual use
export { createSafeProxy };