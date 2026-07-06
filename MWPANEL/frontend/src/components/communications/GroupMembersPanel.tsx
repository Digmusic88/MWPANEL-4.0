/**
 * @archivo: GroupMembersPanel.tsx
 * @modulo: Communications - Group Chats
 * @funcion: Panel lateral para ver y gestionar miembros de un grupo
 * @creado_por: Sistema de Grupos MW Panel 2.0
 * @fecha: 2025-12-15
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  List,
  Avatar,
  Tag,
  Button,
  Space,
  Typography,
  Popconfirm,
  Modal,
  Input,
  Checkbox,
  Divider,
  Empty,
  Spin,
  Tooltip,
  message,
} from 'antd';
import {
  TeamOutlined,
  UserOutlined,
  CrownOutlined,
  BookOutlined,
  HomeOutlined,
  PlusOutlined,
  DeleteOutlined,
  LogoutOutlined,
  SearchOutlined,
  SettingOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { GroupChatDetail, GroupChatParticipant, GroupChatUser } from '../../services/communications.service';
import { useAuthStore } from '../../store/authStore';

const { Text, Title } = Typography;

interface GroupMembersPanelProps {
  visible: boolean;
  onClose: () => void;
  group: GroupChatDetail | null;
  availableUsers: GroupChatUser[];
  onAddMembers: (userIds: string[]) => Promise<boolean>;
  onRemoveMember: (userId: string) => Promise<boolean>;
  onLeaveGroup: () => Promise<boolean>;
  onUpdateGroup?: (data: { title?: string; description?: string }) => Promise<any>;
  onPromoteMember: (userId: string) => Promise<boolean>;
  onDemoteMember: (userId: string) => Promise<boolean>;
  loading?: boolean;
}

const GroupMembersPanel: React.FC<GroupMembersPanelProps> = ({
  visible,
  onClose,
  group,
  availableUsers,
  onAddMembers,
  onRemoveMember,
  onLeaveGroup,
  onUpdateGroup,
  onPromoteMember,
  onDemoteMember,
  loading = false,
}) => {
  const { user: currentUser } = useAuthStore();
  const [addMembersModalVisible, setAddMembersModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Reset state cuando cambia el grupo
  useEffect(() => {
    if (group) {
      setEditTitle(group.title);
      setEditDescription(group.description || '');
    }
  }, [group]);

  // Verificar si el usuario actual puede administrar el grupo
  const canManageGroup = useMemo(() => {
    if (!currentUser || !group) return false;
    if (currentUser.role === 'admin') return true; // Platform admin can always manage
    const currentUserInGroup = group.participants.find(p => p.id === currentUser.id);
    return currentUserInGroup?.isAdmin || false;
  }, [currentUser, group]);

  // Usuarios que no estan en el grupo todavia
  const nonMembers = useMemo(() => {
    if (!group) return [];
    const memberIds = group.participants.map((p) => p.id);
    return availableUsers.filter((u) => !memberIds.includes(u.id));
  }, [availableUsers, group]);

  // Filtrar usuarios para añadir
  const filteredNonMembers = useMemo(() => {
    return nonMembers.filter(
      (user) =>
        !searchTerm ||
        `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [nonMembers, searchTerm]);

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
      admin: 'Admin',
      teacher: 'Profesor',
      family: 'Familia',
      student: 'Estudiante',
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

  const handleAddMembers = async () => {
    if (selectedNewMembers.length === 0) return;

    setActionLoading(true);
    try {
      const success = await onAddMembers(selectedNewMembers);
      if (success) {
        setAddMembersModalVisible(false);
        setSelectedNewMembers([]);
        setSearchTerm('');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setActionLoading(true);
    try {
      await onRemoveMember(userId);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromote = async (userId: string) => {
    setActionLoading(true);
    try {
      await onPromoteMember(userId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemote = async (userId: string) => {
    setActionLoading(true);
    try {
      await onDemoteMember(userId);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    setActionLoading(true);
    try {
      const success = await onLeaveGroup();
      if (success) {
        onClose();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!onUpdateGroup) return;

    setActionLoading(true);
    try {
      await onUpdateGroup({
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setEditModalVisible(false);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleNewMember = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedNewMembers((prev) => [...prev, userId]);
    } else {
      setSelectedNewMembers((prev) => prev.filter((id) => id !== userId));
    }
  };

  if (!group) return null;

  const renderMemberActions = (member: GroupChatParticipant) => {
    const isCreator = member.id === group.createdById;
    const isCurrentUser = member.id === currentUser?.id;

    if (!canManageGroup || isCurrentUser) {
      return [];
    }

    const actions = [];

    if (!member.isAdmin) {
        actions.push(
            <Popconfirm
              key="promote"
              title="¿Hacer administrador?"
              onConfirm={() => handlePromote(member.id)}
              okText="Promover"
              cancelText="Cancelar"
            >
              <Tooltip title="Promover a administrador">
                <Button type="text" icon={<SafetyCertificateOutlined />} size="small" loading={actionLoading} />
              </Tooltip>
            </Popconfirm>
        );
    } else if (!isCreator) { // Admins can be demoted, but not the creator
        actions.push(
            <Popconfirm
              key="demote"
              title="¿Revocar como administrador?"
              onConfirm={() => handleDemote(member.id)}
              okText="Revocar"
              cancelText="Cancelar"
            >
              <Tooltip title="Revocar como administrador">
                <Button type="text" danger icon={<SafetyCertificateOutlined />} size="small" loading={actionLoading} />
              </Tooltip>
            </Popconfirm>
        );
    }
    
    // Non-creators can be removed
    if (!isCreator) {
        actions.push(
            <Popconfirm
              key="remove"
              title="¿Eliminar del grupo?"
              description={`${member.firstName} ${member.lastName} sera eliminado del grupo.`}
              onConfirm={() => handleRemoveMember(member.id)}
              okText="Eliminar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Eliminar del grupo">
                <Button type="text" danger icon={<DeleteOutlined />} size="small" loading={actionLoading} />
              </Tooltip>
            </Popconfirm>
        );
    }

    return actions;
  };


  return (
    <>
      <Drawer
        title={
          <Space>
            <TeamOutlined className="text-purple-600" />
            <span>Miembros del grupo</span>
          </Space>
        }
        placement="right"
        onClose={onClose}
        open={visible}
        width={400}
        extra={
          canManageGroup && (
            <Space>
              <Tooltip title="Editar grupo">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => setEditModalVisible(true)}
                />
              </Tooltip>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setAddMembersModalVisible(true)}
                size="small"
              >
                Añadir
              </Button>
            </Space>
          )
        }
      >
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Spin tip="Cargando..." />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Informacion del grupo */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <Title level={5} className="mb-1">
                {group.title}
              </Title>
              {group.description && (
                <Text type="secondary" className="text-sm">
                  {group.description}
                </Text>
              )}
              <div className="mt-2">
                <Tag color="blue">{group.participants.length} participantes</Tag>
              </div>
            </div>

            <Divider className="my-3" />

            {/* Lista de miembros */}
            <List
              itemLayout="horizontal"
              dataSource={group.participants}
              renderItem={(member) => {
                const isCreator = member.id === group.createdById;
                const isCurrentUser = member.id === currentUser?.id;
                const displayName =
                  `${member.firstName} ${member.lastName}`.trim() || member.email;

                return (
                  <List.Item
                    className="py-2"
                    actions={renderMemberActions(member)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar icon={getRoleIcon(member.role)} size="default" />
                      }
                      title={
                        <Space>
                          <span>{displayName}</span>
                          {isCreator && (
                            <Tooltip title="Creador del grupo">
                              <Tag color="gold"><CrownOutlined /> Creador</Tag>
                            </Tooltip>
                          )}
                          {member.isAdmin && !isCreator && (
                             <Tooltip title="Administrador del grupo">
                                <Tag color="purple"><SafetyCertificateOutlined /> Admin</Tag>
                             </Tooltip>
                          )}
                          {isCurrentUser && (
                            <Tag color="blue" className="text-xs">
                              Tu
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Tag color={getRoleColor(member.role)} className="text-xs">
                          {getRoleLabel(member.role)}
                        </Tag>
                      }
                    />
                  </List.Item>
                );
              }}
            />

            <Divider className="my-3" />

            {/* Boton para abandonar grupo */}
            {currentUser && group.createdById !== currentUser.id && (
              <Popconfirm
                title="¿Abandonar el grupo?"
                description="Ya no podras ver los mensajes de este grupo."
                onConfirm={handleLeaveGroup}
                okText="Abandonar"
                cancelText="Cancelar"
                okButtonProps={{ danger: true }}
              >
                <Button
                  danger
                  icon={<LogoutOutlined />}
                  block
                  loading={actionLoading}
                >
                  Abandonar grupo
                </Button>
              </Popconfirm>
            )}
          </div>
        )}
      </Drawer>

      {/* Modal para añadir miembros */}
      <Modal
        title="Añadir participantes"
        open={addMembersModalVisible}
        onCancel={() => {
          setAddMembersModalVisible(false);
          setSelectedNewMembers([]);
          setSearchTerm('');
        }}
        onOk={handleAddMembers}
        okText="Añadir seleccionados"
        cancelText="Cancelar"
        confirmLoading={actionLoading}
        okButtonProps={{ disabled: selectedNewMembers.length === 0 }}
      >
        <Input
          placeholder="Buscar usuarios..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          allowClear
          className="mb-4"
        />

        {selectedNewMembers.length > 0 && (
          <div className="mb-3 p-2 bg-blue-50 rounded">
            <Text type="secondary" className="text-sm">
              {selectedNewMembers.length} seleccionados
            </Text>
          </div>
        )}

        <div className="max-h-64 overflow-y-auto">
          {filteredNonMembers.length === 0 ? (
            <Empty
              description={
                searchTerm
                  ? 'No se encontraron usuarios'
                  : 'Todos los usuarios ya estan en el grupo'
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={filteredNonMembers}
              renderItem={(user) => {
                const isSelected = selectedNewMembers.includes(user.id);
                const displayName =
                  `${user.firstName} ${user.lastName}`.trim() || user.email;

                return (
                  <List.Item
                    className={`cursor-pointer rounded px-2 ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => toggleNewMember(user.id, !isSelected)}
                  >
                    <List.Item.Meta
                      avatar={
                        <Space>
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => toggleNewMember(user.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Avatar icon={getRoleIcon(user.role)} size="small" />
                        </Space>
                      }
                      title={displayName}
                      description={
                        <Tag color={getRoleColor(user.role)} className="text-xs">
                          {getRoleLabel(user.role)}
                        </Tag>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </div>
      </Modal>

      {/* Modal para editar grupo */}
      <Modal
        title="Editar grupo"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        onOk={handleUpdateGroup}
        okText="Guardar"
        cancelText="Cancelar"
        confirmLoading={actionLoading}
        okButtonProps={{ disabled: !editTitle.trim() }}
      >
        <div className="space-y-4">
          <div>
            <Text strong className="block mb-1">
              Nombre del grupo
            </Text>
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Nombre del grupo"
              maxLength={100}
            />
          </div>
          <div>
            <Text strong className="block mb-1">
              Descripcion (opcional)
            </Text>
            <Input.TextArea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="Descripcion del grupo..."
              rows={3}
              maxLength={500}
              showCount
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export { GroupMembersPanel };