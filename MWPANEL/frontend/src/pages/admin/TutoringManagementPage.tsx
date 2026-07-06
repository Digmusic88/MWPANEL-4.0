import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Input,
  Select,
  Modal,
  Form,
  message,
  Tag,
  Tooltip,
  Popconfirm,
  Tabs,
  Row,
  Col,
  Statistic,
  Drawer,
  Divider,
  Transfer,
  Avatar
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  SearchOutlined,
  EyeOutlined,
  UsergroupAddOutlined,
  BookOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import apiClient from '@services/apiClient';
import { useResponsive } from '../../hooks/useResponsive';
import InteractiveButton from '@components/animations/InteractiveButton';
import ScrollReveal from '@components/animations/ScrollReveal';
import FadeInUp from '@components/animations/FadeInUp';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface Teacher {
  id: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface Student {
  id: string;
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
  enrollmentNumber: string;
}

interface TutoringGroup {
  id: string;
  name: string;
  description?: string;
  tutor: Teacher;
  academicYear: {
    id: string;
    name: string;
  };
  educationalLevel?: {
    id: string;
    name: string;
  };
  tutoringStudents: Array<{
    id: string;
    student: Student;
    notes?: string;
  }>;
  isActive: boolean;
  createdAt: string;
}

interface AcademicYear {
  id: string;
  name: string;
}

interface EducationalLevel {
  id: string;
  name: string;
}

const TutoringManagementPage: React.FC = () => {
  const [tutoringGroups, setTutoringGroups] = useState<TutoringGroup[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [educationalLevels, setEducationalLevels] = useState<EducationalLevel[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);

  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isStudentsModalVisible, setIsStudentsModalVisible] = useState(false);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TutoringGroup | null>(null);
  const [managingStudentsGroup, setManagingStudentsGroup] = useState<TutoringGroup | null>(null);
  const [viewingGroup, setViewingGroup] = useState<TutoringGroup | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [form] = Form.useForm();
  const { isMobile } = useResponsive();

  const fetchTutoringGroups = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/tutoring/groups');
      setTutoringGroups(response.data);
    } catch (error) {
      message.error('Error al cargar grupos de tutoría');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await apiClient.get('/teachers');
      setTeachers(response.data);
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await apiClient.get('/academic-years');
      setAcademicYears(response.data);
    } catch (error) {
      console.error('Error loading academic years:', error);
    }
  };

  const fetchEducationalLevels = async () => {
    try {
      const response = await apiClient.get('/educational-levels');
      setEducationalLevels(response.data);
    } catch (error) {
      console.error('Error loading educational levels:', error);
    }
  };

  const fetchAvailableStudents = async (groupId?: string) => {
    try {
      const url = groupId ? `/tutoring/students/available?groupId=${groupId}` : '/tutoring/students/available';
      const response = await apiClient.get(url);
      setAvailableStudents(response.data);
    } catch (error) {
      console.error('Error loading available students:', error);
    }
  };

  useEffect(() => {
    fetchTutoringGroups();
    fetchTeachers();
    fetchAcademicYears();
    fetchEducationalLevels();
    fetchAvailableStudents();
  }, []);

  const handleAddGroup = () => {
    setEditingGroup(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditGroup = (group: TutoringGroup) => {
    setEditingGroup(group);
    form.setFieldsValue({
      name: group.name,
      description: group.description,
      tutorId: group.tutor.id,
      academicYearId: group.academicYear.id,
      educationalLevelId: group.educationalLevel?.id,
      isActive: group.isActive
    });
    setIsModalVisible(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await apiClient.delete(`/tutoring/groups/${groupId}`);
      message.success('Grupo de tutoría eliminado correctamente');
      fetchTutoringGroups();
    } catch (error) {
      message.error('Error al eliminar grupo de tutoría');
    }
  };

  const handleViewGroup = (group: TutoringGroup) => {
    setViewingGroup(group);
    setIsDetailDrawerVisible(true);
  };

  const handleManageStudents = (group: TutoringGroup) => {
    setManagingStudentsGroup(group);
    fetchAvailableStudents(group.id);

    // Set currently assigned students as selected
    const assignedStudentIds = group.tutoringStudents.map(ts => ts.student.id);
    setSelectedStudentIds(assignedStudentIds);

    setIsStudentsModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      console.log('Submitting tutoring group (raw):', values);

      // Clean up the values - remove empty/placeholder values for optional fields
      const cleanValues = {
        name: values.name,
        tutorId: values.tutorId,
        academicYearId: values.academicYearId,
      };

      // Only include optional fields if they have valid values
      if (values.description && values.description.trim()) {
        cleanValues.description = values.description;
      }

      if (values.educationalLevelId &&
          values.educationalLevelId !== '22222222-2222-2222-2222-222222222222' &&
          values.educationalLevelId !== 'undefined' &&
          values.educationalLevelId !== '') {
        cleanValues.educationalLevelId = values.educationalLevelId;
      }

      if (values.isActive !== undefined) {
        cleanValues.isActive = values.isActive;
      }

      console.log('Submitting tutoring group (cleaned):', cleanValues);

      if (editingGroup) {
        await apiClient.patch(`/tutoring/groups/${editingGroup.id}`, cleanValues);
        message.success('Grupo de tutoría actualizado correctamente');
      } else {
        await apiClient.post('/tutoring/groups', cleanValues);
        message.success('Grupo de tutoría creado correctamente');
      }
      setIsModalVisible(false);
      form.resetFields();
      fetchTutoringGroups();
    } catch (error: any) {
      console.error('Error creating tutoring group:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Error al guardar grupo de tutoría';
      message.error(`${errorMessage}. Verifique que todos los campos estén completados correctamente.`);
    }
  };

  const handleSaveStudents = async () => {
    if (!managingStudentsGroup) return;

    try {
      const currentStudentIds = managingStudentsGroup.tutoringStudents.map(ts => ts.student.id);

      // Students to add (selected but not currently assigned)
      const studentsToAdd = selectedStudentIds.filter(id => !currentStudentIds.includes(id));

      // Students to remove (currently assigned but not selected)
      const studentsToRemove = currentStudentIds.filter(id => !selectedStudentIds.includes(id));

      console.log('Guardando cambios:', {
        studentsToAdd,
        studentsToRemove,
        currentStudentIds,
        selectedStudentIds
      });

      // Add new students
      if (studentsToAdd.length > 0) {
        await apiClient.post(`/tutoring/groups/${managingStudentsGroup.id}/students`, {
          studentIds: studentsToAdd
        });
        console.log('Estudiantes agregados:', studentsToAdd);
      }

      // Remove students
      if (studentsToRemove.length > 0) {
        await apiClient.delete(`/tutoring/groups/${managingStudentsGroup.id}/students`, {
          data: { studentIds: studentsToRemove }
        });
        console.log('Estudiantes removidos:', studentsToRemove);
      }

      message.success('Estudiantes actualizados correctamente');

      // Cerrar modal y resetear estados
      setIsStudentsModalVisible(false);
      setManagingStudentsGroup(null);
      setSelectedStudentIds([]);

      // Refrescar datos
      await fetchTutoringGroups();
      await fetchAvailableStudents();
    } catch (error: any) {
      console.error('Error al actualizar estudiantes:', error);
      message.error(error.response?.data?.message || 'Error al actualizar estudiantes');
    }
  };

  const columns: ColumnsType<TutoringGroup> = [
    {
      title: 'Nombre del Grupo',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Tutor',
      key: 'tutor',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <div>
            <div>{record.tutor?.user?.profile?.firstName} {record.tutor?.user?.profile?.lastName}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.tutor?.user?.email}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Estudiantes',
      key: 'students',
      render: (_, record) => (
        <Tag color="blue">
          {record.tutoringStudents?.length || 0} estudiantes
        </Tag>
      )
    },
    {
      title: 'Año Académico',
      dataIndex: ['academicYear', 'name'],
      key: 'academicYear'
    },
    {
      title: 'Nivel Educativo',
      key: 'educationalLevel',
      render: (_, record) => (
        <span>{record.educationalLevel?.name || 'No especificado'}</span>
      )
    },
    {
      title: 'Estado',
      key: 'isActive',
      render: (_, record) => (
        <Tag color={record.isActive ? 'green' : 'red'}>
          {record.isActive ? 'Activo' : 'Inactivo'}
        </Tag>
      )
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver detalles">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewGroup(record)}
            />
          </Tooltip>
          <Tooltip title="Gestionar estudiantes">
            <Button
              type="text"
              size="small"
              icon={<UsergroupAddOutlined />}
              onClick={() => handleManageStudents(record)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditGroup(record)}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Eliminar grupo de tutoría?"
              description={`¿Estás seguro de eliminar el grupo "${record.name}"?`}
              onConfirm={() => handleDeleteGroup(record.id)}
              okText="Sí, eliminar"
              cancelText="Cancelar"
              okType="danger"
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  const transferData = availableStudents.map(student => ({
    key: student.id,
    title: `${student.user?.profile?.firstName} ${student.user?.profile?.lastName}`,
    description: student.user?.email,
    disabled: false
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeInUp>
        <div className="flex justify-between items-center">
          <div>
            <Title level={2} className="!mb-2">
              Gestión de Tutorías
            </Title>
            <Text type="secondary">
              Administra grupos de tutoría y asignación de estudiantes
            </Text>
          </div>
          <InteractiveButton
            variant="primary"
            icon={<PlusOutlined />}
            onClick={handleAddGroup}
          >
            {isMobile ? 'Nuevo' : 'Nuevo Grupo de Tutoría'}
          </InteractiveButton>
        </div>
      </FadeInUp>

      {/* Statistics */}
      <ScrollReveal direction="up" delay={0.1}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Grupos"
                value={tutoringGroups.length}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Grupos Activos"
                value={tutoringGroups.filter(g => g.isActive).length}
                prefix={<BookOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Estudiantes"
                value={tutoringGroups.reduce((sum, g) => sum + (g.tutoringStudents?.length || 0), 0)}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Tutores Activos"
                value={new Set(tutoringGroups.map(g => g.tutor?.id)).size}
                prefix={<UsergroupAddOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      </ScrollReveal>

      {/* Main Table */}
      <ScrollReveal direction="up" delay={0.2}>
        <Card>
          <Table
            columns={columns}
            dataSource={tutoringGroups}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} de ${total} grupos`
            }}
          />
        </Card>
      </ScrollReveal>

      {/* Add/Edit Modal */}
      <Modal
        title={editingGroup ? 'Editar Grupo de Tutoría' : 'Nuevo Grupo de Tutoría'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Nombre del Grupo"
            rules={[{ required: true, message: 'El nombre es requerido' }]}
          >
            <Input placeholder="Ej: Tutoría 1º ESO A" />
          </Form.Item>

          <Form.Item name="description" label="Descripción">
            <Input.TextArea
              placeholder="Descripción opcional del grupo de tutoría"
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tutorId"
                label="Tutor"
                rules={[{ required: true, message: 'El tutor es requerido' }]}
              >
                <Select placeholder="Selecciona un tutor">
                  {teachers.map(teacher => (
                    <Option key={teacher.id} value={teacher.id}>
                      {teacher.user?.profile?.firstName} {teacher.user?.profile?.lastName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="academicYearId"
                label="Año Académico"
                rules={[{ required: true, message: 'El año académico es requerido' }]}
              >
                <Select placeholder="Selecciona año académico">
                  {academicYears.map(year => (
                    <Option key={year.id} value={year.id}>
                      {year.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="educationalLevelId" label="Nivel Educativo">
            <Select placeholder="Selecciona nivel educativo (opcional)" allowClear>
              {educationalLevels.map(level => (
                <Option key={level.id} value={level.id}>
                  {level.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="isActive" label="Estado" initialValue={true}>
            <Select>
              <Option value={true}>Activo</Option>
              <Option value={false}>Inactivo</Option>
            </Select>
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={() => setIsModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              {editingGroup ? 'Actualizar' : 'Crear'} Grupo
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Students Management Modal */}
      <Modal
        title={`Gestionar Estudiantes - ${managingStudentsGroup?.name}`}
        open={isStudentsModalVisible}
        onCancel={() => {
          setIsStudentsModalVisible(false);
          setManagingStudentsGroup(null);
          setSelectedStudentIds([]);
        }}
        onOk={handleSaveStudents}
        okText="Guardar Cambios"
        cancelText="Cancelar"
        width={800}
      >
        <div className="mb-4">
          <Text type="secondary">
            Selecciona los estudiantes que pertenecerán a este grupo de tutoría:
          </Text>
        </div>
        <Transfer
          dataSource={transferData}
          targetKeys={selectedStudentIds}
          onChange={setSelectedStudentIds}
          render={item => item.title}
          showSearch
          searchPlaceholder="Buscar estudiantes..."
          listStyle={{
            width: 350,
            height: 400,
          }}
          titles={['Estudiantes Disponibles', 'Estudiantes Asignados']}
        />
      </Modal>

      {/* Detail Drawer */}
      <Drawer
        title="Detalles del Grupo de Tutoría"
        placement="right"
        size="large"
        onClose={() => setIsDetailDrawerVisible(false)}
        open={isDetailDrawerVisible}
      >
        {viewingGroup && (
          <div className="space-y-6">
            {/* Group Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Información del Grupo</h3>
              <div className="space-y-3">
                <div>
                  <Text type="secondary">Nombre:</Text>
                  <div className="font-medium">{viewingGroup.name}</div>
                </div>
                {viewingGroup.description && (
                  <div>
                    <Text type="secondary">Descripción:</Text>
                    <div className="font-medium">{viewingGroup.description}</div>
                  </div>
                )}
                <div>
                  <Text type="secondary">Tutor:</Text>
                  <div className="font-medium">
                    {viewingGroup.tutor?.user?.profile?.firstName} {viewingGroup.tutor?.user?.profile?.lastName}
                  </div>
                </div>
                <div>
                  <Text type="secondary">Año Académico:</Text>
                  <div className="font-medium">{viewingGroup.academicYear?.name}</div>
                </div>
                {viewingGroup.educationalLevel && (
                  <div>
                    <Text type="secondary">Nivel Educativo:</Text>
                    <div className="font-medium">{viewingGroup.educationalLevel.name}</div>
                  </div>
                )}
              </div>
            </div>

            <Divider />

            {/* Students List */}
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Estudiantes Asignados ({viewingGroup.tutoringStudents?.length || 0})
              </h3>
              {viewingGroup.tutoringStudents?.length > 0 ? (
                <div className="space-y-3">
                  {viewingGroup.tutoringStudents.map((assignment) => (
                    <Card key={assignment.id} size="small">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">
                            {assignment.student?.user?.profile?.firstName} {assignment.student?.user?.profile?.lastName}
                          </div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {assignment.student?.user?.email}
                          </Text>
                          {assignment.student?.enrollmentNumber && (
                            <Tag size="small" color="blue" className="ml-2">
                              {assignment.student.enrollmentNumber}
                            </Tag>
                          )}
                        </div>
                        <Avatar icon={<UserOutlined />} />
                      </div>
                      {assignment.notes && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Notas: {assignment.notes}
                          </Text>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserOutlined className="text-4xl text-gray-400 mb-2" />
                  <div>No hay estudiantes asignados a este grupo</div>
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default TutoringManagementPage;