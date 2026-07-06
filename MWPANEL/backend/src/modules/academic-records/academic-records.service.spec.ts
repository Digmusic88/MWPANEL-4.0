import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AcademicRecordsService } from './academic-records.service';
import { AcademicRecord } from './entities/academic-record.entity';
import { AcademicRecordEntry } from './entities/academic-record-entry.entity';
import { AcademicRecordGrade } from './entities/academic-record-grade.entity';
import { Student } from '../students/entities/student.entity';
import { SubjectAssignment } from '../students/entities/subject-assignment.entity';
import { AcademicYear as AcademicYearEntity } from '../students/entities/academic-year.entity';
import { SettingsService } from '../settings/settings.service';
import { AcademicRecordsSyncService } from './services/academic-records-sync.service';
import { ExpedienteBuilderService } from './services/expediente-builder.service';

/**
 * Confirma que, con numericValue en 0-100, recomputeGPA deja finalGPA en 0-100
 * (media ponderada por credits, sin /10 ni cap). El servicio NO cambia en SP-4B2.
 */
describe('AcademicRecordsService.recomputeGPA (escala 0-100)', () => {
  let svc: AcademicRecordsService;

  // Almacén del record para verificar el finalGPA tras recompute.
  const recordStore: any = { id: 'r1', finalGPA: undefined };

  const academicRecordsRepository = {
    findOne: jest.fn().mockImplementation(() => Promise.resolve(recordStore)),
    save: jest.fn().mockImplementation((r: any) => {
      recordStore.finalGPA = r.finalGPA;
      return Promise.resolve(r);
    }),
  };

  // Entradas ANNUAL con numericValue 0-100 y credits para ponderar.
  const entriesRepository = {
    find: jest.fn().mockResolvedValue([
      { numericValue: 80, credits: 2, grades: [] },
      { numericValue: 60, credits: 1, grades: [] },
      // media ponderada = (80*2 + 60*1) / (2+1) = 220/3 = 73.333... -> 73.33
    ]),
  };

  const noop = {};

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        AcademicRecordsService,
        { provide: getRepositoryToken(AcademicRecord), useValue: academicRecordsRepository },
        { provide: getRepositoryToken(AcademicRecordEntry), useValue: entriesRepository },
        { provide: getRepositoryToken(AcademicRecordGrade), useValue: noop },
        { provide: getRepositoryToken(Student), useValue: noop },
        { provide: getRepositoryToken(SubjectAssignment), useValue: noop },
        { provide: getRepositoryToken(AcademicYearEntity), useValue: { findOne: jest.fn() } },
        { provide: SettingsService, useValue: { isModuleEnabled: jest.fn().mockResolvedValue(true) } },
        { provide: AcademicRecordsSyncService, useValue: noop },
        { provide: ExpedienteBuilderService, useValue: noop },
      ],
    }).compile();
    svc = mod.get(AcademicRecordsService);
    recordStore.finalGPA = undefined;
  });

  it('finalGPA = media ponderada de numericValue (0-100), sin /10 ni cap', async () => {
    await svc.recomputeGPA('r1');
    expect(recordStore.finalGPA).toBe(73.33);
    // Sanity: el GPA está en rango 0-100, no en 0-10
    expect(recordStore.finalGPA).toBeGreaterThan(10);
  });
});
