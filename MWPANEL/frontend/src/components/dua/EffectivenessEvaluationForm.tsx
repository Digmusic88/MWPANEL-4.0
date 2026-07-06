/**
 * @componente: EffectivenessEvaluationForm
 * @módulo: DUA (Diseño Universal para el Aprendizaje)
 * @función: Formulario para crear y editar evaluaciones de efectividad de acomodaciones DUA
 * @crítico: SÍ - Evaluación de impacto de adaptaciones educativas
 * @dependencias: React Hook Form, Ant Design, duaService, accommodationService
 * @relacionado_con: EffectivenessEvaluationPage, DuaDashboard, AccommodationSystem
 */

import React, { useState, useEffect } from 'react';
import {
  Form,
  Card,
  Row,
  Col,
  Select,
  DatePicker,
  InputNumber,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Radio,
  Switch,
  message,
  Spin,
  Progress,
  Tag,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  BookOutlined,
  StarOutlined,
  CalendarOutlined,
  FileTextOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { duaService } from '../../services/duaService';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Student {
  id: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  classGroup?: {
    name: string;
  };
}

interface Accommodation {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  duaProfile: {
    student: Student;
  };
}

interface EffectivenessEvaluationFormProps {
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
}

const EffectivenessEvaluationForm: React.FC<EffectivenessEvaluationFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  const [filteredAccommodations, setFilteredAccommodations] = useState<Accommodation[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | undefined>();
  const [selectedAccommodation, setSelectedAccommodation] = useState<Accommodation | undefined>();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (initialData) {
      populateForm();
    }
  }, [initialData]);

  useEffect(() => {
    if (selectedStudent) {
      filterAccommodationsByStudent(selectedStudent);
    } else {
      setFilteredAccommodations([]);
    }
  }, [selectedStudent, accommodations]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Obtener acomodaciones activas (que pueden ser evaluadas)
      const accommodationsResponse = await duaService.getAccommodations({
        status: 'ACTIVE',
        limit: 100,
      });
      
      setAccommodations(accommodationsResponse.data || []);
      
      // Extraer estudiantes únicos de las acomodaciones
      const uniqueStudents = Array.from(
        new Map(
          accommodationsResponse.data
            ?.filter(acc => acc.duaProfile?.student)
            .map(acc => [acc.duaProfile.student.id, acc.duaProfile.student])
        ).values()
      );
      
      setStudents(uniqueStudents);
    } catch (error: any) {
      console.error('Error fetching initial data:', error);
      message.error('Error al cargar los datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const populateForm = () => {
    if (!initialData) return;

    form.setFieldsValue({
      studentId: initialData.studentId,
      accommodationId: initialData.accommodationId,
      evaluationDate: initialData.evaluationDate ? dayjs(initialData.evaluationDate) : dayjs(),
      overallRating: initialData.overallRating,
      observations: initialData.observations,
      recommendations: initialData.recommendations,
      suggestContinuation: initialData.suggestContinuation,
      suggestModification: initialData.suggestModification,
      modificationSuggestions: initialData.modificationSuggestions,
      // Métricas específicas
      'metrics.academicProgress.preAccommodationPerformance': initialData.metrics?.academicProgress?.preAccommodationPerformance,
      'metrics.academicProgress.postAccommodationPerformance': initialData.metrics?.academicProgress?.postAccommodationPerformance,
      'metrics.academicProgress.improvementPercentage': initialData.metrics?.academicProgress?.improvementPercentage,
      'metrics.participation.classEngagement': initialData.metrics?.participation?.classEngagement,
      'metrics.participation.taskCompletion': initialData.metrics?.participation?.taskCompletion,
      'metrics.participation.independenceLevel': initialData.metrics?.participation?.independenceLevel,
      'metrics.participation.peerInteraction': initialData.metrics?.participation?.peerInteraction,
      'metrics.wellbeing.anxietyReduction': initialData.metrics?.wellbeing?.anxietyReduction,
      'metrics.wellbeing.confidenceIncrease': initialData.metrics?.wellbeing?.confidenceIncrease,
      'metrics.wellbeing.motivationLevel': initialData.metrics?.wellbeing?.motivationLevel,
      'metrics.wellbeing.frustrationDecrease': initialData.metrics?.wellbeing?.frustrationDecrease,
      'metrics.implementation.easeOfUse': initialData.metrics?.implementation?.easeOfUse,
      'metrics.implementation.consistencyOfApplication': initialData.metrics?.implementation?.consistencyOfApplication,
      'metrics.implementation.resourceRequirements': initialData.metrics?.implementation?.resourceRequirements,
      'metrics.implementation.teacherWorkload': initialData.metrics?.implementation?.teacherWorkload,
    });

    setSelectedStudent(initialData.studentId);
    if (initialData.accommodationId) {
      const accommodation = accommodations.find(acc => acc.id === initialData.accommodationId);
      setSelectedAccommodation(accommodation);
    }
  };

  const filterAccommodationsByStudent = (studentId: string) => {
    const studentAccommodations = accommodations.filter(
      acc => acc.duaProfile?.student?.id === studentId
    );
    setFilteredAccommodations(studentAccommodations);
  };

  const handleStudentChange = (studentId: string) => {
    setSelectedStudent(studentId);
    form.setFieldValue('accommodationId', undefined);
    setSelectedAccommodation(undefined);
  };

  const handleAccommodationChange = (accommodationId: string) => {
    const accommodation = filteredAccommodations.find(acc => acc.id === accommodationId);
    setSelectedAccommodation(accommodation);
  };

  const handleSubmit = async (values: any) => {
    try {
      setSubmitting(true);

      // Organizar las métricas en la estructura esperada por el backend
      const metricsData = {
        academicProgress: {
          preAccommodationPerformance: values['metrics.academicProgress.preAccommodationPerformance'],
          postAccommodationPerformance: values['metrics.academicProgress.postAccommodationPerformance'],
          improvementPercentage: values['metrics.academicProgress.improvementPercentage'],
        },
        participation: {
          classEngagement: values['metrics.participation.classEngagement'],
          taskCompletion: values['metrics.participation.taskCompletion'],
          independenceLevel: values['metrics.participation.independenceLevel'],
          peerInteraction: values['metrics.participation.peerInteraction'],
        },
        wellbeing: {
          anxietyReduction: values['metrics.wellbeing.anxietyReduction'],
          confidenceIncrease: values['metrics.wellbeing.confidenceIncrease'],
          motivationLevel: values['metrics.wellbeing.motivationLevel'],
          frustrationDecrease: values['metrics.wellbeing.frustrationDecrease'],
        },
        implementation: {
          easeOfUse: values['metrics.implementation.easeOfUse'],
          consistencyOfApplication: values['metrics.implementation.consistencyOfApplication'],
          resourceRequirements: values['metrics.implementation.resourceRequirements'],
          teacherWorkload: values['metrics.implementation.teacherWorkload'],
        },
      };

      // Limpiar valores undefined
      Object.keys(metricsData).forEach(key => {
        const section = metricsData[key as keyof typeof metricsData];
        Object.keys(section).forEach(subKey => {
          if (section[subKey as keyof typeof section] === undefined) {
            delete section[subKey as keyof typeof section];
          }
        });
        if (Object.keys(section).length === 0) {
          delete metricsData[key as keyof typeof metricsData];
        }
      });

      const formData = {
        accommodationId: values.accommodationId,
        studentId: values.studentId,
        evaluationDate: values.evaluationDate.format('YYYY-MM-DD'),
        effectivenessRating: values.overallRating,
        teacherFeedback: values.observations,
        studentFeedback: values.studentFeedback,
        evidence: values.evidence,
        adjustmentsNeeded: values.recommendations,
        // Keep the old format for backward compatibility
        overallRating: values.overallRating,
        metrics: metricsData,
        observations: values.observations,
        recommendations: values.recommendations,
        suggestContinuation: values.suggestContinuation || false,
        suggestModification: values.suggestModification || false,
        modificationSuggestions: values.modificationSuggestions,
      };

      await onSubmit(formData);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      message.error('Error al guardar la evaluación');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return '#2E7D52';
    if (rating >= 3) return '#B45309';
    if (rating >= 2) return '#ff7875';
    return '#ff4d4f';
  };

  const ratingOptions = [
    { value: 1, label: '1 - Muy Baja' },
    { value: 2, label: '2 - Baja' },
    { value: 3, label: '3 - Media' },
    { value: 4, label: '4 - Alta' },
    { value: 5, label: '5 - Muy Alta' },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Cargando datos...</Text>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          evaluationDate: dayjs(),
          suggestContinuation: true,
          suggestModification: false,
        }}
      >
        {/* Información básica */}
        <Card title="Información Básica" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="studentId"
                label="Estudiante"
                rules={[{ required: true, message: 'Selecciona un estudiante' }]}
              >
                <Select
                  placeholder="Seleccionar estudiante"
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) || false
                  }
                  onChange={handleStudentChange}
                  suffixIcon={<UserOutlined />}
                >
                  {students.map(student => (
                    <Option key={student.id} value={student.id}>
                      <Space>
                        <span>
                          {student.user.profile.firstName} {student.user.profile.lastName}
                        </span>
                        {student.classGroup && (
                          <Tag>{student.classGroup.name}</Tag>
                        )}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="accommodationId"
                label="Acomodación"
                rules={[{ required: true, message: 'Selecciona una acomodación' }]}
              >
                <Select
                  placeholder="Seleccionar acomodación"
                  disabled={!selectedStudent}
                  onChange={handleAccommodationChange}
                  suffixIcon={<BookOutlined />}
                >
                  {filteredAccommodations.map(accommodation => (
                    <Option key={accommodation.id} value={accommodation.id}>
                      <div>
                        <Text strong>{accommodation.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {accommodation.category} - {accommodation.type}
                        </Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {selectedAccommodation && (
            <Alert
              message="Acomodación Seleccionada"
              description={selectedAccommodation.description}
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} md={12}>
              <Form.Item
                name="evaluationDate"
                label="Fecha de Evaluación"
                rules={[{ required: true, message: 'Selecciona la fecha de evaluación' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                  suffixIcon={<CalendarOutlined />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="overallRating"
                label="Calificación General"
                rules={[{ required: true, message: 'Proporciona una calificación general' }]}
              >
                <Select
                  placeholder="Seleccionar calificación"
                  suffixIcon={<StarOutlined />}
                >
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      <Space>
                        <Progress
                          type="circle"
                          size={20}
                          percent={option.value * 20}
                          format={() => option.value}
                          strokeColor={getRatingColor(option.value)}
                        />
                        <span>{option.label}</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Métricas de Progreso Académico */}
        <Card title="Progreso Académico" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Form.Item
                name="metrics.academicProgress.preAccommodationPerformance"
                label="Rendimiento Antes (%)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  formatter={(value) => `${value}%`}
                  parser={(value) => value?.replace('%', '') as any}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="metrics.academicProgress.postAccommodationPerformance"
                label="Rendimiento Después (%)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={100}
                  formatter={(value) => `${value}%`}
                  parser={(value) => value?.replace('%', '') as any}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name="metrics.academicProgress.improvementPercentage"
                label="Mejora (%)"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={-100}
                  max={100}
                  formatter={(value) => `${value}%`}
                  parser={(value) => value?.replace('%', '') as any}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Métricas de Participación */}
        <Card title="Participación en Clase" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.participation.classEngagement"
                label="Participación en Clase"
              >
                <Select placeholder="Evaluar participación">
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.participation.taskCompletion"
                label="Finalización de Tareas"
              >
                <Select placeholder="Evaluar finalización">
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.participation.independenceLevel"
                label="Nivel de Independencia"
              >
                <Select placeholder="Evaluar independencia">
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.participation.peerInteraction"
                label="Interacción con Compañeros"
              >
                <Select placeholder="Evaluar interacción">
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Métricas de Bienestar */}
        <Card title="Bienestar del Estudiante" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.wellbeing.anxietyReduction"
                label="Reducción de Ansiedad"
              >
                <Select placeholder="Evaluar ansiedad">
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.wellbeing.confidenceIncrease"
                label="Aumento de Confianza"
              >
                <Select placeholder="Evaluar confianza">
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.wellbeing.motivationLevel"
                label="Nivel de Motivación"
              >
                <Select placeholder="Evaluar motivación">
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.wellbeing.frustrationDecrease"
                label="Reducción de Frustración"
              >
                <Select placeholder="Evaluar frustración">
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Métricas de Implementación */}
        <Card title="Implementación y Recursos" style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.implementation.easeOfUse"
                label="Facilidad de Uso"
              >
                <Select placeholder="Evaluar facilidad">
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.implementation.consistencyOfApplication"
                label="Consistencia de Aplicación"
              >
                <Select placeholder="Evaluar consistencia">
                  {ratingOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.implementation.resourceRequirements"
                label="Requerimientos de Recursos"
              >
                <Select placeholder="Evaluar recursos">
                  <Option value="low">Bajos</Option>
                  <Option value="medium">Medios</Option>
                  <Option value="high">Altos</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="metrics.implementation.teacherWorkload"
                label="Carga de Trabajo del Profesor"
              >
                <Select placeholder="Evaluar carga">
                  <Option value="decreased">Disminuyó</Option>
                  <Option value="same">Igual</Option>
                  <Option value="increased">Aumentó</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Observaciones y Recomendaciones */}
        <Card title="Observaciones y Recomendaciones" style={{ marginBottom: 24 }}>
          <Form.Item
            name="observations"
            label="Observaciones"
            extra="Describe el impacto observado de la acomodación"
          >
            <TextArea
              rows={4}
              placeholder="Describe las observaciones específicas sobre la efectividad de la acomodación..."
            />
          </Form.Item>

          <Form.Item
            name="recommendations"
            label="Recomendaciones"
            extra="Proporciona recomendaciones para mejorar o continuar la acomodación"
          >
            <TextArea
              rows={3}
              placeholder="Recomendaciones para el futuro uso de esta acomodación..."
            />
          </Form.Item>

          <Divider />

          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="suggestContinuation"
                label="¿Recomiendas continuar con esta acomodación?"
                valuePropName="checked"
              >
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="suggestModification"
                label="¿Requiere modificaciones?"
                valuePropName="checked"
              >
                <Switch checkedChildren="Sí" unCheckedChildren="No" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="modificationSuggestions"
            label="Sugerencias de Modificación"
            extra="Si marcaste que requiere modificaciones, describe qué cambios sugieres"
          >
            <TextArea
              rows={3}
              placeholder="Describe las modificaciones sugeridas..."
            />
          </Form.Item>
        </Card>

        {/* Botones de acción */}
        <Card>
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={onCancel} icon={<CloseOutlined />}>
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                icon={<SaveOutlined />}
              >
                {initialData ? 'Actualizar Evaluación' : 'Guardar Evaluación'}
              </Button>
            </Space>
          </div>
        </Card>
      </Form>
    </motion.div>
  );
};

export default EffectivenessEvaluationForm;