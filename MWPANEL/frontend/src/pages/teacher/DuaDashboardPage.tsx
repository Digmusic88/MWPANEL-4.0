/**
 * @page: DuaDashboardPage
 * @module: DUA (Diseño Universal para el Aprendizaje)
 * @description: Página del dashboard DUA para profesores
 * @role: Teacher, Admin
 * @features: Vista general DUA, métricas, analytics
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Typography,
  Space,
  Button,
  Dropdown,
  Menu,
  Card,
} from 'antd';
import {
  BookOutlined,
  PlusOutlined,
  DownloadOutlined,
  SettingOutlined,
  UserAddOutlined,
  FileTextOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import DuaDashboard from '../../components/dua/DuaDashboard';
import { useAuth } from '../../hooks/useAuth';
import { DuaPageHeader } from '../../components/dua/DuaPageHeader';

const DuaDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedClassGroup, setSelectedClassGroup] = useState<string | undefined>();
  const isAdmin = user?.role === 'ADMIN';
  const base = isAdmin ? '/admin/dua' : '/teacher/dua';

  const quickActions = [
    {
      key: 'new-profile',
      icon: <UserAddOutlined />,
      label: 'Crear Perfil DUA',
      onClick: () => navigate(`${base}/profiles/new`),
    },
    {
      key: 'new-accommodation',
      icon: <PlusOutlined />,
      label: 'Nueva Acomodación',
      onClick: () => navigate(`${base}/accommodations/new`),
    },
    {
      key: 'templates',
      icon: <FileTextOutlined />,
      label: 'Plantillas',
      onClick: () => navigate(`${base}/templates`),
    },
    {
      key: 'students',
      icon: <TeamOutlined />,
      label: 'Estudiantes DUA',
      // dua/students no existe; "Estudiantes DUA" = gestionar perfiles
      onClick: () => navigate(`${base}/profiles`),
    },
  ];

  const settingsMenu = (
    <Menu>
      <Menu.Item key="export" icon={<DownloadOutlined />}>
        Exportar Informe
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        Configuración DUA
      </Menu.Item>
    </Menu>
  );

  return (
    <div style={{ padding: 16 }}>
      <DuaPageHeader
        title="Dashboard DUA"
        subtitle="Vista general del sistema de Diseño Universal para el Aprendizaje"
        icon={<BookOutlined />}
        actions={
          <>
            {!isAdmin && (
              <Dropdown.Button
                type="primary"
                icon={<PlusOutlined />}
                menu={{
                  items: quickActions,
                  onClick: ({ key }) => {
                    const action = quickActions.find(a => a.key === key);
                    action?.onClick();
                  },
                }}
              >
                Acciones Rápidas
              </Dropdown.Button>
            )}
            <Dropdown overlay={settingsMenu} placement="bottomRight">
              <Button icon={<SettingOutlined />} />
            </Dropdown>
          </>
        }
      />

      {/* Quick Access Cards */}
      {!isAdmin && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {quickActions.map((action) => (
            <Col xs={12} sm={6} key={action.key}>
              <Card
                hoverable
                onClick={action.onClick}
                style={{ textAlign: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: 32, color: '#1890ff', marginBottom: 8 }}>
                  {action.icon}
                </div>
                <Typography.Text>{action.label}</Typography.Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Main Dashboard */}
      <DuaDashboard
        classGroupId={selectedClassGroup}
        view={user?.role === 'ADMIN' ? 'admin' : 'teacher'}
      />
    </div>
  );
};

export default DuaDashboardPage;