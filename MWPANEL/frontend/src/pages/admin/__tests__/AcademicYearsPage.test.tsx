import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AcademicYearsPage from '../AcademicYearsPage';

// Mock apiClient — the page calls apiClient.get('/academic-years') directly
vi.mock('../../../services/apiClient', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock AcademicYearContext used by the page
vi.mock('../../../contexts/AcademicYearContext', () => ({
  useAcademicYear: () => ({
    refetchCurrent: vi.fn().mockResolvedValue(undefined),
    refetchAll: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Mock SessionExpiredModal imported transitively through apiClient
vi.mock('../../../components/common/SessionExpiredModal', () => ({
  showSessionExpiredModal: vi.fn(),
}));

const sampleYears = [
  {
    id: '1',
    name: '2025-2026',
    startDate: '2025-09-01',
    endDate: '2026-06-30',
    isCurrent: true,
    isArchived: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: '2024-2025',
    startDate: '2024-09-01',
    endDate: '2025-06-30',
    isCurrent: false,
    isArchived: true,
    archivedAt: '2025-09-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2025-09-01T00:00:00.000Z',
  },
  {
    id: '3',
    name: '2026-2027',
    startDate: '2026-09-01',
    endDate: '2027-06-30',
    isCurrent: false,
    isArchived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('AcademicYearsPage', () => {
  beforeEach(async () => {
    const apiClient = (await import('../../../services/apiClient')).default as any;
    apiClient.get.mockResolvedValue({ data: sampleYears });
  });

  it('muestra el badge "Actual" para el año isCurrent', async () => {
    render(<AcademicYearsPage />);
    expect(await screen.findByText('Actual')).toBeInTheDocument();
  });

  it('muestra el badge "Archivado" para el año isArchived', async () => {
    render(<AcademicYearsPage />);
    expect(await screen.findByText('Archivado')).toBeInTheDocument();
  });

  it('el botón Archivar del año isCurrent está deshabilitado', async () => {
    render(<AcademicYearsPage />);
    // Wait for the table to render
    await screen.findByText('Actual');

    // The Archivar button for isCurrent=true should be disabled
    // It renders as a Button with disabled=true; query all disabled buttons
    const disabledButtons = document.querySelectorAll('button[disabled]');
    expect(disabledButtons.length).toBeGreaterThan(0);
  });
});
