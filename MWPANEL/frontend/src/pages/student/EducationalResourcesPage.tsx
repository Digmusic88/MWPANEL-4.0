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
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import ResourceGrid from '@components/recursos/ResourceGrid';
import ResourceList from '@components/recursos/ResourceList';
import ResourceFolderView from '@components/recursos/ResourceFolderView';
import ResourceFilters from '@components/recursos/ResourceFilters';
import ResourceViewer from '@components/recursos/ResourceViewer';
import ResourceUploader from '@components/recursos/ResourceUploader';
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
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'public' | 'assigned'>('all');
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined);

  // Fetch resources
  const { data, isLoading, error } = useQuery({
    queryKey: ['resources', filters, activeTab, selectedYearId],
    queryFn: async () => {
      let queryFilters = { ...filters, academicYearId: selectedYearId };

      // For students, ALWAYS show only assigned resources regardless of tab
      if (user?.role === 'student') {
        const assignedResources = await educationalResourcesService.getAssignedResources(selectedYearId);
        return {
          resources: assignedResources,
          total: assignedResources.length,
          page: 1,
          totalPages: 1,
        };
      }

      // For teachers and admins, use normal logic
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

  const handleResourcesUpdate = () => {
    // Invalidar query para refrescar datos sin reload
    queryClient.invalidateQueries({ queryKey: ['resources'] });
  };

  const handleUploadSuccess = () => {
    setShowUploader(false);
    queryClient.invalidateQueries({ queryKey: ['resources'] });
    message.success('Recurso subido exitosamente');
  };

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  // Calculate statistics
  const resources = Array.isArray(data?.resources) ? data.resources : []
  const stats = {
    total: data?.total || 0,
    pdf: resources.filter(r => r.type === 'PDF').length || 0,
    video: resources.filter(r => r.type === 'VIDEO').length || 0,
    image: resources.filter(r => r.type === 'IMAGE').length || 0,
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
            <Title level={2}>
              {user?.role === 'student' ? 'Mis Recursos Asignados' : 'Recursos Educativos'}
            </Title>
            {user?.role === 'student' && (
              <p className="text-gray-600">
                Aquí puedes acceder únicamente a los recursos que tus profesores han compartido contigo.
              </p>
            )}
          </Col>
          <Col>
            <Space>
              <AcademicYearSelector value={selectedYearId} onChange={setSelectedYearId} />
              <Button.Group>
                <Button
                  icon={<FolderOutlined />}
                  type={viewMode === 'folders' ? 'primary' : 'default'}
                  onClick={() => setViewMode('folders')}
                  title="Vista de carpetas por asignatura"
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

      {/* Show simplified tabs for students */}
      {user?.role === 'student' ? (
        <Tabs
          activeKey="assigned"
          className="mb-4"
        >
          <TabPane 
            tab={
              <Badge
                count={data?.total || 0}
                showZero={false}
              >
                <span>Mis Recursos Asignados</span>
              </Badge>
            }
            key="assigned" 
          />
        </Tabs>
      ) : (
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
        </Tabs>
      )}

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
              onResourcesUpdate={handleResourcesUpdate}
              showAssignmentInfo={user?.role === 'student' || activeTab === 'assigned'}
              hideEmptyFolders={user?.role === 'student'} // Estudiantes no ven carpetas vacías
            />
          ) : viewMode === 'grid' ? (
            <ResourceGrid
              resources={data?.resources || []}
              loading={isLoading}
              onResourceClick={handleResourceClick}
              onToggleFavorite={handleToggleFavorite}
              showAssignmentInfo={user?.role === 'student' || activeTab === 'assigned'}
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
              showAssignmentInfo={user?.role === 'student' || activeTab === 'assigned'}
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

      {/* Resource Viewer Modal */}
      {selectedResource && (
        <ResourceViewer
          resourceId={selectedResource}
          visible={!!selectedResource}
          onClose={() => setSelectedResource(null)}
          canEdit={
            isTeacherOrAdmin &&
            data?.resources.find((r) => r.id === selectedResource)?.authorId === user?.id
          }
        />
      )}

      {/* Resource Uploader Modal */}
      {showUploader && (
        <ResourceUploader
          onSuccess={handleUploadSuccess}
          onCancel={() => setShowUploader(false)}
        />
      )}
    </motion.div>
  );
};

export default EducationalResourcesPage;