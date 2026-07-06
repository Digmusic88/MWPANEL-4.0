# Configuración del Módulo de Recursos Educativos - MW Panel

## Resumen

El módulo de Recursos Educativos permite a los profesores compartir materiales didácticos digitales (PDFs, videos, imágenes, HTML interactivo) a través de Google Drive. Los archivos se almacenan en la unidad compartida "12. Plataforma (Recursos dicácticos compartidos)" con organización automática por año académico, nivel educativo, curso y asignatura.

## Requisitos Previos

1. **Google Cloud Console**
   - Proyecto de Google Cloud activo
   - APIs habilitadas: Google Drive API v3
   - Service Account creado con permisos adecuados

2. **Google Drive**
   - Acceso a la unidad compartida "12. Plataforma (Recursos dicácticos compartidos)"
   - Service Account añadido como "Organizador" en la unidad compartida

3. **MW Panel**
   - Sistema base instalado y funcionando
   - PostgreSQL 15+
   - Node.js 18+
   - Docker y Docker Compose

## Configuración Paso a Paso

### 1. Crear Service Account en Google Cloud

1. Acceder a [Google Cloud Console](https://console.cloud.google.com)
2. Ir a **IAM y administración** > **Cuentas de servicio**
3. Hacer clic en **Crear cuenta de servicio**
4. Configurar:
   - Nombre: `mw-panel-resources`
   - ID: `mw-panel-resources@tu-proyecto.iam.gserviceaccount.com`
   - Descripción: "Service account para gestión de recursos educativos en MW Panel"
5. Otorgar rol: **Ninguno** (los permisos se gestionan en Drive)
6. Crear clave:
   - Tipo: JSON
   - Descargar y guardar de forma segura

### 2. Habilitar Google Drive API

1. En Google Cloud Console, ir a **APIs y servicios** > **Biblioteca**
2. Buscar "Google Drive API"
3. Hacer clic en **Habilitar**

### 3. Configurar Permisos en Google Drive

1. Acceder a Google Drive con una cuenta con permisos de administrador
2. Localizar la unidad compartida "12. Plataforma (Recursos dicácticos compartidos)"
3. Click derecho > **Gestionar miembros**
4. Añadir el email del Service Account: `mw-panel-resources@tu-proyecto.iam.gserviceaccount.com`
5. Asignar rol: **Organizador** (permite crear, editar y eliminar archivos y carpetas)

### 4. Configurar Variables de Entorno

Editar el archivo `.env` en `/opt/mw-panel/backend/.env`:

```bash
# Google Drive API Configuration
GOOGLE_SERVICE_ACCOUNT_EMAIL=mw-panel-resources@tu-proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[TU_CLAVE_PRIVADA_AQUI]\n-----END PRIVATE KEY-----"
GOOGLE_SHARED_DRIVE_NAME="12. Plataforma (Recursos dicácticos compartidos)"

# Educational Resources Configuration
CURRENT_ACADEMIC_YEAR=2024-2025
AUTO_CREATE_FOLDERS=true
ARCHIVE_OLD_RESOURCES=true

# File Upload Limits (in bytes)
MAX_FILE_SIZE_PDF=52428800       # 50MB
MAX_FILE_SIZE_VIDEO=524288000    # 500MB
MAX_FILE_SIZE_IMAGE=10485760     # 10MB
MAX_FILE_SIZE_HTML=5242880       # 5MB
MAX_FILE_SIZE_DOCUMENT=20971520  # 20MB

# Upload Configuration
UPLOAD_CHUNK_SIZE=5242880        # 5MB chunks
CONCURRENT_CHUNKS=3              # Parallel chunks

# Notifications
NOTIFY_ON_NEW_RESOURCE=true
NOTIFY_ON_ASSIGNMENT=true
```

**IMPORTANTE**: La clave privada debe mantener los saltos de línea con `\n`. Copiar exactamente como aparece en el archivo JSON descargado.

### 5. Ejecutar Migraciones de Base de Datos

```bash
# Acceder al contenedor backend
docker-compose exec backend bash

# Ejecutar la migración
npm run migration:run

# Verificar que las tablas se crearon correctamente
npm run typeorm query "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%resource%'"
```

Tablas que deben existir:
- `educational_resources`
- `resource_assignments`
- `resource_views`
- `resource_comments`
- `resource_favorites`

### 6. Reiniciar el Sistema

```bash
# Desde el directorio /opt/mw-panel
docker-compose down
docker-compose up -d

# Verificar logs del backend
docker-compose logs -f backend
```

Buscar el mensaje: `Connected to shared drive: 12. Plataforma (Recursos dicácticos compartidos)`

### 7. Verificar la Instalación

1. Acceder a MW Panel como administrador o profesor
2. Navegar a **Académico** > **Recursos Educativos** (Admin) o **Recursos Educativos** (Profesor)
3. Hacer clic en **Subir Recurso**
4. Subir un archivo de prueba
5. Verificar que:
   - El archivo se sube correctamente
   - Aparece en la lista de recursos
   - Se puede visualizar/descargar
   - Aparece en Google Drive en la carpeta correspondiente

## Estructura de Carpetas en Google Drive

El sistema crea automáticamente la siguiente estructura:

```
12. Plataforma (Recursos dicácticos compartidos)/
├── 2024-2025/
│   ├── Educación Primaria/
│   │   ├── 1º Primaria/
│   │   │   ├── Conocimiento del Medio/
│   │   │   ├── Lengua Castellana/
│   │   │   ├── Matemáticas/
│   │   │   ├── Inglés/
│   │   │   └── Euskera/
│   │   ├── 2º Primaria/
│   │   │   └── [Asignaturas...]
│   │   └── [Más cursos...]
│   ├── Educación Secundaria (ESO)/
│   │   ├── 1º ESO/
│   │   │   ├── Biología y Geología/
│   │   │   ├── Física y Química/
│   │   │   ├── Geografía e Historia/
│   │   │   ├── Lengua Castellana/
│   │   │   ├── Matemáticas/
│   │   │   ├── Tecnología/
│   │   │   ├── Inglés/
│   │   │   └── Euskera/
│   │   └── [Más cursos...]
│   └── Recursos Transversales/
│       ├── Digitalización/
│       ├── Educación en Valores/
│       └── Orientación/
└── Archivo Histórico/
    └── [Años anteriores...]
```

## Funcionalidades del Módulo

### Para Profesores
- **Subir recursos**: PDFs, videos, imágenes, HTML interactivo, documentos Office
- **Organización automática**: Por nivel educativo, curso y asignatura
- **Gestión de recursos**: Editar, eliminar, marcar como favoritos
- **Compartir**: Recursos públicos visibles para otros profesores
- **Asignar**: Asignar recursos a clases o estudiantes específicos
- **Estadísticas**: Ver vistas, descargas y uso de cada recurso

### Para Estudiantes
- **Ver recursos asignados**: Acceso a materiales asignados por profesores
- **Biblioteca de recursos**: Explorar recursos públicos
- **Favoritos**: Marcar recursos para acceso rápido
- **Historial**: Ver recursos consultados recientemente

### Para Administradores
- **Gestión completa**: Ver y gestionar todos los recursos del sistema
- **Estadísticas globales**: Uso de recursos por nivel, asignatura, etc.
- **Configuración**: Ajustar límites de tamaño y tipos de archivo permitidos

## Solución de Problemas

### Error: "Failed to initialize Google Drive service"

1. Verificar que las credenciales en `.env` son correctas
2. Comprobar que el Service Account tiene permisos en la unidad compartida
3. Verificar logs: `docker-compose logs backend | grep "Google Drive"`

### Error: "File type not allowed"

Los tipos MIME permitidos están definidos en `educational-resources.module.ts`. Para añadir nuevos tipos:

1. Editar `/opt/mw-panel/backend/src/modules/educational-resources/educational-resources.module.ts`
2. Añadir el tipo MIME a la lista `allowedMimeTypes`
3. Reiniciar el backend

### Error: "File size exceeds limit"

Ajustar los límites en `.env`:
- `MAX_FILE_SIZE_PDF`, `MAX_FILE_SIZE_VIDEO`, etc.
- Reiniciar el sistema después de cambiar

### No se crean las carpetas automáticamente

1. Verificar `AUTO_CREATE_FOLDERS=true` en `.env`
2. Comprobar permisos del Service Account (debe ser Organizador)
3. Revisar logs para errores de creación de carpetas

## Scripts de Mantenimiento

### Verificar conexión con Google Drive

```bash
# Crear script de test
cat > /opt/mw-panel/test-drive.js << 'EOF'
const { google } = require('googleapis');
require('dotenv').config({ path: 'backend/.env' });

async function testDrive() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });
    
    // List shared drives
    const response = await drive.drives.list();
    console.log('Unidades compartidas encontradas:');
    response.data.drives.forEach(drive => {
      console.log(`- ${drive.name} (ID: ${drive.id})`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDrive();
EOF

# Ejecutar test
cd /opt/mw-panel
npm install googleapis
node test-drive.js
```

### Limpiar recursos huérfanos

```bash
# Script para identificar archivos en Drive sin registro en BD
docker-compose exec backend npm run typeorm query "
SELECT 
  driveFileId, 
  title, 
  createdAt 
FROM educational_resources 
WHERE isActive = true 
ORDER BY createdAt DESC
"
```

## Seguridad

1. **Credenciales**: Nunca compartir las credenciales del Service Account
2. **Permisos**: Revisar periódicamente los permisos en Google Drive
3. **Validación**: El sistema valida tipos y tamaños de archivo
4. **Acceso**: Los recursos siguen el sistema de roles de MW Panel

## Backup y Recuperación

### Backup de metadatos (Base de datos)

Los metadatos de recursos se incluyen en el backup regular de MW Panel:

```bash
./backup.sh
```

### Backup de archivos (Google Drive)

Los archivos en Google Drive deben respaldarse usando las herramientas de Google:
- Google Takeout
- Google Drive API para backup automatizado
- Herramientas de terceros compatibles con Google Drive

## Soporte

Para problemas específicos del módulo de recursos educativos:

1. Revisar logs: `docker-compose logs backend | grep -i resource`
2. Verificar estado de Google Drive en la UI
3. Consultar la documentación de la API en `/api/docs`

## Próximas Funcionalidades

- [ ] Vista previa de documentos Office sin descargar
- [ ] Editor colaborativo para documentos
- [ ] Conversión automática de formatos
- [ ] OCR para búsqueda dentro de PDFs
- [ ] Integración con Google Classroom
- [ ] Plantillas de recursos reutilizables