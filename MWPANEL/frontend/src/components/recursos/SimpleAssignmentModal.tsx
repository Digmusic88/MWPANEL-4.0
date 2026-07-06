/**
 * @archivo: SimpleAssignmentModal.tsx
 * @módulo: Educational Resources - Simple Assignment
 * @función: Modal simple para asignar recursos a estudiantes/clases
 * @proyecto: MW Panel 2.0 - Sistema Simple de Asignaciones
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Modal sencillo que permite a los profesores asignar recursos educativos
 * directamente a estudiantes individuales o grupos de clase.
 * 
 * FUNCIONALIDADES:
 * - Asignación individual a estudiante
 * - Asignación a grupo de clase completo
 * - Fecha límite opcional
 * - Instrucciones personalizables
 * - Vista previa del recurso
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - SIMPLE ASSIGNMENT SYSTEM
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Space,
  Typography,
  Alert,
  message,
  Card,
  Avatar,
  Tag,
  Divider
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  CalendarOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { useAuth } from '../../hooks/useAuth';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface SimpleAssignmentModalProps {
  visible: boolean;
  resource: any; // Recurso a asignar
  onAssign: (assignmentData: AssignmentData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface AssignmentData {
  resourceId: string;
  assignmentType: 'individual' | 'class';
  targetId?: string; // For backward compatibility
  targetIds?: string[]; // Multiple students or classes
  dueDate?: string;
  instructions?: string;
}

interface Student {
  id: string;
  user: {
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  educationalLevel: {
    name: string;
  };
}

interface ClassGroup {
  id: string;
  name: string;
  section: string;
  courses: any[];
}

export const SimpleAssignmentModal: React.FC<SimpleAssignmentModalProps> = ({
  visible,
  resource,
  onAssign,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  
  // Estados
  const [assignmentType, setAssignmentType] = useState<'individual' | 'class'>('class');
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Cargar datos cuando se abre el modal
  useEffect(() => {
    if (visible) {
      loadAssignmentData();
      form.resetFields();
      setAssignmentType('class');
    }
  }, [visible, form]);

  // Función para cargar estudiantes y clases
  const loadAssignmentData = async () => {
    try {
      setLoadingData(true);
      
      // Cargar clases del profesor - usando endpoint correcto
      const token = localStorage.getItem('mw-panel-auth');
      let accessToken = '';
      if (token) {
        try {
          const { state } = JSON.parse(token);
          accessToken = state.accessToken;
        } catch (e) {
          console.error('Error parsing auth token:', e);
        }
      }
      
      const classesResponse = await fetch('/api/class-groups', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (classesResponse.ok) {
        const classesData = await classesResponse.json();
        setClasses(classesData);
      } else {
        console.error('Error loading classes:', classesResponse.status);
      }
      
      // Cargar estudiantes siempre para tener los datos listos
      const studentsResponse = await fetch('/api/students', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        setStudents(studentsData);
      } else {
        console.error('Error loading students:', studentsResponse.status);
      }
    } catch (error) {
      console.error('Error loading assignment data:', error);
      message.error('Error al cargar datos para la asignación');
    } finally {
      setLoadingData(false);
    }
  };

  // Manejar cambio de tipo de asignación
  const handleAssignmentTypeChange = (type: 'individual' | 'class') => {
    setAssignmentType(type);
    form.setFieldValue('targetId', undefined);
  };

  // Manejar envío del formulario
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const assignmentData: AssignmentData = {
        resourceId: resource.id,
        assignmentType,
        targetIds: Array.isArray(values.targetId) ? values.targetId : [values.targetId],
        targetId: Array.isArray(values.targetId) ? values.targetId[0] : values.targetId, // For backward compatibility
        dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
        instructions: values.instructions
      };

      await onAssign(assignmentData);
      message.success('Recurso asignado correctamente');
      form.resetFields();
    } catch (error) {
      message.error('Error al asignar el recurso');
    }
  };

  // Renderizar información del recurso
  const renderResourceInfo = () => (
    <Card size="small" className="mb-4">
      <div className="flex items-center gap-3">
        <Avatar 
          size={48} 
          icon={<BookOutlined />}
          src={resource.thumbnailUrl}
        />
        <div className="flex-1">
          <Title level={5} className="mb-0">
            {resource.title}
          </Title>
          <Text type="secondary" className="block">
            {resource.description && resource.description.length > 100 
              ? `${resource.description.substring(0, 100)}...`
              : resource.description
            }
          </Text>
          <div className="flex items-center gap-2 mt-2">
            <Tag>{String(resource.type || 'Sin tipo')}</Tag>
            {resource.subject && <Tag color="blue">{typeof resource.subject === 'object' ? String(resource.subject?.name || 'Sin asignatura') : String(resource.subject || 'Sin asignatura')}</Tag>}
            {resource.educationalLevel && <Tag color="green">{typeof resource.educationalLevel === 'object' ? String(resource.educationalLevel?.name || 'Sin nivel') : String(resource.educationalLevel || 'Sin nivel')}</Tag>}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <FileTextOutlined />
          <span>Asignar Recurso</span>
        </div>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={loading}
      width={600}
      okText="Asignar"
      cancelText="Cancelar"
    >
      {resource && renderResourceInfo()}
      
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          assignmentType: 'class'
        }}
      >
        {/* Tipo de asignación */}
        <Form.Item 
          label="Tipo de asignación"
          name="assignmentType"
          rules={[{ required: true, message: 'Seleccione el tipo de asignación' }]}
        >
          <Select
            value={assignmentType}
            onChange={handleAssignmentTypeChange}
            size="large"
          >
            <Option value="class">
              <Space>
                <TeamOutlined />
                <span>Asignar a grupo de clase completo</span>
              </Space>
            </Option>
            <Option value="individual">
              <Space>
                <UserOutlined />
                <span>Asignar a estudiante individual</span>
              </Space>
            </Option>
          </Select>
        </Form.Item>

        {/* Selector de objetivo */}
        {assignmentType === 'class' ? (
          <Form.Item
            label="Grupo de clase"
            name="targetId"
            rules={[{ required: true, message: 'Seleccione un grupo de clase' }]}
          >
            <Select
              mode="multiple"
              placeholder="Seleccione uno o más grupos de clase"
              size="large"
              loading={loadingData}
              showSearch
              filterOption={(input, option) => {
                // Extraer el texto del componente para búsqueda
                const classText = `${option?.['data-class-name'] || ''} ${option?.['data-class-section'] || ''}`;
                return classText.toLowerCase().indexOf(input.toLowerCase()) >= 0;
              }}
            >
              {classes.map(classItem => (
                <Option 
                  key={classItem.id} 
                  value={classItem.id}
                  data-class-name={classItem.name}
                  data-class-section={classItem.section}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TeamOutlined />
                      <span>{String(classItem.name || 'Grupo')} - {String(classItem.section || 'A')}</span>
                    </div>
                    <Text type="secondary" className="text-sm">
                      {classItem.courses.length > 0 ? String(classItem.courses[0]?.name || 'Sin curso') : 'Sin curso'}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        ) : (
          <Form.Item
            label="Estudiante"
            name="targetId"
            rules={[{ required: true, message: 'Seleccione un estudiante' }]}
          >
            <Select
              mode="multiple"
              placeholder="Seleccione uno o más estudiantes"
              size="large"
              loading={loadingData}
              showSearch
              filterOption={(input, option) => {
                // Extraer el texto del estudiante para búsqueda
                const studentText = `${option?.['data-student-name'] || ''}`;
                return studentText.toLowerCase().indexOf(input.toLowerCase()) >= 0;
              }}
            >
              {students.map(student => {
                const fullName = `${student.user?.profile?.firstName || ''} ${student.user?.profile?.lastName || ''}`;
                const userId = student.user?.id || student.userId || student.id;
                return (
                <Option 
                  key={userId} 
                  value={userId}
                  data-student-name={fullName}
                >
                  <div className="flex items-center gap-2">
                    <UserOutlined />
                    <span>{String(student.user?.profile?.firstName || 'Sin')} {String(student.user?.profile?.lastName || 'nombre')}</span>
                    <Text type="secondary" className="text-sm">
                      ({String(student.educationalLevel?.name || 'Sin nivel')})
                    </Text>
                  </div>
                </Option>
                );
              })}
            </Select>
          </Form.Item>
        )}

        {/* Fecha límite */}
        <Form.Item label="Fecha límite (opcional)" name="dueDate">
          <DatePicker
            style={{ width: '100%' }}
            size="large"
            placeholder="Seleccionar fecha límite"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
            format="DD/MM/YYYY"
          />
        </Form.Item>

        {/* Instrucciones */}
        <Form.Item label="Instrucciones (opcional)" name="instructions">
          <TextArea
            rows={4}
            placeholder="Instrucciones adicionales para los estudiantes..."
            maxLength={1000}
            showCount
          />
        </Form.Item>
      </Form>

      {/* Información adicional */}
      <Alert
        type="info"
        showIcon
        message="Información"
        description={
          assignmentType === 'class'
            ? "El recurso será asignado a todos los estudiantes de los grupos seleccionados."
            : "El recurso será asignado únicamente a los estudiantes seleccionados."
        }
        className="mt-4"
      />
    </Modal>
  );
};