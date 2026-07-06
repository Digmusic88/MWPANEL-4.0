import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReportView } from '../ReportView';
import { buildReportFixture } from '../reportFixtures';

const ALL = new Set(['academic','competencies','socioEmotional','attendance','dua','qualitative'] as const);

describe('ReportView', () => {
  it('muestra la sección académica cuando está activa', () => {
    render(<ReportView result={buildReportFixture()} activeSections={ALL as any} />);
    expect(screen.getByText('Rendimiento académico')).toBeTruthy();
  });

  it('oculta la sección académica cuando NO está activa', () => {
    const sub = new Set(['competencies'] as const);
    render(<ReportView result={buildReportFixture()} activeSections={sub as any} />);
    expect(screen.queryByText('Rendimiento académico')).toBeNull();
  });

  it('oculta la sección académica si el toggle está activo pero el sub-bloque es undefined', () => {
    const fx = buildReportFixture();
    (fx.data as any).academic = undefined;
    render(<ReportView result={fx} activeSections={ALL as any} />);
    expect(screen.queryByText('Rendimiento académico')).toBeNull();
  });
});
