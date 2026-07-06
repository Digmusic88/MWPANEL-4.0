import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Modal,
  Progress,
  message,
  Alert,
  Row,
  Col,
  Statistic,
  Popconfirm,
  Typography,
  Descriptions,
} from 'antd';
import {
  CloudDownloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;

interface BackupInfo {
  filename: string;
  size: string;
  created: string;
  type: 'full';
  localPath: string;
}

interface BackupStatus {
  isRunning: boolean;
  lastBackup?: string;
  totalBackups: number;
  totalSize: string;
  recentBackups: BackupInfo[];
}

interface TestResults {
  integrity: boolean;
  database: boolean;
  uploads: boolean;
  config: boolean;
  errors: string[];
}

const BackupManagementPage: React.FC = () => {
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState<string | null>(null);
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [testModalVisible, setTestModalVisible] = useState(false);

  const fetchBackupStatus = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/settings/backup/status');
      setBackupStatus(response.data);
    } catch (error: any) {
      console.error('Error fetching backup status:', error);
      if (error?.response?.status === 401) {
        message.error('Sesión expirada. Por favor, cierre sesión y vuelva a iniciar sesión.');
      } else {
        message.error('Error al obtener estado de backups');
      }
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/settings/backup/create', {});
      message.success(`Backup creado: ${response.data.filename}`);
      fetchBackupStatus();
    } catch (error: any) {
      console.error('Error creating backup:', error);
      if (error?.response?.status === 401) {
        message.error('Sesión expirada. Por favor, cierre sesión y vuelva a iniciar sesión.');
      } else {
        message.error(`Error: ${error?.response?.data?.message || 'Error de conexión al crear backup'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (filename: string) => {
    try {
      await apiClient.delete(`/settings/backup/${filename}`);
      message.success(`Backup eliminado: ${filename}`);
      fetchBackupStatus();
    } catch (error: any) {
      console.error('Error deleting backup:', error);
      if (error?.response?.status === 401) {
        message.error('Sesión expirada. Por favor, cierre sesión y vuelva a iniciar sesión.');
      } else {
        message.error(`Error: ${error?.response?.data?.message || 'Error de conexión al eliminar backup'}`);
      }
    }
  };

  const restoreBackup = async (filename: string) => {
    setRestoreLoading(filename);
    try {
      const response = await apiClient.post(`/settings/backup/restore/${filename}`);
      message.success(response.data.message);
      Modal.info({
        title: 'Restauración Completada',
        content: (
          <div>
            <p>{response.data.message}</p>
            <Alert
              message="Reinicio Requerido"
              description="Para que los cambios tomen efecto, se recomienda reiniciar el sistema."
              type="warning"
              showIcon
            />
          </div>
        ),
      });
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      if (error?.response?.status === 401) {
        message.error('Sesión expirada. Por favor, cierre sesión y vuelva a iniciar sesión.');
      } else {
        message.error(`Error: ${error?.response?.data?.message || 'Error de conexión al restaurar backup'}`);
      }
    } finally {
      setRestoreLoading(null);
    }
  };

  const testRestoreBackup = async (filename: string) => {
    setTestLoading(filename);
    try {
      const response = await apiClient.post(`/settings/backup/test-restore/${filename}`);
      setTestResults(response.data.testResults);
      setTestModalVisible(true);
      message.success('Test de restauración completado');
    } catch (error: any) {
      console.error('Error testing backup restore:', error);
      if (error?.response?.status === 401) {
        message.error('Sesión expirada. Por favor, cierre sesión y vuelva a iniciar sesión.');
      } else {
        message.error(`Error: ${error?.response?.data?.message || 'Error de conexión al probar restauración'}`);
      }
    } finally {
      setTestLoading(null);
    }
  };

  const cleanupBackups = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/settings/backup/cleanup');
      message.success(response.data.message);
      fetchBackupStatus();
    } catch (error: any) {
      console.error('Error cleaning backups:', error);
      if (error?.response?.status === 401) {
        message.error('Sesión expirada. Por favor, cierre sesión y vuelva a iniciar sesión.');
      } else {
        message.error(`Error: ${error?.response?.data?.message || 'Error de conexión al limpiar backups'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackupStatus();
  }, []);

  const columns = [
    {
      title: 'Nombre del Archivo',
      dataIndex: 'filename',
      key: 'filename',
      render: (filename: string) => (
        <Text code>{filename}</Text>
      ),
    },
    {
      title: 'Tamaño',
      dataIndex: 'size',
      key: 'size',
      render: (size: string) => (
        <Tag color="blue">{size}</Tag>
      ),
    },
    {
      title: 'Fecha de Creación',
      dataIndex: 'created',
      key: 'created',
      render: (created: string) => (
        new Date(created).toLocaleString('es-ES')
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: () => (
        <Tag color="green">Completo</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: BackupInfo) => (
        <Space>
          <Tooltip title="Probar en Sandbox">
            <Button
              size="small"
              icon={<PlayCircleOutlined />}
              loading={testLoading === record.filename}
              onClick={() => testRestoreBackup(record.filename)}
            />
          </Tooltip>
          <Tooltip title="Restaurar Backup">
            <Popconfirm
              title="¿Restaurar este backup?"
              description="Esta acción sobrescribirá los datos actuales."
              onConfirm={() => restoreBackup(record.filename)}
              okText="Restaurar"
              cancelText="Cancelar"
            >
              <Button
                size="small"
                type="primary"
                icon={<CloudDownloadOutlined />}
                loading={restoreLoading === record.filename}
              />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="Eliminar Backup">
            <Popconfirm
              title="¿Eliminar este backup?"
              description="Esta acción no se puede deshacer."
              onConfirm={() => deleteBackup(record.filename)}
              okText="Eliminar"
              cancelText="Cancelar"
            >
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const getTestResultIcon = (result: boolean) => {
    return result ? (
      <CheckCircleOutlined style={{ color: '#52c41a' }} />
    ) : (
      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    );
  };

  return (
    <div className="p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Title level={2}>
          <SettingOutlined className="mr-2" />
          Gestión de Backups Locales
        </Title>

        {backupStatus && (
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Total de Backups"
                  value={backupStatus.totalBackups}
                  prefix={<CloudDownloadOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Tamaño Total"
                  value={backupStatus.totalSize}
                  prefix={<SettingOutlined />}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Último Backup"
                  value={backupStatus.lastBackup ? 
                    new Date(backupStatus.lastBackup).toLocaleDateString('es-ES') : 
                    'Ninguno'
                  }
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card>
                <Statistic
                  title="Estado"
                  value={backupStatus.isRunning ? 'Ejecutando' : 'Inactivo'}
                  valueStyle={{ color: backupStatus.isRunning ? '#f5222d' : '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>
        )}

        <Card
          title="Backups Disponibles"
          extra={
            <Space>
              <Button
                type="primary"
                icon={<CloudDownloadOutlined />}
                loading={loading}
                onClick={createBackup}
                disabled={backupStatus?.isRunning}
              >
                Crear Backup
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchBackupStatus}
                loading={loading}
              >
                Actualizar
              </Button>
              <Popconfirm
                title="¿Limpiar backups antiguos?"
                description="Se mantendrán solo los últimos 10 backups."
                onConfirm={cleanupBackups}
                okText="Limpiar"
                cancelText="Cancelar"
              >
                <Button
                  icon={<DeleteOutlined />}
                  loading={loading}
                >
                  Limpiar Antiguos
                </Button>
              </Popconfirm>
            </Space>
          }
        >
          {backupStatus?.isRunning && (
            <Alert
              message="Operación en Progreso"
              description="Se está ejecutando una operación de backup. Por favor espere."
              type="info"
              showIcon
              className="mb-4"
            />
          )}

          <Alert
            message="Información Importante"
            description="Los backups se almacenan localmente y se mantienen automáticamente solo los últimos 10. Asegúrese de tener respaldos externos para mayor seguridad."
            type="warning"
            showIcon
            className="mb-4"
          />

          <Table
            columns={columns}
            dataSource={backupStatus?.recentBackups || []}
            rowKey="filename"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
          />
        </Card>

        <Modal
          title="Resultados del Test de Restauración"
          open={testModalVisible}
          onCancel={() => setTestModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setTestModalVisible(false)}>
              Cerrar
            </Button>
          ]}
          width={600}
        >
          {testResults && (
            <div>
              <Descriptions bordered column={1}>
                <Descriptions.Item 
                  label={
                    <span>
                      {getTestResultIcon(testResults.integrity)} Integridad del Backup
                    </span>
                  }
                >
                  {testResults.integrity ? 'Válido' : 'Fallido'}
                </Descriptions.Item>
                <Descriptions.Item 
                  label={
                    <span>
                      {getTestResultIcon(testResults.database)} Base de Datos
                    </span>
                  }
                >
                  {testResults.database ? 'Válida' : 'Fallida'}
                </Descriptions.Item>
                <Descriptions.Item 
                  label={
                    <span>
                      {getTestResultIcon(testResults.uploads)} Archivos de Upload
                    </span>
                  }
                >
                  {testResults.uploads ? 'Presentes' : 'Ausentes'}
                </Descriptions.Item>
                <Descriptions.Item 
                  label={
                    <span>
                      {getTestResultIcon(testResults.config)} Configuración
                    </span>
                  }
                >
                  {testResults.config ? 'Presente' : 'Ausente'}
                </Descriptions.Item>
              </Descriptions>

              {testResults.errors.length > 0 && (
                <div className="mt-4">
                  <Title level={5}>Errores Encontrados:</Title>
                  <ul>
                    {testResults.errors.map((error, index) => (
                      <li key={index} style={{ color: '#ff4d4f' }}>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Alert
                message={
                  testResults.integrity && testResults.database
                    ? "✅ Backup válido para restauración"
                    : "⚠️ Backup con problemas - revisar antes de restaurar"
                }
                type={testResults.integrity && testResults.database ? "success" : "warning"}
                className="mt-4"
              />
            </div>
          )}
        </Modal>
      </motion.div>
    </div>
  );
};

export default BackupManagementPage;