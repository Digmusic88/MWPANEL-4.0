import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In, Not } from 'typeorm';
import { RubricFolder } from '../entities/rubric-folder.entity';
import { Rubric } from '../entities/rubric.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { User } from '../../users/entities/user.entity';
import { 
  CreateRubricFolderDto, 
  UpdateRubricFolderDto, 
  MoveRubricToFolderDto,
  BulkMoveRubricsDto,
  RubricFolderStatsDto,
  FolderTreeDto 
} from '../dto/rubric-folder.dto';

@Injectable()
export class RubricFoldersService {
  constructor(
    @InjectRepository(RubricFolder)
    private foldersRepository: Repository<RubricFolder>,
    @InjectRepository(Rubric)
    private rubricsRepository: Repository<Rubric>,
    @InjectRepository(Teacher)
    private teachersRepository: Repository<Teacher>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  // ==================== CRUD CARPETAS ====================

  /**
   * Obtener todas las carpetas del profesor
   */
  async findAll(userId: string, includeShared: boolean = false): Promise<RubricFolder[]> {
    // Obtener el profesor por ID de usuario
    const teacher = await this.getTeacherByUserId(userId);

    const query = this.foldersRepository.createQueryBuilder('folder')
      .leftJoinAndSelect('folder.teacher', 'teacher')
      .leftJoinAndSelect('folder.subfolders', 'subfolders')
      .leftJoinAndSelect('folder.rubrics', 'rubrics', 'rubrics.isActive = :rubricActive')
      .where('folder.isActive = :isActive', { isActive: true })
      .andWhere('folder.teacherId = :teacherId', { teacherId: teacher.id })
      .setParameter('rubricActive', true)
      .orderBy('folder.orderIndex', 'ASC');

    if (includeShared) {
      query.orWhere(':teacherId = ANY(folder.sharedWith)', { teacherId: teacher.id });
    }

    return await query.getMany();
  }

  /**
   * Obtener árbol jerárquico de carpetas
   */
  async getFolderTree(userId: string): Promise<FolderTreeDto[]> {
    const teacher = await this.getTeacherByUserId(userId);
    
    const folders = await this.foldersRepository.find({
      where: { 
        teacherId: teacher.id, 
        isActive: true 
      },
      relations: ['rubrics'],
      order: { orderIndex: 'ASC' }
    });

    return this.buildFolderTree(folders, null);
  }

  /**
   * Construir árbol jerárquico recursivamente
   */
  private buildFolderTree(folders: RubricFolder[], parentId: string | null): FolderTreeDto[] {
    return folders
      .filter(folder => folder.parentFolderId === parentId)
      .map(folder => ({
        id: folder.id,
        name: folder.name,
        description: folder.description,
        color: folder.color,
        icon: folder.icon,
        isSystemFolder: folder.isSystemFolder,
        orderIndex: folder.orderIndex,
        rubricsCount: folder.rubrics?.length || 0,
        children: this.buildFolderTree(folders, folder.id)
      }));
  }

  /**
   * Obtener carpeta por ID
   */
  async findOne(id: string, userId: string): Promise<RubricFolder> {
    const teacher = await this.getTeacherByUserId(userId);

    const folder = await this.foldersRepository.findOne({
      where: { 
        id, 
        isActive: true,
        teacherId: teacher.id 
      },
      relations: ['teacher', 'subfolders', 'rubrics']
    });

    if (!folder) {
      throw new NotFoundException('Carpeta no encontrada');
    }

    return folder;
  }

  /**
   * Crear nueva carpeta
   */
  async create(createFolderDto: CreateRubricFolderDto, userId: string): Promise<RubricFolder> {
    const teacher = await this.getTeacherByUserId(userId);

    // Validar carpeta padre si se especifica
    if (createFolderDto.parentFolderId) {
      await this.validateFolderExists(createFolderDto.parentFolderId, teacher.id);
    }

    // Crear carpeta
    const folder = this.foldersRepository.create({
      ...createFolderDto,
      teacherId: teacher.id,
      isShared: createFolderDto.isShared || false,
      orderIndex: createFolderDto.orderIndex || 0,
      isSystemFolder: false,
      isActive: true,
    });

    return await this.foldersRepository.save(folder);
  }

  /**
   * Actualizar carpeta existente
   */
  async update(id: string, updateFolderDto: UpdateRubricFolderDto, userId: string): Promise<RubricFolder> {
    const teacher = await this.getTeacherByUserId(userId);

    // Verificar que la carpeta existe y pertenece al profesor
    const folder = await this.findOne(id, userId);

    // Validar carpeta padre si se especifica
    if (updateFolderDto.parentFolderId) {
      // Evitar referencias circulares
      await this.validateNoCircularReference(id, updateFolderDto.parentFolderId);
      await this.validateFolderExists(updateFolderDto.parentFolderId, teacher.id);
    }

    // Actualizar carpeta
    await this.foldersRepository.update(id, updateFolderDto);
    
    return await this.findOne(id, userId);
  }

  /**
   * Eliminar carpeta (soft delete)
   */
  async remove(id: string, userId: string): Promise<{ message: string }> {
    const folder = await this.findOne(id, userId);

    // No permitir eliminar carpetas del sistema
    if (folder.isSystemFolder) {
      throw new BadRequestException('No se puede eliminar una carpeta del sistema');
    }

    // Verificar si la carpeta tiene subcarpetas o rúbricas
    const hasSubfolders = await this.foldersRepository.count({
      where: { parentFolderId: id, isActive: true }
    });

    const hasRubrics = await this.rubricsRepository.count({
      where: { folderId: id, isActive: true }
    });

    if (hasSubfolders > 0 || hasRubrics > 0) {
      throw new BadRequestException('No se puede eliminar una carpeta que contiene subcarpetas o rúbricas');
    }

    // Soft delete
    await this.foldersRepository.update(id, { isActive: false });

    return { message: 'Carpeta eliminada exitosamente' };
  }

  // ==================== OPERACIONES CON RÚBRICAS ====================

  /**
   * Mover rúbrica a carpeta
   */
  async moveRubricToFolder(moveDto: MoveRubricToFolderDto, userId: string): Promise<Rubric> {
    const teacher = await this.getTeacherByUserId(userId);

    // Verificar que la rúbrica existe y pertenece al profesor
    const rubric = await this.rubricsRepository.findOne({
      where: { 
        id: moveDto.rubricId, 
        teacherId: teacher.id, 
        isActive: true 
      }
    });

    if (!rubric) {
      throw new NotFoundException('Rúbrica no encontrada o no tienes permisos para moverla');
    }

    // Si se especifica carpeta destino, verificar que existe y es accesible
    if (moveDto.folderId) {
      await this.validateFolderExists(moveDto.folderId, teacher.id);
    }

    // Actualizar la rúbrica
    await this.rubricsRepository.update(moveDto.rubricId, {
      folderId: moveDto.folderId || null
    });

    // Retornar rúbrica actualizada
    return await this.rubricsRepository.findOne({
      where: { id: moveDto.rubricId },
      relations: ['folder', 'criteria', 'levels', 'cells']
    });
  }

  /**
   * Mover múltiples rúbricas a carpeta
   */
  async bulkMoveRubrics(bulkMoveDto: BulkMoveRubricsDto, userId: string): Promise<Rubric[]> {
    const teacher = await this.getTeacherByUserId(userId);

    // Verificar que todas las rúbricas existen y pertenecen al profesor
    const rubrics = await this.rubricsRepository.find({
      where: { 
        id: In(bulkMoveDto.rubricIds),
        teacherId: teacher.id,
        isActive: true 
      }
    });

    if (rubrics.length !== bulkMoveDto.rubricIds.length) {
      throw new BadRequestException('Una o más rúbricas no fueron encontradas o no tienes permisos para moverlas');
    }

    // Si se especifica carpeta destino, verificar que existe
    if (bulkMoveDto.folderId) {
      await this.validateFolderExists(bulkMoveDto.folderId, teacher.id);
    }

    // Actualizar todas las rúbricas
    await this.rubricsRepository.update(
      { id: In(bulkMoveDto.rubricIds) },
      { folderId: bulkMoveDto.folderId || null }
    );

    // Retornar rúbricas actualizadas
    return await this.rubricsRepository.find({
      where: { id: In(bulkMoveDto.rubricIds) },
      relations: ['folder']
    });
  }

  /**
   * Obtener estadísticas de una carpeta
   */
  async getFolderStats(id: string, userId: string): Promise<RubricFolderStatsDto> {
    const folder = await this.findOne(id, userId);

    // Contar rúbricas directas
    const directRubrics = await this.rubricsRepository.count({
      where: { folderId: id, isActive: true }
    });

    // Contar subcarpetas
    const subfolders = await this.foldersRepository.count({
      where: { parentFolderId: id, isActive: true }
    });

    // Contar rúbricas totales (recursivo)
    const totalRubrics = await this.countRubricsRecursive(id);

    return {
      id: folder.id,
      name: folder.name,
      directRubrics,
      totalRubrics,
      subfolders,
      lastModified: folder.updatedAt
    };
  }

  // ==================== MÉTODOS AUXILIARES ====================

  /**
   * Obtener profesor por ID de usuario
   */
  private async getTeacherByUserId(userId: string): Promise<Teacher> {
    // Check if user is admin
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === 'admin') {
      // For admin, get the first teacher or create a virtual one
      const firstTeacher = await this.teachersRepository.findOne({});
      if (!firstTeacher) {
        throw new BadRequestException('No hay profesores disponibles en el sistema');
      }
      return firstTeacher;
    } else {
      // Regular teacher flow
      const teacher = await this.teachersRepository.findOne({
        where: { user: { id: userId } },
        relations: ['user']
      });

      if (!teacher) {
        throw new NotFoundException('Perfil de profesor no encontrado para este usuario');
      }

      return teacher;
    }
  }

  /**
   * Validar que una carpeta existe y es accesible
   */
  private async validateFolderExists(folderId: string, teacherId: string): Promise<void> {
    const folder = await this.foldersRepository.findOne({
      where: { 
        id: folderId, 
        teacherId, 
        isActive: true 
      }
    });

    if (!folder) {
      throw new NotFoundException('Carpeta destino no encontrada o no tienes permisos para acceder a ella');
    }
  }

  /**
   * Validar que no se cree una referencia circular
   */
  private async validateNoCircularReference(folderId: string, parentFolderId: string): Promise<void> {
    if (folderId === parentFolderId) {
      throw new BadRequestException('Una carpeta no puede ser su propia carpeta padre');
    }

    // Verificar recursivamente que no se cree un ciclo
    let currentParent = parentFolderId;
    const visited = new Set<string>();

    while (currentParent) {
      if (visited.has(currentParent)) {
        throw new BadRequestException('Se detectó una referencia circular en la jerarquía de carpetas');
      }

      if (currentParent === folderId) {
        throw new BadRequestException('No se puede mover una carpeta dentro de sí misma o sus subcarpetas');
      }

      visited.add(currentParent);
      
      const parentFolder = await this.foldersRepository.findOne({
        where: { id: currentParent, isActive: true },
        select: ['parentFolderId']
      });

      currentParent = parentFolder?.parentFolderId || null;
    }
  }

  /**
   * Contar rúbricas recursivamente en una carpeta y subcarpetas
   */
  private async countRubricsRecursive(folderId: string): Promise<number> {
    // Contar rúbricas directas
    let count = await this.rubricsRepository.count({
      where: { folderId, isActive: true }
    });

    // Obtener subcarpetas
    const subfolders = await this.foldersRepository.find({
      where: { parentFolderId: folderId, isActive: true },
      select: ['id']
    });

    // Contar rúbricas en subcarpetas recursivamente
    for (const subfolder of subfolders) {
      count += await this.countRubricsRecursive(subfolder.id);
    }

    return count;
  }
}