/**
 * @archivo: StaffProgressCard.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Card de progreso para dashboard del claustro
 */

import React from 'react';
import { Card, Progress, Statistic, Row, Col, Typography, Space } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { StaffTaskStats } from '@/types/staff';

const { Text } = Typography;

interface StaffProgressCardProps {
  stats: StaffTaskStats;
  title?: string;
  loading?: boolean;
}

export const StaffProgressCard: React.FC<StaffProgressCardProps> = ({
  stats,
  title = 'Progreso de Tareas',
  loading = false,
}) => {
  return (
    <Card title={title} loading={loading}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Progress
              type="circle"
              percent={stats.completionRate}
              size={120}
              format={percent => (
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{percent}%</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Completado</div>
                </div>
              )}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#52c41a',
              }}
            />
          </div>
        </Col>

        <Col span={12}>
          <Statistic
            title={
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <span>Completadas</span>
              </Space>
            }
            value={stats.completed}
            valueStyle={{ color: '#52c41a' }}
          />
        </Col>

        <Col span={12}>
          <Statistic
            title={
              <Space>
                <SyncOutlined style={{ color: '#1890ff' }} />
                <span>En Progreso</span>
              </Space>
            }
            value={stats.inProgress}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>

        <Col span={12}>
          <Statistic
            title={
              <Space>
                <ClockCircleOutlined style={{ color: '#faad14' }} />
                <span>Pendientes</span>
              </Space>
            }
            value={stats.pending}
            valueStyle={{ color: '#faad14' }}
          />
        </Col>

        <Col span={12}>
          <Statistic
            title={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <span>Vencidas</span>
              </Space>
            }
            value={stats.overdue}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Col>

        <Col span={24}>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Text type="secondary">
              Total: {stats.total} tareas
            </Text>
          </div>
        </Col>
      </Row>
    </Card>
  );
};

interface StaffUserProgressCardProps {
  userStats: {
    user: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
    };
    total: number;
    completed: number;
    completionRate: number;
  }[];
  loading?: boolean;
}

export const StaffUserProgressCard: React.FC<StaffUserProgressCardProps> = ({
  userStats,
  loading = false,
}) => {
  const getUserName = (user: { firstName?: string; lastName?: string; email: string }) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  return (
    <Card title="Progreso por Profesor" loading={loading}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {userStats.map(stat => (
          <div key={stat.user.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text>{getUserName(stat.user)}</Text>
              <Text type="secondary">
                {stat.completed}/{stat.total} tareas
              </Text>
            </div>
            <Progress
              percent={stat.completionRate}
              size="small"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#52c41a',
              }}
            />
          </div>
        ))}
        {userStats.length === 0 && (
          <Text type="secondary">No hay datos disponibles</Text>
        )}
      </Space>
    </Card>
  );
};

export default StaffProgressCard;
