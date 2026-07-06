import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BuildYearExpedientesButton from '../BuildYearExpedientesButton';

vi.mock('@services/apiClient', () => ({ default: { post: vi.fn() } }));

describe('BuildYearExpedientesButton', () => {
  beforeEach(async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.post.mockReset();
  });

  it('dispara POST /academic-records/build/year/:id con el academicYearId', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.post.mockResolvedValue({ data: { students: 3, records: 3 } });
    render(<BuildYearExpedientesButton academicYearId="y1" />);
    fireEvent.click(screen.getByRole('button', { name: /Generar expedientes del año/i }));
    // confirmar el Popconfirm
    fireEvent.click(await screen.findByText('Generar'));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/academic-records/build/year/y1'));
  });

  it('sin academicYearId no renderiza botón', () => {
    render(<BuildYearExpedientesButton academicYearId={undefined} />);
    expect(screen.queryByRole('button', { name: /Generar expedientes del año/i })).toBeNull();
  });
});
