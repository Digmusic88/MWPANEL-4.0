/**
 * Utilidades puras del ciclo de vida de reuniones del claustro.
 * Espejo (frontend) de mw-panel/backend/src/modules/staff/utils/staff-meeting.utils.ts
 */

const ACTIVE_STATUSES = ['scheduled', 'in_progress'];

export type MeetingLiveState = 'scheduled' | 'in_progress' | 'pending_close' | 'completed' | 'cancelled';

/** Duración por defecto (min) cuando el orden del día no aporta minutos. */
export const DEFAULT_MEETING_MINUTES = 60;

/** true solo si hay al menos un punto y todos están completados. */
export function allAgendaItemsCompleted(
  agendaItems: { isCompleted: boolean }[] | undefined,
): boolean {
  if (!agendaItems || agendaItems.length === 0) return false;
  return agendaItems.every((item) => item.isCompleted);
}

/** Fin estimado = inicio + suma de minutos del orden del día (o +DEFAULT si no hay). */
export function deriveEndDate(
  meeting: { scheduledDate: string; agendaItems?: { durationMinutes?: number }[] },
): Date {
  const start = new Date(meeting.scheduledDate);
  const sum = (meeting.agendaItems || []).reduce((acc, it) => {
    const m = Number(it?.durationMinutes);
    return acc + (m > 0 ? m : 0);
  }, 0);
  const minutes = sum > 0 ? sum : DEFAULT_MEETING_MINUTES;
  return new Date(start.getTime() + minutes * 60 * 1000);
}

/** Estado en vivo derivado de la hora. cancelled/completed ganan siempre. */
export function getMeetingLiveState(
  meeting: { status: string; scheduledDate: string; agendaItems?: { durationMinutes?: number }[] },
  now: Date = new Date(),
): MeetingLiveState {
  if (meeting.status === 'cancelled') return 'cancelled';
  if (meeting.status === 'completed') return 'completed';
  const start = new Date(meeting.scheduledDate).getTime();
  const end = deriveEndDate(meeting).getTime();
  const t = now.getTime();
  if (t < start) return 'scheduled';
  if (t < end) return 'in_progress';
  return 'pending_close';
}

/** true si la reunión está pendiente de cerrar (activa y ya pasó su fin estimado). */
export function isMeetingPendingClose(
  meeting: { status: string; scheduledDate: string; agendaItems?: { durationMinutes?: number }[] },
  now: Date = new Date(),
): boolean {
  if (!ACTIVE_STATUSES.includes(meeting.status)) return false;
  return getMeetingLiveState(meeting, now) === 'pending_close';
}

export interface LiveStatePresentation {
  label: string;
  tagColor: string;
  badgeStatus: 'success' | 'processing' | 'warning' | 'error' | 'default';
  accentColor: string;
}

const PRESENTATION: Record<MeetingLiveState, LiveStatePresentation> = {
  scheduled: { label: 'Programada', tagColor: 'blue', badgeStatus: 'default', accentColor: '#1890ff' },
  in_progress: { label: 'En curso', tagColor: 'processing', badgeStatus: 'processing', accentColor: '#52c41a' },
  pending_close: { label: 'Pendiente de cierre', tagColor: 'orange', badgeStatus: 'warning', accentColor: '#fa8c16' },
  completed: { label: 'Completada', tagColor: 'green', badgeStatus: 'success', accentColor: '#52c41a' },
  cancelled: { label: 'Cancelada', tagColor: 'red', badgeStatus: 'error', accentColor: '#ff4d4f' },
};

export function getLiveStatePresentation(state: MeetingLiveState): LiveStatePresentation {
  return PRESENTATION[state];
}

/** Formatea una duración en ms a texto corto en español: "45 min", "2 h", "3 días". */
function formatDuration(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 día' : `${days} días`;
}

/** Texto contextual de cuenta atrás según el estado en vivo. */
export function getMeetingCountdownText(
  meeting: { status: string; scheduledDate: string; agendaItems?: { durationMinutes?: number }[] },
  now: Date = new Date(),
): string {
  const state = getMeetingLiveState(meeting, now);
  const start = new Date(meeting.scheduledDate).getTime();
  const end = deriveEndDate(meeting).getTime();
  const t = now.getTime();
  switch (state) {
    case 'scheduled':
      return `Empieza en ${formatDuration(start - t)}`;
    case 'in_progress':
      return `En curso · termina en ${formatDuration(end - t)}`;
    case 'pending_close':
      return `Terminó hace ${formatDuration(t - end)} — pendiente de cerrar`;
    case 'completed':
      return 'Cerrada';
    case 'cancelled':
      return 'Cancelada';
  }
}

/**
 * Índice del punto del orden del día que debería estar tratándose según la hora,
 * o -1 si aún no ha empezado o ya pasaron todos. Usa duraciones acumuladas desde el inicio.
 */
export function getCurrentAgendaIndex(
  agendaItems: { durationMinutes?: number }[],
  scheduledDate: string,
  now: Date = new Date(),
): number {
  const start = new Date(scheduledDate).getTime();
  const elapsedMin = (now.getTime() - start) / 60000;
  if (elapsedMin < 0) return -1;
  let acc = 0;
  for (let i = 0; i < agendaItems.length; i++) {
    const dur = Number(agendaItems[i]?.durationMinutes) > 0 ? Number(agendaItems[i].durationMinutes) : 0;
    acc += dur;
    if (elapsedMin < acc) return i;
  }
  return -1;
}
