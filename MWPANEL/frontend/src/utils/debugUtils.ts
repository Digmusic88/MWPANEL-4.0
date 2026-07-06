/**
 * Debug utility to detect and prevent object rendering errors
 * This helps identify where objects with {type, count} structure are being rendered
 */

// Development-only error boundary for debugging object rendering
export const debugObjectRendering = (value: any, context: string = 'unknown') => {
  if (process.env.NODE_ENV === 'development') {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (keys.includes('type') && keys.includes('count')) {
        console.error(`[DEBUG] Attempting to render object with {type, count} in context: ${context}`, value);
        console.trace('Rendering trace:');
      }
    }
  }
  return value;
};

// Safe renderer for potential objects
export const safeRender = (value: any, fallback: string = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }
  
  if (typeof value === 'object' && !Array.isArray(value)) {
    // If it's an object with type/count, render appropriately
    if ('type' in value && 'count' in value) {
      return `${value.type}: ${value.count}`;
    }
    
    // For other objects, stringify safely
    try {
      return JSON.stringify(value);
    } catch {
      return '[Object]';
    }
  }
  
  return String(value);
};

// Chart data validator
export const validateChartData = (data: any[], context: string = 'chart') => {
  if (!Array.isArray(data)) {
    console.warn(`[CHART] Invalid data for ${context}: expected array, got ${typeof data}`);
    return [];
  }
  
  return data.filter(item => {
    if (typeof item !== 'object' || item === null) {
      console.warn(`[CHART] Invalid item in ${context}: expected object, got ${typeof item}`);
      return false;
    }
    
    // Check for required chart properties
    const hasRequiredProps = Object.keys(item).length > 0;
    if (!hasRequiredProps) {
      console.warn(`[CHART] Empty object in ${context} data`);
      return false;
    }
    
    return true;
  });
};

// Statistics data validator
export const validateStatsData = (stats: any, requiredKeys: string[] = []) => {
  if (typeof stats !== 'object' || stats === null) {
    console.warn('[STATS] Invalid stats data: expected object');
    return null;
  }
  
  const missingKeys = requiredKeys.filter(key => !(key in stats));
  if (missingKeys.length > 0) {
    console.warn('[STATS] Missing required keys:', missingKeys);
  }
  
  return stats;
};