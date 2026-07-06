import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, FindManyOptions } from 'typeorm';
import { CommunicationConfig } from '../entities/communication-config.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';
import { Student } from '../../students/entities/student.entity';
import { Family, FamilyStudent } from '../../users/entities/family.entity';
import {
  CreateCommunicationConfigDto,
  UpdateCommunicationConfigDto,
  BulkCommunicationConfigDto,
} from '../dto/communication-config.dto';

@Injectable()
export class CommunicationConfigService {
  private readonly logger = new Logger(CommunicationConfigService.name);

  constructor(
    @InjectRepository(CommunicationConfig)
    private communicationConfigRepository: Repository<CommunicationConfig>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(ClassGroup)
    private classGroupRepository: Repository<ClassGroup>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Family)
    private familyRepository: Repository<Family>,
    @InjectRepository(FamilyStudent)
    private familyStudentRepository: Repository<FamilyStudent>,
  ) {}

  async createConfig(
    createDto: CreateCommunicationConfigDto,
    configuredByUserId: string,
  ): Promise<CommunicationConfig> {
    this.logger.log(`Creating communication config for teacher ${createDto.teacherId}`);

    // Validar que el profesor existe
    const teacher = await this.teacherRepository.findOne({
      where: { id: createDto.teacherId },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Validar que al menos uno de los campos está presente
    if (!createDto.classGroupId && !createDto.studentId && !createDto.familyId) {
      throw new BadRequestException('At least one of classGroupId, studentId, or familyId must be provided');
    }

    // Validar que solo uno de los campos está presente
    const fieldsProvided = [createDto.classGroupId, createDto.studentId, createDto.familyId].filter(Boolean).length;
    if (fieldsProvided > 1) {
      throw new BadRequestException('Only one of classGroupId, studentId, or familyId can be provided');
    }

    // Validar que las entidades relacionadas existen
    if (createDto.classGroupId) {
      const classGroup = await this.classGroupRepository.findOne({
        where: { id: createDto.classGroupId },
      });
      if (!classGroup) {
        throw new NotFoundException('Class group not found');
      }
    }

    if (createDto.studentId) {
      const student = await this.studentRepository.findOne({
        where: { id: createDto.studentId },
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }
    }

    if (createDto.familyId) {
      const family = await this.familyRepository.findOne({
        where: { id: createDto.familyId },
      });
      if (!family) {
        throw new NotFoundException('Family not found');
      }
    }

    // Crear la configuración
    const config = this.communicationConfigRepository.create({
      ...createDto,
      configuredByUserId,
    });

    return this.communicationConfigRepository.save(config);
  }

  async updateConfig(
    id: string,
    updateDto: UpdateCommunicationConfigDto,
  ): Promise<CommunicationConfig> {
    const config = await this.communicationConfigRepository.findOne({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException('Communication config not found');
    }

    Object.assign(config, updateDto);
    return this.communicationConfigRepository.save(config);
  }

  async deleteConfig(id: string): Promise<void> {
    const result = await this.communicationConfigRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Communication config not found');
    }
  }

  async getConfigs(teacherId?: string): Promise<CommunicationConfig[]> {
    try {
      const query = this.communicationConfigRepository
        .createQueryBuilder('config')
        .leftJoinAndSelect('config.teacher', 'teacher')
        .leftJoinAndSelect('teacher.user', 'teacherUser')
        .leftJoinAndSelect('teacherUser.profile', 'teacherProfile')
        .leftJoinAndSelect('config.classGroup', 'classGroup')
        .leftJoinAndSelect('classGroup.courses', 'course')
        .leftJoinAndSelect('config.family', 'family')
        .leftJoinAndSelect('family.primaryContact', 'primaryContact')
        .leftJoinAndSelect('primaryContact.profile', 'primaryContactProfile')
        .orderBy('config.createdAt', 'DESC');

      if (teacherId) {
        query.where('config.teacherId = :teacherId', { teacherId });
      }

      return await query.getMany();
    } catch (error) {
      this.logger.error(`Error getting communication configs: ${error.message}`, error.stack);
      // Fallback: return basic configs without relations
      try {
        const options: FindManyOptions<CommunicationConfig> = {};
        if (teacherId) {
          options.where = { teacherId };
        }
        return await this.communicationConfigRepository.find(options);
      } catch {
        return [];
      }
    }
  }

  async bulkCreateConfigs(
    bulkDto: BulkCommunicationConfigDto,
    configuredByUserId: string,
  ): Promise<CommunicationConfig[]> {
    this.logger.log(`Bulk creating communication configs for teacher ${bulkDto.teacherId}`);

    // Validar que el profesor existe
    const teacher = await this.teacherRepository.findOne({
      where: { id: bulkDto.teacherId },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Validar que todos los grupos de clase existen
    const classGroups = await this.classGroupRepository.findBy({ id: In(bulkDto.classGroupIds) });
    if (classGroups.length !== bulkDto.classGroupIds.length) {
      throw new NotFoundException('One or more class groups not found');
    }

    // Crear configuraciones para cada grupo
    const configs: CommunicationConfig[] = [];
    for (const classGroupId of bulkDto.classGroupIds) {
      // Verificar si ya existe una configuración
      const existingConfig = await this.communicationConfigRepository.findOne({
        where: {
          teacherId: bulkDto.teacherId,
          classGroupId,
          configType: 'class_group',
        },
      });

      if (existingConfig) {
        // Actualizar la existente
        existingConfig.isEnabled = bulkDto.isEnabled;
        if (bulkDto.adminNotes) {
          existingConfig.adminNotes = bulkDto.adminNotes;
        }
        configs.push(await this.communicationConfigRepository.save(existingConfig));
      } else {
        // Crear nueva
        const config = this.communicationConfigRepository.create({
          teacherId: bulkDto.teacherId,
          classGroupId,
          configType: 'class_group',
          isEnabled: bulkDto.isEnabled,
          adminNotes: bulkDto.adminNotes,
          configuredByUserId,
        });
        configs.push(await this.communicationConfigRepository.save(config));
      }
    }

    return configs;
  }

  // Método principal para verificar si un profesor puede comunicarse con una familia
  async canTeacherCommunicateWithFamily(
    teacherId: string,
    familyId: string,
  ): Promise<boolean> {
    this.logger.log(`Checking if teacher ${teacherId} can communicate with family ${familyId}`);

    // 1. Verificar configuración específica de familia
    const familyConfig = await this.communicationConfigRepository.findOne({
      where: {
        teacherId,
        familyId,
        configType: 'family',
      },
    });

    if (familyConfig) {
      return familyConfig.isEnabled;
    }

    // 2. Verificar configuración por grupo de clase
    // Obtener todos los estudiantes de la familia a través de FamilyStudent
    const familyStudents = await this.familyStudentRepository.find({
      where: { familyId },
      relations: ['student', 'student.classGroups'],
    });

    if (!familyStudents || familyStudents.length === 0) {
      return false;
    }

    // Verificar si hay configuración habilitada para algún grupo de clase
    for (const familyStudent of familyStudents) {
      const student = familyStudent.student;
      if (student && student.classGroups) {
        for (const classGroup of student.classGroups) {
          const classGroupConfig = await this.communicationConfigRepository.findOne({
            where: {
              teacherId,
              classGroupId: classGroup.id,
              configType: 'class_group',
              isEnabled: true,
            },
          });

          if (classGroupConfig) {
            return true;
          }
        }
      }
    }

    // 3. Verificar configuración específica de estudiantes
    for (const familyStudent of familyStudents) {
      const student = familyStudent.student;
      if (student) {
        const studentConfig = await this.communicationConfigRepository.findOne({
          where: {
            teacherId,
            studentId: student.id,
            configType: 'student',
            isEnabled: true,
          },
        });

        if (studentConfig) {
          return true;
        }
      }
    }

    return false;
  }

  // Método para obtener todas las familias que un profesor puede contactar
  async getFamiliesForTeacher(teacherId: string): Promise<string[]> {
    this.logger.log(`Getting families for teacher ${teacherId}`);

    const familyIds = new Set<string>();

    // 1. Configuraciones específicas de familia
    const familyConfigs = await this.communicationConfigRepository.find({
      where: {
        teacherId,
        configType: 'family',
        isEnabled: true,
      },
    });

    familyConfigs.forEach(config => {
      if (config.familyId) {
        familyIds.add(config.familyId);
      }
    });

    // 2. Configuraciones por grupo de clase
    const classGroupConfigs = await this.communicationConfigRepository.find({
      where: {
        teacherId,
        configType: 'class_group',
        isEnabled: true,
      },
      relations: ['classGroup', 'classGroup.students'],
    });

    // For class group configs, get families through FamilyStudent relationships
    for (const config of classGroupConfigs) {
      if (config.classGroup && config.classGroup.students) {
        // Filtrar solo estudiantes activos
        const activeStudents = config.classGroup.students.filter(s => s.user?.isActive === true);
        const studentIds = activeStudents.map(s => s.id);
        if (studentIds.length > 0) {
          const familyStudents = await this.familyStudentRepository.find({
            where: { studentId: In(studentIds) },
            relations: ['family'],
          });

          familyStudents.forEach(fs => {
            if (fs.family?.id) {
              familyIds.add(fs.family.id);
            }
          });
        }
      }
    }

    // 3. Configuraciones específicas de estudiantes
    const studentConfigs = await this.communicationConfigRepository.find({
      where: {
        teacherId,
        configType: 'student',
        isEnabled: true,
      },
      relations: ['student'],
    });

    // For student configs, get families through FamilyStudent relationships
    for (const config of studentConfigs) {
      if (config.student) {
        const familyStudents = await this.familyStudentRepository.find({
          where: { studentId: config.student.id },
          relations: ['family'],
        });

        familyStudents.forEach(fs => {
          if (fs.family?.id) {
            familyIds.add(fs.family.id);
          }
        });
      }
    }

    return Array.from(familyIds);
  }

  // Método para configurar automáticamente permisos de comunicación para tutores
  async setupTutorCommunicationConfigs(configuredByUserId: string): Promise<void> {
    this.logger.log('Setting up communication configurations for all tutors');

    try {
      // Obtener todos los profesores que son tutores de alguna clase
      const tutors = await this.teacherRepository.find({
        relations: ['tutoredClasses'],
      });

      const tutorsWithClasses = tutors.filter(teacher =>
        teacher.tutoredClasses && teacher.tutoredClasses.length > 0
      );

      this.logger.log(`Found ${tutorsWithClasses.length} tutors with classes`);

      let configsCreated = 0;
      let configsUpdated = 0;

      for (const tutor of tutorsWithClasses) {
        for (const classGroup of tutor.tutoredClasses) {
          // Verificar si ya existe una configuración para este tutor y clase
          const existingConfig = await this.communicationConfigRepository.findOne({
            where: {
              teacherId: tutor.id,
              classGroupId: classGroup.id,
              configType: 'class_group',
            },
          });

          if (existingConfig) {
            // Si existe pero está deshabilitada, habilitarla
            if (!existingConfig.isEnabled) {
              existingConfig.isEnabled = true;
              existingConfig.adminNotes = `Habilitado automáticamente para tutor de ${classGroup.name}`;
              await this.communicationConfigRepository.save(existingConfig);
              configsUpdated++;
              this.logger.log(`Updated config for tutor ${tutor.id} and class ${classGroup.name}`);
            }
          } else {
            // Crear nueva configuración
            const newConfig = this.communicationConfigRepository.create({
              teacherId: tutor.id,
              classGroupId: classGroup.id,
              configType: 'class_group',
              isEnabled: true,
              adminNotes: `Configuración automática para tutor de ${classGroup.name}`,
              configuredByUserId,
            });

            await this.communicationConfigRepository.save(newConfig);
            configsCreated++;
            this.logger.log(`Created config for tutor ${tutor.id} and class ${classGroup.name}`);
          }
        }
      }

      this.logger.log(`Tutor communication setup completed: ${configsCreated} configs created, ${configsUpdated} configs updated`);
    } catch (error) {
      this.logger.error('Error setting up tutor communication configs:', error);
      throw error;
    }
  }

  // Método para obtener un resumen de configuraciones de tutores
  async getTutorConfigsSummary(): Promise<any> {
    this.logger.log('Getting tutor communication configurations summary');

    try {
      const summary = await this.communicationConfigRepository.query(`
        SELECT
          t.id as teacher_id,
          u.email as teacher_email,
          up."firstName" as teacher_first_name,
          up."lastName" as teacher_last_name,
          cg.id as class_id,
          cg.name as class_name,
          cc.id as config_id,
          cc."isEnabled" as config_enabled,
          cc."adminNotes" as config_notes
        FROM teachers t
        JOIN users u ON t."userId" = u.id
        JOIN user_profiles up ON u.id = up."userId"
        JOIN class_groups cg ON cg."tutorId" = t.id
        LEFT JOIN communication_configs cc ON cc."teacherId" = t.id AND cc."classGroupId" = cg.id
        ORDER BY teacher_email, class_name
      `);

      return summary;
    } catch (error) {
      this.logger.error('Error getting tutor configs summary:', error);
      throw error;
    }
  }
}