/**
 * @archivo: StaffMeetingForm.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Formulario para crear/editar reuniones del claustro
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
} from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import type { StaffMeeting, CreateStaffMeetingDto, UpdateStaffMeetingDto, StaffMeetingStatus } from '@/types/staff';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;

interface StaffMeetingFormProps {
  meeting?: StaffMeeting;
  users: { id: string; email: string; profile?: { firstName?: string; lastName?: string } }[];
  onSubmit: (values: CreateStaffMeetingDto | UpdateStaffMeetingDto) => void;
  onCancel: () => void;
  loading?: boolean;
}

export const StaffMeetingForm: React.FC<StaffMeetingFormProps> = ({
  meeting,
  users,
  onSubmit,
  onCancel,
  loading,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (meeting) {
      form.setFieldsValue({
        title: meeting.title,
        description: meeting.description,
        scheduledDate: meeting.scheduledDate ? dayjs(meeting.scheduledDate) : null,
        location: meeting.location,
        status: meeting.status,
        attendeeIds: meeting.attendees?.map(a => a.id) || [],
        agendaItems: meeting.agendaItems?.map(item => ({
          title: item.title,
          description: item.description,
          durationMinutes: item.durationMinutes,
        })) || [],
      });
    } else {
      form.resetFields();
    }
  }, [meeting, form]);

  const handleSubmit = (values: any) => {
    const data: CreateStaffMeetingDto | UpdateStaffMeetingDto = {
      title: values.title,
      description: values.description,
      scheduledDate: values.scheduledDate?.toISOString(),
      location: values.location,
      status: values.status,
      attendeeIds: values.attendeeIds,
      agendaItems: values.agendaItems?.filter((item: any) => item?.title).map((item: any) => ({
        ...item,
        durationMinutes:
          item.durationMinutes === '' || item.durationMinutes === null || item.durationMinutes === undefined
            ? undefined
            : item.durationMinutes,
      })) || [],
    };
    onSubmit(data);
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
        <Input placeholder="Titulo de la reunion" maxLength={255} />
      </Form.Item>

      <Form.Item name="description" label="Descripcion">
        <TextArea
          placeholder="Descripcion de la reunion"
          rows={3}
          showCount
          maxLength={5000}
        />
      </Form.Item>

      <Space style={{ width: '100%' }} size="large">
        <Form.Item
          name="scheduledDate"
          label="Fecha y hora"
          rules={[{ required: true, message: 'La fecha es requerida' }]}
          style={{ flex: 1 }}
        >
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            placeholder="Seleccionar fecha y hora"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item name="location" label="Ubicacion" style={{ flex: 1 }}>
          <Input placeholder="Lugar de la reunion" />
        </Form.Item>
      </Space>

      {meeting && (
        <Form.Item name="status" label="Estado">
          <Select placeholder="Estado de la reunion">
            <Option value="scheduled">Programada</Option>
            <Option value="in_progress">En curso</Option>
            <Option value="completed">Completada</Option>
            <Option value="cancelled">Cancelada</Option>
          </Select>
        </Form.Item>
      )}

      <Form.Item name="attendeeIds" label="Asistentes">
        <Select
          mode="multiple"
          placeholder="Seleccionar asistentes"
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

      <Divider>Puntos del Dia (Agenda)</Divider>

      <Form.List name="agendaItems">
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, ...restField }) => (
              <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                <Form.Item
                  {...restField}
                  name={[name, 'title']}
                  rules={[{ required: true, message: 'Titulo requerido' }]}
                  style={{ marginBottom: 0, width: 200 }}
                >
                  <Input placeholder="Titulo del punto" />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'description']}
                  style={{ marginBottom: 0, width: 200 }}
                >
                  <Input placeholder="Descripcion (opcional)" />
                </Form.Item>
                <Form.Item
                  {...restField}
                  name={[name, 'durationMinutes']}
                  style={{ marginBottom: 0, width: 100 }}
                >
                  <Input type="number" placeholder="Min." min={1} />
                </Form.Item>
                <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
              </Space>
            ))}
            <Form.Item>
              <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                Agregar punto del dia
              </Button>
            </Form.Item>
          </>
        )}
      </Form.List>

      <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {meeting ? 'Actualizar' : 'Crear'} Reunion
          </Button>
          <Button onClick={onCancel}>Cancelar</Button>
        </Space>
      </Form.Item>
    </Form>
  );
};

export default StaffMeetingForm;
