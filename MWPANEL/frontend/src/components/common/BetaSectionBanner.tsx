import React from 'react';
import { Alert } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';

/**
 * Aviso reutilizable "en pruebas" para las superficies de expediente y
 * calificaciones de familia/alumno/profesor. NO usar en el panel admin.
 */
const BetaSectionBanner: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <Alert
    type="info"
    showIcon
    icon={<ExperimentOutlined />}
    message="Sección en pruebas: el expediente y las calificaciones pueden no mostrar todavía todas las asignaturas."
    style={{ marginBottom: 16, ...style }}
  />
);

export default BetaSectionBanner;
