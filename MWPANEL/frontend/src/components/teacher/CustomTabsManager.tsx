/**
 * @archivo: CustomTabsManager.tsx
 * @función: Gestión de pestañas personalizadas para Test Yourself
 * @crítico: SÍ - Permite crear/editar/eliminar pestañas principales
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Alert,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  FolderOutlined,
  DragOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/apiClient';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CustomTab {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  orderIndex: number;
  isDefault: boolean;
  isActive: boolean;
  tasksCount?: number;
}

interface CustomTabsManagerProps {
  onTabsChanged?: () => void;
}

const ICON_OPTIONS = [
  { value: 'FolderOutlined', label: '📁 Carpeta', emoji: '📁' },
  { value: 'BookOutlined', label: '📚 Libro', emoji: '📚' },
  { value: 'FileTextOutlined', label: '📄 Documento', emoji: '📄' },
  { value: 'TagOutlined', label: '🏷️ Etiqueta', emoji: '🏷️' },
  { value: 'StarOutlined', label: '⭐ Estrella', emoji: '⭐' },
  { value: 'HeartOutlined', label: '❤️ Corazón', emoji: '❤️' },
  { value: 'ThunderboltOutlined', label: '⚡ Rayo', emoji: '⚡' },
  { value: 'CrownOutlined', label: '👑 Corona', emoji: '👑' },
];

const COLOR_OPTIONS = [
  { value: '#1890ff', label: 'Azul' },
  { value: '#52c41a', label: 'Verde' },
  { value: '#faad14', label: 'Amarillo' },
  { value: '#f5222d', label: 'Rojo' },
  { value: '#722ed1', label: 'Morado' },
  { value: '#fa541c', label: 'Naranja' },
  { value: '#13c2c2', label: 'Cian' },
  { value: '#eb2f96', label: 'Rosa' },
];

export default function CustomTabsManager({ onTabsChanged }: CustomTabsManagerProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTab, setEditingTab] = useState<CustomTab | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // Query para obtener pestañas personalizadas
  const { data: customTabs = [], isLoading } = useQuery({
    queryKey: ['custom-tabs'],
    queryFn: async () => {
      try {
        console.log('🎯 FRONTEND: Fetching custom tabs');
        const response = await api.get('/tasks/custom-tabs');
        console.log('🎯 FRONTEND: Custom tabs response:', response.data);
        return response.data as CustomTab[];
      } catch (error) {
        console.error('🔴 FRONTEND: Error fetching custom tabs:', error);
        // Por ahora retornamos datos mock mientras el backend se compila
        return [
          {
            id: 'default-1',
            name: 'Sin Asignatura',
            description: 'Tareas sin asignatura específica',
            color: '#faad14',
            icon: 'FolderOutlined',
            orderIndex: 0,
            isDefault: true,
            isActive: true,
            tasksCount: 0,
          }
        ] as CustomTab[];
      }
    },
    enabled: true,
  });

  // Mutation para crear pestaña
  const createTabMutation = useMutation({
    mutationFn: async (data: any) => {
      try {
        const response = await api.post('/tasks/custom-tabs', data);
        return response.data;
      } catch (error) {
        // Mock para desarrollo
        const newTab = {
          id: `tab-${Date.now()}`,
          ...data,
          orderIndex: customTabs.length,
          isDefault: false,
          isActive: true,
          tasksCount: 0,
        };
        return newTab;
      }
    },
    onSuccess: () => {
      message.success('Pestaña creada exitosamente');
      setIsModalVisible(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['custom-tabs'] });
      onTabsChanged?.();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al crear la pestaña');
    },
  });

  // Mutation para actualizar pestaña
  const updateTabMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      try {
        const response = await api.put(`/tasks/custom-tabs/${id}`, data);
        return response.data;
      } catch (error) {
        // Mock para desarrollo
        return { id, ...data };
      }
    },
    onSuccess: () => {
      message.success('Pestaña actualizada exitosamente');
      setIsModalVisible(false);
      setEditingTab(null);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['custom-tabs'] });
      onTabsChanged?.();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al actualizar la pestaña');
    },
  });

  // Mutation para eliminar pestaña
  const deleteTabMutation = useMutation({
    mutationFn: async (tabId: string) => {
      try {
        await api.delete(`/tasks/custom-tabs/${tabId}`);
      } catch (error) {
        // Mock para desarrollo
        console.log('Mock delete tab:', tabId);
      }
    },
    onSuccess: () => {
      message.success('Pestaña eliminada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['custom-tabs'] });
      onTabsChanged?.();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al eliminar la pestaña');
    },
  });

  const handleCreateTab = (values: any) => {
    createTabMutation.mutate(values);
  };

  const handleUpdateTab = (values: any) => {
    if (editingTab) {
      updateTabMutation.mutate({ id: editingTab.id, data: values });
    }
  };

  const handleEditTab = (tab: CustomTab) => {
    setEditingTab(tab);
    form.setFieldsValue(tab);
    setIsModalVisible(true);
  };

  const handleDeleteTab = (tabId: string) => {
    deleteTabMutation.mutate(tabId);
  };

  const openCreateModal = () => {
    setEditingTab(null);
    form.resetFields();
    form.setFieldsValue({
      color: '#1890ff',
      icon: 'FolderOutlined',
    });
    setIsModalVisible(true);
  };

  const getIconEmoji = (iconName: string) => {
    const icon = ICON_OPTIONS.find(opt => opt.value === iconName);
    return icon?.emoji || '📁';
  };

  const columns = [
    {
      title: 'Pestaña',
      key: 'tab',
      render: (record: CustomTab) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: record.color, fontSize: '18px' }}>
            {getIconEmoji(record.icon)}
          </span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text strong>{record.name}</Text>
              {record.isDefault && (
                <Tag color="blue" size="small">Por defecto</Tag>
              )}
            </div>
            {record.description && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {record.description}
              </Text>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Color',
      dataIndex: 'color',
      key: 'color',
      width: 80,
      render: (color: string) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              backgroundColor: color,
              borderRadius: '4px',
              border: '1px solid #d9d9d9',
            }}
          />
          <Text style={{ fontSize: '11px' }}>{color}</Text>
        </div>
      ),
    },
    {
      title: 'Test Yourself',
      dataIndex: 'tasksCount',
      key: 'tasksCount',
      width: 120,
      render: (count: number = 0) => (
        <Tag color={count > 0 ? 'green' : 'default'}>
          {count} tareas
        </Tag>
      ),
    },
    {
      title: 'Orden',
      dataIndex: 'orderIndex',
      key: 'orderIndex',
      width: 80,
      render: (index: number) => (
        <Tag color="blue">{index + 1}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (record: CustomTab) => (
        <Space>
          <Tooltip title="Editar pestaña">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditTab(record)}
            />
          </Tooltip>
          {!record.isDefault && (
            <Popconfirm
              title="¿Eliminar pestaña?"
              description="Las tareas de esta pestaña se moverán a la pestaña por defecto"
              onConfirm={() => handleDeleteTab(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Tooltip title="Eliminar pestaña">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SettingOutlined />
          <span>Gestión de Pestañas Personalizadas</span>
        </div>
      }
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
          size="small"
        >
          Nueva Pestaña
        </Button>
      }
      size="small"
    >
      <Alert
        message="Gestiona las pestañas principales donde se organizan los Test Yourself"
        description="Puedes crear pestañas personalizadas para organizar mejor tus evaluaciones. Las tareas se pueden asignar a estas pestañas desde la vista principal."
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      <Table
        dataSource={customTabs}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        size="small"
      />

      {/* Modal para crear/editar pestaña */}
      <Modal
        title={editingTab ? 'Editar Pestaña' : 'Nueva Pestaña Personalizada'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingTab(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingTab ? handleUpdateTab : handleCreateTab}
        >
          <Form.Item
            name="name"
            label="Nombre de la Pestaña"
            rules={[
              { required: true, message: 'Ingrese el nombre de la pestaña' },
              { min: 1, max: 100, message: 'Entre 1 y 100 caracteres' }
            ]}
          >
            <Input placeholder="Ej: Evaluaciones Finales" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Descripción (Opcional)"
          >
            <TextArea
              placeholder="Descripción de la pestaña..."
              rows={3}
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="color"
                label="Color"
                rules={[{ required: true, message: 'Seleccione un color' }]}
              >
                <Select placeholder="Seleccionar color">
                  {COLOR_OPTIONS.map(color => (
                    <Select.Option key={color.value} value={color.value}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: color.value,
                            borderRadius: '2px',
                          }}
                        />
                        {color.label}
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="icon"
                label="Icono"
                rules={[{ required: true, message: 'Seleccione un icono' }]}
              >
                <Select placeholder="Seleccionar icono">
                  {ICON_OPTIONS.map(option => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createTabMutation.isPending || updateTabMutation.isPending}
              >
                {editingTab ? 'Actualizar' : 'Crear'} Pestaña
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </Card>
  );
}