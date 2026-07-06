import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivitiesService } from './activities.service';
import { Activity } from './entities/activity.entity';
import { ActivityAssessment } from './entities/activity-assessment.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { Subject } from '../students/entities/subject.entity';
import { Student } from '../students/entities/student.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ActivityValuationType } from './entities/activity.entity';

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let activityRepository: Repository<Activity>;
  let activityAssessmentRepository: Repository<ActivityAssessment>;
  let teacherRepository: Repository<Teacher>;
  let subjectRepository: Repository<Subject>;
  let studentRepository: Repository<Student>;

  const mockTeacher = {
    id: '1',
    user: {
      id: '1',
      firstName: 'María',
      lastName: 'González',
      email: 'maria@test.com',
    },
    teacherCode: 'T001',
  };

  const mockSubject = {
    id: '1',
    name: 'Lengua Castellana',
    code: 'LEN',
    description: 'Lengua y Literatura',
    educationalLevel: { id: '1', name: 'Primaria' },
  };

  const mockStudent = {
    id: '1',
    user: {
      id: '2',
      firstName: 'Carlos',
      lastName: 'Martín',
      email: 'carlos@test.com',
    },
    enrollmentNumber: 'E001',
    educationalLevel: { id: '1', name: 'Primaria' },
    classGroup: { id: '1', name: '4º A' },
  };

  const mockActivity = {
    id: '1',
    name: 'Comprensión lectora',
    description: 'Lectura y análisis de texto',
    // type field removed as ActivityType doesn't exist
    valuationType: ActivityValuationType.SCORE,
    maxScore: 10,
    date: new Date(),
    teacher: mockTeacher,
    subject: mockSubject,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockActivityAssessment = {
    id: '1',
    activity: mockActivity,
    student: mockStudent,
    score: 8.5,
    observations: 'Buen análisis del texto',
    gradedAt: new Date(),
    gradedBy: mockTeacher,
  };

  const mockRepositories = {
    activity: {
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
    activityAssessment: {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    teacher: {
      findOne: jest.fn(),
    },
    subject: {
      findOne: jest.fn(),
    },
    student: {
      findOne: jest.fn(),
      find: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getRepositoryToken(Activity),
          useValue: mockRepositories.activity,
        },
        {
          provide: getRepositoryToken(ActivityAssessment),
          useValue: mockRepositories.activityAssessment,
        },
        {
          provide: getRepositoryToken(Teacher),
          useValue: mockRepositories.teacher,
        },
        {
          provide: getRepositoryToken(Subject),
          useValue: mockRepositories.subject,
        },
        {
          provide: getRepositoryToken(Student),
          useValue: mockRepositories.student,
        },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
    activityRepository = module.get<Repository<Activity>>(
      getRepositoryToken(Activity),
    );
    activityAssessmentRepository = module.get<Repository<ActivityAssessment>>(
      getRepositoryToken(ActivityAssessment),
    );
    teacherRepository = module.get<Repository<Teacher>>(
      getRepositoryToken(Teacher),
    );
    subjectRepository = module.get<Repository<Subject>>(
      getRepositoryToken(Subject),
    );
    studentRepository = module.get<Repository<Student>>(
      getRepositoryToken(Student),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return array of activities', async () => {
      const expectedActivities = [mockActivity];
      mockRepositories.activity.find.mockResolvedValue(expectedActivities);

      const result = await service.findAll('1');

      expect(result).toEqual(expectedActivities);
      expect(mockRepositories.activity.find).toHaveBeenCalledWith({
        relations: ['teacher', 'subject', 'teacher.user'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no activities found', async () => {
      mockRepositories.activity.find.mockResolvedValue([]);

      const result = await service.findAll('1');

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return activity when found', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(mockActivity);

      const result = await service.findOne('1');

      expect(result).toEqual(mockActivity);
      expect(mockRepositories.activity.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['teacher', 'subject', 'teacher.user', 'assessments', 'assessments.student'],
      });
    });

    it('should throw NotFoundException when activity not found', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });


  describe('create', () => {
    const createActivityDto = {
      name: 'Nueva actividad',
      description: 'Descripción de la actividad',
      assignedDate: '2025-01-15',
      classGroupId: '1',
      subjectAssignmentId: '1',
      valuationType: ActivityValuationType.SCORE,
      maxScore: 10,
      notifyFamilies: true,
    };

    it('should create activity successfully', async () => {
      mockRepositories.teacher.findOne.mockResolvedValue(mockTeacher);
      mockRepositories.subject.findOne.mockResolvedValue(mockSubject);
      mockRepositories.activity.create.mockReturnValue(mockActivity);
      mockRepositories.activity.save.mockResolvedValue(mockActivity);

      const result = await service.create(createActivityDto, '1');

      expect(result).toEqual(mockActivity);
      expect(mockRepositories.activity.create).toHaveBeenCalledWith({
        name: createActivityDto.name,
        description: createActivityDto.description,
        assignedDate: createActivityDto.assignedDate,
        valuationType: createActivityDto.valuationType,
        maxScore: createActivityDto.maxScore,
        classGroupId: createActivityDto.classGroupId,
        subjectAssignmentId: createActivityDto.subjectAssignmentId,
        notifyFamilies: createActivityDto.notifyFamilies,
        isActive: true,
      });
    });

    it('should throw NotFoundException when teacher not found', async () => {
      mockRepositories.teacher.findOne.mockResolvedValue(null);

      await expect(service.create(createActivityDto, '1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when subject not found', async () => {
      mockRepositories.teacher.findOne.mockResolvedValue(mockTeacher);
      mockRepositories.subject.findOne.mockResolvedValue(null);

      await expect(service.create(createActivityDto, '1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid maxScore', async () => {
      const invalidDto = { ...createActivityDto, maxScore: -1 };
      mockRepositories.teacher.findOne.mockResolvedValue(mockTeacher);
      mockRepositories.subject.findOne.mockResolvedValue(mockSubject);

      await expect(service.create(invalidDto, '1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('update', () => {
    const updateActivityDto = {
      name: 'Actividad actualizada',
      description: 'Nueva descripción',
      maxScore: 12,
    };

    it('should update activity successfully', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(mockActivity);
      mockRepositories.activity.save.mockResolvedValue({
        ...mockActivity,
        ...updateActivityDto,
      });

      const result = await service.update('1', updateActivityDto, '1');

      expect(result.name).toBe(updateActivityDto.name);
      expect(result.description).toBe(updateActivityDto.description);
      expect(result.maxScore).toBe(updateActivityDto.maxScore);
    });

    it('should throw NotFoundException when activity not found', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(null);

      await expect(service.update('999', updateActivityDto, '1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('assessStudent', () => {
    const assessmentDto = {
      value: 'happy',
      comment: 'Muy buen trabajo',
    };

    it('should assess student successfully', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(mockActivity);
      mockRepositories.student.findOne.mockResolvedValue(mockStudent);
      mockRepositories.activityAssessment.create.mockReturnValue(mockActivityAssessment);
      mockRepositories.activityAssessment.save.mockResolvedValue(mockActivityAssessment);

      const result = await service.assessStudent('1', '1', assessmentDto, '1');

      expect(result).toEqual(mockActivityAssessment);
      expect(mockRepositories.activityAssessment.create).toHaveBeenCalledWith({
        activity: mockActivity,
        student: mockStudent,
        value: assessmentDto.value,
        comment: assessmentDto.comment,
        gradedBy: mockTeacher,
        gradedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when activity not found', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(null);

      await expect(
        service.assessStudent('999', '1', assessmentDto, '1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when student not found', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(mockActivity);
      mockRepositories.student.findOne.mockResolvedValue(null);

      await expect(
        service.assessStudent('1', '1', assessmentDto, '1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for score above maxScore', async () => {
      const invalidAssessment = { ...assessmentDto, value: '' };
      mockRepositories.activity.findOne.mockResolvedValue(mockActivity);
      mockRepositories.student.findOne.mockResolvedValue(mockStudent);

      await expect(
        service.assessStudent('1', '1', invalidAssessment, '1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative score', async () => {
      const invalidAssessment = { ...assessmentDto, value: 'invalid' };
      mockRepositories.activity.findOne.mockResolvedValue(mockActivity);
      mockRepositories.student.findOne.mockResolvedValue(mockStudent);

      await expect(
        service.assessStudent('1', '1', invalidAssessment, '1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getActivityStatistics', () => {
    it('should return activity statistics', async () => {
      const mockAssessments = [
        { score: 10 },
        { score: 8 },
        { score: 9 },
        { score: 7 },
        { score: 6 },
      ];

      mockRepositories.activity.findOne.mockResolvedValue(mockActivity);
      mockRepositories.activityAssessment.find.mockResolvedValue(mockAssessments);

      const result = await service.getActivityStatistics('1', '1');

      expect(result).toHaveProperty('activityId');
      expect(result).toHaveProperty('activityName');
      expect(result).toHaveProperty('totalStudents');
      expect(result).toHaveProperty('assessedStudents');
      expect(result.totalStudents).toBe(5);
      expect(result.assessedStudents).toBe(5);
      expect(result.completionPercentage).toBe(100);
    });

    it('should throw NotFoundException when activity not found', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(null);

      await expect(service.getActivityStatistics('999', '1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle activity with no assessments', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(mockActivity);
      mockRepositories.activityAssessment.find.mockResolvedValue([]);

      const result = await service.getActivityStatistics('1', '1');

      expect(result.assessedStudents).toBe(0);
      expect(result.pendingStudents).toBeGreaterThan(0);
      expect(result.completionPercentage).toBe(0);
    });
  });



  describe('remove', () => {
    it('should remove activity successfully', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(mockActivity);
      mockRepositories.activity.delete.mockResolvedValue({ affected: 1 });

      await service.remove('1', '1');

      expect(mockRepositories.activity.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when activity not found', async () => {
      mockRepositories.activity.findOne.mockResolvedValue(null);

      await expect(service.remove('999', '1')).rejects.toThrow(NotFoundException);
    });
  });
});