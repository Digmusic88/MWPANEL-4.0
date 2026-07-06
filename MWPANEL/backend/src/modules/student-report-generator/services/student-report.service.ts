import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AcademicYear } from '../../students/entities/academic-year.entity';
import { StudentsService } from '../../students/students.service';
import { UserRole } from '../../users/entities/user.entity';
import { StudentReportDataCollector } from './student-report-data.collector';
import { StudentReportMetricsEngine } from './student-report-metrics.engine';
import { StudentReportNarrativeService } from './student-report-narrative.service';
import { StudentReportPdfService } from './student-report-pdf.service';
import { GenerateReportDto } from '../dto/generate-report.dto';
import { StudentReportResult, StudentReportFilters, ReportSection } from '../types/student-report.types';

@Injectable()
export class StudentReportService {
  private readonly logger = new Logger(StudentReportService.name);
  constructor(
    private readonly collector: StudentReportDataCollector,
    private readonly metrics: StudentReportMetricsEngine,
    private readonly narrative: StudentReportNarrativeService,
    private readonly pdf: StudentReportPdfService,
    private readonly students: StudentsService,
    @InjectRepository(AcademicYear) private readonly yearRepo: Repository<AcademicYear>,
  ) {}

  private async assertAccess(studentId: string, userId: string, role: UserRole) {
    if (role === UserRole.ADMIN) return;
    const ok = await this.students.canTeacherAccessStudent(userId, studentId);
    if (!ok) throw new ForbiddenException('Sin acceso a este alumno');
  }

  private toFilters(dto: GenerateReportDto): StudentReportFilters {
    return { academicYearId: dto.academicYearId, subjectIds: dto.subjectIds, sections: dto.sections as ReportSection[] | undefined, detailed: dto.detailed };
  }

  async generate(dto: GenerateReportDto, userId: string, role: UserRole): Promise<StudentReportResult> {
    await this.assertAccess(dto.studentId, userId, role);
    const filters = this.toFilters(dto);
    const data = await this.collector.collect(dto.studentId, filters, userId, role);
    const metrics = this.metrics.compute(data);
    const narrative = await this.narrative.build(metrics, data);
    return { student: data.student, filters, data, metrics, narrative, generatedAt: new Date().toISOString() };
  }

  async generatePdf(dto: GenerateReportDto, userId: string, role: UserRole): Promise<Buffer> {
    const result = await this.generate(dto, userId, role);
    return this.pdf.generate(result);
  }

  async getOptions(studentId: string, userId: string, role: UserRole) {
    await this.assertAccess(studentId, userId, role);
    const years = await this.yearRepo.find({ order: { startDate: 'DESC' } });
    // Asignaturas: vía notas actuales del alumno (reutiliza la sección académica del recolector con todas las secciones=academic).
    let subjects: Array<{ id: string; name: string }> = [];
    try {
      const current = years.find((y: any) => y.isCurrent) || years[0];
      const data = await this.collector.collect(studentId, { academicYearId: current?.id, sections: ['academic'] } as StudentReportFilters, userId, role);
      subjects = (data.academic?.subjects || []).map((s) => ({ id: s.subjectId, name: s.name }));
    } catch (e) { this.logger.warn('getOptions: no se pudieron resolver asignaturas: ' + (e?.message || e)); subjects = []; }
    return { academicYears: years.map((y: any) => ({ id: y.id, name: y.name, isCurrent: y.isCurrent })), subjects };
  }
}
