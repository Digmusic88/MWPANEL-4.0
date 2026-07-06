import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CriterionHelp } from '../CriterionHelp';

describe('CriterionHelp', () => {
  it('renderiza el titulo del panel de ayuda', () => {
    render(<CriterionHelp />);
    expect(screen.getByText(/qué es esta página/i)).toBeInTheDocument();
  });

  it('muestra los tres estados de la escala', () => {
    render(<CriterionHelp />);
    expect(screen.getByText('No completado')).toBeInTheDocument();
    expect(screen.getByText('En proceso')).toBeInTheDocument();
    expect(screen.getByText('Alcanzado')).toBeInTheDocument();
  });

  it('explica los modos de nota del trimestre (Paralelo/Derivar/Sustituir)', () => {
    render(<CriterionHelp />);
    expect(screen.getByText('Paralelo')).toBeInTheDocument();
    expect(screen.getByText('Derivar')).toBeInTheDocument();
    expect(screen.getByText('Sustituir')).toBeInTheDocument();
  });

  it('muestra texto de qué son los criterios de evaluación', () => {
    render(<CriterionHelp />);
    // El texto puede repartirse en varios nodos; basta con que aparezca.
    expect(screen.getAllByText(/criterios de evaluación/i).length).toBeGreaterThan(0);
  });

  it('muestra instrucciones de uso (Guardar)', () => {
    render(<CriterionHelp />);
    expect(screen.getByText(/guardar/i)).toBeInTheDocument();
  });
});
