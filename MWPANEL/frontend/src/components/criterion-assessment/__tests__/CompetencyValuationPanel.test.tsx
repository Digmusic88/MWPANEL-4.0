import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompetencyValuationPanel } from '../CompetencyValuationPanel';

describe('CompetencyValuationPanel', () => {
  it('muestra competencias clave con su score', () => {
    render(
      <CompetencyValuationPanel
        valuation={{ bySpecific: [], byKey: [{ code: 'CCL', name: 'Ling', score: 70 }] }}
      />,
    );
    expect(screen.getByText('CCL')).toBeTruthy();
    expect(screen.getByText(/70/)).toBeTruthy();
  });

  it('muestra Empty cuando no hay datos', () => {
    render(<CompetencyValuationPanel valuation={{ bySpecific: [], byKey: [] }} />);
    expect(screen.getByText(/Sin datos de valoración/i)).toBeTruthy();
  });
});
