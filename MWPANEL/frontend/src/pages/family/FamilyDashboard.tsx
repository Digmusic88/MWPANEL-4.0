import React, { useState, useEffect, useCallback, Suspense } from 'react'
import DynamicGreeting from '@components/common/DynamicGreeting'
import { Routes, Route, useLocation } from 'react-router-dom'
import { safeNavigate } from '@utils/navigationUtils'
import { useAuth } from '@hooks/useAuth'
import { Card, Row, Col, Typography, Space, Avatar, Progress, Button, Spin, message, Empty, Alert, Select } from 'antd'
import {
  UserOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FileTextOutlined,
  DownloadOutlined,
  BookOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { useResponsive } from '@hooks/useResponsive'
import apiClient from '@services/apiClient'
import BlogFeedPreview from '@/components/blog/BlogFeedPreview'
import { formatNumber } from '@utils/numberFormat'

// ─── Lazy-loaded family pages ─────────────────────────────────────────────────
const ConversationsPage = React.lazy(() => import('../communications/ConversationsPage'))
const GroupChatsPage = React.lazy(() => import('../communications/GroupChatsPage'))
const AttendancePage = React.lazy(() => import('./AttendancePage'))
const ActivitiesPage = React.lazy(() => import('./ActivitiesPage'))
const FamilyHomeworkPage = React.lazy(() => import('./FamilyHomeworkPage'))
const TasksPage = React.lazy(() => import('./TasksPage'))
const FamilyGradesPage = React.lazy(() => import('./FamilyGradesPage'))
const FamilyCalendarPageSimple = React.lazy(() => import('./FamilyCalendarPageSimple'))
const FamilyProfilePage = React.lazy(() => import('./FamilyProfilePage'))
const FamilySettingsPage = React.lazy(() => import('./FamilySettingsPage'))
const MyChildrenPage = React.lazy(() => import('./MyChildrenPage'))
const BlogPage = React.lazy(() => import('./BlogPage'))
const MeetingsPage = React.lazy(() => import('./MeetingsPage'))
const StudentNotesPage = React.lazy(() => import('./StudentNotesPage'))
const FamilyExpedientePage = React.lazy(() => import('./FamilyExpedientePage'))

const PageFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
    <Spin size="default" />
  </div>
)

const { Title, Text } = Typography

// Interfaces restored
interface StudentStats {
  totalEvaluations: number
  completedEvaluations: number
  pendingEvaluations: number
  averageGrade: number
  attendance: number
}

interface StudentData {
  id: string
  enrollmentNumber: string
  relationship: 'father' | 'mother' | 'guardian' | 'other'
  user: {
    profile: {
      firstName: string
      lastName: string
    }
  }
  educationalLevel?: {
    id: string
    name: string
  }
  course?: {
    id: string
    name: string
  }
  classGroups: Array<{
    id: string
    name: string
  }>
  stats: StudentStats
  recentEvaluations: any[]
}

interface FamilyDashboardData {
  family: {
    id: string
    primaryContact: {
      id: string
      profile: {
        firstName: string
        lastName: string
      }
    }
    secondaryContact?: {
      id: string
      profile: {
        firstName: string
        lastName: string
      }
    }
  }
  students: StudentData[]
}

const relationshipLabels = {
  father: 'Padre',
  mother: 'Madre', 
  guardian: 'Tutor/a',
  other: 'Otro'
}

const FamilyDashboardHome: React.FC = () => {
  const { user } = useAuth()
  const { isMobile } = useResponsive()
  const [dashboardData, setDashboardData] = useState<FamilyDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.get('/families/dashboard/my-family')
      console.log('📊 Family dashboard data:', response.data)
      setDashboardData(response.data)
    } catch (error: any) {
      console.error('❌ Error fetching family dashboard:', error)
      setError(error.response?.data?.message || 'Error al cargar los datos del dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Initialize selected student with first student when data loads
  useEffect(() => {
    if (dashboardData?.students && dashboardData.students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(dashboardData.students[0].id)
    }
  }, [dashboardData, selectedStudentId])

  if (loading) {
    return (
      <div className="space-y-6" style={{ padding: '20px' }}>
        <div className="mw-skeleton mw-skeleton-title" style={{ width: '280px' }} />
        <div className="mw-skeleton mw-skeleton-text" style={{ width: '200px' }} />
        <Row gutter={[12, 12]}>
          {[1, 2, 3, 4].map((i) => (
            <Col xs={12} sm={12} md={6} key={i}>
              <div className="mw-skeleton mw-skeleton-stat" style={{ height: 120 }} />
            </Col>
          ))}
        </Row>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <div className="mw-skeleton mw-skeleton-card" style={{ height: 200 }} />
          </Col>
          <Col xs={24} md={12}>
            <div className="mw-skeleton mw-skeleton-card" style={{ height: 200 }} />
          </Col>
        </Row>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <Alert
          message="Error al cargar dashboard"
          description={error}
          type="error"
          showIcon
          action={
            <Button onClick={fetchDashboardData} size="small" type="primary">
              Reintentar
            </Button>
          }
        />
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div style={{ padding: '20px' }}>
        <Empty description="No hay datos disponibles" />
      </div>
    )
  }

  const { family, students } = dashboardData

  // Determinar qué contacto está logueado para mostrar su nombre correcto
  const getCurrentContact = () => {
    if (!user) return family.primaryContact
    
    // Si el usuario actual es el contacto principal
    if (family.primaryContact.id === user.id) {
      return family.primaryContact
    }
    
    // Si el usuario actual es el contacto secundario
    if (family.secondaryContact && family.secondaryContact.id === user.id) {
      return family.secondaryContact
    }
    
    // Fallback al contacto principal
    return family.primaryContact
  }

  const currentContact = getCurrentContact()

  const currentDate = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div style={{ padding: '20px' }}>
      {/* Page Header */}
      <div className="mw-page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="mw-page-header__title">Panel Familiar</h1>
          <p className="mw-page-header__subtitle">{currentDate.charAt(0).toUpperCase() + currentDate.slice(1)}</p>
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <DynamicGreeting
          firstName={currentContact.profile.firstName}
          lastName={currentContact.profile.lastName}
          fallbackText="Familia"
          showSubtext={true}
          subtextContent={`Dashboard Familiar - ${new Date().toLocaleDateString()}`}
        />
      </div>

      {/* Quick Actions - Optimizado para móvil */}
      <Row gutter={[12, 12]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => safeNavigate('/family/meetings', 'Reuniones')}
            className="mw-stat-card mw-stat-card--blue"
            style={{ minHeight: '120px', cursor: 'pointer' }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <div className="mw-stat-card__icon mw-stat-card__icon--blue" style={{ margin: '0 auto 12px' }}>
              <CalendarOutlined style={{ fontSize: '20px' }} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Reuniones</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>con Profesores</Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => safeNavigate('/family/grades', 'Calificaciones')}
            className="mw-stat-card mw-stat-card--green"
            style={{ minHeight: '120px', cursor: 'pointer' }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <div className="mw-stat-card__icon mw-stat-card__icon--green" style={{ margin: '0 auto 12px' }}>
              <TrophyOutlined style={{ fontSize: '20px' }} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Calificaciones</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>y Evaluaciones</Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => safeNavigate('/family/attendance', 'Asistencia')}
            className="mw-stat-card mw-stat-card--amber"
            style={{ minHeight: '120px', cursor: 'pointer' }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <div className="mw-stat-card__icon mw-stat-card__icon--amber" style={{ margin: '0 auto 12px' }}>
              <CalendarOutlined style={{ fontSize: '20px' }} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Asistencia</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>y Faltas</Text>
          </Card>
        </Col>
        <Col xs={12} sm={12} md={6}>
          <Card
            hoverable
            onClick={() => safeNavigate('/family/my-children', 'Mis Hijos')}
            className="mw-stat-card mw-stat-card--purple"
            style={{ minHeight: '120px', cursor: 'pointer' }}
            bodyStyle={{ padding: '16px', textAlign: 'center' }}
          >
            <div className="mw-stat-card__icon mw-stat-card__icon--purple" style={{ margin: '0 auto 12px' }}>
              <UserOutlined style={{ fontSize: '20px' }} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>Mis Hijos</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>Información</Text>
          </Card>
        </Col>
      </Row>

      {/* Blog Feed Preview - Centro News */}
      <div style={{ marginBottom: '24px' }}>
        <BlogFeedPreview
          maxPosts={4}
          title="Noticias del Centro"
          blogRoute="/blog"
          showFeatured={true}
        />
      </div>

      {/* Student Selector for Mobile - Only show if multiple students */}
      {isMobile && students.length > 1 && (
        <Card style={{ marginBottom: '16px' }} bodyStyle={{ padding: '12px' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong style={{ fontSize: '13px' }}>
              <SwapOutlined /> Seleccionar Hijo/a
            </Text>
            <Select
              value={selectedStudentId}
              onChange={(value) => setSelectedStudentId(value)}
              style={{ width: '100%' }}
              size="large"
            >
              {students.map((student) => (
                <Select.Option key={student.id} value={student.id}>
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    <span>
                      {student.user.profile.firstName} {student.user.profile.lastName}
                      <Text type="secondary" style={{ fontSize: '12px', marginLeft: '8px' }}>
                        ({relationshipLabels[student.relationship]})
                      </Text>
                    </span>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Space>
        </Card>
      )}

      {/* Students Overview */}
      <Card title="Resumen de Estudiantes" style={{ marginBottom: '24px' }}>
        {students.length === 0 ? (
          <Empty description="No hay estudiantes asociados a esta familia" />
        ) : (
          <Row gutter={[16, 16]}>
            {students
              .filter(student => !isMobile || student.id === selectedStudentId)
              .map((student) => {
              const isSelected = student.id === selectedStudentId
              return (
              <Col xs={24} md={12} lg={8} key={student.id}>
                <Card
                  size="small"
                  onClick={() => setSelectedStudentId(student.id)}
                  style={{
                    cursor: students.length > 1 ? 'pointer' : 'default',
                    borderColor: isSelected ? 'var(--mw-primary, #2c5f8a)' : undefined,
                    borderWidth: isSelected ? '2px' : '1px',
                    boxShadow: isSelected ? '0 0 0 3px rgba(44,95,138,0.12)' : undefined,
                    transition: 'border-color 0.2s, box-shadow 0.2s'
                  }}
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Avatar
                        icon={<UserOutlined />}
                        style={{ backgroundColor: isSelected ? 'var(--mw-primary, #2c5f8a)' : undefined }}
                      />
                      <div>
                        <div>{student.user.profile.firstName} {student.user.profile.lastName}</div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {relationshipLabels[student.relationship]}
                        </Text>
                      </div>
                      {isSelected && students.length > 1 && (
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: '11px',
                          color: 'var(--mw-primary, #2c5f8a)',
                          fontWeight: 600,
                          background: 'rgba(44,95,138,0.1)',
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>Seleccionado</span>
                      )}
                    </div>
                  }
                >
                  <div style={{ marginTop: '12px' }}>
                    <Text strong>Estadísticas:</Text>
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <Text>Asistencia</Text>
                        <Text>{typeof student.stats.attendance === 'number' ? `${student.stats.attendance}%` : 'En seguimiento'}</Text>
                      </div>
                      <Progress percent={typeof student.stats.attendance === 'number' ? student.stats.attendance : 0} size="small" status="active" />
                    </div>

                    {student.stats.averageGrade > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <Text>Promedio</Text>
                          {/* La nota es porcentaje 0-100 (igual que en el resto de la plataforma) */}
                          <Text>{student.stats.averageGrade.toFixed(1)}%</Text>
                        </div>
                        <Progress
                          percent={Math.min(100, Math.round(student.stats.averageGrade))}
                          size="small"
                          status={student.stats.averageGrade >= 50 ? "success" : "exception"}
                        />
                      </div>
                    )}
                  </div>
                </Card>
              </Col>
            )
            })}
          </Row>
        )}
      </Card>

      {/* Calendar Widget for Meetings */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <CalendarOutlined />
                Reuniones Familiares
              </Space>
            }
            style={{ height: '300px' }}
          >
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <CalendarOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
              <div>
                <Text style={{ display: 'block', marginBottom: '16px' }}>
                  Gestiona las reuniones con los profesores de tus hijos
                </Text>
                <Button 
                  type="primary" 
                  icon={<CalendarOutlined />}
                  onClick={() => safeNavigate('/family/calendar', 'Calendario')}
                >
                  Ver Calendario de Reuniones
                </Button>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Accesos Rápidos" style={{ height: '300px' }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Button
                type="primary"
                icon={<CalendarOutlined />}
                block
                size="large"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '500'
                }}
                onClick={() => safeNavigate('/family/meetings', 'Reuniones')}
              >
                Ver Todas las Reuniones
              </Button>
              <Button
                icon={<CalendarOutlined />}
                block
                size="large"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
                onClick={() => safeNavigate('/family/calendar', 'Calendario')}
              >
                Calendario Completo
              </Button>
              <Button
                icon={<FileTextOutlined />}
                block
                size="large"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
                onClick={() => safeNavigate('/family/grades', 'Calificaciones')}
              >
                Notas y Evaluaciones
              </Button>
              <Button
                icon={<UserOutlined />}
                block
                size="large"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
                onClick={() => safeNavigate('/family/my-children', 'Mis Hijos')}
              >
                Información de Mis Hijos
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

const FamilyDashboard: React.FC = () => {
  const location = useLocation()
  
  // Debug: Monitor family dashboard location changes
  useEffect(() => {
    console.log('📍 FamilyDashboard location:', location.pathname)
    console.log('📍 Should render route for:', location.pathname.replace('/family/', '') || 'index')
  }, [location])

  return (
    <div>
      <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route index element={<FamilyDashboardHome />} />
        <Route path="my-children" element={<MyChildrenPage />} />
        <Route path="grades" element={<FamilyGradesPage />} />
        <Route path="messages" element={<ConversationsPage />} />
        <Route path="group-chats" element={<GroupChatsPage />} />
        <Route path="meetings" element={<MeetingsPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="daily-homework" element={<FamilyHomeworkPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="student-notes" element={<StudentNotesPage />} />
        <Route path="expediente" element={<FamilyExpedientePage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="calendar" element={<FamilyCalendarPageSimple />} />
        <Route path="profile" element={<FamilyProfilePage />} />
        <Route path="settings" element={<FamilySettingsPage />} />
      </Routes>
      </Suspense>
    </div>
  )
}

export default FamilyDashboard