import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StudentCurriculumService } from './student-curriculum.service';
import { StudentSubjectLevelAssignment } from './entities/student-subject-level-assignment.entity';
import { StudentCurriculumAuditLog } from './entities/student-curriculum-audit-log.entity';
import { Student } from '../students/entities/student.entity';
import { Course } from '../students/entities/course.entity';
import { SpecificCompetency } from '../competencies/entities/specific-competency.entity';
import { BasicKnowledge } from '../competencies/entities/basic-knowledge.entity';

const mockRepo = (rows: any[] = []) => ({
  find: jest.fn().mockResolvedValue(rows),
  findOne: jest.fn().mockResolvedValue(rows[0] ?? null),
  create: jest.fn((x) => x),
  save: jest.fn((x) => Promise.resolve(x)),
});

// bkRepo mock that filters `saberes` by the OR-array `where` (subjectId + courseId|cycleId)
const mockBkRepo = (saberes: any[] = []) => ({
  find: jest.fn(({ where }: any) => {
    const conds = Array.isArray(where) ? where : [where];
    const rows = saberes.filter((s) =>
      conds.some((c: any) =>
        c.subjectId === s.subjectId &&
        ((c.courseId !== undefined && c.courseId === s.courseId) ||
         (c.cycleId !== undefined && c.cycleId === s.cycleId))));
    return Promise.resolve(rows);
  }),
});

async function build(opts: { courses?: any[]; specComps?: any[]; saberes?: any[]; active?: any[] }) {
  const courseRepo = mockRepo(opts.courses || []);
  const specRepo = mockRepo(opts.specComps || []);
  const bkRepo = mockBkRepo(opts.saberes || []);
  const levelRepo = mockRepo(opts.active || []);
  const txMgr = { transaction: jest.fn() };
  const moduleRef = await Test.createTestingModule({
    providers: [
      StudentCurriculumService,
      { provide: getRepositoryToken(StudentSubjectLevelAssignment), useValue: levelRepo },
      { provide: getRepositoryToken(StudentCurriculumAuditLog), useValue: mockRepo() },
      { provide: getRepositoryToken(Student), useValue: mockRepo() },
      { provide: getRepositoryToken(Course), useValue: courseRepo },
      { provide: getRepositoryToken(SpecificCompetency), useValue: specRepo },
      { provide: getRepositoryToken(BasicKnowledge), useValue: bkRepo },
      { provide: DataSource, useValue: txMgr },
    ],
  }).compile();
  return { svc: moduleRef.get(StudentCurriculumService), courseRepo, specRepo, bkRepo, levelRepo, txMgr };
}

describe('getCurriculumCatalogForCourses', () => {
  it('agrupa por curso, filtra criterios por courseId/cycleId y trae saberes de área', async () => {
    const courses = [
      { id: 'c4', name: '4º Primaria', cycleId: 'cyc2' },
      { id: 'c5', name: '5º Primaria', cycleId: 'cyc3' },
    ];
    const specComps = [{
      id: 'sc1', code: 'CE1', name: 'Comp 1', order: 1,
      evaluationCriteria: [
        { id: 'k4', code: '1.1', description: 'crit 4º', courseId: 'c4', cycleId: null, order: 1 },
        { id: 'kc', code: '1.2', description: 'crit ciclo3', courseId: null, cycleId: 'cyc3', order: 2 },
      ],
    }];
    // Saberes anclados al área: uno por curso (c4) y uno por ciclo (cyc3 → c5)
    const saberes = [
      { id: 's4', code: 'A', title: 'saber 4º', description: 'd', subjectId: 'subj', courseId: 'c4', cycleId: null, block: 'A', order: 1 },
      { id: 'scy', code: 'B', title: 'saber ciclo3', description: 'd', subjectId: 'subj', courseId: null, cycleId: 'cyc3', block: 'B', order: 1 },
    ];
    const { svc } = await build({ courses, specComps, saberes });
    const out = await svc.getCurriculumCatalogForCourses('subj', ['c4', 'c5']);
    expect(out).toHaveLength(2);
    const g4 = out.find((g) => g.courseId === 'c4')!;
    expect(g4.competencies[0].criteria.map((c) => c.id)).toEqual(['k4']);
    expect(g4.saberes.map((s) => s.id)).toEqual(['s4']);
    const g5 = out.find((g) => g.courseId === 'c5')!;
    expect(g5.competencies[0].criteria.map((c) => c.id)).toEqual(['kc']);
    expect(g5.saberes.map((s) => s.id)).toEqual(['scy']);
  });

  it('devuelve [] si no hay cursos', async () => {
    const { svc } = await build({});
    expect(await svc.getCurriculumCatalogForCourses('subj', [])).toEqual([]);
  });
});

describe('changeBlock validación', () => {
  it('lanza si falta el motivo', async () => {
    const { svc } = await build({});
    await expect(
      svc.changeBlock({ studentId: 's', subjectId: 'subj', academicYearId: 'y', newCourseId: 'c4', reason: '  ' } as any, 'u1'),
    ).rejects.toThrow('El motivo es obligatorio');
  });

  // M5: cambiar al MISMO y único curso activo no debe abrir transacción ni crear fila validFrom==validTo
  it('es no-op si ya está en ese único curso (no abre transacción)', async () => {
    const { svc, txMgr } = await build({
      active: [{ courseId: 'c4', validTo: null }],
      courses: [{ id: 'c4', name: '4º Primaria', cycleId: null }],
    });
    await svc.changeBlock(
      { studentId: 's', subjectId: 'subj', academicYearId: 'y', newCourseId: 'c4', reason: 'x' } as any,
      'u1',
    );
    expect(txMgr.transaction).not.toHaveBeenCalled();
  });
});
