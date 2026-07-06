/**
 * @archivo: ProgressDashboard.tsx
 * @módulo: Assignments - Frontend Components
 * @función: Dashboard de seguimiento de progreso de asignaciones
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Dashboard completo para seguimiento de progreso de asignaciones,
 * con vistas por estudiante, campaña y analytics avanzados.
 * 
 * FUNCIONALIDADES:
 * - Vista de progreso por estudiante/campaña
 * - Gráficos de rendimiento
 * - Feed de actividades recientes
 * - Alertas y notificaciones
 * - Reportes exportables
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.2
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Avatar,
  Typography,
  Space,
  Button,
  Select,
  DatePicker,
  Alert,
  Spin,
  message,
  Badge,
  Tooltip,
  Tabs,
  Empty,
  Divider
} from 'antd';
import {
  UserOutlined,
  BookOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BarChartOutlined,
  CalendarOutlined,
  BellOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  RiseOutlined,
  FallOutlined,
  AlertOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';

import { StudentProgressCard } from './StudentProgressCard';
import { ProgressChart } from './ProgressChart';
import { ActivityFeed } from './ActivityFeed';
import { AlertsPanel } from './AlertsPanel';
import { useAuth } from '../../hooks/useAuth';
import { assignmentsService } from '../../services/assignmentsService';
import {
  AssignmentProgress,
  ProgressDashboardResponse,
  ProgressFilters,
  ProgressAlert
} from '../../types/assignments';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

interface ProgressDashboardProps {
  campaignId?: string; // Si se especifica, filtrar por campaña
  userId?: string;     // Si se especifica, mostrar solo este usuario
  className?: string;
}

/**
 * Estado de filtros por defecto
 */
const defaultFilters: ProgressFilters = {
  status: ['IN_PROGRESS', 'COMPLETED'],
  dateRange: {
    start: dayjs().subtract(30, 'days').toDate(),
    end: dayjs().toDate()
  }
};

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  campaignId,
  userId,
  className = ''
}) => {
  // Estados principales
  const [dashboard, setDashboard] = useState<ProgressDashboardResponse | null>(null);
  const [progress, setProgress] = useState<AssignmentProgress[]>([]);
  const [alerts, setAlerts] = useState<ProgressAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Estados de filtros
  const [filters, setFilters] = useState<ProgressFilters>(defaultFilters);
  const [selectedCampaign, setSelectedCampaign] = useState<string | undefined>(campaignId);
  const [selectedUser, setSelectedUser] = useState<string | undefined>(userId);
  const [viewType, setViewType] = useState<'overview' | 'details' | 'analytics'>('overview');

  // Estado de exportación
  const [exporting, setExporting] = useState(false);

  // Hook de autenticación
  const { user } = useAuth();

  // Cargar datos iniciales
  useEffect(() => {
    loadDashboardData();
    loadAlerts();
  }, [selectedCampaign, selectedUser, filters]);

  // Función para cargar datos del dashboard
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (selectedUser) {
        // Cargar dashboard de usuario específico
        const dashboardData = await assignmentsService.progress.getUserProgressDashboard(selectedUser);
        setDashboard(dashboardData);

        // Cargar progreso específico
        if (selectedCampaign) {
          const userProgress = await assignmentsService.progress.getUserCampaignProgress(
            selectedUser, 
            selectedCampaign
          );
          setProgress(userProgress);
        }
      } else if (selectedCampaign) {
        // Cargar progreso de campaña
        const campaignProgress = await assignmentsService.progress.getCampaignProgress(
          selectedCampaign,
          filters
        );
        setProgress(campaignProgress);
      } else {
        // Vista general - implementar cuando se necesite
        setProgress([]);
        setDashboard(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar los datos';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedCampaign, selectedUser, filters]);

  // Función para cargar alertas
  const loadAlerts = useCallback(async () => {
    try {
      const alertsData = await assignmentsService.progress.getProgressAlerts();
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error loading alerts:', err);
    }
  }, []);

  // Función para actualizar filtros
  const handleFiltersChange = useCallback((newFilters: Partial<ProgressFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Función para exportar reportes
  const handleExport = useCallback(async (format: 'pdf' | 'excel' = 'pdf') => {
    if (!selectedCampaign) {
      message.warning('Seleccione una campaña para exportar');
      return;
    }

    try {
      setExporting(true);
      const blob = await assignmentsService.progress.generateProgressReport(selectedCampaign, format);
      
      // Crear URL y descargar
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `progreso-campaña-${selectedCampaign}-${dayjs().format('YYYY-MM-DD')}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      message.success('Reporte descargado correctamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al exportar';
      message.error(errorMessage);
    } finally {
      setExporting(false);
    }
  }, [selectedCampaign]);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    if (!dashboard && progress.length === 0) return null;

    const totalStudents = progress.length || dashboard?.totalAssignments || 0;
    const completedCount = progress.filter(p => p.status === 'COMPLETED').length || dashboard?.completedAssignments || 0;
    const inProgressCount = progress.filter(p => p.status === 'IN_PROGRESS').length || dashboard?.inProgressAssignments || 0;
    const averageCompletion = progress.length > 0 
      ? Math.round(progress.reduce((acc, p) => acc + (p.completionPercentage || 0), 0) / progress.length)
      : dashboard?.averageCompletion ? Math.round(dashboard.averageCompletion * 100) : 0;

    return {
      total: totalStudents,
      completed: completedCount,
      inProgress: inProgressCount,
      averageCompletion,
      completionRate: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0
    };
  }, [dashboard, progress]);

  // Verificar permisos
  const canViewAllProgress = user?.role && ['admin', 'teacher'].includes(user.role);

  return (
    <div className={`progress-dashboard ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title level={2} className="mb-0">
              <BarChartOutlined className="mr-2" />
              Dashboard de Progreso
            </Title>
            <Text type="secondary">
              Seguimiento detallado del progreso de asignaciones
            </Text>
          </div>

          <Space>
            <Button 
              icon={<FileExcelOutlined />}
              onClick={() => handleExport('excel')}
              loading={exporting}
              disabled={!selectedCampaign}
            >
              Exportar Excel
            </Button>
            
            <Button 
              icon={<FilePdfOutlined />}
              onClick={() => handleExport('pdf')}
              loading={exporting}
              disabled={!selectedCampaign}
            >
              Exportar PDF
            </Button>

            <Button 
              icon={<ReloadOutlined />}
              onClick={() => {
                loadDashboardData();
                loadAlerts();
              }}
              loading={loading}
            >
              Actualizar
            </Button>
          </Space>
        </div>

        {/* Filtros */}
        <Card size="small" className="mb-4">
          <Row gutter={[16, 16]}>
            {canViewAllProgress && (
              <>
                <Col xs={24} sm={12} md={6}>
                  <div className="mb-2">
                    <Text strong>Campaña</Text>
                  </div>
                  <Select
                    placeholder="Seleccionar campaña"
                    style={{ width: '100%' }}
                    value={selectedCampaign}
                    onChange={setSelectedCampaign}
                    allowClear
                  >
                    {/* TODO: Cargar campañas disponibles */}
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={6}>
                  <div className="mb-2">
                    <Text strong>Usuario</Text>
                  </div>
                  <Select
                    placeholder="Seleccionar usuario"
                    style={{ width: '100%' }}
                    value={selectedUser}
                    onChange={setSelectedUser}
                    allowClear
                  >
                    {/* TODO: Cargar usuarios disponibles */}
                  </Select>
                </Col>
              </>
            )}

            <Col xs={24} sm={12} md={6}>
              <div className="mb-2">
                <Text strong>Período</Text>
              </div>
              <RangePicker
                style={{ width: '100%' }}
                value={filters.dateRange ? [
                  dayjs(filters.dateRange.start),
                  dayjs(filters.dateRange.end)
                ] : null}
                onChange={(dates) => {
                  if (dates) {
                    handleFiltersChange({
                      dateRange: {
                        start: dates[0]?.toDate(),
                        end: dates[1]?.toDate()
                      }
                    });
                  }
                }}
              />
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div className="mb-2">
                <Text strong>Vista</Text>
              </div>
              <Select
                value={viewType}
                onChange={setViewType}
                style={{ width: '100%' }}
              >
                <Option value="overview">Resumen</Option>
                <Option value="details">Detallado</Option>
                <Option value="analytics">Analytics</Option>
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Alertas */}
        {alerts.length > 0 && (
          <AlertsPanel 
            alerts={alerts} 
            onMarkAsRead={async (alertId) => {
              await assignmentsService.progress.markAlertAsRead(alertId);
              setAlerts(prev => prev.filter(a => a.id !== alertId));
            }}
            className="mb-4"
          />
        )}
      </div>

      {/* Contenido principal */}
      <Spin spinning={loading}>
        {error && (
          <Alert
            message="Error al cargar datos"
            description={error}
            type="error"
            showIcon
            className="mb-6"
          />
        )}

        {/* Estadísticas generales */}
        {stats && (
          <Row gutter={[24, 16]} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <Statistic
                    title="Total Asignaciones"
                    value={stats.total}
                    prefix={<BookOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </motion.div>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <Statistic
                    title="Completadas"
                    value={stats.completed}
                    prefix={<TrophyOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </motion.div>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-500 text-sm mb-1">Tasa Completado</div>
                      <div className="text-2xl font-bold text-green-600">
                        {stats.completionRate}%
                      </div>
                    </div>
                    <Progress 
                      type="circle" 
                      percent={stats.completionRate}
                      size={60}
                      strokeColor="#52c41a"
                    />
                  </div>
                </Card>
              </motion.div>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-gray-500 text-sm mb-1">Progreso Promedio</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.averageCompletion}%
                      </div>
                    </div>
                    <Progress 
                      type="circle" 
                      percent={stats.averageCompletion}
                      size={60}
                      strokeColor="#1890ff"
                    />
                  </div>
                </Card>
              </motion.div>
            </Col>
          </Row>
        )}

        {/* Contenido por vista */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Tabs activeKey={viewType} onChange={(key) => setViewType(key as any)}>
            {/* Vista Resumen */}
            <TabPane tab="Resumen" key="overview">
              <Row gutter={[24, 24]}>
                {/* Lista de progreso */}
                <Col xs={24} lg={16}>
                  <Card title="Progreso de Estudiantes" className="h-full">
                    {progress.length > 0 ? (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {progress.map((progressItem) => (
                          <StudentProgressCard 
                            key={`${progressItem.campaignId}-${progressItem.userId}`}
                            progress={progressItem}
                            onView={() => message.info('Vista detallada en desarrollo')}
                            compact={true}
                          />
                        ))}
                      </div>
                    ) : (
                      <Empty 
                        description="No hay datos de progreso disponibles"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                      />
                    )}
                  </Card>
                </Col>

                {/* Panel lateral */}
                <Col xs={24} lg={8}>
                  <Space direction="vertical" className="w-full" size="large">
                    {/* Gráfico de progreso */}
                    <ProgressChart 
                      data={progress}
                      type="completion"
                      title="Distribución de Completado"
                    />

                    {/* Actividades recientes */}
                    <ActivityFeed 
                      userId={selectedUser}
                      campaignId={selectedCampaign}
                      limit={5}
                      compact={true}
                    />
                  </Space>
                </Col>
              </Row>
            </TabPane>

            {/* Vista Detallada */}
            <TabPane tab="Detallado" key="details">
              <div className="space-y-6">
                {progress.length > 0 ? (
                  progress.map((progressItem) => (
                    <StudentProgressCard 
                      key={`${progressItem.campaignId}-${progressItem.userId}`}
                      progress={progressItem}
                      onView={() => message.info('Vista detallada en desarrollo')}
                      compact={false}
                      showDetails={true}
                    />
                  ))
                ) : (
                  <Empty 
                    description="No hay datos de progreso disponibles"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </div>
            </TabPane>

            {/* Vista Analytics */}
            <TabPane tab="Analytics" key="analytics">
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                  <ProgressChart 
                    data={progress}
                    type="trend"
                    title="Tendencia de Progreso"
                  />
                </Col>
                
                <Col xs={24} lg={12}>
                  <ProgressChart 
                    data={progress}
                    type="distribution"
                    title="Distribución por Estado"
                  />
                </Col>

                <Col xs={24}>
                  <ActivityFeed 
                    userId={selectedUser}
                    campaignId={selectedCampaign}
                    limit={20}
                    compact={false}
                    showFilters={true}
                  />
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </motion.div>
      </Spin>
    </div>
  );
};