/**
 * @archivo: StudentDashboard.tsx
 * @módulo: Student Pages (Dashboard Principal de Estudiantes)
 * @función: Dashboard personalizado para estudiantes con notas, tareas y progreso
 * @crítico: SÍ - Portal principal de estudiantes del sistema educativo
 * @dependencias: React Router, apiClient, CalendarWidget, componentes Ant Design
 * @no_modificar: Cálculo de estadísticas sin verificar algoritmos de promedio
 * @relacionado_con: DashboardLayout.tsx, páginas student/*, apiClient.ts
 */

/**
 * PÁGINA: StudentDashboard
 * UBICACIÓN: /frontend/src/pages/student/StudentDashboard.tsx
 * FUNCIÓN: Dashboard principal para estudiantes con información académica personal
 * NO USAR PARA: Dashboards de otros roles (usar AdminDashboard, TeacherDashboard)
 * RUTAS CRÍTICAS:
 *   - / (index): StudentDashboardHome con resumen académico
 *   - /tasks: Lista de tareas y entregas del estudiante
 *   - /grades: Calificaciones detalladas por asignatura
 *   - /calendar: Calendario personal con eventos estudiantiles
 *   - /educational-resources: Recursos asignados por profesores
 * 
 * ESTRUCTURA DE RUTAS:
 * - Académico: tasks, grades, educational-resources
 * - Organización: calendar
 * - Personal: profile, settings
 * 
 * COMPONENT: StudentDashboardHome
 * - Información del perfil estudiantil completo
 * - Stats cards: nota media, asignaturas, evaluaciones pendientes, asistencia
 * - Lista de asignaturas con notas por profesor
 * - Tareas recientes con fechas de entrega
 * - Resumen de progreso con percentiles
 * - CalendarWidget personalizado para estudiantes
 * 
 * SISTEMA DE AUTENTICACIÓN:
 * - Verificación rol student en fetchStudentData()
 * - Búsqueda de estudiante por user.id en tabla students
 * - Error handling para acceso denegado
 * - Profile data: matrícula, nivel educativo, curso, clases
 * 
 * APIS INTEGRADAS:
 * - GET /auth/me: Usuario actual y verificación rol
 * - GET /students: Lista estudiantes para encontrar perfil actual
 * - GET /grades/student/{id}: Calificaciones del estudiante
 * - GET /tasks/student/my-tasks: Tareas asignadas al estudiante
 * - Cálculos locales para estadísticas agregadas
 * 
 * ESTADÍSTICAS CALCULADAS:
 * - averageGrade: Media de calificaciones como porcentaje (0-100)
 * - totalEvaluations: Conteo total de evaluaciones
 * - completedEvaluations: Evaluaciones con finalGrade != null
 * - pendingEvaluations: Diferencia total - completadas
 * - attendance: Obtenido de /attendance/stats/student/{id}, fallback a 0
 * - Subject grades: Agrupación por asignatura con promedios
 * 
 * PROCESAMIENTO DE CALIFICACIONES:
 * - fetchSubjectGrades(): Agrupa grades por subject.id
 * - Cálculo de promedio por asignatura
 * - Identificación del profesor de cada asignatura
 * - Fecha de última calificación
 * - Filtrado de calificaciones nulas
 * 
 * SISTEMA DE COLORES:
 * - getGradeColor(): Verde ≥90%, Azul ≥70%, Amarillo ≥50%, Rojo <50%
 * - Aplicado en: stats cards, avatars, calificaciones, progreso
 * - Consistente con sistema de evaluación español
 * 
 * COMPONENTES VISUALES:
 * - Stats cards con colores semánticos por calificación
 * - Lista asignaturas con avatars por código de materia
 * - Lista tareas recientes con tags de asignatura
 * - Progress card con métricas de completado
 * - CalendarWidget altura 400px para eventos estudiantiles
 * 
 * FUNCIONALIDADES ESPECIALES:
 * - Navegación directa a páginas específicas
 * - Empty states cuando no hay datos
 * - Información completa del perfil en header
 * - Tags de clases asignadas
 * - Fechas localizadas en español
 * 
 * RESPONSIVE DESIGN:
 * - Stats grid: 24→12→6 columnas para móvil/tablet/desktop
 * - Content grid: 24→24→12/12 para móvil/desktop
 * - Listas adaptativas con truncado de contenido
 * - Cards apiladas verticalmente en móvil
 * 
 * MANEJO DE ERRORES:
 * - Try/catch por cada fetch individual
 * - Fallback data cuando APIs fallan
 * - Alert component para errores críticos
 * - Estados loading diferenciados
 * - Botón reintentar en errores
 * 
 * INTERFACES TIPADAS:
 * - StudentProfile: Datos completos del estudiante
 * - StudentStats: Métricas calculadas localmente
 * - SubjectGrade: Calificaciones agregadas por asignatura
 * - RecentTask: Tareas con información de entrega
 * 
 * ESTADO ACTUAL: ✅ DASHBOARD STUDENT-READY
 * - Todas las funcionalidades estudiantiles operativas
 * - Cálculos de estadísticas precisos
 * - UI adaptada para estudiantes adolescentes
 * - Sistema de colores motivacional
 * - Integración completa con APIs académicas
 * - Usado como portal principal de estudiantes en producción
 */

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { safeNavigate } from '@utils/navigationUtils'
import { Spin } from 'antd'

// ─── Lazy-loaded student pages ────────────────────────────────────────────────
const TasksPage = React.lazy(() => import('./TasksPage'))
const StudentGradesPage = React.lazy(() => import('./StudentGradesPage'))
const TestYourselfGradesPage = React.lazy(() => import('./TestYourselfGradesPage'))
const StudentCalendarPage = React.lazy(() => import('./StudentCalendarPage'))
const StudentSchedulePage = React.lazy(() => import('./StudentSchedulePage'))
const EducationalResourcesPage = React.lazy(() => import('./EducationalResourcesPage'))
const BlogPage = React.lazy(() => import('./BlogPage'))
const ProfilePage = React.lazy(() => import('./ProfilePage'))
const SettingsPage = React.lazy(() => import('./SettingsPage'))
const StudentCompetenciesPage = React.lazy(() => import('./StudentCompetenciesPage'))
const ConversationsPage = React.lazy(() => import('../communications/ConversationsPage'))
const GroupChatsPage = React.lazy(() => import('../communications/GroupChatsPage'))
const MisApuntesPageNew = React.lazy(() => import('./MisApuntesPageNew'))
const SharedNotesPage = React.lazy(() => import('./SharedNotesPage'))
const StudentExpedientePage = React.lazy(() => import('./StudentExpedientePage'))

const PageFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
    <Spin size="default" />
  </div>
)
import AcademicYearSelector from '@components/common/AcademicYearSelector'
import CalendarWidget from '@components/calendar/CalendarWidget'
import PendingTasksWidget from '@components/student/PendingTasksWidget'
import BlogFeedPreview from '@components/blog/BlogFeedPreview'
import DynamicGreeting from '../../components/common/DynamicGreeting'
import { Card, Row, Col, Statistic, Typography, Space, Progress, List, Avatar, Spin, message, Alert, Button, Tag, Empty } from 'antd'
import {
  TrophyOutlined,
  BookOutlined,
  CalendarOutlined,
  FileTextOutlined,
  StarOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  UserOutlined,
  ProjectOutlined,
  ExperimentOutlined,
  DashboardOutlined,
  FormOutlined,
  CheckCircleOutlined,
  EditOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  AuditOutlined,
} from '@ant-design/icons'
import apiClient from '@services/apiClient'
import { formatPercentageFromFraction, formatNumber, formatPercentage } from '@utils/numberFormat'
import { lomloeConversion } from '@/utils/lomloe'

const { Title, Text } = Typography

interface StudentProfile {
  id: string
  enrollmentNumber: string
  user: {
    email: string
    profile: {
      firstName: string
      lastName: string
    }
  }
  educationalLevel: {
    name: string
    code: string
  }
  course: {
    name: string
  }
  classGroups: Array<{
    id: string
    name: string
  }>
}

interface StudentStats {
  averageGrade: number        // Porcentaje 0-100 (no 0-10)
  totalEvaluations: number
  completedEvaluations: number
  pendingEvaluations: number
  testYourself: number        // Exámenes/Test Yourself pendientes
  attendance: number         // Porcentaje 0-100
}

interface SubjectGrade {
  id: string
  subject: {
    name: string
    code: string
  }
  teacher: {
    user: {
      profile: {
        firstName: string
        lastName: string
      }
    }
  }
  averageGrade: number
  totalEvaluations: number
  lastGradeDate: string
}

interface RecentTask {
  id: string
  title: string
  dueDate: string
  taskType: string
  status: string
  finalGrade?: number
  subjectAssignment: {
    subject: {
      name: string
      code: string
    }
  }
}

const StudentDashboardHome: React.FC = () => {
  // Using robust navigation utility - now uses window.location for reliable navigation
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [subjects, setSubjects] = useState<SubjectGrade[]>([])
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([])
  const [allPendingTasks, setAllPendingTasks] = useState<RecentTask[]>([]) // All pending tasks for calendar
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined)
  // Keep a ref so fetchAttendance can always read the latest student profile
  const studentProfileRef = useRef<StudentProfile | null>(null)

  const fetchStudentData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get current user first
      const userResponse = await apiClient.get('/auth/me')
      const currentUser = userResponse.data
      
      if (currentUser.role !== 'student') {
        setError('Acceso denegado: Solo estudiantes pueden acceder a este panel')
        return
      }

      // Perfil propio del alumno: usar el endpoint self (/students/me).
      // GET /students (lista) es admin-only y devolvía 403 a los alumnos.
      const studentsResponse = await apiClient.get('/students/me')
      const currentStudent = studentsResponse.data

      if (!currentStudent) {
        setError('No se encontró el perfil de estudiante para este usuario')
        return
      }
      
      setStudentProfile(currentStudent)
      studentProfileRef.current = currentStudent

      // Fetch student stats - pass currentStudent to get attendance
      await fetchStudentStats(currentStudent)

      // Fetch subject grades
      await fetchSubjectGrades()
      
      // Fetch recent tasks
      await fetchRecentTasks()
      
    } catch (error: any) {
      console.error('Error fetching student data:', error)
      setError(error.response?.data?.message || 'Error al cargar los datos del estudiante')
      message.error('Error al cargar el dashboard del estudiante')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentStats = async (student?: StudentProfile) => {
    try {
      const response = await apiClient.get('/grades/my-grades')
      const data = response.data

      // Get tasks data to separate exams from regular tasks
      let testYourselfCount = 0
      let regularPendingTasks = 0

      try {
        const tasksResponse = await apiClient.get('/tasks/student/my-tasks?limit=100')
        const tasksData = tasksResponse.data
        const allTasks = Array.isArray(tasksData.tasks) ? tasksData.tasks : []

        // Separate exams (Test Yourself) from regular tasks
        allTasks.forEach((task: any) => {
          const isNotSubmitted = !task.submissions || task.submissions.length === 0 ||
                                 task.submissions[0]?.status === 'not_submitted'

          if (isNotSubmitted) {
            if (task.taskType === 'exam') {
              testYourselfCount++
            } else {
              regularPendingTasks++
            }
          }
        })
      } catch (tasksError) {
        console.warn('Could not fetch tasks for Test Yourself stats:', tasksError)
        // Fallback to API summary data
        regularPendingTasks = data.summary?.totalPendingTasks || 0
      }

      // Get attendance stats - use the passed student or the state studentProfile
      let attendanceRate = 0;
      const currentStudent = student || studentProfile;
      if (currentStudent?.id) {
        try {
          const attendanceQuery = selectedYearId
            ? `?academicYearId=${selectedYearId}`
            : `?days=30`;
          const attendanceResponse = await apiClient.get(
            `/attendance/stats/student/${currentStudent.id}${attendanceQuery}`,
          )
          attendanceRate = attendanceResponse.data?.stats?.attendanceRate || 0
        } catch (attendanceError) {
          console.warn('Could not fetch attendance stats:', attendanceError)
          // Use the students statistics endpoint as fallback
          try {
            const statsResponse = await apiClient.get('/students/me/statistics')
            attendanceRate = statsResponse.data?.statistics?.attendanceRate || 0
          } catch (statsError) {
            console.warn('Could not fetch student statistics:', statsError)
          }
        }
      }
      
      // Use summary data from the API response with separated Test Yourself
      setStats({
        averageGrade: data.summary?.overallAverage || 0,
        totalEvaluations: data.summary?.totalGradedItems || 0,
        completedEvaluations: data.summary?.totalGradedItems || 0,
        pendingEvaluations: regularPendingTasks,
        testYourself: testYourselfCount,
        attendance: attendanceRate
      })
    } catch (error: any) {
      console.error('Error fetching student stats:', error)
      // Set default stats
      setStats({
        averageGrade: 0,
        totalEvaluations: 0,
        completedEvaluations: 0,
        pendingEvaluations: 0,
        testYourself: 0,
        attendance: 0
      })
    }
  }

  const fetchSubjectGrades = async () => {
    try {
      const response = await apiClient.get('/grades/my-grades')
      const data = response.data
      
      // Use subjectGrades data directly from API
      const subjects = (data.subjectGrades || []).map((subjectGrade: any) => ({
        id: subjectGrade.subjectId,
        subject: {
          id: subjectGrade.subjectId,
          name: subjectGrade.subjectName,
          code: subjectGrade.subjectCode
        },
        teacher: {
          user: {
            profile: {
              firstName: subjectGrade.teacherFirstName || '',
              lastName: subjectGrade.teacherLastName || ''
            }
          }
        },
        averageGrade: subjectGrade.averageGrade || 0,
        totalEvaluations: subjectGrade.totalEvaluations || 0,
        lastGradeDate: subjectGrade.lastUpdated
      }))
      
      setSubjects(subjects)
    } catch (error: any) {
      console.error('Error fetching subject grades:', error)
      setSubjects([])
    }
  }

  const fetchRecentTasks = async () => {
    try {
      // Use the actual tasks endpoint to get all tasks including Test Yourself
      // Fetch more tasks (100) to ensure we get all pending ones for the calendar
      const response = await apiClient.get('/tasks/student/my-tasks?limit=100&sortBy=dueDate&sortOrder=ASC')
      const data = response.data

      // Use actual tasks from the tasks API
      const allTasks = Array.isArray(data.tasks) ? data.tasks : []
      const mappedTasks = allTasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        dueDate: task.dueDate,
        taskType: task.taskType,
        status: task.submissions?.[0]?.status || 'not_submitted',
        finalGrade: task.submissions?.[0]?.finalGrade,
        maxPoints: task.maxPoints,
        subjectAssignment: {
          subject: {
            name: task.subjectAssignment?.subject?.name || 'Materia',
            code: task.subjectAssignment?.subject?.code || 'MAT'
          }
        }
      }))

      // Filter pending tasks (not submitted or not graded) for calendar display
      const pendingTasks = mappedTasks.filter((task: RecentTask) =>
        task.status === 'not_submitted' || task.status === 'pending' || !task.finalGrade
      )

      // Set all pending tasks for calendar (sorted by dueDate ASC - closest deadline first)
      setAllPendingTasks(pendingTasks)

      // Set recent tasks (last 5, sorted by dueDate DESC for display)
      const sortedByRecent = [...mappedTasks].sort((a, b) =>
        new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      )
      setRecentTasks(sortedByRecent.slice(0, 5))
    } catch (error: any) {
      console.error('Error fetching recent tasks:', error)
      setRecentTasks([])
      setAllPendingTasks([])
    }
  }

  useEffect(() => {
    fetchStudentData()
  }, [])

  // Re-fetch attendance when selectedYearId changes (after initial load)
  useEffect(() => {
    const currentStudent = studentProfileRef.current;
    if (!currentStudent?.id) return;
    const fetchAttendance = async () => {
      try {
        const attendanceQuery = selectedYearId
          ? `?academicYearId=${selectedYearId}`
          : `?days=30`;
        const attendanceResponse = await apiClient.get(
          `/attendance/stats/student/${currentStudent.id}${attendanceQuery}`,
        )
        const attendanceRate = attendanceResponse.data?.stats?.attendanceRate || 0
        setStats(prev => prev ? { ...prev, attendance: attendanceRate } : prev)
      } catch {
        // Silently keep existing value on error
      }
    };
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYearId])

  if (loading) {
    return (
      <div className="space-y-6" style={{ padding: '8px 0' }}>
        <div className="mw-skeleton mw-skeleton-title" style={{ width: '240px' }} />
        <div className="mw-skeleton mw-skeleton-text" style={{ width: '320px' }} />
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col xs={24} sm={12} md={8} lg={4} xl={4} key={i}>
              <div className="mw-skeleton mw-skeleton-stat" />
            </Col>
          ))}
        </Row>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <div className="mw-skeleton mw-skeleton-card" style={{ height: 200 }} />
          </Col>
          <Col xs={24} lg={12}>
            <div className="mw-skeleton mw-skeleton-card" style={{ height: 200 }} />
          </Col>
        </Row>
      </div>
    )
  }

  if (error || !studentProfile || !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <Alert
          message="Error al cargar datos"
          description={error || 'No se pudieron cargar los datos del estudiante'}
          type="error"
          showIcon
          action={
            <Button onClick={fetchStudentData}>
              Reintentar
            </Button>
          }
        />
      </div>
    )
  }

  const getGradeColor = (percentage: number) => {
    // Escala de porcentajes: 90%+ Excelente, 70%+ Notable, 50%+ Aprobado, <50% Suspenso
    if (percentage >= 90) return '#52c41a'  // Verde excelente
    if (percentage >= 70) return '#1890ff'  // Azul notable
    if (percentage >= 50) return '#faad14'  // Amarillo aprobado
    return '#f5222d'                        // Rojo suspenso
  }

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType?.toLowerCase()) {
      case 'assignment':
        return <EditOutlined style={{ color: '#fff' }} />
      case 'project':
        return <ProjectOutlined style={{ color: '#fff' }} />
      case 'exam':
        return <AuditOutlined style={{ color: '#fff' }} />
      case 'homework':
        return <FormOutlined style={{ color: '#fff' }} />
      case 'research':
        return <BulbOutlined style={{ color: '#fff' }} />
      case 'presentation':
        return <DashboardOutlined style={{ color: '#fff' }} />
      case 'quiz':
        return <CheckCircleOutlined style={{ color: '#fff' }} />
      default:
        return <FileTextOutlined style={{ color: '#fff' }} />
    }
  }

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType?.toLowerCase()) {
      case 'assignment':
        return '#1890ff'  // Azul para tareas
      case 'project':
        return '#722ed1'  // Morado para proyectos
      case 'exam':
        return '#f5222d'  // Rojo para exámenes
      case 'homework':
        return '#52c41a'  // Verde para deberes
      case 'research':
        return '#faad14'  // Amarillo para investigación
      case 'presentation':
        return '#eb2f96'  // Rosa para presentaciones
      case 'quiz':
        return '#13c2c2'  // Cian para cuestionarios
      default:
        return '#8c8c8c'  // Gris por defecto
    }
  }

  // StudentDashboard with Dynamic Greetings ✅
  
  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mw-page-header">
        <div>
          <h1 className="mw-page-header__title">Mi Dashboard</h1>
          <p className="mw-page-header__subtitle">{currentDate.charAt(0).toUpperCase() + currentDate.slice(1)}</p>
        </div>
      </div>

      {/* Header */}
      <div>
        {/* Dynamic Greeting Test - 20250819160800 */}
        <DynamicGreeting
          firstName={studentProfile?.user?.profile?.firstName}
          lastName={studentProfile?.user?.profile?.lastName}
          fullName={studentProfile?.user?.profile?.fullName}
          email={studentProfile?.user?.email}
          fallbackText="Estudiante"
        />
        <Space>
          <Text type="secondary">{studentProfile?.enrollmentNumber || 'No especificado'}</Text>
        </Space>
      </div>


      {/* Stats Cards — color-coded */}
      {(() => {
        const avgPct = stats.averageGrade
        const gradeColor = avgPct >= 70 ? '#52c41a' : avgPct >= 50 ? '#fa8c16' : avgPct > 0 ? '#f5222d' : '#1890ff'
        const gradeBg = avgPct >= 70 ? '#f6ffed' : avgPct >= 50 ? '#fff7e6' : avgPct > 0 ? '#fff1f0' : '#e6f7ff'
        const gradeBorder = avgPct >= 70 ? '#52c41a' : avgPct >= 50 ? '#fa8c16' : avgPct > 0 ? '#f5222d' : '#1890ff'
        return (
          <Row gutter={[12, 12]}>
            <Col xs={12} sm={12} md={8} lg={5}>
              <div className="rounded-xl p-4 bg-white h-full" style={{ border: `1px solid ${gradeBg}`, borderLeft: `4px solid ${gradeBorder}`, boxShadow: '0 2px 8px -2px rgba(30,30,48,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Nota Media</p>
                    <p className="text-2xl font-bold" style={{ color: gradeColor }}>
                      {avgPct > 0 ? `${Math.round(avgPct)}%` : '–'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: gradeColor }}>
                      {avgPct > 0 ? lomloeConversion(avgPct) : 'Sin datos'}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: gradeBg }}>
                    <TrophyOutlined style={{ fontSize: 18, color: gradeColor }} />
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={12} sm={12} md={8} lg={5}>
              <div className="rounded-xl p-4 bg-white h-full" style={{ border: '1px solid #e6f7ff', borderLeft: '4px solid #1890ff', boxShadow: '0 2px 8px -2px rgba(30,30,48,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Asignaturas</p>
                    <p className="text-2xl font-bold text-blue-600">{subjects.length}</p>
                    <p className="text-xs text-blue-400 mt-1">En curso</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#e6f7ff' }}>
                    <BookOutlined style={{ fontSize: 18, color: '#1890ff' }} />
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={12} sm={12} md={8} lg={5}>
              <div className="rounded-xl p-4 bg-white h-full" style={{ border: stats.pendingEvaluations > 0 ? '1px solid #fff7e6' : '1px solid #f5f5f5', borderLeft: `4px solid ${stats.pendingEvaluations > 0 ? '#fa8c16' : '#d9d9d9'}`, boxShadow: '0 2px 8px -2px rgba(30,30,48,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Tareas Pendientes</p>
                    <p className="text-2xl font-bold" style={{ color: stats.pendingEvaluations > 0 ? '#fa8c16' : '#595959' }}>{stats.pendingEvaluations}</p>
                    <p className="text-xs mt-1" style={{ color: stats.pendingEvaluations > 0 ? '#fa8c16' : '#8c8c8c' }}>
                      {stats.pendingEvaluations > 0 ? 'Por entregar' : 'Al día'}
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: stats.pendingEvaluations > 0 ? '#fff7e6' : '#f5f5f5' }}>
                    <FileTextOutlined style={{ fontSize: 18, color: stats.pendingEvaluations > 0 ? '#fa8c16' : '#8c8c8c' }} />
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={12} sm={12} md={8} lg={5}>
              <div className="rounded-xl p-4 bg-white h-full" style={{ border: '1px solid #f9f0ff', borderLeft: '4px solid #722ed1', boxShadow: '0 2px 8px -2px rgba(30,30,48,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Test Yourself</p>
                    <p className="text-2xl font-bold text-purple-700">{stats.testYourself}</p>
                    <p className="text-xs text-purple-400 mt-1">Exámenes</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f9f0ff' }}>
                    <AuditOutlined style={{ fontSize: 18, color: '#722ed1' }} />
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={12} sm={12} md={8} lg={4}>
              <div className="rounded-xl p-4 bg-white h-full" style={{ border: '1px solid #f6ffed', borderLeft: '4px solid #52c41a', boxShadow: '0 2px 8px -2px rgba(30,30,48,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1">Asistencia</p>
                    <p className="text-2xl font-bold text-green-600">{stats.attendance}%</p>
                    <p className="text-xs text-green-400 mt-1">Últimos 30 días</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f6ffed' }}>
                    <CalendarOutlined style={{ fontSize: 18, color: '#52c41a' }} />
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        )
      })()}

      {/* Academic Year Selector for attendance filter */}
      {studentProfile && (
        <AcademicYearSelector
          studentId={studentProfile.id}
          value={selectedYearId}
          onChange={setSelectedYearId}
        />
      )}

      {/* Pending Tasks Widget - Full Width Above Calendar */}
      <PendingTasksWidget
        className="w-full"
        maxItems={8}
        height={350}
        style={{ marginBottom: 24 }}
      />

      {/* Blog Feed Preview - Centro News */}
      <div style={{ marginBottom: 24 }}>
        <BlogFeedPreview
          maxPosts={3}
          title="Noticias del Centro"
          blogRoute="/blog"
          showFeatured={true}
          compact={false}
        />
      </div>

      {/* Calendar Section - Full Width */}
      <Card title="Mi Calendario Académico" className="w-full" style={{ marginBottom: 24 }}>
        <CalendarWidget
          userRole="student"
          height={600}
          showEventList={true}
          maxEvents={5}
          includeTasks={true}
          studentTasks={allPendingTasks}
        />
      </Card>

      {/* Main Content */}
      <Row gutter={[16, 16]}>
        {/* Left Column */}
        <Col xs={24} lg={12}>
          <Space direction="vertical" size="middle" className="w-full">

            {/* Subjects Overview */}
            <Card 
              title="Mis Asignaturas" 
              extra={
                <Button 
                  type="link" 
                  icon={<EyeOutlined />}
                  onClick={() => safeNavigate('/student/grades')}
                >
                  Ver Todas
                </Button>
              }
            >
              {subjects.length > 0 ? (
                <List
                  dataSource={subjects}
                  renderItem={(subject) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Avatar style={{ backgroundColor: getGradeColor(subject.averageGrade) }}>
                            {subject.averageGrade > 0 ? `${Math.round(subject.averageGrade)}%` : subject.subject.code.charAt(0)}
                          </Avatar>
                        }
                        title={subject.subject.name}
                        description={subject?.teacher?.user?.profile?.firstName && subject?.teacher?.user?.profile?.lastName
                          ? `${subject.teacher.user.profile.firstName} ${subject.teacher.user.profile.lastName}`
                          : subject?.teacher?.user?.profile?.fullName || 'Profesor no especificado'}
                      />
                      <div>
                        <div className="text-right">
                          <Text
                            strong
                            className={
                              subject.averageGrade >= 90 ? 'grade-excellent' :
                              subject.averageGrade >= 70 ? 'grade-good' :
                              subject.averageGrade >= 50 ? 'grade-average' :
                              subject.averageGrade > 0   ? 'grade-poor' : ''
                            }
                            style={{ fontSize: '18px' }}
                          >
                            {subject.averageGrade > 0 ? `${Math.round(subject.averageGrade)}%` : '-'}
                          </Text>
                        </div>
                        <Text type="secondary" className="text-xs">
                          {subject.totalEvaluations} {subject.totalEvaluations === 1 ? 'evaluación' : 'evaluaciones'}
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No hay asignaturas disponibles"
                  className="py-4"
                />
              )}
            </Card>

            {/* Recent Tasks */}
            <Card 
              title="Tareas Recientes" 
              extra={
                <Button 
                  type="link" 
                  icon={<EyeOutlined />}
                  onClick={() => safeNavigate('/student/tasks')}
                >
                  Ver Todas
                </Button>
              }
            >
              {Array.isArray(recentTasks) && recentTasks.length > 0 ? (
                <List
                  size="small"
                  dataSource={recentTasks.slice(0, 4)}
                  renderItem={(task) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Avatar 
                            icon={getTaskTypeIcon(task.taskType)}
                            size="small" 
                            style={{ backgroundColor: getTaskTypeColor(task.taskType) }}
                          />
                        }
                        title={task.title}
                        description={
                          <Space>
                            <Tag color="blue">{task.subjectAssignment.subject.code}</Tag>
                            <Text type="secondary" className="text-xs">
                              {new Date(task.dueDate).toLocaleDateString('es-ES')}
                            </Text>
                          </Space>
                        }
                      />
                      {task.finalGrade && task.maxPoints && (
                        <Text strong style={{ color: getGradeColor((task.finalGrade / task.maxPoints) * 100) }}>
                          {formatPercentageFromFraction(task.finalGrade, task.maxPoints)}
                        </Text>
                      )}
                    </List.Item>
                  )}
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No hay tareas recientes"
                  className="py-4"
                />
              )}
            </Card>
          </Space>
        </Col>

        {/* Right Column */}
        <Col xs={24} lg={12}>
          <Space direction="vertical" size="middle" className="w-full">
            {/* Progress Summary */}
            <Card title="Resumen de Progreso">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: '#1890ff' }}>
                      En progreso
                    </div>
                    <div className="text-xs text-gray-500">Estado General</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {stats.attendance}%
                    </div>
                    <div className="text-xs text-gray-500">Asistencia</div>
                  </div>
                </Col>
              </Row>
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <Text className="text-sm">Evaluaciones Completadas</Text>
                  <Text strong className="text-sm">{stats.completedEvaluations}/{stats.totalEvaluations}</Text>
                </div>
                <Progress 
                  percent={stats.totalEvaluations > 0 ? Math.round((stats.completedEvaluations / stats.totalEvaluations) * 100) : 0}
                  strokeColor="#52c41a"
                  size="small"
                />
              </div>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  )
}

const StudentDashboard: React.FC = () => {

  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route index element={<StudentDashboardHome />} />
      <Route path="tasks" element={<TasksPage />} />
      <Route path="grades" element={<StudentGradesPage />} />
      <Route path="test-yourself" element={<TestYourselfGradesPage />} />
      <Route path="schedule" element={<StudentSchedulePage />} />
      <Route path="calendar" element={<StudentCalendarPage />} />
      <Route path="educational-resources" element={<EducationalResourcesPage />} />
      <Route path="blog" element={<BlogPage />} />
      <Route path="competencies" element={<StudentCompetenciesPage />} />
      <Route path="messages" element={<ConversationsPage />} />
      <Route path="group-chats" element={<GroupChatsPage />} />
      <Route
        path="mis-apuntes" 
        element={<MisApuntesPageNew />}
      />
      <Route 
        path="apuntes-compartidos" 
        element={<SharedNotesPage />}
      />
      <Route path="expediente" element={<StudentExpedientePage />} />
      <Route path="profile" element={<ProfilePage />} />
      <Route path="settings" element={<SettingsPage />} />
    </Routes>
    </Suspense>
  )
}

export default StudentDashboard