/**
 * @archivo: tutor-report-pdf.service.ts
 * @módulo: Student Reports - PDF Generator
 * @función: Genera PDFs profesionales y elegantes para informes de estudiantes tutorados
 * @estilo: Diseño corporativo MW Panel con logo, colores institucionales y tipografía limpia
 */

import { Injectable } from '@nestjs/common';
import * as PDFKit from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

// Colores corporativos de MW Panel
const COLORS = {
  // Primarios
  primary: '#1890ff',        // Azul principal de Ant Design
  primaryDark: '#096dd9',    // Azul oscuro
  primaryLight: '#e6f7ff',   // Azul muy claro para fondos

  // Neutros
  text: '#262626',           // Texto principal
  textSecondary: '#595959',  // Texto secundario
  textLight: '#8c8c8c',      // Texto terciario
  border: '#d9d9d9',         // Bordes
  background: '#fafafa',     // Fondo general
  white: '#ffffff',

  // Estados
  success: '#52c41a',        // Verde éxito
  warning: '#faad14',        // Amarillo advertencia
  danger: '#ff4d4f',         // Rojo peligro
  info: '#1890ff',           // Azul información
};

// Configuración de prioridades
const PRIORITY_CONFIG: Record<number, { label: string; color: string; bgColor: string }> = {
  1: { label: 'Informativo', color: COLORS.textLight, bgColor: '#f5f5f5' },
  2: { label: 'Normal', color: COLORS.primary, bgColor: COLORS.primaryLight },
  3: { label: 'Importante', color: COLORS.warning, bgColor: '#fffbe6' },
  4: { label: 'Urgente', color: COLORS.danger, bgColor: '#fff2f0' },
};

// Interfaces
interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNumber: string;
  photoUrl: string | null;
  classGroup: string;
  tutorName?: string;
  tutorEmail?: string;
}

interface ReportData {
  id: string;
  contextTag: string;
  content: string;
  priority: number;
  priorityLabel: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  updatedAt: string;
}

interface StudentWithReports {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNumber: string;
  photoUrl: string | null;
  reports: ReportData[];
  totalReports: number;
  hasHighPriority: boolean;
}

interface ClassGroupData {
  id: string;
  name: string;
  students: StudentWithReports[];
  totalStudents: number;
  studentsWithReports: number;
  totalReports: number;
}

interface TutorInfo {
  name: string;
  email: string;
}

interface DashboardSummary {
  totalGroups: number;
  totalStudents: number;
  totalReports: number;
  studentsWithReports: number;
  highPriorityCount: number;
}

@Injectable()
export class TutorReportPdfService {
  private logoPath: string;

  constructor() {
    // Buscar el logo en varias ubicaciones posibles
    const possiblePaths = [
      path.join(process.cwd(), 'logo-MWSchool.png'),
      path.join(process.cwd(), 'public', 'logo-MWSchool.png'),
      path.join(__dirname, '..', '..', '..', '..', 'logo-MWSchool.png'),
      '/app/logo-MWSchool.png',
    ];

    this.logoPath = possiblePaths.find(p => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    }) || '';

    if (this.logoPath) {
      console.log('📄 [TutorReportPdfService] Logo encontrado en:', this.logoPath);
    } else {
      console.log('📄 [TutorReportPdfService] Logo no encontrado, se usará texto');
    }
  }

  /**
   * Genera PDF para un estudiante individual
   */
  async generateStudentReportPdf(
    student: StudentInfo,
    reports: ReportData[],
  ): Promise<Buffer> {
    return this.createStudentPdf(student, reports);
  }

  /**
   * Genera PDF con todos los estudiantes tutorados
   */
  async generateAllStudentsReportPdf(
    tutorInfo: TutorInfo,
    classGroups: ClassGroupData[],
    summary: DashboardSummary,
  ): Promise<Buffer> {
    return this.createAllStudentsPdf(tutorInfo, classGroups, summary);
  }

  /**
   * Crea el PDF para un estudiante individual con portada profesional
   */
  private async createStudentPdf(
    student: StudentInfo,
    reports: ReportData[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFKit({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: `Informe de ${student.firstName} ${student.lastName}`,
          Author: 'Mundo World School',
          Subject: 'Informe Cualitativo del Estudiante',
          Creator: 'MW Panel - Sistema de Gestión Educativa',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const leftX = doc.page.margins.left;
      const centerX = leftX + pageWidth / 2;

      // ===== PORTADA DEL INFORME INDIVIDUAL =====

      // Logo centrado grande
      doc.y = 80;
      if (this.logoPath && fs.existsSync(this.logoPath)) {
        try {
          doc.image(this.logoPath, centerX - 60, doc.y, { width: 120 });
          doc.y += 140;
        } catch (e) {
          this.drawLargeLogo(doc, centerX, doc.y);
          doc.y += 100;
        }
      } else {
        this.drawLargeLogo(doc, centerX, doc.y);
        doc.y += 100;
      }

      // Título principal
      doc.fontSize(26)
        .font('Helvetica-Bold')
        .fillColor(COLORS.text)
        .text('Informe Cualitativo', leftX, doc.y, { width: pageWidth, align: 'center' });

      doc.moveDown(0.3);
      doc.fontSize(14)
        .font('Helvetica')
        .fillColor(COLORS.textSecondary)
        .text('del Estudiante', leftX, doc.y, { width: pageWidth, align: 'center' });

      // Línea decorativa
      doc.moveDown(1.5);
      doc.rect(centerX - 40, doc.y, 80, 3).fill(COLORS.primary);
      doc.moveDown(2);

      // ===== TARJETA DE DATOS DEL ESTUDIANTE =====
      const cardY = doc.y;
      const cardHeight = 140;

      // Fondo de la tarjeta
      doc.roundedRect(leftX, cardY, pageWidth, cardHeight, 10)
        .fill(COLORS.primaryLight);

      // Borde izquierdo decorativo
      doc.rect(leftX, cardY, 6, cardHeight)
        .fill(COLORS.primary);

      // Nombre del estudiante (grande y centrado)
      doc.y = cardY + 25;
      doc.fontSize(22)
        .font('Helvetica-Bold')
        .fillColor(COLORS.text)
        .text(`${student.firstName} ${student.lastName}`, leftX, doc.y, { width: pageWidth, align: 'center' });

      // Información en dos columnas
      doc.y = cardY + 65;
      const col1X = leftX + 40;
      const col2X = leftX + pageWidth / 2 + 20;

      // Columna 1: Matrícula
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.textSecondary)
        .text('Número de Matrícula', col1X, doc.y);
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(COLORS.text)
        .text(student.enrollmentNumber || 'No asignado', col1X, doc.y + 15);

      // Columna 2: Grupo
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.textSecondary)
        .text('Grupo de Clase', col2X, cardY + 65);
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(COLORS.text)
        .text(student.classGroup || 'No asignado', col2X, cardY + 80);

      // Fila 2: Total informes
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.textSecondary)
        .text('Total de Informes', col1X, cardY + 105);
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(reports.length > 0 ? COLORS.primary : COLORS.textLight)
        .text(`${reports.length} informe${reports.length !== 1 ? 's' : ''}`, col1X, cardY + 120);

      // Columna 2 Fila 2: Alta prioridad
      const highPriority = reports.filter(r => r.priority >= 3).length;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.textSecondary)
        .text('Alta Prioridad', col2X, cardY + 105);
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(highPriority > 0 ? COLORS.warning : COLORS.success)
        .text(highPriority > 0 ? `${highPriority} pendiente${highPriority !== 1 ? 's' : ''}` : 'Sin alertas', col2X, cardY + 120);

      doc.y = cardY + cardHeight + 25;

      // ===== INFORMACIÓN DEL TUTOR =====
      if (student.tutorName) {
        doc.fontSize(10)
          .font('Helvetica')
          .fillColor(COLORS.textSecondary)
          .text('Tutor/a responsable:', leftX, doc.y, { width: pageWidth, align: 'center' });

        doc.moveDown(0.3);
        doc.fontSize(14)
          .font('Helvetica-Bold')
          .fillColor(COLORS.text)
          .text(student.tutorName, leftX, doc.y, { width: pageWidth, align: 'center' });

        if (student.tutorEmail) {
          doc.fontSize(10)
            .font('Helvetica')
            .fillColor(COLORS.textLight)
            .text(student.tutorEmail, leftX, doc.y + 5, { width: pageWidth, align: 'center' });
        }
      }

      // Fecha de generación (parte inferior)
      doc.y = doc.page.height - 140;
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.textLight)
        .text(`Documento generado el ${this.formatDate(new Date())}`, leftX, doc.y, { width: pageWidth, align: 'center' });

      // Línea decorativa inferior
      doc.rect(centerX - 50, doc.page.height - 100, 100, 3)
        .fill(COLORS.primary);

      // ===== PÁGINA DE CONTENIDO =====
      if (reports.length > 0) {
        doc.addPage();
        this.drawHeaderWithLogo(doc, pageWidth);

        doc.moveDown(1);
        this.drawSectionHeader(doc, 'Detalle de Informes', pageWidth);
        doc.moveDown(1);

        reports.forEach((report, index) => {
          this.drawReportCard(doc, report, pageWidth, index === reports.length - 1);
        });
      } else {
        doc.addPage();
        this.drawHeaderWithLogo(doc, pageWidth);
        doc.moveDown(2);
        this.drawEmptyState(doc, pageWidth);
      }

      // ===== FOOTER EN TODAS LAS PÁGINAS =====
      const tutorInfo = student.tutorName ? { name: student.tutorName, email: student.tutorEmail || '' } : undefined;
      this.addFooterToAllPages(doc, tutorInfo);

      doc.end();
    });
  }

  /**
   * Crea el PDF para todos los estudiantes
   */
  private async createAllStudentsPdf(
    tutorInfo: TutorInfo,
    classGroups: ClassGroupData[],
    summary: DashboardSummary,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFKit({
        size: 'A4',
        margins: { top: 60, bottom: 60, left: 50, right: 50 },
        bufferPages: true,
        info: {
          Title: 'Informe Completo de Tutorados',
          Author: 'Mundo World School',
          Subject: 'Informes Cualitativos de Estudiantes',
          Creator: 'MW Panel - Sistema de Gestión Educativa',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

      // ===== PORTADA =====
      this.drawCoverPage(doc, tutorInfo, summary, pageWidth);

      // ===== PÁGINAS POR GRUPO =====
      classGroups.forEach((group, groupIndex) => {
        doc.addPage();
        this.drawGroupPage(doc, group, pageWidth, tutorInfo);
      });

      // ===== FOOTER EN TODAS LAS PÁGINAS =====
      this.addFooterToAllPages(doc, tutorInfo);

      doc.end();
    });
  }

  // ==================== MÉTODOS DE DIBUJO ====================

  /**
   * Dibuja la cabecera con logo
   */
  private drawHeaderWithLogo(doc: PDFKit.PDFDocument, pageWidth: number): void {
    const startY = doc.page.margins.top;
    const leftX = doc.page.margins.left;

    // Línea decorativa superior
    doc.rect(leftX, startY - 20, pageWidth, 4)
      .fill(COLORS.primary);

    // Logo o texto del colegio
    if (this.logoPath && fs.existsSync(this.logoPath)) {
      try {
        doc.image(this.logoPath, leftX, startY, { height: 50 });
      } catch (e) {
        this.drawTextLogo(doc, leftX, startY);
      }
    } else {
      this.drawTextLogo(doc, leftX, startY);
    }

    // Información del colegio a la derecha
    const rightX = doc.page.width - doc.page.margins.right - 180;
    doc.fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(COLORS.text)
      .text('MUNDO WORLD SCHOOL', rightX, startY + 5, { width: 180, align: 'right' });

    doc.fontSize(8)
      .font('Helvetica')
      .fillColor(COLORS.textSecondary)
      .text('Sistema de Gestión Educativa', rightX, startY + 20, { width: 180, align: 'right' })
      .text('plataforma.mundoworld.school', rightX, startY + 32, { width: 180, align: 'right' });

    // Línea separadora
    doc.moveTo(leftX, startY + 60)
      .lineTo(leftX + pageWidth, startY + 60)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();

    doc.y = startY + 70;
  }

  /**
   * Dibuja el logo en texto si no hay imagen
   */
  private drawTextLogo(doc: PDFKit.PDFDocument, x: number, y: number): void {
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(COLORS.primary)
      .text('MW', x, y + 10);

    doc.fontSize(8)
      .font('Helvetica')
      .fillColor(COLORS.textSecondary)
      .text('PANEL', x + 30, y + 15);
  }

  /**
   * Dibuja la tarjeta de información del estudiante
   */
  private drawStudentInfoCard(doc: PDFKit.PDFDocument, student: StudentInfo, pageWidth: number): void {
    const startY = doc.y;
    const leftX = doc.page.margins.left;
    const cardHeight = 100; // Aumentado para evitar solapamiento

    // Fondo de la tarjeta
    doc.roundedRect(leftX, startY, pageWidth, cardHeight, 8)
      .fill(COLORS.primaryLight);

    // Borde izquierdo decorativo
    doc.rect(leftX, startY, 5, cardHeight)
      .fill(COLORS.primary);

    // Contenido - Nombre completo
    const nameY = startY + 20;
    doc.fontSize(18)
      .font('Helvetica-Bold')
      .fillColor(COLORS.text)
      .text(`${student.firstName} ${student.lastName}`, leftX + 20, nameY, {
        width: pageWidth - 40,
      });

    // Información adicional - siempre debajo del nombre con espacio fijo
    const infoY = startY + 55; // Posición fija para evitar solapamiento

    doc.fontSize(11)
      .font('Helvetica')
      .fillColor(COLORS.textSecondary)
      .text('Matrícula: ', leftX + 20, infoY, { continued: true })
      .font('Helvetica-Bold')
      .fillColor(COLORS.text)
      .text(student.enrollmentNumber);

    // Grupo (si existe) - en una línea separada
    if (student.classGroup) {
      doc.fontSize(11)
        .font('Helvetica')
        .fillColor(COLORS.textSecondary)
        .text('Grupo: ', leftX + 20, infoY + 18, { continued: true })
        .font('Helvetica-Bold')
        .fillColor(COLORS.text)
        .text(student.classGroup);
    }

    doc.y = startY + cardHeight + 15;
  }

  /**
   * Dibuja el resumen de informes
   */
  private drawReportsSummary(doc: PDFKit.PDFDocument, reports: ReportData[], pageWidth: number): void {
    const startY = doc.y;
    const leftX = doc.page.margins.left;
    const boxWidth = (pageWidth - 30) / 4;
    const boxHeight = 60;

    // Contar por prioridad
    const byPriority = reports.reduce((acc, r) => {
      acc[r.priority] = (acc[r.priority] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const hasHighPriority = (byPriority[3] || 0) + (byPriority[4] || 0) > 0;

    const stats = [
      { value: reports.length, label: 'Total Informes', color: COLORS.primary },
      { value: byPriority[4] || 0, label: 'Urgentes', color: COLORS.danger },
      { value: byPriority[3] || 0, label: 'Importantes', color: COLORS.warning },
      { value: (byPriority[1] || 0) + (byPriority[2] || 0), label: 'Informativos', color: COLORS.success },
    ];

    stats.forEach((stat, index) => {
      const x = leftX + (boxWidth + 10) * index;

      // Caja
      doc.roundedRect(x, startY, boxWidth, boxHeight, 6)
        .fill(COLORS.white)
        .strokeColor(stat.color)
        .lineWidth(2)
        .stroke();

      // Número
      doc.fontSize(24)
        .font('Helvetica-Bold')
        .fillColor(stat.color)
        .text(stat.value.toString(), x, startY + 10, { width: boxWidth, align: 'center' });

      // Etiqueta
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor(COLORS.textSecondary)
        .text(stat.label, x, startY + 40, { width: boxWidth, align: 'center' });
    });

    doc.y = startY + boxHeight + 15;
  }

  /**
   * Dibuja un encabezado de sección
   */
  private drawSectionHeader(doc: PDFKit.PDFDocument, title: string, pageWidth: number): void {
    const leftX = doc.page.margins.left;

    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(COLORS.text)
      .text(title, leftX);

    doc.moveDown(0.3);

    // Línea decorativa
    doc.rect(leftX, doc.y, 60, 3)
      .fill(COLORS.primary);

    doc.moveDown(0.5);
  }

  /**
   * Dibuja una tarjeta de informe
   */
  private drawReportCard(doc: PDFKit.PDFDocument, report: ReportData, pageWidth: number, isLast: boolean): void {
    const leftX = doc.page.margins.left;
    const priority = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG[2];

    // Verificar espacio disponible
    const estimatedHeight = this.estimateReportHeight(doc, report, pageWidth);
    if (doc.y + estimatedHeight > doc.page.height - 100) {
      doc.addPage();
      this.drawHeaderWithLogo(doc, pageWidth);
      doc.moveDown(1);
    }

    const startY = doc.y;

    // Calcular altura real del contenido
    const contentHeight = this.calculateTextHeight(doc, report.content, pageWidth - 40, 10);
    const cardHeight = Math.max(80, 55 + contentHeight);

    // Fondo de la tarjeta
    doc.roundedRect(leftX, startY, pageWidth, cardHeight, 6)
      .fill(priority.bgColor);

    // Borde izquierdo de prioridad
    doc.rect(leftX, startY, 4, cardHeight)
      .fill(priority.color);

    // Cabecera del informe
    doc.y = startY + 12;

    // Contexto (tag)
    doc.fontSize(10).font('Helvetica-Bold');
    const tagWidth = doc.widthOfString(report.contextTag) + 16;
    doc.roundedRect(leftX + 15, doc.y - 2, tagWidth, 18, 3)
      .fill(COLORS.primary);

    doc.fontSize(10)
      .font('Helvetica-Bold')
      .fillColor(COLORS.white)
      .text(report.contextTag, leftX + 23, doc.y);

    // Prioridad
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor(priority.color)
      .text(priority.label, leftX + tagWidth + 30, startY + 10);

    // Fecha
    const dateText = this.formatDate(new Date(report.updatedAt));
    doc.fontSize(9)
      .fillColor(COLORS.textLight)
      .text(dateText, leftX + pageWidth - 100, startY + 12, { width: 85, align: 'right' });

    // Contenido del informe
    doc.y = startY + 35;
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor(COLORS.text)
      .text(report.content, leftX + 15, doc.y, {
        width: pageWidth - 30,
        lineGap: 3,
      });

    // Autor
    doc.y = startY + cardHeight - 18;
    doc.fontSize(9)
      .font('Helvetica')
      .fillColor(COLORS.textLight)
      .text(`Escrito por: ${report.authorName || 'Profesor'}`, leftX + 15);

    doc.y = startY + cardHeight + 12;
  }

  /**
   * Dibuja estado vacío
   */
  private drawEmptyState(doc: PDFKit.PDFDocument, pageWidth: number): void {
    const leftX = doc.page.margins.left;
    const centerX = leftX + pageWidth / 2;

    doc.fontSize(14)
      .font('Helvetica')
      .fillColor(COLORS.textLight)
      .text('No hay informes registrados', leftX, doc.y, { width: pageWidth, align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(10)
      .text('Los profesores aún no han escrito observaciones sobre este estudiante.',
        leftX, doc.y, { width: pageWidth, align: 'center' });
  }

  /**
   * Dibuja la portada del informe completo
   */
  private drawCoverPage(
    doc: PDFKit.PDFDocument,
    tutorInfo: TutorInfo,
    summary: DashboardSummary,
    pageWidth: number,
  ): void {
    const leftX = doc.page.margins.left;
    const centerX = leftX + pageWidth / 2;

    // Logo centrado grande
    doc.y = 100;
    if (this.logoPath && fs.existsSync(this.logoPath)) {
      try {
        doc.image(this.logoPath, centerX - 60, doc.y, { width: 120 });
        doc.y += 140;
      } catch (e) {
        this.drawLargeLogo(doc, centerX, doc.y);
        doc.y += 100;
      }
    } else {
      this.drawLargeLogo(doc, centerX, doc.y);
      doc.y += 100;
    }

    // Título principal
    doc.fontSize(28)
      .font('Helvetica-Bold')
      .fillColor(COLORS.text)
      .text('Informe de Tutoría', leftX, doc.y, { width: pageWidth, align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(14)
      .font('Helvetica')
      .fillColor(COLORS.textSecondary)
      .text('Resumen de observaciones cualitativas', leftX, doc.y, { width: pageWidth, align: 'center' });

    // Información del tutor
    doc.moveDown(3);
    doc.fontSize(12)
      .fillColor(COLORS.textSecondary)
      .text('Tutor/a responsable:', leftX, doc.y, { width: pageWidth, align: 'center' });

    doc.moveDown(0.3);
    doc.fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(COLORS.text)
      .text(tutorInfo.name, leftX, doc.y, { width: pageWidth, align: 'center' });

    if (tutorInfo.email) {
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.textLight)
        .text(tutorInfo.email, leftX, doc.y + 5, { width: pageWidth, align: 'center' });
    }

    // Resumen estadístico
    doc.moveDown(4);
    this.drawCoverStats(doc, summary, pageWidth);

    // Fecha de generación
    doc.y = doc.page.height - 120;
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor(COLORS.textLight)
      .text(`Documento generado el ${this.formatDate(new Date())}`, leftX, doc.y, { width: pageWidth, align: 'center' });

    // Línea decorativa inferior
    doc.rect(centerX - 50, doc.page.height - 80, 100, 3)
      .fill(COLORS.primary);
  }

  /**
   * Dibuja logo grande para portada
   */
  private drawLargeLogo(doc: PDFKit.PDFDocument, centerX: number, y: number): void {
    doc.fontSize(48)
      .font('Helvetica-Bold')
      .fillColor(COLORS.primary)
      .text('MW', centerX - 50, y, { width: 100, align: 'center' });

    doc.fontSize(14)
      .font('Helvetica')
      .fillColor(COLORS.textSecondary)
      .text('MUNDO WORLD SCHOOL', centerX - 100, y + 55, { width: 200, align: 'center' });
  }

  /**
   * Dibuja estadísticas en la portada
   */
  private drawCoverStats(doc: PDFKit.PDFDocument, summary: DashboardSummary, pageWidth: number): void {
    const leftX = doc.page.margins.left;
    const boxWidth = (pageWidth - 40) / 3;
    const boxHeight = 70;
    const startY = doc.y;

    const stats = [
      { value: summary.totalStudents, label: 'Estudiantes', sublabel: `en ${summary.totalGroups} grupo${summary.totalGroups !== 1 ? 's' : ''}` },
      { value: summary.totalReports, label: 'Informes', sublabel: `de ${summary.studentsWithReports} estudiantes` },
      { value: summary.highPriorityCount, label: 'Alta Prioridad', sublabel: summary.highPriorityCount > 0 ? 'requieren atención' : 'sin alertas' },
    ];

    stats.forEach((stat, index) => {
      const x = leftX + (boxWidth + 20) * index;
      const color = index === 2 && stat.value > 0 ? COLORS.warning : COLORS.primary;

      // Caja
      doc.roundedRect(x, startY, boxWidth, boxHeight, 8)
        .fillAndStroke(COLORS.white, COLORS.border);

      // Número grande
      doc.fontSize(28)
        .font('Helvetica-Bold')
        .fillColor(color)
        .text(stat.value.toString(), x, startY + 10, { width: boxWidth, align: 'center' });

      // Etiqueta
      doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor(COLORS.text)
        .text(stat.label, x, startY + 42, { width: boxWidth, align: 'center' });

      // Subetiqueta
      doc.fontSize(8)
        .font('Helvetica')
        .fillColor(COLORS.textLight)
        .text(stat.sublabel, x, startY + 56, { width: boxWidth, align: 'center' });
    });

    doc.y = startY + boxHeight + 20;
  }

  /**
   * Dibuja la página de un grupo
   */
  private drawGroupPage(
    doc: PDFKit.PDFDocument,
    group: ClassGroupData,
    pageWidth: number,
    tutorInfo: TutorInfo,
  ): void {
    const leftX = doc.page.margins.left;

    // Cabecera de página
    this.drawHeaderWithLogo(doc, pageWidth);

    // Título del grupo
    doc.moveDown(1);
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .fillColor(COLORS.text)
      .text(group.name, leftX);

    doc.fontSize(11)
      .font('Helvetica')
      .fillColor(COLORS.textSecondary)
      .text(`${group.totalStudents} estudiantes · ${group.totalReports} informes · ${group.studentsWithReports} con observaciones`);

    // Línea separadora
    doc.moveDown(0.8);
    doc.moveTo(leftX, doc.y)
      .lineTo(leftX + pageWidth, doc.y)
      .strokeColor(COLORS.border)
      .lineWidth(1)
      .stroke();

    doc.moveDown(1);

    // Lista de estudiantes
    group.students.forEach((student, index) => {
      this.drawStudentSummaryCard(doc, student, pageWidth, group.name);
    });
  }

  /**
   * Dibuja tarjeta resumida de estudiante para el informe completo
   */
  private drawStudentSummaryCard(
    doc: PDFKit.PDFDocument,
    student: StudentWithReports,
    pageWidth: number,
    groupName: string,
  ): void {
    const leftX = doc.page.margins.left;

    // Calcular altura necesaria
    let cardHeight = 70; // Base aumentada para nombre + matrícula
    if (student.reports.length > 0) {
      student.reports.forEach(report => {
        cardHeight += 70 + this.calculateTextHeight(doc, report.content.substring(0, 200), pageWidth - 50, 9);
      });
    }

    // Verificar espacio
    if (doc.y + cardHeight > doc.page.height - 80) {
      doc.addPage();
      this.drawHeaderWithLogo(doc, pageWidth);
      doc.moveDown(0.5);
      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.textLight)
        .text(`${groupName} (continuación)`, leftX, doc.y, { width: pageWidth, align: 'right' });
      doc.moveDown(1);
    }

    const startY = doc.y;

    // Fondo del estudiante
    const bgColor = student.hasHighPriority ? '#fff7e6' : COLORS.background;
    doc.roundedRect(leftX, startY, pageWidth, cardHeight, 6)
      .fill(bgColor);

    // Indicador de prioridad
    if (student.hasHighPriority) {
      doc.rect(leftX, startY, 4, cardHeight)
        .fill(COLORS.warning);
    }

    // Nombre del estudiante
    const nameY = startY + 12;
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(COLORS.text)
      .text(`${student.firstName} ${student.lastName}`, leftX + 15, nameY, {
        width: pageWidth - 120,
      });

    if (student.hasHighPriority) {
      doc.fillColor(COLORS.warning)
        .text('●', leftX + pageWidth - 30, nameY);
    }

    // Información - siempre en línea separada, posición fija
    const infoY = nameY + 22;
    doc.fontSize(10)
      .font('Helvetica')
      .fillColor(COLORS.textLight)
      .text(`${student.enrollmentNumber}  ·  ${student.totalReports} informe${student.totalReports !== 1 ? 's' : ''}`, leftX + 15, infoY);

    doc.y = infoY + 18;

    doc.moveDown(0.8);

    // Informes del estudiante
    if (student.reports.length > 0) {
      student.reports.forEach((report) => {
        const priority = PRIORITY_CONFIG[report.priority] || PRIORITY_CONFIG[2];

        // Línea de prioridad
        doc.rect(leftX + 20, doc.y, 3, 40)
          .fill(priority.color);

        // Contexto y autor
        doc.fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(COLORS.text)
          .text(report.contextTag, leftX + 30, doc.y, { continued: true });

        doc.font('Helvetica')
          .fillColor(COLORS.textLight)
          .text(`  —  ${report.authorName || 'Profesor'}`, { continued: false });

        // Contenido resumido
        doc.moveDown(0.3);
        const content = report.content.length > 200
          ? report.content.substring(0, 200) + '...'
          : report.content;

        doc.fontSize(9)
          .font('Helvetica')
          .fillColor(COLORS.textSecondary)
          .text(content, leftX + 30, doc.y, {
            width: pageWidth - 50,
            lineGap: 2,
          });

        doc.moveDown(0.8);
      });
    } else {
      doc.fontSize(9)
        .font('Helvetica')
        .fillColor(COLORS.textLight)
        .text('Sin observaciones registradas', leftX + 20);
      doc.moveDown(0.5);
    }

    doc.y = Math.max(doc.y, startY + cardHeight) + 12;
  }

  /**
   * Agrega footer a todas las páginas
   */
  private addFooterToAllPages(doc: PDFKit.PDFDocument, tutorInfo?: TutorInfo): void {
    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);

      const footerY = doc.page.height - 45;
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const leftX = doc.page.margins.left;

      // Línea separadora
      doc.moveTo(leftX, footerY - 10)
        .lineTo(leftX + pageWidth, footerY - 10)
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .stroke();

      // Texto del footer
      doc.fontSize(8)
        .font('Helvetica')
        .fillColor(COLORS.textLight);

      // Izquierda: info del sistema
      doc.text('MW Panel · Sistema de Gestión Educativa', leftX, footerY, { width: 200 });

      // Centro: tutor (si aplica)
      if (tutorInfo) {
        doc.text(`Tutor: ${tutorInfo.name}`, leftX + 200, footerY, { width: pageWidth - 400, align: 'center' });
      }

      // Derecha: número de página
      doc.text(`Página ${i + 1} de ${totalPages}`, leftX + pageWidth - 80, footerY, { width: 80, align: 'right' });
    }
  }

  // ==================== UTILIDADES ====================

  /**
   * Formatea una fecha
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Calcula la altura de un texto
   */
  private calculateTextHeight(
    doc: PDFKit.PDFDocument,
    text: string,
    width: number,
    fontSize: number,
  ): number {
    const lineHeight = fontSize * 1.4;
    const words = text.split(' ');
    let lines = 1;
    let currentLine = '';

    doc.fontSize(fontSize);

    words.forEach(word => {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = doc.widthOfString(testLine);

      if (testWidth > width && currentLine) {
        lines++;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });

    return lines * lineHeight;
  }

  /**
   * Estima la altura de un informe
   */
  private estimateReportHeight(
    doc: PDFKit.PDFDocument,
    report: ReportData,
    pageWidth: number,
  ): number {
    const contentHeight = this.calculateTextHeight(doc, report.content, pageWidth - 40, 10);
    return Math.max(80, 55 + contentHeight) + 20;
  }
}
