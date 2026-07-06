import { Test } from '@nestjs/testing';
import { ClosureService } from './closure.service';
import { SettingsService } from '../settings.service';

describe('ClosureService', () => {
  let service: ClosureService;
  let store: Record<string, any>;

  beforeEach(async () => {
    store = {};
    const settingsMock: Partial<SettingsService> = {
      getBoolean: jest.fn(async (k, d) => (k in store ? store[k] : d)),
      getString: jest.fn(async (k, d) => (k in store ? store[k] : d)),
      getJSON: jest.fn(async (k, d) => (k in store ? store[k] : d)),
      upsert: jest.fn(async (k, v) => { store[k] = v; }),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ClosureService,
        { provide: SettingsService, useValue: settingsMock },
      ],
    }).compile();
    service = moduleRef.get(ClosureService);
  });

  it('is disabled by default', async () => {
    expect(await service.isEnabled()).toBe(false);
  });

  it('always includes the safety floor in allowed sections', async () => {
    store['closure_allowed_sections_student'] = ['blog'];
    const allowed = await service.getAllowedSections('student');
    expect(allowed).toEqual(expect.arrayContaining(['blog', 'perfil', 'comunicaciones']));
  });

  it('falls back to defaults when no list stored', async () => {
    const allowed = await service.getAllowedSections('family');
    expect(allowed).toEqual(expect.arrayContaining(['comunicaciones', 'blog', 'calendario', 'perfil']));
  });

  it('enable persists enabled flag, per-role lists and message', async () => {
    await service.enable({ allowedSectionsByRole: { teacher: ['blog'], student: ['blog'], family: ['blog'] }, message: 'Cierre' }, 'admin@x');
    expect(store['closure_mode_enabled']).toBe(true);
    expect(store['closure_allowed_sections_teacher']).toEqual(['blog']);
    expect(store['closure_message']).toBe('Cierre');
  });

  it('disable sets the flag to false but keeps the lists', async () => {
    await service.enable({ allowedSectionsByRole: { teacher: ['blog'], student: ['blog'], family: ['blog'] } }, 'admin@x');
    await service.disable('admin@x');
    expect(store['closure_mode_enabled']).toBe(false);
    expect(store['closure_allowed_sections_teacher']).toEqual(['blog']);
  });

  it('getStatusForRole returns disabled for admin (not an affected role)', async () => {
    store['closure_mode_enabled'] = true;
    const status = await service.getStatusForRole('admin');
    expect(status.enabled).toBe(false);
  });

  it('getStatusForRole returns enabled+sections for an affected role', async () => {
    store['closure_mode_enabled'] = true;
    store['closure_allowed_sections_student'] = ['blog'];
    const status = await service.getStatusForRole('student');
    expect(status.enabled).toBe(true);
    expect(status.allowedSections).toEqual(expect.arrayContaining(['blog', 'perfil']));
  });
});
