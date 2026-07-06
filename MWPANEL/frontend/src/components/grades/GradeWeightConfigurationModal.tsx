/**
 * @archivo: GradeWeightConfigurationModal.tsx
 * @módulo: Frontend Components - Grades
 * @función: Modal para configurar ponderaciones de calificaciones por profesor
 * @crítico: SÍ - Permite personalizar el sistema de evaluación
 * @actualizado: Julio 2025 - Implementación nueva
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Row,
  Col,
  Card,
  Slider,
  InputNumber,
  Switch,
  Button,
  Typography,
  Alert,
  Divider,
  Space,
  Tag,
  Tooltip,
  Progress,
  message,
} from 'antd';
import {
  BookOutlined,
  TrophyOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  TeamOutlined,
  RobotOutlined,
  SaveOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type { WeightConfiguration } from '../../services/gradeConfigurationService';

const { Title, Text } = Typography;

interface GradeComponent {
  key: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  defaultWeight: number;
  minimumItems: number;
  color: string;
}

const GRADE_COMPONENTS: GradeComponent[] = [
  {
    key: 'tasks',
    name: 'Tareas',
    icon: <BookOutlined />,
    description: 'Tareas y deberes asignados',
    defaultWeight: 40,
    minimumItems: 3,
    color: '#1890ff',
  },
  {
    key: 'activities',
    name: 'Actividades',
    icon: <TrophyOutlined />,
    description: 'Actividades diarias en clase',
    defaultWeight: 30,
    minimumItems: 5,
    color: '#52c41a',
  },
  {
    key: 'evaluations',
    name: 'Evaluaciones',
    icon: <ExperimentOutlined />,
    description: 'Evaluaciones competenciales',
    defaultWeight: 20,
    minimumItems: 1,
    color: '#722ed1',
  },
  {
    key: 'rubrics',
    name: 'Rúbricas',
    icon: <FileTextOutlined />,
    description: 'Evaluaciones con rúbricas detalladas',
    defaultWeight: 10,
    minimumItems: 1,
    color: '#fa8c16',
  },
  {
    key: 'participation',
    name: 'Participación',
    icon: <TeamOutlined />,
    description: 'Participación en clase',
    defaultWeight: 0,
    minimumItems: 10,
    color: '#13c2c2',
  },
  {
    key: 'ai_assessments',
    name: 'IA Assessments',
    icon: <RobotOutlined />,
    description: 'Evaluaciones automáticas por IA',
    defaultWeight: 0,
    minimumItems: 1,
    color: '#eb2f96',
  },
];

// Función para obtener escala por defecto según el componente
const getDefaultScale = (componentKey: string): string => {
  switch (componentKey) {
    case 'tasks':
    case 'activities':
    case 'participation':
    case 'ai_assessments':
      return 'numeric_0_100';
    case 'evaluations':
      return 'competency_1_5';
    case 'rubrics':
      return 'rubric_based';
    default:
      return 'numeric_0_100';
  }
};


interface GradeWeightConfigurationModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (configuration: WeightConfiguration) => void;
  initialConfiguration?: WeightConfiguration;
  subjectName?: string;
  loading?: boolean;
}

const GradeWeightConfigurationModal: React.FC<GradeWeightConfigurationModalProps> = ({
  visible,
  onCancel,
  onSave,
  initialConfiguration,
  subjectName,
  loading = false,
}) => {
  const [form] = Form.useForm();
  const [weights, setWeights] = useState<WeightConfiguration>({});
  const [totalWeight, setTotalWeight] = useState(0);

  useEffect(() => {
    if (visible) {
      // Inicializar con configuración existente o valores por defecto
      const defaultWeights: WeightConfiguration = {};
      
      GRADE_COMPONENTS.forEach(component => {
        const existingConfig = initialConfiguration?.[component.key];
        defaultWeights[component.key] = {
          weight: existingConfig?.weight || component.defaultWeight,
          enabled: existingConfig?.enabled ?? (component.defaultWeight > 0),
          minimumItems: existingConfig?.minimumItems || component.minimumItems,
          scale: existingConfig?.scale || getDefaultScale(component.key), // ✅ Agregar campo scale
        };
      });
      
      setWeights(defaultWeights);
      form.setFieldsValue(defaultWeights);
    }
  }, [visible, initialConfiguration, form]);

  useEffect(() => {
    // Calcular peso total de componentes habilitados
    const total = Object.entries(weights)
      .filter(([, config]) => config.enabled)
      .reduce((sum, [, config]) => sum + config.weight, 0);
    setTotalWeight(total);
  }, [weights]);

  const handleWeightChange = (componentKey: string, weight: number) => {
    const newWeights = {
      ...weights,
      [componentKey]: {
        ...weights[componentKey],
        weight,
      },
    };
    setWeights(newWeights);
    form.setFieldValue([componentKey, 'weight'], weight);
  };

  const handleEnabledChange = (componentKey: string, enabled: boolean) => {
    const newWeights = {
      ...weights,
      [componentKey]: {
        ...weights[componentKey],
        enabled,
        weight: enabled ? weights[componentKey].weight : 0,
      },
    };
    setWeights(newWeights);
    form.setFieldValue([componentKey, 'enabled'], enabled);
  };

  const handleMinimumItemsChange = (componentKey: string, minimumItems: number) => {
    const newWeights = {
      ...weights,
      [componentKey]: {
        ...weights[componentKey],
        minimumItems,
      },
    };
    setWeights(newWeights);
    form.setFieldValue([componentKey, 'minimumItems'], minimumItems);
  };

  const resetToDefaults = () => {
    const defaultWeights: WeightConfiguration = {};
    GRADE_COMPONENTS.forEach(component => {
      defaultWeights[component.key] = {
        weight: component.defaultWeight,
        enabled: component.defaultWeight > 0,
        minimumItems: component.minimumItems,
        scale: getDefaultScale(component.key), // ✅ Agregar campo scale
      };
    });
    setWeights(defaultWeights);
    form.setFieldsValue(defaultWeights);
    message.success('Configuración restaurada a valores por defecto');
  };

  const handleSave = () => {
    if (Math.abs(totalWeight - 100) > 0.1) {
      message.error('Los pesos deben sumar exactamente 100%');
      return;
    }

    const enabledComponents = Object.entries(weights).filter(([, config]) => config.enabled);
    if (enabledComponents.length === 0) {
      message.error('Debe habilitar al menos un componente de evaluación');
      return;
    }

    onSave(weights);
  };

  const getTotalWeightColor = () => {
    if (Math.abs(totalWeight - 100) < 0.1) return '#52c41a'; // Verde
    if (totalWeight < 100) return '#faad14'; // Amarillo
    return '#ff4d4f'; // Rojo
  };

  const getTotalWeightStatus = () => {
    if (Math.abs(totalWeight - 100) < 0.1) return 'success';
    if (totalWeight < 100) return 'active';
    return 'exception';
  };

  return (
    <Modal
      title={
        <Space>
          <ExperimentOutlined style={{ color: '#1890ff' }} />
          <span>Configuración de Ponderaciones</span>
          {subjectName && <Tag color="blue">{subjectName}</Tag>}
        </Space>
      }
      visible={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="reset" icon={<ReloadOutlined />} onClick={resetToDefaults}>
          Restaurar Defecto
        </Button>,
        <Button key="cancel" onClick={onCancel}>
          Cancelar
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSave}
          disabled={Math.abs(totalWeight - 100) > 0.1}
        >
          Guardar Configuración
        </Button>,
      ]}
    >
      {/* Resumen de peso total */}
      <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Space>
              <Text strong>Peso Total:</Text>
              <Text
                style={{
                  color: getTotalWeightColor(),
                  fontSize: '18px',
                  fontWeight: 'bold',
                }}
              >
                {totalWeight.toFixed(1)}%
              </Text>
            </Space>
          </Col>
          <Col span={12}>
            <Progress
              percent={totalWeight}
              status={getTotalWeightStatus()}
              strokeColor={getTotalWeightColor()}
              format={(percent) => `${percent?.toFixed(1)}%`}
            />
          </Col>
        </Row>
        {Math.abs(totalWeight - 100) > 0.1 && (
          <Alert
            message={`Los pesos deben sumar 100%. Actualmente: ${totalWeight.toFixed(1)}%`}
            type={totalWeight > 100 ? 'error' : 'warning'}
            showIcon
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      <Form form={form} layout="vertical">
        <Row gutter={16}>
          {GRADE_COMPONENTS.map((component) => {
            const config = weights[component.key];
            if (!config) return null;

            return (
              <Col span={12} key={component.key}>
                <Card
                  size="small"
                  style={{
                    marginBottom: 16,
                    border: config.enabled ? `2px solid ${component.color}` : '1px solid #d9d9d9',
                    backgroundColor: config.enabled ? '#fafafa' : '#f5f5f5',
                  }}
                >
                  <div style={{ marginBottom: 12 }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space>
                          <span style={{ color: component.color, fontSize: '16px' }}>
                            {component.icon}
                          </span>
                          <Text strong>{component.name}</Text>
                        </Space>
                      </Col>
                      <Col>
                        <Switch
                          checked={config.enabled}
                          onChange={(enabled) => handleEnabledChange(component.key, enabled)}
                          size="small"
                        />
                      </Col>
                    </Row>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {component.description}
                    </Text>
                  </div>

                  {config.enabled && (
                    <>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong>Peso: {config.weight}%</Text>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={config.weight}
                          onChange={(value) => handleWeightChange(component.key, value)}
                          trackStyle={{ backgroundColor: component.color }}
                          handleStyle={{ borderColor: component.color }}
                        />
                      </div>

                      <Row gutter={8} align="middle">
                        <Col span={12}>
                          <Text style={{ fontSize: '12px' }}>Peso exacto:</Text>
                          <InputNumber
                            min={0}
                            max={100}
                            step={0.1}
                            value={config.weight}
                            onChange={(value) => handleWeightChange(component.key, value || 0)}
                            size="small"
                            style={{ width: '100%' }}
                            suffix="%"
                          />
                        </Col>
                        <Col span={12}>
                          <Space>
                            <Text style={{ fontSize: '12px' }}>Mín. items:</Text>
                            <Tooltip title="Número mínimo de elementos para calcular este componente">
                              <InputNumber
                                min={1}
                                max={50}
                                value={config.minimumItems}
                                onChange={(value) => handleMinimumItemsChange(component.key, value || 1)}
                                size="small"
                                style={{ width: '60px' }}
                              />
                            </Tooltip>
                          </Space>
                        </Col>
                      </Row>
                    </>
                  )}
                </Card>
              </Col>
            );
          })}
        </Row>
      </Form>

      <Divider />

      <Alert
        message="Información sobre la configuración"
        description={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>Los pesos deben sumar exactamente 100%</li>
            <li>Debe habilitar al menos un componente de evaluación</li>
            <li>El "Mín. items" indica cuántos elementos necesita para calcular ese componente</li>
            <li>Esta configuración se aplicará a todos los estudiantes de esta asignatura</li>
          </ul>
        }
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
      />
    </Modal>
  );
};

export default GradeWeightConfigurationModal;