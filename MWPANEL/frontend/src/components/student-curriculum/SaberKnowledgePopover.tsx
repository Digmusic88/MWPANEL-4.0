import React from 'react';
import { Popover, Button, Typography } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { SaberView } from '@/types/studentCurriculum';

const SaberKnowledgePopover: React.FC<{ saber: SaberView }> = ({ saber }) => (
  <Popover
    trigger="hover"
    title={saber.title || saber.code || 'Saber básico'}
    content={<div style={{ maxWidth: 320 }}><Typography.Text>{saber.description || 'Sin descripción'}</Typography.Text></div>}
  >
    <Button type="text" size="small" icon={<BookOutlined />} aria-label="Ver saber básico" />
  </Popover>
);
export default SaberKnowledgePopover;
