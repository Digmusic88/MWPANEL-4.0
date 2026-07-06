import React, { useState, useCallback } from 'react';
import {
  Drawer,
  List,
  Card,
  Button,
  Tag,
  Space,
  Typography,
  Progress,
  Tooltip,
  Avatar,
  Checkbox,
  Popconfirm,
  Empty,
  Dropdown,
  MenuProps,
  Input,
  Select,
  message,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  MoreOutlined,
  DragOutlined,
  SearchOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  coordinationItemsApi,
  coordinationSheetsApi,
  CoordinationItem,
  CoordinationSheet,
} from '../../services/coordinationService';
import { useAuthStore } from '../../store/authStore';
import CoordinationItemModal from './CoordinationItemModal';

const { Text, Title } = Typography;

interface CoordinationItemDrawerProps {
  visible: boolean;
  sheetId: string | null;
  onClose: () => void;
  userRole?: 'admin' | 'teacher';
}

interface SortableItemProps {
  item: CoordinationItem;
  onEdit: (item: CoordinationItem) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (item: CoordinationItem) => void;
  canEdit: boolean;
  canComplete: boolean;
  userRole: 'admin' | 'teacher';
}

const SortableItem: React.FC<SortableItemProps> = ({
  item,
  onEdit,
  onDelete,
  onToggleComplete,
  canEdit,
  canComplete,
  userRole,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  const getAssignmentText = (item: CoordinationItem) => {
    switch (item.assignment_type) {
      case 'all':
        return 'Todos los profesores';
      case 'individual':
        return `${item.assigned_users?.length || 0} profesor(es)`;
      case 'department':
        return 'Por departamento';
      default:
        return 'Sin asignar';
    }
  };

  const isOverdue = item.due_date && !item.is_completed && dayjs().isAfter(dayjs(item.due_date));

  const getActionMenu = (): MenuProps => {
    const items: MenuProps['items'] = [];

    if (canEdit) {
      items.push({
        key: 'edit',
        label: 'Editar',
        icon: <EditOutlined />,
        onClick: () => onEdit(item),
      });
    }

    if (canComplete) {
      items.push({
        key: 'toggle',
        label: item.is_completed ? 'Marcar pendiente' : 'Marcar completado',
        icon: item.is_completed ? <ClockCircleOutlined /> : <CheckCircleOutlined />,
        onClick: () => onToggleComplete(item),
      });
    }

    if (canEdit) {
      items.push({
        type: 'divider',
      });
      items.push({
        key: 'delete',
        label: 'Eliminar',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => onDelete(item.id),
      });
    }

    return { items };
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        size="small"
        className={`mb-3 ${item.is_completed ? 'opacity-75' : ''} ${isOverdue ? 'border-red-300' : ''}`}
        hoverable
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 min-w-0">
              <div {...listeners} className="cursor-move mr-2">
                <DragOutlined className="text-gray-400" />
              </div>
              <Checkbox
                checked={item.is_completed}
                onChange={() => canComplete && onToggleComplete(item)}
                disabled={!canComplete}
                className="mr-2"
              />
              <div className="flex-1 min-w-0">
                <Text
                  className={`${item.is_completed ? 'line-through text-gray-500' : ''}`}
                  ellipsis={{ tooltip: item.item_title }}
                >
                  {item.item_title}
                </Text>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Tag color={getPriorityColor(item.priority)}>
                {item.priority.toUpperCase()}
              </Tag>
              <Dropdown menu={getActionMenu()} trigger={['click']}>
                <Button type="text" icon={<MoreOutlined />} size="small" />
              </Dropdown>
            </div>
          </div>
        }
      >
        {/* Description */}
        {item.item_description && (
          <Text type="secondary" className="block mb-2" ellipsis={{ rows: 2 }}>
            {item.item_description}
          </Text>
        )}

        {/* Due Date */}
        {item.due_date && (
          <div className="flex items-center mb-2">
            <CalendarOutlined className={`mr-2 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`} />
            <Text className={isOverdue ? 'text-red-500' : undefined}>
              Vence: {dayjs(item.due_date).format('DD/MM/YYYY')}
              {isOverdue && ' (Vencido)'}
            </Text>
          </div>
        )}

        {/* Assignment */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <TeamOutlined className="mr-2 text-green-500" />
            <Text>{getAssignmentText(item)}</Text>
          </div>
          {item.completed_by && (
            <div className="flex items-center">
              <Avatar size="small" icon={<UserOutlined />} />
              <Text className="ml-1 text-xs">
                {item.completed_by.profile?.firstName} {item.completed_by.profile?.lastName}
              </Text>
            </div>
          )}
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.map((tag, index) => (
              <Tag key={index} size="small">
                {tag}
              </Tag>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

const CoordinationItemDrawer: React.FC<CoordinationItemDrawerProps> = ({
  visible,
  sheetId,
  onClose,
  userRole = 'admin',
}) => {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CoordinationItem | null>(null);
  const [localItems, setLocalItems] = useState<CoordinationItem[]>([]);
  
  const queryClient = useQueryClient();

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get sheet details
  const { data: sheet, isLoading: sheetLoading } = useQuery({
    queryKey: ['coordination-sheet', sheetId],
    queryFn: () => coordinationSheetsApi.getSheet(sheetId!),
    enabled: !!sheetId,
  });

  // Get items
  const {
    data: items = [],
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ['coordination-items', sheetId, searchTerm, priorityFilter, statusFilter],
    queryFn: () => coordinationItemsApi.getItems({
      sheet_id: sheetId!,
      search: searchTerm || undefined,
      priority: priorityFilter as any,
      is_completed: statusFilter === 'completed' ? true : statusFilter === 'pending' ? false : undefined,
    }),
    enabled: !!sheetId,
  });

  // Update local items when data changes
  React.useEffect(() => {
    setLocalItems([...items].sort((a, b) => a.order_index - b.order_index));
  }, [items]);

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: coordinationItemsApi.reorderItems,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coordination-items'] });
      queryClient.invalidateQueries({ queryKey: ['coordination-sheets'] });
    },
    onError: () => {
      message.error('Error al reordenar los items');
      // Revert local state
      setLocalItems([...items].sort((a, b) => a.order_index - b.order_index));
    },
  });

  // Complete/uncomplete mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) =>
      completed ? coordinationItemsApi.uncompleteItem(id) : coordinationItemsApi.completeItem(id),
    onSuccess: () => {
      message.success('Estado actualizado exitosamente');
      refetchItems();
      queryClient.invalidateQueries({ queryKey: ['coordination-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['coordination-stats'] });
    },
    onError: () => {
      message.error('Error al actualizar el estado');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: coordinationItemsApi.deleteItem,
    onSuccess: () => {
      message.success('Item eliminado exitosamente');
      refetchItems();
      queryClient.invalidateQueries({ queryKey: ['coordination-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['coordination-stats'] });
    },
    onError: () => {
      message.error('Error al eliminar el item');
    },
  });

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setLocalItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update backend
        const itemIds = newItems.map(item => item.id);
        reorderMutation.mutate(itemIds);
        
        return newItems;
      });
    }
  }, [reorderMutation]);

  const handleCreateItem = () => {
    setSelectedItem(null);
    setIsItemModalVisible(true);
  };

  const handleEditItem = (item: CoordinationItem) => {
    setSelectedItem(item);
    setIsItemModalVisible(true);
  };

  const handleDeleteItem = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleToggleComplete = (item: CoordinationItem) => {
    toggleCompleteMutation.mutate({
      id: item.id,
      completed: item.is_completed,
    });
  };

  const handleItemModalClose = () => {
    setIsItemModalVisible(false);
    setSelectedItem(null);
    refetchItems();
  };

  const canEditSheet = (sheet: CoordinationSheet | undefined): boolean => {
    if (!sheet || !user) return false;
    
    if (userRole === 'admin') return true;
    
    if (!sheet.is_editable && sheet.created_by.id !== user.id) return false;
    if (sheet.permission_level === 'readonly') return false;
    if (sheet.permission_level === 'open') return true;
    if (sheet.permission_level === 'restricted') {
      return sheet.allowed_editors?.includes(user.id) || sheet.created_by.id === user.id;
    }
    
    return false;
  };

  const canEditItem = (item: CoordinationItem): boolean => {
    if (!user) return false;
    if (userRole === 'admin') return true;
    if (item.created_by.id === user.id) return true;
    return canEditSheet(sheet);
  };

  const canCompleteItem = (item: CoordinationItem): boolean => {
    if (!user) return false;
    if (userRole === 'admin') return true;
    
    // Check if user is assigned to this item
    switch (item.assignment_type) {
      case 'all':
        return true;
      case 'individual':
        return item.assigned_users?.some(u => u.id === user.id) || false;
      case 'department':
        // TODO: Implement department logic
        return true;
      default:
        return false;
    }
  };

  const filteredItems = localItems.filter(item => {
    if (searchTerm && !item.item_title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    return true;
  });

  const completedItems = filteredItems.filter(item => item.is_completed).length;
  const totalItems = filteredItems.length;
  const progressPercentage = totalItems > 0 ? Math.round(((completedItems / totalItems) * 100) * 10) / 10 : 0;

  return (
    <>
      <Drawer
        title={
          <div>
            <div className="flex items-center justify-between mb-2">
              <Title level={4} className="mb-0">
                {sheet?.title || 'Items de Coordinación'}
              </Title>
              {sheet && canEditSheet(sheet) && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateItem}
                  size="small"
                >
                  Nuevo Item
                </Button>
              )}
            </div>
            {sheet && (
              <div className="text-sm text-gray-600">
                Reunión: {dayjs(sheet.meeting_date).format('DD/MM/YYYY')}
              </div>
            )}
          </div>
        }
        placement="right"
        size="large"
        open={visible}
        onClose={onClose}
        extra={
          <Space>
            <Text>
              Progreso: {completedItems}/{totalItems} ({progressPercentage}%)
            </Text>
            <Progress
              type="circle"
              percent={progressPercentage}
              size={32}
              strokeColor={progressPercentage >= 80 ? '#52c41a' : progressPercentage >= 50 ? '#faad14' : '#ff4d4f'}
            />
          </Space>
        }
      >
        {sheetLoading || itemsLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spin size="large" />
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="mb-4 space-y-3">
              <Input
                placeholder="Buscar items..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
              />
              <div className="flex space-x-2">
                <Select
                  placeholder="Prioridad"
                  value={priorityFilter}
                  onChange={setPriorityFilter}
                  allowClear
                  style={{ width: 120 }}
                >
                  <Select.Option value="high">Alta</Select.Option>
                  <Select.Option value="medium">Media</Select.Option>
                  <Select.Option value="low">Baja</Select.Option>
                </Select>
                <Select
                  placeholder="Estado"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  allowClear
                  style={{ width: 130 }}
                >
                  <Select.Option value="completed">Completados</Select.Option>
                  <Select.Option value="pending">Pendientes</Select.Option>
                </Select>
              </div>
            </div>

            {/* Items List */}
            {filteredItems.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredItems.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredItems.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                      onToggleComplete={handleToggleComplete}
                      canEdit={canEditItem(item)}
                      canComplete={canCompleteItem(item)}
                      userRole={userRole}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay items en esta hoja"
              >
                {sheet && canEditSheet(sheet) && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateItem}>
                    Crear Primer Item
                  </Button>
                )}
              </Empty>
            )}
          </>
        )}
      </Drawer>

      {/* Item Modal */}
      <CoordinationItemModal
        visible={isItemModalVisible}
        item={selectedItem}
        sheetId={sheetId}
        onClose={handleItemModalClose}
        userRole={userRole}
      />
    </>
  );
};

export default CoordinationItemDrawer;