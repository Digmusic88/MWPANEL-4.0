import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Select,
  Switch,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Alert,
  Transfer,
  Divider,
  Checkbox,
  List,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  TeamOutlined,
  KeyOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import apiClient from '@/services/apiClient';

const { Title, Text } = Typography;
const { Option } = Select;

interface BlogRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: BlogPermission[];
  isSystem: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface BlogPermission {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'posts' | 'comments' | 'categories' | 'users' | 'settings';
}

interface BlogUserRole {
  id: string;
  userId: string;
  roleId: string;
  user: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
  role: {
    id: string;
    name: string;
    displayName: string;
  };
  assignedAt: string;
  assignedBy: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
}

interface User {
  id: string;
  email: string;
  role: string;
  profile?: {
    firstName: string;
    lastName: string;
  };
}

const BlogRoleManager: React.FC = () => {
  // State
  const [roles, setRoles] = useState<BlogRole[]>([]);
  const [permissions, setPermissions] = useState<BlogPermission[]>([]);
  const [userRoles, setUserRoles] = useState<BlogUserRole[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [userRoleModalVisible, setUserRoleModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<BlogRole | null>(null);

  // Forms
  const [roleForm] = Form.useForm();
  const [userRoleForm] = Form.useForm();

  // Predefined system roles configuration
  const systemRolesConfig = [
    {
      name: 'blog_editor',
      displayName: 'Editor de Blog',
      description: 'Puede crear y editar posts, pero no publicarlos',
      permissions: [
        'blog.posts.create',
        'blog.posts.edit',
        'blog.posts.view',
        'blog.categories.view',
        'blog.media.upload',
      ]
    },
    {
      name: 'blog_publisher',
      displayName: 'Publicador de Blog',
      description: 'Puede crear, editar y publicar posts',
      permissions: [
        'blog.posts.create',
        'blog.posts.edit',
        'blog.posts.view',
        'blog.posts.publish',
        'blog.posts.unpublish',
        'blog.categories.view',
        'blog.media.upload',
        'blog.comments.view',
      ]
    },
    {
      name: 'blog_moderator',
      displayName: 'Moderador de Blog',
      description: 'Puede moderar comentarios y gestionar contenido',
      permissions: [
        'blog.posts.view',
        'blog.comments.view',
        'blog.comments.moderate',
        'blog.comments.delete',
        'blog.users.view',
      ]
    },
    {
      name: 'blog_admin',
      displayName: 'Administrador de Blog',
      description: 'Control total sobre el sistema de blog',
      permissions: [
        'blog.posts.create',
        'blog.posts.edit',
        'blog.posts.view',
        'blog.posts.publish',
        'blog.posts.unpublish',
        'blog.posts.delete',
        'blog.comments.view',
        'blog.comments.moderate',
        'blog.comments.delete',
        'blog.categories.create',
        'blog.categories.edit',
        'blog.categories.delete',
        'blog.categories.view',
        'blog.media.upload',
        'blog.media.delete',
        'blog.users.view',
        'blog.users.assign_roles',
        'blog.settings.manage',
      ]
    }
  ];

  const allPermissions: BlogPermission[] = [
    // Posts permissions
    { id: 'blog.posts.create', name: 'blog.posts.create', displayName: 'Crear Posts', description: 'Crear nuevos posts del blog', category: 'posts' },
    { id: 'blog.posts.edit', name: 'blog.posts.edit', displayName: 'Editar Posts', description: 'Editar posts existentes', category: 'posts' },
    { id: 'blog.posts.view', name: 'blog.posts.view', displayName: 'Ver Posts', description: 'Ver todos los posts', category: 'posts' },
    { id: 'blog.posts.publish', name: 'blog.posts.publish', displayName: 'Publicar Posts', description: 'Publicar y despublicar posts', category: 'posts' },
    { id: 'blog.posts.delete', name: 'blog.posts.delete', displayName: 'Eliminar Posts', description: 'Eliminar posts permanentemente', category: 'posts' },

    // Comments permissions
    { id: 'blog.comments.view', name: 'blog.comments.view', displayName: 'Ver Comentarios', description: 'Ver todos los comentarios', category: 'comments' },
    { id: 'blog.comments.moderate', name: 'blog.comments.moderate', displayName: 'Moderar Comentarios', description: 'Aprobar/rechazar comentarios', category: 'comments' },
    { id: 'blog.comments.delete', name: 'blog.comments.delete', displayName: 'Eliminar Comentarios', description: 'Eliminar comentarios', category: 'comments' },

    // Categories permissions
    { id: 'blog.categories.create', name: 'blog.categories.create', displayName: 'Crear Categorías', description: 'Crear nuevas categorías', category: 'categories' },
    { id: 'blog.categories.edit', name: 'blog.categories.edit', displayName: 'Editar Categorías', description: 'Editar categorías existentes', category: 'categories' },
    { id: 'blog.categories.view', name: 'blog.categories.view', displayName: 'Ver Categorías', description: 'Ver todas las categorías', category: 'categories' },
    { id: 'blog.categories.delete', name: 'blog.categories.delete', displayName: 'Eliminar Categorías', description: 'Eliminar categorías', category: 'categories' },

    // Media permissions
    { id: 'blog.media.upload', name: 'blog.media.upload', displayName: 'Subir Media', description: 'Subir imágenes y archivos', category: 'posts' },
    { id: 'blog.media.delete', name: 'blog.media.delete', displayName: 'Eliminar Media', description: 'Eliminar archivos multimedia', category: 'posts' },

    // Users permissions
    { id: 'blog.users.view', name: 'blog.users.view', displayName: 'Ver Usuarios', description: 'Ver lista de usuarios del blog', category: 'users' },
    { id: 'blog.users.assign_roles', name: 'blog.users.assign_roles', displayName: 'Asignar Roles', description: 'Asignar roles de blog a usuarios', category: 'users' },

    // Settings permissions
    { id: 'blog.settings.manage', name: 'blog.settings.manage', displayName: 'Gestionar Configuración', description: 'Configurar ajustes del blog', category: 'settings' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchRoles(),
        fetchUserRoles(),
        fetchUsers(),
      ]);
    } catch (error) {
      console.error('Error fetching blog role data:', error);
      message.error('Error al cargar datos de roles del blog');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      // Mock API call - replace with actual API
      const mockRoles: BlogRole[] = systemRolesConfig.map((config, index) => ({
        id: `role-${index + 1}`,
        name: config.name,
        displayName: config.displayName,
        description: config.description,
        permissions: allPermissions.filter(p => config.permissions.includes(p.name)),
        isSystem: true,
        userCount: Math.floor(Math.random() * 10) + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      setRoles(mockRoles);
      setPermissions(allPermissions);
    } catch (error) {
      throw error;
    }
  };

  const fetchUserRoles = async () => {
    try {
      // Mock API call - replace with actual API
      const mockUserRoles: BlogUserRole[] = [
        {
          id: '1',
          userId: 'user1',
          roleId: 'role-1',
          user: {
            id: 'user1',
            email: 'editor@example.com',
            profile: { firstName: 'María', lastName: 'García' }
          },
          role: {
            id: 'role-1',
            name: 'blog_editor',
            displayName: 'Editor de Blog'
          },
          assignedAt: new Date().toISOString(),
          assignedBy: {
            id: 'admin1',
            email: 'admin@example.com',
            profile: { firstName: 'Admin', lastName: 'Sistema' }
          }
        }
      ];

      setUserRoles(mockUserRoles);
    } catch (error) {
      throw error;
    }
  };

  const fetchUsers = async () => {
    try {
      // Fetch teachers and admins who can have blog roles
      const teachersResponse = await apiClient.get('/teachers');
      const usersResponse = await apiClient.get('/users');
      
      const teachers = teachersResponse.data || [];
      const admins = (usersResponse.data || []).filter((user: any) => user.role === 'admin');
      
      const allUsers = [...teachers.map((t: any) => ({
        id: t.user?.id || t.id,
        email: t.user?.email || t.email,
        role: 'teacher',
        profile: t.user?.profile || t.profile
      })), ...admins];

      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Use mock data if API fails
      setUsers([
        { id: 'user1', email: 'teacher1@example.com', role: 'teacher', profile: { firstName: 'Ana', lastName: 'López' } },
        { id: 'user2', email: 'teacher2@example.com', role: 'teacher', profile: { firstName: 'Carlos', lastName: 'Ruiz' } },
      ]);
    }
  };

  const handleCreateRole = async (values: any) => {
    try {
      // Mock API call
      const newRole: BlogRole = {
        id: `role-${roles.length + 1}`,
        name: values.name,
        displayName: values.displayName,
        description: values.description,
        permissions: allPermissions.filter(p => values.permissions.includes(p.id)),
        isSystem: false,
        userCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setRoles([...roles, newRole]);
      message.success('Rol creado correctamente');
      setRoleModalVisible(false);
      roleForm.resetFields();
    } catch (error) {
      console.error('Error creating role:', error);
      message.error('Error al crear el rol');
    }
  };

  const handleUpdateRole = async (values: any) => {
    try {
      if (!editingRole) return;

      const updatedRoles = roles.map(role => 
        role.id === editingRole.id 
          ? {
              ...role,
              displayName: values.displayName,
              description: values.description,
              permissions: allPermissions.filter(p => values.permissions.includes(p.id)),
              updatedAt: new Date().toISOString(),
            }
          : role
      );

      setRoles(updatedRoles);
      message.success('Rol actualizado correctamente');
      setRoleModalVisible(false);
      setEditingRole(null);
      roleForm.resetFields();
    } catch (error) {
      console.error('Error updating role:', error);
      message.error('Error al actualizar el rol');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      // Check if role has users
      const roleHasUsers = userRoles.some(ur => ur.roleId === roleId);
      if (roleHasUsers) {
        message.error('No se puede eliminar un rol que tiene usuarios asignados');
        return;
      }

      setRoles(roles.filter(role => role.id !== roleId));
      message.success('Rol eliminado correctamente');
    } catch (error) {
      console.error('Error deleting role:', error);
      message.error('Error al eliminar el rol');
    }
  };

  const handleAssignRole = async (values: any) => {
    try {
      const user = users.find(u => u.id === values.userId);
      const role = roles.find(r => r.id === values.roleId);

      if (!user || !role) return;

      const newUserRole: BlogUserRole = {
        id: `ur-${userRoles.length + 1}`,
        userId: user.id,
        roleId: role.id,
        user,
        role,
        assignedAt: new Date().toISOString(),
        assignedBy: {
          id: 'current-user',
          email: 'admin@example.com',
          profile: { firstName: 'Admin', lastName: 'Current' }
        }
      };

      setUserRoles([...userRoles, newUserRole]);
      
      // Update role user count
      setRoles(roles.map(r => 
        r.id === role.id ? { ...r, userCount: r.userCount + 1 } : r
      ));

      message.success(`Rol "${role.displayName}" asignado a ${getDisplayName(user)}`);
      setUserRoleModalVisible(false);
      userRoleForm.resetFields();
    } catch (error) {
      console.error('Error assigning role:', error);
      message.error('Error al asignar el rol');
    }
  };

  const handleUnassignRole = async (userRoleId: string) => {
    try {
      const userRole = userRoles.find(ur => ur.id === userRoleId);
      if (!userRole) return;

      setUserRoles(userRoles.filter(ur => ur.id !== userRoleId));
      
      // Update role user count
      setRoles(roles.map(r => 
        r.id === userRole.roleId ? { ...r, userCount: Math.max(0, r.userCount - 1) } : r
      ));

      message.success('Rol desasignado correctamente');
    } catch (error) {
      console.error('Error unassigning role:', error);
      message.error('Error al desasignar el rol');
    }
  };

  const getDisplayName = (user: any) => {
    if (user?.profile?.firstName && user?.profile?.lastName) {
      return `${user.profile.firstName} ${user.profile.lastName}`;
    }
    return user?.email?.split('@')[0] || 'Usuario';
  };

  const getPermissionsByCategory = (permissions: BlogPermission[]) => {
    const categories = ['posts', 'comments', 'categories', 'users', 'settings'];
    return categories.map(category => ({
      category,
      displayName: {
        posts: 'Posts y Media',
        comments: 'Comentarios',
        categories: 'Categorías',
        users: 'Usuarios',
        settings: 'Configuración'
      }[category] || category,
      permissions: permissions.filter(p => p.category === category)
    })).filter(cat => cat.permissions.length > 0);
  };

  const rolesColumns = [
    {
      title: 'Rol',
      key: 'role',
      render: (record: BlogRole) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text strong style={{ fontSize: '14px' }}>{record.displayName}</Text>
            {record.isSystem && <Tag color="#579172" size="small">Sistema</Tag>}
          </div>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.description}</Text>
        </div>
      ),
    },
    {
      title: 'Usuarios',
      dataIndex: 'userCount',
      key: 'userCount',
      render: (count: number) => (
        <Badge count={count} showZero color="#579172" />
      ),
    },
    {
      title: 'Permisos',
      key: 'permissions',
      render: (record: BlogRole) => (
        <div>
          <Text style={{ fontSize: '12px' }}>
            {record.permissions.length} permisos
          </Text>
          <div style={{ marginTop: '4px' }}>
            {getPermissionsByCategory(record.permissions).map(cat => (
              <Tag key={cat.category} size="small" style={{ fontSize: '10px', marginBottom: '2px' }}>
                {cat.displayName} ({cat.permissions.length})
              </Tag>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Creado',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Text style={{ fontSize: '12px' }}>
          {formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: BlogRole) => (
        <Space size="small">
          <Tooltip title="Editar">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              disabled={record.isSystem}
              onClick={() => {
                setEditingRole(record);
                roleForm.setFieldsValue({
                  ...record,
                  permissions: record.permissions.map(p => p.id)
                });
                setRoleModalVisible(true);
              }}
            />
          </Tooltip>
          {!record.isSystem && (
            <Popconfirm
              title={`¿Eliminar el rol "${record.displayName}"?`}
              description="Esta acción no se puede deshacer"
              onConfirm={() => handleDeleteRole(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Tooltip title="Eliminar">
                <Button 
                  icon={<DeleteOutlined />} 
                  size="small" 
                  danger
                  disabled={record.userCount > 0}
                />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const userRolesColumns = [
    {
      title: 'Usuario',
      key: 'user',
      render: (record: BlogUserRole) => (
        <Space>
          <UserOutlined />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              {getDisplayName(record.user)}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.user.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Rol de Blog',
      key: 'role',
      render: (record: BlogUserRole) => (
        <Tag color="#579172">{record.role.displayName}</Tag>
      ),
    },
    {
      title: 'Asignado',
      key: 'assigned',
      render: (record: BlogUserRole) => (
        <div>
          <div style={{ fontSize: '12px' }}>
            {formatDistanceToNow(new Date(record.assignedAt), { addSuffix: true, locale: es })}
          </div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Por {getDisplayName(record.assignedBy)}
          </Text>
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: BlogUserRole) => (
        <Popconfirm
          title={`¿Desasignar el rol de ${getDisplayName(record.user)}?`}
          onConfirm={() => handleUnassignRole(record.id)}
          okText="Sí"
          cancelText="No"
        >
          <Tooltip title="Desasignar rol">
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Tooltip>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[24, 24]}>
        {/* Roles Management */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <Space>
                <KeyOutlined />
                <span>Roles del Blog</span>
                <Badge count={roles.length} showZero />
              </Space>
            }
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingRole(null);
                  roleForm.resetFields();
                  setRoleModalVisible(true);
                }}
              >
                Nuevo Rol
              </Button>
            }
          >
            <Alert
              message="Roles del Sistema de Blog"
              description="Los roles del sistema no se pueden eliminar pero pueden editarse. Los roles personalizados pueden eliminarse si no tienen usuarios asignados."
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Table
              columns={rolesColumns}
              dataSource={roles}
              rowKey="id"
              loading={loading}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>

        {/* User Role Assignments */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <Space>
                <TeamOutlined />
                <span>Asignaciones de Usuarios</span>
                <Badge count={userRoles.length} showZero />
              </Space>
            }
            extra={
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  userRoleForm.resetFields();
                  setUserRoleModalVisible(true);
                }}
              >
                Asignar Rol
              </Button>
            }
          >
            <Table
              columns={userRolesColumns}
              dataSource={userRoles}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Role Modal */}
      <Modal
        title={editingRole ? 'Editar Rol' : 'Nuevo Rol de Blog'}
        open={roleModalVisible}
        onCancel={() => {
          setRoleModalVisible(false);
          setEditingRole(null);
          roleForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={roleForm}
          layout="vertical"
          onFinish={editingRole ? handleUpdateRole : handleCreateRole}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nombre del Rol"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input 
                  placeholder="ej: blog_custom_editor" 
                  disabled={editingRole?.isSystem}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="displayName"
                label="Nombre para Mostrar"
                rules={[{ required: true, message: 'El nombre para mostrar es obligatorio' }]}
              >
                <Input placeholder="ej: Editor Personalizado" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Descripción"
            rules={[{ required: true, message: 'La descripción es obligatoria' }]}
          >
            <Input.TextArea 
              rows={2} 
              placeholder="Describe qué puede hacer este rol..."
            />
          </Form.Item>

          <Form.Item
            name="permissions"
            label="Permisos"
            rules={[{ required: true, message: 'Selecciona al menos un permiso' }]}
          >
            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #d9d9d9', borderRadius: '6px', padding: '12px' }}>
              {getPermissionsByCategory(allPermissions).map(category => (
                <div key={category.category} style={{ marginBottom: '16px' }}>
                  <Title level={5} style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                    {category.displayName}
                  </Title>
                  <Checkbox.Group>
                    <Row>
                      {category.permissions.map(permission => (
                        <Col span={24} key={permission.id} style={{ marginBottom: '4px' }}>
                          <Checkbox value={permission.id}>
                            <div>
                              <Text style={{ fontSize: '13px' }}>{permission.displayName}</Text>
                              <div style={{ fontSize: '11px', color: '#666' }}>
                                {permission.description}
                              </div>
                            </div>
                          </Checkbox>
                        </Col>
                      ))}
                    </Row>
                  </Checkbox.Group>
                  <Divider style={{ margin: '12px 0' }} />
                </div>
              ))}
            </div>
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setRoleModalVisible(false);
                setEditingRole(null);
                roleForm.resetFields();
              }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                {editingRole ? 'Actualizar' : 'Crear'} Rol
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* User Role Assignment Modal */}
      <Modal
        title="Asignar Rol de Blog"
        open={userRoleModalVisible}
        onCancel={() => {
          setUserRoleModalVisible(false);
          userRoleForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={userRoleForm}
          layout="vertical"
          onFinish={handleAssignRole}
        >
          <Form.Item
            name="userId"
            label="Usuario"
            rules={[{ required: true, message: 'Selecciona un usuario' }]}
          >
            <Select
              placeholder="Seleccionar usuario..."
              showSearch
              filterOption={(input, option) =>
                (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
              }
            >
              {users.filter(user => !userRoles.some(ur => ur.userId === user.id)).map(user => (
                <Option key={user.id} value={user.id}>
                  <Space>
                    <UserOutlined />
                    <span>{getDisplayName(user)}</span>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      ({user.email})
                    </Text>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="roleId"
            label="Rol de Blog"
            rules={[{ required: true, message: 'Selecciona un rol' }]}
          >
            <Select placeholder="Seleccionar rol...">
              {roles.map(role => (
                <Option key={role.id} value={role.id}>
                  <div>
                    <div>{role.displayName}</div>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      {role.description}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setUserRoleModalVisible(false);
                userRoleForm.resetFields();
              }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                Asignar Rol
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BlogRoleManager;