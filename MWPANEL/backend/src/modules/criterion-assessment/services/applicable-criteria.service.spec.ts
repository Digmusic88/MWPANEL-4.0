import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ApplicableCriteriaService } from './applicable-criteria.service';
import { SubjectAssignment } from '../../students/entities/subject-assignment.entity';
import { SpecificCompetency } from '../../competencies/entities/specific-competency.entity';
import { Subject } from '../../students/entities/subject.entity';

describe('ApplicableCriteriaService', () => {
  let svc: ApplicableCriteriaService;
  const assignmentRepo = { findOne: jest.fn() };
  const specCompRepo = { find: jest.fn() };
  const subjectRepo = { find: jest.fn() };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ApplicableCriteriaService,
        { provide: getRepositoryToken(SubjectAssignment), useValue: assignmentRepo },
        { provide: getRepositoryToken(SpecificCompetency), useValue: specCompRepo },
        { provide: getRepositoryToken(Subject), useValue: subjectRepo },
      ],
    }).compile();
    svc = mod.get(ApplicableCriteriaService);
    jest.clearAllMocks();
  });

  it('resuelve cycleId desde classGroups.courses y filtra criterios correctamente', async () => {
    // Assignment: subject named "CMN", classGroup with course that has cycle cyc1
    assignmentRepo.findOne.mockResolvedValue({
      id: 'a1',
      subjectId: 'sub-canonical',
      subject: { name: 'CMN' },
      classGroups: [{
        courses: [{ id: 'crs1', cycle: { id: 'cyc1' } }],
        students: [{
          id: 'st1',
          user: { isActive: true, profile: { firstName: 'Ana', lastName: 'Pi' } },
        }],
      }],
    });

    // subjectRepo returns subjects sharing the same name 'CMN' (canonical + variant)
    subjectRepo.find.mockResolvedValue([
      { id: 'sub-canonical' },
      { id: 'sub-variant' },
    ]);

    // specCompRepo returns competencies from any of those subjects
    specCompRepo.find.mockResolvedValue([
      {
        id: 'sc1', code: 'CE1', name: 'Comunica',
        evaluationCriteria: [
          // matches by cycleId
          { id: 'c1', code: '1.1', description: 'desc matching cycle', courseId: null, cycleId: 'cyc1', order: 1 },
          // does not match (different cycle, no courseId)
          { id: 'c2', code: '1.2', description: 'desc other cycle', courseId: null, cycleId: 'cycX', order: 2 },
        ],
      },
    ]);

    const res = await svc.getForAssignment('a1');

    expect(res.students).toEqual([{ id: 'st1', name: 'Ana Pi' }]);
    expect(res.groups).toHaveLength(1);
    // c1 included (cycleId match), c2 excluded (different cycle)
    expect(res.groups[0].criteria.map((c: any) => c.id)).toEqual(['c1']);
  });

  it('resuelve courseId desde classGroups.courses y filtra criterios correctamente', async () => {
    assignmentRepo.findOne.mockResolvedValue({
      id: 'a2',
      subjectId: 'sub1',
      subject: { name: 'MAT' },
      classGroups: [{
        courses: [{ id: 'crs1', cycle: { id: 'cyc1' } }],
        students: [],
      }],
    });

    subjectRepo.find.mockResolvedValue([{ id: 'sub1' }]);

    specCompRepo.find.mockResolvedValue([
      {
        id: 'sc2', code: 'CE2', name: 'Calcula',
        evaluationCriteria: [
          { id: 'c3', code: '2.1', description: 'matches course', courseId: 'crs1', cycleId: null, order: 1 },
          { id: 'c4', code: '2.2', description: 'different course', courseId: 'crsX', cycleId: null, order: 2 },
        ],
      },
    ]);

    const res = await svc.getForAssignment('a2');
    expect(res.groups).toHaveLength(1);
    expect(res.groups[0].criteria.map((c: any) => c.id)).toEqual(['c3']);
  });

  it('devuelve groups vacío cuando ningún criterio coincide con el ciclo/curso del grupo', async () => {
    assignmentRepo.findOne.mockResolvedValue({
      id: 'a3',
      subjectId: 'sub1',
      subject: { name: 'FIS' },
      classGroups: [{
        courses: [{ id: 'crs1', cycle: { id: 'cyc1' } }],
        students: [],
      }],
    });
    subjectRepo.find.mockResolvedValue([{ id: 'sub1' }]);
    specCompRepo.find.mockResolvedValue([
      {
        id: 'sc3', code: 'CE3', name: 'Investiga',
        evaluationCriteria: [
          { id: 'c5', code: '3.1', description: 'wrong cycle', courseId: null, cycleId: 'cycOTHER', order: 1 },
        ],
      },
    ]);

    const res = await svc.getForAssignment('a3');
    expect(res.groups).toHaveLength(0);
  });

  it('devuelve groups vacío cuando no hay asignaturas con el mismo nombre', async () => {
    assignmentRepo.findOne.mockResolvedValue({
      id: 'a4',
      subjectId: 'sub1',
      subject: { name: 'UNKNOWN' },
      classGroups: [{ courses: [{ id: 'crs1', cycle: { id: 'cyc1' } }], students: [] }],
    });
    subjectRepo.find.mockResolvedValue([]);

    const res = await svc.getForAssignment('a4');
    expect(res.groups).toHaveLength(0);
    expect(specCompRepo.find).not.toHaveBeenCalled();
  });

  it('lanza NotFoundException cuando la asignación no existe', async () => {
    assignmentRepo.findOne.mockResolvedValue(null);
    await expect(svc.getForAssignment('x')).rejects.toThrow(NotFoundException);
  });
});
