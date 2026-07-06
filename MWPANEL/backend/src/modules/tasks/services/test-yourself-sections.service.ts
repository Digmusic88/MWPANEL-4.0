/**
 * @archivo: test-yourself-sections.service.ts
 * @módulo: Tasks - Servicio de Secciones Test Yourself
 * @función: Gestión de secciones personalizadas para organizar Test Yourself
 * @crítico: SÍ - Core del sistema de organización libre
 */

import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { TestYourselfSection } from '../entities/test-yourself-section.entity';
import { TestYourselfSectionAssignment } from '../entities/test-yourself-section-assignment.entity';
import { Task, TaskType } from '../entities/task.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import {
  CreateTestYourselfSectionDto,
  UpdateTestYourselfSectionDto,
  AssignTaskToSectionDto,
  BulkAssignTasksDto,
  ReorderSectionTasksDto,
} from '../dto/test-yourself-section.dto';

@Injectable()
export class TestYourselfSectionsService {
  constructor(
    @InjectRepository(TestYourselfSection)
    private sectionsRepository: Repository<TestYourselfSection>,
    @InjectRepository(TestYourselfSectionAssignment)
    private assignmentsRepository: Repository<TestYourselfSectionAssignment>,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    private dataSource: DataSource,
  ) {}

  /**
   * Obtener todas las secciones de un profesor con sus tareas asignadas
   */
  async getTeacherSections(userId: string): Promise<TestYourselfSection[]> {
    const teacher = await this.getTeacherByUserId(userId);

    return this.sectionsRepository.find({
      where: { teacherId: teacher.id, isActive: true },
      relations: ['assignments', 'assignments.task', 'assignments.task.subjectAssignment', 'assignments.task.subjectAssignment.subject'],
      order: { orderIndex: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * Crear nueva sección personalizada
   */
  async createSection(userId: string, createDto: CreateTestYourselfSectionDto): Promise<TestYourselfSection> {
    const teacher = await this.getTeacherByUserId(userId);

    // Verificar que no existe una sección con el mismo nombre para este profesor
    const existingSection = await this.sectionsRepository.findOne({
      where: { teacherId: teacher.id, name: createDto.name, isActive: true },
    });

    if (existingSection) {
      throw new ConflictException('Ya existe una sección con ese nombre');
    }

    // Si no se especifica orderIndex, usar el siguiente disponible
    if (createDto.orderIndex === undefined) {
      const maxOrder = await this.sectionsRepository
        .createQueryBuilder('section')
        .select('MAX(section.orderIndex)', 'maxOrder')
        .where('section.teacherId = :teacherId', { teacherId: teacher.id })
        .getRawOne();
      
      createDto.orderIndex = (maxOrder.maxOrder || 0) + 1;
    }

    const section = this.sectionsRepository.create({
      ...createDto,
      teacherId: teacher.id,
    });

    return this.sectionsRepository.save(section);
  }

  /**
   * Actualizar sección existente
   */
  async updateSection(userId: string, sectionId: string, updateDto: UpdateTestYourselfSectionDto): Promise<TestYourselfSection> {
    const teacher = await this.getTeacherByUserId(userId);
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId, teacherId: teacher.id, isActive: true },
    });

    if (!section) {
      throw new NotFoundException('Sección no encontrada');
    }

    // Si se está cambiando el nombre, verificar que no existe otra con el mismo nombre
    if (updateDto.name && updateDto.name !== section.name) {
      const existingSection = await this.sectionsRepository.findOne({
        where: { teacherId: teacher.id, name: updateDto.name, isActive: true },
      });

      if (existingSection) {
        throw new ConflictException('Ya existe una sección con ese nombre');
      }
    }

    Object.assign(section, updateDto);
    return this.sectionsRepository.save(section);
  }

  /**
   * Eliminar sección (soft delete)
   */
  async deleteSection(userId: string, sectionId: string): Promise<void> {
    const teacher = await this.getTeacherByUserId(userId);
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId, teacherId: teacher.id, isActive: true },
    });

    if (!section) {
      throw new NotFoundException('Sección no encontrada');
    }

    // Eliminar todas las asignaciones de la sección
    await this.assignmentsRepository.delete({ sectionId });

    // Soft delete de la sección
    section.isActive = false;
    await this.sectionsRepository.save(section);
  }

  /**
   * Asignar Test Yourself a una sección
   */
  async assignTaskToSection(userId: string, taskId: string, assignDto: AssignTaskToSectionDto): Promise<TestYourselfSectionAssignment> {
    const teacher = await this.getTeacherByUserId(userId);

    // Verificar que la tarea existe y es del profesor
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, teacherId: teacher.id, taskType: TaskType.EXAM },
    });

    if (!task) {
      throw new NotFoundException('Test Yourself no encontrado');
    }

    // Verificar que la sección existe y es del profesor
    const section = await this.sectionsRepository.findOne({
      where: { id: assignDto.sectionId, teacherId: teacher.id, isActive: true },
    });

    if (!section) {
      throw new NotFoundException('Sección no encontrada');
    }

    // Verificar que la tarea no está ya asignada a otra sección
    const existingAssignment = await this.assignmentsRepository.findOne({
      where: { taskId },
    });

    if (existingAssignment) {
      // Si está en la misma sección, no hacer nada
      if (existingAssignment.sectionId === assignDto.sectionId) {
        return existingAssignment;
      }
      // Si está en otra sección, moverla
      await this.assignmentsRepository.delete({ taskId });
    }

    // Si no se especifica orderIndex, usar el siguiente disponible en la sección
    if (assignDto.orderIndex === undefined) {
      const maxOrder = await this.assignmentsRepository
        .createQueryBuilder('assignment')
        .select('MAX(assignment.orderIndex)', 'maxOrder')
        .where('assignment.sectionId = :sectionId', { sectionId: assignDto.sectionId })
        .getRawOne();
      
      assignDto.orderIndex = (maxOrder.maxOrder || 0) + 1;
    }

    const assignment = this.assignmentsRepository.create({
      taskId,
      sectionId: assignDto.sectionId,
      orderIndex: assignDto.orderIndex,
      assignedBy: teacher.id,
    });

    return this.assignmentsRepository.save(assignment);
  }

  /**
   * Remover Test Yourself de una sección
   */
  async removeTaskFromSection(userId: string, taskId: string): Promise<void> {
    const teacher = await this.getTeacherByUserId(userId);

    // Verificar que la tarea es del profesor
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, teacherId: teacher.id, taskType: TaskType.EXAM },
    });

    if (!task) {
      throw new NotFoundException('Test Yourself no encontrado');
    }

    await this.assignmentsRepository.delete({ taskId });
  }

  /**
   * Asignación masiva de Test Yourself a una sección
   */
  async bulkAssignTasks(userId: string, bulkDto: BulkAssignTasksDto): Promise<TestYourselfSectionAssignment[]> {
    const teacher = await this.getTeacherByUserId(userId);

    // Verificar que la sección existe
    const section = await this.sectionsRepository.findOne({
      where: { id: bulkDto.sectionId, teacherId: teacher.id, isActive: true },
    });

    if (!section) {
      throw new NotFoundException('Sección no encontrada');
    }

    // Verificar que todas las tareas existen y son del profesor
    const tasks = await this.tasksRepository.find({
      where: { id: bulkDto.taskIds as any, teacherId: teacher.id, taskType: TaskType.EXAM },
    });

    if (tasks.length !== bulkDto.taskIds.length) {
      throw new NotFoundException('Uno o más Test Yourself no encontrados');
    }

    const assignments: TestYourselfSectionAssignment[] = [];

    // Obtener el orderIndex inicial
    const maxOrder = await this.assignmentsRepository
      .createQueryBuilder('assignment')
      .select('MAX(assignment.orderIndex)', 'maxOrder')
      .where('assignment.sectionId = :sectionId', { sectionId: bulkDto.sectionId })
      .getRawOne();
    
    let currentOrder = (maxOrder.maxOrder || 0) + 1;

    for (const taskId of bulkDto.taskIds) {
      // Eliminar asignación existente si existe
      await this.assignmentsRepository.delete({ taskId });

      const assignment = this.assignmentsRepository.create({
        taskId,
        sectionId: bulkDto.sectionId,
        orderIndex: currentOrder++,
        assignedBy: teacher.id,
      });

      assignments.push(await this.assignmentsRepository.save(assignment));
    }

    return assignments;
  }

  /**
   * Reordenar Test Yourself dentro de una sección
   */
  async reorderSectionTasks(userId: string, sectionId: string, reorderDto: ReorderSectionTasksDto): Promise<void> {
    const teacher = await this.getTeacherByUserId(userId);

    // Verificar que la sección existe
    const section = await this.sectionsRepository.findOne({
      where: { id: sectionId, teacherId: teacher.id, isActive: true },
    });

    if (!section) {
      throw new NotFoundException('Sección no encontrada');
    }

    // Verificar que todas las tareas están asignadas a esta sección
    const assignments = await this.assignmentsRepository.find({
      where: { sectionId, taskId: reorderDto.taskIds as any },
    });

    if (assignments.length !== reorderDto.taskIds.length) {
      throw new NotFoundException('Una o más tareas no están asignadas a esta sección');
    }

    // Actualizar orderIndex de cada tarea
    for (let i = 0; i < reorderDto.taskIds.length; i++) {
      await this.assignmentsRepository.update(
        { taskId: reorderDto.taskIds[i], sectionId },
        { orderIndex: i }
      );
    }
  }

  /**
   * Obtener Test Yourself sin asignar a ninguna sección
   */
  async getUnassignedTasks(userId: string): Promise<Task[]> {
    const teacher = await this.getTeacherByUserId(userId);

    // Obtener task IDs que están asignados a alguna sección
    const assignedTasksSubquery = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .select('assignment.taskId')
      .where('assignment.taskId IS NOT NULL');

    return this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.subjectAssignment', 'subjectAssignment')
      .leftJoinAndSelect('subjectAssignment.subject', 'subject')
      .leftJoinAndSelect('subjectAssignment.classGroup', 'classGroup')
      .where('task.teacherId = :teacherId', { teacherId: teacher.id })
      .andWhere('task.taskType = :taskType', { taskType: TaskType.EXAM })
      .andWhere('task.isActive = :isActive', { isActive: true })
      .andWhere(`task.id NOT IN (${assignedTasksSubquery.getQuery()})`)
      .setParameters(assignedTasksSubquery.getParameters())
      .orderBy('task.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Obtener profesor por user ID
   */
  private async getTeacherByUserId(userId: string): Promise<Teacher> {
    const teacher = await this.teachersRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    return teacher;
  }
}