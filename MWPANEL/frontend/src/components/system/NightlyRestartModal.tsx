import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Card,
  Switch,
  TimePicker,
  Checkbox,
  Button,
  Alert,
  Typography,
  Space,
  Statistic,
  Progress,
  Tag,
  Table,
  Row,
  Col,
  Divider,
  InputNumber,
  DatePicker,
  notification,
  Popconfirm,
  Tooltip,
  Badge,
  List,
} from 'antd';
import {
  ClockCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SettingOutlined,
  BarChartOutlined,
  CalendarOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  InfoCircleOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import {
  nightlyRestartService,
  NightlyRestartConfig,
  RestartResult,
  SystemStatusResponse,
  RestartHistoryResponse,
  SystemChecksResponse,
} from '@/services/nightlyRestartService';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface NightlyRestartModalProps {
  visible: boolean;
  onCancel: () => void;
}

const NightlyRestartModal: React.FC<NightlyRestartModalProps> = ({
  visible,
  onCancel,
}) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<NightlyRestartConfig | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusResponse | null>(null);
  const [restartHistory, setRestartHistory] = useState<RestartHistoryResponse | null>(null);
  const [systemChecks, setSystemChecks] = useState<SystemChecksResponse | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (visible) {
      loadAllData();
    }
  }, [visible]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [configData, statusData, historyData] = await Promise.all([
        nightlyRestartService.getRestartConfig(),
        nightlyRestartService.getSystemStatus(),
        nightlyRestartService.getRestartHistory(20),
      ]);
      
      setConfig(configData);
      setSystemStatus(statusData);
      setRestartHistory(historyData);
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: 'No se pudieron cargar los datos del sistema'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemChecks = async () => {
    try {
      setLoading(true);
      const checksData = await nightlyRestartService.testSystemChecks();
      setSystemChecks(checksData);
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: 'No se pudieron ejecutar las verificaciones del sistema'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = async (newConfig: Partial<NightlyRestartConfig>) => {
    if (!config) return;

    try {
      setLoading(true);
      const updatedConfig = { ...config, ...newConfig };
      
      // Validar configuración
      const validation = nightlyRestartService.validateRestartConfig(updatedConfig);
      if (!validation.isValid) {
        notification.error({
          message: 'Configuración inválida',
          description: validation.errors.join(', ')
        });
        return;
      }

      await nightlyRestartService.updateRestartConfig(newConfig);
      setConfig(updatedConfig);
      
      notification.success({
        message: 'Configuración actualizada',
        description: 'La configuración del reinicio nocturno se ha actualizado exitosamente'
      });
      
      // Recargar estado del sistema
      const statusData = await nightlyRestartService.getSystemStatus();
      setSystemStatus(statusData);
      
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.message || 'Error al actualizar la configuración'
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerManualRestart = async () => {
    try {
      setLoading(true);
      
      notification.info({
        message: 'Reinicio iniciado',
        description: 'El reinicio manual del sistema ha comenzado. Esto puede tomar varios minutos.',
        duration: 10
      });

      const result = await nightlyRestartService.triggerManualRestart('Reinicio manual desde panel de administración');
      
      if (result.success) {
        notification.success({
          message: 'Reinicio completado',
          description: `Reinicio exitoso en ${nightlyRestartService.formatDuration(result.duration)}`
        });
      } else {
        notification.error({
          message: 'Reinicio fallido',
          description: `El reinicio falló: ${result.errors.join(', ')}`
        });
      }
      
      // Recargar datos
      await loadAllData();
      
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.message || 'Error al ejecutar reinicio manual'
      });
    } finally {
      setLoading(false);
    }
  };

  const disableForDate = async (date: string) => {
    try {
      await nightlyRestartService.disableRestartForDate(date);
      notification.success({
        message: 'Fecha excluida',
        description: `Reinicio deshabilitado para ${date}`
      });
      
      // Recargar configuración
      const configData = await nightlyRestartService.getRestartConfig();
      setConfig(configData);
      
    } catch (error: any) {
      notification.error({
        message: 'Error',
        description: error.message || 'Error al deshabilitar fecha'
      });
    }
  };

  const getDayCheckboxes = () => {
    const days = [
      { value: 1, label: 'Lunes' },
      { value: 2, label: 'Martes' },
      { value: 3, label: 'Miércoles' },
      { value: 4, label: 'Jueves' },
      { value: 5, label: 'Viernes' },
      { value: 6, label: 'Sábado' },
      { value: 0, label: 'Domingo' },
    ];

    return (
      <Checkbox.Group
        value={config?.daysOfWeek || []}
        onChange={(values) => updateConfig({ daysOfWeek: values as number[] })}
      >
        <Row gutter={[16, 8]}>
          {days.map(day => (
            <Col span={8} key={day.value}>
              <Checkbox value={day.value}>{day.label}</Checkbox>
            </Col>
          ))}
        </Row>
      </Checkbox.Group>
    );
  };

  const historyColumns = [
    {
      title: 'Fecha',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => (
        <Text>{new Date(timestamp).toLocaleString()}</Text>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'success',
      key: 'success',
      render: (success: boolean) => (
        <Tag color={success ? 'green' : 'red'}>
          {success ? 'Exitoso' : 'Fallido'}
        </Tag>
      ),
    },
    {
      title: 'Duración',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => (
        <Text>{nightlyRestartService.formatDuration(duration)}</Text>
      ),
    },
    {
      title: 'Detalles',
      key: 'details',
      render: (_: any, record: RestartResult) => (
        <Space>
          <Tooltip title={`${record.logs.length} logs`}>
            <Badge count={record.logs.length} showZero>
              <InfoCircleOutlined />
            </Badge>
          </Tooltip>
          {record.errors.length > 0 && (
            <Tooltip title={`${record.errors.length} errores`}>
              <Badge count={record.errors.length}>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
              </Badge>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const renderOverviewTab = () => (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Statistic
            title="Estado del Sistema"
            value={systemStatus?.systemHealth.healthy ? 'Saludable' : 'Con problemas'}
            valueStyle={{ 
              color: nightlyRestartService.getSystemHealthColor(systemStatus?.systemHealth.healthy || false) 
            }}
            prefix={systemStatus?.systemHealth.healthy ? <CheckCircleOutlined /> : <WarningOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Reinicio Nocturno"
            value={config?.enabled ? 'Habilitado' : 'Deshabilitado'}
            valueStyle={{ color: config?.enabled ? '#52c41a' : '#fa8c16' }}
            prefix={config?.enabled ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Próximo Reinicio"
            value={nightlyRestartService.getNextRestartText(
              systemStatus?.nextScheduledRestart || null, 
              config || {} as NightlyRestartConfig
            )}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="Último Resultado"
            value={nightlyRestartService.getRestartStatusText(systemStatus?.lastRestart || null)}
            valueStyle={{ 
              color: nightlyRestartService.getRestartStatusColor(systemStatus?.lastRestart || null) 
            }}
            prefix={<HistoryOutlined />}
          />
        </Col>
      </Row>

      {systemStatus?.isRestartInProgress && (
        <Alert
          message="Reinicio en progreso"
          description="El sistema se está reiniciando automáticamente. Por favor espere..."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {systemStatus?.systemHealth && !systemStatus.systemHealth.healthy && (
        <Alert
          message="Problemas de salud del sistema"
          description={
            <div>
              <Text>Se han detectado problemas que pueden afectar el reinicio:</Text>
              <ul style={{ marginTop: 8 }}>
                {systemStatus.systemHealth.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title="Configuración Actual" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Horario programado:</Text>
                <br />
                <Text>{config?.scheduleTime || 'No configurado'}</Text>
              </div>
              <div>
                <Text strong>Días activos:</Text>
                <br />
                <Text>{nightlyRestartService.getDaysOfWeekString(config?.daysOfWeek || [])}</Text>
              </div>
              <div>
                <Text strong>Backup automático:</Text>
                <br />
                <Tag color={config?.performBackup ? 'green' : 'red'}>
                  {config?.performBackup ? 'Habilitado' : 'Deshabilitado'}
                </Tag>
              </div>
            </Space>
          </Col>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Validación de servicios:</Text>
                <br />
                <Tag color={config?.validateServices ? 'green' : 'red'}>
                  {config?.validateServices ? 'Habilitada' : 'Deshabilitada'}
                </Tag>
              </div>
              <div>
                <Text strong>Intentos máximos:</Text>
                <br />
                <Text>{config?.maxRestartAttempts || 3}</Text>
              </div>
              <div>
                <Text strong>Timeout de verificación:</Text>
                <br />
                <Text>{((config?.healthCheckTimeout || 30000) / 1000)} segundos</Text>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {restartHistory && (
        <Card title="Resumen de Historial">
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Total de Reinicios"
                value={restartHistory.summary.totalRestarts}
                prefix={<ReloadOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Tasa de Éxito"
                value={restartHistory.summary.totalRestarts > 0 
                  ? Math.round((restartHistory.summary.successfulRestarts / restartHistory.summary.totalRestarts) * 100)
                  : 0}
                suffix="%"
                valueStyle={{ color: restartHistory.summary.successfulRestarts > restartHistory.summary.failedRestarts ? '#52c41a' : '#ff4d4f' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Duración Promedio"
                value={nightlyRestartService.formatDuration(restartHistory.summary.averageDuration)}
                prefix={<ClockCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Fallos"
                value={restartHistory.summary.failedRestarts}
                valueStyle={{ color: restartHistory.summary.failedRestarts > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<WarningOutlined />}
              />
            </Col>
          </Row>
        </Card>
      )}

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Space>
          <Button
            type="primary"
            icon={<SettingOutlined />}
            onClick={() => setActiveTab('configuration')}
          >
            Configurar Reinicio
          </Button>
          <Button
            icon={<BarChartOutlined />}
            onClick={() => setActiveTab('monitoring')}
          >
            Ver Monitoreo
          </Button>
          <Popconfirm
            title="¿Ejecutar reinicio manual?"
            description="Esto reiniciará todo el sistema. ¿Continuar?"
            onConfirm={triggerManualRestart}
            okText="Sí, reiniciar"
            cancelText="Cancelar"
          >
            <Button
              danger
              icon={<ReloadOutlined />}
              loading={loading}
              disabled={systemStatus?.isRestartInProgress}
            >
              Reinicio Manual
            </Button>
          </Popconfirm>
        </Space>
      </div>
    </div>
  );

  const renderConfigurationTab = () => (
    <div>
      <Card title="Configuración General" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Habilitar reinicio nocturno automático:</Text>
            <br />
            <Switch
              checked={config?.enabled || false}
              onChange={(enabled) => updateConfig({ enabled })}
              loading={loading}
            />
            <Text type="secondary" style={{ marginLeft: 8 }}>
              {config?.enabled ? 'Reinicio automático activado' : 'Reinicio automático desactivado'}
            </Text>
          </div>

          <Divider />

          <div>
            <Text strong>Horario de reinicio:</Text>
            <br />
            <TimePicker
              value={config?.scheduleTime ? dayjs(config.scheduleTime, 'HH:mm') : null}
              format="HH:mm"
              onChange={(time) => {
                if (time) {
                  updateConfig({ scheduleTime: time.format('HH:mm') });
                }
              }}
              disabled={loading}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ marginLeft: 8, display: 'block', marginTop: 4 }}>
              Se recomienda entre 2:00 AM y 4:00 AM para menor impacto
            </Text>
          </div>

          <Divider />

          <div>
            <Text strong>Días de la semana activos:</Text>
            <div style={{ marginTop: 8 }}>
              {getDayCheckboxes()}
            </div>
            <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
              Selecciona los días en que se ejecutará el reinicio automático
            </Text>
          </div>
        </Space>
      </Card>

      <Card title="Opciones de Reinicio" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Backup automático antes del reinicio:</Text>
                <br />
                <Switch
                  checked={config?.performBackup || false}
                  onChange={(performBackup) => updateConfig({ performBackup })}
                  loading={loading}
                />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {config?.performBackup ? 'Se creará backup' : 'Sin backup automático'}
                </Text>
              </div>

              <div style={{ marginTop: 16 }}>
                <Text strong>Validar servicios post-reinicio:</Text>
                <br />
                <Switch
                  checked={config?.validateServices || false}
                  onChange={(validateServices) => updateConfig({ validateServices })}
                  loading={loading}
                />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  {config?.validateServices ? 'Verificación habilitada' : 'Sin verificación'}
                </Text>
              </div>
            </Space>
          </Col>
          <Col span={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>Intentos máximos de reinicio:</Text>
                <br />
                <InputNumber
                  value={config?.maxRestartAttempts || 3}
                  min={1}
                  max={10}
                  onChange={(value) => updateConfig({ maxRestartAttempts: value || 3 })}
                  disabled={loading}
                  style={{ marginTop: 8 }}
                />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  intentos
                </Text>
              </div>

              <div style={{ marginTop: 16 }}>
                <Text strong>Timeout de verificación (segundos):</Text>
                <br />
                <InputNumber
                  value={((config?.healthCheckTimeout || 30000) / 1000)}
                  min={5}
                  max={300}
                  onChange={(value) => updateConfig({ healthCheckTimeout: (value || 30) * 1000 })}
                  disabled={loading}
                  style={{ marginTop: 8 }}
                />
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  segundos
                </Text>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card title="Fechas Excluidas">
        <div style={{ marginBottom: 16 }}>
          <Text>Deshabilitar reinicio para una fecha específica:</Text>
          <br />
          <Space style={{ marginTop: 8 }}>
            <DatePicker
              placeholder="Seleccionar fecha"
              onChange={(date) => {
                if (date) {
                  disableForDate(date.format('YYYY-MM-DD'));
                }
              }}
              disabledDate={(current) => {
                return current && current < dayjs().startOf('day');
              }}
            />
            <Text type="secondary">
              (Útil para días festivos o mantenimientos especiales)
            </Text>
          </Space>
        </div>

        {config?.excludedDays && config.excludedDays.length > 0 && (
          <div>
            <Text strong>Fechas actualmente excluidas:</Text>
            <div style={{ marginTop: 8 }}>
              {config.excludedDays.map(date => (
                <Tag
                  key={date}
                  closable
                  onClose={() => {
                    const newExcludedDays = config.excludedDays.filter(d => d !== date);
                    updateConfig({ excludedDays: newExcludedDays });
                  }}
                  style={{ marginBottom: 4 }}
                >
                  {date}
                </Tag>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderMonitoringTab = () => (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ThunderboltOutlined />}
          onClick={loadSystemChecks}
          loading={loading}
        >
          Ejecutar Verificaciones
        </Button>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          Verificar estado del sistema sin reiniciar
        </Text>
      </div>

      {systemChecks && (
        <Card title="Estado Actual del Sistema" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title="Recursos del Sistema">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Uso de disco:</Text>
                    <Progress
                      percent={systemChecks.diskSpace.percentage}
                      strokeColor={nightlyRestartService.getDiskUsageColor(systemChecks.diskSpace.percentage)}
                      format={() => `${systemChecks.diskSpace.percentage}%`}
                    />
                    <Text type="secondary">
                      {nightlyRestartService.formatBytes(systemChecks.diskSpace.available)} disponible
                    </Text>
                  </div>
                  <div>
                    <Text strong>Uso de memoria:</Text>
                    <Progress
                      percent={systemChecks.memoryUsage.percentage}
                      strokeColor={nightlyRestartService.getMemoryUsageColor(systemChecks.memoryUsage.percentage)}
                      format={() => `${systemChecks.memoryUsage.percentage.toFixed(1)}%`}
                    />
                  </div>
                </Space>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Estado de Servicios">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text>Base de datos: </Text>
                    <Tag color={systemChecks.services.database ? 'green' : 'red'}>
                      {systemChecks.services.database ? 'Conectada' : 'Desconectada'}
                    </Tag>
                  </div>
                  <div>
                    <Text>Redis: </Text>
                    <Tag color={systemChecks.services.redis ? 'green' : 'red'}>
                      {systemChecks.services.redis ? 'Conectado' : 'Desconectado'}
                    </Tag>
                  </div>
                  <div>
                    <Text>API: </Text>
                    <Tag color={systemChecks.services.api ? 'green' : 'red'}>
                      {systemChecks.services.api ? 'Respondiendo' : 'No responde'}
                    </Tag>
                  </div>
                  <div>
                    <Text>Frontend: </Text>
                    <Tag color={systemChecks.services.frontend ? 'green' : 'red'}>
                      {systemChecks.services.frontend ? 'Sirviendo' : 'No disponible'}
                    </Tag>
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>

          {systemChecks.recommendations.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <Text strong>Recomendaciones:</Text>
              <List
                size="small"
                dataSource={systemChecks.recommendations}
                renderItem={item => (
                  <List.Item>
                    <Text>{item}</Text>
                  </List.Item>
                )}
                style={{ marginTop: 8 }}
              />
            </div>
          )}
        </Card>
      )}

      <Card title="Historial de Reinicios">
        <Table
          columns={historyColumns}
          dataSource={restartHistory?.history || []}
          rowKey="timestamp"
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true
          }}
          loading={loading}
        />
      </Card>
    </div>
  );

  return (
    <Modal
      title="Reinicio Automático Nocturno"
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
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
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
              <SettingOutlined />
              Configuración
            </span>
          }
          key="configuration"
        >
          {renderConfigurationTab()}
        </TabPane>
        
        <TabPane
          tab={
            <span>
              <DatabaseOutlined />
              Monitoreo
            </span>
          }
          key="monitoring"
        >
          {renderMonitoringTab()}
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default NightlyRestartModal;