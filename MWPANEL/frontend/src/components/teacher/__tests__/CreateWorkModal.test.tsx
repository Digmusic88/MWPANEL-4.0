import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import dayjs from 'dayjs';
import CreateWorkModal, { buildWorkPayload, SubjectAssignmentLite } from '../CreateWorkModal';

// apiClient is a DEFAULT export (axios instance)
vi.mock('@services/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
// apiClient imports this at module top — must be stubbed
vi.mock('../../common/SessionExpiredModal', () => ({
  showSessionExpiredModal: vi.fn(),
}));
// useRubrics hook used by the modal
vi.mock('../../../hooks/useRubrics', () => ({
  useRubrics: () => ({ rubrics: [], fetchRubrics: vi.fn().mockResolvedValue(undefined) }),
}));
// keep real antd components, neutralize message timers
vi.mock('antd', async (importOriginal) => {
  const mod = await importOriginal<typeof import('antd')>();
  return {
    ...mod,
    message: { loading: vi.fn(() => vi.fn()), success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() },
  };
});

const ASSIGNMENTS: SubjectAssignmentLite[] = [
  { id: 'sa-1', subject: { id: 'sub-1', name: 'Matemáticas', code: 'MAT' }, classGroup: { id: 'cg-1', name: '3º A' } },
];

describe('buildWorkPayload', () => {
  const base = {
    title: 'Trabajo de prueba',
    description: 'desc',
    subjectAssignmentId: 'sa-1',
    valuationType: 'score',
    scoreMax: 10,
    assignedDate: dayjs('2026-06-30T09:00:00'),
    dueDate: dayjs('2026-07-02T10:30:00'),
  };

  it('Tarea → POST /tasks con taskType no-exam y fechas ISO', () => {
    const { endpoint, body } = buildWorkPayload('tarea', { ...base, taskType: 'homework' }, ASSIGNMENTS);
    expect(endpoint).toBe('/tasks');
    expect(body.title).toBe('Trabajo de prueba');
    expect(body.taskType).toBe('homework');
    expect(body.valuationType).toBe('score');
    expect(body.maxPoints).toBe(10);
    expect(body.subjectAssignmentId).toBe('sa-1');
    expect(body.assignedDate).toBe(dayjs('2026-06-30T09:00:00').toISOString());
    expect(body.dueDate).toBe(dayjs('2026-07-02T10:30:00').toISOString());
    expect(body.isTestYourself).toBeUndefined();
    expect(body.requiresFile).toBe(false);
  });

  it('Test Yourself → POST /tasks con isTestYourself y taskType exam', () => {
    const { endpoint, body } = buildWorkPayload('test', { ...base, scoreMax: undefined, valuationType: 'score' }, ASSIGNMENTS);
    expect(endpoint).toBe('/tasks');
    expect(body.taskType).toBe('exam');
    expect(body.isTestYourself).toBe(true);
    expect(body.allowLateSubmission).toBe(false);
    expect(body.requiresFile).toBe(false);
    expect(body.maxPoints).toBe(100); // default cuando score sin valor
    expect(body.visibleToFamilies).toBe(false);
  });

  it('Actividad → POST /activities con name/maxScore/classGroupId y fecha date-only', () => {
    const { endpoint, body } = buildWorkPayload(
      'actividad',
      { ...base, valuationType: 'score', scoreMax: 5, reviewDate: dayjs('2026-07-05T00:00:00') },
      ASSIGNMENTS,
    );
    expect(endpoint).toBe('/activities');
    expect(body.name).toBe('Trabajo de prueba');
    expect(body.title).toBeUndefined();
    expect(body.maxScore).toBe(5);
    expect(body.maxPoints).toBeUndefined();
    expect(body.classGroupId).toBe('cg-1');
    expect(body.subjectAssignmentId).toBe('sa-1');
    expect(body.assignedDate).toBe('2026-06-30');
    expect(body.reviewDate).toBe('2026-07-05');
  });

  it('targetStudentIds solo se incluye si hay alumnos seleccionados', () => {
    const sin = buildWorkPayload('tarea', { ...base, taskType: 'assignment' }, ASSIGNMENTS);
    expect(sin.body.targetStudentIds).toBeUndefined();
    const con = buildWorkPayload('tarea', { ...base, taskType: 'assignment', targetStudentIds: ['st-1'] }, ASSIGNMENTS);
    expect(con.body.targetStudentIds).toEqual(['st-1']);
  });
});

const criteriaAssignments: SubjectAssignmentLite[] = [
  { id: 'sa1', subject: { id: 's1', name: 'Mates', code: 'MAT' }, classGroup: { id: 'g1', name: '1A' } },
];

describe('buildWorkPayload criterionIds (SP-D3a)', () => {
  it('incluye criterionIds en una tarea cuando se seleccionan', () => {
    const { endpoint, body } = buildWorkPayload('tarea', {
      title: 'T', subjectAssignmentId: 'sa1', valuationType: 'score', scoreMax: 10,
      assignedDate: '2026-07-02T09:00:00Z', dueDate: '2026-07-03T09:00:00Z',
      criterionIds: ['c1', 'c2'],
    }, criteriaAssignments);
    expect(endpoint).toBe('/tasks');
    expect(body.criterionIds).toEqual(['c1', 'c2']);
  });

  it('incluye criterionIds en una actividad cuando se seleccionan', () => {
    const { endpoint, body } = buildWorkPayload('actividad', {
      title: 'A', subjectAssignmentId: 'sa1', valuationType: 'emoji',
      assignedDate: '2026-07-02', criterionIds: ['c1'],
    }, criteriaAssignments);
    expect(endpoint).toBe('/activities');
    expect(body.criterionIds).toEqual(['c1']);
  });

  it('omite criterionIds cuando no se seleccionan', () => {
    const { body } = buildWorkPayload('tarea', {
      title: 'T', subjectAssignmentId: 'sa1', valuationType: 'score', scoreMax: 10,
      assignedDate: '2026-07-02T09:00:00Z', dueDate: '2026-07-03T09:00:00Z',
    }, criteriaAssignments);
    expect('criterionIds' in body).toBe(false);
  });
});

describe('CreateWorkModal render', () => {
  beforeEach(async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockReset();
    apiClient.post.mockReset();
    apiClient.get.mockResolvedValue({ data: ASSIGNMENTS });
  });

  it('Tarea (por defecto) muestra "Fecha de entrega" y oculta "Fecha de revisión"', async () => {
    render(<CreateWorkModal open onClose={vi.fn()} />);
    expect(await screen.findByText('Fecha de entrega')).toBeInTheDocument();
    expect(screen.queryByText('Fecha de revisión')).not.toBeInTheDocument();
  });

  it('al elegir Actividad muestra "Fecha de revisión" y oculta "Fecha de entrega"', async () => {
    const user = userEvent.setup();
    render(<CreateWorkModal open onClose={vi.fn()} />);
    await screen.findByText('Fecha de entrega');
    await user.click(screen.getByText('Actividad'));
    expect(await screen.findByText('Fecha de revisión')).toBeInTheDocument();
    expect(screen.queryByText('Fecha de entrega')).not.toBeInTheDocument();
  });

  it('"Rúbrica" aparece en el selector de valoración para Tarea pero NO para Actividad', async () => {
    // This test verifies the fix: the "rubric" option must be gated on work type.
    // Strategy: locate the "Tipo de valoración" form item by walking up from its label,
    // then click its .ant-select-selector to open the antd dropdown, and inspect
    // .ant-select-item-option-content elements (the rendered option texts).
    // Because dropdown items are only rendered while the dropdown is open, a test that
    // passes even if the fix were reverted would need the option to appear in both
    // states — this one asserts its presence for Tarea AND its absence for Actividad,
    // so reverting the fix would break the second assertion.
    const user = userEvent.setup();
    render(<CreateWorkModal open onClose={vi.fn()} />);
    await screen.findByText('Fecha de entrega');

    const getValorSelector = () => {
      const label = screen.getByText('Tipo de valoración');
      const formItem = label.closest('.ant-form-item')!;
      return formItem.querySelector('.ant-select-selector')!;
    };

    // --- Tarea (default): Rúbrica MUST be present ---
    await user.click(getValorSelector());
    await waitFor(() => {
      const texts = Array.from(
        document.querySelectorAll('.ant-select-item-option-content'),
      ).map((el) => el.textContent ?? '');
      expect(texts.some((t) => t.includes('Rúbrica'))).toBe(true);
      expect(texts.some((t) => t.includes('Emojis'))).toBe(true);
      expect(texts.some((t) => t.includes('Puntuación numérica'))).toBe(true);
    });
    // Close dropdown via Escape on the last search input
    const inputs = document.querySelectorAll('.ant-select-selection-search-input');
    fireEvent.keyDown(inputs[inputs.length - 1], { key: 'Escape' });

    // --- Switch to Actividad: Rúbrica must NOT appear ---
    await user.click(screen.getByText('Actividad'));
    await screen.findByText('Fecha de revisión');

    await user.click(getValorSelector());
    await waitFor(() => {
      const texts = Array.from(
        document.querySelectorAll('.ant-select-item-option-content'),
      ).map((el) => el.textContent ?? '');
      expect(texts.some((t) => t.includes('Rúbrica'))).toBe(false);
      expect(texts.some((t) => t.includes('Emojis'))).toBe(true);
      expect(texts.some((t) => t.includes('Puntuación numérica'))).toBe(true);
    });
  }, 15000);
});
