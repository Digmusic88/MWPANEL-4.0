import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  message,
  Tag,
  Popconfirm,
  Row,
  Col,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface EvaluationPeriod {
  id: string;
  name: string;
  type: 'continuous' | 'trimester_1' | 'trimester_2' | 'trimester_3' | 'final' | 'extraordinary';
  startDate: string;
  endDate: string;
  isActive: boolean;
  academicYear: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

const PERIOD_TYPE_LABELS = {
  continuous: 'Evaluación Continua',
  trimester_1: '1º Trimestre',
  trimester_2: '2º Trimestre', 
  trimester_3: '3º Trimestre',
  final: 'Evaluación Final',
  extraordinary: 'Evaluación Extraordinaria',
};

const PERIOD_TYPE_COLORS = {
  continuous: 'blue',
  trimester_1: 'green',
  trimester_2: 'orange',
  trimester_3: 'purple',
  final: 'red',
  extraordinary: 'magenta',
};

const EvaluationPeriodsPage: React.FC = () => {
  const [periods, setPeriods] = useState<EvaluationPeriod[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<EvaluationPeriod | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  useEffect(() => {
    fetchPeriods();
    fetchAcademicYears();
  }, []);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/evaluations/periods');
      setPeriods(response.data);
    } catch (error: any) {
      console.error('Error fetching periods:', error);
      message.error('Error al cargar períodos de evaluación');
    } finally {
      setLoading(false);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await apiClient.get('/academic-years');
      setAcademicYears(response.data);
    } catch (error: any) {
      console.error('Error fetching academic years:', error);
    }
  };

  const handleInitializePeriods = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post('/evaluations/periods/initialize');
      message.success('Períodos de evaluación inicializados correctamente');
      fetchPeriods();
    } catch (error: any) {
      console.error('Error initializing periods:', error);
      message.error('Error al inicializar períodos de evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async (values: any) => {
    try {
      const periodData = {
        ...values,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
      };
      delete periodData.dateRange;

      await apiClient.post('/evaluations/periods', periodData);
      message.success('Período creado exitosamente');
      setModalVisible(false);
      form.resetFields();
      fetchPeriods();
    } catch (error: any) {
      console.error('Error creating period:', error);
      message.error('Error al crear período');
    }
  };

  const handleUpdatePeriod = async (values: any) => {
    if (!selectedPeriod) return;

    try {
      const updateData = {
        ...values,
        startDate: values.dateRange[0].format('YYYY-MM-DD'),
        endDate: values.dateRange[1].format('YYYY-MM-DD'),
      };
      delete updateData.dateRange;

      await apiClient.patch(`/evaluations/periods/${selectedPeriod.id}`, updateData);
      message.success('Período actualizado exitosamente');
      setEditModalVisible(false);
      setSelectedPeriod(null);
      editForm.resetFields();
      fetchPeriods();
    } catch (error: any) {
      console.error('Error updating period:', error);
      message.error('Error al actualizar período');
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    try {
      await apiClient.delete(`/evaluations/periods/${periodId}`);
      message.success('Período eliminado exitosamente');
      fetchPeriods();
    } catch (error: any) {
      console.error('Error deleting period:', error);
      message.error('Error al eliminar período');
    }
  };

  const handleToggleActive = async (periodId: string, isActive: boolean) => {
    try {
      await apiClient.patch(`/evaluations/periods/${periodId}`, { isActive: !isActive });
      message.success(isActive ? 'Período desactivado' : 'Período activado');
      fetchPeriods();
    } catch (error: any) {
      console.error('Error toggling period status:', error);
      message.error('Error al cambiar estado del período');
    }
  };

  const openEditModal = (period: EvaluationPeriod) => {
    setSelectedPeriod(period);
    editForm.setFieldsValue({
      name: period.name,
      type: period.type,
      academicYearId: period.academicYear.id,
      dateRange: [dayjs(period.startDate), dayjs(period.endDate)],
      isActive: period.isActive,
    });
    setEditModalVisible(true);
  };

  const columns: ColumnsType<EvaluationPeriod> = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: EvaluationPeriod) => (
        <div>
          <Text strong>{name}</Text>
          <br />
          <Tag color={PERIOD_TYPE_COLORS[record.type]}>
            {PERIOD_TYPE_LABELS[record.type]}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Año Académico',
      key: 'academicYear',
      render: (_, record: EvaluationPeriod) => (
        <Text>{record.academicYear.name}</Text>
      ),
    },
    {
      title: 'Fechas',
      key: 'dates',
      render: (_, record: EvaluationPeriod) => (
        <div>
          <div><Text strong>Inicio:</Text> {dayjs(record.startDate).format('DD/MM/YYYY')}</div>
          <div><Text strong>Fin:</Text> {dayjs(record.endDate).format('DD/MM/YYYY')}</div>
        </div>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_, record: EvaluationPeriod) => (
        <Tag
          color={record.isActive ? 'green' : 'default'}
          icon={record.isActive ? <CheckCircleOutlined /> : undefined}
        >
          {record.isActive ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record: EvaluationPeriod) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Button
            type="text"
            icon={record.isActive ? <CheckCircleOutlined /> : <PlayCircleOutlined />}
            onClick={() => handleToggleActive(record.id, record.isActive)}
          >
            {record.isActive ? 'Desactivar' : 'Activar'}
          </Button>
          <Popconfirm
            title="¿Estás seguro de eliminar este período?"
            description="Esta acción no se puede deshacer."
            onConfirm={() => handleDeletePeriod(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="!mb-2">
            Períodos de Evaluación
          </Title>
          <Text type="secondary">
            Gestiona los períodos de evaluación del centro educativo
          </Text>
        </div>
        <Space>
          <Button
            icon={<CalendarOutlined />}
            onClick={handleInitializePeriods}
            loading={loading}
          >
            Inicializar Períodos
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            Nuevo Período
          </Button>
        </Space>
      </div>

      {/* Información */}
      <Alert
        message="Gestión de Períodos de Evaluación"
        description="Los períodos de evaluación definen cuándo se pueden realizar evaluaciones por competencias. Los profesores podrán crear evaluaciones solo en períodos activos."
        type="info"
        showIcon
      />

      {/* Tabla de períodos */}
      <Card>
        <Table
          columns={columns}
          dataSource={periods}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} períodos`,
          }}
        />
      </Card>

      {/* Modal crear período */}
      <Modal
        title="Nuevo Período de Evaluación"
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
          onFinish={handleCreatePeriod}
          initialValues={{ isActive: true }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nombre del Período"
                rules={[{ required: true, message: 'Ingrese el nombre del período' }]}
              >
                <Input placeholder="ej. 1º Trimestre" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Tipo de Período"
                rules={[{ required: true, message: 'Seleccione el tipo' }]}
              >
                <Select placeholder="Seleccionar tipo">
                  {Object.entries(PERIOD_TYPE_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>
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
                name="academicYearId"
                label="Año Académico"
                rules={[{ required: true, message: 'Seleccione el año académico' }]}
              >
                <Select placeholder="Seleccionar año académico">
                  {academicYears.map(year => (
                    <Option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && <Tag color="green">Actual</Tag>}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dateRange"
                label="Fechas del Período"
                rules={[{ required: true, message: 'Seleccione las fechas' }]}
              >
                <RangePicker 
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="isActive"
            valuePropName="checked"
          >
            <Input type="checkbox" />
            <Text> Período activo</Text>
          </Form.Item>

          <div className="flex justify-end space-x-2 mt-6">
            <Button onClick={() => setModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              Crear Período
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal editar período */}
      <Modal
        title="Editar Período de Evaluación"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedPeriod(null);
          editForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdatePeriod}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nombre del Período"
                rules={[{ required: true, message: 'Ingrese el nombre del período' }]}
              >
                <Input placeholder="ej. 1º Trimestre" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Tipo de Período"
                rules={[{ required: true, message: 'Seleccione el tipo' }]}
              >
                <Select placeholder="Seleccionar tipo">
                  {Object.entries(PERIOD_TYPE_LABELS).map(([key, label]) => (
                    <Option key={key} value={key}>
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
                name="academicYearId"
                label="Año Académico"
                rules={[{ required: true, message: 'Seleccione el año académico' }]}
              >
                <Select placeholder="Seleccionar año académico">
                  {academicYears.map(year => (
                    <Option key={year.id} value={year.id}>
                      {year.name} {year.isCurrent && <Tag color="green">Actual</Tag>}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dateRange"
                label="Fechas del Período"
                rules={[{ required: true, message: 'Seleccione las fechas' }]}
              >
                <RangePicker 
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end space-x-2 mt-6">
            <Button onClick={() => setEditModalVisible(false)}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              Actualizar Período
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default EvaluationPeriodsPage;