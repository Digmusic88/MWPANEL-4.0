import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { AcademicRecordsService } from '../../academic-records/academic-records.service';
import { CurrentAcademicYearService } from '../current-academic-year.service';

@Injectable()
export class AcademicYearClosureService {
  private readonly logger = new Logger(AcademicYearClosureService.name);

  constructor(
    @InjectRepository(AcademicYear)
    private readonly yearRepo: Repository<AcademicYear>,
    private readonly academicRecordsService: AcademicRecordsService,
    private readonly current: CurrentAcademicYearService,
  ) {}

  async closeYear(id: string) {
    const year = await this.yearRepo.findOne({ where: { id } });
    if (!year) throw new NotFoundException('Año académico no encontrado');
    if (year.isCurrent) {
      throw new ConflictException(
        'No se puede cerrar el año activo. Activa otro año primero.',
      );
    }

    if (year.isArchived) {
      return { archived: true, expediente: { students: 0, records: 0 } };
    }

    // Reconstruir el expediente ANTES de congelar (fail-soft: no bloquear el cierre)
    let expediente = { students: 0, records: 0 };
    try {
      expediente = await this.academicRecordsService.buildYear(id);
    } catch (e) {
      this.logger.error(
        `Fallo al reconstruir expediente del año ${id} durante el cierre: ${
          (e as Error).message
        }`,
      );
    }

    // Marcar archivado (idempotente)
    year.isArchived = true;
    year.archivedAt = new Date();
    await this.yearRepo.save(year);

    this.current.invalidate();
    return { archived: true, expediente };
  }
}
