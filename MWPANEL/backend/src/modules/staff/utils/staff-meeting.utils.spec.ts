import { StaffMeetingStatus } from '../entities/staff-meeting.entity';
import { resolveMeetingStatusFilter, statusChangeRequiresAdmin, isMeetingAutoCloseDue, AUTO_CLOSE_DAYS, buildAgendaReorder, deriveEndDate, getMeetingLiveState, attachLiveState, DEFAULT_MEETING_MINUTES } from './staff-meeting.utils';

describe('resolveMeetingStatusFilter', () => {
  it('maps "active" to scheduled + in_progress', () => {
    expect(resolveMeetingStatusFilter('active')).toEqual([
      StaffMeetingStatus.SCHEDULED,
      StaffMeetingStatus.IN_PROGRESS,
    ]);
  });

  it('maps "archived" to completed + cancelled', () => {
    expect(resolveMeetingStatusFilter('archived')).toEqual([
      StaffMeetingStatus.COMPLETED,
      StaffMeetingStatus.CANCELLED,
    ]);
  });

  it('returns null for "all" and for undefined', () => {
    expect(resolveMeetingStatusFilter('all')).toBeNull();
    expect(resolveMeetingStatusFilter(undefined)).toBeNull();
  });
});

describe('statusChangeRequiresAdmin', () => {
  it('requires admin when reopening from completed to scheduled', () => {
    expect(statusChangeRequiresAdmin(StaffMeetingStatus.COMPLETED, StaffMeetingStatus.SCHEDULED)).toBe(true);
  });

  it('requires admin when reopening from cancelled to in_progress', () => {
    expect(statusChangeRequiresAdmin(StaffMeetingStatus.CANCELLED, StaffMeetingStatus.IN_PROGRESS)).toBe(true);
  });

  it('does NOT require admin when closing (scheduled -> completed)', () => {
    expect(statusChangeRequiresAdmin(StaffMeetingStatus.SCHEDULED, StaffMeetingStatus.COMPLETED)).toBe(false);
  });

  it('does NOT require admin for active-to-active changes', () => {
    expect(statusChangeRequiresAdmin(StaffMeetingStatus.SCHEDULED, StaffMeetingStatus.IN_PROGRESS)).toBe(false);
  });
});

describe('isMeetingAutoCloseDue', () => {
  const now = new Date('2026-06-23T12:00:00Z');

  it('is true for an active meeting older than 30 days', () => {
    expect(isMeetingAutoCloseDue(StaffMeetingStatus.SCHEDULED, '2026-05-20T00:00:00Z', now)).toBe(true);
    expect(isMeetingAutoCloseDue(StaffMeetingStatus.IN_PROGRESS, '2026-04-01T00:00:00Z', now)).toBe(true);
  });

  it('is false for an active meeting within 30 days', () => {
    expect(isMeetingAutoCloseDue(StaffMeetingStatus.SCHEDULED, '2026-06-10T00:00:00Z', now)).toBe(false);
  });

  it('is false exactly at the 30-day boundary (not yet past)', () => {
    expect(isMeetingAutoCloseDue(StaffMeetingStatus.IN_PROGRESS, '2026-05-24T12:00:00Z', now)).toBe(false);
  });

  it('is false for already archived meetings regardless of age', () => {
    expect(isMeetingAutoCloseDue(StaffMeetingStatus.COMPLETED, '2025-01-01T00:00:00Z', now)).toBe(false);
    expect(isMeetingAutoCloseDue(StaffMeetingStatus.CANCELLED, '2025-01-01T00:00:00Z', now)).toBe(false);
  });

  it('exposes AUTO_CLOSE_DAYS = 30', () => {
    expect(AUTO_CLOSE_DAYS).toBe(30);
  });
});

describe('buildAgendaReorder', () => {
  it('maps orderedIds to sequential orderIndex', () => {
    expect(buildAgendaReorder(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual([
      { id: 'c', orderIndex: 0 },
      { id: 'a', orderIndex: 1 },
      { id: 'b', orderIndex: 2 },
    ]);
  });

  it('returns null when lengths differ', () => {
    expect(buildAgendaReorder(['a', 'b'], ['a'])).toBeNull();
  });

  it('returns null when ids do not match the existing set', () => {
    expect(buildAgendaReorder(['a', 'b'], ['a', 'x'])).toBeNull();
  });

  it('returns null when orderedIds contains duplicates', () => {
    expect(buildAgendaReorder(['a', 'b'], ['a', 'a'])).toBeNull();
  });
});

describe('deriveEndDate', () => {
  it('suma los minutos del orden del día al inicio', () => {
    const end = deriveEndDate({
      scheduledDate: '2026-06-24T17:00:00Z',
      agendaItems: [{ durationMinutes: 10 }, { durationMinutes: 25 }, { durationMinutes: null }],
    });
    expect(end.toISOString()).toBe('2026-06-24T17:35:00.000Z');
  });

  it('usa DEFAULT_MEETING_MINUTES cuando no hay minutos', () => {
    const end = deriveEndDate({ scheduledDate: '2026-06-24T17:00:00Z', agendaItems: [] });
    expect(end.getTime() - new Date('2026-06-24T17:00:00Z').getTime()).toBe(DEFAULT_MEETING_MINUTES * 60 * 1000);
  });

  it('usa el default cuando agendaItems es undefined', () => {
    const end = deriveEndDate({ scheduledDate: '2026-06-24T17:00:00Z' });
    expect(end.toISOString()).toBe('2026-06-24T18:00:00.000Z');
  });
});

describe('getMeetingLiveState', () => {
  const base = {
    scheduledDate: '2026-06-24T17:00:00Z',
    agendaItems: [{ durationMinutes: 60 }], // termina 18:00
  };

  it('cancelled gana siempre, sin importar la hora', () => {
    expect(getMeetingLiveState({ ...base, status: StaffMeetingStatus.CANCELLED }, new Date('2026-06-24T17:30:00Z'))).toBe('cancelled');
  });

  it('completed gana siempre, sin importar la hora', () => {
    expect(getMeetingLiveState({ ...base, status: StaffMeetingStatus.COMPLETED }, new Date('2026-06-24T17:30:00Z'))).toBe('completed');
  });

  it('antes del inicio → scheduled', () => {
    expect(getMeetingLiveState({ ...base, status: StaffMeetingStatus.SCHEDULED }, new Date('2026-06-24T16:00:00Z'))).toBe('scheduled');
  });

  it('entre inicio y fin → in_progress (aunque en BD sea scheduled)', () => {
    expect(getMeetingLiveState({ ...base, status: StaffMeetingStatus.SCHEDULED }, new Date('2026-06-24T17:30:00Z'))).toBe('in_progress');
  });

  it('pasado el fin y sin cerrar → pending_close', () => {
    expect(getMeetingLiveState({ ...base, status: StaffMeetingStatus.IN_PROGRESS }, new Date('2026-06-24T18:30:00Z'))).toBe('pending_close');
  });
});

describe('attachLiveState', () => {
  it('añade liveState, endsAt y durationMinutes al objeto', () => {
    const result = attachLiveState(
      { status: StaffMeetingStatus.SCHEDULED, scheduledDate: '2026-06-24T17:00:00Z', agendaItems: [{ durationMinutes: 30 }] },
      new Date('2026-06-24T16:00:00Z'),
    );
    expect(result.liveState).toBe('scheduled');
    expect(result.endsAt.toISOString()).toBe('2026-06-24T17:30:00.000Z');
    expect(result.durationMinutes).toBe(30);
  });
});
