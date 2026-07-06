/**
 * @archivo: StaffTaskForm.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Formulario para crear/editar tareas del claustro
 */

import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Divider,
  message,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { useStaffTags, useCreateStaffTag, useDeleteStaffTag } from '@/hooks/useStaffTags';
import type { StaffTask, CreateStaffTaskDto, UpdateStaffTaskDto, StaffTaskPriority } from '@/types/staff';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface StaffTaskFormProps {
  task?: StaffTask;
  users: { id: string; email: string; profile?: { firstName?: string; lastName?: string } }[];
  meetings?: { id: string; title: string }[];
  onSubmit: (values: CreateStaffTaskDto | UpdateStaffTaskDto) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const StaffTaskForm: React.FC<StaffTaskFormProps> = ({
  task,
  users,
  meetings,
  onSubmit,
  onCancel,
  loading,
}) => {
  const [form] = Form.useForm();
  const { data: tags, isLoading: tagsLoading } = useStaffTags();
  const createTag = useCreateStaffTag();
  const deleteTag = useDeleteStaffTag();
  const [newTagName, setNewTagName] = React.useState('');

  const handleDeleteTag = async (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await deleteTag.mutateAsync(tagId);
    } catch (error) {
      // Error handled by hook
    }
  };

  useEffect(() => {
    if (task) {
      form.setFieldsValue({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate ? dayjs(task.dueDate) : null,
        meetingId: task.meetingId,
        assignedToIds: task.assignments?.map(a => a.assignedToId) || [],
        tagIds: task.tags?.map(t => t.id) || [],
      });
    } else {
      form.resetFields();
    }
  }, [task, form]);

  const handleSubmit = (values: any) => {
    const data: CreateStaffTaskDto | UpdateStaffTaskDto = {
      title: values.title,
      description: values.description,
      priority: values.priority,
      dueDate: values.dueDate?.format('YYYY-MM-DD'),
      meetingId: values.meetingId,
      assignedToIds: values.assignedToIds,
      tagIds: values.tagIds,
    };
    onSubmit(data);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await createTag.mutateAsync({ name: newTagName.trim() });
      setNewTagName('');
    } catch (error) {
      // Error handled by hook
    }
  };

  const getUserLabel = (user: { email: string; profile?: { firstName?: string; lastName?: string } }) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email;
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
    >
      <Form.Item
        name="title"
        label="Titulo"
        rules={[{ required: true, message: 'El titulo es requerido' }]}
      >
        <Input placeholder="Titulo de la tarea" maxLength={255} />
      </Form.Item>

      <Form.Item name="description" label="Descripcion">
        <TextArea
          placeholder="Descripcion detallada de la tarea"
          rows={4}
          showCount
          maxLength={5000}
        />
      </Form.Item>

      <Space style={{ width: '100%' }} size="large">
        <Form.Item name="priority" label="Prioridad" style={{ width: 150 }}>
          <Select placeholder="Seleccionar" allowClear>
            <Option value="low">Baja</Option>
            <Option value="medium">Media</Option>
            <Option value="high">Alta</Option>
          </Select>
        </Form.Item>

        <Form.Item name="dueDate" label="Fecha limite" style={{ width: 200 }}>
          <DatePicker
            format="DD/MM/YYYY"
            placeholder="Seleccionar fecha"
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Space>

      <Form.Item name="assignedToIds" label="Asignar a">
        <Select
          mode="multiple"
          placeholder="Seleccionar usuarios"
          optionFilterProp="children"
          showSearch
          allowClear
        >
          {users.map(user => (
            <Option key={user.id} value={user.id}>
              {getUserLabel(user)}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item name="tagIds" label="Etiquetas">
        <Select
          mode="multiple"
          placeholder="Seleccionar etiquetas"
          loading={tagsLoading}
          optionFilterProp="children"
          showSearch
          allowClear
          dropdownRender={menu => (
            <>
              {menu}
              <Divider style={{ margin: '8px 0' }} />
              <Space style={{ padding: '0 8px 4px' }}>
                <Input
                  placeholder="Nueva etiqueta"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                />
                <Button
                  type="text"
                  icon={<PlusOutlined />}
                  onClick={handleCreateTag}
                  loading={createTag.isPending}
                >
                  Crear
                </Button>
              </Space>
            </>
          )}
        >
          {tags?.map(tag => (
            <Option key={tag.id} value={tag.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: tag.color || '#ccc',
                      marginRight: 8,
                    }}
                  />
                  {tag.name}
                </span>
                <DeleteOutlined
                  style={{ color: '#ff4d4f', fontSize: 12 }}
                  onClick={(e) => handleDeleteTag(tag.id, e)}
                />
              </div>
            </Option>
          ))}
        </Select>
      </Form.Item>

      {meetings && meetings.length > 0 && (
        <Form.Item name="meetingId" label="Reunion asociada">
          <Select placeholder="Vincular a reunion" allowClear>
            {meetings.map(meeting => (
              <Option key={meeting.id} value={meeting.id}>
                {meeting.title}
              </Option>
            ))}
          </Select>
        </Form.Item>
      )}

      <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {task ? 'Actualizar' : 'Crear'} Tarea
          </Button>
          <Button onClick={onCancel}>Cancelar</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default StaffTaskForm;
