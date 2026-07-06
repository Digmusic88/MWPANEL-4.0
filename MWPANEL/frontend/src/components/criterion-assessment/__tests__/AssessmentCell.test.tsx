import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssessmentCell } from '../AssessmentCell';

describe('AssessmentCell', () => {
  it('modo niveles: muestra 4 opciones y emite el nivel', () => {
    const onChange = vi.fn();
    render(<AssessmentCell scaleType="levels" numericMax={10} value={{}} onChange={onChange} />);
    fireEvent.click(screen.getByText('A')); // ACHIEVING abreviado
    expect(onChange).toHaveBeenCalledWith({ levelValue: 'ACHIEVING' });
  });

  it('muestra indicador auto cuando source=derived (SP-D3b)', () => {
    render(<AssessmentCell scaleType="numeric" numericMax={100} value={{}} onChange={() => {}} source="derived" />);
    expect(screen.getByTitle(/derivad/i)).toBeTruthy();
  });

  it('no muestra indicador cuando source=manual (SP-D3b)', () => {
    render(<AssessmentCell scaleType="numeric" numericMax={100} value={{}} onChange={() => {}} source="manual" />);
    expect(screen.queryByTitle(/derivad/i)).toBeNull();
  });
});
