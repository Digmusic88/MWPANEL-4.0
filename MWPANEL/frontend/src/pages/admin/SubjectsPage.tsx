import React, { useState, useEffect } from 'react';
import { useAcademicYear } from '../../contexts/AcademicYearContext';
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Drawer,
  Tag,
  Typography,
  Row,
  Col,
  Divider,
  InputNumber,
  Popconfirm,
  Tabs,
  Spin,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  BookOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

interface Subject {
  id: string;
  name: string;
  code: string;
  weeklyHours: number;
  description: string;
  course: {
    id: string;
    name: string;
    order: number;
    cycle: {
      name: string;
      educationalLevel: {
        name: string;
        code: string;
      };
    };
  };
}

interface SubjectAssignment {
  id: string;
  weeklyHours: number;
  notes: string;
  teacher: {
    id: string;
    employeeNumber: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  };
  subject: {
    id: string;
    name: string;
    code: string;
    course: {
      name: string;
    };
  };
  // Campo legacy para compatibilidad
  classGroup: {
    id: string;
    name: string;
    courses: Array<{
      name: string;
    }>;
  };
  // Nueva relación ManyToMany para múltiples grupos
  classGroups?: Array<{
    id: string;
    name: string;
    courses: Array<{
      name: string;
    }>;
  }>;
  academicYear: {
    id: string;
    name: string;
    isCurrent: boolean;
  };
}

interface Course {
  id: string;
  name: string;
  order: number;
  cycle: {
    name: string;
    order: number;
    educationalLevel: {
      name: string;
      code: string;
    };
  };
}

interface Teacher {
  id: string;
  employeeNumber: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface ClassGroup {
  id: string;
  name: string;
  courses: Array<{
    name: string;
  }>;
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

const SubjectsPage: React.FC = () => {
  const { allAcademicYears, currentAcademicYear } = useAcademicYear();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [assignmentModalVisible, setAssignmentModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<SubjectAssignment | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [activeTab, setActiveTab] = useState('subjects');
  
  // Estados para asignaciones múltiples
  const [selectedClassGroups, setSelectedClassGroups] = useState<string[]>([]);
  const [studentsByGroup, setStudentsByGroup] = useState<Record<string, any[]>>({});
  const [selectedStudentsByGroup, setSelectedStudentsByGroup] = useState<Record<string, string[]>>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  const [form] = Form.useForm();
  const [assignmentForm] = Form.useForm();

  useEffect(() => {
    fetchSubjects();
    fetchAssignments();
    fetchCourses();
    fetchTeachers();
    fetchClassGroups();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/subjects');
      setSubjects(response.data);
    } catch (error: any) {
      message.error('Error al cargar asignaturas: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const response = await apiClient.get('/subjects/assignments/all');
      setAssignments(response.data);
    } catch (error: any) {
      message.error('Error al cargar asignaciones: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await apiClient.get('/class-groups/available-courses');
      const coursesData = response.data || [];
      
      // Sort courses by educational level and then by order
      const sortedCourses = coursesData.sort((a: Course, b: Course) => {
        // Define educational level order
        const levelOrder: { [key: string]: number } = {
          'INFANTIL': 1,
          'PRIMARIA': 2,
          'SECUNDARIA': 3
        };
        
        const aLevelOrder = levelOrder[a.cycle.educationalLevel.code] || 4;
        const bLevelOrder = levelOrder[b.cycle.educationalLevel.code] || 4;
        
        // First sort by educational level
        if (aLevelOrder !== bLevelOrder) {
          return aLevelOrder - bLevelOrder;
        }
        
        // Then by cycle order
        if (a.cycle.order !== b.cycle.order) {
          return a.cycle.order - b.cycle.order;
        }
        
        // Finally by course order
        return a.order - b.order;
      });
      
      setCourses(sortedCourses);
    } catch (error: any) {
      console.error('Error loading courses:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await apiClient.get('/class-groups/available-teachers');
      setTeachers(response.data);
    } catch (error: any) {
      console.error('Error loading teachers:', error);
    }
  };

  const fetchClassGroups = async () => {
    try {
      const response = await apiClient.get('/class-groups');
      setClassGroups(response.data);
    } catch (error: any) {
      console.error('Error loading class groups:', error);
    }
  };


  // ==================== SUBJECTS ====================

  const handleCreateSubject = () => {
    setEditingSubject(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditSubject = (record: Subject) => {
    setEditingSubject(record);
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      weeklyHours: record.weeklyHours,
      description: record.description,
      courseIds: [record.course.id], // Convertir curso único a array para compatibilidad
    });
    setModalVisible(true);
  };

  const handleDeleteSubject = async (id: string) => {
    try {
      await apiClient.delete(`/subjects/${id}`);
      message.success('Asignatura eliminada exitosamente');
      fetchSubjects();
    } catch (error: any) {
      message.error('Error al eliminar asignatura: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitSubject = async (values: any) => {
    try {
      const { courseIds, ...subjectData } = values;

      if (editingSubject) {
        // Para edición, mantener comportamiento actual (solo un curso)
        const courseId = Array.isArray(courseIds) ? courseIds[0] : courseIds;
        await apiClient.patch(`/subjects/${editingSubject.id}`, { ...subjectData, courseId });
        message.success('Asignatura actualizada exitosamente');
      } else {
        // Para creación nueva, permitir múltiples cursos
        if (courseIds && courseIds.length > 1) {
          // Crear múltiples asignaturas (una por cada curso)
          const createdSubjects = [];
          for (const courseId of courseIds) {
            const result = await apiClient.post('/subjects', { ...subjectData, courseId });
            createdSubjects.push(result.data);
          }
          message.success(`${createdSubjects.length} asignaturas creadas exitosamente para ${courseIds.length} cursos`);
        } else {
          // Un solo curso
          const courseId = Array.isArray(courseIds) ? courseIds[0] : courseIds;
          await apiClient.post('/subjects', { ...subjectData, courseId });
          message.success('Asignatura creada exitosamente');
        }
      }
      setModalVisible(false);
      form.resetFields();
      fetchSubjects();
    } catch (error: any) {
      message.error('Error al guardar asignatura: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleViewSubjectDetails = (record: Subject) => {
    setSelectedSubject(record);
    setDrawerVisible(true);
  };

  // ==================== MULTIPLE ASSIGNMENT FUNCTIONS ====================
  
  const fetchStudentsByClassGroups = async (classGroupIds: string[]) => {
    if (!classGroupIds.length) {
      setStudentsByGroup({});
      return;
    }

    try {
      setLoadingStudents(true);
      const response = await apiClient.get(`/subjects/assignments/students-by-groups?classGroupIds=${classGroupIds.join(',')}`);
      setStudentsByGroup(response.data);
    } catch (error: any) {
      message.error('Error al cargar estudiantes: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleClassGroupSelectionChange = (selectedGroups: string[]) => {
    setSelectedClassGroups(selectedGroups);
    assignmentForm.setFieldsValue({ classGroupIds: selectedGroups });
    
    // Limpiar selecciones de estudiantes previas
    setSelectedStudentsByGroup({});
    
    // Cargar estudiantes de los grupos seleccionados
    if (selectedGroups.length > 0) {
      fetchStudentsByClassGroups(selectedGroups);
    } else {
      setStudentsByGroup({});
    }
  };

  const handleStudentSelectionChange = (groupId: string, studentIds: string[]) => {
    setSelectedStudentsByGroup(prev => ({
      ...prev,
      [groupId]: studentIds
    }));
  };

  const handleSubmitMultipleAssignment = async (values: any) => {
    try {
      const submitData = {
        teacherId: values.teacherId,
        subjectIds: Array.isArray(values.subjectIds) ? values.subjectIds : [values.subjectIds],
        classGroupIds: selectedClassGroups,
        selectedStudentsByGroup: selectedStudentsByGroup,
        academicYearId: values.academicYearId,
        weeklyHours: values.weeklyHours,
        notes: values.notes,
      };

      await apiClient.post('/subjects/assignments/multiple', submitData);
      message.success('Asignaciones múltiples creadas exitosamente');
      setAssignmentModalVisible(false);
      assignmentForm.resetFields();
      setSelectedClassGroups([]);
      setStudentsByGroup({});
      setSelectedStudentsByGroup({});
      fetchAssignments();
    } catch (error: any) {
      message.error('Error al crear asignaciones: ' + (error.response?.data?.message || error.message));
    }
  };

  // ==================== ASSIGNMENTS ====================

  const handleCreateAssignment = () => {
    setEditingAssignment(null);
    assignmentForm.resetFields();
    setSelectedClassGroups([]);
    setStudentsByGroup({});
    setSelectedStudentsByGroup({});
    setAssignmentModalVisible(true);
  };

  const handleEditAssignment = (record: SubjectAssignment) => {
    setEditingAssignment(record);

    // Obtener los IDs de grupos desde classGroups (nuevo) o classGroup (legacy)
    const groupIds = record.classGroups && record.classGroups.length > 0
      ? record.classGroups.map(g => g.id)
      : record.classGroup ? [record.classGroup.id] : [];

    assignmentForm.setFieldsValue({
      teacherId: record.teacher?.id,
      subjectId: record.subject?.id,
      classGroupIds: groupIds,
      academicYearId: record.academicYear?.id,
      weeklyHours: record.weeklyHours,
      notes: record.notes,
    });

    // Cargar los grupos seleccionados para mostrar selector de estudiantes si es necesario
    setSelectedClassGroups(groupIds);

    setAssignmentModalVisible(true);
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      await apiClient.delete(`/subjects/assignments/${id}`);
      message.success('Asignación eliminada exitosamente');
      fetchAssignments();
    } catch (error: any) {
      message.error('Error al eliminar asignación: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitAssignment = async (values: any) => {
    if (editingAssignment) {
      // Usar API tradicional para editar con classGroupIds
      try {
        const updateData = {
          teacherId: values.teacherId,
          subjectId: values.subjectId,
          classGroupIds: values.classGroupIds, // Enviar array de grupos
          academicYearId: values.academicYearId,
          weeklyHours: values.weeklyHours,
          notes: values.notes,
        };
        await apiClient.patch(`/subjects/assignments/${editingAssignment.id}`, updateData);
        message.success('Asignación actualizada exitosamente');
        setAssignmentModalVisible(false);
        assignmentForm.resetFields();
        setSelectedClassGroups([]);
        fetchAssignments();
      } catch (error: any) {
        message.error('Error al actualizar asignación: ' + (error.response?.data?.message || error.message));
      }
    } else {
      // Usar nueva funcionalidad para crear múltiples
      await handleSubmitMultipleAssignment(values);
    }
  };

  // ==================== TABLE COLUMNS ====================

  const subjectColumns: ColumnsType<Subject> = [
    {
      title: 'Asignatura',
      key: 'name',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.name}</div>
          <Tag color="blue">{record.code}</Tag>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Curso',
      key: 'course',
      render: (_, record) => (
        <div>
          <div>{record.course.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.course.cycle.educationalLevel.name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Horas Semanales',
      dataIndex: 'weeklyHours',
      key: 'weeklyHours',
      width: 120,
      render: (hours) => <Tag color="green">{hours}h</Tag>,
      sorter: (a, b) => a.weeklyHours - b.weeklyHours,
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewSubjectDetails(record)}
            size="small"
          >
            Ver
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditSubject(record)}
            size="small"
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Está seguro de eliminar esta asignatura?"
            onConfirm={() => handleDeleteSubject(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const assignmentColumns: ColumnsType<SubjectAssignment> = [
    {
      title: 'Profesor',
      key: 'teacher',
      render: (_, record) => (
        <div>
          <div className="font-medium">
            {record.teacher?.user?.profile?.firstName || 'Nombre'} {record.teacher?.user?.profile?.lastName || 'No disponible'}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.teacher?.employeeNumber || 'Sin número'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Asignatura',
      key: 'subject',
      render: (_, record) => (
        <div>
          <div>{record.subject.name}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.subject.course.name}
          </Text>
        </div>
      ),
    },
    {
      title: 'Grupos',
      key: 'classGroups',
      render: (_, record) => {
        // Usar classGroups (nueva relación ManyToMany) si está disponible, sino usar classGroup (legacy)
        const groups = record.classGroups && record.classGroups.length > 0
          ? record.classGroups
          : record.classGroup ? [record.classGroup] : [];

        if (groups.length === 0) {
          return <Text type="secondary">Sin grupos asignados</Text>;
        }

        return (
          <div>
            <Space wrap size={[4, 4]}>
              {groups.map((group, index) => (
                <Tag key={group.id || index} color="blue">
                  {group.name}
                </Tag>
              ))}
            </Space>
            {groups.length === 1 && groups[0].courses && groups[0].courses.length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {groups[0].courses.map(c => c.name).join(', ')}
                </Text>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Año Académico',
      key: 'academicYear',
      render: (_, record) => (
        <div>
          {record.academicYear ? (
            <Tag color={record.academicYear.isCurrent ? 'green' : 'default'}>
              {record.academicYear.name}
            </Tag>
          ) : (
            <Tag color="red">
              Sin año académico
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Horas',
      dataIndex: 'weeklyHours',
      key: 'weeklyHours',
      width: 80,
      render: (hours) => <Tag color="blue">{hours}h</Tag>,
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditAssignment(record)}
            size="small"
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Está seguro de eliminar esta asignación?"
            onConfirm={() => handleDeleteAssignment(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            >
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>Gestión de Asignaturas</Title>
      </div>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space>
              {activeTab === 'subjects' && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateSubject}
                >
                  Nueva Asignatura
                </Button>
              )}
              {activeTab === 'assignments' && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateAssignment}
                >
                  Nueva Asignación
                </Button>
              )}
            </Space>
          }
        >
          <TabPane tab={<span><BookOutlined />Asignaturas</span>} key="subjects">
            <Alert
              type="info"
              showIcon
              closable
              style={{ marginBottom: 16 }}
              message="Cómo crear asignaturas"
              description={
                <span>
                  1) Pulsa <strong>Nueva Asignatura</strong> e indica nombre, código y curso.{' '}
                  2) Usa nombres del currículo oficial de Navarra (p. ej. «Lengua Castellana y Literatura», «Matemáticas», «Conocimiento del Medio» en Primaria; «Geografía e Historia», «Biología y Geología» en Secundaria).{' '}
                  3) Después, en la pestaña <strong>Asignaciones</strong>, vincula cada asignatura con su docente y grupo.
                </span>
              }
            />
            <Table
              columns={subjectColumns}
              dataSource={subjects}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} de ${total} asignaturas`,
              }}
            />
          </TabPane>
          
          <TabPane tab={<span><TeamOutlined />Asignaciones</span>} key="assignments">
            <Alert
              type="info"
              showIcon
              closable
              style={{ marginBottom: 16 }}
              message="Cómo asignar asignaturas a docentes"
              description={
                <span>
                  Pulsa <strong>Nueva Asignación</strong> y selecciona docente, asignatura(s) y grupo de clase.
                  Puedes seleccionar varias asignaturas a la vez para crear asignaciones múltiples.
                  Cada asignación habilita al docente para crear tareas, actividades y calificar a los alumnos de ese grupo;
                  las notas se calculan siempre en porcentaje (0-100%).
                </span>
              }
            />
            <Table
              columns={assignmentColumns}
              dataSource={assignments}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} de ${total} asignaciones`,
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Subject Create/Edit Modal */}
      <Modal
        title={editingSubject ? 'Editar Asignatura' : 'Crear Asignatura'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmitSubject}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Nombre de la Asignatura"
                name="name"
                rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
              >
                <Input placeholder="Ej: Matemáticas" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Código"
                name="code"
                rules={[{ required: true, message: 'Por favor ingrese el código' }]}
              >
                <Input placeholder="Ej: MAT" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Cursos"
                name="courseIds"
                rules={[{ required: true, message: 'Por favor seleccione al menos un curso' }]}
                tooltip="Puedes seleccionar múltiples cursos para asignaturas prácticas que se imparten a diferentes edades"
              >
                <Select
                  mode="multiple"
                  placeholder="Seleccionar cursos (puedes elegir varios)"
                  showSearch
                  optionFilterProp="children"
                  maxTagCount="responsive"
                  showArrow
                  allowClear
                  filterOption={(input, option) => {
                    if (!input || !option?.children) return false;
                    const optionText = typeof option.children === 'string'
                      ? option.children
                      : String(option.children);
                    return optionText.toLowerCase().indexOf(input.toLowerCase()) >= 0;
                  }}
                >
                  {courses.map(course => (
                    <Option key={course.id} value={course.id}>
                      {course.name} - {course.cycle.educationalLevel.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Horas Semanales"
                name="weeklyHours"
                rules={[{ required: true, message: 'Por favor ingrese las horas semanales' }]}
              >
                <InputNumber min={0} max={10} placeholder="0" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Descripción"
            name="description"
          >
            <TextArea rows={3} placeholder="Descripción de la asignatura..." />
          </Form.Item>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              {editingSubject ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Assignment Create/Edit Modal */}
      <Modal
        title={editingAssignment ? 'Editar Asignación' : 'Crear Asignación'}
        open={assignmentModalVisible}
        onCancel={() => {
          setAssignmentModalVisible(false);
          assignmentForm.resetFields();
        }}
        footer={null}
        width={900}
      >
        <Form
          form={assignmentForm}
          layout="vertical"
          onFinish={handleSubmitAssignment}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Profesor"
                name="teacherId"
                rules={[{ required: true, message: 'Por favor seleccione el profesor' }]}
              >
                <Select placeholder="Seleccionar profesor">
                  {teachers.map(teacher => (
                    <Option key={teacher.id} value={teacher.id}>
                      {teacher.user?.profile?.firstName || 'Nombre'} {teacher.user?.profile?.lastName || 'No disponible'} - {teacher.employeeNumber}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label={editingAssignment ? "Asignatura" : "Asignaturas"}
                name={editingAssignment ? "subjectId" : "subjectIds"}
                rules={[{ required: true, message: `Por favor seleccione ${editingAssignment ? 'la asignatura' : 'las asignaturas'}` }]}
              >
                <Select 
                  mode={editingAssignment ? undefined : "multiple"}
                  placeholder={editingAssignment ? "Seleccionar asignatura" : "Seleccionar asignaturas"}
                  showSearch
                  optionFilterProp="children"
                >
                  {subjects
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(subject => (
                      <Option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.course.name})
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Grupos de Clase"
                name="classGroupIds"
                rules={[{ required: true, message: 'Por favor seleccione al menos un grupo' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Seleccionar grupos (puede elegir varios)"
                  showSearch
                  optionFilterProp="children"
                  onChange={handleClassGroupSelectionChange}
                >
                  {classGroups.map(group => (
                    <Option key={group.id} value={group.id}>
                      {group.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Año Académico"
                name="academicYearId"
                rules={[{ required: true, message: 'Por favor seleccione el año académico' }]}
              >
                <Select placeholder="Seleccionar año académico">
                  {allAcademicYears.map(year => (
                    <Option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && <Tag color="green">Actual</Tag>}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Horas Semanales"
                name="weeklyHours"
                rules={[{ required: true, message: 'Por favor ingrese las horas semanales' }]}
              >
                <InputNumber min={0} max={10} placeholder="0" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          {/* Selector de estudiantes específicos (solo para crear nuevas asignaciones) */}
          {!editingAssignment && selectedClassGroups.length > 0 && (
            <div className="mb-4">
              <Typography.Title level={5}>
                Seleccionar Estudiantes Específicos (Opcional)
              </Typography.Title>
              <Typography.Text type="secondary" className="mb-3 block">
                Si no seleccionas estudiantes específicos, se asignarán todos los estudiantes de los grupos seleccionados.
              </Typography.Text>
              
              {loadingStudents ? (
                <div className="text-center py-4">
                  <Spin size="small" /> Cargando estudiantes...
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedClassGroups.map(groupId => {
                    const group = classGroups.find(g => g.id === groupId);
                    const groupStudents = studentsByGroup[groupId] || [];
                    
                    return (
                      <Card key={groupId} size="small" title={`${group?.name} (${groupStudents.length} estudiantes)`}>
                        <Select
                          mode="multiple"
                          placeholder="Seleccionar estudiantes específicos (opcional)"
                          style={{ width: '100%' }}
                          value={selectedStudentsByGroup[groupId] || []}
                          onChange={(studentIds) => handleStudentSelectionChange(groupId, studentIds)}
                          showSearch
                          optionFilterProp="children"
                          filterOption={(input, option) =>
                            (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                          }
                        >
                          {groupStudents.map(student => (
                            <Option key={student.id} value={student.id}>
                              {student.name} ({student.enrollmentNumber})
                            </Option>
                          ))}
                        </Select>
                        {selectedStudentsByGroup[groupId]?.length > 0 && (
                          <div className="mt-2">
                            <Text type="secondary">
                              {selectedStudentsByGroup[groupId].length} de {groupStudents.length} estudiantes seleccionados
                            </Text>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <Form.Item
            label="Notas"
            name="notes"
          >
            <TextArea rows={2} placeholder="Notas adicionales..." />
          </Form.Item>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setAssignmentModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              {editingAssignment ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Subject Details Drawer */}
      <Drawer
        title="Detalles de la Asignatura"
        placement="right"
        size="large"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedSubject && (
          <div className="space-y-6">
            <div>
              <Title level={3}>{selectedSubject.name}</Title>
              <Space>
                <Tag color="blue">{selectedSubject.code}</Tag>
                <Tag color="green">{selectedSubject.weeklyHours}h semanales</Tag>
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>Información del Curso</Title>
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Curso:</Text>
                  <div>{selectedSubject.course.name}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Nivel Educativo:</Text>
                  <div>{selectedSubject.course.cycle.educationalLevel.name}</div>
                </Col>
              </Row>
            </div>

            {selectedSubject.description && (
              <>
                <Divider />
                <div>
                  <Title level={4}>Descripción</Title>
                  <Text>{selectedSubject.description}</Text>
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default SubjectsPage;