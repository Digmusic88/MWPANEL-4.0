
import React from 'react';
import { Drawer, Tabs } from 'antd';
import { MobileMessagesList } from './MobileMessagesList';
import { MobileNotificationsList } from './MobileNotificationsList';

interface HeaderMobilePanelProps {
  visible: boolean;
  onClose: () => void;
  initialTab: 'messages' | 'notifications';
}

export const HeaderMobilePanel: React.FC<HeaderMobilePanelProps> = ({
  visible,
  onClose,
  initialTab,
}) => {
  const items = [
    {
      key: 'messages',
      label: `Mensajes`,
      children: <MobileMessagesList />,
    },
    {
      key: 'notifications',
      label: `Notificaciones`,
      children: <MobileNotificationsList />,
    },
  ];

  return (
    <Drawer
      title="Centro de Actividad"
      placement="right"
      onClose={onClose}
      open={visible}
      width="90%"
      bodyStyle={{ padding: 0 }}
    >
      <Tabs defaultActiveKey={initialTab} centered items={items} />
    </Drawer>
  );
};
