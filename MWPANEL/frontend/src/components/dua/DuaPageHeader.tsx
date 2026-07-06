import React from 'react';
import { Typography, Space } from 'antd';
const { Title, Text } = Typography;
interface Props { title: string; subtitle?: string; icon?: React.ReactNode; actions?: React.ReactNode }
export const DuaPageHeader: React.FC<Props> = ({ title, subtitle, icon, actions }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
    <div>
      <Title level={3} style={{ margin: 0 }}>{icon}{icon ? ' ' : ''}{title}</Title>
      {subtitle && <Text type="secondary">{subtitle}</Text>}
    </div>
    {actions && <Space wrap>{actions}</Space>}
  </div>
);
