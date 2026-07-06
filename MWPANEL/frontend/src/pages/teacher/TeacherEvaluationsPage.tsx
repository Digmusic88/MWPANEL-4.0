import React, { useState, useEffect } from 'react';
import { useAuth } from '@hooks/useAuth';
import {
  Card,
  Row,
  Col,
  Typography,
  Select,
  Table,
  Tag,
  Progress,
  Button,
  Space,
  Empty,
  Spin,
  Alert,
  Input,
  DatePicker,
  Badge,
  Avatar,
  Modal,
  Form,
  Rate,
  Tooltip,
  Drawer,
  Switch,
} from 'antd';
import InteractiveButton from '@components/animations/InteractiveButton';
import {
  FileTextOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  CalendarOutlined,
  UserOutlined,
  BookOutlined,
  StarOutlined,
  SendOutlined,
  PoweroffOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useResponsive } from '../../hooks/useResponsive';
import apiClient from '../../services/apiClient';
import dayjs from 'dayjs';
import { GradingPageHelp } from '../../components/grading/GradingPageHelp';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

interface Evaluation {
  id: string;
  student: {
    id: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
    classGroup: {
      id: string;
      name: string;
    };
  };
  subject: {
    id: string;
    name: string;
    code: string;
  };
  period: {
    id: string;
    name: string;
  };
  status: 'draft' | 'submitted' | 'reviewed' | 'finalized';
  generalObservations?: string;
  overallScore?: number;
  competencyEvaluations: Array<{
    id: string;
    competency: {
      id: string;
      name: string;
      code: string;
    };
    score: number;
    observations?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface EvaluationFormData {
  studentId: string;
  subjectId: string;
  periodId: string;
  teacherId: string;
  generalObservations?: string;
  competencyEvaluations: Array<{
    competencyId: string;
    score: number;
    observations?: string;
    isActive?: boolean;
  }>;
}

const TeacherEvaluationsPage: React.FC = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    subjectId: '',
    periodId: '',
    classGroupId: '',
    search: '',
  });
  const [appliedFilters, setAppliedFilters] = useState({
    status: '',
    subjectId: '',
    periodId: '',
    classGroupId: '',
    search: '',
  });
  const [students, setStudents] = useState<any[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [competencies, setCompetencies] = useState<any[]>([]);
  const [classGroups, setClassGroups] = useState<any[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(null);
  const [viewingEvaluation, setViewingEvaluation] = useState<Evaluation | null>(null);
  const [activeCompetencies, setActiveCompetencies] = useState<Set<string>>(new Set());
  const [form] = Form.useForm();
  const { isMobile, isTablet } = useResponsive();

  // Handle competency toggle
  const handleCompetencyToggle = (competencyId: string, checked: boolean) => {
    const newActiveCompetencies = new Set(activeCompetencies);
    
    if (checked) {
      newActiveCompetencies.add(competencyId);
    } else {
      newActiveCompetencies.delete(competencyId);
      // Clear form values when competency is deactivated
      const currentValues = form.getFieldsValue();
      const competencyEvaluations = currentValues.competencyEvaluations || [];
      const competencyIndex = competencies.findIndex(comp => comp.id === competencyId);
      if (competencyIndex !== -1) {
        competencyEvaluations[competencyIndex] = {
          ...competencyEvaluations[competencyIndex],
          score: 0,
          observations: '',
        };
        form.setFieldsValue({ competencyEvaluations });
      }
    }
    
    setActiveCompetencies(newActiveCompetencies);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get current user to find teacher ID
      const userResponse = await apiClient.get('/auth/me');
      const currentUser = userResponse.data;

      // Find teacher by user ID
      const teachersResponse = await apiClient.get('/teachers');
      const teachers = (teachersResponse.data || []).filter((teacher: any) => teacher?.user?.id); // Filter invalid teachers
      const currentTeacher = teachers.find((teacher: any) => teacher.user.id === currentUser?.id);

      if (!currentTeacher) {
        throw new Error('No se encontró el perfil de profesor');
      }

      const [
        evaluationsRes,
        periodsRes,
        competenciesRes,
        assignmentsRes,
        classGroupsRes,
      ] = await Promise.all([
        apiClient.get(`/evaluations/teacher/${currentTeacher.id}`),
        apiClient.get('/evaluations/periods'),
        apiClient.get('/competencies'),
        apiClient.get(`/subjects/assignments/teacher/${currentTeacher.id}`),
        apiClient.get(`/class-groups?tutorId=${currentTeacher.id}`),
      ]);

      console.log('🔍 fetchData - Raw evaluations from API:', evaluationsRes.data);
      console.log('🔍 fetchData - First evaluation competencyEvaluations:', evaluationsRes.data[0]?.competencyEvaluations);
      setEvaluations(evaluationsRes.data);
      
      // Ordenar períodos: trimestres primero, evaluación final al final
      const sortedPeriods = periodsRes.data.sort((a: any, b: any) => {
        const order = {
          'trimester_1': 1,
          'trimester_2': 2, 
          'trimester_3': 3,
          'final': 4,
          'continuous': 5,
          'extraordinary': 6
        };
        return (order[a.type] || 99) - (order[b.type] || 99);
      });
      setPeriods(sortedPeriods);
      
      setCompetencies(competenciesRes.data);
      
      // Procesar las asignaciones para extraer subjects y students
      const assignments = assignmentsRes.data;
      console.log('📚 Asignaciones recibidas:', assignments);
      
      // Extraer subjects únicos con información del class group
      const subjectsMap = new Map();
      const allStudents = new Set();
      
      assignments.forEach((assignment: any) => {
        // Agregar subject con su class group
        if (!subjectsMap.has(assignment.subject.id)) {
          subjectsMap.set(assignment.subject.id, {
            ...assignment.subject,
            classGroup: assignment.classGroup,
            assignments: [assignment]
          });
        } else {
          // Si ya existe, agregar esta asignación
          const existingSubject = subjectsMap.get(assignment.subject.id);
          existingSubject.assignments.push(assignment);
        }
        
        // Agregar estudiantes del class group
        if (assignment.classGroup?.students) {
          assignment.classGroup.students.forEach((student: any) => {
            // Verificar que el estudiante tenga la estructura necesaria
            if (student && student.id && student.user && student.user.profile) {
              allStudents.add(JSON.stringify({
                ...student,
                classGroup: {
                  id: assignment.classGroup.id,
                  name: assignment.classGroup.name
                }
              }));
            } else {
              console.warn('⚠️ Estudiante con estructura incompleta ignorado:', student);
            }
          });
        }
      });
      
      const subjectsArray = Array.from(subjectsMap.values());
      const studentsArray = Array.from(allStudents).map(studentStr => JSON.parse(studentStr as string));
      
      console.log('📚 Subjects procesados:', subjectsArray);
      console.log('👥 Estudiantes extraídos:', studentsArray);
      
      setSubjects(subjectsArray);
      setClassGroups(classGroupsRes.data);
      setStudents(studentsArray);
      setFilteredStudents([]); // Inicialmente vacío hasta seleccionar asignatura
    } catch (error) {
      console.error('Error fetching evaluations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para filtrar estudiantes por asignatura
  const filterStudentsBySubject = (subjectId: string | null) => {
    console.log('🔍 Filtrando estudiantes por asignatura:', subjectId);
    console.log('📚 Asignaturas disponibles:', subjects);
    console.log('👥 Estudiantes totales:', students.length);
    
    if (!subjectId) {
      console.log('❌ No hay asignatura seleccionada, lista vacía');
      setFilteredStudents([]);
      return;
    }

    // Buscar la asignatura seleccionada
    const selectedSubject = subjects.find(subject => subject.id === subjectId);
    console.log('✅ Asignatura seleccionada:', selectedSubject);
    
    if (!selectedSubject) {
      console.log('❌ Asignatura no encontrada');
      setFilteredStudents([]);
      return;
    }

    // Filtrar estudiantes por todas las asignaciones de esta asignatura
    const allStudentsForSubject = new Set();
    
    // Si la asignatura tiene múltiples asignaciones (múltiples grupos), incluir estudiantes de todos
    if (selectedSubject.assignments) {
      selectedSubject.assignments.forEach((assignment: any) => {
        if (assignment.classGroup?.students) {
          assignment.classGroup.students.forEach((student: any) => {
            // Verificar que el estudiante tenga la estructura necesaria
            if (student && student.id && student.user && student.user.profile) {
              allStudentsForSubject.add(JSON.stringify({
                ...student,
                classGroup: {
                  id: assignment.classGroup.id,
                  name: assignment.classGroup.name
                }
              }));
            } else {
              console.warn('⚠️ Estudiante con estructura incompleta en filterStudentsBySubject:', student);
            }
          });
        }
      });
    } else {
      // Método fallback: usar el classGroup principal
      const classGroupId = selectedSubject.classGroup?.id;
      console.log('🏫 Grupo de clase de la asignatura:', classGroupId);
      
      if (classGroupId) {
        students.filter(student => student.classGroup?.id === classGroupId)
          .forEach(student => {
            // Verificar que el estudiante tenga la estructura necesaria en método fallback
            if (student && student.id && student.user && student.user.profile) {
              allStudentsForSubject.add(JSON.stringify(student));
            } else {
              console.warn('⚠️ Estudiante con estructura incompleta en método fallback:', student);
            }
          });
      }
    }
    
    const filtered = Array.from(allStudentsForSubject).map(studentStr => JSON.parse(studentStr as string));
    console.log('📋 Estudiantes filtrados:', filtered.length, filtered);
    setFilteredStudents(filtered);
  };

  // Manejar cambio de asignatura
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    filterStudentsBySubject(subjectId);
    
    // Limpiar el estudiante seleccionado cuando cambia la asignatura
    form.setFieldsValue({ studentId: undefined });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Initialize all competencies as active when modal opens
  useEffect(() => {
    if (modalVisible && competencies.length > 0) {
      console.log('🔍 TeacherEvaluationsPage - Initializing competencies:', competencies.length);
      const newActiveCompetencies = new Set<string>();
      competencies.forEach(competency => {
        newActiveCompetencies.add(competency.id);
      });
      setActiveCompetencies(newActiveCompetencies);
      console.log('🔍 TeacherEvaluationsPage - Active competencies set:', newActiveCompetencies);
    }
  }, [modalVisible, competencies]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finalized': return 'success';
      case 'reviewed': return 'processing';
      case 'submitted': return 'warning';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'finalized': return 'Finalizada';
      case 'reviewed': return 'Revisada';
      case 'submitted': return 'Enviada';
      case 'draft': return 'Borrador';
      default: return status;
    }
  };

  const handleCreateEvaluation = async (values: any) => {
    try {
      if (!user?.teacherId) {
        console.error('🔍 TeacherEvaluationsPage - No teacherId found for user:', user);
        alert('Error: No se pudo identificar al profesor. Por favor, inicia sesión nuevamente.');
        return;
      }

      console.log('🔍 TeacherEvaluationsPage - Form values received:', values);
      console.log('🔍 TeacherEvaluationsPage - Raw generalObservations:', values.generalObservations);
      
      const evaluationData: EvaluationFormData = {
        studentId: values.studentId,
        subjectId: values.subjectId,
        periodId: values.periodId,
        teacherId: user.teacherId,
        generalObservations: (values.generalObservations && values.generalObservations.trim()) || '',
        competencyEvaluations: values.competencyEvaluations
          .map((comp: any, index: number) => {
            const competency = competencies[index];
            const isActive = activeCompetencies.has(competency?.id);
            
            return {
              competencyId: comp.competencyId || competency?.id,
              score: isActive ? (comp.score || 3) : 0, // Default score 3 if missing
              observations: isActive ? (comp.observations || '') : '', // Ensure string
              isActive, // Add isActive field
            };
          })
          .filter((comp: any) => comp.isActive && comp.competencyId), // Only include active competencies with valid ID
      };

      console.log('🔍 TeacherEvaluationsPage - Sending evaluation data:', evaluationData);
      console.log('🔍 TeacherEvaluationsPage - Competency evaluations count:', evaluationData.competencyEvaluations.length);
      console.log('🔍 TeacherEvaluationsPage - First competency evaluation:', evaluationData.competencyEvaluations[0]);
      
      // Validation: Ensure we have at least one competency evaluation
      if (evaluationData.competencyEvaluations.length === 0) {
        console.error('❌ No active competency evaluations to send');
        alert('Error: Debes activar al menos una competencia para crear la evaluación.');
        return;
      }
      
      // FIX: Bypass apiClient interceptors that cause 500 error
      // Get token manually and use direct axios call
      const authData = localStorage.getItem('mw-panel-auth');
      let token = '';
      if (authData) {
        try {
          const { state } = JSON.parse(authData);
          token = state.accessToken || '';
        } catch (e) {
          console.error('Error parsing auth data:', e);
        }
      }

      console.log('🔍 TeacherEvaluationsPage - Making fetch request to /api/evaluations');
      console.log('🔍 TeacherEvaluationsPage - USING FETCH BYPASS - NOT apiClient');
      
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(evaluationData),
      });

      console.log('🔍 TeacherEvaluationsPage - Response status:', response.status);
      console.log('🔍 TeacherEvaluationsPage - Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error text:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Evaluation created successfully:', result);
      
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      console.error('❌ Error creating evaluation:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  };

  const handleUpdateEvaluation = async (evaluationId: string, values: any) => {
    try {
      await apiClient.patch(`/evaluations/${evaluationId}`, values);
      setEditingEvaluation(null);
      setDrawerVisible(false);
      fetchData();
    } catch (error: any) {
      console.error('Error updating evaluation:', error);
    }
  };

  const handleDeleteEvaluation = async (evaluationId: string) => {
    try {
      console.log('🔍 TeacherEvaluationsPage - Deleting evaluation:', evaluationId);
      
      // Get token manually for DELETE request
      const authData = localStorage.getItem('mw-panel-auth');
      let token = '';
      if (authData) {
        try {
          const { state } = JSON.parse(authData);
          token = state.accessToken || '';
        } catch (e) {
          console.error('Error parsing auth data:', e);
        }
      }

      const response = await fetch(`/api/evaluations/${evaluationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Delete response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      console.log('✅ Evaluation deleted successfully');
      fetchData();
    } catch (error: any) {
      console.error('❌ Error deleting evaluation:', error);
    }
  };

  const columns: ColumnsType<Evaluation> = [
    {
      title: 'Estudiante',
      key: 'student',
      width: isMobile ? 150 : 200,
      render: (record: Evaluation) => (
        <div className="flex items-center gap-2">
          <Avatar size="small" icon={<UserOutlined />} />
          <div>
            <Text strong>
              {record.student?.user?.profile?.firstName || 'N/A'} {record.student?.user?.profile?.lastName || ''}
            </Text>
            <div className="text-sm text-gray-500">{record.student?.classGroup?.name || 'Sin clase'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Asignatura',
      key: 'subject',
      width: 150,
      render: (record: Evaluation) => (
        <div>
          <Text>{record.subject?.name || 'N/A'}</Text>
          <div className="text-sm text-gray-500">{record.subject?.code || 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Período',
      dataIndex: ['period', 'name'],
      key: 'period',
      width: 120,
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Puntuación',
      dataIndex: 'overallScore',
      key: 'overallScore',
      width: 120,
      render: (score: number) => (
        score !== undefined && score !== null && typeof score === 'number' ? (
          <div>
            <Rate disabled value={score} count={5} allowHalf />
            <div className="text-sm text-gray-500">{score.toFixed(1)}/5.0</div>
          </div>
        ) : (
          <Text type="secondary">Pendiente</Text>
        )
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 150,
      render: (record: Evaluation) => (
        <Space size="small">
          <Tooltip title="Ver detalles">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setViewingEvaluation(record);
                setDrawerVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingEvaluation(record);
                setDrawerVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={() => {
                Modal.confirm({
                  title: '¿Estás seguro?',
                  content: 'Esta acción eliminará la evaluación permanentemente.',
                  onOk: () => handleDeleteEvaluation(record.id),
                });
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    const emptyFilters = {
      status: '',
      subjectId: '',
      periodId: '',
      classGroupId: '',
      search: '',
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const filteredEvaluations = evaluations.filter((evaluation) => {
    const matchesStatus = !appliedFilters.status || evaluation.status === appliedFilters.status;
    const matchesSubject = !appliedFilters.subjectId || evaluation.subject?.id === appliedFilters.subjectId;
    const matchesPeriod = !appliedFilters.periodId || evaluation.period?.id === appliedFilters.periodId;
    const matchesSearch = !appliedFilters.search ||
      evaluation.student?.user?.profile?.firstName?.toLowerCase().includes(appliedFilters.search.toLowerCase()) ||
      evaluation.student?.user?.profile?.lastName?.toLowerCase().includes(appliedFilters.search.toLowerCase()) ||
      evaluation.subject?.name?.toLowerCase().includes(appliedFilters.search.toLowerCase());

    return matchesStatus && matchesSubject && matchesPeriod && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="!mb-2">
            Mis Evaluaciones
          </Title>
          <Text type="secondary">
            Gestiona las evaluaciones de competencias de tus estudiantes
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          onClick={() => setModalVisible(true)}
        >
          Nueva Evaluación
        </Button>
      </div>

      <GradingPageHelp
        title="Evaluación Competencial — ¿qué es y cómo se usa?"
        whatIs="Aquí valoras a cada alumno en las competencias clave con una escala de 1 a 5, por asignatura y periodo. Es una evaluación por competencias (visión global), complementaria a las notas del cuaderno y a la evaluación por criterios."
        steps={[
          'Pulsa «Nueva Evaluación» para abrir el formulario.',
          'Elige la asignatura; a continuación se habilitará el desplegable de estudiantes con los alumnos de esa asignatura.',
          'Selecciona el alumno y el periodo (trimestre o evaluación final).',
          'Escribe observaciones generales si lo deseas.',
          'Para cada competencia, usa el interruptor para activarla/desactivarla y pon una puntuación de 1 a 5 con observaciones opcionales.',
          'Pulsa «Crear Evaluación» para guardar. La evaluación aparecerá en la tabla y alimentará el gráfico radar del alumno.',
          'Desde la tabla puedes ver el detalle (ojo), editar (lápiz) o eliminar (papelera) cualquier evaluación.',
        ]}
        purpose="Genera el gráfico de competencias (radar) del alumno y alimenta informes y el seguimiento competencial a lo largo del curso."
        levels={[
          { label: '1', color: 'red', meaning: 'Nivel más bajo / inicial' },
          { label: '2', color: 'orange', meaning: 'En proceso' },
          { label: '3', color: 'gold', meaning: 'Adecuado' },
          { label: '4', color: 'blue', meaning: 'Bueno' },
          { label: '5', color: 'green', meaning: 'Excelente / dominio' },
        ]}
      />

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{evaluations.length}</div>
              <div className="text-gray-500">Total Evaluaciones</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {evaluations.filter(e => e.status === 'finalized').length}
              </div>
              <div className="text-gray-500">Finalizadas</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {evaluations.filter(e => e.status === 'draft').length}
              </div>
              <div className="text-gray-500">Borradores</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(() => {
                  const evaluationsWithScores = evaluations.filter(e => e.overallScore !== undefined && e.overallScore !== null);
                  if (evaluationsWithScores.length === 0) return '0.0';
                  const average = evaluationsWithScores.reduce((sum, e) => sum + (e.overallScore || 0), 0) / evaluationsWithScores.length;
                  return Math.round(average * 10) / 10;
                })()}
              </div>
              <div className="text-gray-500">Promedio</div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card title="Filtros" size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Input
              placeholder="Buscar estudiante o asignatura..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Estado"
              style={{ width: '100%' }}
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              allowClear
            >
              <Option value="draft">Borrador</Option>
              <Option value="submitted">Enviada</Option>
              <Option value="reviewed">Revisada</Option>
              <Option value="finalized">Finalizada</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Asignatura"
              style={{ width: '100%' }}
              value={filters.subjectId}
              onChange={(value) => setFilters(prev => ({ ...prev, subjectId: value }))}
              allowClear
            >
              {subjects.map(subject => (
                <Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Select
              placeholder="Período"
              style={{ width: '100%' }}
              value={filters.periodId}
              onChange={(value) => setFilters(prev => ({ ...prev, periodId: value }))}
              allowClear
            >
              {periods.map(period => (
                <Option key={period.id} value={period.id}>
                  {period.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} lg={6}>
            <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
              <InteractiveButton 
                variant="primary" 
                icon={<SearchOutlined />}
                onClick={applyFilters}
                size="medium"
                className={isMobile ? 'w-full' : ''}
              >
                Aplicar Filtros
              </InteractiveButton>
              <InteractiveButton 
                variant="secondary"
                onClick={clearFilters}
                size="medium"
                className={isMobile ? 'w-full' : ''}
              >
                Limpiar
              </InteractiveButton>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Evaluations Table */}
      <Card title={`Evaluaciones (${filteredEvaluations.length})`}>
        {filteredEvaluations.length === 0 ? (
          <Empty
            description="No se encontraron evaluaciones"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <Table
            dataSource={filteredEvaluations}
            columns={columns}
            rowKey="id"
            scroll={{ x: isMobile ? 800 : undefined }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: !isMobile,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} de ${total} evaluaciones`,
            }}
            size={isMobile ? 'small' : 'middle'}
          />
        )}
      </Card>

      {/* Create Evaluation Modal */}
      <Modal
        title="Nueva Evaluación"
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateEvaluation}
          initialValues={{
            competencyEvaluations: competencies.map(comp => ({
              competencyId: comp.id,
              score: 3,
              observations: '',
            })),
          }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="subjectId"
                label="Asignatura"
                rules={[{ required: true, message: 'Selecciona una asignatura' }]}
              >
                <Select 
                  placeholder="Seleccionar asignatura"
                  onChange={handleSubjectChange}
                >
                  {subjects.map(subject => (
                    <Option key={subject.id} value={subject.id}>
                      {subject.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="studentId"
                label="Estudiante"
                rules={[{ required: true, message: 'Selecciona un estudiante' }]}
              >
                <Select 
                  placeholder={selectedSubjectId ? "Seleccionar estudiante" : "Primero selecciona una asignatura"}
                  showSearch
                  disabled={!selectedSubjectId}
                >
                  {filteredStudents.map(student => (
                    <Option key={student.id} value={student.id}>
                      {student.user?.profile?.firstName || 'Nombre'} {student.user?.profile?.lastName || 'No disponible'} - {student.classGroup?.name || 'Sin clase'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="periodId"
            label="Período"
            rules={[{ required: true, message: 'Selecciona un período' }]}
          >
            <Select placeholder="Seleccionar período">
              {periods.map(period => (
                <Option key={period.id} value={period.id}>
                  {period.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="generalObservations" label="Observaciones Generales">
            <TextArea rows={3} placeholder="Observaciones generales sobre la evaluación..." />
          </Form.Item>

          <div className="mb-4">
            <Text strong>Evaluación por Competencias</Text>
          </div>

          <Alert
            message="Control de Competencias"
            description="Usa los interruptores en cada competencia para activar/desactivar su evaluación. Solo las competencias activas serán incluidas en el cálculo final."
            type="info"
            showIcon
            className="mb-4"
          />

          <Form.List name="competencyEvaluations">
            {(fields) => (
              <>
                {fields.map(({ key, name }) => {
                  const competency = competencies[name];
                  if (!competency) return null;

                  const isActive = activeCompetencies.has(competency.id);
                  console.log('🔍 TeacherEvaluationsPage - Rendering competency:', competency.code, 'isActive:', isActive, 'activeCompetencies:', activeCompetencies);

                  return (
                    <Card 
                      key={key} 
                      size="small" 
                      className={`mb-4 ${isActive ? 'bg-gray-50' : 'bg-gray-100'} ${
                        !isActive ? 'opacity-60' : ''
                      }`}
                    >
                      <Form.Item name={[name, 'competencyId']} hidden>
                        <Input />
                      </Form.Item>
                      
                      {/* Competency Header with Toggle */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <Text strong className="text-base">
                            {competency.code}: {competency.name}
                          </Text>
                          {competency.description && (
                            <Text className="block text-sm text-gray-600 mt-1">
                              {competency.description}
                            </Text>
                          )}
                        </div>
                        <Tooltip title={isActive ? "Desactivar competencia" : "Activar competencia"}>
                          <Switch
                            checked={isActive}
                            onChange={(checked) => handleCompetencyToggle(competency.id, checked)}
                            checkedChildren={<PoweroffOutlined />}
                            unCheckedChildren={<PoweroffOutlined />}
                            size="small"
                            style={{
                              backgroundColor: isActive ? '#52c41a' : '#d9d9d9'
                            }}
                          />
                        </Tooltip>
                      </div>
                      
                      <Row gutter={16}>
                        <Col span={8}>
                          <Form.Item
                            name={[name, 'score']}
                            label="Puntuación"
                            rules={isActive ? [
                              { required: true, message: 'Puntuación requerida' }
                            ] : []}
                          >
                            <Rate 
                              count={5} 
                              allowHalf 
                              disabled={!isActive}
                              style={{ color: isActive ? undefined : '#d9d9d9' }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={16}>
                          <Form.Item
                            name={[name, 'observations']}
                            label="Observaciones"
                          >
                            <TextArea 
                              rows={2} 
                              placeholder={isActive ? 
                                "Observaciones específicas..." : 
                                "Competencia desactivada - No se pueden agregar observaciones"
                              }
                              disabled={!isActive}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  );
                })}
              </>
            )}
          </Form.List>

          <div className="text-right mt-4">
            <Space>
              <Button onClick={() => {
                setModalVisible(false);
                form.resetFields();
              }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                Crear Evaluación
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* View/Edit Evaluation Drawer */}
      <Drawer
        title={viewingEvaluation ? "Detalles de Evaluación" : "Editar Evaluación"}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setViewingEvaluation(null);
          setEditingEvaluation(null);
        }}
        width={800}
      >
        {viewingEvaluation && (
          // Read-only view
          <div className="space-y-4">
            <Card size="small">
              <div className="space-y-2">
                <div><Text strong>Estudiante:</Text> {viewingEvaluation?.student?.user?.profile?.firstName || 'N/A'} {viewingEvaluation?.student?.user?.profile?.lastName || ''}</div>
                <div><Text strong>Clase:</Text> {viewingEvaluation?.student?.classGroup?.name || 'N/A'}</div>
                <div><Text strong>Asignatura:</Text> {viewingEvaluation?.subject?.name || 'N/A'}</div>
                <div><Text strong>Período:</Text> {viewingEvaluation?.period?.name || 'N/A'}</div>
                <div><Text strong>Estado:</Text> <Tag color={getStatusColor(viewingEvaluation?.status || '')}>{getStatusText(viewingEvaluation?.status || '')}</Tag></div>
                {viewingEvaluation?.overallScore !== undefined && viewingEvaluation?.overallScore !== null && !isNaN(viewingEvaluation?.overallScore || 0) && (
                  <div><Text strong>Puntuación:</Text> <Rate disabled value={viewingEvaluation?.overallScore || 0} count={5} allowHalf /></div>
                )}
              </div>
            </Card>

            {viewingEvaluation?.generalObservations && (
              <Card size="small" title="Observaciones Generales">
                <Text>{viewingEvaluation?.generalObservations}</Text>
              </Card>
            )}

            <Card size="small" title="Evaluación por Competencias">
              <div className="space-y-3">
                {console.log('🔍 View Drawer - competencyEvaluations:', viewingEvaluation?.competencyEvaluations)}
                {viewingEvaluation?.competencyEvaluations?.map((compEval) => (
                  <div key={compEval?.id || Math.random()} className="border-b pb-3 mb-3">
                    <div className="mb-2">
                      <Text strong>{compEval?.competency?.code || 'N/A'}: {compEval?.competency?.name || 'N/A'}</Text>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Rate 
                        disabled 
                        value={compEval?.score !== undefined && compEval?.score !== null && !isNaN(compEval.score) ? compEval.score : 0} 
                        count={5} 
                        allowHalf
                      />
                      <Text type="secondary">({compEval?.score !== undefined && compEval?.score !== null && !isNaN(compEval.score) ? compEval.score : 0}/5)</Text>
                    </div>
                    {compEval?.observations && (
                      <Text type="secondary" className="text-sm">{compEval.observations}</Text>
                    )}
                  </div>
                )) || (
                  <Text type="secondary">No hay evaluaciones de competencias disponibles</Text>
                )}
              </div>
            </Card>
          </div>
        )}

        {editingEvaluation && (
          // Editable form
          <Form
            layout="vertical"
            onFinish={(values) => handleUpdateEvaluation(editingEvaluation.id, {
              generalObservations: values.generalObservations,
              status: values.status,
              competencyEvaluations: values.competencyEvaluations.map((comp: any) => ({
                competencyId: comp.competencyId,
                score: comp.score,
                observations: comp.observations,
              })),
            })}
            initialValues={{
              status: editingEvaluation.status,
              generalObservations: editingEvaluation.generalObservations,
              competencyEvaluations: editingEvaluation.competencyEvaluations?.map(compEval => ({
                competencyId: compEval.competency?.id,
                score: compEval.score,
                observations: compEval.observations || '',
              })) || [],
            }}
          >
            {/* Basic Info (Read-only) */}
            <Card size="small" title="Información de la Evaluación">
              <div className="space-y-2">
                <div><Text strong>Estudiante:</Text> {editingEvaluation?.student?.user?.profile?.firstName || 'N/A'} {editingEvaluation?.student?.user?.profile?.lastName || ''}</div>
                <div><Text strong>Clase:</Text> {editingEvaluation?.student?.classGroup?.name || 'N/A'}</div>
                <div><Text strong>Asignatura:</Text> {editingEvaluation?.subject?.name || 'N/A'}</div>
                <div><Text strong>Período:</Text> {editingEvaluation?.period?.name || 'N/A'}</div>
              </div>
            </Card>

            {/* Status */}
            <Form.Item
              name="status"
              label="Estado"
              rules={[{ required: true, message: 'Selecciona un estado' }]}
            >
              <Select>
                <Option value="draft">Borrador</Option>
                <Option value="submitted">Enviada</Option>
                <Option value="reviewed">Revisada</Option>
                <Option value="finalized">Finalizada</Option>
              </Select>
            </Form.Item>

            {/* General Observations */}
            <Form.Item name="generalObservations" label="Observaciones Generales">
              <TextArea rows={3} placeholder="Observaciones generales sobre la evaluación..." />
            </Form.Item>

            {/* Competency Evaluations */}
            <div className="mb-4">
              <Text strong>Evaluación por Competencias</Text>
            </div>

            <Form.List name="competencyEvaluations">
              {(fields) => (
                <>
                  {fields.map(({ key, name }) => {
                    console.log('🔍 Edit Drawer - Field name:', name, 'Available competencyEvaluations:', editingEvaluation.competencyEvaluations?.length);
                    const competency = editingEvaluation.competencyEvaluations?.[name]?.competency;
                    console.log('🔍 Edit Drawer - Found competency:', competency);
                    if (!competency) return null;

                    return (
                      <Card key={key} size="small" className="mb-4">
                        <Form.Item name={[name, 'competencyId']} hidden>
                          <Input />
                        </Form.Item>
                        
                        <div className="mb-2">
                          <Text strong>{competency.code}: {competency.name}</Text>
                        </div>
                        
                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item
                              name={[name, 'score']}
                              label="Puntuación"
                              rules={[{ required: true, message: 'Asigna una puntuación' }]}
                            >
                              <Rate count={5} allowHalf />
                            </Form.Item>
                          </Col>
                          <Col span={16}>
                            <Form.Item
                              name={[name, 'observations']}
                              label="Observaciones"
                            >
                              <TextArea rows={2} placeholder="Observaciones específicas..." />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    );
                  })}
                </>
              )}
            </Form.List>

            {/* Action Buttons */}
            <div className="text-right mt-4">
              <Space>
                <Button onClick={() => {
                  setDrawerVisible(false);
                  setEditingEvaluation(null);
                }}>
                  Cancelar
                </Button>
                <Button type="primary" htmlType="submit" icon={<SendOutlined />}>
                  Guardar Cambios
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Drawer>
    </div>
  );
};

export default TeacherEvaluationsPage;