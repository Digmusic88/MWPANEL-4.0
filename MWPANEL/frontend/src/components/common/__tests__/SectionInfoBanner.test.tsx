import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SectionInfoBanner from '../SectionInfoBanner';

describe('SectionInfoBanner', () => {
  it('renderiza el texto recibido por la prop text', () => {
    render(<SectionInfoBanner text="Texto de prueba de la sección" />);
    expect(
      screen.getByText('Texto de prueba de la sección'),
    ).toBeInTheDocument();
  });

  it('renderiza como un Alert de tipo info (rol alert con clase ant-alert-info)', () => {
    const { container } = render(<SectionInfoBanner text="Otro texto" />);
    const alert = container.querySelector('.ant-alert.ant-alert-info');
    expect(alert).not.toBeNull();
  });

  it('mezcla el estilo recibido con el margin por defecto', () => {
    const { container } = render(
      <SectionInfoBanner text="X" style={{ marginTop: 8 }} />,
    );
    const alert = container.querySelector('.ant-alert') as HTMLElement;
    expect(alert.style.marginBottom).toBe('16px');
    expect(alert.style.marginTop).toBe('8px');
  });
});
