/**
 * @archivo: SpacesManagementModal.tsx
 * @módulo: Admin Meetings - Spaces Management
 * @función: Modal para gestionar espacios/salas de reuniones
 * @características:
 *   - CRUD completo de espacios
 *   - Vista en tabla con colores
 *   - Formulario de creación/edición
 *   - Validación de disponibilidad
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Form,
  Input,
  Select,
  Switch,
  Space,
  message,
  Popconfirm,
  Tag,
  Card,
  Row,
  Col,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../services/apiClient';
import type { ColumnsType } from 'antd/es/table';

const { Option } = Select;
const { TextArea } = Input;

interface MeetingSpace {
  id: string;
  name: string;
  type: string;
  location?: string;
  capacity?: number;
  description?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SpacesManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

const SPACE_TYPES = [
  { value: 'office', label: 'Oficina' },
  { value: 'meeting_room', label: 'Sala de Reuniones' },
  { value: 'library', label: 'Biblioteca' },
  { value: 'classroom', label: 'Aula' },
  { value: 'other', label: 'Otro' },
];

const DEFAULT_COLORS = [
  '#3B82F6', // Azul
  '#10B981', // Verde
  '#F59E0B', // Amarillo
  '#EF4444', // Rojo
  '#8B5CF6', // Púrpura
  '#EC4899', // Rosa
  '#06B6D4', // Cyan
  '#F97316', // Naranja
];

const SpacesManagementModal: React.FC<SpacesManagementModalProps> = ({ visible, onClose }) => {
  const [spaces, setSpaces] = useState<MeetingSpace[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormModalVisible, setIsFormModalVisible] = useState(false);
  const [editingSpace, setEditingSpace] = useState<MeetingSpace | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      fetchSpaces();
    }
  }, [visible]);

  const fetchSpaces = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/admin/meetings/spaces');
      setSpaces(response.data.spaces || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
      message.error('Error al cargar los espacios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingSpace(null);
    form.resetFields();
    form.setFieldsValue({
      isActive: true,
      color: DEFAULT_COLORS[0],
    });
    setIsFormModalVisible(true);
  };

  const handleEdit = (space: MeetingSpace) => {
    setEditingSpace(space);
    form.setFieldsValue({
      name: space.name,
      type: space.type,
      location: space.location,
      capacity: space.capacity,
      description: space.description,
      color: space.color,
      isActive: space.isActive,
    });
    setIsFormModalVisible(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiClient.delete(`/admin/meetings/spaces/${id}`);
      message.success('Espacio eliminado exitosamente');
      fetchSpaces();
    } catch (error: any) {
      console.error('Error deleting space:', error);
      const errorMessage = error.response?.data?.message || 'Error al eliminar el espacio';
      message.error(errorMessage);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (editingSpace) {
        // Actualizar espacio existente
        await apiClient.put(`/admin/meetings/spaces/${editingSpace.id}`, values);
        message.success('Espacio actualizado exitosamente');
      } else {
        // Crear nuevo espacio
        await apiClient.post('/admin/meetings/spaces', values);
        message.success('Espacio creado exitosamente');
      }

      setIsFormModalVisible(false);
      form.resetFields();
      fetchSpaces();
    } catch (error: any) {
      console.error('Error saving space:', error);
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (error.errorFields) {
        message.error('Por favor completa todos los campos requeridos');
      } else {
        message.error('Error al guardar el espacio');
      }
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnsType<MeetingSpace> = [
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: 60,
      render: (color: string) => (
        <div
          style={{
            width: 24,
            height: 24,
            backgroundColor: color || '#ccc',
            borderRadius: '4px',
            border: '1px solid #ddd',
          }}
        />
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeLabel = SPACE_TYPES.find((t) => t.value === type)?.label || type;
        return <Tag>{typeLabel}</Tag>;
      },
    },
    {
      title: 'Ubicación',
      dataIndex: 'location',
      key: 'location',
      render: (location?: string) => location || '-',
    },
    {
      title: 'Capacidad',
      dataIndex: 'capacity',
      key: 'capacity',
      width: 100,
      render: (capacity?: number) => (capacity ? `${capacity} personas` : '-'),
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'} icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
          {isActive ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar espacio?"
            description="Esta acción no se puede deshacer. Las reservas futuras perderán la asignación de espacio."
            onConfirm={() => handleDelete(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <HomeOutlined />
            Gestión de Espacios de Reuniones
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={1200}
        footer={[
          <Button key="close" onClick={onClose}>
            Cerrar
          </Button>,
        ]}
      >
        <Card style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space>
                <HomeOutlined style={{ fontSize: 24 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>Total de Espacios</div>
                  <div style={{ fontSize: 24, color: '#1890ff' }}>{spaces.length}</div>
                </div>
              </Space>
            </Col>
            <Col>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} size="large">
                Crear Nuevo Espacio
              </Button>
            </Col>
          </Row>
        </Card>

        <Table
          columns={columns}
          dataSource={spaces}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} espacios`,
          }}
        />
      </Modal>

      {/* Modal de Formulario */}
      <Modal
        title={editingSpace ? 'Editar Espacio' : 'Crear Nuevo Espacio'}
        open={isFormModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setIsFormModalVisible(false);
          form.resetFields();
        }}
        confirmLoading={loading}
        okText={editingSpace ? 'Actualizar' : 'Crear'}
        cancelText="Cancelar"
        width={600}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item
            name="name"
            label="Nombre del Espacio"
            rules={[{ required: true, message: 'El nombre es requerido' }]}
          >
            <Input placeholder="Ej: Sala 1, Oficina Principal" maxLength={100} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="Tipo"
                rules={[{ required: true, message: 'El tipo es requerido' }]}
              >
                <Select placeholder="Seleccionar tipo">
                  {SPACE_TYPES.map((type) => (
                    <Option key={type.value} value={type.value}>
                      {type.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="capacity" label="Capacidad (personas)">
                <InputNumber min={1} max={100} style={{ width: '100%' }} placeholder="Opcional" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="location" label="Ubicación">
            <Input placeholder="Ej: Planta 1, Edificio A" maxLength={200} />
          </Form.Item>

          <Form.Item name="description" label="Descripción">
            <TextArea rows={3} placeholder="Información adicional sobre el espacio" maxLength={500} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="color" label="Color Identificativo">
                <Select placeholder="Seleccionar color">
                  {DEFAULT_COLORS.map((color, index) => (
                    <Option key={color} value={color}>
                      <Space>
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            backgroundColor: color,
                            borderRadius: 2,
                            border: '1px solid #ddd',
                          }}
                        />
                        Color {index + 1}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Estado" valuePropName="checked">
                <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default SpacesManagementModal;
