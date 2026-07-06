import { User } from './user';
import { Subject } from './subject';
import { EducationalResource } from './educational-resource';

export enum NoteType {
  TEXT = 'text',
  VOICE = 'voice',
  DRAWING = 'drawing',
  PRESENTATION = 'presentation',
  MIXED = 'mixed',
  MINDMAP = 'mindmap',
}

export interface StudentNote {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  metadata?: Record<string, any>;
  relatedResourceId?: string;
  relatedResource?: EducationalResource;
  authorId: string;
  author: User;
  subjectId?: string;
  subject?: Subject;
  tags?: string;
  driveFileId?: string;
  webViewLink?: string;
  webContentLink?: string;
  isPrivate: boolean;
  isFavorite: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  // Virtual properties
  tagsArray: string[];
  hasAttachment: boolean;
  isAudio: boolean;
  isDrawing: boolean;
  duration?: number;
  fileName?: string;
  isShared?: boolean;
  shareCount?: number;
}

export interface CreateStudentNoteDto {
  title: string;
  content: string;
  type: NoteType;
  relatedResourceId?: string;
  subjectId?: string;
  tags?: string[];
  isPrivate?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateStudentNoteDto {
  title?: string;
  content?: string;
  type?: NoteType;
  relatedResourceId?: string;
  subjectId?: string;
  tags?: string[];
  isPrivate?: boolean;
  isFavorite?: boolean;
  metadata?: Record<string, any>;
}

export interface UploadNoteFileDto {
  title: string;
  content?: string;
  type: NoteType;
  relatedResourceId?: string;
  subjectId?: string;
  tags?: string[];
  isPrivate?: boolean;
  metadata?: Record<string, any>;
}

export interface NoteQueryDto {
  page?: number;
  limit?: number;
  type?: NoteType;
  subjectId?: string;
  search?: string;
  favorites?: boolean;
  startDate?: string;
  endDate?: string;
  tags?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'viewCount';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedNotesResult {
  data: StudentNote[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface NotesStatistics {
  totalNotes: number;
  favoriteNotes: number;
  notesWithAttachments: number;
  notesByType: Record<string, number>;
  sharedStats?: {
    sent: number;
    received: number;
    classmates: number;
    teachers: number;
  };
}

// Estados para el editor integrado
export interface EditorState {
  isOpen: boolean;
  type: NoteType;
  initialContent?: string;
  editingNote?: StudentNote;
}

// Estados para filtros y búsqueda
export interface NotesFilters {
  type: NoteType | 'all';
  subject: string | 'all';
  favorites: boolean;
  search: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags: string[];
}

// Estados para la vista
export interface NotesViewState {
  viewMode: 'grid' | 'list';
  selectedNotes: string[];
  isLoading: boolean;
  error?: string;
}

export interface NoteFormData {
  title: string;
  content: string;
  type: NoteType;
  subjectId?: string;
  tags: string[];
  isPublic: boolean; // Cambio de isPrivate a isPublic para la UI
  file?: File;
}

// Para el modal de creación
export interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (note: StudentNote) => void;
  initialData?: Partial<CreateStudentNoteDto>;
}

// Para el componente de tarjeta de apunte
export interface NoteCardProps {
  note: StudentNote;
  viewMode: 'grid' | 'list';
  onEdit: (note: StudentNote) => void;
  onDelete: (noteId: string) => void;
  onToggleFavorite: (noteId: string) => void;
  onView: (note: StudentNote) => void;
  onShare?: (note: StudentNote) => void;
}

// === TIPOS PARA SISTEMA DE COMPARTIR ===

export enum SharedNoteType {
  STUDENT = 'student',
  TEACHER = 'teacher',
}

export enum SharedNoteStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
  EXPIRED = 'expired',
}

// Compañero de clase
export interface Classmate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
  classGroups: Array<{
    id: string;
    name: string;
    section?: string;
  }>;
}

// Profesor del estudiante
export interface StudentTeacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photoUrl?: string;
  subjects: Array<{
    id: string;
    name: string;
    classGroup: {
      id: string;
      name: string;
      section?: string;
    };
  }>;
}

// DTO para compartir apunte
export interface ShareNoteDto {
  recipientIds: string[];
  sharedWithType: SharedNoteType;
  message?: string;
  allowComments?: boolean;
  allowDownload?: boolean;
  expiresAt?: string;
}

// Apunte compartido (respuesta completa del backend)
export interface SharedNote {
  id: string;
  noteId: string;
  note: {
    id: string;
    title: string;
    type: NoteType;
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileMimeType?: string;
    fileSize?: number;
    metadata?: any;
    tags?: string;
    createdAt: string;
    subject?: {
      id: string;
      name: string;
    };
  };
  sharedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  sharedWith: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  sharedWithType: SharedNoteType;
  status: SharedNoteStatus;
  message?: string;
  permissions: {
    view: boolean;
    comment: boolean;
    download: boolean;
  };
  expiresAt?: string;
  lastAccessedAt?: string;
  accessCount: number;
  sharedAt: string;
  isExpired: boolean;
  isViewable: boolean;
}

// Query params para apuntes compartidos
export interface SharedNotesQueryDto {
  page?: number;
  limit?: number;
  sharedWithType?: SharedNoteType;
  search?: string;
  sortBy?: 'sharedAt' | 'lastAccessedAt' | 'accessCount';
  sortOrder?: 'ASC' | 'DESC';
}

// Respuesta paginada de apuntes compartidos
export interface PaginatedSharedNotesResult {
  sharedNotes: SharedNote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// DTO para actualizar apunte compartido
export interface UpdateSharedNoteDto {
  message?: string;
  allowComments?: boolean;
  allowDownload?: boolean;
  expiresAt?: string;
  isActive?: boolean;
}

// Props para el modal de compartir
export interface ShareNoteModalProps {
  isOpen: boolean;
  note?: StudentNote;
  onClose: () => void;
  onSuccess: () => void;
}