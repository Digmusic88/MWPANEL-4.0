import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStudentAutoReport } from '../useStudentAutoReport';
import { studentAutoReportService } from '@/services/studentAutoReportService';

vi.mock('@/services/studentAutoReportService', () => ({
  studentAutoReportService: { getOptions: vi.fn(), generate: vi.fn(), downloadPdf: vi.fn() },
}));

describe('useStudentAutoReport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loadOptions guarda options y baja loadingOptions', async () => {
    const opts = { academicYears: [], subjects: [] };
    (studentAutoReportService.getOptions as any).mockResolvedValue(opts);
    const { result } = renderHook(() => useStudentAutoReport());
    await act(async () => { await result.current.loadOptions('s1'); });
    await waitFor(() => expect(result.current.options).toEqual(opts));
    expect(result.current.loadingOptions).toBe(false);
  });

  it('generate guarda report', async () => {
    const rep = { narrative: { aiGenerated: false } };
    (studentAutoReportService.generate as any).mockResolvedValue(rep);
    const { result } = renderHook(() => useStudentAutoReport());
    await act(async () => { await result.current.generate({ studentId: 's1', academicYearId: 'y1' } as any); });
    await waitFor(() => expect(result.current.report).toEqual(rep));
    expect(result.current.generating).toBe(false);
  });

  it('generate setea error si falla', async () => {
    (studentAutoReportService.generate as any).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useStudentAutoReport());
    await act(async () => { await result.current.generate({ studentId: 's1', academicYearId: 'y1' } as any); });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('loadOptions error path - setea error si getOptions falla', async () => {
    (studentAutoReportService.getOptions as any).mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useStudentAutoReport());
    await act(async () => { await result.current.loadOptions('s1'); });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.loadingOptions).toBe(false);
  });

  it('downloadPdf success - llama al servicio y termina con downloading false', async () => {
    (studentAutoReportService.downloadPdf as any).mockResolvedValue(undefined);
    const { result } = renderHook(() => useStudentAutoReport());
    const body = { studentId: 's1', academicYearId: 'y1' } as any;
    await act(async () => { await result.current.downloadPdf(body, 'Juan García'); });
    expect(studentAutoReportService.downloadPdf).toHaveBeenCalledWith(body, 'Juan García');
    expect(result.current.downloading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('downloadPdf error path - setea error si downloadPdf falla', async () => {
    (studentAutoReportService.downloadPdf as any).mockRejectedValue(new Error('pdf error'));
    const { result } = renderHook(() => useStudentAutoReport());
    await act(async () => { await result.current.downloadPdf({ studentId: 's1', academicYearId: 'y1' } as any, 'Ana López'); });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.downloading).toBe(false);
  });

  it('reset - limpia report a null después de un generate exitoso', async () => {
    const rep = { narrative: { aiGenerated: true } };
    (studentAutoReportService.generate as any).mockResolvedValue(rep);
    const { result } = renderHook(() => useStudentAutoReport());
    await act(async () => { await result.current.generate({ studentId: 's1', academicYearId: 'y1' } as any); });
    await waitFor(() => expect(result.current.report).toEqual(rep));
    act(() => { result.current.reset(); });
    expect(result.current.report).toBeNull();
  });
});
