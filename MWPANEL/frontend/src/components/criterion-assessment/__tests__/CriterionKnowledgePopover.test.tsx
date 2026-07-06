import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CriterionKnowledgePopover from '../CriterionKnowledgePopover';

vi.mock('../../../services/criterionKnowledgeService', () => ({
  criterionKnowledgeService: {
    getForCriterion: vi.fn().mockResolvedValue({
      knowledge: [{ code: 'A.1', title: 'Seres vivos', block: 'A' }],
      keyCompetencies: [{ id: 'k1', code: 'STEM', name: 'STEM' }],
    }),
  },
}));

describe('CriterionKnowledgePopover', () => {
  it('al abrir muestra saberes confirmados y competencia clave', async () => {
    render(<CriterionKnowledgePopover criterionId="c1" />);
    await userEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText(/Seres vivos/)).toBeInTheDocument());
    expect(screen.getByText(/STEM/)).toBeInTheDocument();
  });
});
