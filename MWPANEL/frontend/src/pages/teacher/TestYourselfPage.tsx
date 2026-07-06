import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  message,
  Tabs,
  Progress,
  Avatar,
  Tooltip,
  Divider,
  Empty,
  Spin,
  Alert,
  Badge,
  Switch,
  Transfer,
  Collapse,
} from 'antd';
import {
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  DownloadOutlined,
  BarChartOutlined,
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  BookOutlined,
  TeamOutlined,
  UserAddOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../services/apiClient';
import RubricGradingInterface from '../../components/rubrics/RubricGradingInterface';
import useTaskRubrics, { Rubric, SelectedCell, GradeWithRubricRequest } from '../../hooks/useTaskRubrics';
import UnassignedTestsManager from '../../components/teacher/UnassignedTestsManager';
import CustomTabsManager from '../../components/teacher/CustomTabsManager';
import { useRubrics } from '../../hooks/useRubrics';
import RubricSelectorModal from '../../components/rubrics/RubricSelectorModal';
import SectionInfoBanner from '../../components/common/SectionInfoBanner';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const { TextArea } = Input;

// Constantes para evaluación por emoji
const EMOJI_OPTIONS = [
  { value: 'happy', label: '😊 Muy Bien', description: 'Excelente rendimiento' },
  { value: 'neutral', label: '😐 Bien', description: 'Buen rendimiento' },
  { value: 'sad', label: '😞 Regular', description: 'Necesita mejorar' }
];

// Interfaces
interface ExamTask {
  id: string;
  title: string;
  description: string;
  taskType: string;
  subjectName: string;
  classGroupName: string;
  dueDate: string; // Fecha de vencimiento para estadísticas
  rubricId?: string;
  valuationType?: 'emoji' | 'score' | 'rubric';
}

interface Student {
  id: string;
  enrollmentNumber?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  grade?: any;
}

interface ExamGrade {
  id: string;
  numericGrade?: number;
  letterGrade?: string;
  emojiGrade?: 'happy' | 'neutral' | 'sad';
  rubricScores?: Array<{
    criterionId: string;
    criterionTitle: string;
    selectedLevelId: string;
    selectedLevelTitle: string;
    points: number;
    weight: number;
  }>;
  gradeScale: string;
  comments?: string;
  attendanceStatus: 'present' | 'absent' | 'justified_absence';
  gradedAt: string;
  student?: Student;
}

interface GradingData {
  task: ExamTask;
  rubric?: {
    id: string;
    title: string;
    description: string;
    maxPoints: string;
    criteria: Array<{
      id: string;
      title: string;
      description: string;
      weight: string;
    }>;
  };
  students?: Student[];
  grades?: ExamGrade[];
  gradedCount: number;
  pendingCount: number;
  evaluationType?: 'emoji' | 'score' | 'rubric';
}

interface GradeStats {
  totalGrades: number;
  averageGrade: number;
  highestGrade: number;
  lowestGrade: number;
  passingRate: number;
  studentsPresent: number;
  studentsAbsent: number;
  gradeDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

const TestYourselfPage: React.FC = () => {
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [gradingModalVisible, setGradingModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [bulkGradingMode, setBulkGradingMode] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  
  // Estados para rúbrica completa
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [selectedCells, setSelectedCells] = useState<Record<string, string>>({});
  const [finalGrade, setFinalGrade] = useState(0);
  const [finalPercentage, setFinalPercentage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // Estados para crear Test Yourself
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [subjectAssignments, setSubjectAssignments] = useState<any[]>([]);
  const [createForm] = Form.useForm();

  // Estados para editar Test Yourself
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<ExamTask | null>(null);
  const [editForm] = Form.useForm();

  // Estados para selección de rúbricas
  const [rubricSelectorVisible, setRubricSelectorVisible] = useState(false);

  // Estados para la nueva vista de Grid/Collapse
  const [activeCollapsePanels, setActiveCollapsePanels] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedRubric, setSelectedRubric] = useState<any>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [valuationType, setValueType] = useState<string>('score');

  // Estados para selección de estudiantes específicos
  const [studentSelectorVisible, setStudentSelectorVisible] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedSubjectAssignmentId, setSelectedSubjectAssignmentId] = useState<string | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Hooks para rúbricas
  const { getRubric, gradeSubmissionWithRubric } = useTaskRubrics();
  const { rubrics, fetchRubrics } = useRubrics();

  // Query para obtener todas las tareas Test Yourself del profesor (TEMPORAL)
  const { data: examTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['exam-tasks'],
    queryFn: async () => {
      const response = await api.get('/tasks/exam-grades/tasks');
      return response.data.tasks as ExamTask[];
    },
  });

  // Query para obtener secciones personalizadas del profesor
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ['test-yourself-sections'],
    queryFn: async () => {
      try {
        console.log('🎯 MAIN PAGE: Fetching Test Yourself sections');
        const response = await api.get('/tasks/test-yourself-sections');
        console.log('🎯 MAIN PAGE: Sections response:', response.data);
        return response.data || [];
      } catch (error) {
        console.error('🔴 MAIN PAGE: Error fetching sections:', error);
        return [];
      }
    },
    enabled: true,
  });

  // Query para obtener calificaciones de una tarea específica (TEMPORAL)
  const { data: gradingData, isLoading: gradingLoading, error: gradingError } = useQuery({
    queryKey: ['exam-grading', selectedTask],
    queryFn: async () => {
      try {
        if (!selectedTask) return null;
        
        const response = await api.get(`/tasks/exam-grades/tasks/${selectedTask}`);
        
        // Validate response structure
        if (!response?.data) {
          throw new Error('Respuesta del servidor vacía');
        }
        
        // Ensure students is an array
        if (response.data.students && !Array.isArray(response.data.students)) {
          console.error('Students data is not an array:', response.data.students);
          response.data.students = [];
        }
        
        // Validate each student object
        if (response.data.students) {
          response.data.students = response.data.students.filter(student => {
            try {
              return student && 
                     typeof student === 'object' && 
                     student.id && 
                     typeof student.id === 'string';
            } catch (e) {
              console.error('Invalid student object:', student, e);
              return false;
            }
          });
        }
        
        return response.data as GradingData;
      } catch (error) {
        console.error('Error fetching grading data:', error);
        throw error;
      }
    },
    enabled: !!selectedTask,
    retry: 1,
    staleTime: 30000, // 30 seconds
  });

  // Query para estadísticas (TEMPORAL)
  const { data: stats } = useQuery({
    queryKey: ['exam-stats', selectedTask],
    queryFn: async () => {
      if (!selectedTask) return null;
      const response = await api.get(`/tasks/exam-grades/tasks/${selectedTask}/stats`);
      return response.data as GradeStats;
    },
    enabled: !!selectedTask,
  });

  // Query para historial de calificaciones
  const { data: gradeHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['exam-grade-history', selectedTask, historyStudent?.id],
    queryFn: async () => {
      if (!selectedTask || !historyStudent?.id) return null;
      const response = await api.get(`/tasks/exam-grades/tasks/${selectedTask}/students/${historyStudent.id}/history`);
      return response.data;
    },
    enabled: !!selectedTask && !!historyStudent?.id && historyModalVisible,
  });

  // Mutation para crear/actualizar calificación
  const createGradeMutation = useMutation({
    mutationFn: async (gradeData: any) => {
      if (gradeData.id) {
        // Actualizar
        const response = await api.put(`/tasks/exam-grades/${gradeData.id}`, gradeData);
        return response.data;
      } else {
        // Crear - usar el endpoint correcto con taskId y studentId
        const response = await api.post(`/tasks/exam-grades/tasks/${gradeData.taskId}/students/${gradeData.studentId}/grade`, gradeData);
        return response.data;
      }
    },
    onSuccess: () => {
      message.success('Calificación guardada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['exam-grading', selectedTask] });
      queryClient.invalidateQueries({ queryKey: ['exam-stats', selectedTask] });
      setGradingModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al guardar calificación');
    },
  });

  // Mutation para calificación masiva
  const bulkGradeMutation = useMutation({
    mutationFn: async (bulkData: any) => {
      const response = await api.post('/tasks/exam-grades/bulk', bulkData);
      return response.data;
    },
    onSuccess: () => {
      message.success('Calificaciones masivas guardadas exitosamente');
      queryClient.invalidateQueries({ queryKey: ['exam-grading', selectedTask] });
      queryClient.invalidateQueries({ queryKey: ['exam-stats', selectedTask] });
      setBulkGradingMode(false);
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error en calificación masiva');
    },
  });

  // Mutation para eliminar test yourself
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await api.delete(`/tasks/${taskId}`);
      return response.data;
    },
    onSuccess: () => {
      message.success('Test Yourself eliminado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['exam-tasks'] });
      // Si estamos viendo la tarea eliminada, volver a la lista
      if (selectedTask) {
        setSelectedTask(null);
      }
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al eliminar el Test Yourself');
    },
  });

  // Mutation para actualizar test yourself
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string, data: any }) => {
      const response = await api.patch(`/tasks/${taskId}`, data);
      return response.data;
    },
    onSuccess: () => {
      message.success('Test Yourself actualizado exitosamente');
      queryClient.refetchQueries({ queryKey: ['exam-tasks'] });
      queryClient.refetchQueries({ queryKey: ['test-yourself-sections'] });
      setEditModalVisible(false);
      setEditingTask(null);
      editForm.resetFields();
      setSelectedRubric(null);
      setValueType('score');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al actualizar el Test Yourself');
    },
  });

  const handleGradeSubmit = async (values: any) => {
    if (!selectedTask || !selectedStudent || !gradingData) return;

    const evaluationType = gradingData.evaluationType || gradingData.task?.valuationType || 'score';
    
    try {
      setSubmitting(true);
      
      // Si es evaluación por rúbrica con interfaz completa
      if (evaluationType === 'rubric' && rubric) {
        // Validar que todas las celdas estén seleccionadas
        const missingCriteria = rubric.criteria.filter(
          criterion => !selectedCells[criterion.id]
        );

        if (missingCriteria.length > 0) {
          message.error(`Faltan criterios por evaluar: ${missingCriteria.map(c => c.name).join(', ')}`);
          setSubmitting(false);
          return;
        }

        // Preparar datos para API de rúbrica (formato similar a tareas regulares)
        const selectedCellsArray: SelectedCell[] = Object.entries(selectedCells).map(
          ([criterionId, levelId]) => ({ criterionId, levelId })
        );

        const rubricGradeData = {
          taskId: selectedTask,
          studentId: selectedStudent.id,
          selectedCells: selectedCellsArray,
          teacherFeedback: values.comments || '',
          privateNotes: values.comments || '',
          attendanceStatus: values.attendanceStatus,
          gradedAt: values.gradedAt ? values.gradedAt.toISOString() : new Date().toISOString(),
          finalGrade: finalGrade,
          percentage: finalPercentage,
        };

        // Enviando evaluación con rúbrica
        
        // Usar API similar a tareas regulares pero para Test Yourself
        const response = await api.post(
          `/tasks/exam-grades/tasks/${selectedTask}/students/${selectedStudent.id}/grade-with-rubric`,
          rubricGradeData
        );
        
        // Evaluación guardada exitosamente
        message.success('Calificación con rúbrica guardada exitosamente');
        
        // Limpiar estados
        setSelectedCells({});
        setRubric(null);
        setFinalGrade(0);
        setFinalPercentage(0);
      } else {
        // Evaluación tradicional (emoji o numérica)
        const gradeData = {
          taskId: selectedTask,
          studentId: selectedStudent.id,
          gradedAt: values.gradedAt ? values.gradedAt.toISOString() : new Date().toISOString(),
          attendanceStatus: values.attendanceStatus,
          comments: values.comments,
          evaluationType,
        };

        // Agregar campos específicos según el tipo de evaluación
        if (evaluationType === 'emoji') {
          gradeData.emojiGrade = values.emojiGrade;
        } else if (evaluationType === 'rubric') {
          // Rúbrica tradicional (con dropdowns - legacy)
          gradeData.rubricScores = values.rubricScores;
        } else {
          gradeData.numericGrade = values.numericGrade;
          gradeData.letterGrade = values.letterGrade;
          gradeData.gradeScale = values.gradeScale || '1-10';
        }

        createGradeMutation.mutate(gradeData);
      }
      
      setGradingModalVisible(false);
      form.resetFields();
      
      // Refrescar datos
      queryClient.invalidateQueries({ queryKey: ['exam-grading', selectedTask] });
      
    } catch (error: any) {
      console.error('Error guardando calificación:', error);
      message.error(
        error.response?.data?.message || 'Error al guardar la calificación'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openGradingModal = async (student: Student, existingGrade?: ExamGrade) => {
    // Safety check: ensure student exists before proceeding
    if (!student || !student.id) {
      message.error('No se pueden cargar los datos del estudiante');
      return;
    }
    
    setSelectedStudent(student);
    
    // Si es evaluación por rúbrica, cargar la rúbrica completa
    if (gradingData?.evaluationType === 'rubric' && gradingData?.task?.rubricId) {
      // Cargando rúbrica para Test Yourself
      try {
        const rubricData = await getRubric(gradingData.task.rubricId);
        if (rubricData) {
          setRubric(rubricData);
          // Rúbrica cargada correctamente
          
          // Cargar evaluación existente si existe
          if (existingGrade?.rubricScores && existingGrade.rubricScores.length > 0) {
            // Mapear scores existentes a selectedCells
            const cellsMap: Record<string, string> = {};
            existingGrade.rubricScores.forEach(score => {
              // Buscar el levelId que corresponde al score
              const criterion = rubricData.criteria.find(c => c.id === score.criterion_id);
              if (criterion) {
                const level = rubricData.levels.find(l => l.scoreValue === score.points);
                if (level) {
                  cellsMap[criterion.id] = level.id;
                }
              }
            });
            setSelectedCells(cellsMap);
            setFinalGrade(existingGrade.numericGrade || 0);
            setFinalPercentage(existingGrade.numericGrade || 0);
            // Evaluación existente cargada
          } else {
            setSelectedCells({});
            setFinalGrade(0);
            setFinalPercentage(0);
            // Nueva evaluación - estados limpios
          }
        }
      } catch (error) {
        console.error('Error cargando rúbrica:', error);
        message.error('Error al cargar la rúbrica');
      }
    } else {
      setRubric(null);
      setSelectedCells({});
      setFinalGrade(0);
      setFinalPercentage(0);
    }
    
    if (existingGrade) {
      const formValues: any = {
        attendanceStatus: existingGrade.attendanceStatus,
        comments: existingGrade.comments,
        gradedAt: dayjs(existingGrade.gradedAt),
        gradeScale: existingGrade.gradeScale,
      };

      // Agregar campos específicos según el tipo de evaluación
      if (existingGrade.emojiGrade) {
        formValues.emojiGrade = existingGrade.emojiGrade;
      }
      if (existingGrade.rubricScores) {
        formValues.rubricScores = existingGrade.rubricScores;
      }
      if (existingGrade.numericGrade !== undefined) {
        formValues.numericGrade = existingGrade.numericGrade;
        formValues.letterGrade = existingGrade.letterGrade;
      }

      form.setFieldsValue(formValues);
    } else {
      form.resetFields();
      form.setFieldsValue({
        attendanceStatus: 'present',
        gradeScale: '1-10',
        gradedAt: dayjs(),
      });
    }
    setGradingModalVisible(true);
  };

  const getAttendanceStatusTag = (status: string) => {
    const configs = {
      present: { color: 'green', text: 'Presente' },
      absent: { color: 'red', text: 'Ausente' },
      justified_absence: { color: 'orange', text: 'Ausencia Justificada' },
    };
    const config = configs[status as keyof typeof configs];
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 9) return '#52c41a'; // Verde
    if (grade >= 7) return '#1890ff'; // Azul
    if (grade >= 5) return '#faad14'; // Amarillo
    return '#ff4d4f'; // Rojo
  };

  // Función específica para calificaciones de rúbrica (escala 0-100)
  // 0-49.99: rojo, 50-59.99: naranja, 60-100: verde
  const getRubricGradeColor = (grade: number): { hex: string; name: string } => {
    if (grade >= 60) return { hex: '#52c41a', name: 'green' };    // Verde
    if (grade >= 50) return { hex: '#faad14', name: 'orange' };   // Naranja
    return { hex: '#ff4d4f', name: 'red' };                       // Rojo
  };

  const showGradeHistory = (student: Student) => {
    setHistoryStudent(student);
    setHistoryModalVisible(true);
  };

  const handleDeleteGrade = (student: Student) => {
    if (!student || !student.id || !selectedTask) {
      message.error('No se puede eliminar la calificación');
      return;
    }

    Modal.confirm({
      title: '¿Eliminar calificación?',
      content: `¿Estás seguro de que deseas eliminar la calificación de ${student.firstName} ${student.lastName}?`,
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk: async () => {
        try {
          await api.delete(`/tasks/exam-grades/tasks/${selectedTask}/students/${student.id}/grade`);
          message.success('Calificación eliminada exitosamente');
          // Refrescar los datos
          queryClient.invalidateQueries({ queryKey: ['exam-grading', selectedTask] });
          queryClient.invalidateQueries({ queryKey: ['exam-stats', selectedTask] });
        } catch (error: any) {
          console.error('Error deleting grade:', error);
          message.error(error.response?.data?.message || 'Error al eliminar la calificación');
        }
      },
    });
  };

  const exportGrades = async () => {
    if (!selectedTask) return;
    try {
      const response = await api.get(`/tasks/exam-grades/tasks/${selectedTask}/export`);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `calificaciones-${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      message.success('Calificaciones exportadas exitosamente');
    } catch (error) {
      message.error('Error al exportar calificaciones');
    }
  };

  const handleDeleteTask = (task: ExamTask) => {
    Modal.confirm({
      title: '¿Estás seguro de que quieres eliminar este Test Yourself?',
      content: (
        <div>
          <p><strong>Test:</strong> {task.title}</p>
          <p><strong>Asignatura:</strong> {task.subjectName}</p>
          <p><strong>Clase:</strong> {task.classGroupName}</p>
          <br />
          <Alert
            message="Advertencia"
            description="Esta acción eliminará permanentemente el test y todas las calificaciones asociadas. Esta acción no se puede deshacer."
            type="warning"
            showIcon
          />
        </div>
      ),
      icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
      okText: 'Sí, eliminar',
      okType: 'danger',
      cancelText: 'Cancelar',
      onOk() {
        deleteTaskMutation.mutate(task.id);
      },
    });
  };

  // Obtener asignaciones de materias para el formulario de crear
  const fetchSubjectAssignments = async () => {
    try {
      // Obtener información del profesor logueado
      const dashboardResponse = await api.get('/teachers/dashboard/my-dashboard');
      const teacherId = dashboardResponse.data.teacher.id;
      setCurrentTeacherId(teacherId);
      
      // Obtener sus asignaciones
      const response = await api.get(`/subjects/assignments/teacher/${teacherId}`);
      setSubjectAssignments(response.data);
    } catch (error: any) {
      console.error('Error fetching subject assignments:', error);
      message.error('Error al cargar las asignaturas');
    }
  };

  // Función para crear o encontrar una sección basada en la asignatura
  const findOrCreateSubjectSection = async (subjectName: string) => {
    try {
      // Obtener las secciones actuales
      const sectionsResponse = await api.get('/tasks/test-yourself-sections');
      const currentSections = sectionsResponse.data || [];
      
      // Buscar una sección que coincida con el nombre de la asignatura
      const existingSection = currentSections.find(section => 
        section.name.toLowerCase().includes(subjectName.toLowerCase()) ||
        subjectName.toLowerCase().includes(section.name.toLowerCase())
      );
      
      if (existingSection) {
        return existingSection.id;
      }
      
      // Si no existe, crear una nueva sección para esta asignatura
      const newSectionData = {
        name: `📚 ${subjectName}`,
        description: `Sección automática para Test Yourself de ${subjectName}`,
        color: '#1890ff',
        icon: 'BookOutlined'
      };
      
      const createResponse = await api.post('/tasks/test-yourself-sections', newSectionData);
      return createResponse.data.section.id;
      
    } catch (error) {
      console.error('Error managing subject section:', error);
      return null;
    }
  };

  // Crear Test Yourself
  const handleCreateTestYourself = async (values: any) => {
    try {
      // DEBUG: Ver valores del formulario
      console.log('📝 Form values received:', values);
      console.log('📝 valuationType from form:', values.valuationType);
      console.log('📝 subjectAssignmentIds from form:', values.subjectAssignmentIds);

      // Validación: asegurar que valuationType existe
      if (!values.valuationType) {
        message.error('El tipo de evaluación es requerido');
        return;
      }

      // Validación: asegurar que hay al menos una asignatura seleccionada
      const subjectAssignmentIds = values.subjectAssignmentIds || [];
      if (subjectAssignmentIds.length === 0) {
        message.error('Por favor selecciona al menos una asignatura');
        return;
      }

      // La primera asignatura es la principal, las demás son adicionales
      const primarySubjectAssignmentId = subjectAssignmentIds[0];
      const additionalSubjectAssignmentIds = subjectAssignmentIds.slice(1);

      // Encontrar la asignatura principal para obtener el nombre de la materia
      const selectedAssignment = subjectAssignments.find(a => a.id === primarySubjectAssignmentId);

      const testData = {
        title: values.title,
        description: values.description,
        instructions: values.instructions || '',
        taskType: 'exam', // Test Yourself es tipo EXAM
        valuationType: values.valuationType, // Asegurar que se envía
        assignedDate: values.assignedDate.toISOString(),
        dueDate: values.dueDate.toISOString(),
        subjectAssignmentId: primarySubjectAssignmentId,
        additionalSubjectAssignmentIds: additionalSubjectAssignmentIds.length > 0 ? additionalSubjectAssignmentIds : undefined,
        maxPoints: Number(selectedRubric && values.valuationType === 'rubric' ? selectedRubric.maxScore : (values.maxPoints || 100)),
        priority: values.priority || 'medium',
        allowLateSubmission: false, // Test Yourself NUNCA permite entregas tardías
        notifyFamilies: values.notifyFamilies || true,
        requiresFile: false, // Test Yourself no requiere archivos
        rubricId: selectedRubric?.id || null,
        isTestYourself: true, // Marcar explícitamente como Test Yourself
        visibleToFamilies: values.visibleToFamilies || false, // Control de visibilidad
        ...(selectedStudentIds.length > 0 && { targetStudentIds: selectedStudentIds }), // Solo si hay estudiantes específicos
      };

      // DEBUG: Ver datos antes de enviar
      console.log('🚀 Sending testData to API:', testData);

      // Crear el Test Yourself
      const taskResponse = await api.post('/tasks', testData);
      const createdTask = taskResponse.data;

      // Mostrar mensaje de éxito con información de grupos
      const groupCount = subjectAssignmentIds.length;
      if (groupCount > 1) {
        message.success(`Test Yourself creado exitosamente para ${groupCount} grupos/asignaturas`);
      } else if (selectedAssignment?.subject?.name) {
        const sectionId = await findOrCreateSubjectSection(selectedAssignment.subject.name);

        if (sectionId) {
          try {
            await api.post(`/tasks/test-yourself-sections/assign/${createdTask.id}`, {
              sectionId: sectionId
            });
            message.success(`Test Yourself creado y asignado automáticamente a la sección ${selectedAssignment.subject.name}`);
          } catch (assignError) {
            console.error('Error assigning to section:', assignError);
            message.success('Test Yourself creado exitosamente (sin asignación automática a sección)');
          }
        } else {
          message.success('Test Yourself creado exitosamente');
        }
      } else {
        message.success('Test Yourself creado exitosamente');
      }

      // Resetear formulario y cerrar modal
      createForm.resetFields();
      setCreateModalVisible(false);
      setSelectedRubric(null);
      setValueType('score');
      setSelectedStudentIds([]);
      setAvailableStudents([]);
      setSelectedSubjectAssignmentId(null);

      // Recargar la lista de tareas y secciones (refetch forzado para evitar cache stale)
      await queryClient.refetchQueries({ queryKey: ['exam-tasks'] });
      await queryClient.refetchQueries({ queryKey: ['test-yourself-sections'] });

    } catch (error: any) {
      console.error('Error creating Test Yourself:', error);
      message.error(error.response?.data?.message || 'Error al crear el Test Yourself');
    }
  };

  // Manejar selección de rúbrica
  const handleRubricSelect = (rubric: any) => {
    setSelectedRubric(rubric);
    setRubricSelectorVisible(false);

    // Actualizar AMBOS formularios con la rúbrica seleccionada
    createForm.setFieldsValue({
      rubricId: rubric.id,
      maxPoints: rubric.maxScore
    });

    editForm.setFieldsValue({
      rubricId: rubric.id,
      maxPoints: rubric.maxScore
    });
  };
  
  // Manejar cambio de tipo de evaluación
  const handleValueTypeChange = (value: string) => {
    setValueType(value);
    if (value !== 'rubric') {
      setSelectedRubric(null);
      createForm.setFieldsValue({
        rubricId: undefined
      });
    }
  };

  // Cargar estudiantes cuando se selecciona una asignatura
  // Obtener TODOS los estudiantes del profesor (de todas sus asignaturas/grupos)
  const fetchAllMyStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await api.get(`/subjects/my-students`);
      setAvailableStudents(response.data || []);
      console.log('✅ Cargados', response.data?.length || 0, 'estudiantes de todas las asignaturas del profesor');
    } catch (error) {
      console.error('Error loading students:', error);
      message.error('Error al cargar los estudiantes');
      setAvailableStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  // Manejar cambio de asignatura
  const handleSubjectAssignmentChange = (subjectAssignmentId: string) => {
    setSelectedSubjectAssignmentId(subjectAssignmentId);
    // NO resetear selectedStudentIds aquí - permite mantener los estudiantes ya seleccionados
    // El usuario puede modificarlos manualmente con el selector si lo desea
    // Ya NO cargamos estudiantes aquí - están precargados de todas las asignaturas
  };

  // Abrir modal de selección de estudiantes
  const handleOpenStudentSelector = () => {
    if (!selectedSubjectAssignmentId) {
      message.warning('Por favor, selecciona primero una asignatura');
      return;
    }
    setStudentSelectorVisible(true);
  };

  // Manejar cambios en la selección de estudiantes
  const handleStudentSelectionChange = (targetKeys: string[]) => {
    setSelectedStudentIds(targetKeys);
  };

  // Actualizar Test Yourself
  const handleUpdateTestYourself = async (values: any) => {
    if (!editingTask) return;

    try {
      // 🔍 DEBUG: Ver estudiantes seleccionados antes de enviar
      console.log('=== DEBUG UPDATE TEST YOURSELF ===');
      console.log('📝 Selected Student IDs:', selectedStudentIds);
      console.log('📊 Count:', selectedStudentIds.length);
      console.log('📋 Available Students Count:', availableStudents.length);
      console.log('📋 subjectAssignmentIds:', values.subjectAssignmentIds);

      // Procesar asignaturas múltiples
      const subjectAssignmentIds = values.subjectAssignmentIds || [];
      const primarySubjectAssignmentId = subjectAssignmentIds[0];
      const additionalSubjectAssignmentIds = subjectAssignmentIds.slice(1);

      const updateData = {
        title: values.title,
        description: values.description,
        instructions: values.instructions || '',
        valuationType: values.valuationType,
        assignedDate: values.assignedDate.toISOString(),
        dueDate: values.dueDate.toISOString(),
        subjectAssignmentId: primarySubjectAssignmentId,
        additionalSubjectAssignmentIds: additionalSubjectAssignmentIds.length > 0 ? additionalSubjectAssignmentIds : undefined,
        maxPoints: Number(selectedRubric && values.valuationType === 'rubric' ? selectedRubric.maxScore : (values.maxPoints || 100)), // Convertir a número
        priority: values.priority || 'medium',
        rubricId: selectedRubric?.id || null,
        isTestYourself: true, // Marcar explícitamente como Test Yourself
        visibleToFamilies: values.visibleToFamilies || false, // Control de visibilidad
        // SIEMPRE incluir targetStudentIds (incluso si está vacío)
        // Si está vacío, el backend asignará a todos los estudiantes de la clase
        targetStudentIds: selectedStudentIds,
      };

      console.log('📤 Update Data to send:', updateData);
      console.log('=================================');

      updateTaskMutation.mutate({ taskId: editingTask.id, data: updateData });
    } catch (error: any) {
      console.error('Error updating Test Yourself:', error);
      message.error(error.response?.data?.message || 'Error al actualizar el Test Yourself');
    }
  };

  // Función para cargar datos del Test Yourself para edición
  const handleEditTask = async (task: ExamTask) => {
    try {
      // Obtener detalles completos del task desde el backend
      const response = await api.get(`/tasks/task-by-id/${task.id}`);
      const taskData = response.data;

      setEditingTask(task);

      // Setear el valuationType para mostrar/ocultar selector de rúbrica
      setValueType(taskData.valuationType || 'score');

      // Cargar la asignatura seleccionada
      setSelectedSubjectAssignmentId(taskData.subjectAssignmentId);

      // Los estudiantes ya están cargados globalmente (fetchAllMyStudents en useEffect)
      // Cargar estudiantes seleccionados previamente si existen
      // Los estudiantes asignados están en taskData.submissions
      if (taskData.submissions && taskData.submissions.length > 0) {
        const assignedStudentIds = taskData.submissions.map((sub: any) => sub.studentId);
        setSelectedStudentIds(assignedStudentIds);
      } else {
        // Si no hay submissions específicas, significa que está asignado a todos
        setSelectedStudentIds([]);
      }

      // Si tiene rúbrica, cargarla
      if (taskData.rubricId) {
        const rubricData = rubrics.find(r => r.id === taskData.rubricId);
        if (rubricData) {
          setSelectedRubric(rubricData);
        }
      } else {
        setSelectedRubric(null);
      }

      // Construir array de IDs de asignaturas (principal + adicionales)
      const allSubjectAssignmentIds = [taskData.subjectAssignmentId];
      if (taskData.additionalSubjectAssignments && taskData.additionalSubjectAssignments.length > 0) {
        taskData.additionalSubjectAssignments.forEach((tsa: any) => {
          if (tsa.subjectAssignmentId) {
            allSubjectAssignmentIds.push(tsa.subjectAssignmentId);
          }
        });
      }

      // Rellenar el formulario con los datos del task
      editForm.setFieldsValue({
        title: taskData.title,
        description: taskData.description || '',
        instructions: taskData.instructions || '',
        valuationType: taskData.valuationType,
        assignedDate: dayjs(taskData.assignedDate),
        dueDate: dayjs(taskData.dueDate),
        subjectAssignmentIds: allSubjectAssignmentIds,
        maxPoints: taskData.maxPoints || 100,
        priority: taskData.priority || 'medium',
        rubricId: taskData.rubricId || undefined,
        visibleToFamilies: taskData.visibleToFamilies || false, // Cargar estado de visibilidad para familias
      });

      setEditModalVisible(true);
    } catch (error: any) {
      console.error('Error loading task data:', error);
      message.error('Error al cargar los datos del Test Yourself');
    }
  };

  // Cargar asignaciones al montar el componente
  useEffect(() => {
    fetchSubjectAssignments();
    fetchRubrics(); // Cargar rúbricas disponibles
    fetchAllMyStudents(); // Cargar TODOS los estudiantes del profesor (de todas sus asignaturas)
  }, []);

  // Renderizar formulario de evaluación según el tipo
  const renderEvaluationForm = () => {
    if (!gradingData) return null;
    
    const evaluationType = gradingData.evaluationType || gradingData.task?.valuationType || 'score';

    if (evaluationType === 'emoji') {
      return renderEmojiEvaluationForm();
    } else if (evaluationType === 'rubric') {
      return renderRubricEvaluationForm();
    } else {
      return renderNumericEvaluationForm();
    }
  };

  // Formulario de evaluación por emoji
  const renderEmojiEvaluationForm = () => (
    <Form.Item
      name="emojiGrade"
      label="Calificación con Emoji"
      rules={[{ required: true, message: 'Selecciona una calificación' }]}
    >
      <Select placeholder="Selecciona el nivel de rendimiento" size="large">
        {EMOJI_OPTIONS.map(option => {
          const emojiMap = { 'happy': '😊', 'neutral': '😐', 'sad': '😞' };
          return (
            <Select.Option key={option.value} value={option.value}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>{emojiMap[option.value]}</span>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{option.label}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{option.description}</div>
                </div>
              </div>
            </Select.Option>
          );
        })}
      </Select>
    </Form.Item>
  );

  // Formulario de evaluación numérica
  const renderNumericEvaluationForm = () => {
    // Usar maxPoints de la tarea o 100 como fallback
    const maxPoints = gradingData?.task?.maxPoints || 100;

    return (
      <>
        {/* Indicador visual del máximo de puntos configurado */}
        <div style={{
          background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
          border: '1px solid #91d5ff',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>📊</span>
            <div>
              <div style={{ fontWeight: 600, color: '#0050b3', fontSize: '13px' }}>
                Puntuación máxima del test
              </div>
              <div style={{ color: '#096dd9', fontSize: '11px' }}>
                Configurada por el profesor al crear el test
              </div>
            </div>
          </div>
          <div style={{
            background: '#1890ff',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '20px',
            fontWeight: 700,
            fontSize: '18px',
            boxShadow: '0 2px 8px rgba(24, 144, 255, 0.3)'
          }}>
            {maxPoints} pts
          </div>
        </div>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="numericGrade"
              label={
                <span>
                  Calificación del estudiante
                  <span style={{ color: '#1890ff', fontWeight: 500, marginLeft: '4px' }}>
                    (máx. {maxPoints})
                  </span>
                </span>
              }
              rules={[
                { required: true, message: 'La calificación es requerida' },
                { type: 'number', min: 0, max: maxPoints, message: `Debe estar entre 0 y ${maxPoints}` }
              ]}
            >
              <InputNumber
                min={0}
                max={maxPoints}
                step={0.1}
                precision={1}
                style={{ width: '100%' }}
                placeholder={`Ej: ${(maxPoints * 0.85).toFixed(1)}`}
                addonAfter={`/ ${maxPoints}`}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="letterGrade"
              label="Calificación en Texto (Opcional)"
            >
              <Input placeholder="A-, Excelente, etc." />
            </Form.Item>
          </Col>
        </Row>
      </>
    );
  };

  // Manejadores para la interfaz de rúbrica
  const handleCellSelect = (criterionId: string, levelId: string) => {
    setSelectedCells(prev => ({
      ...prev,
      [criterionId]: levelId,
    }));
  };

  const handleGradeCalculated = (grade: number, percentage: number) => {
    setFinalGrade(grade);
    setFinalPercentage(percentage);
    
    // Sincronizar con el formulario principal
    form.setFieldsValue({
      numeric_grade: Math.round(grade * 100) / 100,
    });
  };
  
  // Interfaz completa de evaluación por rúbrica (como en tareas regulares)
  const renderRubricEvaluationForm = () => {
    if (!rubric) {
      return (
        <Alert
          message="Rúbrica no disponible"
          description="No se ha encontrado la rúbrica asociada a esta tarea."
          type="warning"
          showIcon
        />
      );
    }

    return (
      <div style={{ minHeight: '600px' }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>Evaluación con Rúbrica: {rubric.name}</Title>
          <Text type="secondary">{rubric.description}</Text>
        </div>
        
        <RubricGradingInterface
          rubric={rubric}
          onCellSelect={handleCellSelect}
          selectedCells={selectedCells}
          onGradeCalculated={handleGradeCalculated}
          readOnly={false}
          className="test-yourself-rubric"
        />
        
        <div style={{ marginTop: 16, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>Nota Calculada: </Text>
              <Text style={{ fontSize: '18px', color: '#1890ff' }}>
                {finalGrade.toFixed(2)} / {rubric.maxScore}
              </Text>
            </Col>
            <Col span={12}>
              <Text strong>Porcentaje: </Text>
              <Text style={{ fontSize: '18px', color: '#52c41a' }}>
                {finalPercentage.toFixed(1)}%
              </Text>
            </Col>
          </Row>
        </div>
      </div>
    );
  };

  // Columnas para la tabla de tareas
  const taskColumns = [
    {
      title: 'Test Yourself',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: ExamTask) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary">{record.subjectName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Clase: {record.classGroupName}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tipo de Evaluación',
      dataIndex: 'taskType',
      key: 'taskType',
      render: (taskType: string, record: ExamTask) => (
        <div>
          <Tag color="blue" style={{ marginBottom: '4px' }}>
            {taskType === 'exam' ? 'Test Yourself' : taskType}
          </Tag>
          <br />
          <Tag
            color={
              record.valuationType === 'emoji' ? 'orange' :
              record.valuationType === 'rubric' ? 'purple' :
              'green'
            }
            style={{ fontSize: '11px' }}
          >
            {record.valuationType === 'emoji' ? '😊 Emoji' :
             record.valuationType === 'rubric' ? '📋 Rúbrica' :
             '🔢 Numérica'}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 300,
      render: (record: ExamTask) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space wrap>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              onClick={() => setSelectedTask(record.id)}
              size="small"
            >
              Ver Calificaciones
            </Button>
            <Tooltip title="Modificar características de este Test Yourself (título, tipo de evaluación, fechas, etc.)">
              <Button
                type="default"
                icon={<EditOutlined />}
                onClick={() => handleEditTask(record)}
                size="small"
                style={{
                  borderColor: '#1890ff',
                  color: '#1890ff'
                }}
              >
                Editar
              </Button>
            </Tooltip>
            <Button
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeleteTask(record)}
              size="small"
              title="Eliminar Test Yourself"
            >
              Eliminar
            </Button>
          </Space>
        </Space>
      ),
    },
  ];

  // Función de renderizado seguro para estudiantes
  const renderStudentSafely = (record: any) => {
    try {
      const student = record?.student || record;
      
      // Verificación de seguridad robusta
      if (!student || !student.id) {
        return (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
            <div>
              <Text type="secondary">Datos de estudiante no disponibles</Text>
            </div>
          </div>
        );
      }

      const grade = gradingData?.grades?.find(g => g?.student?.id === student.id) || null;
      
      return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar 
            src={student.avatarUrl || student.photoUrl || ''}
            icon={<UserOutlined />} 
            style={{ marginRight: 8 }}
          />
          <div>
            <Text strong>
              {student.firstName || 'Sin nombre'} {student.lastName || ''}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {student.enrollmentNumber || 'Sin matrícula'} - {student.email || 'Sin email'}
            </Text>
            {grade && (
              <div>
                <Text type="secondary">
                  Calificado el {dayjs(grade.gradedAt).format('DD/MM/YYYY')}
                </Text>
              </div>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering student:', error, record);
      return (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
          <div>
            <Text type="secondary">Error al cargar estudiante</Text>
          </div>
        </div>
      );
    }
  };

  // Columnas para la tabla de estudiantes
  const studentColumns = [
    {
      title: 'Estudiante',
      key: 'student',
      render: renderStudentSafely,
    },
    {
      title: 'Calificación',
      key: 'grade',
      render: (record: any) => {
        try {
          const student = record?.student || record;
          
          if (!student || !student.id) {
            return <Tag color="default">Datos no disponibles</Tag>;
          }

          // Get grade directly from student object (attached by backend)
          const grade = student.grade;
          const evaluationType = gradingData?.evaluationType || gradingData?.task?.valuationType || 'score';
          
          // Rendering grade for ${student.firstName} ${student.lastName} (${evaluationType})
          
          if (!grade) {
            console.log('🔍 NO GRADE FOUND - Showing "Sin calificar"');
            return <Tag color="default">Sin calificar</Tag>;
          }

          // Renderizar según el tipo de evaluación
          if (evaluationType === 'emoji' && grade.emoji_grade) {
            const emojiColors = {
              'happy': 'green',
              'neutral': 'orange', 
              'sad': 'red'
            };
            const emojiLabels = {
              'happy': 'Muy Bien',
              'neutral': 'Bien',
              'sad': 'Regular'
            };
            const emojiIcons = {
              'happy': '😊',
              'neutral': '😐',
              'sad': '😞'
            };
            return (
              <Tag color={emojiColors[grade.emoji_grade] || 'default'}>
                {emojiIcons[grade.emoji_grade] || '?'} {emojiLabels[grade.emoji_grade] || 'Desconocido'}
              </Tag>
            );
          }

          // Evaluación de rúbrica - usar escala 0-100
          if (evaluationType === 'rubric') {
            // Usar numeric_grade que contiene la nota final calculada correctamente por el backend
            const finalGrade = grade.numeric_grade || 0;
            const rubricColor = getRubricGradeColor(finalGrade);
            return (
              <Tag color={rubricColor.name}>
                {finalGrade} pts (Rúbrica)
              </Tag>
            );
          }

          // Evaluación numérica tradicional
          if (grade.numeric_grade !== undefined && grade.numeric_grade !== null) {
            // Obtener maxPoints: primero del metadata del grade, luego del grade_scale, finalmente de la tarea
            const maxPoints = grade.metadata?.maxPoints ||
                             (grade.grade_scale && !isNaN(Number(grade.grade_scale)) ? Number(grade.grade_scale) : null) ||
                             gradingData?.task?.maxPoints || 100;

            // Calcular porcentaje para determinar el color
            const percentage = maxPoints > 0 ? (grade.numeric_grade / maxPoints) * 100 : 0;

            // Usar colores basados en porcentaje (no en valor absoluto)
            const getColorByPercentage = (pct: number) => {
              if (pct >= 60) return 'green';
              if (pct >= 50) return 'orange';
              return 'red';
            };

            const colorName = getColorByPercentage(percentage);
            return (
              <Tag color={colorName}>
                {grade.numeric_grade}/{maxPoints}
                {grade.letter_grade && ` (${grade.letter_grade})`}
              </Tag>
            );
          }

          return <Tag color="default">Sin calificar</Tag>;
        } catch (error) {
          console.error('Error rendering grade:', error, record);
          return <Tag color="red">Error al cargar</Tag>;
        }
      },
    },
    {
      title: 'Asistencia',
      key: 'attendance',
      render: (record: any) => {
        try {
          const student = record?.student || record;
          
          if (!student || !student.id) {
            return <Tag color="default">-</Tag>;
          }

          const grade = gradingData?.grades?.find(g => g?.student?.id === student.id);
          
          if (!grade || !grade.attendanceStatus) {
            return <Tag color="default">-</Tag>;
          }

          return getAttendanceStatusTag(grade.attendanceStatus);
        } catch (error) {
          console.error('Error rendering attendance:', error, record);
          return <Tag color="red">Error</Tag>;
        }
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: any) => {
        try {
          const student = record?.student || record;
          
          if (!student || !student.id) {
            return (
              <Space>
                <Button type="primary" size="small" disabled>
                  Datos no disponibles
                </Button>
              </Space>
            );
          }

          // Get grade directly from student object (attached by backend)
          const grade = student.grade;
          
          return (
            <Space>
              <Button
                type="primary"
                icon={grade ? <EditOutlined /> : <PlusOutlined />}
                size="small"
                onClick={() => openGradingModal(student, grade)}
              >
                {grade ? 'Cambiar calificación' : 'Calificar'}
              </Button>
              {grade && (
                <>
                  <Button
                    type="default"
                    icon={<ClockCircleOutlined />}
                    size="small"
                    onClick={() => showGradeHistory(student)}
                    title="Ver historial de calificaciones"
                  >
                    Historial
                  </Button>
                  <Tooltip title="Eliminar calificación">
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={() => handleDeleteGrade(student)}
                    />
                  </Tooltip>
                </>
              )}
            </Space>
          );
        } catch (error) {
          console.error('Error rendering actions:', error, record);
          return (
            <Space>
              <Button type="primary" size="small" disabled>
                Error
              </Button>
            </Space>
          );
        }
      },
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <SectionInfoBanner text="Examen presencial sin entrega digital; pones la nota directamente." />
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={2}>
            📝 Gestión de Test Yourself
          </Title>
          <Text type="secondary">
            Gestiona y califica las evaluaciones tipo Test Yourself de tus asignaturas
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => setCreateModalVisible(true)}
        >
          Crear Test Yourself
        </Button>
      </div>

      {!selectedTask ? (
        // Vista de lista de tareas organizadas por asignatura
        <div>
          {tasksLoading ? (
            <Card title="Tareas Test Yourself">
              <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '40px' }} />
            </Card>
          ) : examTasks && examTasks.length > 0 ? (
            (() => {
              // Agrupar tareas por asignatura (EXCLUYENDO las que ya tienen sección personalizada)
              const tasksBySubject = examTasks.reduce((acc, task) => {
                // Si la tarea tiene customTabId, no la agrupamos por asignatura
                // porque aparecerá en su sección personalizada
                if (task.customTabId) {
                  return acc;
                }

                const subject = task.subjectName || 'Sin Asignatura';
                if (!acc[subject]) acc[subject] = [];
                acc[subject].push(task);
                return acc;
              }, {} as Record<string, ExamTask[]>);

              // Obtener tareas realmente sin asignar (sin customTabId y sin asignatura)
              const unassignedTasks = examTasks.filter(task => !task.customTabId && !task.subjectName);
              
              // Crear tabs: sujetos + secciones personalizadas
              const subjectTabs = Object.keys(tasksBySubject)
                .filter(subject => subject !== 'Sin Asignatura')
                .sort()
                .map(subject => ({
                  key: `subject-${subject}`,
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>📚 {subject}</span>
                      <Badge count={tasksBySubject[subject]?.length || 0} size="small" />
                    </div>
                  ),
                  children: (
                    <div style={{ marginTop: '16px' }}>
                      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                        <Col span={6}>
                          <Card size="small">
                            <Statistic
                              title="Total Test Yourself"
                              value={tasksBySubject[subject]?.length || 0}
                              prefix={<ExclamationCircleOutlined />}
                              valueStyle={{ color: '#1890ff' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small">
                            <Statistic
                              title="Próximos"
                              value={tasksBySubject[subject]?.filter(task => 
                                dayjs(task.dueDate).isAfter(dayjs())
                              ).length}
                              prefix={<CalendarOutlined />}
                              valueStyle={{ color: '#52c41a' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small">
                            <Statistic
                              title="Vencidos"
                              value={tasksBySubject[subject]?.filter(task => 
                                dayjs(task.dueDate).isBefore(dayjs())
                              ).length}
                              prefix={<ClockCircleOutlined />}
                              valueStyle={{ color: '#ff4d4f' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small">
                            <Statistic
                              title="Con Rúbrica"
                              value={tasksBySubject[subject]?.filter(task => 
                                task.valuationType === 'rubric'
                              ).length}
                              prefix={<BarChartOutlined />}
                              valueStyle={{ color: '#722ed1' }}
                            />
                          </Card>
                        </Col>
                      </Row>
                      
                      <Table
                        dataSource={tasksBySubject[subject] || []}
                        columns={taskColumns}
                        rowKey="id"
                        pagination={{ 
                          pageSize: 8,
                          showSizeChanger: false,
                          showQuickJumper: true 
                        }}
                        size="middle"
                      />
                    </div>
                  )
                }));

              // Crear tabs para secciones personalizadas
              const sectionTabs = sections.map(section => ({
                key: `section-${section.id}`,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: section.color, fontSize: '16px' }}>
                      {section.icon === 'FolderOutlined' ? '📁' : 
                       section.icon === 'BookOutlined' ? '📚' :
                       section.icon === 'FileTextOutlined' ? '📄' :
                       section.icon === 'TagOutlined' ? '🏷️' :
                       section.icon === 'StarOutlined' ? '⭐' :
                       section.icon === 'HeartOutlined' ? '❤️' :
                       section.icon === 'ThunderboltOutlined' ? '⚡' :
                       section.icon === 'CrownOutlined' ? '👑' : '📁'}
                    </span>
                    <span>{section.name}</span>
                    <Badge count={section.assignments?.length || 0} size="small" />
                  </div>
                ),
                children: (
                  <div style={{ marginTop: '16px' }}>
                    {section.description && (
                      <Alert
                        message={section.description}
                        type="info"
                        showIcon
                        style={{ marginBottom: '16px' }}
                      />
                    )}
                    
                    {section.assignments && section.assignments.length > 0 ? (
                      <Table
                        dataSource={section.assignments.map(assignment => assignment.task)}
                        columns={taskColumns}
                        rowKey="id"
                        pagination={{ 
                          pageSize: 8,
                          showSizeChanger: false,
                          showQuickJumper: true 
                        }}
                        size="middle"
                      />
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No hay Test Yourself en esta sección"
                        style={{ margin: '40px 0' }}
                      />
                    )}
                  </div>
                )
              }));

              // Tab especial para tareas sin asignar (gestión de secciones)
              const unassignedTab = unassignedTasks.length > 0 ? [{
                key: 'unassigned',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🗂️ Gestión de Secciones</span>
                    <Badge count={unassignedTasks.length} size="small" style={{ backgroundColor: '#faad14' }} />
                  </div>
                ),
                children: (
                  <div style={{ marginTop: '16px' }}>
                    <UnassignedTestsManager
                      unassignedTasks={unassignedTasks}
                      onTaskSelect={(task) => setSelectedTask(task.id)}
                    />
                  </div>
                )
              }] : [];

              // Tab de configuración de pestañas personalizadas
              const settingsTab = [{
                key: 'settings',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>⚙️ Configuración</span>
                  </div>
                ),
                children: (
                  <div style={{ marginTop: '16px' }}>
                    <CustomTabsManager 
                      onTabsChanged={() => {
                        // Refrescar las secciones cuando cambien las pestañas
                        queryClient.invalidateQueries({ queryKey: ['test-yourself-sections'] });
                      }}
                    />
                  </div>
                )
              }];

              // Filtrar test yourself según búsqueda y tipo
              const filterTasks = (tasks: any[]) => {
                if (!Array.isArray(tasks)) return [];
                return tasks.filter(task => {
                  // Validar que task existe y tiene las propiedades necesarias
                  if (!task || typeof task !== 'object') return false;

                  const matchesSearch = searchText === '' ||
                    (task.title && task.title.toLowerCase().includes(searchText.toLowerCase()));
                  const matchesType = filterType === 'all' ||
                    (filterType === 'rubric' && task.valuationType === 'rubric') ||
                    (filterType === 'score' && task.valuationType === 'score') ||
                    (filterType === 'emoji' && task.valuationType === 'emoji');
                  return matchesSearch && matchesType;
                });
              };

              // Crear secciones para el Collapse
              const collapseSections: any[] = [];

              // Agregar secciones de asignaturas
              Object.keys(tasksBySubject).forEach(subject => {
                const tasks = filterTasks(tasksBySubject[subject] || []);
                if (tasks.length > 0 || searchText === '') {
                  collapseSections.push({
                    key: `subject-${subject}`,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 500 }}>
                        <span style={{ fontSize: '20px' }}>📚</span>
                        <span>{subject}</span>
                        <Badge count={tasks.length} style={{ backgroundColor: '#1890ff' }} />
                      </div>
                    ),
                    children: (
                      <div>
                        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                          <Col xs={12} sm={12} md={6}>
                            <Card size="small" style={{ borderRadius: '8px' }}>
                              <Statistic
                                title="Total"
                                value={tasks.length}
                                prefix={<ExclamationCircleOutlined />}
                                valueStyle={{ color: '#1890ff', fontSize: '20px' }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={12} md={6}>
                            <Card size="small" style={{ borderRadius: '8px' }}>
                              <Statistic
                                title="Próximos"
                                value={tasks.filter(task => dayjs(task.dueDate).isAfter(dayjs())).length}
                                prefix={<CalendarOutlined />}
                                valueStyle={{ color: '#52c41a', fontSize: '20px' }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={12} md={6}>
                            <Card size="small" style={{ borderRadius: '8px' }}>
                              <Statistic
                                title="Vencidos"
                                value={tasks.filter(task => dayjs(task.dueDate).isBefore(dayjs())).length}
                                prefix={<ClockCircleOutlined />}
                                valueStyle={{ color: '#ff4d4f', fontSize: '20px' }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={12} md={6}>
                            <Card size="small" style={{ borderRadius: '8px' }}>
                              <Statistic
                                title="Con Rúbrica"
                                value={tasks.filter(task => task.valuationType === 'rubric').length}
                                prefix={<BarChartOutlined />}
                                valueStyle={{ color: '#722ed1', fontSize: '20px' }}
                              />
                            </Card>
                          </Col>
                        </Row>
                        <Table
                          dataSource={tasks}
                          columns={taskColumns}
                          rowKey="id"
                          pagination={{ pageSize: 8, showSizeChanger: false, showQuickJumper: true }}
                          size="middle"
                        />
                      </div>
                    ),
                  });
                }
              });

              // Agregar secciones personalizadas
              sections.forEach(section => {
                const sectionTasks = filterTasks(
                  (section.assignments || [])
                    .map((a: any) => a?.task)
                    .filter((task: any) => task !== null && task !== undefined)
                );
                if (sectionTasks.length > 0 || searchText === '') {
                  collapseSections.push({
                    key: `section-${section.id}`,
                    label: (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 500 }}>
                        <span style={{ fontSize: '20px' }}>
                          {section.icon === 'FolderOutlined' ? '📁' :
                           section.icon === 'BookOutlined' ? '📚' :
                           section.icon === 'FileTextOutlined' ? '📄' :
                           section.icon === 'TagOutlined' ? '🏷️' :
                           section.icon === 'StarOutlined' ? '⭐' :
                           section.icon === 'HeartOutlined' ? '❤️' :
                           section.icon === 'ThunderboltOutlined' ? '⚡' :
                           section.icon === 'CrownOutlined' ? '👑' : '📁'}
                        </span>
                        <span style={{ color: section.color }}>{section.name}</span>
                        <Badge count={sectionTasks.length} style={{ backgroundColor: section.color || '#52c41a' }} />
                      </div>
                    ),
                    children: (
                      <div>
                        {section.description && (
                          <Alert message={section.description} type="info" showIcon style={{ marginBottom: '16px', borderRadius: '8px' }} />
                        )}
                        {sectionTasks.length > 0 ? (
                          <Table
                            dataSource={sectionTasks}
                            columns={taskColumns}
                            rowKey="id"
                            pagination={{ pageSize: 8, showSizeChanger: false, showQuickJumper: true }}
                            size="middle"
                          />
                        ) : (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay Test Yourself en esta sección" style={{ margin: '40px 0' }} />
                        )}
                      </div>
                    ),
                  });
                }
              });

              // Agregar sección de sin asignar
              if (unassignedTasks.length > 0) {
                const filteredUnassigned = filterTasks(unassignedTasks);
                collapseSections.push({
                  key: 'unassigned',
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 500 }}>
                      <span style={{ fontSize: '20px' }}>🗂️</span>
                      <span>Gestión de Secciones</span>
                      <Badge count={filteredUnassigned.length} style={{ backgroundColor: '#faad14' }} />
                    </div>
                  ),
                  children: (
                    <UnassignedTestsManager
                      unassignedTasks={filteredUnassigned}
                      onTaskSelect={(task) => setSelectedTask(task.id)}
                    />
                  ),
                });
              }

              // Agregar configuración
              collapseSections.push({
                key: 'settings',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '16px', fontWeight: 500 }}>
                    <span style={{ fontSize: '20px' }}>⚙️</span>
                    <span>Configuración de Secciones</span>
                  </div>
                ),
                children: (
                  <CustomTabsManager
                    onTabsChanged={() => {
                      queryClient.invalidateQueries({ queryKey: ['test-yourself-sections'] });
                    }}
                  />
                ),
              });

              return (
                <div style={{ width: '100%' }}>
                  <style dangerouslySetInnerHTML={{__html: `
                    /* Estilos modernos para Grid de Test Yourself */
                    .test-yourself-grid-container {
                      background: #f5f5f5;
                      border-radius: 12px;
                      padding: 24px;
                    }

                    .test-yourself-search-bar {
                      background: white;
                      padding: 20px;
                      border-radius: 12px;
                      margin-bottom: 24px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                    }

                    .test-yourself-collapse .ant-collapse-item {
                      background: white;
                      border: 1px solid #e8e8e8;
                      border-radius: 12px !important;
                      margin-bottom: 16px;
                      overflow: hidden;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                      transition: all 0.3s ease;
                    }

                    .test-yourself-collapse .ant-collapse-item:hover {
                      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
                      transform: translateY(-2px);
                    }

                    .test-yourself-collapse .ant-collapse-header {
                      padding: 20px 24px !important;
                      background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
                      border-radius: 12px !important;
                    }

                    .test-yourself-collapse .ant-collapse-content {
                      border-top: 1px solid #e8e8e8;
                      background: white;
                    }

                    .test-yourself-collapse .ant-collapse-content-box {
                      padding: 24px !important;
                    }

                    @media (max-width: 768px) {
                      .test-yourself-grid-container {
                        padding: 16px;
                      }

                      .test-yourself-search-bar {
                        padding: 16px;
                      }

                      .test-yourself-collapse .ant-collapse-header {
                        padding: 16px !important;
                      }

                      .test-yourself-collapse .ant-collapse-content-box {
                        padding: 16px !important;
                      }
                    }
                  `}} />

                  <Card
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '18px' }}>📝 Gestión de Test Yourself</span>
                        <Badge count={examTasks.length} style={{ backgroundColor: '#1890ff' }} />
                        {sections.length > 0 && (
                          <Badge count={sections.length} style={{ backgroundColor: '#52c41a' }} title={`${sections.length} secciones personalizadas`} />
                        )}
                      </div>
                    }
                    loading={sectionsLoading}
                    bordered={false}
                  >
                    <div className="test-yourself-grid-container">
                      {/* Barra de búsqueda y filtros */}
                      <div className="test-yourself-search-bar">
                        <Row gutter={[16, 16]} align="middle">
                          <Col xs={24} sm={24} md={12}>
                            <Input.Search
                              placeholder="Buscar Test Yourself por título..."
                              allowClear
                              size="large"
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              prefix={<SearchOutlined />}
                              style={{ borderRadius: '8px' }}
                            />
                          </Col>
                          <Col xs={24} sm={24} md={12}>
                            <Select
                              size="large"
                              value={filterType}
                              onChange={setFilterType}
                              style={{ width: '100%', borderRadius: '8px' }}
                            >
                              <Select.Option value="all">📊 Todos los tipos</Select.Option>
                              <Select.Option value="rubric">📋 Con Rúbrica</Select.Option>
                              <Select.Option value="score">🔢 Numéricos</Select.Option>
                              <Select.Option value="emoji">😊 Con Emojis</Select.Option>
                            </Select>
                          </Col>
                        </Row>
                      </div>

                      {/* Grid de secciones colapsables */}
                      <Collapse
                        className="test-yourself-collapse"
                        bordered={false}
                        activeKey={activeCollapsePanels}
                        onChange={(keys) => setActiveCollapsePanels(keys as string[])}
                        items={collapseSections}
                        expandIconPosition="end"
                      />
                    </div>
                  </Card>
                </div>
              );
            })()
          ) : (
            <Card title="Tareas Test Yourself">
              <Empty 
                description="No hay tareas Test Yourself creadas"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            </Card>
          )}
        </div>
      ) : (
        // Vista de calificaciones de una tarea específica
        <div>
          <div style={{ marginBottom: '16px' }}>
            <Button 
              onClick={() => setSelectedTask(null)}
              style={{ marginBottom: '16px' }}
            >
              ← Volver a la lista
            </Button>
          </div>

          {gradingLoading ? (
            <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '40px' }} />
          ) : gradingError ? (
            <Alert
              message="Error al cargar datos"
              description="No se pudieron cargar las calificaciones. Por favor, inténtalo de nuevo."
              type="error"
              showIcon
              action={
                <Button size="small" onClick={() => window.location.reload()}>
                  Recargar página
                </Button>
              }
            />
          ) : gradingData ? (
            <Tabs defaultActiveKey="grading">
              <TabPane tab="Calificaciones" key="grading">
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="Total Estudiantes"
                        value={gradingData.students?.length || 0}
                        prefix={<UserOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="Calificados"
                        value={gradingData.gradedCount}
                        prefix={<CheckCircleOutlined />}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Statistic
                        title="Pendientes"
                        value={gradingData.pendingCount}
                        prefix={<ClockCircleOutlined />}
                        valueStyle={{ color: gradingData.pendingCount > 0 ? '#cf1322' : '#3f8600' }}
                      />
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card>
                      <Progress
                        type="circle"
                        percent={Math.round((gradingData.gradedCount / (gradingData.students?.length || 1)) * 100)}
                        format={percent => `${percent}%`}
                        size={80}
                      />
                      <div style={{ textAlign: 'center', marginTop: '8px' }}>
                        <Text strong>Progreso</Text>
                      </div>
                    </Card>
                  </Col>
                </Row>

                <Card
                  title={`📝 ${gradingData.task.title}`}
                  extra={
                    <Space>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={exportGrades}
                      >
                        Exportar CSV
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    dataSource={(() => {
                      try {
                        if (!gradingData?.students || !Array.isArray(gradingData.students)) {
                          return [];
                        }
                        
                        return gradingData.students.filter(student => {
                          try {
                            return student && 
                                   typeof student === 'object' && 
                                   student.id && 
                                   typeof student.id === 'string';
                          } catch (e) {
                            console.error('Error validating student:', e);
                            return false;
                          }
                        });
                      } catch (error) {
                        console.error('Error processing students for table:', error);
                        return [];
                      }
                    })()}
                    columns={studentColumns}
                    rowKey={(record) => {
                      try {
                        if (record && record.id && typeof record.id === 'string') {
                          return record.id;
                        }
                        return `error-row-${Date.now()}-${Math.random()}`;
                      } catch (error) {
                        console.error('Error generating rowKey:', error);
                        return `fallback-${Date.now()}-${Math.random()}`;
                      }
                    }}
                    pagination={{ pageSize: 15 }}
                    locale={{
                      emptyText: gradingData?.students?.length === 0 ? 
                        'No hay estudiantes en esta clase' : 
                        'Error al cargar estudiantes'
                    }}
                  />
                </Card>
              </TabPane>

              {stats && (
                <TabPane tab="Estadísticas" key="stats">
                  <Row gutter={16} style={{ marginBottom: '24px' }}>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Promedio"
                          value={stats.averageGrade}
                          precision={2}
                          suffix={gradingData?.task?.valuationType === 'score' ? ` / ${gradingData?.task?.maxPoints || 100}` : "/ 100"}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Nota Más Alta"
                          value={stats.highestGrade}
                          precision={1}
                          valueStyle={{ color: '#3f8600' }}
                          suffix={gradingData?.task?.valuationType === 'score' ? ` / ${gradingData?.task?.maxPoints || 100}` : ""}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Nota Más Baja"
                          value={stats.lowestGrade}
                          precision={1}
                          valueStyle={{ color: '#cf1322' }}
                          suffix={gradingData?.task?.valuationType === 'score' ? ` / ${gradingData?.task?.maxPoints || 100}` : ""}
                        />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card>
                        <Statistic
                          title="Tasa de Aprobado"
                          value={stats.passingRate}
                          precision={1}
                          suffix="%"
                          valueStyle={{ color: stats.passingRate >= 80 ? '#3f8600' : '#faad14' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Card title="Distribución por Niveles">
                        <div style={{ padding: '16px' }}>
                          <div style={{ marginBottom: '8px' }}>
                            <Text strong>Excelente (90-100): </Text>
                            <Progress
                              percent={Math.round((stats.gradeDistribution.excellent / stats.totalGrades) * 100)}
                              strokeColor="#52c41a"
                              format={() => `${stats.gradeDistribution.excellent} estudiantes`}
                            />
                          </div>
                          <div style={{ marginBottom: '8px' }}>
                            <Text strong>Bueno (70-89): </Text>
                            <Progress
                              percent={Math.round((stats.gradeDistribution.good / stats.totalGrades) * 100)}
                              strokeColor="#1890ff"
                              format={() => `${stats.gradeDistribution.good} estudiantes`}
                            />
                          </div>
                          <div style={{ marginBottom: '8px' }}>
                            <Text strong>Regular (60-69): </Text>
                            <Progress
                              percent={Math.round((stats.gradeDistribution.fair / stats.totalGrades) * 100)}
                              strokeColor="#faad14"
                              format={() => `${stats.gradeDistribution.fair} estudiantes`}
                            />
                          </div>
                          <div>
                            <Text strong>Insuficiente (&lt;60): </Text>
                            <Progress
                              percent={Math.round((stats.gradeDistribution.poor / stats.totalGrades) * 100)}
                              strokeColor="#ff4d4f"
                              format={() => `${stats.gradeDistribution.poor} estudiantes`}
                            />
                          </div>
                        </div>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card title="Asistencia">
                        <Row gutter={16}>
                          <Col span={12}>
                            <Statistic
                              title="Presentes"
                              value={stats.studentsPresent}
                              prefix={<CheckCircleOutlined />}
                              valueStyle={{ color: '#3f8600' }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic
                              title="Ausentes"
                              value={stats.studentsAbsent}
                              prefix={<ExclamationCircleOutlined />}
                              valueStyle={{ color: '#cf1322' }}
                            />
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>
                </TabPane>
              )}
            </Tabs>
          ) : (
            <Alert
              message="Error"
              description="No se pudieron cargar los datos de la tarea"
              type="error"
              showIcon
            />
          )}
        </div>
      )}

      {/* Modal de Crear Test Yourself */}
      <Modal
        title="Crear Nuevo Test Yourself"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={800}
        zIndex={1000}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateTestYourself}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="title"
                label="Título del Test Yourself"
                rules={[{ required: true, message: 'Por favor ingresa el título' }]}
              >
                <Input placeholder="Ej: Test Yourself - Matemáticas Tema 1" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="subjectAssignmentIds"
                label="Asignaturas / Grupos"
                rules={[{ required: true, message: 'Por favor selecciona al menos una asignatura' }]}
                extra="Puedes seleccionar múltiples asignaturas/grupos para este Test Yourself"
              >
                <Select
                  mode="multiple"
                  placeholder="Selecciona una o más asignaturas"
                  onChange={(values: string[]) => {
                    if (values && values.length > 0) {
                      setSelectedSubjectAssignmentId(values[0]);
                    } else {
                      setSelectedSubjectAssignmentId(null);
                    }
                  }}
                  optionFilterProp="children"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {subjectAssignments.map((assignment: any) => (
                    <Option key={assignment.id} value={assignment.id}>
                      {assignment.subject.name} - {assignment.classGroup?.name}
                    </Option>
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
                rules={[{ required: true, message: 'Selecciona el tipo de evaluación' }]}
                initialValue="score"
              >
                <Select onChange={handleValueTypeChange}>
                  <Option value="emoji">🙂 Emoji (😊😐😞)</Option>
                  <Option value="score">🔢 Numérica (1-10)</Option>
                  <Option value="rubric">📋 Rúbrica</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Selector de Estudiantes Específicos */}
          {selectedSubjectAssignmentId && (
            <Row gutter={16}>
              <Col span={24}>
                <Alert
                  message="Estudiantes para este Test Yourself"
                  description={
                    selectedStudentIds.length === 0
                      ? "Por defecto, se asignará a todos los estudiantes del grupo. Si quieres seleccionar estudiantes específicos, haz clic en el botón de abajo."
                      : `Has seleccionado ${selectedStudentIds.length} estudiante(s) específico(s). Solo estos estudiantes verán este Test Yourself.`
                  }
                  type={selectedStudentIds.length === 0 ? "info" : "success"}
                  showIcon
                  style={{ marginBottom: '16px' }}
                  action={
                    <Button
                      size="small"
                      type={selectedStudentIds.length > 0 ? "default" : "primary"}
                      icon={<UserAddOutlined />}
                      onClick={handleOpenStudentSelector}
                      loading={loadingStudents}
                    >
                      {selectedStudentIds.length === 0 ? 'Seleccionar estudiantes específicos' : 'Modificar selección'}
                    </Button>
                  }
                />
                {selectedStudentIds.length > 0 && availableStudents.length > 0 && (
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f5ff', borderRadius: '8px' }}>
                    <Text strong>Estudiantes seleccionados: </Text>
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedStudentIds.map(studentId => {
                        const student = availableStudents.find(s => s.id === studentId);
                        return student ? (
                          <Tag
                            key={studentId}
                            color="blue"
                            icon={<UserOutlined />}
                            closable
                            onClose={() => {
                              setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
                            }}
                          >
                            {student.user?.profile?.firstName} {student.user?.profile?.lastName}
                          </Tag>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </Col>
            </Row>
          )}

          {/* Selector de Rúbrica (solo cuando valuationType === 'rubric') */}
          {valuationType === 'rubric' && (
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
              </div>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignedDate"
                label="Fecha de Asignación"
                rules={[{ required: true, message: 'Selecciona la fecha de asignación' }]}
                initialValue={dayjs()}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="Fecha de Vencimiento"
                rules={[{ required: true, message: 'Selecciona la fecha de vencimiento' }]}
                initialValue={dayjs().add(7, 'days')}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Descripción"
          >
            <TextArea rows={3} placeholder="Descripción general del Test Yourself..." />
          </Form.Item>

          <Form.Item
            name="instructions"
            label="Instrucciones"
          >
            <TextArea rows={4} placeholder="Instrucciones específicas para los estudiantes..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="maxPoints"
                label="Puntuación Máxima"
                initialValue={100}
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} disabled={valuationType === 'rubric'} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="priority"
                label="Prioridad"
                initialValue="medium"
              >
                <Select>
                  <Option value="low">🟢 Baja</Option>
                  <Option value="medium">🟡 Media</Option>
                  <Option value="high">🔴 Alta</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
                <Text type="secondary" className="text-sm">
                  ⚠️ Los Test Yourself son exámenes presenciales<br/>
                  <strong>No se permiten entregas tardías</strong>
                </Text>
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="visibleToFamilies"
                label="Visibilidad para Familias"
                initialValue={false}
                tooltip="Controla si las familias pueden ver este Test Yourself en sus vistas de tareas y recibir notificaciones sobre él"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Switch
                    checkedChildren="✓ Visible"
                    unCheckedChildren="✗ Oculto"
                  />
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    Por defecto, los Test Yourself NO son visibles para las familias.
                    Activa esta opción si quieres que las familias puedan ver este Test Yourself específico.
                  </Text>
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <Space>
                <Button onClick={() => {
                  setCreateModalVisible(false);
                  createForm.resetFields();
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit">
                  Crear Test Yourself
                </Button>
              </Space>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de Calificación */}
      <Modal
        title={`Calificar ${selectedStudent?.firstName} ${selectedStudent?.lastName}`}
        open={gradingModalVisible}
        onCancel={() => {
          setGradingModalVisible(false);
          form.resetFields();
          // Limpiar estados de rúbrica
          setSelectedCells({});
          setRubric(null);
          setFinalGrade(0);
          setFinalPercentage(0);
          setSubmitting(false);
        }}
        footer={null}
        width={gradingData?.evaluationType === 'rubric' ? 1200 : 600}
        style={{ maxHeight: '90vh' }}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGradeSubmit}
        >
          {/* Mostrar información del tipo de evaluación */}
          {gradingData && (
            <Alert
              message={`Tipo de Evaluación: ${
                gradingData.evaluationType === 'emoji' ? 'Emoji (😊😐😞)' :
                gradingData.evaluationType === 'rubric' ? 'Rúbrica' :
                'Numérica'
              }`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {/* Formulario dinámico según el tipo de evaluación */}
          {renderEvaluationForm()}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="attendanceStatus"
                label="Estado de Asistencia"
                rules={[{ required: true, message: 'Selecciona el estado de asistencia' }]}
              >
                <Select>
                  <Select.Option value="present">Presente</Select.Option>
                  <Select.Option value="absent">Ausente</Select.Option>
                  <Select.Option value="justified_absence">Ausencia Justificada</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="gradedAt"
                label="Fecha de Calificación"
                rules={[{ required: true, message: 'Selecciona la fecha' }]}
              >
                <DatePicker 
                  showTime 
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY HH:mm"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="comments"
            label="Comentarios (Opcional)"
          >
            <TextArea 
              rows={3} 
              placeholder="Observaciones sobre el rendimiento del estudiante..."
            />
          </Form.Item>

          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button
                onClick={() => {
                  setGradingModalVisible(false);
                  form.resetFields();
                  // Limpiar estados de rúbrica
                  setSelectedCells({});
                  setRubric(null);
                  setFinalGrade(0);
                  setFinalPercentage(0);
                  setSubmitting(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createGradeMutation.isPending || submitting}
                disabled={gradingData?.evaluationType === 'rubric' && rubric && Object.keys(selectedCells).length < rubric.criteria.length}
              >
                {gradingData?.evaluationType === 'rubric' && rubric ? 
                  `Guardar Rúbrica (${Object.keys(selectedCells).length}/${rubric.criteria.length})` : 
                  'Guardar Calificación'
                }
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal de Historial de Calificaciones */}
      <Modal
        title={`Historial de Calificaciones - ${historyStudent?.firstName} ${historyStudent?.lastName}`}
        open={historyModalVisible}
        onCancel={() => {
          setHistoryModalVisible(false);
          setHistoryStudent(null);
        }}
        footer={null}
        width={800}
        style={{ maxHeight: '90vh' }}
        bodyStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        {historyLoading ? (
          <Spin style={{ display: 'block', textAlign: 'center', margin: '20px 0' }} />
        ) : gradeHistory?.history?.length > 0 ? (
          <div>
            <Alert
              message={`Total de cambios: ${gradeHistory.totalEntries}`}
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table
              dataSource={gradeHistory.history}
              rowKey="id"
              pagination={false}
              size="small"
              columns={[
                {
                  title: 'Fecha/Hora',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  width: 150,
                  render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
                },
                {
                  title: 'Acción',
                  dataIndex: 'actionType',
                  key: 'actionType',
                  width: 100,
                  render: (action: string) => (
                    <Tag color={action === 'created' ? 'green' : 'blue'}>
                      {action === 'created' ? 'Creada' : 'Actualizada'}
                    </Tag>
                  ),
                },
                {
                  title: 'Calificación',
                  key: 'grade',
                  width: 120,
                  render: (record: any) => {
                    // Obtener maxPoints del metadata o grade_scale
                    const maxPoints = record.metadata?.maxPoints ||
                                     (record.grade_scale && !isNaN(Number(record.grade_scale)) ? Number(record.grade_scale) : null) ||
                                     gradingData?.task?.maxPoints || 100;

                    if (record.emojiGrade) {
                      const emojiIcons = { 'happy': '😊', 'neutral': '😐', 'sad': '😞' };
                      return `${emojiIcons[record.emojiGrade]}`;
                    }
                    if (record.rubricScores) {
                      return `${record.numericGrade}/${maxPoints} (Rúbrica)`;
                    }
                    // Mostrar nota original / maxPoints (ej: 35/47)
                    return `${record.numericGrade}/${maxPoints}${record.letterGrade ? ` (${record.letterGrade})` : ''}`;
                  },
                },
                {
                  title: 'Comentarios',
                  dataIndex: 'comments',
                  key: 'comments',
                  ellipsis: true,
                },
                {
                  title: 'Profesor',
                  dataIndex: 'teacherName',
                  key: 'teacherName',
                  width: 150,
                },
              ]}
            />
          </div>
        ) : (
          <Empty description="No hay historial de calificaciones para este estudiante" />
        )}
      </Modal>

      {/* Modal de Editar Test Yourself */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <EditOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                Editar Test Yourself
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#666' }}>
                Modifica las características de este test
              </div>
            </div>
          </div>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditingTask(null);
          editForm.resetFields();
          setSelectedRubric(null);
          setValueType('score');
        }}
        footer={null}
        width={900}
        zIndex={1000}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateTestYourself}
        >
          <Alert
            message="Características Editables"
            description={
              <div>
                <p>Puedes modificar los siguientes aspectos del Test Yourself:</p>
                <ul style={{ marginBottom: 0 }}>
                  <li><strong>Título y descripción</strong> del test</li>
                  <li><strong>Tipo de evaluación</strong> (Emoji, Numérica, o Rúbrica)</li>
                  <li><strong>Fechas</strong> de asignación y vencimiento</li>
                  <li><strong>Instrucciones</strong> para los estudiantes</li>
                  <li><strong>Puntuación máxima</strong> y prioridad</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: '24px' }}
          />
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="title"
                label="Título del Test Yourself"
                rules={[{ required: true, message: 'Por favor ingresa el título' }]}
              >
                <Input placeholder="Ej: Test Yourself - Matemáticas Tema 1" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="subjectAssignmentIds"
                label="Asignaturas / Grupos"
                rules={[{ required: true, message: 'Por favor selecciona al menos una asignatura' }]}
                extra="Puedes seleccionar múltiples asignaturas/grupos para este Test Yourself"
              >
                <Select
                  mode="multiple"
                  placeholder="Selecciona una o más asignaturas"
                  onChange={(values: string[]) => {
                    if (values && values.length > 0) {
                      setSelectedSubjectAssignmentId(values[0]);
                    } else {
                      setSelectedSubjectAssignmentId(null);
                    }
                  }}
                  optionFilterProp="children"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {subjectAssignments.map((assignment: any) => (
                    <Option key={assignment.id} value={assignment.id}>
                      {assignment.subject.name} - {assignment.classGroup?.name}
                    </Option>
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
                rules={[{ required: true, message: 'Selecciona el tipo de evaluación' }]}
              >
                <Select onChange={handleValueTypeChange}>
                  <Option value="emoji">🙂 Emoji (😊😐😞)</Option>
                  <Option value="score">🔢 Numérica (1-10)</Option>
                  <Option value="rubric">📋 Rúbrica</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Selector de Estudiantes Específicos (también en modo edición) */}
          {selectedSubjectAssignmentId && (
            <Row gutter={16}>
              <Col span={24}>
                <Alert
                  message="Estudiantes asignados a este Test Yourself"
                  description={
                    selectedStudentIds.length === 0
                      ? "Actualmente asignado a todos los estudiantes del grupo. Puedes cambiar esto seleccionando estudiantes específicos."
                      : `${selectedStudentIds.length} estudiante(s) específico(s) seleccionado(s). Puedes modificar la selección.`
                  }
                  type={selectedStudentIds.length === 0 ? "info" : "success"}
                  showIcon
                  style={{ marginBottom: '16px' }}
                  action={
                    <Button
                      size="small"
                      type={selectedStudentIds.length > 0 ? "default" : "primary"}
                      icon={<UserAddOutlined />}
                      onClick={handleOpenStudentSelector}
                      loading={loadingStudents}
                    >
                      {selectedStudentIds.length === 0 ? 'Seleccionar estudiantes específicos' : 'Modificar selección'}
                    </Button>
                  }
                />
                {selectedStudentIds.length > 0 && availableStudents.length > 0 && (
                  <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f5ff', borderRadius: '8px' }}>
                    <Text strong>Estudiantes seleccionados: </Text>
                    <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {selectedStudentIds.map(studentId => {
                        const student = availableStudents.find(s => s.id === studentId);
                        return student ? (
                          <Tag
                            key={studentId}
                            color="blue"
                            icon={<UserOutlined />}
                            closable
                            onClose={() => {
                              setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
                            }}
                          >
                            {student.user?.profile?.firstName} {student.user?.profile?.lastName}
                          </Tag>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </Col>
            </Row>
          )}

          {/* Selector de Rúbrica (solo cuando valuationType === 'rubric') */}
          {valuationType === 'rubric' && (
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
              </div>
            </Form.Item>
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="assignedDate"
                label="Fecha de Asignación"
                rules={[{ required: true, message: 'Selecciona la fecha de asignación' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dueDate"
                label="Fecha de Vencimiento"
                rules={[{ required: true, message: 'Selecciona la fecha de vencimiento' }]}
              >
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Descripción"
          >
            <TextArea rows={3} placeholder="Descripción general del Test Yourself..." />
          </Form.Item>

          <Form.Item
            name="instructions"
            label="Instrucciones"
          >
            <TextArea rows={4} placeholder="Instrucciones específicas para los estudiantes..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="maxPoints"
                label="Puntuación Máxima"
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} disabled={valuationType === 'rubric'} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="priority"
                label="Prioridad"
              >
                <Select>
                  <Option value="low">🟢 Baja</Option>
                  <Option value="medium">🟡 Media</Option>
                  <Option value="high">🔴 Alta</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
                <Text type="secondary" className="text-sm">
                  ⚠️ Los Test Yourself son exámenes presenciales<br/>
                  <strong>No se permiten entregas tardías</strong>
                </Text>
              </div>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="visibleToFamilies"
                label="Visibilidad para Familias"
                initialValue={false}
                tooltip="Controla si las familias pueden ver este Test Yourself en sus vistas de tareas y recibir notificaciones sobre él"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Switch
                    checkedChildren="✓ Visible"
                    unCheckedChildren="✗ Oculto"
                  />
                  <Text type="secondary" style={{ fontSize: '14px' }}>
                    Por defecto, los Test Yourself NO son visibles para las familias.
                    Activa esta opción si quieres que las familias puedan ver este Test Yourself específico.
                  </Text>
                </div>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <div style={{ textAlign: 'right', marginTop: '20px' }}>
              <Space>
                <Button onClick={() => {
                  setEditModalVisible(false);
                  setEditingTask(null);
                  editForm.resetFields();
                  setSelectedRubric(null);
                  setValueType('score');
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit" loading={updateTaskMutation.isPending}>
                  Actualizar Test Yourself
                </Button>
              </Space>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de Selección de Rúbrica */}
      <RubricSelectorModal
        visible={rubricSelectorVisible}
        onCancel={() => setRubricSelectorVisible(false)}
        onSelect={handleRubricSelect}
        rubrics={rubrics}
        currentTeacherId={currentTeacherId}
        selectedRubricId={selectedRubric?.id}
      />

      {/* Modal de Selección de Estudiantes Específicos */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <TeamOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <div>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                Seleccionar Estudiantes Específicos
              </div>
              <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#666' }}>
                Elige los estudiantes que realizarán este Test Yourself
              </div>
            </div>
          </div>
        }
        open={studentSelectorVisible}
        onCancel={() => setStudentSelectorVisible(false)}
        onOk={() => setStudentSelectorVisible(false)}
        width={800}
        okText="Confirmar Selección"
        cancelText="Cancelar"
        zIndex={1100}
      >
        <Alert
          message={
            selectedStudentIds.length === 0
              ? "Ningún estudiante seleccionado - se asignará a TODOS los estudiantes del grupo"
              : `${selectedStudentIds.length} estudiante(s) seleccionado(s)`
          }
          type={selectedStudentIds.length === 0 ? "warning" : "success"}
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Transfer
          dataSource={availableStudents.map(student => ({
            key: student.id,
            title: `${student.user?.profile?.firstName || ''} ${student.user?.profile?.lastName || ''}`,
            description: student.enrollmentNumber || 'Sin número de matrícula',
          }))}
          titles={['Disponibles', 'Seleccionados']}
          targetKeys={selectedStudentIds}
          onChange={handleStudentSelectionChange}
          render={item => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size="small" icon={<UserOutlined />} />
              <div>
                <div style={{ fontWeight: 'bold' }}>{item.title}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{item.description}</div>
              </div>
            </div>
          )}
          listStyle={{
            width: 350,
            height: 400,
          }}
          showSearch
          filterOption={(inputValue, option) =>
            option.title.toLowerCase().indexOf(inputValue.toLowerCase()) > -1 ||
            option.description.toLowerCase().indexOf(inputValue.toLowerCase()) > -1
          }
          locale={{
            itemUnit: 'estudiante',
            itemsUnit: 'estudiantes',
            searchPlaceholder: 'Buscar estudiante...',
            notFoundContent: 'No hay estudiantes disponibles',
          }}
        />

        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f6ffed', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
          <Text strong>💡 Consejo: </Text>
          <Text type="secondary">
            Si no seleccionas ningún estudiante, el Test Yourself se asignará automáticamente a <strong>todos los estudiantes del grupo</strong>.
            Selecciona estudiantes específicos solo si quieres limitar el test a ciertos alumnos.
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default TestYourselfPage;