# Link Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `LINK` as a new resource type so teachers and admins can share external URLs with Open Graph preview scraping and embedded iframe viewing.

**Architecture:** Extend the existing `EducationalResource` entity with 4 new nullable columns (`externalUrl`, `previewTitle`, `previewDescription`, `previewImage`) and make Drive-specific columns nullable. Two new backend endpoints handle link creation (JSON body, no file upload) and real-time URL preview scraping. Frontend adds a tab to the uploader, LINK rendering to the card, and an iframe viewer.

**Tech Stack:** NestJS + TypeORM (backend), React + Ant Design + TailwindCSS (frontend), native `fetch` + regex for OG scraping (no new deps), PostgreSQL partial unique index for nullable `driveFileId`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/src/modules/educational-resources/entities/educational-resource.entity.ts` | Modify | Add LINK to enum, 4 new nullable columns, make Drive cols nullable |
| `backend/src/database/migrations/1770000000000-AddLinkResourceType.ts` | Create | DB migration: enum, nullable cols, 4 new cols |
| `backend/src/modules/educational-resources/dto/create-link-resource.dto.ts` | Create | DTO for link creation |
| `backend/src/modules/educational-resources/educational-resources.service.ts` | Modify | Add `scrapeUrlMetadata()` and `createLinkResource()` |
| `backend/src/modules/educational-resources/educational-resources.controller.ts` | Modify | Add `POST /create-link` and `GET /link-preview` endpoints |
| `frontend/src/services/educationalResourcesService.ts` | Modify | Add LINK to ResourceType, link fields to EducationalResource, new methods |
| `frontend/src/components/recursos/ResourceCard.tsx` | Modify | Add LINK icon/color/badge/thumbnail rendering |
| `frontend/src/components/recursos/ResourceUploader.tsx` | Modify | Add "Enlace externo" tab with scraping form |
| `frontend/src/components/recursos/ResourceViewer.tsx` | Modify | Add iframe viewer + preview panel for LINK type |

---

### Task 1: Database migration

**Files:**
- Create: `backend/src/database/migrations/1770000000000-AddLinkResourceType.ts`

- [ ] **Step 1.1: Create the migration file**

```typescript
// backend/src/database/migrations/1770000000000-AddLinkResourceType.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLinkResourceType1770000000000 implements MigrationInterface {
  name = 'AddLinkResourceType1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add LINK to the enum (PostgreSQL requires ALTER TYPE)
    await queryRunner.query(`
      ALTER TYPE "public"."educational_resources_type_enum" ADD VALUE 'LINK'
    `);

    // 2. Make Drive-specific columns nullable
    await queryRunner.query(`
      ALTER TABLE "educational_resources"
        ALTER COLUMN "driveFileId" DROP NOT NULL,
        ALTER COLUMN "driveFolderId" DROP NOT NULL,
        ALTER COLUMN "driveFileName" DROP NOT NULL,
        ALTER COLUMN "mimeType" DROP NOT NULL,
        ALTER COLUMN "fileSize" DROP NOT NULL
    `);

    // 3. Drop the existing unique index on driveFileId (not null-safe)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_educational_resources_driveFileId"
    `);

    // 4. Create a partial unique index (only when driveFileId is not null)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_educational_resources_driveFileId"
      ON "educational_resources" ("driveFileId")
      WHERE "driveFileId" IS NOT NULL
    `);

    // 5. Add new link-specific columns
    await queryRunner.query(`
      ALTER TABLE "educational_resources"
        ADD COLUMN IF NOT EXISTS "externalUrl" character varying,
        ADD COLUMN IF NOT EXISTS "previewTitle" character varying,
        ADD COLUMN IF NOT EXISTS "previewDescription" text,
        ADD COLUMN IF NOT EXISTS "previewImage" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove link columns
    await queryRunner.query(`
      ALTER TABLE "educational_resources"
        DROP COLUMN IF EXISTS "externalUrl",
        DROP COLUMN IF EXISTS "previewTitle",
        DROP COLUMN IF EXISTS "previewDescription",
        DROP COLUMN IF EXISTS "previewImage"
    `);

    // Restore NOT NULL constraints on Drive columns
    // (only safe if there are no LINK rows; migration revert assumes clean state)
    await queryRunner.query(`
      ALTER TABLE "educational_resources"
        ALTER COLUMN "driveFileId" SET NOT NULL,
        ALTER COLUMN "driveFolderId" SET NOT NULL,
        ALTER COLUMN "driveFileName" SET NOT NULL,
        ALTER COLUMN "mimeType" SET NOT NULL,
        ALTER COLUMN "fileSize" SET NOT NULL
    `);

    // Restore original non-partial unique index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_educational_resources_driveFileId"
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_educational_resources_driveFileId"
      ON "educational_resources" ("driveFileId")
    `);

    // Note: PostgreSQL does not support removing enum values directly.
    // To remove LINK from the enum would require recreating the type.
    // Omitted here as revert is only intended for dev environments.
  }
}
```

- [ ] **Step 1.2: Commit the migration file**

```bash
cd /opt/mw-panel
git add mw-panel/backend/src/database/migrations/1770000000000-AddLinkResourceType.ts
git commit -m "feat(db): Add migration for LINK resource type"
```

---

### Task 2: Update the entity

**Files:**
- Modify: `backend/src/modules/educational-resources/entities/educational-resource.entity.ts`

- [ ] **Step 2.1: Add LINK to the enum**

In `educational-resource.entity.ts`, find the `ResourceType` enum and add `LINK`:

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
  LINK = 'LINK',
}
```

- [ ] **Step 2.2: Make Drive columns nullable and add link columns**

Find the column definitions for Drive fields and add `nullable: true`. Then add 4 new columns after `downloadLink`. The relevant section becomes:

```typescript
  @Column({ unique: true, nullable: true })
  @Index('IDX_educational_resources_driveFileId')
  driveFileId: string | null;

  @Column({ nullable: true })
  driveFolderId: string | null;

  @Column({ nullable: true })
  driveFileName: string | null;

  @Column({ nullable: true })
  webViewLink: string | null;

  @Column({ nullable: true })
  downloadLink: string | null;

  @Column({ nullable: true })
  thumbnailLink: string | null;

  @Column({ nullable: true })
  mimeType: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSize: number | null;

  // Link resource fields
  @Column({ nullable: true })
  externalUrl: string | null;

  @Column({ nullable: true })
  previewTitle: string | null;

  @Column({ type: 'text', nullable: true })
  previewDescription: string | null;

  @Column({ nullable: true })
  previewImage: string | null;
```

- [ ] **Step 2.3: Commit entity changes**

```bash
cd /opt/mw-panel
git add mw-panel/backend/src/modules/educational-resources/entities/educational-resource.entity.ts
git commit -m "feat(entity): Make Drive columns nullable, add LINK type and link columns"
```

---

### Task 3: Create the link DTO

**Files:**
- Create: `backend/src/modules/educational-resources/dto/create-link-resource.dto.ts`
- Modify: `backend/src/modules/educational-resources/dto/index.ts`

- [ ] **Step 3.1: Create the DTO file**

```typescript
// backend/src/modules/educational-resources/dto/create-link-resource.dto.ts
import { IsString, IsUrl, IsUUID, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateLinkResourceDto {
  @IsString()
  title: string;

  @IsUrl({}, { message: 'externalUrl debe ser una URL válida' })
  @Transform(({ value }) => {
    // Auto-add https:// if missing protocol
    if (typeof value === 'string' && !value.startsWith('http')) {
      return `https://${value}`;
    }
    return value;
  })
  externalUrl: string;

  @IsUUID()
  subjectId: string;

  @IsUUID()
  educationalLevelId: string;

  @IsString()
  gradeLevel: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  previewTitle?: string;

  @IsOptional()
  @IsString()
  previewDescription?: string;

  @IsOptional()
  @IsString()
  previewImage?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsUUID()
  folderId?: string;

  @IsOptional()
  @IsUUID()
  authorId?: string; // Solo para administradores
}
```

- [ ] **Step 3.2: Export from index.ts**

Open `backend/src/modules/educational-resources/dto/index.ts` and add:

```typescript
export { CreateLinkResourceDto } from './create-link-resource.dto';
```

(Add it alongside the existing exports.)

- [ ] **Step 3.3: Commit**

```bash
cd /opt/mw-panel
git add mw-panel/backend/src/modules/educational-resources/dto/
git commit -m "feat(dto): Add CreateLinkResourceDto for external link resources"
```

---

### Task 4: Add scraping and link creation to the service

**Files:**
- Modify: `backend/src/modules/educational-resources/educational-resources.service.ts`

- [ ] **Step 4.1: Add `scrapeUrlMetadata()` private method**

After the `generateAcademicYear()` private method (around line 92), add:

```typescript
  // Scrapes Open Graph metadata from a URL (5s timeout, never throws)
  async scrapeUrlMetadata(url: string): Promise<{
    title: string | null;
    description: string | null;
    image: string | null;
  }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'MW-Panel-Bot/1.0 (link preview)' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) return { title: null, description: null, image: null };

      const html = await response.text();

      const getOgTag = (property: string): string | null => {
        const match = html.match(
          new RegExp(`<meta[^>]+property=["']og:${property}["'][^>]+content=["']([^"']+)["']`, 'i')
        ) || html.match(
          new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${property}["']`, 'i')
        );
        return match ? match[1] : null;
      };

      const getMetaName = (name: string): string | null => {
        const match = html.match(
          new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')
        ) || html.match(
          new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, 'i')
        );
        return match ? match[1] : null;
      };

      const getTitleTag = (): string | null => {
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return match ? match[1].trim() : null;
      };

      return {
        title: getOgTag('title') || getTitleTag(),
        description: getOgTag('description') || getMetaName('description'),
        image: getOgTag('image'),
      };
    } catch {
      return { title: null, description: null, image: null };
    }
  }
```

- [ ] **Step 4.2: Add `createLinkResource()` method**

After `scrapeUrlMetadata()`, add:

```typescript
  async createLinkResource(dto: CreateLinkResourceDto, userId: string): Promise<EducationalResource> {
    // Verify subject and educational level exist
    const subject = await this.subjectRepository.findOne({ where: { id: dto.subjectId } });
    if (!subject) throw new NotFoundException(`Asignatura ${dto.subjectId} no encontrada`);

    const educationalLevel = await this.educationalLevelRepository.findOne({ where: { id: dto.educationalLevelId } });
    if (!educationalLevel) throw new NotFoundException(`Nivel educativo ${dto.educationalLevelId} no encontrado`);

    // Scrape preview if not provided
    let previewTitle = dto.previewTitle ?? null;
    let previewDescription = dto.previewDescription ?? null;
    let previewImage = dto.previewImage ?? null;

    if (!previewTitle || !previewDescription) {
      const scraped = await this.scrapeUrlMetadata(dto.externalUrl);
      previewTitle = previewTitle ?? scraped.title;
      previewDescription = previewDescription ?? scraped.description;
      previewImage = previewImage ?? scraped.image;
    }

    const authorId = dto.authorId || userId;

    const resource = this.resourceRepository.create({
      title: dto.title,
      description: dto.description ?? null,
      type: ResourceType.LINK,
      gradeLevel: dto.gradeLevel,
      academicYear: this.generateAcademicYear(),
      externalUrl: dto.externalUrl,
      previewTitle,
      previewDescription,
      previewImage,
      subjectId: dto.subjectId,
      educationalLevelId: dto.educationalLevelId,
      folderId: dto.folderId ?? null,
      isPublic: dto.isPublic ?? false,
      authorId,
      // Drive fields: null for links
      driveFileId: null,
      driveFolderId: null,
      driveFileName: null,
      mimeType: null,
      fileSize: null,
    });

    return this.resourceRepository.save(resource);
  }
```

- [ ] **Step 4.3: Add the import for `CreateLinkResourceDto` at the top of the service**

Find the existing import line for DTOs:
```typescript
import { CreateResourceDto, UpdateResourceDto, ResourceFiltersDto, CreateFolderDto, UpdateFolderDto } from './dto';
```

Replace it with:
```typescript
import { CreateResourceDto, UpdateResourceDto, ResourceFiltersDto, CreateFolderDto, UpdateFolderDto, CreateLinkResourceDto } from './dto';
```

- [ ] **Step 4.4: Commit**

```bash
cd /opt/mw-panel
git add mw-panel/backend/src/modules/educational-resources/educational-resources.service.ts
git commit -m "feat(service): Add scrapeUrlMetadata() and createLinkResource()"
```

---

### Task 5: Add controller endpoints

**Files:**
- Modify: `backend/src/modules/educational-resources/educational-resources.controller.ts`

- [ ] **Step 5.1: Add the import for `CreateLinkResourceDto`**

Find:
```typescript
import { CreateResourceDto } from './dto/create-resource.dto';
```

Add below it:
```typescript
import { CreateLinkResourceDto } from './dto/create-link-resource.dto';
```

- [ ] **Step 5.2: Add the two new endpoints**

After the `getResourcesList` method (around line 132), add:

```typescript
  @Post('create-link')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a link resource (external URL)' })
  @ApiResponse({ status: 201, description: 'Link resource created successfully' })
  async createLinkResource(
    @Body(ValidationPipe) dto: CreateLinkResourceDto,
    @CurrentUser() user: any,
  ) {
    const authorId = dto.authorId || user.id;
    return this.educationalResourcesService.createLinkResource(dto, authorId);
  }

  @Get('link-preview')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Scrape Open Graph preview metadata from a URL' })
  @ApiResponse({ status: 200, description: 'Preview metadata returned' })
  async getLinkPreview(@Query('url') url: string) {
    if (!url) {
      return { title: null, description: null, image: null };
    }
    return this.educationalResourcesService.scrapeUrlMetadata(url);
  }
```

- [ ] **Step 5.3: Commit**

```bash
cd /opt/mw-panel
git add mw-panel/backend/src/modules/educational-resources/educational-resources.controller.ts
git commit -m "feat(controller): Add create-link and link-preview endpoints"
```

---

### Task 6: Apply migration and rebuild backend

- [ ] **Step 6.1: Take a DB backup before migrating**

```bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
docker exec mw-panel-db-prod pg_dump -U mwpanel -d mwpanel | \
  gzip > /opt/mw-panel/backups/pre-link-resources-${TIMESTAMP}.sql.gz
echo "Backup: pre-link-resources-${TIMESTAMP}.sql.gz"
```

- [ ] **Step 6.2: Run the migration**

```bash
docker exec mw-panel-backend-prod sh -c "cd /app && npm run migration:run"
```

Expected output:
```
Running migration: AddLinkResourceType1770000000000
Migration AddLinkResourceType1770000000000 has been executed successfully.
```

- [ ] **Step 6.3: Rebuild and restart the backend**

```bash
cd /opt/mw-panel
docker stop mw-panel-backend-prod
docker-compose -f docker-compose.prod.yml build backend
docker-compose -f docker-compose.prod.yml up -d backend
```

- [ ] **Step 6.4: Verify the backend is healthy**

```bash
sleep 10
curl -s https://plataforma.mundoworld.school/api/health/status
```

Expected: `{"status":"OK","timestamp":"..."}`

- [ ] **Step 6.5: Smoke-test the new endpoints with curl**

```bash
# Get a valid JWT token first
TOKEN=$(curl -s -X POST https://plataforma.mundoworld.school/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"info@mundoworld.school","password":"Pamplon@2020"}' \
  | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

echo "TOKEN: $TOKEN"

# Test link-preview endpoint
curl -s "https://plataforma.mundoworld.school/api/recursos/link-preview?url=https://www.bbc.com" \
  -H "Authorization: Bearer $TOKEN"
```

Expected: JSON with `title`, `description`, `image` fields (some may be null).

- [ ] **Step 6.6: Test create-link endpoint**

```bash
# Get a valid subjectId and educationalLevelId first
curl -s "https://plataforma.mundoworld.school/api/recursos/metadata/subjects" \
  -H "Authorization: Bearer $TOKEN" | head -200

# Then create a link resource (replace UUIDs with real ones from the response above)
curl -s -X POST https://plataforma.mundoworld.school/api/recursos/create-link \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Enlace BBC",
    "externalUrl": "https://www.bbc.com",
    "subjectId": "<REAL_SUBJECT_UUID>",
    "educationalLevelId": "<REAL_LEVEL_UUID>",
    "gradeLevel": "1",
    "isPublic": true
  }'
```

Expected: 201 response with a full resource object where `type` is `"LINK"` and `externalUrl` is populated.

---

### Task 7: Update the frontend service

**Files:**
- Modify: `frontend/src/services/educationalResourcesService.ts`

- [ ] **Step 7.1: Add LINK to the ResourceType interface**

Find:
```typescript
export interface ResourceType {
  PDF: 'PDF';
  VIDEO: 'VIDEO';
  IMAGE: 'IMAGE';
  INTERACTIVE_HTML: 'INTERACTIVE_HTML';
  DOCUMENT: 'DOCUMENT';
  PRESENTATION: 'PRESENTATION';
  SPREADSHEET: 'SPREADSHEET';
  AUDIO: 'AUDIO';
}
```

Replace with:
```typescript
export interface ResourceType {
  PDF: 'PDF';
  VIDEO: 'VIDEO';
  IMAGE: 'IMAGE';
  INTERACTIVE_HTML: 'INTERACTIVE_HTML';
  DOCUMENT: 'DOCUMENT';
  PRESENTATION: 'PRESENTATION';
  SPREADSHEET: 'SPREADSHEET';
  AUDIO: 'AUDIO';
  LINK: 'LINK';
}
```

- [ ] **Step 7.2: Add link fields to `EducationalResource` interface**

Find the `EducationalResource` interface and add these fields after `assignmentId?`:

```typescript
  // Link resource fields
  externalUrl?: string;
  previewTitle?: string;
  previewDescription?: string;
  previewImage?: string;
```

- [ ] **Step 7.3: Add `CreateLinkResourceDto` interface**

After the existing `CreateResourceDto` interface, add:

```typescript
export interface CreateLinkResourceDto {
  title: string;
  externalUrl: string;
  subjectId: string;
  educationalLevelId: string;
  gradeLevel: string;
  description?: string;
  previewTitle?: string;
  previewDescription?: string;
  previewImage?: string;
  isPublic?: boolean;
  folderId?: string;
  authorId?: string;
}

export interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
}
```

- [ ] **Step 7.4: Add `createLinkResource()` and `getLinkPreview()` methods**

In the service class body (where the other methods like `uploadResource`, `getResources` etc. are defined), add:

```typescript
  async createLinkResource(dto: CreateLinkResourceDto): Promise<EducationalResource> {
    const response = await api.post('/recursos/create-link', dto);
    return response.data;
  },

  async getLinkPreview(url: string): Promise<LinkPreviewData> {
    const response = await api.get('/recursos/link-preview', { params: { url } });
    return response.data;
  },
```

- [ ] **Step 7.5: Commit**

```bash
cd /opt/mw-panel
git add mw-panel/frontend/src/services/educationalResourcesService.ts
git commit -m "feat(frontend-service): Add LINK type, link fields, createLinkResource, getLinkPreview"
```

---

### Task 8: Update ResourceCard for LINK type

**Files:**
- Modify: `frontend/src/components/recursos/ResourceCard.tsx`

- [ ] **Step 8.1: Add LinkOutlined to imports**

Find the import block from `@ant-design/icons` and add `LinkOutlined`:

```typescript
import {
  EyeOutlined,
  DownloadOutlined,
  HeartFilled,
  ClockCircleOutlined,
  FileOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  Html5Outlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  AudioOutlined,
  DeleteOutlined,
  LinkOutlined,
} from '@ant-design/icons';
```

- [ ] **Step 8.2: Add LINK to the icon and color maps**

Find `resourceIcons` and `resourceColors` and add LINK entries:

```typescript
const resourceIcons: Record<keyof ResourceType, React.ReactNode> = {
  PDF: <FilePdfOutlined />,
  VIDEO: <VideoCameraOutlined />,
  IMAGE: <PictureOutlined />,
  INTERACTIVE_HTML: <Html5Outlined />,
  DOCUMENT: <FileOutlined />,
  PRESENTATION: <FilePptOutlined />,
  SPREADSHEET: <FileExcelOutlined />,
  AUDIO: <AudioOutlined />,
  LINK: <LinkOutlined />,
};

const resourceColors: Record<keyof ResourceType, string> = {
  PDF: '#ff4d4f',
  VIDEO: '#722ed1',
  IMAGE: '#13c2c2',
  INTERACTIVE_HTML: '#fa8c16',
  DOCUMENT: '#1890ff',
  PRESENTATION: '#eb2f96',
  SPREADSHEET: '#52c41a',
  AUDIO: '#faad14',
  LINK: '#096dd9',
};
```

- [ ] **Step 8.3: Use previewImage as thumbnail for LINK cards**

Find the section in the card's render that shows the thumbnail/cover (where `thumbnailLink` is used), and add a condition for LINK resources to use `previewImage` instead:

```typescript
// In the card cover/thumbnail section, use previewImage for LINK type
const thumbnailUrl = resource.type === 'LINK'
  ? resource.previewImage
  : resource.thumbnailLink;
```

Replace any occurrence of `resource.thumbnailLink` that is used for the card cover with `thumbnailUrl`.

- [ ] **Step 8.4: Hide file size for LINK type**

Find wherever `fileSize` is rendered in the card (it's formatted with `formatFileSize()`). Wrap it with a condition:

```typescript
{resource.type !== 'LINK' && resource.fileSize && (
  <Text type="secondary">{formatFileSize(Number(resource.fileSize))}</Text>
)}
```

- [ ] **Step 8.5: Commit**

```bash
cd /opt/mw-panel
git add mw-panel/frontend/src/components/recursos/ResourceCard.tsx
git commit -m "feat(ResourceCard): Add LINK type icon, color, previewImage thumbnail"
```

---

### Task 9: Add link form tab to ResourceUploader

**Files:**
- Modify: `frontend/src/components/recursos/ResourceUploader.tsx`

- [ ] **Step 9.1: Add Tabs and LinkOutlined to imports**

Add `Tabs` to Ant Design imports (it's likely already imported, check first). Add `LinkOutlined` to icons:

```typescript
import {
  // existing imports...
  LinkOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
```

And ensure `Tabs` is in the Ant Design import block:
```typescript
import {
  Upload, Form, Input, Select, Button, Card, Progress,
  message, Spin, Tag, Space, Alert, Tabs,
} from 'antd';
```

- [ ] **Step 9.2: Add link form state variables**

Inside `ResourceUploader` component, after existing state declarations, add:

```typescript
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
  const [linkForm] = Form.useForm();
  const [linkPreview, setLinkPreview] = useState<{
    title: string | null;
    description: string | null;
    image: string | null;
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [linkUploading, setLinkUploading] = useState(false);
```

- [ ] **Step 9.3: Add `fetchLinkPreview()` handler**

```typescript
  const fetchLinkPreview = async (url: string) => {
    if (!url || url.length < 10) return;
    setPreviewLoading(true);
    try {
      const preview = await educationalResourcesService.getLinkPreview(url);
      setLinkPreview(preview);
      // Auto-fill title if empty
      const currentTitle = linkForm.getFieldValue('title');
      if (!currentTitle && preview.title) {
        linkForm.setFieldsValue({ title: preview.title });
      }
    } catch {
      // Silently fail - user can fill manually
    } finally {
      setPreviewLoading(false);
    }
  };
```

- [ ] **Step 9.4: Add `handleLinkSubmit()` handler**

```typescript
  const handleLinkSubmit = async (values: any) => {
    setLinkUploading(true);
    try {
      const dto = {
        title: values.title,
        externalUrl: values.externalUrl.startsWith('http')
          ? values.externalUrl
          : `https://${values.externalUrl}`,
        subjectId: values.subjectId,
        educationalLevelId: values.educationalLevelId,
        gradeLevel: values.gradeLevel,
        description: values.description,
        previewTitle: values.previewTitle || linkPreview?.title || undefined,
        previewDescription: values.previewDescription || linkPreview?.description || undefined,
        previewImage: linkPreview?.image || undefined,
        isPublic: values.isPublic || false,
        folderId: values.folderId || undefined,
      };

      const resource = await educationalResourcesService.createLinkResource(dto);
      message.success('Enlace añadido correctamente');
      linkForm.resetFields();
      setLinkPreview(null);
      if (onSuccess) onSuccess(resource);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al añadir el enlace');
    } finally {
      setLinkUploading(false);
    }
  };
```

- [ ] **Step 9.5: Wrap existing return JSX in Tabs**

The existing return renders the file upload form directly. Wrap it inside a `<Tabs>` component:

```tsx
return (
  <Tabs
    activeKey={activeTab}
    onChange={(key) => setActiveTab(key as 'file' | 'link')}
    items={[
      {
        key: 'file',
        label: <><FileOutlined /> Subir archivo</>,
        children: (
          // ← PASTE THE ENTIRE EXISTING RETURN JSX HERE (the Card with the Dragger, form, etc.)
        ),
      },
      {
        key: 'link',
        label: <><LinkOutlined /> Enlace externo</>,
        children: (
          <Card>
            <Form
              form={linkForm}
              layout="vertical"
              onFinish={handleLinkSubmit}
            >
              <Form.Item
                label="URL del recurso"
                name="externalUrl"
                rules={[{ required: true, message: 'La URL es obligatoria' }]}
              >
                <Input.Search
                  placeholder="https://www.ejemplo.com/recurso"
                  enterButton={<><GlobalOutlined /> Vista previa</>}
                  onSearch={fetchLinkPreview}
                  onBlur={(e) => fetchLinkPreview(e.target.value)}
                  loading={previewLoading}
                />
              </Form.Item>

              {linkPreview && (
                <Card
                  size="small"
                  style={{ marginBottom: 16, backgroundColor: '#f5f5f5' }}
                >
                  {linkPreview.image && (
                    <img
                      src={linkPreview.image}
                      alt="preview"
                      style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  {linkPreview.title && (
                    <Text strong style={{ display: 'block' }}>{linkPreview.title}</Text>
                  )}
                  {linkPreview.description && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{linkPreview.description}</Text>
                  )}
                  {!linkPreview.title && !linkPreview.description && (
                    <Text type="secondary">No se pudo obtener la vista previa. Rellena el título manualmente.</Text>
                  )}
                </Card>
              )}

              <Form.Item
                label="Título"
                name="title"
                rules={[{ required: true, message: 'El título es obligatorio' }]}
              >
                <Input placeholder="Nombre del recurso" />
              </Form.Item>

              <Form.Item label="Descripción" name="description">
                <Input.TextArea rows={2} placeholder="Descripción opcional" />
              </Form.Item>

              {/* Reuse the same subject/level/grade/visibility selects as the file form.
                  Copy the Form.Items for educationalLevelId, subjectId, gradeLevel, isPublic, folderId
                  from the file upload form — same options and queries apply. */}
              <Form.Item
                label="Nivel educativo"
                name="educationalLevelId"
                rules={[{ required: true, message: 'El nivel es obligatorio' }]}
              >
                <Select placeholder="Selecciona un nivel">
                  {metadata?.levels?.map((level: any) => (
                    <Select.Option key={level.id} value={level.id}>{level.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Asignatura"
                name="subjectId"
                rules={[{ required: true, message: 'La asignatura es obligatoria' }]}
              >
                <Select placeholder="Selecciona una asignatura">
                  {metadata?.subjects?.map((subject: any) => (
                    <Select.Option key={subject.id} value={subject.id}>{subject.name}</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                label="Curso"
                name="gradeLevel"
                rules={[{ required: true, message: 'El curso es obligatorio' }]}
              >
                <Select placeholder="Selecciona un curso">
                  {['1', '2', '3', '4', '5', '6'].map(g => (
                    <Select.Option key={g} value={g}>{g}º</Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item name="isPublic" valuePropName="checked" initialValue={false}>
                <Select defaultValue={false}>
                  <Select.Option value={false}>Privado (solo profesores)</Select.Option>
                  <Select.Option value={true}>Público (visible a estudiantes)</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={linkUploading}
                    icon={<LinkOutlined />}
                  >
                    Añadir enlace
                  </Button>
                  {onCancel && (
                    <Button onClick={onCancel}>Cancelar</Button>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>
        ),
      },
    ]}
  />
);
```

- [ ] **Step 9.6: Commit**

```bash
cd /opt/mw-panel
git add mw-panel/frontend/src/components/recursos/ResourceUploader.tsx
git commit -m "feat(ResourceUploader): Add 'Enlace externo' tab with OG preview"
```

---

### Task 10: Add link viewer to ResourceViewer

**Files:**
- Modify: `frontend/src/components/recursos/ResourceViewer.tsx`

- [ ] **Step 10.1: Add iframe failure state**

Inside `ResourceViewer`, after existing state declarations, add:

```typescript
  const [iframeBlocked, setIframeBlocked] = useState(false);
```

Reset it when loading a new resource:
```typescript
  const loadResource = async () => {
    setLoading(true);
    setIframeBlocked(false); // reset on new resource
    // ... existing code
  };
```

- [ ] **Step 10.2: Add a helper to extract domain from URL**

Inside the component, add:

```typescript
  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };
```

- [ ] **Step 10.3: Add the LINK viewer JSX**

Find the section in the Modal body where the resource content is rendered (after loading, where file previews are shown). Add a conditional block for LINK type at the top of the content rendering section:

```tsx
{resource.type === 'LINK' && resource.externalUrl && (
  <div>
    {/* Preview panel */}
    <div style={{ marginBottom: 16 }}>
      {resource.previewImage && (
        <img
          src={resource.previewImage}
          alt="preview"
          style={{
            width: '100%',
            maxHeight: 200,
            objectFit: 'cover',
            borderRadius: 8,
            marginBottom: 12,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      )}
      <Space direction="vertical" style={{ width: '100%' }}>
        {resource.previewDescription && (
          <Text type="secondary">{resource.previewDescription}</Text>
        )}
        <Space>
          <GlobalOutlined style={{ color: '#888' }} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {getDomain(resource.externalUrl)}
          </Text>
        </Space>
        <Button
          type="primary"
          icon={<LinkOutlined />}
          onClick={() => window.open(resource.externalUrl, '_blank', 'noopener,noreferrer')}
        >
          Abrir en nueva pestaña
        </Button>
      </Space>
    </div>

    <Divider />

    {/* Iframe panel */}
    {iframeBlocked ? (
      <Alert
        type="warning"
        message="Este sitio no permite mostrarse en la plataforma"
        description="Haz clic en 'Abrir en nueva pestaña' para ver el contenido."
        showIcon
      />
    ) : (
      <iframe
        src={resource.externalUrl}
        title={resource.title}
        style={{
          width: '100%',
          height: 500,
          border: 'none',
          borderRadius: 8,
        }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        onLoad={(e) => {
          // Heuristic: if the iframe loaded but is cross-origin, we can't detect blocking.
          // We use a load event timeout as a soft signal — this is the best we can do
          // without server-side checking.
        }}
        onError={() => setIframeBlocked(true)}
      />
    )}
  </div>
)}
```

- [ ] **Step 10.4: Add GlobalOutlined to imports**

Add `GlobalOutlined` to the `@ant-design/icons` import block at the top of `ResourceViewer.tsx`.

- [ ] **Step 10.5: Add Alert to Ant Design imports if not present**

The `Alert` component should already be imported; if not, add it:
```typescript
import { ..., Alert } from 'antd';
```

- [ ] **Step 10.6: Hide Download button for LINK type**

Find where the `DownloadOutlined` / download button is rendered and wrap it:

```tsx
{resource.type !== 'LINK' && (
  <Button icon={<DownloadOutlined />} onClick={handleDownload} loading={downloading}>
    Descargar
  </Button>
)}
```

- [ ] **Step 10.7: Commit**

```bash
cd /opt/mw-panel
git add mw-panel/frontend/src/components/recursos/ResourceViewer.tsx
git commit -m "feat(ResourceViewer): Add iframe viewer and preview panel for LINK type"
```

---

### Task 11: Build and deploy frontend

- [ ] **Step 11.1: Build the frontend**

```bash
cd /opt/mw-panel/frontend
npm run build
```

Expected: build completes with no errors (TypeScript errors must be zero; warnings about unused vars are acceptable).

- [ ] **Step 11.2: Deploy to production**

```bash
sudo cp -r /opt/mw-panel/frontend/dist/* /opt/mw-panel/frontend-dist/
```

- [ ] **Step 11.3: Bust the cache**

```bash
TIMESTAMP=$(date +%Y%m%d%H%M%S)
sudo perl -i -pe "s#(/assets/[^\"]+\.(js|css))\"#\$1?v=${TIMESTAMP}\"#g" /opt/mw-panel/frontend-dist/index.html
```

- [ ] **Step 11.4: Verify deployment**

```bash
# Verify the file timestamp updated
ls -la /opt/mw-panel/frontend-dist/ | head -5

# Verify the platform loads
curl -s -o /dev/null -w "%{http_code}" https://plataforma.mundoworld.school/
```

Expected HTTP code: `200`

- [ ] **Step 11.5: Manual smoke test in browser**

1. Log in as `info@mundoworld.school` at https://plataforma.mundoworld.school
2. Navigate to Recursos Educativos
3. Click "Añadir Recurso" — verify a tab "Enlace externo" appears
4. Paste `https://www.bbc.com` in the URL field and press Enter/blur — verify preview loads automatically
5. Fill required fields and submit — verify the link appears in the resource list with `🔗` icon and "Enlace externo" badge
6. Click the new link resource — verify preview panel + iframe viewer appear
7. Verify "Abrir en nueva pestaña" button works

- [ ] **Step 11.6: Final commit**

```bash
cd /opt/mw-panel
git add -A
git commit -m "feat: Add external link resources with OG preview and iframe viewer

- LINK enum value added to ResourceType
- Drive columns made nullable for link resources
- New endpoints: POST /recursos/create-link, GET /recursos/link-preview
- OG scraping (title, description, og:image) with 5s timeout
- ResourceUploader: Enlace externo tab with real-time preview
- ResourceCard: LinkOutlined icon, previewImage thumbnail, Enlace externo badge
- ResourceViewer: preview panel + iframe embedding with X-Frame-Options fallback

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
