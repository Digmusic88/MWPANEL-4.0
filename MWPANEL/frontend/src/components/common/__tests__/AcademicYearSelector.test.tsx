import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AcademicYearSelector from '../AcademicYearSelector';

// Mock apiClient — el componente llama apiClient.get('/grades/student/:id/available-years')
vi.mock('@services/apiClient', () => ({
  default: { get: vi.fn() },
}));

// SessionExpiredModal entra transitivamente por apiClient en runtime real; aquí
// apiClient está mockeado así que no hace falta, pero lo dejamos por robustez.
vi.mock('../../../components/common/SessionExpiredModal', () => ({
  showSessionExpiredModal: vi.fn(),
}));

const sampleYears = [
  { id: 'y2', name: '2025-2026', isCurrent: true, isArchived: false },
  { id: 'y1', name: '2024-2025', isCurrent: false, isArchived: true },
];

describe('AcademicYearSelector', () => {
  beforeEach(async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockReset();
  });

  it('renderiza el año actual seleccionado por defecto y dispara onChange con su id', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockResolvedValue({ data: sampleYears });
    const onChange = vi.fn();

    render(<AcademicYearSelector studentId="s1" onChange={onChange} />);

    // El default es el año isCurrent (y2)
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('y2'));
    expect(apiClient.get).toHaveBeenCalledWith('/grades/student/s1/available-years');
  });

  it('muestra el año actual ya seleccionado (value controlado) con su nombre', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockResolvedValue({ data: sampleYears });
    const onChange = vi.fn();

    render(<AcademicYearSelector studentId="s1" value="y2" onChange={onChange} />);

    // El Select muestra el nombre del año seleccionado
    await waitFor(() => expect(screen.getAllByText('2025-2026').length).toBeGreaterThanOrEqual(1));
    // El modo controlado NO debe llamar a onChange: si value ya está fijado, no hay que auto-seleccionar
    expect(onChange).not.toHaveBeenCalled();
  });

  it('lista vacía -> selector deshabilitado con aviso, sin onChange', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockResolvedValue({ data: [] });
    const onChange = vi.fn();

    render(<AcademicYearSelector studentId="s1" onChange={onChange} />);

    await waitFor(() =>
      expect(screen.getByTestId('academic-year-selector-empty')).toBeInTheDocument(),
    );
    // No se autoselecciona nada cuando no hay años
    expect(onChange).not.toHaveBeenCalled();
  });
});
