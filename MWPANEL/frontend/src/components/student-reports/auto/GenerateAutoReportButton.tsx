import React from 'react';
import { Button } from 'antd';
import { FileSearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface Props {
  studentId: string;
  basePath: string;
  block?: boolean;
}

export const GenerateAutoReportButton: React.FC<Props> = ({ studentId, basePath, block }) => {
  const navigate = useNavigate();
  return (
    <Button
      icon={<FileSearchOutlined />}
      style={block ? { width: '100%' } : undefined}
      onClick={() => navigate(`${basePath}/${studentId}`)}
    >
      Informe automático
    </Button>
  );
};
