/**
 * Gestor principal de carpetas de rúbricas
 * Integra todos los componentes y maneja el estado global
 */

import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Button,
  Input,
  Space,
  Typography,
  Spin,
  message,
  Modal,
  Breadcrumb,
  Divider,
  Tag,
  Tooltip,
  Empty,
  Tabs,
  Table
} from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  SortAscendingOutlined,
  ReloadOutlined,
  FolderOutlined,
  FileTextOutlined,
  HomeOutlined,
  RightOutlined,
  BarChartOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';

import FolderTree from './FolderTree';
import FolderModal from './FolderModal';
import FolderStatistics from './FolderStatistics';
import {
  RubricFolder,
  CreateFolderDto,
  UpdateFolderDto,
  RubricFoldersApiService
} from '../../services/rubricFoldersApi';
import { Rubric } from '../../hooks/useRubrics';

const { Title, Text } = Typography;
const { Search } = Input;
const { TabPane } = Tabs;

interface FolderManagerProps {
  onRubricsFolderChange?: (folderId: string | null) => void;
  initialFolderId?: string;
  rubrics?: Rubric[];
  onViewRubric?: (rubric: Rubric) => void;
  onEditRubric?: (rubric: Rubric) => void;
  onDeleteRubric?: (rubric: Rubric) => void;
}

export const FolderManager: React.FC<FolderManagerProps> = ({
  onRubricsFolderChange,
  initialFolderId,
  rubrics = [],
  onViewRubric,
  onEditRubric,
  onDeleteRubric
}) => {
  // Estado principal
  const [folders, setFolders] = useState<RubricFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<RubricFolder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estado de modales y formularios
  const [folderModalVisible, setFolderModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<RubricFolder | null>(null);
  const [parentFolder, setParentFolder] = useState<RubricFolder | undefined>();
  const [modalLoading, setModalLoading] = useState(false);

  // Estado de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredFolders, setFilteredFolders] = useState<RubricFolder[]>([]);

  // Cargar carpetas al montar el componente
  useEffect(() => {
    loadFolders();
  }, []);

  // Initialize filteredFolders when folders data is loaded
  useEffect(() => {
    if (!loading && folders.length >= 0) {
      console.log('🔍 INITIALIZING FILTERED FOLDERS:', folders.length, 'folders loaded');
      setFilteredFolders(folders);
    }
  }, [folders, loading]);

  // Seleccionar carpeta inicial si se proporciona
  useEffect(() => {
    if (initialFolderId && folders.length > 0) {
      // Add null/undefined filtering for safety
      const validFolders = folders.filter(f => f && f.id);
      const folder = validFolders.find(f => f.id === initialFolderId);
      if (folder) {
        setSelectedFolder(folder);
      }
    }
  }, [initialFolderId, folders]);

  // Filtrar carpetas por término de búsqueda
  useEffect(() => {
    // CRITICAL: Prevent execution during loading to avoid race conditions
    if (loading) {
      console.log('🔍 FOLDER FILTERING: Skipping filter during loading state');
      return;
    }
    
    console.log('🔍 FOLDER FILTERING: Processing', folders.length, 'folders with search term:', searchTerm);
    
    if (!searchTerm.trim()) {
      setFilteredFolders(folders);
    } else {
      // Add safety checks for folder properties
      const filtered = folders.filter(folder => {
        if (!folder || !folder.name) {
          console.warn('⚠️ Invalid folder in filter:', folder);
          return false;
        }
        return folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               folder.description?.toLowerCase().includes(searchTerm.toLowerCase());
      });
      setFilteredFolders(filtered);
    }
    
    console.log('🔍 FOLDER FILTERING: Result', filteredFolders.length, 'filtered folders');
  }, [folders, searchTerm, loading]);

  // Notificar cambios de carpeta seleccionada
  useEffect(() => {
    if (onRubricsFolderChange) {
      onRubricsFolderChange(selectedFolder?.id || null);
    }
  }, [selectedFolder, onRubricsFolderChange]);

  const loadFolders = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const foldersData = await RubricFoldersApiService.getFolders(true);
      
      // Add data validation and filtering to prevent undefined errors
      const validFolders = Array.isArray(foldersData) 
        ? foldersData.filter(folder => 
            folder && 
            typeof folder === 'object' && 
            folder.id && 
            folder.name
          )
        : [];
      
      console.log(`🔍 Loaded ${foldersData?.length || 0} folders, ${validFolders.length} valid`);
      setFolders(validFolders);
    } catch (error) {
      console.error('Error loading folders:', error);
      message.error('Error al cargar las carpetas');
      setFolders([]); // Set empty array on error to prevent undefined access
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreateFolder = (parent?: RubricFolder) => {
    setEditingFolder(null);
    setParentFolder(parent);
    setFolderModalVisible(true);
  };

  const handleEditFolder = (folder: RubricFolder) => {
    setEditingFolder(folder);
    setParentFolder(undefined);
    setFolderModalVisible(true);
  };

  const handleDeleteFolder = (folder: RubricFolder) => {
    Modal.confirm({
      title: '¿Eliminar carpeta?',
      content: (
        <div>
          <p>¿Estás seguro de que quieres eliminar la carpeta <strong>{folder.name}</strong>?</p>
          <p style={{ color: '#ff4d4f', fontSize: '12px' }}>
            ⚠️ Esta acción no se puede deshacer. Las rúbricas dentro de esta carpeta 
            se moverán a "Sin Carpeta".
          </p>
        </div>
      ),
      okText: 'Eliminar',
      cancelText: 'Cancelar',
      okType: 'danger',
      onOk: async () => {
        try {
          await RubricFoldersApiService.deleteFolder(folder.id);
          message.success('Carpeta eliminada exitosamente');
          
          // Si la carpeta eliminada estaba seleccionada, deseleccionar
          if (selectedFolder?.id === folder.id) {
            setSelectedFolder(null);
          }
          
          // Recargar carpetas
          await loadFolders(false);
        } catch (error) {
          console.error('Error deleting folder:', error);
          message.error('Error al eliminar la carpeta');
        }
      }
    });
  };

  const handleFolderSubmit = async (folderData: CreateFolderDto | UpdateFolderDto) => {
    try {
      setModalLoading(true);
      
      if (editingFolder) {
        // Actualizar carpeta existente
        await RubricFoldersApiService.updateFolder(editingFolder.id, folderData as UpdateFolderDto);
      } else {
        // Crear nueva carpeta
        const createData: CreateFolderDto = {
          ...folderData as CreateFolderDto,
          parentFolderId: parentFolder?.id
        };
        await RubricFoldersApiService.createFolder(createData);
      }
      
      setFolderModalVisible(false);
      await loadFolders(false);
    } catch (error) {
      console.error('Error saving folder:', error);
      message.error('Error al guardar la carpeta');
    } finally {
      setModalLoading(false);
    }
  };

  const handleFolderSelect = (folder: RubricFolder | null) => {
    console.log('🔍 FOLDER SELECTED:', folder);
    
    // Add validation for folder object
    if (folder && (!folder.id || !folder.name)) {
      console.error('⚠️ Invalid folder selected:', folder);
      return;
    }
    
    setSelectedFolder(folder);
  };

  const handleMoveFolder = async (folderId: string, targetFolderId: string | null) => {
    try {
      setRefreshing(true);
      
      // Verificar que la carpeta no se esté moviendo a sí misma o a una subcarpeta
      // Add safety filter for undefined folders
      const validFolders = folders.filter(f => f && f.id);
      const folderToMove = validFolders.find(f => f.id === folderId);
      if (!folderToMove) {
        throw new Error('Carpeta no encontrada');
      }

      if (folderId === targetFolderId) {
        throw new Error('No se puede mover una carpeta a sí misma');
      }

      // TODO: Verificar que no se mueva a una subcarpeta (evitar loop)
      
      await RubricFoldersApiService.moveFolder({
        folderId,
        targetFolderId
      });
      
      message.success('Carpeta movida exitosamente');
      await loadFolders();
    } catch (error: any) {
      console.error('Error moviendo carpeta:', error);
      message.error(error.message || 'Error al mover la carpeta');
    } finally {
      setRefreshing(false);
    }
  };

  const handleMoveRubric = async (rubricId: string, targetFolderId: string | null) => {
    try {
      setRefreshing(true);
      
      await RubricFoldersApiService.moveRubric({
        rubricId,
        folderId: targetFolderId || undefined
      });
      
      message.success('Rúbrica movida exitosamente');
      await loadFolders();
    } catch (error: any) {
      console.error('Error moviendo rúbrica:', error);
      message.error(error.message || 'Error al mover la rúbrica');
    } finally {
      setRefreshing(false);
    }
  };

  const renderBreadcrumb = () => {
    if (!selectedFolder) {
      return (
        <Breadcrumb>
          <Breadcrumb.Item>
            <HomeOutlined />
            <span>Todas las carpetas</span>
          </Breadcrumb.Item>
        </Breadcrumb>
      );
    }

    const breadcrumbItems = [];
    let currentFolder: RubricFolder | undefined = selectedFolder;
    const folderPath = [];
    const maxDepth = 10; // Prevent infinite loops
    let depth = 0;

    // Safe construction with null checks and depth limit
    while (currentFolder && currentFolder.parentFolderId && depth < maxDepth) {
      folderPath.unshift(currentFolder);
      // Add safety checks for undefined folders
      const validFolders = folders.filter(f => f && f.id);
      currentFolder = validFolders.find(f => f.id === currentFolder?.parentFolderId);
      depth++;
    }

    breadcrumbItems.push(
      <Breadcrumb.Item key="root">
        <Button
          type="text"
          size="small"
          icon={<HomeOutlined />}
          onClick={() => setSelectedFolder(null)}
        >
          Todas las carpetas
        </Button>
      </Breadcrumb.Item>
    );

    folderPath.forEach((folder, index) => {
      const isLast = index === folderPath.length - 1;
      breadcrumbItems.push(
        <Breadcrumb.Item key={folder.id}>
          {isLast ? (
            <Space>
              <FolderOutlined style={{ color: folder.color }} />
              <Text strong>{folder.name}</Text>
            </Space>
          ) : (
            <Button
              type="text"
              size="small"
              onClick={() => setSelectedFolder(folder)}
            >
              <Space>
                <FolderOutlined style={{ color: folder.color }} />
                {folder.name}
              </Space>
            </Button>
          )}
        </Breadcrumb.Item>
      );
    });

    return <Breadcrumb>{breadcrumbItems}</Breadcrumb>;
  };

  const renderSelectedFolderInfo = () => {
    console.log('🔍 RENDERING FOLDER INFO: selectedFolder =', selectedFolder);
    
    if (!selectedFolder) return null;
    
    // Add safety checks before accessing properties
    if (!selectedFolder.id || !selectedFolder.name) {
      console.error('⚠️ Invalid selectedFolder:', selectedFolder);
      return null;
    }

    const rubricsCount = selectedFolder.rubrics?.length || 0;
    const isSystemFolder = selectedFolder.isSystemFolder;

    return (
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space size={16}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center',
            fontSize: 16
          }}>
            <FolderOutlined 
              style={{ 
                color: selectedFolder.color, 
                fontSize: 20, 
                marginRight: 8 
              }} 
            />
            <Text strong>{selectedFolder.name}</Text>
          </div>
          
          <div>
            <Tag color={selectedFolder.color || 'default'}>
              {rubricsCount} rúbricas
            </Tag>
            {selectedFolder.isShared && (
              <Tag color="blue">Compartida</Tag>
            )}
            {isSystemFolder && (
              <Tag color="default">Sistema</Tag>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {!isSystemFolder && (
            <Space>
              <Button
                size="small"
                icon={<FileTextOutlined />}
                onClick={() => handleEditFolder(selectedFolder)}
              >
                Editar
              </Button>
              <Button
                size="small"
                type="primary"
                onClick={() => handleCreateFolder(selectedFolder)}
              >
                + Subcarpeta
              </Button>
            </Space>
          )}
        </Space>

        {selectedFolder.description && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary">{selectedFolder.description}</Text>
          </div>
        )}
      </Card>
    );
  };

  // CRITICAL: Prevent rendering and data access during loading
  if (loading) {
    console.log('🔍 FOLDER MANAGER: Showing loading state, preventing premature renders');
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Cargando sistema de carpetas...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%' }}>
      {/* Header con controles */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size={16}>
              <Search
                placeholder="Buscar carpetas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
              <Button 
                icon={<FilterOutlined />}
                onClick={() => message.info('Filtros avanzados próximamente')}
              >
                Filtros
              </Button>
              <Button 
                icon={<SortAscendingOutlined />}
                onClick={() => message.info('Ordenamiento próximamente')}
              >
                Ordenar
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Tooltip title="Actualizar">
                <Button 
                  icon={<ReloadOutlined />}
                  loading={refreshing}
                  onClick={() => loadFolders(false)}
                />
              </Tooltip>
              <Button 
                type="primary"
                onClick={() => handleCreateFolder()}
              >
                Nueva Carpeta
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Breadcrumb */}
      <Card size="small" style={{ marginBottom: 16 }}>
        {renderBreadcrumb()}
      </Card>

      {/* Información de carpeta seleccionada */}
      {renderSelectedFolderInfo()}

      {/* Layout principal */}
      <Row gutter={16} style={{ height: 'calc(100% - 200px)' }}>
        {/* Árbol de carpetas */}
        <Col span={8}>
          <div style={{ height: '100%' }}>
            <FolderTree
              folders={filteredFolders}
              onFolderSelect={handleFolderSelect}
              onCreateFolder={handleCreateFolder}
              onEditFolder={handleEditFolder}
              onDeleteFolder={handleDeleteFolder}
              onMoveFolder={handleMoveFolder}
              onMoveRubric={handleMoveRubric}
              selectedFolderId={selectedFolder?.id}
              loading={loading}
              allowDragDrop={true}
            />
          </div>
        </Col>

        {/* Vista de contenido con tabs */}
        <Col span={16}>
          <Card 
            style={{ height: '100%' }}
            bodyStyle={{ height: 'calc(100% - 57px)', overflow: 'hidden', padding: 0 }}
          >
            <Tabs 
              defaultActiveKey="rubrics" 
              style={{ height: '100%' }}
              tabBarStyle={{ padding: '0 16px', margin: 0 }}
            >
              <TabPane 
                tab={
                  <Space>
                    <FileTextOutlined />
                    Vista de Rúbricas
                  </Space>
                } 
                key="rubrics"
              >
                <div style={{ height: 'calc(100vh - 300px)', overflow: 'auto', padding: 16 }}>
                  {selectedFolder ? (
                    <div>
                      <Title level={5}>
                        Rúbricas en "{selectedFolder.name}"
                      </Title>
                      {(() => {
                        // Filtrar rúbricas de la carpeta seleccionada
                        const folderRubrics = rubrics.filter(rubric => 
                          rubric && rubric.folderId === selectedFolder.id
                        );
                        
                        return folderRubrics.length === 0 ? (
                          <Empty 
                            description="No hay rúbricas en esta carpeta"
                            image={<FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                          />
                        ) : (
                          <Table
                            dataSource={folderRubrics}
                            rowKey="id"
                            size="small"
                            pagination={false}
                            columns={[
                              {
                                title: 'Nombre',
                                dataIndex: 'name',
                                key: 'name',
                                render: (text: string, rubric: Rubric) => (
                                  <div>
                                    <Text 
                                      strong 
                                      style={{ color: '#1890ff', cursor: 'pointer' }} 
                                      onClick={() => onViewRubric?.(rubric)}
                                    >
                                      {text}
                                    </Text>
                                    {rubric.description && (
                                      <div>
                                        <Text type="secondary" style={{ fontSize: '12px' }}>
                                          {rubric.description.length > 60 
                                            ? rubric.description.substring(0, 60) + '...' 
                                            : rubric.description}
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
                                render: (status: string) => {
                                  const statusConfig = {
                                    draft: { color: 'orange', text: 'Borrador' },
                                    active: { color: 'green', text: 'Activo' },
                                    archived: { color: 'red', text: 'Archivado' }
                                  };
                                  const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
                                  return <Tag color={config.color}>{config.text}</Tag>;
                                }
                              },
                              {
                                title: 'Modificado',
                                dataIndex: 'updatedAt',
                                key: 'updatedAt',
                                width: 100,
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
                                    {onViewRubric && (
                                      <Tooltip title="Ver">
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<EyeOutlined />}
                                          onClick={() => onViewRubric(rubric)}
                                        />
                                      </Tooltip>
                                    )}
                                    {onEditRubric && (
                                      <Tooltip title="Editar">
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<EditOutlined />}
                                          onClick={() => onEditRubric(rubric)}
                                        />
                                      </Tooltip>
                                    )}
                                    {onDeleteRubric && (
                                      <Tooltip title="Eliminar">
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<DeleteOutlined />}
                                          danger
                                          onClick={() => onDeleteRubric(rubric)}
                                        />
                                      </Tooltip>
                                    )}
                                  </Space>
                                )
                              }
                            ]}
                          />
                        );
                      })()}
                    </div>
                  ) : (
                    <Empty 
                      description="Selecciona una carpeta para ver su contenido"
                      image={<FolderOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                    />
                  )}
                </div>
              </TabPane>
              
              <TabPane 
                tab={
                  <Space>
                    <BarChartOutlined />
                    Estadísticas
                  </Space>
                } 
                key="statistics"
              >
                <div style={{ height: 'calc(100vh - 300px)', overflow: 'auto', padding: 16 }}>
                  <FolderStatistics 
                    folders={folders}
                    selectedFolder={selectedFolder}
                    loading={loading}
                  />
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      {/* Modal para crear/editar carpetas */}
      <FolderModal
        visible={folderModalVisible}
        onCancel={() => setFolderModalVisible(false)}
        onSubmit={handleFolderSubmit}
        editingFolder={editingFolder}
        availableFolders={folders}
        loading={modalLoading}
      />
    </div>
  );
};

export default FolderManager;