/**
 * TSX Security Validator
 * Validates and sanitizes TSX/TypeScript code uploads
 * Protects against malicious patterns and ensures type safety
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedCode?: string;
}

export interface SecurityRule {
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warning';
}

// Security rules for TSX validation
const SECURITY_RULES: SecurityRule[] = [
  // Prohibited patterns - ERRORS
  {
    pattern: /setTimeout\s*\(/gi,
    message: 'setTimeout() no está permitido por razones de seguridad',
    severity: 'error'
  },
  {
    pattern: /setInterval\s*\(/gi,
    message: 'setInterval() no está permitido por razones de seguridad',
    severity: 'error'
  },
  {
    pattern: /window\./gi,
    message: 'Acceso directo a window no está permitido',
    severity: 'error'
  },
  {
    pattern: /document\./gi,
    message: 'Acceso directo a document no está permitido',
    severity: 'error'
  },
  {
    pattern: /eval\s*\(/gi,
    message: 'eval() está prohibido por razones de seguridad',
    severity: 'error'
  },
  {
    pattern: /Function\s*\(/gi,
    message: 'Constructor Function() está prohibido',
    severity: 'error'
  },
  {
    pattern: /import\s+.*from\s+['"`]lucide-react['"`]/gi,
    message: 'Import de lucide-react no permitido, usa @ant-design/icons',
    severity: 'error'
  },
  {
    pattern: /dangerouslySetInnerHTML/gi,
    message: 'dangerouslySetInnerHTML no está permitido',
    severity: 'error'
  },
  
  // Suspicious patterns - WARNINGS
  {
    pattern: /onClick\s*=/gi,
    message: 'Uso de onClick detectado - asegúrate de que sea seguro',
    severity: 'warning'
  }
];

// Required TypeScript configuration for educational TSX components
const REQUIRED_TYPESCRIPT_CONFIG = {
  imports: [
    "import React from 'react';",
    "import { FC } from 'react';"
  ],
  types: {
    // Define basic types that should be available
    componentProps: "interface ComponentProps { className?: string; children?: React.ReactNode; }",
    // Add more required interfaces as needed
  }
};

/**
 * Validates TSX code for security and TypeScript compliance
 */
export function validateTsxCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitizedCode = code;

  // Basic structure validation
  if (!code.trim()) {
    errors.push('El archivo TSX está vacío');
    return { isValid: false, errors, warnings };
  }

  // Check for basic React import
  if (!code.includes('import React') && !code.includes('import * as React')) {
    errors.push('Falta import de React - se agregará automáticamente');
    sanitizedCode = "import React from 'react';\n" + sanitizedCode;
  }

  // Check for component export
  if (!code.includes('export default') && !code.includes('export const') && !code.includes('export function')) {
    errors.push('El componente debe tener una exportación por defecto');
  }

  // Apply security rules
  for (const rule of SECURITY_RULES) {
    const matches = code.match(rule.pattern);
    if (matches) {
      const message = `${rule.message} (encontrado ${matches.length} vez/veces)`;
      if (rule.severity === 'error') {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }
  }

  // TypeScript basic validation
  const tsErrors = validateTypeScriptStructure(code);
  errors.push(...tsErrors);

  // Sanitize and enhance code for educational environment
  if (errors.length === 0) {
    sanitizedCode = enhanceEducationalTsx(sanitizedCode);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    sanitizedCode: errors.length === 0 ? sanitizedCode : undefined
  };
}

/**
 * Validates TypeScript structure and common issues
 */
function validateTypeScriptStructure(code: string): string[] {
  const errors: string[] = [];

  // Check for JSX without proper React types
  if (code.includes('<') && code.includes('>') && !code.includes('React.FC') && !code.includes('React.Component')) {
    errors.push('Componente JSX debe usar React.FC o extender React.Component');
  }

  // Check for proper TypeScript interface definitions
  if (code.includes('props') && !code.includes('interface') && !code.includes('type ')) {
    errors.push('Se recomienda definir interfaces TypeScript para las props');
  }

  return errors;
}

/**
 * Enhances TSX code for educational environment
 */
function enhanceEducationalTsx(code: string): string {
  let enhanced = code;

  // Add educational wrapper if not present
  if (!enhanced.includes('// Educational Component')) {
    enhanced = `// Educational Component - Safe TSX for MW Panel
${enhanced}`;
  }

  // Ensure proper TypeScript strict mode
  if (!enhanced.includes('// @ts-strict')) {
    enhanced = `// @ts-strict\n${enhanced}`;
  }

  // Add safety wrapper for educational components
  const safetyWrapper = `
// Safety wrapper for educational TSX components
const SafeComponent: React.FC<any> = (props) => {
  try {
    return (
${addIndentation(enhanced, 6)}
    );
  } catch (error) {
    console.error('Error in educational component:', error);
    return <div className="error-boundary">Error al renderizar componente educativo</div>;
  }
};

export default SafeComponent;
`;

  return safetyWrapper;
}

/**
 * Adds indentation to code
 */
function addIndentation(code: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return code
    .split('\n')
    .map(line => line.trim() ? indent + line : line)
    .join('\n');
}

/**
 * Removes dangerous patterns from code
 */
export function sanitizeTsxCode(code: string): string {
  let sanitized = code;

  // Remove dangerous global access
  sanitized = sanitized.replace(/window\./g, '// window access removed //');
  sanitized = sanitized.replace(/document\./g, '// document access removed //');
  sanitized = sanitized.replace(/setTimeout\s*\(/g, '// setTimeout removed //');
  sanitized = sanitized.replace(/setInterval\s*\(/g, '// setInterval removed //');
  sanitized = sanitized.replace(/eval\s*\(/g, '// eval removed //');

  // Replace problematic imports
  sanitized = sanitized.replace(/import\s+.*from\s+['"`]lucide-react['"`]/g, 
    "import { QuestionCircleOutlined } from '@ant-design/icons'; // Replaced lucide-react");

  return sanitized;
}

/**
 * Creates a safe TypeScript configuration for educational components
 */
export function createSafeTsxTemplate(): string {
  return `import React from 'react';
import { Card } from 'antd';

// Educational Component Template
// Safe TSX component for learning purposes

interface EducationalComponentProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}

const EducationalComponent: React.FC<EducationalComponentProps> = ({ 
  title = "Componente Educativo",
  children,
  className 
}) => {
  return (
    <Card 
      title={title}
      className={className}
      style={{ margin: '16px', borderRadius: '8px' }}
    >
      {children || (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <h3>¡Componente TSX Seguro!</h3>
          <p>Este es un componente educativo seguro y válido.</p>
        </div>
      )}
    </Card>
  );
};

export default EducationalComponent;
`;
}

/**
 * Validates file before processing
 */
export function validateTsxFile(file: File): ValidationResult {
  const errors: string[] = [];

  // File extension validation
  const validExtensions = ['.tsx', '.ts', '.jsx'];
  const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  
  if (!hasValidExtension) {
    errors.push(`Extensión de archivo no válida. Use: ${validExtensions.join(', ')}`);
  }

  // File size validation (max 2MB for educational components)
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    errors.push(`Archivo demasiado grande. Máximo permitido: ${maxSize / (1024 * 1024)}MB`);
  }

  // File name validation (no special characters for security)
  if (!/^[a-zA-Z0-9._-]+$/.test(file.name)) {
    errors.push('Nombre de archivo contiene caracteres no permitidos. Use solo letras, números, puntos y guiones');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: []
  };
}