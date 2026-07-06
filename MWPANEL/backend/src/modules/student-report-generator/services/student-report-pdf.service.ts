import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { StudentReportResult, StudentReportData } from '../types/student-report.types';

@Injectable()
export class StudentReportPdfService {
  async generate(result: StudentReportResult): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        const s = result.student;
        doc.fontSize(18).fillColor('#3F6E58').text('Informe del alumno/a', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(12).fillColor('#333').text(`${s.firstName} ${s.lastName}  ·  ${s.enrollmentNumber}`, { align: 'center' });
        doc.fontSize(10).fillColor('#666').text(`${s.educationalLevel ?? ''} ${s.classGroup ? '· ' + s.classGroup : ''}  ·  Generado: ${result.generatedAt.slice(0,10)}`, { align: 'center' });
        doc.moveDown(1);

        this.section(doc, 'Valoración global', `Veredicto: ${result.metrics.overallVerdict}` + (result.narrative.aiGenerated ? ' (síntesis con IA)' : ' (síntesis automática)'));

        const d: StudentReportData = result.data;
        if (d.academic) {
          this.section(doc, 'Académico', result.narrative.academicAssessment);
          if (d.academic.hasData) d.academic.subjects.forEach((sub) => doc.fontSize(10).fillColor('#333').text(`• ${sub.name}: ${sub.average ?? 's/d'}/100 (${sub.gradedItems} ítems)`));
          else doc.fontSize(10).fillColor('#999').text('Sin datos académicos en el periodo.');
          doc.moveDown(0.5);
        }
        // Progreso en clave LOMLOE (solo modo detallado)
        if (d.filters?.detailed && result.narrative.lomloeAssessment) {
          this.section(doc, 'Progreso en clave LOMLOE', result.narrative.lomloeAssessment);
        }
        // Prosa detallada de trabajos concretos (solo modo detallado)
        if (d.filters?.detailed && result.narrative.detailedAcademic) {
          this.section(doc, 'Detalle académico (trabajos)', result.narrative.detailedAcademic);
        }
        if (d.competencies) {
          const is100 = d.competencies.scale === '0-100';
          this.section(doc, is100 ? 'Competencias (LOMLOE, 0-100)' : 'Competencias clave (1-5)', '');
          if (d.competencies.hasData) d.competencies.items.forEach((c) => doc.fontSize(10).fillColor('#333').text(`• ${c.name}: ${c.score ?? 's/d'}${is100 ? '/100' : ''}`));
          else doc.fontSize(10).fillColor('#999').text('Sin evaluaciones de competencias.');
          doc.moveDown(0.5);
        }
        if (d.socioEmotional) this.section(doc, 'Emocional y social', d.socioEmotional.hasData ? result.narrative.socioEmotionalAssessment : 'Sin observaciones formativas registradas en el periodo.');
        if (d.attendance) this.section(doc, 'Asistencia', d.attendance.hasData ? `Tasa de asistencia: ${d.attendance.attendanceRate ?? 's/d'}% · Ausencias: ${d.attendance.absentDays} (justificadas: ${d.attendance.justifiedAbsences})` : 'Sin datos de asistencia.');
        if (d.dua && d.dua.hasData) this.section(doc, 'Adaptaciones (DUA)', `Adaptaciones: ${d.dua.accommodations.map((x) => x.name).join(', ') || '—'}`);
        if (d.qualitative && d.qualitative.hasData) { this.section(doc, 'Informes cualitativos', ''); d.qualitative.reports.forEach((r) => doc.fontSize(10).fillColor('#333').text(`• [${r.contextTag}] ${r.content}`)); doc.moveDown(0.5); }

        // Detalle por criterio (LOMLOE) — andamiaje (solo modo detallado)
        if (d.filters?.detailed) {
          const subjects = (d.lomloeProgress?.subjects || []).filter((s) =>
            s.criteria.some((c) => c.states.T1 || c.states.T2 || c.states.T3));
          this.section(doc, 'Detalle por criterio (LOMLOE)', '');
          if (subjects.length === 0) {
            doc.fontSize(10).fillColor('#999').text('Sin datos de calificación por criterio todavía. Esta sección se rellenará automáticamente cuando el profesorado empiece a calificar por criterio.');
            doc.moveDown(0.5);
          } else {
            for (const subj of subjects) {
              doc.fontSize(11).fillColor('#3F6E58').text(subj.subjectName);
              for (const c of subj.criteria) {
                const st = (s: any) => s === 'ACHIEVED' ? 'Alcanzado' : s === 'IN_PROGRESS' ? 'En proceso' : s === 'NOT_ACHIEVED' ? 'No completado' : '—';
                doc.fontSize(9).fillColor('#333').text(`• ${c.code} — ${c.name}: 1ºT ${st(c.states.T1)} · 2ºT ${st(c.states.T2)} · 3ºT ${st(c.states.T3)}`);
              }
              doc.moveDown(0.3);
            }
          }
        }

        if (result.narrative.strengths.length) { this.section(doc, 'Fortalezas', ''); result.narrative.strengths.forEach((x) => doc.fontSize(10).fillColor('#2a7').text(`• ${x}`)); doc.moveDown(0.5); }
        if (result.narrative.improvementAreas.length) { this.section(doc, 'Áreas de mejora', ''); result.narrative.improvementAreas.forEach((x) => doc.fontSize(10).fillColor('#c63').text(`• ${x}`)); doc.moveDown(0.5); }
        if (result.narrative.recommendations.length) { this.section(doc, 'Recomendaciones', ''); result.narrative.recommendations.forEach((x) => doc.fontSize(10).fillColor('#333').text(`• ${x}`)); }

        doc.end();
      } catch (e) { reject(e); }
    });
  }

  private section(doc: any, title: string, body: string) {
    doc.moveDown(0.4);
    doc.fontSize(13).fillColor('#3F6E58').text(title);
    doc.moveTo(doc.x, doc.y).lineTo(545, doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.2);
    if (body) doc.fontSize(10).fillColor('#333').text(body, { align: 'justify' });
  }
}
