// Workspace DTOs
export { CreateLessonWorkspaceDto } from './create-lesson-workspace.dto';

// Folder DTOs  
export { 
  CreateLessonFolderDto, 
  UpdateLessonFolderDto, 
  ReorderLessonFoldersDto 
} from './create-lesson-folder.dto';

// Resource DTOs
export { 
  CreateLessonResourceDto,
  CreateFileResourceDto,
  CreateYouTubeResourceDto,
  CreateWebLinkResourceDto,
  CreateInternalDocResourceDto,
  CreatePresentationResourceDto,
  CreateTsxArtifactResourceDto,
  UpdateLessonResourceDto,
  ReorderLessonResourcesDto,
  ShareLessonResourceDto
} from './create-lesson-resource.dto';

// Query DTOs
export { LessonResourceQueryDto } from './lesson-resource-query.dto';
export { LessonWorkspaceQueryDto } from './lesson-workspace-query.dto';
export { LessonFolderQueryDto } from './lesson-folder-query.dto';

// Response DTOs
export { 
  LessonWorkspaceResponseDto,
  LessonFolderResponseDto,
  LessonResourceResponseDto
} from './lesson-response.dto';
export { PaginatedLessonResourcesResponseDto } from './paginated-lesson-resources-response.dto';