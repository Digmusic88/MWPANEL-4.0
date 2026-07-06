import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { StudentReportMetrics, StudentReportData, StudentReportNarrative, SubjectSubgrade, LomloeCatalogEntry } from '../types/student-report.types';

@Injectable()
export class StudentReportNarrativeService {
  private readonly logger = new Logger(StudentReportNarrativeService.name);
  constructor(private readonly config: ConfigService) {}

  async build(metrics: StudentReportMetrics, data: StudentReportData): Promise<StudentReportNarrative> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) return this.buildFallback(metrics, data);
    const detailed = !!data.filters?.detailed;
    try {
      const client = new Anthropic({ apiKey });
      const model = this.config.get<string>('AI_MODEL') || 'claude-opus-4-7';
      const prompt = this.prompt(metrics, data);
      const resp = await client.messages.create({
        model, max_tokens: detailed ? 2200 : 1500,
        system: this.systemPrompt(detailed),
        messages: [{ role: 'user', content: prompt }],
      });
      const text = resp.content?.[0]?.type === 'text' ? (resp.content[0] as any).text : '';
      const parsed = JSON.parse(this.extractJson(text));
      return {
        aiGenerated: true,
        academicAssessment: parsed.academicAssessment || '',
        socioEmotionalAssessment: parsed.socioEmotionalAssessment || '',
        strengths: parsed.strengths || [],
        improvementAreas: parsed.improvementAreas || [],
        recommendations: parsed.recommendations || [],
        ...(detailed
          ? {
              detailedAcademic: parsed.detailedAcademic || '',
              lomloeAssessment: parsed.lomloeAssessment || '',
            }
          : {}),
      };
    } catch (e) {
      this.logger.warn(`IA no disponible para el informe, usando fallback: ${e?.message}`);
      return this.buildFallback(metrics, data);
    }
  }

  buildFallback(metrics: StudentReportMetrics, data: StudentReportData): StudentReportNarrative {
    const name = data.student.firstName || 'El alumno/a';
    const a = metrics.academic; const se = metrics.socioEmotional;
    const academicAssessment = a
      ? `${name} presenta un rendimiento académico ${a.band} (media ${a.overallAverage ?? 's/d'}/100).` +
        (a.best ? ` Destaca en ${a.best.name} (${a.best.average}).` : '') +
        (a.worst && a.worst.name !== a.best?.name ? ` Conviene reforzar ${a.worst.name} (${a.worst.average}).` : '')
      : `No hay aún datos académicos registrados para ${name} en el periodo seleccionado.`;
    const socioEmotionalAssessment = se
      ? `En el plano emocional y social, las observaciones se centran en ${se.dominantAspects?.join(' y ') || 'aspectos variados'}, ` +
        `con un ${Math.round((se.positiveRatio ?? 0) * 100)}% de registros positivos y un progreso predominante "${se.predominantProgress ?? 's/d'}".`
      : `No hay aún observaciones formativas (emocional/social) registradas para ${name}.`;
    const strengths = [
      ...(metrics.competencies?.strengths || []).map((s) => `Competencia destacada: ${s}`),
      ...(a?.best ? [`Buen desempeño en ${a.best.name}`] : []),
    ].slice(0, 5);
    const improvementAreas = [
      ...(metrics.competencies?.weaknesses || []).map((w) => `Reforzar competencia: ${w}`),
      ...(a?.worst && a.worst.name !== a.best?.name ? [`Apoyo en ${a.worst.name}`] : []),
      ...(metrics.attendance?.alert ? ['Mejorar la asistencia/puntualidad'] : []),
    ].slice(0, 5);
    const recommendations = this.recs(metrics);
    const base: StudentReportNarrative = { aiGenerated: false, academicAssessment, socioEmotionalAssessment, strengths, improvementAreas, recommendations };
    if (!data.filters?.detailed) return base;
    return {
      ...base,
      detailedAcademic: this.fallbackDetailedAcademic(data.subgrades),
      lomloeAssessment: this.fallbackLomloeAssessment(data.lomloeCatalog),
    };
  }

  private fallbackDetailedAcademic(subgrades?: SubjectSubgrade[]): string {
    if (!subgrades || !subgrades.length) return '';
    return subgrades
      .map((sg) => {
        const works = (sg.works || []).length
          ? (sg.works || [])
              .map((w) => `${w.title}${w.score !== null && w.score !== undefined ? ` (${w.score})` : ''}`)
              .join(', ')
          : 'sin trabajos registrados';
        return `En ${sg.subjectName} la nota final es ${sg.finalGrade ?? 's/d'}; trabajos: ${works}.`;
      })
      .join(' ');
  }

  private fallbackLomloeAssessment(catalog?: LomloeCatalogEntry[]): string {
    if (!catalog || !catalog.length) return '';
    return catalog
      .map((c) => {
        const criteria = (c.criteria || []).length
          ? (c.criteria || []).map((cr) => `${cr.code}: ${cr.description}`).join('; ')
          : 'sin criterios registrados';
        return `El área de ${c.subjectName} trabaja criterios como ${criteria}.`;
      })
      .join(' ');
  }

  private recs(m: StudentReportMetrics): string[] {
    const r: string[] = [];
    if (m.overallVerdict === 'necesita_apoyo') r.push('Establecer un plan de apoyo individualizado y seguimiento cercano.');
    if (m.attendance?.alert) r.push('Contactar con la familia para mejorar la asistencia.');
    if (m.competencies?.weaknesses?.length) r.push(`Diseñar actividades específicas para: ${m.competencies.weaknesses.join(', ')}.`);
    if (m.academic?.worst) r.push(`Reforzar ${m.academic.worst.name} con tareas graduadas.`);
    if (!r.length) r.push('Mantener el acompañamiento actual y reforzar los logros.');
    return r.slice(0, 5);
  }

  private systemPrompt(detailed: boolean): string {
    const base = 'Eres un orientador educativo español. Redactas informes de evaluación del alumnado claros, respetuosos y constructivos, integrando lo académico y lo emocional/social. Devuelve SOLO un JSON válido con las claves: academicAssessment, socioEmotionalAssessment, strengths (array), improvementAreas (array), recommendations (array). En español.';
    if (!detailed) return base;
    return (
      base +
      ' Además, devuelve las claves detailedAcademic (prosa que mencione trabajos concretos: qué actividades o tareas concretas suben o bajan la media, la constancia y la evolución del alumno/a a lo largo del periodo) y lomloeAssessment (valoración cualitativa del progreso en clave LOMLOE, referenciando de forma cualitativa los criterios de evaluación y saberes básicos trabajados en cada asignatura). Regla dura: NO inventes notas ni puntuaciones por criterio; describe el progreso siempre de forma cualitativa.'
    );
  }

  private prompt(m: StudentReportMetrics, data: StudentReportData): string {
    let base = `Redacta un informe de evaluación del alumno/a ${data.student.firstName} ${data.student.lastName} ` +
      `(${data.student.educationalLevel ?? ''}). Métricas: ${JSON.stringify(m)}. Datos resumidos: ${JSON.stringify({
        academic: data.academic, competencies: data.competencies, socioEmotional: { hasData: data.socioEmotional?.hasData, totalObservations: data.socioEmotional?.totalObservations, byAspect: data.socioEmotional?.byAspect, byType: data.socioEmotional?.byType }, attendance: data.attendance,
      })}. Devuelve SOLO el JSON pedido.`;
    if (data.filters?.detailed) base += this.detailedPromptSection(data);
    return base;
  }

  private detailedPromptSection(data: StudentReportData): string {
    const subgradesSummary = (data.subgrades || [])
      .slice(0, 20)
      .map((sg) => {
        const works = (sg.works || [])
          .slice(0, 8)
          .map((w) => `${w.title}${w.type ? ` (${w.type})` : ''}${w.score !== null && w.score !== undefined ? `: ${w.score}` : ''}`)
          .join('; ');
        return `${sg.subjectName} (nota final: ${sg.finalGrade ?? 's/d'}) — trabajos: ${works || 'sin trabajos registrados'}`;
      })
      .join(' | ');
    const catalogSummary = (data.lomloeCatalog || [])
      .slice(0, 20)
      .map((c) => {
        const criteria = (c.criteria || [])
          .slice(0, 6)
          .map((cr) => `${cr.code}: ${cr.description}`)
          .join('; ');
        return `${c.subjectName} — criterios: ${criteria || 'sin criterios registrados'}`;
      })
      .join(' | ');
    return (
      ` Información detallada adicional (para narrativa ampliada; NO inventes notas por criterio): ` +
      `Trabajos por asignatura: ${subgradesSummary || 'sin datos de trabajos'}. ` +
      `Criterios LOMLOE trabajados por asignatura: ${catalogSummary || 'sin catálogo disponible'}.`
    );
  }

  private extractJson(text: string): string { const a = text.indexOf('{'); const b = text.lastIndexOf('}'); return a >= 0 && b > a ? text.slice(a, b + 1) : '{}'; }
}
