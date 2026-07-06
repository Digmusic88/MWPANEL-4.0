import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Space,
  message,
  Popconfirm,
  InputNumber,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useAllSystemAnnouncements } from '../../hooks/useSystemAnnouncements';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/apiClient';
import type { SystemAnnouncement } from '../../hooks/useSystemAnnouncements';

const { TextArea } = Input;

const SystemAnnouncementsPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<SystemAnnouncement | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: announcements, isLoading } = useAllSystemAnnouncements();

  // Mutation para crear anuncio
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/system-announcements', data),
    onSuccess: () => {
      message.success('Anuncio creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Error al crear el anuncio');
    },
  });

  // Mutation para actualizar anuncio
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/system-announcements/${id}`, data),
    onSuccess: () => {
      message.success('Anuncio actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] });
      handleCloseModal();
    },
    onError: () => {
      message.error('Error al actualizar el anuncio');
    },
  });

  // Mutation para activar/desactivar anuncio
  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.put(`/system-announcements/${id}/toggle`),
    onSuccess: () => {
      message.success('Estado del anuncio actualizado');
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] });
    },
    onError: () => {
      message.error('Error al cambiar el estado del anuncio');
    },
  });

  // Mutation para eliminar anuncio
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/system-announcements/${id}`),
    onSuccess: () => {
      message.success('Anuncio eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['system-announcements'] });
    },
    onError: () => {
      message.error('Error al eliminar el anuncio');
    },
  });

  const handleOpenModal = (announcement?: SystemAnnouncement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      form.setFieldsValue(announcement);
    } else {
      setEditingAnnouncement(null);
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAnnouncement(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editingAnnouncement) {
        updateMutation.mutate({ id: editingAnnouncement.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Error de validación:', error);
    }
  };

  const typeOptions = [
    { label: 'Información', value: 'info' },
    { label: 'Advertencia', value: 'warning' },
    { label: 'Error', value: 'error' },
    { label: 'Éxito', value: 'success' },
  ];

  const roleOptions = [
    { label: 'Administradores', value: 'admin' },
    { label: 'Profesores', value: 'teacher' },
    { label: 'Estudiantes', value: 'student' },
    { label: 'Familias', value: 'family' },
  ];

  const typeColors: Record<string, string> = {
    info: 'blue',
    warning: 'orange',
    error: 'red',
    success: 'green',
  };

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    teacher: 'Profesor',
    student: 'Estudiante',
    family: 'Familia',
  };

  const columns = [
    {
      title: 'T\u00edtulo',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      width: '20%',
      render: (title: string) => title || <span style={{ color: '#999' }}>(Sin t\u00edtulo)</span>,
    },
    {
      title: 'Mensaje',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      width: '30%',
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={typeColors[type]}>
          {typeOptions.find(t => t.value === type)?.label}
        </Tag>
      ),
    },
    {
      title: 'Dirigido a',
      dataIndex: 'targetRoles',
      key: 'targetRoles',
      render: (roles: string[]) => (
        <>
          {roles.map(role => (
            <Tag key={role}>{roleLabels[role]}</Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Prioridad',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      sorter: (a: SystemAnnouncement, b: SystemAnnouncement) => a.priority - b.priority,
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean, record: SystemAnnouncement) => (
        <Switch
          checked={isActive}
          onChange={() => toggleMutation.mutate(record.id)}
          checkedChildren="Activo"
          unCheckedChildren="Inactivo"
        />
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: SystemAnnouncement) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleOpenModal(record)}
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Eliminar anuncio?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title={
          <Space>
            <BellOutlined />
            <span>Anuncios del Sistema</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Nuevo Anuncio
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={announcements}
          loading={isLoading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} anuncios`,
          }}
        />
      </Card>

      <Modal
        title={editingAnnouncement ? 'Editar Anuncio' : 'Nuevo Anuncio'}
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={handleSubmit}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={700}
        okText={editingAnnouncement ? 'Actualizar' : 'Crear'}
        cancelText="Cancelar"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: 'info',
            isActive: true,
            priority: 0,
          }}
        >
          <Form.Item
            name="title"
            label="T\u00edtulo (opcional)"
            tooltip="El t\u00edtulo aparecer\u00e1 en negrita. Puedes usar emojis copiados desde cualquier fuente externa"
          >
            <Input
              placeholder="Ej: \ud83d\udea8 Mantenimiento Programado"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="message"
            label="Mensaje"
            rules={[
              { required: true, message: 'El mensaje es obligatorio' },
              { min: 10, message: 'El mensaje debe tener al menos 10 caracteres' },
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Escribe el mensaje que verán los usuarios..."
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            name="type"
            label="Tipo de anuncio"
            rules={[{ required: true, message: 'Selecciona un tipo' }]}
          >
            <Select options={typeOptions} />
          </Form.Item>

          <Form.Item
            name="targetRoles"
            label="Dirigido a (selección múltiple)"
            rules={[
              { required: true, message: 'Selecciona al menos un rol' },
              { type: 'array', min: 1, message: 'Debe seleccionar al menos un rol' },
            ]}
          >
            <Select
              mode="multiple"
              placeholder="Selecciona los roles a los que va dirigido"
              options={roleOptions}
            />
          </Form.Item>

          <Form.Item
            name="priority"
            label="Prioridad"
            tooltip="Mayor número = mayor prioridad de visualización"
          >
            <InputNumber
              min={0}
              max={100}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Activar anuncio"
            valuePropName="checked"
          >
            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemAnnouncementsPage;
