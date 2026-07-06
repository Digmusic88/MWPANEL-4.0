import React, { useState } from 'react';
import { Button, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import apiClient from '@/services/apiClient';

export const SyncExpedienteButton: React.FC<{ studentId: string; academicYearName: string }> = ({ studentId, academicYearName }) => {
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    try { const r = await apiClient.post(`/academic-records/sync/student/${studentId}/${academicYearName}`); message.success(`Expediente sincronizado (${r.data?.entries ?? 0} entradas)`); }
    catch (e: any) { message.error(e?.response?.data?.message || 'No se pudo sincronizar el expediente'); }
    finally { setLoading(false); }
  };
  return <Button icon={<SyncOutlined />} loading={loading} onClick={onClick}>Sincronizar expediente</Button>;
};
