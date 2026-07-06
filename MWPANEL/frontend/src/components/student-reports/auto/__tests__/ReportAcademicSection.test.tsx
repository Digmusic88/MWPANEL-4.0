import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportAcademicSection } from '../ReportAcademicSection';

describe('ReportAcademicSection', () => {
  it('pinta la tabla con la asignatura', () => {
    render(<ReportAcademicSection data={{ hasData: true, overallAverage: 72, subjects: [
      { subjectId: 'a', name: 'Lengua', code: 'LCL', average: 70, taskAverage: 68, activityAverage: null, examAverage: 75, gradedItems: 4 },
    ] }} />);
    expect(screen.getByText('Lengua')).toBeTruthy();
    expect(screen.getByText(/72/)).toBeTruthy();
  });

  it('muestra aviso sin datos cuando hasData=false', () => {
    render(<ReportAcademicSection data={{ hasData: false, overallAverage: null, subjects: [] }} />);
    expect(screen.getByText(/Sin datos/i)).toBeTruthy();
  });
});
