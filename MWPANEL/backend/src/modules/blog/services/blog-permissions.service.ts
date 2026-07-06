import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BlogPublishingPermission } from '../entities/blog-publishing-permission.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { ClassGroup } from '../../students/entities/class-group.entity';

@Injectable()
export class BlogPermissionsService {
  constructor(
    @InjectRepository(BlogPublishingPermission)
    private readonly permissionRepository: Repository<BlogPublishingPermission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ClassGroup)
    private readonly classGroupRepository: Repository<ClassGroup>,
  ) {}

  /**
   * Obtener todos los permisos de publicación
   */
  async findAll(): Promise<BlogPublishingPermission[]> {
    return this.permissionRepository.find({
      relations: ['teacher', 'teacher.profile', 'classGroup'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Obtener los grupos permitidos para un profesor
   */
  async getTeacherAllowedGroups(teacherId: string): Promise<ClassGroup[]> {
    const permissions = await this.permissionRepository.find({
      where: { teacherId },
      relations: ['classGroup'],
    });

    return permissions.map(p => p.classGroup);
  }

  /**
   * Obtener IDs de grupos permitidos para un profesor
   */
  async getTeacherAllowedGroupIds(teacherId: string): Promise<string[]> {
    const permissions = await this.permissionRepository.find({
      where: { teacherId },
      select: ['classGroupId'],
    });

    return permissions.map(p => p.classGroupId);
  }

  /**
   * Verificar si un profesor puede publicar en un grupo específico
   */
  async canTeacherPublishToGroup(teacherId: string, classGroupId: string): Promise<boolean> {
    const permission = await this.permissionRepository.findOne({
      where: { teacherId, classGroupId },
    });

    return !!permission;
  }

  /**
   * Verificar si un profesor puede publicar en varios grupos
   */
  async canTeacherPublishToGroups(teacherId: string, classGroupIds: string[]): Promise<boolean> {
    if (!classGroupIds || classGroupIds.length === 0) {
      return true; // No hay grupos específicos, permitido
    }

    const allowedGroupIds = await this.getTeacherAllowedGroupIds(teacherId);

    // Verificar que todos los grupos solicitados están permitidos
    return classGroupIds.every(groupId => allowedGroupIds.includes(groupId));
  }

  /**
   * Obtener permisos de un profesor específico
   */
  async getTeacherPermissions(teacherId: string): Promise<{
    teacher: User;
    allowedGroups: ClassGroup[];
  }> {
    const teacher = await this.userRepository.findOne({
      where: { id: teacherId },
      relations: ['profile'],
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    const allowedGroups = await this.getTeacherAllowedGroups(teacherId);

    return { teacher, allowedGroups };
  }

  /**
   * Crear permisos para un profesor
   */
  async createPermissions(
    teacherId: string,
    classGroupIds: string[],
    createdById: string,
  ): Promise<BlogPublishingPermission[]> {
    // Verificar que el profesor existe y tiene rol de profesor
    const teacher = await this.userRepository.findOne({
      where: { id: teacherId },
    });

    if (!teacher) {
      throw new NotFoundException('Profesor no encontrado');
    }

    if (teacher.role !== UserRole.TEACHER && teacher.role !== UserRole.ADMIN) {
      throw new BadRequestException('El usuario debe ser profesor o administrador');
    }

    // Verificar que los grupos existen
    const groups = await this.classGroupRepository.find({
      where: { id: In(classGroupIds) },
    });

    if (groups.length !== classGroupIds.length) {
      throw new BadRequestException('Algunos grupos de clase no existen');
    }

    // Crear permisos (ignorando duplicados)
    const permissions: BlogPublishingPermission[] = [];

    for (const classGroupId of classGroupIds) {
      // Verificar si ya existe
      const existing = await this.permissionRepository.findOne({
        where: { teacherId, classGroupId },
      });

      if (!existing) {
        const permission = this.permissionRepository.create({
          teacherId,
          classGroupId,
          createdById,
        });
        permissions.push(await this.permissionRepository.save(permission));
      }
    }

    return permissions;
  }

  /**
   * Actualizar permisos de un profesor (reemplaza todos los existentes)
   */
  async setTeacherPermissions(
    teacherId: string,
    classGroupIds: string[],
    updatedById: string,
  ): Promise<BlogPublishingPermission[]> {
    // Eliminar permisos existentes
    await this.permissionRepository.delete({ teacherId });

    // Si no hay grupos, solo eliminar
    if (!classGroupIds || classGroupIds.length === 0) {
      return [];
    }

    // Crear nuevos permisos
    return this.createPermissions(teacherId, classGroupIds, updatedById);
  }

  /**
   * Eliminar un permiso específico
   */
  async deletePermission(permissionId: string): Promise<void> {
    const permission = await this.permissionRepository.findOne({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new NotFoundException('Permiso no encontrado');
    }

    await this.permissionRepository.remove(permission);
  }

  /**
   * Eliminar todos los permisos de un profesor
   */
  async deleteAllTeacherPermissions(teacherId: string): Promise<void> {
    await this.permissionRepository.delete({ teacherId });
  }

  /**
   * Obtener todos los profesores con sus permisos
   */
  async getAllTeachersWithPermissions(): Promise<{
    teacherId: string;
    teacherName: string;
    teacherEmail: string;
    allowedGroups: { id: string; name: string }[];
  }[]> {
    // Obtener todos los profesores
    const teachers = await this.userRepository.find({
      where: { role: UserRole.TEACHER, isActive: true },
      relations: ['profile'],
    });

    const result = [];

    for (const teacher of teachers) {
      const permissions = await this.permissionRepository.find({
        where: { teacherId: teacher.id },
        relations: ['classGroup'],
      });

      result.push({
        teacherId: teacher.id,
        teacherName: teacher.profile
          ? `${teacher.profile.firstName} ${teacher.profile.lastName}`
          : teacher.email,
        teacherEmail: teacher.email,
        allowedGroups: permissions.map(p => ({
          id: p.classGroup.id,
          name: p.classGroup.name,
        })),
      });
    }

    return result;
  }
}
