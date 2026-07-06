import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Button,
  Space,
  Typography,
  Alert,
  Badge,
  Table,
  Select,
  DatePicker,
  Spin,
  message,
  Modal,
  Descriptions,
  Timeline,
  Tag,
  Tooltip,
} from 'antd';
import {
  DashboardOutlined,
  ReloadOutlined,
  SettingOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  BugOutlined,
  ReloadOutlined,
  DeleteOutlined,
  MonitorOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import { Line, Column, Gauge } from '@ant-design/plots';
import apiClient from '@services/apiClient';
import { formatNumber } from '@utils/numberFormat';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// Tipos para el sistema de monitoreo
interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    usage: number;
    available: number;
  };
  disk: {
    used: number;
    total: number;
    usage: number;
    available: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  uptime: number;
  timestamp: string;
}

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  activeConnections: number;
  cacheHitRate: number;
  databaseConnections: number;
  queueSize: number;
  timestamp: string;
}

interface Alert {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged';
  message: string;
  timestamp: string;
  category: string;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  category: string;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  uptime: number;
  lastCheck: string;
  responseTime?: number;
  error?: string;
}

const MonitoringDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertHistory, setAlertHistory] = useState<Alert[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [timeRange, setTimeRange] = useState('1h');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [isAlertModalVisible, setIsAlertModalVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchSystemMetrics = useCallback(async () => {
    try {
      const response = await apiClient.get('/monitoring/metrics/system', {
        params: { timeRange }
      });
      setSystemMetrics(response.data);
    } catch (error: any) {
      console.error('Error fetching system metrics:', error);
      message.error('Error al cargar métricas del sistema');
    }
  }, [timeRange]);

  const fetchPerformanceMetrics = useCallback(async () => {
    try {
      const response = await apiClient.get('/monitoring/metrics/performance', {
        params: { timeRange }
      });
      setPerformanceMetrics(response.data);
    } catch (error: any) {
      console.error('Error fetching performance metrics:', error);
      message.error('Error al cargar métricas de rendimiento');
    }
  }, [timeRange]);

  const fetchActiveAlerts = useCallback(async () => {
    try {
      const response = await apiClient.get('/monitoring/alerts/active');
      setActiveAlerts(response.data);
    } catch (error: any) {
      console.error('Error fetching active alerts:', error);
    }
  }, []);

  const fetchAlertRules = useCallback(async () => {
    try {
      const response = await apiClient.get('/monitoring/alerts/rules');
      setAlertRules(response.data);
    } catch (error: any) {
      console.error('Error fetching alert rules:', error);
    }
  }, []);

  const fetchAlertHistory = useCallback(async () => {
    try {
      const response = await apiClient.get('/monitoring/alerts/history');
      setAlertHistory(response.data);
    } catch (error: any) {
      console.error('Error fetching alert history:', error);
    }
  }, []);

  const checkServiceHealth = useCallback(async () => {
    try {
      const response = await apiClient.get('/monitoring/health');
      // Simular múltiples servicios basados en la respuesta del health check
      const healthData = response.data;
      const mockServices: ServiceStatus[] = [
        {
          name: 'API Backend',
          status: healthData.status === 'healthy' ? 'healthy' : 'unhealthy',
          uptime: healthData.uptime || 0,
          lastCheck: new Date().toISOString(),
          responseTime: 45,
        },
        {
          name: 'Database',
          status: 'healthy',
          uptime: healthData.uptime || 0,
          lastCheck: new Date().toISOString(),
          responseTime: 12,
        },
        {
          name: 'Redis Cache',
          status: 'healthy',
          uptime: healthData.uptime || 0,
          lastCheck: new Date().toISOString(),
          responseTime: 3,
        },
        {
          name: 'File Storage',
          status: 'healthy',
          uptime: healthData.uptime || 0,
          lastCheck: new Date().toISOString(),
          responseTime: 28,
        },
      ];
      setServices(mockServices);
    } catch (error: any) {
      console.error('Error checking service health:', error);
      // En caso de error, marcar todos los servicios como unhealthy
      setServices([
        { name: 'API Backend', status: 'unhealthy', uptime: 0, lastCheck: new Date().toISOString(), error: error.message },
        { name: 'Database', status: 'unhealthy', uptime: 0, lastCheck: new Date().toISOString() },
        { name: 'Redis Cache', status: 'unhealthy', uptime: 0, lastCheck: new Date().toISOString() },
        { name: 'File Storage', status: 'unhealthy', uptime: 0, lastCheck: new Date().toISOString() },
      ]);
    }
  }, []);

  const handleClearCache = async () => {
    try {
      await apiClient.post('/monitoring/diagnostics/clear-cache');
      message.success('Cache limpiado correctamente');
    } catch (error: any) {
      console.error('Error clearing cache:', error);
      message.error('Error al limpiar el cache');
    }
  };

  const handleRestartService = async (serviceName: string) => {
    Modal.confirm({
      title: `Reiniciar ${serviceName}`,
      content: `¿Está seguro de que desea reiniciar el servicio ${serviceName}?`,
      okText: 'Confirmar',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await apiClient.post(`/monitoring/diagnostics/restart/${serviceName.toLowerCase().replace(' ', '-')}`);
          message.success(`Servicio ${serviceName} reiniciado correctamente`);
          checkServiceHealth();
        } catch (error: any) {
          console.error('Error restarting service:', error);
          message.error(`Error al reiniciar el servicio ${serviceName}`);
        }
      },
    });
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await apiClient.post(`/monitoring/alerts/${alertId}/resolve`);
      message.success('Alerta resuelta correctamente');
      fetchActiveAlerts();
      fetchAlertHistory();
    } catch (error: any) {
      console.error('Error resolving alert:', error);
      message.error('Error al resolver la alerta');
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ff4d4f';
      case 'high': return '#fa8c16';
      case 'medium': return '#fadb14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'unhealthy': return 'error';
      case 'degraded': return 'warning';
      default: return 'default';
    }
  };

  const refreshData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchSystemMetrics(),
      fetchPerformanceMetrics(),
      fetchActiveAlerts(),
      checkServiceHealth(),
    ]).finally(() => setLoading(false));
  }, [fetchSystemMetrics, fetchPerformanceMetrics, fetchActiveAlerts, checkServiceHealth]);

  useEffect(() => {
    refreshData();
    fetchAlertRules();
    fetchAlertHistory();
  }, [refreshData, fetchAlertRules, fetchAlertHistory]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        refreshData();
      }, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshData]);

  const alertColumns = [
    {
      title: 'Severidad',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => (
        <Badge
          color={getSeverityColor(severity)}
          text={severity.toUpperCase()}
        />
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Mensaje',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'active' ? 'red' : status === 'resolved' ? 'green' : 'blue'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => new Date(timestamp).toLocaleString(),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_, record: Alert) => (
        <Space>
          <Button
            size="small"
            type="link"
            onClick={() => {
              setSelectedAlert(record);
              setIsAlertModalVisible(true);
            }}
          >
            Detalles
          </Button>
          {record.status === 'active' && (
            <Button
              size="small"
              type="link"
              onClick={() => handleResolveAlert(record.id)}
            >
              Resolver
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={2}>
            <MonitorOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Dashboard de Monitoreo del Sistema
          </Title>
          <Text type="secondary">
            Supervisión en tiempo real del rendimiento y salud del sistema
          </Text>
        </div>
        <Space>
          <Select
            value={timeRange}
            onChange={setTimeRange}
            style={{ width: 120 }}
          >
            <Option value="1h">1 hora</Option>
            <Option value="6h">6 horas</Option>
            <Option value="24h">24 horas</Option>
            <Option value="7d">7 días</Option>
          </Select>
          <Button
            type={autoRefresh ? 'primary' : 'default'}
            icon={<ReloadOutlined spin={autoRefresh} />}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto-refresh
          </Button>
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={refreshData}
            loading={loading}
          >
            Actualizar
          </Button>
        </Space>
      </div>

      {/* Estado de servicios críticos */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {services.map((service) => (
          <Col xs={24} sm={12} md={6} key={service.name}>
            <Card size="small">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <Badge status={getStatusColor(service.status)} />
                    <Text strong>{service.name}</Text>
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Uptime: {formatUptime(service.uptime)}
                    </Text>
                  </div>
                  {service.responseTime && (
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Latencia: {service.responseTime}ms
                      </Text>
                    </div>
                  )}
                </div>
                {service.status === 'unhealthy' && (
                  <Button
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => handleRestartService(service.name)}
                  >
                    Reiniciar
                  </Button>
                )}
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Métricas del sistema */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="CPU"
              value={systemMetrics?.cpu?.usage || 0}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ 
                color: (systemMetrics?.cpu?.usage || 0) > 80 ? '#cf1322' : '#3f8600' 
              }}
              formatter={(value) => formatNumber(Number(value))}
            />
            <Progress 
              percent={systemMetrics?.cpu?.usage || 0} 
              showInfo={false} 
              size="small"
              strokeColor={(systemMetrics?.cpu?.usage || 0) > 80 ? '#cf1322' : '#3f8600'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Memoria"
              value={systemMetrics?.memory?.usage || 0}
              suffix="%"
              prefix={<DatabaseOutlined />}
              valueStyle={{ 
                color: (systemMetrics?.memory?.usage || 0) > 80 ? '#cf1322' : '#3f8600' 
              }}
              formatter={(value) => formatNumber(Number(value))}
            />
            <Progress 
              percent={systemMetrics?.memory?.usage || 0} 
              showInfo={false} 
              size="small"
              strokeColor={(systemMetrics?.memory?.usage || 0) > 80 ? '#cf1322' : '#3f8600'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Disco"
              value={systemMetrics?.disk?.usage || 0}
              suffix="%"
              prefix={<CloudServerOutlined />}
              valueStyle={{ 
                color: (systemMetrics?.disk?.usage || 0) > 80 ? '#cf1322' : '#3f8600' 
              }}
              formatter={(value) => formatNumber(Number(value))}
            />
            <Progress 
              percent={systemMetrics?.disk?.usage || 0} 
              showInfo={false} 
              size="small"
              strokeColor={(systemMetrics?.disk?.usage || 0) > 80 ? '#cf1322' : '#3f8600'}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Cache Hit Rate"
              value={performanceMetrics?.cacheHitRate || 0}
              suffix="%"
              prefix={<DashboardOutlined />}
              valueStyle={{ 
                color: (performanceMetrics?.cacheHitRate || 0) > 80 ? '#3f8600' : '#cf1322'
              }}
              formatter={(value) => formatNumber(Number(value))}
            />
            <Progress 
              percent={performanceMetrics?.cacheHitRate || 0} 
              showInfo={false} 
              size="small"
              strokeColor={(performanceMetrics?.cacheHitRate || 0) > 80 ? '#3f8600' : '#cf1322'}
            />
          </Card>
        </Col>
      </Row>

      {/* Métricas de rendimiento */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tiempo de Respuesta"
              value={performanceMetrics?.responseTime || 0}
              suffix="ms"
              prefix={<BarChartOutlined />}
              valueStyle={{ 
                color: (performanceMetrics?.responseTime || 0) > 1000 ? '#cf1322' : '#3f8600' 
              }}
              formatter={(value) => formatNumber(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Throughput"
              value={performanceMetrics?.throughput || 0}
              suffix="req/s"
              prefix={<ThunderboltOutlined />}
              formatter={(value) => formatNumber(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tasa de Error"
              value={performanceMetrics?.errorRate || 0}
              suffix="%"
              prefix={<BugOutlined />}
              valueStyle={{ 
                color: (performanceMetrics?.errorRate || 0) > 5 ? '#cf1322' : '#3f8600' 
              }}
              formatter={(value) => formatNumber(Number(value))}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Conexiones Activas"
              value={performanceMetrics?.activeConnections || 0}
              prefix={<CloudServerOutlined />}
              formatter={(value) => formatNumber(Number(value))}
            />
          </Card>
        </Col>
      </Row>

      {/* Alertas activas */}
      {activeAlerts.length > 0 && (
        <Alert
          message={`${activeAlerts.length} Alerta(s) Activa(s)`}
          description="Se han detectado problemas que requieren atención inmediata."
          type="warning"
          showIcon
          style={{ marginBottom: '24px' }}
          action={
            <Space>
              <Button size="small" type="primary" danger>
                Ver Todas
              </Button>
            </Space>
          }
        />
      )}

      {/* Acciones del sistema */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} lg={8}>
          <Card title="Acciones del Sistema" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                block
                icon={<DeleteOutlined />}
                onClick={handleClearCache}
              >
                Limpiar Cache
              </Button>
              <Button
                block
                icon={<BugOutlined />}
                onClick={() => message.info('Ejecutando diagnósticos...')}
              >
                Ejecutar Diagnósticos
              </Button>
              <Button
                block
                icon={<SettingOutlined />}
                onClick={() => message.info('Configurando monitoreo...')}
              >
                Configurar Monitoreo
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={16}>
          <Card title="Resumen de Alertas" size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Críticas"
                  value={activeAlerts.filter(a => a.severity === 'critical').length}
                  valueStyle={{ color: '#cf1322' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Altas"
                  value={activeAlerts.filter(a => a.severity === 'high').length}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Medias"
                  value={activeAlerts.filter(a => a.severity === 'medium').length}
                  valueStyle={{ color: '#fadb14' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Bajas"
                  value={activeAlerts.filter(a => a.severity === 'low').length}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Historial de alertas */}
      <Card title="Historial de Alertas Recientes">
        <Table
          columns={alertColumns}
          dataSource={[...activeAlerts, ...alertHistory.slice(0, 10)]}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showQuickJumper: false,
          }}
        />
      </Card>

      {/* Modal de detalles de alerta */}
      <Modal
        title="Detalles de la Alerta"
        open={isAlertModalVisible}
        onCancel={() => setIsAlertModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsAlertModalVisible(false)}>
            Cerrar
          </Button>,
          selectedAlert?.status === 'active' && (
            <Button
              key="resolve"
              type="primary"
              onClick={() => {
                if (selectedAlert) {
                  handleResolveAlert(selectedAlert.id);
                  setIsAlertModalVisible(false);
                }
              }}
            >
              Resolver
            </Button>
          ),
        ]}
        width={600}
      >
        {selectedAlert && (
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Nombre">{selectedAlert.name}</Descriptions.Item>
            <Descriptions.Item label="Severidad">
              <Badge
                color={getSeverityColor(selectedAlert.severity)}
                text={selectedAlert.severity.toUpperCase()}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={selectedAlert.status === 'active' ? 'red' : selectedAlert.status === 'resolved' ? 'green' : 'blue'}>
                {selectedAlert.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Categoría">{selectedAlert.category}</Descriptions.Item>
            <Descriptions.Item label="Timestamp">
              {new Date(selectedAlert.timestamp).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Mensaje">{selectedAlert.message}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default MonitoringDashboard;