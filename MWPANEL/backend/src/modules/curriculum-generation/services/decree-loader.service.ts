import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Cycle } from '../../students/entities/cycle.entity';
import { Course } from '../../students/entities/course.entity';

type DecreeKey = 'infantil' | 'primaria' | 'secundaria';

@Injectable()
export class DecreeLoaderService {
  private cache: Partial<Record<DecreeKey, string>> = {};
  constructor(
    @InjectRepository(Cycle) private readonly cycleRepo: Repository<Cycle>,
    @InjectRepository(Course) private readonly courseRepo: Repository<Course>,
  ) {}

  private keyFromLevelName(name: string): DecreeKey {
    const n = (name || '').toLowerCase();
    if (n.includes('infantil')) return 'infantil';
    if (n.includes('primaria')) return 'primaria';
    return 'secundaria';
  }

  async resolveScope(scopeType: 'cycle' | 'course', scopeId: string) {
    let level: any; let scopeLabel = '';
    if (scopeType === 'course') {
      const course = await this.courseRepo.findOne({ where: { id: scopeId }, relations: ['cycle', 'cycle.educationalLevel'] });
      if (!course) throw new NotFoundException('Curso no encontrado');
      level = (course.cycle as any)?.educationalLevel;
      scopeLabel = course.name;
    } else {
      const cycle = await this.cycleRepo.findOne({ where: { id: scopeId }, relations: ['educationalLevel'] });
      if (!cycle) throw new NotFoundException('Ciclo no encontrado');
      level = (cycle as any).educationalLevel;
      scopeLabel = cycle.name;
    }
    if (!level) throw new NotFoundException('No se pudo resolver el nivel educativo del ámbito');
    return { educationalLevelId: level.id, levelName: level.name, scopeLabel, decreeKey: this.keyFromLevelName(level.name) };
  }

  getDecreeText(key: DecreeKey): string {
    if (this.cache[key]) return this.cache[key]!;
    const p = path.join(__dirname, '..', 'decrees', `${key}.txt`);
    const text = fs.readFileSync(p, 'utf8');
    this.cache[key] = text;
    return text;
  }
}
