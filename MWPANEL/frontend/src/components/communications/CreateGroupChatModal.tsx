/**
 * @archivo: CreateGroupChatModal.tsx
 * @modulo: Communications - Group Chats
 * @funcion: Modal para crear grupos de chat estilo WhatsApp
 * @creado_por: Sistema de Grupos MW Panel 2.0
 * @fecha: 2025-12-15
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Avatar,
  Tag,
  Typography,
  Checkbox,
  Divider,
  Badge,
  Empty,
  Spin,
  Alert,
} from 'antd';
import {
  TeamOutlined,
  SearchOutlined,
  UserOutlined,
  BookOutlined,
  HomeOutlined,
  CrownOutlined,
  PlusOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useGroupChats } from '../../hooks/useGroupChats';
import type { GroupChatUser, CreateGroupChatDto } from '../../services/communications.service';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface CreateGroupChatModalProps {
  visible: boolean;
  onClose: () => void;
  onGroupCreated?: (groupId: string) => void;
}

const CreateGroupChatModal: React.FC<CreateGroupChatModalProps> = ({
  visible,
  onClose,
  onGroupCreated,
}) => {
  const [form] = Form.useForm();
  const { createGroup, fetchAvailableUsers, availableUsers, loading } = useGroupChats();

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Cargar usuarios disponibles al abrir el modal
  useEffect(() => {
    if (visible) {
      fetchAvailableUsers();
      // Reset state
      setSelectedUserIds([]);
      setSearchTerm('');
      setRoleFilter([]);
      form.resetFields();
    }
  }, [visible, fetchAvailableUsers, form]);

  // Filtrar usuarios
  const filteredUsers = useMemo(() => {
    return availableUsers.filter((user: GroupChatUser) => {
      const searchMatch =
        !searchTerm ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const roleMatch = roleFilter.length === 0 || roleFilter.includes(user.role);

      return searchMatch && roleMatch;
    });
  }, [availableUsers, searchTerm, roleFilter]);

  // Agrupar por rol
  const usersByRole = useMemo(() => {
    return filteredUsers.reduce((acc, user) => {
      if (!acc[user.role]) acc[user.role] = [];
      acc[user.role].push(user);
      return acc;
    }, {} as Record<string, GroupChatUser[]>);
  }, [filteredUsers]);

  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds((prev) => [...prev, userId]);
    } else {
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  const handleSelectAllInRole = (role: string) => {
    const usersInRole = usersByRole[role] || [];
    const userIdsInRole = usersInRole.map((u) => u.id);
    const allSelected = userIdsInRole.every((id) => selectedUserIds.includes(id));

    if (allSelected) {
      // Deselect all in role
      setSelectedUserIds((prev) => prev.filter((id) => !userIdsInRole.includes(id)));
    } else {
      // Select all in role
      setSelectedUserIds((prev) => [...new Set([...prev, ...userIdsInRole])]);
    }
  };

  const handleClearAll = () => {
    setSelectedUserIds([]);
  };

  const handleSubmit = async (values: { title: string; description?: string }) => {
    if (selectedUserIds.length === 0) {
      return;
    }

    setCreating(true);
    try {
      const data: CreateGroupChatDto = {
        title: values.title.trim(),
        description: values.description?.trim(),
        participantIds: selectedUserIds,
      };

      const newGroup = await createGroup(data);
      if (newGroup) {
        onGroupCreated?.(newGroup.id);
        onClose();
      }
    } finally {
      setCreating(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <CrownOutlined className="text-purple-500" />;
      case 'teacher':
        return <BookOutlined className="text-blue-500" />;
      case 'family':
        return <HomeOutlined className="text-green-500" />;
      case 'student':
        return <UserOutlined className="text-yellow-600" />;
      default:
        return <UserOutlined />;
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administradores',
      teacher: 'Profesores',
      family: 'Familias',
      student: 'Estudiantes',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'purple',
      teacher: 'blue',
      family: 'green',
      student: 'gold',
    };
    return colors[role] || 'default';
  };

  const getSelectedUsersPreview = () => {
    return availableUsers.filter((u: GroupChatUser) => selectedUserIds.includes(u.id));
  };

  const renderUserCard = (user: GroupChatUser) => {
    const isSelected = selectedUserIds.includes(user.id);
    const displayName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    return (
      <div
        key={user.id}
        className={`p-3 mb-2 rounded-lg border cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-sm'
            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
        }`}
        onClick={() => handleUserSelect(user.id, !isSelected)}
      >
        <div className="flex items-center">
          <Checkbox
            checked={isSelected}
            onChange={(e) => handleUserSelect(user.id, e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="mr-3"
          />

          <Avatar size="small" icon={getRoleIcon(user.role)} className="mr-3" />

          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">{displayName}</div>
            <div className="text-sm text-gray-500 truncate">{user.email}</div>
          </div>

          <Tag color={getRoleColor(user.role)} className="ml-2">
            {getRoleLabel(user.role).slice(0, -1)}
          </Tag>
        </div>
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined className="text-purple-600" />
          <span>Crear nuevo grupo de chat</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={null}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        {/* Nombre del grupo */}
        <Form.Item
          label="Nombre del grupo"
          name="title"
          rules={[
            { required: true, message: 'El nombre del grupo es obligatorio' },
            { min: 1, max: 100, message: 'El nombre debe tener entre 1 y 100 caracteres' },
          ]}
        >
          <Input
            prefix={<TeamOutlined className="text-gray-400" />}
            placeholder="Ej: Profesores de Primaria, Grupo 5A, etc."
            maxLength={100}
          />
        </Form.Item>

        {/* Descripcion opcional */}
        <Form.Item
          label="Descripcion (opcional)"
          name="description"
          rules={[{ max: 500, message: 'La descripcion no puede superar los 500 caracteres' }]}
        >
          <TextArea
            placeholder="Descripcion breve del proposito del grupo..."
            rows={2}
            maxLength={500}
            showCount
          />
        </Form.Item>

        <Divider />

        {/* Selector de participantes */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <Title level={5} className="mb-0">
              <TeamOutlined className="mr-2" />
              Seleccionar participantes
            </Title>

            <Badge count={selectedUserIds.length} showZero>
              <Button
                icon={<CloseOutlined />}
                size="small"
                onClick={handleClearAll}
                disabled={selectedUserIds.length === 0}
              >
                Limpiar
              </Button>
            </Badge>
          </div>

          {/* Busqueda */}
          <Input
            placeholder="Buscar por nombre o email..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className="mb-3"
          />

          {/* Filtro de rol */}
          <div className="flex flex-wrap gap-2 mb-3">
            {['admin', 'teacher', 'family', 'student'].map((role) => {
              const isActive = roleFilter.includes(role);
              return (
                <Tag
                  key={role}
                  color={isActive ? getRoleColor(role) : 'default'}
                  className="cursor-pointer"
                  onClick={() => {
                    if (isActive) {
                      setRoleFilter((prev) => prev.filter((r) => r !== role));
                    } else {
                      setRoleFilter((prev) => [...prev, role]);
                    }
                  }}
                >
                  {getRoleIcon(role)} {getRoleLabel(role)}
                </Tag>
              );
            })}
          </div>

          {/* Lista de usuarios */}
          <div
            className="max-h-64 overflow-y-auto border rounded-lg p-2"
            style={{ backgroundColor: '#fafafa' }}
          >
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Spin tip="Cargando usuarios..." />
              </div>
            ) : filteredUsers.length === 0 ? (
              <Empty
                description={
                  searchTerm
                    ? 'No se encontraron usuarios con ese criterio'
                    : 'No hay usuarios disponibles'
                }
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              Object.entries(usersByRole).map(([role, users]) => (
                <div key={role} className="mb-3">
                  <div className="flex items-center justify-between mb-2 pb-1 border-b border-gray-200">
                    <Space>
                      {getRoleIcon(role)}
                      <Text strong>
                        {getRoleLabel(role)} ({users.length})
                      </Text>
                    </Space>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => handleSelectAllInRole(role)}
                    >
                      {users.every((u) => selectedUserIds.includes(u.id))
                        ? 'Deseleccionar'
                        : 'Seleccionar todos'}
                    </Button>
                  </div>
                  {users.map(renderUserCard)}
                </div>
              ))
            )}
          </div>

          {/* Mensaje de validacion */}
          {selectedUserIds.length === 0 && (
            <Alert
              type="info"
              message="Selecciona al menos un participante para crear el grupo"
              showIcon
              className="mt-3"
            />
          )}
        </div>

        {/* Preview de seleccionados */}
        {selectedUserIds.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Text strong className="text-blue-800 block mb-2">
              {selectedUserIds.length} participantes seleccionados:
            </Text>
            <div className="flex flex-wrap gap-2">
              {getSelectedUsersPreview().map((user: GroupChatUser) => (
                <Tag
                  key={user.id}
                  closable
                  onClose={() => handleUserSelect(user.id, false)}
                  color="blue"
                >
                  {`${user.firstName} ${user.lastName}`.trim() || user.email}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button onClick={onClose} disabled={creating}>
            Cancelar
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlusOutlined />}
            loading={creating}
            disabled={selectedUserIds.length === 0}
          >
            Crear grupo
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default CreateGroupChatModal;
