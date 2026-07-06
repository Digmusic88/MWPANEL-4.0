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
} from 'antd';
import {
  UserOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import apiClient from '@services/apiClient';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

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

const TaskGradingPage: React.FC = () => {
  const { submissionId } = useParams<{ taskId: string; submissionId: string }>();
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
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

  const handleSubmitGrade = async (values: any) => {
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => safeNavigate('/teacher/tasks-dashboard')}
          className="mb-4"
        >
          Volver al Dashboard
        </Button>
        
        <Title level={2}>
          Calificar Entrega
        </Title>
        <Text type="secondary">
          {submission.task.title}
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Student and Task Info */}
        <Col xs={24} lg={8}>
          <Card title="Información del Estudiante">
            <Space direction="vertical" className="w-full">
              <div className="flex items-center gap-3">
                <Avatar size="large" icon={<UserOutlined />} />
                <div>
                  <Text strong>
                    {submission.student?.user?.profile?.firstName && submission.student?.user?.profile?.lastName
                      ? `${submission.student.user.profile.firstName} ${submission.student.user.profile.lastName}`
                      : submission.student?.user?.profile?.fullName || submission.student?.user?.email || 'Estudiante sin nombre'}
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
        </Col>

        {/* Grading Form */}
        <Col xs={24} lg={16}>
          {/* Attachments */}
          {submission.attachments && submission.attachments.length > 0 && (
            <Card title="Archivos Entregados" className="mb-4">
              <List
                dataSource={submission.attachments}
                renderItem={(attachment) => (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                      >
                        Descargar
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<FileTextOutlined />} />}
                      title={attachment.originalName}
                      description={
                        <Space>
                          <Text type="secondary">{(attachment.size / 1024).toFixed(1)} KB</Text>
                          <Text type="secondary">•</Text>
                          <Text type="secondary">{attachment.type}</Text>
                          {attachment.description && (
                            <>
                              <Text type="secondary">•</Text>
                              <Text type="secondary">{attachment.description}</Text>
                            </>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* Grading Form */}
          <Card title="Calificación">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmitGrade}
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
        </Col>
      </Row>
    </div>
  );
};

export default TaskGradingPage;