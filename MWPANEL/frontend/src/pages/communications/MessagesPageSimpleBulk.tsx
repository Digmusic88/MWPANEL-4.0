import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
} from 'antd';
import {
  MessageOutlined,
  SendOutlined,
  PlusOutlined,
  TeamOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import apiClient from '../../services/apiClient';
import { useAuthStore } from '../../store/authStore';
import { formatDateToMadrid, formatRelativeTime } from '../../utils/dateUtils';

const { TextArea } = Input;

interface Message {
  id: string;
  subject: string;
  content: string;
  type: string;
  priority: string;
  sender: any;
  recipient?: any;
  createdAt: string;
}

interface User {
  id: string;
  role: string;
  profile: {
    firstName: string;
    lastName: string;
  };
}

const MessagesPageSimpleBulk: React.FC = () => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [availableRecipients, setAvailableRecipients] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendMethod, setSendMethod] = useState<'individual' | 'group'>('individual');
  const [form] = Form.useForm();

  console.log('🔍 SIMPLE BULK: Component rendering, user role:', user?.role);
  console.log('🔍 SIMPLE BULK: Send method state:', sendMethod);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      console.log('🔍 SIMPLE BULK: Fetching messages...');
      const response = await apiClient.get('/communications/messages');
      console.log('🔍 SIMPLE BULK: Messages fetched:', response.data?.length || 0, 'messages');
      setMessages(response.data || []);
    } catch (error) {
      console.error('🔍 SIMPLE BULK: Error fetching messages:', error);
      message.error('Error al cargar mensajes');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableRecipients = async () => {
    try {
      console.log('🔍 SIMPLE BULK: Fetching recipients...');
      const response = await apiClient.get('/communications/available-recipients');
      console.log('🔍 SIMPLE BULK: Recipients fetched:', response.data?.length || 0, 'recipients');
      setAvailableRecipients(response.data || []);
    } catch (error) {
      console.error('🔍 SIMPLE BULK: Error fetching recipients:', error);
      message.error('Error al cargar destinatarios');
      setAvailableRecipients([]);
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchAvailableRecipients();
  }, []);

  const handleCreateMessage = async (values: any) => {
    try {
      setLoading(true);
      console.log('🔍 SIMPLE BULK: Creating message with values:', values);
      console.log('🔍 SIMPLE BULK: Send method:', sendMethod);

      const response = await apiClient.post('/communications/messages', values);
      message.success('Mensaje enviado exitosamente');
      setModalVisible(false);
      form.resetFields();
      setSendMethod('individual');
      fetchMessages();
    } catch (error) {
      console.error('Error creating message:', error);
      message.error('Error al enviar el mensaje');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Asunto',
      dataIndex: 'subject',
      key: 'subject',
    },
    {
      title: 'De',
      dataIndex: ['sender', 'profile'],
      key: 'sender',
      render: (profile: any) => `${profile?.firstName} ${profile?.lastName}`,
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => {
        const formattedDate = formatDateToMadrid(date);
        const relativeTime = formatRelativeTime(date);

        return (
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              <ClockCircleOutlined style={{ marginRight: 4, color: '#1890ff' }} />
              {formattedDate}
            </div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: 2 }}>
              {relativeTime}
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <MessageOutlined />
            Mensajes
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              console.log('🔍 SIMPLE BULK: Opening modal, user role:', user?.role);
              setModalVisible(true);
              setSendMethod('individual');
              form.resetFields();
            }}
          >
            Nuevo Mensaje
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={messages}
          rowKey="id"
          loading={loading}
          size="small"
        />
      </Card>

      {/* Modal para crear mensaje */}
      <Modal
        title={
          <Space>
            <MessageOutlined />
            <span>Nuevo Mensaje - Sistema de Envío Masivo</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => {
          console.log('🔍 SIMPLE BULK: Modal cancelled');
          setModalVisible(false);
          form.resetFields();
          setSendMethod('individual');
        }}
        onOk={() => {
          console.log('🔍 SIMPLE BULK: Modal OK clicked, submitting form');
          form.submit();
        }}
        width={1200}
        confirmLoading={loading}
        maskClosable={false}
        destroyOnClose={true}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateMessage}
          onValuesChange={(changedValues) => {
            if (changedValues.sendMethod) {
              console.log('🔍 SIMPLE BULK: Send method changed to:', changedValues.sendMethod);
              setSendMethod(changedValues.sendMethod);
            }
          }}
        >
          <Form.Item
            label="Tipo de mensaje"
            name="type"
            rules={[{ required: true, message: 'Seleccione el tipo de mensaje' }]}
            initialValue="direct"
          >
            <Select placeholder="Seleccionar tipo">
              <Select.Option value="direct">Mensaje directo</Select.Option>
              {(user?.role === 'admin' || user?.role === 'teacher') && (
                <Select.Option value="group">Mensaje grupal</Select.Option>
              )}
              {user?.role === 'admin' && (
                <Select.Option value="announcement">Comunicado oficial</Select.Option>
              )}
            </Select>
          </Form.Item>

          {/* NUEVO: Método de envío - BULK MESSAGING */}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <Form.Item
              label="🚀 MÉTODO DE ENVÍO (BULK MESSAGING)"
              name="sendMethod"
              initialValue="individual"
            >
              <Select placeholder="Seleccionar método de envío">
                <Select.Option value="individual">Selección individual</Select.Option>
                <Select.Option value="group">Envío por grupo</Select.Option>
              </Select>
            </Form.Item>
          )}

          {/* Mostrar información sobre el método seleccionado */}
          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <div style={{
              padding: '12px',
              background: '#f0f2ff',
              borderRadius: '6px',
              marginBottom: '16px',
              border: '1px solid #d6e4ff'
            }}>
              <strong>🔍 DEBUG INFO:</strong>
              <br />
              Usuario: {user?.role}
              <br />
              Método seleccionado: {sendMethod}
              <br />
              Bulk messaging: {sendMethod === 'group' ? 'ACTIVADO ✅' : 'Desactivado'}
            </div>
          )}

          {/* Destinatarios */}
          <Form.Item
            label="Destinatario"
            name="recipientId"
            rules={[{ required: true, message: 'Seleccione un destinatario' }]}
          >
            <Select
              placeholder="Selecciona un destinatario"
              showSearch
              optionFilterProp="children"
            >
              {availableRecipients.map(recipient => (
                <Select.Option key={recipient.id} value={recipient.id}>
                  {recipient.profile?.firstName} {recipient.profile?.lastName} ({recipient.role})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Asunto"
            name="subject"
            rules={[{ required: true, message: 'Ingrese el asunto del mensaje' }]}
          >
            <Input placeholder="Asunto del mensaje" />
          </Form.Item>

          <Form.Item
            label="Mensaje"
            name="content"
            rules={[{ required: true, message: 'Ingrese el contenido del mensaje' }]}
          >
            <TextArea rows={4} placeholder="Escribe tu mensaje..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default MessagesPageSimpleBulk;