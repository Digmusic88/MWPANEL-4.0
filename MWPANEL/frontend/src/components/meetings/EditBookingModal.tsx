/**
 * @archivo: EditBookingModal.tsx
 * @módulo: Admin Meetings - Booking Editor
 * @función: Modal para editar reservas existentes
 * @características:
 *   - Cambiar espacio asignado
 *   - Modificar notas
 *   - Cambiar estado (confirmar/cancelar)
 *   - Validación de disponibilidad del espacio
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Select,
  Input,
  Button,
  Space,
  Alert,
  message,
  Descriptions,
  Tag,
  Spin,
} from 'antd';
import {
  HomeOutlined,
  EditOutlined,
  SaveOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { apiClient } from '../../services/apiClient';
import dayjs from 'dayjs';

const { Option } = Select;
const { TextArea } = Input;

interface MeetingSpace {
  id: string;
  name: string;
  type: string;
  location?: string;
  color?: string;
  isActive: boolean;
}

interface BookingDetails {
  id: string;
  familyName: string;
  studentName: string;
  teacherName: string;
  slotDate: string;
  slotTime: string;
  spaceName?: string;
  spaceId?: string;
  spaceColor?: string;
  status: string;
  notes?: string;
}

interface EditBookingModalProps {
  visible: boolean;
  bookingId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

const BOOKING_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'orange' },
  { value: 'confirmed', label: 'Confirmada', color: 'green' },
  { value: 'cancelled', label: 'Cancelada', color: 'red' },
];

const EditBookingModal: React.FC<EditBookingModalProps> = ({
  visible,
  bookingId,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [spaces, setSpaces] = useState<MeetingSpace[]>([]);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [fetchingBooking, setFetchingBooking] = useState(false);

  useEffect(() => {
    if (visible && bookingId) {
      fetchBookingDetails();
      fetchSpaces();
    }
  }, [visible, bookingId]);

  const fetchBookingDetails = async () => {
    if (!bookingId) return;

    try {
      setFetchingBooking(true);
      const response = await apiClient.get(`/admin/meetings/bookings/${bookingId}`);
      const bookingData = response.data.booking;

      setBooking(bookingData);

      // Establecer los valores del formulario con los datos actuales de la reserva
      form.setFieldsValue({
        spaceId: bookingData.spaceId || undefined,
        notes: bookingData.notes || undefined,
        status: bookingData.status || 'confirmed',
      });
    } catch (error) {
      console.error('Error fetching booking:', error);
      message.error('Error al cargar los detalles de la reserva');
    } finally {
      setFetchingBooking(false);
    }
  };

  const fetchSpaces = async () => {
    try {
      const response = await apiClient.get('/admin/meetings/spaces/active');
      setSpaces(response.data.spaces || []);
    } catch (error) {
      console.error('Error fetching spaces:', error);
      message.error('Error al cargar los espacios disponibles');
    }
  };

  const handleSubmit = async () => {
    if (!bookingId) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      await apiClient.put(`/admin/meetings/bookings/${bookingId}`, {
        spaceId: values.spaceId || null,
        notes: values.notes || null,
        status: values.status,
        cancelReason: values.status === 'cancelled' ? values.cancelReason : null,
      });

      message.success('Reserva actualizada exitosamente');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error updating booking:', error);
      const errorMessage = error.response?.data?.message || 'Error al actualizar la reserva';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setBooking(null);
    onClose();
  };

  const selectedSpace = spaces.find((s) => s.id === form.getFieldValue('spaceId'));

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          Editar Reserva
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSubmit}
          loading={loading}
          disabled={fetchingBooking || loading}
        >
          Guardar Cambios
        </Button>,
      ]}
    >
      {fetchingBooking ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Alert
            message="Información Importante"
            description="Los cambios realizados en esta reserva se reflejarán inmediatamente para todos los usuarios (familia, profesor y administradores)."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />

          {booking && (
            <Descriptions
              bordered
              column={2}
              size="small"
              style={{ marginBottom: 24 }}
            >
              <Descriptions.Item label="Familia" span={2}>
                {booking.familyName}
              </Descriptions.Item>
              <Descriptions.Item label="Estudiante" span={2}>
                {booking.studentName}
              </Descriptions.Item>
              <Descriptions.Item label="Profesor" span={2}>
                {booking.teacherName}
              </Descriptions.Item>
              <Descriptions.Item label="Fecha">
                {booking.slotDate}
              </Descriptions.Item>
              <Descriptions.Item label="Hora">
                {booking.slotTime}
              </Descriptions.Item>
            </Descriptions>
          )}

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              status: 'confirmed',
            }}
          >
            <Form.Item
              name="spaceId"
              label="Espacio Asignado"
              extra="Selecciona el espacio donde se realizará la reunión. El sistema validará que esté disponible."
            >
              <Select
                placeholder="Seleccionar espacio (opcional)"
                allowClear
                showSearch
                optionFilterProp="children"
              >
                {spaces.map((space) => (
                  <Option key={space.id} value={space.id}>
                    <Space>
                      {space.color && (
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            backgroundColor: space.color,
                            borderRadius: '2px',
                            border: '1px solid #ddd',
                            display: 'inline-block',
                          }}
                        />
                      )}
                      {space.name}
                      {space.location && (
                        <span style={{ color: '#999', fontSize: '12px' }}>
                          ({space.location})
                        </span>
                      )}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedSpace && (
              <Alert
                message={
                  <Space>
                    <HomeOutlined />
                    Espacio Seleccionado: <strong>{selectedSpace.name}</strong>
                    {selectedSpace.location && ` - ${selectedSpace.location}`}
                  </Space>
                }
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Form.Item
              name="status"
              label="Estado de la Reserva"
              rules={[{ required: true, message: 'Selecciona el estado' }]}
            >
              <Select placeholder="Seleccionar estado">
                {BOOKING_STATUS_OPTIONS.map((status) => (
                  <Option key={status.value} value={status.value}>
                    <Space>
                      {status.value === 'confirmed' && <CheckCircleOutlined />}
                      {status.value === 'cancelled' && <CloseCircleOutlined />}
                      <Tag color={status.color}>{status.label}</Tag>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.status !== currentValues.status
              }
            >
              {({ getFieldValue }) =>
                getFieldValue('status') === 'cancelled' ? (
                  <Form.Item
                    name="cancelReason"
                    label="Razón de Cancelación"
                    rules={[
                      {
                        required: true,
                        message: 'Proporciona una razón para la cancelación',
                      },
                    ]}
                  >
                    <TextArea
                      rows={3}
                      placeholder="Explica el motivo de la cancelación..."
                    />
                  </Form.Item>
                ) : null
              }
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notas Adicionales"
              extra="Información adicional sobre la reunión (visible para familia y profesor)"
            >
              <TextArea
                rows={4}
                placeholder="Agregar notas sobre la reunión..."
                maxLength={500}
              />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default EditBookingModal;
