import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Typography,
  Space,
  Alert,
  Divider,
  Tag,
  List,
  Avatar,
  message,
  Switch,
  Row,
  Col,
  Spin,
  Tabs,
  Badge,
} from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  TableOutlined,
  EditOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';
import RubricGradingInterface from '../../components/rubrics/RubricGradingInterface';
import useTaskRubrics, { Rubric, SelectedCell, GradeWithRubricRequest } from '../../hooks/useTaskRubrics';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface TaskSubmission {
  id: string;
  status: string;
  submittedAt: string;
  isLate: boolean;
  grade?: number;
  finalGrade?: number;
  teacherFeedback?: string;
  privateNotes?: string;
  isGraded: boolean;
  needsRevision: boolean;
  student: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  task: {
    id: string;
    title: string;
    description?: string;
    instructions?: string;
    maxPoints?: number;
    latePenalty?: number;
    allowLateSubmission: boolean;
    rubricId?: string; // Nueva propiedad para rúbricas
  };
  attachments?: Array<{
    id: string;
    filename: string;
    originalName: string;
    size: number;
    type: string;
    description?: string;
  }>;
}

const TaskGradingPageWithRubric: React.FC = () => {
  const { submissionId } = useParams<{ taskId: string; submissionId: string }>();
  const navigate = useNavigate();

  // Safe Navigation
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === "function") {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn("Navigation error:", error, "Path:", path);
      }
    } else {
      console.warn("Navigate function not available:", path);
    }
  }, [navigate]);

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<TaskSubmission | null>(null);
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [selectedCells, setSelectedCells] = useState<Record<string, string>>({});
  const [finalGrade, setFinalGrade] = useState<number>(0);
  const [finalPercentage, setFinalPercentage] = useState<number>(0);
  const [gradingMode, setGradingMode] = useState<'manual' | 'rubric'>('manual');
  const [activeTab, setActiveTab] = useState<'rubric' | 'manual'>('rubric');

  const { getRubric, gradeSubmissionWithRubric, getTaskRubricAssessment, loading: rubricLoading } = useTaskRubrics();

  useEffect(() => {
    if (submissionId) {
      fetchSubmission();
    }
  }, [submissionId]);

  const fetchSubmission = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/tasks/submissions/${submissionId}`);
      const submissionData = response.data;
      setSubmission(submissionData);
      
      // Si la tarea tiene rúbrica, cargarla
      if (submissionData.task.rubricId) {
        console.log('[FETCH] Cargando rúbrica:', submissionData.task.rubricId);
        await loadRubric(submissionData.task.rubricId);
        setGradingMode('rubric');
        setActiveTab('rubric');
        
        // Pequeño delay para asegurar que el estado de rubric se ha actualizado
        setTimeout(async () => {
          await loadExistingRubricAssessment();
        }, 100);
      } else {
        setGradingMode('manual');
        setActiveTab('manual');
      }
      
      // Pre-populate form if already graded
      if (submissionData.isGraded) {
        form.setFieldsValue({
          grade: submissionData.grade,
          teacherFeedback: submissionData.teacherFeedback,
          privateNotes: submissionData.privateNotes,
          needsRevision: submissionData.needsRevision,
        });
      }
    } catch (error: any) {
      console.error('Error fetching submission:', error);
      message.error('Error al cargar la entrega');
    } finally {
      setLoading(false);
    }
  };

  const loadRubric = async (rubricId: string) => {
    const rubricData = await getRubric(rubricId);
    if (rubricData) {
      setRubric(rubricData);
    }
  };

  const loadExistingRubricAssessment = async () => {
    if (!submissionId) return;
    
    console.log('[RUBRIC LOAD] Cargando evaluación existente para submission:', submissionId);
    const existingAssessment = await getTaskRubricAssessment(submissionId);
    
    if (existingAssessment) {
      console.log('[RUBRIC LOAD] Evaluación existente encontrada:', existingAssessment);
      
      // Cargar celdas seleccionadas de evaluación previa
      const cellsMap: Record<string, string> = {};
      existingAssessment.selectedCells.forEach(cell => {
        cellsMap[cell.criterionId] = cell.levelId;
        console.log(`[RUBRIC LOAD] Mapeando celda: ${cell.criterionId} -> ${cell.levelId}`);
      });
      
      console.log('[RUBRIC LOAD] SelectedCells map final:', cellsMap);
      setSelectedCells(cellsMap);
      setFinalGrade(existingAssessment.finalGrade);
      setFinalPercentage(existingAssessment.percentage);
      
      // Pre-cargar feedback en el formulario
      form.setFieldsValue({
        teacherFeedback: existingAssessment.teacherFeedback,
      });
    } else {
      console.log('[RUBRIC LOAD] No se encontró evaluación existente');
    }
  };

  const handleCellSelect = (criterionId: string, levelId: string) => {
    setSelectedCells(prev => ({
      ...prev,
      [criterionId]: levelId,
    }));
  };

  const handleGradeCalculated = (grade: number, percentage: number) => {
    setFinalGrade(grade);
    setFinalPercentage(percentage);
  };

  const handleSubmitRubricGrade = async () => {
    try {
      if (!rubric) {
        message.error('No hay rúbrica disponible');
        return;
      }

      // Validar que se han seleccionado todas las celdas
      const missingCriteria = rubric.criteria.filter(
        criterion => !selectedCells[criterion.id]
      );

      if (missingCriteria.length > 0) {
        message.error(`Faltan criterios por evaluar: ${missingCriteria.map(c => c.name).join(', ')}`);
        return;
      }

      setSubmitting(true);
      
      const selectedCellsArray: SelectedCell[] = Object.entries(selectedCells).map(
        ([criterionId, levelId]) => ({ criterionId, levelId })
      );

      const gradeData: GradeWithRubricRequest = {
        selectedCells: selectedCellsArray,
        teacherFeedback: form.getFieldValue('teacherFeedback') || '',
        privateNotes: form.getFieldValue('privateNotes') || '',
      };

      const result = await gradeSubmissionWithRubric(submissionId!, gradeData);
      
      if (result) {
        message.success('Calificación con rúbrica guardada exitosamente');
        safeNavigate('/teacher/tasks-dashboard');
      }
    } catch (error: any) {
      console.error('Error submitting rubric grade:', error);
      message.error('Error al guardar la calificación con rúbrica');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitManualGrade = async (values: any) => {
    try {
      setSubmitting(true);
      await apiClient.post(`/tasks/submissions/${submissionId}/grade`, {
        grade: values.grade,
        teacherFeedback: values.teacherFeedback || '',
        privateNotes: values.privateNotes || '',
        needsRevision: values.needsRevision || false,
      });
      
      message.success('Calificación guardada exitosamente');
      safeNavigate('/teacher/tasks-dashboard');
    } catch (error: any) {
      console.error('Error grading submission:', error);
      message.error(error.response?.data?.message || 'Error al calificar la entrega');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/tasks/submissions/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading attachment:', error);
      message.error('Error al descargar el archivo');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'blue';
      case 'graded': return 'green';
      case 'returned': return 'orange';
      case 'late': return 'red';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted': return 'Entregada';
      case 'graded': return 'Calificada';
      case 'returned': return 'Devuelta';
      case 'late': return 'Tardía';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="Cargando entrega..." />
      </div>
    );
  }

  if (!submission) {
    return (
      <Alert
        message="Error"
        description="No se pudo cargar la entrega"
        type="error"
        showIcon
      />
    );
  }

  const maxPoints = submission.task.maxPoints || 10;
  const isLateSubmission = submission.isLate;
  const latePenalty = submission.task.latePenalty || 0;
  const hasRubric = !!submission.task.rubricId && !!rubric;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => safeNavigate('/teacher/tasks-dashboard')}
          className="mb-4"
        >
          Volver al Dashboard
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <Title level={2}>
              Calificar Entrega
              {hasRubric && (
                <Badge
                  count="Con Rúbrica"
                  style={{ backgroundColor: '#722ed1', marginLeft: 16 }}
                />
              )}
            </Title>
            <Text type="secondary">
              {submission.task.title}
            </Text>
          </div>
          
          {hasRubric && (
            <Space>
              <Button
                type={activeTab === 'rubric' ? 'primary' : 'default'}
                icon={<TableOutlined />}
                onClick={() => setActiveTab('rubric')}
              >
                Evaluación con Rúbrica
              </Button>
              <Button
                type={activeTab === 'manual' ? 'primary' : 'default'}
                icon={<EditOutlined />}
                onClick={() => setActiveTab('manual')}
              >
                Evaluación Manual
              </Button>
            </Space>
          )}
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Student and Task Info */}
        <Col xs={24} lg={hasRubric ? 6 : 8}>
          <Card title="Información del Estudiante">
            <Space direction="vertical" className="w-full">
              <div className="flex items-center gap-3">
                <Avatar size="large" icon={<UserOutlined />} />
                <div>
                  <Text strong>
                    {submission.student.user.profile.firstName} {submission.student.user.profile.lastName}
                  </Text>
                  <div>
                    <Tag color={getStatusColor(submission.status)}>
                      {getStatusLabel(submission.status)}
                    </Tag>
                    {isLateSubmission && (
                      <Tag color="red" icon={<ClockCircleOutlined />}>
                        Entrega Tardía
                      </Tag>
                    )}
                  </div>
                </div>
              </div>
              
              <Divider />
              
              <div>
                <Text strong>Fecha de entrega:</Text>
                <div>{dayjs(submission.submittedAt).format('DD/MM/YYYY HH:mm')}</div>
              </div>
              
              {isLateSubmission && latePenalty > 0 && (
                <Alert
                  message="Entrega tardía"
                  description={`Se aplicará una penalización del ${(latePenalty * 100).toFixed(1)}%`}
                  type="warning"
                  showIcon
                />
              )}
            </Space>
          </Card>

          {/* Task Details */}
          <Card title="Detalles de la Tarea" className="mt-4">
            <Space direction="vertical" className="w-full">
              <div>
                <Text strong>Puntuación máxima:</Text>
                <div>{maxPoints} puntos</div>
              </div>
              
              {hasRubric && rubric && (
                <div>
                  <Text strong>Rúbrica:</Text>
                  <div>{rubric.name}</div>
                  <Text type="secondary" className="text-sm">
                    {rubric.criteria.length} criterios, {rubric.levels.length} niveles
                  </Text>
                </div>
              )}
              
              {submission.task.description && (
                <div>
                  <Text strong>Descripción:</Text>
                  <Paragraph>{submission.task.description}</Paragraph>
                </div>
              )}
              
              {submission.task.instructions && (
                <div>
                  <Text strong>Instrucciones:</Text>
                  <Paragraph>{submission.task.instructions}</Paragraph>
                </div>
              )}
            </Space>
          </Card>

          {/* Attachments */}
          {submission.attachments && submission.attachments.length > 0 && (
            <Card title="Archivos Entregados" className="mt-4">
              <List
                size="small"
                dataSource={submission.attachments}
                renderItem={(attachment) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                      >
                        Descargar
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar size="small" icon={<FileTextOutlined />} />}
                      title={<Text className="text-sm">{attachment.originalName}</Text>}
                      description={
                        <Text type="secondary" className="text-xs">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Col>

        {/* Grading Interface */}
        <Col xs={24} lg={hasRubric ? 18 : 16}>
          {hasRubric ? (
            // Interface with Rubric and Manual tabs
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'rubric' | 'manual')}
              size="large"
            >
              <TabPane
                tab={
                  <span>
                    <TableOutlined />
                    Evaluación con Rúbrica
                  </span>
                }
                key="rubric"
              >
                {rubric && (
                  <div>
                    <RubricGradingInterface
                      rubric={rubric}
                      selectedCells={selectedCells}
                      onCellSelect={handleCellSelect}
                      onGradeCalculated={handleGradeCalculated}
                      className="mb-4"
                    />
                    
                    {/* Feedback Form for Rubric */}
                    <Card title="Comentarios adicionales">
                      <Form form={form} layout="vertical">
                        <Form.Item
                          name="teacherFeedback"
                          label="Retroalimentación para el estudiante"
                        >
                          <TextArea
                            rows={3}
                            placeholder="Comentarios que verá el estudiante..."
                          />
                        </Form.Item>

                        <Form.Item
                          name="privateNotes"
                          label="Notas privadas (solo para profesores)"
                        >
                          <TextArea
                            rows={2}
                            placeholder="Notas internas que no verá el estudiante..."
                          />
                        </Form.Item>

                        <Form.Item>
                          <Space>
                            <Button
                              type="primary"
                              onClick={handleSubmitRubricGrade}
                              loading={submitting || rubricLoading}
                              icon={<CheckCircleOutlined />}
                              size="large"
                            >
                              {submission.isGraded ? 'Actualizar Evaluación' : 'Guardar Evaluación'}
                            </Button>
                            <Button onClick={() => safeNavigate('/teacher/tasks-dashboard')}>
                              Cancelar
                            </Button>
                          </Space>
                        </Form.Item>
                      </Form>
                    </Card>
                  </div>
                )}
              </TabPane>
              
              <TabPane
                tab={
                  <span>
                    <EditOutlined />
                    Evaluación Manual
                  </span>
                }
                key="manual"
              >
                {/* Manual Grading Form */}
                <Card title="Calificación Manual">
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmitManualGrade}
                  >
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="grade"
                          label={`Calificación (0-${maxPoints})`}
                          rules={[
                            { required: true, message: 'La calificación es requerida' },
                            { type: 'number', min: 0, max: maxPoints, message: `La calificación debe estar entre 0 y ${maxPoints}` }
                          ]}
                        >
                          <InputNumber
                            min={0}
                            max={maxPoints}
                            precision={1}
                            step={0.1}
                            style={{ width: '100%' }}
                            placeholder={`Ingresa la calificación (0-${maxPoints})`}
                          />
                        </Form.Item>
                      </Col>
                      
                      <Col span={12}>
                        <Form.Item
                          name="needsRevision"
                          label="Requiere revisión"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      name="teacherFeedback"
                      label="Retroalimentación para el estudiante"
                    >
                      <TextArea
                        rows={4}
                        placeholder="Comentarios que verá el estudiante..."
                      />
                    </Form.Item>

                    <Form.Item
                      name="privateNotes"
                      label="Notas privadas (solo para profesores)"
                    >
                      <TextArea
                        rows={3}
                        placeholder="Notas internas que no verá el estudiante..."
                      />
                    </Form.Item>

                    <Form.Item>
                      <Space>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={submitting}
                          icon={<CheckCircleOutlined />}
                        >
                          {submission.isGraded ? 'Actualizar Calificación' : 'Guardar Calificación'}
                        </Button>
                        <Button onClick={() => safeNavigate('/teacher/tasks-dashboard')}>
                          Cancelar
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </Card>
              </TabPane>
            </Tabs>
          ) : (
            // Manual grading only (no rubric)
            <Card title="Calificación">
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmitManualGrade}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="grade"
                      label={`Calificación (0-${maxPoints})`}
                      rules={[
                        { required: true, message: 'La calificación es requerida' },
                        { type: 'number', min: 0, max: maxPoints, message: `La calificación debe estar entre 0 y ${maxPoints}` }
                      ]}
                    >
                      <InputNumber
                        min={0}
                        max={maxPoints}
                        precision={1}
                        step={0.1}
                        style={{ width: '100%' }}
                        placeholder={`Ingresa la calificación (0-${maxPoints})`}
                      />
                    </Form.Item>
                  </Col>
                  
                  <Col span={12}>
                    <Form.Item
                      name="needsRevision"
                      label="Requiere revisión"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="teacherFeedback"
                  label="Retroalimentación para el estudiante"
                >
                  <TextArea
                    rows={4}
                    placeholder="Comentarios que verá el estudiante..."
                  />
                </Form.Item>

                <Form.Item
                  name="privateNotes"
                  label="Notas privadas (solo para profesores)"
                >
                  <TextArea
                    rows={3}
                    placeholder="Notas internas que no verá el estudiante..."
                  />
                </Form.Item>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={submitting}
                      icon={<CheckCircleOutlined />}
                    >
                      {submission.isGraded ? 'Actualizar Calificación' : 'Guardar Calificación'}
                    </Button>
                    <Button onClick={() => safeNavigate('/teacher/tasks-dashboard')}>
                      Cancelar
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default TaskGradingPageWithRubric;