import React, { useEffect } from 'react';

interface ObjectDetectorProps {
  data: any;
  context: string;
}

const ObjectDetector: React.FC<ObjectDetectorProps> = ({ data, context }) => {
  useEffect(() => {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data);
      if (keys.includes('type') && keys.includes('count')) {
        console.error(`🚨 DETECTED OBJECT WITH {type, count} IN ${context}:`, data);
        console.trace('Stack trace for object detection');
      }
    }
  }, [data, context]);

  // Safe rendering function
  const safeRender = (value: any) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (keys.includes('type') && keys.includes('count')) {
        return `${value.type}: ${value.count}`;
      }
    }
    return value;
  };

  return null; // This is a debug component, doesn't render anything
};

export default ObjectDetector;