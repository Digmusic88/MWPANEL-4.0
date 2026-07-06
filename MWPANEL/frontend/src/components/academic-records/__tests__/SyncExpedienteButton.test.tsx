import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SyncExpedienteButton } from '../SyncExpedienteButton';

// Mock apiClient default export
vi.mock('@/services/apiClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual<typeof import('antd')>('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe('SyncExpedienteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the button with correct text', () => {
    render(<SyncExpedienteButton studentId="student-1" academicYearName="2025-2026" />);
    expect(screen.getByRole('button', { name: /sincronizar expediente/i })).toBeDefined();
  });

  it('calls POST /academic-records/sync/student/:id/:year on click', async () => {
    const { default: apiClient } = await import('@/services/apiClient');
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { entries: 5 } });

    const { message } = await import('antd');

    render(<SyncExpedienteButton studentId="student-abc" academicYearName="2025-2026" />);
    fireEvent.click(screen.getByRole('button', { name: /sincronizar expediente/i }));

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/academic-records/sync/student/student-abc/2025-2026'
      );
    });
  });

  it('shows success message with entries count on success', async () => {
    const { default: apiClient } = await import('@/services/apiClient');
    (apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { entries: 3 } });

    const { message } = await import('antd');

    render(<SyncExpedienteButton studentId="student-abc" academicYearName="2025-2026" />);
    fireEvent.click(screen.getByRole('button', { name: /sincronizar expediente/i }));

    await waitFor(() => {
      expect(message.success).toHaveBeenCalledWith('Expediente sincronizado (3 entradas)');
    });
  });

  it('shows error message with backend message on failure', async () => {
    const { default: apiClient } = await import('@/services/apiClient');
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue({
      response: { data: { message: 'Módulo expedientes no habilitado' } },
    });

    const { message } = await import('antd');

    render(<SyncExpedienteButton studentId="student-abc" academicYearName="2025-2026" />);
    fireEvent.click(screen.getByRole('button', { name: /sincronizar expediente/i }));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Módulo expedientes no habilitado');
    });
  });

  it('shows fallback error message when no backend message', async () => {
    const { default: apiClient } = await import('@/services/apiClient');
    (apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue({});

    const { message } = await import('antd');

    render(<SyncExpedienteButton studentId="student-abc" academicYearName="2025-2026" />);
    fireEvent.click(screen.getByRole('button', { name: /sincronizar expediente/i }));

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('No se pudo sincronizar el expediente');
    });
  });
});
