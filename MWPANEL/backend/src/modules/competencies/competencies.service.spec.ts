import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompetenciesService } from './competencies.service';
import { Competency } from './entities/competency.entity';
import { EducationalLevel } from '../students/entities/educational-level.entity';
import { Area } from './entities/area.entity';
import { NotFoundException } from '@nestjs/common';

describe('CompetenciesService', () => {
  let service: CompetenciesService;
  let competencyRepository: Repository<Competency>;
  let educationalLevelRepository: Repository<EducationalLevel>;

  const mockCompetency = {
    id: '1',
    name: 'Competencia en comunicación lingüística',
    code: 'CCL',
    description: 'Competencia clave para el desarrollo del lenguaje',
    educationalLevel: { id: '1', name: 'Primaria' },
    areas: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockEducationalLevel = {
    id: '1',
    name: 'Educación Primaria',
    code: 'PRIMARIA',
    description: 'Etapa educativa de 6 a 12 años',
  };

  const mockCompetencyRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
    })),
  };

  const mockEducationalLevelRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetenciesService,
        {
          provide: getRepositoryToken(Competency),
          useValue: mockCompetencyRepository,
        },
        {
          provide: getRepositoryToken(EducationalLevel),
          useValue: mockEducationalLevelRepository,
        },
        {
          provide: getRepositoryToken(Area),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CompetenciesService>(CompetenciesService);
    competencyRepository = module.get<Repository<Competency>>(
      getRepositoryToken(Competency),
    );
    educationalLevelRepository = module.get<Repository<EducationalLevel>>(
      getRepositoryToken(EducationalLevel),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of competencies', async () => {
      const expectedCompetencies = [mockCompetency];
      mockCompetencyRepository.find.mockResolvedValue(expectedCompetencies);

      const result = await service.findAll();

      expect(result).toEqual(expectedCompetencies);
      expect(mockCompetencyRepository.find).toHaveBeenCalledWith({
        relations: ['educationalLevel', 'areas'],
      });
    });

    it('should return empty array when no competencies found', async () => {
      mockCompetencyRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a competency when found', async () => {
      mockCompetencyRepository.findOne.mockResolvedValue(mockCompetency);

      const result = await service.findOne('1');

      expect(result).toEqual(mockCompetency);
      expect(mockCompetencyRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['educationalLevel', 'areas', 'specificCompetencies'],
      });
    });

    it('should throw NotFoundException when competency not found', async () => {
      mockCompetencyRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEducationalLevel', () => {
    it('should return competencies for specific educational level', async () => {
      const expectedCompetencies = [mockCompetency];
      mockEducationalLevelRepository.findOne.mockResolvedValue(mockEducationalLevel);
      mockCompetencyRepository.find.mockResolvedValue(expectedCompetencies);

      const result = await (service as any).findByEducationalLevel('1');

      expect(result).toEqual(expectedCompetencies);
      expect(mockEducationalLevelRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw NotFoundException when educational level not found', async () => {
      mockEducationalLevelRepository.findOne.mockResolvedValue(null);

      await expect((service as any).findByEducationalLevel('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createCompetencyDto = {
      name: 'Nueva Competencia',
      code: 'NC',
      description: 'Descripción de la nueva competencia',
      educationalLevelId: '1',
    };

    it('should create a new competency successfully', async () => {
      mockEducationalLevelRepository.findOne.mockResolvedValue(mockEducationalLevel);
      mockCompetencyRepository.create.mockReturnValue(mockCompetency);
      mockCompetencyRepository.save.mockResolvedValue(mockCompetency);

      const result = await (service as any).create(createCompetencyDto);

      expect(result).toEqual(mockCompetency);
      expect(mockCompetencyRepository.create).toHaveBeenCalledWith({
        name: createCompetencyDto.name,
        code: createCompetencyDto.code,
        description: createCompetencyDto.description,
        educationalLevel: mockEducationalLevel,
      });
    });

    it('should throw NotFoundException when educational level not found', async () => {
      mockEducationalLevelRepository.findOne.mockResolvedValue(null);

      await expect((service as any).create(createCompetencyDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateCompetencyDto = {
      name: 'Competencia Actualizada',
      description: 'Descripción actualizada',
    };

    it('should update competency successfully', async () => {
      mockCompetencyRepository.findOne.mockResolvedValue(mockCompetency);
      mockCompetencyRepository.save.mockResolvedValue({
        ...mockCompetency,
        ...updateCompetencyDto,
      });

      const result = await (service as any).update('1', updateCompetencyDto);

      expect(result.name).toBe(updateCompetencyDto.name);
      expect(result.description).toBe(updateCompetencyDto.description);
    });

    it('should throw NotFoundException when competency not found', async () => {
      mockCompetencyRepository.findOne.mockResolvedValue(null);

      await expect((service as any).update('999', updateCompetencyDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove competency successfully', async () => {
      mockCompetencyRepository.findOne.mockResolvedValue(mockCompetency);
      mockCompetencyRepository.delete.mockResolvedValue({ affected: 1 });

      await (service as any).remove('1');

      expect(mockCompetencyRepository.delete).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException when competency not found', async () => {
      mockCompetencyRepository.findOne.mockResolvedValue(null);

      await expect((service as any).remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCompetencyStructure', () => {
    it('should return competency with full structure', async () => {
      const mockFullCompetency = {
        ...mockCompetency,
        specificCompetencies: [
          {
            id: '1',
            name: 'Competencia específica 1',
            evaluationCriteria: [],
          },
        ],
        areas: [
          {
            id: '1',
            name: 'Lengua Castellana',
            subjects: [],
          },
        ],
      };

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
        getOne: jest.fn().mockResolvedValue(mockFullCompetency),
      };

      mockCompetencyRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await (service as any).getCompetencyStructure('1');

      expect(result).toEqual(mockFullCompetency);
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledTimes(4);
    });
  });
});