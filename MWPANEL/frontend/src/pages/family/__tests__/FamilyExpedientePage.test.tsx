import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import FamilyExpedientePage from '../FamilyExpedientePage';

vi.mock('@services/apiClient', () => ({ default: { get: vi.fn() } }));
// Stub del viewer: solo renderiza el studentId que recibe
vi.mock('@/components/academic-records/ExpedienteViewer', () => ({
  default: ({ studentId }: any) => <div data-testid="viewer">viewer:{studentId}</div>,
}));

describe('FamilyExpedientePage', () => {
  beforeEach(async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockReset();
  });

  it('carga hijos y monta el viewer con el primer hijo por defecto', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockResolvedValue({ data: [
      { id: 'child1', user: { profile: { firstName: 'Ana', lastName: 'García' } } },
      { id: 'child2', user: { profile: { firstName: 'Leo', lastName: 'García' } } },
    ]});
    render(<FamilyExpedientePage />);
    await waitFor(() => expect(screen.getByTestId('viewer')).toHaveTextContent('viewer:child1'));
  });

  it('sin hijos -> aviso', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockResolvedValue({ data: [] });
    render(<FamilyExpedientePage />);
    await waitFor(() => expect(screen.getByText(/No hay alumnos/i)).toBeInTheDocument());
  });
});
