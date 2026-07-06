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
  Statistic,
} from 'antd'
import InteractiveButton from '@components/animations/InteractiveButton'
import ScrollReveal from '@components/animations/ScrollReveal'
import FadeInUp from '@components/animations/FadeInUp'
import AnimatedModal from '@components/animations/AnimatedModal'
import AnimatedDrawer from '@components/animations/AnimatedDrawer'
import ProfilePhotoUploader from '../../components/profile/ProfilePhotoUploader'
import { DEPARTMENT_OPTIONS } from '../../constants/departments'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  EyeOutlined,
  TeamOutlined,
  LoginOutlined,
  DownloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import apiClient from '@services/apiClient'
import BirthdayIcon from '../../components/common/BirthdayIcon'
import { useAuthStore } from '@store/authStore'
import ResponsiveTable, { useResponsiveColumns } from '../../components/common/ResponsiveTable'
import ResponsiveModal from '../../components/common/ResponsiveModal'
import { useResponsive } from '../../hooks/useResponsive'

const { Title, Text } = Typography
const { Option } = Select

interface Teacher {
  id: string
  employeeNumber: string
  specialties: string[]
  user: {
    id: string
    email: string
    isActive: boolean
    profile: {
      firstName: string
      lastName: string
      dateOfBirth?: string
      documentNumber?: string
      phone?: string
      address?: string
      education?: string
      hireDate?: string
      department?: string
      position?: string
    }
  }
  subjects?: Array<{
    id: string
    name: string
  }>
  tutoredClasses?: Array<{
    id: string
    name: string
  }>
  createdAt: string
  updatedAt: string
}

// Componente para Avatar de profesor con foto real
const TeacherAvatar: React.FC<{ 
  avatarUrl?: string | null, 
  firstName?: string, 
  lastName?: string,
  size?: 'small' | 'default' | 'large' 
}> = ({ avatarUrl, firstName, lastName, size = 'default' }) => {
  const { photoUrl, hasPhoto } = useProfilePhoto(avatarUrl)
  
  const initials = !hasPhoto ? 
    `${firstName?.[0] || 'T'}${lastName?.[0] || 'E'}` : 
    undefined
  
  return (
    <Avatar 
      size={size}
      src={photoUrl}
      icon={!hasPhoto && !initials ? <UserOutlined /> : undefined}
      style={{ 
        backgroundColor: hasPhoto ? 'transparent' : '#1890ff' 
      }}
    >
      {initials}
    </Avatar>
  )
}

const TeachersPage = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true) // Start with true to show loading initially
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)
  const [form] = Form.useForm()
  const { isMobile } = useResponsive()

  // Fetch teachers
  const fetchTeachers = async () => {
    try {
      setLoading(true)
      setError(null)
      console.log('Fetching teachers...')
      // Solicitar todos los profesores incluyendo inactivos
      const response = await apiClient.get('/teachers?includeInactive=true')
      console.log('Teachers fetched:', response.data)
      setTeachers(response.data || [])
    } catch (error: any) {
      console.error('Error fetching teachers:', error)
      let errorMessage = 'Error al cargar profesores'
      if (error.response?.status === 401) {
        errorMessage = 'No tienes autorización para ver esta página'
      } else if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para acceder a los profesores'
      }
      setError(errorMessage)
      message.error(errorMessage)
      setTeachers([]) // Set empty array to avoid undefined errors
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeachers()
  }, [])

  // Handle create teacher
  const handleCreateTeacher = async (values: any) => {
    try {
      await apiClient.post('/teachers', {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
        hireDate: values.hireDate ? values.hireDate.format('YYYY-MM-DD') : undefined,
      })
      message.success('Profesor creado exitosamente')
      setIsModalVisible(false)
      form.resetFields()
      fetchTeachers()
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error('El email o número de empleado ya está registrado')
      } else {
        message.error('Error al crear profesor')
      }
      console.error('Error creating teacher:', error)
    }
  }

  // Handle edit teacher
  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher)
    const profile = teacher.user?.profile || {}
    form.setFieldsValue({
      ...teacher,
      ...profile,
      email: teacher.user?.email,
      isActive: teacher.user?.isActive,
      dateOfBirth: profile.dateOfBirth ? dayjs(profile.dateOfBirth) : undefined,
      hireDate: profile.hireDate ? dayjs(profile.hireDate) : undefined,
    })
    setIsModalVisible(true)
  }

  // Helper function to handle password changes using admin endpoint
  const handlePasswordChange = async (userId: string, newPassword: string) => {
    try {
      await apiClient.post('/admin/reset-password', {
        userId,
        newPassword
      })
      console.log('✅ Password changed successfully using admin endpoint for user:', userId)
    } catch (error: any) {
      console.error('❌ Error changing password with admin endpoint:', error)
      throw error
    }
  }

  // Handle update teacher
  const handleUpdateTeacher = async (values: any) => {
    if (!editingTeacher) return
    
    try {
      // Prepare update data without newPassword
      const updateData = {
        ...values,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : undefined,
        hireDate: values.hireDate ? values.hireDate.format('YYYY-MM-DD') : undefined,
        // Remove newPassword from main update data
        newPassword: undefined,
      }
      
      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key]
        }
      })
      
      // Update teacher data first
      await apiClient.patch(`/teachers/${editingTeacher.id}`, updateData)
      
      // Handle password change separately using admin endpoint
      if (values.newPassword && values.newPassword.trim() !== '') {
        await handlePasswordChange(editingTeacher.user.id, values.newPassword)
      }
      
      message.success('Profesor actualizado exitosamente')
      setIsModalVisible(false)
      setEditingTeacher(null)
      form.resetFields()
      fetchTeachers()
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error('El email o número de empleado ya está registrado')
      } else {
        message.error('Error al actualizar profesor')
      }
      console.error('Error updating teacher:', error)
    }
  }

  // Handle delete teacher
  const handleDeleteTeacher = async (id: string) => {
    try {
      await apiClient.delete(`/teachers/${id}`)
      message.success('Profesor eliminado exitosamente')
      fetchTeachers()
    } catch (error) {
      message.error('Error al eliminar profesor')
      console.error('Error deleting teacher:', error)
    }
  }

  // Handle view details
  const handleViewDetails = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setIsDetailDrawerVisible(true)
  }

  // Handle impersonate user
  const handleImpersonateUser = async (teacher: Teacher) => {
    try {
      Modal.confirm({
        title: '¿Iniciar sesión como este usuario?',
        content: `Vas a iniciar sesión como ${teacher.user?.profile?.firstName || 'Usuario'} ${teacher.user?.profile?.lastName || 'Sin nombre'}`,
        okText: 'Sí, iniciar sesión',
        cancelText: 'Cancelar',
        onOk: async () => {
          try {
            const { impersonateUser } = useAuthStore.getState()
            await impersonateUser(teacher.user.id)
            
            message.success(`Iniciando sesión como ${teacher.user?.profile?.firstName || 'usuario'}`)
            
            // Redirect to teacher dashboard
            setTimeout(() => {
              window.location.href = '/teacher'
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

  const handleDownloadCredentials = async (includeInactive: boolean = false) => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/teachers/credentials/download?includeInactive=${includeInactive}`, {
        responseType: 'blob'
      })
      
      // Crear URL de descarga del blob
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `credenciales_profesores_${new Date().getTime()}.pdf`)
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

  // Generate autocomplete options
  const generateSearchOptions = (searchValue: string) => {
    if (!searchValue) return []
    
    const searchLower = searchValue.toLowerCase()
    const options: { value: string; label: string }[] = []

    teachers.forEach(teacher => {
      // Safe access to profile data
      const profile = teacher.user?.profile || {}
      const firstName = profile.firstName || ''
      const lastName = profile.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      const email = teacher.user?.email || ''
      const employeeNumber = teacher.employeeNumber || ''
      const department = profile.department || ''

      // Add matching names
      if (fullName && fullName.toLowerCase().includes(searchLower)) {
        options.push({
          value: fullName,
          label: `👤 ${fullName}`
        })
      }

      // Add matching emails
      if (email && email.toLowerCase().includes(searchLower)) {
        options.push({
          value: email,
          label: `📧 ${email}`
        })
      }

      // Add matching employee numbers
      if (employeeNumber && employeeNumber.toLowerCase().includes(searchLower)) {
        options.push({
          value: employeeNumber,
          label: `🆔 ${employeeNumber}`
        })
      }

      // Add matching departments
      if (department && department.toLowerCase().includes(searchLower)) {
        options.push({
          value: department,
          label: `🏢 ${department}`
        })
      }
    })

    // Remove duplicates
    return options.filter((option, index, self) => 
      index === self.findIndex(t => t.value === option.value)
    ).slice(0, 10)
  }

  // Filter teachers based on search and filters
  const filteredTeachers = teachers.filter(teacher => {
    // Safe access to profile data with fallbacks
    const profile = teacher.user?.profile || {}
    const firstName = profile.firstName || ''
    const lastName = profile.lastName || ''
    const fullName = `${firstName} ${lastName}`.toLowerCase()
    const email = teacher.user?.email?.toLowerCase() || ''
    const employeeNumber = teacher.employeeNumber?.toLowerCase() || ''
    const department = (profile.department || '').toLowerCase()
    const searchLower = searchValue.toLowerCase()

    const matchesSearch = !searchValue || 
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      employeeNumber.includes(searchLower) ||
      department.includes(searchLower)

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && teacher.user?.isActive) ||
      (statusFilter === 'inactive' && !teacher.user?.isActive)

    const matchesDepartment = departmentFilter === 'all' || 
      department === departmentFilter.toLowerCase()

    return matchesSearch && matchesStatus && matchesDepartment
  })

  // Get unique departments for filter
  const departments = Array.from(
    new Set(
      teachers
        .map(t => t.user?.profile?.department)
        .filter(Boolean)
    )
  )

  const baseColumns: (ColumnsType<Teacher>[number] & { hideOnMobile?: boolean; hideOnTablet?: boolean })[] = [
    {
      title: 'Profesor',
      key: 'teacher',
      render: (_, record) => (
        <Space>
          <TeacherAvatar
            avatarUrl={record.user?.profile?.avatarUrl}
            firstName={record.user?.profile?.firstName}
            lastName={record.user?.profile?.lastName}
            size="large"
          />
          <div>
            <div style={{ fontWeight: 500 }}>
              {record.user?.profile?.firstName || 'Nombre'} {record.user?.profile?.lastName || 'No disponible'}
              {/* Icono de cumpleaños - Sistema de Cumpleaños MW Panel 2.0 */}
              <BirthdayIcon
                user={{
                  id: record.user?.id || record.id,
                  firstName: record.user?.profile?.firstName || '',
                  lastName: record.user?.profile?.lastName || '',
                  dateOfBirth: record.user?.profile?.dateOfBirth,
                  role: 'teacher'
                }}
              />
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.user?.email || 'Email no disponible'}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Número de Empleado',
      dataIndex: 'employeeNumber',
      key: 'employeeNumber',
      hideOnMobile: true,
      render: (employeeNumber) => (
        <Tag color="blue">{employeeNumber}</Tag>
      ),
    },
    {
      title: 'Departamento',
      key: 'department',
      hideOnMobile: true,
      render: (_, record) => (
        <Tag color="green">
          {record.user?.profile?.department || 'Sin asignar'}
        </Tag>
      ),
    },
    {
      title: 'Especialidades',
      dataIndex: 'specialties',
      key: 'specialties',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (specialties: string[]) => (
        <Space wrap>
          {specialties?.map(specialty => (
            <Tag key={specialty} color="orange">{specialty.replace(/[{}]/g, '')}</Tag>
          )) || <Text type="secondary">Sin especialidades</Text>}
        </Space>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      hideOnTablet: true,
      render: (_, record) => (
        <Tag color={record.user.isActive ? 'success' : 'error'}>
          {record.user.isActive ? 'Activo' : 'Inactivo'}
        </Tag>
      ),
    },
    {
      title: 'Fecha de Contratación',
      key: 'hireDate',
      hideOnMobile: true,
      hideOnTablet: true,
      render: (_, record) => {
        const hireDate = record.user?.profile?.hireDate
        return hireDate ? dayjs(hireDate).format('DD/MM/YYYY') : 'No especificada'
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver detalles">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
              style={{ minHeight: '44px', minWidth: '44px' }}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditTeacher(record)}
              style={{ minHeight: '44px', minWidth: '44px' }}
            />
          </Tooltip>
          <Tooltip title="Login como este usuario">
            <Button
              type="text"
              icon={<LoginOutlined />}
              onClick={() => handleImpersonateUser(record)}
              style={{ minHeight: '44px', minWidth: '44px' }}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Estás seguro de eliminar este profesor?"
              onConfirm={() => handleDeleteTeacher(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                style={{ minHeight: '44px', minWidth: '44px' }}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  const columns = useResponsiveColumns(baseColumns)

  // Early return for loading state
  if (loading && teachers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <Text type="secondary">Cargando profesores...</Text>
        </div>
      </div>
    )
  }

  // Early return for error state
  if (error && teachers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
          </div>
          <Title level={4} type="danger">Error al cargar profesores</Title>
          <Text type="secondary" className="block mb-4">{error}</Text>
          <Button type="primary" onClick={fetchTeachers}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  // Calculate statistics
  const totalTeachers = teachers.length
  const activeTeachers = teachers.filter(t => t.user?.isActive).length
  const inactiveTeachers = totalTeachers - activeTeachers
  const departmentCount = Array.from(new Set(teachers.map(t => t.user?.profile?.department).filter(Boolean))).length

  return (
    <ScrollReveal>
      <div className="space-y-6">
        {/* Statistics Cards */}
        <FadeInUp>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center hover:shadow-lg transition-shadow">
                <Statistic
                  title="Total Profesores"
                  value={totalTeachers}
                  prefix={<TeamOutlined className="text-blue-500" />}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center hover:shadow-lg transition-shadow">
                <Statistic
                  title="Activos"
                  value={activeTeachers}
                  prefix={<UserOutlined className="text-green-500" />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center hover:shadow-lg transition-shadow">
                <Statistic
                  title="Inactivos"
                  value={inactiveTeachers}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="text-center hover:shadow-lg transition-shadow">
                <Statistic
                  title="Departamentos"
                  value={departmentCount}
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
          </Row>
        </FadeInUp>

        {/* Header */}
        <FadeInUp delay={0.1}>
          <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'justify-between items-center'}`}>
            <div>
              <Title level={2} className="!mb-2">Gestión de Profesores</Title>
              <Text type="secondary">
                Administra los profesores del centro educativo
              </Text>
            </div>
            <Space direction={isMobile ? 'vertical' : 'horizontal'} className={isMobile ? 'w-full' : ''}>
              <InteractiveButton
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadCredentials(false)}
                loading={loading}
                className={isMobile ? 'w-full' : ''}
              >
                Descargar Credenciales
              </InteractiveButton>
              <InteractiveButton
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingTeacher(null)
                  form.resetFields()
                  setIsModalVisible(true)
                }}
                className={isMobile ? 'w-full' : ''}
              >
                Nuevo Profesor
              </InteractiveButton>
            </Space>
          </div>
        </FadeInUp>

        {/* Filters */}
        <FadeInUp delay={0.2}>
          <Card className="hover:shadow-lg transition-shadow">
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12} lg={8}>
                <AutoComplete
                  style={{ width: '100%' }}
                  placeholder="Buscar por nombre, email, número de empleado..."
                  value={searchValue}
                  onChange={setSearchValue}
                  options={generateSearchOptions(searchValue)}
                  filterOption={false}
                >
                  <Input
                    prefix={<SearchOutlined />}
                    allowClear
                    style={{ height: isMobile ? '44px' : undefined }}
                  />
                </AutoComplete>
              </Col>
              <Col xs={24} md={6} lg={4}>
                <Select
                  style={{ width: '100%', height: isMobile ? '44px' : undefined }}
                  placeholder="Estado"
                  value={statusFilter}
                  onChange={setStatusFilter}
                >
                  <Option value="all">Todos los estados</Option>
                  <Option value="active">Activos</Option>
                  <Option value="inactive">Inactivos</Option>
                </Select>
              </Col>
              <Col xs={24} md={6} lg={4}>
                <Select
                  style={{ width: '100%', height: isMobile ? '44px' : undefined }}
                  placeholder="Departamento"
                  value={departmentFilter}
                  onChange={setDepartmentFilter}
                >
                  <Option value="all">Todos los departamentos</Option>
                  {departments.map(dept => (
                    <Option key={dept} value={dept?.toLowerCase()}>{dept}</Option>
                  ))}
                </Select>
              </Col>
            </Row>
          </Card>
        </FadeInUp>

        {/* Teachers Table */}
        <FadeInUp delay={0.3}>
          <Card className="hover:shadow-lg transition-shadow">
            <ResponsiveTable
              columns={columns}
              dataSource={filteredTeachers}
              rowKey="id"
              loading={loading}
              pagination={{
                total: filteredTeachers.length,
                pageSize: 10,
                showSizeChanger: !isMobile,
                showQuickJumper: !isMobile,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} de ${total} profesores`,
                simple: isMobile
              }}
              mobileCardRender={(record: Teacher) => (
                <div className="p-4 border rounded-lg mb-3 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3 mb-3">
                    <TeacherAvatar
                      avatarUrl={record.user?.profile?.avatarUrl}
                      firstName={record.user?.profile?.firstName}
                      lastName={record.user?.profile?.lastName}
                      size="large"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {record.user?.profile?.firstName || 'Nombre'} {record.user?.profile?.lastName || 'No disponible'}
                        </h3>
                        <BirthdayIcon
                          user={{
                            id: record.user?.id || record.id,
                            firstName: record.user?.profile?.firstName || '',
                            lastName: record.user?.profile?.lastName || '',
                            dateOfBirth: record.user?.profile?.dateOfBirth,
                            role: 'teacher'
                          }}
                        />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {record.user?.email || 'Email no disponible'}
                      </p>
                    </div>
                    <Tag color={record.user.isActive ? 'success' : 'error'} className="flex-shrink-0">
                      {record.user.isActive ? 'Activo' : 'Inactivo'}
                    </Tag>
                  </div>

                  <div className="grid grid-cols-1 gap-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Empleado:</span>
                      <Tag color="blue">{record.employeeNumber}</Tag>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Departamento:</span>
                      <Tag color="green">
                        {record.user?.profile?.department || 'Sin asignar'}
                      </Tag>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Contratación:</span>
                      <span className="text-gray-900">
                        {record.user?.profile?.hireDate ? dayjs(record.user?.profile?.hireDate).format('DD/MM/YYYY') : 'No especificada'}
                      </span>
                    </div>
                  </div>

                  {record.specialties && record.specialties.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Especialidades:</p>
                      <Space wrap>
                        {record.specialties.map(specialty => (
                          <Tag key={specialty} color="orange" className="mb-1">
                            {specialty.replace(/[{}]/g, '')}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewDetails(record)}
                      style={{ minHeight: '44px', minWidth: '44px' }}
                      className="flex-1 min-w-0"
                    >
                      Ver
                    </Button>
                    <Button
                      type="text"
                      icon={<EditOutlined />}
                      onClick={() => handleEditTeacher(record)}
                      style={{ minHeight: '44px', minWidth: '44px' }}
                      className="flex-1 min-w-0"
                    >
                      Editar
                    </Button>
                    <Button
                      type="text"
                      icon={<LoginOutlined />}
                      onClick={() => handleImpersonateUser(record)}
                      style={{ minHeight: '44px', minWidth: '44px' }}
                      className="flex-1 min-w-0"
                    >
                      Login
                    </Button>
                    <Popconfirm
                      title="¿Estás seguro de eliminar este profesor?"
                      onConfirm={() => handleDeleteTeacher(record.id)}
                      okText="Sí"
                      cancelText="No"
                    >
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        style={{ minHeight: '44px', minWidth: '44px' }}
                        className="flex-1 min-w-0"
                      >
                        Eliminar
                      </Button>
                    </Popconfirm>
                  </div>
                </div>
              )}
            />
          </Card>
        </FadeInUp>

        {/* Create/Edit Teacher Modal */}
        <AnimatedModal
          title={editingTeacher ? 'Editar Profesor' : 'Nuevo Profesor'}
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false)
            setEditingTeacher(null)
            form.resetFields()
          }}
          footer={null}
          width={isMobile ? '95vw' : 800}
          style={isMobile ? { top: 20 } : {}}
        >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingTeacher ? handleUpdateTeacher : handleCreateTeacher}
          initialValues={{ isActive: true }}
        >
          {/* Profile Photo Section */}
          {editingTeacher && (
            <div className="text-center mb-6">
              <h4 className="mb-4">Foto de Perfil</h4>
              <ProfilePhotoUploader
                userId={editingTeacher.user?.id}
                currentPhotoUrl={editingTeacher.user?.profile?.avatarUrl}
                size={120}
                showUploadButton={true}
                showPreviewButton={true}
                showDeleteButton={false}
                onPhotoUpdated={(newPhotoUrl) => {
                  // Update the editingTeacher state
                  setEditingTeacher(prev => prev ? {
                    ...prev,
                    user: {
                      ...prev.user,
                      profile: {
                        ...prev.user.profile,
                        avatarUrl: newPhotoUrl
                      }
                    }
                  } : null);
                }}
              />
              <Divider />
            </div>
          )}

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="employeeNumber"
                label="Número de Empleado"
                tooltip="Si no se proporciona, se generará automáticamente con formato EMP-YYYY-NNNN"
                rules={[
                  {
                    pattern: /^EMP-\d{4}-\d{4}$|^EMP\d+$|^EMP-\d{4}-\d+$/,
                    message: 'Formato debe ser EMP-YYYY-NNNN, EMP123 o similar'
                  }
                ]}
              >
                <Input placeholder="Opcional - Se generará automáticamente (ej: EMP-2025-0001)" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Ingrese el email' },
                  { type: 'email', message: 'Email inválido' }
                ]}
              >
                <Input placeholder="profesor@colegio.com" />
              </Form.Item>
            </Col>
          </Row>

          {!editingTeacher && (
            <Form.Item
              name="password"
              label="Contraseña"
              rules={[
                { required: true, message: 'Ingrese la contraseña' },
                { min: 6, message: 'Mínimo 6 caracteres' }
              ]}
            >
              <Input.Password placeholder="Contraseña inicial" />
            </Form.Item>
          )}

          {editingTeacher && (
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

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="firstName"
                label="Nombre"
                rules={[{ required: true, message: 'Ingrese el nombre' }]}
              >
                <Input placeholder="Juan" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="lastName"
                label="Apellidos"
                rules={[{ required: true, message: 'Ingrese los apellidos' }]}
              >
                <Input placeholder="Pérez García" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="dateOfBirth" label="Fecha de Nacimiento">
                <DatePicker style={{ width: '100%' }} placeholder="Seleccionar fecha" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="documentNumber" label="Número de Documento">
                <Input placeholder="12345678A" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="phone" label="Teléfono">
                <Input placeholder="+34 600 123 456" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="hireDate" label="Fecha de Contratación">
                <DatePicker style={{ width: '100%' }} placeholder="Seleccionar fecha" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="address" label="Dirección">
            <Input placeholder="Calle Mayor, 123, Madrid" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="education" label="Formación Académica">
                <Input placeholder="Licenciado en Matemáticas" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="department" label="Departamento">
                <Input placeholder="Departamento de Ciencias" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="position" label="Cargo">
                <Input placeholder="Profesor Titular" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="isActive" label="Estado" valuePropName="checked">
                <Select>
                  <Option value={true}>Activo</Option>
                  <Option value={false}>Inactivo</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="specialties" label="Especialidades">
            <Select
              mode="tags"
              style={{ width: '100%' }}
              placeholder="Matemáticas, Física, Química..."
              tokenSeparators={[',']}
            />
          </Form.Item>

          <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex justify-end space-x-2'}`}>
            <InteractiveButton onClick={() => {
              setIsModalVisible(false)
              setEditingTeacher(null)
              form.resetFields()
            }} className={isMobile ? 'w-full' : ''}>
              Cancelar
            </InteractiveButton>
            <InteractiveButton type="primary" htmlType="submit" className={isMobile ? 'w-full' : ''}>
              {editingTeacher ? 'Actualizar' : 'Crear'} Profesor
            </InteractiveButton>
          </div>
        </Form>
        </AnimatedModal>

        {/* Teacher Details Drawer */}
        <AnimatedDrawer
          title="Detalles del Profesor"
          placement="right"
          onClose={() => setIsDetailDrawerVisible(false)}
          open={isDetailDrawerVisible}
          width={isMobile ? '95vw' : 900}
        >
        {selectedTeacher && (
          <div className="space-y-6">
            {/* Header with avatar and basic info */}
            <div className="text-center pb-4">
              <div style={{ marginBottom: 16 }}>
                <TeacherAvatar
                  avatarUrl={selectedTeacher.user?.profile?.avatarUrl}
                  firstName={selectedTeacher.user?.profile?.firstName}
                  lastName={selectedTeacher.user?.profile?.lastName}
                  size="large"
                />
              </div>
              <Title level={3} className="!mb-2">
                {selectedTeacher.user?.profile?.firstName || 'Nombre'} {selectedTeacher.user?.profile?.lastName || 'No disponible'}
              </Title>
              <Text type="secondary">{selectedTeacher.user?.email || 'Email no disponible'}</Text>
              <div className="mt-2">
                <Tag color={selectedTeacher.user.isActive ? 'success' : 'error'}>
                  {selectedTeacher.user.isActive ? 'Activo' : 'Inactivo'}
                </Tag>
              </div>
            </div>

            <Divider />

            {/* Professional Information */}
            <div>
              <Title level={4}>
                <TeamOutlined /> Información Profesional
              </Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Text strong>Número de Empleado:</Text>
                  <div>{selectedTeacher.employeeNumber}</div>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text strong>Departamento:</Text>
                  <div>{selectedTeacher.user?.profile?.department || 'No asignado'}</div>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text strong>Cargo:</Text>
                  <div>{selectedTeacher.user?.profile?.position || 'No especificado'}</div>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text strong>Fecha de Contratación:</Text>
                  <div>
                    {selectedTeacher.user?.profile?.hireDate
                      ? dayjs(selectedTeacher.user?.profile?.hireDate).format('DD/MM/YYYY')
                      : 'No especificada'
                    }
                  </div>
                </Col>
                <Col xs={24} sm={24} md={16}>
                  <Text strong>Especialidades:</Text>
                  <div className="mt-1">
                    <Space wrap>
                      {selectedTeacher.specialties?.map(specialty => (
                        <Tag key={specialty} color="orange">{specialty.replace(/[{}]/g, '')}</Tag>
                      )) || <Text type="secondary">Sin especialidades</Text>}
                    </Space>
                  </div>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* Personal Information */}
            <div>
              <Title level={4}>
                <UserOutlined /> Información Personal
              </Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8}>
                  <Text strong>Fecha de Nacimiento:</Text>
                  <div>
                    {selectedTeacher.user?.profile?.dateOfBirth
                      ? dayjs(selectedTeacher.user?.profile?.dateOfBirth).format('DD/MM/YYYY')
                      : 'No especificada'
                    }
                  </div>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text strong>Documento:</Text>
                  <div>{selectedTeacher.user?.profile?.documentNumber || 'No especificado'}</div>
                </Col>
                <Col xs={24} sm={12} md={8}>
                  <Text strong>Teléfono:</Text>
                  <div>{selectedTeacher.user?.profile?.phone || 'No especificado'}</div>
                </Col>
                <Col xs={24} sm={24} md={12}>
                  <Text strong>Dirección:</Text>
                  <div>{selectedTeacher.user?.profile?.address || 'No especificada'}</div>
                </Col>
                <Col xs={24} sm={24} md={12}>
                  <Text strong>Formación Académica:</Text>
                  <div>{selectedTeacher.user?.profile?.education || 'No especificada'}</div>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* Actions */}
            <div className={`${isMobile ? 'flex flex-col space-y-2' : 'flex justify-end space-x-2'}`}>
              <InteractiveButton
                icon={<EditOutlined />}
                onClick={() => {
                  setIsDetailDrawerVisible(false)
                  handleEditTeacher(selectedTeacher)
                }}
                className={isMobile ? 'w-full' : ''}
              >
                Editar Profesor
              </InteractiveButton>
            </div>
          </div>
        )}
        </AnimatedDrawer>
      </div>
    </ScrollReveal>
  )
}

export default TeachersPage