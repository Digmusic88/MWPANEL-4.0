import React, { useState, useEffect } from 'react';
import {
  Select,
  Tag,
  Avatar,
  Divider,
  Input,
  Checkbox,
  Button,
  Space,
  Typography,
  Badge,
  Tooltip,
  Card
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  SearchOutlined,
  FilterOutlined,
  SelectOutlined,
  ClearOutlined,
  BookOutlined,
  HomeOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { User } from '../../types/user';

const { Title, Text } = Typography;
const { Search } = Input;

interface BulkUserSelectorProps {
  selectedUserIds: string[];
  onSelectionChange: (userIds: string[]) => void;
  userRole: 'admin' | 'teacher' | 'family' | 'student';
  availableUsers: User[];
  loading?: boolean;
  disabled?: boolean;
  maxSelections?: number;
  showFilters?: boolean;
  placeholder?: string;
}

interface UserWithExtras extends User {
  familyInfo?: {
    children: string;
    childrenCount: number;
  };
  classGroup?: string;
  subjectName?: string;
}

const BulkUserSelector: React.FC<BulkUserSelectorProps> = ({
  selectedUserIds,
  onSelectionChange,
  userRole,
  availableUsers,
  loading = false,
  disabled = false,
  maxSelections,
  showFilters = true,
  placeholder = "Selecciona destinatarios..."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<UserWithExtras[]>([]);
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Mapear usuarios y agrupar por tipo
  useEffect(() => {
    let filtered = (availableUsers as UserWithExtras[]).filter(user => {
      const searchMatch = !searchTerm ||
        `${user.profile?.firstName} ${user.profile?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const roleMatch = roleFilter.length === 0 || roleFilter.includes(user.role);

      return searchMatch && roleMatch;
    });

    // Ordenar por rol y nombre
    filtered.sort((a, b) => {
      const roleOrder = { 'admin': 0, 'teacher': 1, 'family': 2, 'student': 3 };
      const roleCompare = roleOrder[a.role as keyof typeof roleOrder] - roleOrder[b.role as keyof typeof roleOrder];

      if (roleCompare !== 0) return roleCompare;

      const nameA = `${a.profile?.firstName || ''} ${a.profile?.lastName || ''}`.trim();
      const nameB = `${b.profile?.firstName || ''} ${b.profile?.lastName || ''}`.trim();
      return nameA.localeCompare(nameB);
    });

    setFilteredUsers(filtered);
  }, [availableUsers, searchTerm, roleFilter]);

  // Agrupar usuarios por rol
  const usersByRole = filteredUsers.reduce((acc, user) => {
    if (!acc[user.role]) acc[user.role] = [];
    acc[user.role].push(user);
    return acc;
  }, {} as Record<string, UserWithExtras[]>);

  const handleUserSelect = (userId: string, checked: boolean) => {
    if (checked) {
      if (maxSelections && selectedUserIds.length >= maxSelections) {
        return; // No permitir más selecciones
      }
      onSelectionChange([...selectedUserIds, userId]);
    } else {
      onSelectionChange(selectedUserIds.filter(id => id !== userId));
    }
  };

  const handleSelectAll = () => {
    const allUserIds = filteredUsers.map(user => user.id);
    const limitedIds = maxSelections ? allUserIds.slice(0, maxSelections) : allUserIds;
    onSelectionChange(limitedIds);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <CrownOutlined className="text-purple-500" />;
      case 'teacher': return <BookOutlined className="text-blue-500" />;
      case 'family': return <HomeOutlined className="text-green-500" />;
      case 'student': return <UserOutlined className="text-yellow-600" />;
      default: return <UserOutlined />;
    }
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      'admin': 'Administradores',
      'teacher': 'Profesores',
      'family': 'Familias',
      'student': 'Estudiantes'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getUserDisplayName = (user: UserWithExtras) => {
    const name = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim();
    const fallbackName = user.email.split('@')[0];
    return name || fallbackName;
  };

  const renderUserCard = (user: UserWithExtras) => {
    const isSelected = selectedUserIds.includes(user.id);
    const displayName = getUserDisplayName(user);

    return (
      <Card
        key={user.id}
        size="small"
        className={`mb-2 cursor-pointer transition-all duration-200 ${
          isSelected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
        }`}
        onClick={() => handleUserSelect(user.id, !isSelected)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={isSelected}
              onChange={(e) => handleUserSelect(user.id, e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />

            <Avatar
              size="small"
              icon={getRoleIcon(user.role)}
              className="flex-shrink-0"
            />

            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">
                {displayName}
              </div>
              <div className="text-sm text-gray-500 truncate">
                {user.email}
              </div>

              {/* Información adicional según el rol */}
              {user.role === 'family' && user.familyInfo && (
                <div className="text-xs text-blue-600 mt-1">
                  Hijos: {user.familyInfo.children}
                </div>
              )}

              {user.role === 'student' && user.classGroup && (
                <div className="text-xs text-green-600 mt-1">
                  Clase: {user.classGroup}
                </div>
              )}

              {user.subjectName && (
                <div className="text-xs text-purple-600 mt-1">
                  Materia: {user.subjectName}
                </div>
              )}
            </div>
          </div>

          <Tag color={isSelected ? 'blue' : 'default'} className="ml-2">
            {getRoleLabel(user.role).slice(0, -1)}
          </Tag>
        </div>
      </Card>
    );
  };

  return (
    <div className="bulk-user-selector">
      {/* Header con controles */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <Title level={5} className="mb-0">
            <TeamOutlined className="mr-2" />
            Seleccionar destinatarios
          </Title>

          <Badge count={selectedUserIds.length} className="mr-2">
            <Button icon={<SelectOutlined />} type="text" />
          </Badge>
        </div>

        {/* Controles de búsqueda y filtros */}
        <Space direction="vertical" className="w-full">
          <Search
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            prefix={<SearchOutlined />}
          />

          {showFilters && (
            <div className="flex items-center justify-between">
              <Select
                mode="multiple"
                placeholder="Filtrar por rol"
                value={roleFilter}
                onChange={setRoleFilter}
                className="flex-1 mr-3"
                size="small"
              >
                <Select.Option value="admin">
                  <CrownOutlined className="mr-1" /> Administradores
                </Select.Option>
                <Select.Option value="teacher">
                  <BookOutlined className="mr-1" /> Profesores
                </Select.Option>
                <Select.Option value="family">
                  <HomeOutlined className="mr-1" /> Familias
                </Select.Option>
                <Select.Option value="student">
                  <UserOutlined className="mr-1" /> Estudiantes
                </Select.Option>
              </Select>

              <Space>
                <Button
                  size="small"
                  onClick={handleSelectAll}
                  disabled={disabled || filteredUsers.length === 0}
                >
                  Todos
                </Button>
                <Button
                  size="small"
                  onClick={handleClearAll}
                  disabled={disabled || selectedUserIds.length === 0}
                >
                  Limpiar
                </Button>
              </Space>
            </div>
          )}

          {/* Estadísticas */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {filteredUsers.length} usuarios disponibles
              {maxSelections && ` (máx. ${maxSelections})`}
            </span>
            <span>
              {selectedUserIds.length} seleccionados
            </span>
          </div>
        </Space>
      </div>

      {/* Lista de usuarios agrupados por rol */}
      <div className="max-h-96 overflow-y-auto">
        {Object.entries(usersByRole).map(([role, users]) => (
          <div key={role} className="mb-4">
            <div className="flex items-center mb-2 pb-1 border-b border-gray-200">
              {getRoleIcon(role)}
              <Text strong className="ml-2">
                {getRoleLabel(role)} ({users.length})
              </Text>
            </div>

            {users.map(renderUserCard)}
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <TeamOutlined className="text-4xl mb-2" />
            <div>No se encontraron usuarios</div>
            {searchTerm && (
              <div className="text-sm">
                Intenta con otros términos de búsqueda
              </div>
            )}
          </div>
        )}
      </div>

      {/* Resumen de selección */}
      {selectedUserIds.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <Text strong className="text-blue-800">
            {selectedUserIds.length} destinatarios seleccionados
          </Text>
          {maxSelections && selectedUserIds.length >= maxSelections && (
            <div className="text-sm text-orange-600 mt-1">
              Has alcanzado el límite máximo de selecciones
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkUserSelector;