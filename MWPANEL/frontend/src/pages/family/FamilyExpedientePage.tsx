import React, { useEffect, useState } from 'react';
import { Card, Select, Space, Empty, Spin, Typography } from 'antd';
import apiClient from '@services/apiClient';
import ExpedienteViewer from '@/components/academic-records/ExpedienteViewer';
import BetaSectionBanner from '@/components/common/BetaSectionBanner';

const { Title } = Typography;

interface FamilyChild {
  id: string;
  user?: {
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

const childName = (c: FamilyChild): string => {
  const first = c.user?.profile?.firstName || '';
  const last = c.user?.profile?.lastName || '';
  return `${first} ${last}`.trim() || 'Alumno';
};

const FamilyExpedientePage: React.FC = () => {
  const [children, setChildren] = useState<FamilyChild[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/families/my-children');
        const list: FamilyChild[] = res.data || [];
        if (cancelled) return;
        setChildren(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } catch {
        if (!cancelled) setChildren([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spin />;
  if (children.length === 0) return <Empty description="No hay alumnos asociados a esta familia" />;

  return (
    <div>
      <Title level={3}>Expediente académico</Title>
      <BetaSectionBanner />
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <span>Hijo/a:</span>
          <Select
            style={{ width: 260 }}
            value={selectedId}
            onChange={setSelectedId}
            options={children.map((c) => ({ value: c.id, label: childName(c) }))}
          />
        </Space>
      </Card>
      {selectedId && <ExpedienteViewer studentId={selectedId} />}
    </div>
  );
};

export default FamilyExpedientePage;
