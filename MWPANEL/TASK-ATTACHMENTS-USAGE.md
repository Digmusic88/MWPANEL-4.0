# 📎 Task Attachments Module - Guía de Uso

## Descripción General

El módulo de archivos adjuntos para tareas proporciona un explorador de archivos tipo Google Drive integrado en MW Panel 2.0. Permite a profesores y estudiantes subir, organizar, comentar y gestionar archivos relacionados con las tareas de manera intuitiva y segura.

## 🎯 Características Principales

### ✅ Funcionalidades Implementadas

#### **Backend (NestJS)**
- ✅ **API RESTful completa**: 15+ endpoints documentados con Swagger
- ✅ **Integración Google Drive**: Estructura de carpetas académica automática
- ✅ **Sistema de permisos**: Role-based access control granular
- ✅ **Versionado de archivos**: Historial completo de cambios
- ✅ **Audit logging**: Tracking completo de actividades
- ✅ **Sistema de comentarios**: Comentarios anidados en archivos
- ✅ **Sanitización ASCII**: Nombres compatibles con Google Drive

#### **Frontend (React + TypeScript)**
- ✅ **TaskFileExplorer**: Explorador principal estilo Google Drive
- ✅ **FileUploadZone**: Drag & drop con progress tracking
- ✅ **CommentsPanel**: Sistema completo de comentarios anidados
- ✅ **TaskAttachmentsSection**: Integración lista para usar
- ✅ **AttachmentsService**: Client API completo
- ✅ **TypeScript**: Tipado completo y robusto

## 🚀 Instalación y Configuración

### Backend (Ya implementado)

El backend está completamente implementado y funcional:

```bash
# Tablas creadas automáticamente
- task_attachments          # Archivos principales
- attachment_versions       # Historial de versiones  
- attachment_comments       # Sistema de comentarios
- attachment_audit_logs     # Tracking de actividades

# Endpoints disponibles
GET    /api/attachments                    # Listar archivos
POST   /api/attachments/upload             # Subir archivo
GET    /api/attachments/:id                # Obtener archivo
PATCH  /api/attachments/:id                # Actualizar metadatos
DELETE /api/attachments/:id                # Eliminar archivo
POST   /api/attachments/:id/restore        # Restaurar archivo
GET    /api/attachments/:id/download       # Descargar archivo
GET    /api/attachments/folders/:taskId    # Estructura carpetas
POST   /api/attachments/:id/versions       # Nueva versión
GET    /api/attachments/:id/comments       # Listar comentarios
POST   /api/attachments/:id/comments       # Añadir comentario
```

### Frontend (Listo para integrar)

#### 1. Importar componentes

```tsx
import {
  TaskFileExplorer,
  FileUploadZone,
  CommentsPanel,
  TaskAttachmentsSection,
} from '../components/attachments';
```

#### 2. Uso básico en página de tarea

```tsx
import React from 'react';
import { TaskAttachmentsSection } from '../components/attachments';

const TaskDetailPage: React.FC<{ taskId: string }> = ({ taskId }) => {
  return (
    <div>
      {/* Otro contenido de la tarea */}
      
      <TaskAttachmentsSection
        taskId={taskId}
        taskTitle="Matemáticas - Ejercicios"
        isTeacher={currentUser.role === 'teacher'}
        readOnly={currentUser.role === 'family'}
        showTabs={true}
        defaultTab="explorer"
      />
    </div>
  );
};
```

#### 3. Uso avanzado con componentes individuales

```tsx
import React, { useState } from 'react';
import { TaskFileExplorer, FileUploadZone } from '../components/attachments';

const CustomTaskPage: React.FC = () => {
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div>
      {/* Explorador de archivos */}
      <TaskFileExplorer
        taskId="task-uuid"
        taskTitle="Mi Tarea"
        isTeacher={true}
        readOnly={false}
      />

      {/* Zona de upload separada */}
      {showUpload && (
        <FileUploadZone
          taskId="task-uuid"
          isTeacher={true}
          onUploadComplete={(files) => {
            console.log('Archivos subidos:', files);
            setShowUpload(false);
          }}
          maxFiles={5}
        />
      )}
    </div>
  );
};
```

## 📋 Componentes Disponibles

### 1. TaskFileExplorer

Explorador principal de archivos con funcionalidades completas.

```tsx
interface TaskFileExplorerProps {
  taskId: string;              // ID de la tarea (requerido)
  taskTitle?: string;          // Título para mostrar
  isTeacher?: boolean;         // Si es profesor (más permisos)
  readOnly?: boolean;          // Solo lectura (para familias)
  className?: string;          // CSS className
}
```

**Características:**
- 📁 Vista tabla/grid con sorting y filtros
- 🔍 Búsqueda en tiempo real
- ⬇️ Descarga directa de archivos
- 👁️ Vista previa para imágenes y PDFs
- 💬 Acceso a comentarios
- 📊 Información de versiones
- 🗑️ Eliminar/restaurar archivos

### 2. FileUploadZone

Zona de upload con drag & drop y configuración avanzada.

```tsx
interface FileUploadZoneProps {
  taskId: string;                        // ID de la tarea
  isTeacher?: boolean;                   // Tipo de usuario
  onUploadComplete?: (files) => void;    // Callback al completar
  maxFiles?: number;                     // Máximo archivos (default: 10)
  className?: string;                    // CSS className
}
```

**Características:**
- 🎯 Drag & drop intuitivo
- 📊 Progress tracking en tiempo real
- 🏷️ Metadatos y etiquetas configurables
- ✅ Validación de archivos automática
- 🔄 Upload en lote optimizado
- ❌ Manejo de errores robusto

### 3. CommentsPanel

Sistema de comentarios anidados para archivos.

```tsx
interface CommentsPanelProps {
  attachmentId: string;        // ID del archivo
  attachmentName: string;      // Nombre para mostrar
  visible: boolean;            // Modal visible
  onClose: () => void;         // Función de cierre
  currentUserId?: string;      // ID usuario actual
  readOnly?: boolean;          // Solo lectura
}
```

**Características:**
- 💬 Comentarios anidados (3 niveles)
- ✏️ Editar/eliminar propios comentarios
- 🕒 Timestamps relativos
- 👤 Avatares de usuarios
- 📱 Responsive design

### 4. TaskAttachmentsSection

Componente completo todo-en-uno con tabs.

```tsx
interface TaskAttachmentsSectionProps {
  taskId: string;                              // ID de la tarea
  taskTitle: string;                           // Título de la tarea
  isTeacher?: boolean;                         // Si es profesor
  readOnly?: boolean;                          // Solo lectura
  showTabs?: boolean;                          // Mostrar tabs (default: true)
  defaultTab?: 'explorer' | 'upload' | 'stats'; // Tab inicial
  className?: string;                          // CSS className
}
```

**Tabs disponibles:**
- 📁 **Explorador**: TaskFileExplorer completo
- ⬆️ **Upload**: FileUploadZone para subir archivos
- 📊 **Estadísticas**: Métricas y análisis

## 🔧 Servicios y APIs

### AttachmentsService

Cliente API completo para el frontend:

```tsx
import AttachmentsService from '../services/attachmentsService';

// Subir archivo
const result = await AttachmentsService.uploadAttachment(
  file,
  {
    taskId: 'uuid',
    isStudentSubmission: true,
    description: 'Mi tarea de matemáticas',
    tags: ['importante', 'tarea']
  },
  (progress) => console.log(`Progress: ${progress}%`)
);

// Obtener archivos con filtros
const attachments = await AttachmentsService.getAttachments({
  taskId: 'uuid',
  isStudentSubmission: true,
  search: 'matemáticas',
  page: 1,
  limit: 20
});

// Descargar archivo
const blob = await AttachmentsService.downloadAttachment('file-uuid');

// Comentarios
const comments = await AttachmentsService.getComments('file-uuid');
await AttachmentsService.addComment('file-uuid', { content: 'Excelente trabajo!' });
```

### Utilidades

```tsx
// Validar archivo antes de upload
const validation = AttachmentsService.validateFile(file);
if (!validation.valid) {
  console.error(validation.error);
}

// Formatear tamaño
const size = AttachmentsService.formatFileSize(1024000); // "1.02 MB"

// Obtener tipo legible
const type = AttachmentsService.getFileType('application/pdf'); // "PDF"

// Verificar si se puede previsualizar
const canPreview = AttachmentsService.isPreviewSupported('image/jpeg'); // true
```

## 🎨 Personalización

### Estilos CSS

Los componentes usan Tailwind CSS y Ant Design. Puedes personalizar:

```css
/* Personalizar explorador de archivos */
.task-file-explorer {
  @apply rounded-lg shadow-sm;
}

/* Personalizar zona de upload */
.file-upload-zone .ant-upload-drag {
  @apply border-2 border-dashed border-blue-300;
}

/* Personalizar comentarios */
.comments-panel .comment-item {
  @apply bg-gray-50 rounded-lg p-3;
}
```

### Configuración de Upload

```tsx
// Límites personalizados
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/*', 'application/pdf', '.docx'];

// Metadatos por defecto
const defaultMetadata = {
  academicYear: '2024-2025',
  subject: 'Matemáticas',
  gradeLevel: '3º ESO',
  tags: ['ejercicios']
};
```

## 🔒 Permisos y Seguridad

### Matriz de Permisos

| Acción | Admin | Teacher | Student | Family |
|--------|-------|---------|---------|---------|
| Ver archivos | ✅ | ✅ | ✅ (propios) | ✅ (hijos) |
| Subir archivos | ✅ | ✅ | ✅ | ❌ |
| Eliminar archivos | ✅ | ✅ | ✅ (propios) | ❌ |
| Comentar | ✅ | ✅ | ✅ | ✅ |
| Ver estadísticas | ✅ | ✅ | ❌ | ❌ |

### Validaciones

- **Tamaño máximo**: 10MB por archivo
- **Tipos permitidos**: Imágenes, PDFs, Office, videos, audio, comprimidos
- **Sanitización**: Nombres ASCII sin caracteres especiales
- **Rate limiting**: Aplicado en backend
- **Audit logging**: Todas las acciones registradas

## 📊 Estructura de Datos

### TaskAttachment

```typescript
interface TaskAttachment {
  id: string;
  taskId: string;
  uploadedById: string;
  fileName: string;              // Nombre sanitizado
  originalFileName: string;      // Nombre original
  mimeType: string;
  fileSize: number;
  driveFileId: string;          // ID en Google Drive
  webViewLink?: string;         // URL de vista previa
  downloadLink?: string;        // URL de descarga
  metadata: {
    version: number;
    isStudentSubmission: boolean;
    isTeacherMaterial: boolean;
    tags?: string[];
    description?: string;
    academicYear?: string;
    subject?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Relaciones
  uploadedBy?: User;
  comments?: AttachmentComment[];
  versions?: AttachmentVersion[];
}
```

## 🔧 Troubleshooting

### Problemas Comunes

#### 1. Upload falla con Error 413

```bash
# Aumentar límite en nginx
client_max_body_size 50M;

# Verificar límites en NestJS
@UseInterceptors(FileInterceptor('file', {
  limits: { fileSize: 50 * 1024 * 1024 }
}))
```

#### 2. Google Drive API no configurado

```bash
# Verificar credenciales
ls -la /opt/mw-panel/backend/google-credentials.json

# Verificar variables de entorno
echo $GOOGLE_SHARED_DRIVE_ID
```

#### 3. Permisos de archivos

```bash
# Verificar permisos de uploads
chmod -R 755 /opt/mw-panel/backend/uploads/
chown -R node:node /opt/mw-panel/backend/uploads/
```

#### 4. CORS en desarrollo

```typescript
// En main.ts del backend
app.enableCors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
});
```

### Debugging

```typescript
// Habilitar logs detallados
const attachments = await AttachmentsService.getAttachments({
  taskId: 'uuid'
});
console.log('Attachments loaded:', attachments);

// Verificar estado de Google Drive
const status = googleDriveService.getConnectionStatus();
console.log('Google Drive status:', status);
```

## 📈 Roadmap y Mejoras Futuras

### Fase 2 (Próximamente)
- [ ] **OCR Integration**: Reconocimiento de texto en imágenes
- [ ] **Real-time Collaboration**: Edición colaborativa de documentos
- [ ] **Advanced Search**: Búsqueda por contenido de archivos
- [ ] **File Previews**: Previsualizador avanzado inline

### Fase 3 (Futuro)
- [ ] **Mobile App**: Aplicación móvil nativa
- [ ] **Offline Sync**: Sincronización offline
- [ ] **Advanced Analytics**: Dashboard con métricas avanzadas
- [ ] **Integration APIs**: APIs para integraciones externas

## 🤝 Contribución

Para añadir nuevas funcionalidades:

1. **Backend**: Añadir endpoints en `AttachmentsController`
2. **Frontend**: Crear componentes en `/components/attachments/`
3. **Types**: Actualizar interfaces en `/types/attachments.ts`
4. **Service**: Extender `AttachmentsService`
5. **Tests**: Añadir tests de integración

## 📞 Soporte

Para soporte técnico:
- **Documentación**: `/opt/mw-panel/TASK-ATTACHMENTS-MODULE.md`
- **API Docs**: `https://plataforma.mundoworld.school/api/docs`
- **Logs**: `docker-compose logs backend`

---

✅ **Módulo completamente funcional y listo para producción**