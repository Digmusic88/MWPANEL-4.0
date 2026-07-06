import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Progress,
  Button,
  Alert,
  Typography,
  Space,
  Card,
  Statistic,
  Tag,
  Table,
  Row,
  Col,
  Divider,
  Select,
  InputNumber,
  Checkbox,
  notification,
  Popconfirm,
  Tooltip,
  Badge
} from 'antd';
import {
  FileTextOutlined,
  DeleteOutlined,
  ClearOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  FolderOutlined,
  ClockCircleOutlined,
  DatabaseOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface PdfFile {
  id: string;
  filename: string;
  size: number;
  formattedSize: string;
  type: string;
  category: string;
  createdAt: string;
  lastAccessed: string;
  accessCount: number;
  isTemporary: boolean;
  expiresAt?: string;
}

interface PdfStorageStats {
  totalFiles: number;
  totalSize: number;
  formattedTotalSize: string;
  tempFiles: number;
  tempSize: number;
  formattedTempSize: string;
  diskUsage: {
    total: number;
    used: number;
    available: number;
    usagePercentage: number;
  };
  byType: Record<string, { count: number; size: number }>;
}

interface PdfCleanupResult {
  success: boolean;
  message: string;
  filesRemoved: number;
  spaceFreed: number;
  formattedSpaceFreed: string;
  details: {
    expiredFiles: number;
    tempFiles: number;
    unusedFiles: number;
    duplicateFiles: number;
  };
  duration: number;
}

interface PdfManagerModalProps {
  visible: boolean;
  onCancel: () => void;
  onCleanup: (options: any) => Promise<PdfCleanupResult>;
  onOptimize: () => Promise<{ success: boolean; optimizations: string[]; spaceSaved: number }>;
  onDeleteFile: (fileId: string) => Promise<boolean>;
}

const PdfManagerModal: React.FC<PdfManagerModalProps> = ({
  visible,
  onCancel,
  onCleanup,
  onOptimize,
  onDeleteFile
}) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PdfStorageStats | null>(null);
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [cleanupOptions, setCleanupOptions] = useState({
    maxAge: 7,
    removeUnused: true,
    removeDuplicates: true,
    dryRun: false,
    types: ['temp']
  });
  const [previewResult, setPreviewResult] = useState<PdfCleanupResult | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Simulate API calls - replace with actual API calls
      const mockStats: PdfStorageStats = {
        totalFiles: 245,
        totalSize: 125 * 1024 * 1024, // 125MB
        formattedTotalSize: '125 MB',
        tempFiles: 89,
        tempSize: 45 * 1024 * 1024, // 45MB
        formattedTempSize: '45 MB',
        diskUsage: {
          total: 100 * 1024 * 1024 * 1024, // 100GB
          used: 65 * 1024 * 1024 * 1024, // 65GB
          available: 35 * 1024 * 1024 * 1024, // 35GB
          usagePercentage: 65
        },
        byType: {
          temp: { count: 89, size: 45 * 1024 * 1024 },
          report: { count: 78, size: 52 * 1024 * 1024 },
          certificate: { count: 45, size: 18 * 1024 * 1024 },
          export: { count: 33, size: 10 * 1024 * 1024 }
        }
      };

      const mockFiles: PdfFile[] = [
        {
          id: '1',
          filename: 'temp_report_20250112.pdf',
          size: 2.5 * 1024 * 1024,
          formattedSize: '2.5 MB',
          type: 'temp',
          category: 'reports',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          lastAccessed: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          accessCount: 3,
          isTemporary: true,
          expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          filename: 'student_grades_2024.pdf',
          size: 1.8 * 1024 * 1024,
          formattedSize: '1.8 MB',
          type: 'report',
          category: 'grades',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          accessCount: 12,
          isTemporary: false
        }
      ];

      const mockRecommendations = [
        '📁 89 archivos temporales detectados. Ejecutar limpieza automática.',
        '🗓️ 23 archivos antiguos (>30 días). Considerar archivado.',
        '⚡ Sistema con muchos archivos. Considerar optimización automática.'
      ];

      setStats(mockStats);
      setFiles(mockFiles);
      setRecommendations(mockRecommendations);
    } catch (error) {
      notification.error({
        message: 'Error',
        description: 'No se pudieron cargar los datos del gestor PDF'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewCleanup = async () => {
    try {
      setLoading(true);
      const result = await onCleanup({ ...cleanupOptions, dryRun: true });
      setPreviewResult(result);
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.message || 'Error al generar vista previa'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteCleanup = async () => {
    try {
      setLoading(true);
      const result = await onCleanup({ ...cleanupOptions, dryRun: false });
      
      notification.success({
        message: 'Limpieza Completada',
        description: `${result.filesRemoved} archivos eliminados, ${result.formattedSpaceFreed} liberados`
      });
      
      await loadData(); // Reload data
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.message || 'Error durante la limpieza'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    try {
      setLoading(true);
      const result = await onOptimize();
      
      if (result.success) {
        notification.success({
          message: 'Optimización Completada',
          description: `${result.optimizations.length} optimizaciones aplicadas`
        });
        await loadData();
      }
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.message || 'Error durante la optimización'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    try {
      const success = await onDeleteFile(fileId);
      if (success) {
        notification.success({
          message: 'Archivo Eliminado',
          description: 'El archivo se eliminó exitosamente'
        });
        await loadData();
      }
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.message || 'Error al eliminar archivo'
      });
    }
  };

  const getDiskUsageColor = (percentage: number) => {
    if (percentage > 90) return '#ff4d4f';
    if (percentage > 80) return '#fa8c16';
    if (percentage > 70) return '#faad14';
    return '#52c41a';
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'temp': return <ClockCircleOutlined style={{ color: '#fa8c16' }} />;
      case 'report': return <BarChartOutlined style={{ color: '#1890ff' }} />;
      case 'certificate': return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'export': return <DatabaseOutlined style={{ color: '#722ed1' }} />;
      default: return <FileTextOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const fileColumns = [
    {
      title: 'Archivo',
      dataIndex: 'filename',
      key: 'filename',
      render: (text: string, record: PdfFile) => (
        <Space>
          {getFileTypeIcon(record.type)}
          <div>
            <Text strong>{text}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.category} • {record.formattedSize}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string, record: PdfFile) => (
        <Space direction="vertical" size="small">
          <Tag color={record.isTemporary ? 'orange' : 'blue'}>
            {type.toUpperCase()}
          </Tag>
          {record.isTemporary && (
            <Text type="secondary" style={{ fontSize: '11px' }}>
              Expira: {new Date(record.expiresAt!).toLocaleDateString()}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Accesos',
      dataIndex: 'accessCount',
      key: 'accessCount',
      render: (count: number) => (
        <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
      ),
    },
    {
      title: 'Última Vez',
      dataIndex: 'lastAccessed',
      key: 'lastAccessed',
      render: (date: string) => (
        <Text type="secondary">
          {new Date(date).toLocaleString()}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: PdfFile) => (
        <Space>
          <Tooltip title="Ver detalles">
            <Button 
              type="text" 
              icon={<InfoCircleOutlined />} 
              size="small"
            />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar archivo?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => handleDeleteFile(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
          >
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderOverviewTab = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Statistic
            title="Total de Archivos"
            value={stats?.totalFiles || 0}
            prefix={<FileTextOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Tamaño Total"
            value={stats?.formattedTotalSize || '0 Bytes'}
            prefix={<DatabaseOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Archivos Temporales"
            value={stats?.tempFiles || 0}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: '#fa8c16' }}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Uso de Disco"
            value={`${stats?.diskUsage.usagePercentage || 0}%`}
            valueStyle={{ color: getDiskUsageColor(stats?.diskUsage.usagePercentage || 0) }}
          />
        </Col>
      </Row>

      <Card title="Uso de Almacenamiento" style={{ marginBottom: 16 }}>
        <Progress
          percent={stats?.diskUsage.usagePercentage || 0}
          strokeColor={getDiskUsageColor(stats?.diskUsage.usagePercentage || 0)}
          format={(percent) => `${percent}% utilizado`}
        />
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={8}>
            <Text type="secondary">Total: {formatBytes(stats?.diskUsage.total || 0)}</Text>
          </Col>
          <Col span={8}>
            <Text type="secondary">Usado: {formatBytes(stats?.diskUsage.used || 0)}</Text>
          </Col>
          <Col span={8}>
            <Text type="secondary">Disponible: {formatBytes(stats?.diskUsage.available || 0)}</Text>
          </Col>
        </Row>
      </Card>

      <Card title="Distribución por Tipo">
        <Row gutter={16}>
          {stats && Object.entries(stats.byType).map(([type, data]) => (
            <Col span={6} key={type}>
              <Card size="small">
                <Statistic
                  title={type.toUpperCase()}
                  value={data.count}
                  suffix="archivos"
                  prefix={getFileTypeIcon(type)}
                />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatBytes(data.size)}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {recommendations.length > 0 && (
        <Card title="Recomendaciones" style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {recommendations.map((rec, index) => (
              <Alert
                key={index}
                message={rec}
                type={rec.includes('CRÍTICO') ? 'error' : 
                      rec.includes('ADVERTENCIA') ? 'warning' : 'info'}
                showIcon={false}
                style={{ fontSize: '13px' }}
              />
            ))}
          </Space>
        </Card>
      )}
    </div>
  );

  const renderFilesTab = () => (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            placeholder="Filtrar por tipo"
            style={{ width: 120 }}
            allowClear
          >
            <Option value="temp">Temporales</Option>
            <Option value="report">Reportes</Option>
            <Option value="certificate">Certificados</Option>
            <Option value="export">Exportaciones</Option>
          </Select>
          <Select
            placeholder="Filtrar por categoría"
            style={{ width: 140 }}
            allowClear
          >
            <Option value="reports">Reportes</Option>
            <Option value="grades">Calificaciones</Option>
            <Option value="attendance">Asistencia</Option>
            <Option value="certificates">Certificados</Option>
          </Select>
        </Space>
      </div>

      <Table
        columns={fileColumns}
        dataSource={files}
        rowKey="id"
        size="small"
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true
        }}
        loading={loading}
      />
    </div>
  );

  const renderCleanupTab = () => (
    <div>
      <Card title="Configuración de Limpieza" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Edad máxima (días):</Text>
                <InputNumber
                  value={cleanupOptions.maxAge}
                  onChange={(value) => setCleanupOptions(prev => ({ ...prev, maxAge: value || 7 }))}
                  min={1}
                  max={365}
                  style={{ width: '100%', marginTop: 8 }}
                />
              </div>
              
              <div>
                <Text strong>Tipos de archivo:</Text>
                <Select
                  mode="multiple"
                  value={cleanupOptions.types}
                  onChange={(value) => setCleanupOptions(prev => ({ ...prev, types: value }))}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  <Option value="temp">Temporales</Option>
                  <Option value="report">Reportes</Option>
                  <Option value="export">Exportaciones</Option>
                </Select>
              </div>
            </Space>
          </Col>
          
          <Col span={12}>
            <Space direction="vertical">
              <Checkbox
                checked={cleanupOptions.removeUnused}
                onChange={(e) => setCleanupOptions(prev => ({ ...prev, removeUnused: e.target.checked }))}
              >
                Eliminar archivos no utilizados
              </Checkbox>
              
              <Checkbox
                checked={cleanupOptions.removeDuplicates}
                onChange={(e) => setCleanupOptions(prev => ({ ...prev, removeDuplicates: e.target.checked }))}
              >
                Eliminar archivos duplicados
              </Checkbox>
            </Space>
          </Col>
        </Row>
      </Card>

      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<InfoCircleOutlined />}
          onClick={handlePreviewCleanup}
          loading={loading}
        >
          Vista Previa
        </Button>
        
        <Button
          type="primary"
          icon={<ClearOutlined />}
          onClick={handleExecuteCleanup}
          loading={loading}
          danger
        >
          Ejecutar Limpieza
        </Button>
        
        <Button
          icon={<ThunderboltOutlined />}
          onClick={handleOptimize}
          loading={loading}
        >
          Optimizar Almacenamiento
        </Button>
      </Space>

      {previewResult && (
        <Card title="Vista Previa de Limpieza">
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Archivos a Eliminar"
                value={previewResult.filesRemoved}
                prefix={<DeleteOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Espacio a Liberar"
                value={previewResult.formattedSpaceFreed}
                prefix={<DatabaseOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Duración Estimada"
                value={`${Math.ceil(previewResult.duration / 1000)}s`}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
          </Row>
          
          <Divider />
          
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Detalles:</Text>
            <Text>• Archivos expirados: {previewResult.details.expiredFiles}</Text>
            <Text>• Archivos temporales: {previewResult.details.tempFiles}</Text>
            <Text>• Archivos no utilizados: {previewResult.details.unusedFiles}</Text>
            <Text>• Archivos duplicados: {previewResult.details.duplicateFiles}</Text>
          </Space>
        </Card>
      )}
    </div>
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal
      title="Gestor de Archivos PDF"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel}>
          Cerrar
        </Button>
      ]}
      width={1000}
      destroyOnClose
    >
      <Tabs defaultActiveKey="overview">
        <TabPane
          tab={
            <span>
              <BarChartOutlined />
              Resumen
            </span>
          }
          key="overview"
        >
          {renderOverviewTab()}
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <FolderOutlined />
              Archivos
            </span>
          }
          key="files"
        >
          {renderFilesTab()}
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <ClearOutlined />
              Limpieza
            </span>
          }
          key="cleanup"
        >
          {renderCleanupTab()}
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default PdfManagerModal;