import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '@/services/apiClient';
import { studentAutoReportService } from '../studentAutoReportService';

vi.mock('@/services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

describe('studentAutoReportService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getOptions devuelve response.data (sin envelope)', async () => {
    const options = { academicYears: [{ id: 'y1', name: '2025-2026' }], subjects: [] };
    (apiClient.get as any).mockResolvedValue({ data: options });
    const res = await studentAutoReportService.getOptions('s1');
    expect(apiClient.get).toHaveBeenCalledWith('/student-reports/auto/options', { params: { studentId: 's1' } });
    expect(res).toEqual(options);
  });

  it('generate hace POST y devuelve response.data', async () => {
    const result = { student: { id: 's1' }, narrative: { aiGenerated: false } };
    (apiClient.post as any).mockResolvedValue({ data: result });
    const body = { studentId: 's1', academicYearId: 'y1' };
    const res = await studentAutoReportService.generate(body as any);
    expect(apiClient.post).toHaveBeenCalledWith('/student-reports/auto/generate', body);
    expect(res).toEqual(result);
  });

  it('downloadPdf pide blob y dispara la descarga con ancla', async () => {
    const blobData = new Blob(['%PDF']);
    (apiClient.post as any).mockResolvedValue({ data: blobData });
    const createURL = vi.fn(() => 'blob:url');
    const revokeURL = vi.fn();
    (global.URL as any).createObjectURL = createURL;
    (global.URL as any).revokeObjectURL = revokeURL;
    const clickSpy = vi.fn();
    const realCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: any) => {
      const el = realCreate(tag);
      if (tag === 'a') (el as any).click = clickSpy;
      return el;
    });

    const body = { studentId: 's1', academicYearId: 'y1' };
    await studentAutoReportService.downloadPdf(body as any, 'Diego López');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/student-reports/auto/generate/pdf', body, { responseType: 'blob' },
    );
    expect(createURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeURL).toHaveBeenCalledWith('blob:url');
  });
});
