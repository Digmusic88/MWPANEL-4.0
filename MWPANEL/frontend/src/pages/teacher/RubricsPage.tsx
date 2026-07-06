import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Typography,
  Tag,
  Dropdown,
  Modal,
  message,
  Input,
  Select,
  Row,
  Col,
  Statistic,
  Empty,
  Tooltip,
  Drawer,
  Badge,
  Collapse,
  Segmented,
} from 'antd';
import {
  PlusOutlined,
  ImportOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CopyOutlined,
  ShareAltOutlined,
  MoreOutlined,
  SearchOutlined,
  FilterOutlined,
  PercentageOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Rubric, useRubrics } from '../../hooks/useRubrics';
import RubricEditor from '../../components/rubrics/RubricEditor';
import RubricImporter from '../../components/rubrics/RubricImporter';
import RubricGrid from '../../components/rubrics/RubricGrid';
import RubricSharingModal from '../../components/rubrics/RubricSharingModal';
import RubricWeightEditor from '../../components/rubrics/RubricWeightEditor';
import { useResponsive } from '../../hooks/useResponsive';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { Panel } = Collapse;

interface RubricsPageProps {}

const RubricsPage: React.FC<RubricsPageProps> = () => {
  const { isMobile, isTablet } = useResponsive();
  const {
    rubrics,
    loading,
    error,
    fetchRubrics,
    deleteRubric,
    publishRubric,
    updateRubric
  } = useRubrics();

  const [filteredRubrics, setFilteredRubrics] = useState<Rubric[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [subjectAssignments, setSubjectAssignments] = useState<Array<{ id: string; subject: { name: string; code: string } }>>([]);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [showFilters, setShowFilters] = useState(false);
  
  // Modals
  const [editorVisible, setEditorVisible] = useState(false);
  const [importerVisible, setImporterVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [sharingVisible, setSharingVisible] = useState(false);
  const [weightEditorVisible, setWeightEditorVisible] = useState(false);
  
  // Estados de edición
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [viewingRubric, setViewingRubric] = useState<Rubric | null>(null);
  const [sharingRubric, setSharingRubric] = useState<Rubric | null>(null);
  const [weightEditingRubric, setWeightEditingRubric] = useState<Rubric | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  // Cargar rúbricas al montar el componente
  useEffect(() => {
    fetchRubrics(true); // Incluir templates
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

  // Filtrar rúbricas
  useEffect(() => {
    let filtered = [...rubrics];

    // Filtro por texto
    if (searchText) {
      filtered = filtered.filter(rubric =>
        rubric.name.toLowerCase().includes(searchText.toLowerCase()) ||
        rubric.description?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(rubric => rubric.status === statusFilter);
    }

    // Filtro por template
    if (templateFilter !== 'all') {
      const isTemplate = templateFilter === 'template';
      filtered = filtered.filter(rubric => rubric.isTemplate === isTemplate);
    }

    setFilteredRubrics(filtered);
  }, [rubrics, searchText, statusFilter, templateFilter]);

  // Estadísticas
  const stats = {
    total: rubrics.length,
    active: rubrics.filter(r => r.status === 'active').length,
    drafts: rubrics.filter(r => r.status === 'draft').length,
    templates: rubrics.filter(r => r.isTemplate).length,
  };

  // Crear nueva rúbrica
  const handleNewRubric = () => {
    setEditingRubric(null);
    setEditorVisible(true);
  };

  // Importar rúbrica
  const handleImportRubric = () => {
    setImporterVisible(true);
  };

  // Editar rúbrica
  const handleEditRubric = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setEditorVisible(true);
  };

  // Ver rúbrica
  const handleViewRubric = (rubric: Rubric) => {
    setViewingRubric(rubric);
    setViewerVisible(true);
  };

  // Duplicar rúbrica
  const handleDuplicateRubric = async (rubric: Rubric) => {
    const duplicatedRubric = {
      ...rubric,
      name: `${rubric.name} (Copia)`,
      status: 'draft' as const,
      isTemplate: false
    };
    
    setEditingRubric(duplicatedRubric);
    setEditorVisible(true);
  };

  // Publicar rúbrica
  const handlePublishRubric = async (rubric: Rubric) => {
    Modal.confirm({
      title: '¿Publicar rúbrica?',
      content: 'Al publicar la rúbrica estará disponible para usar en evaluaciones.',
      okText: 'Publicar',
      cancelText: 'Cancelar',
      onOk: async () => {
        await publishRubric(rubric.id);
      }
    });
  };

  // Eliminar rúbrica
  const handleDeleteRubric = async (rubric: Rubric) => {
    Modal.confirm({
      title: '¿Eliminar rúbrica?',
      content: `Esta acción eliminará permanentemente la rúbrica "${rubric.name}".`,
      okText: 'Eliminar',
      cancelText: 'Cancelar',
      okType: 'danger',
      onOk: async () => {
        await deleteRubric(rubric.id);
      }
    });
  };

  // Cambiar visibilidad para familias
  const handleToggleFamilyVisibility = async (rubric: Rubric) => {
    await updateRubric(rubric.id, {
      isVisibleToFamilies: !rubric.isVisibleToFamilies
    });
  };

  // Abrir modal de compartir
  const handleShareRubric = (rubric: Rubric) => {
    setSharingRubric(rubric);
    setSharingVisible(true);
  };

  // Cerrar modal de compartir
  const handleCloseSharingModal = () => {
    setSharingVisible(false);
    setSharingRubric(null);
    fetchRubrics(true); // Refrescar datos
  };

  // Abrir editor de pesos
  const handleEditWeights = (rubric: Rubric) => {
    setWeightEditingRubric(rubric);
    setWeightEditorVisible(true);
  };

  // Cerrar editor de pesos
  const handleCloseWeightEditor = () => {
    setWeightEditorVisible(false);
    setWeightEditingRubric(null);
    fetchRubrics(true); // Refrescar datos
  };

  // Éxito en operaciones
  const handleOperationSuccess = (rubric: Rubric) => {
    fetchRubrics(true);
    setEditorVisible(false);
    setImporterVisible(false);
  };

  // Menú de acciones para cada rúbrica
  const getActionMenu = (rubric: Rubric) => ({
    items: [
      {
        key: 'view',
        label: 'Ver Rúbrica',
        icon: <EyeOutlined />,
        onClick: () => handleViewRubric(rubric)
      },
      {
        key: 'edit',
        label: 'Editar',
        icon: <EditOutlined />,
        onClick: () => handleEditRubric(rubric)
      },
      {
        key: 'edit-weights',
        label: 'Editar Pesos',
        icon: <PercentageOutlined />,
        onClick: () => handleEditWeights(rubric),
        disabled: rubric.teacherId !== currentTeacherId
      },
      {
        key: 'duplicate',
        label: 'Duplicar',
        icon: <CopyOutlined />,
        onClick: () => handleDuplicateRubric(rubric)
      },
      {
        type: 'divider' as const
      },
      ...(rubric.status === 'draft' ? [{
        key: 'publish',
        label: 'Publicar',
        icon: <ShareAltOutlined />,
        onClick: () => handlePublishRubric(rubric)
      }] : []),
      ...(rubric.status === 'active' && rubric.teacherId === currentTeacherId ? [{
        key: 'share',
        label: 'Compartir con Colegas',
        icon: <ShareAltOutlined />,
        onClick: () => handleShareRubric(rubric)
      }] : []),
      {
        key: 'toggle-family',
        label: rubric.isVisibleToFamilies ? 'Ocultar de familias' : 'Mostrar a familias',
        onClick: () => handleToggleFamilyVisibility(rubric)
      },
      {
        type: 'divider' as const
      },
      {
        key: 'delete',
        label: 'Eliminar',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => handleDeleteRubric(rubric)
      }
    ]
  });

  // Columnas móviles - vista compacta de tarjeta
  const mobileColumns: ColumnsType<Rubric> = [
    {
      title: 'Rúbrica',
      key: 'mobile',
      render: (_, rubric: Rubric) => {
        const statusConfig = {
          draft: { color: 'orange', text: 'Borrador' },
          active: { color: 'green', text: 'Activo' },
          archived: { color: 'gray', text: 'Archivado' }
        };
        const config = statusConfig[rubric.status as keyof typeof statusConfig];

        return (
          <div className="py-2">
            {/* Header: Nombre y estado */}
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
              {rubric.teacherId !== currentTeacherId && (
                <Tag color="cyan" style={{ fontSize: '10px', margin: 0, padding: '0 4px' }}>
                  Compartida
                </Tag>
              )}
              {rubric.isTemplate && (
                <Tag color="cyan" style={{ fontSize: '10px', margin: 0, padding: '0 4px' }}>
                  Plantilla
                </Tag>
              )}
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
                icon={<EditOutlined />}
                onClick={() => handleEditRubric(rubric)}
              >
                Editar
              </Button>
              <Dropdown menu={getActionMenu(rubric)} trigger={['click']}>
                <Button size="small" icon={<MoreOutlined />} />
              </Dropdown>
            </div>
          </div>
        );
      }
    }
  ];

  // Columnas desktop - tabla completa
  const desktopColumns: ColumnsType<Rubric> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (name: string, rubric: Rubric) => (
        <Space direction="vertical" size="small">
          <Space>
            <Text strong style={{ cursor: 'pointer' }} onClick={() => handleViewRubric(rubric)}>
              {name}
            </Text>
            {rubric.teacherId !== currentTeacherId && (
              <Tag color="cyan">Compartida</Tag>
            )}
            {rubric.teacherId === currentTeacherId && rubric.sharedWith && rubric.sharedWith.length > 0 && (
              <Tag color="purple">
                Compartido ({rubric.sharedWith.length})
              </Tag>
            )}
          </Space>
          {rubric.description && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {rubric.description}
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: [
        { text: 'Borrador', value: 'draft' },
        { text: 'Activo', value: 'active' },
        { text: 'Archivado', value: 'archived' }
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const statusConfig = {
          draft: { color: 'orange', text: 'Borrador' },
          active: { color: 'green', text: 'Activo' },
          archived: { color: 'gray', text: 'Archivado' }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: 'Estructura',
      key: 'structure',
      width: 150,
      render: (_, rubric: Rubric) => (
        <Space>
          <Tag color="blue">{rubric.criteriaCount}C</Tag>
          <Tag color="purple">{rubric.levelsCount}N</Tag>
          <Tag color="orange">{rubric.maxScore}pts</Tag>
        </Space>
      )
    },
    {
      title: 'Tipo',
      key: 'type',
      width: 120,
      filters: [
        { text: 'Plantilla', value: true },
        { text: 'Rúbrica', value: false }
      ],
      onFilter: (value, record) => record.isTemplate === value,
      render: (_, rubric: Rubric) => (
        <Space direction="vertical" size="small">
          {rubric.isTemplate && <Tag color="cyan">Plantilla</Tag>}
          {rubric.isVisibleToFamilies && (
            <Tag color="green" style={{ fontSize: '10px' }}>
              Familias
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Modificado',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      sorter: (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_, rubric: Rubric) => (
        <Space>
          <Tooltip title="Ver rúbrica">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewRubric(rubric)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditRubric(rubric)}
            />
          </Tooltip>
          <Dropdown menu={getActionMenu(rubric)} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      )
    }
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

  // Número de filtros activos
  const activeFiltersCount = [
    statusFilter !== 'all',
    templateFilter !== 'all',
    searchText !== ''
  ].filter(Boolean).length;

  // Limpiar filtros
  const clearFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setTemplateFilter('all');
  };

  // Renderizar tarjeta de rúbrica para vista cards
  const renderRubricCard = (rubric: Rubric) => {
    const statusConfig = {
      draft: { color: 'orange', text: 'Borrador', icon: <ClockCircleOutlined /> },
      active: { color: 'green', text: 'Activo', icon: <CheckCircleOutlined /> },
      archived: { color: 'gray', text: 'Archivado', icon: <FileTextOutlined /> }
    };
    const config = statusConfig[rubric.status as keyof typeof statusConfig];

    return (
      <Card
        key={rubric.id}
        size="small"
        className="hover:shadow-md transition-shadow cursor-pointer"
        style={{ height: '100%' }}
        onClick={() => handleViewRubric(rubric)}
        actions={[
          <Tooltip title="Ver" key="view">
            <EyeOutlined onClick={(e) => { e.stopPropagation(); handleViewRubric(rubric); }} />
          </Tooltip>,
          <Tooltip title="Editar" key="edit">
            <EditOutlined onClick={(e) => { e.stopPropagation(); handleEditRubric(rubric); }} />
          </Tooltip>,
          <Dropdown menu={getActionMenu(rubric)} trigger={['click']} key="more">
            <MoreOutlined onClick={(e) => e.stopPropagation()} />
          </Dropdown>
        ]}
      >
        <div className="flex flex-col gap-2">
          {/* Header con nombre y estado */}
          <div className="flex items-start justify-between gap-2">
            <Text strong className="line-clamp-2" style={{ flex: 1 }}>
              {rubric.name}
            </Text>
            <Tag color={config.color} icon={config.icon} className="flex-shrink-0">
              {config.text}
            </Tag>
          </div>

          {/* Descripción */}
          {rubric.description && (
            <Text type="secondary" className="text-xs line-clamp-2">
              {rubric.description}
            </Text>
          )}

          {/* Tags de estructura */}
          <div className="flex flex-wrap gap-1 mt-1">
            <Tag color="blue" className="text-xs m-0">{rubric.criteriaCount} criterios</Tag>
            <Tag color="purple" className="text-xs m-0">{rubric.levelsCount} niveles</Tag>
            <Tag color="orange" className="text-xs m-0">{rubric.maxScore} pts</Tag>
          </div>

          {/* Indicadores adicionales */}
          <div className="flex flex-wrap gap-1">
            {rubric.teacherId !== currentTeacherId && (
              <Tag color="cyan" className="text-xs m-0">
                <TeamOutlined className="mr-1" />Compartida
              </Tag>
            )}
            {rubric.isTemplate && (
              <Tag color="geekblue" className="text-xs m-0">Plantilla</Tag>
            )}
            {rubric.isVisibleToFamilies && (
              <Tag color="lime" className="text-xs m-0">Familias</Tag>
            )}
          </div>
        </div>
      </Card>
    );
  };

  // Renderizar tarjeta móvil simplificada
  const renderMobileRubricCard = (rubric: Rubric) => {
    const statusConfig = {
      draft: { color: 'orange', text: 'Borrador' },
      active: { color: 'green', text: 'Activo' },
      archived: { color: 'default', text: 'Archivado' }
    };
    const config = statusConfig[rubric.status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <div
        key={rubric.id}
        className="bg-white rounded-lg border border-gray-200 p-3 mb-2"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        {/* Fila superior: Nombre y Estado */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => handleViewRubric(rubric)}
          >
            <Text strong style={{ fontSize: '14px', display: 'block' }} className="truncate">
              {rubric.name}
            </Text>
            {rubric.description && (
              <Text type="secondary" style={{ fontSize: '11px', display: 'block' }} className="truncate">
                {rubric.description}
              </Text>
            )}
          </div>
          <Tag color={config.color} style={{ margin: 0, fontSize: '10px', padding: '0 6px' }}>
            {config.text}
          </Tag>
        </div>

        {/* Fila de info: Criterios, Niveles, Puntos */}
        <div className="flex items-center gap-1 mb-2 flex-wrap">
          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
            {rubric.criteriaCount}C
          </span>
          <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
            {rubric.levelsCount}N
          </span>
          <span className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">
            {rubric.maxScore}pts
          </span>
          {rubric.teacherId !== currentTeacherId && (
            <span className="text-xs bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded">
              Compartida
            </span>
          )}
          {rubric.isTemplate && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              Plantilla
            </span>
          )}
        </div>

        {/* Fila de acciones */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Button
            size="small"
            type="primary"
            ghost
            onClick={() => handleViewRubric(rubric)}
            style={{ flex: 1, fontSize: '12px' }}
          >
            Ver
          </Button>
          <Button
            size="small"
            onClick={() => handleEditRubric(rubric)}
            style={{ flex: 1, fontSize: '12px' }}
          >
            Editar
          </Button>
          <Dropdown menu={getActionMenu(rubric)} trigger={['click']}>
            <Button size="small" icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      </div>
    );
  };

  // Vista móvil completa - diseño ultra compacto
  if (isMobile) {
    return (
      <div style={{ padding: '8px', background: '#f0f2f5', minHeight: '100vh' }}>
        {/* Header móvil */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <FileTextOutlined style={{ fontSize: '18px', color: '#667eea', marginRight: '8px' }} />
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Rúbricas</span>
            <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#888' }}>{stats.total} total</span>
          </div>

          {/* Botones de acción en fila */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleNewRubric}
              style={{ flex: 1 }}
            >
              Nueva
            </Button>
            <Button
              size="small"
              icon={<ImportOutlined />}
              onClick={handleImportRubric}
              style={{ flex: 1 }}
            >
              Importar
            </Button>
          </div>
        </div>

        {/* Búsqueda simple */}
        <div style={{ background: '#fff', borderRadius: '8px', padding: '8px', marginBottom: '8px' }}>
          <Input
            placeholder="Buscar rúbrica..."
            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            size="small"
          />
        </div>

        {/* Lista de rúbricas - diseño simple */}
        <div>
          {error ? (
            <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
              <Text type="danger">Error al cargar</Text>
              <br />
              <Button size="small" onClick={() => fetchRubrics(true)} style={{ marginTop: '8px' }}>
                Reintentar
              </Button>
            </div>
          ) : loading ? (
            <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
              <Text type="secondary">Cargando...</Text>
            </div>
          ) : filteredRubrics.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
              <Text type="secondary">{searchText ? 'Sin resultados' : 'Sin rúbricas'}</Text>
              <br />
              {!searchText && (
                <Button type="primary" size="small" onClick={handleNewRubric} style={{ marginTop: '8px' }}>
                  Crear primera
                </Button>
              )}
            </div>
          ) : (
            filteredRubrics.map((rubric) => {
              const statusColors: Record<string, string> = {
                draft: '#fa8c16',
                active: '#52c41a',
                archived: '#8c8c8c'
              };
              const statusLabels: Record<string, string> = {
                draft: 'Borrador',
                active: 'Activo',
                archived: 'Archivado'
              };

              return (
                <div
                  key={rubric.id}
                  style={{
                    background: '#fff',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    marginBottom: '6px',
                    borderLeft: `3px solid ${statusColors[rubric.status] || '#d9d9d9'}`
                  }}
                >
                  {/* Nombre y estado */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer'
                        }}
                        onClick={() => handleViewRubric(rubric)}
                      >
                        {rubric.name}
                      </div>
                      {rubric.description && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#888',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {rubric.description}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: statusColors[rubric.status] || '#d9d9d9',
                        color: '#fff',
                        marginLeft: '8px',
                        flexShrink: 0
                      }}
                    >
                      {statusLabels[rubric.status] || rubric.status}
                    </span>
                  </div>

                  {/* Info y acciones */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: '#666' }}>
                      <span>{rubric.criteriaCount}C</span>
                      <span>·</span>
                      <span>{rubric.levelsCount}N</span>
                      <span>·</span>
                      <span>{rubric.maxScore}pts</span>
                      {rubric.isTemplate && (
                        <>
                          <span>·</span>
                          <span style={{ color: '#1890ff' }}>Plantilla</span>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => handleViewRubric(rubric)}
                        style={{ padding: '0 6px' }}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleEditRubric(rubric)}
                        style={{ padding: '0 6px' }}
                      />
                      <Dropdown menu={getActionMenu(rubric)} trigger={['click']}>
                        <Button
                          type="text"
                          size="small"
                          icon={<MoreOutlined />}
                          style={{ padding: '0 6px' }}
                        />
                      </Dropdown>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modals para móvil - se renderizan desde aquí también */}
        <RubricEditor
          visible={editorVisible}
          onCancel={() => setEditorVisible(false)}
          onSuccess={handleOperationSuccess}
          editingRubric={editingRubric}
          subjectAssignments={subjectAssignments}
        />

        <RubricImporter
          visible={importerVisible}
          onClose={() => setImporterVisible(false)}
          onSuccess={handleOperationSuccess}
        />

        <Drawer
          title={viewingRubric?.name || 'Rúbrica'}
          open={viewerVisible}
          onClose={() => setViewerVisible(false)}
          placement="bottom"
          height="90vh"
          styles={{ body: { padding: 12, overflow: 'auto' } }}
          footer={
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button style={{ flex: 1 }} onClick={() => setViewerVisible(false)}>
                Cerrar
              </Button>
              <Button
                type="primary"
                style={{ flex: 1 }}
                icon={<EditOutlined />}
                onClick={() => {
                  if (viewingRubric) {
                    setViewerVisible(false);
                    handleEditRubric(viewingRubric);
                  }
                }}
              >
                Editar
              </Button>
            </div>
          }
        >
          {viewingRubric && (
            <RubricGrid rubric={viewingRubric} editable={false} viewMode="view" />
          )}
        </Drawer>

        <RubricSharingModal
          visible={sharingVisible}
          onCancel={handleCloseSharingModal}
          rubric={sharingRubric}
          currentTeacherId={currentTeacherId || ''}
        />

        <RubricWeightEditor
          visible={weightEditorVisible}
          onCancel={handleCloseWeightEditor}
          rubric={weightEditingRubric}
          onSuccess={handleCloseWeightEditor}
        />
      </div>
    );
  }

  // Vista desktop/tablet
  return (
    <div className="p-6" style={{ maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="mb-4">
        {/* Título y acciones principales */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <FileTextOutlined className="text-white text-lg" />
            </div>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Gestión de Rúbricas
              </Title>
              <Text type="secondary" className="text-sm">
                Crea y gestiona tus rúbricas de evaluación
              </Text>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleNewRubric}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              Nueva Rúbrica
            </Button>
            <Button
              icon={<ImportOutlined />}
              onClick={handleImportRubric}
            >
              Importar desde ChatGPT
            </Button>
          </div>
        </div>

        {/* Estadísticas - Grid responsivo */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Card
            size="small"
            className="border-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}
          >
            <Statistic
              title={<span className="text-gray-600 text-xs">Total</span>}
              value={stats.total}
              prefix={<FileTextOutlined className="text-gray-500" />}
              valueStyle={{ fontSize: '24px' }}
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
              valueStyle={{ color: '#389e0d', fontSize: '24px' }}
            />
          </Card>
          <Card
            size="small"
            className="border-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' }}
          >
            <Statistic
              title={<span className="text-orange-700 text-xs">Borradores</span>}
              value={stats.drafts}
              prefix={<ClockCircleOutlined className="text-orange-500" />}
              valueStyle={{ color: '#d46b08', fontSize: '24px' }}
            />
          </Card>
          <Card
            size="small"
            className="border-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' }}
          >
            <Statistic
              title={<span className="text-blue-700 text-xs">Plantillas</span>}
              value={stats.templates}
              prefix={<TeamOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff', fontSize: '24px' }}
            />
          </Card>
        </div>

        {/* Filtros desktop */}
        <Card size="small" className="mb-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Search
              placeholder="Buscar rúbricas..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: 280 }}
            />
            <Select
              placeholder="Estado"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 180 }}
            >
              <Option value="all">Todos los estados</Option>
              <Option value="draft">
                <Space><ClockCircleOutlined className="text-orange-500" /> Borrador</Space>
              </Option>
              <Option value="active">
                <Space><CheckCircleOutlined className="text-green-500" /> Activo</Space>
              </Option>
              <Option value="archived">
                <Space><FileTextOutlined className="text-gray-500" /> Archivado</Space>
              </Option>
            </Select>
            <Select
              placeholder="Tipo"
              value={templateFilter}
              onChange={setTemplateFilter}
              style={{ width: 160 }}
            >
              <Option value="all">Todos los tipos</Option>
              <Option value="template">Solo plantillas</Option>
              <Option value="rubric">Solo rúbricas</Option>
            </Select>

            <div className="flex-1" />

            {activeFiltersCount > 0 && (
              <Button
                size="small"
                onClick={clearFilters}
                icon={<ReloadOutlined />}
              >
                Limpiar
              </Button>
            )}

            <Segmented
              value={viewMode}
              onChange={(value) => setViewMode(value as 'list' | 'cards')}
              options={[
                { value: 'list', icon: <UnorderedListOutlined /> },
                { value: 'cards', icon: <AppstoreOutlined /> }
              ]}
            />
          </div>
        </Card>
      </div>

      {/* Contenido - Lista o Cards */}
      <Card className="shadow-sm">
        {error ? (
          <div className="text-center py-10">
            <Text type="danger" className="block mb-4">Error al cargar las rúbricas: {error}</Text>
            <Button onClick={() => fetchRubrics(true)} icon={<ReloadOutlined />}>
              Reintentar
            </Button>
          </div>
        ) : filteredRubrics.length === 0 && !loading ? (
          <Empty
            description={
              <span className="text-gray-500">
                {activeFiltersCount > 0
                  ? "No se encontraron rúbricas con los filtros aplicados"
                  : "No tienes rúbricas creadas aún"}
              </span>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            {activeFiltersCount > 0 ? (
              <Button onClick={clearFilters} icon={<ReloadOutlined />}>
                Limpiar filtros
              </Button>
            ) : (
              <Button type="primary" icon={<PlusOutlined />} onClick={handleNewRubric}>
                Crear Primera Rúbrica
              </Button>
            )}
          </Empty>
        ) : viewMode === 'cards' ? (
          /* Vista de cards para desktop */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredRubrics.map(renderRubricCard)}
          </div>
        ) : (
          /* Vista de tabla/lista */
          <Table
            columns={desktopColumns}
            dataSource={filteredRubrics}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} rúbricas`,
            }}
            size="middle"
          />
        )}
      </Card>

      {/* Modals */}
      <RubricEditor
        visible={editorVisible}
        onCancel={() => setEditorVisible(false)}
        onSuccess={handleOperationSuccess}
        editingRubric={editingRubric}
        subjectAssignments={subjectAssignments}
      />

      <RubricImporter
        visible={importerVisible}
        onClose={() => setImporterVisible(false)}
        onSuccess={handleOperationSuccess}
      />

      {/* Modal de visualización - Drawer en móvil */}
      {isMobile ? (
        <Drawer
          title={
            <div className="flex items-center gap-2">
              <FileTextOutlined />
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
                icon={<EditOutlined />}
                onClick={() => {
                  if (viewingRubric) {
                    setViewerVisible(false);
                    handleEditRubric(viewingRubric);
                  }
                }}
              >
                Editar
              </Button>
            </div>
          }
        >
          {viewingRubric && (
            <div className="overflow-auto">
              <RubricGrid
                rubric={viewingRubric}
                editable={false}
                viewMode="view"
              />
            </div>
          )}
        </Drawer>
      ) : (
        <Modal
          title={
            <div className="flex items-center gap-2">
              <FileTextOutlined className="text-purple-500" />
              <span>{viewingRubric?.name}</span>
            </div>
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
              key="edit"
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                if (viewingRubric) {
                  setViewerVisible(false);
                  handleEditRubric(viewingRubric);
                }
              }}
            >
              Editar
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

      <RubricSharingModal
        visible={sharingVisible}
        onCancel={handleCloseSharingModal}
        rubric={sharingRubric}
        currentTeacherId={currentTeacherId || ''}
      />

      <RubricWeightEditor
        visible={weightEditorVisible}
        onCancel={handleCloseWeightEditor}
        rubric={weightEditingRubric}
        onSuccess={handleCloseWeightEditor}
      />
    </div>
  );
};

export default RubricsPage;