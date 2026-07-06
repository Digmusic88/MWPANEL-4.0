import React from 'react';
import { Typography } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloudOutlined } from '@ant-design/icons';
import type { DraftStatus } from '../../hooks/useDraftAutosave';

const { Text } = Typography;

interface Props {
  status: DraftStatus;
  lastSavedAt?: Date | null;
  /** Texto cuando aún no se ha escrito nada */
  idleText?: string;
}

/**
 * Indicador estilo Gmail de autoguardado de borrador.
 *  - saving  → "Guardando…"
 *  - saved   → "Borrador guardado ✓ (hh:mm)"
 *  - idle    → texto informativo (el borrador se guarda solo)
 */
const DraftSaveIndicator: React.FC<Props> = ({ status, lastSavedAt, idleText }) => {
  if (status === 'saving') {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        <LoadingOutlined style={{ marginRight: 6 }} /> Guardando…
      </Text>
    );
  }
  if (status === 'saved') {
    const time = lastSavedAt
      ? lastSavedAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : '';
    return (
      <Text style={{ fontSize: 12, color: '#52c41a' }}>
        <CheckCircleOutlined style={{ marginRight: 6 }} />
        Borrador guardado{time ? ` · ${time}` : ''}
      </Text>
    );
  }
  return (
    <Text type="secondary" style={{ fontSize: 12 }}>
      <CloudOutlined style={{ marginRight: 6 }} />
      {idleText || 'El mensaje se guarda automáticamente mientras escribes'}
    </Text>
  );
};

export default DraftSaveIndicator;
