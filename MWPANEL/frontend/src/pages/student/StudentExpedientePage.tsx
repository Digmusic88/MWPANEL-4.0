import React, { useEffect, useState } from 'react';
import { Spin, Empty, Typography } from 'antd';
import apiClient from '@services/apiClient';
import ExpedienteViewer from '@/components/academic-records/ExpedienteViewer';
import BetaSectionBanner from '@/components/common/BetaSectionBanner';

const { Title } = Typography;

const StudentExpedientePage: React.FC = () => {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Reuses the same endpoint as StudentDashboard (/students/me returns {id, ...})
        const res = await apiClient.get('/students/me');
        if (cancelled) return;
        setStudentId(res.data?.id || null);
      } catch {
        if (!cancelled) setStudentId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spin />;
  if (!studentId) return <Empty description="No se pudo cargar tu expediente" />;

  return (
    <div>
      <Title level={3}>Mi expediente</Title>
      <BetaSectionBanner />
      <ExpedienteViewer studentId={studentId} showPdfButton={false} />
    </div>
  );
};

export default StudentExpedientePage;
