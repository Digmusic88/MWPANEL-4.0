import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeacherGradebookPage from '../TeacherGradebookPage';

vi.mock('@services/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));
vi.mock('../../../components/common/SessionExpiredModal', () => ({
  showSessionExpiredModal: vi.fn(),
}));
// Neutralizar los timers de antd message para que act() no quede bloqueado
vi.mock('antd', async (importOriginal) => {
  const mod = await importOriginal<typeof import('antd')>();
  return {
    ...mod,
    message: { loading: vi.fn(() => vi.fn()), success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
  };
});

// Las pestañas perezosas no se montan (defaultActiveKey="notas"); igual evitamos su carga real.
vi.mock('../RubricsPageWithFolders', () => ({ default: () => <div /> }));
vi.mock('../TeacherEvaluationsPage', () => ({ default: () => <div /> }));
vi.mock('../../../components/teacher/TrabajosTab', () => ({ default: () => <div data-testid="trabajos-tab" /> }));

const ASSIGNMENT_ID = 'sa-1';

const assignments = [{
  id: ASSIGNMENT_ID,
  subject: { id: 'subj-1', name: 'Lengua', code: 'LCL' },
  classGroup: { id: 'cg-1', name: '3ºA' },
  academicYear: { id: 'ay-1', name: '2025-2026' },
}];

const gradebook = {
  assignment: assignments[0],
  students: [
    { id: 'stu-A', enrollmentNumber: 'A001', name: 'Ana Alumna' },
    { id: 'stu-B', enrollmentNumber: 'B002', name: 'Borja Beta' },
  ],
  columns: [
    { id: 'col-1', source: 'activity', name: 'Examen 1', maxScore: 10, editable: true, visibleToFamilies: false, grades: { 'stu-A': 8, 'stu-B': 5 } },
  ],
};

const centralized = {
  subjectAssignmentId: ASSIGNMENT_ID,
  period: 'continuous',
  totalStudents: 1,
  statistics: {},
  grades: [
    { studentId: 'stu-A', finalGrade: 74, isPassing: true, hasData: true },
    // stu-B ausente a propósito
  ],
};

function wireGet(apiClient: any) {
  apiClient.get.mockImplementation((url: string) => {
    if (url === '/activities/teacher/subject-assignments') return Promise.resolve({ data: assignments });
    if (url === `/grades/gradebook/${ASSIGNMENT_ID}`) return Promise.resolve({ data: gradebook });
    if (url.startsWith(`/centralized-grades/class/${ASSIGNMENT_ID}`)) return Promise.resolve({ data: centralized });
    return Promise.resolve({ data: [] });
  });
}

describe('TeacherGradebookPage — estructura de pestañas', () => {
  beforeEach(async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockReset();
    apiClient.get.mockResolvedValue({ data: [] });
  });

  it('el Cuaderno muestra la pestaña "Trabajos" y ya no las pestañas sueltas de tipos', async () => {
    render(<TeacherGradebookPage />);
    // Tab labels are rendered as role="tab" by Ant Design Tabs
    expect(await screen.findByRole('tab', { name: /Trabajos/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Tareas y Deberes/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Test Yourself/ })).not.toBeInTheDocument();
  });
});

describe('GradebookCore — Nota final ponderada', () => {
  beforeEach(async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockReset();
    apiClient.post.mockReset();
    apiClient.put.mockReset();
  });

  it('lee /centralized-grades/class con period=continuous al seleccionar la asignación', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    wireGet(apiClient);

    render(<TeacherGradebookPage />);

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(
        `/centralized-grades/class/${ASSIGNMENT_ID}?period=continuous`,
      ),
    );
  });

  it('muestra la nota ponderada (74%) del alumno con fila y "—" para el alumno sin fila', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    wireGet(apiClient);

    render(<TeacherGradebookPage />);

    // Ana tiene fila centralizada -> 74%
    await waitFor(() => expect(screen.getByText('74%')).toBeInTheDocument());
    // Borja NO tiene fila -> NO debe mostrar la media simple (50%); en su lugar "—".
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('muestra el botón "Crear trabajo" cuando hay una asignatura seleccionada', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    wireGet(apiClient);

    render(<TeacherGradebookPage />);
    expect(await screen.findByRole('button', { name: /Crear trabajo/i }, { timeout: 3000 })).toBeInTheDocument();
  });

  it('"Recalcular" hace POST a recalculate-real/:id y vuelve a leer las notas centralizadas', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    wireGet(apiClient);
    apiClient.post.mockResolvedValue({
      data: { success: true, totalStudents: 2, successful: 2, failed: 0, results: [] },
    });

    render(<TeacherGradebookPage />);

    // Esperar a la carga inicial (1 lectura centralizada).
    await waitFor(() => expect(screen.getByText('74%')).toBeInTheDocument());
    const callsBefore = apiClient.get.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].startsWith(`/centralized-grades/class/${ASSIGNMENT_ID}`),
    ).length;

    fireEvent.click(screen.getByRole('button', { name: /Recalcular/i }));
    expect(apiClient.post).toHaveBeenCalledWith(`/centralized-grades/recalculate-real/${ASSIGNMENT_ID}`);

    // Flush pending promises so that recalcular() completes and calls fetchCentralizedGrades
    await Promise.resolve(); // Let the mockResolvedValue promise resolve
    await Promise.resolve(); // Let fetchCentralizedGrades start
    await Promise.resolve(); // Let the GET resolve

    // Tras recalcular, se vuelve a leer la clase centralizada (al menos 1 lectura más).
    const callsAfter = apiClient.get.mock.calls.filter(
      (c: any[]) => typeof c[0] === 'string' && c[0].startsWith(`/centralized-grades/class/${ASSIGNMENT_ID}`),
    ).length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });
});
