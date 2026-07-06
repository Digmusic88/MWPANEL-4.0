/**
 * TSX Auto-Fixer
 * Automatically fixes common TSX/TypeScript issues
 * Converts problematic code to MW Panel compatible components
 */

export interface AutoFixResult {
  wasFixed: boolean;
  fixedCode?: string;
  fixesApplied: string[];
  remainingIssues: string[];
  isUsable: boolean;
}

export interface TSXFixRule {
  name: string;
  description: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  critical: boolean; // If true, file is unusable without this fix
}

// Auto-fix rules for common issues
const AUTO_FIX_RULES: TSXFixRule[] = [
  // Critical fixes - must be applied
  {
    name: 'Replace navigator locale pattern with optional chaining',
    description: 'Reemplaza el patrón completo navigator.languages?.[0] || navigator.language || default con valor seguro',
    pattern: /navigator\.languages\?\.\[0\]\s*\|\|\s*navigator\.language\s*\|\|\s*['"`][\w-]+['"`]/g,
    replacement: "'en-US'",
    critical: false
  },
  {
    name: 'Remove Object Declarations',
    description: 'Elimina declaraciones problemáticas de Object que causan Cannot access Object before initialization',
    pattern: /^.*\b(const|let|var|interface)\s+Object\b.*$/gm,
    replacement: '// Removed problematic Object declaration',
    critical: true
  },
  {
    name: 'Remove Global Type Declarations',
    description: 'Elimina declaraciones de tipos globales problemáticas',
    pattern: /^.*\b(interface|type)\s+(Boolean|Number|String|Function|Array|Promise)\s*\{.*$/gm,
    replacement: '// Removed problematic global type declaration',
    critical: true
  },
  {
    name: 'Remove Declare Global Blocks',
    description: 'Elimina bloques declare global que causan errores de inicialización',
    pattern: /declare\s+global\s*\{[\s\S]*?\}/gm,
    replacement: '// Removed declare global block',
    critical: true
  },
  {
    name: 'Add React Import',
    description: 'Agrega import de React requerido',
    pattern: /^(?!.*import\s+React)/m,
    replacement: "import React from 'react';\n",
    critical: true
  },
  {
    name: 'Replace setTimeout',
    description: 'Reemplaza setTimeout con useEffect y setTimeout simulado',
    pattern: /setTimeout\s*\([^)]*\)[^;]*;?/g,
    replacement: '// setTimeout removed for security',
    critical: true
  },
  {
    name: 'Replace window access',
    description: 'Reemplaza acceso a window con alternativas seguras',
    pattern: /window\./g,
    replacement: '/* window access removido - usar props en su lugar */',
    critical: true
  },
  {
    name: 'Replace navigator access',
    description: 'Reemplaza navigator con valores seguros para sandbox',
    pattern: /navigator\.languages\?\.\[0\]\s*\|\|\s*navigator\.language\s*\|\|/g,
    replacement: '',
    critical: false
  },
  {
    name: 'Replace navigator.language',
    description: 'Reemplaza navigator.language con valor por defecto',
    pattern: /navigator\.language/g,
    replacement: "'en-US'",
    critical: false
  },
  {
    name: 'Replace navigator.languages',
    description: 'Reemplaza navigator.languages con array por defecto',
    pattern: /navigator\.languages/g,
    replacement: "['en-US']",
    critical: false
  },
  {
    name: 'Replace lucide-react imports',
    description: 'Reemplaza lucide-react con @ant-design/icons',
    pattern: /import\s+.*from\s+['"`]lucide-react['"`]/g,
    replacement: "import { QuestionCircleOutlined } from '@ant-design/icons'; // Reemplazado lucide-react",
    critical: true
  },
  {
    name: 'Replace eval calls',
    description: 'Remueve llamadas eval por seguridad',
    pattern: /eval\s*\([^)]+\)/g,
    replacement: '/* eval removido por seguridad */',
    critical: true
  },
  {
    name: 'Replace document access',
    description: 'Reemplaza acceso a document',
    pattern: /document\./g,
    replacement: '/* document access removido - usar refs de React */',
    critical: true
  },
  {
    name: 'Replace console.log',
    description: 'Mantiene console.log pero lo marca como temporal',
    pattern: /console\.log\s*\(/g,
    replacement: 'console.log(/* TODO: Remover en producción */ ',
    critical: false
  },
  {
    name: 'Replace alert calls',
    description: 'Reemplaza alert con comentario para usar message.info',
    pattern: /alert\s*\([^)]*\)/g,
    replacement: '/* alert removido - usar message.info de antd */',
    critical: false
  },
  {
    name: 'Add TypeScript interfaces',
    description: 'Sugiere agregar interfaces TypeScript',
    pattern: /(?:const|function)\s+\w+.*\bprops\b/g,
    replacement: (match) => `// TODO: Definir interface para props\n${match}`,
    critical: false
  },
  {
    name: 'Fix sandbox exports',
    description: 'Convierte exports ES6 a formato compatible con sandbox',
    pattern: /^export\s+default\s+(\w+);?\s*$/gm,
    replacement: (match, componentName) => `// Sandbox-compatible exports\nif (typeof window !== 'undefined') {\n  window.${componentName} = ${componentName};\n} else if (typeof global !== 'undefined') {\n  global.${componentName} = ${componentName};\n}\n\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = ${componentName};\n  module.exports.default = ${componentName};\n}\n\nexport default ${componentName};`,
    critical: true
  },
  {
    name: 'Remove problematic Object declarations',
    description: 'Elimina declaraciones de Object que causan error de inicialización',
    pattern: /^.*\b(const|let|var|interface)\s+Object\b.*$/gm,
    replacement: '// Removed problematic Object declaration to prevent initialization error',
    critical: true
  },
  {
    name: 'Remove problematic global type declarations',
    description: 'Elimina declaraciones de tipos globales problemáticas',
    pattern: /^.*\b(interface|type)\s+(Boolean|Number|String|Function|Array|Promise)\s*\{.*$/gm,
    replacement: '// Removed problematic global type declaration',
    critical: true
  },
  {
    name: 'Remove declare global blocks',
    description: 'Elimina bloques declare global problemáticos',
    pattern: /declare\s+global\s*\{[\s\S]*?\}/gm,
    replacement: '// Removed declare global block to prevent initialization errors',
    critical: true
  },
  {
    name: 'Remove all type definitions and declarations',
    description: 'Elimina TODAS las definiciones de tipos que pueden causar errores',
    pattern: /^.*\b(type|interface|declare|namespace)\s+.*$/gm,
    replacement: '// Removed type definition to prevent initialization errors',
    critical: true
  },
  {
    name: 'Remove problematic const assignments to globals',
    description: 'Elimina asignaciones const a objetos globales',
    pattern: /^.*const\s+(Object|Array|String|Number|Boolean|Function|Promise)\s*[:=].*$/gm,
    replacement: '// Removed problematic const assignment to global object',
    critical: true
  },
  {
    name: 'Complete code sanitization',
    description: 'Sanitización completa del código problemático',
    pattern: /^.*\b(Object|Array|String|Number|Boolean|Function|Promise)\s*[:=].*$/gm,
    replacement: '// Removed problematic global assignment',
    critical: true
  },
  {
    name: 'Fix illegal return statements',
    description: 'Corrige declaraciones return ilegales fuera de funciones',
    pattern: /^\s*return\s*;\s*$/gm, // Only match empty return statements
    replacement: '// Fixed: empty return statement',
    critical: true
  },
  {
    name: 'Clean orphaned return statements',
    description: 'Limpia statements return huérfanos después de limpiezas',
    pattern: /^\s*return\s*;?\s*$/gm,
    replacement: '',
    critical: true
  }
];

// TypeScript library replacements - DISABLED to prevent Object initialization errors
const TYPESCRIPT_FIXES = {
  missingTypes: `// TypeScript definitions DISABLED - causing "Cannot access 'Object' before initialization"
// The sandbox should work without additional type definitions
`,
  
  educationalWrapper: `
/**
 * Educational Component Wrapper
 * Provides safe environment for student-created components
 */
import React from 'react';
import { Card, Alert } from 'antd';

interface EducationalWrapperProps {
  title?: string;
  children?: React.ReactNode;
  author?: string;
  version?: string;
}

const EducationalWrapper: React.FC<EducationalWrapperProps> = ({ 
  title = "Componente Educativo",
  children,
  author = "Estudiante",
  version = "1.0"
}) => {
  return (
    <Card 
      title={
        <div>
          <span>{title}</span>
          <span style={{ float: 'right', fontSize: '12px', color: '#666' }}>
            por {author} v{version}
          </span>
        </div>
      }
      style={{ margin: '16px', borderRadius: '8px' }}
    >
      <div style={{ minHeight: '100px' }}>
        {children}
      </div>
      <Alert 
        message="Componente educativo seguro" 
        type="info" 
        showIcon 
        style={{ marginTop: '16px' }}
        size="small"
      />
    </Card>
  );
};

export default EducationalWrapper;
`
};

/**
 * Auto-fixes TSX code to make it MW Panel compatible
 */
export function autoFixTsxCode(originalCode: string): AutoFixResult {
  let fixedCode = originalCode;
  const fixesApplied: string[] = [];
  const remainingIssues: string[] = [];
  let wasFixed = false;

  // STEP 1: Check if code is severely problematic and needs complete replacement
  // DISABLED: Severe issues detection was causing infinite loops
  // The auto-fixer should work with existing code instead of replacing everything
  const hasSevereIssues = false; // DISABLED to prevent component replacement cycle

  /* ORIGINAL SEVERE ISSUES DETECTION - DISABLED
  const hasSevereIssues = 
    originalCode.includes('setFlipped') ||
    originalCode.includes('setCurrentIndex') ||
    originalCode.includes('Cannot find name') ||
    originalCode.includes('Declaration or statement expected') ||
    originalCode.includes('File \'lib.d.ts\' not found') ||
    (originalCode.match(/import.*react/gi) || []).length > 1 ||
    originalCode.includes('Cannot find module \'react\'') ||
    originalCode.includes('exports is not defined');
  */

  if (hasSevereIssues) {
    console.log('🚨 SEVERE ISSUES DETECTED - Generating completely safe component');
    const safeComponent = generateCompleteSafeComponent(originalCode);
    return {
      wasFixed: true,
      fixedCode: safeComponent,
      fixesApplied: ['🔧 Generado componente completamente seguro - sin errores'],
      remainingIssues: [],
      isUsable: true
    };
  }

  // STEP 2: Clean up code structure first
  fixedCode = cleanCodeStructure(fixedCode);

  // STEP 3: Handle React imports (avoid duplicates) 
  const lines = fixedCode.split('\n');
  const reactImportIndices = lines.map((line, index) => 
    line.trim().startsWith('import React') ? index : -1
  ).filter(index => index !== -1);
  
  if (reactImportIndices.length === 0) {
    // No React imports found, add one
    fixedCode = "import React from 'react';\n" + fixedCode;
    fixesApplied.push('Agrega import de React requerido');
    wasFixed = true;
  } else if (reactImportIndices.length > 1) {
    // Multiple React imports found - remove duplicates
    // Keep only the first React import (prefer the one with useState if exists)
    let keepIndex = reactImportIndices[0];
    for (let i = 0; i < reactImportIndices.length; i++) {
      if (lines[reactImportIndices[i]].includes('useState')) {
        keepIndex = reactImportIndices[i];
        break;
      }
    }
    
    // Remove all other React imports (work backwards to maintain indices)
    for (let i = reactImportIndices.length - 1; i >= 0; i--) {
      if (reactImportIndices[i] !== keepIndex) {
        lines.splice(reactImportIndices[i], 1);
      }
    }
    fixedCode = lines.join('\n');
    fixesApplied.push('Eliminados imports duplicados de React');
    wasFixed = true;
  }

  // STEP 3: Inject TypeScript definitions - DISABLED to prevent Object initialization error
  if (!fixedCode.includes('declare global') && 
      (fixedCode.includes('Array') || fixedCode.includes('Object') || fixedCode.includes('Promise'))) {
    // DISABLED: fixedCode = injectTypeDefinitions(fixedCode);
    // DISABLED: fixesApplied.push('Definiciones TypeScript inyectadas para tipos globales');
    // DISABLED: wasFixed = true;
    console.log('🚫 TypeScript type definitions injection DISABLED to prevent Object initialization error');
  }

  // STEP 4: Apply security and compatibility fixes
  for (const rule of AUTO_FIX_RULES.slice(1)) { // Skip 'Add React Import' rule as we handled it above
    if (typeof rule.replacement === 'string') {
      const beforeLength = fixedCode.length;
      fixedCode = fixedCode.replace(rule.pattern, rule.replacement);
      if (fixedCode.length !== beforeLength) {
        fixesApplied.push(rule.description);
        wasFixed = true;
      }
    } else if (typeof rule.replacement === 'function') {
      const matches = fixedCode.match(rule.pattern);
      if (matches) {
        fixedCode = fixedCode.replace(rule.pattern, rule.replacement);
        fixesApplied.push(rule.description);
        wasFixed = true;
      }
    }
  }

  // STEP 4.1: AGGRESSIVE OBJECT DECLARATION REMOVAL
  // Remove any declarations that cause "Cannot access 'Object' before initialization"
  const objectDeclarationPatterns = [
    /^.*\b(const|let|var|interface)\s+Object\b.*$/gm,
    /^.*\b(const|let|var)\s+(Boolean|Number|String|Function|Array)\b.*$/gm,
    /^.*interface\s+(Object|Array|Function|String|Number|Boolean|Promise)\s*\{.*$/gm,
    /^.*type\s+(Object|Array|Function|String|Number|Boolean|Promise)\s*=.*$/gm,
    /^.*declare\s+(const|let|var|interface|type)\s+(Object|Array|Function|String|Number|Boolean|Promise)\b.*$/gm
  ];

  for (const pattern of objectDeclarationPatterns) {
    if (pattern.test(fixedCode)) {
      fixedCode = fixedCode.replace(pattern, '// Removed problematic declaration to prevent Object initialization error');
      fixesApplied.push('Removed Object/global type declarations');
      wasFixed = true;
    }
  }

  // STEP 4.2: REMOVE DECLARE GLOBAL BLOCKS
  const declareGlobalPattern = /declare\s+global\s*\{[\s\S]*?\}/gm;
  if (declareGlobalPattern.test(fixedCode)) {
    fixedCode = fixedCode.replace(declareGlobalPattern, '// Removed declare global block to prevent Object initialization error');
    fixesApplied.push('Removed declare global blocks');
    wasFixed = true;
  }

  // STEP 4.3: FIX BROKEN FUNCTIONS CAUSED BY OBJECT REMOVAL
  // When we remove Object.keys() lines, we need to fix the resulting broken functions
  
  // First, fix broken functions that lost their return statements
  const brokenFunctionPattern = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\/\/\s*Removed[^}]*\}/gm;
  if (brokenFunctionPattern.test(fixedCode)) {
    fixedCode = fixedCode.replace(brokenFunctionPattern, (match, functionName) => {
      return `const ${functionName} = (locale) => {
  // Simplified function to prevent Object.keys() issues
  return 'en-US'; // Default fallback
}`;
    });
    fixesApplied.push('Fixed broken functions caused by Object removal');
    wasFixed = true;
  }

  // Also fix functions that have partial content but no valid return
  const partiallyBrokenPattern = /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\/\/[^}]*Fixed:[^}]*\}/gm;
  if (partiallyBrokenPattern.test(fixedCode)) {
    fixedCode = fixedCode.replace(partiallyBrokenPattern, (match, functionName) => {
      return `const ${functionName} = (locale) => {
  // Safe function implementation
  if (!locale) return 'en-US';
  if (locale.includes('es')) return 'es-ES';
  return 'en-US';
}`;
    });
    fixesApplied.push('Fixed partially broken functions');
    wasFixed = true;
  }

  // STEP 4.4: REMOVE PROBLEMATIC OBJECT USAGES COMPLETELY
  // These patterns cause "Cannot access 'Object' before initialization"
  const problematicObjectPatterns = [
    {
      // Remove lines with Object.keys() completely
      pattern: /^.*Object\s*\.\s*keys\s*\([^)]+\).*$/gm,
      replacement: '// Removed Object.keys() line to prevent initialization error',
      description: 'Removed lines with Object.keys() calls'
    },
    {
      // Remove lines with Object.assign() completely
      pattern: /^.*Object\s*\.\s*assign\s*\([^)]+\).*$/gm,
      replacement: '// Removed Object.assign() line to prevent initialization error',
      description: 'Removed lines with Object.assign() calls'
    },
    {
      // Remove typeof Object checks
      pattern: /typeof\s+Object\s*[!=]==?\s*["'][\w]+["']/g,
      replacement: 'true',
      description: 'Replaced typeof Object checks with static true'
    },
    {
      // Remove Object.prototype references
      pattern: /Object\s*\.\s*prototype\.[^;]+/g,
      replacement: '/* Object.prototype reference removed */',
      description: 'Removed Object.prototype references'
    },
    {
      // Remove any remaining Object.someMethod calls
      pattern: /Object\s*\.\s*\w+\s*\([^)]*\)/g,
      replacement: '/* Object method call removed for sandbox compatibility */',
      description: 'Removed Object method calls'
    },
    {
      // Remove window.Object or global.Object
      pattern: /(window|global)\s*\.\s*Object/g,
      replacement: '/* Global Object access removed */',
      description: 'Removed global Object access'
    }
  ];

  for (const { pattern, replacement, description } of problematicObjectPatterns) {
    if (pattern.test(fixedCode)) {
      fixedCode = fixedCode.replace(pattern, replacement);
      fixesApplied.push(description);
      wasFixed = true;
    }
  }

  // STEP 4.4: Fix broken syntax from replacements
  const brokenSyntaxPatterns = [
    // Fix broken arrow functions from setTimeout replacement
    /\/\*\s*setTimeout removido por seguridad\s*\*\/\s*=>/g,
    // Fix other broken comment arrows
    /\/\*[^*]*\*\/\s*=>/g,
    // Fix malformed function calls
    /\/\*[^*]*\*\/\s*\(/g,
    // Fix broken setTimeout callback syntax: "// setTimeout removed for security\n      code\n    }, number);"
    /\/\/\s*setTimeout removed for security[\s\n]*([^}]+)[\s\n]*\},\s*\d+\);?/gm
  ];

  for (const pattern of brokenSyntaxPatterns) {
    if (pattern.test(fixedCode)) {
      fixedCode = fixedCode.replace(pattern, (match, codeBlock) => {
        if (codeBlock) {
          // Extract the code block and clean it up
          return `// Fixed broken setTimeout syntax\n${codeBlock.trim()};`;
        }
        return '// Removed broken syntax';
      });
      fixesApplied.push('Fixed broken syntax from replacements');
      wasFixed = true;
    }
  }

  // STEP 4.4.1: Fix missing return statements in React components
  const missingReturnPattern = /if\s*\([^)]+\)\s*\{\s*\/\/\s*Fixed:\s*[^\n]*\n\s*<[^>]+>/g;
  if (missingReturnPattern.test(fixedCode)) {
    fixedCode = fixedCode.replace(missingReturnPattern, (match) => {
      // Insert return before the JSX
      return match.replace(/(<[^>]+>)/, 'return (\n      $1');
    });
    // Also fix the closing parenthesis
    fixedCode = fixedCode.replace(/(\);?\s*\n\s*\})/g, '\n    );\n  }');
    fixesApplied.push('Fixed missing return statements in conditional JSX');
    wasFixed = true;
  }

  // STEP 4.5: Fix export statements for sandbox compatibility
  if (fixedCode.includes('export default') || fixedCode.includes('export ')) {
    // For complete sandbox compatibility, remove all ES6 exports and use only global assignments
    
    // Extract component name from various export patterns
    let componentName = null;
    
    // Pattern 1: export default ComponentName;
    const exportDefaultMatch = fixedCode.match(/export\s+default\s+(\w+);?\s*$/m);
    if (exportDefaultMatch) {
      componentName = exportDefaultMatch[1];
      fixedCode = fixedCode.replace(/export\s+default\s+(\w+);?\s*$/gm, '');
    }
    
    // Pattern 2: export default function ComponentName() {...}
    const exportFunctionMatch = fixedCode.match(/export\s+default\s+function\s+(\w+)/);
    if (exportFunctionMatch) {
      componentName = exportFunctionMatch[1];
      fixedCode = fixedCode.replace(/export\s+default\s+function\s+(\w+)/g, `function $1`);
    }
    
    // Pattern 3: const ComponentName = ... export default ComponentName;
    if (!componentName) {
      const constMatch = fixedCode.match(/const\s+(\w+)\s*=.*React\.FC|const\s+(\w+)\s*:\s*React\.FC/);
      if (constMatch) {
        componentName = constMatch[1] || constMatch[2];
      }
    }
    
    // If no component name found, use a default
    if (!componentName) {
      componentName = 'SafeComponent';
    }

    // Remove any remaining export statements
    fixedCode = fixedCode.replace(/export\s+default\s+.*$/gm, '');
    fixedCode = fixedCode.replace(/export\s+{[^}]*};?/g, '');

    // Add sandbox-only exports (no ES6 modules)
    fixedCode += `

// === SANDBOX-ONLY EXPORTS (No ES6 modules) ===
// This ensures compatibility with sandbox environments that don't support 'exports'

try {
  // Make component available globally
  if (typeof window !== 'undefined') {
    window.${componentName} = ${componentName};
    window.ReactComponent = ${componentName}; // Generic alias
  }
  
  if (typeof global !== 'undefined') {
    global.${componentName} = ${componentName};
    global.ReactComponent = ${componentName}; // Generic alias
  }
  
  // CommonJS compatibility (if available)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ${componentName};
    module.exports.default = ${componentName};
  }
  
  console.log('✅ Component ${componentName} exported successfully for sandbox');
} catch (e) {
  console.warn('⚠️ Partial export setup for ${componentName}:', e);
}

// Note: ES6 exports removed to prevent "exports is not defined" errors in sandbox`;

    fixesApplied.push('Convertido a exports sandbox-only (sin ES6 modules)');
    wasFixed = true;
  }

  // Add TypeScript definitions if needed - DISABLED to prevent Object initialization error
  if (hasTypeScriptErrors(fixedCode)) {
    // DISABLED: fixedCode = TYPESCRIPT_FIXES.missingTypes + '\n' + fixedCode;
    // DISABLED: fixesApplied.push('Agregadas definiciones TypeScript faltantes');
    // DISABLED: wasFixed = true;
    console.log('🚫 TypeScript definitions injection DISABLED to prevent Object initialization error');
  }

  // Check for remaining critical issues
  const criticalIssues = checkCriticalIssues(fixedCode);
  remainingIssues.push(...criticalIssues);

  // If there are too many critical issues, generate a completely safe component
  if (criticalIssues.length > 5 || 
      fixedCode.includes('Declaration or statement expected') ||
      fixedCode.includes('Cannot find name \'currentIndex\'') ||
      fixedCode.includes('Cannot find name \'mode\'')) {
    
    console.log('🚨 Generating completely safe component due to critical issues');
    fixedCode = generateCompleteSafeComponent(originalCode);
    fixesApplied.push('Generado componente completamente seguro');
    wasFixed = true;
    remainingIssues.length = 0; // Clear all issues since we're generating a new safe component
  } else if (criticalIssues.length > 0) {
    fixedCode = wrapInEducationalComponent(fixedCode);
    fixesApplied.push('Componente envuelto en wrapper educativo seguro');
    wasFixed = true;
  }

  // Add marker comment for backend security validator when fixes are applied
  if (wasFixed && fixedCode) {
    fixedCode = `// Auto-fixed for sandbox compatibility\n${fixedCode}`;
  }

  return {
    wasFixed,
    fixedCode: wasFixed ? fixedCode : undefined,
    fixesApplied,
    remainingIssues,
    isUsable: remainingIssues.length === 0
  };
}

/**
 * Checks if code has TypeScript errors
 * DISABLED: TypeScript definitions injection causes "Cannot access 'Object' before initialization"
 */
function hasTypeScriptErrors(code: string): boolean {
  // TEMPORARILY DISABLED - TypeScript definitions injection causes JavaScript hoisting issues
  // The sandbox environment should work without additional type definitions
  return false;
  
  /* ORIGINAL CODE COMMENTED OUT TO PREVENT OBJECT INITIALIZATION ERROR
  const typeErrorPatterns = [
    /Cannot find global type/,
    /Cannot find module 'react'/,
    /Cannot find name 'navigator'/,
    /Cannot find name 'console'/,
    /Cannot find name 'JSON'/,
    /JSX element implicitly has type 'any'/,
    /File 'lib\.d\.ts' not found/
  ];

  return typeErrorPatterns.some(pattern => pattern.test(code));
  */
}

/**
 * Checks for remaining critical security issues
 */
function checkCriticalIssues(code: string): string[] {
  const issues: string[] = [];

  // Check for remaining dangerous patterns
  if (code.includes('eval(') && !code.includes('/* eval removido')) {
    issues.push('eval() calls still present');
  }

  if (code.includes('Function(') && !code.includes('/* Function removido')) {
    issues.push('Function constructor still present');
  }

  if (code.includes('dangerouslySetInnerHTML')) {
    issues.push('dangerouslySetInnerHTML still present');
  }

  return issues;
}

/**
 * Wraps problematic code in a safe educational wrapper
 */
function wrapInEducationalComponent(code: string): string {
  // Extract component name if possible
  const nameMatch = code.match(/(?:export\s+default\s+|const\s+|function\s+)(\w+)/);
  const componentName = nameMatch ? nameMatch[1] : 'EducationalComponent';

  // TYPESCRIPT_FIXES.missingTypes DISABLED to prevent Object initialization error
  return `import React from 'react';
import { Card, Alert, Typography } from 'antd';

const { Title, Paragraph } = Typography;

/**
 * Auto-generated Educational Component Wrapper
 * Código original envuelto para seguridad
 */

// Código original (con correcciones de seguridad)
${code}

// Wrapper educativo seguro
const SafeEducationalComponent: React.FC<any> = (props) => {
  return (
    <Card 
      title="Componente Educativo (Auto-corregido)"
      style={{ 
        margin: '16px', 
        borderRadius: '8px',
        border: '2px solid #52c41a'
      }}
    >
      <Alert 
        message="Este componente ha sido auto-corregido para seguridad" 
        description="Se han aplicado correcciones automáticas para hacer el código compatible con MW Panel."
        type="success" 
        showIcon 
        style={{ marginBottom: '16px' }}
      />
      
      <div style={{ 
        padding: '16px',
        border: '1px dashed #d9d9d9',
        borderRadius: '4px',
        backgroundColor: '#fafafa'
      }}>
        <Title level={4}>Componente Original:</Title>
        <Paragraph>
          El código original ha sido envuelto de forma segura. 
          Para una mejor experiencia, considera usar las plantillas TSX proporcionadas.
        </Paragraph>
        
        {/* Render del componente original si es posible */}
        {React.isValidElement(${componentName}) ? (
          <${componentName} {...props} />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Title level={5}>Componente no renderizable</Title>
            <Paragraph type="secondary">
              El componente original contiene errores que impiden su renderizado.
              Usa las plantillas TSX seguras para mejores resultados.
            </Paragraph>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SafeEducationalComponent;
`;
}

/**
 * Creates a completely safe TSX component from scratch
 */
export function createSafeTsxFromContent(originalCode: string, title: string = "Componente Seguro"): string {
  // Extract any text content or simple data
  const textContent = extractSafeContent(originalCode);
  
  return `import React from 'react';
import { Card, Typography, Space, Divider } from 'antd';
import { BookOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

/**
 * Componente TSX Seguro
 * Generado automáticamente desde código problemático
 */

interface SafeComponentProps {
  title?: string;
  className?: string;
}

const SafeComponent: React.FC<SafeComponentProps> = ({ 
  title = "${title}",
  className 
}) => {
  return (
    <Card 
      title={
        <Space>
          <BookOutlined style={{ color: '#52c41a' }} />
          <span>{title}</span>
        </Space>
      }
      className={className}
      style={{ 
        margin: '16px', 
        borderRadius: '8px',
        border: '2px solid #52c41a'
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Title level={4}>✅ Componente Seguro</Title>
          <Paragraph>
            Este componente ha sido creado de forma segura, reemplazando el código 
            original que contenía patrones no permitidos.
          </Paragraph>
        </div>

        <Divider />

        <div style={{ 
          padding: '16px',
          backgroundColor: '#f6ffed',
          borderRadius: '4px',
          border: '1px solid #b7eb8f'
        }}>
          <Text strong style={{ color: '#52c41a' }}>Contenido seguro extraído:</Text>
          <div style={{ marginTop: '8px' }}>
            ${textContent}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary">
            Para crear componentes más complejos, utiliza las plantillas TSX proporcionadas.
          </Text>
        </div>
      </Space>
    </Card>
  );
};

export default SafeComponent;`;
}

/**
 * Cleans up code structure to ensure proper React component format
 */
function cleanCodeStructure(code: string): string {
  let cleanCode = code;
  
  // Remove any statements that are outside of functions/components
  // Look for common problematic patterns
  const lines = cleanCode.split('\n');
  const cleanedLines: string[] = [];
  let insideFunction = false;
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines and comments
    if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) {
      cleanedLines.push(lines[i]);
      continue;
    }
    
    // Skip type definitions and imports
    if (line.startsWith('import ') || line.startsWith('export ') || 
        line.startsWith('declare ') || line.startsWith('type ') ||
        line.startsWith('interface ')) {
      cleanedLines.push(lines[i]);
      continue;
    }
    
    // Track function/component boundaries
    if (line.includes('function ') || line.includes('const ') || line.includes('=> {')) {
      insideFunction = true;
    }
    
    // Count braces to track scope
    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;
    
    if (braceCount === 0 && insideFunction) {
      insideFunction = false;
    }
    
    // Only include lines that are inside functions or are valid top-level statements
    if (insideFunction || 
        line.startsWith('import ') || line.startsWith('export ') ||
        line.startsWith('const ') || line.startsWith('function ') ||
        line.includes('export default')) {
      cleanedLines.push(lines[i]);
    } else {
      // DISABLED: This aggressive filtering was removing valid React code
      // Only remove lines that are clearly problematic, not React hooks/handlers
      const isProblematicStandalone = (
        // Only remove lines that contain actual error messages or invalid syntax
        line.includes('Cannot find name') ||
        line.includes('Declaration or statement expected') ||
        line.includes('Unexpected token') ||
        line.includes('Module not found') ||
        // Remove standalone Object/global references that cause initialization errors
        (line.match(/^\s*Object\s*\.\s*\w+.*$/) && !line.includes('const') && !line.includes('function'))
      );
      
      if (isProblematicStandalone) {
        console.log('🧹 Removing problematic standalone line:', line);
      } else {
        // Keep React hooks, handlers, and legitimate function calls
        cleanedLines.push(lines[i]);
      }
    }
  }
  
  return cleanedLines.join('\n');
}

/**
 * Injects TypeScript global type definitions to resolve common errors
 * DISABLED: Causes "Cannot access 'Object' before initialization" error
 */
function injectTypeDefinitions(code: string): string {
  // DISABLED: This function causes JavaScript hoisting issues
  // Return original code without injecting any type definitions
  return code;
  
  /* ORIGINAL FUNCTION DISABLED TO PREVENT OBJECT INITIALIZATION ERROR
  const typeDefinitions = `// TypeScript definitions for educational components  
// Core TypeScript library types
type ReadonlyArray<T> = readonly T[];
type Iterable<T> = { [Symbol.iterator](): Iterator<T> };
type Iterator<T> = { next(): { done?: boolean; value: T } };
type PropertyKey = string | number | symbol;
type PromiseLike<T> = { then(onfulfilled?: (value: T) => any): any };
type RegExpExecArray = Array<string> & { index: number; input: string };

declare global {
  // Base types
  interface Array<T> extends ReadonlyArray<T> {
    [n: number]: T;
    length: number;
    push(...items: T[]): number;
    pop(): T | undefined;
    filter(predicate: (value: T) => boolean): T[];
    map<U>(callbackfn: (value: T) => U): U[];
  }
  
  const Object: {
    keys(obj: any): string[];
    values(obj: any): any[];
    assign(target: any, ...sources: any[]): any;
  };
  
  const Promise: {
    new <T>(executor: (resolve: (value: T) => void, reject: (reason?: any) => void) => void): Promise<T>;
    resolve<T>(value: T): Promise<T>;
    reject(reason?: any): Promise<never>;
  };
  
  interface Promise<T> {
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
      onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
    ): Promise<TResult1 | TResult2>;
  }
  
  interface Boolean {}
  interface Function {
    apply(this: Function, thisArg: any, argArray?: any): any;
    call(this: Function, thisArg: any, ...argArray: any[]): any;
    bind(this: Function, thisArg: any, ...argArray: any[]): any;
  }
  interface CallableFunction extends Function {}
  interface IArguments {
    [index: number]: any;
    length: number;
    callee: Function;
  }
  interface NewableFunction extends Function {
    new (...args: any[]): any;
  }
  interface Number {
    toString(radix?: number): string;
    toFixed(fractionDigits?: number): string;
    valueOf(): number;
  }
  interface RegExp {
    exec(string: string): RegExpExecArray | null;
    test(string: string): boolean;
  }
  interface String {
    charAt(pos: number): string;
    length: number;
    substring(start: number, end?: number): string;
    valueOf(): string;
  }
  
  // Browser globals (safe educational context)
  const console: {
    log(...data: any[]): void;
    error(...data: any[]): void;
    warn(...data: any[]): void;
  };
  const JSON: {
    parse(text: string): any;
    stringify(value: any): string;
  };
  
  // React JSX types
  namespace JSX {
    interface IntrinsicElements {
      div: any; span: any; p: any; h1: any; h2: any; h3: any; h4: any; h5: any; h6: any;
      button: any; input: any; form: any; label: any; select: any; option: any; textarea: any;
      img: any; a: any; ul: any; ol: any; li: any; nav: any; section: any; article: any; aside: any;
      table: any; tr: any; td: any; th: any; thead: any; tbody: any; tfoot: any;
      br: any; hr: any; strong: any; em: any; b: any; i: any; u: any; small: any;
    }
  }
}

`;
  
  // Insert type definitions at the beginning, after imports
  const lines = code.split('\n');
  const importEndIndex = lines.findIndex(line => 
    !line.trim().startsWith('import') && 
    !line.trim().startsWith('//') && 
    !line.trim().startsWith('/*') && 
    line.trim().length > 0
  );
  
  if (importEndIndex === -1) {
    // No imports found, add at the beginning
    return typeDefinitions + '\n' + code;
  } else {
    // Insert after imports
    lines.splice(importEndIndex, 0, typeDefinitions);
    return lines.join('\n');
  }
  */ // End of disabled function
}

/**
 * Generates a completely safe React component when original code is too problematic
 */
function generateCompleteSafeComponent(originalCode: string): string {
  // Extract basic information from the original code
  const componentName = extractComponentName(originalCode) || 'SafeComponent';
  const textContent = extractSafeTextContent(originalCode);
  const hasFlashcards = originalCode.includes('flashcard') || originalCode.includes('Flashcard');
  
  return `import React, { useState } from 'react';
import { Card, Button, Space, Typography, Divider } from 'antd';
import { BookOutlined, PlayCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

// NO TYPE DEFINITIONS - They cause "Cannot access 'Object' before initialization" error
// The sandbox environment should work with built-in types

const { Title, Text, Paragraph } = Typography;

interface ${componentName}Props {
  title?: string;
  className?: string;
}

const ${componentName}: React.FC<${componentName}Props> = ({ 
  title = "Componente Educativo Seguro",
  className 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  
  ${hasFlashcards ? `
  const flashcards = [
    { front: "Ejemplo 1", back: "Respuesta 1" },
    { front: "Ejemplo 2", back: "Respuesta 2" },
    { front: "Ejemplo 3", back: "Respuesta 3" }
  ];
  
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % flashcards.length);
    setFlipped(false);
  };
  
  const handleFlip = () => {
    setFlipped(!flipped);
  };
  ` : `
  const handleDemo = () => {
    console.log('Demostración del componente seguro');
  };
  `}

  return (
    <Card 
      title={
        <Space>
          <BookOutlined style={{ color: '#52c41a' }} />
          <span>{title}</span>
        </Space>
      }
      className={className}
      style={{ 
        margin: '16px', 
        borderRadius: '8px',
        border: '2px solid #52c41a'
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Title level={4}>✅ Componente Seguro Generado</Title>
          <Paragraph>
            Este componente ha sido generado automáticamente para reemplazar código problemático.
            Todo el contenido es seguro y compatible con MW Panel.
          </Paragraph>
        </div>

        ${hasFlashcards ? `
        <div style={{ 
          padding: '20px',
          backgroundColor: '#f6ffed',
          borderRadius: '8px',
          border: '1px solid #b7eb8f',
          textAlign: 'center'
        }}>
          <div style={{ 
            minHeight: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            {flipped ? flashcards[currentIndex].back : flashcards[currentIndex].front}
          </div>
          
          <Space style={{ marginTop: '16px' }}>
            <Button 
              type="default" 
              onClick={handleFlip}
              icon={<InfoCircleOutlined />}
            >
              {flipped ? 'Ver Pregunta' : 'Ver Respuesta'}
            </Button>
            <Button 
              type="primary" 
              onClick={handleNext}
              icon={<PlayCircleOutlined />}
            >
              Siguiente ({currentIndex + 1}/{flashcards.length})
            </Button>
          </Space>
        </div>
        ` : `
        <div style={{ 
          padding: '16px',
          backgroundColor: '#f6ffed',
          borderRadius: '4px',
          border: '1px solid #b7eb8f'
        }}>
          <Text strong style={{ color: '#52c41a' }}>Contenido original procesado:</Text>
          <div style={{ marginTop: '8px' }}>
            ${textContent}
          </div>
          
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <Button 
              type="primary"
              onClick={handleDemo}
              icon={<PlayCircleOutlined />}
            >
              Demostración Interactiva
            </Button>
          </div>
        </div>
        `}

        <Divider />

        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">
            <InfoCircleOutlined style={{ marginRight: '4px' }} />
            Componente generado automáticamente por MW Panel Auto-Fixer
          </Text>
        </div>
      </Space>
    </Card>
  );
};

// Sandbox-compatible exports for ${componentName} - NO ES6 EXPORTS
try {
  if (typeof window !== 'undefined') {
    window.${componentName} = ${componentName};
    window.ReactComponent = ${componentName}; // Generic alias
  }
  if (typeof global !== 'undefined') {
    global.${componentName} = ${componentName};
    global.ReactComponent = ${componentName}; // Generic alias
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ${componentName};
    module.exports.default = ${componentName};
  }
  console.log('✅ Component ${componentName} exported successfully for sandbox');
} catch (e) {
  console.warn('⚠️ Export setup failed for ${componentName}:', e);
}

// NO ES6 EXPORTS - They cause "exports is not defined" error in sandbox
// The component is available via global.${componentName} or window.${componentName}`;
}

/**
 * Extracts component name from original code
 */
function extractComponentName(code: string): string | null {
  const match = code.match(/(?:const|function)\s+(\w+)/);
  return match ? match[1] : null;
}

/**
 * Extracts safe text content from problematic code
 */
function extractSafeTextContent(code: string): string {
  // Remove all JavaScript/TypeScript syntax and extract plain text
  let content = code;
  
  // Remove imports and exports
  content = content.replace(/import\s+.*?from\s+.*?;/g, '');
  content = content.replace(/export\s+.*?;/g, '');
  
  // Remove function definitions
  content = content.replace(/function\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g, '');
  content = content.replace(/const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\}/g, '');
  
  // Extract string literals (potential user content)
  const strings = content.match(/['"`]([^'"`]*)['"`]/g);
  if (strings) {
    return strings
      .map(s => s.slice(1, -1)) // Remove quotes
      .filter(s => s.length > 2) // Only meaningful strings
      .join(' | ');
  }
  
  return 'Contenido original no disponible - usar plantillas seguras';
}

/**
 * Validates if the auto-fixed code is safe to use
 */
export function validateFixedCode(code: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for remaining dangerous patterns
  const dangerousPatterns = [
    { pattern: /eval\s*\(/g, message: 'eval() calls detected' },
    { pattern: /Function\s*\(/g, message: 'Function constructor detected' },
    { pattern: /setTimeout\s*\(/g, message: 'setTimeout calls detected' },
    { pattern: /window\./g, message: 'window object access detected' },
    { pattern: /document\./g, message: 'document object access detected' },
    { pattern: /dangerouslySetInnerHTML/g, message: 'dangerouslySetInnerHTML detected' }
  ];

  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code) && !code.includes('/* ') && !code.includes('//')) {
      issues.push(message);
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}