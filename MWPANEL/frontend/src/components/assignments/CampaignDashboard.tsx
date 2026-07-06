/**
 * @archivo: CampaignDashboard.tsx
 * @módulo: Assignments - Frontend Components
 * @función: Dashboard principal de campañas de asignación
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Dashboard completo que integra todos los componentes del sistema
 * de asignaciones: grid de campañas, filtros, modals y analytics.
 * 
 * FUNCIONALIDADES:
 * - Vista completa de campañas
 * - Gestión CRUD completa
 * - Analytics en tiempo real
 * - Operaciones masivas
 * - Integración con MW Panel
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.1
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Space,
  Typography,
  Spin,
  message,
  Modal,
  Tooltip,
  Badge,
  Progress,
  Tabs
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  BarChartOutlined,
  ExportOutlined,
  BellOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  DashboardOutlined,
  FileTextOutlined,
  TeamOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';

import { CampaignGrid } from './CampaignGrid';
import { CampaignModal } from './CampaignModal';
import { useAuth } from '../../hooks/useAuth';
import { assignmentsService } from '../../services/assignmentsService';
import {
  AssignmentCampaign,
  CampaignFilters,
  PaginationQuery,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignListResponse,
  AnalyticsOverviewResponse,
  CampaignStatus
} from '../../types/assignments';

const { Title, Text } = Typography;
const { Content } = Layout;
const { TabPane } = Tabs;

interface CampaignDashboardProps {
  className?: string;
}

/**
 * Configuración de colores para estados
 */
const statusColors = {
  [CampaignStatus.DRAFT]: '#d9d9d9',
  [CampaignStatus.ACTIVE]: '#52c41a',
  [CampaignStatus.PAUSED]: '#faad14',
  [CampaignStatus.COMPLETED]: '#1890ff',
  [CampaignStatus.CANCELLED]: '#ff4d4f',
  [CampaignStatus.ARCHIVED]: '#8c8c8c'
};

export const CampaignDashboard: React.FC<CampaignDashboardProps> = ({ 
  className = '' 
}) => {
  // Estados principales
  const [campaigns, setCampaigns] = useState<AssignmentCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [total, setTotal] = useState(0);
  
  // Estados de filtros y paginación
  const [filters, setFilters] = useState<CampaignFilters>({});
  const [pagination, setPagination] = useState<PaginationQuery>({
    page: 1,
    limit: 12,
    sortBy: 'createdAt',
    sortOrder: 'DESC'
  });

  // Estados de modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AssignmentCampaign | undefined>();
  const [modalLoading, setModalLoading] = useState(false);

  // Estados de analytics
  const [analytics, setAnalytics] = useState<AnalyticsOverviewResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Estados para datos auxiliares
  const [availableResources, setAvailableResources] = useState<any[]>([]);
  const [availableTargets, setAvailableTargets] = useState<any>({});

  // Hook de autenticación
  const { user } = useAuth();

  // Cargar datos iniciales
  useEffect(() => {
    loadCampaigns();
    loadAnalytics();
    loadAuxiliaryData();
  }, []);

  // Cargar campañas cuando cambien filtros o paginación
  useEffect(() => {
    loadCampaigns();
  }, [filters, pagination]);

  // Función para cargar campañas
  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const response: CampaignListResponse = await assignmentsService.campaigns.getCampaigns(
        filters,
        pagination
      );
      
      setCampaigns(response.data);
      setTotal(response.pagination.totalItems);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar las campañas';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination]);

  // Función para cargar analytics
  const loadAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const analyticsData = await assignmentsService.analytics.getOverview();
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Función para cargar datos auxiliares
  const loadAuxiliaryData = useCallback(async () => {
    try {
      const [resources, targets] = await Promise.all([
        assignmentsService.utilities.getAvailableResources(),
        assignmentsService.utilities.getAvailableTargets()
      ]);
      
      setAvailableResources(resources);
      setAvailableTargets(targets);
    } catch (err) {
      console.error('Error loading auxiliary data:', err);
    }
  }, []);

  // Handler para crear campaña
  const handleCreateCampaign = useCallback(async (data: CreateCampaignDto) => {
    try {
      setModalLoading(true);
      const newCampaign = await assignmentsService.campaigns.createCampaign(data);
      
      // Actualizar la lista
      setCampaigns(prev => [newCampaign, ...prev]);
      setShowCreateModal(false);
      
      message.success('Campaña creada correctamente');
      
      // Recargar analytics
      loadAnalytics();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear la campaña';
      message.error(errorMessage);
      throw err;
    } finally {
      setModalLoading(false);
    }
  }, [loadAnalytics]);

  // Handler para editar campaña
  const handleEditCampaign = useCallback(async (data: UpdateCampaignDto) => {
    if (!editingCampaign) return;

    try {
      setModalLoading(true);
      const updatedCampaign = await assignmentsService.campaigns.updateCampaign(
        editingCampaign.id,
        data
      );
      
      // Actualizar en la lista
      setCampaigns(prev => prev.map(c => 
        c.id === editingCampaign.id ? updatedCampaign : c
      ));
      setEditingCampaign(undefined);
      
      message.success('Campaña actualizada correctamente');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar la campaña';
      message.error(errorMessage);
      throw err;
    } finally {
      setModalLoading(false);
    }
  }, [editingCampaign]);

  // Handler para eliminar campaña
  const handleDeleteCampaign = useCallback(async (campaign: AssignmentCampaign) => {
    Modal.confirm({
      title: '¿Eliminar campaña?',
      content: `¿Está seguro de que desea eliminar la campaña "${campaign.title}"? Esta acción no se puede deshacer.`,
      okText: 'Eliminar',
      cancelText: 'Cancelar',
      okType: 'danger',
      onOk: async () => {
        try {
          await assignmentsService.campaigns.deleteCampaign(campaign.id);
          setCampaigns(prev => prev.filter(c => c.id !== campaign.id));
          message.success('Campaña eliminada correctamente');
          loadAnalytics();
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Error al eliminar la campaña';
          message.error(errorMessage);
        }
      }
    });
  }, [loadAnalytics]);

  // Handler para activar campaña
  const handleActivateCampaign = useCallback(async (campaign: AssignmentCampaign) => {
    try {
      const updatedCampaign = await assignmentsService.campaigns.activateCampaign(campaign.id);
      setCampaigns(prev => prev.map(c => 
        c.id === campaign.id ? updatedCampaign : c
      ));
      message.success('Campaña activada correctamente');
      loadAnalytics();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al activar la campaña';
      message.error(errorMessage);
    }
  }, [loadAnalytics]);

  // Handler para pausar campaña
  const handlePauseCampaign = useCallback(async (campaign: AssignmentCampaign) => {
    try {
      const updatedCampaign = await assignmentsService.campaigns.pauseCampaign(campaign.id);
      setCampaigns(prev => prev.map(c => 
        c.id === campaign.id ? updatedCampaign : c
      ));
      message.success('Campaña pausada correctamente');
      loadAnalytics();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al pausar la campaña';
      message.error(errorMessage);
    }
  }, [loadAnalytics]);

  // Handler para operaciones masivas
  const handleBulkAction = useCallback(async (action: string, campaigns: AssignmentCampaign[]) => {
    const campaignIds = campaigns.map(c => c.id);
    
    try {
      switch (action) {
        case 'activate':
          await assignmentsService.campaigns.bulkUpdateStatus(campaignIds, CampaignStatus.ACTIVE);
          message.success(`${campaigns.length} campañas activadas`);
          break;
        case 'pause':
          await assignmentsService.campaigns.bulkUpdateStatus(campaignIds, CampaignStatus.PAUSED);
          message.success(`${campaigns.length} campañas pausadas`);
          break;
        case 'archive':
          await assignmentsService.campaigns.bulkUpdateStatus(campaignIds, CampaignStatus.ARCHIVED);
          message.success(`${campaigns.length} campañas archivadas`);
          break;
        case 'delete':
          Modal.confirm({
            title: `¿Eliminar ${campaigns.length} campañas?`,
            content: 'Esta acción no se puede deshacer.',
            okText: 'Eliminar',
            cancelText: 'Cancelar',
            okType: 'danger',
            onOk: async () => {
              await assignmentsService.campaigns.bulkDelete(campaignIds);
              message.success(`${campaigns.length} campañas eliminadas`);
              loadCampaigns();
            }
          });
          return;
        case 'duplicate':
          await assignmentsService.campaigns.bulkClone(campaignIds);
          message.success(`${campaigns.length} campañas duplicadas`);
          break;
        default:
          message.info(`Acción "${action}" en desarrollo`);
          return;
      }
      
      // Recargar datos después de operaciones masivas
      loadCampaigns();
      loadAnalytics();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error en la operación masiva';
      message.error(errorMessage);
    }
  }, [loadCampaigns, loadAnalytics]);

  // Estadísticas calculadas
  const stats = useMemo(() => {
    if (!analytics) return null;

    return {
      total: analytics.totalCampaigns,
      active: analytics.activeCampaigns,
      completionRate: Math.round(analytics.completionRate * 100),
      engagement: Math.round(analytics.engagementRate * 100),
      avgProgress: Math.round(analytics.averageProgress * 100)
    };
  }, [analytics]);

  // Verificar permisos del usuario
  const canCreateCampaigns = user?.role && ['admin', 'teacher'].includes(user.role);
  const canManageCampaigns = user?.role && ['admin'].includes(user.role);

  return (
    <div className={`campaign-dashboard ${className}`}>
      {/* Header con estadísticas */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title level={2} className="mb-0">
              <DashboardOutlined className="mr-2" />
              Dashboard de Asignaciones
            </Title>
            <Text type="secondary">
              Gestiona y monitorea las campañas de asignación de recursos
            </Text>
          </div>
          
          <Space>
            <Button 
              icon={<BarChartOutlined />}
              onClick={() => message.info('Analytics detallados en desarrollo')}
            >
              Analytics
            </Button>
            
            <Button 
              icon={<ExportOutlined />}
              onClick={() => message.info('Exportación en desarrollo')}
            >
              Exportar
            </Button>

            <Button 
              icon={<ReloadOutlined />}
              onClick={() => {
                loadCampaigns();
                loadAnalytics();
              }}
              loading={loading || analyticsLoading}
            >
              Actualizar
            </Button>
          </Space>
        </div>

        {/* Estadísticas */}
        <Spin spinning={analyticsLoading}>
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12} md={6}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <Statistic
                    title="Total Campañas"
                    value={stats?.total || 0}
                    prefix={<FileTextOutlined />}
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
                    title="Campañas Activas"
                    value={stats?.active || 0}
                    prefix={<Badge status="success" />}
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
                        {stats?.completionRate || 0}%
                      </div>
                    </div>
                    <Progress 
                      type="circle" 
                      percent={stats?.completionRate || 0}
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
                      <div className="text-gray-500 text-sm mb-1">Engagement</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {stats?.engagement || 0}%
                      </div>
                    </div>
                    <Progress 
                      type="circle" 
                      percent={stats?.engagement || 0}
                      size={60}
                      strokeColor="#1890ff"
                    />
                  </div>
                </Card>
              </motion.div>
            </Col>
          </Row>
        </Spin>
      </div>

      {/* Contenido principal */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <CampaignGrid
          campaigns={campaigns}
          loading={loading}
          error={error}
          total={total}
          filters={filters}
          pagination={pagination}
          showFilters={true}
          showBulkActions={canManageCampaigns}
          showCreateButton={canCreateCampaigns}
          onFiltersChange={setFilters}
          onPaginationChange={setPagination}
          onRefresh={loadCampaigns}
          onCreate={() => setShowCreateModal(true)}
          onView={(campaign) => message.info('Vista detallada en desarrollo')}
          onEdit={setEditingCampaign}
          onDelete={handleDeleteCampaign}
          onActivate={handleActivateCampaign}
          onPause={handlePauseCampaign}
          onBulkAction={handleBulkAction}
        />
      </motion.div>

      {/* Modal de creación */}
      <CampaignModal
        visible={showCreateModal}
        loading={modalLoading}
        onSubmit={handleCreateCampaign}
        onCancel={() => setShowCreateModal(false)}
        availableResources={availableResources}
        availableTargets={availableTargets}
      />

      {/* Modal de edición */}
      <CampaignModal
        visible={!!editingCampaign}
        campaign={editingCampaign}
        loading={modalLoading}
        onSubmit={handleEditCampaign}
        onCancel={() => setEditingCampaign(undefined)}
        availableResources={availableResources}
        availableTargets={availableTargets}
      />
    </div>
  );
};