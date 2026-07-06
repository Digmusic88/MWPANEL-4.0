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
  TimePicker,
  Switch,
  DatePicker,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HomeOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';
import {
  Classroom,
  TimeSlot,
  ScheduleSession,
  CreateClassroomRequest,
  CreateTimeSlotRequest,
  CLASSROOM_TYPE_LABELS,
  DAY_OF_WEEK_LABELS,
} from '@/types/schedule';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { RangePicker } = DatePicker;

interface EducationalLevel {
  id: string;
  name: string;
  code: string;
}

interface SubjectAssignment {
  id: string;
  weeklyHours: number;
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
  };
  classGroup: {
    id: string;
    name: string;
  };
  academicYear: {
    id: string;
    name: string;
  };
}

interface AcademicYear {
  id: string;
  name: string;
  isCurrent: boolean;
}

const SchedulesPage: React.FC = () => {
  const { allAcademicYears, currentAcademicYear } = useAcademicYear();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [scheduleSessions, setScheduleSessions] = useState<ScheduleSession[]>([]);
  const [educationalLevels, setEducationalLevels] = useState<EducationalLevel[]>([]);
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [classroomModalVisible, setClassroomModalVisible] = useState(false);
  const [timeSlotModalVisible, setTimeSlotModalVisible] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
  const [editingSession, setEditingSession] = useState<ScheduleSession | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('classrooms');
  
  const [classroomForm] = Form.useForm();
  const [timeSlotForm] = Form.useForm();
  const [sessionForm] = Form.useForm();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchClassrooms(),
      fetchTimeSlots(),
      fetchScheduleSessions(),
      fetchEducationalLevels(),
      fetchSubjectAssignments(),
    ]);
  };

  const fetchClassrooms = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/schedules/classrooms');
      setClassrooms(response.data);
    } catch (error: any) {
      message.error('Error al cargar aulas: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    try {
      const response = await apiClient.get('/schedules/time-slots');
      setTimeSlots(response.data);
    } catch (error: any) {
      message.error('Error al cargar franjas horarias: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchScheduleSessions = async () => {
    try {
      const response = await apiClient.get('/schedules/sessions');
      setScheduleSessions(response.data);
    } catch (error: any) {
      message.error('Error al cargar sesiones de horario: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchEducationalLevels = async () => {
    try {
      const response = await apiClient.get('/class-groups/available-courses');
      const uniqueLevels = response.data
        .map((course: any) => course.cycle.educationalLevel)
        .filter((level: any, index: number, self: any[]) => 
          self.findIndex(l => l.id === level.id) === index
        );
      setEducationalLevels(uniqueLevels);
    } catch (error: any) {
      console.error('Error loading educational levels:', error);
    }
  };

  const fetchSubjectAssignments = async () => {
    try {
      const response = await apiClient.get('/subjects/assignments/all');
      setSubjectAssignments(response.data);
    } catch (error: any) {
      console.error('Error loading subject assignments:', error);
    }
  };


  // ==================== CLASSROOMS ====================

  const handleCreateClassroom = () => {
    setEditingClassroom(null);
    classroomForm.resetFields();
    setClassroomModalVisible(true);
  };

  const handleEditClassroom = (record: Classroom) => {
    setEditingClassroom(record);
    classroomForm.setFieldsValue({
      name: record.name,
      code: record.code,
      capacity: record.capacity,
      type: record.type,
      equipment: record.equipment || [],
      building: record.building,
      floor: record.floor,
      description: record.description,
      isActive: record.isActive,
      preferredEducationalLevelId: record.preferredEducationalLevel?.id,
    });
    setClassroomModalVisible(true);
  };

  const handleDeleteClassroom = async (id: string) => {
    try {
      await apiClient.delete(`/schedules/classrooms/${id}`);
      message.success('Aula eliminada exitosamente');
      fetchClassrooms();
    } catch (error: any) {
      message.error('Error al eliminar aula: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitClassroom = async (values: any) => {
    try {
      const payload: CreateClassroomRequest = {
        ...values,
        equipment: values.equipment?.filter((item: string) => item.trim()) || [],
      };

      if (editingClassroom) {
        await apiClient.patch(`/schedules/classrooms/${editingClassroom.id}`, payload);
        message.success('Aula actualizada exitosamente');
      } else {
        await apiClient.post('/schedules/classrooms', payload);
        message.success('Aula creada exitosamente');
      }
      setClassroomModalVisible(false);
      classroomForm.resetFields();
      fetchClassrooms();
    } catch (error: any) {
      message.error('Error al guardar aula: ' + (error.response?.data?.message || error.message));
    }
  };

  // ==================== TIME SLOTS ====================

  const handleCreateTimeSlot = () => {
    setEditingTimeSlot(null);
    timeSlotForm.resetFields();
    setTimeSlotModalVisible(true);
  };

  const handleEditTimeSlot = (record: TimeSlot) => {
    setEditingTimeSlot(record);
    timeSlotForm.setFieldsValue({
      name: record.name,
      startTime: dayjs(record.startTime, 'HH:mm'),
      endTime: dayjs(record.endTime, 'HH:mm'),
      order: record.order,
      isBreak: record.isBreak,
      isActive: record.isActive,
      educationalLevelId: record.educationalLevel?.id || null,
    });
    setTimeSlotModalVisible(true);
  };

  const handleDeleteTimeSlot = async (id: string) => {
    try {
      await apiClient.delete(`/schedules/time-slots/${id}`);
      message.success('Franja horaria eliminada exitosamente');
      fetchTimeSlots();
    } catch (error: any) {
      message.error('Error al eliminar franja horaria: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitTimeSlot = async (values: any) => {
    try {
      const payload: CreateTimeSlotRequest = {
        ...values,
        startTime: values.startTime.format('HH:mm'),
        endTime: values.endTime.format('HH:mm'),
      };

      if (editingTimeSlot) {
        await apiClient.patch(`/schedules/time-slots/${editingTimeSlot.id}`, payload);
        message.success('Franja horaria actualizada exitosamente');
      } else {
        await apiClient.post('/schedules/time-slots', payload);
        message.success('Franja horaria creada exitosamente');
      }
      setTimeSlotModalVisible(false);
      timeSlotForm.resetFields();
      fetchTimeSlots();
    } catch (error: any) {
      message.error('Error al guardar franja horaria: ' + (error.response?.data?.message || error.message));
    }
  };

  // ==================== SCHEDULE SESSIONS ====================

  const handleCreateSession = () => {
    setEditingSession(null);
    sessionForm.resetFields();
    setSessionModalVisible(true);
  };

  const handleEditSession = (record: ScheduleSession) => {
    setEditingSession(record);
    
    const formValues = {
      subjectAssignmentId: record.subjectAssignment?.id || null,
      classroomId: record.classroom?.id || null,
      timeSlotId: record.timeSlot?.id || null,
      dayOfWeek: record.dayOfWeek,
      academicYearId: record.academicYear?.id || null,
      dateRange: [dayjs(record.startDate), dayjs(record.endDate)],
      isActive: record.isActive,
      notes: record.notes,
    };
    
    sessionForm.setFieldsValue(formValues);
    setSessionModalVisible(true);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await apiClient.delete(`/schedules/sessions/${id}`);
      message.success('Sesión de horario eliminada exitosamente');
      fetchScheduleSessions();
    } catch (error: any) {
      message.error('Error al eliminar sesión: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSubmitSession = async (values: any) => {
    try {
      
      // Verify that subjectAssignmentId is a valid UUID
      if (!values.subjectAssignmentId || typeof values.subjectAssignmentId !== 'string') {
        message.error('Por favor seleccione una asignación de asignatura válida');
        return;
      }

      // Build payload with only defined fields
      const payload: any = {
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
      };

      // Only add fields that have valid values
      if (values.subjectAssignmentId) payload.subjectAssignmentId = values.subjectAssignmentId;
      if (values.classroomId) payload.classroomId = values.classroomId;
      if (values.timeSlotId) payload.timeSlotId = values.timeSlotId;
      if (values.dayOfWeek !== undefined && values.dayOfWeek !== null) payload.dayOfWeek = values.dayOfWeek;
      if (values.academicYearId) payload.academicYearId = values.academicYearId;
      if (values.isActive !== undefined && values.isActive !== null) payload.isActive = values.isActive;
      if (values.notes) payload.notes = values.notes;

      if (editingSession) {
        await apiClient.patch(`/schedules/sessions/${editingSession.id}`, payload);
        message.success('Sesión de horario actualizada exitosamente');
      } else {
        await apiClient.post('/schedules/sessions', payload);
        message.success('Sesión de horario creada exitosamente');
      }
      setSessionModalVisible(false);
      sessionForm.resetFields();
      fetchScheduleSessions();
    } catch (error: any) {
      console.error('Error details:', error.response?.data);
      message.error('Error al guardar sesión: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleViewDetails = (record: any, type: string) => {
    setSelectedItem({ ...record, type });
    setDrawerVisible(true);
  };

  // ==================== TABLE COLUMNS ====================

  const classroomColumns: ColumnsType<Classroom> = [
    {
      title: 'Aula',
      key: 'name',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.name}</div>
          <Tag color="blue">{record.code}</Tag>
        </div>
      ),
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag color="green">{CLASSROOM_TYPE_LABELS[type as keyof typeof CLASSROOM_TYPE_LABELS]}</Tag>,
    },
    {
      title: 'Capacidad',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      render: (capacity) => <Tag color="orange">{capacity}</Tag>,
      sorter: (a, b) => a.capacity - b.capacity,
    },
    {
      title: 'Ubicación',
      key: 'location',
      render: (_, record) => (
        <div>
          {record.building && <div>{record.building}</div>}
          {record.floor && <Text type="secondary">Planta {record.floor}</Text>}
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Activa' : 'Inactiva'}
        </Tag>
      ),
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
            onClick={() => handleViewDetails(record, 'classroom')}
            size="small"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditClassroom(record)}
            size="small"
          />
          <Popconfirm
            title="¿Está seguro de eliminar esta aula?"
            onConfirm={() => record.id && handleDeleteClassroom(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const timeSlotColumns: ColumnsType<TimeSlot> = [
    {
      title: 'Franja',
      key: 'name',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.name}</div>
          <Text type="secondary">{record.startTime} - {record.endTime}</Text>
        </div>
      ),
      sorter: (a, b) => a.order - b.order,
    },
    {
      title: 'Nivel Educativo',
      key: 'educationalLevel',
      render: (_, record) => (
        <Tag color="blue">{record.educationalLevel?.name || 'No asignado'}</Tag>
      ),
    },
    {
      title: 'Orden',
      dataIndex: 'order',
      key: 'order',
      width: 80,
      sorter: (a, b) => a.order - b.order,
    },
    {
      title: 'Tipo',
      dataIndex: 'isBreak',
      key: 'isBreak',
      render: (isBreak) => (
        <Tag color={isBreak ? 'orange' : 'green'}>
          {isBreak ? 'Descanso' : 'Clase'}
        </Tag>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Activa' : 'Inactiva'}
        </Tag>
      ),
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
            onClick={() => handleViewDetails(record, 'timeSlot')}
            size="small"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditTimeSlot(record)}
            size="small"
          />
          <Popconfirm
            title="¿Está seguro de eliminar esta franja horaria?"
            onConfirm={() => record.id && handleDeleteTimeSlot(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const sessionColumns: ColumnsType<ScheduleSession> = [
    {
      title: 'Asignatura',
      key: 'subject',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.subjectAssignment?.subject?.name || 'No asignado'}</div>
          <Text type="secondary">{record.subjectAssignment?.classGroup?.name || 'Sin grupo'}</Text>
        </div>
      ),
    },
    {
      title: 'Profesor',
      key: 'teacher',
      render: (_, record) => (
        <div>
          <div>
            {record.subjectAssignment?.teacher?.user?.profile?.firstName || 'No'}{' '}
            {record.subjectAssignment?.teacher?.user?.profile?.lastName || 'asignado'}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.subjectAssignment?.teacher?.employeeNumber || 'N/A'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Horario',
      key: 'schedule',
      render: (_, record) => (
        <div>
          <div>{DAY_OF_WEEK_LABELS[record.dayOfWeek]}</div>
          <Text type="secondary">
            {record.timeSlot.startTime} - {record.timeSlot.endTime}
          </Text>
        </div>
      ),
    },
    {
      title: 'Aula',
      key: 'classroom',
      render: (_, record) => (
        <div>
          <div>{record.classroom?.name || 'No asignada'}</div>
          <Tag color="blue">{record.classroom?.code || 'N/A'}</Tag>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'Activa' : 'Inactiva'}
        </Tag>
      ),
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
            onClick={() => handleViewDetails(record, 'session')}
            size="small"
          />
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditSession(record)}
            size="small"
          />
          <Popconfirm
            title="¿Está seguro de eliminar esta sesión?"
            onConfirm={() => record.id && handleDeleteSession(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Title level={2}>Gestión de Horarios</Title>
      </div>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarExtraContent={
            <Space>
              {activeTab === 'classrooms' && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateClassroom}
                >
                  Nueva Aula
                </Button>
              )}
              {activeTab === 'timeSlots' && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateTimeSlot}
                >
                  Nueva Franja Horaria
                </Button>
              )}
              {activeTab === 'sessions' && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateSession}
                >
                  Nueva Sesión
                </Button>
              )}
            </Space>
          }
        >
          <TabPane tab={<span><HomeOutlined />Aulas</span>} key="classrooms">
            <Table
              columns={classroomColumns}
              dataSource={classrooms}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} de ${total} aulas`,
              }}
            />
          </TabPane>
          
          <TabPane tab={<span><ClockCircleOutlined />Franjas Horarias</span>} key="timeSlots">
            <Table
              columns={timeSlotColumns}
              dataSource={timeSlots}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} de ${total} franjas`,
              }}
            />
          </TabPane>

          <TabPane tab={<span><CalendarOutlined />Horarios</span>} key="sessions">
            <Table
              columns={sessionColumns}
              dataSource={scheduleSessions}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} de ${total} sesiones`,
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Classroom Create/Edit Modal */}
      <Modal
        title={editingClassroom ? 'Editar Aula' : 'Crear Aula'}
        open={classroomModalVisible}
        onCancel={() => {
          setClassroomModalVisible(false);
          classroomForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={classroomForm}
          layout="vertical"
          onFinish={handleSubmitClassroom}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Nombre del Aula"
                name="name"
                rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
              >
                <Input placeholder="Ej: Aula 1A" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Código"
                name="code"
                rules={[{ required: true, message: 'Por favor ingrese el código' }]}
              >
                <Input placeholder="Ej: A1A" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Tipo"
                name="type"
                rules={[{ required: true, message: 'Por favor seleccione el tipo' }]}
              >
                <Select placeholder="Seleccionar tipo">
                  {Object.entries(CLASSROOM_TYPE_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Capacidad"
                name="capacity"
                rules={[{ required: true, message: 'Por favor ingrese la capacidad' }]}
              >
                <InputNumber min={1} max={100} placeholder="30" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Planta"
                name="floor"
              >
                <InputNumber min={0} max={10} placeholder="0" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Edificio"
                name="building"
              >
                <Input placeholder="Ej: Edificio Principal" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Nivel Educativo Preferido"
                name="preferredEducationalLevelId"
              >
                <Select placeholder="Seleccionar nivel (opcional)">
                  {educationalLevels.map(level => (
                    <Option key={level.id} value={level.id}>
                      {level.name || 'Sin nombre'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Equipamiento"
            name="equipment"
          >
            <Select
              mode="tags"
              placeholder="Ej: Proyector, Pizarra Digital, Aire Acondicionado"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="Descripción"
            name="description"
          >
            <TextArea rows={3} placeholder="Descripción del aula..." />
          </Form.Item>

          <Form.Item
            label="Estado"
            name="isActive"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
          </Form.Item>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setClassroomModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              {editingClassroom ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* TimeSlot Create/Edit Modal */}
      <Modal
        title={editingTimeSlot ? 'Editar Franja Horaria' : 'Crear Franja Horaria'}
        open={timeSlotModalVisible}
        onCancel={() => {
          setTimeSlotModalVisible(false);
          timeSlotForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={timeSlotForm}
          layout="vertical"
          onFinish={handleSubmitTimeSlot}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Nombre"
                name="name"
                rules={[{ required: true, message: 'Por favor ingrese el nombre' }]}
              >
                <Input placeholder="Ej: 1ª Hora" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Orden"
                name="order"
                rules={[{ required: true, message: 'Por favor ingrese el orden' }]}
              >
                <InputNumber min={1} max={20} placeholder="1" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Hora de Inicio"
                name="startTime"
                rules={[{ required: true, message: 'Por favor seleccione la hora de inicio' }]}
              >
                <TimePicker format="HH:mm" placeholder="08:00" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Hora de Fin"
                name="endTime"
                rules={[{ required: true, message: 'Por favor seleccione la hora de fin' }]}
              >
                <TimePicker format="HH:mm" placeholder="09:00" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Nivel Educativo"
            name="educationalLevelId"
            rules={[{ required: true, message: 'Por favor seleccione el nivel educativo' }]}
          >
            <Select placeholder="Seleccionar nivel educativo">
              {educationalLevels.map(level => (
                <Option key={level.id} value={level.id}>
                  {level.name || 'Sin nombre'}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Es Descanso"
                name="isBreak"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch checkedChildren="Descanso" unCheckedChildren="Clase" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Estado"
                name="isActive"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setTimeSlotModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              {editingTimeSlot ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Schedule Session Create/Edit Modal */}
      <Modal
        title={editingSession ? 'Editar Sesión de Horario' : 'Crear Sesión de Horario'}
        open={sessionModalVisible}
        onCancel={() => {
          setSessionModalVisible(false);
          sessionForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form
          form={sessionForm}
          layout="vertical"
          onFinish={handleSubmitSession}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Asignación de Asignatura"
                name="subjectAssignmentId"
                rules={[{ required: true, message: 'Por favor seleccione la asignación' }]}
              >
                <Select 
                  placeholder="Seleccionar asignación"
                  showSearch
                  filterOption={(input, option: any) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {subjectAssignments.map(assignment => (
                    <Option key={assignment.id} value={assignment.id}>
                      {assignment.subject?.name || 'Sin asignatura'} - {assignment.classGroup?.name || 'Sin grupo'} ({assignment.teacher?.user?.profile?.firstName || 'No'} {assignment.teacher?.user?.profile?.lastName || 'asignado'})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Aula"
                name="classroomId"
                rules={[{ required: true, message: 'Por favor seleccione el aula' }]}
              >
                <Select placeholder="Seleccionar aula">
                  {classrooms.filter(c => c.isActive).map(classroom => (
                    <Option key={classroom.id} value={classroom.id}>
                      {classroom.name || 'Sin nombre'} ({classroom.code || 'N/A'})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Franja Horaria"
                name="timeSlotId"
                rules={[{ required: true, message: 'Por favor seleccione la franja horaria' }]}
              >
                <Select placeholder="Seleccionar franja">
                  {timeSlots.filter(t => t.isActive && !t.isBreak).map(timeSlot => (
                    <Option key={timeSlot.id} value={timeSlot.id}>
                      {timeSlot.name || 'Sin nombre'} ({timeSlot.startTime || 'N/A'} - {timeSlot.endTime || 'N/A'})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Día de la Semana"
                name="dayOfWeek"
                rules={[{ required: true, message: 'Por favor seleccione el día' }]}
              >
                <Select placeholder="Seleccionar día">
                  {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                    <Option key={value} value={parseInt(value)}>
                      {label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Año Académico"
                name="academicYearId"
                rules={[{ required: true, message: 'Por favor seleccione el año académico' }]}
              >
                <Select placeholder="Seleccionar año académico">
                  {allAcademicYears.map(year => (
                    <Option key={year.id} value={year.id}>
                      {year.name || 'Sin nombre'} {year.isCurrent && <Tag color="green">Actual</Tag>}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Estado"
                name="isActive"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Período de Vigencia"
            name="dateRange"
            rules={[{ required: true, message: 'Por favor seleccione el período' }]}
          >
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Notas"
            name="notes"
          >
            <TextArea rows={2} placeholder="Notas adicionales..." />
          </Form.Item>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setSessionModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              {editingSession ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Details Drawer */}
      <Drawer
        title="Detalles"
        placement="right"
        size="large"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedItem && (
          <div className="space-y-6">
            {/* Render details based on type */}
            {selectedItem.type === 'classroom' && (
              <>
                <div>
                  <Title level={3}>{selectedItem.name || 'Sin nombre'}</Title>
                  <Space>
                    <Tag color="blue">{selectedItem.code || 'N/A'}</Tag>
                    <Tag color="green">{CLASSROOM_TYPE_LABELS[selectedItem.type as keyof typeof CLASSROOM_TYPE_LABELS] || 'N/A'}</Tag>
                    <Tag color="orange">{selectedItem.capacity || 0} personas</Tag>
                  </Space>
                </div>
                <Divider />
                <div>
                  <Title level={4}>Información Básica</Title>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Capacidad:</Text>
                      <div>{selectedItem.capacity} personas</div>
                    </Col>
                    <Col span={12}>
                      <Text strong>Tipo:</Text>
                      <div>{CLASSROOM_TYPE_LABELS[selectedItem.type as keyof typeof CLASSROOM_TYPE_LABELS]}</div>
                    </Col>
                  </Row>
                </div>
                {selectedItem.building && (
                  <>
                    <Divider />
                    <div>
                      <Title level={4}>Ubicación</Title>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Text strong>Edificio:</Text>
                          <div>{selectedItem.building}</div>
                        </Col>
                        <Col span={12}>
                          <Text strong>Planta:</Text>
                          <div>{selectedItem.floor || 'No especificada'}</div>
                        </Col>
                      </Row>
                    </div>
                  </>
                )}
                {selectedItem.equipment && selectedItem.equipment.length > 0 && (
                  <>
                    <Divider />
                    <div>
                      <Title level={4}>Equipamiento</Title>
                      <Space wrap>
                        {selectedItem.equipment.map((item: string, index: number) => (
                          <Tag key={index} color="blue">{item}</Tag>
                        ))}
                      </Space>
                    </div>
                  </>
                )}
              </>
            )}
            {/* Add similar details for timeSlot and session types */}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default SchedulesPage;