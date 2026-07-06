import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemAnnouncement } from '../entities/system-announcement.entity';
import { UserRole } from '../../users/entities/user.entity';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';
import { UpdateAnnouncementDto } from '../dto/update-announcement.dto';

@Injectable()
export class SystemAnnouncementService {
  constructor(
    @InjectRepository(SystemAnnouncement)
    private readonly announcementRepository: Repository<SystemAnnouncement>,
  ) {}

  /**
   * Crear un nuevo anuncio del sistema
   */
  async create(createDto: CreateAnnouncementDto, userId: string): Promise<SystemAnnouncement> {
    const announcement = this.announcementRepository.create({
      ...createDto,
      createdById: userId,
    });

    return this.announcementRepository.save(announcement);
  }

  /**
   * Obtener todos los anuncios (admin)
   */
  async findAll(): Promise<SystemAnnouncement[]> {
    return this.announcementRepository.find({
      relations: ['createdBy'],
      order: {
        priority: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Obtener anuncios activos para un rol específico
   */
  async findActiveForRole(role: UserRole): Promise<SystemAnnouncement[]> {
    return this.announcementRepository
      .createQueryBuilder('announcement')
      .where('announcement.isActive = :isActive', { isActive: true })
      .andWhere(':role = ANY(announcement.targetRoles)', { role })
      .orderBy('announcement.priority', 'DESC')
      .addOrderBy('announcement.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Obtener un anuncio por ID
   */
  async findOne(id: string): Promise<SystemAnnouncement> {
    const announcement = await this.announcementRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!announcement) {
      throw new NotFoundException(`Anuncio con ID ${id} no encontrado`);
    }

    return announcement;
  }

  /**
   * Actualizar un anuncio
   */
  async update(id: string, updateDto: UpdateAnnouncementDto): Promise<SystemAnnouncement> {
    const announcement = await this.findOne(id);

    Object.assign(announcement, updateDto);

    return this.announcementRepository.save(announcement);
  }

  /**
   * Eliminar un anuncio
   */
  async remove(id: string): Promise<void> {
    const announcement = await this.findOne(id);
    await this.announcementRepository.remove(announcement);
  }

  /**
   * Activar/desactivar un anuncio
   */
  async toggleActive(id: string): Promise<SystemAnnouncement> {
    const announcement = await this.findOne(id);
    announcement.isActive = !announcement.isActive;
    return this.announcementRepository.save(announcement);
  }
}
