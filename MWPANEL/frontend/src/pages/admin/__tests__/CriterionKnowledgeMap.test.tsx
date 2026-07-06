import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CriterionKnowledgeMap from '../CriterionKnowledgeMap';

vi.mock('../../../services/criterionKnowledgeService', () => ({
  criterionKnowledgeService: {
    getMap: vi.fn().mockResolvedValue([
      {
        criterion: { id: 'c1', code: '1.1', description: 'Identificar seres vivos' },
        knowledge: [
          { linkId: 'l1', basicKnowledgeId: 'k1', code: 'A.1', title: 'Seres vivos', status: 'suggested', confidence: 0.82, source: 'ai' },
          { linkId: 'l2', basicKnowledgeId: 'k2', code: 'A.2', title: 'Funciones vitales', status: 'confirmed', confidence: null, source: 'manual' },
        ],
        keyCompetencies: [{ id: 'kc1', code: 'STEM', name: 'STEM' }],
      },
    ]),
    getScopes: vi.fn().mockResolvedValue([
      { scopeType: 'cycle', scopeId: 'x', label: 'Ciclo A' },
    ]),
    suggest: vi.fn(),
    setStatus: vi.fn(),
    linkManual: vi.fn(),
    unlink: vi.fn(),
    getCandidates: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../services/apiClient', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

describe('CriterionKnowledgeMap', () => {
  it('muestra el criterio y sus saberes sugeridos/confirmados tras cargar', async () => {
    render(
      <CriterionKnowledgeMap
        initialSubjectName="CMN"
        initialScope={{ scopeType: 'cycle', scopeId: 'x' }}
      />
    );
    expect(await screen.findByText(/Identificar seres vivos/)).toBeInTheDocument();
    expect(await screen.findByText(/Seres vivos/)).toBeInTheDocument();
    expect(await screen.findByText(/Funciones vitales/)).toBeInTheDocument();
    expect(await screen.findByText(/STEM/)).toBeInTheDocument();
  });
});
