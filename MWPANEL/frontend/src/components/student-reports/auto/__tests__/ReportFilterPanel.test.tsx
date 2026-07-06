import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportFilterPanel } from '../ReportFilterPanel';

const options = { academicYears: [{ id: 'y1', name: '2025-2026' }], subjects: [{ id: 'a', name: 'Lengua', code: 'LCL' }] };

describe('ReportFilterPanel', () => {
  it('emite onGenerate con año por defecto y todas las secciones', () => {
    const onGenerate = vi.fn();
    render(<ReportFilterPanel options={options as any} defaultYearId="y1" generating={false} downloading={false} disabled={false} onGenerate={onGenerate} onDownloadPdf={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Generar/i }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    const cfg = onGenerate.mock.calls[0][0];
    expect(cfg.academicYearId).toBe('y1');
    expect(cfg.activeSections.size).toBe(6);
  });

  it('con todos los toggles activos, sectionsParam emitido es un array vacío', () => {
    const onGenerate = vi.fn();
    render(<ReportFilterPanel options={options as any} defaultYearId="y1" generating={false} downloading={false} disabled={false} onGenerate={onGenerate} onDownloadPdf={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Generar/i }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onGenerate.mock.calls[0][0].sectionsParam).toEqual([]);
  });
});
