import { useMemo } from 'react';
import React from 'react';

/**
 * Hook that ensures a value is safe to render as a React child
 * Specifically handles {type, count} objects and other problematic structures
 */
export const useSafeValue = (value: any, context?: string): any => {
  return useMemo(() => {
    // If it's already a valid React element, return as-is
    if (React.isValidElement(value)) {
      return value;
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return null;
    }

    // Primitives are safe
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }

    // Arrays need to be processed recursively
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (typeof item === 'object' && !React.isValidElement(item)) {
          console.warn(`useSafeValue: Processing array item ${index} in ${context || 'unknown context'}`);
          return useSafeValue(item, `${context}[${index}]`);
        }
        return item;
      });
    }

    // Handle objects
    if (typeof value === 'object') {
      const keys = Object.keys(value);
      
      // Special handling for {type, count} objects
      if (keys.includes('type') && keys.includes('count')) {
        if (context) {
          console.warn(`🚨 useSafeValue: Found {type, count} object in ${context}:`, value);
        }
        // Return a formatted string instead of the object
        return `${value.type}: ${value.count}`;
      }

      // Handle Date objects
      if (value instanceof Date) {
        return value.toLocaleString();
      }

      // For other objects, log a warning and return a safe representation
      if (context) {
        console.warn(`⚠️ useSafeValue: Converting object to string in ${context}:`, value);
      }
      
      // Try to return a meaningful string representation
      if (value.toString && value.toString !== Object.prototype.toString) {
        return value.toString();
      }
      
      return JSON.stringify(value);
    }

    // For functions and other types, return null
    return null;
  }, [value, context]);
};

/**
 * Hook that wraps an object's properties to ensure they're safe for rendering
 */
export const useSafeObject = <T extends Record<string, any>>(obj: T, context?: string): T => {
  return useMemo(() => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const safeObj = {} as T;
    
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      
      // Skip functions and symbols
      if (typeof value === 'function' || typeof value === 'symbol') {
        safeObj[key] = value;
        return;
      }
      
      // For objects that might be rendered, make them safe
      if (typeof value === 'object' && !React.isValidElement(value) && !Array.isArray(value)) {
        const valueKeys = Object.keys(value || {});
        
        // Check if it's a {type, count} object
        if (valueKeys.includes('type') && valueKeys.includes('count')) {
          console.warn(`🚨 useSafeObject: Found {type, count} at ${context}.${key}:`, value);
          safeObj[key] = `${value.type}: ${value.count}`;
          return;
        }
      }
      
      safeObj[key] = value;
    });
    
    return safeObj;
  }, [obj, context]);
};