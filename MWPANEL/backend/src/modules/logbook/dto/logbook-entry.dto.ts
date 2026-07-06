import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsBoolean,
  IsIn,
  IsObject,
  Length,
  Matches,
  IsInt,
  Min,
  Max
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { Visibility } from '../entities/logbook-entry.entity';

export class CreateLogbookEntryDto {
  @ApiProperty({
    description: 'ID de la etiqueta (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de la etiqueta debe ser un UUID válido' })
  tagId?: string;

  @ApiProperty({
    description: 'Título de la entrada',
    example: 'Reunión de coordinación - Matemáticas',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 200, { message: 'El título debe tener entre 1 y 200 caracteres' })
  title: string;

  @ApiProperty({
    description: 'Contenido rico en formato JSON (TipTap/ProseMirror)',
    example: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Contenido de la entrada' }] }] },
  })
  @IsObject({ message: 'El contenido debe ser un objeto JSON válido' })
  contentRich: any;

  @ApiProperty({
    description: 'Fecha de la entrada en formato YYYY-MM-DD',
    example: '2025-01-15',
  })
  @IsDateString({}, { message: 'La fecha debe estar en formato YYYY-MM-DD' })
  dateLocal: string;

  @ApiProperty({
    description: 'Hora de inicio en formato HH:mm (opcional)',
    example: '09:30',
    required: false,
  })
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'La hora de inicio debe estar en formato HH:mm (24 horas)',
  })
  startedAtLocal?: string;

  @ApiProperty({
    description: 'Hora de fin en formato HH:mm (opcional)',
    example: '10:30',
    required: false,
  })
  @IsOptional()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'La hora de fin debe estar en formato HH:mm (24 horas)',
  })
  endedAtLocal?: string;

  @ApiProperty({
    description: 'Marcar entrada como fijada',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  pinned?: boolean = false;

  @ApiProperty({
    description: 'Nivel de visibilidad de la entrada',
    example: 'private',
    enum: ['private', 'staff', 'admin'],
    default: 'private',
    required: false,
  })
  @IsOptional()
  @IsIn(['private', 'staff', 'admin'], {
    message: 'La visibilidad debe ser: private, staff o admin',
  })
  visibility?: Visibility = 'private';

  @ApiProperty({
    description: 'Repetir entrada hasta fin de curso académico',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  repeatUntilCourseEnd?: boolean = false;

  @ApiProperty({
    description: 'Opciones de repetición',
    required: false,
    type: 'object',
    properties: {
      frequency: {
        type: 'string',
        enum: ['WEEKLY'],
        description: 'Frecuencia de repetición (por ahora solo WEEKLY)',
      },
      byDayFromDate: {
        type: 'boolean',
        description: 'Usar el día de la semana de dateLocal',
      },
      onlySchoolDays: {
        type: 'boolean',
        description: 'Solo días lectivos (si hay calendario disponible)',
      },
    },
  })
  @IsOptional()
  @IsObject()
  repeatOptions?: {
    frequency?: 'WEEKLY';
    byDayFromDate?: boolean;
    onlySchoolDays?: boolean;
  };
}

export class UpdateLogbookEntryDto extends PartialType(CreateLogbookEntryDto) {}

export class LogbookEntryQueryDto {
  @ApiProperty({ description: 'Fecha de inicio del rango (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe estar en formato YYYY-MM-DD' })
  startDate?: string;

  @ApiProperty({ description: 'Fecha de fin del rango (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe estar en formato YYYY-MM-DD' })
  endDate?: string;

  @ApiProperty({ description: 'ID de etiqueta para filtrar', required: false })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de etiqueta debe ser un UUID válido' })
  tagId?: string;

  @ApiProperty({ description: 'Término de búsqueda en título y contenido', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: 'Solo mostrar entradas fijadas', required: false, default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  pinnedOnly?: boolean;

  @ApiProperty({ description: 'Filtrar por visibilidad', enum: ['private', 'staff', 'admin'], required: false })
  @IsOptional()
  @IsIn(['private', 'staff', 'admin'])
  visibility?: Visibility;

  @ApiProperty({ description: 'Campo para ordenar', enum: ['dateLocal', 'createdAt', 'title'], required: false, default: 'dateLocal' })
  @IsOptional()
  @IsIn(['dateLocal', 'createdAt', 'title', 'updatedAt'])
  sortBy?: string;

  @ApiProperty({ description: 'Dirección del ordenamiento', enum: ['ASC', 'DESC'], required: false, default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';

  @ApiProperty({ description: 'Número de página', required: false, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser mayor a 0' })
  page?: number;

  @ApiProperty({ description: 'Elementos por página', required: false, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  @Max(100, { message: 'El límite no puede ser mayor a 100' })
  limit?: number;

  @ApiProperty({
    description: 'Filtrar por tipo de entrada',
    enum: ['all', 'placeholders', 'filled'],
    required: false,
    default: 'all'
  })
  @IsOptional()
  @IsIn(['all', 'placeholders', 'filled'])
  entryType?: 'all' | 'placeholders' | 'filled' = 'all';

  @ApiProperty({ description: 'ID de serie para filtrar', required: false })
  @IsOptional()
  @IsUUID('4', { message: 'El ID de serie debe ser un UUID válido' })
  seriesId?: string;
}

export class LogbookEntryResponseDto {
  @ApiProperty({ description: 'ID único de la entrada' })
  id: string;

  @ApiProperty({ description: 'ID del usuario propietario' })
  ownerUserId: string;

  @ApiProperty({ description: 'ID de la etiqueta asociada' })
  tagId: string | null;

  @ApiProperty({ description: 'Título de la entrada' })
  title: string;

  @ApiProperty({ description: 'Contenido rico en JSON' })
  contentRich: any;

  @ApiProperty({ description: 'Contenido en texto plano para búsqueda' })
  contentPlain: string | null;

  @ApiProperty({ description: 'Fecha de la entrada' })
  dateLocal: string;

  @ApiProperty({ description: 'Hora de inicio' })
  startedAtLocal: string | null;

  @ApiProperty({ description: 'Hora de fin' })
  endedAtLocal: string | null;

  @ApiProperty({ description: 'Duración en minutos' })
  durationMin: number | null;

  @ApiProperty({ description: 'Entrada fijada' })
  pinned: boolean;

  @ApiProperty({ description: 'Nivel de visibilidad' })
  visibility: Visibility;

  @ApiProperty({ description: 'Número de archivos adjuntos' })
  attachmentsCnt: number;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;

  @ApiProperty({ description: 'Información de la etiqueta', required: false })
  tag?: {
    id: string;
    name: string;
    colorHex: string;
  };

  @ApiProperty({ description: 'ID de la serie (si pertenece a una)', required: false })
  seriesId?: string | null;

  @ApiProperty({ description: 'Es una entrada plantilla (vacía)', required: false })
  isPlaceholder?: boolean;
}

export class LogbookEntriesPageDto {
  @ApiProperty({ description: 'Lista de entradas', type: [LogbookEntryResponseDto] })
  entries: LogbookEntryResponseDto[];

  @ApiProperty({ description: 'Total de entradas que coinciden con los filtros' })
  total: number;

  @ApiProperty({ description: 'Página actual' })
  page: number;

  @ApiProperty({ description: 'Elementos por página' })
  limit: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;
}

export class EntryStatsDto {
  @ApiProperty({ description: 'Total de entradas' })
  totalEntries: number;

  @ApiProperty({ description: 'Duración total en minutos' })
  totalDuration: number;

  @ApiProperty({ description: 'Promedio de entradas por día (últimos 30 días)' })
  avgEntriesPerDay: number;

  @ApiProperty({ description: 'Etiquetas más usadas', type: [Object] })
  mostUsedTags: Array<{ tagName: string; count: number }>;

  @ApiProperty({ description: 'Actividad reciente (últimos 7 días)', type: [Object] })
  recentActivity: Array<{ date: string; count: number }>;
}

// DTOs específicos para funcionalidad de series

export class DeleteFutureEntriesDto {
  @ApiProperty({
    description: 'Incluir la entrada actual en el borrado',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  inclusive?: boolean = false;
}

export class CreateEntryWithSeriesResponseDto {
  @ApiProperty({ description: 'Entrada original creada', type: LogbookEntryResponseDto })
  entry: LogbookEntryResponseDto;

  @ApiProperty({
    description: 'Información de la serie creada',
    type: 'object',
    properties: {
      id: { type: 'string', description: 'ID de la serie' },
      createdOccurrences: { type: 'number', description: 'Número de ocurrencias creadas' },
      endDate: { type: 'string', description: 'Fecha fin de curso' },
    },
  })
  series?: {
    id: string;
    createdOccurrences: number;
    endDate: string;
  };
}

export class LogbookSeriesDto {
  @ApiProperty({ description: 'ID único de la serie' })
  id: string;

  @ApiProperty({ description: 'ID del usuario propietario' })
  ownerUserId: string;

  @ApiProperty({ description: 'Regla RRULE de repetición' })
  ruleRrule: string;

  @ApiProperty({ description: 'Fecha de inicio de la serie' })
  startDate: string;

  @ApiProperty({ description: 'Fecha de fin de la serie' })
  endDate: string;

  @ApiProperty({ description: 'Hora de inicio' })
  startedAtLocal: string | null;

  @ApiProperty({ description: 'Hora de fin' })
  endedAtLocal: string | null;

  @ApiProperty({ description: 'ID de la etiqueta' })
  tagId: string | null;

  @ApiProperty({ description: 'Nivel de visibilidad' })
  visibility: Visibility;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  updatedAt: Date;
}

export class DeleteEntryConfirmationDto {
  @ApiProperty({
    description: 'Tipo de eliminación para entradas de series',
    enum: ['single', 'all'],
    example: 'single',
  })
  @IsIn(['single', 'all'], {
    message: 'El tipo de eliminación debe ser: single (solo esta entrada) o all (toda la serie)',
  })
  deletionType: 'single' | 'all';
}

export class SeriesDeletionInfoDto {
  @ApiProperty({ description: 'La entrada pertenece a una serie y requiere confirmación' })
  requiresConfirmation: true;

  @ApiProperty({ description: 'Información de la serie', type: LogbookSeriesDto })
  series: LogbookSeriesDto;

  @ApiProperty({ description: 'Número de entradas en la serie' })
  seriesEntryCount: number;

  @ApiProperty({ description: 'Número de entradas restantes en la serie' })
  remainingEntries: number;

  @ApiProperty({ description: 'Mensaje explicativo para el usuario' })
  message: string;
}