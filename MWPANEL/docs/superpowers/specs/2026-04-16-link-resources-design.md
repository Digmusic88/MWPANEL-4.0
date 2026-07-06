# Diseño: Recursos tipo Enlace Externo

**Fecha**: 2026-04-16  
**Estado**: Aprobado  
**Módulo**: Educational Resources  

---

## Resumen

Añadir un nuevo tipo de recurso educativo (`LINK`) que permite a profesores y administradores compartir URLs externas (YouTube, webs, artículos, etc.) con las mismas capacidades que los recursos de archivo existentes: carpetas, asignaciones, favoritos, vistas.

Al abrir un enlace, el usuario ve primero una vista previa con thumbnail y descripción (extraídos automáticamente por Open Graph scraping, editables manualmente), y luego el contenido embebido en un iframe con fallback a nueva pestaña si el sitio no lo permite.

---

## Decisiones de diseño

- **Enfoque elegido**: Extender la entidad existente `EducationalResource` con columnas nullable para datos de enlace, y hacer nullable los campos de Drive que no aplican a enlaces.
- **Alternativas descartadas**:
  - Entidad separada `ResourceLink`: duplica lógica de favoritos, asignaciones, vistas, carpetas.
  - Reutilizar campos de Drive con valores dummy: semántica engañosa, bugs garantizados.

---

## Modelo de datos

### Cambios en `educational-resource.entity.ts`

```typescript
export enum ResourceType {
  PDF = 'PDF',
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  INTERACTIVE_HTML = 'INTERACTIVE_HTML',
  DOCUMENT = 'DOCUMENT',
  PRESENTATION = 'PRESENTATION',
  SPREADSHEET = 'SPREADSHEET',
  AUDIO = 'AUDIO',
  LINK = 'LINK',  // ← NUEVO
}
```

**Columnas nuevas** (todas nullable):

| Columna | Tipo | Descripción |
|---|---|---|
| `externalUrl` | `varchar` nullable | URL del recurso externo |
| `previewTitle` | `varchar` nullable | Título scrapeado/editado por el profesor |
| `previewDescription` | `text` nullable | Descripción scrapeada/editada |
| `previewImage` | `varchar` nullable | URL de la imagen Open Graph |

**Columnas existentes a hacer nullable**:

| Columna | Estado actual | Estado nuevo |
|---|---|---|
| `driveFileId` | NOT NULL, UNIQUE | nullable (unique solo cuando no null) |
| `driveFolderId` | NOT NULL | nullable |
| `driveFileName` | NOT NULL | nullable |
| `mimeType` | NOT NULL | nullable |
| `fileSize` | NOT NULL | nullable |

**Invariante**: si `type = LINK` → `externalUrl` tiene valor, campos Drive son null. Si `type != LINK` → `externalUrl` es null, campos Drive tienen valor.

### Migración TypeORM

Una migración única con timestamp que:
1. Añade `'LINK'` al enum `resource_type` en PostgreSQL
2. Hace nullable las 5 columnas de Drive
3. Añade las 4 columnas nuevas de enlace
4. Elimina el constraint `UNIQUE` de `driveFileId` y lo reemplaza por uno condicional (nullable-safe)

---

## Backend

### Nuevo endpoint: `POST /api/recursos/create-link`

- **Autenticación**: JWT requerido, roles `ADMIN` y `TEACHER`
- **Cuerpo**: JSON (no FormData)
- **Lógica**:
  1. Validar DTO
  2. Si `previewTitle`/`previewDescription`/`previewImage` no vienen en el body → llamar a `scrapeUrlMetadata(externalUrl)`
  3. Los campos scrapeados son best-effort: si el scraping falla, se guardan como null (el profesor puede editarlos después)
  4. Guardar en BD con `type = LINK`, campos Drive como null

### Nuevo endpoint: `GET /api/recursos/link-preview?url=...`

- **Autenticación**: JWT requerido
- **Propósito**: Scraping en tiempo real mientras el profesor escribe la URL
- **Respuesta**: `{ title: string|null, description: string|null, image: string|null }`
- **Timeout**: 5 segundos — si supera el timeout, devuelve `{ title: null, description: null, image: null }` sin error

### DTO: `CreateLinkResourceDto`

```typescript
export class CreateLinkResourceDto {
  @IsString()
  title: string;

  @IsUrl()
  externalUrl: string;

  @IsUUID()
  subjectId: string;

  @IsUUID()
  educationalLevelId: string;

  @IsString()
  gradeLevel: string;

  @IsOptional() @IsString()
  previewTitle?: string;

  @IsOptional() @IsString()
  previewDescription?: string;

  @IsOptional() @IsString()
  previewImage?: string;

  @IsOptional() @IsBoolean()
  isPublic?: boolean;

  @IsOptional() @IsUUID()
  folderId?: string;
}
```

### Servicio de scraping: `scrapeUrlMetadata(url)`

- Librería: `node-html-parser` (o `fetch` nativo + regex para og tags) — sin puppeteer
- Extrae en orden de preferencia:
  - Título: `og:title` → `<title>` del HTML
  - Descripción: `og:description` → `meta[name=description]`
  - Imagen: `og:image`
- Timeout de 5s con `AbortController`
- En caso de cualquier error (red, parsing, timeout): devuelve `{ title: null, description: null, image: null }`

---

## Frontend

### `ResourceUploader.tsx` — nueva pestaña

Se añade un sistema de tabs al componente existente:

- **Tab 1**: "Subir archivo" — comportamiento actual sin cambios
- **Tab 2**: "Enlace externo" — nuevo formulario con:
  - Campo URL con botón de validar/scrape (onBlur también dispara el scrape)
  - Vista previa auto-cargada (thumbnail + título + descripción)
  - Campos de título y descripción pre-rellenados y editables
  - Mismos campos de contexto: Asignatura, Nivel, Curso, Visibilidad, Carpeta
  - Botón "Añadir enlace"

### `ResourceCard.tsx` — visual para tipo LINK

- Icono `LinkOutlined` (Ant Design) en lugar del icono de tipo de archivo
- Badge "Enlace externo" en la esquina superior derecha
- Thumbnail desde `previewImage` si existe; si no, placeholder con el dominio
- Comportamiento de click: abre el `ResourceViewer` (no descarga directa)

### `ResourceViewer.tsx` — visor de enlace

Cuando `resource.type === 'LINK'`:

**Panel superior (vista previa)**:
- Thumbnail grande (si existe `previewImage`)
- Título (`previewTitle` o `title`)
- Descripción (`previewDescription`)
- Dominio extraído de la URL
- Botón "Abrir en nueva pestaña ↗"

**Panel inferior (iframe embebido)**:
- `<iframe src={resource.externalUrl} />` con altura fija
- Si el iframe falla por `X-Frame-Options` (detectado con `onerror` / `onLoad` heurística): ocultar iframe y mostrar aviso con botón "Abrir en nueva pestaña"

---

## Permisos

- **Crear enlaces**: `ADMIN`, `TEACHER` (igual que subida de archivos)
- **Ver enlaces**: todos los roles que ya tienen acceso a recursos educativos
- **Sin cambios** en el sistema de roles existente

---

## Casos límite

| Caso | Comportamiento |
|---|---|
| URL inaccesible para scraping | Preview vacía, profesor rellena manualmente |
| Sitio con `X-Frame-Options: deny` | iframe oculto, botón "Abrir en nueva pestaña" |
| URL sin protocolo (`youtube.com`) | Validación en frontend añade `https://` automáticamente |
| URL de Google Drive | Funciona igual que cualquier URL externa |
| Editar un enlace existente | Endpoint `PATCH /api/recursos/:id` existente — sin cambios, acepta los nuevos campos |

---

## Archivos a modificar/crear

### Backend
- `entities/educational-resource.entity.ts` — añadir `LINK` al enum y 4 columnas nuevas; hacer nullable columnas de Drive
- `educational-resources.controller.ts` — añadir endpoints `create-link` y `link-preview`
- `educational-resources.service.ts` — añadir métodos `createLinkResource()` y `scrapeUrlMetadata()`
- `dto/create-link-resource.dto.ts` — nuevo DTO
- `database/migrations/TIMESTAMP-AddLinkResourceType.ts` — migración

### Frontend
- `components/recursos/ResourceUploader.tsx` — añadir tab "Enlace externo"
- `components/recursos/ResourceCard.tsx` — renderizado para tipo LINK
- `components/recursos/ResourceViewer.tsx` — visor de enlace con iframe
- `services/educationalResourcesService.ts` — añadir `createLinkResource()` y `getLinkPreview()`
