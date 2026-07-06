import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExpedienteViewer from '../ExpedienteViewer';

// Mock apiClient
vi.mock('@services/apiClient', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

// Mock AcademicYearSelector: dispara onChange con 'y1' al montar (simula default)
vi.mock('@components/common/AcademicYearSelector', () => ({
  default: ({ onChange }: any) => {
    return (
      <button data-testid="year-y1" onClick={() => onChange('y1')}>
        elegir-y1
      </button>
    );
  },
}));

// Mock useAcademicYear: id 'y1' -> nombre '2025-2026'
vi.mock('@/contexts/AcademicYearContext', () => ({
  useAcademicYear: () => ({
    allAcademicYears: [{ id: 'y1', name: '2025-2026', startDate: '', endDate: '', isCurrent: true }],
  }),
}));

const recordWithEntries = {
  records: [{
    id: 'r1',
    finalGPA: 8,
    status: 'active',
    isPromoted: true,
    entries: [
      { id: 'e1', subjectAssignmentId: 'sa1', title: 'Lengua', period: 'annual', numericValue: 8, isPassing: true },
      { id: 'e2', subjectAssignmentId: 'sa1', title: 'Lengua', period: 'first_trimester', numericValue: 8, isPassing: true },
      { id: 'e3', subjectAssignmentId: 'sa2', title: 'Mates', period: 'annual', numericValue: 4, isPassing: false },
    ],
  }],
  total: 1,
};
const stats = { totalRecords: 1, averageGPA: 8, totalCredits: 0, completedCredits: 0, attendanceRate: 100 };

async function mockGet(apiClient: any) {
  apiClient.get.mockImplementation((url: string) => {
    if (url.startsWith('/academic-records/student/')) return Promise.resolve({ data: recordWithEntries });
    if (url.startsWith('/academic-records/statistics/student/')) return Promise.resolve({ data: stats });
    return Promise.resolve({ data: {} });
  });
}

describe('ExpedienteViewer', () => {
  beforeEach(async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockReset();
    apiClient.post.mockReset();
  });

  it('renderiza la tabla por asignatura (anual + trimestres) y el GPA', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    await mockGet(apiClient);
    render(<ExpedienteViewer studentId="st1" />);
    fireEvent.click(screen.getByTestId('year-y1')); // selecciona año -> dispara fetch
    await waitFor(() => expect(screen.getByText('Lengua')).toBeInTheDocument());
    expect(screen.getByText('Mates')).toBeInTheDocument();
    // GPA del año visible
    await waitFor(() => expect(screen.getAllByText(/8/).length).toBeGreaterThanOrEqual(1));
    // se llamó al endpoint con el NOMBRE del año, no el id
    expect(apiClient.get).toHaveBeenCalledWith('/academic-records/student/st1?academicYear=2025-2026');
  });

  it('sin record para el año -> aviso "Sin expediente"', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockImplementation((url: string) => {
      if (url.startsWith('/academic-records/student/')) return Promise.resolve({ data: { records: [], total: 0 } });
      if (url.startsWith('/academic-records/statistics/')) return Promise.resolve({ data: { totalRecords: 0, averageGPA: 0 } });
      return Promise.resolve({ data: {} });
    });
    render(<ExpedienteViewer studentId="st1" />);
    fireEvent.click(screen.getByTestId('year-y1'));
    await waitFor(() => expect(screen.getByText(/Sin expediente para este año/i)).toBeInTheDocument());
  });

  it('muestra el GPA con sufijo /100 (escala 0-100)', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    await mockGet(apiClient);
    render(<ExpedienteViewer studentId="st1" />);
    fireEvent.click(screen.getByTestId('year-y1'));
    await waitFor(() => expect(screen.getByText('Nota media (GPA)')).toBeInTheDocument());
    expect(screen.getByText('/100')).toBeInTheDocument();
  });

  it('el botón PDF dispara POST de generación y GET de descarga (blob)', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    await mockGet(apiClient);
    apiClient.post.mockResolvedValue({ data: { fileName: 'boletin.pdf' } });
    // segundo get (descarga) devuelve blob
    apiClient.get.mockImplementation((url: string) => {
      if (url.startsWith('/academic-records/student/')) return Promise.resolve({ data: recordWithEntries });
      if (url.startsWith('/academic-records/statistics/')) return Promise.resolve({ data: stats });
      if (url.startsWith('/academic-records/reports/download/')) return Promise.resolve({ data: new Blob(['pdf']) });
      return Promise.resolve({ data: {} });
    });
    // jsdom no implementa createObjectURL
    (window.URL.createObjectURL as any) = vi.fn(() => 'blob:mock');
    (window.URL.revokeObjectURL as any) = vi.fn();
    render(<ExpedienteViewer studentId="st1" />);
    fireEvent.click(screen.getByTestId('year-y1'));
    await waitFor(() => expect(screen.getByText('Lengua')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Descargar boletín PDF/i }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/academic-records/reports/student/st1/2025-2026'));
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/academic-records/reports/download/boletin.pdf', { responseType: 'blob' }));
  });
});
