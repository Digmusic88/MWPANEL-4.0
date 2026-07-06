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
  Avatar,
  List,
  Popconfirm,
  Transfer,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ResponsiveTable from '../../components/common/ResponsiveTable';
import { useResponsive } from '../../hooks/useResponsive';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;
const { Option } = Select;

interface ClassGroup {
  id: string;
  name: string;
  section: string;
  academicYear: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
  };
  courses: Array<{
    id: string;
    name: string;
    order: number;
    cycle: {
      id: string;
      name: string;
      educationalLevel: {
        id: string;
        name: string;
        code: string;
      };
    };
  }>;
  tutor: {
    id: string;
    employeeNumber: string;
    specialties: string[];
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
        department: string;
        position: string;
      };
    };
  };
  students: Array<{
    id: string;
    enrollmentNumber: string;
    user: {
      id: string;
      email: string;
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Teacher {
  id: string;
  employeeNumber: string;
  specialties: string[];
  user: {
    profile: {
      firstName: string;
      lastName: string;
      department: string;
      position: string;
    };
  };
}

interface Student {
  id: string;
  enrollmentNumber: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

interface Course {
  id: string;
  name: string;
  order: number;
  cycle: {
    name: string;
    educationalLevel: {
      name: string;
    };
  };
}

const ClassGroupsPage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const { allAcademicYears, currentAcademicYear } = useAcademicYear();
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [transferVisible, setTransferVisible] = useState(false);
  const [editingClassGroup, setEditingClassGroup] = useState<ClassGroup | null>(null);
  const [selectedClassGroup, setSelectedClassGroup] = useState<ClassGroup | null>(null);
  const [form] = Form.useForm();

  // Transfer states
  const [targetKeys, setTargetKeys] = useState<string[]>([]);

  useEffect(() => {
    fetchClassGroups();
    fetchTeachers();
    fetchStudents();
    fetchCourses();
  }, []);

  const fetchClassGroups = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/class-groups');
      setClassGroups(response.data);
    } catch (error: any) {
      message.error('Error al cargar grupos de clase: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await apiClient.get('/class-groups/available-teachers');
      setTeachers(response.data);
    } catch (error: any) {
      message.error('Error al cargar profesores: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await apiClient.get('/class-groups/available-students');
      setStudents(response.data);
    } catch (error: any) {
      message.error('Error al cargar estudiantes: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await apiClient.get('/class-groups/available-courses');
      setCourses(response.data);
    } catch (error: any) {
      message.error('Error al cargar cursos: ' + (error.response?.data?.message || error.message));
    }
  };


  const handleCreate = async () => {
    setEditingClassGroup(null);
    // Asegurar que los cursos estén cargados antes de mostrar el modal
    if (courses.length === 0) {
      await fetchCourses();
    }
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = async (record: ClassGroup) => {
    setEditingClassGroup(record);
    // Asegurar que los cursos estén cargados antes de mostrar el modal
    if (courses.length === 0) {
      await fetchCourses();
    }
    form.setFieldsValue({
      name: record.name,
      section: record.section,
      academicYearId: record.academicYear?.id,
      courseIds: record.courses?.map(c => c.id) || [],
      tutorId: record.tutor?.id,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/class-groups/${id}`);
      message.success('Grupo de clase eliminado exitosamente');
      fetchClassGroups();
    } catch (error: any) {
      message.error('Error al eliminar grupo de clase: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingClassGroup) {
        await apiClient.patch(`/class-groups/${editingClassGroup.id}`, values);
        message.success('Grupo de clase actualizado exitosamente');
      } else {
        await apiClient.post('/class-groups', values);
        message.success('Grupo de clase creado exitosamente');
      }
      setModalVisible(false);
      form.resetFields();
      fetchClassGroups();
    } catch (error: any) {
      message.error('Error al guardar grupo de clase: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleViewDetails = (record: ClassGroup) => {
    setSelectedClassGroup(record);
    setDrawerVisible(true);
  };

  const handleManageStudents = async (record: ClassGroup) => {
    console.log('🔍 [ClassGroups Frontend] Abriendo modal de estudiantes:', {
      classGroupId: record.id,
      classGroupName: record.name,
      currentStudents: record.students.length,
    });

    // Obtener datos frescos del servidor antes de abrir el modal
    try {
      const response = await apiClient.get(`/class-groups/${record.id}`);
      const freshClassGroup = response.data;

      console.log('✅ [ClassGroups Frontend] Datos frescos obtenidos:', {
        studentCount: freshClassGroup.students.length,
      });

      setSelectedClassGroup(freshClassGroup);

      // Prepare transfer data con datos frescos
      const assignedStudentIds = freshClassGroup.students.map((s: any) => s.id);

      setTargetKeys(assignedStudentIds);
      setTransferVisible(true);
    } catch (error: any) {
      console.error('❌ [ClassGroups Frontend] Error obteniendo datos frescos:', error);
      message.error('Error al cargar datos del grupo: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleTransferChange = (targetKeys: React.Key[]) => {
    console.log('🔄 [ClassGroups Frontend] Transfer cambiado:', {
      newTargetKeys: targetKeys,
      count: targetKeys.length,
    });
    setTargetKeys(targetKeys as string[]);
  };

  const handleTransferSubmit = async () => {
    if (!selectedClassGroup) return;

    try {
      console.log('🔄 [ClassGroups Frontend] Enviando actualización:', {
        classGroupId: selectedClassGroup.id,
        studentIds: targetKeys,
        count: targetKeys.length,
      });

      // Update students for the class group
      await apiClient.patch(`/class-groups/${selectedClassGroup.id}`, {
        studentIds: targetKeys,
      });

      console.log('✅ [ClassGroups Frontend] Actualización exitosa');

      message.success('Estudiantes actualizados exitosamente');

      // Cerrar modal y resetear estados ANTES de recargar datos
      setTransferVisible(false);
      setSelectedClassGroup(null);
      setTargetKeys([]);

      // Recargar datos actualizados
      await fetchClassGroups();

      console.log('✅ [ClassGroups Frontend] Datos recargados correctamente');
    } catch (error: any) {
      console.error('❌ [ClassGroups Frontend] Error al actualizar:', error);
      message.error('Error al actualizar estudiantes: ' + (error.response?.data?.message || error.message));
    }
  };

  // Renderizado personalizado para móvil
  const renderMobileCard = (record: ClassGroup, index: number) => (
    <Card
      size="small"
      style={{ marginBottom: '12px' }}
      bodyStyle={{ padding: '12px' }}
      extra={
        <Space size="small">
          <Button 
            size="small" 
            icon={<EyeOutlined />} 
            onClick={() => handleViewDetails(record)}
            title="Ver detalles"
          />
          <Button 
            size="small" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)}
            title="Editar"
          />
          <Popconfirm
            title="¿Eliminar grupo de clase?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => handleDelete(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
          >
            <Button 
              size="small" 
              icon={<DeleteOutlined />} 
              danger
              title="Eliminar"
            />
          </Popconfirm>
        </Space>
      }
    >
      {/* Título y sección */}
      <div style={{ marginBottom: '8px' }}>
        <Text strong style={{ fontSize: '14px', display: 'block' }}>
          {record.name}
        </Text>
        <Tag color="blue" size="small" style={{ marginTop: '4px' }}>
          Sección {record.section}
        </Tag>
      </div>

      {/* Año académico */}
      <div style={{ marginBottom: '8px' }}>
        {record.academicYear ? (
          <Tag color={record.academicYear.isCurrent ? 'green' : 'default'} size="small">
            {record.academicYear.name}
          </Tag>
        ) : (
          <Tag color="red" size="small">
            Sin año académico
          </Tag>
        )}
      </div>

      {/* Cursos */}
      {record.courses && record.courses.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <Text style={{ fontSize: '12px', fontWeight: '500', display: 'block' }}>
            📚 Cursos:
          </Text>
          {record.courses.map((course, idx) => (
            <div key={course.id} style={{ marginLeft: '16px' }}>
              <Text style={{ fontSize: '11px' }}>{course.name}</Text>
              {idx === 0 && course.cycle?.educationalLevel?.name && (
                <Text type="secondary" style={{ fontSize: '10px', marginLeft: '8px' }}>
                  ({course.cycle.educationalLevel.name})
                </Text>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tutor */}
      <Row gutter={[8, 4]}>
        <Col span={12}>
          {record.tutor ? (
            <div>
              <Text style={{ fontSize: '12px', fontWeight: '500', display: 'block' }}>
                👨‍🏫 Tutor:
              </Text>
              <Text style={{ fontSize: '11px', display: 'block' }}>
                {record.tutor?.user?.profile?.firstName || ''} {record.tutor?.user?.profile?.lastName || ''}
              </Text>
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {record.tutor?.employeeNumber || ''}
              </Text>
            </div>
          ) : (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              👨‍🏫 Sin tutor asignado
            </Text>
          )}
        </Col>
        <Col span={12}>
          <div>
            <Text style={{ fontSize: '12px', fontWeight: '500', display: 'block' }}>
              👥 Estudiantes:
            </Text>
            <Tag color="cyan" size="small">
              {record.students.length} estudiantes
            </Tag>
          </div>
        </Col>
      </Row>
    </Card>
  );

  const columns: ColumnsType<ClassGroup> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Sección',
      dataIndex: 'section',
      key: 'section',
      width: 80,
      render: (section) => <Tag color="blue">{section}</Tag>,
    },
    {
      title: 'Cursos',
      key: 'courses',
      render: (_, record) => (
        <div>
          {record.courses?.map((course, index) => (
            <div key={course.id}>
              <div>{course.name}</div>
              {index === 0 && course.cycle?.educationalLevel?.name && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {course.cycle.educationalLevel.name}
                </Text>
              )}
            </div>
          )) || <Text type="secondary">Sin cursos</Text>}
        </div>
      ),
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
      title: 'Tutor',
      key: 'tutor',
      render: (_, record) => (
        record.tutor ? (
          <div>
            <div>{record.tutor?.user?.profile?.firstName || ''} {record.tutor?.user?.profile?.lastName || ''}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.tutor?.employeeNumber || ''}
            </Text>
          </div>
        ) : (
          <Text type="secondary">Sin asignar</Text>
        )
      ),
    },
    {
      title: 'Estudiantes',
      key: 'students',
      render: (_, record) => (
        <div>
          <Tag color="cyan">{record.students.length} estudiantes</Tag>
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
            size="small"
          >
            Ver
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            Editar
          </Button>
          <Button
            type="link"
            icon={<UserOutlined />}
            onClick={() => handleManageStudents(record)}
            size="small"
          >
            Estudiantes
          </Button>
          <Popconfirm
            title="¿Está seguro de eliminar este grupo de clase?"
            onConfirm={() => handleDelete(record.id)}
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

  const transferData = students.map(student => ({
    key: student.id,
    title: `${student.user?.profile?.firstName || ''} ${student.user?.profile?.lastName || ''}`.trim(),
    description: student.enrollmentNumber || '',
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>Gestión de Grupos de Clase</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Crear Grupo de Clase
        </Button>
      </div>

      <Card>
        <ResponsiveTable
          columns={columns}
          dataSource={classGroups}
          rowKey="id"
          loading={loading}
          mobileCardRender={renderMobileCard}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} grupos de clase`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingClassGroup ? 'Editar Grupo de Clase' : 'Crear Grupo de Clase'}
        open={modalVisible}
        width={isMobile ? '95%' : isTablet ? 600 : 700}
        style={isMobile ? { top: 20 } : {}}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                label="Nombre del Grupo"
                name="name"
                rules={[{ required: true, message: 'Por favor ingrese el nombre del grupo' }]}
              >
                <Input placeholder="Ej: 3º A Primaria" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                label="Sección"
                name="section"
                rules={[{ required: true, message: 'Por favor ingrese la sección' }]}
              >
                <Input placeholder="Ej: A, B, C" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={24} md={12}>
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
            <Col xs={24} sm={24} md={12}>
              <Form.Item
                label="Cursos"
                name="courseIds"
                rules={[{ required: true, message: 'Por favor seleccione al menos un curso' }]}
              >
                <Select 
                  mode="multiple"
                  placeholder="Seleccionar cursos (multinivel)"
                  allowClear
                >
                  {courses.map(course => (
                    <Option key={course.id} value={course.id}>
                      {course.name} - {course.cycle.educationalLevel.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Profesor Tutor"
            name="tutorId"
          >
            <Select
              placeholder="Seleccionar profesor tutor (opcional)"
              allowClear
            >
              {teachers.map(teacher => (
                <Option key={teacher.id} value={teacher.id}>
                  {teacher.user?.profile?.firstName || ''} {teacher.user?.profile?.lastName || ''} - {teacher.employeeNumber || ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              {editingClassGroup ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Details Drawer */}
      <Drawer
        title="Detalles del Grupo de Clase"
        placement="right"
        size={isMobile ? 'default' : 'large'}
        width={isMobile ? '100%' : isTablet ? 480 : 600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedClassGroup && (
          <div className="space-y-6">
            <div>
              <Title level={3}>{selectedClassGroup.name}</Title>
              <Space>
                <Tag color="blue">Sección {selectedClassGroup.section}</Tag>
                {selectedClassGroup.academicYear ? (
                  <Tag color="green">{selectedClassGroup.academicYear.name}</Tag>
                ) : (
                  <Tag color="red">Sin año académico</Tag>
                )}
              </Space>
            </div>

            <Divider />

            <div>
              <Title level={4}>Información del Curso</Title>
              <div>
                <Text strong>Cursos:</Text>
                <div className="mt-2">
                  {selectedClassGroup.courses?.map(course => (
                    <div key={course.id} className="mb-1">
                      <Tag color="blue">{course.name}</Tag>
                      {course.cycle?.educationalLevel?.name && (
                        <Text type="secondary" className="ml-2">
                          {course.cycle.educationalLevel.name}
                        </Text>
                      )}
                    </div>
                  )) || <Text type="secondary">Sin cursos asignados</Text>}
                </div>
              </div>
            </div>

            {selectedClassGroup.tutor && (
              <>
                <Divider />
                <div>
                  <Title level={4}>Profesor Tutor</Title>
                  <div className="flex items-center space-x-3">
                    <Avatar size={48} icon={<UserOutlined />} />
                    <div>
                      <div className="font-medium">
                        {selectedClassGroup.tutor?.user?.profile?.firstName || ''} {selectedClassGroup.tutor?.user?.profile?.lastName || ''}
                      </div>
                      <div className="text-gray-500">
                        {selectedClassGroup.tutor?.employeeNumber || ''} - {selectedClassGroup.tutor?.user?.profile?.department || ''}
                      </div>
                      <div className="text-sm">
                        Especialidades: {selectedClassGroup.tutor?.specialties?.join(', ') || 'No especificadas'}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Divider />

            <div>
              <div className="flex justify-between items-center mb-4">
                <Title level={4}>Estudiantes ({selectedClassGroup.students.length})</Title>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => handleManageStudents(selectedClassGroup)}
                  size="small"
                >
                  Gestionar
                </Button>
              </div>
              
              <List
                dataSource={selectedClassGroup.students}
                renderItem={student => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={`${student.user?.profile?.firstName || ''} ${student.user?.profile?.lastName || ''}`.trim()}
                      description={`Matrícula: ${student.enrollmentNumber || ''}`}
                    />
                  </List.Item>
                )}
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* Students Transfer Modal */}
      <Modal
        title={`Gestionar Estudiantes - ${selectedClassGroup?.name}`}
        open={transferVisible}
        onCancel={() => setTransferVisible(false)}
        onOk={handleTransferSubmit}
        width={isMobile ? '95%' : isTablet ? 600 : 700}
        style={isMobile ? { top: 20 } : {}}
      >
        <Transfer
          dataSource={transferData}
          targetKeys={targetKeys}
          onChange={handleTransferChange}
          render={item => item.title}
          titles={['Estudiantes Disponibles', 'Estudiantes Asignados']}
          listStyle={{
            width: 300,
            height: 400,
          }}
        />
      </Modal>
    </div>
  );
};

export default ClassGroupsPage;