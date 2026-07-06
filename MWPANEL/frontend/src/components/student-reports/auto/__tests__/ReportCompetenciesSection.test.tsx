import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportCompetenciesSection } from '../ReportCompetenciesSection';

const metrics = { overallVerdict: 'en_progreso', competencies: { averageScore: 3.5, strengths: ['CCL'], weaknesses: ['STEM'] } } as any;

describe('ReportCompetenciesSection', () => {
  it('muestra fortalezas y debilidades con datos', () => {
    render(<ReportCompetenciesSection
      data={{ hasData: true, items: [{ code: 'CCL', name: 'Comunicación', score: 4 }] }}
      metrics={metrics} />);
    expect(screen.getByText(/Competencias/i)).toBeTruthy();
    expect(screen.getByText('CCL')).toBeTruthy();
  });

  it('aviso sin datos cuando hasData=false', () => {
    render(<ReportCompetenciesSection data={{ hasData: false, items: [] }} metrics={metrics} />);
    expect(screen.getByText(/Sin datos/i)).toBeTruthy();
  });
});
