import React from 'react';
import { Alert } from 'antd';
import {
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useSystemAnnouncements } from '../../hooks/useSystemAnnouncements';

/**
 * Componente que muestra los anuncios del sistema activos
 * Se muestra en la parte superior de todos los paneles
 */
const SystemBanner: React.FC = () => {
  const { data: announcements, isLoading } = useSystemAnnouncements();

  // No mostrar nada si está cargando o no hay anuncios
  if (isLoading || !announcements || announcements.length === 0) {
    return null;
  }

  // Mapeo de tipos a componentes de Ant Design
  const typeMap = {
    info: 'info',
    warning: 'warning',
    error: 'error',
    success: 'success',
  } as const;

  const iconMap = {
    info: <InfoCircleOutlined />,
    warning: <WarningOutlined />,
    error: <CloseCircleOutlined />,
    success: <CheckCircleOutlined />,
  };

  return (
    <div className="system-announcements-container">
      {announcements.map((announcement) => (
        <Alert
          key={announcement.id}
          message={
            announcement.title ? (
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {announcement.title}
                </div>
                <div>{announcement.message}</div>
              </div>
            ) : (
              announcement.message
            )
          }
          type={typeMap[announcement.type]}
          icon={iconMap[announcement.type]}
          banner
          closable={false}
          style={{
            marginBottom: announcements.length > 1 ? 8 : 0,
            borderRadius: 0,
          }}
          className="system-announcement-banner"
        />
      ))}
    </div>
  );
};

export default SystemBanner;
