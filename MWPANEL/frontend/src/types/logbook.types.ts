/**
 * Tipos TypeScript para el Sistema de Bitácora Docente
 * Sincronizados con los DTOs del backend NestJS
 */

// Enums y tipos básicos
export type LogbookVisibility = 'private' | 'staff' | 'admin';

// Interfaces para etiquetas
export interface LogbookTag {
  id: string;
  ownerUserId: string;
  name: string;
  colorHex: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLogbookTagDto {
  name: string;
  colorHex: string;
}

export interface UpdateLogbookTagDto {
  name?: string;
  colorHex?: string;
}

// Interfaces para entradas de bitácora
export interface LogbookEntry {
  id: string;
  ownerUserId: string;
  tagId: string;
  title: string;
  contentRich: any; // TipTap document JSON
  contentPlain: string;
  dateLocal: string; // YYYY-MM-DD
  startedAtLocal: string; // HH:mm:ss
  endedAtLocal: string; // HH:mm:ss
  durationMin: number;
  pinned: boolean;
  visibility: LogbookVisibility;
  attachmentsCnt: number;
  createdAt: string;
  updatedAt: string;
  tag?: LogbookTag;
  seriesId?: string;
  isPlaceholder?: boolean;
}

export interface CreateLogbookEntryDto {
  tagId: string;
  title: string;
  contentRich: any;
  dateLocal: string;
  startedAtLocal?: string;
  endedAtLocal?: string;
  visibility?: LogbookVisibility;
  repeatUntilCourseEnd?: boolean;
  repeatOptions?: {
    frequency?: 'WEEKLY';
    byDayFromDate?: boolean;
    onlySchoolDays?: boolean;
  };
}

export interface UpdateLogbookEntryDto {
  tagId?: string;
  title?: string;
  contentRich?: any;
  dateLocal?: string;
  startedAtLocal?: string;
  endedAtLocal?: string;
  visibility?: LogbookVisibility;
}

// Interfaces para consultas y filtros
export interface LogbookEntryQueryDto {
  startDate?: string;
  endDate?: string;
  tagId?: string;
  search?: string;
  pinnedOnly?: boolean;
  visibility?: LogbookVisibility;
  sortBy?: 'dateLocal' | 'createdAt' | 'title' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  entryType?: 'all' | 'placeholders' | 'filled';
  seriesId?: string;
}

// Interfaces para respuestas paginadas
export interface LogbookEntriesPageDto {
  entries: LogbookEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Interfaces para estadísticas
export interface EntryStatsDto {
  totalEntries: number;
  totalDuration: number;
  avgEntriesPerDay: number;
  mostUsedTags: Array<{
    tagId?: string;
    tagName?: string;
    count: number;
  }>;
  recentActivity: Array<{
    date: string;
    count: number;
  }>;
}

export interface TagUsageStatsDto {
  tagId: string;
  tagName: string;
  tagColor: string;
  entryCount: number;
  totalDuration: number;
  avgDuration: number;
  lastUsed: string;
}

export interface PopularColorDto {
  colorHex: string;
  usage: number;
  percentage: number;
}

// Interfaces para el estado del hook
export interface UseLogbookState {
  // Tags
  tags: LogbookTag[];
  tagsLoading: boolean;
  tagsError: string | null;

  // Entries
  entries: LogbookEntry[];
  entriesTotal: number;
  entriesPage: number;
  entriesLimit: number;
  entriesTotalPages: number;
  entriesLoading: boolean;
  entriesError: string | null;

  // Statistics
  stats: EntryStatsDto | null;
  statsLoading: boolean;
  statsError: string | null;

  // Current filters
  currentFilters: LogbookEntryQueryDto;

  // UI State
  selectedEntry: LogbookEntry | null;
  isCreatingEntry: boolean;
  isEditingEntry: boolean;
}

// Interfaces para acciones del hook
export interface UseLogbookActions {
  // Tags actions
  loadTags: () => Promise<void>;
  createTag: (data: CreateLogbookTagDto) => Promise<LogbookTag>;
  updateTag: (id: string, data: UpdateLogbookTagDto) => Promise<LogbookTag>;
  deleteTag: (id: string) => Promise<void>;

  // Entries actions
  loadEntries: (filters?: LogbookEntryQueryDto) => Promise<void>;
  createEntry: (data: CreateLogbookEntryDto) => Promise<LogbookEntry>;
  updateEntry: (id: string, data: UpdateLogbookEntryDto) => Promise<LogbookEntry>;
  deleteEntry: (id: string) => Promise<void>;
  togglePin: (id: string) => Promise<LogbookEntry>;

  // Search and filters
  searchEntries: (query: string, limit?: number) => Promise<LogbookEntry[]>;
  getWeekEntries: (weekStart: string) => Promise<LogbookEntry[]>;
  getMonthEntries: (year: number, month: number) => Promise<LogbookEntry[]>;

  // Statistics
  loadStats: () => Promise<void>;
  getTagUsageStats: () => Promise<TagUsageStatsDto[]>;
  getPopularColors: () => Promise<PopularColorDto[]>;

  // UI actions
  setCurrentFilters: (filters: LogbookEntryQueryDto) => void;
  setSelectedEntry: (entry: LogbookEntry | null) => void;
  setIsCreatingEntry: (creating: boolean) => void;
  setIsEditingEntry: (editing: boolean) => void;
}

// Hook completo
export interface UseLogbook extends UseLogbookState, UseLogbookActions {}

// Tipos para componentes específicos
export interface LogbookCalendarDay {
  date: string;
  entries: LogbookEntry[];
  dayOfWeek: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export interface LogbookWeekView {
  weekStart: string;
  weekEnd: string;
  days: LogbookCalendarDay[];
}

export interface LogbookMonthView {
  year: number;
  month: number;
  weeks: LogbookWeekView[];
}

// Configuración del editor TipTap
export interface TipTapEditorConfig {
  placeholder?: string;
  editable?: boolean;
  autofocus?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
  onUpdate?: (content: any) => void;
  onSave?: (content: any) => void;
}

// Interfaces para series recurrentes
export interface LogbookSeries {
  id: string;
  ownerUserId: string;
  ruleRrule: string;
  startDate: string;
  endDate: string;
  startedAtLocal?: string;
  endedAtLocal?: string;
  tagId?: string;
  visibility: LogbookVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryWithSeriesResponse {
  entry: LogbookEntry;
  series?: {
    id: string;
    createdOccurrences: number;
    endDate: string;
  };
}

export interface DeleteFutureEntriesDto {
  inclusive?: boolean;
}

// Tipos para attachments (para futuro)
export interface LogbookAttachment {
  id: string;
  entryId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}