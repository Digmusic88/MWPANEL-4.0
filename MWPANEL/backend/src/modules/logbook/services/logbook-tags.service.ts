import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogbookTag } from '../entities/logbook-tag.entity';
import { CreateLogbookTagDto, UpdateLogbookTagDto } from '../dto/logbook-tag.dto';

@Injectable()
export class LogbookTagsService {
  constructor(
    @InjectRepository(LogbookTag)
    private readonly tagsRepository: Repository<LogbookTag>,
  ) {}

  async createTag(ownerUserId: string, createTagDto: CreateLogbookTagDto): Promise<LogbookTag> {
    // Verificar si ya existe una etiqueta con ese nombre para el usuario
    const existingTag = await this.tagsRepository.findOne({
      where: {
        ownerUserId,
        name: createTagDto.name.toLowerCase(), // Búsqueda case-insensitive
      },
    });

    if (existingTag) {
      throw new ConflictException(`Ya tienes una etiqueta llamada "${createTagDto.name}"`);
    }

    const tag = this.tagsRepository.create({
      ownerUserId,
      ...createTagDto,
    });

    return this.tagsRepository.save(tag);
  }

  async getTagsByUser(ownerUserId: string): Promise<LogbookTag[]> {
    return this.tagsRepository.find({
      where: { ownerUserId },
      order: { name: 'ASC' },
    });
  }

  async getTagById(id: string, ownerUserId: string): Promise<LogbookTag> {
    const tag = await this.tagsRepository.findOne({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('Etiqueta no encontrada');
    }

    if (tag.ownerUserId !== ownerUserId) {
      throw new ForbiddenException('No tienes permisos para acceder a esta etiqueta');
    }

    return tag;
  }

  async updateTag(id: string, ownerUserId: string, updateTagDto: UpdateLogbookTagDto): Promise<LogbookTag> {
    const tag = await this.getTagById(id, ownerUserId);

    // Si se está cambiando el nombre, verificar que no entre en conflicto
    if (updateTagDto.name && updateTagDto.name !== tag.name) {
      const existingTag = await this.tagsRepository.findOne({
        where: {
          ownerUserId,
          name: updateTagDto.name.toLowerCase(),
        },
      });

      if (existingTag && existingTag.id !== id) {
        throw new ConflictException(`Ya tienes una etiqueta llamada "${updateTagDto.name}"`);
      }
    }

    Object.assign(tag, updateTagDto);
    return this.tagsRepository.save(tag);
  }

  async deleteTag(id: string, ownerUserId: string): Promise<void> {
    const tag = await this.getTagById(id, ownerUserId);

    // Verificar si la etiqueta tiene entradas asociadas
    const entryCount = await this.tagsRepository
      .createQueryBuilder('tag')
      .leftJoin('tag.entries', 'entry')
      .where('tag.id = :id', { id })
      .getCount();

    if (entryCount > 0) {
      throw new ConflictException(
        'No se puede eliminar la etiqueta porque tiene entradas de bitácora asociadas'
      );
    }

    await this.tagsRepository.remove(tag);
  }

  async getTagUsageStats(ownerUserId: string): Promise<Array<{ tagId: string; tagName: string; entryCount: number }>> {
    const results = await this.tagsRepository
      .createQueryBuilder('tag')
      .leftJoin('tag.entries', 'entry')
      .select([
        'tag.id as tagId',
        'tag.name as tagName',
        'COUNT(entry.id) as entryCount'
      ])
      .where('tag.ownerUserId = :ownerUserId', { ownerUserId })
      .groupBy('tag.id, tag.name')
      .orderBy('entryCount', 'DESC')
      .getRawMany();

    return results.map(row => ({
      tagId: row.tagId,
      tagName: row.tagName,
      entryCount: parseInt(row.entryCount, 10),
    }));
  }

  async getPopularColors(): Promise<Array<{ colorHex: string; usage: number }>> {
    const results = await this.tagsRepository
      .createQueryBuilder('tag')
      .select([
        'tag.colorHex as colorHex',
        'COUNT(*) as usage'
      ])
      .groupBy('tag.colorHex')
      .orderBy('usage', 'DESC')
      .limit(10)
      .getRawMany();

    return results.map(row => ({
      colorHex: row.colorHex,
      usage: parseInt(row.usage, 10),
    }));
  }
}