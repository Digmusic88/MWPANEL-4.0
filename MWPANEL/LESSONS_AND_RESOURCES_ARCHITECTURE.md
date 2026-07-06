# 🧩 MÓDULO "LECCIONES Y RECURSOS" - DISEÑO ARQUITECTÓNICO COMPLETO

## 📋 RESUMEN EJECUTIVO

El módulo "Lecciones y Recursos" integra tres sistemas existentes en MW Panel:
1. **Educational Resources** (biblioteca compartida)
2. **Task Attachments** (material específico de tareas)
3. **Sistema de Clases/Asignaturas** (estructura académica)

### 🎯 OBJETIVO
Crear un espacio de trabajo único por profesor donde pueda organizar materiales de enseñanza por clase → asignatura → lección, incluyendo soporte para **artefactos .tsx interactivos**.

---

## 🏗️ ARQUITECTURA GENERAL

### 2.1 ESTRUCTURA JERÁRQUICA

```
📚 MW PANEL - LECCIONES Y RECURSOS
├── 🏫 [Año Académico] (ej: 2024-2025)
│   ├── 📋 [Clase] (ej: 5º Primaria A)
│   │   ├── 📖 [Asignatura] (ej: Matemáticas)
│   │   │   ├── 📝 [Lección] (ej: Fracciones Básicas)
│   │   │   │   ├── 📄 Archivos Físicos (PDF, DOC, IMG)
│   │   │   │   ├── 🎥 Enlaces YouTube
│   │   │   │   ├── 🌐 Enlaces Web
│   │   │   │   ├── 📋 Documentos Internos (WYSIWYG)
│   │   │   │   ├── 🎨 Presentaciones
│   │   │   │   └── ⚛️ Artefactos .tsx Interactivos
```

### 2.2 INTEGRACIÓN CON SISTEMAS EXISTENTES

#### Sistema Base: **SubjectAssignment**
```sql
subject_assignments (tabla central existente):
- id (UUID) - FK en lesson_workspaces
- teacherId (UUID) - Profesor propietario
- subjectId (UUID) - Asignatura 
- classGroupId (UUID) - Grupo de clase
- academicYearId (UUID) - Año académico
```

#### Nueva Extensión: **Lesson System**
```sql
lesson_workspaces (nueva tabla):
- id (UUID, PK)
- subject_assignment_id (UUID, FK → subject_assignments)
- drive_folder_id (varchar) - Carpeta raíz en Google Drive
- is_active (boolean)
- created_at, updated_at

lesson_folders (nueva tabla):
- id (UUID, PK)
- workspace_id (UUID, FK → lesson_workspaces)
- name (varchar) - Nombre de la lección
- description (text)
- order_index (int) - Orden de presentación
- drive_folder_id (varchar) - Carpeta específica en Drive
- is_active (boolean)
- created_at, updated_at

lesson_resources (nueva tabla):
- id (UUID, PK) 
- lesson_folder_id (UUID, FK → lesson_folders)
- type (enum) - FILE, YOUTUBE_LINK, WEB_LINK, INTERNAL_DOC, PRESENTATION, TSX_ARTIFACT
- title (varchar)
- description (text)
-
-- Para archivos físicos
- drive_file_id (varchar, nullable)
- file_name (varchar, nullable)
- mime_type (varchar, nullable)
- file_size (bigint, nullable)

-- Para enlaces
- external_url (varchar, nullable)

-- Para documentos internos
- internal_content (text, nullable) - Contenido HTML del editor WYSIWYG

-- Para artefactos .tsx
- tsx_code (text, nullable) - Código del componente React
- tsx_props (jsonb, nullable) - Props del componente
- tsx_sandbox_config (jsonb, nullable) - Configuración de seguridad

-- Metadatos
- order_index (int)
- is_active (boolean)
- visibility (enum) - PRIVATE, SHARED_CLASS, PUBLIC
- created_by_id (UUID, FK → users)
- created_at, updated_at
```

---

## 📁 2.4 ESTRUCTURA EN GOOGLE DRIVE

### Estructura Propuesta (Extensión de Educational Resources)
```
📁 12. Plataforma (Recursos dicácticos compartidos)/
├── 📁 Recursos_Generales/                    # Sistema existente
└── 📁 Lecciones_Por_Profesor/                # NUEVO SISTEMA
    ├── 📁 2024-2025/                         # Año académico
    │   ├── 📁 Ana_Garcia_Lopez_[teacher_id]/  # Profesor específico
    │   │   ├── 📁 5º_Primaria_A/             # Clase asignada
    │   │   │   ├── 📁 Matematicas/           # Asignatura
    │   │   │   │   ├── 📁 01_Numeros_Naturales/     # Lección 1
    │   │   │   │   │   ├── 📄 teoria.pdf
    │   │   │   │   │   ├── 🎥 video_explicativo.mp4
    │   │   │   │   │   ├── ⚛️ calculadora_interactiva.tsx
    │   │   │   │   │   └── 📋 ejercicios.docx
    │   │   │   │   ├── 📁 02_Fracciones_Basicas/    # Lección 2
    │   │   │   │   └── 📁 03_Decimales/             # Lección 3
    │   │   │   ├── 📁 Lengua_Castellana/
    │   │   │   └── 📁 Ciencias_Naturales/
    │   │   ├── 📁 3º_Primaria_B/             # Otra clase del mismo profesor
    │   │   └── 📁 Workspace_Compartido/      # Recursos reutilizables
    │   └── 📁 [Otro_Profesor]/
```

### Ventajas de esta Estructura:
✅ **Separación clara** entre recursos generales y específicos de lección
✅ **Reutilización** de infraestructura Google Drive existente
✅ **Escalabilidad** por profesor, clase y asignatura
✅ **Organización visual** clara en Google Drive
✅ **Backup automático** via políticas existentes de Google Drive

---

## ⚛️ 2.3 SISTEMA DE ARTEFACTOS .tsx INTERACTIVOS

### Arquitectura de Seguridad

#### Validación en Backend (NestJS)
```typescript
// Servicio de validación de artefactos TSX
@Injectable()
export class TsxArtifactValidationService {
  
  validateTsxCode(tsxCode: string): ValidationResult {
    // 1. Verificar sintaxis TypeScript/JSX
    // 2. Detectar imports peligrosos (fs, exec, etc.)
    // 3. Validar que solo use React hooks seguros
    // 4. Verificar que no haga network requests no autorizados
    // 5. Límite de tamaño del código (50KB)
  }
  
  sanitizeTsxProps(props: any): any {
    // Limpiar props para evitar XSS
    // Validar tipos de datos
    // Aplicar whitelist de propiedades permitidas
  }
}
```

#### Ejecución Segura en Frontend
```typescript
// Componente contenedor para artefactos TSX
const TsxArtifactRenderer: React.FC<{
  tsxCode: string;
  props: any;
  sandboxConfig: SandboxConfig;
}> = ({ tsxCode, props, sandboxConfig }) => {
  
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadComponent = async () => {
      try {
        // Crear blob con el código TSX
        const blob = new Blob([tsxCode], { type: 'application/typescript' });
        const url = URL.createObjectURL(blob);
        
        // Cargar dinámicamente en sandbox iframe
        const sandboxedComponent = await loadInSandbox(url, sandboxConfig);
        setComponent(() => sandboxedComponent);
        
      } catch (err) {
        setError('Error cargando artefacto interactivo');
      }
    };
    
    loadComponent();
  }, [tsxCode, props]);
  
  if (error) return <ErrorBoundary error={error} />;
  if (!Component) return <Loading />;
  
  return (
    <div className="tsx-artifact-container">
      <Suspense fallback={<Loading />}>
        <Component {...props} />
      </Suspense>
    </div>
  );
};
```

#### Configuración de Sandbox
```typescript
interface SandboxConfig {
  maxExecutionTime: number;    // 30 segundos máximo
  allowedDomains: string[];    // Dominios para fetch() si se permite
  maxMemoryUsage: number;      // 50MB máximo
  allowedReactHooks: string[]; // useState, useEffect, useMemo, etc.
  cssRestrictions: boolean;    // No position: fixed, no z-index alto
}
```

### Casos de Uso para Artefactos .tsx

#### 1. **Calculadora Matemática Interactiva**
```tsx
const CalculadoraFracciones: React.FC = () => {
  const [numerador1, setNumerador1] = useState(1);
  const [denominador1, setDenominador1] = useState(2);
  // ... lógica de cálculo
  return (
    <div className="calculadora-fracciones">
      {/* Interfaz interactiva */}
    </div>
  );
};
```

#### 2. **Simulador de Experimentos**
```tsx
const SimuladorReaccionQuimica: React.FC = () => {
  const [reactivos, setReactivos] = useState([]);
  // ... simulación química básica
  return (
    <div className="simulador-quimica">
      {/* Representación visual de la reacción */}
    </div>
  );
};
```

#### 3. **Juego de Vocabulario**
```tsx
const JuegoVocabulario: React.FC<{ palabras: string[] }> = ({ palabras }) => {
  const [puntuacion, setPuntuacion] = useState(0);
  // ... lógica del juego
  return (
    <div className="juego-vocabulario">
      {/* Interfaz del juego */}
    </div>
  );
};
```

---

## 📝 2.5 SISTEMA DE DOCUMENTOS INTERNOS

### Editor WYSIWYG Integrado
```typescript
// Componente editor basado en TipTap
const LessonDocumentEditor: React.FC = () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link,
      Image,
      Table,
      TextAlign,
      // Extensiones específicas para educación
      MathFormula,
      CodeBlock,
      Highlight,
    ],
    content: initialContent,
  });
  
  return (
    <div className="lesson-document-editor">
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};
```

### Capacidades del Editor:
✅ **Texto rico** con formato completo
✅ **Fórmulas matemáticas** (via MathJax)
✅ **Tablas e imágenes** embebidas
✅ **Enlaces** a recursos externos
✅ **Bloques de código** para programación
✅ **Exportación** a PDF/HTML
✅ **Colaboración** en tiempo real (opcional)

---

## 👥 2.7 GESTIÓN DE USUARIOS Y PERMISOS

### Matriz de Permisos

| Rol | Crear Workspace | Crear Lecciones | Subir Archivos | Ver TSX | Crear TSX | Compartir |
|-----|-----------------|-----------------|----------------|---------|-----------|-----------|
| **Admin** | ✅ Todos | ✅ Todos | ✅ Todo | ✅ Todo | ✅ Todo | ✅ Todo |
| **Teacher** | ✅ Propios | ✅ Propios | ✅ Propios | ✅ Todo | ✅ Propios | ✅ Clases asignadas |
| **Student** | ❌ | ❌ | ❌ | ✅ Compartidos | ❌ | ❌ |
| **Family** | ❌ | ❌ | ❌ | ✅ Públicos | ❌ | ❌ |

### Niveles de Visibilidad

#### 1. **PRIVATE** (Privado)
- Solo el profesor creador
- No visible en búsquedas
- No compartible automáticamente

#### 2. **SHARED_CLASS** (Compartido con clase)
- Visible para estudiantes de la clase específica
- Familias pueden ver si el recurso está marcado como público
- Aparece en "Mis Recursos" de los estudiantes

#### 3. **PUBLIC** (Público)
- Visible en la biblioteca general
- Puede ser reutilizado por otros profesores
- Indexado en búsquedas globales

---

## 🔁 2.6 INTEGRACIÓN CON MÓDULOS EXISTENTES

### Con Task Attachments
```typescript
// Endpoint para adjuntar recursos de lección a tareas
POST /api/tasks/{taskId}/attach-lesson-resource
{
  "lessonResourceId": "uuid",
  "attachmentType": "reference" | "copy"
}
```

### Con Educational Resources
```typescript
// Endpoint para promover recurso de lección a biblioteca general
POST /api/lessons/resources/{resourceId}/promote-to-library
{
  "makePublic": boolean,
  "tags": string[],
  "description": string
}
```

### Con Communications
```typescript
// Compartir recursos directamente por mensaje
POST /api/communications/share-lesson-resource
{
  "resourceId": "uuid",
  "recipientIds": ["uuid"],
  "messageText": "string"
}
```

---

## 🔗 4. ENDPOINTS DE LA API

### Gestión de Workspaces
```typescript
POST   /api/lessons/workspaces/init/:subjectAssignmentId
GET    /api/lessons/workspaces/teacher/:teacherId
GET    /api/lessons/workspaces/:workspaceId
DELETE /api/lessons/workspaces/:workspaceId
```

### Gestión de Lecciones
```typescript
POST   /api/lessons/:workspaceId/folders
GET    /api/lessons/:workspaceId/folders
PUT    /api/lessons/folders/:folderId
DELETE /api/lessons/folders/:folderId
POST   /api/lessons/folders/:folderId/reorder
```

### Gestión de Recursos
```typescript
POST   /api/lessons/folders/:folderId/resources
GET    /api/lessons/folders/:folderId/resources
PUT    /api/lessons/resources/:resourceId
DELETE /api/lessons/resources/:resourceId

# Específicos para archivos
POST   /api/lessons/folders/:folderId/upload-file
POST   /api/lessons/folders/:folderId/upload-tsx-artifact

# Específicos para contenido interno
POST   /api/lessons/folders/:folderId/create-document
PUT    /api/lessons/resources/:resourceId/document-content

# Visualización y renderizado
GET    /api/lessons/resources/:resourceId/view
GET    /api/lessons/resources/:resourceId/render-tsx
GET    /api/lessons/resources/:resourceId/download
```

### Compartir y Permisos
```typescript
POST   /api/lessons/resources/:resourceId/share
GET    /api/lessons/resources/shared-with-me
POST   /api/lessons/resources/:resourceId/set-visibility
GET    /api/lessons/search/resources
```

---

## ⚙️ 3. STACK TECNOLÓGICO

### Backend (NestJS)
- **Multer** para upload de archivos
- **Google Drive API** para almacenamiento
- **TypeScript** compilador para validación TSX
- **Puppeteer** para renderizado de PDFs (opcional)
- **Sharp** para procesamiento de imágenes

### Frontend (React)
- **TipTap** editor WYSIWYG
- **PDF.js** visor de PDFs
- **Framer Motion** animaciones del explorador
- **React Query** gestión de estado del servidor
- **Ant Design** componentes UI consistentes
- **Monaco Editor** editor de código para .tsx

### Integración TSX
- **Babel** transformación de código en runtime
- **Sandbox iframe** ejecución aislada
- **React Suspense** carga asíncrona de componentes
- **Error Boundaries** manejo de errores de artefactos

---

## 📊 MÉTRICAS Y ANALYTICS

### Métricas de Uso
- Número de lecciones creadas por profesor
- Recursos más utilizados por tipo
- Tiempo de visualización de artefactos TSX
- Recursos compartidos vs privados

### Métricas de Rendimiento
- Tiempo de carga de workspaces
- Tiempo de renderizado de artefactos TSX
- Espacio utilizado en Google Drive por profesor
- Frecuencia de uso por asignatura

---

## 🚀 PLAN DE IMPLEMENTACIÓN

### Fase 1: Base (4-6 semanas)
- Modelos de base de datos
- Servicios básicos de workspace/lecciones
- Integración Google Drive
- API endpoints básicos
- Interfaz explorador básico

### Fase 2: Recursos Avanzados (3-4 semanas)
- Sistema de upload completo
- Editor WYSIWYG integrado
- Visor de archivos embebido
- Sistema de enlaces externos

### Fase 3: Artefactos TSX (4-6 semanas)
- Validador de código TSX
- Sistema de sandbox seguro
- Editor de código integrado
- Renderizador dinámico

### Fase 4: Integración Completa (2-3 semanas)
- Integración con Tasks
- Integración con Communications
- Sistema de compartir avanzado
- Analytics y métricas

### Fase 5: Optimización (2-3 semanas)
- Performance tuning
- Testing exhaustivo
- Documentación completa
- Deployment en producción

---

## 🎯 BENEFICIOS ESPERADOS

### Para Profesores
✅ **Organización centralizada** de materiales didácticos
✅ **Reutilización** de recursos entre clases y años
✅ **Creación rápida** de contenido interactivo
✅ **Backup automático** en Google Drive
✅ **Compartir fácil** con estudiantes y colegas

### Para Estudiantes
✅ **Acceso organizado** a materiales de cada lección
✅ **Experiencias interactivas** con artefactos TSX
✅ **Visualización directa** de PDFs y multimedia
✅ **Disponibilidad 24/7** desde cualquier dispositivo

### Para la Institución
✅ **Biblioteca centralizada** de recursos pedagógicos
✅ **Consistencia** en la organización de materiales
✅ **Innovación educativa** con elementos interactivos
✅ **Escalabilidad** para crecimiento futuro

---

## 🔒 CONSIDERACIONES DE SEGURIDAD

### Artefactos TSX
- Validación estricta de código
- Sandbox de ejecución
- Límites de recursos (CPU, memoria)
- Auditoría de acciones

### Archivos
- Validación de tipos MIME
- Escaneo antivirus (recomendado)
- Límites de tamaño por rol
- Backup automático

### Permisos
- Control granular por recurso
- Auditoría de acceso
- Expiración de enlaces compartidos
- Revocación de permisos

El módulo "Lecciones y Recursos" está diseñado para ser una evolución natural del sistema existente, aprovechando toda la infraestructura actual mientras añade funcionalidades innovadoras como los artefactos TSX interactivos.