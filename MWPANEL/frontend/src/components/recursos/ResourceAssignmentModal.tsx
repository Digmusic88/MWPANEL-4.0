import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  Button,
  Space,
  Alert,
  Typography,
  Divider,
  Card,
  Tag,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import educationalResourcesService, {
  EducationalResource,
  AssignResourceDto,
} from '../../services/educationalResourcesService';
import api from '../../services/apiClient';
import dayjs from 'dayjs';
import { useAuth } from '../../hooks/useAuth';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface ResourceAssignmentModalProps {
  resource: EducationalResource | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ResourceAssignmentModal: React.FC<ResourceAssignmentModalProps> = ({
  resource,
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [assignmentType, setAssignmentType] = useState<'class' | 'individual'>('class');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Simplified class groups fetch with minimal error handling
  const { data: classGroups, isLoading: classGroupsLoading, error: classGroupsError } = useQuery({
    queryKey: ['class-groups-for-assignment'],
    queryFn: async () => {
      console.log('🔍 MODAL: Starting class groups fetch...');
      
      const response = await api.get('/class-groups');
      console.log('✅ MODAL: Class groups response received:', {
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        length: response.data?.length
      });
      
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: visible,
    retry: false, // Disable retries to avoid errors
  });

  // Simplified students fetch
  const { data: students, isLoading: studentsLoading, error: studentsError } = useQuery({
    queryKey: ['students-for-assignment'],
    queryFn: async () => {
      console.log('🔍 MODAL: Starting students fetch...');

      // RGPD: el profesor solo ve sus alumnos; admin ve todos
      const endpoint = user?.role === 'admin' ? '/students' : '/students/my-students';
      const response = await api.get(endpoint);
      console.log('✅ MODAL: Students response received:', {
        dataType: typeof response.data,
        isArray: Array.isArray(response.data),
        length: response.data?.length
      });
      
      if (Array.isArray(response.data)) {
        const transformedStudents = response.data.map(student => ({
          id: student.id,
          firstName: student.user?.profile?.firstName || 'Sin nombre',
          lastName: student.user?.profile?.lastName || '',
          className: 'Sin clase'
        }));
        
        console.log('✅ MODAL: Transformed students count:', transformedStudents.length);
        return transformedStudents;
      }
      
      return [];
    },
    enabled: visible && assignmentType === 'individual',
    retry: false,
  });

  const handleSubmit = async (values: any) => {
    if (!resource) return;

    setLoading(true);
    try {
      const assignmentData: AssignResourceDto = {
        instructions: values.instructions,
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
      };

      if (assignmentType === 'class') {
        assignmentData.classGroupId = values.classGroupId;
      } else {
        // Support multiple student selection
        if (Array.isArray(values.studentIds) && values.studentIds.length > 0) {
          assignmentData.studentIds = values.studentIds;
        } else if (values.studentId) {
          // Backward compatibility for single student
          assignmentData.studentId = values.studentId;
        }
      }

      await educationalResourcesService.assignResource(resource.id, assignmentData);
      
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error assigning resource:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // Safe debug logging
  React.useEffect(() => {
    if (visible) {
      console.log('🔍 MODAL DEBUG - Modal opened');
      console.log('🔍 MODAL DEBUG - Assignment type:', assignmentType);
      console.log('🔍 MODAL DEBUG - Class groups loading:', classGroupsLoading);
      console.log('🔍 MODAL DEBUG - Class groups error:', classGroupsError?.message || 'none');
      console.log('🔍 MODAL DEBUG - Students loading:', studentsLoading);  
      console.log('🔍 MODAL DEBUG - Students error:', studentsError?.message || 'none');
      
      if (classGroups && Array.isArray(classGroups)) {
        console.log('🔍 MODAL DEBUG - Class groups count:', classGroups.length);
      }
      
      if (students && Array.isArray(students)) {
        console.log('🔍 MODAL DEBUG - Students count:', students.length);
      }
    }
  }, [visible, assignmentType, classGroups, classGroupsLoading, classGroupsError, students, studentsLoading, studentsError]);

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>Asignar Recurso</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      {resource && (
        <>
          <Card size="small" className="mb-4">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Title level={5} style={{ marginBottom: 0 }}>
                {resource.title}
              </Title>
              <Space wrap>
                <Tag color="blue">{String(resource.type || 'Sin tipo')}</Tag>
                <Tag>{String(resource.subject?.name || 'Sin asignatura')}</Tag>
                <Tag>{String(resource.gradeLevel || 'Sin nivel')}</Tag>
              </Space>
              {resource.description && (
                <Text type="secondary">{resource.description}</Text>
              )}
            </Space>
          </Card>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              assignmentType: 'class',
            }}
          >
            <Form.Item
              name="assignmentType"
              label="Tipo de Asignación"
            >
              <Select
                value={assignmentType}
                onChange={setAssignmentType}
                options={[
                  {
                    value: 'class',
                    label: (
                      <Space>
                        <TeamOutlined />
                        Asignar a Clase Completa
                      </Space>
                    ),
                  },
                  {
                    value: 'individual',
                    label: (
                      <Space>
                        <UserOutlined />
                        Asignar a Estudiante Individual
                      </Space>
                    ),
                  },
                ]}
              />
            </Form.Item>

            {assignmentType === 'class' ? (
              <Form.Item
                name="classGroupId"
                label="Clase"
                rules={[{ required: true, message: 'Selecciona una clase' }]}
              >
                <Select
                  placeholder={classGroupsLoading ? "Cargando clases..." : classGroupsError ? "Error al cargar clases" : "Selecciona la clase"}
                  loading={classGroupsLoading}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={classGroups?.map((group) => ({
                    value: group.id,
                    label: `${group.name || 'Grupo sin nombre'} - ${group.section || 'A'}`,
                  })) || []}
                  notFoundContent={
                    classGroupsError ? 
                      `Error: ${classGroupsError.message}` : 
                      classGroupsLoading ? 
                        "Cargando..." : 
                        "No hay clases disponibles"
                  }
                />
              </Form.Item>
            ) : (
              <Form.Item
                name="studentIds"
                label="Estudiantes"
                rules={[{ required: true, message: 'Selecciona al menos un estudiante' }]}
              >
                <Select
                  mode="multiple"
                  placeholder={studentsLoading ? "Cargando estudiantes..." : studentsError ? "Error al cargar estudiantes" : "Selecciona los estudiantes"}
                  loading={studentsLoading}
                  showSearch
                  allowClear
                  maxTagCount="responsive"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={students?.map((student) => ({
                    value: student.id,
                    label: `${student.firstName || 'Sin nombre'} ${student.lastName || ''} - ${student.className || 'Sin clase'}`,
                  })) || []}
                  notFoundContent={
                    studentsError ? 
                      `Error: ${studentsError.message}` : 
                      studentsLoading ? 
                        "Cargando..." : 
                        "No hay estudiantes disponibles"
                  }
                />
              </Form.Item>
            )}

            <Form.Item
              name="dueDate"
              label="Fecha Límite (Opcional)"
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Selecciona fecha límite"
                disabledDate={(current) => current && current < dayjs().endOf('day')}
                format="DD/MM/YYYY"
              />
            </Form.Item>

            <Form.Item
              name="instructions"
              label="Instrucciones (Opcional)"
            >
              <TextArea
                rows={3}
                placeholder="Añade instrucciones específicas para esta asignación..."
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Alert
              message="Información"
              description={
                assignmentType === 'class'
                  ? 'El recurso será visible para todos los estudiantes de la clase seleccionada.'
                  : 'El recurso será visible para los estudiantes seleccionados.'
              }
              type="info"
              showIcon
              className="mb-4"
            />

            <Divider />

            <Form.Item style={{ marginBottom: 0 }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<CalendarOutlined />}
                >
                  Asignar Recurso
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default ResourceAssignmentModal;