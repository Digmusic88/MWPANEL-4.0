import React, { useState, useCallback } from 'react';
import {
  Modal,
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
  Row,
  Col,
  Breadcrumb,
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
  ArrowLeftOutlined,
  FullscreenOutlined,
  ExpandOutlined,
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

interface CoordinationItemsFullscreenProps {
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
        const departmentCount = item.assigned_departments?.length || 0;
        return departmentCount > 0 ? `${departmentCount} departamento(s)` : 'Por departamento';
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
    <Col xs={24}>
      <div ref={setNodeRef} style={style} {...attributes} className="mb-4">
        <Card
          className={`${item.is_completed ? 'opacity-75' : ''} ${isOverdue ? 'border-red-300' : ''} shadow-sm hover:shadow-md transition-shadow`}
          hoverable
          style={{ backgroundColor: item.color || undefined }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <div className="flex items-start gap-4">
            {/* Left side - Controls and Status */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div {...listeners} className="cursor-move p-1">
                <DragOutlined className="text-gray-400 text-lg" />
              </div>
              <Checkbox
                checked={item.is_completed}
                onChange={() => canComplete && onToggleComplete(item)}
                disabled={!canComplete}
                size="large"
              />
              <Tag color={getPriorityColor(item.priority)} className="px-2 py-1">
                {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
              </Tag>
            </div>

            {/* Center - Main content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <div className="flex items-center justify-between mb-2">
                <Text
                  className={`${item.is_completed ? 'line-through text-gray-500' : ''} text-lg font-semibold`}
                  style={{ fontSize: '16px' }}
                >
                  {item.item_title}
                </Text>
                <Dropdown menu={getActionMenu()} trigger={['click']}>
                  <Button type="text" icon={<MoreOutlined />} />
                </Dropdown>
              </div>

              {/* Description */}
              {item.item_description && (
                <Text type="secondary" className="block mb-3" style={{ fontSize: '14px', lineHeight: '1.5' }}>
                  {item.item_description}
                </Text>
              )}

              {/* Info row */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {/* Due Date */}
                {item.due_date && (
                  <div className="flex items-center">
                    <CalendarOutlined className={`mr-2 ${isOverdue ? 'text-red-500' : 'text-blue-500'}`} />
                    <Text className={isOverdue ? 'text-red-500 font-medium' : undefined}>
                      {dayjs(item.due_date).format('DD/MM/YYYY')}
                      {isOverdue && ' (Vencido)'}
                    </Text>
                  </div>
                )}

                {/* Assignment */}
                <div className="flex items-center">
                  <TeamOutlined className="mr-2 text-green-500" />
                  <Text>{getAssignmentText(item)}</Text>
                </div>

                {/* Completed by */}
                {item.completed_by && (
                  <div className="flex items-center">
                    <Avatar size="small" icon={<UserOutlined />} className="mr-2" />
                    <Text className="text-xs">
                      Completado por {item.completed_by.profile?.firstName} {item.completed_by.profile?.lastName}
                    </Text>
                  </div>
                )}
              </div>

              {/* Assigned departments (if any) */}
              {item.assignment_type === 'department' && item.assigned_departments && item.assigned_departments.length > 0 && (
                <div className="mt-3">
                  <Text type="secondary" className="text-xs mb-1 block">Departamentos asignados:</Text>
                  <div className="flex flex-wrap gap-1">
                    {item.assigned_departments.map((dept, index) => (
                      <Tag key={index} size="small" color="blue">
                        {dept}
                      </Tag>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {item.tags && item.tags.length > 0 && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 5).map((tag, index) => (
                      <Tag key={index} size="small" color="default">
                        {tag}
                      </Tag>
                    ))}
                    {item.tags.length > 5 && (
                      <Tag size="small" color="default">+{item.tags.length - 5} más</Tag>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </Col>
  );
};

const CoordinationItemsFullscreen: React.FC<CoordinationItemsFullscreenProps> = ({
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
        // Check if user's department matches assigned departments
        const userDepartment = (user as any)?.profile?.department;
        if (!userDepartment || !item.assigned_departments?.length) {
          return false;
        }
        return item.assigned_departments.includes(userDepartment);
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
  const progressPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <>
      <Modal
        title={null}
        open={visible}
        onCancel={onClose}
        width="100vw"
        style={{ top: 0, paddingBottom: 0 }}
        styles={{
          body: { height: 'calc(100vh - 110px)', padding: 0 },
          content: { height: '100vh' }
        }}
        footer={null}
        destroyOnClose
      >
        <div className="h-full flex flex-col bg-gray-50">
          {/* Header */}
          <div className="bg-white border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button icon={<ArrowLeftOutlined />} onClick={onClose}>
                  Volver
                </Button>
                <div>
                  <Breadcrumb>
                    <Breadcrumb.Item>Coordinación</Breadcrumb.Item>
                    <Breadcrumb.Item>Items</Breadcrumb.Item>
                  </Breadcrumb>
                  <Title level={3} className="mb-0">
                    <FullscreenOutlined className="mr-2" />
                    {sheet?.title || 'Items de Coordinación'}
                  </Title>
                  {sheet && (
                    <Text type="secondary">
                      Reunión: {dayjs(sheet.meeting_date).format('DD/MM/YYYY')}
                    </Text>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <Text strong className="block">Progreso</Text>
                  <Text className="text-lg">
                    {completedItems}/{totalItems} ({progressPercentage}%)
                  </Text>
                </div>
                <Progress
                  type="circle"
                  percent={progressPercentage}
                  size={64}
                  strokeColor={progressPercentage >= 80 ? '#52c41a' : progressPercentage >= 50 ? '#faad14' : '#ff4d4f'}
                />
                {sheet && canEditSheet(sheet) && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleCreateItem}
                    size="large"
                  >
                    Nuevo Item
                  </Button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex space-x-4">
              <Input
                placeholder="Buscar items..."
                prefix={<SearchOutlined />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                style={{ width: 300 }}
              />
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

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {sheetLoading || itemsLoading ? (
              <div className="flex justify-center items-center h-64">
                <Spin size="large" />
              </div>
            ) : filteredItems.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredItems.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-0">
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
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex justify-center items-center h-64">
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
              </div>
            )}
          </div>
        </div>
      </Modal>

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

export default CoordinationItemsFullscreen;