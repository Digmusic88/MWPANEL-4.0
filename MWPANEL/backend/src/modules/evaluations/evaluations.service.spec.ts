import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationsService } from './evaluations.service';
import { Evaluation } from './entities/evaluation.entity';
import { CompetencyEvaluation } from './entities/competency-evaluation.entity';
import { RadarEvaluation } from './entities/radar-evaluation.entity';
import { Student } from '../students/entities/student.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EvaluationsService', () => {
  let service: EvaluationsService;
  let evaluationRepository: Repository<Evaluation>;
  let competencyEvaluationRepository: Repository<CompetencyEvaluation>;
  let radarEvaluationRepository: Repository<RadarEvaluation>;
  let studentRepository: Repository<Student>;
  let teacherRepository: Repository<Teacher>;

  const mockStudent = {
    id: '1',
    user: {
      id: '1',
      firstName: 'Juan',
      lastName: 'Pérez',
      email: 'juan@test.com',
    },
    enrollmentNumber: 'E001',
    educationalLevel: { id: '1', name: 'Primaria' },
  };

  const mockTeacher = {
    id: '1',
    user: {
      id: '2',
      firstName: 'María',
      lastName: 'García',
      email: 'maria@test.com',
    },
    teacherCode: 'T001',
  };

  const mockEvaluation = {
    id: '1',
    student: mockStudent,
    teacher: mockTeacher,
    type: 'COMPETENCY',
    period: 'FIRST_TRIMESTER',
    academicYear: '2025',
    status: 'COMPLETED',
    observationsTeacher: 'Buen progreso',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCompetencyEvaluation = {
    id: '1',
    evaluation: mockEvaluation,
    competency: {
      id: '1',
      name: 'Competencia Lingüística',
      code: 'CCL',
    },
    level: 4,
    observations: 'Muy bueno',
    specificCompetencies: [],
  };

  const mockRadarEvaluation = {
    id: '1',
    evaluation: mockEvaluation,
    competencyId: '1',
    level: 4,
    specificCompetencies: [
      {
        competencyId: '1.1',
        level: 4,
        weight: 0.3,
      },
    ],
  };

  const mockRepositories = {
    evaluation: {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
      })),
    },
    competencyEvaluation: {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    },
    radarEvaluation: {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    },
    student: {
      findOne: jest.fn(),
    },
    teacher: {
      findOne: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationsService,
        {
          provide: getRepositoryToken(Evaluation),
          useValue: mockRepositories.evaluation,
        },
        {
          provide: getRepositoryToken(CompetencyEvaluation),
          useValue: mockRepositories.competencyEvaluation,
        },
        {
          provide: getRepositoryToken(RadarEvaluation),
          useValue: mockRepositories.radarEvaluation,
        },
        {
          provide: getRepositoryToken(Student),
          useValue: mockRepositories.student,
        },
        {
          provide: getRepositoryToken(Teacher),
          useValue: mockRepositories.teacher,
        },
      ],
    }).compile();

    service = module.get<EvaluationsService>(EvaluationsService);
    evaluationRepository = module.get<Repository<Evaluation>>(
      getRepositoryToken(Evaluation),
    );
    competencyEvaluationRepository = module.get<Repository<CompetencyEvaluation>>(
      getRepositoryToken(CompetencyEvaluation),
    );
    radarEvaluationRepository = module.get<Repository<RadarEvaluation>>(
      getRepositoryToken(RadarEvaluation),
    );
    studentRepository = module.get<Repository<Student>>(
      getRepositoryToken(Student),
    );
    teacherRepository = module.get<Repository<Teacher>>(
      getRepositoryToken(Teacher),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return array of evaluations', async () => {
      const expectedEvaluations = [mockEvaluation];
      mockRepositories.evaluation.find.mockResolvedValue(expectedEvaluations);

      const result = await service.findAll();

      expect(result).toEqual(expectedEvaluations);
      expect(mockRepositories.evaluation.find).toHaveBeenCalledWith({
        relations: ['student', 'teacher', 'student.user', 'teacher.user'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return evaluation when found', async () => {
      mockRepositories.evaluation.findOne.mockResolvedValue(mockEvaluation);

      const result = await service.findOne('1');

      expect(result).toEqual(mockEvaluation);
    });

    it('should throw NotFoundException when evaluation not found', async () => {
      mockRepositories.evaluation.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByStudent', () => {
    it('should return evaluations for specific student', async () => {
      const expectedEvaluations = [mockEvaluation];
      mockRepositories.student.findOne.mockResolvedValue(mockStudent);
      mockRepositories.evaluation.find.mockResolvedValue(expectedEvaluations);

      const result = await service.findByStudent('1');

      expect(result).toEqual(expectedEvaluations);
      expect(mockRepositories.student.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when student not found', async () => {
      mockRepositories.student.findOne.mockResolvedValue(null);

      await expect(service.findByStudent('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createEvaluationDto = {
      studentId: '1',
      teacherId: '1',
      type: 'COMPETENCY' as const,
      period: 'FIRST_TRIMESTER' as const,
      academicYear: '2025',
      observationsTeacher: 'Evaluación inicial',
    };

    it('should create evaluation successfully', async () => {
      mockRepositories.student.findOne.mockResolvedValue(mockStudent);
      mockRepositories.teacher.findOne.mockResolvedValue(mockTeacher);
      mockRepositories.evaluation.create.mockReturnValue(mockEvaluation);
      mockRepositories.evaluation.save.mockResolvedValue(mockEvaluation);

      const result = await service.create(createEvaluationDto as any);

      expect(result).toEqual(mockEvaluation);
      expect(mockRepositories.evaluation.create).toHaveBeenCalledWith({
        student: mockStudent,
        teacher: mockTeacher,
        type: createEvaluationDto.type,
        period: createEvaluationDto.period,
        academicYear: createEvaluationDto.academicYear,
        observationsTeacher: createEvaluationDto.observationsTeacher,
        status: 'DRAFT',
      });
    });

    it('should throw NotFoundException when student not found', async () => {
      mockRepositories.student.findOne.mockResolvedValue(null);

      await expect(service.create(createEvaluationDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when teacher not found', async () => {
      mockRepositories.student.findOne.mockResolvedValue(mockStudent);
      mockRepositories.teacher.findOne.mockResolvedValue(null);

      await expect(service.create(createEvaluationDto as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addCompetencyEvaluation', () => {
    const competencyEvaluationDto = {
      competencyId: '1',
      level: 4,
      observations: 'Excelente progreso',
    };

    it('should add competency evaluation successfully', async () => {
      mockRepositories.evaluation.findOne.mockResolvedValue(mockEvaluation);
      mockRepositories.competencyEvaluation.create.mockReturnValue(mockCompetencyEvaluation);
      mockRepositories.competencyEvaluation.save.mockResolvedValue(mockCompetencyEvaluation);

      const result = await (service as any).addCompetencyEvaluation('1', competencyEvaluationDto);

      expect(result).toEqual(mockCompetencyEvaluation);
    });

    it('should throw NotFoundException when evaluation not found', async () => {
      mockRepositories.evaluation.findOne.mockResolvedValue(null);

      await expect(
        (service as any).addCompetencyEvaluation('999', competencyEvaluationDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid level', async () => {
      const invalidDto = { ...competencyEvaluationDto, level: 6 };
      mockRepositories.evaluation.findOne.mockResolvedValue(mockEvaluation);

      await expect(
        (service as any).addCompetencyEvaluation('1', invalidDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateRadarChart', () => {
    it('should generate radar chart data', async () => {
      const mockCompetencyEvaluations = [
        {
          ...mockCompetencyEvaluation,
          competency: { id: '1', name: 'CCL', code: 'CCL' },
          level: 4,
        },
        {
          ...mockCompetencyEvaluation,
          id: '2',
          competency: { id: '2', name: 'CMCT', code: 'CMCT' },
          level: 3,
        },
      ];

      mockRepositories.evaluation.findOne.mockResolvedValue(mockEvaluation);
      mockRepositories.competencyEvaluation.find.mockResolvedValue(mockCompetencyEvaluations);

      const result = await service.generateRadarChart('1', 'FIRST_TRIMESTER') as any;

      expect(result).toHaveProperty('labels');
      expect(result).toHaveProperty('datasets');
      expect(result.labels).toHaveLength(2);
      expect(result.datasets[0].data).toEqual([4, 3]);
    });

    it('should throw NotFoundException when evaluation not found', async () => {
      mockRepositories.evaluation.findOne.mockResolvedValue(null);

      await expect(service.generateRadarChart('999', 'FIRST_TRIMESTER') as any).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return empty chart when no competency evaluations', async () => {
      mockRepositories.evaluation.findOne.mockResolvedValue(mockEvaluation);
      mockRepositories.competencyEvaluation.find.mockResolvedValue([]);

      const result = await service.generateRadarChart('1', 'FIRST_TRIMESTER') as any;

      expect(result.labels).toHaveLength(0);
      expect(result.datasets[0].data).toHaveLength(0);
    });
  });

  describe('getStudentProgress', () => {
    it('should return student progress data', async () => {
      const mockEvaluations = [
        { ...mockEvaluation, period: 'FIRST_TRIMESTER', createdAt: new Date('2025-01-15') },
        { ...mockEvaluation, id: '2', period: 'SECOND_TRIMESTER', createdAt: new Date('2025-04-15') },
      ];

      mockRepositories.student.findOne.mockResolvedValue(mockStudent);
      mockRepositories.evaluation.find.mockResolvedValue(mockEvaluations);

      const result = await (service as any).getStudentProgress('1', '2025');

      expect(result).toHaveProperty('student');
      expect(result).toHaveProperty('evaluations');
      expect(result).toHaveProperty('progressSummary');
      expect(result.evaluations).toHaveLength(2);
    });

    it('should throw NotFoundException when student not found', async () => {
      mockRepositories.student.findOne.mockResolvedValue(null);

      await expect((service as any).getStudentProgress('999', '2025')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});