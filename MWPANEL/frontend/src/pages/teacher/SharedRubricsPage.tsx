import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Typography,
  Tag,
  Modal,
  message,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Empty,
  Tooltip,
  Alert,
  Badge,
  Drawer,
  Avatar,
} from 'antd';
import {
  EyeOutlined,
  CopyOutlined,
  ImportOutlined,
  SearchOutlined,
  FilterOutlined,
  TeamOutlined,
  UserOutlined,
  BookOutlined,
  ShareAltOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Rubric, useRubrics } from '../../hooks/useRubrics';
import RubricGrid from '../../components/rubrics/RubricGrid';
import RubricEditor from '../../components/rubrics/RubricEditor';
import { useResponsive } from '../../hooks/useResponsive';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

interface SharedRubricsPageProps {}

interface SharedRubric extends Rubric {
  sharedByTeacher?: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  sharedAt?: string;
}

const SharedRubricsPage: React.FC<SharedRubricsPageProps> = () => {
  const { isMobile, isTablet } = useResponsive();
  const {
    loading,
    error,
    createRubric,
    fetchRubrics,
    fetchSharedWithMe
  } = useRubrics();

  const [sharedRubrics, setSharedRubrics] = useState<SharedRubric[]>([]);
  const [filteredRubrics, setFilteredRubrics] = useState<SharedRubric[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [subjectAssignments, setSubjectAssignments] = useState<Array<{ id: string; subject: { name: string; code: string } }>>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Modals
  const [viewerVisible, setViewerVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [confirmCopyVisible, setConfirmCopyVisible] = useState(false);
  
  // Estados de edición
  const [viewingRubric, setViewingRubric] = useState<SharedRubric | null>(null);
  const [copyingRubric, setCopyingRubric] = useState<SharedRubric | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  // Cargar rúbricas compartidas al montar el componente
  useEffect(() => {
    loadSharedRubrics();
    fetchCurrentTeacherId();
    fetchSubjectAssignments();
  }, []);

  // Obtener ID del profesor actual
  const fetchCurrentTeacherId = async () => {
    try {
      // Get current user info first to find teacher ID
      const userResponse = await apiClient.get('/auth/me');
      const currentUser = userResponse.data;
      
      // If not a teacher or admin, show error
      if (currentUser.role !== 'teacher' && currentUser.role !== 'admin') {
        console.error('Acceso denegado: Solo profesores y administradores pueden acceder a este panel');
        return;
      }
      
      // Find teacher by user ID (same approach as TeacherDashboard)
      const teachersResponse = await apiClient.get('/teachers');
      const teachers = teachersResponse.data;
      
      const currentTeacher = teachers.find((teacher: any) => teacher.user?.id === currentUser?.id);
      
      if (currentTeacher && currentTeacher.id) {
        setCurrentTeacherId(currentTeacher.id);
      } else {
        console.error('No se encontró el perfil de profesor para este usuario');
      }
    } catch (error) {
      console.error('Error al obtener ID del profesor:', error);
    }
  };

  // Obtener asignaturas del profesor
  const fetchSubjectAssignments = async () => {
    try {
      const response = await apiClient.get('/activities/teacher/subject-assignments');
      setSubjectAssignments(response.data);
    } catch (error: any) {
      console.error('Error fetching subject assignments:', error);
    }
  };

  // Obtener rúbricas compartidas conmigo usando el hook
  const loadSharedRubrics = async () => {
    try {
      const rubrics = await fetchSharedWithMe();
      console.log('SharedRubricsPage - Received rubrics:', rubrics);
      setSharedRubrics(rubrics);
    } catch (err: any) {
      console.error('Error loading shared rubrics:', err);
      // El hook ya maneja el mensaje de error
    }
  };

  // Filtrar rúbricas
  useEffect(() => {
    let filtered = [...sharedRubrics];

    // Filtro por texto
    if (searchText) {
      filtered = filtered.filter(rubric =>
        rubric.name.toLowerCase().includes(searchText.toLowerCase()) ||
        rubric.description?.toLowerCase().includes(searchText.toLowerCase()) ||
        rubric.sharedByTeacher?.user?.profile?.firstName?.toLowerCase().includes(searchText.toLowerCase()) ||
        rubric.sharedByTeacher?.user?.profile?.lastName?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(rubric => rubric.status === statusFilter);
    }

    // Filtro por asignatura (buscar en subjectAssignmentId)
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(rubric => rubric.subjectAssignmentId === subjectFilter);
    }

    setFilteredRubrics(filtered);
  }, [sharedRubrics, searchText, statusFilter, subjectFilter]);

  // Estadísticas
  const stats = {
    total: sharedRubrics.length,
    active: sharedRubrics.filter(r => r.status === 'active').length,
    bySubjects: sharedRubrics.reduce((acc, rubric) => {
      const subjectId = rubric.subjectAssignmentId;
      if (subjectId) {
        acc[subjectId] = (acc[subjectId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
    uniqueTeachers: new Set(sharedRubrics.map(r => r.sharedByTeacher?.id)).size,
  };

  // Ver rúbrica
  const handleViewRubric = (rubric: SharedRubric) => {
    setViewingRubric(rubric);
    setViewerVisible(true);
  };

  // Preparar para copiar rúbrica
  const handleCopyRubric = (rubric: SharedRubric) => {
    setCopyingRubric(rubric);
    setConfirmCopyVisible(true);
  };

  // Confirmar y crear copia de la rúbrica
  const handleConfirmCopy = async () => {
    if (!copyingRubric) return;

    try {
      const copyData = {
        name: `${copyingRubric.name} (Mi Copia)`,
        description: copyingRubric.description ? `${copyingRubric.description}\n\n[Copiado de: ${copyingRubric.sharedByTeacher?.user.profile.firstName} ${copyingRubric.sharedByTeacher?.user.profile.lastName}]` : `Copiado de: ${copyingRubric.sharedByTeacher?.user.profile.firstName} ${copyingRubric.sharedByTeacher?.user.profile.lastName}`,
        isTemplate: false,
        isVisibleToFamilies: copyingRubric.isVisibleToFamilies,
        maxScore: copyingRubric.maxScore,
        criteria: copyingRubric.criteria.map(criterion => ({
          name: criterion.name,
          description: criterion.description,
          order: criterion.order,
          weight: criterion.weight
        })),
        levels: copyingRubric.levels.map(level => ({
          name: level.name,
          description: level.description,
          order: level.order,
          scoreValue: level.scoreValue,
          color: level.color
        })),
        cells: copyingRubric.cells.map(cell => ({
          content: cell.content,
          criterionId: cell.criterionId,
          levelId: cell.levelId
        }))
      };

      const newRubric = await createRubric(copyData);
      if (newRubric) {
        message.success('Rúbrica copiada exitosamente a tu cuaderno');
        setConfirmCopyVisible(false);
        setCopyingRubric(null);
        
        // Refrescar las rúbricas propias
        fetchRubrics(true);
      }
    } catch (error) {
      console.error('Error copying rubric:', error);
      message.error('Error al copiar la rúbrica');
    }
  };

  // Abrir editor para personalizar copia
  const handleCustomizeCopy = () => {
    if (!copyingRubric) return;

    const customizedRubric = {
      ...copyingRubric,
      name: `${copyingRubric.name} (Mi Versión)`,
      description: copyingRubric.description ? `${copyingRubric.description}\n\n[Basado en rúbrica de: ${copyingRubric.sharedByTeacher?.user.profile.firstName} ${copyingRubric.sharedByTeacher?.user.profile.lastName}]` : `Basado en rúbrica de: ${copyingRubric.sharedByTeacher?.user.profile.firstName} ${copyingRubric.sharedByTeacher?.user.profile.lastName}`,
      status: 'draft' as const,
      isTemplate: false
    };

    setConfirmCopyVisible(false);
    setCopyingRubric(customizedRubric);
    setEditorVisible(true);
  };

  // Éxito en operaciones
  const handleOperationSuccess = (rubric: Rubric) => {
    fetchRubrics(true);
    setEditorVisible(false);
    setCopyingRubric(null);
  };

  // Obtener nombre de asignatura por ID
  const getSubjectName = (subjectAssignmentId?: string) => {
    if (!subjectAssignmentId) return 'Sin asignatura';
    const assignment = subjectAssignments.find(a => a.id === subjectAssignmentId);
    return assignment ? `${assignment.subject.code} - ${assignment.subject.name}` : 'Asignatura desconocida';
  };

  // Número de filtros activos
  const activeFiltersCount = [
    statusFilter !== 'all',
    subjectFilter !== 'all',
    searchText !== ''
  ].filter(Boolean).length;

  // Limpiar filtros
  const clearFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setSubjectFilter('all');
  };

  // Columnas móviles
  const mobileColumns: ColumnsType<SharedRubric> = [
    {
      title: 'Rúbrica',
      key: 'mobile',
      render: (_, rubric: SharedRubric) => {
        const statusConfig = {
          draft: { color: 'orange', text: 'Borrador', icon: <ClockCircleOutlined /> },
          active: { color: 'green', text: 'Activo', icon: <CheckCircleOutlined /> },
          archived: { color: 'gray', text: 'Archivado', icon: <FileTextOutlined /> }
        };
        const config = statusConfig[rubric.status as keyof typeof statusConfig];

        return (
          <div className="py-2">
            {/* Header con nombre */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <Text
                  strong
                  style={{ fontSize: '13px', cursor: 'pointer' }}
                  className="block truncate"
                  onClick={() => handleViewRubric(rubric)}
                >
                  {rubric.name}
                </Text>
                {rubric.description && (
                  <Text type="secondary" style={{ fontSize: '11px' }} className="block truncate">
                    {rubric.description}
                  </Text>
                )}
              </div>
              <Tag color={config.color} className="ml-2 text-xs flex-shrink-0">
                {config.text}
              </Tag>
            </div>

            {/* Autor */}
            <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
              <Avatar size="small" icon={<UserOutlined />} className="bg-cyan-100 text-cyan-600" />
              <span>
                {rubric.sharedByTeacher?.user.profile.firstName} {rubric.sharedByTeacher?.user.profile.lastName}
              </span>
            </div>

            {/* Tags de estructura */}
            <div className="flex flex-wrap gap-1 mb-2">
              <Tag color="blue" style={{ fontSize: '10px', margin: 0, padding: '0 4px' }}>
                {rubric.criteriaCount}C
              </Tag>
              <Tag color="purple" style={{ fontSize: '10px', margin: 0, padding: '0 4px' }}>
                {rubric.levelsCount}N
              </Tag>
              <Tag color="orange" style={{ fontSize: '10px', margin: 0, padding: '0 4px' }}>
                {rubric.maxScore}pts
              </Tag>
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-2 border-t border-gray-100">
              <Button
                size="small"
                type="primary"
                ghost
                icon={<EyeOutlined />}
                onClick={() => handleViewRubric(rubric)}
              >
                Ver
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => handleCopyRubric(rubric)}
              >
                Copiar
              </Button>
            </div>
          </div>
        );
      }
    }
  ];

  // Columnas desktop
  const desktopColumns: ColumnsType<SharedRubric> = [
    {
      title: 'Rúbrica',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, rubric: SharedRubric) => (
        <Space direction="vertical" size="small">
          <Space>
            <Text strong style={{ cursor: 'pointer' }} onClick={() => handleViewRubric(rubric)}>
              {name}
            </Text>
            <Tag color="cyan" icon={<ShareAltOutlined />}>
              Compartida
            </Tag>
          </Space>
          {rubric.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {rubric.description.length > 100
                ? `${rubric.description.substring(0, 100)}...`
                : rubric.description
              }
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Compartida por',
      key: 'sharedBy',
      width: 180,
      render: (_, rubric: SharedRubric) => (
        <div className="flex items-center gap-2">
          <Avatar size="small" icon={<UserOutlined />} className="bg-cyan-100 text-cyan-600 flex-shrink-0" />
          <div className="min-w-0">
            <Text className="block truncate text-sm">
              {rubric.sharedByTeacher?.user.profile.firstName} {rubric.sharedByTeacher?.user.profile.lastName}
            </Text>
            {rubric.sharedAt && (
              <Text type="secondary" style={{ fontSize: '11px' }}>
                {new Date(rubric.sharedAt).toLocaleDateString()}
              </Text>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      filters: [
        { text: 'Activo', value: 'active' },
        { text: 'Borrador', value: 'draft' },
        { text: 'Archivado', value: 'archived' }
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const statusConfig = {
          draft: { color: 'orange', text: 'Borrador', icon: <ClockCircleOutlined /> },
          active: { color: 'green', text: 'Activo', icon: <CheckCircleOutlined /> },
          archived: { color: 'gray', text: 'Archivado', icon: <FileTextOutlined /> }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
      }
    },
    {
      title: 'Estructura',
      key: 'structure',
      width: 150,
      render: (_, rubric: SharedRubric) => (
        <Space>
          <Tag color="blue">{rubric.criteriaCount}C</Tag>
          <Tag color="purple">{rubric.levelsCount}N</Tag>
          <Tag color="orange">{rubric.maxScore}pts</Tag>
        </Space>
      )
    },
    {
      title: 'Asignatura',
      key: 'subject',
      width: 140,
      render: (_, rubric: SharedRubric) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {getSubjectName(rubric.subjectAssignmentId)}
        </Text>
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_, rubric: SharedRubric) => (
        <Space>
          <Tooltip title="Ver rúbrica">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewRubric(rubric)}
            />
          </Tooltip>
          <Tooltip title="Copiar a mi cuaderno">
            <Button
              type="primary"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyRubric(rubric)}
            >
              Copiar
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

  return (
    <div className={isMobile ? 'p-3' : 'p-6'} style={{ maxWidth: '100%', overflow: 'hidden' }}>
      <div className="mb-4">
        {/* Header */}
        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'} mb-4`}>
          <div className="flex items-center gap-3">
            <div
              className={`${isMobile ? 'w-9 h-9' : 'w-10 h-10'} rounded-xl flex items-center justify-center shadow-md`}
              style={{ background: 'linear-gradient(135deg, #13c2c2 0%, #1890ff 100%)' }}
            >
              <ShareAltOutlined className="text-white text-lg" />
            </div>
            <div>
              <Title level={isMobile ? 5 : 3} style={{ margin: 0 }}>
                Rúbricas Compartidas
              </Title>
              {!isMobile && (
                <Text type="secondary" className="text-sm">
                  Rúbricas que otros profesores han compartido contigo
                </Text>
              )}
            </div>
          </div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => window.location.href = '/teacher/rubrics'}
            className={isMobile ? 'w-full' : ''}
          >
            {isMobile ? 'Mis Rúbricas' : 'Ir a Mis Rúbricas'}
          </Button>
        </div>

        {/* Alert informativo - más compacto en móvil */}
        <Alert
          message={isMobile ? "Rúbricas de colegas" : "Rúbricas compartidas por colegas"}
          description={isMobile
            ? "Copia y personaliza rúbricas de otros profesores."
            : "Aquí puedes ver las rúbricas que otros profesores han compartido contigo. Puedes copiarlas a tu cuaderno de rúbricas y personalizarlas según tus necesidades."
          }
          type="info"
          showIcon
          className="mb-4"
        />

        {/* Estadísticas - Grid responsivo con colores mejorados */}
        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-3 mb-4`}>
          <Card
            size="small"
            className="border-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}
          >
            <Statistic
              title={<span className="text-gray-600 text-xs">Total</span>}
              value={stats.total}
              prefix={<ShareAltOutlined className="text-gray-500" />}
              valueStyle={{ fontSize: isMobile ? '20px' : '24px' }}
            />
          </Card>
          <Card
            size="small"
            className="border-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%)' }}
          >
            <Statistic
              title={<span className="text-green-700 text-xs">Activas</span>}
              value={stats.active}
              prefix={<CheckCircleOutlined className="text-green-600" />}
              valueStyle={{ color: '#389e0d', fontSize: isMobile ? '20px' : '24px' }}
            />
          </Card>
          <Card
            size="small"
            className="border-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' }}
          >
            <Statistic
              title={<span className="text-blue-700 text-xs">Profesores</span>}
              value={stats.uniqueTeachers}
              prefix={<TeamOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff', fontSize: isMobile ? '20px' : '24px' }}
            />
          </Card>
          <Card
            size="small"
            className="border-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' }}
          >
            <Statistic
              title={<span className="text-purple-700 text-xs">Asignaturas</span>}
              value={Object.keys(stats.bySubjects).length}
              prefix={<BookOutlined className="text-purple-500" />}
              valueStyle={{ color: '#722ed1', fontSize: isMobile ? '20px' : '24px' }}
            />
          </Card>
        </div>

        {/* Filtros - Responsivos */}
        <Card size="small" className="mb-4 shadow-sm">
          {isMobile ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Search
                  placeholder="Buscar..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  className="flex-1"
                />
                <Badge count={activeFiltersCount} size="small">
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => setShowFilters(!showFilters)}
                    type={showFilters ? 'primary' : 'default'}
                  />
                </Badge>
              </div>

              {showFilters && (
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <Select
                    placeholder="Estado"
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: '100%' }}
                  >
                    <Option value="all">Todos los estados</Option>
                    <Option value="draft">Borrador</Option>
                    <Option value="active">Activo</Option>
                    <Option value="archived">Archivado</Option>
                  </Select>
                  <Select
                    placeholder="Asignatura"
                    value={subjectFilter}
                    onChange={setSubjectFilter}
                    style={{ width: '100%' }}
                    showSearch
                    optionFilterProp="children"
                  >
                    <Option value="all">Todas las asignaturas</Option>
                    {subjectAssignments.map(assignment => (
                      <Option key={assignment.id} value={assignment.id}>
                        {assignment.subject.code} - {assignment.subject.name}
                      </Option>
                    ))}
                  </Select>
                  {activeFiltersCount > 0 && (
                    <Button
                      size="small"
                      onClick={clearFilters}
                      icon={<ReloadOutlined />}
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Search
                placeholder="Buscar rúbricas o profesores..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: 280 }}
              />
              <Select
                placeholder="Estado"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 160 }}
              >
                <Option value="all">Todos los estados</Option>
                <Option value="draft">Borrador</Option>
                <Option value="active">Activo</Option>
                <Option value="archived">Archivado</Option>
              </Select>
              <Select
                placeholder="Asignatura"
                value={subjectFilter}
                onChange={setSubjectFilter}
                style={{ width: 200 }}
                showSearch
                optionFilterProp="children"
              >
                <Option value="all">Todas las asignaturas</Option>
                {subjectAssignments.map(assignment => (
                  <Option key={assignment.id} value={assignment.id}>
                    {assignment.subject.code} - {assignment.subject.name}
                  </Option>
                ))}
              </Select>
              {activeFiltersCount > 0 && (
                <Button
                  size="small"
                  onClick={clearFilters}
                  icon={<ReloadOutlined />}
                >
                  Limpiar
                </Button>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Tabla de rúbricas compartidas */}
      <Card className="shadow-sm">
        {error ? (
          <div className="text-center py-10">
            <Text type="danger" className="block mb-4">Error al cargar las rúbricas compartidas: {error}</Text>
            <Button onClick={loadSharedRubrics} icon={<ReloadOutlined />}>
              Reintentar
            </Button>
          </div>
        ) : filteredRubrics.length === 0 && !loading ? (
          <Empty
            description={
              <span className="text-gray-500">
                {activeFiltersCount > 0
                  ? "No se encontraron rúbricas con los filtros aplicados"
                  : "No hay rúbricas compartidas contigo"}
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {activeFiltersCount > 0 ? (
              <Button onClick={clearFilters} icon={<ReloadOutlined />}>
                Limpiar filtros
              </Button>
            ) : (
              <Text type="secondary" className="block mt-2">
                Cuando otros profesores compartan rúbricas contigo, aparecerán aquí.
              </Text>
            )}
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredRubrics}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: isMobile ? 5 : 10,
              showSizeChanger: !isMobile,
              showQuickJumper: !isMobile,
              showTotal: isMobile
                ? undefined
                : (total, range) => `${range[0]}-${range[1]} de ${total} rúbricas`,
              size: isMobile ? 'small' : 'default'
            }}
            size={isMobile ? 'small' : 'middle'}
            scroll={isMobile ? { x: true } : undefined}
          />
        )}
      </Card>

      {/* Modal/Drawer para ver rúbrica */}
      {isMobile ? (
        <Drawer
          title={
            <div className="flex items-center gap-2">
              <EyeOutlined />
              <span className="truncate">{viewingRubric?.name}</span>
            </div>
          }
          open={viewerVisible}
          onClose={() => setViewerVisible(false)}
          placement="bottom"
          height="90vh"
          styles={{ body: { padding: 12 } }}
          footer={
            <div className="flex gap-2">
              <Button block onClick={() => setViewerVisible(false)}>
                Cerrar
              </Button>
              <Button
                block
                type="primary"
                icon={<CopyOutlined />}
                onClick={() => {
                  if (viewingRubric) {
                    setViewerVisible(false);
                    handleCopyRubric(viewingRubric);
                  }
                }}
              >
                Copiar
              </Button>
            </div>
          }
        >
          {viewingRubric && (
            <div>
              <Tag color="cyan" className="mb-3">
                Compartida por {viewingRubric?.sharedByTeacher?.user.profile.firstName} {viewingRubric?.sharedByTeacher?.user.profile.lastName}
              </Tag>
              <div className="overflow-auto">
                <RubricGrid
                  rubric={viewingRubric}
                  editable={false}
                  viewMode="view"
                />
              </div>
            </div>
          )}
        </Drawer>
      ) : (
        <Modal
          title={
            <Space>
              <EyeOutlined />
              <span>{viewingRubric?.name}</span>
              <Tag color="cyan">Compartida por {viewingRubric?.sharedByTeacher?.user.profile.firstName} {viewingRubric?.sharedByTeacher?.user.profile.lastName}</Tag>
            </Space>
          }
          open={viewerVisible}
          onCancel={() => setViewerVisible(false)}
          width={isTablet ? '95%' : 1200}
          centered
          footer={[
            <Button key="close" onClick={() => setViewerVisible(false)}>
              Cerrar
            </Button>,
            <Button
              key="copy"
              type="primary"
              icon={<CopyOutlined />}
              onClick={() => {
                if (viewingRubric) {
                  setViewerVisible(false);
                  handleCopyRubric(viewingRubric);
                }
              }}
            >
              Copiar a Mi Cuaderno
            </Button>
          ]}
        >
          {viewingRubric && (
            <RubricGrid
              rubric={viewingRubric}
              editable={false}
              viewMode="view"
            />
          )}
        </Modal>
      )}

      {/* Modal de confirmación para copiar */}
      <Modal
        title="Copiar Rúbrica"
        open={confirmCopyVisible}
        onCancel={() => setConfirmCopyVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmCopyVisible(false)}>
            Cancelar
          </Button>,
          <Button key="copy" type="primary" onClick={handleConfirmCopy}>
            Copiar Tal Como Está
          </Button>,
          <Button key="customize" type="primary" onClick={handleCustomizeCopy}>
            Copiar y Personalizar
          </Button>
        ]}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>¿Cómo quieres copiar esta rúbrica?</Title>
            <Text type="secondary">
              Puedes copiar la rúbrica tal como está o personalizarla antes de añadirla a tu cuaderno.
            </Text>
          </div>
          
          {copyingRubric && (
            <Card size="small" style={{ backgroundColor: '#f9f9f9' }}>
              <Space direction="vertical" size="small">
                <Text strong>{copyingRubric.name}</Text>
                <Text type="secondary">
                  Compartida por: {copyingRubric.sharedByTeacher?.user.profile.firstName} {copyingRubric.sharedByTeacher?.user.profile.lastName}
                </Text>
                <Space>
                  <Tag color="blue">{copyingRubric.criteriaCount} criterios</Tag>
                  <Tag color="purple">{copyingRubric.levelsCount} niveles</Tag>
                  <Tag color="orange">Máx: {copyingRubric.maxScore} pts</Tag>
                </Space>
              </Space>
            </Card>
          )}

          <div>
            <Title level={5}>Opciones:</Title>
            <ul style={{ paddingLeft: '20px' }}>
              <li><Text strong>Copiar tal como está:</Text> Se añadirá la rúbrica exacta a tu cuaderno con el nombre "(Mi Copia)"</li>
              <li><Text strong>Copiar y personalizar:</Text> Podrás modificar criterios, niveles y descripción antes de guardar</li>
            </ul>
          </div>
        </Space>
      </Modal>

      {/* Editor para personalizar copia */}
      <RubricEditor
        visible={editorVisible}
        onCancel={() => {
          setEditorVisible(false);
          setCopyingRubric(null);
        }}
        onSuccess={handleOperationSuccess}
        editingRubric={copyingRubric}
        subjectAssignments={subjectAssignments}
      />
    </div>
  );
};

export default SharedRubricsPage;