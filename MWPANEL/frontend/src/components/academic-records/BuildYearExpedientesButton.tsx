import React, { useState } from 'react';
import { Button, message, Popconfirm } from 'antd';
import { BuildOutlined } from '@ant-design/icons';
import apiClient from '@services/apiClient';

export interface BuildYearExpedientesButtonProps {
  academicYearId?: string;
}

const BuildYearExpedientesButton: React.FC<BuildYearExpedientesButtonProps> = ({ academicYearId }) => {
  const [loading, setLoading] = useState(false);
  if (!academicYearId) return null;

  const onConfirm = async () => {
    setLoading(true);
    try {
      const r = await apiClient.post(`/academic-records/build/year/${academicYearId}`);
      message.success(`Expedientes generados: ${r.data?.records ?? 0} alumnos`);
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'No se pudieron generar los expedientes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popconfirm
      title="Generar expedientes del año"
      description="Reconstruye el expediente de todos los alumnos con notas este año. Es idempotente."
      okText="Generar"
      cancelText="Cancelar"
      onConfirm={onConfirm}
    >
      <Button icon={<BuildOutlined />} loading={loading}>Generar expedientes del año</Button>
    </Popconfirm>
  );
};

export default BuildYearExpedientesButton;
