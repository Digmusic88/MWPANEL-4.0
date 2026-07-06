import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Space,
  message,
  Tabs,
  Row,
  Col,
  Statistic,
  Tag,
  Tooltip,
  Popconfirm,
  Divider,
  Alert,
  Typography
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
  SwapOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationTriangleOutlined
} from '@ant-design/icons';
import { unifiedGradingService } from '../../services/unifiedGradingService';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { Option } = Select;

interface GradingScale {
  id: string;
  name: string;
  type: 'numeric' | 'letter' | 'rubric' | 'custom';
  description: string;
  minValue: number;
  maxValue: number;
  steps: Array<{
    min: number;
    max: number;
    label: string;
    description?: string;
  }>;
}

interface ScaleFormData {
  name: string;
  type: 'numeric' | 'letter' | 'rubric' | 'custom';
  description: string;
  minValue: number;
  maxValue: number;
  steps: Array<{
    min: number;
    max: number;
    label: string;
    description?: string;
  }>;
}

/**
 * 🎯 COMPONENTE PRINCIPAL - GESTIÓN DE ESCALAS DE CALIFICACIÓN
 * Panel administrativo completo para crear, editar y gestionar escalas personalizadas
 */
const UnifiedGradingManager: React.FC = () => {
  // Estados principales
  const [scales, setScales] = useState<GradingScale[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingScale, setEditingScale] = useState<GradingScale | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Formulario
  const [form] = Form.useForm<ScaleFormData>();
  const [formSteps, setFormSteps] = useState<Array<{
    min: number;
    max: number;
    label: string;
    description?: string;
  }>>([]);

  // Cargar datos iniciales
  useEffect(() => {
    loadScales();
    loadSystemHealth();
    loadAnalytics();
  }, []);

  /**
   * 📊 CARGA DE DATOS
   */
  const loadScales = async () => {
    setLoading(true);
    try {
      const scalesData = await unifiedGradingService.getAvailableScales();
      setScales(scalesData);
    } catch (error: any) {
      message.error(`Error cargando escalas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const health = await unifiedGradingService.checkSystemHealth();
      setSystemHealth(health);
    } catch (error: any) {
      console.error('Error verificando salud del sistema:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      const analyticsData = await unifiedGradingService.getSystemAnalytics();
      setAnalytics(analyticsData);
    } catch (error: any) {
      console.error('Error cargando analytics:', error);
    }
  };

  /**
   * 🔧 GESTIÓN DE FORMULARIOS
   */
  const showCreateModal = () => {
    setEditingScale(null);
    setModalVisible(true);
    setFormSteps([]);
    form.resetFields();
  };

  const showEditModal = (scale: GradingScale) => {
    setEditingScale(scale);
    setModalVisible(true);
    setFormSteps(scale.steps);
    form.setFieldsValue({
      name: scale.name,
      type: scale.type,
      description: scale.description,
      minValue: scale.minValue,
      maxValue: scale.maxValue
    });
  };

  const handleModalCancel = () => {
    setModalVisible(false);
    setEditingScale(null);
    setFormSteps([]);
    form.resetFields();
  };

  const handleSubmit = async (values: ScaleFormData) => {
    try {
      setLoading(true);

      // Usar los steps del estado local
      const scaleData = {
        ...values,
        steps: formSteps
      };

      if (editingScale) {
        // TODO: Implementar edición cuando esté disponible en backend
        message.info('La edición de escalas estará disponible próximamente');
        return;
      } else {
        const result = await unifiedGradingService.createCustomScale(scaleData);
        message.success(`Escala "${result.scale.name}" creada exitosamente`);
      }

      handleModalCancel();
      loadScales();
    } catch (error: any) {
      message.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🎨 GESTIÓN DE STEPS DINÁMICOS
   */
  const addStep = () => {
    const newStep = {
      min: formSteps.length > 0 ? formSteps[formSteps.length - 1].max + 1 : 0,
      max: formSteps.length > 0 ? formSteps[formSteps.length - 1].max + 10 : 10,
      label: `Nivel ${formSteps.length + 1}`,
      description: ''
    };
    setFormSteps([...formSteps, newStep]);
  };

  const removeStep = (index: number) => {
    const newSteps = formSteps.filter((_, i) => i !== index);
    setFormSteps(newSteps);
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...formSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormSteps(newSteps);
  };

  /**
   * 🎯 UTILIDADES DE VISUALIZACIÓN
   */
  const getScaleTypeColor = (type: string) => {
    switch (type) {
      case 'numeric': return 'blue';
      case 'letter': return 'green';
      case 'rubric': return 'purple';
      case 'custom': return 'orange';
      default: return 'default';
    }
  };

  const getScaleTypeLabel = (type: string) => {
    switch (type) {
      case 'numeric': return 'Numérica';
      case 'letter': return 'Por Letras';
      case 'rubric': return 'Rúbrica';
      case 'custom': return 'Personalizada';
      default: return type;
    }
  };

  /**
   * 📋 CONFIGURACIÓN DE COLUMNAS DE TABLA
   */
  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: GradingScale) => (
        <div>
          <strong>{text}</strong>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getScaleTypeColor(type)}>
          {getScaleTypeLabel(type)}
        </Tag>
      ),
    },
    {
      title: 'Rango',
      key: 'range',
      render: (record: GradingScale) => (
        <Text>{record.minValue} - {record.maxValue}</Text>
      ),
    },
    {
      title: 'Niveles',
      dataIndex: 'steps',
      key: 'steps',
      render: (steps: any[]) => (
        <Space>
          <Text>{steps.length} niveles</Text>
          <Tooltip title={steps.map(s => `${s.label}: ${s.min}-${s.max}`).join(', ')}>
            <InfoCircleOutlined />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: GradingScale) => (
        <Space>
          <Button 
            icon={<EditOutlined />} 
            size="small" 
            onClick={() => showEditModal(record)}
            disabled={['standard', 'cambridge', 'rubric', 'numeric_10'].includes(record.id)}
          >
            Editar
          </Button>
          {record.id.startsWith('custom-') && (
            <Popconfirm
              title="¿Está seguro de eliminar esta escala?"
              onConfirm={() => {/* TODO: Implementar eliminación */}}
            >
              <Button 
                icon={<DeleteOutlined />} 
                size="small" 
                danger
              >
                Eliminar
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <BarChartOutlined /> Sistema de Calificaciones Unificadas
        </Title>
        <Text type="secondary">
          Gestione escalas de calificación, conversiones y estadísticas del sistema
        </Text>
      </div>

      {/* Estado del Sistema */}
      {systemHealth && (
        <Alert
          message={`Estado del Sistema: ${systemHealth.status}`}
          description={systemHealth.message}
          type={systemHealth.status === 'OPERATIONAL' ? 'success' : 'warning'}
          style={{ marginBottom: '24px' }}
          showIcon
        />
      )}

      <Tabs defaultActiveKey="scales">
        {/* TAB 1: Gestión de Escalas */}
        <TabPane tab="Escalas de Calificación" key="scales">
          <Card
            title="Escalas Disponibles"
            extra={
              <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>
                Nueva Escala Personalizada
              </Button>
            }
          >
            <Table
              columns={columns}
              dataSource={scales}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>

        {/* TAB 2: Analytics */}
        <TabPane tab="Estadísticas" key="analytics">
          {analytics && (
            <Row gutter={[16, 16]}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Calificaciones"
                    value={analytics.statistics?.totalGrades || 0}
                    prefix={<BarChartOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Promedio General"
                    value={analytics.statistics?.averageGrade || 0}
                    precision={1}
                    suffix="/100"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Escalas Activas"
                    value={scales.length}
                    prefix={<SwapOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Mejora Semanal"
                    value={analytics.statistics?.trends?.improvement || '+0%'}
                    valueStyle={{ color: '#3f8600' }}
                    prefix={<CheckCircleOutlined />}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </TabPane>

        {/* TAB 3: Herramientas */}
        <TabPane tab="Herramientas" key="tools">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="Convertir Calificación" size="small">
                <p>Herramienta de conversión entre escalas</p>
                <Button>Abrir Convertidor</Button>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Generar Reportes" size="small">
                <p>Reportes detallados del sistema</p>
                <Button>Generar Reporte</Button>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* MODAL DE CREACIÓN/EDICIÓN */}
      <Modal
        title={editingScale ? 'Editar Escala' : 'Nueva Escala Personalizada'}
        open={modalVisible}
        onCancel={handleModalCancel}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nombre de la Escala"
                rules={[{ required: true, message: 'Nombre obligatorio' }]}
              >
                <Input placeholder="Ej: Escala Personalizada Instituto" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Tipo de Escala"
                rules={[{ required: true, message: 'Tipo obligatorio' }]}
              >
                <Select placeholder="Seleccione tipo">
                  <Option value="custom">Personalizada</Option>
                  <Option value="numeric">Numérica</Option>
                  <Option value="letter">Por Letras</Option>
                  <Option value="rubric">Rúbrica</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Descripción"
            rules={[{ required: true, message: 'Descripción obligatoria' }]}
          >
            <Input.TextArea 
              rows={2}
              placeholder="Describe el propósito y uso de esta escala..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="minValue"
                label="Valor Mínimo"
                rules={[{ required: true, message: 'Valor mínimo obligatorio' }]}
              >
                <InputNumber min={0} max={999} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxValue"
                label="Valor Máximo"
                rules={[{ required: true, message: 'Valor máximo obligatorio' }]}
              >
                <InputNumber min={1} max={1000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider>Niveles de la Escala</Divider>

          {formSteps.map((step, index) => (
            <Card key={index} size="small" style={{ marginBottom: '8px' }}>
              <Row gutter={8} align="middle">
                <Col span={4}>
                  <InputNumber
                    placeholder="Mín"
                    value={step.min}
                    onChange={(value) => updateStep(index, 'min', value || 0)}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={4}>
                  <InputNumber
                    placeholder="Máx"
                    value={step.max}
                    onChange={(value) => updateStep(index, 'max', value || 0)}
                    style={{ width: '100%' }}
                  />
                </Col>
                <Col span={6}>
                  <Input
                    placeholder="Etiqueta"
                    value={step.label}
                    onChange={(e) => updateStep(index, 'label', e.target.value)}
                  />
                </Col>
                <Col span={8}>
                  <Input
                    placeholder="Descripción (opcional)"
                    value={step.description}
                    onChange={(e) => updateStep(index, 'description', e.target.value)}
                  />
                </Col>
                <Col span={2}>
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeStep(index)}
                  />
                </Col>
              </Row>
            </Card>
          ))}

          <Button
            type="dashed"
            onClick={addStep}
            style={{ width: '100%', marginBottom: '16px' }}
            icon={<PlusOutlined />}
          >
            Agregar Nivel
          </Button>

          {formSteps.length === 0 && (
            <Alert
              message="Debe definir al menos un nivel para la escala"
              type="warning"
              style={{ marginBottom: '16px' }}
            />
          )}

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={handleModalCancel}>
                Cancelar
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={loading}
                disabled={formSteps.length === 0}
              >
                {editingScale ? 'Actualizar' : 'Crear'} Escala
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default UnifiedGradingManager;