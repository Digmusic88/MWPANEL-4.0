/**
 * @archivo: grade-reports.service.ts
 * @módulo: Grades (Centralización de Valoraciones)
 * @función: Generación de reportes PDF y Excel para calificaciones centralizadas
 * @crítico: SÍ - Generación de documentos oficiales
 * @actualizado: Julio 2025 - Sistema de reportes integrado
 */

import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { CentralizedGrade } from '../entities/centralized-grade.entity';

export interface ReportData {
  student: {
    id: string;
    fullName: string;
    enrollmentNumber: string;
    level: string;
    course: string;
    classGroups: string[];
    avatarUrl?: string;
  };
  period: string;
  generatedAt: Date;
  summary: {
    totalSubjects: number;
    averageGrade: number;
    passingSubjects: number;
    excellentGrades: number;
  };
  grades: Array<{
    subject: string;
    finalGrade: number;
    achievementLevel: string;
    isPassing: boolean;
    trend: string;
    teacherComments?: string;
    lastUpdate: Date;
    breakdown?: any;
    aiInsights?: any;
  }>;
}

@Injectable()
export class GradeReportsService {
  private readonly logger = new Logger(GradeReportsService.name);
  private readonly logoPath = path.join(process.cwd(), 'uploads', 'logo-MWSchool.png');

  /**
   * Genera un reporte PDF de calificaciones
   */
  async generatePDFReport(reportData: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header del documento
        this.addPDFHeader(doc, reportData);
        
        // Información del estudiante
        this.addStudentInfo(doc, reportData);
        
        // Resumen de calificaciones
        this.addGradesSummary(doc, reportData);
        
        // Tabla de calificaciones detallada
        this.addGradesTable(doc, reportData);
        
        // Footer
        this.addPDFFooter(doc, reportData);

        doc.end();
      } catch (error) {
        this.logger.error(`Error generando reporte PDF: ${error.message}`);
        reject(error);
      }
    });
  }

  /**
   * Genera un reporte Excel de calificaciones
   */
  async generateExcelReport(reportData: ReportData): Promise<Buffer> {
    try {
      const workbook = XLSX.utils.book_new();

      // Hoja 1: Resumen del estudiante
      const summaryData = [
        ['REPORTE DE CALIFICACIONES CENTRALIZADAS'],
        [],
        ['Estudiante:', reportData.student.fullName],
        ['Número de Matrícula:', reportData.student.enrollmentNumber],
        ['Nivel:', reportData.student.level],
        ['Curso:', reportData.student.course],
        ['Clase(s):', reportData.student.classGroups.join(', ')],
        ['Período:', reportData.period],
        ['Generado:', reportData.generatedAt.toLocaleDateString()],
        [],
        ['RESUMEN'],
        ['Total de Asignaturas:', reportData.summary.totalSubjects],
        ['Promedio General:', reportData.summary.averageGrade.toFixed(2)],
        ['Asignaturas Aprobadas:', reportData.summary.passingSubjects],
        ['Calificaciones Excelentes:', reportData.summary.excellentGrades],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

      // Hoja 2: Calificaciones detalladas
      const gradesHeaders = [
        'Asignatura',
        'Calificación Final',
        'Nivel de Logro',
        '¿Aprueba?',
        'Tendencia',
        'Comentarios del Profesor',
        'Última Actualización',
      ];

      const gradesData = [
        gradesHeaders,
        ...reportData.grades.map(grade => [
          grade.subject,
          grade.finalGrade,
          grade.achievementLevel,
          grade.isPassing ? 'Sí' : 'No',
          grade.trend === 'improving' ? 'Mejorando' : 
          grade.trend === 'declining' ? 'Bajando' : 'Estable',
          grade.teacherComments || '',
          grade.lastUpdate.toLocaleDateString(),
        ]),
      ];

      const gradesSheet = XLSX.utils.aoa_to_sheet(gradesData);
      
      // Aplicar formato a las columnas
      const range = XLSX.utils.decode_range(gradesSheet['!ref'] || 'A1');
      gradesSheet['!cols'] = [
        { width: 20 }, // Asignatura
        { width: 15 }, // Calificación
        { width: 15 }, // Nivel de Logro
        { width: 10 }, // ¿Aprueba?
        { width: 12 }, // Tendencia
        { width: 30 }, // Comentarios
        { width: 15 }, // Última Actualización
      ];

      XLSX.utils.book_append_sheet(workbook, gradesSheet, 'Calificaciones');

      // Hoja 3: Desglose por componentes (si está disponible)
      if (reportData.grades.some(g => g.breakdown)) {
        const breakdownData = this.createBreakdownSheet(reportData);
        const breakdownSheet = XLSX.utils.aoa_to_sheet(breakdownData);
        XLSX.utils.book_append_sheet(workbook, breakdownSheet, 'Desglose');
      }

      // Convertir a buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      return excelBuffer;

    } catch (error) {
      this.logger.error(`Error generando reporte Excel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Genera un reporte PDF para múltiples estudiantes (clase completa)
   */
  async generateClassPDFReport(classData: {
    classInfo: any;
    grades: CentralizedGrade[];
    statistics: any;
  }): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header del reporte de clase
        this.addClassReportHeader(doc, classData);
        
        // Estadísticas de la clase
        this.addClassStatistics(doc, classData);
        
        // Tabla de calificaciones de todos los estudiantes
        this.addClassGradesTable(doc, classData);

        doc.end();
      } catch (error) {
        this.logger.error(`Error generando reporte PDF de clase: ${error.message}`);
        reject(error);
      }
    });
  }

  // Métodos privados para construcción de PDF

  private addPDFHeader(doc: PDFKit.PDFDocument, reportData: ReportData): void {
    // Add MundoWorld logo on the right side
    if (fs.existsSync(this.logoPath)) {
      try {
        const logoWidth = 50;
        const logoX = 520 - logoWidth; // Right aligned
        const logoY = 50;
        
        doc.image(this.logoPath, logoX, logoY, {
          width: logoWidth
        });
      } catch (error) {
        this.logger.warn('Error loading logo:', error);
      }
    }

    doc.fontSize(20)
       .text('REPORTE DE CALIFICACIONES CENTRALIZADAS', { align: 'center' })
       .moveDown(1);

    doc.fontSize(12)
       .text('MW Panel - Sistema de Gestión Escolar', { align: 'center' })
       .moveDown(2);
  }

  private addStudentInfo(doc: PDFKit.PDFDocument, reportData: ReportData): void {
    const student = reportData.student;
    
    // Section title
    doc.fontSize(14)
       .text('INFORMACIÓN DEL ESTUDIANTE', { underline: true })
       .moveDown(0.5);

    const startY = doc.y;
    const leftColumnX = 50;
    const rightColumnX = 250;
    
    // Add student photo on the left side if available
    let photoAdded = false;
    if (student.avatarUrl) {
      try {
        const photoPath = path.join(process.cwd(), student.avatarUrl.replace('/uploads/', 'uploads/'));
        if (fs.existsSync(photoPath)) {
          const photoWidth = 80;
          const photoHeight = 100;
          doc.image(photoPath, leftColumnX, startY, {
            width: photoWidth,
            height: photoHeight,
            fit: [photoWidth, photoHeight]
          });
          photoAdded = true;
        }
      } catch (error) {
        this.logger.warn('Error loading student photo:', error);
      }
    }
    
    // Add student information in the right column
    const infoX = photoAdded ? leftColumnX + 100 : leftColumnX;
    doc.y = startY;
    
    doc.fontSize(12)
       .text(`Nombre: ${student.fullName}`, infoX)
       .moveDown(0.3)
       .text(`Número de Matrícula: ${student.enrollmentNumber}`, infoX)
       .moveDown(0.3)
       .text(`Nivel Educativo: ${student.level}`, infoX)
       .moveDown(0.3)
       .text(`Curso: ${student.course}`, infoX)
       .moveDown(0.3)
       .text(`Clase(s): ${student.classGroups.join(', ')}`, infoX)
       .moveDown(0.3)
       .text(`Período: ${reportData.period}`, infoX)
       .moveDown(0.3)
       .text(`Fecha de Generación: ${reportData.generatedAt.toLocaleDateString()}`, infoX);
    
    // Ensure we move down enough to clear the photo area
    if (photoAdded && doc.y < startY + 100) {
      doc.y = startY + 100;
    }
    
    doc.moveDown(1);
  }

  private addGradesSummary(doc: PDFKit.PDFDocument, reportData: ReportData): void {
    const summary = reportData.summary;
    
    doc.fontSize(14)
       .text('RESUMEN DE CALIFICACIONES', { underline: true })
       .moveDown(0.5);

    doc.fontSize(12)
       .text(`Total de Asignaturas: ${summary.totalSubjects}`)
       .text(`Promedio General: ${summary.averageGrade.toFixed(2)}`)
       .text(`Asignaturas Aprobadas: ${summary.passingSubjects}`)
       .text(`Calificaciones Excelentes: ${summary.excellentGrades}`)
       .moveDown(1);
  }

  private addGradesTable(doc: PDFKit.PDFDocument, reportData: ReportData): void {
    doc.fontSize(14)
       .text('CALIFICACIONES DETALLADAS', { underline: true })
       .moveDown(0.5);

    // Headers de la tabla
    const tableTop = doc.y;
    const col1 = 50;  // Asignatura
    const col2 = 200; // Calificación
    const col3 = 280; // Nivel
    const col4 = 360; // Tendencia
    const col5 = 440; // Fecha

    doc.fontSize(10)
       .text('Asignatura', col1, tableTop)
       .text('Calificación', col2, tableTop)
       .text('Nivel', col3, tableTop)
       .text('Tendencia', col4, tableTop)
       .text('Actualizado', col5, tableTop);

    // Línea de separación
    doc.moveTo(col1, tableTop + 15)
       .lineTo(520, tableTop + 15)
       .stroke();

    let currentY = tableTop + 25;

    reportData.grades.forEach((grade, index) => {
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      // Handle null or undefined grades properly
      const gradeText = grade.finalGrade !== null && grade.finalGrade !== undefined 
        ? grade.finalGrade.toString() 
        : 'Sin calificar';
      
      const achievementText = grade.achievementLevel || 'Pendiente';
      const trendText = this.getTrendText(grade.trend);
      
      doc.fontSize(9)
         .text(grade.subject, col1, currentY)
         .text(gradeText, col2, currentY)
         .text(achievementText, col3, currentY)
         .text(trendText, col4, currentY)
         .text(grade.lastUpdate.toLocaleDateString(), col5, currentY);

      if (grade.teacherComments) {
        currentY += 12;
        doc.fontSize(8)
           .fillColor('#666666')
           .text(grade.teacherComments, col1, currentY, { width: 470 })
           .fillColor('#000000');
      }

      currentY += 20;
    });
  }

  private addPDFFooter(doc: PDFKit.PDFDocument, reportData: ReportData): void {
    doc.fontSize(8)
       .text('Documento generado automáticamente por MW Panel', 50, 750, { 
         align: 'center',
         width: 500 
       });
  }

  private addClassReportHeader(doc: PDFKit.PDFDocument, classData: any): void {
    doc.fontSize(18)
       .text('REPORTE DE CALIFICACIONES - CLASE COMPLETA', { align: 'center' })
       .moveDown(1);

    doc.fontSize(12)
       .text(`Clase: ${classData.classInfo.name}`)
       .text(`Asignatura: ${classData.classInfo.subject}`)
       .text(`Profesor: ${classData.classInfo.teacher}`)
       .text(`Fecha: ${new Date().toLocaleDateString()}`)
       .moveDown(1);
  }

  private addClassStatistics(doc: PDFKit.PDFDocument, classData: any): void {
    const stats = classData.statistics;
    
    doc.fontSize(14)
       .text('ESTADÍSTICAS DE LA CLASE', { underline: true })
       .moveDown(0.5);

    doc.fontSize(12)
       .text(`Promedio de la Clase: ${stats.classAverage}`)
       .text(`Tasa de Aprobación: ${stats.passingRate}%`)
       .text(`Estudiantes Excelentes: ${stats.excellentRate}%`)
       .text(`Necesitan Atención: ${stats.needsAttentionCount}`)
       .moveDown(1);
  }

  private addClassGradesTable(doc: PDFKit.PDFDocument, classData: any): void {
    doc.fontSize(14)
       .text('CALIFICACIONES POR ESTUDIANTE', { underline: true })
       .moveDown(0.5);

    // Implementar tabla de clase completa
    // Similar a addGradesTable pero para múltiples estudiantes
  }

  private createBreakdownSheet(reportData: ReportData): any[][] {
    const breakdownData = [['DESGLOSE POR COMPONENTES'], []];

    reportData.grades.forEach(grade => {
      if (grade.breakdown) {
        breakdownData.push([`Asignatura: ${grade.subject}`]);
        breakdownData.push(['Componente', 'Puntuación', 'Peso', 'Puntuación Ponderada']);
        
        grade.breakdown.forEach((component: any) => {
          breakdownData.push([
            component.component,
            component.normalizedScore,
            `${component.weight}%`,
            component.weightedScore,
          ]);
        });
        
        breakdownData.push([]); // Espacio entre asignaturas
      }
    });

    return breakdownData;
  }

  private getTrendText(trend: string): string {
    if (!trend) return 'Sin datos';
    
    switch (trend) {
      case 'improving': return 'Mejorando';
      case 'declining': return 'Bajando';
      case 'stable': return 'Estable';
      default: return 'Sin datos';
    }
  }
}