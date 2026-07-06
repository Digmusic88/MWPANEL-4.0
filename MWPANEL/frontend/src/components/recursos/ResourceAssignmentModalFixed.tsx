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
  Card,
  Tag,
  Radio,
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
const { Option } = Select;

interface ResourceAssignmentModalFixedProps {
  resource: EducationalResource | null;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ResourceAssignmentModalFixed: React.FC<ResourceAssignmentModalFixedProps> = ({
  resource,
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [assignmentType, setAssignmentType] = useState<'class' | 'individual'>('class');
  const [loading, setLoading] = useState(false);

  // Fetch class groups with improved error handling
  const { 
    data: classGroups = [], 
    isLoading: classGroupsLoading,
    error: classGroupsError 
  } = useQuery({
    queryKey: ['class-groups-assignment'],
    queryFn: async () => {
      console.log('🔍 MODAL FIXED: Fetching class groups...');
      try {
        const response = await api.get('/class-groups');
        console.log('✅ MODAL FIXED: Class groups response:', response.data);
        
        if (Array.isArray(response.data)) {
          // Improve class names by including subjects/courses
          const enhancedGroups = response.data.map(group => {
            let displayName = group.name || 'Grupo sin nombre';
            
            // Add section if available
            if (group.section) {
              displayName += ` - Sección ${group.section}`;
            }
            
            // Add course info if available
            if (group.courses && group.courses.length > 0) {
              const courseNames = group.courses.map(course => 
                course.name || 'Curso sin nombre'
              ).join(', ');
              displayName += ` (${courseNames})`;
            }
            
            // Add student count
            const studentCount = group.students?.length || 0;
            displayName += ` - ${studentCount} estudiantes`;
            
            return {
              ...group,
              displayName
            };
          });
          
          console.log('✅ MODAL FIXED: Enhanced groups:', enhancedGroups);
          return enhancedGroups;
        }
        
        return [];
      } catch (error) {
        console.error('❌ MODAL FIXED: Class groups error:', error);
        throw error;
      }
    },
    enabled: visible,
    retry: 1,
  });

  // Fetch students with improved error handling
  const { 
    data: students = [], 
    isLoading: studentsLoading,
    error: studentsError 
  } = useQuery({
    queryKey: ['students-assignment'],
    queryFn: async () => {
      console.log('🔍 MODAL FIXED: Fetching students...');
      try {
        // RGPD: el profesor solo ve sus alumnos; admin ve todos
        const endpoint = user?.role === 'admin' ? '/students' : '/students/my-students';
        const response = await api.get(endpoint);
        console.log('✅ MODAL FIXED: Students response:', response.data);
        
        if (Array.isArray(response.data)) {
          const transformedStudents = response.data.map(student => {
            const firstName = student.user?.profile?.firstName || 'Sin';
            const lastName = student.user?.profile?.lastName || 'nombre';
            const email = student.user?.email || 'sin-email@example.com';
            const enrollmentNumber = student.enrollmentNumber || 'Sin matrícula';
            
            return {
              id: student.id,
              name: `${firstName} ${lastName}`.trim(),
              email: email,
              enrollmentNumber: enrollmentNumber,
              displayName: `${firstName} ${lastName} (${enrollmentNumber})`
            };
          });
          
          console.log('✅ MODAL FIXED: Transformed students:', transformedStudents);
          return transformedStudents;
        }
        
        return [];
      } catch (error) {
        console.error('❌ MODAL FIXED: Students error:', error);
        throw error;
      }
    },
    enabled: visible && assignmentType === 'individual',
    retry: 1,
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
        assignmentData.studentId = values.studentId;
      }

      await educationalResourcesService.assignResource(resource.id, assignmentData);
      
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ MODAL FIXED: Assignment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  // Safe data access with fallbacks
  const resourceTitle = resource?.title || 'Recurso sin título';
  const resourceType = resource?.type || 'UNKNOWN';
  const resourceSubjectName = resource?.subject?.name || 'Sin asignatura';
  const resourceGradeLevel = resource?.gradeLevel || 'Sin nivel';
  const resourceDescription = resource?.description || '';

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>Asignar Recurso Educativo</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={700}
      destroyOnClose
    >
      {resource && (
        <>
          <Card size="small" style={{ marginBottom: 16 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Title level={5} style={{ marginBottom: 0 }}>
                {resourceTitle}
              </Title>
              <Space wrap>
                <Tag color="blue">{resourceType}</Tag>
                <Tag color="green">{resourceSubjectName}</Tag>
                <Tag color="orange">{resourceGradeLevel}</Tag>
              </Space>
              {resourceDescription && (
                <Text type="secondary">{resourceDescription}</Text>
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
            {/* Assignment Type Selection */}
            <Form.Item
              label="Tipo de Asignación"
              name="assignmentType"
              rules={[{ required: true, message: 'Selecciona el tipo de asignación' }]}
            >
              <Radio.Group 
                value={assignmentType} 
                onChange={(e) => setAssignmentType(e.target.value)}
              >
                <Radio.Button value="class">
                  <Space>
                    <TeamOutlined />
                    <span>Clase Completa</span>
                  </Space>
                </Radio.Button>
                <Radio.Button value="individual">
                  <Space>
                    <UserOutlined />
                    <span>Estudiante Individual</span>
                  </Space>
                </Radio.Button>
              </Radio.Group>
            </Form.Item>

            {/* Class Selection */}
            {assignmentType === 'class' && (
              <Form.Item
                label="Seleccionar Clase"
                name="classGroupId"
                rules={[{ required: true, message: 'Selecciona una clase' }]}
              >
                <Select
                  placeholder="Selecciona una clase"
                  loading={classGroupsLoading}
                  showSearch
                  optionFilterProp="children"
                  notFoundContent={
                    classGroupsLoading ? 'Cargando...' : 
                    classGroupsError ? 'Error al cargar clases' : 
                    'No hay clases disponibles'
                  }
                >
                  {classGroups.map((group: any) => (
                    <Option key={group.id} value={group.id}>
                      {group.displayName || group.name || 'Grupo sin nombre'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {/* Student Selection */}
            {assignmentType === 'individual' && (
              <Form.Item
                label="Seleccionar Estudiante"
                name="studentId"
                rules={[{ required: true, message: 'Selecciona un estudiante' }]}
              >
                <Select
                  placeholder="Selecciona un estudiante"
                  loading={studentsLoading}
                  showSearch
                  optionFilterProp="children"
                  notFoundContent={
                    studentsLoading ? 'Cargando...' : 
                    studentsError ? 'Error al cargar estudiantes' : 
                    'No hay estudiantes disponibles'
                  }
                >
                  {students.map((student: any) => (
                    <Option key={student.id} value={student.id}>
                      {student.displayName || student.name || 'Estudiante sin nombre'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            {/* Due Date */}
            <Form.Item label="Fecha Límite (Opcional)" name="dueDate">
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Seleccionar fecha límite"
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Form.Item>

            {/* Instructions */}
            <Form.Item label="Instrucciones (Opcional)" name="instructions">
              <TextArea
                rows={3}
                placeholder="Instrucciones específicas para esta asignación..."
                maxLength={500}
                showCount
              />
            </Form.Item>

            {/* Error Display */}
            {(classGroupsError || studentsError) && (
              <Alert
                message="Error al cargar datos"
                description={
                  classGroupsError ? 'No se pudieron cargar las clases' :
                  studentsError ? 'No se pudieron cargar los estudiantes' :
                  'Error desconocido'
                }
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            {/* Form Actions */}
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  loading={loading}
                  disabled={
                    (assignmentType === 'class' && classGroups.length === 0) ||
                    (assignmentType === 'individual' && students.length === 0)
                  }
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

export default ResourceAssignmentModalFixed;