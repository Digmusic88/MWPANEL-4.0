/**
 * @archivo: CommunicationConfigPage.tsx
 * @función: Página de administración para configuraciones de comunicación entre profesores y familias
 * @creado_por: Sistema de Configuración de Comunicaciones MW Panel 2.0
 * @fecha: 2025-01-15
 * @propósito: Gestión de permisos de comunicación por profesor, grupo de clase y familia
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Spin,
  message,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Select,
  Switch,
  Space,
  Popconfirm,
  Tooltip,
  Alert,
  Transfer,
  Divider,
  Input,
  Badge,
} from 'antd';
import { useAuthStore } from '@store/authStore';
import BulkMessageModal from '../../components/communications/BulkMessageModal';
import {
  UserOutlined,
  TeamOutlined,
  MessageOutlined,
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { TransferDirection } from 'antd/es/transfer';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// Interfaces
interface Teacher {
  id: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface ClassGroup {
  id: string;
  name: string;
  courses?: {
    name: string;
  }[];
}

interface Family {
  id: string;
  primaryContact: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

interface CommunicationConfig {
  id: string;
  teacherId: string;
  classGroupId?: string;
  studentId?: string;
  familyId?: string;
  isEnabled: boolean;
  configType: 'class_group' | 'student' | 'family';
  adminNotes?: string;
  teacher?: Teacher;
  classGroup?: ClassGroup;
  family?: Family;
  createdAt: string;
  updatedAt: string;
}

interface TransferItem {
  key: string;
  title: string;
  description?: string;
  disabled?: boolean;
}

const CommunicationConfigPage: React.FC = () => {
  const { accessToken, user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [configs, setConfigs] = useState<CommunicationConfig[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);

  // Modal states
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkMessageModalVisible, setBulkMessageModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CommunicationConfig | null>(null);

  // Form states
  const [form] = Form.useForm();
  const [bulkForm] = Form.useForm();

  // Transfer component states
  const [transferTargetKeys, setTransferTargetKeys] = useState<string[]>([]);
  const [transferSelectedKeys, setTransferSelectedKeys] = useState<string[]>([]);

  // Fetch functions
  const fetchConfigs = async () => {
    try {
      setLoading(true);

      if (!accessToken) {
        message.error('No hay token de autenticación');
        return;
      }

      const response = await fetch('/api/communications/config', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Configs API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('⚙️ Configs loaded:', data.length);
        setConfigs(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Configs API error:', response.status, errorText);
        if (response.status === 404) {
          console.log('ℹ️ No configurations found yet');
          setConfigs([]);
        } else {
          message.error(`Error al cargar configuraciones: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('❌ Configs fetch error:', error);
      message.error('Error al cargar configuraciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      if (!accessToken) {
        message.error('No hay token de autenticación para profesores');
        return;
      }

      const response = await fetch('/api/teachers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Teachers API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('👩‍🏫 Teachers loaded:', data.length);
        setTeachers(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Teachers API error:', response.status, errorText);
        message.error(`Error al cargar profesores: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Teachers fetch error:', error);
      message.error('Error al cargar profesores');
    }
  };

  const fetchClassGroups = async () => {
    try {
      if (!accessToken) {
        message.error('No hay token de autenticación para grupos de clase');
        return;
      }

      const response = await fetch('/api/class-groups', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Class groups API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🏫 Class groups loaded:', data.length);
        setClassGroups(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Class groups API error:', response.status, errorText);
        message.error(`Error al cargar grupos de clase: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Class groups fetch error:', error);
      message.error('Error al cargar grupos de clase');
    }
  };

  const fetchFamilies = async () => {
    try {
      if (!accessToken) {
        message.error('No hay token de autenticación para familias');
        return;
      }

      const response = await fetch('/api/families', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Families API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('👨‍👩‍👧‍👦 Families loaded:', data.length);
        setFamilies(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Families API error:', response.status, errorText);
        message.error(`Error al cargar familias: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Families fetch error:', error);
      message.error('Error al cargar familias');
    }
  };

  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchConfigs();
      fetchTeachers();
      fetchClassGroups();
      fetchFamilies();
    } else {
      console.warn('⚠️ User not authenticated or no token available');
    }
  }, [isAuthenticated, accessToken]);

  // Create/Update config
  const handleSaveConfig = async (values: any) => {
    try {
      const url = editingConfig
        ? `/api/communications/config/${editingConfig.id}`
        : '/api/communications/config';

      const method = editingConfig ? 'PUT' : 'POST';

      // Derive configType from which target field is filled in
      let payload = { ...values };
      if (!editingConfig) {
        if (values.classGroupId) {
          payload.configType = 'class_group';
        } else if (values.familyId) {
          payload.configType = 'family';
        } else if (values.studentId) {
          payload.configType = 'student';
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        message.success(editingConfig ? 'Configuración actualizada' : 'Configuración creada');
        setConfigModalVisible(false);
        setEditingConfig(null);
        form.resetFields();
        fetchConfigs();
      } else {
        const errorData = await response.json().catch(() => ({}));
        message.error(`Error al guardar configuración: ${errorData.message || response.status}`);
      }
    } catch (error) {
      message.error('Error al guardar configuración');
    }
  };

  // Bulk create configs
  const handleBulkCreate = async (values: any) => {
    try {
      const response = await fetch('/api/communications/config/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          teacherId: values.teacherId,
          classGroupIds: transferTargetKeys,
          isEnabled: values.isEnabled,
          adminNotes: values.adminNotes,
        }),
      });

      if (response.ok) {
        message.success('Configuraciones masivas creadas');
        setBulkModalVisible(false);
        bulkForm.resetFields();
        setTransferTargetKeys([]);
        fetchConfigs();
      } else {
        const errorData = await response.json().catch(() => ({}));
        message.error(`Error al crear configuraciones masivas: ${errorData.message || response.status}`);
      }
    } catch (error) {
      message.error('Error al crear configuraciones masivas');
    }
  };

  // Delete config
  const handleDeleteConfig = async (id: string) => {
    try {
      const response = await fetch(`/api/communications/config/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        message.success('Configuración eliminada');
        fetchConfigs();
      } else {
        message.error('Error al eliminar configuración');
      }
    } catch (error) {
      message.error('Error al eliminar configuración');
    }
  };

  // Table columns
  const columns: ColumnsType<CommunicationConfig> = [
    {
      title: 'Profesor',
      dataIndex: ['teacher', 'user', 'profile'],
      key: 'teacher',
      render: (profile: any) => (
        <Space>
          <UserOutlined />
          <Text>{profile?.firstName} {profile?.lastName}</Text>
        </Space>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'configType',
      key: 'configType',
      render: (type: string) => {
        const typeMap = {
          class_group: { color: 'blue', text: 'Grupo de Clase', icon: <TeamOutlined /> },
          student: { color: 'green', text: 'Estudiante', icon: <UserOutlined /> },
          family: { color: 'purple', text: 'Familia', icon: <MessageOutlined /> },
        };
        const config = typeMap[type as keyof typeof typeMap];
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: 'Destino',
      key: 'target',
      render: (_, record) => {
        if (record.classGroup) {
          const courseNames = record.classGroup.courses?.map(c => c.name).join(', ') || 'Sin curso';
          return `${record.classGroup.name || 'Sin nombre'} - ${courseNames}`;
        }
        if (record.family) {
          return `${record.family.primaryContact?.profile?.firstName || ''} ${record.family.primaryContact?.profile?.lastName || ''}`;
        }
        return 'N/A';
      },
    },
    {
      title: 'Estado',
      dataIndex: 'isEnabled',
      key: 'isEnabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'error'} icon={enabled ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}>
          {enabled ? 'Habilitado' : 'Deshabilitado'}
        </Tag>
      ),
    },
    {
      title: 'Notas',
      dataIndex: 'adminNotes',
      key: 'adminNotes',
      render: (notes: string) => (
        <Text ellipsis={{ tooltip: notes }}>
          {notes || 'Sin notas'}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Editar">
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                setEditingConfig(record);
                form.setFieldsValue({
                  teacherId: record.teacherId,
                  classGroupId: record.classGroupId,
                  familyId: record.familyId,
                  isEnabled: record.isEnabled,
                  adminNotes: record.adminNotes,
                });
                setConfigModalVisible(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="¿Estás seguro de eliminar esta configuración?"
            onConfirm={() => handleDeleteConfig(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Eliminar">
              <Button danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Transfer component data
  const transferData: TransferItem[] = classGroups.map(group => ({
    key: group.id,
    title: group.name || 'Sin nombre',
    description: group.courses?.map(c => c.name).join(', ') || 'Sin curso',
  }));

  const handleTransferChange = (newTargetKeys: string[], direction: TransferDirection, moveKeys: string[]) => {
    setTransferTargetKeys(newTargetKeys);
  };

  const handleTransferSelectChange = (sourceSelectedKeys: string[], targetSelectedKeys: string[]) => {
    setTransferSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

  // Show loading or authentication message if needed
  if (!isAuthenticated || !accessToken) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Autenticación requerida"
          description="Por favor, inicia sesión para acceder a la configuración de comunicaciones."
          type="warning"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
              <Col>
                <Title level={2}>
                  <MessageOutlined /> Configuración de Comunicaciones
                </Title>
                <Text type="secondary">
                  Gestiona los permisos de comunicación entre profesores y familias
                </Text>
              </Col>
              <Col>
                <Space>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingConfig(null);
                      form.resetFields();
                      setConfigModalVisible(true);
                    }}
                  >
                    Nueva Configuración
                  </Button>
                  <Button
                    type="default"
                    icon={<TeamOutlined />}
                    onClick={() => {
                      bulkForm.resetFields();
                      setTransferTargetKeys([]);
                      setBulkModalVisible(true);
                    }}
                  >
                    Configuración Masiva
                  </Button>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => setBulkMessageModalVisible(true)}
                    style={{ background: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Enviar Mensaje Bulk
                  </Button>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={fetchConfigs}
                  >
                    Recargar
                  </Button>
                </Space>
              </Col>
            </Row>

            <Alert
              message="Información"
              description="Las configuraciones determinan qué profesores pueden comunicarse con qué familias. Las configuraciones por grupo de clase permiten que el profesor contacte con todas las familias de los estudiantes de ese grupo."
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Table
              columns={columns}
              dataSource={configs}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} configuraciones`,
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Modal para crear/editar configuración individual */}
      <Modal
        title={editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
        open={configModalVisible}
        onCancel={() => {
          setConfigModalVisible(false);
          setEditingConfig(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveConfig}
        >
          <Form.Item
            name="teacherId"
            label="Profesor"
            rules={[{ required: true, message: 'Selecciona un profesor' }]}
          >
            <Select
              placeholder="Selecciona un profesor"
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {teachers.map(teacher => (
                <Option key={teacher.id} value={teacher.id}>
                  {teacher.user.profile.firstName} {teacher.user.profile.lastName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="classGroupId"
            label="Grupo de Clase (opcional)"
          >
            <Select
              placeholder="Selecciona un grupo de clase"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {classGroups.map(group => (
                <Option key={group.id} value={group.id}>
                  {group.name || 'Sin nombre'} - {group.courses?.map(c => c.name).join(', ') || 'Sin curso'}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="familyId"
            label="Familia (opcional)"
          >
            <Select
              placeholder="Selecciona una familia"
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {families.map(family => (
                <Option key={family.id} value={family.id}>
                  {family.primaryContact.profile.firstName} {family.primaryContact.profile.lastName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="isEnabled"
            label="Estado"
            valuePropName="checked"
          >
            <Switch checkedChildren="Habilitado" unCheckedChildren="Deshabilitado" />
          </Form.Item>

          <Form.Item
            name="adminNotes"
            label="Notas de Administración"
          >
            <Input.TextArea rows={3} placeholder="Notas adicionales sobre esta configuración..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingConfig ? 'Actualizar' : 'Crear'}
              </Button>
              <Button
                onClick={() => {
                  setConfigModalVisible(false);
                  setEditingConfig(null);
                  form.resetFields();
                }}
              >
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal para configuración masiva */}
      <Modal
        title="Configuración Masiva por Grupos de Clase"
        open={bulkModalVisible}
        onCancel={() => {
          setBulkModalVisible(false);
          bulkForm.resetFields();
          setTransferTargetKeys([]);
        }}
        footer={null}
        width={800}
      >
        <Form
          form={bulkForm}
          layout="vertical"
          onFinish={handleBulkCreate}
        >
          <Form.Item
            name="teacherId"
            label="Profesor"
            rules={[{ required: true, message: 'Selecciona un profesor' }]}
          >
            <Select
              placeholder="Selecciona un profesor"
              showSearch
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {teachers.map(teacher => (
                <Option key={teacher.id} value={teacher.id}>
                  {teacher.user.profile.firstName} {teacher.user.profile.lastName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Divider>Selecciona los Grupos de Clase</Divider>

          <Transfer
            dataSource={transferData}
            titles={['Grupos Disponibles', 'Grupos Seleccionados']}
            targetKeys={transferTargetKeys}
            selectedKeys={transferSelectedKeys}
            onChange={handleTransferChange}
            onSelectChange={handleTransferSelectChange}
            render={item => `${item.title} - ${item.description}`}
            listStyle={{
              width: 350,
              height: 300,
            }}
            showSearch
            filterOption={(inputValue, item) =>
              item.title.toLowerCase().includes(inputValue.toLowerCase()) ||
              (item.description && item.description.toLowerCase().includes(inputValue.toLowerCase()))
            }
          />

          <Form.Item
            name="isEnabled"
            label="Estado"
            valuePropName="checked"
            style={{ marginTop: '16px' }}
          >
            <Switch checkedChildren="Habilitado" unCheckedChildren="Deshabilitado" defaultChecked />
          </Form.Item>

          <Form.Item
            name="adminNotes"
            label="Notas de Administración"
          >
            <Input.TextArea rows={3} placeholder="Notas adicionales sobre estas configuraciones..." />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Crear Configuraciones
              </Button>
              <Button
                onClick={() => {
                  setBulkModalVisible(false);
                  bulkForm.resetFields();
                  setTransferTargetKeys([]);
                }}
              >
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal para enviar mensajes en bulk */}
      <BulkMessageModal
        visible={bulkMessageModalVisible}
        onCancel={() => setBulkMessageModalVisible(false)}
        onSuccess={() => {
          setBulkMessageModalVisible(false);
          message.success('¡Mensaje enviado exitosamente!');
        }}
      />
    </div>
  );
};

export default CommunicationConfigPage;