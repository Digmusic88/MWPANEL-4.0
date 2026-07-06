import React, { useState, useEffect } from 'react';
import { useResponsive } from '../../hooks/useResponsive';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Input,
  Select,
  Modal,
  Form,
  message,
  Tag,
  Progress,
  Tooltip,
  Row,
  Col,
  Statistic,
  DatePicker,
  InputNumber,
  Switch,
  Drawer,
  List,
  Avatar,
  Popconfirm,
  Divider,
  Transfer,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  BookOutlined,
  TrophyOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
  UserOutlined,
  PaperClipOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';
import { formatTaskGrade } from '../../utils/numberFormat';
import { TaskAttachmentsSection } from '../../components/attachments';
import { Rubric, useRubrics } from '../../hooks/useRubrics';
import SectionInfoBanner from '../../components/common/SectionInfoBanner';
import AcademicYearSelector from '../../components/common/AcademicYearSelector';
import RubricGrid from '../../components/rubrics/RubricGrid';
import { RubricSelectorModal } from '../../components/rubrics';
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskStatistics,
  CreateTaskForm,
  TaskQueryParams,
  TASK_TYPE_LABELS,
  TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_STATUS_COLORS,
  SUBMISSION_STATUS_COLORS,
  SUBMISSION_STATUS_LABELS,
} from '@/types/tasks';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface SubjectAssignment {
  id: string;
  subject: {
    id: string;
    name: string;
    code: string;
  };
  classGroup: {
    id: string;
    name: string;
  };
}

const TasksPage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();

  // Estados principales
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<TaskStatistics | null>(null);
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([]);
  
  // Estados de modales y formularios
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [attachmentTaskId, setAttachmentTaskId] = useState<string | null>(null);
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Establecer fecha de asignación actual cuando se abre el modal de crear tarea
  useEffect(() => {
    if (createModalVisible) {
      createForm.setFieldsValue({
        assignedDate: dayjs(), // Fecha y hora actual del cliente (sincronizada con servidor)
      });
    }
  }, [createModalVisible, createForm]);
  
  // Estados de filtros y paginación
  const [filters, setFilters] = useState<TaskQueryParams>({
    page: 1,
    limit: 10,
  });
  const [total, setTotal] = useState(0);
  
  // Estados para rúbricas
  const { rubrics, fetchRubrics } = useRubrics();
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null);
  const [rubricViewerVisible, setRubricViewerVisible] = useState(false);
  const [rubricSelectorVisible, setRubricSelectorVisible] = useState(false);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  // Estados para selección de estudiantes
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSelectorVisible, setStudentSelectorVisible] = useState(false);
  const [selectedSubjectAssignmentId, setSelectedSubjectAssignmentId] = useState<string>('');

  // Estado del selector de año académico (filtro de listado)
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined);
  const [yearIsArchived, setYearIsArchived] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchStatistics();
    fetchSubjectAssignments();
    fetchRubrics();
  }, [filters, selectedYearId]);

  // Re-validar rúbricas cuando currentTeacherId esté disponible
  useEffect(() => {
    if (currentTeacherId) {
      console.log('[DEBUG] currentTeacherId available:', currentTeacherId, 'rubrics count:', rubrics.length);
    }
  }, [currentTeacherId, rubrics]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      if (selectedYearId) {
        params.append('academicYearId', selectedYearId);
      }

      const response = await apiClient.get(`/tasks/teacher/my-tasks?${params}`);
      setTasks(response.data.tasks);
      setTotal(response.data.total);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      message.error('Error al cargar las tareas');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await apiClient.get('/tasks/teacher/statistics');
      setStatistics(response.data);
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchSubjectAssignments = async () => {
    try {
      // Primero obtener información del profesor logueado usando el dashboard
      const dashboardResponse = await apiClient.get('/teachers/dashboard/my-dashboard');
      const teacherId = dashboardResponse.data.teacher.id;
      setCurrentTeacherId(teacherId);

      // Luego obtener sus asignaciones
      const response = await apiClient.get(`/subjects/assignments/teacher/${teacherId}`);
      setSubjectAssignments(response.data);
    } catch (error: any) {
      console.error('Error fetching subject assignments:', error);
    }
  };

  // Obtener TODOS los estudiantes del profesor
  const fetchAllMyStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await apiClient.get(`/subjects/my-students`);
      console.log('🔍 DEBUG - Total estudiantes cargados:', response.data?.length || 0);
      console.log('🔍 DEBUG - Estudiantes disponibles:', response.data?.map((s: any) => ({
        id: s.id,
        nombre: `${s.user?.profile?.firstName} ${s.user?.profile?.lastName}`,
        grupo: s.classGroup?.name
      })));
      setAvailableStudents(response.data || []);
    } catch (error) {
      console.error('Error loading students:', error);
      message.error('Error al cargar los estudiantes');
    } finally {
      setLoadingStudents(false);
    }
  };

  // Manejar cambio de asignatura
  const handleSubjectAssignmentChange = (subjectAssignmentId: string) => {
    setSelectedSubjectAssignmentId(subjectAssignmentId);
    // NO resetear selectedStudentIds aquí - permite mantener los estudiantes ya seleccionados
    // El usuario puede modificarlos manualmente con el selector si lo desea
  };

  // Abrir modal de selección de estudiantes
  const handleOpenStudentSelector = () => {
    if (!selectedSubjectAssignmentId) {
      message.warning('Por favor, selecciona primero una asignatura');
      return;
    }

    // Cargar estudiantes si no se han cargado aún
    if (availableStudents.length === 0) {
      fetchAllMyStudents();
    }

    setStudentSelectorVisible(true);
  };

  // Manejar cambios en la selección
  const handleStudentSelectionChange = (targetKeys: string[]) => {
    console.log('🔍 DEBUG - Estudiantes seleccionados (IDs):', targetKeys);
    console.log('🔍 DEBUG - Número de estudiantes seleccionados:', targetKeys.length);
    setSelectedStudentIds(targetKeys);
  };

  const handleRubricSelect = (rubric: Rubric) => {
    setSelectedRubric(rubric);
    createForm.setFieldsValue({ 
      rubricId: rubric.id,
      maxPoints: rubric.maxScore 
    });
    setRubricSelectorVisible(false);
  };

  const handleCreateTask = async (values: CreateTaskForm & { subjectAssignmentIds?: string[] }) => {
    try {
      // Procesar fechas y convertir latePenalty de porcentaje a decimal
      // DEBUG: Log frontend values
      console.error('🚨🚨🚨 FRONTEND ANTES DE ENVIAR 🚨🚨🚨');
      console.error('🔍 values.valuationType:', values.valuationType);
      console.error('🔍 values.taskType:', values.taskType);
      console.error('🔍 values.title:', values.title);
      console.error('🔍 values.subjectAssignmentIds:', values.subjectAssignmentIds);

      // Validación: asegurar que hay al menos una asignatura seleccionada
      const subjectAssignmentIds = values.subjectAssignmentIds || [];
      if (subjectAssignmentIds.length === 0) {
        message.error('Por favor selecciona al menos una asignatura');
        return;
      }

      // La primera asignatura es la principal, las demás son adicionales
      const primarySubjectAssignmentId = subjectAssignmentIds[0];
      const additionalSubjectAssignmentIds = subjectAssignmentIds.slice(1);

      const taskData = {
        ...values,
        assignedDate: dayjs(values.assignedDate).toISOString(),
        dueDate: dayjs(values.dueDate).toISOString(),
        allowedFileTypes: values.allowedFileTypes?.filter(type => type.trim() !== ''),
        latePenalty: values.latePenalty ? values.latePenalty / 100 : undefined,
        // Incluir datos de evaluación por rúbrica
        valuationType: values.valuationType || 'score',
        rubricId: values.valuationType === 'rubric' ? values.rubricId : undefined,
        // Asignaturas: primera como principal, resto como adicionales
        subjectAssignmentId: primarySubjectAssignmentId,
        additionalSubjectAssignmentIds: additionalSubjectAssignmentIds.length > 0 ? additionalSubjectAssignmentIds : undefined,
        // Incluir estudiantes seleccionados si hay alguno
        ...(selectedStudentIds.length > 0 && { targetStudentIds: selectedStudentIds }),
      };

      // Eliminar el campo subjectAssignmentIds ya que ahora enviamos subjectAssignmentId
      delete (taskData as any).subjectAssignmentIds;

      console.error('🚨🚨🚨 FRONTEND TASKDATA 🚨🚨🚨');
      console.error('🔍 taskData.valuationType:', taskData.valuationType);
      console.error('🔍 taskData.taskType:', taskData.taskType);
      console.error('🔍 taskData.title:', taskData.title);

      const response = await apiClient.post('/tasks', taskData);
      const createdTask = response.data;

      console.log('🔥 CREATED TASK RESPONSE:', createdTask);
      console.log('🔥 TASK STATUS:', createdTask.status);
      console.log('🔥 TASK ID:', createdTask.id);

      // Mostrar mensaje de éxito con información de grupos
      const groupCount = subjectAssignmentIds.length;
      if (groupCount > 1) {
        message.success(`Tarea creada exitosamente para ${groupCount} grupos/asignaturas`);
      } else {
        message.success('Tarea creada exitosamente');
      }
      setCreateModalVisible(false);
      createForm.resetFields();
      setSelectedRubric(null);
      setRubricSelectorVisible(false);
      setSelectedStudentIds([]);
      setSelectedSubjectAssignmentId('');
      
      // Mostrar modal de publicación si la tarea se creó como borrador
      console.log('🔥 CHECKING IF SHOULD SHOW MODAL:', createdTask.status === 'draft');
      if (createdTask.status === 'draft') {
        console.log('🔥 SHOWING PUBLISH MODAL');
        setCreatedTaskId(createdTask.id);
        setPublishModalVisible(true);
      } else {
        console.log('🔥 NOT SHOWING MODAL - STATUS IS:', createdTask.status);
      }
      
      fetchTasks();
      fetchStatistics();
    } catch (error: any) {
      console.error('Error creating task:', error);
      message.error(error.response?.data?.message || 'Error al crear la tarea');
    }
  };

  const handleUpdateTask = async (values: any) => {
    if (!selectedTask) return;

    try {
      // 🔍 DEBUG: Ver estudiantes seleccionados antes de enviar
      console.log('=== DEBUG UPDATE TASK ===');
      console.log('📝 Selected Student IDs:', selectedStudentIds);
      console.log('📊 Count:', selectedStudentIds.length);
      console.log('📋 Form values received:', values);

      // Construir updateData con solo los campos válidos para el DTO
      // Evitar incluir campos que no están en UpdateTaskDto
      const updateData: Record<string, any> = {};

      // Campos básicos del formulario
      if (values.title !== undefined) updateData.title = values.title;
      if (values.status !== undefined) updateData.status = values.status;
      if (values.description !== undefined) updateData.description = values.description;
      // NOTA: El DTO usa 'teachernotes' (lowercase), no 'teacherNotes'
      if (values.teacherNotes !== undefined) updateData.teachernotes = values.teacherNotes;

      // Fechas - convertir a ISO string
      if (values.assignedDate) {
        updateData.assignedDate = dayjs(values.assignedDate).toISOString();
      }
      if (values.dueDate) {
        updateData.dueDate = dayjs(values.dueDate).toISOString();
      }

      // Penalización - convertir de porcentaje a decimal
      if (values.latePenalty !== undefined && values.latePenalty !== null) {
        updateData.latePenalty = values.latePenalty / 100;
      }

      // Estudiantes asignados - SIEMPRE incluir para actualizar submissions
      // Si está vacío, el backend asignará a todos los estudiantes de la clase
      // Filtrar valores null/undefined para evitar error de validación
      updateData.targetStudentIds = selectedStudentIds.filter(
        (id): id is string => id !== null && id !== undefined && typeof id === 'string'
      );

      console.log('📤 Clean Update Data to send:', JSON.stringify(updateData, null, 2));
      console.log('========================');

      const response = await apiClient.patch(`/tasks/${selectedTask.id}`, updateData);
      console.log('✅ Update response:', response.data);

      message.success('Tarea actualizada exitosamente');
      setEditModalVisible(false);
      editForm.resetFields();
      setSelectedTask(null);
      setSelectedStudentIds([]);
      setSelectedSubjectAssignmentId('');
      fetchTasks();
      fetchStatistics();
    } catch (error: any) {
      console.error('❌ Error updating task:', error);
      console.error('❌ Error response data:', JSON.stringify(error.response?.data, null, 2));
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Error message:', error.response?.data?.message);
      console.error('❌ Error errors array:', JSON.stringify(error.response?.data?.errors, null, 2));

      // Mostrar mensaje de error más detallado
      let errorMsg = 'Error al actualizar la tarea';
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Mostrar los errores de validación específicos
        errorMsg = error.response.data.errors.map((e: any) =>
          typeof e === 'string' ? e : (e.constraints ? Object.values(e.constraints).join(', ') : JSON.stringify(e))
        ).join('; ');
      } else if (Array.isArray(error.response?.data?.message)) {
        errorMsg = error.response.data.message.join(', ');
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      message.error(errorMsg);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await apiClient.delete(`/tasks/task/${taskId}`);
      message.success('Tarea eliminada exitosamente');
      fetchTasks();
      fetchStatistics();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      message.error(error.response?.data?.message || 'Error al eliminar la tarea');
    }
  };

  const handlePublishTask = async (taskId: string) => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, { status: TaskStatus.PUBLISHED });
      message.success('Tarea publicada exitosamente');
      fetchTasks();
      fetchStatistics();
    } catch (error: any) {
      console.error('Error publishing task:', error);
      message.error(error.response?.data?.message || 'Error al publicar la tarea');
    }
  };

  const handlePublishNow = async () => {
    if (!createdTaskId) return;
    
    try {
      await apiClient.patch(`/tasks/${createdTaskId}`, { status: TaskStatus.PUBLISHED });
      message.success('Tarea publicada y enviada a estudiantes exitosamente');
      setPublishModalVisible(false);
      setCreatedTaskId(null);
      fetchTasks();
      fetchStatistics();
    } catch (error: any) {
      console.error('Error publishing task:', error);
      message.error(error.response?.data?.message || 'Error al publicar la tarea');
    }
  };

  const handlePublishLater = () => {
    message.info('Tarea guardada como borrador. Puedes publicarla más tarde desde la lista de tareas.');
    setPublishModalVisible(false);
    setCreatedTaskId(null);
  };

  const handleCloseTask = async (taskId: string) => {
    try {
      await apiClient.patch(`/tasks/task/${taskId}`, { status: TaskStatus.CLOSED });
      message.success('Tarea cerrada exitosamente');
      fetchTasks();
      fetchStatistics();
    } catch (error: any) {
      console.error('Error closing task:', error);
      message.error(error.response?.data?.message || 'Error al cerrar la tarea');
    }
  };

  const openEditModal = async (task: Task) => {
    setSelectedTask(task);
    // Mapear campos del task al formulario
    // NOTA: El entity usa 'teachernotes' (lowercase), pero el form usa 'teacherNotes'
    editForm.setFieldsValue({
      title: task.title,
      status: task.status,
      description: task.description,
      teacherNotes: (task as any).teachernotes || '', // Mapear teachernotes → teacherNotes
      assignedDate: dayjs(task.assignedDate),
      dueDate: dayjs(task.dueDate),
      allowedFileTypes: task.allowedFileTypes ? JSON.parse(task.allowedFileTypes) : undefined,
      latePenalty: task.latePenalty ? task.latePenalty * 100 : undefined,
    });

    // Cargar información de estudiantes asignados
    setSelectedSubjectAssignmentId(task.subjectAssignmentId);

    // Cargar todos los estudiantes si no están cargados
    if (availableStudents.length === 0) {
      await fetchAllMyStudents();
    }

    // Cargar estudiantes actualmente asignados a esta tarea
    try {
      const response = await apiClient.get(`/tasks/assigned-students/${task.id}`);
      // Filtrar valores null/undefined para evitar error de validación en backend
      const assignedStudentIds = response.data
        .map((s: any) => s.studentId || s.id)
        .filter((id: string | null | undefined): id is string => id !== null && id !== undefined);
      setSelectedStudentIds(assignedStudentIds);
    } catch (error) {
      console.error('Error loading assigned students:', error);
      // Si falla, intentar desde submissions
      if (task.submissions && task.submissions.length > 0) {
        const studentIds = task.submissions.map(s => s.student?.id || s.studentId).filter(Boolean);
        setSelectedStudentIds(studentIds);
      } else {
        setSelectedStudentIds([]);
      }
    }

    setEditModalVisible(true);
  };

  const openDetailDrawer = (task: Task) => {
    setSelectedTask(task);
    setDetailDrawerVisible(true);
  };

  const openAttachmentModal = (task: Task) => {
    setAttachmentTaskId(task.id);
    setSelectedTask(task);
    setAttachmentModalVisible(true);
  };

  const closeAttachmentModal = () => {
    setAttachmentModalVisible(false);
    setAttachmentTaskId(null);
  };

  const getSubmissionProgress = (task: Task) => {
    const total = task.submissions.length;
    const submitted = task.submissions.filter(s => s.status !== 'not_submitted').length;
    return total > 0 ? Math.round((submitted / total) * 100 * 10) / 10 : 0;
  };


  // Columnas móviles - vista de tarjeta compacta
  const mobileColumns: ColumnsType<Task> = [
    {
      title: 'Tarea',
      key: 'mobile',
      render: (_, record) => {
        const isTestYourself = record.taskType === 'exam';
        const progress = getSubmissionProgress(record);
        const submitted = record.submissions.filter(s => s.status !== 'not_submitted').length;
        const total = record.submissions.length;

        return (
          <div className={`py-2 ${isTestYourself ? 'bg-purple-50 -mx-4 px-4 rounded' : ''}`}>
            {/* Header: Título y estado */}
            <div className="flex items-center justify-between mb-2">
              <Text strong className="text-sm truncate" style={{ maxWidth: '200px' }}>
                {record.title}
              </Text>
              <div className="flex gap-1">
                {isTestYourself && (
                  <Tag color="purple" className="text-xs">Test Yourself</Tag>
                )}
                <Tag color={TASK_STATUS_COLORS[record.status]} className="text-xs">
                  {TASK_STATUS_LABELS[record.status]}
                </Tag>
              </div>
            </div>

            {/* Info: Tipo y asignatura */}
            <div className="text-xs text-gray-500 mb-2">
              {isTestYourself ? 'Evaluación presencial' : TASK_TYPE_LABELS[record.taskType]} • {record.subjectAssignment.subject.name}
            </div>

            {/* Fechas */}
            <div className="text-xs mb-2">
              <div className="flex items-center gap-1 mb-1">
                <ClockCircleOutlined className={dayjs().isAfter(record.dueDate) ? 'text-red-500' : 'text-orange-500'} style={{ fontSize: '10px' }} />
                <span className={dayjs().isAfter(record.dueDate) ? 'text-red-600 font-medium' : ''}>
                  {isTestYourself ? 'Fecha:' : 'Entrega:'} {dayjs(record.dueDate).format('DD/MM HH:mm')}
                </span>
              </div>
            </div>

            {/* Aviso Test Yourself */}
            {isTestYourself && (
              <div className="text-xs text-purple-600 bg-purple-100 p-2 rounded mb-2">
                📋 Evaluación presencial - Sin entrega digital
              </div>
            )}

            {/* Progreso - Solo para tareas regulares */}
            {!isTestYourself && (
              <div className="mb-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Entregas: {submitted}/{total}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress
                  percent={progress}
                  size="small"
                  strokeColor={progress >= 80 ? '#52c41a' : progress >= 50 ? '#faad14' : '#ff4d4f'}
                />
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-1 pt-2 border-t border-gray-100 flex-wrap">
              <Button size="small" type="primary" ghost icon={<EyeOutlined />} onClick={() => openDetailDrawer(record)}>
                Ver
              </Button>
              <Button size="small" icon={<EditOutlined />} onClick={() => openEditModal(record)} disabled={yearIsArchived}>
                Editar
              </Button>
              {record.status === TaskStatus.DRAFT && (
                <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => handlePublishTask(record.id)} disabled={yearIsArchived}>
                  Publicar
                </Button>
              )}
              <Popconfirm
                title="¿Eliminar?"
                onConfirm={() => handleDeleteTask(record.id)}
                okText="Sí"
                cancelText="No"
                disabled={yearIsArchived}
              >
                <Button size="small" danger icon={<DeleteOutlined />} disabled={yearIsArchived} />
              </Popconfirm>
            </div>
          </div>
        );
      },
    },
  ];

  // Columnas desktop - tabla completa
  const desktopColumns: ColumnsType<Task> = [
    {
      title: 'Tarea',
      key: 'task',
      width: 300,
      render: (_, record) => {
        const isTestYourself = record.taskType === 'exam';
        return (
          <div className={isTestYourself ? 'bg-purple-50 -m-2 p-2 rounded' : ''}>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Text strong className="text-base">{record.title}</Text>
              {isTestYourself && (
                <Tag color="purple">Test Yourself</Tag>
              )}
              <Tag color={TASK_PRIORITY_COLORS[record.priority]}>
                {TASK_PRIORITY_LABELS[record.priority]}
              </Tag>
              <Tag color={TASK_STATUS_COLORS[record.status]}>
                {TASK_STATUS_LABELS[record.status]}
              </Tag>
            </div>
            <div className="text-sm mb-1">
              <span className="text-gray-500">
                {isTestYourself ? 'Evaluación presencial' : TASK_TYPE_LABELS[record.taskType]} • {record.subjectAssignment.subject.name}
              </span>
            </div>
            {record.description && (
              <div className="text-sm text-gray-600 truncate max-w-sm">
                {record.description}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Fechas',
      key: 'dates',
      width: 180,
      render: (_, record) => {
        const isTestYourself = record.taskType === 'exam';
        return (
          <div className="text-sm">
            <div className="flex items-center gap-1 mb-1">
              <CalendarOutlined className="text-blue-500" />
              <span>Asignada: {dayjs(record.assignedDate).format('DD/MM/YYYY')}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockCircleOutlined className={dayjs().isAfter(record.dueDate) ? 'text-red-500' : 'text-orange-500'} />
              <span className={dayjs().isAfter(record.dueDate) ? 'text-red-600 font-medium' : ''}>
                {isTestYourself ? 'Fecha:' : 'Entrega:'} {dayjs(record.dueDate).format('DD/MM/YYYY HH:mm')}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Progreso Entregas',
      key: 'submissions',
      width: 200,
      render: (_, record) => {
        const isTestYourself = record.taskType === 'exam';

        // Test Yourself no tienen entregas
        if (isTestYourself) {
          return (
            <div className="text-center text-purple-600 bg-purple-50 p-2 rounded">
              <div className="text-xs">📋 Sin entrega digital</div>
              <div className="text-xs text-gray-500">Evaluación presencial</div>
            </div>
          );
        }

        const progress = getSubmissionProgress(record);
        const submitted = record.submissions.filter(s => s.status !== 'not_submitted').length;
        const total = record.submissions.length;

        return (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Entregadas: {submitted}/{total}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress
              percent={progress}
              strokeColor={progress >= 80 ? '#52c41a' : progress >= 50 ? '#faad14' : '#ff4d4f'}
            />
          </div>
        );
      },
    },
    {
      title: 'Progreso Calificación',
      key: 'grading',
      width: 200,
      render: (_, record) => {
        const isTestYourself = record.taskType === 'exam';

        // Test Yourself se califican por otro sistema (exam_grades)
        if (isTestYourself) {
          return (
            <div className="text-center text-purple-600 bg-purple-50 p-2 rounded">
              <div className="text-xs">📝 Calificación manual</div>
              <div className="text-xs text-gray-500">Ver en Test Yourself</div>
            </div>
          );
        }

        const total = record.submissions.length;
        const graded = record.submissions.filter(s => s.isGraded).length;
        const submitted = record.submissions.filter(s => s.status !== 'not_submitted').length;
        const progress = submitted > 0 ? Math.round((graded / submitted) * 100 * 10) / 10 : 0;

        return (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Calificadas: {graded}/{submitted}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress
              percent={progress}
              strokeColor={progress >= 80 ? '#52c41a' : progress >= 50 ? '#faad14' : '#ff4d4f'}
            />
          </div>
        );
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver detalles">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openDetailDrawer(record)}
            />
          </Tooltip>

          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              disabled={yearIsArchived}
            />
          </Tooltip>

          <Tooltip title="Archivos Adjuntos">
            <Button
              type="text"
              icon={<PaperClipOutlined />}
              onClick={() => openAttachmentModal(record)}
            />
          </Tooltip>

          {record.status === TaskStatus.DRAFT && (
            <Tooltip title="Publicar">
              <Button
                type="text"
                icon={<SendOutlined />}
                className="text-green-600"
                onClick={() => handlePublishTask(record.id)}
                disabled={yearIsArchived}
              />
            </Tooltip>
          )}

          {record.status === TaskStatus.PUBLISHED && (
            <Tooltip title="Cerrar">
              <Button
                type="text"
                icon={<CheckCircleOutlined />}
                className="text-orange-600"
                onClick={() => handleCloseTask(record.id)}
                disabled={yearIsArchived}
              />
            </Tooltip>
          )}

          <Popconfirm
            title="¿Eliminar tarea?"
            description="Esta acción no se puede deshacer"
            onConfirm={() => handleDeleteTask(record.id)}
            okText="Eliminar"
            cancelText="Cancelar"
            disabled={yearIsArchived}
          >
            <Tooltip title="Eliminar">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={yearIsArchived}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Seleccionar columnas según dispositivo
  const columns = isMobile ? mobileColumns : desktopColumns;

  return (
    <div className="tasks-page" style={{ padding: isMobile ? '12px' : '24px' }}>
      <SectionInfoBanner text="Deberes/trabajos evaluables con entrega digital y nota." />
      {/* Header con estadísticas */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} className="mb-6">
        <Col span={24}>
          <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={12}>
                <Space size={isMobile ? 'small' : 'middle'}>
                  <BookOutlined style={{ fontSize: isMobile ? '20px' : '24px', color: '#1890ff' }} />
                  <div>
                    <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                      {isMobile ? 'Tareas' : 'Gestión de Tareas'}
                    </Title>
                    {!isMobile && (
                      <Text type="secondary">Administra y supervisa las tareas asignadas</Text>
                    )}
                  </div>
                </Space>
              </Col>
              <Col xs={24} md={12} className={isMobile ? '' : 'text-right'}>
                {!yearIsArchived && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size={isMobile ? 'middle' : 'large'}
                    onClick={() => setCreateModalVisible(true)}
                    block={isMobile}
                  >
                    Nueva Tarea
                  </Button>
                )}
              </Col>
            </Row>
            {yearIsArchived && (
              <Row className="mt-3">
                <Col span={24}>
                  <Alert type="info" showIcon message="Año archivado — solo consulta" />
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        {/* Estadísticas - 2x2 en móvil */}
        {statistics && (
          <>
            <Col xs={12} sm={6}>
              <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Total</span>}
                  value={statistics.totalTasks}
                  prefix={<BookOutlined />}
                  valueStyle={{ color: '#1890ff', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Publicadas</span>}
                  value={statistics.publishedTasks}
                  prefix={<SendOutlined />}
                  valueStyle={{ color: '#52c41a', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Pendientes</span>}
                  value={statistics.pendingSubmissions}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={<span style={{ fontSize: isMobile ? '11px' : '14px' }}>Promedio</span>}
                  value={statistics.averageGrade}
                  precision={1}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#722ed1', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* Filtros - Stack en móvil */}
      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]} className="mb-4">
        <Col xs={24} sm={12} lg={4}>
          <AcademicYearSelector
            value={selectedYearId}
            onChange={setSelectedYearId}
            onYearMetaChange={(m) => setYearIsArchived(m.isArchived)}
          />
        </Col>
        <Col xs={24} lg={6}>
          <Input
            placeholder={isMobile ? "Buscar..." : "Buscar tareas..."}
            prefix={<SearchOutlined />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            allowClear
            size={isMobile ? 'middle' : 'large'}
          />
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Select
            placeholder="Estado"
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
            allowClear
            style={{ width: '100%' }}
            size={isMobile ? 'middle' : 'large'}
          >
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Select
            placeholder="Tipo"
            value={filters.taskType}
            onChange={(value) => setFilters({ ...filters, taskType: value, page: 1 })}
            allowClear
            style={{ width: '100%' }}
            size={isMobile ? 'middle' : 'large'}
          >
            {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
        </Col>
        {!isMobile && (
          <>
            <Col xs={24} sm={8} lg={4}>
              <Select
                placeholder="Prioridad"
                value={filters.priority}
                onChange={(value) => setFilters({ ...filters, priority: value, page: 1 })}
                allowClear
                style={{ width: '100%' }}
                size="large"
              >
                {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                  <Option key={value} value={value}>{label}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={24} lg={6}>
              <RangePicker
                placeholder={['Fecha inicio', 'Fecha fin']}
                onChange={(dates) => {
                  if (dates) {
                    setFilters({
                      ...filters,
                      startDate: dates[0]?.format('YYYY-MM-DD'),
                      endDate: dates[1]?.format('YYYY-MM-DD'),
                      page: 1,
                    });
                  } else {
                    setFilters({
                      ...filters,
                      startDate: undefined,
                      endDate: undefined,
                      page: 1,
                    });
                  }
                }}
                style={{ width: '100%' }}
                size="large"
              />
            </Col>
          </>
        )}
      </Row>

      {/* Tabla de tareas */}
      <Card bodyStyle={{ padding: isMobile ? '8px' : '24px' }}>
        <Table
          columns={columns}
          dataSource={tasks}
          loading={loading}
          size={isMobile ? 'small' : 'middle'}
          pagination={{
            current: filters.page,
            pageSize: isMobile ? 5 : filters.limit,
            total,
            showSizeChanger: !isMobile,
            showQuickJumper: !isMobile,
            showTotal: isMobile ? undefined : (total, range) => `${range[0]}-${range[1]} de ${total} tareas`,
            simple: isMobile,
            onChange: (page, pageSize) => {
              setFilters({ ...filters, page, limit: pageSize });
            },
          }}
          rowKey="id"
          scroll={isMobile ? undefined : { x: 1200 }}
        />
      </Card>

      {/* Modal crear tarea */}
      <Modal
        title={isMobile ? "Nueva Tarea" : "Crear Nueva Tarea"}
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
          setSelectedRubric(null);
          setRubricSelectorVisible(false);
          setSelectedStudentIds([]);
          setSelectedSubjectAssignmentId('');
        }}
        footer={null}
        width={isMobile ? '95vw' : isTablet ? '90vw' : 800}
        style={{ top: isMobile ? 20 : undefined }}
        styles={{ body: { padding: isMobile ? '12px' : '24px', maxHeight: isMobile ? '80vh' : undefined, overflowY: isMobile ? 'auto' : undefined } }}
        destroyOnHidden
        zIndex={1000}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateTask}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Título"
                rules={[{ required: true, message: 'El título es requerido' }]}
              >
                <Input placeholder="Título de la tarea" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="subjectAssignmentIds"
                label="Asignaturas / Grupos"
                rules={[{ required: true, message: 'Selecciona al menos una asignatura' }]}
                extra="Puedes seleccionar múltiples asignaturas/grupos para esta tarea"
              >
                <Select
                  mode="multiple"
                  placeholder="Selecciona una o más asignaturas"
                  onChange={(values: string[]) => {
                    if (values && values.length > 0) {
                      setSelectedSubjectAssignmentId(values[0]);
                    } else {
                      setSelectedSubjectAssignmentId('');
                    }
                  }}
                  optionFilterProp="children"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {subjectAssignments.map(assignment => (
                    <Option key={assignment.id} value={assignment.id}>
                      {assignment.subject.name} - {assignment.classGroup.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Selección de estudiantes específicos */}
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Asignar a Estudiantes Específicos (Opcional)"
              >
                <div className="space-y-2">
                  <Button
                    type="default"
                    icon={<TeamOutlined />}
                    block
                    onClick={handleOpenStudentSelector}
                    disabled={!selectedSubjectAssignmentId}
                  >
                    {selectedStudentIds.length === 0
                      ? 'Seleccionar Estudiantes (Por defecto: Toda la clase)'
                      : `${selectedStudentIds.length} Estudiantes Seleccionados`
                    }
                  </Button>
                  {selectedStudentIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-center justify-between">
                        <Text strong className="text-blue-800">
                          {selectedStudentIds.length} Estudiantes Seleccionados
                        </Text>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setSelectedStudentIds([])}
                        >
                          Limpiar Selección
                        </Button>
                      </div>
                      <Text type="secondary" className="text-sm block mt-1">
                        La tarea solo se asignará a los estudiantes seleccionados
                      </Text>
                    </div>
                  )}
                  {!selectedSubjectAssignmentId && (
                    <Text type="secondary" className="text-sm">
                      Primero selecciona una asignatura para elegir estudiantes específicos
                    </Text>
                  )}
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Descripción (Visible para padres)"
          >
            <TextArea 
              rows={3} 
              placeholder="Descripción general de la tarea que verán los padres"
            />
          </Form.Item>

          <Form.Item
            name="teacherNotes"
            label="Notas del Profesor (Solo para profesores)"
          >
            <TextArea 
              rows={3} 
              placeholder="Notas privadas que solo verán los profesores"
            />
          </Form.Item>

          <Form.Item
            name="instructions"
            label="Instrucciones"
          >
            <TextArea 
              rows={4} 
              placeholder="Instrucciones detalladas para completar la tarea"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="taskType"
                label="Tipo de Tarea"
                rules={[{ required: true, message: 'El tipo es requerido' }]}
              >
                <Select 
                  placeholder="Seleccionar tipo"
                >
                  {Object.entries(TASK_TYPE_LABELS)
                    .filter(([value]) => value !== 'exam') // Excluir Test Yourself del selector
                    .map(([value, label]) => (
                      <Option key={value} value={value}>
                        {label}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="priority"
                label="Prioridad"
                initialValue={TaskPriority.MEDIUM}
              >
                <Select>
                  {Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => (
                    <Option key={value} value={value}>{label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="valuationType"
                label="Tipo de Evaluación"
                initialValue="score"
                rules={[{ required: true, message: 'Selecciona un tipo de evaluación' }]}
              >
                <Select
                  placeholder="Seleccionar tipo de evaluación"
                  onChange={(value) => {
                    if (value !== 'rubric') {
                      createForm.setFieldsValue({ rubricId: undefined });
                      setSelectedRubric(null);
                    }
                  }}
                >
                  <Option value="emoji">😊 Emojis (Muy Bien, Bien, Regular)</Option>
                  <Option value="score">🔢 Puntuación Numérica</Option>
                  <Option value="rubric">📋 Rúbrica de Evaluación</Option>
                </Select>
              </Form.Item>
            </Col>
            
            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.valuationType !== curr.valuationType}>
              {({ getFieldValue }) => {
                const valuationType = getFieldValue('valuationType')
                
                if (valuationType === 'score') {
                  return (
                    <Col span={12}>
                      <Form.Item
                        name="maxPoints"
                        label="Puntuación Máxima"
                        rules={[
                          { required: true, message: 'La puntuación máxima es requerida' },
                          { type: 'number', min: 1, max: 100, message: 'Entre 1 y 100' }
                        ]}
                      >
                        <InputNumber 
                          min={1} 
                          max={100} 
                          placeholder="10"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                  )
                }
                
                if (valuationType === 'rubric') {
                  return (
                    <Col span={12}>
                      <Form.Item
                        name="rubricId"
                        label="Rúbrica de Evaluación"
                        rules={[{ required: true, message: 'Selecciona una rúbrica' }]}
                      >
                        <div className="space-y-2">
                          <Button
                            type="default"
                            icon={<BookOutlined />}
                            block
                            size="large"
                            onClick={() => setRubricSelectorVisible(true)}
                            className="h-auto py-3"
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-base font-medium">
                                {selectedRubric ? selectedRubric.name : 'Seleccionar Rúbrica'}
                              </span>
                              {selectedRubric && (
                                <Space className="text-sm text-gray-500 mt-1">
                                  <span>{selectedRubric.criteriaCount} criterios</span>
                                  <span>•</span>
                                  <span>{selectedRubric.levelsCount} niveles</span>
                                  <span>•</span>
                                  <span>{selectedRubric.maxScore} pts</span>
                                </Space>
                              )}
                            </div>
                          </Button>
                          
                          {selectedRubric && (
                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Text strong className="text-blue-800">Rúbrica Seleccionada</Text>
                                  {selectedRubric.teacherId !== currentTeacherId && (
                                    <Tag color="cyan" size="small" className="ml-2">
                                      Compartida
                                    </Tag>
                                  )}
                                </div>
                                <Space>
                                  <Button
                                    type="link"
                                    size="small"
                                    onClick={() => setRubricViewerVisible(true)}
                                  >
                                    Vista previa
                                  </Button>
                                  <Button
                                    type="link"
                                    size="small"
                                    onClick={() => {
                                      setSelectedRubric(null);
                                      createForm.setFieldsValue({ rubricId: undefined, maxPoints: undefined });
                                    }}
                                  >
                                    Cambiar
                                  </Button>
                                </Space>
                              </div>
                              {selectedRubric.description && (
                                <Text type="secondary" className="text-sm block mt-1">
                                  {selectedRubric.description}
                                </Text>
                              )}
                            </div>
                          )}
                        </div>
                      </Form.Item>
                    </Col>
                  )
                }
                
                return (
                  <Col span={12}>
                    <Form.Item
                      name="maxPoints"
                      label="Puntuación Máxima"
                    >
                      <InputNumber
                        min={0}
                        max={100}
                        placeholder="10"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                )
              }}
            </Form.Item>
          </Row>

          {/* Vista previa de rúbrica seleccionada */}
          {selectedRubric && (
            <Form.Item label="Vista Previa de la Rúbrica">
              <Card size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Text strong>{selectedRubric.name}</Text>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setRubricViewerVisible(true)}
                    >
                      Ver completa
                    </Button>
                  </Space>
                  {selectedRubric.description && (
                    <Text type="secondary">{selectedRubric.description}</Text>
                  )}
                  <Space>
                    <Tag color="blue">{selectedRubric.criteriaCount} criterios</Tag>
                    <Tag color="purple">{selectedRubric.levelsCount} niveles</Tag>
                    <Tag color="orange">Máximo {selectedRubric.maxScore} puntos</Tag>
                  </Space>
                </Space>
              </Card>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignedDate"
                label="Fecha de Asignación"
                rules={[{ required: true, message: 'La fecha de asignación es requerida' }]}
              >
                <DatePicker 
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Seleccionar fecha de asignación"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="Fecha de Entrega"
                rules={[{ 
                  required: true, 
                  message: 'La fecha de entrega es requerida' 
                }]}
              >
                <DatePicker 
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                  placeholder="Seleccionar fecha de entrega"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="allowLateSubmission"
                label="Permitir Entregas Tardías"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="latePenalty"
                label="Penalización por Retraso (%)"
                initialValue={20}
              >
                <InputNumber
                  min={0}
                  max={100}
                  addonAfter="%"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="notifyFamilies"
                label="Notificar a Familias"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="requiresFile"
                label="Requiere Archivo Adjunto"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="maxFileSizeMB"
                label="Tamaño Máximo Archivo (MB)"
                initialValue={10}
              >
                <InputNumber
                  min={1}
                  max={100}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="allowedFileTypes"
            label="Tipos de Archivo Permitidos"
          >
            <Select
              mode="tags"
              placeholder="Selecciona tipos de archivo o escribe otros..."
              tokenSeparators={[',']}
            >
              <Option value="pdf">PDF (.pdf)</Option>
              <Option value="doc">Word (.doc)</Option>
              <Option value="docx">Word (.docx)</Option>
              <Option value="txt">Texto (.txt)</Option>
              <Option value="jpg">Imagen JPEG (.jpg)</Option>
              <Option value="jpeg">Imagen JPEG (.jpeg)</Option>
              <Option value="png">Imagen PNG (.png)</Option>
              <Option value="gif">Imagen GIF (.gif)</Option>
              <Option value="xls">Excel (.xls)</Option>
              <Option value="xlsx">Excel (.xlsx)</Option>
              <Option value="ppt">PowerPoint (.ppt)</Option>
              <Option value="pptx">PowerPoint (.pptx)</Option>
              <Option value="zip">ZIP (.zip)</Option>
              <Option value="rar">RAR (.rar)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="rubric"
            label="Criterios de Evaluación"
          >
            <TextArea 
              rows={3} 
              placeholder="Describe los criterios de evaluación..."
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setCreateModalVisible(false);
                createForm.resetFields();
                setSelectedRubric(null);
                setRubricSelectorVisible(false);
                setSelectedStudentIds([]);
                setSelectedSubjectAssignmentId('');
              }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                Crear Tarea
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal editar tarea */}
      <Modal
        title="Editar Tarea"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setSelectedTask(null);
          setSelectedStudentIds([]);
          setSelectedSubjectAssignmentId('');
        }}
        footer={null}
        width={isMobile ? '95vw' : isTablet ? '90vw' : 800}
        style={{ top: isMobile ? 20 : undefined }}
        styles={{ body: { padding: isMobile ? '12px' : '24px', maxHeight: isMobile ? '80vh' : undefined, overflowY: isMobile ? 'auto' : undefined } }}
        destroyOnHidden
        zIndex={1000}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateTask}
        >
          {/* Similar al formulario de crear, pero con campos pre-populados */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Título"
                rules={[{ required: true, message: 'El título es requerido' }]}
              >
                <Input placeholder="Título de la tarea" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Estado"
              >
                <Select>
                  {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
                    <Option key={value} value={value}>{label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Descripción (Visible para padres)"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="teacherNotes"
            label="Notas del Profesor (Solo para profesores)"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignedDate"
                label="Fecha de Asignación"
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="Fecha de Entrega"
              >
                <DatePicker
                  showTime
                  format="DD/MM/YYYY HH:mm"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Selección de estudiantes específicos */}
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Estudiantes Asignados (Editable)"
              >
                <div className="space-y-2">
                  <Button
                    type="default"
                    icon={<TeamOutlined />}
                    block
                    onClick={handleOpenStudentSelector}
                  >
                    {selectedStudentIds.length === 0
                      ? 'Seleccionar Estudiantes (Por defecto: Toda la clase)'
                      : `${selectedStudentIds.length} Estudiantes Seleccionados`
                    }
                  </Button>
                  {selectedStudentIds.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-3">
                      <div className="flex items-center justify-between">
                        <Text strong className="text-blue-800">
                          {selectedStudentIds.length} Estudiantes Seleccionados
                        </Text>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => setSelectedStudentIds([])}
                        >
                          Limpiar Selección (Asignar a toda la clase)
                        </Button>
                      </div>
                      <Text type="secondary" className="text-sm block mt-1">
                        La tarea se asignará solo a los estudiantes seleccionados
                      </Text>
                    </div>
                  )}
                  <Text type="secondary" className="text-sm block">
                    💡 Puedes agregar o quitar estudiantes. Si no seleccionas ninguno, la tarea se asignará a toda la clase.
                  </Text>
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setEditModalVisible(false);
                editForm.resetFields();
                setSelectedTask(null);
                setSelectedStudentIds([]);
                setSelectedSubjectAssignmentId('');
              }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                Actualizar Tarea
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer de detalles */}
      <Drawer
        title="Detalles de la Tarea"
        placement="right"
        width={isMobile ? '100%' : isTablet ? '80%' : 600}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedTask(null);
        }}
        styles={{ body: { padding: isMobile ? '12px' : '24px' } }}
      >
        {selectedTask && (
          <div>
            <div className="mb-6">
              <Title level={4}>{selectedTask.title}</Title>
              <Space wrap>
                <Tag color={TASK_STATUS_COLORS[selectedTask.status]}>
                  {TASK_STATUS_LABELS[selectedTask.status]}
                </Tag>
                <Tag color={TASK_PRIORITY_COLORS[selectedTask.priority]}>
                  {TASK_PRIORITY_LABELS[selectedTask.priority]}
                </Tag>
                <Tag>{TASK_TYPE_LABELS[selectedTask.taskType]}</Tag>
              </Space>
            </div>

            <Divider />

            <div className="space-y-4">
              <div>
                <Text strong>Asignatura:</Text>
                <div>{selectedTask.subjectAssignment.subject.name} ({selectedTask.subjectAssignment.subject.code})</div>
              </div>

              <div>
                <Text strong>Grupo:</Text>
                <div>{selectedTask.subjectAssignment.classGroup.name}</div>
              </div>

              <div>
                <Text strong>Descripción:</Text>
                <div>{selectedTask.description || 'Sin descripción'}</div>
              </div>

              <div>
                <Text strong>Instrucciones:</Text>
                <div>{selectedTask.instructions || 'Sin instrucciones'}</div>
              </div>

              <div>
                <Text strong>Fechas:</Text>
                <div>Asignada: {dayjs(selectedTask.assignedDate).format('DD/MM/YYYY HH:mm')}</div>
                <div>Entrega: {dayjs(selectedTask.dueDate).format('DD/MM/YYYY HH:mm')}</div>
              </div>

              <div>
                <Text strong>Configuración:</Text>
                <ul>
                  <li>Puntuación máxima: {selectedTask.maxPoints || 'No definida'}</li>
                  <li>Entregas tardías: {selectedTask.allowLateSubmission ? 'Permitidas' : 'No permitidas'}</li>
                  {selectedTask.allowLateSubmission && (
                    <li>Penalización: {Math.round(selectedTask.latePenalty * 100 * 10) / 10}%</li>
                  )}
                  <li>Requiere archivo: {selectedTask.requiresFile ? 'Sí' : 'No'}</li>
                  <li>Notificar familias: {selectedTask.notifyFamilies ? 'Sí' : 'No'}</li>
                </ul>
              </div>

              <Divider />

              <div>
                <Text strong>Entregas ({selectedTask.submissions.length}):</Text>
                <List
                  size="small"
                  dataSource={selectedTask.submissions}
                  renderItem={(submission) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} />}
                        title={`${submission.student.user.profile.firstName} ${submission.student.user.profile.lastName}`}
                        description={
                          <Space>
                            <Tag color={SUBMISSION_STATUS_COLORS[submission.status]}>
                              {SUBMISSION_STATUS_LABELS[submission.status]}
                            </Tag>
                            {submission.isGraded && submission.finalGrade !== null && submission.finalGrade !== undefined && !isNaN(submission.finalGrade) && (
                              <Tag color="blue">
                                Nota: {formatTaskGrade(submission.finalGrade, false, 10).split('/')[0]}
                              </Tag>
                            )}
                            {submission.isLate && (
                              <Tag color="orange">Tardía</Tag>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Task Attachments Section */}
      <Modal
        title={
          (
            <Space>
              <PaperClipOutlined />
              <span>{isMobile ? 'Archivos' : `Archivos Adjuntos - ${selectedTask?.title || 'Tarea'}`}</span>
            </Space>
          )
        }
        open={attachmentModalVisible}
        onCancel={closeAttachmentModal}
        footer={null}
        width={isMobile ? '95vw' : isTablet ? '90vw' : 1400}
        style={{ top: isMobile ? 10 : 20 }}
        styles={{ body: { padding: isMobile ? '8px' : 0 } }}
      >
        {attachmentTaskId && (
          <TaskAttachmentsSection
            taskId={attachmentTaskId}
            taskTitle={selectedTask?.title || 'Tarea'}
            isTeacher={true}
            readOnly={false}
            showTabs={true}
            defaultTab="explorer"
            className="p-6"
            onUploadComplete={() => {
              // Refresh tasks list when attachments are uploaded
              fetchTasks();
            }}
          />
        )}
      </Modal>

      {/* Modal visor de rúbrica */}
      <Modal
        title={selectedRubric?.name}
        open={rubricViewerVisible}
        onCancel={() => {
          setRubricViewerVisible(false);
        }}
        width={isMobile ? '95vw' : isTablet ? '90vw' : 1200}
        style={{ top: isMobile ? 20 : undefined }}
        styles={{ body: { padding: isMobile ? '8px' : '24px', overflowX: 'auto' } }}
        footer={[
          <Button key="close" onClick={() => setRubricViewerVisible(false)} block={isMobile}>
            Cerrar
          </Button>
        ]}
      >
        {selectedRubric && (
          <RubricGrid
            rubric={selectedRubric}
            editable={false}
            viewMode="view"
          />
        )}
      </Modal>

      {/* Modal selector de rúbricas */}
      <RubricSelectorModal
        visible={rubricSelectorVisible}
        onCancel={() => setRubricSelectorVisible(false)}
        onSelect={handleRubricSelect}
        rubrics={rubrics}
        currentTeacherId={currentTeacherId}
        loading={false}
        selectedRubricId={selectedRubric?.id}
      />

      {/* Modal de publicación inmediata */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleOutlined className="text-green-600 text-xl" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-800">¡Tarea creada exitosamente!</div>
              <div className="text-sm text-gray-500">¿Qué deseas hacer ahora?</div>
            </div>
          </div>
        }
        open={publishModalVisible}
        onCancel={handlePublishLater}
        footer={null}
        width={500}
        centered
        closable={false}
        className="publish-task-modal"
        afterOpenChange={(open) => {
          console.log('🔥 MODAL OPEN CHANGED:', open);
          console.log('🔥 publishModalVisible state:', publishModalVisible);
          console.log('🔥 createdTaskId:', createdTaskId);
        }}
      >
        <div className="py-6">
          <div className="text-center mb-8">
            <div className="text-gray-600 mb-4">
              Tu tarea se ha guardado como <strong>borrador</strong>. Puedes elegir publicarla ahora
              para que los estudiantes la reciban inmediatamente, o dejarla para más tarde.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* Opción: Publicar ahora */}
            <button
              onClick={handlePublishNow}
              className="group relative overflow-hidden rounded-lg border-2 border-green-200 bg-green-50 p-6 text-left transition-all hover:border-green-300 hover:bg-green-100 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center group-hover:bg-green-300 transition-colors">
                    <SendOutlined className="text-green-700 text-lg" />
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="font-semibold text-green-800 mb-1">
                    📢 Publicar Inmediatamente
                  </div>
                  <div className="text-sm text-green-700">
                    Los estudiantes recibirán la tarea ahora mismo y podrán empezar a trabajar
                  </div>
                </div>
              </div>
            </button>

            {/* Opción: Guardar para más tarde */}
            <button
              onClick={handlePublishLater}
              className="group relative overflow-hidden rounded-lg border-2 border-blue-200 bg-blue-50 p-6 text-left transition-all hover:border-blue-300 hover:bg-blue-100 hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center group-hover:bg-blue-300 transition-colors">
                    <ClockCircleOutlined className="text-blue-700 text-lg" />
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="font-semibold text-blue-800 mb-1">
                    ⏰ Dejar para Más Tarde
                  </div>
                  <div className="text-sm text-blue-700">
                    La tarea se mantendrá como borrador hasta que decidas publicarla manualmente
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>Consejo: Puedes publicar tareas desde la lista principal usando el botón</span>
              <SendOutlined className="text-blue-500" />
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal de selección de estudiantes */}
      <Modal
        title={isMobile ? "Seleccionar Estudiantes" : "Seleccionar Estudiantes para la Tarea"}
        open={studentSelectorVisible}
        onCancel={() => setStudentSelectorVisible(false)}
        onOk={() => setStudentSelectorVisible(false)}
        width={isMobile ? '95vw' : isTablet ? '90vw' : 800}
        style={{ top: isMobile ? 20 : undefined }}
        styles={{ body: { padding: isMobile ? '12px' : '24px' } }}
        okText="Confirmar"
        cancelText="Cancelar"
        zIndex={1100}
      >
        <div className="mb-4">
          <Text type="secondary">
            Selecciona los estudiantes que recibirán esta tarea. Si no seleccionas ninguno,
            la tarea se asignará a toda la clase automáticamente.
          </Text>
        </div>

        <Transfer
          dataSource={(() => {
            const mappedData = availableStudents.map(student => ({
              key: student.id,
              title: `${student.user.profile.firstName} ${student.user.profile.lastName}`,
              description: student.classGroup?.name || 'Sin grupo',
            }));
            return mappedData;
          })()}
          titles={isMobile ? ['Disp.', 'Selecc.'] : ['Disponibles', 'Seleccionados']}
          targetKeys={selectedStudentIds}
          onChange={handleStudentSelectionChange}
          render={item => item.title}
          showSearch
          filterOption={(inputValue, item) =>
            item.title.toLowerCase().includes(inputValue.toLowerCase())
          }
          listStyle={{
            width: isMobile ? '100%' : 350,
            height: isMobile ? 250 : 400,
          }}
          style={{ flexDirection: isMobile ? 'column' : 'row' }}
          loading={loadingStudents}
        />

        <div className="mt-4 p-3 bg-gray-50 rounded">
          <Text strong>Resumen:</Text>
          <div className="mt-2">
            {selectedStudentIds.length === 0 ? (
              <Text type="secondary">
                ℹ️ Ningún estudiante seleccionado - La tarea se asignará a toda la clase
              </Text>
            ) : (
              <Text type="success">
                ✓ {selectedStudentIds.length} estudiante(s) seleccionado(s)
              </Text>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TasksPage;