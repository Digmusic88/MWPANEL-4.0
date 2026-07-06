/**
 * Safe access utilities to prevent race conditions
 * These utilities provide safe ways to access nested properties
 * without monkey-patching native JavaScript methods
 */

/**
 * Safely access a nested property path
 * @param obj Object to access
 * @param path Property path (e.g., 'user.profile.id')
 * @param defaultValue Default value if path doesn't exist
 */
export function get<T = any>(
  obj: any,
  path: string | string[],
  defaultValue?: T
): T {
  const pathArray = Array.isArray(path) ? path : path.split('.');
  
  let result = obj;
  for (const key of pathArray) {
    if (result === null || result === undefined) {
      return defaultValue as T;
    }
    result = result[key];
  }
  
  return result === undefined ? (defaultValue as T) : result;
}

/**
 * Safely check if a nested property exists
 */
export function has(obj: any, path: string | string[]): boolean {
  const pathArray = Array.isArray(path) ? path : path.split('.');
  
  let current = obj;
  for (const key of pathArray) {
    if (current === null || current === undefined || !(key in current)) {
      return false;
    }
    current = current[key];
  }
  
  return true;
}

/**
 * Safe array operations
 */
export const safeArray = {
  map<T, U>(
    array: T[] | null | undefined,
    callback: (item: T, index: number) => U
  ): U[] {
    if (!Array.isArray(array)) return [];
    return array.filter(item => item != null).map(callback);
  },
  
  filter<T>(
    array: T[] | null | undefined,
    predicate: (item: T, index: number) => boolean
  ): T[] {
    if (!Array.isArray(array)) return [];
    return array.filter(item => item != null && predicate(item, array.indexOf(item)));
  },
  
  find<T>(
    array: T[] | null | undefined,
    predicate: (item: T, index: number) => boolean
  ): T | undefined {
    if (!Array.isArray(array)) return undefined;
    return array.find((item, index) => item != null && predicate(item, index));
  },
  
  reduce<T, U>(
    array: T[] | null | undefined,
    callback: (acc: U, item: T, index: number) => U,
    initialValue: U
  ): U {
    if (!Array.isArray(array)) return initialValue;
    return array
      .filter(item => item != null)
      .reduce(callback, initialValue);
  },
};

/**
 * Safe object operations
 */
export const safeObject = {
  keys(obj: any): string[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.keys(obj);
  },
  
  values<T = any>(obj: any): T[] {
    if (!obj || typeof obj !== 'object') return [];
    return Object.values(obj);
  },
  
  entries<T = any>(obj: any): Array<[string, T]> {
    if (!obj || typeof obj !== 'object') return [];
    return Object.entries(obj);
  },
};

/**
 * Create a safe wrapper around an object that prevents
 * undefined access errors
 */
export function createSafeAccessor<T extends object>(obj: T | null | undefined): T {
  if (!obj) {
    return new Proxy({} as T, {
      get() {
        return undefined;
      },
    });
  }
  
  return new Proxy(obj, {
    get(target: any, property: string | symbol) {
      const value = target[property];
      
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        return createSafeAccessor(value);
      }
      
      return value;
    },
  });
}

/**
 * Wrapper for async operations with proper error handling
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  defaultValue?: T
): Promise<[T | undefined, Error | undefined]> {
  try {
    const result = await promise;
    return [result, undefined];
  } catch (error) {
    return [defaultValue, error as Error];
  }
}

/**
 * Debounce with cleanup to prevent race conditions
 */
export function safeDebounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T & { cancel: () => void } {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: any[] | null = null;
  
  const debounced = (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      if (lastArgs) {
        func(...lastArgs);
        lastArgs = null;
      }
    }, wait);
  };
  
  debounced.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = null;
  };
  
  return debounced as T & { cancel: () => void };
}

/**
 * Throttle with cleanup to prevent race conditions
 */
export function safeThrottle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T & { cancel: () => void } {
  let inThrottle = false;
  let lastArgs: any[] | null = null;
  let timeout: NodeJS.Timeout | null = null;
  
  const throttled = (...args: Parameters<T>) => {
    lastArgs = args;
    
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      timeout = setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          throttled(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    }
  };
  
  throttled.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    inThrottle = false;
    lastArgs = null;
  };
  
  return throttled as T & { cancel: () => void };
}