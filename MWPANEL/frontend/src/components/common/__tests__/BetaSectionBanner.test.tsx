import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BetaSectionBanner from '../BetaSectionBanner';

describe('BetaSectionBanner', () => {
  it('muestra el aviso "en pruebas" con el texto acordado', () => {
    render(<BetaSectionBanner />);
    expect(
      screen.getByText(/Sección en pruebas: el expediente y las calificaciones pueden no mostrar todavía todas las asignaturas\./i),
    ).toBeInTheDocument();
  });
});
