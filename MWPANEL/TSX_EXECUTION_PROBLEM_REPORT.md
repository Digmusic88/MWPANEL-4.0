# Informe Técnico: Problema de Ejecución TSX en MW Panel 2.0

## Resumen Ejecutivo

**Problema Principal**: El sistema de ejecución de código TSX en sandbox VM2 presenta errores persistentes, específicamente `createElement is not defined`, que impiden la ejecución correcta de componentes React educativos.

**Estado Actual**: A pesar de múltiples iteraciones de fixes aplicados tanto en frontend como backend, el problema persiste. El sistema puede procesar y guardar código TSX, pero falla durante la ejecución en el sandbox.

**Impacto**: Los profesores no pueden crear ni ejecutar componentes TSX interactivos para lecciones educativas, limitando la funcionalidad del sistema.

## Contexto del Sistema

### Arquitectura General
- **Backend**: NestJS con TypeScript, ejecutándose en Docker
- **Base de Datos**: PostgreSQL con columna `tsx_source_code`
- **Sandbox**: VM2 para ejecución segura de código TSX
- **Frontend**: React con Vite, auto-fixer integrado
- **Compilación**: TypeScript compiler para TSX → JS

### Flujo de Ejecución TSX
1. **Frontend**: Usuario escribe código TSX
2. **Auto-Fixer Frontend**: Procesa y limpia el código
3. **Backend Controller**: Aplica validaciones de seguridad
4. **Base de Datos**: Guarda código en `lesson_resources.tsx_source_code`
5. **Sandbox VM2**: Compila TypeScript → JavaScript y ejecuta
6. **Mock React**: Simula entorno React para componentes

## Cronología de Problemas y Soluciones Intentadas

### Problema Inicial: `setFlipped is not defined`
**Fecha**: Inicio del debugging
**Causa**: Imports duplicados de React causaban conflictos
**Solución Aplicada**: 
- Fix en `tsxAutoFixer.ts` para eliminar imports duplicados
- Mejora en detección de imports en líneas separadas
**Estado**: ✅ RESUELTO

### Problema 2: `mode is not defined`
**Progreso**: Error evolucionó, indicando progreso en el debugging
**Causa**: Variables no disponibles en scope del sandbox
**Solución Aplicada**:
- Añadidos hooks React como variables globales en sandbox
- `useState`, `useEffect`, etc. disponibles directamente
**Estado**: ✅ RESUELTO

### Problema 3: Recursos no se guardaban
**Causa**: Security validator rechazaba código sin `export default`
**Conflicto**: Auto-fixer remueve exports para compatibilidad sandbox vs validator requiere exports
**Solución Aplicada**:
- Actualizado security validator para reconocer código procesado
- Añadido marcador `// Auto-fixed for sandbox compatibility`
- Controller auto-fixer añade marcador automáticamente
**Estado**: ✅ RESUELTO

### Problema Actual: `createElement is not defined`
**Estado**: 🔴 PERSISTENTE
**Manifestación**: Error en ejecución sandbox después de compilación TypeScript
**Tiempo Ejecución**: ~80ms (indica que llega al sandbox pero falla)

## Análisis Técnico Detallado

### Configuración Actual del Sandbox VM2

```javascript
// Ubicación: /opt/mw-panel/backend/src/modules/lessons/services/tsx-security.service.ts
const vm = new VM({
  timeout: sandboxConfig.maxExecutionTime,
  sandbox: {
    React: mockReact,
    // Funciones React añadidas como globales
    createElement: mockReact.createElement,
    Fragment: mockReact.Fragment,
    // JSX Runtime functions para compilación moderna
    jsx: mockReact.createElement,
    jsxs: mockReact.createElement,
    _jsx: mockReact.createElement,
    _jsxs: mockReact.createElement,
    // React hooks como variables globales
    useState: mockReact.useState,
    useEffect: mockReact.useEffect,
    useCallback: mockReact.useCallback,
    useMemo: mockReact.useMemo,
    useRef: mockReact.useRef,
    useContext: mockReact.useContext,
    // Console mock
    console: { log, error, warn },
    props: props || {},
    // Mock require para compatibilidad CommonJS
    require: (module) => module === 'react' ? mockReact : {}
  }
});
```

### Mock de React Implementado

```javascript
createMockReact() {
  const stateStorage = new Map();
  let stateId = 0;
  
  return {
    createElement: (...args) => ({ 
      type: args[0], 
      props: args[1] || {}, 
      children: args.slice(2) 
    }),
    Fragment: 'React.Fragment',
    useState: (initial) => {
      const currentStateId = stateId++;
      if (!stateStorage.has(currentStateId)) {
        stateStorage.set(currentStateId, initial);
      }
      // ... implementación completa de state management
    },
    // ... otros hooks implementados
  }
}
```

### Pipeline de Compilación

```javascript
// Proceso de compilación TypeScript → JavaScript
compileToJs(tsxCode: string): string {
  const result = ts.transpile(tsxCode, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,          // ¿Posible causa del problema?
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    allowJs: true,
    esModuleInterop: true,
    skipLibCheck: true
  });
  return result;
}
```

## Teorías sobre la Causa del Problema

### Teoría 1: Configuración JSX del Compilador TypeScript
**Hipótesis**: `jsx: ts.JsxEmit.React` genera llamadas a `React.createElement` pero el contexto de ejecución no lo reconoce correctamente.

**Evidencia**:
- Error específico `createElement is not defined` (no `React.createElement`)
- Tiempo de ejecución corto (~80ms) indica llegada al sandbox
- Mock React tiene `createElement` definido

**Posibles Soluciones**:
- Cambiar a `jsx: ts.JsxEmit.ReactJSX` (JSX runtime moderno)
- Modificar generación para usar referencias globales

### Teoría 2: Scope de Variables en VM2
**Hipótesis**: VM2 no está exponiendo correctamente las variables globales al código compilado.

**Evidencia**:
- Variables añadidas al sandbox no son reconocidas en runtime
- Mock de `require` puede no estar funcionando correctamente

**Posibles Soluciones**:
- Revisar configuración de VM2 (`eval: true`, `allowAsync: true`)
- Inyectar variables directamente en código compilado

### Teoría 3: Diferencia entre Compilación y Ejecución
**Hipótesis**: El código TypeScript se compila correctamente pero las referencias generadas no coinciden con el entorno de ejecución.

**Evidencia**:
- Compilación exitosa (no errores TypeScript)
- Fallo específico en runtime de VM2

## Código de Prueba Actual

```tsx
// Ejemplo típico que falla
import { useState } from 'react';

function TestComponent() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>+</button>
    </div>
  );
}

export default TestComponent;
```

**Compilación Generada** (aproximada):
```javascript
const { useState } = require('react');

function TestComponent() {
  const [count, setCount] = useState(0);
  
  return React.createElement("div", null,
    React.createElement("h1", null, "Count: ", count),
    React.createElement("button", { 
      onClick: () => setCount(count + 1) 
    }, "+")
  );
}

module.exports = TestComponent;
```

## Logs y Debugging Actual

### Logs del Sistema
```
🔧 [Backend] TypeScript compilation completed
🔧 [Backend] Compiled JavaScript code length: XXX
🔧 ==================== START COMPILED JS ====================
[Código JavaScript compilado visible en logs]
🔧 ==================== END COMPILED JS ====================
❌ [TSX Sandbox] Error: createElement is not defined
```

### Estado de Debugging
- ✅ Código llega al backend correctamente
- ✅ Compilación TypeScript exitosa  
- ✅ Sandbox VM2 se inicializa
- ✅ Mock React está disponible en sandbox
- ❌ **FALLA**: Runtime execution con `createElement is not defined`

## Configuraciones de Entorno

### TypeScript Config (Backend)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "jsx": "react",
    "moduleResolution": "node",
    "allowJs": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### VM2 Configuration
```javascript
{
  timeout: 5000,
  wasm: false,
  eval: true,
  fixAsync: false,
  allowAsync: true
}
```

## Intentos de Solución Fallidos

### Intento 1: Añadir createElement como Global
```javascript
sandbox: {
  createElement: mockReact.createElement, // ❌ NO FUNCIONÓ
}
```

### Intento 2: Múltiples Alias JSX Runtime
```javascript
sandbox: {
  jsx: mockReact.createElement,     // ❌ NO FUNCIONÓ
  jsxs: mockReact.createElement,    // ❌ NO FUNCIONÓ  
  _jsx: mockReact.createElement,    // ❌ NO FUNCIONÓ
  _jsxs: mockReact.createElement,   // ❌ NO FUNCIONÓ
}
```

### Intento 3: Mock require() Mejorado
```javascript
require: (module: string) => {
  if (module === 'react') {
    return mockReact; // ❌ NO FUNCIONÓ
  }
  return {};
}
```

## Información del Sistema

### Versiones
- **Node.js**: v20.19.3
- **TypeScript**: 5.8.3  
- **VM2**: Latest (sandbox)
- **NestJS**: Framework backend
- **React**: 18.3.1 (frontend)

### Arquitectura de Archivos
```
/opt/mw-panel/backend/src/modules/lessons/
├── controllers/lessons.controller.ts    # Controller con validaciones
├── services/lessons.service.ts          # Servicio principal  
├── services/tsx-security.service.ts     # Sandbox y compilación
├── entities/lesson-resource.entity.ts   # Modelo BD
└── dto/update-lesson-resource.dto.ts    # DTOs
```

## Preguntas Clave para Resolución

1. **¿Es correcta la configuración JSX del compilador TypeScript?**
   - ¿Debería usar `jsx: "react"` o `jsx: "react-jsx"`?
   - ¿Las referencias generadas coinciden con el sandbox?

2. **¿VM2 está exponiendo correctamente las variables globales?**
   - ¿Las variables del sandbox son accesibles al código ejecutado?
   - ¿Hay conflictos de scope entre global y local?

3. **¿El mock de React es suficientemente completo?**
   - ¿Faltan propiedades o métodos esenciales?
   - ¿La simulación de hooks es correcta?

4. **¿Hay una alternativa más robusta al enfoque actual?**
   - ¿Otros sandboxes como `isolated-vm`?
   - ¿Pre-procesamiento diferente del código?

## Archivos Clave para Revisión

1. **`/opt/mw-panel/backend/src/modules/lessons/services/tsx-security.service.ts`**
   - Configuración sandbox VM2
   - Mock de React
   - Compilación TypeScript

2. **`/opt/mw-panel/backend/src/modules/lessons/controllers/lessons.controller.ts`**
   - Método `updateResource` con validaciones
   - Auto-fixer del controller

3. **`/opt/mw-panel/backend/src/common/validators/tsx-security.validator.ts`**
   - Security validator
   - Lógica de detección de código procesado

## Solicitud de Ayuda Externa

**Necesitamos ayuda específica con**:
1. Configuración correcta de VM2 para ejecución React/JSX
2. Mapeo correcto entre compilación TypeScript y entorno de ejecución
3. Alternativas a la implementación actual de sandbox
4. Debugging avanzado de variables en contexto VM2

**Información adicional disponible**:
- Logs completos del sistema
- Código compilado generado
- Configuraciones específicas
- Tests de integración disponibles

---

**Fecha del Informe**: 23 de Julio 2025  
**Estado**: Problema activo, buscando solución externa  
**Prioridad**: Alta (funcionalidad crítica del sistema educativo)