import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomTab } from '../entities/custom-tab.entity';
import { Task } from '../entities/task.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { CreateCustomTabDto, UpdateCustomTabDto, AssignTaskToTabDto, BulkAssignTasksDto, ReorderTabsDto } from '../dto/custom-tab.dto';

@Injectable()
export class CustomTabsService {
  constructor(
    @InjectRepository(CustomTab)
    private customTabRepository: Repository<CustomTab>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
  ) {}

  async findAllByTeacher(teacherId: string): Promise<CustomTab[]> {
    console.log('🎯 CUSTOM TABS SERVICE: Finding tabs for teacher:', teacherId);
    
    const tabs = await this.customTabRepository.find({
      where: { 
        teacherId,
        isActive: true 
      },
      relations: ['tasks'],
      order: { 
        orderIndex: 'ASC',
        createdAt: 'ASC' 
      }
    });

    console.log('🎯 CUSTOM TABS SERVICE: Found tabs:', tabs.length);
    return tabs;
  }

  async findOne(id: string, teacherId: string): Promise<CustomTab> {
    const tab = await this.customTabRepository.findOne({
      where: { id, teacherId, isActive: true },
      relations: ['tasks']
    });

    if (!tab) {
      throw new NotFoundException('Pestaña personalizada no encontrada');
    }

    return tab;
  }

  async create(createTabDto: CreateCustomTabDto, teacherId: string): Promise<CustomTab> {
    console.log('🎯 CUSTOM TABS SERVICE: Creating tab for teacher:', teacherId);
    
    // Verificar que el profesor existe
    const teacher = await this.teacherRepository.findOne({
      where: { id: teacherId }
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    // Verificar si ya existe una pestaña con el mismo nombre
    const existingTab = await this.customTabRepository.findOne({
      where: { 
        name: createTabDto.name, 
        teacherId,
        isActive: true 
      }
    });

    if (existingTab) {
      throw new BadRequestException('Ya existe una pestaña con ese nombre');
    }

    // Calcular el siguiente orderIndex si no se proporciona
    if (createTabDto.orderIndex === undefined) {
      const maxOrder = await this.customTabRepository
        .createQueryBuilder('tab')
        .where('tab.teacherId = :teacherId', { teacherId })
        .andWhere('tab.isActive = :isActive', { isActive: true })
        .select('MAX(tab.orderIndex)', 'max')
        .getRawOne();
      
      createTabDto.orderIndex = (maxOrder?.max || 0) + 1;
    }

    const tab = this.customTabRepository.create({
      ...createTabDto,
      teacherId,
      color: createTabDto.color || '#1890ff',
      icon: createTabDto.icon || 'FolderOutlined',
      orderIndex: createTabDto.orderIndex,
      isDefault: createTabDto.isDefault || false
    });

    const savedTab = await this.customTabRepository.save(tab);
    console.log('🎯 CUSTOM TABS SERVICE: Tab created:', savedTab.id);
    
    return savedTab;
  }

  async update(id: string, updateTabDto: UpdateCustomTabDto, teacherId: string): Promise<CustomTab> {
    const tab = await this.findOne(id, teacherId);

    // Si se está cambiando el nombre, verificar que no exista otro con el mismo nombre
    if (updateTabDto.name && updateTabDto.name !== tab.name) {
      const existingTab = await this.customTabRepository.findOne({
        where: { 
          name: updateTabDto.name, 
          teacherId,
          isActive: true 
        }
      });

      if (existingTab && existingTab.id !== id) {
        throw new BadRequestException('Ya existe una pestaña con ese nombre');
      }
    }

    Object.assign(tab, updateTabDto);
    return await this.customTabRepository.save(tab);
  }

  async remove(id: string, teacherId: string): Promise<void> {
    const tab = await this.findOne(id, teacherId);

    // No permitir eliminar la pestaña por defecto
    if (tab.isDefault) {
      throw new BadRequestException('No se puede eliminar la pestaña por defecto');
    }

    // Soft delete: marcar como inactiva
    tab.isActive = false;
    await this.customTabRepository.save(tab);

    // Reasignar las tareas de esta pestaña a la pestaña por defecto
    const defaultTab = await this.customTabRepository.findOne({
      where: { teacherId, isDefault: true, isActive: true }
    });

    if (defaultTab) {
      await this.taskRepository.update(
        { customTabId: id },
        { customTabId: defaultTab.id }
      );
    } else {
      // Si no hay pestaña por defecto, quitar la asignación
      await this.taskRepository.update(
        { customTabId: id },
        { customTabId: null }
      );
    }
  }

  async assignTaskToTab(taskId: string, assignDto: AssignTaskToTabDto, teacherId: string): Promise<void> {
    console.log('🎯 CUSTOM TABS SERVICE: Assigning task to tab:', { taskId, customTabId: assignDto.customTabId });
    
    // Verificar que la tarea existe y pertenece al profesor
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['teacher']
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    if (task.teacher?.id !== teacherId) {
      throw new ForbiddenException('No tienes permisos para modificar esta tarea');
    }

    // Verificar que la pestaña existe y pertenece al profesor
    const tab = await this.findOne(assignDto.customTabId, teacherId);

    // Asignar la tarea a la pestaña
    task.customTabId = assignDto.customTabId;
    await this.taskRepository.save(task);
    
    console.log('🎯 CUSTOM TABS SERVICE: Task assigned successfully');
  }

  async unassignTaskFromTab(taskId: string, teacherId: string): Promise<void> {
    console.log('🎯 CUSTOM TABS SERVICE: Unassigning task from tab:', taskId);
    
    // Verificar que la tarea existe y pertenece al profesor
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['teacher']
    });

    if (!task) {
      throw new NotFoundException('Tarea no encontrada');
    }

    if (task.teacher?.id !== teacherId) {
      throw new ForbiddenException('No tienes permisos para modificar esta tarea');
    }

    // Quitar la asignación de pestaña
    task.customTabId = null;
    await this.taskRepository.save(task);
    
    console.log('🎯 CUSTOM TABS SERVICE: Task unassigned successfully');
  }

  async bulkAssignTasks(bulkAssignDto: BulkAssignTasksDto, teacherId: string): Promise<void> {
    console.log('🎯 CUSTOM TABS SERVICE: Bulk assigning tasks:', bulkAssignDto);
    
    // Verificar que la pestaña existe y pertenece al profesor
    const tab = await this.findOne(bulkAssignDto.customTabId, teacherId);

    // Verificar que todas las tareas existen y pertenecen al profesor
    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.teacher', 'teacher')
      .whereInIds(bulkAssignDto.taskIds)
      .getMany();

    if (tasks.length !== bulkAssignDto.taskIds.length) {
      throw new BadRequestException('Algunas tareas no fueron encontradas');
    }

    const unauthorizedTasks = tasks.filter(task => task.teacher?.id !== teacherId);
    if (unauthorizedTasks.length > 0) {
      throw new ForbiddenException('No tienes permisos para modificar algunas de estas tareas');
    }

    // Asignar todas las tareas a la pestaña
    await this.taskRepository
      .createQueryBuilder()
      .update(Task)
      .set({ customTabId: bulkAssignDto.customTabId })
      .whereInIds(bulkAssignDto.taskIds)
      .execute();
    
    console.log('🎯 CUSTOM TABS SERVICE: Bulk assignment completed');
  }

  async reorderTabs(reorderDto: ReorderTabsDto, teacherId: string): Promise<void> {
    console.log('🎯 CUSTOM TABS SERVICE: Reordering tabs:', reorderDto);
    
    // Verificar que todas las pestañas existen y pertenecen al profesor
    const tabs = await this.customTabRepository
      .createQueryBuilder('tab')
      .where('tab.id IN (:...ids)', { ids: reorderDto.tabIds })
      .andWhere('tab.teacherId = :teacherId', { teacherId })
      .andWhere('tab.isActive = :isActive', { isActive: true })
      .getMany();

    if (tabs.length !== reorderDto.tabIds.length) {
      throw new BadRequestException('Algunas pestañas no fueron encontradas');
    }

    // Actualizar el orderIndex de cada pestaña
    for (let i = 0; i < reorderDto.tabIds.length; i++) {
      await this.customTabRepository.update(
        { id: reorderDto.tabIds[i] },
        { orderIndex: i }
      );
    }
    
    console.log('🎯 CUSTOM TABS SERVICE: Tabs reordered successfully');
  }

  async ensureDefaultTab(teacherId: string): Promise<CustomTab> {
    // Buscar si ya existe una pestaña por defecto
    let defaultTab = await this.customTabRepository.findOne({
      where: { teacherId, isDefault: true, isActive: true }
    });

    if (!defaultTab) {
      // Crear la pestaña por defecto si no existe
      defaultTab = await this.create({
        name: 'Sin Asignatura',
        description: 'Tareas sin asignatura específica',
        color: '#faad14',
        icon: 'FolderOutlined',
        orderIndex: 0,
        isDefault: true
      }, teacherId);
    }

    return defaultTab;
  }
}