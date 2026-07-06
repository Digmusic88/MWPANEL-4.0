/**
 * @archivo: CampaignGrid.tsx
 * @módulo: Assignments - Frontend Components
 * @función: Grid de campañas con filtros y paginación
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Componente que muestra una grilla de campañas con capacidades
 * de filtrado, búsqueda, ordenamiento y paginación.
 * 
 * FUNCIONALIDADES:
 * - Grid responsive de campañas
 * - Filtros por estado, tipo, fecha
 * - Búsqueda en tiempo real
 * - Paginación con lazy loading
 * - Acciones masivas opcionales
 * - Vista compacta/expandida
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.1
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Row, 
  Col, 
  Input, 
  Select, 
  DatePicker, 
  Button, 
  Space, 
  Spin, 
  Empty, 
  Pagination,
  Typography,
  Card,
  Checkbox,
  Dropdown,
  Menu,
  message,
  Switch,
  Tooltip
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  PlusOutlined,
  MoreOutlined,
  AppstoreOutlined,
  BarsOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { CampaignCard } from './CampaignCard';
import { 
  AssignmentCampaign, 
  CampaignFilters, 
  CampaignStatus, 
  CampaignType, 
  PaginationQuery,
  CampaignListResponse 
} from '../../types/assignments';
import { useDebounce } from '../../hooks/useDebounce';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface CampaignGridProps {
  campaigns: AssignmentCampaign[];
  loading?: boolean;
  error?: string;
  total?: number;
  filters?: CampaignFilters;
  pagination?: PaginationQuery;
  showFilters?: boolean;
  showBulkActions?: boolean;
  showCreateButton?: boolean;
  compactView?: boolean;
  
  // Callbacks
  onFiltersChange?: (filters: CampaignFilters) => void;
  onPaginationChange?: (pagination: PaginationQuery) => void;
  onRefresh?: () => void;
  onCreate?: () => void;
  onView?: (campaign: AssignmentCampaign) => void;
  onEdit?: (campaign: AssignmentCampaign) => void;
  onDelete?: (campaign: AssignmentCampaign) => void;
  onActivate?: (campaign: AssignmentCampaign) => void;
  onPause?: (campaign: AssignmentCampaign) => void;
  onBulkAction?: (action: string, campaigns: AssignmentCampaign[]) => void;
}

/**
 * Opciones de filtro
 */
const statusOptions = [
  { label: 'Borrador', value: CampaignStatus.DRAFT, color: 'default' },
  { label: 'Activa', value: CampaignStatus.ACTIVE, color: 'success' },
  { label: 'Pausada', value: CampaignStatus.PAUSED, color: 'warning' },
  { label: 'Completada', value: CampaignStatus.COMPLETED, color: 'success' },
  { label: 'Cancelada', value: CampaignStatus.CANCELLED, color: 'error' },
  { label: 'Archivada', value: CampaignStatus.ARCHIVED, color: 'default' }
];

const typeOptions = [
  { label: 'Individual', value: CampaignType.SINGLE },
  { label: 'Masiva', value: CampaignType.BULK },
  { label: 'Recurrente', value: CampaignType.RECURRING },
  { label: 'Condicional', value: CampaignType.CONDITIONAL }
];

const sortOptions = [
  { label: 'Fecha creación (desc)', value: 'createdAt', order: 'DESC' },
  { label: 'Fecha creación (asc)', value: 'createdAt', order: 'ASC' },
  { label: 'Título (A-Z)', value: 'title', order: 'ASC' },
  { label: 'Título (Z-A)', value: 'title', order: 'DESC' },
  { label: 'Estado', value: 'status', order: 'ASC' },
  { label: 'Tipo', value: 'type', order: 'ASC' }
];

export const CampaignGrid: React.FC<CampaignGridProps> = ({
  campaigns,
  loading = false,
  error,
  total = 0,
  filters = {},
  pagination = { page: 1, limit: 12 },
  showFilters = true,
  showBulkActions = false,
  showCreateButton = true,
  compactView = false,
  onFiltersChange,
  onPaginationChange,
  onRefresh,
  onCreate,
  onView,
  onEdit,
  onDelete,
  onActivate,
  onPause,
  onBulkAction
}) => {
  // Estados locales
  const [localFilters, setLocalFilters] = useState<CampaignFilters>(filters);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Debounced search
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Efectos
  useEffect(() => {
    if (debouncedSearchTerm !== (filters.search || '')) {
      handleFiltersChange({ ...localFilters, search: debouncedSearchTerm });
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Handlers
  const handleFiltersChange = useCallback((newFilters: CampaignFilters) => {
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
    setSelectedCampaigns([]); // Clear selections on filter change
  }, [onFiltersChange]);

  const handlePaginationChange = useCallback((page: number, pageSize: number) => {
    const newPagination = { ...pagination, page, limit: pageSize };
    onPaginationChange?.(newPagination);
  }, [pagination, onPaginationChange]);

  const handleSortChange = useCallback((sortValue: string) => {
    const sortOption = sortOptions.find(opt => opt.value === sortValue);
    if (sortOption) {
      const newPagination = { 
        ...pagination, 
        sortBy: sortOption.value, 
        sortOrder: sortOption.order as 'ASC' | 'DESC'
      };
      onPaginationChange?.(newPagination);
    }
  }, [pagination, onPaginationChange]);

  const handleBulkSelection = useCallback((campaignId: string, checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(prev => [...prev, campaignId]);
    } else {
      setSelectedCampaigns(prev => prev.filter(id => id !== campaignId));
    }
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedCampaigns(campaigns.map(c => c.id));
    } else {
      setSelectedCampaigns([]);
    }
  }, [campaigns]);

  const handleBulkAction = useCallback((action: string) => {
    if (selectedCampaigns.length === 0) {
      message.warning('Selecciona al menos una campaña');
      return;
    }

    const selectedCampaignObjects = campaigns.filter(c => 
      selectedCampaigns.includes(c.id)
    );

    onBulkAction?.(action, selectedCampaignObjects);
    setSelectedCampaigns([]);
  }, [selectedCampaigns, campaigns, onBulkAction]);

  const clearFilters = useCallback(() => {
    const clearedFilters: CampaignFilters = {};
    setLocalFilters(clearedFilters);
    setSearchTerm('');
    handleFiltersChange(clearedFilters);
  }, [handleFiltersChange]);

  // Bulk actions menu
  const bulkActionsMenu = (
    <Menu onClick={({ key }) => handleBulkAction(key)}>
      <Menu.Item key="activate">Activar seleccionadas</Menu.Item>
      <Menu.Item key="pause">Pausar seleccionadas</Menu.Item>
      <Menu.Item key="archive">Archivar seleccionadas</Menu.Item>
      <Menu.Divider />
      <Menu.Item key="export">Exportar seleccionadas</Menu.Item>
      <Menu.Item key="duplicate">Duplicar seleccionadas</Menu.Item>
      <Menu.Divider />
      <Menu.Item key="delete" danger>Eliminar seleccionadas</Menu.Item>
    </Menu>
  );

  // Grid columns calculation
  const getGridCols = useMemo(() => {
    if (compactView) {
      return { xs: 24, sm: 12, md: 8, lg: 6, xl: 4, xxl: 4 };
    } else {
      return { xs: 24, sm: 24, md: 12, lg: 8, xl: 6, xxl: 6 };
    }
  }, [compactView]);

  return (
    <div className="campaign-grid">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Campañas de Asignación
          </Title>
          <div className="text-gray-500 mt-1">
            {total} campañas encontradas
          </div>
        </div>
        
        <Space>
          {showCreateButton && (
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={onCreate}
              size="large"
            >
              Nueva Campaña
            </Button>
          )}
          
          <Button 
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
          >
            Actualizar
          </Button>
        </Space>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card 
          size="small" 
          className="mb-4"
          bodyStyle={{ padding: '16px' }}
        >
          <Row gutter={[16, 16]} align="middle">
            {/* Search */}
            <Col xs={24} sm={12} md={8}>
              <Input
                placeholder="Buscar campañas..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
              />
            </Col>

            {/* Status Filter */}
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Estado"
                allowClear
                style={{ width: '100%' }}
                value={localFilters.status}
                onChange={(value) => handleFiltersChange({ ...localFilters, status: value })}
                mode="multiple"
              >
                {statusOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* Type Filter */}
            <Col xs={24} sm={12} md={4}>
              <Select
                placeholder="Tipo"
                allowClear
                style={{ width: '100%' }}
                value={localFilters.type}
                onChange={(value) => handleFiltersChange({ ...localFilters, type: value })}
                mode="multiple"
              >
                {typeOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Col>

            {/* Date Range */}
            <Col xs={24} sm={12} md={6}>
              <RangePicker
                style={{ width: '100%' }}
                value={localFilters.dateRange ? [
                  localFilters.dateRange.start ? dayjs(localFilters.dateRange.start) : null,
                  localFilters.dateRange.end ? dayjs(localFilters.dateRange.end) : null
                ] : [null, null]}
                onChange={(dates) => {
                  if (dates) {
                    handleFiltersChange({
                      ...localFilters,
                      dateRange: {
                        start: dates[0]?.toISOString(),
                        end: dates[1]?.toISOString()
                      }
                    });
                  } else {
                    const { dateRange, ...rest } = localFilters;
                    handleFiltersChange(rest);
                  }
                }}
                placeholder={['Fecha inicio', 'Fecha fin']}
              />
            </Col>

            {/* Actions */}
            <Col xs={24} sm={12} md={2}>
              <Space>
                <Button onClick={clearFilters}>
                  Limpiar
                </Button>
                
                <Tooltip title="Cambiar vista">
                  <Button 
                    icon={viewMode === 'grid' ? <BarsOutlined /> : <AppstoreOutlined />}
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  />
                </Tooltip>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* Bulk Actions */}
      {showBulkActions && (
        <Card size="small" className="mb-4">
          <div className="flex justify-between items-center">
            <Space>
              <Checkbox
                checked={selectedCampaigns.length === campaigns.length && campaigns.length > 0}
                indeterminate={selectedCampaigns.length > 0 && selectedCampaigns.length < campaigns.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
              >
                Seleccionar todas ({campaigns.length})
              </Checkbox>
              
              {selectedCampaigns.length > 0 && (
                <span className="text-primary">
                  {selectedCampaigns.length} seleccionadas
                </span>
              )}
            </Space>

            {selectedCampaigns.length > 0 && (
              <Dropdown overlay={bulkActionsMenu} trigger={['click']}>
                <Button>
                  Acciones masivas <MoreOutlined />
                </Button>
              </Dropdown>
            )}
          </div>
        </Card>
      )}

      {/* Content */}
      <Spin spinning={loading}>
        {error ? (
          <Card>
            <div className="text-center py-8">
              <div className="text-red-500 mb-4">Error al cargar las campañas</div>
              <Button onClick={onRefresh}>Reintentar</Button>
            </div>
          </Card>
        ) : campaigns.length === 0 ? (
          <Card>
            <Empty 
              description="No hay campañas disponibles"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {showCreateButton && (
                <Button type="primary" onClick={onCreate}>
                  Crear primera campaña
                </Button>
              )}
            </Empty>
          </Card>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${JSON.stringify(filters)}-${pagination.page}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Row gutter={[16, 16]}>
                {campaigns.map((campaign) => (
                  <Col key={campaign.id} {...getGridCols}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="relative">
                        {showBulkActions && (
                          <Checkbox
                            className="absolute top-2 left-2 z-10 bg-white rounded"
                            checked={selectedCampaigns.includes(campaign.id)}
                            onChange={(e) => handleBulkSelection(campaign.id, e.target.checked)}
                          />
                        )}
                        
                        <CampaignCard
                          campaign={campaign}
                          onView={onView}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onActivate={onActivate}
                          onPause={onPause}
                          compact={compactView}
                          showActions={!showBulkActions}
                        />
                      </div>
                    </motion.div>
                  </Col>
                ))}
              </Row>
            </motion.div>
          </AnimatePresence>
        )}
      </Spin>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex justify-center mt-6">
          <Pagination
            current={pagination.page}
            pageSize={pagination.limit}
            total={total}
            onChange={handlePaginationChange}
            showSizeChanger
            showQuickJumper
            showTotal={(total, range) => 
              `${range[0]}-${range[1]} de ${total} campañas`
            }
            pageSizeOptions={['12', '24', '48', '96']}
          />
        </div>
      )}
    </div>
  );
};