// React Interceptor to catch object rendering errors
declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__: any;
  }
}

const originalCreateElement = React.createElement;

// Override React.createElement to intercept all renders
React.createElement = function(type: any, props: any, ...children: any[]) {
  // Check all children for objects with {type, count}
  const safeChildren = children.map((child, index) => {
    if (child && typeof child === 'object' && !React.isValidElement(child) && !Array.isArray(child)) {
      const keys = Object.keys(child);
      if (keys.includes('type') && keys.includes('count')) {
        console.error(`🚨 INTERCEPTED OBJECT RENDER in ${type?.name || type}:`, child);
        console.trace('Stack trace for object rendering');
        
        // Convert object to safe string representation
        return `${child.type}: ${child.count}`;
      }
    }
    return child;
  });

  return originalCreateElement.call(this, type, props, ...safeChildren);
};

export {};