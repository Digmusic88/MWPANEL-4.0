import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  DatePicker,
  Switch,
  message,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Tooltip,
  Popconfirm,
  Typography,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  UsergroupAddOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { adminMeetingsService, meetingsService } from '../../services/meetingsService';
import {
  MeetingPeriod,
  CreateMeetingPeriod,
  UpdateMeetingPeriod,
  PeriodStats,
} from '../../types/meetings';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface EditingPeriod extends Partial<MeetingPeriod> {
  id?: string;
}

export const MeetingsPage: React.FC = () => {
  // Estado para períodos
  const [periods, setPeriods] = useState<MeetingPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<MeetingPeriod | null>(null);
  const [periodStats, setPeriodStats] = useState<PeriodStats | null>(null);
  
  // Estado para modales
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isStatsModalVisible, setIsStatsModalVisible] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<EditingPeriod>({});
  
  // Formularios
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Cargar períodos al montar el componente
  useEffect(() => {
    loadPeriods();
  }, []);

  // Cargar todos los períodos
  const loadPeriods = async () => {
    try {
      setLoading(true);
      const response = await adminMeetingsService.getAllPeriods();
      setPeriods(response.periods);
    } catch (error) {
      console.error('Error loading periods:', error);
      message.error('Error al cargar los períodos de reuniones');
    } finally {
      setLoading(false);
    }
  };

  // Crear nuevo período
  const handleCreatePeriod = async (values: any) => {
    try {
      const periodData: CreateMeetingPeriod = {
        name: values.name,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        bookingDeadline: values.bookingDeadline.format('YYYY-MM-DD'),
        description: values.description,
      };

      const response = await adminMeetingsService.createPeriod(periodData);
      message.success(response.message);
      
      setIsCreateModalVisible(false);
      createForm.resetFields();
      loadPeriods();
    } catch (error: any) {
      console.error('Error creating period:', error);
      message.error(error.response?.data?.message || 'Error al crear el período');
    }
  };

  // Actualizar período
  const handleUpdatePeriod = async (values: any) => {
    if (!editingPeriod.id) return;

    try {
      const updateData: UpdateMeetingPeriod = {
        name: values.name,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
        bookingDeadline: values.bookingDeadline.format('YYYY-MM-DD'),
        description: values.description,
        isActive: values.isActive,
      };

      const response = await adminMeetingsService.updatePeriod(editingPeriod.id, updateData);
      message.success(response.message);
      
      setIsEditModalVisible(false);
      editForm.resetFields();
      setEditingPeriod({});
      loadPeriods();
    } catch (error: any) {
      console.error('Error updating period:', error);
      message.error(error.response?.data?.message || 'Error al actualizar el período');
    }
  };

  // Eliminar período
  const handleDeletePeriod = async (periodId: string) => {
    try {
      await adminMeetingsService.deletePeriod(periodId);
      message.success('Período eliminado correctamente');
      loadPeriods();
    } catch (error: any) {
      console.error('Error deleting period:', error);
      message.error(error.response?.data?.message || 'Error al eliminar el período');
    }
  };

  // Mostrar estadísticas
  const showPeriodStats = async (period: MeetingPeriod) => {
    try {
      setSelectedPeriod(period);
      const stats = await adminMeetingsService.getPeriodStats(period.id);
      setPeriodStats(stats);
      setIsStatsModalVisible(true);
    } catch (error: any) {
      console.error('Error loading stats:', error);
      message.error('Error al cargar las estadísticas');
    }
  };

  // Abrir modal de edición
  const openEditModal = (period: MeetingPeriod) => {
    setEditingPeriod(period);
    editForm.setFieldsValue({
      name: period.name,
      dateRange: [dayjs(period.startDate), dayjs(period.endDate)],
      bookingDeadline: dayjs(period.bookingDeadline),
      description: period.description,
      isActive: period.isActive,
    });
    setIsEditModalVisible(true);
  };

  // Columnas de la tabla
  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: MeetingPeriod) => (
        <div>
          <Text strong>{name}</Text>
          {record.description && (
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.description}
              </Text>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Período',
      key: 'period',
      render: (record: MeetingPeriod) => (
        <div>
          <Text>{meetingsService.formatDate(record.startDate)}</Text>
          <Text type="secondary"> - </Text>
          <Text>{meetingsService.formatDate(record.endDate)}</Text>
        </div>
      ),
    },
    {
      title: 'Límite de Reservas',
      dataIndex: 'bookingDeadline',
      key: 'bookingDeadline',
      render: (date: string) => meetingsService.formatDate(date),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (record: MeetingPeriod) => (
        <Space direction="vertical" size="small">
          <Tag color={record.isActive ? 'green' : 'red'}>
            {record.isActive ? 'Activo' : 'Inactivo'}
          </Tag>
          <Tag color={record.isBookingOpen ? 'blue' : 'orange'}>
            {record.isBookingOpen ? 'Reservas Abiertas' : 'Reservas Cerradas'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Creado por',
      key: 'createdBy',
      render: (record: MeetingPeriod) => {
        const profile = record.createdBy.profile;
        return profile 
          ? `${profile.firstName} ${profile.lastName}`
          : record.createdBy.email;
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: MeetingPeriod) => (
        <Space>
          <Tooltip title="Ver estadísticas">
            <Button 
              type="text" 
              icon={<CalendarOutlined />}
              onClick={() => showPeriodStats(record)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button 
              type="text" 
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Popconfirm
            title="¿Eliminar período?"
            description="Esta acción no se puede deshacer. Se eliminarán todos los slots y reservas asociados."
            onConfirm={() => handleDeletePeriod(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
            okType="danger"
          >
            <Tooltip title="Eliminar">
              <Button 
                type="text" 
                danger 
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>Gestión de Reuniones</Title>
        <Text type="secondary">
          Administra los períodos de reuniones entre profesores y familias
        </Text>
      </div>

      {/* Botón de crear nuevo período */}
      <Card style={{ marginBottom: '24px' }}>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalVisible(true)}
          size="large"
        >
          Crear Nuevo Período
        </Button>
      </Card>

      {/* Tabla de períodos */}
      <Card>
        <Table
          columns={columns}
          dataSource={periods}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `Total: ${total} períodos`,
          }}
        />
      </Card>

      {/* Modal de crear período */}
      <Modal
        title="Crear Nuevo Período de Reuniones"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreatePeriod}
        >
          <Form.Item
            name="name"
            label="Nombre del Período"
            rules={[{ required: true, message: 'Introduce el nombre del período' }]}
          >
            <Input placeholder="Ej: Reuniones Primer Trimestre 2024" />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Período de Reuniones"
            rules={[{ required: true, message: 'Selecciona las fechas del período' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              placeholder={['Fecha de inicio', 'Fecha de fin']}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="bookingDeadline"
            label="Fecha Límite de Reservas"
            rules={[{ required: true, message: 'Selecciona la fecha límite' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Fecha límite para reservar"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Descripción (opcional)"
          >
            <TextArea
              rows={3}
              placeholder="Descripción del período de reuniones..."
            />
          </Form.Item>

          <Alert
            message="Información importante"
            description="Una vez creado el período, los profesores podrán crear slots de tiempo y las familias podrán hacer reservas hasta la fecha límite establecida."
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsCreateModalVisible(false);
                createForm.resetFields();
              }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                Crear Período
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de editar período */}
      <Modal
        title="Editar Período de Reuniones"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          editForm.resetFields();
          setEditingPeriod({});
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdatePeriod}
        >
          <Form.Item
            name="name"
            label="Nombre del Período"
            rules={[{ required: true, message: 'Introduce el nombre del período' }]}
          >
            <Input placeholder="Ej: Reuniones Primer Trimestre 2024" />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Período de Reuniones"
            rules={[{ required: true, message: 'Selecciona las fechas del período' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              placeholder={['Fecha de inicio', 'Fecha de fin']}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="bookingDeadline"
            label="Fecha Límite de Reservas"
            rules={[{ required: true, message: 'Selecciona la fecha límite' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              placeholder="Fecha límite para reservar"
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Descripción (opcional)"
          >
            <TextArea
              rows={3}
              placeholder="Descripción del período de reuniones..."
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Estado del Período"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Activo" 
              unCheckedChildren="Inactivo"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setIsEditModalVisible(false);
                editForm.resetFields();
                setEditingPeriod({});
              }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                Actualizar Período
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de estadísticas */}
      <Modal
        title={`Estadísticas: ${selectedPeriod?.name}`}
        open={isStatsModalVisible}
        onCancel={() => {
          setIsStatsModalVisible(false);
          setSelectedPeriod(null);
          setPeriodStats(null);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setIsStatsModalVisible(false);
            setSelectedPeriod(null);
            setPeriodStats(null);
          }}>
            Cerrar
          </Button>
        ]}
        width={700}
      >
        {periodStats && (
          <div>
            <Row gutter={16} style={{ marginBottom: '24px' }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Total Slots"
                    value={periodStats.stats.totalSlots}
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Slots Disponibles"
                    value={periodStats.stats.availableSlots}
                    prefix={<CheckCircleOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="Slots Reservados"
                    value={periodStats.stats.bookedSlots}
                    prefix={<ClockCircleOutlined />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="Profesores Participando"
                    value={periodStats.stats.uniqueTeachers}
                    prefix={<UsergroupAddOutlined />}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic
                    title="Familias con Reservas"
                    value={periodStats.stats.uniqueFamilies}
                    prefix={<UsergroupAddOutlined />}
                  />
                </Card>
              </Col>
            </Row>

            <div style={{ marginTop: '24px' }}>
              <Title level={4}>Información del Período</Title>
              <p><strong>Período:</strong> {meetingsService.formatDate(selectedPeriod!.startDate)} - {meetingsService.formatDate(selectedPeriod!.endDate)}</p>
              <p><strong>Límite de reservas:</strong> {meetingsService.formatDate(selectedPeriod!.bookingDeadline)}</p>
              <p><strong>Estado:</strong> 
                <Tag color={selectedPeriod!.isActive ? 'green' : 'red'} style={{ marginLeft: '8px' }}>
                  {selectedPeriod!.isActive ? 'Activo' : 'Inactivo'}
                </Tag>
                <Tag color={selectedPeriod!.isBookingOpen ? 'blue' : 'orange'}>
                  {selectedPeriod!.isBookingOpen ? 'Reservas Abiertas' : 'Reservas Cerradas'}
                </Tag>
              </p>
              {selectedPeriod!.description && (
                <p><strong>Descripción:</strong> {selectedPeriod!.description}</p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MeetingsPage;