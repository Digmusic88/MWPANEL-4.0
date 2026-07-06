import React, { useState } from 'react';
import { Popover, Button, Tag, Spin, Space, Typography } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import { criterionKnowledgeService, CriterionKnowledgeView } from '../../services/criterionKnowledgeService';

const CriterionKnowledgePopover: React.FC<{ criterionId: string }> = ({ criterionId }) => {
  const [data, setData] = useState<CriterionKnowledgeView | null>(null);
  const [loading, setLoading] = useState(false);

  const onOpen = async (open: boolean) => {
    if (open && !data) {
      setLoading(true);
      try { setData(await criterionKnowledgeService.getForCriterion(criterionId)); }
      finally { setLoading(false); }
    }
  };

  const content = loading ? <Spin size="small" /> : (
    <div style={{ maxWidth: 320 }}>
      <Typography.Text strong>Saberes básicos</Typography.Text>
      <div style={{ margin: '4px 0' }}>
        {data?.knowledge?.length ? <Space wrap>{data.knowledge.map((k) => (
          <Popover
            key={k.code}
            trigger="hover"
            title={`${k.code} ${k.title}`}
            content={<div style={{ maxWidth: 320 }}><Typography.Text>{k.description || 'Sin descripción.'}</Typography.Text></div>}
          >
            <Tag color="green" style={{ cursor: 'help', marginBottom: 4 }}>{k.code} {k.title}</Tag>
          </Popover>
        ))}</Space>
          : <Typography.Text type="secondary">Sin saberes confirmados.</Typography.Text>}
      </div>
      <Typography.Text strong>Competencia clave</Typography.Text>
      <div style={{ marginTop: 4 }}>
        {data?.keyCompetencies?.length ? <Space wrap>{data.keyCompetencies.map((kc) => <Tag key={kc.id} color="blue">{kc.code}</Tag>)}</Space>
          : <Typography.Text type="secondary">—</Typography.Text>}
      </div>
    </div>
  );

  return (
    <Popover trigger="click" title="Conexión curricular" content={content} onOpenChange={onOpen}>
      <Button type="text" size="small" icon={<BookOutlined />} aria-label="Ver saberes y competencia" />
    </Popover>
  );
};

export default CriterionKnowledgePopover;
