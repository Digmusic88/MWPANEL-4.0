import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  Typography,
  Card,
  Alert,
  List,
  Avatar,
  Tag,
  Spin,
  Row,
  Col,
  Statistic
} from 'antd';
import {
  SendOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { communicationsService } from '../../services/communications.service';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text } = Typography;

interface TeacherBulkMessageModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

interface Student {
  id: string;
  displayName: string;
  email: string;
  classGroup: string;
  subjects?: string[];
}

interface FormValues {
  subject: string;
  content: string;
  type: string;
  priority: string;
}

const TeacherBulkMessageModal: React.FC<TeacherBulkMessageModalProps> = ({
  visible,
  onCancel,
  onSuccess
}) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Cargar estudiantes del profesor
  useEffect(() => {
    if (visible && user?.role === 'teacher') {
      loadMyStudents();
    }
  }, [visible, user]);

  const loadMyStudents = async () => {
    try {
      setLoadingStudents(true);
      const data = await communicationsService.getMyStudents();

      // Transformar datos para mostrar
      const studentList: Student[] = data.map(student => ({
        id: student.id,
        displayName: student.displayName || `${student.firstName} ${student.lastName}`,
        email: student.email,
        classGroup: student.classGroup || 'Sin clase asignada',
        subjects: student.subjects || []
      }));

      setStudents(studentList);
    } catch (error) {
      console.error('Error cargando estudiantes:', error);
      message.error('Error al cargar tus estudiantes');
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSendToMyStudents = async (values: FormValues) => {
    if (students.length === 0) {
      message.error('No tienes estudiantes asignados');
      return;
    }

    try {
      setLoading(true);

      const messageData = {
        subject: values.subject,
        content: values.content,
        type: values.type || 'announcement',
        priority: values.priority || 'normal'
      };

      const result = await communicationsService.sendMessageToMyStudents(messageData);

      message.success(result.message);
      form.resetFields();
      onSuccess?.();
      onCancel();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      message.error('Error al enviar el mensaje a tus estudiantes');
    } finally {
      setLoading(false);
    }
  };

  // Agrupar estudiantes por clase
  const studentsByClass = students.reduce((acc, student) => {
    const className = student.classGroup;
    if (!acc[className]) {
      acc[className] = [];
    }
    acc[className].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  const totalStudents = students.length;
  const totalClasses = Object.keys(studentsByClass).length;

  return (
    <Modal
      title={
        <div>
          <TeamOutlined style={{ marginRight: 8 }} />
          Enviar Mensaje a Todos Mis Estudiantes
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSendToMyStudents}
      >
        {/* Información del profesor */}
        <Alert
          message={`Enviando como: ${user?.firstName} ${user?.lastName} (Profesor)`}
          type="info"
          style={{ marginBottom: 16 }}
        />

        {/* Estadísticas de estudiantes */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Statistic
                title="Total Estudiantes"
                value={totalStudents}
                prefix={<UserOutlined />}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Clases"
                value={totalClasses}
                prefix={<BookOutlined />}
              />
            </Col>
            <Col span={8}>
              <Button
                type="link"
                icon={<TeamOutlined />}
                onClick={loadMyStudents}
                loading={loadingStudents}
              >
                Actualizar Lista
              </Button>
            </Col>
          </Row>
        </Card>

        {/* Lista de estudiantes */}
        <Card
          title={
            <div>
              <TeamOutlined style={{ marginRight: 8 }} />
              Mis Estudiantes ({totalStudents})
            </div>
          }
          size="small"
          style={{ marginBottom: 16, maxHeight: 300, overflow: 'auto' }}
        >
          {loadingStudents ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>Cargando estudiantes...</div>
            </div>
          ) : totalStudents === 0 ? (
            <Alert
              message="No hay estudiantes asignados"
              description="No tienes estudiantes en tus clases o materias asignadas."
              type="warning"
              showIcon
            />
          ) : (
            <div>
              {Object.entries(studentsByClass).map(([className, classStudents]) => (
                <div key={className} style={{ marginBottom: 16 }}>
                  <Title level={5}>
                    <BookOutlined style={{ marginRight: 8 }} />
                    {className} ({classStudents.length} estudiantes)
                  </Title>
                  <List
                    size="small"
                    dataSource={classStudents}
                    renderItem={(student) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<Avatar icon={<UserOutlined />} />}
                          title={student.displayName}
                          description={
                            <div>
                              <Text type="secondary">{student.email}</Text>
                              {student.subjects && student.subjects.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                  {student.subjects.map(subject => (
                                    <Tag key={subject} size="small">{subject}</Tag>
                                  ))}
                                </div>
                              )}
                            </div>
                          }
                        />
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      </List.Item>
                    )}
                  />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Formulario del mensaje */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Asunto"
              name="subject"
              rules={[{ required: true, message: 'El asunto es obligatorio' }]}
            >
              <Input placeholder="Escriba el asunto del mensaje" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Tipo"
              name="type"
              initialValue="announcement"
            >
              <Select>
                <Option value="announcement">Comunicado</Option>
                <Option value="alert">Alerta</Option>
                <Option value="reminder">Recordatorio</Option>
                <Option value="general">General</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              label="Prioridad"
              name="priority"
              initialValue="normal"
            >
              <Select>
                <Option value="low">Baja</Option>
                <Option value="normal">Normal</Option>
                <Option value="high">Alta</Option>
                <Option value="urgent">Urgente</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Contenido del Mensaje"
          name="content"
          rules={[{ required: true, message: 'El contenido es obligatorio' }]}
        >
          <TextArea
            rows={6}
            placeholder="Escriba el contenido del mensaje que se enviará a todos sus estudiantes..."
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SendOutlined />}
              loading={loading}
              disabled={totalStudents === 0}
            >
              Enviar a Mis Estudiantes ({totalStudents})
            </Button>
            <Button onClick={onCancel}>
              Cancelar
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TeacherBulkMessageModal;