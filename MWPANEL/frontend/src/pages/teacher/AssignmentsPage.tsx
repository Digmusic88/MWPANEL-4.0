/**
 * @archivo: AssignmentsPage.tsx
 * @módulo: Educational Resources - Teacher Assignment Management
 * @función: Página principal para gestión de asignaciones de recursos
 * @proyecto: MW Panel 2.0 - Sistema Simple de Asignaciones
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Página completa para que los profesores gestionen todas las asignaciones
 * de recursos educativos a sus estudiantes y clases.
 * 
 * FUNCIONALIDADES:
 * - Vista de todas las asignaciones activas
 * - Gestión de asignaciones por clase/estudiante
 * - Estadísticas de completado
 * - Filtros y búsqueda avanzada
 * - Acciones masivas
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - SIMPLE ASSIGNMENT SYSTEM
 */

import React from 'react';
import {
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Button,
  Tabs
} from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';

import { SimpleAssignmentsList } from '@components/recursos/SimpleAssignmentsList';
import { useAuth } from '../../hooks/useAuth';
import SectionInfoBanner from '../../components/common/SectionInfoBanner';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const AssignmentsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <SectionInfoBanner text="Repartes un material (PDF/enlace) con fecha; el alumno marca completado. Sin nota." />
      <div className="mb-6">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>
              <Space>
                <FileTextOutlined />
                Gestión de Asignaciones
              </Space>
            </Title>
            <Text type="secondary">
              Administra las asignaciones de recursos educativos para tus estudiantes
            </Text>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  // Redirigir a la página de recursos para asignar nuevos recursos
                  window.location.href = '/teacher/resources';
                }}
              >
                Nueva Asignación
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Tabs defaultActiveKey="active" className="assignments-tabs">
        <TabPane
          tab={
            <Space>
              <ClockCircleOutlined />
              <span>Asignaciones Activas</span>
            </Space>
          }
          key="active"
        >
          <SimpleAssignmentsList 
            userRole="teacher" 
            className="mt-4"
          />
        </TabPane>
        
        <TabPane
          tab={
            <Space>
              <CheckCircleOutlined />
              <span>Completadas</span>
            </Space>
          }
          key="completed"
        >
          <SimpleAssignmentsList 
            userRole="teacher" 
            className="mt-4"
          />
        </TabPane>
        
        <TabPane
          tab={
            <Space>
              <ExclamationCircleOutlined />
              <span>Vencidas</span>
            </Space>
          }
          key="overdue"
        >
          <SimpleAssignmentsList 
            userRole="teacher" 
            className="mt-4"
          />
        </TabPane>
      </Tabs>
    </motion.div>
  );
};

export default AssignmentsPage;