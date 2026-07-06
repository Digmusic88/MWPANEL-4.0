import { StaffMeetingStatus } from '../entities/staff-meeting.entity';

export type ArchivedFilter = 'active' | 'archived' | 'all';

const ACTIVE_STATUSES = [StaffMeetingStatus.SCHEDULED, StaffMeetingStatus.IN_PROGRESS];
const ARCHIVED_STATUSES = [StaffMeetingStatus.COMPLETED, StaffMeetingStatus.CANCELLED];

/**
 * Devuelve el conjunto de estados a filtrar según la pestaña Activas/Archivadas,
 * o null cuando no hay que filtrar por estado ('all' o sin valor).
 */
export function resolveMeetingStatusFilter(archived?: ArchivedFilter): StaffMeetingStatus[] | null {
  if (archived === 'active') return [...ACTIVE_STATUSES];
  if (archived === 'archived') return [...ARCHIVED_STATUSES];
  return null;
}

/**
 * true cuando el cambio de estado es una "reapertura": de un estado archivado
 * (completed/cancelled) a uno activo (scheduled/in_progress). Solo admin puede reabrir.
 */
export function statusChangeRequiresAdmin(
  oldStatus: StaffMeetingStatus,
  newStatus: StaffMeetingStatus,
): boolean {
  const wasArchived = ARCHIVED_STATUSES.includes(oldStatus);
  const becomesActive = ACTIVE_STATUSES.includes(newStatus);
  return wasArchived && becomesActive;
}

/** Días tras la fecha de la reunión a partir de los cuales se cierra automáticamente. */
export const AUTO_CLOSE_DAYS = 30;

/**
 * true si la reunión sigue activa y su fecha quedó más de `thresholdDays` días en el pasado:
 * candidata a cierre/archivado automático.
 */
export function isMeetingAutoCloseDue(
  status: StaffMeetingStatus,
  scheduledDate: Date | string,
  now: Date = new Date(),
  thresholdDays: number = AUTO_CLOSE_DAYS,
): boolean {
  if (!ACTIVE_STATUSES.includes(status)) return false;
  const cutoff = now.getTime() - thresholdDays * 24 * 60 * 60 * 1000;
  return new Date(scheduledDate).getTime() < cutoff;
}

/**
 * Construye las actualizaciones de orderIndex para reordenar los puntos del orden del día.
 * Devuelve null si `orderedIds` no es exactamente el mismo conjunto que `existingIds`
 * (distinta longitud, ids desconocidos, o duplicados).
 */
export function buildAgendaReorder(
  existingIds: string[],
  orderedIds: string[],
): { id: string; orderIndex: number }[] | null {
  if (orderedIds.length !== existingIds.length) return null;
  if (new Set(orderedIds).size !== orderedIds.length) return null;
  const existing = new Set(existingIds);
  if (!orderedIds.every((id) => existing.has(id))) return null;
  return orderedIds.map((id, index) => ({ id, orderIndex: index }));
}

/** Estados que cuentan como "viva" la reunión. */
export type MeetingLiveState = 'scheduled' | 'in_progress' | 'pending_close' | 'completed' | 'cancelled';

/** Duración por defecto (min) cuando el orden del día no aporta minutos. */
export const DEFAULT_MEETING_MINUTES = 60;

/**
 * Fin estimado de la reunión = inicio + suma de minutos del orden del día.
 * Si la suma es 0/null se usa DEFAULT_MEETING_MINUTES.
 */
export function deriveEndDate(
  meeting: { scheduledDate: Date | string; agendaItems?: { durationMinutes?: number | null }[] },
): Date {
  const start = new Date(meeting.scheduledDate);
  const sum = (meeting.agendaItems || []).reduce((acc, it) => {
    const m = Number(it?.durationMinutes);
    return acc + (m > 0 ? m : 0);
  }, 0);
  const minutes = sum > 0 ? sum : DEFAULT_MEETING_MINUTES;
  return new Date(start.getTime() + minutes * 60 * 1000);
}

/**
 * Estado "en vivo" derivado de la hora real. cancelled/completed (BD) ganan siempre.
 * Para reuniones activas: scheduled (antes), in_progress (durante), pending_close (después).
 */
export function getMeetingLiveState(
  meeting: {
    status: StaffMeetingStatus;
    scheduledDate: Date | string;
    agendaItems?: { durationMinutes?: number | null }[];
  },
  now: Date = new Date(),
): MeetingLiveState {
  if (meeting.status === StaffMeetingStatus.CANCELLED) return 'cancelled';
  if (meeting.status === StaffMeetingStatus.COMPLETED) return 'completed';
  const start = new Date(meeting.scheduledDate).getTime();
  const end = deriveEndDate(meeting).getTime();
  const t = now.getTime();
  if (t < start) return 'scheduled';
  if (t < end) return 'in_progress';
  return 'pending_close';
}

/** Adjunta liveState/endsAt/durationMinutes a una reunión (para serializar en las respuestas). */
export function attachLiveState<
  T extends {
    status: StaffMeetingStatus;
    scheduledDate: Date | string;
    agendaItems?: { durationMinutes?: number | null }[];
  },
>(meeting: T, now: Date = new Date()): T & { liveState: MeetingLiveState; endsAt: Date; durationMinutes: number } {
  const endsAt = deriveEndDate(meeting);
  const durationMinutes = Math.round((endsAt.getTime() - new Date(meeting.scheduledDate).getTime()) / 60000);
  return Object.assign(meeting, {
    liveState: getMeetingLiveState(meeting, now),
    endsAt,
    durationMinutes,
  });
}
