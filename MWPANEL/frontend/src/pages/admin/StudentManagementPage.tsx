import { useState, useEffect } from 'react'
import { useProfilePhoto } from '../../hooks/useProfilePhoto'
import dayjs from 'dayjs'
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
  Avatar,
  Tooltip,
  Popconfirm,
  DatePicker,
  AutoComplete,
  Drawer,
  Divider,
  Row,
  Col,
  Tabs,
  Statistic,
  List,
  Progress,
  Empty,
} from 'antd'
import InteractiveButton from '@components/animations/InteractiveButton'
import ScrollReveal from '@components/animations/ScrollReveal'
import FadeInUp from '@components/animations/FadeInUp'
import AnimatedModal from '@components/animations/AnimatedModal'
import AnimatedDrawer from '@components/animations/AnimatedDrawer'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  EyeOutlined,
  FilterOutlined,
  FileTextOutlined,
  BarChartOutlined,
  LoginOutlined,
  DownloadOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PieChartOutlined,
  TeamOutlined,
  TrophyOutlined,
  StopOutlined,
  ProfileOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import apiClient from '@services/apiClient'
import { GenerateAutoReportButton } from '@/components/student-reports/auto/GenerateAutoReportButton'
import ResponsiveTable, { useResponsiveColumns } from '../../components/common/ResponsiveTable'
import ResponsiveModal from '../../components/common/ResponsiveModal'
import { useResponsive } from '../../hooks/useResponsive'
import BirthdayIcon from '../../components/common/BirthdayIcon'
import { useAuthStore } from '@store/authStore'
import AttendanceStatsModal from '../../components/teacher/AttendanceStatsModal'
import GroupAttendanceStatsModal from '../../components/teacher/GroupAttendanceStatsModal'
import AdminAttendanceDashboard from '../../components/admin/AdminAttendanceDashboard'
import { AttendanceStatus, AttendanceStats } from '../../types/attendance'
import { SyncExpedienteButton } from '@/components/academic-records/SyncExpedienteButton'
import ExpedienteViewer from '@/components/academic-records/ExpedienteViewer'
import BuildYearExpedientesButton from '@/components/academic-records/BuildYearExpedientesButton'
import SecretariaFichaPanel from '../../components/admin/SecretariaFichaPanel'
import AdminPerformanceSection from '@/components/academic-records/AdminPerformanceSection'
import { useCurrentAcademicYear } from '../../hooks/useCurrentAcademicYear'
import StudentSubjectCurriculumPanel from '@components/student-curriculum/StudentSubjectCurriculumPanel'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

interface Student {
  id: string
  user: {
    id: string
    email: string
    isActive: boolean
    profile: {
      firstName: string
      lastName: string
      phone?: string
      avatarUrl?: string
      dni?: string
    }
  }
  enrollmentNumber: string
  birthDate: string
  educationalLevel?: {
    id: string
    name: string
  }
  course?: {
    id: string
    name: string
  }
  classGroups?: Array<{
    id: string
    name: string
  }>
  createdAt: string
}

interface ClassGroup {
  id: string
  name: string
  students?: Student[]
}

interface StudentAttendanceStats {
  studentId: string
  studentName: string
  totalDays: number
  present: number
  absent: number
  late: number
  justifiedAbsence: number
  attendanceRate: number
}

// Componente para Avatar de estudiante con foto real
const StudentAvatar: React.FC<{ 
  avatarUrl?: string | null, 
  size?: 'small' | 'default' | 'large' 
}> = ({ avatarUrl, size = 'default' }) => {
  const { photoUrl, hasPhoto } = useProfilePhoto(avatarUrl)
  
  return (
    <Avatar 
      src={photoUrl} 
      icon={!hasPhoto ? <UserOutlined /> : undefined}
      size={size}
    />
  )
}

const StudentManagementPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchOptions, setSearchOptions] = useState<{ value: string; label: string }[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [groupFilter, setGroupFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('students')
  
  // Modal states
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false)
  const [isEvaluationsVisible, setIsEvaluationsVisible] = useState(false)
  const [isAttendanceStatsVisible, setIsAttendanceStatsVisible] = useState(false)
  const [isGroupStatsVisible, setIsGroupStatsVisible] = useState(false)
  
  // Selected items
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null)
  const [evaluatingStudent, setEvaluatingStudent] = useState<Student | null>(null)
  const [curriculumStudent, setCurriculumStudent] = useState<Student | null>(null)
  const [selectedStudentForAttendance, setSelectedStudentForAttendance] = useState<{
    id: string
    name: string
  } | null>(null)
  const [selectedGroupForStats, setSelectedGroupForStats] = useState<string | null>(null)
  
  // Data states
  const [educationalLevels, setEducationalLevels] = useState<{ id: string; name: string }[]>([])
  const [attendanceStats, setAttendanceStats] = useState<StudentAttendanceStats[]>([])
  
  const [form] = Form.useForm()
  const { isMobile } = useResponsive()
  const { currentAcademicYear } = useCurrentAcademicYear()

  // Fetch functions
  const fetchStudents = async () => {
    setLoading(true)
    try {
      // Incluir estudiantes inactivos para poder gestionarlos
      const response = await apiClient.get('/students?includeInactive=true')
      console.log('📡 [FRONTEND] Students count:', response.data?.length)
      if (response.data?.[0]) {
        console.log('📡 [FRONTEND] First student birthDate field:', response.data[0].birthDate)
        console.log('📡 [FRONTEND] First student user.profile.dateOfBirth:', response.data[0]?.user?.profile?.dateOfBirth)
      }
      setStudents(response.data)
    } catch (error) {
      message.error('Error al cargar estudiantes')
    } finally {
      setLoading(false)
    }
  }

  const fetchClassGroups = async () => {
    try {
      const response = await apiClient.get('/class-groups?includeStudents=true')
      setClassGroups(response.data)
    } catch (error) {
      console.error('Error loading class groups:', error)
    }
  }

  const fetchEducationalLevels = async () => {
    try {
      const response = await apiClient.get('/educational-levels')
      setEducationalLevels(response.data)
    } catch (error) {
      console.error('Error loading educational levels:', error)
    }
  }

  const fetchGlobalAttendanceStats = async () => {
    try {
      setLoading(true)
      // Obtener estadísticas de asistencia de todos los estudiantes
      const today = dayjs()
      const startDate = today.subtract(30, 'days').format('YYYY-MM-DD')
      const endDate = today.format('YYYY-MM-DD')
      
      const statsPromises = students.map(async (student) => {
        try {
          const response = await apiClient.get(`/attendance/stats/student/${student.id}?days=30`)
          // Los datos vienen en response.data.stats
          const stats = response.data.stats || response.data
          return {
            studentId: student.id,
            studentName: `${student.user?.profile?.firstName} ${student.user?.profile?.lastName}`,
            totalDays: stats.totalDays || 0,
            present: stats.presentDays || 0,
            absent: stats.absentDays || 0,
            late: stats.lateDays || 0,
            justifiedAbsence: stats.justifiedAbsences || 0,
            attendanceRate: stats.attendanceRate || 0
          }
        } catch (error) {
          return {
            studentId: student.id,
            studentName: `${student.user?.profile?.firstName} ${student.user?.profile?.lastName}`,
            totalDays: 0,
            present: 0,
            absent: 0,
            late: 0,
            justifiedAbsence: 0,
            attendanceRate: 0
          }
        }
      })
      
      const results = await Promise.all(statsPromises)
      setAttendanceStats(results)
    } catch (error) {
      console.error('Error fetching attendance stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchClassGroups()
    fetchEducationalLevels()
  }, [])

  useEffect(() => {
    // Cargar estadísticas de asistencia cuando se cargan los estudiantes
    // o cuando se cambia a la pestaña de asistencia
    if (students.length > 0 && (activeTab === 'attendance' || attendanceStats.length === 0)) {
      fetchGlobalAttendanceStats()
    }
  }, [activeTab, students])

  // Generate search options for autocomplete
  const generateSearchOptions = (searchValue: string) => {
    if (!searchValue || searchValue.length < 2) {
      setSearchOptions([])
      return
    }

    const options: { value: string; label: string }[] = []
    const searchLower = searchValue.toLowerCase()

    students.forEach(student => {
      if (!student?.user?.profile) return
      
      const firstName = student.user.profile.firstName || ''
      const lastName = student.user.profile.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      const email = student.user.email || ''
      const enrollmentNumber = student.enrollmentNumber || ''

      if (fullName && fullName.toLowerCase().includes(searchLower)) {
        options.push({
          value: fullName,
          label: `👤 ${fullName}`,
        })
      }

      if (email && email.toLowerCase().includes(searchLower)) {
        options.push({
          value: email,
          label: `📧 ${email}`,
        })
      }

      if (enrollmentNumber && enrollmentNumber.toLowerCase().includes(searchLower)) {
        options.push({
          value: enrollmentNumber,
          label: `🎓 ${enrollmentNumber}`,
        })
      }
    })

    const uniqueOptions = options.filter((option, index, self) => 
      index === self.findIndex(o => o.value === option.value)
    ).slice(0, 10)

    setSearchOptions(uniqueOptions)
  }

  // Filter students
  const filteredStudents = students.filter(student => {
    if (!student?.user?.profile) return false
    
    const matchesSearch = 
      (student.user.profile.firstName || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (student.user.profile.lastName || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (student.user.email || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (student.enrollmentNumber || '').toLowerCase().includes(searchText.toLowerCase())
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'active' && student.user.isActive) ||
      (statusFilter === 'inactive' && !student.user.isActive)
      
    const matchesLevel = 
      levelFilter === 'all' ||
      student.educationalLevel?.id === levelFilter
      
    const matchesGroup = 
      groupFilter === 'all' ||
      student.classGroups?.some(group => group.id === groupFilter)
    
    return matchesSearch && matchesStatus && matchesLevel && matchesGroup
  })

  // Table columns for students
  const baseColumns: (ColumnsType<Student>[number] & { hideOnMobile?: boolean; hideOnTablet?: boolean })[] = [
    {
      title: 'Estudiante',
      key: 'student',
      render: (_, record) => (
        <Space>
          <StudentAvatar 
            avatarUrl={record.user?.profile?.avatarUrl} 
            size={isMobile ? 'default' : 'large'}
          />
          <div>
            <div className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
              {record.user?.profile?.firstName || ''} {record.user?.profile?.lastName || ''}
              <BirthdayIcon 
                user={{
                  id: record.user?.id || record.id,
                  firstName: record.user?.profile?.firstName || '',
                  lastName: record.user?.profile?.lastName || '',
                  dateOfBirth: record.user?.profile?.dateOfBirth,
                  role: 'student'
                }}
              />
            </div>
            <Text type="secondary" className="text-xs">
              {record.user?.email || ''}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Matrícula',
      dataIndex: 'enrollmentNumber',
      key: 'enrollmentNumber',
      hideOnMobile: true,
      render: (number) => (
        <Tag color="blue" className="text-xs">{number}</Tag>
      ),
    },
    {
      title: 'Nivel/Curso',
      key: 'education',
      hideOnMobile: false,
      render: (_, record) => (
        <div>
          {record.educationalLevel && (
            <div className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
              {record.educationalLevel.name}
            </div>
          )}
          {record.course && (
            <Text type="secondary" className="text-xs">
              {record.course.name}
            </Text>
          )}
          {!record.educationalLevel && !record.course && (
            <Text type="secondary" className="text-xs">Sin asignar</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Clases',
      key: 'classGroups',
      hideOnMobile: true,
      render: (_, record) => (
        <div>
          {record.classGroups && record.classGroups.length > 0 ? (
            <Space wrap>
              {record.classGroups.slice(0, 2).map(group => (
                <Tag key={group.id} color="purple" className="text-xs">
                  {group.name}
                </Tag>
              ))}
              {record.classGroups.length > 2 && (
                <Tag color="default" className="text-xs">
                  +{record.classGroups.length - 2}
                </Tag>
              )}
            </Space>
          ) : (
            <Text type="secondary" className="text-xs">Sin asignar</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      hideOnTablet: true,
      render: (_, record) => (
        <Tag 
          color={record.user.isActive ? 'green' : 'red'}
          className="text-xs"
        >
          {record.user.isActive ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Ver detalles">
            <Button
              type="text"
              size={isMobile ? 'small' : 'middle'}
              icon={<EyeOutlined />}
              onClick={() => handleViewStudent(record)}
            />
          </Tooltip>
          <Tooltip title="Asistencia">
            <Button
              type="text"
              size={isMobile ? 'small' : 'middle'}
              icon={<CalendarOutlined />}
              onClick={() => handleViewAttendance(record)}
            />
          </Tooltip>
          <Tooltip title="Calificaciones y expediente">
            <Button
              type="text"
              size={isMobile ? 'small' : 'middle'}
              icon={<BarChartOutlined />}
              onClick={() => handleViewEvaluations(record)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              size={isMobile ? 'small' : 'middle'}
              icon={<EditOutlined />}
              onClick={() => handleEditStudent(record)}
            />
          </Tooltip>
          <Tooltip title="Iniciar sesión como usuario">
            <Button
              type="text"
              size={isMobile ? 'small' : 'middle'}
              icon={<LoginOutlined />}
              onClick={() => handleImpersonateUser(record)}
            />
          </Tooltip>
          <GenerateAutoReportButton studentId={record.id} basePath="/admin/reports" />
          {record.user.isActive ? (
            <Tooltip title="Desactivar estudiante y familias">
              <Popconfirm
                title="¿Desactivar estudiante?"
                description={
                  <div>
                    <p>¿Estás seguro de desactivar a {record.user?.profile?.firstName || 'este'} {record.user?.profile?.lastName || 'estudiante'}?</p>
                    <p style={{ marginTop: 8, color: '#ff4d4f' }}>
                      <strong>Importante:</strong> Esto también desactivará a todas las familias asociadas (padres/tutores).
                    </p>
                    <p style={{ marginTop: 8 }}>
                      El estudiante y las familias no podrán acceder al sistema hasta que sean reactivados.
                    </p>
                  </div>
                }
                onConfirm={() => handleDeactivateStudent(
                  record.id,
                  `${record.user?.profile?.firstName || ''} ${record.user?.profile?.lastName || ''}`.trim()
                )}
                okText="Sí, desactivar"
                cancelText="Cancelar"
                okType="danger"
              >
                <Button
                  type="text"
                  size={isMobile ? 'small' : 'middle'}
                  icon={<StopOutlined />}
                  danger
                />
              </Popconfirm>
            </Tooltip>
          ) : (
            <Tooltip title="Reactivar estudiante y familias">
              <Popconfirm
                title="¿Reactivar estudiante?"
                description={
                  <div>
                    <p>¿Estás seguro de reactivar a {record.user?.profile?.firstName || 'este'} {record.user?.profile?.lastName || 'estudiante'}?</p>
                    <p style={{ marginTop: 8, color: '#52c41a' }}>
                      Esto también reactivará a todas las familias asociadas (padres/tutores).
                    </p>
                    <p style={{ marginTop: 8 }}>
                      El estudiante y las familias podrán acceder al sistema nuevamente.
                    </p>
                  </div>
                }
                onConfirm={() => handleReactivateStudent(
                  record.id,
                  `${record.user?.profile?.firstName || ''} ${record.user?.profile?.lastName || ''}`.trim()
                )}
                okText="Sí, reactivar"
                cancelText="Cancelar"
              >
                <Button
                  type="text"
                  size={isMobile ? 'small' : 'middle'}
                  icon={<CheckCircleOutlined />}
                  style={{ color: '#52c41a' }}
                />
              </Popconfirm>
            </Tooltip>
          )}
          <Tooltip title="Eliminar estudiante">
            <Popconfirm
              title="¿Eliminar estudiante?"
              description={`¿Estás seguro de eliminar a ${record.user?.profile?.firstName || 'este'} ${record.user?.profile?.lastName || 'estudiante'}?`}
              onConfirm={() => handleDeleteStudent(record.id)}
              okText="Sí, eliminar"
              cancelText="Cancelar"
              okType="danger"
            >
              <Button
                type="text"
                size={isMobile ? 'small' : 'middle'}
                icon={<DeleteOutlined />}
                danger
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  // Get responsive columns
  const columns = useResponsiveColumns(baseColumns)

  // Handlers
  const handleViewStudent = (student: Student) => {
    setViewingStudent(student)
    setIsDetailDrawerVisible(true)
  }

  const handleViewAttendance = (student: Student) => {
    setSelectedStudentForAttendance({
      id: student.id,
      name: `${student.user?.profile?.firstName} ${student.user?.profile?.lastName}`
    })
    setIsAttendanceStatsVisible(true)
  }

  const handleViewEvaluations = (student: Student) => {
    setEvaluatingStudent(student)
    setIsEvaluationsVisible(true)
  }

  const handleEditStudent = (student: Student) => {
    console.log('📖 [FRONTEND] handleEditStudent called for student:', student.user?.profile?.firstName)
    console.log('📖 [FRONTEND] student.birthDate:', student.birthDate)
    console.log('📖 [FRONTEND] student.user?.profile?.dateOfBirth:', student.user?.profile?.dateOfBirth)
    
    setEditingStudent(student)
    
    const formData = {
      email: student.user?.email || '',
      firstName: student.user?.profile?.firstName || '',
      lastName: student.user?.profile?.lastName || '',
      phone: student.user?.profile?.phone || '',
      dni: student.user?.profile?.dni || '',
      enrollmentNumber: student.enrollmentNumber || '',
      birthDate: student.birthDate ? dayjs(student.birthDate) : null,
      educationalLevelId: student.educationalLevel?.id,
    }
    
    console.log('📖 [FRONTEND] birthDate for form:', formData.birthDate)
    
    form.setFieldsValue(formData)
    setIsModalVisible(true)
  }

  const handleDeleteStudent = async (studentId: string) => {
    try {
      await apiClient.delete(`/students/${studentId}`)
      message.success('Estudiante eliminado correctamente')
      fetchStudents()
    } catch (error: any) {
      // Mostrar el mensaje específico del error si está disponible
      if (error.response?.data?.message) {
        message.error(error.response.data.message)
      } else {
        message.error('Error al eliminar estudiante')
      }
    }
  }

  const handleDeactivateStudent = async (studentId: string, studentName: string) => {
    try {
      const response = await apiClient.patch(`/students/${studentId}/deactivate`)
      message.success(`${studentName} ha sido desactivado. ${response.data.data.deactivatedFamilies} familias desactivadas.`)
      fetchStudents()
    } catch (error: any) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message)
      } else {
        message.error('Error al desactivar estudiante')
      }
    }
  }

  const handleReactivateStudent = async (studentId: string, studentName: string) => {
    try {
      const response = await apiClient.patch(`/students/${studentId}/reactivate`)
      message.success(`${studentName} ha sido reactivado. ${response.data.data.reactivatedFamilies} familias reactivadas.`)
      fetchStudents()
    } catch (error: any) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message)
      } else {
        message.error('Error al reactivar estudiante')
      }
    }
  }

  const handleImpersonateUser = async (student: Student) => {
    try {
      Modal.confirm({
        title: '¿Iniciar sesión como este usuario?',
        content: `Vas a iniciar sesión como ${student.user?.profile?.firstName || 'Usuario'} ${student.user?.profile?.lastName || 'Sin nombre'}`,
        okText: 'Sí, iniciar sesión',
        cancelText: 'Cancelar',
        onOk: async () => {
          try {
            const { impersonateUser } = useAuthStore.getState()
            await impersonateUser(student.user.id)
            
            message.success(`Iniciando sesión como ${student.user?.profile?.firstName || 'usuario'}`)
            
            setTimeout(() => {
              window.location.href = '/student'
            }, 1000)
          } catch (error: any) {
            console.error('Error impersonating user:', error)
            if (error.response?.status === 403) {
              message.error('No tienes permisos para impersonar usuarios')
            } else if (error.response?.status === 404) {
              message.error('Usuario no encontrado')
            } else {
              message.error('Error al iniciar sesión como usuario')
            }
          }
        }
      })
    } catch (error) {
      console.error('Error showing impersonation modal:', error)
      message.error('Error al mostrar confirmación')
    }
  }

  const handleAddStudent = () => {
    setEditingStudent(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handlePasswordChange = async (userId: string, newPassword: string) => {
    try {
      await apiClient.post('/admin/reset-password', {
        userId,
        newPassword
      })
    } catch (error: any) {
      console.error('❌ Error changing password with admin endpoint:', error)
      throw error
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      console.log('🔍 [FRONTEND] Form values received:', JSON.stringify(values, null, 2))
      console.log('🔍 [FRONTEND] values.birthDate:', values.birthDate)
      console.log('🔍 [FRONTEND] typeof values.birthDate:', typeof values.birthDate)
      
      const submitData = {
        ...values,
        birthDate: values.birthDate ? dayjs(values.birthDate).format('YYYY-MM-DD') : undefined,
        newPassword: undefined,
      }
      
      console.log('🔍 [FRONTEND] submitData before cleanup:', JSON.stringify(submitData, null, 2))
      
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === undefined) {
          console.log('🔍 [FRONTEND] Removing undefined field:', key)
          delete submitData[key]
        }
      })
      
      console.log('🔍 [FRONTEND] Final submitData to send:', JSON.stringify(submitData, null, 2))

      if (editingStudent) {
        console.log('🔍 [FRONTEND] Sending PATCH request to:', `/students/${editingStudent.id}`)
        console.log('🔍 [FRONTEND] With data:', JSON.stringify(submitData, null, 2))
        
        await apiClient.patch(`/students/${editingStudent.id}`, submitData)
        
        console.log('🔍 [FRONTEND] PATCH request completed successfully')
        
        if (values.newPassword && values.newPassword.trim() !== '') {
          await handlePasswordChange(editingStudent.user.id, values.newPassword)
        }
        
        message.success('Estudiante actualizado correctamente')
      } else {
        await apiClient.post('/students', submitData)
        message.success('Estudiante creado correctamente')
      }
      setIsModalVisible(false)
      form.resetFields()
      fetchStudents()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al guardar estudiante')
    }
  }

  const handleCancel = () => {
    setIsModalVisible(false)
    form.resetFields()
    setEditingStudent(null)
  }

  const handleSearchChange = (value: string) => {
    setSearchText(value)
    generateSearchOptions(value)
  }

  const handleSearchSelect = (value: string) => {
    setSearchText(value)
    setSearchOptions([])
  }

  const handleDetailDrawerClose = () => {
    setIsDetailDrawerVisible(false)
    setViewingStudent(null)
  }

  const handleDownloadCredentials = async (includeInactive: boolean = false) => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/students/credentials/download?includeInactive=${includeInactive}`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `credenciales_estudiantes_${new Date().getTime()}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      message.success('PDF de credenciales descargado exitosamente')
    } catch (error: any) {
      console.error('Error downloading credentials PDF:', error)
      message.error('Error al descargar el PDF de credenciales')
    } finally {
      setLoading(false)
    }
  }

  const handleViewGroupStats = (groupId: string) => {
    setSelectedGroupForStats(groupId)
    setIsGroupStatsVisible(true)
  }

  // Calcular estadísticas generales
  const totalStudents = students.length
  const activeStudents = students.filter(s => s.user.isActive).length
  const inactiveStudents = totalStudents - activeStudents
  // Calcular promedio solo de estudiantes con asistencia registrada (totalDays > 0)
  const studentsWithAttendance = attendanceStats.filter(stat => stat.totalDays > 0)
  const averageAttendance = studentsWithAttendance.length > 0
    ? Math.round(studentsWithAttendance.reduce((sum, stat) => sum + stat.attendanceRate, 0) / studentsWithAttendance.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeInUp>
        <div className="flex justify-between items-center">
          <div>
            <Title level={2} className="!mb-2">
              Gestión Integral de Estudiantes
            </Title>
            <Text type="secondary">
              Control completo de estudiantes, asistencia y rendimiento académico
            </Text>
          </div>
          <Space>
            <InteractiveButton 
              variant="secondary" 
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadCredentials(false)}
              disabled={loading}
            >
              {isMobile ? 'Credenciales' : 'Descargar Credenciales'}
            </InteractiveButton>
            <InteractiveButton 
              variant="primary" 
              icon={<PlusOutlined />}
              onClick={handleAddStudent}
            >
              {isMobile ? 'Nuevo' : 'Nuevo Estudiante'}
            </InteractiveButton>
          </Space>
        </div>
      </FadeInUp>

      {/* Global Statistics */}
      <ScrollReveal direction="up" delay={0.1}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Estudiantes"
                value={totalStudents}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Estudiantes Activos"
                value={activeStudents}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Estudiantes Inactivos"
                value={inactiveStudents}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Asistencia Promedio"
                value={averageAttendance}
                prefix={<BarChartOutlined />}
                suffix="%"
                valueStyle={{ color: averageAttendance >= 80 ? '#52c41a' : '#faad14' }}
              />
            </Card>
          </Col>
        </Row>
      </ScrollReveal>

      {/* Main Content Tabs */}
      <ScrollReveal direction="up" delay={0.2}>
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab={<span><UserOutlined />Estudiantes</span>} key="students">
              {/* Filters */}
              <div className="mb-6">
                <div className={`flex gap-4 items-center ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
                  <AutoComplete
                    placeholder="Buscar estudiantes..."
                    value={searchText}
                    options={searchOptions}
                    onSearch={handleSearchChange}
                    onSelect={handleSearchSelect}
                    onChange={handleSearchChange}
                    className={isMobile ? 'w-full' : 'w-64'}
                    allowClear
                  >
                    <Input prefix={<SearchOutlined />} />
                  </AutoComplete>
                  
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    className={isMobile ? 'w-full' : 'w-40'}
                    suffixIcon={<FilterOutlined />}
                  >
                    <Option value="all">Todos</Option>
                    <Option value="active">Activos</Option>
                    <Option value="inactive">Inactivos</Option>
                  </Select>

                  <Select
                    value={levelFilter}
                    onChange={setLevelFilter}
                    className={isMobile ? 'w-full' : 'w-40'}
                    placeholder="Nivel"
                  >
                    <Option value="all">Todos los niveles</Option>
                    {educationalLevels.map(level => (
                      <Option key={level.id} value={level.id}>
                        {level.name}
                      </Option>
                    ))}
                  </Select>

                  <Select
                    value={groupFilter}
                    onChange={setGroupFilter}
                    className={isMobile ? 'w-full' : 'w-40'}
                    placeholder="Grupo"
                  >
                    <Option value="all">Todos los grupos</Option>
                    {classGroups.map(group => (
                      <Option key={group.id} value={group.id}>
                        {group.name}
                      </Option>
                    ))}
                  </Select>

                  <Text type="secondary" className={isMobile ? 'text-center' : ''}>
                    {filteredStudents.length} estudiante(s) encontrado(s)
                  </Text>
                </div>
              </div>

              {/* Students Table */}
              <ResponsiveTable
                columns={columns}
                dataSource={filteredStudents}
                loading={loading}
                rowKey="id"
                mobileTitle="Estudiantes"
                mobileCardRender={(record, index) => (
                  <Card 
                    key={record.id}
                    size="small"
                    className="mb-3 shadow-sm"
                  >
                    <Space direction="vertical" size="small" className="w-full">
                      <div className="flex items-center gap-3">
                        <StudentAvatar 
                          avatarUrl={record.user?.profile?.avatarUrl} 
                          size="large"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-base">
                            {record.user?.profile?.firstName || ''} {record.user?.profile?.lastName || ''}
                          </div>
                          <Text type="secondary" className="text-sm">
                            {record.user?.email || ''}
                          </Text>
                        </div>
                        <Tag 
                          color={record.user.isActive ? 'green' : 'red'}
                          className="text-xs"
                        >
                          {record.user.isActive ? 'Activo' : 'Inactivo'}
                        </Tag>
                      </div>
                      
                      <div className="flex justify-center gap-1 pt-2 border-t border-gray-100 flex-wrap">
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewStudent(record)}
                        >
                          Ver
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          icon={<CalendarOutlined />}
                          onClick={() => handleViewAttendance(record)}
                        >
                          Asistencia
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          icon={<BarChartOutlined />}
                          onClick={() => handleViewEvaluations(record)}
                        >
                          Calificaciones
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleEditStudent(record)}
                        >
                          Editar
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          icon={<LoginOutlined />}
                          onClick={() => handleImpersonateUser(record)}
                        >
                          Acceder
                        </Button>
                        <GenerateAutoReportButton studentId={record.id} basePath="/admin/reports" />
                        <Popconfirm
                          title="¿Eliminar estudiante?"
                          description={`¿Estás seguro de eliminar a ${record.user?.profile?.firstName || 'este'} ${record.user?.profile?.lastName || 'estudiante'}?`}
                          onConfirm={() => handleDeleteStudent(record.id)}
                          okText="Sí, eliminar"
                          cancelText="Cancelar"
                          okType="danger"
                        >
                          <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined />}
                            danger
                          >
                            Eliminar
                          </Button>
                        </Popconfirm>
                      </div>
                    </Space>
                  </Card>
                )}
              />
            </TabPane>

            <TabPane tab={<span><CalendarOutlined />Asistencia</span>} key="attendance">
              <AdminAttendanceDashboard />
            </TabPane>

            <TabPane tab={<span><TrophyOutlined />Rendimiento</span>} key="performance">
              <AdminPerformanceSection
                students={students}
                academicYearId={currentAcademicYear?.id}
              />
            </TabPane>
          </Tabs>
        </Card>
      </ScrollReveal>

      {/* Student Details Drawer */}
      <AnimatedDrawer
        animationType="slide"
        title="Detalles del Estudiante"
        placement="right"
        size={isMobile ? 'default' : 'large'}
        width={isMobile ? '100%' : 720}
        onClose={handleDetailDrawerClose}
        open={isDetailDrawerVisible}
        extra={
          viewingStudent && (
            <Space>
              <InteractiveButton 
                variant="primary" 
                icon={<EditOutlined />}
                onClick={() => {
                  handleDetailDrawerClose()
                  handleEditStudent(viewingStudent)
                }}
              >
                Editar
              </InteractiveButton>
            </Space>
          )
        }
      >
        {viewingStudent && (
          <div className="space-y-6">
            {/* Student Header */}
            <div className="text-center border-b pb-6">
              <StudentAvatar 
                avatarUrl={viewingStudent.user?.profile?.avatarUrl}
                size="large"
              />
              <div className="mb-4" />
              <h2 className="text-2xl font-bold mb-2">
                {viewingStudent.user?.profile?.firstName || ''} {viewingStudent.user?.profile?.lastName || ''}
              </h2>
              <Tag 
                color={viewingStudent.user.isActive ? 'green' : 'red'}
                className="text-sm"
              >
                {viewingStudent.user.isActive ? 'Activo' : 'Inactivo'}
              </Tag>
            </div>

            {/* Student Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Información Personal</h3>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Email</Text>
                    <div className="font-medium">{viewingStudent.user?.email || 'No especificado'}</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Número de Matrícula</Text>
                    <div className="font-medium">
                      <Tag color="blue">{viewingStudent.enrollmentNumber}</Tag>
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary">DNI/NIE</Text>
                    <div className="font-medium">
                      {viewingStudent.user?.profile?.dni || 'No especificado'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Teléfono</Text>
                    <div className="font-medium">
                      {viewingStudent.user?.profile?.phone || 'No especificado'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Fecha de Nacimiento</Text>
                    <div className="font-medium">
                      {new Date(viewingStudent.birthDate).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Fecha de Registro</Text>
                    <div className="font-medium">
                      {new Date(viewingStudent.createdAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Academic Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Información Académica</h3>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Nivel Educativo</Text>
                    <div className="font-medium">
                      {viewingStudent.educationalLevel?.name || 'No asignado'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary">Curso</Text>
                    <div className="font-medium">
                      {viewingStudent.course?.name || 'No asignado'}
                    </div>
                  </div>
                </Col>
                <Col span={24}>
                  <div>
                    <Text type="secondary">Clases</Text>
                    <div className="font-medium mt-2">
                      {viewingStudent.classGroups && viewingStudent.classGroups.length > 0 ? (
                        <Space wrap>
                          {viewingStudent.classGroups.map(classGroup => (
                            <Tag key={classGroup.id} color="purple">
                              {classGroup.name}
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        'No asignado a ninguna clase'
                      )}
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
              <Space direction="vertical" className="w-full">
                <Button
                  type="default"
                  block
                  icon={<CalendarOutlined />}
                  onClick={() => {
                    handleDetailDrawerClose()
                    handleViewAttendance(viewingStudent)
                  }}
                >
                  Ver Asistencia
                </Button>
                <Button
                  type="default"
                  block
                  icon={<FileTextOutlined />}
                  onClick={() => {
                    handleDetailDrawerClose()
                    handleViewEvaluations(viewingStudent)
                  }}
                >
                  Ver Calificaciones y Expediente
                </Button>
                <Button
                  type="default"
                  block
                  icon={<ProfileOutlined />}
                  onClick={() => {
                    handleDetailDrawerClose()
                    setCurriculumStudent(viewingStudent)
                  }}
                >
                  Currículo por asignatura
                </Button>
                <Button
                  type="default"
                  block
                  icon={<LoginOutlined />}
                  onClick={() => {
                    handleDetailDrawerClose()
                    handleImpersonateUser(viewingStudent)
                  }}
                >
                  Iniciar Sesión como Usuario
                </Button>
                <Button
                  type="default"
                  block
                  icon={<BarChartOutlined />}
                  onClick={() => message.info('Función de reportes en desarrollo')}
                >
                  Generar Reporte
                </Button>
                {currentAcademicYear?.name && (
                  <SyncExpedienteButton
                    studentId={viewingStudent.id}
                    academicYearName={currentAcademicYear.name}
                  />
                )}
                <BuildYearExpedientesButton academicYearId={currentAcademicYear?.id} />
                <Popconfirm
                  title="¿Eliminar estudiante?"
                  description={`¿Estás seguro de eliminar a ${viewingStudent.user?.profile?.firstName || 'este'} ${viewingStudent.user?.profile?.lastName || 'estudiante'}?`}
                  onConfirm={() => {
                    handleDeleteStudent(viewingStudent.id)
                    handleDetailDrawerClose()
                  }}
                  okText="Sí, eliminar"
                  cancelText="Cancelar"
                  okType="danger"
                >
                  <Button
                    type="default"
                    block
                    icon={<DeleteOutlined />}
                    danger
                  >
                    Eliminar Estudiante
                  </Button>
                </Popconfirm>
              </Space>
            </div>

            {/* Ficha de Secretaría */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Ficha de Secretaría</h3>
              <SecretariaFichaPanel studentId={viewingStudent.id} />
            </div>
          </div>
        )}
      </AnimatedDrawer>

      {/* Add/Edit Student Modal */}
      <AnimatedModal
        animationType="scale"
        title={editingStudent ? 'Editar Estudiante' : 'Nuevo Estudiante'}
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          className="mt-4"
        >
          <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
            <Form.Item
              name="firstName"
              label="Nombre"
              rules={[{ required: true, message: 'El nombre es requerido' }]}
            >
              <Input placeholder="Nombre del estudiante" />
            </Form.Item>
            <Form.Item
              name="lastName"
              label="Apellidos"
              rules={[{ required: true, message: 'Los apellidos son requeridos' }]}
            >
              <Input placeholder="Apellidos del estudiante" />
            </Form.Item>
          </div>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'El email es requerido' },
              { type: 'email', message: 'Email no válido' }
            ]}
          >
            <Input placeholder="email@ejemplo.com" />
          </Form.Item>

          {!editingStudent && (
            <Form.Item
              name="password"
              label="Contraseña"
              rules={[
                { required: true, message: 'La contraseña es requerida' },
                { min: 6, message: 'Mínimo 6 caracteres' }
              ]}
            >
              <Input.Password placeholder="Contraseña del estudiante" />
            </Form.Item>
          )}

          {editingStudent && (
            <Form.Item
              name="newPassword"
              label="Nueva Contraseña (opcional)"
              rules={[
                { min: 8, message: 'Mínimo 8 caracteres' }
              ]}
            >
              <Input.Password placeholder="Dejar vacío para mantener la contraseña actual" />
            </Form.Item>
          )}

          <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
            <Form.Item
              name="dni"
              label="DNI/NIE"
            >
              <Input placeholder="12345678A" />
            </Form.Item>
            <Form.Item
              name="phone"
              label="Teléfono"
            >
              <Input placeholder="+34 600 000 000" />
            </Form.Item>
          </div>

          <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
            <Form.Item
              name="enrollmentNumber"
              label="Número de Matrícula"
              rules={[{ required: true, message: 'El número de matrícula es requerido' }]}
            >
              <Input placeholder="MT-2024-001" />
            </Form.Item>
            <Form.Item
              name="birthDate"
              label="Fecha de Nacimiento"
            >
              <DatePicker 
                placeholder="Selecciona fecha" 
                format="DD/MM/YYYY"
                className="w-full"
              />
            </Form.Item>
          </div>

          <Form.Item
            name="educationalLevelId"
            label="Nivel Educativo"
          >
            <Select placeholder="Selecciona un nivel educativo" allowClear>
              {educationalLevels.map(level => (
                <Option key={level.id} value={level.id}>
                  {level.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-end gap-2'} mt-6`}>
            <InteractiveButton variant="secondary" onClick={handleCancel} className={isMobile ? 'w-full' : ''}>
              Cancelar
            </InteractiveButton>
            <InteractiveButton variant="primary" htmlType="submit" className={isMobile ? 'w-full' : ''}>
              {editingStudent ? 'Actualizar' : 'Crear'} Estudiante
            </InteractiveButton>
          </div>
        </Form>
      </AnimatedModal>

      {/* Modal independiente de Calificaciones y Expediente (datos reales de academic-records) */}
      <Modal
        title={
          evaluatingStudent
            ? `Calificaciones y expediente — ${`${evaluatingStudent.user?.profile?.firstName || ''} ${evaluatingStudent.user?.profile?.lastName || ''}`.trim()}`
            : 'Calificaciones y expediente'
        }
        open={isEvaluationsVisible}
        onCancel={() => {
          setIsEvaluationsVisible(false)
          setEvaluatingStudent(null)
        }}
        footer={null}
        width={960}
        destroyOnClose
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        {evaluatingStudent && <ExpedienteViewer studentId={evaluatingStudent.id} />}
      </Modal>

      {/* Modal de Currículo por asignatura (ajuste de nivel/curso de la asignatura del alumno) */}
      <Modal
        title={
          curriculumStudent
            ? `Currículo por asignatura — ${`${curriculumStudent.user?.profile?.firstName || ''} ${curriculumStudent.user?.profile?.lastName || ''}`.trim()}`
            : 'Currículo'
        }
        open={!!curriculumStudent}
        onCancel={() => setCurriculumStudent(null)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {curriculumStudent && currentAcademicYear?.id
          ? <StudentSubjectCurriculumPanel studentId={curriculumStudent.id} academicYearId={currentAcademicYear.id} />
          : <Empty description="No hay año académico activo" />}
      </Modal>

      {/* Student Attendance Stats Modal */}
      <AttendanceStatsModal
        visible={isAttendanceStatsVisible}
        onClose={() => {
          setIsAttendanceStatsVisible(false)
          setSelectedStudentForAttendance(null)
        }}
        studentId={selectedStudentForAttendance?.id || ''}
        studentName={`${selectedStudentForAttendance?.user?.profile?.firstName || ''} ${selectedStudentForAttendance?.user?.profile?.lastName || ''}`.trim()}
      />

      {/* Group Attendance Stats Modal */}
      <GroupAttendanceStatsModal
        visible={isGroupStatsVisible}
        onClose={() => {
          setIsGroupStatsVisible(false)
          setSelectedGroupForStats(null)
        }}
        classGroupId={selectedGroupForStats}
      />
    </div>
  )
}

export default StudentManagementPage