/**
 * @archivo: staff-tags.service.ts
 * @modulo: Staff (Claustro)
 * @funcion: Servicio para gestion de etiquetas de tareas
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffTag } from '../entities/staff-tag.entity';
import { CreateStaffTagDto, UpdateStaffTagDto } from '../dto/staff-tag.dto';

@Injectable()
export class StaffTagsService {
  constructor(
    @InjectRepository(StaffTag)
    private readonly tagRepository: Repository<StaffTag>,
  ) {}

  async create(dto: CreateStaffTagDto): Promise<StaffTag> {
    // Check for duplicate name
    const existing = await this.tagRepository.findOne({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Tag with name "${dto.name}" already exists`);
    }

    const tag = this.tagRepository.create(dto);
    return this.tagRepository.save(tag);
  }

  async findAll(): Promise<StaffTag[]> {
    return this.tagRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<StaffTag> {
    const tag = await this.tagRepository.findOne({
      where: { id },
      relations: ['tasks'],
    });

    if (!tag) {
      throw new NotFoundException(`Tag with ID ${id} not found`);
    }

    return tag;
  }

  async update(id: string, dto: UpdateStaffTagDto): Promise<StaffTag> {
    const tag = await this.findOne(id);

    // Check for duplicate name if updating name
    if (dto.name && dto.name !== tag.name) {
      const existing = await this.tagRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new ConflictException(`Tag with name "${dto.name}" already exists`);
      }
    }

    Object.assign(tag, dto);
    return this.tagRepository.save(tag);
  }

  async delete(id: string): Promise<void> {
    const tag = await this.findOne(id);
    await this.tagRepository.remove(tag);
  }
}
