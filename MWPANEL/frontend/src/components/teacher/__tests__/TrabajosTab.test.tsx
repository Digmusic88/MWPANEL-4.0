import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TrabajosTab from '../TrabajosTab';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});
vi.mock('@services/apiClient', () => ({ default: { get: vi.fn() } }));
vi.mock('../../common/SessionExpiredModal', () => ({ showSessionExpiredModal: vi.fn() }));
vi.mock('antd', async (importOriginal) => {
  const mod = await importOriginal<typeof import('antd')>();
  return { ...mod, message: { loading: vi.fn(() => vi.fn()), success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() } };
});

const tasksPayload = { data: { total: 2, tasks: [
  { id: 't1', title: 'Ficha fracciones', isTestYourself: false, valuationType: 'score', dueDate: '2026-06-20T10:00:00.000Z', status: 'published', subjectAssignment: { subject: { name: 'Mate' }, classGroup: { name: '3º A' } } },
  { id: 't2', title: 'Self-check U4', isTestYourself: true, valuationType: 'score', dueDate: '2026-06-25T10:00:00.000Z', status: 'published', subjectAssignment: { subject: { name: 'Inglés' }, classGroup: { name: '3º A' } } },
] } };
const activitiesPayload = { data: [
  { id: 'a1', name: 'Participación oral', valuationType: 'emoji', assignedDate: '2026-06-22', isArchived: false, classGroup: { name: '3º B' } },
] };

describe('TrabajosTab', () => {
  beforeEach(async () => {
    mockNavigate.mockReset();
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockReset();
    apiClient.get.mockImplementation((url: string) => {
      if (url.startsWith('/academic-years')) return Promise.resolve({ data: [{ id: 'ay-1', name: '2025-2026' }, { id: 'ay-2', name: '2024-2025' }] });
      if (url.startsWith('/tasks/teacher/my-tasks')) return Promise.resolve(tasksPayload);
      if (url.startsWith('/activities')) return Promise.resolve(activitiesPayload);
      return Promise.resolve({ data: [] });
    });
  });

  it('pinta filas de los tres tipos', async () => {
    render(<TrabajosTab />);
    expect(await screen.findByText('Ficha fracciones')).toBeInTheDocument();
    expect(screen.getByText('Self-check U4')).toBeInTheDocument();
    expect(screen.getByText('Participación oral')).toBeInTheDocument();
  });

  it('el filtro de tipo "Actividades" deja solo actividades', async () => {
    const user = userEvent.setup();
    render(<TrabajosTab />);
    await screen.findByText('Ficha fracciones');
    await user.click(screen.getByText('Actividades'));
    await waitFor(() => expect(screen.queryByText('Ficha fracciones')).not.toBeInTheDocument());
    expect(screen.getByText('Participación oral')).toBeInTheDocument();
  });

  it('"Abrir" en una fila Tarea navega a /teacher/tasks', async () => {
    const user = userEvent.setup();
    render(<TrabajosTab />);
    const titleCell = await screen.findByText('Ficha fracciones');
    const row = titleCell.closest('tr')!;
    await user.click(within(row).getByRole('button', { name: /Abrir/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/teacher/tasks');
  });

  it('si el endpoint de tareas falla, sigue mostrando actividades', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockImplementation((url: string) => {
      if (url.startsWith('/tasks/teacher/my-tasks')) return Promise.reject(new Error('boom'));
      if (url.startsWith('/activities')) return Promise.resolve(activitiesPayload);
      return Promise.resolve({ data: [] });
    });
    render(<TrabajosTab />);
    expect(await screen.findByText('Participación oral')).toBeInTheDocument();
  });

  it('por defecto no envía academicYearId; al elegir un año, refetchea con el filtro', async () => {
    const user = userEvent.setup();
    const apiClient = (await import('@services/apiClient')).default as any;
    render(<TrabajosTab />);
    await screen.findByText('Ficha fracciones');

    // Default "Todos": las llamadas iniciales NO llevan academicYearId
    const initialTaskCalls = apiClient.get.mock.calls.filter((c: any[]) => c[0].startsWith('/tasks/teacher/my-tasks'));
    expect(initialTaskCalls.every((c: any[]) => !c[0].includes('academicYearId'))).toBe(true);

    // Elegir un año concreto en el Select de año
    // antd Select renders aria-label on both the outer div and the inner combobox input
    const yearSelect = screen.getAllByLabelText('Año académico').find((el) => el.getAttribute('role') === 'combobox')!;
    await user.click(yearSelect);
    await user.click(await screen.findByText('2024-2025'));

    // Tras elegir, se refetchea con academicYearId=ay-2 en ambos endpoints
    await waitFor(() => {
      expect(apiClient.get.mock.calls.some((c: any[]) => c[0].startsWith('/tasks/teacher/my-tasks') && c[0].includes('academicYearId=ay-2'))).toBe(true);
    });
    expect(apiClient.get.mock.calls.some((c: any[]) => c[0].startsWith('/activities') && c[0].includes('academicYearId=ay-2'))).toBe(true);
  });
});
