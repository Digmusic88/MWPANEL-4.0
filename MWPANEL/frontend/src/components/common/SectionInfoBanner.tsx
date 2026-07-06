import React from 'react';
import { Alert } from 'antd';

interface SectionInfoBannerProps {
  /** Texto explicativo de para qué sirve la sección. */
  text: string;
  /** Estilos extra; se mezclan con el margin inferior por defecto. */
  style?: React.CSSProperties;
}

/**
 * Cuadro explicativo breve para el área del profesor.
 * Un `Alert type="info"` reutilizable que aclara el propósito de cada sección.
 */
const SectionInfoBanner: React.FC<SectionInfoBannerProps> = ({ text, style }) => (
  <Alert
    type="info"
    showIcon
    message={text}
    style={{ marginBottom: 16, ...style }}
  />
);

export default SectionInfoBanner;
