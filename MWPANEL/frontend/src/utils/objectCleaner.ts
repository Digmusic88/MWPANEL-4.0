import React from 'react';

// Emergency object cleaner to fix {type, count} rendering issues
export const cleanObjectForRender = (value: any): any => {
  if (value && typeof value === 'object' && !Array.isArray(value) && !React.isValidElement(value)) {
    const keys = Object.keys(value);
    
    // Handle {type, count} objects specifically
    if (keys.includes('type') && keys.includes('count')) {
      console.warn('🧹 CLEANED {type, count} object:', value);
      return `${value.type}: ${value.count}`;
    }
    
    // Handle other problematic objects
    if (keys.length === 2 && (keys.includes('type') || keys.includes('count'))) {
      return JSON.stringify(value);
    }
  }
  
  return value;
};

// Apply cleaner to arrays/objects recursively
export const deepCleanForRender = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(cleanObjectForRender);
  }
  
  if (data && typeof data === 'object' && !React.isValidElement(data)) {
    const cleaned: any = {};
    Object.keys(data).forEach(key => {
      cleaned[key] = cleanObjectForRender(data[key]);
    });
    return cleaned;
  }
  
  return cleanObjectForRender(data);
};

// Global window function for emergency cleanup
declare global {
  interface Window {
    __emergencyCleanObjects: () => void;
  }
}

window.__emergencyCleanObjects = () => {
  console.log('🆘 Emergency object cleanup triggered');
  
  // Find all elements with potential object content
  const allElements = document.querySelectorAll('*');
  let cleanedCount = 0;
  
  allElements.forEach(el => {
    if (el.textContent && el.textContent.includes('[object Object]')) {
      console.log('Found problematic element:', el);
      cleanedCount++;
    }
  });
  
  console.log(`🧹 Emergency cleanup completed. Found ${cleanedCount} problematic elements.`);
};