/**
 * @archivo: CompetenciesManagementPage.tsx
 * @módulo: Admin Pages (Gestión de Competencias)
 * @función: Página principal de administración del sistema de competencias
 * @crítico: SÍ - Centro de control del sistema competencial LOMLOE
 * @dependencias: useCompetencies, ExitProfileView, CompetencyForm
 * @relacionado_con: Sistema competencial, evaluación formativa
 */

import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Typography,
  Space,
  Button,
  Statistic,
  Alert,
} from 'antd';
import {
  BookOutlined,
  FileTextOutlined,
  SettingOutlined,
  PlusOutlined,
  EyeOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import ExitProfileView from '../competencies/ExitProfileView';
import { useExitProfiles } from '../../hooks/useCompetencies';
import StaggerContainer, { StaggerItem } from '@components/animations/StaggerContainer';
import HoverCard, { StatCard } from '@components/animations/HoverCard';
import FadeInUp from '@components/animations/FadeInUp';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const CompetenciesManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Datos de estadísticas (en una implementación real vendrían de la API)
  const { data: infantilProfiles } = useExitProfiles('INFANTIL');
  const { data: primariaProfiles } = useExitProfiles('PRIMARIA');
  const { data: secundariaProfiles } = useExitProfiles('SECUNDARIA');

  const totalCompetencies = (infantilProfiles?.length || 0) + 
                           (primariaProfiles?.length || 0) + 
                           (secundariaProfiles?.length || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="shadow-sm">
          <Row align="middle" justify="space-between">
            <Col>
              <Space size="large">
                <div>
                  <Title level={2} className="mb-1">
                    <BookOutlined className="mr-2 text-blue-600" />
                    Gestión de Competencias
                  </Title>
                  <Text type="secondary" className="text-base">
                    Administración del sistema competencial español (LOMLOE)
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button type="primary" icon={<PlusOutlined />}>
                  Nueva Competencia
                </Button>
                <Button icon={<SettingOutlined />}>
                  Configuración
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* Stats Cards */}
      <StaggerContainer staggerDelay={0.15} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StaggerItem>
          <StatCard
            title="Total Competencias"
            value={totalCompetencies}
            icon={<BookOutlined />}
            trend="up"
            trendValue="8 competencias clave"
            className="h-full"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Infantil"
            value={infantilProfiles?.length || 0}
            icon={<FileTextOutlined />}
            trend="neutral"
            trendValue="Educación Infantil"
            className="h-full"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Primaria"
            value={primariaProfiles?.length || 0}
            icon={<FileTextOutlined />}
            trend="up"
            trendValue="Educación Primaria"
            className="h-full"
          />
        </StaggerItem>
        <StaggerItem>
          <StatCard
            title="Secundaria"
            value={secundariaProfiles?.length || 0}
            icon={<FileTextOutlined />}
            trend="up"
            trendValue="Educación Secundaria"
            className="h-full"
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Alert informativo */}
      <FadeInUp delay={0.3}>
        <Alert
          message="Sistema de Competencias Clave LOMLOE"
          description="El Perfil de Salida del alumnado al término de la enseñanza básica fija las competencias clave que el alumnado debe haber desarrollado al finalizar la enseñanza básica e introduce orientaciones sobre el nivel de desempeño esperado al término de cada etapa educativa."
          type="info"
          showIcon
          icon={<BookOutlined />}
        />
      </FadeInUp>

      {/* Main Content Tabs */}
      <FadeInUp delay={0.4}>
        <Card className="shadow-sm">
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            size="large"
            tabBarExtraContent={
              <Space>
                <Button icon={<EyeOutlined />} size="small">
                  Vista Completa
                </Button>
                <Button icon={<BarChartOutlined />} size="small">
                  Estadísticas
                </Button>
              </Space>
            }
          >
            <TabPane 
              tab={
                <span>
                  <BookOutlined />
                  Perfil de Salida
                </span>
              } 
              key="exit-profile"
            >
              <ExitProfileView />
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <FileTextOutlined />
                  Competencias Específicas
                </span>
              } 
              key="specific-competencies"
            >
              <div className="text-center py-12">
                <Space direction="vertical" size="large">
                  <FileTextOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  <div>
                    <Title level={4} type="secondary">
                      Competencias Específicas
                    </Title>
                    <Text type="secondary">
                      Gestión de competencias específicas por área y materia
                    </Text>
                  </div>
                  <Button type="primary" icon={<PlusOutlined />}>
                    Crear Competencia Específica
                  </Button>
                </Space>
              </div>
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <SettingOutlined />
                  Criterios de Evaluación
                </span>
              } 
              key="evaluation-criteria"
            >
              <div className="text-center py-12">
                <Space direction="vertical" size="large">
                  <SettingOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  <div>
                    <Title level={4} type="secondary">
                      Criterios de Evaluación
                    </Title>
                    <Text type="secondary">
                      Configuración de criterios de evaluación por competencia
                    </Text>
                  </div>
                  <Button type="primary" icon={<PlusOutlined />}>
                    Crear Criterio de Evaluación
                  </Button>
                </Space>
              </div>
            </TabPane>

            <TabPane 
              tab={
                <span>
                  <BarChartOutlined />
                  Saberes Básicos
                </span>
              } 
              key="basic-knowledge"
            >
              <div className="text-center py-12">
                <Space direction="vertical" size="large">
                  <BarChartOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  <div>
                    <Title level={4} type="secondary">
                      Saberes Básicos
                    </Title>
                    <Text type="secondary">
                      Gestión de saberes básicos y conocimientos fundamentales
                    </Text>
                  </div>
                  <Button type="primary" icon={<PlusOutlined />}>
                    Crear Saber Básico
                  </Button>
                </Space>
              </div>
            </TabPane>
          </Tabs>
        </Card>
      </FadeInUp>
    </div>
  );
};

export default CompetenciesManagementPage;