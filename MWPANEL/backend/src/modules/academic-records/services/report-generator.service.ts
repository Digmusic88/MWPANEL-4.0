import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as PDFKit from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { AcademicRecord } from '../entities/academic-record.entity';
import { AcademicRecordEntry } from '../entities/academic-record-entry.entity';
import { Student } from '../../students/entities/student.entity';
import { AttendanceRecord, AttendanceStatus } from '../../attendance/entities/attendance-record.entity';
import { CentralizedGrade } from '../../grades/entities/centralized-grade.entity';
import { SettingsService } from '../../settings/settings.service';
import { LomloeProgress, LomloeProgressService, ThreeState } from './lomloe-progress.service';
import { CurricularAdaptationService } from '../../dua/services/curricular-adaptation.service';

// Mapa de adaptaciones curriculares por subjectId (A2/A3)
type AdaptationMap = Map<string, { type: string; notes: string | null }>;

// Notas por trimestre de una asignatura (por subjectAssignmentId)
type TrimesterGrades = Map<string, { first: number | null; second: number | null; third: number | null }>;

export interface ReportGenerationOptions {
  includeGrades: boolean;
  includeAttendance: boolean;
  includeComments: boolean;
  includeBehavioral: boolean;
  template: 'standard' | 'detailed' | 'summary';
  language: 'es' | 'en';
}

export interface GeneratedReport {
  filePath: string;
  fileName: string;
  size: number;
  generatedAt: Date;
}

// Asistencia real calculada desde attendance_records (no desde columnas cacheadas)
interface AttendanceSummary {
  total: number;            // días con registro
  present: number;          // presente (día completo)
  late: number;             // retrasos (late + justified_late)
  earlyDeparture: number;   // salidas anticipadas
  justifiedAbsence: number; // faltas justificadas
  absent: number;           // faltas injustificadas
  // % asistencia (LOMLOE): retrasos y salidas anticipadas CUENTAN como asistencia
  // (el alumno estuvo presente); solo las faltas (justif. + injustif.) restan.
  percentage: number | null;
}

@Injectable()
export class ReportGeneratorService {
  private readonly logger = new Logger(ReportGeneratorService.name);
  private readonly reportsDir = path.join(process.cwd(), 'reports');
  private readonly logoPath: string;

  // Paleta de la plataforma (verde de marca, no morado)
  private readonly BRAND = '#3F6E58';       // primary.700 (verde de marca)
  private readonly BRAND_LIGHT = '#EDF6F1'; // primary.50 (verde muy claro, bandas)
  private readonly ROW_ALT = '#F5F2ED';     // surface-alt (fila alterna)
  private readonly INK = '#1E1E30';         // neutral.900 (texto)
  private readonly MUTED = '#6B6B7B';       // neutral.500 (secundario)
  private readonly BORDER = '#E2DDD8';       // borde

  constructor(
    @InjectRepository(AcademicRecord)
    private academicRecordsRepository: Repository<AcademicRecord>,
    @InjectRepository(Student)
    private studentsRepository: Repository<Student>,
    @InjectRepository(AttendanceRecord)
    private attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(CentralizedGrade)
    private centralizedGradesRepository: Repository<CentralizedGrade>,
    private settingsService: SettingsService,
    private lomloeProgress: LomloeProgressService,
    private curricularAdaptations: CurricularAdaptationService,
  ) {
    this.ensureReportsDirectory();
    // Resolución robusta del logo en distintos entornos (mismo patrón que tutor-report-pdf.service)
    const candidates = [
      path.join(process.cwd(), 'logo-MWSchool.png'),
      path.join(process.cwd(), 'uploads', 'logo-MWSchool.png'),
      path.join(__dirname, '..', '..', '..', '..', 'logo-MWSchool.png'),
      '/app/logo-MWSchool.png',
    ];
    this.logoPath = candidates.find((p) => {
      try { return fs.existsSync(p); } catch { return false; }
    }) || '';
  }

  async generateStudentReport(
    studentId: string,
    academicYear: string,
    options: Partial<ReportGenerationOptions> = {},
    includeGrouping = false
  ): Promise<GeneratedReport> {
    // Verificar si el módulo está habilitado
    const isModuleEnabled = await this.settingsService.isModuleEnabled('expedientes');
    if (!isModuleEnabled) {
      throw new NotFoundException('El módulo de expedientes no está habilitado');
    }

    // Configuración por defecto
    const config: ReportGenerationOptions = {
      includeGrades: true,
      includeAttendance: true,
      includeComments: true,
      includeBehavioral: true,
      template: 'standard',
      language: 'es',
      ...options,
    };

    // Obtener datos del estudiante
    const student = await this.studentsRepository.findOne({
      where: { id: studentId },
      relations: [
        'user',
        'user.profile',
        'classGroups',
        'educationalLevel',
        'course',
      ],
    });

    if (!student) {
      throw new NotFoundException('Estudiante no encontrado');
    }

    // Obtener expediente académico
    const academicRecord = await this.academicRecordsRepository.findOne({
      where: {
        studentId,
        academicYear: academicYear as any,
        isActive: true,
      },
      relations: [
        'entries',
        'entries.subjectAssignment',
        'entries.subjectAssignment.subject',
        'entries.subjectAssignment.subject.course',
        'entries.grades',
      ],
    });

    if (!academicRecord) {
      throw new NotFoundException('Expediente académico no encontrado para el año especificado');
    }

    // Generar PDF. Bloqueo RGPD: los boletines para familia/alumno llevan sufijo _priv y
    // NO incluyen grupo/etapa/curso; solo profesor/admin generan la versión completa.
    const fileName = `boletin_${student.enrollmentNumber}_${academicYear}_${Date.now()}${includeGrouping ? '' : '_priv'}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    await this.createPDFReport(student, academicRecord, filePath, config, includeGrouping);

    // Obtener información del archivo generado
    const stats = fs.statSync(filePath);

    return {
      filePath,
      fileName,
      size: stats.size,
      generatedAt: new Date(),
    };
  }

  async generateClassReport(
    classGroupId: string,
    academicYear: string,
    options: Partial<ReportGenerationOptions> = {}
  ): Promise<GeneratedReport> {
    // Verificar si el módulo está habilitado
    const isModuleEnabled = await this.settingsService.isModuleEnabled('expedientes');
    if (!isModuleEnabled) {
      throw new NotFoundException('El módulo de expedientes no está habilitado');
    }

    // Obtener todos los estudiantes de la clase
    const students = await this.studentsRepository.find({
      where: { classGroups: { id: classGroupId } },
      relations: [
        'user',
        'user.profile',
        'classGroup',
      ],
    });

    if (students.length === 0) {
      throw new NotFoundException('No se encontraron estudiantes para esta clase');
    }

    const fileName = `reporte_clase_${classGroupId}_${academicYear}_${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, fileName);

    await this.createClassSummaryPDF(students, academicYear, filePath, options);

    const stats = fs.statSync(filePath);

    return {
      filePath,
      fileName,
      size: stats.size,
      generatedAt: new Date(),
    };
  }

  /**
   * Calcula la asistencia real del alumno para un curso académico leyendo la
   * tabla attendance_records (una fila por día). Sustituye a las columnas
   * cacheadas absences/tardiness (que nunca se rellenaban → 0 → 100% falso).
   */
  private async computeAttendance(studentId: string, academicYearName: string): Promise<AttendanceSummary> {
    const rows = await this.attendanceRepository
      .createQueryBuilder('ar')
      .innerJoin('ar.academicYear', 'ay')
      .select('ar.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('ar.studentId = :studentId', { studentId })
      .andWhere('ay.name = :year', { year: academicYearName })
      .groupBy('ar.status')
      .getRawMany<{ status: string; count: string }>();

    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = parseInt(r.count, 10) || 0;

    const present = map[AttendanceStatus.PRESENT] || 0;
    const absent = map[AttendanceStatus.ABSENT] || 0;
    const justifiedAbsence = map[AttendanceStatus.JUSTIFIED_ABSENCE] || 0;
    const late = (map[AttendanceStatus.LATE] || 0) + (map[AttendanceStatus.JUSTIFIED_LATE] || 0);
    const earlyDeparture = map[AttendanceStatus.EARLY_DEPARTURE] || 0;
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    // LOMLOE: retrasos y salidas anticipadas cuentan como asistencia (estuvo presente);
    // solo las faltas (justificadas + injustificadas) restan.
    const attended = total - absent - justifiedAbsence;
    const percentage = total > 0 ? Math.round((attended / total) * 100) : null;

    return { total, present, late, earlyDeparture, justifiedAbsence, absent, percentage };
  }

  private async createPDFReport(
    student: Student,
    academicRecord: AcademicRecord,
    filePath: string,
    options: ReportGenerationOptions,
    includeGrouping = false
  ): Promise<void> {
    // Prefetch de todo lo asíncrono ANTES de abrir el documento, para poder
    // renderizar de forma síncrona y esperar al 'finish' del stream (si no,
    // el PDF se devuelve/descarga truncado → archivo corrupto).
    const attendance = options.includeAttendance
      ? await this.computeAttendance(student.id, String(academicRecord.academicYear))
      : null;
    const schoolName = await this.settingsService.getString('school_name', 'Mundo World School');
    const schoolAddress = await this.settingsService.getString('school_address', '');

    // Notas por trimestre (async) + etapa para la conversión LOMLOE
    const academicEntries = (academicRecord.entries || []).filter(e => e.type === 'academic');
    const saIds = academicEntries
      .map(e => e.subjectAssignment?.id)
      .filter((id): id is string => Boolean(id));
    const trimesterGrades = options.includeGrades
      ? await this.computeTrimesterGrades(student.id, saIds)
      : (new Map() as TrimesterGrades);
    const etapa = (student as any).educationalLevel?.name || '';

    // Progreso LOMLOE por criterio (fail-soft: si falla, se omite la sección)
    let lomloeProgress: LomloeProgress = { subjects: [] };
    try {
      lomloeProgress = await this.lomloeProgress.getProgressByYearName(student.id, String(academicRecord.academicYear));
    } catch (e) {
      this.logger?.warn?.(`No se pudo cargar progreso LOMLOE: ${e?.message || e}`);
    }

    // Adaptaciones curriculares por asignatura (fail-soft: si falla, sin insignias)
    let adaptationMap: AdaptationMap = new Map();
    try {
      adaptationMap = await this.curricularAdaptations.getAdaptationMapByYearName(student.id, String(academicRecord.academicYear)) as AdaptationMap;
    } catch (e) {
      this.logger?.warn?.(`No se pudo cargar adaptaciones: ${e?.message || e}`);
    }

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFKit({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      stream.on('finish', () => resolve());
      stream.on('error', reject);
      doc.on('error', reject);
      doc.pipe(stream);

      // Header
      this.addHeader(doc, options.language, schoolName, schoolAddress);

      // Student Info
      this.addStudentInfo(doc, student, academicRecord, includeGrouping);

      // Academic Summary
      this.addAcademicSummary(doc, academicRecord);

      if (options.includeGrades) {
        this.addGradesSection(doc, academicRecord, trimesterGrades, etapa, includeGrouping, adaptationMap);
      }

      this.addCriteriaProgressSection(doc, lomloeProgress, includeGrouping);

      if (options.includeAttendance) {
        this.addAttendanceSection(doc, attendance);
      }

      if (options.includeComments) {
        this.addCommentsSection(doc, academicRecord);
      }

      if (options.includeBehavioral) {
        this.addBehavioralSection(doc, academicRecord);
      }

      // Competencias (LOMLOE)
      this.addCompetenciesSection(doc, academicRecord);

      // Footer
      this.addFooter(doc);

      doc.end();
    });
  }

  private async createClassSummaryPDF(
    students: Student[],
    academicYear: string,
    filePath: string,
    options: Partial<ReportGenerationOptions>
  ): Promise<void> {
    const schoolName = await this.settingsService.getString('school_name', 'Mundo World School');
    const schoolAddress = await this.settingsService.getString('school_address', '');

    // Prefetch de los expedientes (async) antes de renderizar
    const rows: { name: string; gpa: string }[] = [];
    for (const student of students) {
      const academicRecord = await this.academicRecordsRepository.findOne({
        where: {
          studentId: student.id,
          academicYear: academicYear as any,
          isActive: true,
        },
        relations: ['entries'],
      });

      if (academicRecord) {
        rows.push({
          name: `${student.user.profile.firstName} ${student.user.profile.lastName}`,
          gpa: academicRecord.finalGPA ? Number(academicRecord.finalGPA).toFixed(2) : 'N/A',
        });
      }
    }

    await new Promise<void>((resolve, reject) => {
      const doc = new PDFKit({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      stream.on('finish', () => resolve());
      stream.on('error', reject);
      doc.on('error', reject);
      doc.pipe(stream);

      this.addHeader(doc, options.language || 'es', schoolName, schoolAddress);
      this.sectionHeader(doc, 'REPORTE DE CLASE');
      for (const r of rows) {
        this.kv(doc, r.name, `Promedio: ${r.gpa}`);
      }
      this.addFooter(doc);

      doc.end();
    });
  }

  // ---- Helpers de estilo ---------------------------------------------------

  /** Encabezado de sección con banda de color de marca. */
  private sectionHeader(doc: any, title: string): void {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 60) doc.addPage();
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const y = doc.y;
    doc.rect(left, y, width, 20).fill(this.BRAND_LIGHT);
    doc.fillColor(this.BRAND).font('Helvetica-Bold').fontSize(11).text(title, left + 6, y + 5);
    doc.fillColor(this.INK).font('Helvetica').fontSize(11);
    doc.x = left;
    doc.y = y + 26;
  }

  /** Línea etiqueta/valor (etiqueta en negrita). */
  private kv(doc: any, label: string, value: any): void {
    doc.font('Helvetica-Bold').fillColor(this.INK).fontSize(10)
      .text(`${label}: `, doc.page.margins.left, doc.y, { continued: true });
    doc.font('Helvetica').fillColor(this.INK).text(value === null || value === undefined || value === '' ? '—' : String(value));
  }

  /**
   * Notas por trimestre desde centralized_grades, indexadas por subjectAssignmentId.
   * Hoy normalmente vacío (aún no se califica por trimestre); listo para el futuro.
   */
  private async computeTrimesterGrades(studentId: string, subjectAssignmentIds: string[]): Promise<TrimesterGrades> {
    const map: TrimesterGrades = new Map();
    if (!subjectAssignmentIds.length) return map;

    const rows = await this.centralizedGradesRepository.find({
      where: { studentId, subjectAssignmentId: In(subjectAssignmentIds) },
    });

    for (const r of rows) {
      const said = r.subjectAssignmentId;
      if (!map.has(said)) map.set(said, { first: null, second: null, third: null });
      const bucket = map.get(said)!;
      const g = r.finalGrade === null || r.finalGrade === undefined ? null : Number(r.finalGrade);
      if (r.period === ('first_trimester' as any)) bucket.first = g;
      else if (r.period === ('second_trimester' as any)) bucket.second = g;
      else if (r.period === ('third_trimester' as any)) bucket.third = g;
    }
    return map;
  }

  /** Conversión nota 0-100 → escala LOMLOE según la etapa (solo evaluación final). */
  private lomloeConversion(value: number | null, etapa: string): string {
    if (value === null || value === undefined || isNaN(value)) return '—';
    const e = (etapa || '').toLowerCase();
    if (e.includes('infantil')) {
      if (value < 50) return 'No conseguido';
      if (value < 70) return 'En proceso';
      return 'Conseguido';
    }
    if (e.includes('bachiller')) {
      return (value / 10).toFixed(1).replace('.', ',');
    }
    // Primaria / Secundaria (ESO) y por defecto
    if (value < 50) return 'Insuficiente';
    if (value < 60) return 'Suficiente';
    if (value < 70) return 'Bien';
    if (value < 90) return 'Notable';
    return 'Sobresaliente';
  }

  private addHeader(doc: any, language: string, schoolName: string, schoolAddress: string): void {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const top = doc.y;
    let logoDrawn = false;

    if (this.logoPath && fs.existsSync(this.logoPath)) {
      try {
        doc.image(this.logoPath, left, top, { height: 56 });
        logoDrawn = true;
      } catch {
        logoDrawn = false;
      }
    }

    // El logo ya incluye el nombre del centro → no repetimos el texto (se pisaban).
    // Solo si NO hay logo mostramos el nombre como respaldo.
    if (!logoDrawn) {
      doc.fillColor(this.BRAND).font('Helvetica-Bold').fontSize(19)
        .text(schoolName, left, top + 16, { width: right - left });
    }
    if (schoolAddress) {
      doc.fillColor(this.MUTED).font('Helvetica').fontSize(9)
        .text(schoolAddress, left, top + 60, { width: right - left, align: 'right' });
    }

    const lineY = Math.max(doc.y, top + 60) + 6;
    doc.moveTo(left, lineY).lineTo(right, lineY).lineWidth(2).strokeColor(this.BRAND).stroke();

    doc.fillColor(this.BRAND).font('Helvetica-Bold').fontSize(15)
      .text(language === 'es' ? 'Boletín de Calificaciones' : 'Academic Report', left, lineY + 8, {
        width: right - left,
        align: 'center',
      });

    doc.fillColor(this.INK).font('Helvetica').fontSize(11);
    doc.x = left;
    doc.y = lineY + 34;
  }

  private addStudentInfo(doc: any, student: Student, record: AcademicRecord, includeGrouping = false): void {
    this.sectionHeader(doc, 'INFORMACIÓN DEL ESTUDIANTE');

    this.kv(doc, 'Nombre', `${student.user.profile.firstName} ${student.user.profile.lastName}`);
    this.kv(doc, 'Número de Matrícula', student.enrollmentNumber);
    // Bloqueo RGPD: grupo/etapa/curso SOLO en la versión de profesor/admin. La versión que
    // puede descargar la familia/el alumno (sufijo _priv) NUNCA los incluye.
    if (includeGrouping) {
      this.kv(doc, 'Etapa', (student as any).educationalLevel?.name);
      this.kv(doc, 'Grupo', student.classGroups?.[0]?.name || 'N/A');
      if ((student as any).course?.name) this.kv(doc, 'Curso', (student as any).course.name);
    }
    this.kv(doc, 'Año Académico', record.academicYear);

    doc.moveDown(0.8);
  }

  private addAcademicSummary(doc: any, record: AcademicRecord): void {
    this.sectionHeader(doc, 'RESUMEN ACADÉMICO');

    this.kv(doc, 'Promedio General', record.finalGPA ? Number(record.finalGPA).toFixed(2) : 'N/A');
    this.kv(doc, 'Estado', record.isPromoted ? 'Promovido' : 'En Progreso');

    doc.moveDown(0.8);
  }

  private addGradesSection(
    doc: any,
    record: AcademicRecord,
    trimesterGrades: TrimesterGrades,
    etapa: string,
    includeGrouping = false,
    adaptationMap: AdaptationMap = new Map(),
  ): void {
    const academicEntries = record.entries?.filter(entry => entry.type === 'academic') || [];

    if (academicEntries.length === 0) return;

    this.sectionHeader(doc, 'CALIFICACIONES POR ASIGNATURA');

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const tableW = right - left;

    // Columnas (A4 vertical): asignatura + 1ºT/2ºT/3ºT/Final + conversión LOMLOE
    const cNum = 40;                 // ancho de cada columna de nota
    const cConv = 96;                // ancho de la conversión LOMLOE
    const cAsig = tableW - cNum * 4 - cConv;
    const xAsig = left;
    const xT1 = left + cAsig;
    const xT2 = xT1 + cNum;
    const xT3 = xT2 + cNum;
    const xFin = xT3 + cNum;
    const xConv = xFin + cNum;
    const rowH = 15;

    const fmt = (v: number | null): string =>
      v === null || v === undefined || isNaN(Number(v)) ? '—' : String(Math.round(Number(v) * 100) / 100);

    // Fila de cabecera de columnas (se repite tras cada salto de página)
    const drawColumnHeader = () => {
      const hy = doc.y;
      doc.rect(left, hy, tableW, 16).fill(this.BRAND);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      doc.text('Asignatura', xAsig + 4, hy + 5, { width: cAsig - 6 });
      doc.text('1ºT', xT1, hy + 5, { width: cNum, align: 'center' });
      doc.text('2ºT', xT2, hy + 5, { width: cNum, align: 'center' });
      doc.text('3ºT', xT3, hy + 5, { width: cNum, align: 'center' });
      doc.text('Final', xFin, hy + 5, { width: cNum, align: 'center' });
      doc.text('LOMLOE', xConv, hy + 5, { width: cConv, align: 'center' });
      doc.y = hy + 16;
    };

    // Banda con el curso escolar (nivel) — solo profesor/administración. Hace el
    // boletín inequívoco para Educación de Navarra: "Geografía e Historia" sin más
    // podría ser de cualquier curso de la ESO; con la banda queda atado a su curso.
    const drawCourseBand = (label: string) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        drawColumnHeader();
      }
      const by = doc.y;
      doc.rect(left, by, tableW, 14).fill(this.ROW_ALT);
      doc.fillColor(this.BRAND).font('Helvetica-Bold').fontSize(8.5)
        .text(label, xAsig + 4, by + 3.5, { width: tableW - 8 });
      doc.y = by + 14;
    };

    const drawEntryRow = (entry: any, i: number) => {
      const subjectId = entry.subjectAssignment?.subject?.id;
      const adapt = subjectId ? adaptationMap.get(subjectId) : undefined;
      // Fila más alta solo cuando hay adaptación (2ª línea para la insignia);
      // sin adaptación la fila queda idéntica (PDF byte-idéntico → retrocompat).
      const thisRowH = adapt ? 23 : rowH;

      if (doc.y > doc.page.height - doc.page.margins.bottom - (adapt ? 38 : 30)) {
        doc.addPage();
        drawColumnHeader();
      }
      const y = doc.y;
      if (i % 2 === 0) doc.rect(left, y, tableW, thisRowH).fill(this.ROW_ALT);

      const subjectName = entry.subjectAssignment?.subject?.name || 'Asignatura';
      const said = entry.subjectAssignment?.id;
      const tri = (said && trimesterGrades.get(said)) || { first: null, second: null, third: null };
      const finalNum = entry.numericValue === null || entry.numericValue === undefined ? null : Number(entry.numericValue);
      const finalDisplay = finalNum !== null ? fmt(finalNum) : entry.displayGrade;

      doc.fillColor(this.INK).font('Helvetica').fontSize(8);
      doc.text(subjectName, xAsig + 4, y + 4, { width: cAsig - 6, height: 10, ellipsis: true });
      doc.text(fmt(tri.first), xT1, y + 4, { width: cNum, align: 'center' });
      doc.text(fmt(tri.second), xT2, y + 4, { width: cNum, align: 'center' });
      doc.text(fmt(tri.third), xT3, y + 4, { width: cNum, align: 'center' });
      doc.font('Helvetica-Bold').fillColor(this.BRAND)
        .text(String(finalDisplay), xFin, y + 4, { width: cNum, align: 'center' });
      doc.font('Helvetica').fillColor(this.INK).fontSize(7)
        .text(this.lomloeConversion(finalNum, etapa), xConv, y + 4.5, { width: cConv, align: 'center' });

      // Insignia de adaptación curricular bajo el nombre de la asignatura.
      // Aparece en boletín de profesor y en el de familia (_priv): la familia ve el tipo.
      if (adapt) {
        const label = adapt.type === 'SIGNIFICANT' ? 'ACS' : adapt.type === 'NON_SIGNIFICANT' ? 'No signif.' : 'Acceso';
        doc.font('Helvetica-Bold').fontSize(6.5).fillColor(this.BRAND)
          .text(`Adaptada · ${label}`, xAsig + 4, y + 13, { width: cAsig - 6, height: 9, ellipsis: true });
      }

      doc.y = y + thisRowH;
    };

    drawColumnHeader();

    if (includeGrouping) {
      // Agrupar asignaturas por curso escolar (nivel). Solo boletín de profesor/admin.
      const groups = new Map<string, any[]>();
      for (const entry of academicEntries) {
        const course = entry.subjectAssignment?.subject?.course?.name || 'Sin curso asignado';
        if (!groups.has(course)) groups.set(course, []);
        groups.get(course)!.push(entry);
      }
      const sortedCourses = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, 'es'));
      for (const course of sortedCourses) {
        drawCourseBand(`Curso: ${course}`);
        groups.get(course)!.forEach((entry, i) => drawEntryRow(entry, i));
      }
    } else {
      // Familia/alumno: lista plana SIN el curso escolar (bloqueo RGPD de agrupación).
      academicEntries.forEach((entry, i) => drawEntryRow(entry, i));
    }

    doc.fillColor(this.INK).font('Helvetica').fontSize(11);
    doc.moveDown(0.8);
  }

  private stateLabel(s: ThreeState | null): string {
    return s === 'ACHIEVED' ? 'Alcanzado' : s === 'IN_PROGRESS' ? 'En proceso' : s === 'NOT_ACHIEVED' ? 'No completado' : '—';
  }
  private stateColor(s: ThreeState | null): string {
    return s === 'ACHIEVED' ? '#52c41a' : s === 'IN_PROGRESS' ? '#faad14' : s === 'NOT_ACHIEVED' ? '#ff4d4f' : '#8c8c8c';
  }

  private addCriteriaProgressSection(doc: any, progress: LomloeProgress, includeGrouping = false): void {
    const subjects = (progress?.subjects || []).filter(s =>
      s.criteria.some(c => c.states.T1 || c.states.T2 || c.states.T3));
    if (subjects.length === 0) return;

    this.sectionHeader(doc, 'PROGRESO POR CRITERIOS (LOMLOE)');

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const tableW = right - left;
    const cState = 66;
    const cCrit = tableW - cState * 3;
    const xCrit = left, xT1 = left + cCrit, xT2 = xT1 + cState, xT3 = xT2 + cState;
    const rowH = 16;

    const drawHeader = () => {
      const hy = doc.y;
      doc.rect(left, hy, tableW, 16).fill(this.BRAND);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      doc.text('Criterio', xCrit + 4, hy + 5, { width: cCrit - 6 });
      doc.text('1ºT', xT1, hy + 5, { width: cState, align: 'center' });
      doc.text('2ºT', xT2, hy + 5, { width: cState, align: 'center' });
      doc.text('3ºT', xT3, hy + 5, { width: cState, align: 'center' });
      doc.y = hy + 16;
    };
    const drawSubjectBand = (label: string) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 40) { doc.addPage(); drawHeader(); }
      const by = doc.y;
      doc.rect(left, by, tableW, 14).fill(this.ROW_ALT);
      doc.fillColor(this.BRAND).font('Helvetica-Bold').fontSize(8.5).text(label, xCrit + 4, by + 3.5, { width: tableW - 8 });
      doc.y = by + 14;
    };
    const drawStateCell = (s: ThreeState | null, x: number, y: number) => {
      doc.rect(x + 4, y + 2, cState - 8, rowH - 4).fill(this.stateColor(s));
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6.5)
        .text(this.stateLabel(s), x + 4, y + 5.5, { width: cState - 8, align: 'center' });
    };
    const drawCritRow = (c: LomloeProgress['subjects'][number]['criteria'][number], i: number) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 30) { doc.addPage(); drawHeader(); }
      const y = doc.y;
      if (i % 2 === 0) doc.rect(left, y, tableW, rowH).fill(this.ROW_ALT);
      const label = `${c.code}${c.specificCompetencyCode ? ` · ${c.specificCompetencyCode}` : ''} — ${c.name}`;
      doc.fillColor(this.INK).font('Helvetica').fontSize(7.5)
        .text(label, xCrit + 4, y + 4, { width: cCrit - 6, height: 10, ellipsis: true });
      drawStateCell(c.states.T1, xT1, y);
      drawStateCell(c.states.T2, xT2, y);
      drawStateCell(c.states.T3, xT3, y);
      doc.y = y + rowH;
    };

    drawHeader();
    for (const subj of subjects) {
      drawSubjectBand(subj.subjectName);
      subj.criteria.forEach((c, i) => drawCritRow(c, i));
    }
    doc.fillColor(this.INK).font('Helvetica').fontSize(11);
    doc.moveDown(0.8);
  }

  private addAttendanceSection(doc: any, attendance: AttendanceSummary | null): void {
    this.sectionHeader(doc, 'REGISTRO DE ASISTENCIA');

    if (!attendance || attendance.total === 0) {
      doc.fillColor(this.MUTED).font('Helvetica').fontSize(10)
        .text('Sin registros de asistencia para este curso.', doc.page.margins.left, doc.y);
      doc.fillColor(this.INK).fontSize(11);
      doc.moveDown(0.8);
      return;
    }

    this.kv(doc, 'Días lectivos registrados', attendance.total);
    this.kv(doc, 'Días de asistencia', attendance.present);
    this.kv(doc, 'Retrasos', attendance.late);
    this.kv(doc, 'Salidas anticipadas', attendance.earlyDeparture);
    this.kv(doc, 'Faltas justificadas', attendance.justifiedAbsence);
    this.kv(doc, 'Faltas injustificadas', attendance.absent);
    this.kv(doc, 'Porcentaje de asistencia', attendance.percentage != null ? `${attendance.percentage}%` : '—');

    doc.moveDown(0.8);
  }

  private addCommentsSection(doc: any, record: AcademicRecord): void {
    if (!record.observations) return;

    this.sectionHeader(doc, 'OBSERVACIONES');

    doc.fillColor(this.INK).font('Helvetica').fontSize(10)
      .text(record.observations, doc.page.margins.left, doc.y, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      });
    doc.fontSize(11);
    doc.moveDown(0.8);
  }

  private addBehavioralSection(doc: any, record: AcademicRecord): void {
    const behavioralEntries = record.entries?.filter(entry => entry.type === 'behavioral') || [];

    if (behavioralEntries.length === 0) return;

    this.sectionHeader(doc, 'REGISTRO DE COMPORTAMIENTO');

    behavioralEntries.forEach(entry => {
      doc.fillColor(this.INK).font('Helvetica').fontSize(10)
        .text(`${entry.title}: ${entry.description || ''}`, doc.page.margins.left, doc.y, {
          width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        });
      doc.fillColor(this.MUTED).fontSize(8)
        .text(`   Fecha: ${new Date(entry.entryDate).toLocaleDateString('es-ES')}`);
      doc.moveDown(0.3);
    });

    doc.fillColor(this.INK).fontSize(11);
    doc.moveDown(0.8);
  }

  private addCompetenciesSection(doc: any, record: AcademicRecord): void {
    const comp = (record as any).competencies;
    if (!comp?.byKey?.length) return;

    this.sectionHeader(doc, 'COMPETENCIAS (LOMLOE, 0-100)');

    doc.fillColor(this.INK).font('Helvetica').fontSize(10);
    for (const k of comp.byKey) {
      this.kv(doc, `${k.code} · ${k.name}`, `${k.score}/100`);
    }

    doc.moveDown(0.8);
  }

  private addFooter(doc: any): void {
    const currentDate = new Date().toLocaleDateString('es-ES');
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;

    if (doc.y > doc.page.height - doc.page.margins.bottom - 90) doc.addPage();
    doc.moveDown(2.5);

    // Línea de firma (derecha)
    const y = doc.y;
    doc.moveTo(right - 200, y).lineTo(right, y).lineWidth(0.8).strokeColor(this.BORDER).stroke();
    doc.fillColor(this.MUTED).font('Helvetica').fontSize(9)
      .text('Firma y sello del centro', right - 200, y + 4, { width: 200, align: 'center' });

    doc.moveDown(2);
    doc.fillColor(this.MUTED).fontSize(8)
      .text(`Documento académico oficial · Generado el ${currentDate} · Mundo World School`, left, doc.y, {
        width: right - left,
        align: 'center',
      });
    doc.fillColor(this.INK);
  }

  private ensureReportsDirectory(): void {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async deleteReport(fileName: string): Promise<void> {
    const filePath = path.join(this.reportsDir, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async getReportPath(fileName: string): Promise<string> {
    const filePath = path.join(this.reportsDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo de reporte no encontrado');
    }
    return filePath;
  }
}
