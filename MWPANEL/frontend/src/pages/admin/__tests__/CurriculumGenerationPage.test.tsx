import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CurriculumGenerationPage from '../CurriculumGenerationPage';

vi.mock('../../../services/curriculumGenerationService', () => ({
  curriculumGenerationService: {
    generate: vi.fn(), getOne: vi.fn(), save: vi.fn(), apply: vi.fn(), discard: vi.fn(),
  },
}));
vi.mock('../../../services/apiClient', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('../../../services/criterionKnowledgeService', () => ({
  criterionKnowledgeService: { getScopes: vi.fn().mockResolvedValue([]) },
}));

describe('CurriculumGenerationPage', () => {
  it('renderiza un borrador inyectado: específica, criterio y saber editables', async () => {
    const draft = { id: 'g1', subjectName: 'Matemáticas', scopeType: 'course', scopeId: 'c1', status: 'draft',
      payload: { specificCompetencies: [{ code: 'CE.MAT.1', name: 'Resolver', description: 'd', keyCompetencyCodes: ['STEM'], criteria: [{ code: '1.1', description: 'Criterio uno' }] }], basicKnowledge: [{ code: 'A.1', block: 'A', title: 'Números', description: 'd', knowledgeType: 'KNOWLEDGE' }] } };
    render(<CurriculumGenerationPage initialDraft={draft as any} />);
    expect(await screen.findByDisplayValue('Resolver')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Criterio uno')).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Números')).toBeInTheDocument();
  });
});
