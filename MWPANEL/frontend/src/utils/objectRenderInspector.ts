/**
 * Development utility to help track down object rendering issues
 * This inspector helps identify where {type, count} objects are being rendered
 */

interface InspectorConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info';
  breakOnDetection: boolean;
}

class ObjectRenderInspector {
  private config: InspectorConfig = {
    enabled: process.env.NODE_ENV === 'development',
    logLevel: 'error',
    breakOnDetection: false,
  };

  private detectedLocations: Map<string, number> = new Map();

  configure(config: Partial<InspectorConfig>) {
    this.config = { ...this.config, ...config };
  }

  inspect(value: any, context: string): any {
    if (!this.config.enabled) return value;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value);
      
      if (keys.includes('type') && keys.includes('count')) {
        this.handleDetection(value, context);
        return `${value.type}: ${value.count}`;
      }
    }

    return value;
  }

  private handleDetection(value: any, context: string) {
    const location = `${context} - ${JSON.stringify(value)}`;
    const count = (this.detectedLocations.get(location) || 0) + 1;
    this.detectedLocations.set(location, count);

    const message = `🚨 Object Render Inspector: Detected {type, count} object in ${context}`;
    
    switch (this.config.logLevel) {
      case 'error':
        console.error(message, value);
        break;
      case 'warn':
        console.warn(message, value);
        break;
      case 'info':
        console.info(message, value);
        break;
    }

    console.trace('Stack trace for object detection');

    if (this.config.breakOnDetection) {
      // This will break in the debugger if DevTools are open
      debugger;
    }
  }

  getReport(): string {
    const report = ['=== Object Render Inspector Report ==='];
    
    this.detectedLocations.forEach((count, location) => {
      report.push(`${location} - Detected ${count} times`);
    });

    return report.join('\n');
  }

  clearReport() {
    this.detectedLocations.clear();
  }
}

// Create singleton instance
export const objectRenderInspector = new ObjectRenderInspector();

// Expose to window for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__objectRenderInspector = objectRenderInspector;
  (window as any).__ori = objectRenderInspector; // Short alias
  
  console.log('🔍 Object Render Inspector available:');
  console.log('  - window.__objectRenderInspector.configure({ breakOnDetection: true })');
  console.log('  - window.__objectRenderInspector.getReport()');
  console.log('  - window.__ori (short alias)');
}

// Helper hook for React components
export const useObjectInspector = (value: any, componentName: string): any => {
  return objectRenderInspector.inspect(value, componentName);
};