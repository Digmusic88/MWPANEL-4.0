/**
 * @archivo: CampaignModal.tsx
 * @módulo: Assignments - Frontend Components
 * @función: Modal para crear y editar campañas de asignación
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Modal avanzado para la creación y edición de campañas de asignación
 * con formulario multi-step, validaciones y preview en tiempo real.
 * 
 * FUNCIONALIDADES:
 * - Formulario multi-step (General, Recursos, Targets, Configuración)
 * - Validaciones en tiempo real
 * - Preview de la campaña
 * - Selección de recursos con drag & drop
 * - Configuración avanzada de targets
 * - Configuración de notificaciones
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.1
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Steps,
  Button,
  Space,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  Alert,
  Tag,
  Checkbox,
  InputNumber,
  message,
  Tabs,
  Collapse,
  Tooltip,
  Transfer,
  Tree
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  SettingOutlined,
  TeamOutlined,
  FileTextOutlined,
  CalendarOutlined,
  BellOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  PlusOutlined,
  DeleteOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AssignmentCampaign,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignStatus,
  CampaignType,
  TargetType,
  CreateResourceDto,
  CreateTargetDto,
  CampaignConfiguration
} from '../../types/assignments';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Panel } = Collapse;

interface CampaignModalProps {
  visible: boolean;
  campaign?: AssignmentCampaign; // Si existe, es modo edición
  loading?: boolean;
  onSubmit: (data: CreateCampaignDto | UpdateCampaignDto) => Promise<void>;
  onCancel: () => void;
  
  // Data para selecciones
  availableResources?: Array<{
    id: string;
    title: string;
    description?: string;
    type: string;
    estimatedTime?: number;
  }>;
  availableTargets?: {
    classes?: Array<{ id: string; name: string; studentCount: number }>;
    subjects?: Array<{ id: string; name: string }>;
    students?: Array<{ id: string; name: string; classId: string }>;
    gradeLevels?: Array<{ id: string; name: string; level: number }>;
  };
}

/**
 * Configuraciones por defecto
 */
const defaultConfiguration: CampaignConfiguration = {
  allowLateSubmission: false,
  requireCompletion: true,
  enableNotifications: true,
  trackProgress: true,
  autoAdvance: false,
  allowRetries: true,
  maxRetries: 3,
  notificationSettings: {
    onStart: true,
    onProgress: false,
    onCompletion: true,
    onOverdue: true,
    reminderFrequency: 'weekly'
  }
};

export const CampaignModal: React.FC<CampaignModalProps> = ({
  visible,
  campaign,
  loading = false,
  onSubmit,
  onCancel,
  availableResources = [],
  availableTargets = {}
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<CreateCampaignDto>>({});
  const [selectedResources, setSelectedResources] = useState<CreateResourceDto[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<CreateTargetDto[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  // Determinar si es modo edición
  const isEditMode = !!campaign;

  // Inicializar formulario
  useEffect(() => {
    if (visible) {
      if (campaign) {
        // Modo edición - cargar datos existentes
        const initialData = {
          title: campaign.title,
          description: campaign.description,
          type: campaign.type,
          startDate: campaign.startDate ? dayjs(campaign.startDate) : undefined,
          endDate: campaign.endDate ? dayjs(campaign.endDate) : undefined,
        };
        
        form.setFieldsValue(initialData);
        setFormData(initialData);
        setSelectedResources(campaign.resources?.map(r => ({
          resourceId: r.resourceId,
          required: r.required,
          estimatedTime: r.estimatedTime,
          difficultyAdjustment: r.difficultyAdjustment,
          order: r.order
        })) || []);
        setSelectedTargets(campaign.targets?.map(t => ({
          targetType: t.targetType,
          targetId: t.targetId,
          metadata: t.metadata
        })) || []);
      } else {
        // Modo creación - valores por defecto
        form.resetFields();
        setFormData({});
        setSelectedResources([]);
        setSelectedTargets([]);
      }
      setCurrentStep(0);
      setPreviewMode(false);
    }
  }, [visible, campaign, form]);

  // Validación del step actual
  const validateCurrentStep = useCallback(async () => {
    try {
      switch (currentStep) {
        case 0: // Información general
          await form.validateFields(['title', 'description', 'type']);
          return true;
        case 1: // Recursos
          if (selectedResources.length === 0) {
            message.error('Debe seleccionar al menos un recurso');
            return false;
          }
          return true;
        case 2: // Targets
          if (selectedTargets.length === 0) {
            message.error('Debe seleccionar al menos un objetivo');
            return false;
          }
          return true;
        case 3: // Configuración
          await form.validateFields(['configuration']);
          return true;
        default:
          return true;
      }
    } catch (error) {
      return false;
    }
  }, [currentStep, form, selectedResources, selectedTargets]);

  // Navegación entre steps
  const nextStep = useCallback(async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < 3) {
      setCurrentStep(currentStep + 1);
      // Guardar datos del formulario actual
      const values = form.getFieldsValue();
      setFormData(prev => ({ ...prev, ...values }));
    }
  }, [currentStep, validateCurrentStep, form]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Manejo de recursos
  const handleResourceToggle = useCallback((resource: any, checked: boolean) => {
    if (checked) {
      const newResource: CreateResourceDto = {
        resourceId: resource.id,
        required: true,
        estimatedTime: resource.estimatedTime || 30,
        difficultyAdjustment: 0,
        order: selectedResources.length
      };
      setSelectedResources(prev => [...prev, newResource]);
    } else {
      setSelectedResources(prev => 
        prev.filter(r => r.resourceId !== resource.id)
      );
    }
  }, [selectedResources]);

  const updateResourceConfig = useCallback((resourceId: string, config: Partial<CreateResourceDto>) => {
    setSelectedResources(prev => 
      prev.map(r => r.resourceId === resourceId ? { ...r, ...config } : r)
    );
  }, []);

  // Manejo de targets
  const handleTargetToggle = useCallback((targetType: TargetType, targetId: string, targetName: string, checked: boolean) => {
    if (checked) {
      const newTarget: CreateTargetDto = {
        targetType,
        targetId,
        metadata: { name: targetName }
      };
      setSelectedTargets(prev => [...prev, newTarget]);
    } else {
      setSelectedTargets(prev => 
        prev.filter(t => !(t.targetType === targetType && t.targetId === targetId))
      );
    }
  }, []);

  // Submit final
  const handleSubmit = useCallback(async () => {
    try {
      const values = form.getFieldsValue();
      const submitData: CreateCampaignDto | UpdateCampaignDto = {
        ...formData,
        ...values,
        startDate: values.startDate?.toISOString(),
        endDate: values.endDate?.toISOString(),
        resources: selectedResources,
        targets: selectedTargets,
        configuration: {
          ...defaultConfiguration,
          ...values.configuration
        }
      };

      await onSubmit(submitData);
      message.success(isEditMode ? 'Campaña actualizada correctamente' : 'Campaña creada correctamente');
    } catch (error) {
      message.error('Error al guardar la campaña');
    }
  }, [form, formData, selectedResources, selectedTargets, onSubmit, isEditMode]);

  // Steps del formulario
  const steps = [
    {
      title: 'General',
      icon: <InfoCircleOutlined />,
      description: 'Información básica'
    },
    {
      title: 'Recursos',
      icon: <FileTextOutlined />,
      description: 'Selección de recursos'
    },
    {
      title: 'Objetivos',
      icon: <TeamOutlined />,
      description: 'Targets y audiencia'
    },
    {
      title: 'Configuración',
      icon: <SettingOutlined />,
      description: 'Configuración avanzada'
    }
  ];

  // Render del contenido según step
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderGeneralStep();
      case 1:
        return renderResourcesStep();
      case 2:
        return renderTargetsStep();
      case 3:
        return renderConfigurationStep();
      default:
        return null;
    }
  };

  const renderGeneralStep = () => (
    <Row gutter={[24, 24]}>
      <Col span={24}>
        <Form.Item
          name="title"
          label="Título de la campaña"
          rules={[
            { required: true, message: 'El título es obligatorio' },
            { min: 3, message: 'El título debe tener al menos 3 caracteres' },
            { max: 100, message: 'El título no puede exceder 100 caracteres' }
          ]}
        >
          <Input placeholder="Ingrese un título descriptivo para la campaña" size="large" />
        </Form.Item>
      </Col>

      <Col span={24}>
        <Form.Item
          name="description"
          label="Descripción"
          rules={[{ max: 1000, message: 'La descripción no puede exceder 1000 caracteres' }]}
        >
          <TextArea 
            rows={4} 
            placeholder="Descripción detallada de la campaña (opcional)" 
          />
        </Form.Item>
      </Col>

      <Col xs={24} sm={12}>
        <Form.Item
          name="type"
          label="Tipo de campaña"
          rules={[{ required: true, message: 'Seleccione el tipo de campaña' }]}
        >
          <Select placeholder="Seleccionar tipo" size="large">
            <Option value={CampaignType.SINGLE}>
              Individual - Para recursos específicos
            </Option>
            <Option value={CampaignType.BULK}>
              Masiva - Para múltiples recursos
            </Option>
            <Option value={CampaignType.RECURRING}>
              Recurrente - Se repite periódicamente
            </Option>
            <Option value={CampaignType.CONDITIONAL}>
              Condicional - Basada en criterios
            </Option>
          </Select>
        </Form.Item>
      </Col>

      <Col xs={24} sm={12}>
        <Form.Item label="Período de validez">
          <RangePicker 
            style={{ width: '100%' }} 
            placeholder={['Fecha inicio', 'Fecha fin']}
            size="large"
          />
        </Form.Item>
      </Col>
    </Row>
  );

  const renderResourcesStep = () => (
    <div>
      <div className="mb-4">
        <Title level={5}>Recursos disponibles</Title>
        <Text type="secondary">
          Seleccione los recursos que serán parte de esta campaña
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {availableResources.map(resource => {
          const isSelected = selectedResources.some(r => r.resourceId === resource.id);
          const selectedResource = selectedResources.find(r => r.resourceId === resource.id);

          return (
            <Col xs={24} sm={12} md={8} key={resource.id}>
              <Card
                size="small"
                hoverable
                className={isSelected ? 'border-primary' : ''}
                actions={[
                  <Checkbox
                    checked={isSelected}
                    onChange={(e) => handleResourceToggle(resource, e.target.checked)}
                  >
                    Incluir
                  </Checkbox>
                ]}
              >
                <Card.Meta
                  title={resource.title}
                  description={
                    <div>
                      <Paragraph ellipsis={{ rows: 2 }}>
                        {resource.description}
                      </Paragraph>
                      <Space>
                        <Tag>{resource.type}</Tag>
                        {resource.estimatedTime && (
                          <Tag color="blue">{resource.estimatedTime} min</Tag>
                        )}
                      </Space>
                    </div>
                  }
                />

                {/* Configuración del recurso si está seleccionado */}
                {isSelected && (
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <Space direction="vertical" className="w-full">
                      <Checkbox
                        checked={selectedResource?.required}
                        onChange={(e) => updateResourceConfig(resource.id, { required: e.target.checked })}
                      >
                        Obligatorio
                      </Checkbox>
                      
                      <div className="flex items-center gap-2">
                        <Text>Tiempo estimado:</Text>
                        <InputNumber
                          min={1}
                          max={600}
                          value={selectedResource?.estimatedTime}
                          onChange={(value) => updateResourceConfig(resource.id, { estimatedTime: value || 30 })}
                          addonAfter="min"
                          size="small"
                        />
                      </div>
                    </Space>
                  </div>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      {selectedResources.length > 0 && (
        <Alert
          className="mt-4"
          type="info"
          message={`${selectedResources.length} recursos seleccionados`}
          description={`Tiempo total estimado: ${selectedResources.reduce((total, r) => total + (r.estimatedTime || 0), 0)} minutos`}
        />
      )}
    </div>
  );

  const renderTargetsStep = () => (
    <Tabs defaultActiveKey="classes" type="card">
      <TabPane tab="Clases" key="classes">
        <Row gutter={[16, 16]}>
          {availableTargets.classes?.map(classItem => {
            const isSelected = selectedTargets.some(t => 
              t.targetType === TargetType.CLASS && t.targetId === classItem.id
            );

            return (
              <Col xs={24} sm={12} md={8} key={classItem.id}>
                <Card
                  size="small"
                  hoverable
                  className={isSelected ? 'border-primary' : ''}
                  actions={[
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleTargetToggle(
                        TargetType.CLASS, 
                        classItem.id, 
                        classItem.name, 
                        e.target.checked
                      )}
                    >
                      Seleccionar
                    </Checkbox>
                  ]}
                >
                  <Card.Meta
                    title={classItem.name}
                    description={
                      <Space>
                        <TeamOutlined />
                        {classItem.studentCount} estudiantes
                      </Space>
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      </TabPane>

      <TabPane tab="Materias" key="subjects">
        <Row gutter={[16, 16]}>
          {availableTargets.subjects?.map(subject => {
            const isSelected = selectedTargets.some(t => 
              t.targetType === TargetType.SUBJECT && t.targetId === subject.id
            );

            return (
              <Col xs={24} sm={12} md={8} key={subject.id}>
                <Card
                  size="small"
                  hoverable
                  className={isSelected ? 'border-primary' : ''}
                  actions={[
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => handleTargetToggle(
                        TargetType.SUBJECT, 
                        subject.id, 
                        subject.name, 
                        e.target.checked
                      )}
                    >
                      Seleccionar
                    </Checkbox>
                  ]}
                >
                  <Card.Meta
                    title={subject.name}
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      </TabPane>

      <TabPane tab="Estudiantes" key="students">
        <Transfer
          dataSource={availableTargets.students?.map(student => ({
            key: student.id,
            title: student.name,
            description: `Clase: ${student.classId}`
          }))}
          titles={['Disponibles', 'Seleccionados']}
          targetKeys={selectedTargets
            .filter(t => t.targetType === TargetType.INDIVIDUAL)
            .map(t => t.targetId)
          }
          onChange={(targetKeys) => {
            // Actualizar targets individuales
            const individualTargets = targetKeys.map(id => {
              const student = availableTargets.students?.find(s => s.id === id);
              return {
                targetType: TargetType.INDIVIDUAL,
                targetId: id,
                metadata: { name: student?.name }
              };
            });

            // Mantener otros tipos de targets y agregar individuales
            setSelectedTargets(prev => [
              ...prev.filter(t => t.targetType !== TargetType.INDIVIDUAL),
              ...individualTargets
            ]);
          }}
          render={item => item.title}
          listStyle={{ width: 250, height: 300 }}
        />
      </TabPane>
    </Tabs>
  );

  const renderConfigurationStep = () => (
    <Collapse defaultActiveKey={['basic', 'notifications']} ghost>
      <Panel header="Configuración básica" key="basic">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'requireCompletion']} valuePropName="checked">
              <Checkbox>Requerir completar todos los recursos</Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'allowLateSubmission']} valuePropName="checked">
              <Checkbox>Permitir entregas tardías</Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'allowRetries']} valuePropName="checked">
              <Checkbox>Permitir reintentos</Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'maxRetries']} label="Máximo reintentos">
              <InputNumber min={1} max={10} defaultValue={3} />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'trackProgress']} valuePropName="checked">
              <Checkbox>Rastrear progreso detallado</Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'autoAdvance']} valuePropName="checked">
              <Checkbox>Avance automático entre recursos</Checkbox>
            </Form.Item>
          </Col>
        </Row>
      </Panel>

      <Panel header="Notificaciones" key="notifications">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'enableNotifications']} valuePropName="checked">
              <Checkbox>Habilitar notificaciones</Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'notificationSettings', 'onStart']} valuePropName="checked">
              <Checkbox>Notificar al inicio</Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'notificationSettings', 'onProgress']} valuePropName="checked">
              <Checkbox>Notificar progreso</Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'notificationSettings', 'onCompletion']} valuePropName="checked">
              <Checkbox>Notificar completado</Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item name={['configuration', 'notificationSettings', 'onOverdue']} valuePropName="checked">
              <Checkbox>Notificar vencimientos</Checkbox>
            </Form.Item>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item 
              name={['configuration', 'notificationSettings', 'reminderFrequency']} 
              label="Frecuencia recordatorios"
            >
              <Select>
                <Option value="daily">Diario</Option>
                <Option value="weekly">Semanal</Option>
                <Option value="custom">Personalizado</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Panel>
    </Collapse>
  );

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined />
          {isEditMode ? 'Editar Campaña' : 'Nueva Campaña'}
        </div>
      }
      visible={visible}
      onCancel={onCancel}
      width={1000}
      maskClosable={false}
      footer={null}
      className="campaign-modal"
    >
      <div className="campaign-modal-content">
        {/* Steps */}
        <Steps 
          current={currentStep} 
          className="mb-6"
          type="navigation"
        >
          {steps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              icon={step.icon}
            />
          ))}
        </Steps>

        {/* Form Content */}
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: CampaignType.SINGLE,
            configuration: defaultConfiguration
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </Form>

        {/* Footer Actions */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <div>
            {currentStep > 0 && (
              <Button onClick={prevStep}>
                Anterior
              </Button>
            )}
          </div>

          <Space>
            <Button onClick={onCancel}>
              Cancelar
            </Button>
            
            {currentStep < 3 ? (
              <Button type="primary" onClick={nextStep}>
                Siguiente
              </Button>
            ) : (
              <Button 
                type="primary" 
                onClick={handleSubmit}
                loading={loading}
                icon={<SaveOutlined />}
              >
                {isEditMode ? 'Actualizar Campaña' : 'Crear Campaña'}
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Modal>
  );
};