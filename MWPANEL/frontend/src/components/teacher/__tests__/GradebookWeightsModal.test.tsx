import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GradebookWeightsModal from '../GradebookWeightsModal';

vi.mock('@services/apiClient', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}));
vi.mock('../../common/SessionExpiredModal', () => ({
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

const SUBJECT_ID = 'subj-1';
const CONFIG_ID = 'cfg-1';

const configWithWeights = [{
  id: CONFIG_ID,
  weightConfiguration: {
    exams: { weight: 40, enabled: true, minimumItems: 1, scale: 'numeric_0_100' },
    tasks: { weight: 30, enabled: true, minimumItems: 1, scale: 'numeric_0_100' },
    activities: { weight: 30, enabled: true, minimumItems: 1, scale: 'numeric_0_100' },
  },
}];

describe('GradebookWeightsModal', () => {
  beforeEach(async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockReset();
    apiClient.put.mockReset();
  });

  it('si no hay config, muestra el aviso de recalcular primero (sin editor)', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockResolvedValue({ data: [] });

    render(<GradebookWeightsModal open subjectId={SUBJECT_ID} onClose={() => {}} />);

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith(`/grade-configurations?subjectId=${SUBJECT_ID}`),
    );
    expect(await screen.findByText(/pulsa Recalcular para crearla/i)).toBeInTheDocument();
    // No hay botón Guardar cuando no hay config.
    expect(screen.queryByRole('button', { name: /Guardar/i })).not.toBeInTheDocument();
  });

  it('bloquea el guardado si los pesos no suman 100', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockResolvedValue({ data: configWithWeights });
    apiClient.put.mockResolvedValue({ data: {} });

    const user = userEvent.setup();
    render(<GradebookWeightsModal open subjectId={SUBJECT_ID} onClose={() => {}} />);

    // Editor cargado: el peso de Test Yourself aparece a 40.
    const examsInput = await screen.findByLabelText('Test Yourself');
    // Subir exams a 50 -> suma = 110.
    await user.clear(examsInput);
    await user.type(examsInput, '50');

    await user.click(screen.getByRole('button', { name: /Guardar/i }));

    // No se guarda (suma != 100) y se muestra el aviso.
    expect(apiClient.put).not.toHaveBeenCalled();
    expect(await screen.findByText(/deben sumar 100/i)).toBeInTheDocument();
  });

  it('guarda con PUT el weightConfiguration actualizado cuando suma 100', async () => {
    const apiClient = (await import('@services/apiClient')).default as any;
    apiClient.get.mockResolvedValue({ data: configWithWeights });
    apiClient.put.mockResolvedValue({ data: {} });
    const onClose = vi.fn();

    const user = userEvent.setup();
    render(<GradebookWeightsModal open subjectId={SUBJECT_ID} onClose={onClose} />);

    // Cambiar a 50/30/20 (suma 100).
    const examsInput = await screen.findByLabelText('Test Yourself');
    const activitiesInput = screen.getByLabelText('Actividades');
    // Usar fireEvent.change para garantizar que el onChange del InputNumber se dispara
    // con el valor numérico correcto (userEvent en InputNumber puede perder eventos).
    fireEvent.change(examsInput, { target: { value: '50' } });
    fireEvent.change(activitiesInput, { target: { value: '20' } });

    await user.click(screen.getByRole('button', { name: /Guardar/i }));

    await waitFor(() => expect(apiClient.put).toHaveBeenCalledTimes(1));
    const [url, body] = apiClient.put.mock.calls[0];
    expect(url).toBe(`/grade-configurations/${CONFIG_ID}`);
    expect(body.weightConfiguration.exams.weight).toBe(50);
    expect(body.weightConfiguration.tasks.weight).toBe(30);
    expect(body.weightConfiguration.activities.weight).toBe(20);
    // Conserva los metadatos del componente (enabled/minimumItems/scale).
    expect(body.weightConfiguration.exams.enabled).toBe(true);
    expect(body.weightConfiguration.exams.scale).toBe('numeric_0_100');
  });
});
