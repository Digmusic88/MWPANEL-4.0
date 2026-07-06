import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
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
  Row,
  Col,
  Statistic,
  Drawer,
  Avatar,
  Divider,
  Upload,
  Alert,
  Empty,
  Spin,
} from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  SendOutlined,
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  InboxOutlined,
  PaperClipOutlined,
  TableOutlined,
  EditOutlined,
  StarFilled,
  LikeOutlined,
  CheckOutlined,
  BookFilled,
  WarningFilled,
  QuestionCircleOutlined,
  AuditOutlined,
  FolderOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';
import { formatTaskGrade } from '../../utils/numberFormat';
import {
  Task,
  TaskSubmission,
  StudentTaskStatistics,
  SubmitTaskForm,
  TASK_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_COLORS,
} from '@/types/tasks';
import { TaskAttachmentsSection } from '../../components/attachments';
import AcademicYearSelector from '../../components/common/AcademicYearSelector';
import AttachNotesModal from '../../components/tasks/AttachNotesModal';
import tasksApi from '../../services/tasksApi';
import { useResponsive } from '../../hooks/useResponsive';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

interface StudentTasksQuery {
  page?: number;
  limit?: number;
  submissionStatus?: string;
  onlyPending?: boolean;
  onlyGraded?: boolean;
  subjectId?: string;
  startDate?: string;
  endDate?: string;
}

const StudentTasksPage: React.FC = () => {
  // Hook de responsividad
  const { isMobile, isTablet } = useResponsive();

  // Estados principales
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<StudentTaskStatistics | null>(null);
  const [examStatistics, setExamStatistics] = useState<{ total: number; upcoming: number; completed: number } | null>(null);
  
  // Estados de modales y formularios
  const [submitModalVisible, setSubmitModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [attachmentTaskId, setAttachmentTaskId] = useState<string | null>(null);
  const [attachNotesModalVisible, setAttachNotesModalVisible] = useState(false);
  const [selectedNotesToAttach, setSelectedNotesToAttach] = useState<Array<{ noteId: string; description?: string }>>([]);
  const [attachingNotes, setAttachingNotes] = useState(false);
  const [submitForm] = Form.useForm();
  
  // Estados de filtros y paginación
  const [filters, setFilters] = useState<StudentTasksQuery>({
    page: 1,
    limit: 10,
    onlyPending: true, // Filtro "Solo Pendientes" activado por defecto
  });
  const [total, setTotal] = useState(0);

  // Estado del selector de año académico (filtro de listado)
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined);

  // Estados para archivos
  const [fileList, setFileList] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Estados para detalles de rúbrica
  const [rubricDetailsVisible, setRubricDetailsVisible] = useState(false);
  const [rubricDetails, setRubricDetails] = useState<any>(null);
  const [loadingRubricDetails, setLoadingRubricDetails] = useState(false);
  
  // Estados para archivado
  const [archivingTaskId, setArchivingTaskId] = useState<string | null>(null);
  const [showArchivedTasks, setShowArchivedTasks] = useState(false);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [loadingArchivedTasks, setLoadingArchivedTasks] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchStatistics();
  }, [filters, selectedYearId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          // For boolean filters, only send them when they are true
          if (key === 'onlyPending' || key === 'onlyGraded') {
            if (value === true) {
              params.append(key, 'true');
            }
            // Don't send false values for boolean filters
          } else {
            params.append(key, value.toString());
          }
        }
      });
      if (selectedYearId) {
        params.append('academicYearId', selectedYearId);
      }

      const response = await apiClient.get(`/tasks/student/my-tasks?${params}`);
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
      const response = await apiClient.get('/tasks/student/statistics');
      const originalStats = response.data;
      
      // También obtener las tareas para calcular estadísticas separadas
      const tasksResponse = await apiClient.get('/tasks/student/my-tasks?limit=1000');
      const allTasks = Array.isArray(tasksResponse.data.tasks) ? tasksResponse.data.tasks : [];
      
      // Separar exámenes de tareas regulares
      const regularTasks = allTasks.filter((task: any) => task.taskType !== 'exam');
      const examTasks = allTasks.filter((task: any) => task.taskType === 'exam');
      
      // Calcular estadísticas solo para tareas regulares
      const submittedTasks = regularTasks.filter((task: any) => {
        const submission = task.submissions?.[0];
        return submission && (submission.status === 'submitted' || submission.status === 'late' || submission.isGraded);
      });
      
      const gradedTasks = regularTasks.filter((task: any) => {
        const submission = task.submissions?.[0];
        return submission && submission.isGraded;
      });
      
      // Calcular el promedio real de TODAS las tareas regulares calificadas (todas las asignaturas)
      let averageGrade = 0;
      
      console.log('🔍 DEBUG PROMEDIO TasksPage:');
      console.log('Total regular tasks:', regularTasks.length);
      console.log('Graded tasks:', gradedTasks.length);
      
      if (gradedTasks.length > 0) {
        let totalGradeSum = 0;
        let validGradesCount = 0;
        
        gradedTasks.forEach((task: any, index: number) => {
          const submission = task.submissions?.[0];
          const finalGrade = submission?.finalGrade;
          const maxPoints = task.maxPoints || 100;
          const subjectName = task.subjectAssignment?.subject?.name || 'Unknown';
          
          if (finalGrade !== null && finalGrade !== undefined && !isNaN(finalGrade)) {
            // Convertir a porcentaje para normalizar diferentes escalas
            const percentage = maxPoints > 0 ? (finalGrade / maxPoints) * 100 : 0;
            totalGradeSum += percentage;
            validGradesCount++;
            
            console.log(`Task ${index + 1} (${subjectName}): ${finalGrade}/${maxPoints} = ${percentage.toFixed(1)}%`);
          } else {
            console.log(`Task ${index + 1} (${subjectName}): Sin calificación válida`);
          }
        });
        
        if (validGradesCount > 0) {
          averageGrade = totalGradeSum / validGradesCount;
          console.log(`Promedio final: ${totalGradeSum.toFixed(1)} / ${validGradesCount} = ${averageGrade.toFixed(1)}%`);
        }
      } else {
        console.log('No hay tareas calificadas');
      }
      
      const regularTaskStats = {
        totalAssigned: regularTasks.length,
        submitted: submittedTasks.length,
        pending: regularTasks.filter((task: any) => {
          const submission = task.submissions?.[0];
          return !submission || submission.status === 'not_submitted';
        }).length,
        graded: gradedTasks.length,
        lateSubmissions: regularTasks.filter((task: any) => {
          const submission = task.submissions?.[0];
          return submission && submission.isLate;
        }).length,
        averageGrade: Math.round(averageGrade * 10) / 10, // Redondear a 1 decimal
        submissionRate: regularTasks.length > 0 ? 
          (submittedTasks.length / regularTasks.length) * 100 : 0
      };
      
      // Calcular estadísticas de exámenes
      const now = new Date();
      const examStats = {
        total: examTasks.length,
        upcoming: examTasks.filter((task: any) => {
          const dueDate = new Date(task.dueDate);
          return now <= dueDate;
        }).length,
        completed: examTasks.filter((task: any) => {
          const dueDate = new Date(task.dueDate);
          return now > dueDate;
        }).length
      };
      
      setStatistics(regularTaskStats);
      setExamStatistics(examStats);
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
    }
  };

  // Función para archivar una tarea
  const handleArchiveTask = async (taskId: string) => {
    try {
      setArchivingTaskId(taskId);
      await apiClient.post(`/tasks/student/${taskId}/archive`);
      message.success('Tarea archivada correctamente');
      fetchTasks(); // Refrescar la lista de tareas
    } catch (error: any) {
      console.error('Error archiving task:', error);
      message.error('Error al archivar la tarea');
    } finally {
      setArchivingTaskId(null);
    }
  };

  // Función para desarchivar una tarea
  const handleUnarchiveTask = async (taskId: string) => {
    try {
      setArchivingTaskId(taskId);
      await apiClient.post(`/tasks/student/${taskId}/unarchive`);
      message.success('Tarea desarchivada correctamente');
      fetchArchivedTasks(); // Refrescar la lista de tareas archivadas
      fetchTasks(); // Refrescar la lista de tareas activas
    } catch (error: any) {
      console.error('Error unarchiving task:', error);
      message.error('Error al desarchivar la tarea');
    } finally {
      setArchivingTaskId(null);
    }
  };

  // Función para obtener tareas archivadas
  const fetchArchivedTasks = async () => {
    try {
      setLoadingArchivedTasks(true);
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '100'); // Obtener todas las tareas archivadas

      const response = await apiClient.get(`/tasks/student/archived-tasks?${params}`);
      setArchivedTasks(response.data.tasks || []);
    } catch (error: any) {
      console.error('Error fetching archived tasks:', error);
      message.error('Error al cargar las tareas archivadas');
    } finally {
      setLoadingArchivedTasks(false);
    }
  };

  const handleSubmitTask = async (values: SubmitTaskForm) => {
    if (!selectedTask) return;

    try {
      setUploading(true);
      
      // Primero subir archivos si los hay
      if (fileList.length > 0) {
        const formData = new FormData();
        fileList.forEach(file => {
          formData.append('files', file.originFileObj);
        });

        // Encontrar la submission ID del estudiante actual
        const mySubmission = selectedTask.submissions?.[0];
        if (mySubmission) {
          await apiClient.post(`/tasks/submissions/${mySubmission.id}/attachments`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        }
      }

      // Luego enviar la tarea con apuntes adjuntos si los hay
      if (selectedNotesToAttach.length > 0) {
        // Usar el servicio que maneja apuntes y archivos
        await tasksApi.submitTask(selectedTask.id, {
          content: values.content,
          submissionNotes: values.submissionNotes,
          attachStudentNotes: selectedNotesToAttach,
        });
      } else {
        // Envío tradicional sin apuntes
        await apiClient.post(`/tasks/${selectedTask.id}/submit`, values);
      }

      message.success(`Tarea entregada exitosamente${selectedNotesToAttach.length > 0 ? ` con ${selectedNotesToAttach.length} apunte(s) adjunto(s)` : ''}`);
      setSubmitModalVisible(false);
      submitForm.resetFields();
      setFileList([]);
      setSelectedTask(null);
      setSelectedNotesToAttach([]);
      fetchTasks();
      fetchStatistics();
    } catch (error: any) {
      console.error('Error submitting task:', error);
      message.error(error.response?.data?.message || 'Error al entregar la tarea');
    } finally {
      setUploading(false);
    }
  };

  const openSubmitModal = (task: Task) => {
    setSelectedTask(task);
    const mySubmission = task.submissions?.[0];
    setSelectedSubmission(mySubmission || null);
    
    // Pre-llenar formulario si ya hay una entrega
    if (mySubmission && mySubmission.content) {
      submitForm.setFieldsValue({
        content: mySubmission.content,
        submissionNotes: mySubmission.submissionNotes,
      });
    }
    
    setSubmitModalVisible(true);
  };

  const openDetailDrawer = (task: Task) => {
    setSelectedTask(task);
    const mySubmission = task.submissions?.[0];
    setSelectedSubmission(mySubmission || null);
    setDetailDrawerVisible(true);
  };

  const openAttachmentModal = (task: Task) => {
    setAttachmentTaskId(task.id);
    setSelectedTask(task);
    setAttachmentModalVisible(true);
  };

  const openAttachNotesModal = () => {
    setAttachNotesModalVisible(true);
  };

  const closeAttachNotesModal = () => {
    setAttachNotesModalVisible(false);
  };

  const handleAttachNotes = async (selectedNotes: Array<{ noteId: string; description?: string }>) => {
    try {
      setAttachingNotes(true);
      setSelectedNotesToAttach(selectedNotes);
      setAttachNotesModalVisible(false);
      message.success(`${selectedNotes.length} apunte(s) seleccionado(s) para adjuntar`);
    } catch (error) {
      message.error('Error al seleccionar apuntes');
    } finally {
      setAttachingNotes(false);
    }
  };

  const closeAttachmentModal = () => {
    setAttachmentModalVisible(false);
    setAttachmentTaskId(null);
  };

  const fetchRubricDetails = async (submissionId: string) => {
    try {
      console.log('🔍 [DEBUG] Fetching rubric details for submission:', submissionId);
      setLoadingRubricDetails(true);
      const response = await apiClient.get(`/tasks/submissions/${submissionId}/rubric-details`);
      console.log('✅ [DEBUG] Rubric details response:', response.data);
      
      // Check specifically for cell content
      if (response.data.evaluationDetails) {
        response.data.evaluationDetails.forEach((detail: any, index: number) => {
          console.log(`[DEBUG] Criterion ${index + 1}: ${detail.criterion.name}`);
          console.log(`[DEBUG] Level: ${detail.selectedLevel?.name}`);
          console.log(`[DEBUG] Cell Content: "${detail.selectedLevel?.cellContent}"`);
          if (detail.selectedLevel?.cellContent === 'No se entiende lo que comunica o no participa') {
            console.log('🎯 [DEBUG] ✅ FOUND TARGET CONTENT in frontend!');
          }
        });
      }
      
      setRubricDetails(response.data);
      setRubricDetailsVisible(true);
    } catch (error: any) {
      console.error('❌ [DEBUG] Error fetching rubric details:', error);
      console.error('❌ [DEBUG] Error response:', error.response?.data);
      message.error('Error al cargar los detalles de la evaluación');
    } finally {
      setLoadingRubricDetails(false);
    }
  };

  const closeRubricDetails = () => {
    setRubricDetailsVisible(false);
    setRubricDetails(null);
  };

  const handleDownloadAttachment = async (attachmentId: string, filename: string) => {
    try {
      const response = await apiClient.get(`/tasks/attachments/${attachmentId}/download`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      message.error('Error al descargar el archivo');
    }
  };

  const getTaskStatus = (task: Task) => {
    const mySubmission = task.submissions?.[0];
    if (!mySubmission) return { status: 'not_assigned', color: '#d9d9d9', text: 'No asignada' };
    
    // Para tareas tipo EXAM (Test Yourself), mostrar como recordatorio
    if (task.taskType === 'exam') {
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      const isOverdue = now > dueDate;
      
      if (isOverdue) {
        return { status: 'exam_completed', color: '#52c41a', text: 'Test Yourself Realizado' };
      }
      return { status: 'exam_reminder', color: '#1890ff', text: 'Recordatorio de Test Yourself' };
    }
    
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const isOverdue = now > dueDate;
    
    if (mySubmission.isGraded) {
      return { status: 'graded', color: '#52c41a', text: 'Calificada' };
    }
    
    if (mySubmission.needsRevision) {
      return { status: 'needs_revision', color: '#722ed1', text: 'Necesita revisión' };
    }
    
    if (mySubmission.status === 'submitted' || mySubmission.status === 'late') {
      return { status: 'submitted', color: '#1890ff', text: 'Entregada' };
    }
    
    if (isOverdue) {
      return { status: 'overdue', color: '#ff4d4f', text: 'Atrasada' };
    }
    
    return { status: 'pending', color: '#faad14', text: 'Pendiente' };
  };

  const getSubmissionProgress = (task: Task) => {
    const mySubmission = task.submissions?.[0];
    if (!mySubmission) return 0;
    
    // Para tareas tipo EXAM (Test Yourself), mostrar progreso basado en fechas
    if (task.taskType === 'exam') {
      const now = new Date();
      const dueDate = new Date(task.dueDate);
      const assignedDate = new Date(task.assignedDate);
      
      if (now > dueDate) return 100; // Examen completado
      
      // Calcular progreso basado en tiempo transcurrido
      const totalTime = dueDate.getTime() - assignedDate.getTime();
      const elapsedTime = now.getTime() - assignedDate.getTime();
      const progress = Math.min(Math.max((elapsedTime / totalTime) * 100, 0), 100);
      
      return Math.round(progress);
    }
    
    if (mySubmission.isGraded) return 100;
    if (mySubmission.status === 'submitted' || mySubmission.status === 'late') return 75;
    if (mySubmission.content || (mySubmission.attachments && mySubmission.attachments.length > 0)) return 25;
    return 0;
  };

  const uploadProps = {
    name: 'files',
    multiple: true,
    fileList,
    onChange: (info: any) => {
      setFileList(info.fileList);
    },
    beforeUpload: (file: any) => {
      // Validar tamaño de archivo (máximo 10MB por defecto)
      const maxSize = selectedTask?.maxFileSizeMB || 10;
      const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
      if (!isLtMaxSize) {
        message.error(`El archivo debe ser menor a ${maxSize}MB`);
        return false;
      }

      // Validar tipos de archivo si están definidos en la tarea
      if (selectedTask?.allowedFileTypes && selectedTask.allowedFileTypes.length > 0) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        const isAllowedType = selectedTask.allowedFileTypes.some((type: string) => 
          type.toLowerCase() === fileExtension || 
          file.type.includes(type.toLowerCase())
        );
        
        if (!isAllowedType) {
          message.error(`Tipo de archivo no permitido. Tipos permitidos: ${selectedTask.allowedFileTypes.join(', ')}`);
          return false;
        }
      }

      return false; // No subir automáticamente
    },
    onRemove: (file: any) => {
      setFileList(fileList.filter(f => f.uid !== file.uid));
    },
  };

  const getTimeRemaining = (dueDate: dayjs.Dayjs) => {
    const now = dayjs();
    const totalHours = Math.ceil(dueDate.diff(now, 'hours', true));
    
    if (totalHours <= 0) return { text: '¡Tiempo agotado!', hours: 0 };
    
    if (totalHours < 24) {
      return { text: `${totalHours} horas`, hours: totalHours };
    } else {
      const days = Math.floor(totalHours / 24);
      const remainingHours = totalHours % 24;
      if (remainingHours === 0) {
        return { text: `${days} día${days > 1 ? 's' : ''}`, hours: totalHours };
      } else {
        return { text: `${days} día${days > 1 ? 's' : ''} y ${remainingHours} hora${remainingHours > 1 ? 's' : ''}`, hours: totalHours };
      }
    }
  };

  const renderTaskCard = (task: Task) => {
    const mySubmission = task.submissions?.[0];
    const taskStatus = getTaskStatus(task);
    const progress = getSubmissionProgress(task);
    const dueDate = dayjs(task.dueDate);
    const now = dayjs();
    const isOverdue = now.isAfter(dueDate);
    const timeRemaining = getTimeRemaining(dueDate);
    const hoursUntilDue = timeRemaining.hours;

    return (
      <Card
        key={task.id}
        className="mb-4 hover:shadow-md transition-shadow duration-200"
        actions={[
          <Button
            key="view"
            type="text"
            icon={<EyeOutlined />}
            onClick={() => openDetailDrawer(task)}
          >
            Ver Detalles
          </Button>,
          // Solo mostrar botón de entrega si NO es un Test Yourself (exam)
          task.taskType !== 'exam' && (mySubmission?.status === 'not_submitted' || mySubmission?.needsRevision) ? (
            <Button
              key="submit"
              type="text"
              icon={<SendOutlined />}
              onClick={() => openSubmitModal(task)}
              className="text-blue-600"
            >
              {mySubmission?.needsRevision ? 'Reenviar' : 'Entregar'}
            </Button>
          ) : task.taskType === 'exam' ? (
            <Button key="exam-reminder" type="text" disabled>
              Recordatorio de Test Yourself
            </Button>
          ) : (
            <Button key="submitted" type="text" disabled>
              {mySubmission?.isGraded ? 'Calificada' : 'Entregada'}
            </Button>
          ),
          // Botón de archivar para tareas calificadas (no exámenes)
          task.taskType !== 'exam' && mySubmission?.isGraded ? (
            <Button
              key="archive"
              type="text"
              icon={<FolderOutlined />}
              onClick={() => handleArchiveTask(task.id)}
              loading={archivingTaskId === task.id}
              className="text-green-600"
            >
              Archivar
            </Button>
          ) : null,
        ].filter(Boolean)}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Title level={5} className="!mb-0">{task.title}</Title>
                <Tag color={TASK_PRIORITY_COLORS[task.priority]}>
                  {TASK_PRIORITY_LABELS[task.priority]}
                </Tag>
                <Tag color={taskStatus.color}>
                  {taskStatus.text}
                </Tag>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{TASK_TYPE_LABELS[task.taskType]}</span>
                <span>•</span>
                <span>{task.subjectAssignment.subject.name}</span>
                <span>•</span>
                <span>{task.subjectAssignment.subject.code}</span>
              </div>
            </div>
            <div className="text-right">
              {mySubmission?.isGraded && (
                <div className="text-lg font-bold text-green-600">
                  {formatTaskGrade(mySubmission.finalGrade, !!task.rubricId, task.maxPoints)}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div className="text-gray-600 text-sm">
              {task.description}
            </div>
          )}

          {/* Progress */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Progreso</span>
              <span>{Math.round(progress * 10) / 10}%</span>
            </div>
            <Progress 
              percent={progress} 
              
              strokeColor={
                progress === 100 ? '#52c41a' : 
                progress >= 75 ? '#1890ff' : 
                progress >= 25 ? '#faad14' : '#ff4d4f'
              }
            />
          </div>

          {/* Dates and Status */}
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-1">
              <CalendarOutlined className="text-blue-500" />
              <span>Asignada: {dayjs(task.assignedDate).format('DD/MM/YYYY')}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClockCircleOutlined className={isOverdue ? 'text-red-500' : 'text-orange-500'} />
              <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                Entrega: {dueDate.format('DD/MM/YYYY HH:mm')}
              </span>
            </div>
          </div>

          {/* Time warning for regular tasks */}
          {!isOverdue && hoursUntilDue <= 24 && hoursUntilDue > 0 && mySubmission?.status === 'not_submitted' && task.taskType !== 'exam' && (
            <Alert
              message={`¡Quedan ${timeRemaining.text} para la entrega!`}
              type="warning"
              showIcon
            />
          )}

          {/* Time expired warning */}
          {hoursUntilDue <= 0 && !isOverdue && mySubmission?.status === 'not_submitted' && task.taskType !== 'exam' && (
            <Alert
              message="⏰ ¡El tiempo de entrega ha expirado!"
              description="La fecha límite ha pasado. Contacta con tu profesor si necesitas entregar la tarea."
              type="error"
              showIcon
            />
          )}

          {/* Exam reminder */}
          {task.taskType === 'exam' && !isOverdue && (
            <Alert
              message={`📝 Test Yourself programado: ${dueDate.format('DD/MM/YYYY HH:mm')}`}
              description="Este es un recordatorio de Test Yourself. No requiere entrega digital."
              type="info"
              showIcon
            />
          )}

          {/* Exam completed */}
          {task.taskType === 'exam' && isOverdue && (
            <Alert
              message="✅ Test Yourself realizado"
              description="El período del Test Yourself ha finalizado."
              type="success"
              showIcon
            />
          )}

          {/* Late submission */}
          {mySubmission?.isLate && (
            <Alert
              message="Entrega realizada fuera de plazo"
              type="error"
              showIcon
            />
          )}

          {/* Teacher feedback */}
          {mySubmission?.teacherFeedback && (
            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-400">
              <Text strong className="text-blue-800">Comentarios del profesor:</Text>
              <div className="mt-1 text-blue-700">
                "{mySubmission.teacherFeedback}"
              </div>
            </div>
          )}

          {/* Revision needed */}
          {mySubmission?.needsRevision && (
            <Alert
              message="Esta tarea necesita ser revisada y reenviada"
              type="warning"
              showIcon
              action={
                <Button 
                  
                  type="primary" 
                  onClick={() => openSubmitModal(task)}
                >
                  Revisar
                </Button>
              }
            />
          )}
        </div>
      </Card>
    );
  };

  // Renderizar tarjeta de tarea archivada
  const renderArchivedTaskCard = (task: Task) => {
    const mySubmission = task.submissions?.[0];
    const dueDate = dayjs(task.dueDate);
    
    return (
      <Card
        key={task.id}
        className="mb-4 hover:shadow-md transition-shadow duration-200 bg-gray-50"
        actions={[
          <Button
            key="view"
            type="text"
            icon={<EyeOutlined />}
            onClick={() => openDetailDrawer(task)}
          >
            Ver Detalles
          </Button>,
          <Button
            key="unarchive"
            type="text"
            icon={<DeleteOutlined />}
            onClick={() => handleUnarchiveTask(task.id)}
            loading={archivingTaskId === task.id}
            className="text-orange-600"
          >
            Desarchivar
          </Button>,
        ]}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Title level={5} className="!mb-0 text-gray-600">{task.title}</Title>
                <Tag color="green">Archivada</Tag>
                <Tag color={TASK_PRIORITY_COLORS[task.priority]}>
                  {TASK_PRIORITY_LABELS[task.priority]}
                </Tag>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>{TASK_TYPE_LABELS[task.taskType]}</span>
                <span>•</span>
                <span>{task.subjectAssignment.subject.name}</span>
                <span>•</span>
                <span>{task.subjectAssignment.subject.code}</span>
              </div>
            </div>
            <div className="text-right">
              {mySubmission?.isGraded && (
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    {formatTaskGrade(mySubmission.finalGrade)} / {formatTaskGrade(task.maxPoints)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {Math.round((mySubmission.finalGrade / task.maxPoints) * 100)}%
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <CalendarOutlined />
              <span>Entregada: {dayjs(mySubmission?.submittedAt).format('DD/MM/YYYY')}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircleOutlined className="text-green-500" />
              <span>Calificada: {dayjs(mySubmission?.gradedAt).format('DD/MM/YYYY')}</span>
            </div>
          </div>

          {/* Grade and feedback summary */}
          {mySubmission?.teacherFeedback && (
            <div className="p-2 bg-green-50 rounded text-sm">
              <Text type="secondary">Comentarios: {mySubmission.teacherFeedback}</Text>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="student-tasks-page">
      {/* Header con estadísticas */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col span={24}>
          <Card>
            <Row gutter={16} align="middle">
              <Col xs={24} md={12}>
                <Space>
                  <BookOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                  <div>
                    <Title level={4} style={{ margin: 0 }}>Mis Tareas</Title>
                    <Text type="secondary">Gestiona tus tareas y entregas académicas</Text>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Estadísticas */}
        {statistics && (
          <>
            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card>
                <Statistic
                  title="Tareas Asignadas"
                  value={statistics.totalAssigned}
                  prefix={<BookOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card>
                <Statistic
                  title="Pendientes"
                  value={statistics.pending}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card>
                <Statistic
                  title="Entregadas"
                  value={statistics.submitted}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card>
                <Statistic
                  title="Test Yourself"
                  value={examStatistics?.upcoming || 0}
                  prefix={<AuditOutlined />}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={4} xl={4}>
              <Card>
                <Statistic
                  title="Promedio"
                  value={statistics.averageGrade}
                  precision={1}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#f56a00' }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* Filtros */}
      <Row gutter={16} className="mb-4">
        <Col xs={24} sm={8}>
          <AcademicYearSelector value={selectedYearId} onChange={setSelectedYearId} />
        </Col>
        <Col xs={24} sm={8}>
          <Select
            placeholder="Estado de entrega"
            value={filters.submissionStatus}
            onChange={(value) => setFilters({ ...filters, submissionStatus: value, page: 1 })}
            allowClear
            style={{ width: '100%' }}
          >
            {Object.entries(SUBMISSION_STATUS_LABELS).map(([value, label]) => (
              <Option key={value} value={value}>{label}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={8}>
          <Select
            placeholder="Filtro rápido"
            value={filters.onlyPending ? 'pending' : filters.onlyGraded ? 'graded' : 'all'}
            onChange={(value) => {
              if (value === 'pending') {
                setFilters({ ...filters, onlyPending: true, onlyGraded: false, page: 1 });
              } else if (value === 'graded') {
                setFilters({ ...filters, onlyGraded: true, onlyPending: false, page: 1 });
              } else {
                setFilters({ ...filters, onlyPending: false, onlyGraded: false, page: 1 });
              }
            }}
            style={{ width: '100%' }}
          >
            <Option value="pending">Solo Pendientes</Option>
            <Option value="graded">Solo Calificadas</Option>
            <Option value="all">Todas las Tareas</Option>
          </Select>
        </Col>
      </Row>

      {/* Toggle para tareas archivadas */}
      <div className="flex justify-between items-center mb-4">
        <div></div>
        <Button
          type={showArchivedTasks ? "primary" : "default"}
          icon={<FolderOutlined />}
          onClick={() => {
            setShowArchivedTasks(!showArchivedTasks);
            if (!showArchivedTasks) {
              fetchArchivedTasks();
            }
          }}
        >
          {showArchivedTasks ? 'Ver Tareas Activas' : 'Ver Tareas Archivadas'}
        </Button>
      </div>

      {/* Lista de tareas */}
      <Card>
        {showArchivedTasks ? (
          // Vista de tareas archivadas
          loadingArchivedTasks ? (
            <div className="text-center py-8">
              <Spin size="large" />
              <div className="mt-2">Cargando tareas archivadas...</div>
            </div>
          ) : archivedTasks.length > 0 ? (
            <div>
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <Text type="secondary">
                  📁 Mostrando {archivedTasks.length} tarea{archivedTasks.length !== 1 ? 's' : ''} archivada{archivedTasks.length !== 1 ? 's' : ''}
                </Text>
              </div>
              {archivedTasks.map((task) => renderArchivedTaskCard(task))}
            </div>
          ) : (
            <Empty 
              description="No hay tareas archivadas" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )
        ) : (
          // Vista de tareas activas (original)
          loading ? (
            <div className="text-center py-8">
              <Spin size="large" />
            </div>
          ) : tasks.length > 0 ? (
            <div>
              {tasks.map(renderTaskCard)}
              
              {/* Paginación */}
              <div className="text-center mt-4">
                <Button
                  disabled={filters.page === 1}
                  onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
                >
                  Anterior
                </Button>
                <span className="mx-4">
                  Página {filters.page} de {Math.ceil(total / (filters.limit || 10))}
                </span>
                <Button
                  disabled={(filters.page || 1) * (filters.limit || 10) >= total}
                  onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No tienes tareas asignadas"
            />
          )
        )}
      </Card>

      {/* Modal de entrega */}
      <Modal
        title={`Entregar Tarea: ${selectedTask?.title}`}
        open={submitModalVisible}
        onCancel={() => {
          setSubmitModalVisible(false);
          submitForm.resetFields();
          setFileList([]);
          setSelectedTask(null);
        }}
        footer={null}
        width={800}
        destroyOnClose
      >
        {selectedTask && (
          <div>
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <div className="space-y-2">
                <div><strong>Asignatura:</strong> {selectedTask.subjectAssignment.subject.name}</div>
                <div><strong>Tipo:</strong> {TASK_TYPE_LABELS[selectedTask.taskType]}</div>
                <div><strong>Fecha límite:</strong> {dayjs(selectedTask.dueDate).format('DD/MM/YYYY HH:mm')}</div>
                {selectedTask.maxPoints && (
                  <div><strong>Puntuación máxima:</strong> {selectedTask.maxPoints} puntos</div>
                )}
                {selectedTask.requiresFile && (
                  <div className="text-orange-600">
                    <ExclamationCircleOutlined /> Esta tarea requiere archivo adjunto
                  </div>
                )}
              </div>
            </div>

            {selectedTask.instructions && (
              <div className="mb-4">
                <Title level={5}>Instrucciones:</Title>
                <div className="p-3 bg-blue-50 rounded">
                  {selectedTask.instructions}
                </div>
              </div>
            )}

            {selectedTask.attachments && selectedTask.attachments.length > 0 && (
              <div className="mb-4">
                <Title level={5}>Archivos del profesor:</Title>
                <List
                  size="small"
                  dataSource={selectedTask.attachments}
                  renderItem={(attachment) => (
                    <List.Item
                      actions={[
                        <Button
                          key="download"
                          type="link"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadAttachment(attachment.id, attachment.originalName)}
                        >
                          Descargar
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<FileTextOutlined />} />}
                        title={attachment.originalName}
                        description={`${attachment.description || 'Archivo adjunto'} (${(attachment.size / 1024 / 1024).toFixed(2)} MB)`}
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}

            <Form
              form={submitForm}
              layout="vertical"
              onFinish={handleSubmitTask}
            >
              <Form.Item
                name="content"
                label="Respuesta (Texto)"
              >
                <TextArea
                  rows={6}
                  placeholder="Escribe tu respuesta aquí..."
                />
              </Form.Item>

              <Form.Item
                name="submissionNotes"
                label="Notas adicionales"
              >
                <TextArea
                  rows={3}
                  placeholder="Comentarios adicionales sobre tu entrega..."
                />
              </Form.Item>

              <Form.Item label="Archivos adjuntos">
                <Dragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Haz clic o arrastra archivos para subirlos
                  </p>
                  <p className="ant-upload-hint">
                    Soporta archivos individuales o múltiples. Máximo 10MB por archivo.
                  </p>
                </Dragger>
              </Form.Item>

              {/* Sección de apuntes adjuntos */}
              <Form.Item label="Apuntes personales">
                <Card 
                  size="small" 
                  style={{ backgroundColor: '#f8f9fa' }}
                  bodyStyle={{ padding: '12px' }}
                >
                  <Row gutter={12} align="middle">
                    <Col flex="auto">
                      {selectedNotesToAttach.length > 0 ? (
                        <div>
                          <Text strong style={{ color: '#52c41a' }}>
                            <BookOutlined /> {selectedNotesToAttach.length} apunte(s) seleccionado(s)
                          </Text>
                          <div style={{ marginTop: 4 }}>
                            {selectedNotesToAttach.map((note, index) => (
                              <Tag key={note.noteId} color="blue" style={{ marginBottom: 2 }}>
                                Apunte {index + 1}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Text type="secondary">
                          <BookOutlined /> Adjunta tus apuntes personales a la entrega
                        </Text>
                      )}
                    </Col>
                    <Col>
                      <Button
                        type="dashed"
                        icon={<BookOutlined />}
                        onClick={openAttachNotesModal}
                        size="small"
                      >
                        {selectedNotesToAttach.length > 0 ? 'Cambiar apuntes' : 'Seleccionar apuntes'}
                      </Button>
                    </Col>
                  </Row>
                  {selectedNotesToAttach.length > 0 && (
                    <Alert
                      message="Los apuntes seleccionados se adjuntarán automáticamente al enviar la tarea"
                      type="info"
                      style={{ marginTop: 8, fontSize: '12px' }}
                      showIcon={false}
                    />
                  )}
                </Card>
              </Form.Item>

              {selectedTask.requiresFile && fileList.length === 0 && !selectedSubmission?.attachments?.length && (
                <Alert
                  message="Esta tarea requiere al menos un archivo adjunto"
                  type="warning"
                  showIcon
                  className="mb-4"
                />
              )}

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => {
                    setSubmitModalVisible(false);
                    submitForm.resetFields();
                    setFileList([]);
                    setSelectedTask(null);
                  }}>
                    Cancelar
                  </Button>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={uploading}
                    disabled={selectedTask.requiresFile && fileList.length === 0 && !selectedSubmission?.attachments?.length}
                  >
                    {selectedSubmission?.needsRevision ? 'Reenviar Tarea' : 'Entregar Tarea'}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* Drawer de detalles */}
      <Drawer
        title="Detalles de la Tarea"
        placement="right"
        size={isMobile ? 'default' : 'large'}
        width={isMobile ? '100%' : isTablet ? '80%' : undefined}
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedTask(null);
          setSelectedSubmission(null);
        }}
      >
        {selectedTask && (
          <div className="space-y-6">
            <div>
              <Title level={4}>{selectedTask.title}</Title>
              <Space wrap>
                <Tag color={TASK_PRIORITY_COLORS[selectedTask.priority]}>
                  {TASK_PRIORITY_LABELS[selectedTask.priority]}
                </Tag>
                <Tag>{TASK_TYPE_LABELS[selectedTask.taskType]}</Tag>
                <Button
                  type="default"
                  icon={<PaperClipOutlined />}
                  onClick={() => openAttachmentModal(selectedTask)}
                  size="small"
                  style={{ marginLeft: 8 }}
                >
                  Ver Archivos
                </Button>
              </Space>
            </div>

            <Divider />

            <div className="space-y-4">
              <div>
                <Text strong>Asignatura:</Text>
                <div>{selectedTask.subjectAssignment.subject.name} ({selectedTask.subjectAssignment.subject.code})</div>
              </div>

              <div>
                <Text strong>Descripción:</Text>
                <div>{selectedTask.description || 'Sin descripción'}</div>
              </div>

              <div>
                <Text strong>Instrucciones:</Text>
                <div>{selectedTask.instructions || 'Sin instrucciones específicas'}</div>
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
                  <li>Requiere archivo: {selectedTask.requiresFile ? 'Sí' : 'No'}</li>
                  <li>Entregas tardías: {selectedTask.allowLateSubmission ? 'Permitidas' : 'No permitidas'}</li>
                </ul>
              </div>

              {selectedSubmission && (
                <>
                  <Divider />
                  
                  <div>
                    <Text strong>Mi Entrega:</Text>
                    <div className="mt-2 space-y-2">
                      <div>
                        <Tag color={SUBMISSION_STATUS_COLORS[selectedSubmission.status]}>
                          {SUBMISSION_STATUS_LABELS[selectedSubmission.status]}
                        </Tag>
                        {selectedSubmission.isLate && <Tag color="orange">Tardía</Tag>}
                        {selectedSubmission.isGraded && <Tag color="green">Calificada</Tag>}
                      </div>
                      
                      {selectedSubmission.submittedAt && (
                        <div>Entregada: {dayjs(selectedSubmission.submittedAt).format('DD/MM/YYYY HH:mm')}</div>
                      )}
                      
                      {selectedSubmission.content && (
                        <div>
                          <div className="font-medium">Respuesta:</div>
                          <div className="p-3 bg-gray-50 rounded">{selectedSubmission.content}</div>
                        </div>
                      )}
                      
                      {selectedSubmission.submissionNotes && (
                        <div>
                          <div className="font-medium">Notas:</div>
                          <div className="p-3 bg-blue-50 rounded">{selectedSubmission.submissionNotes}</div>
                        </div>
                      )}
                      
                      {selectedSubmission.isGraded && (
                        <div>
                          <div className="font-medium">Calificación:</div>
                          <div className="text-lg font-bold text-green-600">
                            {formatTaskGrade(selectedSubmission.finalGrade, !!selectedTask.rubricId, selectedTask.maxPoints)}
                            {selectedTask.rubricId && selectedSubmission.finalGrade !== null && selectedSubmission.finalGrade !== undefined && !isNaN(selectedSubmission.finalGrade) && (
                              <span className="text-sm font-normal text-gray-500 ml-2">
                                (evaluado con rúbrica)
                              </span>
                            )}
                          </div>
                          {selectedTask.rubricId && selectedSubmission.isGraded && (
                            <Button
                              type="link"
                              size="small"
                              onClick={() => fetchRubricDetails(selectedSubmission.id)}
                              loading={loadingRubricDetails}
                              className="p-0 h-auto text-blue-600"
                            >
                              Ver detalles de la evaluación con rúbrica →
                            </Button>
                          )}
                          {selectedSubmission.teacherFeedback && (
                            <div className="mt-2 p-3 bg-green-50 rounded">
                              <div className="font-medium text-green-800">Comentarios del profesor:</div>
                              <div className="text-green-700">"{selectedSubmission.teacherFeedback}"</div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Task Attachments Section */}
      <Modal
        title={
          <Space>
            <PaperClipOutlined />
            <span>Archivos Adjuntos - {selectedTask?.title || 'Tarea'}</span>
          </Space>
        }
        open={attachmentModalVisible}
        onCancel={closeAttachmentModal}
        footer={null}
        width={isMobile ? '100%' : isTablet ? '95%' : 1400}
        style={{ top: isMobile ? 0 : 20, maxWidth: isMobile ? '100vw' : undefined }}
        bodyStyle={{ padding: isMobile ? '8px' : 0 }}
      >
        {attachmentTaskId && (
          <TaskAttachmentsSection
            taskId={attachmentTaskId}
            taskTitle={selectedTask?.title || 'Tarea'}
            isTeacher={false}
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

      {/* Modal de detalles de rúbrica */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <TableOutlined className="text-purple-600" />
            <span>Detalles de Evaluación con Rúbrica</span>
            {rubricDetails?.rubric?.name && (
              <Text type="secondary" className="font-normal">
                - {rubricDetails.rubric.name}
              </Text>
            )}
          </div>
        }
        open={rubricDetailsVisible}
        onCancel={closeRubricDetails}
        footer={[
          <Button key="close" onClick={closeRubricDetails}>
            Cerrar
          </Button>
        ]}
        width={900}
        className="rubric-details-modal"
      >
        {rubricDetails && (
          <div className="space-y-6">
            {/* Resumen de calificación */}
            <Card className="bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex justify-between items-center">
                <div>
                  <Title level={4} className="!mb-2 text-green-700">
                    📊 Resultado Final
                  </Title>
                  <div className="text-3xl font-bold text-green-600">
                    {rubricDetails.assessment.totalScore}/{rubricDetails.assessment.maxPossibleScore}
                  </div>
                  <div className="text-lg text-green-700">
                    {Math.round(rubricDetails.assessment.percentage)}% de logro
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-gray-600">Tarea:</div>
                  <div className="font-medium">{rubricDetails.taskInfo.title}</div>
                  <div className="text-sm text-gray-500 mt-2">
                    Evaluada el {dayjs(rubricDetails.submissionInfo.gradedAt).format('DD/MM/YYYY')}
                  </div>
                </div>
              </div>
            </Card>

            {/* Detalles por criterio */}
            <div>
              <Title level={5} className="flex items-center gap-2 !mb-4">
                <CheckCircleOutlined className="text-blue-600" />
                Evaluación Detallada por Criterios
              </Title>
              
              <div className="space-y-4">
                {rubricDetails.evaluationDetails.map((detail: any, index: number) => (
                  <Card key={detail.criterion.id} className="border-l-4 border-l-blue-400">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Text strong className="text-lg">{detail.criterion.name}</Text>
                          <Tag color="blue">
                            Peso: {(Number(detail.criterion.weight) * 100).toFixed(0)}%
                          </Tag>
                        </div>
                        
                        {detail.criterion.description && (
                          <div className="text-gray-600 mb-3">
                            {detail.criterion.description}
                          </div>
                        )}
                        
                        {detail.selectedLevel && (() => {
                          // Calculate level proportion and styling
                          const allLevels = rubricDetails?.rubric?.levels || [];
                          const maxLevelScore = Math.max(...allLevels.map(l => Number(l.scoreValue)));
                          const currentLevelScore = Number(detail.selectedLevel.scoreValue);
                          const levelProportion = currentLevelScore / maxLevelScore;
                          
                          // Dynamic colors and icons based on level proportion
                          const getLevelStyling = (proportion: number) => {
                            if (proportion >= 1.0) return {
                              bgColor: 'bg-green-50', 
                              textColor: 'text-green-800', 
                              lightTextColor: 'text-green-700',
                              borderColor: 'border-green-200',
                              icon: <StarFilled className="text-green-600" />, 
                              label: 'Excelente'
                            };
                            if (proportion >= 0.75) return {
                              bgColor: 'bg-lime-50', 
                              textColor: 'text-lime-800', 
                              lightTextColor: 'text-lime-700',
                              borderColor: 'border-lime-200',
                              icon: <LikeOutlined className="text-lime-600" />, 
                              label: 'Muy Bueno'
                            };
                            if (proportion >= 0.5) return {
                              bgColor: 'bg-yellow-50', 
                              textColor: 'text-yellow-800', 
                              lightTextColor: 'text-yellow-700',
                              borderColor: 'border-yellow-200',
                              icon: <CheckOutlined className="text-yellow-600" />, 
                              label: 'Bueno'
                            };
                            if (proportion >= 0.25) return {
                              bgColor: 'bg-orange-50', 
                              textColor: 'text-orange-800', 
                              lightTextColor: 'text-orange-700',
                              borderColor: 'border-orange-200',
                              icon: <BookFilled className="text-orange-600" />, 
                              label: 'Regular'
                            };
                            return {
                              bgColor: 'bg-red-50', 
                              textColor: 'text-red-800', 
                              lightTextColor: 'text-red-700',
                              borderColor: 'border-red-200',
                              icon: <WarningFilled className="text-red-600" />, 
                              label: 'Necesita Mejora'
                            };
                          };
                          
                          const styling = getLevelStyling(levelProportion);
                          
                          return (
                            <div className={`${styling.bgColor} p-3 rounded border-2 ${styling.borderColor}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <Text strong className={styling.textColor}>
                                    <Space>
                                      {styling.icon}
                                      {detail.selectedLevel.name}
                                    </Space>
                                  </Text>
                                  <div className={`text-xs ${styling.lightTextColor} opacity-75 mt-1`}>
                                    {styling.label} ({(levelProportion * 100).toFixed(0)}% del máximo)
                                  </div>
                                  {/* Descripción general del nivel */}
                                  {detail.selectedLevel.description && (
                                    <div className={`${styling.lightTextColor} text-sm mt-1`}>
                                      <strong>Nivel:</strong> {detail.selectedLevel.description}
                                    </div>
                                  )}
                                  {/* Contenido específico de la celda seleccionada */}
                                  {detail.selectedLevel.cellContent && (
                                    <div className={`${styling.textColor} text-sm mt-2 p-2 rounded border-l-4 ${styling.borderColor.replace('border-', 'border-l-')}`}>
                                      <strong>Descripción de la evaluación:</strong>
                                      <div className="mt-1 italic">
                                        "{detail.selectedLevel.cellContent}"
                                      </div>
                                    </div>
                                  )}
                                  {/* DEBUG: Log cell content rendering */}
                                  {console.log('[DEBUG RENDER] Cell content for', detail.criterion.name, ':', detail.selectedLevel?.cellContent)}
                                </div>
                                <div className="text-right">
                                  <div className={`${styling.textColor} font-bold`}>
                                    {detail.selectedLevel.scoreValue} puntos
                                  </div>
                                  <div className={`${styling.lightTextColor} text-sm`}>
                                    Ponderado: {(() => {
                                      const criterionWeight = Number(detail.criterion.weight);
                                      const correctPonderado = levelProportion * criterionWeight;
                                      return correctPonderado.toFixed(3);
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Comentarios del profesor */}
            {rubricDetails.assessment.teacherFeedback && (
              <div>
                <Title level={5} className="flex items-center gap-2 !mb-3">
                  <EditOutlined className="text-orange-600" />
                  Comentarios del Profesor
                </Title>
                <Card className="bg-orange-50 border-orange-200">
                  <div className="text-orange-800">
                    "{rubricDetails.assessment.teacherFeedback}"
                  </div>
                </Card>
              </div>
            )}

            {/* Información de la rúbrica */}
            <div>
              <Divider />
              <div className="text-center text-gray-500">
                <div className="text-sm">
                  Evaluado con la rúbrica: <strong>{rubricDetails.rubric.name}</strong>
                </div>
                <div className="text-xs mt-1">
                  {rubricDetails.rubric.criteria.length} criterios • 
                  {rubricDetails.rubric.levels.length} niveles de desempeño
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal para seleccionar apuntes */}
      <AttachNotesModal
        isOpen={attachNotesModalVisible}
        onClose={closeAttachNotesModal}
        onAttach={handleAttachNotes}
        taskTitle={selectedTask?.title}
        loading={attachingNotes}
      />
    </div>
  );
};

export default StudentTasksPage;