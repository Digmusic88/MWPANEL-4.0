import { BadRequestException } from '@nestjs/common';

/**
 * TSX Security Validator for Backend
 * Validates TSX content on the server side for additional security
 */

export interface TsxSecurityResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SecurityPattern {
  pattern: RegExp;
  message: string;
  severity: 'error' | 'warning';
  riskLevel: 'low' | 'medium' | 'high';
}

// Server-side security patterns (more strict than frontend)
const SECURITY_PATTERNS: SecurityPattern[] = [
  // Critical security issues - HIGH RISK
  {
    pattern: /eval\s*\(/gi,
    message: 'eval() function is strictly prohibited',
    severity: 'error',
    riskLevel: 'high'
  },
  {
    pattern: /Function\s*\(/gi,
    message: 'Function constructor is prohibited',
    severity: 'error',
    riskLevel: 'high'
  },
  {
    pattern: /setTimeout\s*\(/gi,
    message: 'setTimeout is not allowed in educational components',
    severity: 'error',
    riskLevel: 'high'
  },
  {
    pattern: /setInterval\s*\(/gi,
    message: 'setInterval is not allowed in educational components',
    severity: 'error',
    riskLevel: 'high'
  },
  {
    pattern: /window\./gi,
    message: 'Direct window access is prohibited',
    severity: 'error',
    riskLevel: 'high'
  },
  {
    pattern: /document\./gi,
    message: 'Direct document access is prohibited',
    severity: 'error',
    riskLevel: 'high'
  },
  {
    pattern: /dangerouslySetInnerHTML/gi,
    message: 'dangerouslySetInnerHTML is prohibited for security',
    severity: 'error',
    riskLevel: 'high'
  },
  {
    pattern: /__dirname|__filename|process\.env/gi,
    message: 'Node.js global variables are not allowed',
    severity: 'error',
    riskLevel: 'high'
  },
  {
    pattern: /require\s*\(/gi,
    message: 'require() is not allowed, use import statements',
    severity: 'error',
    riskLevel: 'high'
  },

  // Medium security issues - MEDIUM RISK
  {
    pattern: /import\s+.*from\s+['"`]http/gi,
    message: 'HTTP imports from external sources not allowed',
    severity: 'error',
    riskLevel: 'medium'
  },
  {
    pattern: /import\s+.*from\s+['"`]lucide-react/gi,
    message: 'lucide-react not allowed, use @ant-design/icons instead',
    severity: 'error',
    riskLevel: 'medium'
  },
  {
    pattern: /fetch\s*\(/gi,
    message: 'Direct fetch calls should be avoided, use controlled API calls',
    severity: 'warning',
    riskLevel: 'medium'
  },
  {
    pattern: /axios\.|fetch\(/gi,
    message: 'HTTP requests should be handled through controlled services',
    severity: 'warning',
    riskLevel: 'medium'
  },

  // Low security issues - LOW RISK
  {
    pattern: /console\.log\s*\(/gi,
    message: 'console.log detected - consider removing for production',
    severity: 'warning',
    riskLevel: 'low'
  },
  {
    pattern: /debugger;/gi,
    message: 'debugger statement should be removed',
    severity: 'warning',
    riskLevel: 'low'
  },
  {
    pattern: /alert\s*\(/gi,
    message: 'alert() should be replaced with proper UI notifications',
    severity: 'warning',
    riskLevel: 'low'
  }
];

// Whitelist of allowed imports for educational components
const ALLOWED_IMPORTS = [
  'react',
  '@types/react',
  'antd',
  '@ant-design/icons',
  '@ant-design/plots',
  'framer-motion',
  'dayjs',
  'lodash',
  'clsx',
  'classnames'
];

/**
 * Validates TSX content for security issues
 */
export function validateTsxSecurity(content: string): TsxSecurityResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let maxRiskLevel: 'low' | 'medium' | 'high' = 'low';

  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      errors: ['Invalid or empty content provided'],
      warnings: [],
      riskLevel: 'high'
    };
  }

  // Apply security patterns
  for (const pattern of SECURITY_PATTERNS) {
    const matches = content.match(pattern.pattern);
    if (matches) {
      const message = `${pattern.message} (found ${matches.length} occurrence${matches.length > 1 ? 's' : ''})`;
      
      if (pattern.severity === 'error') {
        errors.push(message);
      } else {
        warnings.push(message);
      }

      // Update risk level
      if (pattern.riskLevel === 'high') {
        maxRiskLevel = 'high';
      } else if (pattern.riskLevel === 'medium' && maxRiskLevel !== 'high') {
        maxRiskLevel = 'medium';
      }
    }
  }

  // Validate imports
  const importValidation = validateImports(content);
  errors.push(...importValidation.errors);
  warnings.push(...importValidation.warnings);

  // Validate basic React structure
  const structureValidation = validateReactStructure(content);
  errors.push(...structureValidation.errors);
  warnings.push(...structureValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    riskLevel: maxRiskLevel
  };
}

/**
 * Validates import statements
 */
function validateImports(content: string): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Find all import statements
  const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
  const imports = [...content.matchAll(importRegex)];
  
  for (const [fullMatch, importPath] of imports) {
    // Check if import is allowed
    const isAllowed = ALLOWED_IMPORTS.some(allowed => 
      importPath.startsWith(allowed) || 
      importPath.startsWith('./') || 
      importPath.startsWith('../')
    );
    
    if (!isAllowed) {
      if (importPath.startsWith('http') || importPath.includes('://')) {
        errors.push(`Unsafe external import detected: ${importPath}`);
      } else {
        warnings.push(`Potentially unsafe import: ${importPath}. Consider using approved libraries.`);
      }
    }
  }
  
  return { errors, warnings };
}

/**
 * Validates React component structure
 */
function validateReactStructure(content: string): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for React import
  if (!content.includes('import React') && !content.includes('import * as React')) {
    errors.push('Missing React import statement');
  }
  
  // Check for export default (skip for sandbox-processed code)
  // Sandbox-processed code removes exports for VM2 compatibility
  const isSandboxProcessed = content.includes('// Auto-fixed for sandbox compatibility') || 
                            content.includes('// Auto-fixed') || 
                            content.includes('// Sandbox compatible') ||
                            (!content.includes('export') && content.includes('function') && content.includes('return'));
  
  if (!isSandboxProcessed && !content.includes('export default')) {
    errors.push('Component must have a default export');
  }
  
  // Check for TypeScript interface (recommended)
  if (content.includes('props') && !content.includes('interface') && !content.includes('type ')) {
    warnings.push('Consider defining TypeScript interfaces for component props');
  }
  
  // Check for JSX without proper typing
  if (content.includes('<') && content.includes('>')) {
    if (!content.includes('React.FC') && !content.includes('React.Component') && !content.includes(': JSX.Element')) {
      warnings.push('Consider using React.FC or proper JSX typing');
    }
  }
  
  return { errors, warnings };
}

/**
 * Sanitizes TSX content by removing dangerous patterns
 */
export function sanitizeTsxContent(content: string): string {
  let sanitized = content;
  
  // Remove dangerous function calls
  sanitized = sanitized.replace(/eval\s*\([^)]*\)/g, '/* eval removed for security */');
  sanitized = sanitized.replace(/Function\s*\([^)]*\)/g, '/* Function constructor removed */');
  sanitized = sanitized.replace(/setTimeout\s*\([^)]*\)/g, '/* setTimeout removed */');
  sanitized = sanitized.replace(/setInterval\s*\([^)]*\)/g, '/* setInterval removed */');
  
  // Remove dangerous property access
  sanitized = sanitized.replace(/window\./g, '/* window access removed */');
  sanitized = sanitized.replace(/document\./g, '/* document access removed */');
  
  // Remove dangerous attributes
  sanitized = sanitized.replace(/dangerouslySetInnerHTML\s*=/g, '/* dangerouslySetInnerHTML removed */');
  
  // Replace problematic imports
  sanitized = sanitized.replace(
    /import\s+.*from\s+['"`]lucide-react['"`]/g, 
    "import { QuestionCircleOutlined } from '@ant-design/icons'; // Replaced unsafe import"
  );
  
  return sanitized;
}

/**
 * NestJS decorator for validating TSX content
 */
export function ValidateTsxContent() {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      // Find TSX content in arguments
      for (const arg of args) {
        if (arg && typeof arg === 'object') {
          if (arg.content || arg.sourceCode) {
            const content = arg.content || arg.sourceCode;
            const validation = validateTsxSecurity(content);
            
            if (!validation.isValid) {
              throw new BadRequestException({
                message: 'TSX content validation failed',
                errors: validation.errors,
                warnings: validation.warnings,
                riskLevel: validation.riskLevel
              });
            }
            
            // Log warnings if any
            if (validation.warnings.length > 0) {
              console.warn('TSX Security Warnings:', validation.warnings);
            }
          }
        }
      }
      
      return method.apply(this, args);
    };
  };
}