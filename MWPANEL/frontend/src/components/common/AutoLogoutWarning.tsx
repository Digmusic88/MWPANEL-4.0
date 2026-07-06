import React, { useEffect, useState } from 'react';
import { Modal, Button, Progress, Typography, Space, Divider } from 'antd';
import { ClockCircleOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface AutoLogoutWarningProps {
  visible: boolean;
  remainingTime: number; // tiempo restante en milisegundos
  warningDuration: number; // duración total del warning en milisegundos
  onExtendSession: () => void;
  onLogoutNow: () => void;
}

/**
 * Modal de advertencia antes del auto-logout por inactividad
 * Muestra una cuenta regresiva y permite al usuario extender la sesión
 */
const AutoLogoutWarning: React.FC<AutoLogoutWarningProps> = ({
  visible,
  remainingTime,
  warningDuration,
  onExtendSession,
  onLogoutNow,
}) => {
  const [timeLeft, setTimeLeft] = useState(warningDuration);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Cuando el modal se hace visible, iniciar countdown desde warningDuration
  useEffect(() => {
    if (visible) {
      setTimeLeft(warningDuration);
      setStartTime(Date.now());
    } else {
      setStartTime(null);
    }
  }, [visible, warningDuration]);

  // Countdown preciso basado en tiempo real
  useEffect(() => {
    if (!visible || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, warningDuration - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100); // Actualizar cada 100ms para mayor precisión

    return () => clearInterval(interval);
  }, [visible, startTime, warningDuration]);

  // Formatear tiempo para mostrar
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calcular porcentaje para la barra de progreso (tiempo restante - se vacía con el tiempo)
  const getProgressPercent = (): number => {
    if (warningDuration <= 0) return 0;
    // Mostrar cuánto tiempo queda (empieza llena y se vacía)
    return Math.max(0, (timeLeft / warningDuration) * 100);
  };

  // Color de la barra de progreso según el porcentaje de tiempo restante
  const getProgressColor = (): string => {
    const percentRemaining = (timeLeft / warningDuration) * 100;
    if (percentRemaining > 66) return '#52c41a'; // Verde: > 66%
    if (percentRemaining > 33) return '#faad14'; // Amarillo: > 33%
    return '#ff4d4f'; // Rojo: < 33%
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ff4d4f' }}>
          <ClockCircleOutlined style={{ fontSize: '20px' }} />
          <span>⚠️ Sesión por Expirar</span>
        </div>
      }
      open={visible}
      closable={false}
      maskClosable={false}
      width={480}
      centered
      footer={null}
      className="auto-logout-warning-modal"
    >
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {/* Icono y mensaje principal */}
        <div style={{ marginBottom: 24 }}>
          <UserOutlined
            style={{
              fontSize: '48px',
              color: '#faad14',
              marginBottom: 16,
              display: 'block'
            }}
          />
          <Title level={4} style={{ margin: 0, color: '#434343' }}>
            Tu sesión está a punto de expirar
          </Title>
          <Text type="secondary" style={{ fontSize: '14px' }}>
            Has estado inactivo durante mucho tiempo
          </Text>
        </div>

        {/* Cuenta regresiva */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            color: getProgressColor(),
            marginBottom: 8,
            fontFamily: 'monospace'
          }}>
            {formatTime(timeLeft)}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Tiempo restante antes del cierre automático
          </Text>
        </div>

        {/* Barra de progreso */}
        <div style={{ marginBottom: 24 }}>
          <Progress
            percent={getProgressPercent()}
            strokeColor={getProgressColor()}
            showInfo={false}
            size="small"
            style={{ marginBottom: 8 }}
          />
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Tu sesión se cerrará automáticamente por seguridad
          </Text>
        </div>

        <Divider style={{ margin: '20px 0' }} />

        {/* Botones de acción */}
        <Space size="middle" style={{ width: '100%', justifyContent: 'center' }}>
          <Button
            type="primary"
            size="large"
            icon={<UserOutlined />}
            onClick={onExtendSession}
            style={{
              backgroundColor: '#52c41a',
              borderColor: '#52c41a',
              borderRadius: '6px',
              fontWeight: '500',
              minWidth: '140px'
            }}
          >
            Continuar Sesión
          </Button>
          <Button
            size="large"
            icon={<LogoutOutlined />}
            onClick={onLogoutNow}
            style={{
              borderRadius: '6px',
              fontWeight: '500',
              minWidth: '120px'
            }}
          >
            Cerrar Sesión
          </Button>
        </Space>

        {/* Información adicional */}
        <div style={{
          marginTop: 20,
          padding: '12px',
          backgroundColor: '#f6ffed',
          borderRadius: '6px',
          border: '1px solid #b7eb8f'
        }}>
          <Text style={{ fontSize: '12px', color: '#52c41a' }}>
            💡 <strong>Tip:</strong> Si continúas, tu sesión se extenderá por 30 minutos más
          </Text>
        </div>
      </div>

      {/* Estilos personalizados */}
      <style jsx>{`
        .auto-logout-warning-modal .ant-modal-header {
          border-bottom: 2px solid #ff4d4f;
          padding: 16px 24px;
        }

        .auto-logout-warning-modal .ant-modal-body {
          padding: 0 24px 24px;
        }

        .auto-logout-warning-modal .ant-modal-title {
          font-weight: 600;
          font-size: 16px;
        }

      `}</style>
    </Modal>
  );
};

export default AutoLogoutWarning;