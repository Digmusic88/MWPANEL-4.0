import React from 'react';

interface SafeRenderProps {
  value: any;
  fallback?: React.ReactNode;
  context?: string;
}

/**
 * SafeRender component that prevents objects from being rendered directly as React children
 * Specifically handles {type, count} objects and other problematic structures
 */
const SafeRender: React.FC<SafeRenderProps> = ({ value, fallback, context }) => {
  // If it's a valid React element, render it as-is
  if (React.isValidElement(value)) {
    return value;
  }

  // If it's null or undefined, render fallback or nothing
  if (value === null || value === undefined) {
    return <>{fallback || null}</>;
  }

  // If it's a primitive type (string, number, boolean), render it directly
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <>{value}</>;
  }

  // If it's an array, render each item safely
  if (Array.isArray(value)) {
    return (
      <>
        {value.map((item, index) => (
          <SafeRender key={index} value={item} context={`${context}[${index}]`} />
        ))}
      </>
    );
  }

  // If it's an object, handle special cases
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    
    // Handle {type, count} objects specifically
    if (keys.includes('type') && keys.includes('count')) {
      if (context) {
        console.warn(`🚨 SafeRender caught {type, count} object in context: ${context}`, value);
      }
      return <>{`${value.type}: ${value.count}`}</>;
    }
    
    // Handle Date objects
    if (value instanceof Date) {
      return <>{value.toLocaleString()}</>;
    }
    
    // For other objects, return a safe string representation
    if (context) {
      console.warn(`🚨 SafeRender caught object rendering in context: ${context}`, value);
    }
    
    // If fallback is provided, use it
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Otherwise, return a safe string representation
    return <>{JSON.stringify(value)}</>;
  }

  // For functions and other types, don't render anything
  return <>{fallback || null}</>;
};

export default SafeRender;

/**
 * Hook to safely render values that might contain objects
 */
export const useSafeRender = (value: any, context?: string): React.ReactNode => {
  if (React.isValidElement(value)) {
    return value;
  }

  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => useSafeRender(item, `${context}[${index}]`));
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    
    if (keys.includes('type') && keys.includes('count')) {
      if (context) {
        console.warn(`🚨 useSafeRender caught {type, count} object in context: ${context}`, value);
      }
      return `${value.type}: ${value.count}`;
    }
    
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    
    if (context) {
      console.warn(`🚨 useSafeRender caught object rendering in context: ${context}`, value);
    }
    
    return JSON.stringify(value);
  }

  return null;
};