import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Space,
  Typography,
  Select,
  Tag,
  Row,
  Col,
  Statistic,
  Drawer,
  Avatar,
  Divider,
  Alert,
  Empty,
  Spin,
  Collapse,
  Modal,
} from 'antd';
import {
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  TrophyOutlined,
  UserOutlined,
  FileTextOutlined,
  DownloadOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '@services/apiClient';
import {
  Task,
  StudentTaskStatistics,
  TASK_TYPE_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_COLORS,
  SUBMISSION_STATUS_LABELS,
} from '@/types/tasks';
import { TaskAttachmentsSection } from '../../components/attachments';
import AcademicYearSelector from '../../components/common/AcademicYearSelector';
import { formatTaskGrade } from '../../utils/numberFormat';

const { Title, Text } = Typography;
const { Option } = Select;

interface FamilyTasksQuery {
  page?: number;
  limit?: number;
  submissionStatus?: string;
  onlyPending?: boolean;
  onlyGraded?: boolean;
  subjectId?: string;
  studentId?: string;
}

interface FamilyStudent {
  id: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

const FamilyTasksPage: React.FC = () => {
  // Estados principales
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<FamilyStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | undefined>();
  const [statistics, setStatistics] = useState<{ [studentId: string]: StudentTaskStatistics }>({});
  
  // Estados de modales y formularios
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [attachmentTaskId, setAttachmentTaskId] = useState<string | null>(null);
  
  // Estados para detalles de rúbrica
  const [rubricModalVisible, setRubricModalVisible] = useState(false);
  const [rubricDetails, setRubricDetails] = useState<any>(null);
  const [loadingRubricDetails, setLoadingRubricDetails] = useState(false);
  
  // Estados de filtros y paginación
  const [filters, setFilters] = useState<FamilyTasksQuery>({
    page: 1,
    limit: 20,
  });
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'by-student'>('by-student');

  // Estado del selector de año académico (filtro de listado)
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      fetchTasks();
      fetchAllStatistics();
    }
  }, [filters, students, viewMode, selectedYearId]);

  const fetchStudents = async () => {
    try {
      const response = await apiClient.get('/families/my-children');
      setStudents(response.data || []);
      if (response.data && response.data.length > 0 && !selectedStudent) {
        setSelectedStudent(response.data[0].id);
        setFilters(prev => ({ ...prev, studentId: response.data[0].id }));
      }
    } catch (error: any) {
      console.error('Error fetching students:', error);
      setStudents([]);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        // En modo 'by-student', NO filtrar por studentId para obtener tareas de todos los hijos
        if (key === 'studentId' && viewMode === 'by-student') {
          return; // Skip studentId filter in by-student view
        }
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      if (selectedYearId) {
        params.append('academicYearId', selectedYearId);
      }

      const response = await apiClient.get(`/tasks/family/tasks?${params}`);
      setTasks(response.data.tasks || []);
      setTotal(response.data.total || 0);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStatistics = async () => {
    try {
      const statsPromises = students.map(student =>
        apiClient.get(`/tasks/family/student/${student.id}/statistics`)
          .then(response => ({ studentId: student.id, stats: response.data }))
          .catch(error => {
            console.error(`Error fetching statistics for student ${student.id}:`, error);
            return { studentId: student.id, stats: null };
          })
      );
      
      const results = await Promise.all(statsPromises);
      const statsMap: { [studentId: string]: StudentTaskStatistics } = {};
      results.forEach(({ studentId, stats }) => {
        if (stats) {
          statsMap[studentId] = stats;
        }
      });
      setStatistics(statsMap);
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
    }
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

  const fetchRubricDetails = async (submissionId: string) => {
    try {
      setLoadingRubricDetails(true);
      console.log('🔍 [FAMILY] Fetching rubric details for submission:', submissionId);
      
      const response = await apiClient.get(`/tasks/submissions/${submissionId}/rubric-details`);
      console.log('📊 [FAMILY] Rubric details response:', response.data);
      
      setRubricDetails(response.data);
      setRubricModalVisible(true);
    } catch (error: any) {
      console.error('❌ [FAMILY] Error fetching rubric details:', error);
      setRubricDetails(null);
    } finally {
      setLoadingRubricDetails(false);
    }
  };

  const closeRubricModal = () => {
    setRubricModalVisible(false);
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
    }
  };

  const getTaskStatusForStudent = (task: Task, studentId: string) => {
    const submissions = task.submissions || [];
    const submission = submissions.find(s => s.student.id === studentId);
    if (!submission) return { status: 'not_assigned', color: '#d9d9d9', text: 'No asignada' };
    
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const isOverdue = now > dueDate;
    
    if (submission.isGraded) {
      return { status: 'graded', color: '#52c41a', text: 'Calificada' };
    }
    
    if (submission.needsRevision) {
      return { status: 'needs_revision', color: '#722ed1', text: 'Necesita revisión' };
    }
    
    if (submission.status === 'submitted' || submission.status === 'late') {
      return { status: 'submitted', color: '#1890ff', text: 'Entregada' };
    }
    
    if (isOverdue) {
      return { status: 'overdue', color: '#ff4d4f', text: 'Atrasada' };
    }
    
    return { status: 'pending', color: '#faad14', text: 'Pendiente' };
  };

  const renderTaskCard = (task: Task, studentId?: string) => {
    const submissions = task.submissions || [];
    const relevantSubmissions = studentId
      ? submissions.filter(s => s.student.id === studentId)
      : submissions;

    // Verificar si es Test Yourself (exam sin entregas)
    const isTestYourself = task.taskType === 'exam' || (task as any).isTestYourself;

    return (
      <Card
        key={`${task.id}-${studentId || 'all'}`}
        className={`mb-4 hover:shadow-md transition-shadow duration-200 ${isTestYourself ? 'border-purple-200 bg-purple-50' : ''}`}
        size="small"
        title={
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Text strong>{task.title}</Text>
                {isTestYourself && (
                  <Tag color="purple">Test Yourself</Tag>
                )}
                <Tag color={TASK_PRIORITY_COLORS[task.priority]}>
                  {TASK_PRIORITY_LABELS[task.priority]}
                </Tag>
              </div>
              <div className="text-sm text-gray-500">
                {isTestYourself ? 'Evaluación en clase' : TASK_TYPE_LABELS[task.taskType]} • {task.subjectAssignment.subject.name}
              </div>
            </div>
            {task.maxPoints && !isTestYourself && (
              <div className="text-sm text-gray-500">
                Máx: {task.maxPoints} pts
              </div>
            )}
          </div>
        }
        actions={[
          <Button
            key="view"
            type="text"
            icon={<EyeOutlined />}
            onClick={() => openDetailDrawer(task)}
          >
            Ver Detalles
          </Button>,
        ]}
      >
        {/* Aviso especial para Test Yourself */}
        {isTestYourself && (
          <Alert
            message="Evaluación presencial"
            description="Este Test Yourself se realizará en clase de forma presencial. No requiere entrega digital."
            type="info"
            showIcon
            className="mb-3"
          />
        )}

        {/* Descripción */}
        {task.description && (
          <div className="text-gray-600 text-sm mb-3">
            {task.description}
          </div>
        )}

        {/* Fechas */}
        <div className="flex justify-between items-center text-sm mb-3">
          <div className="flex items-center gap-1">
            <CalendarOutlined className="text-blue-500" />
            <span>Asignada: {dayjs(task.assignedDate).format('DD/MM/YYYY')}</span>
          </div>
          <div className="flex items-center gap-1">
            <ClockCircleOutlined className={dayjs().isAfter(task.dueDate) ? 'text-red-500' : 'text-orange-500'} />
            <span className={dayjs().isAfter(task.dueDate) ? 'text-red-600 font-medium' : ''}>
              {isTestYourself ? 'Fecha:' : 'Entrega:'} {dayjs(task.dueDate).format('DD/MM/YYYY HH:mm')}
            </span>
          </div>
        </div>

        {/* Estados por estudiante - Solo mostrar para tareas con entrega */}
        {!isTestYourself && relevantSubmissions.length > 0 && (
          <div className="space-y-2">
            {relevantSubmissions.map(submission => {
              const taskStatus = getTaskStatusForStudent(task, submission.student.id);
              const student = students.find(s => s.id === submission.student.id);

              return (
                <div key={submission.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <Avatar icon={<UserOutlined />} />
                    <span className="text-sm">
                      {student?.user.profile.firstName} {student?.user.profile.lastName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag color={taskStatus.color}>
                      {taskStatus.text}
                    </Tag>
                    {submission.isGraded && submission.finalGrade !== null && submission.finalGrade !== undefined && !isNaN(submission.finalGrade) && (
                      <Tag color="green">
                        Evaluado
                      </Tag>
                    )}
                    {submission.isLate && (
                      <Tag color="orange">Tardía</Tag>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Alertas */}
        {!isTestYourself && relevantSubmissions.some(s => s.needsRevision) && (
          <Alert
            message="Algún estudiante tiene tareas que necesitan revisión"
            type="warning"
            showIcon
            className="mt-3"
          />
        )}
      </Card>
    );
  };

  const renderByStudentView = () => {
    const studentTasks = students.map(student => {
      // Incluir tareas con submissions del estudiante O Test Yourself (que no tienen submissions)
      const studentTasksFiltered = tasks.filter(task => {
        const isTestYourself = task.taskType === 'exam' || (task as any).isTestYourself;
        const hasSubmission = (task.submissions || []).some(s => s.student.id === student.id);
        // Mostrar si tiene submission O es Test Yourself (aparece para todos los estudiantes del grupo)
        return hasSubmission || isTestYourself;
      });
      
      return {
        student,
        tasks: studentTasksFiltered,
        stats: statistics[student.id],
      };
    });

    const collapseItems = studentTasks.map(({ student, tasks: studentTasks, stats }) => ({
      key: student.id,
      label: (
        <div className="flex justify-between items-center w-full mr-4">
          <div className="flex items-center gap-3">
            <Avatar icon={<UserOutlined />} />
            <span className="font-medium">
              {student.user.profile.firstName} {student.user.profile.lastName}
            </span>
          </div>
          {stats && (
            <div className="flex gap-4 text-sm">
              <span className="text-blue-600">Total: {Math.max(0, stats.totalAssigned)}</span>
              <span className="text-orange-600">Pendientes: {Math.max(0, stats.pending)}</span>
              <span className="text-green-600">Entregadas: {Math.max(0, stats.submitted)}</span>
              {stats.averageGrade > 0 && (
                <span className="text-purple-600">Evaluado</span>
              )}
            </div>
          )}
        </div>
      ),
      children: studentTasks.length > 0 ? (
        studentTasks.map(task => renderTaskCard(task, student.id))
      ) : (
        <Empty description="No hay tareas asignadas" />
      )
    }));

    return (
      <Collapse 
        defaultActiveKey={students.map(s => s.id)}
        items={collapseItems}
      />
    );
  };

  return (
    <div className="family-tasks-page">
      {/* Header - Optimizado para móvil */}
      <Row gutter={[12, 16]} className="mb-6">
        <Col span={24}>
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <Row gutter={[12, 16]} align="middle">
              <Col xs={24} md={12}>
                <Space direction={window.innerWidth < 768 ? 'vertical' : 'horizontal'} size="small">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <BookOutlined style={{ fontSize: '28px', color: '#1890ff' }} />
                    <div>
                      <Title level={4} style={{ margin: 0, fontSize: window.innerWidth < 768 ? '18px' : '24px' }}>
                        Tareas de mis Hijos
                      </Title>
                      <Text type="secondary" style={{ fontSize: window.innerWidth < 768 ? '13px' : '14px' }}>
                        Supervisa el progreso académico de tus hijos
                      </Text>
                    </div>
                  </div>
                </Space>
              </Col>
              <Col xs={24} md={12}>
                <Space
                  direction={window.innerWidth < 768 ? 'vertical' : 'horizontal'}
                  style={{ width: '100%' }}
                  size="middle"
                >
                  <AcademicYearSelector value={selectedYearId} onChange={setSelectedYearId} />
                  <Select
                    value={viewMode}
                    onChange={setViewMode}
                    size="large"
                    style={{ width: window.innerWidth < 768 ? '100%' : '150px' }}
                  >
                    <Option value="by-student">
                      <div style={{ padding: '2px 0', fontSize: '15px' }}>Por Estudiante</div>
                    </Option>
                    <Option value="list">
                      <div style={{ padding: '2px 0', fontSize: '15px' }}>Lista General</div>
                    </Option>
                  </Select>
                  {viewMode === 'list' && (
                    <Select
                      placeholder="Seleccionar hijo"
                      value={selectedStudent}
                      onChange={(value) => {
                        setSelectedStudent(value);
                        setFilters({ ...filters, studentId: value, page: 1 });
                      }}
                      size="large"
                      style={{ width: window.innerWidth < 768 ? '100%' : '200px' }}
                      dropdownStyle={{ fontSize: '15px' }}
                    >
                      <Option value="">
                        <div style={{ padding: '2px 0', fontSize: '15px' }}>Todos los hijos</div>
                      </Option>
                      {students.map(student => (
                        <Option key={student.id} value={student.id}>
                          <div style={{ padding: '2px 0', fontSize: '15px' }}>
                            {student.user.profile.firstName} {student.user.profile.lastName}
                          </div>
                        </Option>
                      ))}
                    </Select>
                  )}
                </Space>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Estadísticas generales - Optimizadas para móvil */}
        {Object.keys(statistics).length > 0 && (
          <>
            <Col xs={8} sm={6}>
              <Card
                size="small"
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
                bodyStyle={{ padding: window.innerWidth < 768 ? '12px' : '16px' }}
              >
                <Statistic
                  title="Total Tareas"
                  value={Math.max(0, Object.values(statistics).reduce((sum, stat) => sum + Math.max(0, stat.totalAssigned), 0))}
                  prefix={<BookOutlined style={{ fontSize: '14px' }} />}
                  valueStyle={{
                    color: '#1890ff',
                    fontSize: window.innerWidth < 768 ? '18px' : '24px'
                  }}
                />
              </Card>
            </Col>
            <Col xs={8} sm={6}>
              <Card
                size="small"
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
                bodyStyle={{ padding: window.innerWidth < 768 ? '12px' : '16px' }}
              >
                <Statistic
                  title="Pendientes"
                  value={Math.max(0, Object.values(statistics).reduce((sum, stat) => sum + Math.max(0, stat.pending), 0))}
                  prefix={<ClockCircleOutlined style={{ fontSize: '14px' }} />}
                  valueStyle={{
                    color: '#faad14',
                    fontSize: window.innerWidth < 768 ? '18px' : '24px'
                  }}
                />
              </Card>
            </Col>
            <Col xs={8} sm={6}>
              <Card
                size="small"
                style={{
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}
                bodyStyle={{ padding: window.innerWidth < 768 ? '12px' : '16px' }}
              >
                <Statistic
                  title="Entregadas"
                  value={Math.max(0, Object.values(statistics).reduce((sum, stat) => sum + Math.max(0, stat.submitted), 0))}
                  prefix={<CheckCircleOutlined style={{ fontSize: '14px' }} />}
                  valueStyle={{
                    color: '#52c41a',
                    fontSize: window.innerWidth < 768 ? '18px' : '24px'
                  }}
                />
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* Filtros para vista lista - Optimizados para móvil */}
      {viewMode === 'list' && (
        <Row gutter={[12, 12]} className="mb-4">
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Estado de entrega"
              value={filters.submissionStatus}
              onChange={(value) => setFilters({ ...filters, submissionStatus: value, page: 1 })}
              allowClear
              size="large"
              style={{ width: '100%' }}
              dropdownStyle={{ fontSize: '15px' }}
            >
              {Object.entries(SUBMISSION_STATUS_LABELS).map(([value, label]) => (
                <Option key={value} value={value}>
                  <div style={{ padding: '2px 0', fontSize: '15px' }}>{label}</div>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Filtro rápido"
              onChange={(value) => {
                if (value === 'pending') {
                  setFilters({ ...filters, onlyPending: true, onlyGraded: false, page: 1 });
                } else if (value === 'graded') {
                  setFilters({ ...filters, onlyGraded: true, onlyPending: false, page: 1 });
                } else {
                  setFilters({ ...filters, onlyPending: false, onlyGraded: false, page: 1 });
                }
              }}
              allowClear
              size="large"
              style={{ width: '100%' }}
              dropdownStyle={{ fontSize: '15px' }}
            >
              <Option value="pending">
                <div style={{ padding: '2px 0', fontSize: '15px' }}>Solo Pendientes</div>
              </Option>
              <Option value="graded">
                <div style={{ padding: '2px 0', fontSize: '15px' }}>Solo Calificadas</div>
              </Option>
            </Select>
          </Col>
        </Row>
      )}

      {/* Contenido principal - Optimizado para móvil */}
      <Card
        style={{
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
        bodyStyle={{
          padding: window.innerWidth < 768 ? '12px' : '24px'
        }}
      >
        {loading ? (
          <div className="text-center py-8">
            <Spin size="large" />
          </div>
        ) : viewMode === 'by-student' ? (
          renderByStudentView()
        ) : tasks.length > 0 ? (
          <div>
            {tasks.map(task => renderTaskCard(task))}
            
            {/* Paginación */}
            <div className="text-center mt-4">
              <Button
                disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) - 1 })}
              >
                Anterior
              </Button>
              <span className="mx-4">
                Página {filters.page} de {Math.ceil(total / (filters.limit || 20))}
              </span>
              <Button
                disabled={(filters.page || 1) * (filters.limit || 20) >= total}
                onClick={() => setFilters({ ...filters, page: (filters.page || 1) + 1 })}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No hay tareas disponibles"
          />
        )}
      </Card>

      {/* Drawer de detalles */}
      <Drawer
        title="Detalles de la Tarea"
        placement="right"
        size="large"
        open={detailDrawerVisible}
        onClose={() => {
          setDetailDrawerVisible(false);
          setSelectedTask(null);
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
                <Text strong>Profesor:</Text>
                <div>
                  {selectedTask.teacher.user.profile.firstName} {selectedTask.teacher.user.profile.lastName}
                </div>
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

              {selectedTask.attachments && selectedTask.attachments.length > 0 && (
                <div>
                  <Text strong>Archivos del profesor:</Text>
                  <List
                    size="small"
                    dataSource={selectedTask.attachments || []}
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

              <Divider />

              <div>
                <Text strong>Estados de entregas:</Text>
                <div className="mt-2 space-y-3">
                  {(selectedTask.submissions || [])
                    .filter(submission => students.some(s => s.id === submission.student.id))
                    .map(submission => {
                    const student = students.find(s => s.id === submission.student.id);
                    const taskStatus = getTaskStatusForStudent(selectedTask, submission.student.id);
                    
                    return (
                      <Card key={submission.id} size="small">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Avatar icon={<UserOutlined />} />
                              <span className="font-medium">
                                {student?.user.profile.firstName} {student?.user.profile.lastName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Tag color={taskStatus.color}>
                                {taskStatus.text}
                              </Tag>
                              {submission.isLate && <Tag color="orange">Tardía</Tag>}
                              {submission.isGraded && <Tag color="green">Calificada</Tag>}
                            </div>
                          </div>

                          {submission.submittedAt && (
                            <div className="text-sm text-gray-500">
                              Entregada: {dayjs(submission.submittedAt).format('DD/MM/YYYY HH:mm')}
                            </div>
                          )}

                          {submission.isGraded && submission.finalGrade !== null && submission.finalGrade !== undefined && !isNaN(submission.finalGrade) && (
                            <div>
                              <div className="text-lg font-bold text-green-600">
                                Calificación: Evaluado
                              </div>
                              
                              {/* Botón para ver detalles de rúbrica */}
                              {selectedTask.rubricId && (
                                <div className="mt-2">
                                  <Button
                                    type="link"
                                    size="small"
                                    onClick={() => fetchRubricDetails(submission.id)}
                                    loading={loadingRubricDetails}
                                    className="p-0 h-auto"
                                  >
                                    Ver detalles de la evaluación con rúbrica →
                                  </Button>
                                </div>
                              )}
                              
                              {submission.teacherFeedback && (
                                <div className="mt-2 p-3 bg-green-50 rounded">
                                  <div className="font-medium text-green-800">Comentarios del profesor:</div>
                                  <div className="text-green-700">"{submission.teacherFeedback}"</div>
                                </div>
                              )}
                            </div>
                          )}

                          {submission.needsRevision && (
                            <Alert
                              message="Esta entrega necesita ser revisada"
                              type="warning"
                              showIcon
                            />
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>

      {/* Task Attachments Section - Read Only for Families */}
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
        width={1400}
        style={{ top: 20 }}
        bodyStyle={{ padding: 0 }}
      >
        {attachmentTaskId && (
          <TaskAttachmentsSection
            taskId={attachmentTaskId}
            taskTitle={selectedTask?.title || 'Tarea'}
            isTeacher={false}
            readOnly={true}
            showTabs={true}
            defaultTab="explorer"
            className="p-6"
          />
        )}
      </Modal>

      {/* Modal de detalles de rúbrica */}
      <Modal
        title="Detalles de Evaluación con Rúbrica"
        open={rubricModalVisible}
        onCancel={closeRubricModal}
        footer={[
          <Button key="close" onClick={closeRubricModal}>
            Cerrar
          </Button>,
        ]}
        width={1000}
        style={{ top: 20 }}
      >
        {rubricDetails && (
          <div className="space-y-6">
            {/* Información general */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">
                    {rubricDetails.rubric?.name || 'Rúbrica de Evaluación'}
                  </h3>
                  <p className="text-blue-600">Evaluación completada por el profesor</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-800">
                    Evaluado
                  </div>
                  <div className="text-sm text-blue-600">
                    Completado
                  </div>
                </div>
              </div>
            </div>

            {/* Detalles de cada criterio */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold">Evaluación detallada por criterios:</h4>
              
              {rubricDetails.evaluationDetails?.map((detail: any, index: number) => {
                // Calcular la proporción del nivel correctamente
                const allLevels = rubricDetails?.rubric?.levels || [];
                const maxLevelScore = allLevels.length > 0 ? Math.max(...allLevels.map(l => Number(l.scoreValue || 0))) : 1;
                const currentLevelScore = detail.selectedLevel ? Number(detail.selectedLevel.scoreValue || 0) : 0;
                const levelProportion = maxLevelScore > 0 ? currentLevelScore / maxLevelScore : 0;
                
                // Función para obtener el estilo basado en la proporción del nivel
                const getLevelStyling = (proportion: number) => {
                  if (proportion >= 1.0) return {
                    bgColor: 'bg-green-50', 
                    textColor: 'text-green-800', 
                    borderColor: 'border-green-200'
                  };
                  if (proportion >= 0.75) return {
                    bgColor: 'bg-lime-50', 
                    textColor: 'text-lime-800', 
                    borderColor: 'border-lime-200'
                  };
                  if (proportion >= 0.5) return {
                    bgColor: 'bg-yellow-50', 
                    textColor: 'text-yellow-800', 
                    borderColor: 'border-yellow-200'
                  };
                  if (proportion >= 0.25) return {
                    bgColor: 'bg-orange-50', 
                    textColor: 'text-orange-800', 
                    borderColor: 'border-orange-200'
                  };
                  return {
                    bgColor: 'bg-red-50', 
                    textColor: 'text-red-800', 
                    borderColor: 'border-red-200'
                  };
                };
                
                const styling = getLevelStyling(levelProportion);
                
                return (
                  <div key={index} className={`border rounded-lg p-4 ${styling.bgColor} ${styling.borderColor}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h5 className={`font-semibold ${styling.textColor}`}>
                          {detail.criterion?.name || 'Criterio sin nombre'}
                        </h5>
                        {/* Peso del criterio */}
                        <div className={`text-xs ${styling.textColor} opacity-75 mt-1`}>
                          Peso: {((Number(detail.criterion?.weight || 0)) * 100).toFixed(0)}% del total
                        </div>
                        {detail.criterion?.description && (
                          <p className={`text-sm mt-1 ${styling.textColor} opacity-80`}>
                            {detail.criterion.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <div className={`text-lg font-bold ${styling.textColor}`}>
                          ✓
                        </div>
                        {detail.selectedLevel && (
                          <div className={`text-sm ${styling.textColor}`}>
                            Evaluado
                          </div>
                        )}
                        <div className={`text-xs ${styling.textColor} opacity-75 mt-1`}>
                          Completado
                        </div>
                      </div>
                    </div>
                    
                    {/* Contenido de la celda seleccionada */}
                    {detail.selectedLevel?.cellContent && (
                      <div className={`${styling.textColor} text-sm mt-2 p-2 rounded border-l-4 ${styling.borderColor.replace('border-', 'border-l-')}`}>
                        <strong>Descripción de la evaluación:</strong>
                        <div className="mt-1 italic">
                          "{detail.selectedLevel.cellContent}"
                        </div>
                      </div>
                    )}
                    
                    {/* Explicación del resultado para familias */}
                    <div className={`${styling.textColor} text-xs mt-2 p-2 bg-white bg-opacity-50 rounded`}>
                      <strong>Resultado:</strong> Este criterio ha sido evaluado y considerado en la calificación final
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumen final */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">Resumen de la evaluación:</h4>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    ✓
                  </div>
                  <div className="text-sm text-gray-600">Evaluación completada</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    Evaluado
                  </div>
                  <div className="text-sm text-gray-600">Resultado final</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FamilyTasksPage;