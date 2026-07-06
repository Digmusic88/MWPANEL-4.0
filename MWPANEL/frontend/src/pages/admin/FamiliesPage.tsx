import { useState, useEffect } from 'react'
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
  Row,
  Col,
  Steps,
  Alert,
  Descriptions,
  Badge,
  Checkbox,
  Statistic,
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
  UserAddOutlined,
  TeamOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  IdcardOutlined,
  LoginOutlined,
  LockOutlined,
  DownloadOutlined,
  SendOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import apiClient from '@services/apiClient'
import BirthdayIcon from '../../components/common/BirthdayIcon'
import { useAuthStore } from '@store/authStore'
import BulkResendCredentialsModal from '../../components/families/BulkResendCredentialsModal'
import ResponsiveTable, { useResponsiveColumns } from '../../components/common/ResponsiveTable'
import ResponsiveModal from '../../components/common/ResponsiveModal'
import { useResponsive } from '../../hooks/useResponsive'

const { Title, Text } = Typography
const { Option } = Select

// Interfaces
interface FamilyContact {
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
    education?: string // Used for occupation
  }
}

interface FamilyStudent {
  id: string
  student: {
    id: string
    enrollmentNumber: string
    user: {
      profile: {
        firstName: string
        lastName: string
      }
    }
  }
  relationship: 'parent' | 'guardian' | 'other'
}

interface Family {
  id: string
  primaryContact: FamilyContact
  secondaryContact?: FamilyContact
  students?: FamilyStudent[]
  createdAt: string
  updatedAt: string
}

interface Student {
  id: string
  enrollmentNumber: string
  user: {
    profile: {
      firstName: string
      lastName: string
    }
  }
}

const relationshipLabels = {
  parent: 'Padre/Madre',
  guardian: 'Tutor/a',
  other: 'Otro'
}

const relationshipColors = {
  parent: 'blue',
  guardian: 'green',
  other: 'orange'
}

/** Genera una contraseña segura y memorable */
const generatePassword = (): string => {
  const words = ['Sol', 'Luna', 'Mar', 'Cielo', 'Flor', 'Rio', 'Paz', 'Arte', 'Luz', 'Casa', 'Vida', 'Amor']
  const numbers = ['2025', '123', '456', '789', '321', '654']
  const symbols = ['!', '@', '#', '*']
  const word = words[Math.floor(Math.random() * words.length)]
  const num = numbers[Math.floor(Math.random() * numbers.length)]
  const sym = symbols[Math.floor(Math.random() * symbols.length)]
  return `${word}${num}${sym}`
}

const FamiliesPage: React.FC = () => {
  // State management
  const [families, setFamilies] = useState<Family[]>([])
  const [availableStudents, setAvailableStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchOptions, setSearchOptions] = useState<{ value: string; label: string }[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1) // Estado para controlar página actual
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false)
  const [editingFamily, setEditingFamily] = useState<Family | null>(null)
  const [viewingFamily, setViewingFamily] = useState<Family | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [hasSecondaryContact, setHasSecondaryContact] = useState(false)
  const [isBulkResendModalVisible, setIsBulkResendModalVisible] = useState(false)
  const [form] = Form.useForm()
  const { isMobile } = useResponsive()

  // Fetch families
  const fetchFamilies = async () => {
    setLoading(true)
    try {
      // Incluir familias inactivas para poder gestionarlas
      const response = await apiClient.get('/families?includeInactive=true')
      console.log('Families data received:', response.data)

      // Validate families data
      const validFamilies = (response.data || []).filter(family => {
        if (!family) {
          console.warn('Found null family object')
          return false
        }
        if (!family.primaryContact) {
          console.warn('Family missing primaryContact:', family)
          return false
        }
        return true
      })

      console.log('Valid families after filtering:', validFamilies.length)

      // Debug: mostrar familias inactivas
      const inactiveFamilies = validFamilies.filter(f => f.primaryContact && !f.primaryContact.isActive)
      console.log('📊 Familias inactivas encontradas:', inactiveFamilies.length)
      if (inactiveFamilies.length > 0) {
        console.log('📋 Primeras 3 familias inactivas:', inactiveFamilies.slice(0, 3).map(f => ({
          id: f.id,
          email: f.primaryContact?.email,
          isActive: f.primaryContact?.isActive
        })))
      }

      setFamilies(validFamilies)
    } catch (error) {
      console.error('Error fetching families:', error)
      message.error('Error al cargar familias')
    } finally {
      setLoading(false)
    }
  }

  // Fetch available students
  const fetchAvailableStudents = async () => {
    try {
      const response = await apiClient.get('/families/available-students')
      setAvailableStudents(response.data)
    } catch (error) {
      message.error('Error al cargar estudiantes disponibles')
    }
  }

  useEffect(() => {
    fetchFamilies()
    fetchAvailableStudents()
  }, [])

  // Resetear página cuando cambia el filtro o búsqueda
  useEffect(() => {
    console.log('🔄 Filtro cambiado, reseteando página a 1')
    setCurrentPage(1)
  }, [statusFilter, searchText])

  // Watch form field changes to keep state synchronized
  useEffect(() => {
    const hasSecondaryFormValue = form.getFieldValue('hasSecondaryContact')
    if (hasSecondaryFormValue !== hasSecondaryContact) {
      setHasSecondaryContact(hasSecondaryFormValue || false)
    }
  }, [form.getFieldValue('hasSecondaryContact')])

  // Generate search options for autocomplete
  const generateSearchOptions = (searchValue: string) => {
    if (!searchValue || searchValue.length < 2) {
      setSearchOptions([])
      return
    }

    const options: { value: string; label: string }[] = []
    const searchLower = searchValue.toLowerCase()

    const safeFamiliesForSearch = Array.isArray(families) ? families : []
    safeFamiliesForSearch.forEach(family => {
      try {
        if (!family || !family.primaryContact) {
          return
        }

        // Primary contact
        const primaryName = family.primaryContact?.profile ? `${family.primaryContact.profile.firstName || ''} ${family.primaryContact.profile.lastName || ''}` : ''
        const primaryEmail = family.primaryContact?.email || ''

        if (primaryName && primaryName.toLowerCase().includes(searchLower)) {
          options.push({
            value: primaryName,
            label: `👨‍👩‍👧‍👦 ${primaryName} (Contacto Principal)`,
          })
        }

        if (primaryEmail && primaryEmail.toLowerCase().includes(searchLower)) {
          options.push({
            value: primaryEmail,
            label: `📧 ${primaryEmail}`,
          })
        }

        // Secondary contact
        if (family.secondaryContact && family.secondaryContact.profile) {
          const secondaryName = `${family.secondaryContact.profile.firstName || ''} ${family.secondaryContact.profile.lastName || ''}`
          const secondaryEmail = family.secondaryContact?.email || ''

          if (secondaryName && secondaryName.toLowerCase().includes(searchLower)) {
            options.push({
              value: secondaryName,
              label: `👤 ${secondaryName} (Contacto Secundario)`,
            })
          }

          if (secondaryEmail && secondaryEmail.toLowerCase().includes(searchLower)) {
            options.push({
              value: secondaryEmail,
              label: `📧 ${secondaryEmail}`,
            })
          }
        }

        // Students
        family.students?.forEach(familyStudent => {
          try {
            if (!familyStudent?.student?.user?.profile) {
              return
            }
            const studentName = `${familyStudent.student?.user?.profile?.firstName || ''} ${familyStudent.student?.user?.profile?.lastName || ''}`
            if (studentName && studentName.toLowerCase().includes(searchLower)) {
              options.push({
                value: studentName,
                label: `🎓 ${studentName} (${familyStudent.student?.enrollmentNumber || ''})`,
              })
            }
          } catch (studentError) {
            console.error('Error processing student:', studentError, familyStudent)
          }
        })
      } catch (familyError) {
        console.error('Error processing family in search options:', familyError, family)
      }
    })

    // Remove duplicates and limit to 10 results
    const uniqueOptions = options.filter((option, index, self) => 
      index === self.findIndex(o => o.value === option.value)
    ).slice(0, 10)

    setSearchOptions(uniqueOptions)
  }

  // Filter families with comprehensive error handling
  // Handle invalid families data
  const safeFamilies = Array.isArray(families) ? families : []
  if (!Array.isArray(families)) {
    console.error('Families is not an array:', families)
  }

  // Debug: Estado del filtro ANTES de filtrar
  console.log('🎯 INICIANDO FILTRADO:', {
    statusFilter,
    searchText,
    totalFamilies: safeFamilies.length
  })

  const filteredFamilies = safeFamilies.filter(family => {
    // Ultra-safe filtering - return false immediately for any invalid data
    if (!family) return false
    if (!family.primaryContact) return false
    
    try {
      // Initialize all variables with safe defaults
      let primaryName = ''
      let primaryEmail = ''
      let secondaryName = ''
      let secondaryEmail = ''
      let studentNames = ''

      // Primary contact - ultra defensive
      if (family.primaryContact) {
        primaryEmail = String(family.primaryContact.email || '').toLowerCase()
        
        if (family.primaryContact.profile) {
          const profile = family.primaryContact.profile
          const firstName = profile && typeof profile === 'object' ? String(profile.firstName || '') : ''
          const lastName = profile && typeof profile === 'object' ? String(profile.lastName || '') : ''
          primaryName = `${firstName} ${lastName}`.toLowerCase().trim()
        }
      }
      
      // Secondary contact - ultra defensive
      if (family.secondaryContact && family.secondaryContact.profile) {
        const profile = family.secondaryContact.profile
        if (profile && typeof profile === 'object') {
          const firstName = String(profile.firstName || '')
          const lastName = String(profile.lastName || '')
          secondaryName = `${firstName} ${lastName}`.toLowerCase().trim()
        }
        secondaryEmail = String(family.secondaryContact.email || '').toLowerCase()
      }

      // Students - ultra defensive
      if (family.students && Array.isArray(family.students)) {
        const validStudentNames = []
        for (const fs of family.students) {
          if (fs && fs.student && fs.student.user && fs.student.user.profile) {
            const profile = fs.student.user.profile
            if (profile && typeof profile === 'object') {
              const firstName = String(profile.firstName || '')
              const lastName = String(profile.lastName || '')
              const name = `${firstName} ${lastName}`.toLowerCase().trim()
              if (name) validStudentNames.push(name)
            }
          }
        }
        studentNames = validStudentNames.join(' ')
      }

      const searchLower = searchText.toLowerCase()

      const matchesSearch = 
        primaryName.includes(searchLower) ||
        primaryEmail.includes(searchLower) ||
        secondaryName.includes(searchLower) ||
        secondaryEmail.includes(searchLower) ||
        studentNames.includes(searchLower)
      
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && family.primaryContact && family.primaryContact.isActive === true) ||
        (statusFilter === 'inactive' && family.primaryContact && family.primaryContact.isActive === false) ||
        (statusFilter === 'dual' && family.secondaryContact) ||
        (statusFilter === 'single' && !family.secondaryContact)

      // Debug del filtro - MEJORADO
      if (statusFilter === 'inactive' && family.primaryContact && family.primaryContact.isActive === false) {
        console.log('🔍 Familia INACTIVA detectada:', {
          email: family.primaryContact?.email,
          isActive: family.primaryContact?.isActive,
          searchText,
          matchesSearch,
          matchesStatus,
          finalResult: matchesSearch && matchesStatus
        })
      }

      return matchesSearch && matchesStatus
    } catch (error) {
      console.error('Error filtering family:', error, family)
      return false
    }
  })

  // Debug: Log de familias filtradas
  console.log(`🎯 Filtro aplicado: "${statusFilter}" - Resultados: ${filteredFamilies.length} familias`)
  if (statusFilter === 'inactive') {
    console.log('📋 Familias inactivas en resultado final:', filteredFamilies.map(f => ({
      email: f.primaryContact?.email,
      isActive: f.primaryContact?.isActive
    })))
  }

  // Table columns - made responsive with mobile optimizations
  const baseColumns: (ColumnsType<Family>[number] & { hideOnMobile?: boolean; hideOnTablet?: boolean })[] = [
    {
      title: 'Familia',
      key: 'family',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space>
            <Avatar
              icon={<TeamOutlined />}
              style={{ backgroundColor: '#1890ff' }}
              size={isMobile ? 'default' : 'large'}
            />
            <div>
              <div className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                {record.primaryContact?.profile?.firstName || ''} {record.primaryContact?.profile?.lastName || ''}
                <BirthdayIcon
                  user={{
                    id: record.primaryContact?.id || '',
                    firstName: record.primaryContact?.profile?.firstName || '',
                    lastName: record.primaryContact?.profile?.lastName || '',
                    dateOfBirth: record.primaryContact?.profile?.dateOfBirth
                  }}
                />
              </div>
              <Text type="secondary" className={isMobile ? 'text-xs' : 'text-sm'}>
                Contacto Principal
              </Text>
            </div>
          </Space>
          {record.secondaryContact && record.secondaryContact.profile && (
            <Space className="ml-8">
              <Avatar
                icon={<UserOutlined />}
                style={{ backgroundColor: '#52c41a' }}
                size={isMobile ? 'small' : 'default'}
              />
              <div>
                <Text className={isMobile ? 'text-xs' : 'text-sm'}>
                  {record.secondaryContact?.profile?.firstName || ''} {record.secondaryContact?.profile?.lastName || ''}
                  <BirthdayIcon
                    user={{
                      id: record.secondaryContact?.id || '',
                      firstName: record.secondaryContact?.profile?.firstName || '',
                      lastName: record.secondaryContact?.profile?.lastName || '',
                      dateOfBirth: record.secondaryContact?.profile?.dateOfBirth
                    }}
                  />
                </Text>
                <div>
                  <Text type="secondary" className="text-xs">
                    Contacto Secundario
                  </Text>
                </div>
              </div>
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: 'Estudiantes',
      key: 'students',
      hideOnMobile: true,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.students?.map(familyStudent => (
            <Space key={familyStudent.id} size="small">
              <Tag color={relationshipColors[familyStudent.relationship]}>
                {relationshipLabels[familyStudent.relationship]}
              </Tag>
              <span className="text-sm">
                {familyStudent.student?.user?.profile?.firstName || ''} {familyStudent.student?.user?.profile?.lastName || ''}
              </span>
              <Text type="secondary" className="text-xs">
                ({familyStudent.student?.enrollmentNumber || ''})
              </Text>
            </Space>
          )) || <Text type="secondary">Sin estudiantes asignados</Text>}
        </Space>
      ),
    },
    {
      title: 'Tipo de Familia',
      key: 'type',
      hideOnTablet: true,
      render: (_, record) => (
        <Tag color={record.secondaryContact ? 'green' : 'blue'}>
          {record.secondaryContact ? 'Doble Acceso' : 'Acceso Individual'}
        </Tag>
      ),
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Badge 
            status={record.primaryContact.isActive ? 'success' : 'error'} 
            text={record.primaryContact.isActive ? 'Activo' : 'Inactivo'}
          />
          {record.secondaryContact && (
            <Badge 
              status={record.secondaryContact.isActive ? 'success' : 'error'} 
              text={record.secondaryContact.isActive ? 'Activo' : 'Inactivo'}
            />
          )}
        </Space>
      ),
    },
    {
      title: 'Fecha de Registro',
      dataIndex: 'createdAt',
      key: 'createdAt',
      hideOnMobile: true,
      render: (date) => new Date(date).toLocaleDateString('es-ES'),
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
              onClick={() => handleViewFamily(record)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              size={isMobile ? 'small' : 'middle'}
              icon={<EditOutlined />}
              onClick={() => handleEditFamily(record)}
            />
          </Tooltip>
          <Tooltip title="Cambiar Contraseña">
            <Button
              type="text"
              size={isMobile ? 'small' : 'middle'}
              icon={<LockOutlined />}
              onClick={() => handleQuickPasswordChange(record)}
            />
          </Tooltip>
          <Tooltip title="Login como contacto principal">
            <Button
              type="text"
              size={isMobile ? 'small' : 'middle'}
              icon={<LoginOutlined />}
              onClick={() => handleImpersonateUser(record, 'primary')}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          {record.secondaryContact && (
            <Tooltip title="Login como contacto secundario">
              <Button
                type="text"
                size={isMobile ? 'small' : 'middle'}
                icon={<LoginOutlined />}
                onClick={() => handleImpersonateUser(record, 'secondary')}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          )}
          <Tooltip title="Reenviar credenciales de acceso">
            <Button
              type="text"
              size={isMobile ? 'small' : 'middle'}
              icon={<SendOutlined />}
              onClick={() => handleResendCredentials(record)}
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Estás seguro de eliminar esta familia?"
              description="Esta acción desactivará los accesos de los contactos familiares."
              onConfirm={() => handleDeleteFamily(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button
                type="text"
                size={isMobile ? 'small' : 'middle'}
                danger
                icon={<DeleteOutlined />}
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
  const handleViewFamily = (family: Family) => {
    setViewingFamily(family)
    setIsDetailDrawerVisible(true)
  }

  // Handle impersonate user
  const handleImpersonateUser = async (family: Family, contactType: 'primary' | 'secondary') => {
    const contact = contactType === 'primary' ? family.primaryContact : family.secondaryContact
    
    if (!contact) {
      message.error('No hay contacto secundario para esta familia')
      return
    }

    try {
      Modal.confirm({
        title: '¿Iniciar sesión como este usuario?',
        content: `Vas a iniciar sesión como ${contact.profile?.firstName || ''} ${contact.profile?.lastName || ''} (${contactType === 'primary' ? 'Contacto Principal' : 'Contacto Secundario'})`,
        okText: 'Sí, iniciar sesión',
        cancelText: 'Cancelar',
        onOk: async () => {
          try {
            const { impersonateUser } = useAuthStore.getState()
            await impersonateUser(contact.id)
            
            message.success(`Iniciando sesión como ${contact.profile?.firstName || 'usuario'}`)
            
            // Redirect to family dashboard
            setTimeout(() => {
              window.location.href = '/family'
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

  const handleEditFamily = (family: Family) => {
    console.log('🔧 ADMIN FAMILIES - handleEditFamily called with:', {
      familyId: family.id,
      primaryEmail: family.primaryContact?.email,
      hasSecondaryContact: !!family.secondaryContact
    })
    
    setEditingFamily(family)
    setCurrentStep(0)
    
    // Populate form with existing data
    const hasSecondary = !!family.secondaryContact
    setHasSecondaryContact(hasSecondary)
    
    // Set form values with proper state synchronization
    setTimeout(() => {
      console.log('🔧 ADMIN FAMILIES - Setting form values with family:', {
        familyId: family.id,
        primaryEmail: family.primaryContact?.email,
        hasSecondaryContact: hasSecondary
      })
      
      form.setFieldsValue({
        // Primary contact
        primaryEmail: family.primaryContact?.email || '',
        primaryFirstName: family.primaryContact?.profile?.firstName || '',
        primaryLastName: family.primaryContact?.profile?.lastName || '',
        primaryDateOfBirth: family.primaryContact?.profile?.dateOfBirth ? dayjs(family.primaryContact.profile.dateOfBirth) : null,
        primaryDocumentNumber: family.primaryContact?.profile?.documentNumber || '',
        primaryPhone: family.primaryContact?.profile?.phone || '',
        primaryAddress: family.primaryContact?.profile?.address || '',
        primaryOccupation: family.primaryContact?.profile?.education || '',
        primaryNewPassword: '', // Initialize password field
        
        // Secondary contact
        hasSecondaryContact: hasSecondary,
        ...(family.secondaryContact && family.secondaryContact.profile && {
          secondaryEmail: family.secondaryContact.email || '',
          secondaryFirstName: family.secondaryContact?.profile?.firstName || '',
          secondaryLastName: family.secondaryContact?.profile?.lastName || '',
          secondaryDateOfBirth: family.secondaryContact?.profile?.dateOfBirth ? dayjs(family.secondaryContact.profile.dateOfBirth) : null,
          secondaryDocumentNumber: family.secondaryContact?.profile?.documentNumber || '',
          secondaryPhone: family.secondaryContact?.profile?.phone || '',
          secondaryAddress: family.secondaryContact?.profile?.address || '',
          secondaryOccupation: family.secondaryContact?.profile?.education || '',
          secondaryNewPassword: '', // Initialize password field
        }),
        
        // Students
        students: family.students?.map(fs => ({
          studentId: fs.student.id,
          relationship: fs.relationship
        })) || []
      })
      
      // Verify that form values were set correctly
      setTimeout(() => {
        const currentValues = form.getFieldsValue()
        console.log('🔧 ADMIN FAMILIES - Form values after setting:', {
          primaryEmail: currentValues.primaryEmail,
          primaryNewPassword: currentValues.primaryNewPassword,
          hasSecondaryContact: currentValues.hasSecondaryContact
        })
      }, 100)
    }, 0)
    
    setIsModalVisible(true)
  }

  const handleDeleteFamily = async (familyId: string) => {
    try {
      await apiClient.delete(`/families/${familyId}`)
      message.success('Familia eliminada correctamente')
      fetchFamilies()
    } catch (error) {
      message.error('Error al eliminar familia')
    }
  }

  // Handle resend credentials
  const handleResendCredentials = (family: Family) => {
    const primaryEmail = family.primaryContact?.email || 'Contacto Principal'
    const secondaryEmail = family.secondaryContact?.email || null
    
    Modal.confirm({
      title: 'Reenviar Credenciales',
      content: (
        <div>
          <p>¿A qué contacto deseas reenviar las credenciales de acceso?</p>
          <div style={{ marginTop: 16 }}>
            <Button 
              type="primary" 
              block 
              style={{ marginBottom: 8 }}
              icon={<MailOutlined />}
              onClick={() => {
                Modal.destroyAll()
                confirmResendCredentials(family.id, 'primary', primaryEmail)
              }}
            >
              {primaryEmail} (Principal)
            </Button>
            {secondaryEmail && (
              <Button 
                type="default" 
                block
                icon={<MailOutlined />}
                onClick={() => {
                  Modal.destroyAll()
                  confirmResendCredentials(family.id, 'secondary', secondaryEmail)
                }}
              >
                {secondaryEmail} (Secundario)
              </Button>
            )}
          </div>
        </div>
      ),
      footer: null,
      width: 400,
    })
  }

  // Confirm and execute resend credentials
  const confirmResendCredentials = (familyId: string, contactType: 'primary' | 'secondary', email: string) => {
    Modal.confirm({
      title: 'Confirmar Reenvío de Credenciales',
      content: (
        <div>
          <p><strong>Se reenviará el correo de bienvenida con las credenciales a:</strong></p>
          <p><strong>Email:</strong> {email}</p>
          <p><strong>Tipo:</strong> {contactType === 'primary' ? 'Contacto Principal' : 'Contacto Secundario'}</p>
          <br />
          <p>El correo incluirá las credenciales de acceso y los enlaces a la plataforma.</p>
        </div>
      ),
      onOk: async () => {
        try {
          setLoading(true)
          const response = await apiClient.post(`/families/${familyId}/resend-credentials/${contactType}`)
          
          message.success(`Credenciales reenviadas exitosamente a ${response.data.email}`)
        } catch (error: any) {
          console.error('Error resending credentials:', error)
          if (error.response?.status === 404) {
            message.error('Familia o contacto no encontrado')
          } else if (error.response?.status === 500) {
            message.error('Error interno del servidor al enviar el correo')
          } else {
            message.error('Error al reenviar credenciales')
          }
        } finally {
          setLoading(false)
        }
      },
      okText: 'Sí, Reenviar',
      cancelText: 'Cancelar',
    })
  }

  const handleAddFamily = () => {
    setEditingFamily(null)
    setCurrentStep(0)
    setHasSecondaryContact(false)
    form.resetFields()
    form.setFieldsValue({ 
      hasSecondaryContact: false,
      primaryNewPassword: '',
      secondaryNewPassword: ''
    })
    setIsModalVisible(true)
  }

  // Quick password change function
  const handleQuickPasswordChange = (family: Family) => {
    const primaryEmail = family.primaryContact?.email || 'Usuario'
    const secondaryEmail = family.secondaryContact?.email || null
    
    Modal.confirm({
      title: 'Cambiar Contraseña',
      content: (
        <div>
          <p>¿Para qué usuario deseas cambiar la contraseña?</p>
          <div style={{ marginTop: 16 }}>
            <Button 
              type="primary" 
              block 
              style={{ marginBottom: 8 }}
              onClick={() => {
                Modal.destroyAll()
                promptNewPassword(family.primaryContact.id, primaryEmail, 'Contacto Principal')
              }}
            >
              {primaryEmail} (Principal)
            </Button>
            {secondaryEmail && (
              <Button 
                type="default" 
                block
                onClick={() => {
                  Modal.destroyAll()
                  promptNewPassword(family.secondaryContact!.id, secondaryEmail, 'Contacto Secundario')
                }}
              >
                {secondaryEmail} (Secundario)
              </Button>
            )}
          </div>
        </div>
      ),
      footer: null,
      width: 400,
    })
  }

  // Function to prompt for new password
  const promptNewPassword = (userId: string, email: string, userType: string) => {
    let newPassword = ''
    
    Modal.confirm({
      title: `Cambiar contraseña para ${userType}`,
      content: (
        <div>
          <p><strong>Email:</strong> {email}</p>
          <Input.Password 
            placeholder="Nueva contraseña (mínimo 6 caracteres)"
            onChange={(e) => newPassword = e.target.value}
            style={{ marginTop: 16 }}
          />
        </div>
      ),
      onOk: async () => {
        if (!newPassword || newPassword.length < 6) {
          message.error('La contraseña debe tener al menos 6 caracteres')
          return
        }
        
        try {
          await handlePasswordChange(userId, newPassword)
          message.success(`Contraseña cambiada exitosamente para ${email}`)
        } catch (error) {
          message.error('Error al cambiar la contraseña')
        }
      },
      okText: 'Cambiar Contraseña',
      cancelText: 'Cancelar',
    })
  }

  // Helper function to handle password changes using admin endpoint
  const handlePasswordChange = async (userId: string, newPassword: string) => {
    try {
      await apiClient.post('/admin/reset-password', {
        userId,
        newPassword
      })
    } catch (error: any) {
      throw error
    }
  }

  const handleSubmit = async () => {
    try {
      // Validate step by step instead of all at once
      // Step 0: Primary Contact
      const primaryFields = [
        'primaryEmail', 'primaryFirstName', 'primaryLastName', 'primaryPhone',
        'primaryAddress', 'primaryDocumentNumber', 'primaryDateOfBirth', 'primaryOccupation'
      ]
      // Password is now optional (auto-generated by backend if not provided)

      // Step 1: Secondary Contact (only if hasSecondaryContact is true)
      const hasSecondary = form.getFieldValue('hasSecondaryContact')
      const secondaryFields = hasSecondary ? [
        'secondaryEmail', 'secondaryFirstName', 'secondaryLastName', 'secondaryPhone',
        'secondaryAddress', 'secondaryDocumentNumber', 'secondaryDateOfBirth', 'secondaryOccupation'
      ] : []
      // Secondary password is also optional (auto-generated by backend if not provided)
      
      // Step 2: Students
      const studentFields = ['students']
      
      // Validate each step individually
      console.log('🔧 ADMIN FAMILIES - Validating primary contact fields...')
      await form.validateFields(primaryFields)
      
      if (hasSecondary && secondaryFields.length > 0) {
        console.log('🔧 ADMIN FAMILIES - Validating secondary contact fields...')
        await form.validateFields(secondaryFields)
      }
      
      await form.validateFields(studentFields)

      // Now get all form values at once - all fields should be registered
      const allValues = form.getFieldsValue()
      
      // Use form values directly since validation passed
      const values = {
        // Primary contact - use form values directly
        primaryEmail: allValues.primaryEmail,
        primaryFirstName: allValues.primaryFirstName,
        primaryLastName: allValues.primaryLastName,
        primaryPhone: allValues.primaryPhone,
        primaryAddress: allValues.primaryAddress,
        primaryDocumentNumber: allValues.primaryDocumentNumber,
        primaryDateOfBirth: allValues.primaryDateOfBirth,
        primaryOccupation: allValues.primaryOccupation,
        primaryPassword: allValues.primaryPassword,
        primaryNewPassword: allValues.primaryNewPassword,
        
        // Secondary contact
        hasSecondaryContact: allValues.hasSecondaryContact,
        secondaryEmail: allValues.secondaryEmail,
        secondaryFirstName: allValues.secondaryFirstName,
        secondaryLastName: allValues.secondaryLastName,
        secondaryPhone: allValues.secondaryPhone,
        secondaryAddress: allValues.secondaryAddress,
        secondaryDocumentNumber: allValues.secondaryDocumentNumber,
        secondaryDateOfBirth: allValues.secondaryDateOfBirth,
        secondaryOccupation: allValues.secondaryOccupation,
        secondaryPassword: allValues.secondaryPassword,
        secondaryNewPassword: allValues.secondaryNewPassword,
        
        // Students
        students: allValues.students || []
      }
      console.log('🔧 ADMIN FAMILIES - Processed values:', values)
      
      console.log('🔧 ADMIN FAMILIES - Form values received:', {
        primaryNewPassword: values.primaryNewPassword ? 'SET (length: ' + values.primaryNewPassword.length + ')' : 'NOT SET',
        secondaryNewPassword: values.secondaryNewPassword ? 'SET (length: ' + values.secondaryNewPassword.length + ')' : 'NOT SET',
        primaryEmail: values.primaryEmail,
        secondaryEmail: values.secondaryEmail,
        hasSecondaryContact: values.hasSecondaryContact
      })
      
      // Helper function to remove undefined/null values
      const filterEmptyValues = (obj: any) => {
        const filtered: any = {}
        Object.keys(obj).forEach(key => {
          if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
            filtered[key] = obj[key]
          }
        })
        return filtered
      }
      
      // Prepare primary contact data (without password for main update)
      const primaryContactData = filterEmptyValues({
        email: values.primaryEmail,
        password: values.primaryPassword,
        // Remove newPassword from main update data
        firstName: values.primaryFirstName,
        lastName: values.primaryLastName,
        dateOfBirth: values.primaryDateOfBirth ? dayjs(values.primaryDateOfBirth).format('YYYY-MM-DD') : undefined,
        documentNumber: values.primaryDocumentNumber,
        phone: values.primaryPhone,
        address: values.primaryAddress,
        occupation: values.primaryOccupation,
      })
      
      // Prepare secondary contact data (without password for main update)
      let secondaryContactData = null
      if (values.hasSecondaryContact) {
        secondaryContactData = filterEmptyValues({
          email: values.secondaryEmail,
          password: values.secondaryPassword,
          // Remove newPassword from main update data
          firstName: values.secondaryFirstName,
          lastName: values.secondaryLastName,
          dateOfBirth: values.secondaryDateOfBirth ? dayjs(values.secondaryDateOfBirth).format('YYYY-MM-DD') : undefined,
          documentNumber: values.secondaryDocumentNumber,
          phone: values.secondaryPhone,
          address: values.secondaryAddress,
          occupation: values.secondaryOccupation,
        })
      }
      
      // Prepare final submit data
      const submitData: any = {
        students: values.students || []
      }
      
      // Only include contacts if they have data
      if (Object.keys(primaryContactData).length > 0) {
        submitData.primaryContact = primaryContactData
      }
      
      if (secondaryContactData && Object.keys(secondaryContactData).length > 0) {
        submitData.secondaryContact = secondaryContactData
      }

      if (editingFamily) {
        // Update family data first
        await apiClient.patch(`/families/${editingFamily.id}`, submitData)
        
        // Handle password changes separately using admin endpoint
        if (values.primaryNewPassword && values.primaryNewPassword.trim() !== '') {
          await handlePasswordChange(editingFamily.primaryContact.id, values.primaryNewPassword)
        }

        if (values.secondaryNewPassword && values.secondaryNewPassword.trim() !== '' && editingFamily.secondaryContact) {
          await handlePasswordChange(editingFamily.secondaryContact.id, values.secondaryNewPassword)
        }
        
        message.success('Familia actualizada correctamente')
      } else {
        // Create new family
        await apiClient.post('/families', submitData)
        message.success('Familia creada correctamente')
      }
      
      setIsModalVisible(false)
      form.resetFields()
      setCurrentStep(0)
      fetchFamilies()
      fetchAvailableStudents()
    } catch (error: any) {
      if (error.name === 'ValidationError') {
        message.error('Por favor, completa todos los campos requeridos')
      } else {
        message.error(error.response?.data?.message || 'Error al guardar familia')
      }
    }
  }

  const handleCancel = () => {
    setIsModalVisible(false)
    form.resetFields()
    setEditingFamily(null)
    setCurrentStep(0)
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
    setViewingFamily(null)
  }

  const handleDownloadCredentials = async (includeInactive: boolean = false) => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/families/credentials/download?includeInactive=${includeInactive}`, {
        responseType: 'blob'
      })
      
      // Crear URL de descarga del blob
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `credenciales_familias_${new Date().getTime()}.pdf`)
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

  // Bulk resend credentials handlers
  const handleBulkResendCredentials = () => {
    setIsBulkResendModalVisible(true)
  }

  const handleBulkResendSuccess = () => {
    setIsBulkResendModalVisible(false)
    // Optionally refresh families data if needed
    fetchFamilies()
  }

  const handleBulkResendCancel = () => {
    setIsBulkResendModalVisible(false)
  }

  const nextStep = () => setCurrentStep(currentStep + 1)
  const prevStep = () => setCurrentStep(currentStep - 1)

  // Calculate statistics
  const totalFamilies = families.length
  const activeFamilies = families.filter(f => f.primaryContact?.isActive || f.secondaryContact?.isActive).length
  const dualAccessFamilies = families.filter(f => f.secondaryContact).length
  const singleAccessFamilies = totalFamilies - dualAccessFamilies

  // Form steps
  const steps = [
    {
      title: 'Contacto Principal',
      icon: <UserOutlined />,
    },
    {
      title: 'Contacto Secundario',
      icon: <UserAddOutlined />,
    },
    {
      title: 'Estudiantes',
      icon: <TeamOutlined />,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header - Mobile Optimized */}
      <FadeInUp>
        <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between'} items-${isMobile ? 'start' : 'center'}`}>
          <div>
            <Title level={2} className="!mb-2">
              Gestión Integral de Familias
            </Title>
            <Text type="secondary">
              Control completo de familias con sistema de acceso dual y comunicaciones
            </Text>
          </div>
          <Space className={isMobile ? 'flex-wrap w-full' : ''}>
            <InteractiveButton
              variant="secondary"
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadCredentials(false)}
              disabled={loading}
              className={isMobile ? 'flex-1' : ''}
            >
              {isMobile ? 'Credenciales' : 'Descargar Credenciales'}
            </InteractiveButton>
            <InteractiveButton
              variant="secondary"
              icon={<SendOutlined />}
              onClick={handleBulkResendCredentials}
              className={isMobile ? 'flex-1' : ''}
            >
              {isMobile ? 'Envío' : 'Envío Masivo'}
            </InteractiveButton>
            <InteractiveButton
              variant="primary"
              icon={<PlusOutlined />}
              onClick={handleAddFamily}
              className={isMobile ? 'flex-1' : ''}
            >
              {isMobile ? 'Nueva' : 'Nueva Familia'}
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
                title="Total Familias"
                value={totalFamilies}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Familias Activas"
                value={activeFamilies}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Doble Acceso"
                value={dualAccessFamilies}
                prefix={<UserAddOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Acceso Individual"
                value={singleAccessFamilies}
                prefix={<HomeOutlined />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>
      </ScrollReveal>

      {/* Filters - Mobile Optimized */}
      <ScrollReveal direction="up" delay={0.2}>
        <Card
          style={{
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
          bodyStyle={{
            padding: isMobile ? '16px' : '24px'
          }}
        >
          <div className={`flex gap-4 items-center ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
            <AutoComplete
              placeholder="Buscar familias..."
              value={searchText}
              options={searchOptions}
              onSearch={handleSearchChange}
              onSelect={handleSearchSelect}
              onChange={handleSearchChange}
              className={isMobile ? 'w-full' : 'w-64'}
              allowClear
            >
              <Input
                prefix={<SearchOutlined />}
                style={{ borderRadius: '8px' }}
              />
            </AutoComplete>

            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className={isMobile ? 'w-full' : 'w-48'}
              suffixIcon={<FilterOutlined />}
              style={{ borderRadius: '8px' }}
            >
              <Option value="all">Todas las familias</Option>
              <Option value="active">Contactos activos</Option>
              <Option value="inactive">Contactos inactivos</Option>
              <Option value="dual">Doble acceso</Option>
              <Option value="single">Acceso individual</Option>
            </Select>

            <Text type="secondary" className={isMobile ? 'text-center' : ''}>
              {filteredFamilies.length} familia(s) encontrada(s)
            </Text>
          </div>
        </Card>
      </ScrollReveal>

      {/* Families Table - Mobile Optimized */}
      <ScrollReveal direction="up" delay={0.3}>
        <Card
          style={{
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
          bodyStyle={{
            padding: isMobile ? '12px' : '24px'
          }}
        >
          {/* Debug: Verificar datos antes de render */}
          {console.log('📊 ANTES DE RENDERIZAR TABLA:', {
            filteredFamiliesLength: filteredFamilies.length,
            loading,
            statusFilter,
            primeras3: filteredFamilies.slice(0, 3).map(f => ({
              email: f.primaryContact?.email,
              isActive: f.primaryContact?.isActive
            }))
          })}
          <ResponsiveTable
            columns={columns}
            dataSource={filteredFamilies}
            loading={loading}
            rowKey="id"
            mobileTitle="Familias"
            pagination={{
              current: currentPage,
              pageSize: isMobile ? 5 : 10,
              showSizeChanger: !isMobile,
              showQuickJumper: !isMobile,
              onChange: (page) => {
                console.log('📄 Cambio de página:', page)
                setCurrentPage(page)
              },
              showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} familias`
            }}
            mobileCardRender={(record, index) => (
              <Card
                key={record.id}
                size="small"
                className="mb-3 shadow-sm"
                style={{
                  borderRadius: '8px',
                  border: '1px solid #f0f0f0'
                }}
              >
                <Space direction="vertical" size="small" className="w-full">
                  <div className="flex items-center gap-3">
                    <Avatar
                      icon={<TeamOutlined />}
                      style={{ backgroundColor: '#1890ff' }}
                      size="large"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-base">
                        {record.primaryContact?.profile?.firstName || ''} {record.primaryContact?.profile?.lastName || ''}
                        <BirthdayIcon
                          user={{
                            id: record.primaryContact?.id || '',
                            firstName: record.primaryContact?.profile?.firstName || '',
                            lastName: record.primaryContact?.profile?.lastName || '',
                            dateOfBirth: record.primaryContact?.profile?.dateOfBirth
                          }}
                        />
                      </div>
                      <Text type="secondary" className="text-sm">
                        {record.primaryContact?.email || ''}
                      </Text>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Tag color={record.secondaryContact ? 'green' : 'blue'} className="text-xs">
                          {record.secondaryContact ? 'Doble Acceso' : 'Individual'}
                        </Tag>
                        <Tag
                          color={record.primaryContact?.isActive ? 'green' : 'red'}
                          className="text-xs"
                        >
                          {record.primaryContact?.isActive ? 'Activo' : 'Inactivo'}
                        </Tag>
                        {record.students && record.students.length > 0 && (
                          <Tag color="purple" className="text-xs">
                            {record.students.length} estudiante(s)
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Secondary Contact in Mobile */}
                  {record.secondaryContact && record.secondaryContact.profile && (
                    <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                      <Avatar
                        icon={<UserOutlined />}
                        style={{ backgroundColor: '#52c41a' }}
                        size="default"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          {record.secondaryContact?.profile?.firstName || ''} {record.secondaryContact?.profile?.lastName || ''}
                        </div>
                        <Text type="secondary" className="text-xs">
                          {record.secondaryContact?.email || ''}
                        </Text>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center gap-1 pt-2 border-t border-gray-100 flex-wrap">
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => handleViewFamily(record)}
                    >
                      Ver
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleEditFamily(record)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      icon={<LockOutlined />}
                      onClick={() => handleQuickPasswordChange(record)}
                    >
                      Contraseña
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      icon={<LoginOutlined />}
                      onClick={() => handleImpersonateUser(record, 'primary')}
                    >
                      Acceder
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      icon={<SendOutlined />}
                      onClick={() => handleResendCredentials(record)}
                    >
                      Reenviar
                    </Button>
                    <Popconfirm
                      title="¿Eliminar familia?"
                      description="¿Estás seguro de eliminar esta familia?"
                      onConfirm={() => handleDeleteFamily(record.id)}
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
            scroll={{ x: 1200 }}
          />
        </Card>
      </ScrollReveal>

      {/* Family Details Drawer - Mobile Optimized */}
      <AnimatedDrawer
        animationType="slide"
        title="Detalles de la Familia"
        placement="right"
        size={isMobile ? 'default' : 'large'}
        width={isMobile ? '100%' : 900}
        onClose={handleDetailDrawerClose}
        open={isDetailDrawerVisible}
        extra={
          viewingFamily && (
            <Space>
              <InteractiveButton
                variant="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  handleDetailDrawerClose()
                  handleEditFamily(viewingFamily)
                }}
              >
                Editar
              </InteractiveButton>
            </Space>
          )
        }
      >
        {viewingFamily && (
          <div className="space-y-6">
            {/* Family Header */}
            <div className="text-center border-b pb-6">
              <Avatar 
                size={80} 
                icon={<TeamOutlined />}
                style={{ backgroundColor: '#1890ff' }}
                className="mb-4"
              />
              <h2 className="text-xl font-bold mb-2">
                Familia {viewingFamily.primaryContact?.profile?.lastName || 'Sin apellido'}
              </h2>
              <Space>
                <Tag color={viewingFamily.secondaryContact ? 'green' : 'blue'}>
                  {viewingFamily.secondaryContact ? 'Doble Acceso' : 'Acceso Individual'}
                </Tag>
                <Tag color="purple">
                  {viewingFamily.students?.length || 0} estudiante(s)
                </Tag>
              </Space>
            </div>

            {/* Primary Contact */}
            <div>
              <Title level={4}>
                <UserOutlined /> Contacto Principal
              </Title>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Nombre" span={2}>
                  {viewingFamily.primaryContact?.profile?.firstName || ''} {viewingFamily.primaryContact?.profile?.lastName || ''}
                </Descriptions.Item>
                <Descriptions.Item label="Email" span={2}>
                  <Space>
                    <MailOutlined />
                    {viewingFamily.primaryContact.email}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Teléfono">
                  <Space>
                    <PhoneOutlined />
                    {viewingFamily.primaryContact?.profile?.phone || 'No especificado'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="DNI/NIE">
                  <Space>
                    <IdcardOutlined />
                    {viewingFamily.primaryContact?.profile?.documentNumber || 'No especificado'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Fecha de Nacimiento">
                  {viewingFamily.primaryContact?.profile?.dateOfBirth 
                    ? new Date(viewingFamily.primaryContact.profile.dateOfBirth).toLocaleDateString('es-ES')
                    : 'No especificada'
                  }
                </Descriptions.Item>
                <Descriptions.Item label="Ocupación">
                  {viewingFamily.primaryContact?.profile?.education || 'No especificada'}
                </Descriptions.Item>
                <Descriptions.Item label="Dirección" span={2}>
                  <Space>
                    <HomeOutlined />
                    {viewingFamily.primaryContact?.profile?.address || 'No especificada'}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Estado" span={2}>
                  <Badge 
                    status={viewingFamily.primaryContact.isActive ? 'success' : 'error'} 
                    text={viewingFamily.primaryContact.isActive ? 'Activo' : 'Inactivo'}
                  />
                </Descriptions.Item>
              </Descriptions>
            </div>

            {/* Secondary Contact */}
            {viewingFamily.secondaryContact && (
              <div>
                <Title level={4}>
                  <UserAddOutlined /> Contacto Secundario
                </Title>
                <Descriptions column={2} bordered size="small">
                  <Descriptions.Item label="Nombre" span={2}>
                    {viewingFamily.secondaryContact?.profile?.firstName || ''} {viewingFamily.secondaryContact?.profile?.lastName || ''}
                  </Descriptions.Item>
                  <Descriptions.Item label="Email" span={2}>
                    <Space>
                      <MailOutlined />
                      {viewingFamily.secondaryContact.email}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Teléfono">
                    <Space>
                      <PhoneOutlined />
                      {viewingFamily.secondaryContact?.profile?.phone || 'No especificado'}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="DNI/NIE">
                    <Space>
                      <IdcardOutlined />
                      {viewingFamily.secondaryContact?.profile?.documentNumber || 'No especificado'}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Fecha de Nacimiento">
                    {viewingFamily.secondaryContact?.profile?.dateOfBirth 
                      ? new Date(viewingFamily.secondaryContact.profile.dateOfBirth).toLocaleDateString('es-ES')
                      : 'No especificada'
                    }
                  </Descriptions.Item>
                  <Descriptions.Item label="Ocupación">
                    {viewingFamily.secondaryContact?.profile?.education || 'No especificada'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Dirección" span={2}>
                    <Space>
                      <HomeOutlined />
                      {viewingFamily.secondaryContact?.profile?.address || 'No especificada'}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Estado" span={2}>
                    <Badge 
                      status={viewingFamily.secondaryContact.isActive ? 'success' : 'error'} 
                      text={viewingFamily.secondaryContact.isActive ? 'Activo' : 'Inactivo'}
                    />
                  </Descriptions.Item>
                </Descriptions>
              </div>
            )}

            {/* Students */}
            <div>
              <Title level={4}>
                <TeamOutlined /> Estudiantes
              </Title>
              {viewingFamily.students && viewingFamily.students.length > 0 ? (
                <div className="space-y-3">
                  {viewingFamily.students.map(familyStudent => (
                    <Card key={familyStudent.id} size="small">
                      <Space className="w-full justify-between">
                        <Space>
                          <Avatar icon={<UserOutlined />} />
                          <div>
                            <div className="font-medium">
                              {familyStudent.student?.user?.profile?.firstName || ''} {familyStudent.student?.user?.profile?.lastName || ''}
                            </div>
                            <Text type="secondary" className="text-sm">
                              {familyStudent.student.enrollmentNumber}
                            </Text>
                          </div>
                        </Space>
                        <Tag color={relationshipColors[familyStudent.relationship]}>
                          {relationshipLabels[familyStudent.relationship]}
                        </Tag>
                      </Space>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert
                  message="Sin estudiantes asignados"
                  description="Esta familia no tiene estudiantes asociados."
                  type="info"
                  showIcon
                />
              )}
            </div>

            {/* Timestamps */}
            <div>
              <Title level={4}>Información del Sistema</Title>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Fecha de Registro">
                  {new Date(viewingFamily.createdAt).toLocaleString('es-ES')}
                </Descriptions.Item>
                <Descriptions.Item label="Última Actualización">
                  {new Date(viewingFamily.updatedAt).toLocaleString('es-ES')}
                </Descriptions.Item>
              </Descriptions>
            </div>
          </div>
        )}
      </AnimatedDrawer>

      {/* Add/Edit Family Modal - Mobile Optimized */}
      <AnimatedModal
        animationType="scale"
        title={
          <Space>
            <TeamOutlined />
            {editingFamily ? 'Editar Familia' : 'Nueva Familia'}
          </Space>
        }
        open={isModalVisible}
        onCancel={handleCancel}
        footer={null}
        width={isMobile ? '95%' : 800}
        destroyOnClose
      >
        <div className="mt-4">
          <Steps current={currentStep} items={steps} className="mb-6" />
          
          <Form
            form={form}
            layout="vertical"
            initialValues={{ hasSecondaryContact: false }}
          >
            {/* Hidden fields to ensure all form fields are registered */}
            <div style={{ display: 'none' }}>
              {/* Primary contact hidden fields */}
              <Form.Item name="primaryEmail"><Input /></Form.Item>
              <Form.Item name="primaryFirstName"><Input /></Form.Item>
              <Form.Item name="primaryLastName"><Input /></Form.Item>
              <Form.Item name="primaryPhone"><Input /></Form.Item>
              <Form.Item name="primaryAddress"><Input /></Form.Item>
              <Form.Item name="primaryDocumentNumber"><Input /></Form.Item>
              <Form.Item name="primaryDateOfBirth"><DatePicker /></Form.Item>
              <Form.Item name="primaryOccupation"><Input /></Form.Item>
              <Form.Item name="primaryPassword"><Input.Password /></Form.Item>
              <Form.Item name="primaryNewPassword"><Input.Password /></Form.Item>
              
              {/* Secondary contact hidden fields */}
              <Form.Item name="hasSecondaryContact"><Checkbox /></Form.Item>
              <Form.Item name="secondaryEmail"><Input /></Form.Item>
              <Form.Item name="secondaryFirstName"><Input /></Form.Item>
              <Form.Item name="secondaryLastName"><Input /></Form.Item>
              <Form.Item name="secondaryPhone"><Input /></Form.Item>
              <Form.Item name="secondaryAddress"><Input /></Form.Item>
              <Form.Item name="secondaryDocumentNumber"><Input /></Form.Item>
              <Form.Item name="secondaryDateOfBirth"><DatePicker /></Form.Item>
              <Form.Item name="secondaryOccupation"><Input /></Form.Item>
              <Form.Item name="secondaryPassword"><Input.Password /></Form.Item>
              <Form.Item name="secondaryNewPassword"><Input.Password /></Form.Item>
              
              {/* Students hidden field */}
              <Form.Item name="students"><Input /></Form.Item>
            </div>

            {/* Step 0: Primary Contact */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <Alert
                  message="Contacto Principal"
                  description="Este será el contacto principal de la familia. Debe tener acceso completo al sistema."
                  type="info"
                  showIcon
                  className="mb-4"
                />
                
                <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
                  <Form.Item
                    name="primaryFirstName"
                    label="Nombre"
                    rules={[{ required: true, message: 'El nombre es requerido' }]}
                  >
                    <Input placeholder="Nombre del contacto principal" />
                  </Form.Item>
                  <Form.Item
                    name="primaryLastName"
                    label="Apellidos"
                    rules={[{ required: true, message: 'Los apellidos son requeridos' }]}
                  >
                    <Input placeholder="Apellidos del contacto principal" />
                  </Form.Item>
                </div>

                <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
                  <Form.Item
                    name="primaryEmail"
                    label="Email"
                    rules={[
                      { required: true, message: 'El email es requerido' },
                      { type: 'email', message: 'Email no válido' }
                    ]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="email@ejemplo.com" />
                  </Form.Item>
                  <Form.Item
                    name="primaryPhone"
                    label="Teléfono"
                    rules={[{ required: true, message: 'El teléfono es requerido' }]}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="+34 600 000 000" />
                  </Form.Item>
                </div>

                {!editingFamily && (
                  <>
                    <Form.Item
                      name="primaryPassword"
                      label="Contraseña"
                      rules={[{ min: 6, message: 'Mínimo 6 caracteres' }]}
                      extra={
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          Si se deja vacío, se generará una contraseña segura automáticamente y se enviará por email.
                        </span>
                      }
                    >
                      <Input.Password
                        placeholder="Dejar vacío para auto-generar"
                        addonAfter={
                          <Tooltip title="Generar contraseña segura">
                            <SyncOutlined
                              style={{ cursor: 'pointer', color: '#0ea5e9' }}
                              onClick={() => {
                                const pwd = generatePassword()
                                form.setFieldValue('primaryPassword', pwd)
                              }}
                            />
                          </Tooltip>
                        }
                      />
                    </Form.Item>
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 12 }}
                      message="Las credenciales se enviarán automáticamente por email al contacto familiar y al correo del estudiante."
                    />
                  </>
                )}

                {editingFamily && (
                  <Form.Item
                    name="primaryNewPassword"
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
                    name="primaryDocumentNumber"
                    label="DNI/NIE"
                  >
                    <Input prefix={<IdcardOutlined />} placeholder="12345678A" />
                  </Form.Item>
                  <Form.Item
                    name="primaryDateOfBirth"
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
                  name="primaryAddress"
                  label="Dirección"
                >
                  <Input prefix={<HomeOutlined />} placeholder="Calle Mayor, 123, Madrid" />
                </Form.Item>

                <Form.Item
                  name="primaryOccupation"
                  label="Ocupación"
                >
                  <Input placeholder="Profesión o ocupación" />
                </Form.Item>
              </div>
            )}

            {/* Step 1: Secondary Contact */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <Form.Item
                  name="hasSecondaryContact"
                  valuePropName="checked"
                >
                  <Checkbox
                    onChange={(e) => {
                      const checked = e.target.checked
                      setHasSecondaryContact(checked)
                      if (!checked) {
                        // Clear secondary contact fields
                        const secondaryFields = [
                          'secondaryFirstName', 'secondaryLastName', 'secondaryEmail', 
                          'secondaryPassword', 'secondaryNewPassword', 'secondaryPhone', 'secondaryDocumentNumber',
                          'secondaryDateOfBirth', 'secondaryAddress', 'secondaryOccupation'
                        ]
                        secondaryFields.forEach(field => form.setFieldValue(field, undefined))
                      }
                    }}
                  >
                    <div className="p-4 border rounded-lg cursor-pointer hover:border-blue-400 transition-colors">
                      <div>
                        <div className="font-medium">Añadir contacto secundario</div>
                        <Text type="secondary" className="text-sm">
                          Permite que otro progenitor o tutor tenga acceso independiente
                        </Text>
                      </div>
                    </div>
                  </Checkbox>
                </Form.Item>

                {hasSecondaryContact && (
                  <div className="space-y-4">
                    <Alert
                      message="Contacto Secundario"
                      description="Este contacto tendrá acceso independiente al sistema para el seguimiento de los estudiantes."
                      type="success"
                      showIcon
                    />
                    
                    <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
                      <Form.Item
                        name="secondaryFirstName"
                        label="Nombre"
                        rules={hasSecondaryContact ? [{ required: true, message: 'El nombre es requerido' }] : []}
                      >
                        <Input placeholder="Nombre del contacto secundario" />
                      </Form.Item>
                      <Form.Item
                        name="secondaryLastName"
                        label="Apellidos"
                        rules={hasSecondaryContact ? [{ required: true, message: 'Los apellidos son requeridos' }] : []}
                      >
                        <Input placeholder="Apellidos del contacto secundario" />
                      </Form.Item>
                    </div>

                    <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-4'}`}>
                      <Form.Item
                        name="secondaryEmail"
                        label="Email"
                        rules={hasSecondaryContact ? [
                          { required: true, message: 'El email es requerido' },
                          { type: 'email', message: 'Email no válido' }
                        ] : []}
                      >
                        <Input prefix={<MailOutlined />} placeholder="email@ejemplo.com" />
                      </Form.Item>
                      <Form.Item
                        name="secondaryPhone"
                        label="Teléfono"
                        rules={hasSecondaryContact ? [{ required: true, message: 'El teléfono es requerido' }] : []}
                      >
                        <Input prefix={<PhoneOutlined />} placeholder="+34 600 000 000" />
                      </Form.Item>
                    </div>

                    {!editingFamily && (
                      <Form.Item
                        name="secondaryPassword"
                        label="Contraseña"
                        rules={hasSecondaryContact ? [{ min: 6, message: 'Mínimo 6 caracteres' }] : []}
                        extra={
                          <span style={{ fontSize: 12, color: '#64748b' }}>
                            Si se deja vacío, se generará una contraseña segura automáticamente.
                          </span>
                        }
                      >
                        <Input.Password
                          placeholder="Dejar vacío para auto-generar"
                          addonAfter={
                            <Tooltip title="Generar contraseña segura">
                              <SyncOutlined
                                style={{ cursor: 'pointer', color: '#0ea5e9' }}
                                onClick={() => {
                                  const pwd = generatePassword()
                                  form.setFieldValue('secondaryPassword', pwd)
                                }}
                              />
                            </Tooltip>
                          }
                        />
                      </Form.Item>
                    )}

                    {editingFamily && (
                      <Form.Item
                        name="secondaryNewPassword"
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
                        name="secondaryDocumentNumber"
                        label="DNI/NIE"
                      >
                        <Input prefix={<IdcardOutlined />} placeholder="12345678A" />
                      </Form.Item>
                      <Form.Item
                        name="secondaryDateOfBirth"
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
                      name="secondaryAddress"
                      label="Dirección"
                    >
                      <Input prefix={<HomeOutlined />} placeholder="Calle Mayor, 123, Madrid" />
                    </Form.Item>

                    <Form.Item
                      name="secondaryOccupation"
                      label="Ocupación"
                    >
                      <Input placeholder="Profesión o ocupación" />
                    </Form.Item>
                  </div>
                )}

                {!form.getFieldValue('hasSecondaryContact') && (
                  <Alert
                    message="Acceso Individual"
                    description="La familia tendrá un solo acceso al sistema a través del contacto principal."
                    type="info"
                    showIcon
                  />
                )}
              </div>
            )}

            {/* Step 2: Students */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <Alert
                  message="Asignación de Estudiantes"
                  description="Selecciona los estudiantes que pertenecen a esta familia y define la relación familiar."
                  type="info"
                  showIcon
                />

                <Form.List name="students">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...restField }) => (
                        <Card key={key} className="mb-4" style={{ borderRadius: '8px' }}>
                          <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-12 gap-4 items-end'}`}>
                            <div className={isMobile ? 'w-full' : 'col-span-5'}>
                              <Form.Item
                                {...restField}
                                name={[name, 'studentId']}
                                label="Estudiante"
                                rules={[{ required: true, message: 'Selecciona un estudiante' }]}
                              >
                                <Select
                                  placeholder="Seleccionar estudiante"
                                  showSearch
                                  optionFilterProp="children"
                                  filterOption={(input, option) =>
                                    (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                                  }
                                >
                                  {availableStudents.map(student => (
                                    <Option key={student.id} value={student.id}>
                                      {student.user?.profile?.firstName || ''} {student.user?.profile?.lastName || ''} ({student.enrollmentNumber})
                                    </Option>
                                  ))}
                                </Select>
                              </Form.Item>
                            </div>
                            <div className={isMobile ? 'w-full' : 'col-span-5'}>
                              <Form.Item
                                {...restField}
                                name={[name, 'relationship']}
                                label="Relación"
                                rules={[{ required: true, message: 'Selecciona la relación' }]}
                              >
                                <Select placeholder="Relación familiar">
                                  <Option value="parent">
                                    <Space>
                                      <Tag color="blue">Padre/Madre</Tag>
                                    </Space>
                                  </Option>
                                  <Option value="guardian">
                                    <Space>
                                      <Tag color="green">Tutor/a</Tag>
                                    </Space>
                                  </Option>
                                  <Option value="other">
                                    <Space>
                                      <Tag color="orange">Otro</Tag>
                                    </Space>
                                  </Option>
                                </Select>
                              </Form.Item>
                            </div>
                            <div className={isMobile ? 'w-full' : 'col-span-2'}>
                              <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(name)}
                                className={isMobile ? 'w-full' : ''}
                              >
                                {isMobile ? 'Eliminar' : ''}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      <Button
                        type="dashed"
                        onClick={() => add()}
                        block
                        icon={<PlusOutlined />}
                      >
                        Añadir Estudiante
                      </Button>
                    </>
                  )}
                </Form.List>

                {availableStudents.length === 0 && (
                  <Alert
                    message="No hay estudiantes disponibles"
                    description="Primero debes crear estudiantes en el sistema antes de asignarlos a familias."
                    type="warning"
                    showIcon
                  />
                )}
              </div>
            )}

            {/* Navigation buttons - Mobile Optimized */}
            <div className={`${isMobile ? 'flex flex-col gap-3' : 'flex justify-between'} mt-6 pt-4 border-t`}>
              <Button
                onClick={prevStep}
                disabled={currentStep === 0}
                className={isMobile ? 'order-2' : ''}
              >
                Anterior
              </Button>

              <div className={`flex gap-2 ${isMobile ? 'order-1' : ''}`}>
                <InteractiveButton
                  variant="secondary"
                  onClick={handleCancel}
                  className={isMobile ? 'flex-1' : ''}
                >
                  Cancelar
                </InteractiveButton>

                {currentStep < steps.length - 1 ? (
                  <InteractiveButton
                    variant="primary"
                    onClick={nextStep}
                    className={isMobile ? 'flex-1' : ''}
                  >
                    Siguiente
                  </InteractiveButton>
                ) : (
                  <InteractiveButton
                    variant="primary"
                    onClick={handleSubmit}
                    className={isMobile ? 'flex-1' : ''}
                  >
                    {editingFamily ? 'Actualizar' : 'Crear'} Familia
                  </InteractiveButton>
                )}
              </div>
            </div>
          </Form>
        </div>
      </AnimatedModal>

      {/* Bulk Resend Credentials Modal */}
      <BulkResendCredentialsModal
        visible={isBulkResendModalVisible}
        onCancel={handleBulkResendCancel}
        onSuccess={handleBulkResendSuccess}
      />
    </div>
  )
}

export default FamiliesPage