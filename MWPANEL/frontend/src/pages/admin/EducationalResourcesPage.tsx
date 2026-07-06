import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Typography,
  Button,
  Space,
  Tabs,
  Badge,
  message,
  Row,
  Col,
  Statistic,
  Card,
  Modal,
  List,
  Avatar,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  FolderOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  CloudUploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import ResourceGrid from '@components/recursos/ResourceGrid';
import ResourceList from '@components/recursos/ResourceList';
import ResourceFolderView from '@components/recursos/ResourceFolderView';
import ResourceFilters from '@components/recursos/ResourceFilters';
import ResourceViewer from '@components/recursos/ResourceViewer';
import ResourceUploader from '@components/recursos/ResourceUploader';
import ResourceAnalyticsDashboard from '@components/recursos/ResourceAnalyticsDashboard';
import educationalResourcesService, {
  EducationalResource,
  ResourceFilters as Filters,
} from '../../services/educationalResourcesService';
import { useAuth } from '../../hooks/useAuth';
import AcademicYearSelector from '../../components/common/AcademicYearSelector';

const { Title } = Typography;
const { TabPane } = Tabs;

const EducationalResourcesPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'DESC',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'folders'>('folders');
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'public' | 'assigned' | 'analytics'>('all');
  const [viewersModalOpen, setViewersModalOpen] = useState(false);
  const [viewersList, setViewersList] = useState<Array<{
    userId: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    viewedAt: string;
    viewCount: number;
  }>>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersResourceTitle, setViewersResourceTitle] = useState('');
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined);

  // Fetch resources
  const { data, isLoading, error } = useQuery({
    queryKey: ['resources', filters, activeTab, viewMode, selectedYearId],
    queryFn: async () => {
      let queryFilters = { ...filters, academicYearId: selectedYearId };

      // En modo carpetas, cargar TODOS los recursos (sin paginación)
      // para poder organizarlos correctamente por carpetas
      if (viewMode === 'folders') {
        queryFilters.limit = 500; // Cargar muchos más recursos para vista de carpetas
        queryFilters.page = 1;
      }

      switch (activeTab) {
        case 'my':
          queryFilters.authorId = user?.id;
          break;
        case 'public':
          queryFilters.isPublic = true;
          break;
        case 'assigned':
          return {
            resources: await educationalResourcesService.getAssignedResources(selectedYearId),
            total: 0,
            page: 1,
            totalPages: 1,
          };
        case 'analytics':
          // For analytics tab, we don't need resources data
          return {
            resources: [],
            total: 0,
            page: 1,
            totalPages: 1,
          };
      }

      return educationalResourcesService.getResources(queryFilters);
    },
  });

  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: (resourceId: string) => 
      educationalResourcesService.toggleFavorite(resourceId),
    onSuccess: (result, resourceId) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      message.success(
        result.isFavorite
          ? 'Añadido a favoritos'
          : 'Eliminado de favoritos'
      );
    },
    onError: () => {
      message.error('Error al actualizar favoritos');
    },
  });

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: (resourceId: string) => 
      educationalResourcesService.deleteResource(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      message.success('Recurso eliminado correctamente');
    },
    onError: (error: any) => {
      console.error('Error deleting resource:', error);
      message.error(error?.response?.data?.message || 'Error al eliminar el recurso');
    },
  });

  const handleFiltersChange = (newFilters: Filters) => {
    setFilters({
      ...newFilters,
      page: 1,
      limit: 20,
    });
  };

  const handlePageChange = (page: number, pageSize?: number) => {
    setFilters({
      ...filters,
      page,
      limit: pageSize || filters.limit,
    });
  };

  const handleResourceClick = (resource: EducationalResource) => {
    setSelectedResource(resource.id);
  };

  const handleToggleFavorite = (resource: EducationalResource) => {
    toggleFavoriteMutation.mutate(resource.id);
  };

  const handleDeleteResource = async (resource: EducationalResource) => {
    return deleteResourceMutation.mutateAsync(resource.id);
  };

  const handleResourcesUpdate = () => {
    // Invalidar query para refrescar datos sin reload
    queryClient.invalidateQueries({ queryKey: ['resources'] });
  };

  const handleUploadSuccess = () => {
    setShowUploader(false);
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    message.success('Recurso subido exitosamente');
  };

  const handleViewersClick = async (resourceId: string, resourceTitle: string) => {
    setViewersResourceTitle(resourceTitle);
    setViewersList([]);
    setViewersLoading(true);
    setViewersModalOpen(true);
    try {
      const viewers = await educationalResourcesService.getResourceViewers(resourceId);
      setViewersList(viewers);
    } catch {
      message.error('Error al cargar la lista de visualizaciones');
      setViewersModalOpen(false);
    } finally {
      setViewersLoading(false);
    }
  };

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';

  // Calculate statistics
  const stats = {
    total: data?.total || 0,
    pdf: data?.resources?.filter(r => r.type === 'PDF').length || 0,
    video: data?.resources?.filter(r => r.type === 'VIDEO').length || 0,
    image: data?.resources?.filter(r => r.type === 'IMAGE').length || 0,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="mb-6">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={2}>Recursos Educativos</Title>
          </Col>
          <Col>
            <Space>
              <AcademicYearSelector value={selectedYearId} onChange={setSelectedYearId} />
              <Button.Group>
                <Button
                  icon={<FolderOutlined />}
                  type={viewMode === 'folders' ? 'primary' : 'default'}
                  onClick={() => setViewMode('folders')}
                  title="Vista por carpetas de asignaturas"
                />
                <Button
                  icon={<UnorderedListOutlined />}
                  type={viewMode === 'list' ? 'primary' : 'default'}
                  onClick={() => setViewMode('list')}
                  title="Vista de lista"
                />
                <Button
                  icon={<AppstoreOutlined />}
                  type={viewMode === 'grid' ? 'primary' : 'default'}
                  onClick={() => setViewMode('grid')}
                  title="Vista de cuadrícula"
                />
              </Button.Group>
              {isTeacherOrAdmin && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setShowUploader(true)}
                >
                  Subir Recurso
                </Button>
              )}
            </Space>
          </Col>
        </Row>

        {/* Statistics Cards */}
        <Row gutter={16} className="mt-4 mb-6">
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Total Recursos"
                value={stats.total}
                prefix={<CloudUploadOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="PDFs"
                value={stats.pdf}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Videos"
                value={stats.video}
                prefix={<VideoCameraOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Imágenes"
                value={stats.image}
                prefix={<PictureOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as any)}
        className="mb-4"
      >
        <TabPane tab="Todos los Recursos" key="all" />
        {isTeacherOrAdmin && (
          <TabPane
            tab={
              <Badge
                count={
                  activeTab === 'my' && data?.total
                    ? data.total
                    : 0
                }
                showZero={false}
              >
                <span>Mis Recursos</span>
              </Badge>
            }
            key="my"
          />
        )}
        <TabPane tab="Recursos Públicos" key="public" />
        {user?.role === 'student' && (
          <TabPane tab="Recursos Asignados" key="assigned" />
        )}
        {isTeacherOrAdmin && (
          <TabPane tab="Analytics" key="analytics" />
        )}
      </Tabs>

      {activeTab === 'analytics' ? (
        <ResourceAnalyticsDashboard />
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={6}>
            <ResourceFilters
              onFiltersChange={handleFiltersChange}
              defaultFilters={filters}
              academicYearId={selectedYearId}
            />
          </Col>
          <Col xs={24} lg={18}>
            {viewMode === 'folders' ? (
              <ResourceFolderView
                resources={data?.resources || []}
                loading={isLoading}
                onResourceClick={handleResourceClick}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDeleteResource}
                onResourcesUpdate={handleResourcesUpdate}
                onViewersClick={(id) => {
                  const r = data?.resources?.find(x => x.id === id);
                  handleViewersClick(id, r?.title || '');
                }}
                canDelete={isAdmin || (activeTab === 'my' && isTeacherOrAdmin)}
                canManageFolders={isTeacherOrAdmin}
                showAssignmentInfo={activeTab === 'assigned'}
                showAuthorInfo={true}
                pagination={
                  data && {
                    current: data.page,
                    total: data.total,
                    pageSize: filters.limit || 20,
                    onChange: handlePageChange,
                  }
                }
              />
            ) : viewMode === 'grid' ? (
              <ResourceGrid
                resources={data?.resources || []}
                loading={isLoading}
                onResourceClick={handleResourceClick}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDeleteResource}
                onViewersClick={(id) => {
                  const r = data?.resources?.find(x => x.id === id);
                  handleViewersClick(id, r?.title || '');
                }}
                canDelete={isAdmin || (activeTab === 'my' && isTeacherOrAdmin)}
                showAssignmentInfo={activeTab === 'assigned'}
                pagination={
                  data && {
                    current: data.page,
                    total: data.total,
                    pageSize: filters.limit || 20,
                    onChange: handlePageChange,
                  }
                }
              />
            ) : (
              <ResourceList
                resources={data?.resources || []}
                loading={isLoading}
                onResourceClick={handleResourceClick}
                onToggleFavorite={handleToggleFavorite}
                onDelete={handleDeleteResource}
                onViewersClick={(id) => {
                  const r = data?.resources?.find(x => x.id === id);
                  handleViewersClick(id, r?.title || '');
                }}
                canDelete={isAdmin || (activeTab === 'my' && isTeacherOrAdmin)}
                showAssignmentInfo={activeTab === 'assigned'}
                pagination={
                  data && {
                    current: data.page,
                    total: data.total,
                    pageSize: filters.limit || 20,
                    onChange: handlePageChange,
                  }
                }
              />
            )}
          </Col>
        </Row>
      )}

      {/* Resource Viewer Modal */}
      {selectedResource && (
        <ResourceViewer
          resourceId={selectedResource}
          visible={!!selectedResource}
          onClose={() => setSelectedResource(null)}
          canEdit={
            isTeacherOrAdmin &&
            data?.resources?.find((r) => r.id === selectedResource)?.authorId === user?.id
          }
        />
      )}

      {/* Viewers Modal */}
      <Modal
        title={viewersResourceTitle ? `Visto por — ${viewersResourceTitle}` : 'Quién ha visto este recurso'}
        open={viewersModalOpen}
        onCancel={() => setViewersModalOpen(false)}
        footer={null}
        width={480}
        centered
      >
        {viewersLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin tip="Cargando..." />
          </div>
        ) : viewersList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#999' }}>
            Nadie ha visto este recurso todavía
          </div>
        ) : (
          <List
            dataSource={viewersList}
            renderItem={(viewer) => {
              const name = [viewer.firstName, viewer.lastName].filter(Boolean).join(' ') || viewer.email || 'Usuario';
              const initials = name.slice(0, 2).toUpperCase();
              const date = new Date(viewer.viewedAt);
              const now = new Date();
              const hoursAgo = (now.getTime() - date.getTime()) / 3600000;
              const timeStr = hoursAgo < 24
                ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
              const count = viewer.viewCount ?? 1;
              return (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />}>{initials}</Avatar>}
                    title={name}
                    description={`Última vez: ${timeStr} · ${count} ${count === 1 ? 'vez' : 'veces'}`}
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Modal>

      {/* Resource Uploader Modal */}
      {showUploader && (
        <ResourceUploader
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUploader(false)}
          showAuthorField={false}
        />
      )}
    </motion.div>
  );
};

export default EducationalResourcesPage;