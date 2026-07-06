import React, { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Table,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Popconfirm,
  message,
  Drawer,
  Card,
  Typography,
  Row,
  Col,
  Avatar,
  Divider,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  UserOutlined,
  EyeOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useCommunications } from '../../hooks/useCommunications';
import type { MessageGroup } from '../../services/communications.service';
import { useAuthStore } from '../../store/authStore';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface GroupManagementModalProps {
  visible: boolean;
  onClose: () => void;
  availableRecipients: any[];
}

const GroupManagementModal: React.FC<GroupManagementModalProps> = ({
  visible,
  onClose,
  availableRecipients,
}) => {
  const { user } = useAuthStore();
  const {
    messageGroups,
    getMessageGroups,
    createMessageGroup,
    updateMessageGroup,
    deleteMessageGroup,
    loading,
  } = useCommunications();

  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<MessageGroup | null>(null);
  const [detailsDrawerVisible, setDetailsDrawerVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      getMessageGroups();
    }
  }, [visible, getMessageGroups]);

  const handleCreateGroup = async (values: any) => {
    try {
      await createMessageGroup(values);
      setCreateModalVisible(false);
      createForm.resetFields();
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleEditGroup = async (values: any) => {
    if (!selectedGroup) return;

    try {
      await updateMessageGroup(selectedGroup.id, values);
      setEditModalVisible(false);
      setSelectedGroup(null);
      editForm.resetFields();
    } catch (error) {
      console.error('Error updating group:', error);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      await deleteMessageGroup(groupId);
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const openEditModal = (group: MessageGroup) => {
    setSelectedGroup(group);
    editForm.setFieldsValue({
      name: group.name,
      description: group.description,
      type: group.type,
      memberIds: group.members?.map(m => m.userId) || [],
    });
    setEditModalVisible(true);
  };

  const openDetailsDrawer = (group: MessageGroup) => {
    setSelectedGroup(group);
    setDetailsDrawerVisible(true);
  };

  const getGroupTypeLabel = (type: string) => {
    const types = {
      'admin_broadcast': 'Difusión Admin',
      'teacher_class': 'Clase de Profesor',
      'teacher_subject': 'Materia de Profesor',
      'custom': 'Personalizado',
    };
    return types[type as keyof typeof types] || type;
  };

  const getGroupTypeColor = (type: string) => {
    const colors = {
      'admin_broadcast': 'red',
      'teacher_class': 'blue',
      'teacher_subject': 'green',
      'custom': 'purple',
    };
    return colors[type as keyof typeof colors] || 'default';
  };

  const columns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: MessageGroup) => (
        <Space>
          <Avatar icon={<TeamOutlined />} size="small" />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getGroupTypeColor(type)}>
          {getGroupTypeLabel(type)}
        </Tag>
      ),
    },
    {
      title: 'Miembros',
      dataIndex: 'memberCount',
      key: 'memberCount',
      render: (count: number) => (
        <Tag color="blue">{count} miembros</Tag>
      ),
    },
    {
      title: 'Creado por',
      dataIndex: 'createdBy',
      key: 'createdBy',
      render: (createdBy: any) => (
        <Text>{createdBy?.profile?.firstName} {createdBy?.profile?.lastName}</Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: MessageGroup) => (
        <Space>
          <Tooltip title="Ver detalles">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openDetailsDrawer(record)}
            />
          </Tooltip>
          {(user?.role === 'admin' || record.createdById === user?.id) && (
            <>
              <Tooltip title="Editar">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEditModal(record)}
                />
              </Tooltip>
              <Popconfirm
                title="¿Está seguro de eliminar este grupo?"
                description="Esta acción no se puede deshacer."
                onConfirm={() => handleDeleteGroup(record.id)}
                okText="Sí"
                cancelText="No"
              >
                <Tooltip title="Eliminar">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                  />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <TeamOutlined />
            Gestión de Grupos de Mensajes
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={1000}
        footer={[
          <Button key="close" onClick={onClose}>
            Cerrar
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Crear Grupo
            </Button>
            <Button icon={<SettingOutlined />} onClick={getMessageGroups}>
              Actualizar
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={messageGroups}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} grupos`,
          }}
        />
      </Modal>

      {/* Modal para crear grupo */}
      <Modal
        title="Crear Nuevo Grupo"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        onOk={() => createForm.submit()}
        confirmLoading={loading}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateGroup}
        >
          <Form.Item
            label="Nombre del grupo"
            name="name"
            rules={[{ required: true, message: 'Ingrese el nombre del grupo' }]}
          >
            <Input placeholder="Ej: Profesores de Primaria" />
          </Form.Item>

          <Form.Item
            label="Descripción"
            name="description"
          >
            <TextArea
              placeholder="Descripción opcional del grupo"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Tipo de grupo"
            name="type"
            initialValue="custom"
          >
            <Select>
              <Select.Option value="custom">Personalizado</Select.Option>
              {user?.role === 'admin' && (
                <Select.Option value="admin_broadcast">Difusión Administrativa</Select.Option>
              )}
            </Select>
          </Form.Item>

          <Form.Item
            label="Miembros iniciales (opcional)"
            name="memberIds"
          >
            <Select
              mode="multiple"
              placeholder="Seleccionar miembros"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableRecipients.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.profile?.firstName} {user.profile?.lastName} ({user.role})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal para editar grupo */}
      <Modal
        title="Editar Grupo"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedGroup(null);
          editForm.resetFields();
        }}
        onOk={() => editForm.submit()}
        confirmLoading={loading}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditGroup}
        >
          <Form.Item
            label="Nombre del grupo"
            name="name"
            rules={[{ required: true, message: 'Ingrese el nombre del grupo' }]}
          >
            <Input placeholder="Nombre del grupo" />
          </Form.Item>

          <Form.Item
            label="Descripción"
            name="description"
          >
            <TextArea
              placeholder="Descripción del grupo"
              rows={3}
            />
          </Form.Item>

          <Form.Item
            label="Miembros del grupo"
            name="memberIds"
          >
            <Select
              mode="multiple"
              placeholder="Seleccionar miembros"
              showSearch
              optionFilterProp="children"
              filterOption={(input, option) =>
                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableRecipients.map(user => (
                <Select.Option key={user.id} value={user.id}>
                  {user.profile?.firstName} {user.profile?.lastName} ({user.role})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer para detalles del grupo */}
      <Drawer
        title="Detalles del Grupo"
        placement="right"
        onClose={() => {
          setDetailsDrawerVisible(false);
          setSelectedGroup(null);
        }}
        open={detailsDrawerVisible}
        width={500}
      >
        {selectedGroup && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card size="small">
              <Title level={4}>{selectedGroup.name}</Title>
              <Text type="secondary">{selectedGroup.description}</Text>

              <Divider />

              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Tipo:</Text>
                  <div>
                    <Tag color={getGroupTypeColor(selectedGroup.type)}>
                      {getGroupTypeLabel(selectedGroup.type)}
                    </Tag>
                  </div>
                </Col>
                <Col span={12}>
                  <Text strong>Miembros:</Text>
                  <div>
                    <Tag color="blue">{selectedGroup.memberCount} miembros</Tag>
                  </div>
                </Col>
              </Row>

              <Divider />

              <Text strong>Creado por:</Text>
              <div>
                <Avatar icon={<UserOutlined />} size="small" style={{ marginRight: 8 }} />
                {selectedGroup.createdBy?.profile?.firstName} {selectedGroup.createdBy?.profile?.lastName}
              </div>
            </Card>

            <Card title="Miembros del Grupo" size="small">
              {selectedGroup.members && selectedGroup.members.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selectedGroup.members.map(member => (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar icon={<UserOutlined />} size="small" style={{ marginRight: 8 }} />
                      <div>
                        <Text strong>
                          {member.user?.profile?.firstName} {member.user?.profile?.lastName}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {member.user?.role}
                        </Text>
                      </div>
                    </div>
                  ))}
                </Space>
              ) : (
                <Text type="secondary">Este grupo no tiene miembros asignados</Text>
              )}
            </Card>
          </Space>
        )}
      </Drawer>
    </>
  );
};

export default GroupManagementModal;