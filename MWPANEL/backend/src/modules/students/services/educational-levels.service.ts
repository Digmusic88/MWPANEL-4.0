import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EducationalLevel } from '../entities/educational-level.entity';
import { CreateEducationalLevelDto } from '../dto/create-educational-level.dto';
import { UpdateEducationalLevelDto } from '../dto/update-educational-level.dto';

@Injectable()
export class EducationalLevelsService {
  constructor(
    @InjectRepository(EducationalLevel)
    private educationalLevelsRepository: Repository<EducationalLevel>,
  ) {}

  async findAll(): Promise<EducationalLevel[]> {
    console.log('🔍 EducationalLevelsService.findAll() called');
    
    // Try using QueryBuilder for more explicit relation loading
    const result = await this.educationalLevelsRepository
      .createQueryBuilder('educationalLevel')
      .leftJoinAndSelect('educationalLevel.cycles', 'cycle')
      .leftJoinAndSelect('cycle.courses', 'course')
      .orderBy('educationalLevel.name', 'ASC')
      .addOrderBy('cycle.order', 'ASC')
      .addOrderBy('course.order', 'ASC')
      .getMany();
    
    console.log('📚 Educational levels found:', result.length);
    result.forEach(level => {
      console.log(`  - ${level.name}: ${level.cycles?.length || 0} cycles`);
      level.cycles?.forEach(cycle => {
        console.log(`    - ${cycle.name}: ${cycle.courses?.length || 0} courses`);
        cycle.courses?.forEach(course => {
          console.log(`      - ${course.name}`);
        });
      });
    });
    
    return result;
  }

  async findOne(id: string): Promise<EducationalLevel> {
    const educationalLevel = await this.educationalLevelsRepository.findOne({
      where: { id },
      relations: ['cycles', 'cycles.courses'],
    });
    
    if (!educationalLevel) {
      throw new NotFoundException('Nivel educativo no encontrado');
    }
    
    return educationalLevel;
  }

  async create(createEducationalLevelDto: CreateEducationalLevelDto): Promise<EducationalLevel> {
    const { name, code, description } = createEducationalLevelDto;

    // Check if code already exists
    const existingCode = await this.educationalLevelsRepository.findOne({ where: { code } });
    if (existingCode) {
      throw new ConflictException('El código del nivel educativo ya existe');
    }

    // Check if name already exists
    const existingName = await this.educationalLevelsRepository.findOne({ where: { name } });
    if (existingName) {
      throw new ConflictException('El nombre del nivel educativo ya existe');
    }

    const educationalLevel = this.educationalLevelsRepository.create({
      name,
      code,
      description,
    });

    return this.educationalLevelsRepository.save(educationalLevel);
  }

  async update(id: string, updateEducationalLevelDto: UpdateEducationalLevelDto): Promise<EducationalLevel> {
    const educationalLevel = await this.findOne(id);
    
    const { name, code, description } = updateEducationalLevelDto;

    // Check if code already exists (only if code is being changed)
    if (code && code !== educationalLevel.code) {
      const existingCode = await this.educationalLevelsRepository.findOne({ where: { code } });
      if (existingCode) {
        throw new ConflictException('El código del nivel educativo ya existe');
      }
      educationalLevel.code = code;
    }

    // Check if name already exists (only if name is being changed)
    if (name && name !== educationalLevel.name) {
      const existingName = await this.educationalLevelsRepository.findOne({ where: { name } });
      if (existingName) {
        throw new ConflictException('El nombre del nivel educativo ya existe');
      }
      educationalLevel.name = name;
    }

    if (description !== undefined) {
      educationalLevel.description = description;
    }

    return this.educationalLevelsRepository.save(educationalLevel);
  }

  async remove(id: string): Promise<void> {
    const educationalLevel = await this.findOne(id);
    
    // Check if there are students associated with this level
    const studentsCount = await this.educationalLevelsRepository
      .createQueryBuilder('level')
      .leftJoin('level.cycles', 'cycle')
      .leftJoin('cycle.courses', 'course')
      .leftJoin('course.students', 'student')
      .where('level.id = :id', { id })
      .andWhere('student.id IS NOT NULL')
      .getCount();

    if (studentsCount > 0) {
      throw new ConflictException('No se puede eliminar el nivel educativo porque tiene estudiantes asociados');
    }

    await this.educationalLevelsRepository.remove(educationalLevel);
  }
}