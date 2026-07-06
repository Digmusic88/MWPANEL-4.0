/**
 * @archivo: LearningSituationEditor.tsx
 * @módulo: Components/Learning (Editor de Situaciones de Aprendizaje)
 * @función: Editor completo para crear y editar situaciones de aprendizaje
 * @crítico: SÍ - Núcleo de la metodología pedagógica LOMLOE
 * @dependencias: learningSituationsService, competenciesService, Ant Design
 * @relacionado_con: Sistema competencial, evaluación formativa, DUA
 */

import React, { useState, useEffect } from 'react';
import {
  Steps,
  Card,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Tag,
  Divider,
  Alert,
  Tooltip,
  Switch,
  Upload,
  Progress,
  Modal,
  message,
} from 'antd';
import {
  InfoCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  EyeOutlined,
  BookOutlined,
  CalendarOutlined,
  TeamOutlined,
  ToolOutlined,
  TrophyOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  EditOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { 
  learningSituationsService,
  CreateLearningSituationData,
  UpdateLearningSituationData,
  LearningSituation 
} from '../../services/learningSituationsService';
import { useSpecificCompetencies } from '../../hooks/useCompetencies';

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface LearningSituationEditorProps {
  situation?: LearningSituation;
  onSave?: (situation: LearningSituation) => void;
  onCancel?: () => void;
  className?: string;
}

// Metodologías predefinidas
const PREDEFINED_METHODOLOGIES = [
  'Aprendizaje Basado en Proyectos (ABP)',
  'Aprendizaje Cooperativo',
  'Aprendizaje Basado en Problemas',
  'Gamificación',
  'Flipped Classroom',
  'Design Thinking',
  'Storytelling',
  'Aprendizaje Servicio',
  'Estudio de Casos',
  'Simulación',
  'Debate y Discusión',
  'Investigación Guiada',
];

// Espacios de aprendizaje
const LEARNING_SPACES = [
  'Aula tradicional',
  'Laboratorio',
  'Biblioteca',
  'Patio/Exterior',
  'Gimnasio',
  'Aula de informática',
  'Taller',
  'Auditorio',
  'Espacios virtuales',
  'Entorno natural',
  'Museos/Centros culturales',
  'Empresa/Institución',
];

// Herramientas de evaluación
const ASSESSMENT_TOOLS = [
  'Rúbrica analítica',
  'Rúbrica holística',
  'Lista de cotejo',
  'Escala de valoración',
  'Diario de aprendizaje',
  'Portfolio',
  'Autoevaluación',
  'Coevaluación',
  'Observación directa',
  'Prueba práctica',
  'Presentación oral',
  'Proyecto final',
];

const LearningSituationEditor: React.FC<LearningSituationEditorProps> = ({
  situation,
  onSave,
  onCancel,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState<Partial<CreateLearningSituationData>>({});
  const queryClient = useQueryClient();

  // Queries
  const { data: competenciesData } = useSpecificCompetencies({ limit: 100 });

  // Mutations
  const createSituation = useMutation({
    mutationFn: learningSituationsService.createLearningSituation,
    onSuccess: (newSituation) => {
      queryClient.invalidateQueries({ queryKey: ['learning-situations'] });
      message.success('Situación de aprendizaje creada exitosamente');
      onSave?.(newSituation);
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al crear la situación de aprendizaje');
    },
  });

  const updateSituation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLearningSituationData }) =>
      learningSituationsService.updateLearningSituation(id, data),
    onSuccess: (updatedSituation) => {
      queryClient.invalidateQueries({ queryKey: ['learning-situations'] });
      message.success('Situación de aprendizaje actualizada exitosamente');
      onSave?.(updatedSituation);
    },
    onError: (error: any) => {
      message.error(error.message || 'Error al actualizar la situación de aprendizaje');
    },
  });

  // Inicializar formulario con datos existentes
  useEffect(() => {
    if (situation) {
      const formValues = {
        ...situation,
        dateRange: [dayjs(situation.startDate), dayjs(situation.endDate)],
        competencyIds: situation.specificCompetencies?.map(c => c.id) || [],
      };
      form.setFieldsValue(formValues);
      setFormData(formValues);
    }
  }, [situation, form]);

  // Pasos del wizard
  const steps = [
    {
      title: 'Información Básica',
      icon: <InfoCircleOutlined />,
      description: 'Título, descripción y contexto',
    },
    {
      title: 'Competencias',
      icon: <TrophyOutlined />,
      description: 'Competencias específicas a trabajar',
    },
    {
      title: 'Metodología',
      icon: <ToolOutlined />,
      description: 'Metodologías y recursos',
    },
    {
      title: 'Evaluación',
      icon: <CheckCircleOutlined />,
      description: 'Herramientas y criterios',
    },
    {
      title: 'DUA y Revisión',
      icon: <BulbOutlined />,
      description: 'Adaptaciones y revisión final',
    },
  ];

  // Navegación entre pasos
  const nextStep = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      setFormData(prev => ({ ...prev, ...values }));
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Guardar situación
  const handleSave = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      const finalData = { ...formData, ...values };

      // Procesar datos
      const processedData: CreateLearningSituationData = {
        title: finalData.title,
        description: finalData.description,
        context: finalData.context,
        challenge: finalData.challenge,
        startDate: finalData.dateRange[0].format('YYYY-MM-DD'),
        endDate: finalData.dateRange[1].format('YYYY-MM-DD'),
        estimatedSessions: finalData.estimatedSessions,
        methodologies: finalData.methodologies || [],
        resources: finalData.resources || [],
        spaces: finalData.spaces || [],
        expectedProducts: finalData.expectedProducts || [],
        assessmentTools: finalData.assessmentTools || [],
        successCriteria: finalData.successCriteria || [],
        duaAdaptations: finalData.duaAdaptations,
        classGroupId: finalData.classGroupId,
        subjectId: finalData.subjectId,
        competencyIds: finalData.competencyIds || [],
        isTemplate: finalData.isTemplate || false,
      };

      if (situation) {
        await updateSituation.mutateAsync({
          id: situation.id,
          data: processedData,
        });
      } else {
        await createSituation.mutateAsync(processedData);
      }
    } catch (error) {
      console.error('Error saving situation:', error);
    }
  };

  // Renderizar paso actual
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <Alert
              message="Información Básica"
              description="Define el título, descripción y contexto de la situación de aprendizaje. Estos elementos deben ser significativos y relevantes para el alumnado."
              type="info"
              showIcon
              className="mb-6"
            />

            <Row gutter={[24, 24]}>
              <Col span={24}>
                <Form.Item
                  name="title"
                  label="Título de la Situación"
                  rules={[
                    { required: true, message: 'El título es obligatorio' },
                    { min: 5, message: 'El título debe tener al menos 5 caracteres' },
                    { max: 200, message: 'El título no puede exceder 200 caracteres' },
                  ]}
                >
                  <Input
                    placeholder="Ej: Investigamos el agua en nuestro entorno"
                    size="large"
                  />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="description"
                  label="Descripción General"
                  rules={[
                    { required: true, message: 'La descripción es obligatoria' },
                    { min: 50, message: 'La descripción debe ser más detallada' },
                  ]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Describe qué van a hacer los estudiantes, qué van a aprender y por qué es importante..."
                  />
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  name="context"
                  label="Contexto Real"
                  rules={[{ required: true, message: 'El contexto es obligatorio' }]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Describe el contexto real y significativo que motiva esta situación..."
                  />
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  name="challenge"
                  label="Reto o Problema"
                  rules={[{ required: true, message: 'El reto es obligatorio' }]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Define el reto, problema o pregunta central que deben resolver..."
                  />
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  name="dateRange"
                  label="Período de Implementación"
                  rules={[{ required: true, message: 'Las fechas son obligatorias' }]}
                >
                  <RangePicker className="w-full" size="large" />
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  name="estimatedSessions"
                  label="Sesiones Estimadas"
                  rules={[
                    { required: true, message: 'El número de sesiones es obligatorio' },
                    { type: 'number', min: 1, max: 20, message: 'Entre 1 y 20 sesiones' },
                  ]}
                >
                  <InputNumber
                    min={1}
                    max={20}
                    className="w-full"
                    size="large"
                    placeholder="Número de sesiones"
                  />
                </Form.Item>
              </Col>
            </Row>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <Alert
              message="Competencias Específicas"
              description="Selecciona las competencias específicas que se van a trabajar en esta situación de aprendizaje."
              type="info"
              showIcon
              className="mb-6"
            />

            <Form.Item
              name="competencyIds"
              label="Competencias Específicas"
              rules={[{ required: true, message: 'Selecciona al menos una competencia' }]}
            >
              <Select
                mode="multiple"
                placeholder="Buscar y seleccionar competencias..."
                size="large"
                showSearch
                optionFilterProp="children"
                className="w-full"
              >
                {competenciesData?.data?.map(competency => (
                  <Option key={competency.id} value={competency.id}>
                    <div>
                      <Text strong>{competency.name}</Text>
                      <br />
                      <Text type="secondary" className="text-sm">
                        {competency.subject?.name} - {competency.educationalLevel?.name}
                      </Text>
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {/* Preview de competencias seleccionadas */}
            <Form.Item shouldUpdate>
              {({ getFieldValue }) => {
                const selectedIds = getFieldValue('competencyIds') || [];
                const selectedCompetencies = competenciesData?.data?.filter(c => 
                  selectedIds.includes(c.id)
                ) || [];

                return selectedCompetencies.length > 0 ? (
                  <Card title="Competencias Seleccionadas" size="small">
                    <Space direction="vertical" className="w-full">
                      {selectedCompetencies.map(competency => (
                        <div key={competency.id} className="p-3 bg-blue-50 rounded-lg">
                          <Text strong className="text-blue-700">
                            {competency.name}
                          </Text>
                          <br />
                          <Text type="secondary" className="text-sm">
                            {competency.description}
                          </Text>
                          <br />
                          <Tag color="blue" className="mt-2">
                            {competency.subject?.name}
                          </Tag>
                        </div>
                      ))}
                    </Space>
                  </Card>
                ) : null;
              }}
            </Form.Item>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Alert
              message="Metodología y Recursos"
              description="Define las metodologías que vas a utilizar, los recursos necesarios y los espacios de aprendizaje."
              type="info"
              showIcon
              className="mb-6"
            />

            <Row gutter={[24, 24]}>
              <Col xs={24} lg={12}>
                <Form.Item
                  name="methodologies"
                  label="Metodologías"
                  rules={[{ required: true, message: 'Selecciona al menos una metodología' }]}
                >
                  <Select
                    mode="tags"
                    placeholder="Seleccionar o escribir metodologías..."
                    size="large"
                  >
                    {PREDEFINED_METHODOLOGIES.map(methodology => (
                      <Option key={methodology} value={methodology}>
                        {methodology}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  name="spaces"
                  label="Espacios de Aprendizaje"
                  rules={[{ required: true, message: 'Selecciona al menos un espacio' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Seleccionar espacios..."
                    size="large"
                  >
                    {LEARNING_SPACES.map(space => (
                      <Option key={space} value={space}>
                        {space}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  name="resources"
                  label="Recursos Necesarios"
                  rules={[{ required: true, message: 'Especifica los recursos necesarios' }]}
                >
                  <Select
                    mode="tags"
                    placeholder="Especificar recursos..."
                    size="large"
                  >
                    <Option value="Ordenadores/Tablets">Ordenadores/Tablets</Option>
                    <Option value="Material audiovisual">Material audiovisual</Option>
                    <Option value="Libros y textos">Libros y textos</Option>
                    <Option value="Material de laboratorio">Material de laboratorio</Option>
                    <Option value="Herramientas digitales">Herramientas digitales</Option>
                    <Option value="Material manipulativo">Material manipulativo</Option>
                  </Select>
                </Form.Item>
              </Col>

              <Col xs={24} lg={12}>
                <Form.Item
                  name="expectedProducts"
                  label="Productos Finales Esperados"
                  rules={[{ required: true, message: 'Define los productos esperados' }]}
                >
                  <Select
                    mode="tags"
                    placeholder="Productos finales..."
                    size="large"
                  >
                    <Option value="Informe de investigación">Informe de investigación</Option>
                    <Option value="Presentación multimedia">Presentación multimedia</Option>
                    <Option value="Maqueta o prototipo">Maqueta o prototipo</Option>
                    <Option value="Video documental">Video documental</Option>
                    <Option value="Obra artística">Obra artística</Option>
                    <Option value="Campaña publicitaria">Campaña publicitaria</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Alert
              message="Evaluación"
              description="Define las herramientas de evaluación y los criterios de éxito para esta situación de aprendizaje."
              type="info"
              showIcon
              className="mb-6"
            />

            <Row gutter={[24, 24]}>
              <Col span={24}>
                <Form.Item
                  name="assessmentTools"
                  label="Herramientas de Evaluación"
                  rules={[{ required: true, message: 'Selecciona al menos una herramienta' }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="Seleccionar herramientas..."
                    size="large"
                  >
                    {ASSESSMENT_TOOLS.map(tool => (
                      <Option key={tool} value={tool}>
                        {tool}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  name="successCriteria"
                  label="Criterios de Éxito"
                >
                  <Form.List name="successCriteria">
                    {(fields, { add, remove }) => (
                      <>
                        {fields.map(({ key, name, ...restField }) => (
                          <Row key={key} gutter={16} align="middle">
                            <Col xs={16} lg={18}>
                              <Form.Item
                                {...restField}
                                name={[name, 'criterion']}
                                rules={[{ required: true, message: 'Criterion is required' }]}
                              >
                                <Input placeholder="Criterio de éxito..." />
                              </Form.Item>
                            </Col>
                            <Col xs={6} lg={4}>
                              <Form.Item
                                {...restField}
                                name={[name, 'weight']}
                                rules={[{ required: true, message: 'Weight is required' }]}
                              >
                                <InputNumber
                                  min={1}
                                  max={100}
                                  placeholder="Peso %"
                                  className="w-full"
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={2} lg={2}>
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                              />
                            </Col>
                          </Row>
                        ))}
                        <Form.Item>
                          <Button
                            type="dashed"
                            onClick={() => add()}
                            block
                            icon={<PlusOutlined />}
                          >
                            Agregar Criterio
                          </Button>
                        </Form.Item>
                      </>
                    )}
                  </Form.List>
                </Form.Item>
              </Col>
            </Row>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Alert
              message="Adaptaciones DUA y Revisión Final"
              description="Define las adaptaciones según los principios del Diseño Universal para el Aprendizaje y revisa la situación completa."
              type="info"
              showIcon
              className="mb-6"
            />

            <Row gutter={[24, 24]}>
              <Col xs={24} lg={8}>
                <Card title="Múltiples Formas de Representación" size="small">
                  <Form.Item name={['duaAdaptations', 'multipleRepresentations']}>
                    <Select
                      mode="tags"
                      placeholder="Formas de presentar información..."
                      size="small"
                    >
                      <Option value="Visual/Gráfico">Visual/Gráfico</Option>
                      <Option value="Auditivo/Verbal">Auditivo/Verbal</Option>
                      <Option value="Texto/Escrito">Texto/Escrito</Option>
                      <Option value="Multimedia">Multimedia</Option>
                      <Option value="Manipulativo">Manipulativo</Option>
                    </Select>
                  </Form.Item>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card title="Múltiples Formas de Acción y Expresión" size="small">
                  <Form.Item name={['duaAdaptations', 'multipleActions']}>
                    <Select
                      mode="tags"
                      placeholder="Formas de expresar aprendizaje..."
                      size="small"
                    >
                      <Option value="Escrito">Escrito</Option>
                      <Option value="Oral">Oral</Option>
                      <Option value="Digital">Digital</Option>
                      <Option value="Artístico">Artístico</Option>
                      <Option value="Práctico">Práctico</Option>
                    </Select>
                  </Form.Item>
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Card title="Múltiples Formas de Implicación" size="small">
                  <Form.Item name={['duaAdaptations', 'multipleEngagements']}>
                    <Select
                      mode="tags"
                      placeholder="Formas de motivar..."
                      size="small"
                    >
                      <Option value="Individual">Individual</Option>
                      <Option value="Parejas">Parejas</Option>
                      <Option value="Grupos pequeños">Grupos pequeños</Option>
                      <Option value="Gran grupo">Gran grupo</Option>
                      <Option value="Gamificación">Gamificación</Option>
                    </Select>
                  </Form.Item>
                </Card>
              </Col>

              <Col span={24}>
                <Space>
                  <Form.Item name="isTemplate" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                  <Text>Guardar como plantilla reutilizable</Text>
                </Space>
              </Col>
            </Row>

            {/* Preview de la situación completa */}
            <Card title="Vista Previa de la Situación" className="mt-6">
              <Form.Item shouldUpdate>
                {({ getFieldsValue }) => {
                  const values = getFieldsValue();
                  return (
                    <div className="space-y-4">
                      <div>
                        <Text strong>Título:</Text>
                        <Paragraph>{values.title || 'Sin título'}</Paragraph>
                      </div>
                      <div>
                        <Text strong>Competencias:</Text>
                        <div className="mt-2">
                          {values.competencyIds?.map((id: string) => {
                            const comp = competenciesData?.data?.find(c => c.id === id);
                            return comp ? (
                              <Tag key={id} color="blue" className="mb-1">
                                {comp.name}
                              </Tag>
                            ) : null;
                          })}
                        </div>
                      </div>
                      <div>
                        <Text strong>Metodologías:</Text>
                        <div className="mt-2">
                          {values.methodologies?.map((method: string) => (
                            <Tag key={method} color="green" className="mb-1">
                              {method}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }}
              </Form.Item>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`learning-situation-editor ${className}`}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
        initialValues={{
          estimatedSessions: 5,
          isTemplate: false,
        }}
      >
        {/* Header */}
        <Card className="mb-6 shadow-sm">
          <Row align="middle" justify="space-between">
            <Col>
              <Title level={3} className="mb-1">
                <EditOutlined className="mr-2" />
                {situation ? 'Editar' : 'Nueva'} Situación de Aprendizaje
              </Title>
              <Text type="secondary">
                {situation ? 'Modificar situación existente' : 'Crear nueva situación siguiendo la metodología LOMLOE'}
              </Text>
            </Col>
            <Col>
              <Space>
                <Button icon={<EyeOutlined />} onClick={() => setPreviewMode(true)}>
                  Vista Previa
                </Button>
                {onCancel && (
                  <Button onClick={onCancel}>
                    Cancelar
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={createSituation.isPending || updateSituation.isPending}
                  onClick={handleSave}
                >
                  {situation ? 'Actualizar' : 'Crear'}
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Steps */}
        <Card className="mb-6 shadow-sm">
          <Steps
            current={currentStep}
            onChange={setCurrentStep}
            items={steps}
            className="mb-6"
          />
          
          <Row justify="center">
            <Col>
              <Progress
                percent={Math.round(((currentStep + 1) / steps.length) * 100)}
                size="small"
                className="w-64"
              />
            </Col>
          </Row>
        </Card>

        {/* Contenido del paso actual */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-6 shadow-sm">
            {renderStepContent()}
          </Card>
        </motion.div>

        {/* Navegación */}
        <Card className="shadow-sm">
          <Row justify="space-between">
            <Col>
              <Button
                onClick={prevStep}
                disabled={currentStep === 0}
                size="large"
              >
                Anterior
              </Button>
            </Col>
            <Col>
              <Space>
                <Text type="secondary">
                  Paso {currentStep + 1} de {steps.length}
                </Text>
              </Space>
            </Col>
            <Col>
              {currentStep < steps.length - 1 ? (
                <Button type="primary" onClick={nextStep} size="large">
                  Siguiente
                </Button>
              ) : (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={createSituation.isPending || updateSituation.isPending}
                  size="large"
                >
                  {situation ? 'Actualizar Situación' : 'Crear Situación'}
                </Button>
              )}
            </Col>
          </Row>
        </Card>
      </Form>

      {/* Modal de vista previa */}
      <Modal
        title="Vista Previa de la Situación de Aprendizaje"
        open={previewMode}
        onCancel={() => setPreviewMode(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewMode(false)}>
            Cerrar
          </Button>,
        ]}
        width={800}
      >
        <Form.Item shouldUpdate>
          {({ getFieldsValue }) => {
            const values = { ...formData, ...getFieldsValue() };
            return (
              <div className="space-y-4">
                <div>
                  <Title level={4}>{values.title || 'Sin título'}</Title>
                  <Paragraph>{values.description}</Paragraph>
                </div>
                
                <Divider />
                
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Text strong>Contexto:</Text>
                    <Paragraph>{values.context}</Paragraph>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text strong>Reto:</Text>
                    <Paragraph>{values.challenge}</Paragraph>
                  </Col>
                </Row>

                <Divider />

                <div>
                  <Text strong>Competencias:</Text>
                  <div className="mt-2">
                    {values.competencyIds?.map((id: string) => {
                      const comp = competenciesData?.data?.find(c => c.id === id);
                      return comp ? (
                        <Tag key={id} color="blue" className="mb-1">
                          {comp.name}
                        </Tag>
                      ) : null;
                    })}
                  </div>
                </div>

                <div>
                  <Text strong>Metodologías:</Text>
                  <div className="mt-2">
                    {values.methodologies?.map((method: string) => (
                      <Tag key={method} color="green" className="mb-1">
                        {method}
                      </Tag>
                    ))}
                  </div>
                </div>
              </div>
            );
          }}
        </Form.Item>
      </Modal>
    </div>
  );
};

export default LearningSituationEditor;