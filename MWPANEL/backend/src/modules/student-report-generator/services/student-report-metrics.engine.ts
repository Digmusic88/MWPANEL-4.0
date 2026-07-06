import { Injectable } from '@nestjs/common';
import { StudentReportData, StudentReportMetrics } from '../types/student-report.types';

@Injectable()
export class StudentReportMetricsEngine {
  compute(data: StudentReportData): StudentReportMetrics {
    const metrics: StudentReportMetrics = { overallVerdict: 'sin_datos' };

    if (data.academic?.hasData && data.academic.subjects.length) {
      const subs = data.academic.subjects.filter((s) => typeof s.average === 'number');
      const avg = data.academic.overallAverage;
      const sorted = [...subs].sort((a, b) => (b.average! - a.average!));
      metrics.academic = {
        overallAverage: avg,
        band: this.band(avg),
        best: sorted[0] ? { name: sorted[0].name, average: sorted[0].average! } : undefined,
        worst: sorted.length ? { name: sorted[sorted.length - 1].name, average: sorted[sorted.length - 1].average! } : undefined,
      };
    }

    if (data.competencies?.hasData && data.competencies.items.length) {
      const items = data.competencies.items.filter((c) => typeof c.score === 'number');
      const mean = items.length ? items.reduce((n, c) => n + c.score!, 0) / items.length : null;
      const sorted = [...items].sort((a, b) => b.score! - a.score!);
      const is100 = data.competencies.scale === '0-100';
      const strongAt = is100 ? 75 : 4;
      const weakAt = is100 ? 40 : 2.5;
      metrics.competencies = {
        averageScore: mean,
        strengths: sorted.filter((c) => c.score! >= strongAt).slice(0, 3).map((c) => c.name),
        weaknesses: [...sorted].reverse().filter((c) => c.score! <= weakAt).slice(0, 3).map((c) => c.name),
      };
    }

    if (data.socioEmotional?.hasData && data.socioEmotional.totalObservations > 0) {
      const se = data.socioEmotional;
      const positive = (se.byType['ACHIEVEMENT'] || 0) + (se.byType['INTERACTION'] || 0);
      metrics.socioEmotional = {
        dominantAspects: Object.entries(se.byAspect).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k),
        positiveRatio: se.totalObservations ? positive / se.totalObservations : null,
        predominantProgress: Object.entries(se.byProgress).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      };
    }

    if (data.attendance?.hasData && typeof data.attendance.attendanceRate === 'number') {
      metrics.attendance = { rate: data.attendance.attendanceRate, alert: data.attendance.attendanceRate < 90 };
    }

    metrics.overallVerdict = this.verdict(metrics);
    return metrics;
  }

  private band(avg: number | null): string {
    if (avg == null) return 'sin_datos';
    if (avg >= 85) return 'excelente';
    if (avg >= 70) return 'bien';
    if (avg >= 50) return 'suficiente';
    return 'insuficiente';
  }

  private verdict(m: StudentReportMetrics): StudentReportMetrics['overallVerdict'] {
    const hasAny = m.academic || m.competencies || m.socioEmotional || m.attendance;
    if (!hasAny) return 'sin_datos';
    let score = 0, signals = 0;
    if (m.academic?.overallAverage != null) { signals++; score += m.academic.overallAverage >= 70 ? 1 : (m.academic.overallAverage >= 50 ? 0 : -1); }
    if (m.socioEmotional?.positiveRatio != null) { signals++; score += m.socioEmotional.positiveRatio >= 0.6 ? 1 : (m.socioEmotional.positiveRatio >= 0.4 ? 0 : -1); }
    if (m.attendance?.rate != null) { signals++; score += m.attendance.rate >= 90 ? 1 : (m.attendance.rate >= 75 ? 0 : -1); }
    if (signals === 0) return 'en_progreso';
    if (score >= Math.ceil(signals * 0.75)) return 'consolidado';
    if (score < 0) return 'necesita_apoyo';
    return 'en_progreso';
  }
}
