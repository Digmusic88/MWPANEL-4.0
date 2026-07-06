/**
 * @archivo: TeacherTodoDashboard.tsx
 * @módulo: Teacher (Componente Dashboard TODO)
 * @función: Dashboard interactivo de tareas pendientes para profesores
 * @características:
 *   - Header con contador total (rojo si > 0)
 *   - Lista resumida con tarjetas
 *   - Filtros dinámicos sin recarga
 *   - Acciones masivas con checkboxes
 *   - Alertas por fechas límite
 *   - Panel lateral con detalles
 *   - Responsive design
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Badge,
  Typography,
  Select,
  Button,
  Checkbox,
  Alert,
  Drawer,
  Tag,
  Spin,
  message,
  Tooltip,
  Space,
  Collapse,
  Statistic,
  Empty,
  Switch,
  Divider,
  Modal,
  Form,
  InputNumber,
  Input,
} from 'antd';
import { useResponsive } from '@hooks/useResponsive';
import {
  ReloadOutlined,
  FilterOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  BookOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ReadOutlined,
  SearchOutlined,
  VideoCameraOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@hooks/useAuth';
import apiClient from '@services/apiClient';
import { useProfilePhoto } from '@hooks/useProfilePhoto';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

const StudentAvatar: React.FC<{
  avatarUrl?: string | null,
  size?: number
}> = ({ avatarUrl, size = 32 }) => {
  const { photoUrl, hasPhoto } = useProfilePhoto(avatarUrl);
  
  return (
    <Avatar 
      size={size}
      src={hasPhoto ? photoUrl : undefined}
      alt="Avatar"
      style={{ 
        minWidth: `${size}px`,
        background: '#f5f5f5'
      }}
    >
      {!hasPhoto && <UserOutlined />}
    </Avatar>
  );
};
const { TextArea } = Input;

// Interfaces
interface TeacherTodoItem {
  task_id: string;
  title: string;
  taskType: string;
  dueDate: string;
  courseId: string;
  courseName: string;
  subjectName: string;
  pendingSubmissions: number;
  toGradeSubmissions: number;
  gradedSubmissions: number;
  totalSubmissions: number;
  isOverdue: boolean;
  hoursUntilDue: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  alertBadge: 'red' | 'amber' | 'none';
}

interface TeacherTodoSummary {
  totalPending: number;
  urgentCount: number;
  overdueCount: number;
  items: TeacherTodoItem[];
}

interface TodoFilters {
  courseId?: string;
  taskType?: string;
  status?: string;
  priority?: string;
  showUrgentOnly?: boolean;
}

// Configuración de iconos por tipo de tarea
const TASK_TYPE_CONFIG = {
  assignment: { icon: <FileTextOutlined />, label: 'Tarea', color: '#1890ff' },
  homework: { icon: <BookOutlined />, label: 'Deberes', color: '#52c41a' },
  exam: { icon: <ExperimentOutlined />, label: 'Test Yourself', color: '#f5222d' },
  project: { icon: <ReadOutlined />, label: 'Proyecto', color: '#722ed1' },
  quiz: { icon: <SearchOutlined />, label: 'Cuestionario', color: '#fa8c16' },
  research: { icon: <ReadOutlined />, label: 'Investigación', color: '#13c2c2' },
  presentation: { icon: <VideoCameraOutlined />, label: 'Presentación', color: '#eb2f96' },
};

const TeacherTodoDashboard: React.FC = () => {
  const { user } = useAuth();
  const { isMobile, isTablet } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [todoData, setTodoData] = useState<TeacherTodoSummary | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<TodoFilters>({});
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TeacherTodoItem | null>(null);
  const [markingAsReviewed, setMarkingAsReviewed] = useState(false);
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [taskToGrade, setTaskToGrade] = useState<TeacherTodoItem | null>(null);
  const [gradingSubmissions, setGradingSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradingForm] = Form.useForm();

  // Cargar datos iniciales
  useEffect(() => {
    loadTodoData();
    loadCourses();
  }, []);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (Object.keys(filters).length > 0) {
      loadTodoData();
    }
  }, [filters]);

  const loadTodoData = async () => {
    try {
      setLoading(Object.keys(filters).length === 0);
      setRefreshing(Object.keys(filters).length > 0);
      
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });

      const response = await apiClient.get(`/teachers/todo?${params.toString()}`);
      setTodoData(response.data);
    } catch (error) {
      console.error('Error loading TODO data:', error);
      message.error('Error al cargar las tareas pendientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await apiClient.get('/teachers/todo/courses');
      setCourses(response.data);
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  };

  const handleFilterChange = useCallback((key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
    setSelectedItems(new Set()); // Limpiar selección al cambiar filtros
  }, []);

  const handleSelectItem = (taskId: string, checked: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(taskId);
      } else {
        newSet.delete(taskId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = todoData?.items.map(item => item.task_id) || [];
      setSelectedItems(new Set(allIds));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleMarkAsReviewed = async () => {
    if (selectedItems.size === 0) {
      message.warning('Selecciona al menos una tarea');
      return;
    }

    try {
      setMarkingAsReviewed(true);
      const taskIds = Array.from(selectedItems);
      
      await apiClient.patch('/teachers/todo/mark-reviewed', { taskIds });
      
      message.success(`${taskIds.length} tareas marcadas como revisadas`);
      setSelectedItems(new Set());
      await loadTodoData(); // Recargar datos
    } catch (error) {
      console.error('Error marking tasks as reviewed:', error);
      message.error('Error al marcar las tareas como revisadas');
    } finally {
      setMarkingAsReviewed(false);
    }
  };

  const openTaskDetail = (task: TeacherTodoItem) => {
    setSelectedTask(task);
    setDetailDrawerOpen(true);
  };

  const openGradingModal = async (task: TeacherTodoItem) => {
    setTaskToGrade(task);
    setLoadingSubmissions(true);
    setGradingModalOpen(true);
    
    try {
      // Cargar entregas pendientes de calificación usando el endpoint correcto
      const response = await apiClient.get('/tasks/teacher/pending-grading');
      // Filtrar solo las entregas de esta tarea específica
      const taskSubmissions = response.data.filter((sub: any) => sub.taskId === task.task_id);
      
      // Obtener detalles completos de cada entrega
      const detailedSubmissions = await Promise.all(
        taskSubmissions.map(async (submission: any) => {
          try {
            const detailResponse = await apiClient.get(`/tasks/submissions/${submission.id}`);
            return detailResponse.data;
          } catch (error) {
            console.error(`Error loading submission details for ${submission.id}:`, error);
            return submission; // Fallback to basic info if detailed fetch fails
          }
        })
      );
      
      setGradingSubmissions(detailedSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
      message.error('Error al cargar las entregas');
      setGradingSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSaveGrade = async (submissionId: string, values: any) => {
    try {
      setSavingGrade(true);
      await apiClient.patch(`/tasks/submissions/${submissionId}/grade`, {
        score: values.score,
        feedback: values.feedback,
        gradedAt: new Date().toISOString()
      });
      
      message.success('Calificación guardada correctamente');
      
      // Actualizar la lista de entregas
      setGradingSubmissions(prev => 
        prev.filter(sub => sub.id !== submissionId)
      );
      
      // Si no quedan más entregas, cerrar el modal
      if (gradingSubmissions.length <= 1) {
        setGradingModalOpen(false);
        await loadTodoData(); // Refrescar el dashboard
      }
      
      gradingForm.resetFields();
    } catch (error: any) {
      console.error('Error saving grade:', error);
      message.error(error.response?.data?.message || 'Error al guardar la calificación');
    } finally {
      setSavingGrade(false);
    }
  };

  const getTaskTypeIcon = (taskType: string) => {
    return TASK_TYPE_CONFIG[taskType]?.icon || <FileTextOutlined />;
  };

  const getTaskTypeLabel = (taskType: string) => {
    return TASK_TYPE_CONFIG[taskType]?.label || taskType;
  };

  const getTaskTypeColor = (taskType: string) => {
    return TASK_TYPE_CONFIG[taskType]?.color || '#666';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#f5222d';
      case 'high': return '#fa8c16';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return priority;
    }
  };

  const formatTimeUntilDue = (hoursUntilDue: number, isOverdue: boolean) => {
    if (isOverdue) {
      const hoursOverdue = Math.abs(hoursUntilDue);
      if (hoursOverdue < 24) {
        return `Vencida hace ${hoursOverdue}h`;
      } else {
        const daysOverdue = Math.floor(hoursOverdue / 24);
        return `Vencida hace ${daysOverdue}d`;
      }
    } else {
      if (hoursUntilDue < 24) {
        return `${hoursUntilDue}h restantes`;
      } else {
        const daysUntil = Math.floor(hoursUntilDue / 24);
        return `${daysUntil}d restantes`;
      }
    }
  };

  const renderTaskCard = (item: TeacherTodoItem) => {
    const isSelected = selectedItems.has(item.task_id);
    const pendingTotal = item.pendingSubmissions + item.toGradeSubmissions;

    return (
      <motion.div
        key={item.task_id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          size="small"
          className={`mb-3 cursor-pointer transition-all duration-200 ${
            isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
          }`}
          style={{
            borderLeft: `4px solid ${item.alertBadge === 'red' ? '#f5222d' :
                        item.alertBadge === 'amber' ? '#fa8c16' : '#d9d9d9'}`,
          }}
          bodyStyle={{ padding: isMobile ? '8px 12px' : '12px 16px' }}
        >
          {isMobile ? (
            // Layout móvil compacto
            <div onClick={() => openTaskDetail(item)}>
              {/* Header: Checkbox + Título + Alerta */}
              <div className="flex items-start gap-2 mb-2">
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSelectItem(item.task_id, e.target.checked);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginTop: '2px' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span style={{ color: getTaskTypeColor(item.taskType), fontSize: '14px' }}>
                      {getTaskTypeIcon(item.taskType)}
                    </span>
                    <Text strong style={{ fontSize: '13px' }} className="truncate">
                      {item.title}
                    </Text>
                    {item.alertBadge !== 'none' && (
                      <ExclamationCircleOutlined
                        style={{
                          color: item.alertBadge === 'red' ? '#f5222d' : '#fa8c16',
                          fontSize: '12px'
                        }}
                      />
                    )}
                  </div>
                  <Text type="secondary" style={{ fontSize: '11px' }} className="block truncate">
                    {item.courseName} • {item.subjectName}
                  </Text>
                </div>
              </div>

              {/* Tags y tiempo */}
              <div className="flex items-center justify-between flex-wrap gap-1 mb-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <Tag color={getTaskTypeColor(item.taskType)} style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                    {getTaskTypeLabel(item.taskType)}
                  </Tag>
                  <Tag color={getPriorityColor(item.priority)} style={{ fontSize: '10px', padding: '0 4px', margin: 0 }}>
                    {getPriorityLabel(item.priority)}
                  </Tag>
                </div>
                <Text
                  type={item.isOverdue ? 'danger' : 'secondary'}
                  style={{ fontSize: '11px' }}
                >
                  <ClockCircleOutlined style={{ marginRight: '2px' }} />
                  {formatTimeUntilDue(item.hoursUntilDue, item.isOverdue)}
                </Text>
              </div>

              {/* Footer: Estadísticas y acciones */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {pendingTotal > 0 && (
                    <Badge count={pendingTotal} size="small" color="#ff4d4f">
                      <Text style={{ fontSize: '11px' }}>Por revisar</Text>
                    </Badge>
                  )}
                  <Text type="secondary" style={{ fontSize: '10px' }}>
                    {item.gradedSubmissions}/{item.totalSubmissions} calif.
                  </Text>
                </div>
                <Space size={4}>
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined style={{ fontSize: '14px' }} />}
                    onClick={(e) => { e.stopPropagation(); openGradingModal(item); }}
                    disabled={item.toGradeSubmissions === 0}
                    style={{ padding: '2px 6px', height: 'auto' }}
                    className={item.toGradeSubmissions > 0 ? 'text-blue-500' : ''}
                  />
                  <Button
                    type="text"
                    size="small"
                    icon={<EyeOutlined style={{ fontSize: '14px' }} />}
                    onClick={(e) => { e.stopPropagation(); openTaskDetail(item); }}
                    style={{ padding: '2px 6px', height: 'auto' }}
                  />
                </Space>
              </div>
            </div>
          ) : (
            // Layout desktop original
            <Row gutter={[16, 8]} align="middle">
              {/* Checkbox */}
              <Col flex="32px">
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => handleSelectItem(item.task_id, e.target.checked)}
                />
              </Col>

              {/* Contenido principal */}
              <Col flex="1" onClick={() => openTaskDetail(item)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span style={{ color: getTaskTypeColor(item.taskType), fontSize: '16px' }}>
                      {getTaskTypeIcon(item.taskType)}
                    </span>
                    <Text strong className="text-base">
                      {item.title}
                    </Text>
                    {item.alertBadge !== 'none' && (
                      <Badge
                        count={
                          <ExclamationCircleOutlined
                            style={{
                              color: item.alertBadge === 'red' ? '#f5222d' : '#fa8c16'
                            }}
                          />
                        }
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag color={getTaskTypeColor(item.taskType)}>
                      {getTaskTypeLabel(item.taskType)}
                    </Tag>
                    <Tag color={getPriorityColor(item.priority)}>
                      {getPriorityLabel(item.priority)}
                    </Tag>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Text type="secondary" className="text-sm">
                      {item.courseName} • {item.subjectName}
                    </Text>
                    <br />
                    <Text
                      type={item.isOverdue ? 'danger' : 'secondary'}
                      className="text-sm"
                    >
                      <ClockCircleOutlined className="mr-1" />
                      {formatTimeUntilDue(item.hoursUntilDue, item.isOverdue)}
                    </Text>
                  </div>

                  <div className="text-right">
                    {pendingTotal > 0 && (
                      <div>
                        <Badge count={pendingTotal} showZero color="#ff4d4f">
                          <Text className="text-sm">Por revisar</Text>
                        </Badge>
                      </div>
                    )}
                    <div className="mt-1">
                      <Text type="secondary" className="text-xs">
                        {item.gradedSubmissions}/{item.totalSubmissions} calificadas
                      </Text>
                    </div>
                  </div>
                </div>
              </Col>

              {/* Botones de acción */}
              <Col flex="80px">
                <Space>
                  <Tooltip title="Calificar">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => openGradingModal(item)}
                      disabled={item.toGradeSubmissions === 0}
                      className={item.toGradeSubmissions > 0 ? 'text-blue-500 hover:text-blue-700' : ''}
                    />
                  </Tooltip>
                  <Tooltip title="Ver detalles">
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => openTaskDetail(item)}
                    />
                  </Tooltip>
                </Space>
              </Col>
            </Row>
          )}
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large">
          <div className="mt-4 text-center">
            <Text>Cargando dashboard...</Text>
          </div>
        </Spin>
      </div>
    );
  }

  const allSelected = todoData?.items.length > 0 && selectedItems.size === todoData.items.length;
  const someSelected = selectedItems.size > 0 && selectedItems.size < (todoData?.items.length || 0);

  return (
    <div className={isMobile ? "space-y-3" : "space-y-6"}>
      {/* Header con contadores */}
      {isMobile ? (
        // Header móvil compacto
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <Title level={4} className="!mb-0" style={{ fontSize: '16px' }}>
                📋 Tareas Pendientes
              </Title>
            </div>
            <Button
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={loadTodoData}
              disabled={refreshing}
              size="small"
            />
          </div>
          {/* Contadores en grid compacto */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
              <div style={{ color: (todoData?.totalPending || 0) > 0 ? '#f5222d' : '#52c41a', fontSize: '18px', fontWeight: 'bold' }}>
                {todoData?.totalPending || 0}
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>Pendientes</div>
            </div>
            <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
              <div style={{ color: (todoData?.urgentCount || 0) > 0 ? '#f5222d' : '#666', fontSize: '18px', fontWeight: 'bold' }}>
                {todoData?.urgentCount || 0}
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>Urgentes</div>
            </div>
            <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
              <div style={{ color: (todoData?.overdueCount || 0) > 0 ? '#f5222d' : '#666', fontSize: '18px', fontWeight: 'bold' }}>
                {todoData?.overdueCount || 0}
              </div>
              <div style={{ fontSize: '10px', color: '#666' }}>Vencidas</div>
            </div>
          </div>
        </div>
      ) : (
        // Header desktop original
        <Row gutter={[16, 16]} align="middle">
          <Col flex="1">
            <div>
              <Title level={2} className="!mb-2">
                📋 Dashboard de Tareas
              </Title>
              <Text type="secondary">
                Gestiona tus tareas pendientes de forma eficiente
              </Text>
            </div>
          </Col>

          <Col>
            <Row gutter={16} align="middle">
              <Col>
                <Statistic
                  title="Total Pendientes"
                  value={todoData?.totalPending || 0}
                  valueStyle={{
                    color: (todoData?.totalPending || 0) > 0 ? '#f5222d' : '#52c41a',
                    fontSize: '24px',
                  }}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col>
                <Statistic
                  title="Urgentes"
                  value={todoData?.urgentCount || 0}
                  valueStyle={{
                    color: (todoData?.urgentCount || 0) > 0 ? '#f5222d' : '#666',
                    fontSize: '20px',
                  }}
                  prefix={<ExclamationCircleOutlined />}
                />
              </Col>
              <Col>
                <Statistic
                  title="Vencidas"
                  value={todoData?.overdueCount || 0}
                  valueStyle={{
                    color: (todoData?.overdueCount || 0) > 0 ? '#f5222d' : '#666',
                    fontSize: '20px',
                  }}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      )}

      {/* Filtros */}
      <Card size="small" bodyStyle={{ padding: isMobile ? '8px' : '12px' }}>
        {isMobile ? (
          // Filtros móviles en grid
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Select
                placeholder="Curso"
                style={{ width: '100%' }}
                value={filters.courseId || 'all'}
                onChange={(value) => handleFilterChange('courseId', value)}
                size="small"
              >
                <Option value="all">Todos cursos</Option>
                {courses.map(course => (
                  <Option key={course.id} value={course.id}>
                    {course.name}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="Tipo"
                style={{ width: '100%' }}
                value={filters.taskType || 'all'}
                onChange={(value) => handleFilterChange('taskType', value)}
                size="small"
              >
                <Option value="all">Todos tipos</Option>
                <Option value="homework">Deberes</Option>
                <Option value="assignment">Tarea</Option>
                <Option value="exam">Test</Option>
                <Option value="project">Proyecto</Option>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Select
                placeholder="Estado"
                style={{ width: '120px' }}
                value={filters.status || 'all'}
                onChange={(value) => handleFilterChange('status', value)}
                size="small"
              >
                <Option value="all">Todos</Option>
                <Option value="pending">Pendientes</Option>
                <Option value="to_grade">Por calif.</Option>
                <Option value="overdue">Vencidas</Option>
              </Select>
              <div className="flex items-center gap-1">
                <Text style={{ fontSize: '11px' }}>Urgentes:</Text>
                <Switch
                  checked={filters.showUrgentOnly || false}
                  onChange={(checked) => handleFilterChange('showUrgentOnly', checked)}
                  size="small"
                />
              </div>
            </div>
          </div>
        ) : (
          // Filtros desktop originales
          <Row gutter={[16, 16]} align="middle">
            <Col>
              <FilterOutlined className="text-gray-500" />
              <Text strong className="ml-2">Filtros:</Text>
            </Col>

            <Col>
              <Select
                placeholder="Todos los cursos"
                style={{ width: 200 }}
                value={filters.courseId || 'all'}
                onChange={(value) => handleFilterChange('courseId', value)}
              >
                <Option value="all">Todos los cursos</Option>
                {courses.map(course => (
                  <Option key={course.id} value={course.id}>
                    {course.name}
                  </Option>
                ))}
              </Select>
            </Col>

            <Col>
              <Select
                placeholder="Tipo de tarea"
                style={{ width: 150 }}
                value={filters.taskType || 'all'}
                onChange={(value) => handleFilterChange('taskType', value)}
              >
                <Option value="all">Todos los tipos</Option>
                <Option value="homework">Deberes</Option>
                <Option value="assignment">Tarea</Option>
                <Option value="exam">Test Yourself</Option>
                <Option value="project">Proyecto</Option>
                <Option value="quiz">Cuestionario</Option>
              </Select>
            </Col>

            <Col>
              <Select
                placeholder="Estado"
                style={{ width: 150 }}
                value={filters.status || 'all'}
                onChange={(value) => handleFilterChange('status', value)}
              >
                <Option value="all">Todos los estados</Option>
                <Option value="pending">Pendientes</Option>
                <Option value="to_grade">Por calificar</Option>
                <Option value="graded">Calificadas</Option>
                <Option value="overdue">Vencidas</Option>
              </Select>
            </Col>

            <Col>
              <div className="flex items-center gap-2">
                <Text className="text-sm">Solo urgentes:</Text>
                <Switch
                  checked={filters.showUrgentOnly || false}
                  onChange={(checked) => handleFilterChange('showUrgentOnly', checked)}
                  size="small"
                />
              </div>
            </Col>

            <Col>
              <Button
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={loadTodoData}
                disabled={refreshing}
              >
                Actualizar
              </Button>
            </Col>
          </Row>
        )}
      </Card>

      {/* Acciones masivas */}
      {todoData && todoData.items.length > 0 && (
        <Card size="small">
          <Row gutter={[16, 8]} align="middle">
            <Col>
              <Checkbox
                indeterminate={someSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                checked={allSelected}
              >
                <Text strong>
                  {allSelected ? 'Deseleccionar todo' : 
                   someSelected ? `${selectedItems.size} seleccionadas` : 
                   'Seleccionar todo'}
                </Text>
              </Checkbox>
            </Col>

            {selectedItems.size > 0 && (
              <>
                <Col>
                  <Divider type="vertical" />
                </Col>
                <Col>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    loading={markingAsReviewed}
                    onClick={handleMarkAsReviewed}
                  >
                    Marcar como Revisadas ({selectedItems.size})
                  </Button>
                </Col>
              </>
            )}
          </Row>
        </Card>
      )}

      {/* Lista de tareas */}
      <div>
        <AnimatePresence>
          {todoData?.items?.map(renderTaskCard)}
        </AnimatePresence>

        {todoData && todoData.items.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No hay tareas que coincidan con los filtros"
          />
        )}
      </div>

      {/* Drawer de detalles - RESPONSIVE */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            {selectedTask && getTaskTypeIcon(selectedTask.taskType)}
            <span style={{ fontSize: isMobile ? '14px' : '16px' }}>{selectedTask?.title}</span>
          </div>
        }
        width={isMobile ? '100%' : 600}
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '85vh' : undefined}
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        className="custom-drawer"
        bodyStyle={{ padding: isMobile ? '12px' : '24px' }}
      >
        {selectedTask && (
          <div className={isMobile ? "space-y-3" : "space-y-4"}>
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 gap-4'}`}>
              <div>
                <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>Curso:</Text>
                <div className="font-medium" style={{ fontSize: isMobile ? '13px' : '14px' }}>{selectedTask.courseName}</div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>Asignatura:</Text>
                <div className="font-medium" style={{ fontSize: isMobile ? '13px' : '14px' }}>{selectedTask.subjectName}</div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>Tipo:</Text>
                <div>
                  <Tag color={getTaskTypeColor(selectedTask.taskType)} style={{ fontSize: isMobile ? '10px' : '12px' }}>
                    {getTaskTypeLabel(selectedTask.taskType)}
                  </Tag>
                </div>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>Prioridad:</Text>
                <div>
                  <Tag color={getPriorityColor(selectedTask.priority)} style={{ fontSize: isMobile ? '10px' : '12px' }}>
                    {getPriorityLabel(selectedTask.priority)}
                  </Tag>
                </div>
              </div>
            </div>

            <Divider style={{ margin: isMobile ? '12px 0' : '16px 0' }} />

            <div className={`grid grid-cols-3 ${isMobile ? 'gap-2' : 'gap-4'} text-center`}>
              <div className={`${isMobile ? 'p-2' : 'p-3'} bg-red-50 rounded`}>
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-red-600`}>
                  {selectedTask.pendingSubmissions}
                </div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Sin entregar</div>
              </div>
              <div className={`${isMobile ? 'p-2' : 'p-3'} bg-orange-50 rounded`}>
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-orange-600`}>
                  {selectedTask.toGradeSubmissions}
                </div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Por calificar</div>
              </div>
              <div className={`${isMobile ? 'p-2' : 'p-3'} bg-green-50 rounded`}>
                <div className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold text-green-600`}>
                  {selectedTask.gradedSubmissions}
                </div>
                <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600`}>Calificadas</div>
              </div>
            </div>

            <div className={`${isMobile ? 'p-3' : 'p-4'} bg-gray-50 rounded`}>
              <div className={isMobile ? '' : 'flex items-center justify-between'}>
                <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>Fecha límite:</Text>
                <Text
                  className={selectedTask.isOverdue ? 'text-red-500 font-medium' : ''}
                  style={{ fontSize: isMobile ? '12px' : '14px', display: 'block', marginTop: isMobile ? '2px' : 0 }}
                >
                  {new Date(selectedTask.dueDate).toLocaleDateString('es-ES', {
                    weekday: isMobile ? 'short' : 'long',
                    year: 'numeric',
                    month: isMobile ? 'short' : 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </div>
              <div className="mt-2">
                <Text type="secondary" style={{ fontSize: isMobile ? '11px' : '14px' }}>Estado:</Text>
                <div className="mt-1">
                  <Text
                    className={selectedTask.isOverdue ? 'text-red-500' : 'text-blue-500'}
                    style={{ fontSize: isMobile ? '12px' : '14px' }}
                  >
                    {formatTimeUntilDue(selectedTask.hoursUntilDue, selectedTask.isOverdue)}
                  </Text>
                </div>
              </div>
            </div>

            <div className={isMobile ? 'pt-3' : 'pt-4'}>
              <Space direction="vertical" size={isMobile ? 'small' : 'middle'} className="w-full">
                <Button
                  type="primary"
                  block
                  size={isMobile ? 'middle' : 'large'}
                  icon={<EditOutlined />}
                  onClick={() => {
                    setDetailDrawerOpen(false);
                    setTimeout(() => openGradingModal(selectedTask), 100);
                  }}
                  disabled={selectedTask.toGradeSubmissions === 0}
                >
                  Calificar Entregas ({selectedTask.toGradeSubmissions})
                </Button>
                <Button
                  type="default"
                  block
                  size={isMobile ? 'middle' : 'large'}
                  icon={<CheckOutlined />}
                  loading={markingAsReviewed}
                  onClick={() => {
                    setSelectedItems(new Set([selectedTask.task_id]));
                    handleMarkAsReviewed();
                  }}
                >
                  Marcar como Revisada
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal de Calificación - RESPONSIVE */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EditOutlined />
            <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
              {isMobile ? 'Calificar' : `Calificar: ${taskToGrade?.title}`}
            </span>
          </div>
        }
        open={gradingModalOpen}
        onCancel={() => {
          setGradingModalOpen(false);
          setTaskToGrade(null);
          setGradingSubmissions([]);
          gradingForm.resetFields();
        }}
        footer={null}
        width={isMobile ? '100%' : 800}
        style={isMobile ? { top: 20, maxWidth: '100%', margin: '0 auto', padding: '0 8px' } : undefined}
        destroyOnClose={true}
        bodyStyle={{ padding: isMobile ? '12px' : '24px', maxHeight: isMobile ? '70vh' : undefined, overflowY: isMobile ? 'auto' : undefined }}
      >
        {loadingSubmissions ? (
          <div className="flex justify-center items-center h-40">
            <Spin size="large">
              <div className="mt-4 text-center">
                <Text>Cargando entregas...</Text>
              </div>
            </Spin>
          </div>
        ) : gradingSubmissions.length === 0 ? (
          <Empty 
            description="No hay entregas pendientes de calificar"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="space-y-4">
            <Alert
              message={`${gradingSubmissions.length} entregas pendientes de calificar`}
              type="info"
              showIcon
            />
            
            {gradingSubmissions.map((submission, index) => (
              <Card
                key={submission.id}
                title={
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <StudentAvatar 
                        avatarUrl={submission.student?.user?.profile?.avatarUrl}
                        size={32}
                      />
                      <span>
                        {submission.student?.user?.profile?.firstName} {submission.student?.user?.profile?.lastName}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {submission.isLate && <Tag color="red">Tardía</Tag>}
                      <Tag color="blue">Entrega {index + 1}</Tag>
                    </div>
                  </div>
                }
                size="small"
              >
                <div className="space-y-4">
                  {/* Información de la entrega */}
                  <div className="bg-gray-50 p-3 rounded">
                    <Text type="secondary">Entregado el:</Text>
                    <div className="font-medium">
                      {new Date(submission.submittedAt).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {submission.content && (
                      <div className="mt-2">
                        <Text type="secondary">Contenido de la entrega:</Text>
                        <div className="mt-1 p-2 bg-white rounded border text-sm">
                          {submission.content}
                        </div>
                      </div>
                    )}
                    
                    {submission.submissionNotes && (
                      <div className="mt-2">
                        <Text type="secondary">Comentarios del estudiante:</Text>
                        <div className="mt-1 p-2 bg-blue-50 rounded border text-sm text-blue-800">
                          {submission.submissionNotes}
                        </div>
                      </div>
                    )}

                    {submission.attachments && submission.attachments.length > 0 && (
                      <div className="mt-2">
                        <Text type="secondary">Archivos adjuntos ({submission.attachments.length}):</Text>
                        <div className="mt-1 space-y-1">
                          {submission.attachments.map((attachment: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-2 p-1 bg-white rounded border text-xs">
                              <FileTextOutlined className="text-blue-500" />
                              <span className="flex-1">{attachment.originalName || `Archivo ${idx + 1}`}</span>
                              <Button 
                                size="small" 
                                type="link" 
                                onClick={() => window.open(`https://plataforma.mundoworld.school${attachment.filePath}`, '_blank')}
                              >
                                Ver
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Formulario de calificación - RESPONSIVE */}
                  <Form
                    form={gradingForm}
                    layout="vertical"
                    onFinish={(values) => handleSaveGrade(submission.id, values)}
                    className={isMobile ? "mt-3" : "mt-4"}
                  >
                    <Row gutter={isMobile ? [8, 8] : 16}>
                      <Col xs={24} sm={8}>
                        <Form.Item
                          name={`score_${submission.id}`}
                          label={<span style={{ fontSize: isMobile ? '12px' : '14px' }}>Calificación (0-100)</span>}
                          rules={[
                            { required: true, message: 'Ingresa una calificación' },
                            { type: 'number', min: 0, max: 100, message: 'Entre 0 y 100' }
                          ]}
                          style={{ marginBottom: isMobile ? '8px' : '16px' }}
                        >
                          <InputNumber
                            min={0}
                            max={100}
                            placeholder="Ej: 85"
                            style={{ width: '100%' }}
                            size={isMobile ? 'middle' : 'large'}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={16}>
                        <Form.Item
                          name={`feedback_${submission.id}`}
                          label={<span style={{ fontSize: isMobile ? '12px' : '14px' }}>Comentario (opcional)</span>}
                          style={{ marginBottom: isMobile ? '8px' : '16px' }}
                        >
                          <Input.TextArea
                            rows={isMobile ? 2 : 3}
                            placeholder="Comentarios sobre la entrega..."
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <div className="flex justify-end">
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={savingGrade}
                        icon={<CheckOutlined />}
                        size={isMobile ? 'middle' : 'large'}
                      >
                        {isMobile ? 'Guardar' : 'Guardar Calificación'}
                      </Button>
                    </div>
                  </Form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TeacherTodoDashboard;