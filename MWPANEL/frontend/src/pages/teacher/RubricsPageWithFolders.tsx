/**
 * Página de Gestión de Rúbricas con Sistema de Carpetas Integrado
 * Versión mejorada que combina la funcionalidad existente con organización por carpetas
 */

import React, { useState, useEffect } from 'react';
import { DndProvider, useDrag } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
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
  Tabs,
  Switch,
  Breadcrumb,
  Spin
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
  FolderOutlined,
  UnorderedListOutlined,
  HomeOutlined,
  AppstoreOutlined,
  DragOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { Rubric, useRubrics } from '../../hooks/useRubrics';
import RubricEditor from '../../components/rubrics/RubricEditor';
import RubricImporter from '../../components/rubrics/RubricImporter';
import RubricGrid from '../../components/rubrics/RubricGrid';
import RubricSharingModal from '../../components/rubrics/RubricSharingModal';
import RubricWeightEditor from '../../components/rubrics/RubricWeightEditor';
import FolderManager from '../../components/rubrics/FolderManager';
import FolderTree from '../../components/rubrics/FolderTree';
import FoldersErrorBoundary from '../../components/common/FoldersErrorBoundary';
import apiClient from '@services/apiClient';
import { RubricFoldersApiService } from '../../services/rubricFoldersApi';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

// Tipos para drag & drop
const ItemTypes = {
  RUBRIC: 'rubric',
};

interface RubricsPageWithFoldersProps {}

const RubricsPageWithFolders: React.FC<RubricsPageWithFoldersProps> = () => {
  // Componente de fila de rúbrica draggable
  const DraggableRubricRow: React.FC<{ children: React.ReactNode; rubric?: Rubric }> = ({ children, rubric }) => {
    const [{ isDragging }, drag] = useDrag({
      type: ItemTypes.RUBRIC,
      item: { type: ItemTypes.RUBRIC, id: rubric?.id || '', rubricId: rubric?.id || '' },
      canDrag: !!rubric, // Only allow drag if rubric exists
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    return (
      <tr
        ref={drag}
        style={{
          opacity: isDragging ? 0.5 : 1,
          cursor: isDragging ? 'grabbing' : 'grab',
          backgroundColor: isDragging ? '#f0f8ff' : 'transparent',
        }}
      >
        {children}
      </tr>
    );
  };

  const {
    rubrics,
    loading,
    error,
    fetchRubrics,
    deleteRubric,
    publishRubric,
    updateRubric
  } = useRubrics();

  // Estados de filtrado y vista
  const [filteredRubrics, setFilteredRubrics] = useState<Rubric[]>([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'folders'>('folders');
  const [showFoldersPanel, setShowFoldersPanel] = useState(true);
  
  // Estados de datos
  const [subjectAssignments, setSubjectAssignments] = useState<Array<{ id: string; subject: { name: string; code: string } }>>([]);
  const [modalFolders, setModalFolders] = useState<Array<any>>([]);
  const [modalFoldersLoading, setModalFoldersLoading] = useState(false);
  
  // Modals
  const [editorVisible, setEditorVisible] = useState(false);
  const [importerVisible, setImporterVisible] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [sharingVisible, setSharingVisible] = useState(false);
  const [weightEditorVisible, setWeightEditorVisible] = useState(false);
  const [moveRubricVisible, setMoveRubricVisible] = useState(false);
  
  // Estados de edición
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null);
  const [viewingRubric, setViewingRubric] = useState<Rubric | null>(null);
  const [sharingRubric, setSharingRubric] = useState<Rubric | null>(null);
  const [weightEditingRubric, setWeightEditingRubric] = useState<Rubric | null>(null);
  const [movingRubric, setMovingRubric] = useState<Rubric | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  // Cargar datos iniciales
  useEffect(() => {
    fetchRubrics(true);
    fetchCurrentTeacherId();
    fetchSubjectAssignments();
  }, []);

  // Obtener ID del profesor actual
  const fetchCurrentTeacherId = async () => {
    try {
      const userResponse = await apiClient.get('/auth/me');
      const currentUser = userResponse.data;
      
      if (currentUser.role !== 'teacher' && currentUser.role !== 'admin') {
        console.error('Acceso denegado: Solo profesores y administradores pueden acceder a este panel');
        return;
      }
      
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
    // CRITICAL: Prevent execution during loading to avoid race conditions
    if (loading) {
      console.log('🔍 RUBRICS FILTERING: Skipping filter during loading state');
      return;
    }
    
    console.log('🔍 RUBRICS FILTERING: Starting with', rubrics.length, 'rubrics, selectedFolderId:', selectedFolderId);
    
    let filtered = [...rubrics];

    // Filtro por carpeta seleccionada
    if (selectedFolderId) {
      console.log('🔍 RUBRICS FILTERING: Applying folder filter for', selectedFolderId);
      console.log('🔍 RUBRICS FILTERING: Available rubrics:', rubrics.map(r => ({ name: r?.name, folderId: r?.folderId, id: r?.id })));
      
      filtered = filtered.filter(rubric => {
        if (!rubric) {
          console.warn('⚠️ Invalid rubric in folder filter:', rubric);
          return false;
        }
        // Filtrar por folderId - incluir rúbricas que pertenecen a la carpeta seleccionada
        const matches = rubric.folderId === selectedFolderId;
        console.log('🔍 COMPARING:', rubric.name, '| rubric.folderId:', rubric.folderId, '| selectedFolderId:', selectedFolderId, '| matches:', matches);
        
        if (matches) {
          console.log('✅ RUBRIC MATCHES FOLDER:', rubric.name, 'folderId:', rubric.folderId);
        }
        return matches;
      });
      console.log('🔍 RUBRICS FILTERING: Found', filtered.length, 'rubrics in folder', selectedFolderId);
    } else {
      // Si no hay carpeta seleccionada, mostrar solo rúbricas sin carpeta (carpeta raíz)
      console.log('🔍 RUBRICS FILTERING: Showing root folder (no folder selected)');
      console.log('🔍 RUBRICS FILTERING: Available rubrics for root:', rubrics.map(r => ({ name: r?.name, folderId: r?.folderId })));
      
      filtered = filtered.filter(rubric => {
        if (!rubric) {
          console.warn('⚠️ Invalid rubric in root filter:', rubric);
          return false;
        }
        // Mostrar rúbricas que no tienen carpeta asignada (null o undefined)
        const isRoot = !rubric.folderId;
        console.log('🔍 ROOT CHECK:', rubric.name, '| folderId:', rubric.folderId, '| isRoot:', isRoot);
        
        if (isRoot) {
          console.log('✅ RUBRIC IN ROOT:', rubric.name, 'folderId:', rubric.folderId);
        }
        return isRoot;
      });
      console.log('🔍 RUBRICS FILTERING: Found', filtered.length, 'rubrics in root folder');
    }

    // Filtro por texto
    if (searchText) {
      console.log('🔍 RUBRICS FILTERING: Applying text filter:', searchText);
      filtered = filtered.filter(rubric => {
        if (!rubric || !rubric.name) {
          console.warn('⚠️ Invalid rubric in text filter:', rubric);
          return false;
        }
        return rubric.name.toLowerCase().includes(searchText.toLowerCase()) ||
               rubric.description?.toLowerCase().includes(searchText.toLowerCase());
      });
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      console.log('🔍 RUBRICS FILTERING: Applying status filter:', statusFilter);
      filtered = filtered.filter(rubric => {
        if (!rubric) {
          console.warn('⚠️ Invalid rubric in status filter:', rubric);
          return false;
        }
        return rubric.status === statusFilter;
      });
    }

    // Filtro por template
    if (templateFilter !== 'all') {
      console.log('🔍 RUBRICS FILTERING: Applying template filter:', templateFilter);
      const isTemplate = templateFilter === 'template';
      filtered = filtered.filter(rubric => {
        if (!rubric) {
          console.warn('⚠️ Invalid rubric in template filter:', rubric);
          return false;
        }
        return rubric.isTemplate === isTemplate;
      });
    }

    console.log('🔍 RUBRICS FILTERING: Result', filtered.length, 'filtered rubrics');
    console.log('🔍 RENDERING STATE CHECK: loading =', loading, '| error =', error, '| filteredRubrics.length will be =', filtered.length);
    setFilteredRubrics(filtered);
  }, [rubrics, searchText, statusFilter, templateFilter, selectedFolderId, loading]);

  // Estadísticas calculadas
  const stats = {
    total: filteredRubrics.length,
    active: filteredRubrics.filter(r => r.status === 'active').length,
    drafts: filteredRubrics.filter(r => r.status === 'draft').length,
    templates: filteredRubrics.filter(r => r.isTemplate).length
  };

  // Handlers para operaciones CRUD
  const handleNewRubric = () => {
    setEditingRubric(null);
    setEditorVisible(true);
  };

  const handleEditRubric = (rubric: Rubric) => {
    setEditingRubric(rubric);
    setEditorVisible(true);
  };

  const handleViewRubric = (rubric: Rubric) => {
    setViewingRubric(rubric);
    setViewerVisible(true);
  };

  const handleDeleteRubric = async (rubric: Rubric) => {
    Modal.confirm({
      title: '¿Eliminar rúbrica?',
      content: `¿Estás seguro de que quieres eliminar "${rubric.name}"?`,
      okText: 'Eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await deleteRubric(rubric.id);
          message.success('Rúbrica eliminada exitosamente');
        } catch (error) {
          message.error('Error al eliminar la rúbrica');
        }
      }
    });
  };

  const handleDuplicateRubric = async (rubric: Rubric) => {
    try {
      const duplicated = { ...rubric, name: `${rubric.name} (Copia)`, id: '' };
      // TODO: Implementar duplicación de rúbrica
      message.success('Rúbrica duplicada exitosamente');
    } catch (error) {
      message.error('Error al duplicar la rúbrica');
    }
  };

  const handleShareRubric = (rubric: Rubric) => {
    setSharingRubric(rubric);
    setSharingVisible(true);
  };

  const handleEditWeights = (rubric: Rubric) => {
    setWeightEditingRubric(rubric);
    setWeightEditorVisible(true);
  };

  const handleMoveRubric = async (rubric: Rubric) => {
    setMovingRubric(rubric);
    setMoveRubricVisible(true);
    
    // Cargar carpetas para el modal
    try {
      setModalFoldersLoading(true);
      const foldersData = await RubricFoldersApiService.getFolders(true);
      const validFolders = Array.isArray(foldersData) 
        ? foldersData.filter(folder => folder && folder.id && folder.name)
        : [];
      setModalFolders(validFolders);
    } catch (error) {
      console.error('Error loading folders for modal:', error);
      setModalFolders([]);
    } finally {
      setModalFoldersLoading(false);
    }
  };

  const handleImportRubric = () => {
    setImporterVisible(true);
  };

  const handleOperationSuccess = () => {
    setEditorVisible(false);
    setImporterVisible(false);
    fetchRubrics(true);
  };

  const handleCloseSharingModal = () => {
    setSharingVisible(false);
    setSharingRubric(null);
  };

  const handleCloseWeightEditor = () => {
    setWeightEditorVisible(false);
    setWeightEditingRubric(null);
    fetchRubrics(true);
  };

  const handleMoveRubricConfirm = async (folderId: string | null) => {
    if (!movingRubric) return;

    try {
      await RubricFoldersApiService.moveRubric({
        rubricId: movingRubric.id,
        folderId: folderId || undefined
      });
      message.success('Rúbrica movida exitosamente');
      setMoveRubricVisible(false);
      setMovingRubric(null);
      // Refrescar rúbricas para mostrar cambios inmediatamente
      await fetchRubrics(true);
    } catch (error) {
      console.error('Error moving rubric:', error);
      message.error('Error al mover la rúbrica');
    }
  };

  // Nueva función para activar/desactivar rúbricas
  const handleToggleRubricStatus = async (rubric: Rubric) => {
    const newStatus = rubric.status === 'draft' ? 'active' : 'draft';
    const actionText = newStatus === 'active' ? 'activar' : 'poner en borrador';
    
    try {
      if (newStatus === 'active') {
        // Usar el endpoint de publish para activar
        await publishRubric(rubric.id);
        message.success('Rúbrica activada exitosamente');
      } else {
        // Usar update para cambiar a borrador
        await updateRubric(rubric.id, { status: 'draft' });
        message.success('Rúbrica puesta en borrador');
      }
      // Refrescar la lista
      await fetchRubrics(true);
    } catch (error) {
      console.error(`Error trying to ${actionText} rubric:`, error);
      message.error(`Error al ${actionText} la rúbrica`);
    }
  };

  // Menu de acciones para cada rúbrica
  const getActionMenu = (rubric: Rubric) => ({
    items: [
      {
        key: 'duplicate',
        label: 'Duplicar',
        icon: <CopyOutlined />,
        onClick: () => handleDuplicateRubric(rubric)
      },
      {
        key: 'share',
        label: 'Compartir',
        icon: <ShareAltOutlined />,
        onClick: () => handleShareRubric(rubric)
      },
      {
        key: 'weights',
        label: 'Editar Pesos',
        icon: <PercentageOutlined />,
        onClick: () => handleEditWeights(rubric)
      },
      {
        key: 'move',
        label: 'Mover a Carpeta',
        icon: <DragOutlined />,
        onClick: () => handleMoveRubric(rubric)
      },
      {
        key: 'toggle-status',
        label: rubric.status === 'draft' ? 'Activar Rúbrica' : 'Poner en Borrador',
        icon: rubric.status === 'draft' ? <EyeOutlined /> : <EditOutlined />,
        onClick: () => handleToggleRubricStatus(rubric)
      },
      {
        type: 'divider'
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

  // Columnas de la tabla
  const columns: ColumnsType<Rubric> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string, rubric: Rubric) => (
        <div>
          <Text strong style={{ color: '#1890ff', cursor: 'pointer' }} onClick={() => handleViewRubric(rubric)}>
            {text}
          </Text>
          {rubric.description && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {rubric.description}
              </Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      filters: [
        { text: 'Borrador', value: 'draft' },
        { text: 'Activo', value: 'active' },
        { text: 'Archivado', value: 'archived' }
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: string, rubric: Rubric) => {
        const statusConfig = {
          draft: { color: 'orange', text: 'Borrador' },
          active: { color: 'green', text: 'Activo' },
          archived: { color: 'red', text: 'Archivado' }
        };
        const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
        
        return (
          <Tooltip title={status === 'draft' ? 'Click para activar' : status === 'active' ? 'Click para poner en borrador' : 'Archivada'}>
            <Tag 
              color={config.color} 
              style={{ cursor: status !== 'archived' ? 'pointer' : 'default' }}
              onClick={() => status !== 'archived' && handleToggleRubricStatus(rubric)}
            >
              {config.text}
            </Tag>
          </Tooltip>
        );
      }
    },
    {
      title: 'Tipo',
      key: 'type',
      width: 120,
      render: (_, rubric: Rubric) => (
        <Space direction="vertical" size={2}>
          {rubric.isTemplate && (
            <Tag color="blue" style={{ margin: 0 }}>
              Plantilla
            </Tag>
          )}
          {rubric.sharedWith && rubric.sharedWith.length > 0 && (
            <Tag color="purple" style={{ margin: 0 }}>
              Compartida
            </Tag>
          )}
          {rubric.isVisibleToFamilies && (
            <Tag color="cyan" style={{ margin: 0 }}>
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

  const renderBreadcrumb = () => {
    if (!selectedFolderId) {
      return (
        <Breadcrumb>
          <Breadcrumb.Item>
            <HomeOutlined />
            <span>Carpeta Raíz</span>
          </Breadcrumb.Item>
        </Breadcrumb>
      );
    }
    
    return (
      <Breadcrumb>
        <Breadcrumb.Item>
          <Button
            type="text"
            size="small"
            icon={<HomeOutlined />}
            onClick={() => setSelectedFolderId(null)}
          >
            Carpeta Raíz
          </Button>
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          <FolderOutlined />
          <span>Carpeta seleccionada</span>
        </Breadcrumb.Item>
      </Breadcrumb>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div style={{ padding: '24px', minHeight: '100vh', overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Gestión de Rúbricas
          </Title>
          <Text type="secondary">Organiza y gestiona tus rúbricas con el nuevo sistema de carpetas</Text>
        </div>
        <Space>
          <Switch
            checkedChildren={<FolderOutlined />}
            unCheckedChildren={<UnorderedListOutlined />}
            checked={showFoldersPanel}
            onChange={setShowFoldersPanel}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleNewRubric}
          >
            Nueva Rúbrica
          </Button>
          <Button
            icon={<ImportOutlined />}
            onClick={handleImportRubric}
          >
            Importar desde ChatGPT
          </Button>
        </Space>
      </div>

      {/* Estadísticas */}
      <Row gutter={16} style={{ marginBottom: '16px' }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Activas" value={stats.active} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Borradores" value={stats.drafts} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Plantillas" value={stats.templates} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
      </Row>

      {/* Breadcrumb */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        {renderBreadcrumb()}
      </Card>

      {/* Panel de carpetas (opcional) - Bloque independiente */}
      {showFoldersPanel && (
        <div style={{ marginBottom: '32px' }}>
          <FoldersErrorBoundary fallbackTitle="Error en Sistema de Carpetas">
            <FolderManager
              onRubricsFolderChange={setSelectedFolderId}
              initialFolderId={selectedFolderId || undefined}
              rubrics={rubrics}
              onViewRubric={handleViewRubric}
              onEditRubric={handleEditRubric}
              onDeleteRubric={handleDeleteRubric}
            />
          </FoldersErrorBoundary>
        </div>
      )}
      
      {/* Lista de rúbricas - Bloque independiente completamente separado */}
      <div style={{ marginTop: showFoldersPanel ? '24px' : '0', marginBottom: '40px' }}>
          <Card 
            title="Rúbricas"
            style={{ width: '100%' }}
            bodyStyle={{ overflow: 'visible' }}
            extra={
              <Space>
                <Search
                  placeholder="Buscar rúbricas..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 200 }}
                  allowClear
                />
                <Select
                  placeholder="Estado"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 120 }}
                >
                  <Option value="all">Todos</Option>
                  <Option value="draft">Borrador</Option>
                  <Option value="active">Activo</Option>
                  <Option value="archived">Archivado</Option>
                </Select>
                <Select
                  placeholder="Tipo"
                  value={templateFilter}
                  onChange={setTemplateFilter}
                  style={{ width: 120 }}
                >
                  <Option value="all">Todos</Option>
                  <Option value="template">Plantillas</Option>
                  <Option value="rubric">Rúbricas</Option>
                </Select>
              </Space>
            }
          >
            {error ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <Text type="danger">Error al cargar las rúbricas: {error}</Text>
                <br />
                <Button onClick={() => fetchRubrics(true)} style={{ marginTop: '16px' }}>
                  Reintentar
                </Button>
              </div>
            ) : (() => {
              console.log('🔍 RENDER CHECK: filteredRubrics.length =', filteredRubrics.length, '| loading =', loading, '| Should show empty?', filteredRubrics.length === 0 && !loading);
              return filteredRubrics.length === 0 && !loading;
            })() ? (
              <Empty
                description={selectedFolderId ? "No hay rúbricas en esta carpeta" : "No se encontraron rúbricas"}
                image={selectedFolderId ? <FolderOutlined style={{ fontSize: 48, color: '#d9d9d9' }} /> : Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleNewRubric}>
                  {selectedFolderId ? "Crear Rúbrica en Carpeta" : "Crear Primera Rúbrica"}
                </Button>
              </Empty>
            ) : (() => {
              console.log('🔍 RENDERING TABLE: with', filteredRubrics.length, 'rubrics, loading =', loading);
              return (
                <Table
                  columns={columns}
                  dataSource={filteredRubrics}
                  rowKey="id"
                  loading={loading}
                  components={{
                    body: {
                      row: (props: any) => {
                        const rubric = filteredRubrics.find(r => r?.id === props['data-row-key']);
                        if (!rubric) {
                          // Fallback for when rubric is not found during loading
                          return <tr {...props}>{props.children}</tr>;
                        }
                        return <DraggableRubricRow rubric={rubric} {...props} />;
                      }
                    }
                  }}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} rúbricas`
                  }}
                  scroll={{ y: 300 }}
                />
              );
            })()}
          </Card>
        </div>

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

      <Modal
        title={viewingRubric?.name}
        open={viewerVisible}
        onCancel={() => setViewerVisible(false)}
        width={1200}
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

      {/* Modal para mover rúbrica - Layout mejorado */}
      <Modal
        title="Mover Rúbrica a Carpeta"
        open={moveRubricVisible}
        onCancel={() => setMoveRubricVisible(false)}
        onOk={() => handleMoveRubricConfirm(selectedFolderId)}
        okText="Mover"
        cancelText="Cancelar"
        width={600}
        styles={{
          body: { padding: '20px 0' }
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <Text>¿Dónde quieres mover la rúbrica "<strong>{movingRubric?.name}</strong>"?</Text>
        </div>
        
        <div style={{ 
          maxHeight: '400px', 
          overflow: 'auto',
          border: '1px solid #d9d9d9',
          borderRadius: '6px',
          padding: '16px',
          backgroundColor: '#fafafa'
        }}>
          {modalFoldersLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">Cargando carpetas...</Text>
              </div>
            </div>
          ) : modalFolders.length === 0 ? (
            <Empty 
              description="No hay carpetas disponibles"
              image={<FolderOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
            />
          ) : (
            <FolderTree
              folders={modalFolders}
              onFolderSelect={(folder) => setSelectedFolderId(folder?.id || null)}
              onCreateFolder={() => {}} // No permitir crear en el modal
              onEditFolder={() => {}} // No permitir editar en el modal  
              onDeleteFolder={() => {}} // No permitir eliminar en el modal
              selectedFolderId={selectedFolderId}
              loading={false}
              allowDragDrop={false} // Sin drag & drop en el modal
            />
          )}
        </div>
      </Modal>
      </div>
    </DndProvider>
  );
};

export default RubricsPageWithFolders;