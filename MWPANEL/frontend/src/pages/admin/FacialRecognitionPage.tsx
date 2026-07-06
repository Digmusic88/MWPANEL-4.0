import React, { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Statistic,
  Table,
  Tag,
  message,
  Modal,
  Tabs,
  Alert
} from 'antd';
import {
  CameraOutlined,
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UserOutlined,
  PieChartOutlined,
  HistoryOutlined,
  SettingOutlined,
  EditOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { FacialRecognitionBulk } from '../../components/facial-recognition/FacialRecognitionBulk';
import { useAuthStore } from '@store/authStore';

const { Title, Text } = Typography;
const { Content } = Layout;
const { TabPane } = Tabs;

interface GroupPhotoRecord {
  id: string;
  originalFilename: string;
  uploadDate: string;
  facesDetected: number;
  assignedFaces: number;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  uploadedBy: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  classGroup?: {
    name: string;
    section?: string;
  };
}

interface SystemStatistics {
  totalPhotos: number;
  totalFaces: number;
  assignedFaces: number;
  unassignedFaces: number;
  averageProcessingTime: number;
  successRate: number;
}

export const FacialRecognitionPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('bulk-upload');
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<SystemStatistics>({
    totalPhotos: 0,
    totalFaces: 0,
    assignedFaces: 0,
    unassignedFaces: 0,
    averageProcessingTime: 0,
    successRate: 0
  });
  const [photoRecords, setPhotoRecords] = useState<GroupPhotoRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<GroupPhotoRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);

  // Get access token from auth store
  const { accessToken } = useAuthStore();

  // Cargar datos al montar el componente
  useEffect(() => {
    if (accessToken) {
      loadStatistics();
      loadPhotoRecords();
    }
  }, [accessToken]);

  const loadStatistics = async () => {
    try {
      if (!accessToken) {
        message.error('No se encontró token de autenticación');
        return;
      }

      const response = await fetch('/api/group-photos/statistics', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        const photoStats = result.data.photos;
        const faceStats = result.data.faces;

        setStatistics({
          totalPhotos: photoStats.total,
          totalFaces: faceStats.total,
          assignedFaces: faceStats.assigned,
          unassignedFaces: faceStats.unassigned,
          averageProcessingTime: 0, // Se calcularía en implementación real
          successRate: photoStats.total > 0 ? 
            (photoStats.byStatus.completed / photoStats.total) * 100 : 0
        });
      }
    } catch (error) {
      message.error('Error cargando estadísticas');
    }
  };

  const loadPhotoRecords = async () => {
    setLoading(true);
    try {
      if (!accessToken) {
        message.error('No se encontró token de autenticación');
        return;
      }

      const response = await fetch('/api/group-photos', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setPhotoRecords(result.data || []);
      }
    } catch (error) {
      message.error('Error cargando registros de fotos');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    Modal.confirm({
      title: '¿Está seguro?',
      content: 'Esta acción eliminará la foto grupal y todas sus detecciones faciales asociadas.',
      okText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          if (!accessToken) {
            message.error('No se encontró token de autenticación');
            return;
          }

          const response = await fetch(`/api/group-photos/${photoId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            message.success('Foto eliminada exitosamente');
            loadPhotoRecords();
            loadStatistics();
          }
        } catch (error) {
          message.error('Error eliminando foto');
        }
      }
    });
  };

  const showPhotoDetails = (record: GroupPhotoRecord) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleEditFaces = (photoId: string) => {
    setEditingPhotoId(photoId);
    setActiveTab('bulk-upload'); // Switch to upload tab for editing interface
  };

  const handleBackToHistory = () => {
    setEditingPhotoId(null);
    setActiveTab('history'); // Go back to history tab
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'processing';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Completado';
      case 'processing': return 'Procesando';
      case 'failed': return 'Fallido';
      default: return 'Pendiente';
    }
  };

  const columns = [
    {
      title: 'Archivo',
      dataIndex: 'originalFilename',
      key: 'filename',
      render: (text: string) => (
        <Text strong>{text}</Text>
      )
    },
    {
      title: 'Fecha de Subida',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Subido por',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
      render: (user: any) => (
        user?.profile?.firstName && user?.profile?.lastName
          ? `${user.profile.firstName} ${user.profile.lastName}`
          : 'Usuario no disponible'
      )
    },
    {
      title: 'Grupo',
      dataIndex: 'classGroup',
      key: 'classGroup',
      render: (group: any) => (
        group ? `${group.name} ${group.section || ''}` : 'Sin grupo'
      )
    },
    {
      title: 'Caras Detectadas',
      dataIndex: 'facesDetected',
      key: 'facesDetected',
      render: (count: number, record: GroupPhotoRecord) => (
        <Space>
          <Text>{count}</Text>
          <Text type="secondary">
            ({record.assignedFaces || 0} asignadas)
          </Text>
        </Space>
      )
    },
    {
      title: 'Estado',
      dataIndex: 'processingStatus',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: GroupPhotoRecord) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => showPhotoDetails(record)}
            size="small"
          >
            Ver
          </Button>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEditFaces(record.id)}
            size="small"
            type="primary"
          >
            Editar Caras
          </Button>
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDeletePhoto(record.id)}
            size="small"
            danger
          >
            Eliminar
          </Button>
        </Space>
      )
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content style={{ padding: '24px' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Encabezado */}
          <div style={{ marginBottom: '24px' }}>
            <Title level={1}>
              <CameraOutlined /> Reconocimiento Facial
            </Title>
            <Text type="secondary">
              Sistema de reconocimiento facial para fotos grupales de estudiantes
            </Text>
          </div>

          {/* Estadísticas */}
          <Row gutter={16} style={{ marginBottom: '24px' }}>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Total de Fotos"
                  value={statistics.totalPhotos}
                  prefix={<CameraOutlined />}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Total de Caras"
                  value={statistics.totalFaces}
                  prefix={<UserOutlined />}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Caras Asignadas"
                  value={statistics.assignedFaces}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#3f8600' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Sin Asignar"
                  value={statistics.unassignedFaces}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Tasa de Éxito"
                  value={statistics.successRate}
                  suffix="%"
                  prefix={<PieChartOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={4}>
              <Card>
                <Statistic
                  title="Progreso Total"
                  value={statistics.totalFaces > 0 ? Math.round((statistics.assignedFaces / statistics.totalFaces) * 100) : 0}
                  suffix="%"
                  valueStyle={{ 
                    color: statistics.unassignedFaces === 0 ? '#3f8600' : '#1890ff' 
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* Contenido principal */}
          <Card>
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane 
                tab={
                  <Space>
                    <CameraOutlined />
                    Subir Foto Grupal
                  </Space>
                } 
                key="bulk-upload"
              >
                <Alert
                  message="Instrucciones"
                  description="Suba una foto grupal clara donde se vean las caras de frente. El sistema detectará automáticamente las caras y le permitirá asignar cada una a un estudiante."
                  type="info"
                  showIcon
                  style={{ marginBottom: '24px' }}
                />
                <FacialRecognitionBulk 
                  editingPhotoId={editingPhotoId}
                  onBackToHistory={handleBackToHistory}
                />
              </TabPane>

              <TabPane 
                tab={
                  <Space>
                    <HistoryOutlined />
                    Historial de Fotos
                  </Space>
                } 
                key="history"
              >
                <div style={{ marginBottom: '16px' }}>
                  <Space>
                    <Button 
                      icon={<DownloadOutlined />}
                      onClick={loadPhotoRecords}
                      loading={loading}
                    >
                      Actualizar
                    </Button>
                    <Button icon={<DownloadOutlined />}>
                      Exportar Datos
                    </Button>
                  </Space>
                </div>
                
                <Table
                  dataSource={photoRecords}
                  columns={columns}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => 
                      `${range[0]}-${range[1]} de ${total} fotos`
                  }}
                />
              </TabPane>

              <TabPane 
                tab={
                  <Space>
                    <SettingOutlined />
                    Configuración
                  </Space>
                } 
                key="settings"
              >
                <Alert
                  message="Configuración del Sistema"
                  description="Las configuraciones avanzadas estarán disponibles en futuras versiones."
                  type="info"
                  showIcon
                />
              </TabPane>
            </Tabs>
          </Card>

          {/* Modal de detalles */}
          <Modal
            title="Detalles de la Foto Grupal"
            open={showDetailsModal}
            onCancel={() => setShowDetailsModal(false)}
            footer={null}
            width={800}
          >
            {selectedRecord && (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={4}>{selectedRecord.originalFilename}</Title>
                  <Text type="secondary">
                    Subido el {new Date(selectedRecord.uploadDate).toLocaleString()}
                  </Text>
                </div>

                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small">
                      <Statistic
                        title="Caras Detectadas"
                        value={selectedRecord.facesDetected}
                        prefix={<UserOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={12}>
                    <Card size="small">
                      <Statistic
                        title="Caras Asignadas"
                        value={selectedRecord.assignedFaces || 0}
                        prefix={<UserOutlined />}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                </Row>

                <div>
                  <Text strong>Estado: </Text>
                  <Tag color={getStatusColor(selectedRecord.processingStatus)}>
                    {getStatusText(selectedRecord.processingStatus)}
                  </Tag>
                </div>

                {selectedRecord.classGroup && (
                  <div>
                    <Text strong>Grupo: </Text>
                    <Text>{selectedRecord.classGroup.name} {selectedRecord.classGroup.section}</Text>
                  </div>
                )}
              </Space>
            )}
          </Modal>
        </motion.div>
      </Content>
    </Layout>
  );
};