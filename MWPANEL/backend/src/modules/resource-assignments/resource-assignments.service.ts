/**
 * @archivo: resource-assignments.service.ts
 * @módulo: Resource Assignments Service
 * @función: Lógica de negocio para asignaciones simples
 * @proyecto: MW Panel 2.0
 */

import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ResourceAssignment } from '../educational-resources/entities/resource-assignment.entity';
import { EducationalResource } from '../educational-resources/entities/educational-resource.entity';
import { Student } from '../students/entities/student.entity';
import { ClassGroup } from '../students/entities/class-group.entity';
import { CreateAssignmentDto } from './dto/create-assignment.dto';

@Injectable()
export class ResourceAssignmentsService {
  constructor(
    @InjectRepository(ResourceAssignment)
    private resourceAssignmentRepository: Repository<ResourceAssignment>,
    @InjectRepository(EducationalResource)
    private educationalResourceRepository: Repository<EducationalResource>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(ClassGroup)
    private classGroupRepository: Repository<ClassGroup>,
  ) {}

  async createAssignment(createAssignmentDto: CreateAssignmentDto, teacherId: string) {
    const { resourceId, assignmentType, targetId, dueDate, instructions } = createAssignmentDto;

    // Verificar que el recurso existe
    const resource = await this.educationalResourceRepository.findOne({
      where: { id: resourceId },
      relations: ['author'],
    });

    if (!resource) {
      throw new NotFoundException('Recurso no encontrado');
    }

    let assignments: Partial<ResourceAssignment>[] = [];

    if (assignmentType === 'individual') {
      // Asignación individual a un estudiante
      const student = await this.studentRepository.findOne({
        where: { id: targetId },
        relations: ['user'],
      });

      if (!student) {
        throw new NotFoundException('Estudiante no encontrado');
      }

      assignments.push({
        resource,
        student: student as any,
        assignedBy: { id: teacherId } as any,
        assignedAt: new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        instructions,
      });
    } else if (assignmentType === 'class') {
      // Asignación a clase completa
      const classGroup = await this.classGroupRepository.findOne({
        where: { id: targetId },
        relations: ['students', 'students.user'],
      });

      if (!classGroup) {
        throw new NotFoundException('Clase no encontrada');
      }

      if (!classGroup.students || classGroup.students.length === 0) {
        throw new BadRequestException('La clase no tiene estudiantes');
      }

      // Crear asignación para cada estudiante de la clase
      for (const student of classGroup.students) {
        assignments.push({
          resource,
          student: student as any,
          classGroup,
          assignedBy: { id: teacherId } as any,
          assignedAt: new Date(),
          dueDate: dueDate ? new Date(dueDate) : null,
          instructions,
        });
      }
    }

    // Guardar todas las asignaciones
    const savedAssignments = await this.resourceAssignmentRepository.save(assignments);

    return {
      success: true,
      message: `Recurso asignado correctamente a ${assignments.length} estudiante(s)`,
      assignments: savedAssignments.length,
      data: savedAssignments,
    };
  }

  async getAssignments(userId: string, userRole: string, query: any = {}) {
    const { status, search, startDate, endDate } = query;

    const qb = this.resourceAssignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.resource', 'resource')
      .leftJoinAndSelect('assignment.student', 'student')
      .leftJoinAndSelect('assignment.classGroup', 'classGroup')
      .leftJoinAndSelect('assignment.assignedBy', 'assignedBy')
      .leftJoinAndSelect('student.user', 'studentUser')
      .leftJoinAndSelect('studentUser.profile', 'studentProfile')
      .leftJoinAndSelect('assignedBy.profile', 'assignedByProfile');

    if (userRole === 'student') {
      // Estudiantes solo ven sus propias asignaciones
      qb.where('studentUser.id = :userId', { userId });
    } else if (userRole === 'teacher') {
      // Profesores ven las asignaciones que han creado
      qb.where('assignedBy.id = :userId', { userId });
    }

    // Filtros adicionales
    if (status) {
      switch (status) {
        case 'completed':
          qb.andWhere('assignment.completedAt IS NOT NULL');
          break;
        case 'assigned':
          qb.andWhere('assignment.completedAt IS NULL')
            .andWhere('(assignment.dueDate IS NULL OR assignment.dueDate >= :now)', { now: new Date() });
          break;
        case 'overdue':
          qb.andWhere('assignment.completedAt IS NULL')
            .andWhere('assignment.dueDate < :now', { now: new Date() });
          break;
      }
    }

    if (search) {
      qb.andWhere('(resource.title ILIKE :search OR resource.description ILIKE :search)', { search: `%${search}%` });
    }

    if (startDate && endDate) {
      qb.andWhere('assignment.assignedAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    const assignments = await qb
      .orderBy('assignment.assignedAt', 'DESC')
      .getMany();

    // Transformar datos para el frontend
    const transformedAssignments = assignments.map(assignment => ({
      id: assignment.id,
      resourceId: assignment.resource.id,
      resourceTitle: assignment.resource.title,
      resourceType: assignment.resource.type,
      assignmentType: assignment.classGroup ? 'class' : 'individual',
      targetId: assignment.classGroup?.id || assignment.student.id,
      targetName: assignment.classGroup 
        ? `${assignment.classGroup.name} - ${assignment.classGroup.section}`
        : `${(assignment.student as any).profile?.firstName || ''} ${(assignment.student as any).profile?.lastName || ''}`.trim(),
      studentCount: assignment.classGroup ? 1 : undefined, // Esto se podría mejorar
      assignedById: assignment.assignedBy.id,
      assignedByName: `${assignment.assignedBy.profile?.firstName || ''} ${assignment.assignedBy.profile?.lastName || ''}`.trim(),
      assignedAt: assignment.assignedAt,
      dueDate: assignment.dueDate,
      instructions: assignment.instructions,
      completedAt: (assignment as any).completedAt,
      status: this.getAssignmentStatus(assignment),
    }));

    return transformedAssignments;
  }

  async markCompleted(assignmentId: string, studentUserId: string) {
    const assignment = await this.resourceAssignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['student', 'student.user'],
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    if ((assignment.student as any).id !== studentUserId) {
      throw new ForbiddenException('No tienes permisos para marcar esta asignación como completada');
    }

    if ((assignment as any).completedAt) {
      throw new BadRequestException('Esta asignación ya está marcada como completada');
    }

    (assignment as any).completedAt = new Date();
    await this.resourceAssignmentRepository.save(assignment);

    return {
      success: true,
      message: 'Asignación marcada como completada',
    };
  }

  async deleteAssignment(assignmentId: string, teacherId: string) {
    const assignment = await this.resourceAssignmentRepository.findOne({
      where: { id: assignmentId },
      relations: ['assignedBy'],
    });

    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    if (assignment.assignedBy.id !== teacherId) {
      throw new ForbiddenException('No tienes permisos para eliminar esta asignación');
    }

    await this.resourceAssignmentRepository.remove(assignment);

    return {
      success: true,
      message: 'Asignación eliminada correctamente',
    };
  }

  private getAssignmentStatus(assignment: ResourceAssignment): 'assigned' | 'completed' | 'overdue' {
    if ((assignment as any).completedAt) {
      return 'completed';
    }

    if (assignment.dueDate && assignment.dueDate < new Date()) {
      return 'overdue';
    }

    return 'assigned';
  }
}