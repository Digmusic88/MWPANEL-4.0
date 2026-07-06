import { describe, it, expect } from 'vitest';
import {
  allAgendaItemsCompleted,
  isMeetingPendingClose,
  deriveEndDate,
  getMeetingLiveState,
  getLiveStatePresentation,
  getMeetingCountdownText,
  getCurrentAgendaIndex,
  DEFAULT_MEETING_MINUTES,
} from '../staffMeetingUtils';

describe('allAgendaItemsCompleted', () => {
  it('is false when there are no agenda items', () => {
    expect(allAgendaItemsCompleted([])).toBe(false);
    expect(allAgendaItemsCompleted(undefined)).toBe(false);
  });

  it('is false when at least one item is pending', () => {
    expect(allAgendaItemsCompleted([{ isCompleted: true }, { isCompleted: false }])).toBe(false);
  });

  it('is true when every item is completed', () => {
    expect(allAgendaItemsCompleted([{ isCompleted: true }, { isCompleted: true }])).toBe(true);
  });
});

describe('deriveEndDate', () => {
  it('suma los minutos del orden del día', () => {
    const end = deriveEndDate({ scheduledDate: '2026-06-24T17:00:00Z', agendaItems: [{ durationMinutes: 30 }, { durationMinutes: 15 }] });
    expect(end.toISOString()).toBe('2026-06-24T17:45:00.000Z');
  });
  it('usa el default cuando no hay minutos', () => {
    const end = deriveEndDate({ scheduledDate: '2026-06-24T17:00:00Z', agendaItems: [] });
    expect(end.getTime() - new Date('2026-06-24T17:00:00Z').getTime()).toBe(DEFAULT_MEETING_MINUTES * 60 * 1000);
  });
});

describe('getMeetingLiveState', () => {
  const base = { scheduledDate: '2026-06-24T17:00:00Z', agendaItems: [{ durationMinutes: 60 }] };
  it('cancelled/completed ganan siempre', () => {
    expect(getMeetingLiveState({ ...base, status: 'cancelled' }, new Date('2026-06-24T17:30:00Z'))).toBe('cancelled');
    expect(getMeetingLiveState({ ...base, status: 'completed' }, new Date('2026-06-24T17:30:00Z'))).toBe('completed');
  });
  it('scheduled antes, in_progress durante, pending_close después', () => {
    expect(getMeetingLiveState({ ...base, status: 'scheduled' }, new Date('2026-06-24T16:00:00Z'))).toBe('scheduled');
    expect(getMeetingLiveState({ ...base, status: 'scheduled' }, new Date('2026-06-24T17:30:00Z'))).toBe('in_progress');
    expect(getMeetingLiveState({ ...base, status: 'in_progress' }, new Date('2026-06-24T18:30:00Z'))).toBe('pending_close');
  });
});

describe('isMeetingPendingClose', () => {
  const now = new Date('2026-06-24T18:30:00Z');
  it('true cuando ya pasó el fin y sigue activa', () => {
    expect(isMeetingPendingClose({ status: 'scheduled', scheduledDate: '2026-06-24T17:00:00Z', agendaItems: [{ durationMinutes: 60 }] }, now)).toBe(true);
  });
  it('false si aún está en curso', () => {
    expect(isMeetingPendingClose({ status: 'scheduled', scheduledDate: '2026-06-24T18:00:00Z', agendaItems: [{ durationMinutes: 60 }] }, now)).toBe(false);
  });
  it('false para completed/cancelled', () => {
    expect(isMeetingPendingClose({ status: 'completed', scheduledDate: '2026-06-20T17:00:00Z' }, now)).toBe(false);
  });
});

describe('getLiveStatePresentation', () => {
  it('mapea cada estado a etiqueta y colores', () => {
    expect(getLiveStatePresentation('scheduled').label).toBe('Programada');
    expect(getLiveStatePresentation('in_progress').label).toBe('En curso');
    expect(getLiveStatePresentation('pending_close').label).toBe('Pendiente de cierre');
    expect(getLiveStatePresentation('pending_close').badgeStatus).toBe('warning');
    expect(getLiveStatePresentation('completed').label).toBe('Completada');
    expect(getLiveStatePresentation('cancelled').label).toBe('Cancelada');
  });
});

describe('getMeetingCountdownText', () => {
  const sched = { status: 'scheduled', scheduledDate: '2026-06-24T17:00:00Z', agendaItems: [{ durationMinutes: 60 }] };
  it('antes del inicio dice "Empieza en ..."', () => {
    expect(getMeetingCountdownText(sched, new Date('2026-06-24T15:00:00Z'))).toMatch(/^Empieza en/);
  });
  it('durante dice "En curso · termina en ..."', () => {
    expect(getMeetingCountdownText(sched, new Date('2026-06-24T17:30:00Z'))).toMatch(/^En curso/);
  });
  it('después dice "Terminó hace ... — pendiente de cerrar"', () => {
    expect(getMeetingCountdownText(sched, new Date('2026-06-25T17:30:00Z'))).toMatch(/pendiente de cerrar$/);
  });
});

describe('getCurrentAgendaIndex', () => {
  const items = [{ durationMinutes: 10 }, { durationMinutes: 25 }, { durationMinutes: 20 }];
  it('-1 antes del inicio', () => {
    expect(getCurrentAgendaIndex(items, '2026-06-24T17:00:00Z', new Date('2026-06-24T16:59:00Z'))).toBe(-1);
  });
  it('señala el punto en curso según minutos acumulados', () => {
    // 12 min después del inicio → dentro del 2º punto (10..35)
    expect(getCurrentAgendaIndex(items, '2026-06-24T17:00:00Z', new Date('2026-06-24T17:12:00Z'))).toBe(1);
  });
  it('-1 cuando ya pasaron todos los puntos', () => {
    expect(getCurrentAgendaIndex(items, '2026-06-24T17:00:00Z', new Date('2026-06-24T19:00:00Z'))).toBe(-1);
  });
});
