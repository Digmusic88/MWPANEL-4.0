import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoordinationSheet } from './entities/coordination-sheet.entity';
import { CoordinationItem } from './entities/coordination-item.entity';
import { CreateCoordinationSheetDto } from './dto/create-coordination-sheet.dto';
import { UpdateCoordinationSheetDto } from './dto/update-coordination-sheet.dto';
import { CreateCoordinationItemDto } from './dto/create-coordination-item.dto';
import { UpdateCoordinationItemDto } from './dto/update-coordination-item.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class CoordinationService {
  constructor(
    @InjectRepository(CoordinationSheet)
    private readonly sheetRepository: Repository<CoordinationSheet>,
    @InjectRepository(CoordinationItem)
    private readonly itemRepository: Repository<CoordinationItem>,
    private readonly usersService: UsersService,
  ) {}

  async create(createDto: CreateCoordinationSheetDto, userId: string): Promise<CoordinationSheet> {
    // Validate that meeting_date is provided
    if (!createDto.meeting_date) {
      throw new BadRequestException('meeting_date is required');
    }

    const sheet = this.sheetRepository.create({
      ...createDto,
      created_by_id: userId,
      meeting_date: new Date(createDto.meeting_date),
    });

    return await this.sheetRepository.save(sheet);
  }

  async findAll(userId: string, userRole: string): Promise<CoordinationSheet[]> {
    try {
      console.log(`[DEBUG] CoordinationService.findAll called for user ${userId} (${userRole})`);
      
      // Simplified query to debug the issue
      const query = this.sheetRepository.createQueryBuilder('sheet')
        .orderBy('sheet.created_at', 'DESC');

      // If not admin, filter by visibility rules
      if (userRole !== 'admin') {
        query.where('(sheet.is_active = true OR sheet.created_by_id = :userId)', { userId });
      }

      console.log(`[DEBUG] Executing query...`);
      const sheets = await query.getMany();
      console.log(`[DEBUG] Query successful, found ${sheets.length} sheets`);
      
      return sheets;
    } catch (error) {
      console.error('[ERROR] CoordinationService.findAll failed:', error);
      throw error;
    }
  }

  private enrichSheetWithStats(sheet: CoordinationSheet): CoordinationSheet {
    // DEBUG: Log para diagnosticar el problema
    console.log(`[DEBUG] Processing sheet: ${sheet.title}`);
    console.log(`[DEBUG] Items array:`, sheet.items?.length || 0);
    console.log(`[DEBUG] Items data:`, sheet.items?.map(i => ({ id: i.id, title: i.item_title, completed: i.is_completed })) || []);

    if (!sheet.items) {
      sheet.items = [];
    }

    const totalItems = sheet.items.length;
    const completedItems = sheet.items.filter(item => item.is_completed).length;
    const pendingItems = totalItems - completedItems;
    const overdueItems = sheet.items.filter(item => {
      if (item.is_completed || !item.due_date) return false;
      return new Date(item.due_date) < new Date();
    }).length;

    // Calcular progreso actualizado
    const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Preservar la instancia de la entidad y solo agregar propiedades adicionales
    (sheet as any).progress_percentage = progressPercentage;
    (sheet as any).total_items = totalItems;
    (sheet as any).completed_items = completedItems;
    (sheet as any).pending_items = pendingItems;
    (sheet as any).overdue_items = overdueItems;

    console.log(`[DEBUG] Final stats for ${sheet.title}:`, {
      total_items: totalItems,
      completed_items: completedItems,
      pending_items: pendingItems,
      overdue_items: overdueItems,
      progress_percentage: progressPercentage
    });

    return sheet;
  }

  async findOne(id: string, userId: string): Promise<CoordinationSheet> {
    const sheet = await this.sheetRepository.findOne({
      where: { id },
      relations: ['created_by', 'created_by.profile', 'items', 'items.created_by', 'items.created_by.profile'],
    });

    if (!sheet) {
      throw new NotFoundException('Hoja de coordinación no encontrada');
    }

    if (!sheet.canView(userId)) {
      throw new ForbiddenException('No tienes permisos para ver esta hoja');
    }

    return this.enrichSheetWithStats(sheet);
  }

  async update(id: string, updateDto: UpdateCoordinationSheetDto, userId: string, userRole: string): Promise<CoordinationSheet> {
    const sheet = await this.findOne(id, userId);

    if (!sheet.canEdit(userId, userRole)) {
      throw new ForbiddenException('No tienes permisos para editar esta hoja');
    }

    Object.assign(sheet, updateDto);
    if (updateDto.meeting_date) {
      sheet.meeting_date = new Date(updateDto.meeting_date);
    }

    return await this.sheetRepository.save(sheet);
  }

  async remove(id: string, userId: string, userRole: string): Promise<void> {
    const sheet = await this.findOne(id, userId);

    if (userRole !== 'admin' && sheet.created_by_id !== userId) {
      throw new ForbiddenException('Solo el administrador o el creador pueden eliminar esta hoja');
    }

    await this.sheetRepository.remove(sheet);
  }

  async getStats(userId: string, userRole: string): Promise<any> {
    const sheets = await this.findAll(userId, userRole);
    
    let totalItems = 0;
    let completedItems = 0;
    let pendingItems = 0;
    let overdueItems = 0;
    const itemsByPriority = { low: 0, medium: 0, high: 0 };
    const itemsByAssignment = { all: 0, individual: 0, department: 0 };

    sheets.forEach(sheet => {
      if (sheet.items) {
        sheet.items.forEach(item => {
          totalItems++;
          if (item.is_completed) {
            completedItems++;
          } else {
            pendingItems++;
            if (item.isOverdue()) {
              overdueItems++;
            }
          }
          itemsByPriority[item.priority]++;
          itemsByAssignment[item.assignment_type]++;
        });
      }
    });

    const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      total_sheets: sheets.length,
      active_sheets: sheets.filter(s => s.is_active).length,
      total_items: totalItems,
      completed_items: completedItems,
      pending_items: pendingItems,
      overdue_items: overdueItems,
      overall_progress: overallProgress,
      items_by_priority: itemsByPriority,
      items_by_assignment: itemsByAssignment,
    };
  }

  // Coordination Items methods
  async createItem(createItemDto: CreateCoordinationItemDto, userId: string): Promise<CoordinationItem> {
    // Verify the sheet exists and user has permission to edit it
    const sheet = await this.findOne(createItemDto.sheet_id, userId);
    
    const item = this.itemRepository.create({
      ...createItemDto,
      created_by_id: userId,
      due_date: createItemDto.due_date ? new Date(createItemDto.due_date) : undefined,
      assigned_departments: createItemDto.assigned_departments || null,
    });

    const savedItem = await this.itemRepository.save(item);

    // If assigned to specific users, set the relations
    if (createItemDto.assignment_type === 'individual' && createItemDto.assigned_user_ids?.length) {
      savedItem.assigned_users = await this.usersService.findByIds(createItemDto.assigned_user_ids);
      await this.itemRepository.save(savedItem);
    }

    // If assigned to departments, the assigned_departments JSON field is already set
    // The frontend will handle displaying which departments are assigned

    return savedItem;
  }

  async findItemsBySheet(sheetId: string, userId: string, userRole: string): Promise<CoordinationItem[]> {
    // Verify access to the sheet first
    await this.findOne(sheetId, userId);

    // Get all items from the sheet
    const allItems = await this.itemRepository.find({
      where: { sheet_id: sheetId },
      relations: ['created_by', 'created_by.profile', 'completed_by', 'completed_by.profile', 'assigned_users', 'assigned_users.profile'],
      order: { order_index: 'ASC', created_at: 'ASC' },
    });

    // If admin, return all items
    if (userRole === 'admin') {
      return allItems;
    }

    // For non-admin users, get user's department and filter items
    const currentUser = await this.usersService.findOne(userId);
    const userDepartment = currentUser?.profile?.department;

    // Filter items based on assignment
    const filteredItems = allItems.filter(item => {
      return item.isAssignedTo(userId, userDepartment);
    });

    return filteredItems;
  }

  async findOneItem(id: string, userId: string): Promise<CoordinationItem> {
    const item = await this.itemRepository.findOne({
      where: { id },
      relations: ['sheet', 'created_by', 'created_by.profile', 'completed_by', 'completed_by.profile', 'assigned_users', 'assigned_users.profile'],
    });

    if (!item) {
      throw new NotFoundException('Item de coordinación no encontrado');
    }

    // Verify access to the sheet
    await this.findOne(item.sheet_id, userId);

    return item;
  }

  async updateItem(id: string, updateItemDto: UpdateCoordinationItemDto, userId: string, userRole: string): Promise<CoordinationItem> {
    const item = await this.findOneItem(id, userId);

    // Check if user can edit the item
    const sheet = await this.findOne(item.sheet_id, userId);
    
    // Verificar permisos directamente con la lógica de la hoja
    if (userRole !== 'admin' && 
        item.created_by_id !== userId && 
        !sheet.canEdit(userId, userRole)) {
      throw new ForbiddenException('No tienes permisos para editar este item');
    }

    Object.assign(item, updateItemDto);
    if (updateItemDto.due_date) {
      item.due_date = new Date(updateItemDto.due_date);
    }
    // Handle department assignment
    if (updateItemDto.assigned_departments !== undefined) {
      item.assigned_departments = updateItemDto.assigned_departments || null;
    }

    // Handle completion
    if (updateItemDto.is_completed !== undefined) {
      if (updateItemDto.is_completed && !item.is_completed) {
        item.complete(userId);
      } else if (!updateItemDto.is_completed && item.is_completed) {
        item.uncomplete();
      }
    }

    const savedItem = await this.itemRepository.save(item);

    // Update assigned users if provided
    if (updateItemDto.assigned_user_ids) {
      savedItem.assigned_users = await this.usersService.findByIds(updateItemDto.assigned_user_ids);
      await this.itemRepository.save(savedItem);
    }

    return savedItem;
  }

  async removeItem(id: string, userId: string, userRole: string): Promise<void> {
    const item = await this.findOneItem(id, userId);

    if (userRole !== 'admin' && item.created_by_id !== userId) {
      throw new ForbiddenException('Solo el administrador o el creador pueden eliminar este item');
    }

    await this.itemRepository.remove(item);
  }

  async toggleItemCompletion(id: string, userId: string, userRole: string): Promise<CoordinationItem> {
    const item = await this.findOneItem(id, userId);

    // Get user's department for permission checking
    const currentUser = await this.usersService.findOne(userId);
    const userDepartment = currentUser?.profile?.department;

    if (!item.canComplete(userId, userRole, userDepartment)) {
      throw new ForbiddenException('No tienes permisos para completar este item');
    }

    if (item.is_completed) {
      item.uncomplete();
    } else {
      item.complete(userId);
    }

    return await this.itemRepository.save(item);
  }

  async toggleActiveStatus(id: string, userId: string, userRole: string): Promise<CoordinationSheet> {
    const sheet = await this.findOne(id, userId);

    // Only admin or creator can toggle active status
    if (userRole !== 'admin' && sheet.created_by_id !== userId) {
      throw new ForbiddenException('Solo el administrador o el creador pueden cambiar el estado de la hoja');
    }

    sheet.is_active = !sheet.is_active;
    const updatedSheet = await this.sheetRepository.save(sheet);

    return this.enrichSheetWithStats(updatedSheet);
  }
}