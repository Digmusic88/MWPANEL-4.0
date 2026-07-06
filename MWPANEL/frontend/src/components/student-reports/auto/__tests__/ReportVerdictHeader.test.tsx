import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportVerdictHeader } from '../ReportVerdictHeader';
import { buildReportFixture } from '../reportFixtures';

describe('ReportVerdictHeader', () => {
  it('muestra nombre, veredicto y chip Automatico cuando aiGenerated=false', () => {
    render(<ReportVerdictHeader result={buildReportFixture()} />);
    expect(screen.getByText(/Diego López Martín/)).toBeTruthy();
    expect(screen.getByText(/En progreso/i)).toBeTruthy();
    expect(screen.getByText(/Automático/i)).toBeTruthy();
  });

  it('muestra chip IA cuando aiGenerated=true', () => {
    const fx = buildReportFixture();
    fx.narrative.aiGenerated = true;
    render(<ReportVerdictHeader result={fx} />);
    expect(screen.getByText(/IA/)).toBeTruthy();
  });
});
