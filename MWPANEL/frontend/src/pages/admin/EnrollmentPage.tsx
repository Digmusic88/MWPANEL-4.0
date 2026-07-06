import React, { useState, useEffect, useCallback } from 'react'
import {
  Card,
  Steps,
  Form,
  Input,
  Select,
  DatePicker,
  Row,
  Col,
  Button,
  message,
  Typography,
  Alert,
  Checkbox,
  Divider,
  Spin,
  Modal,
} from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  HomeOutlined,
  IdcardOutlined,
  SaveOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import apiClient from '@services/apiClient'
import BulkImportModal from '@components/BulkImportModal'
import SimplifiedBulkImportModal from '@components/SimplifiedBulkImportModal'

const { Title, Text } = Typography
const { Option } = Select

// Interfaces
interface EducationalLevel {
  id: string
  name: string
}

interface Course {
  id: string
  name: string
  educationalLevel: EducationalLevel
}


interface EnrollmentFormData {
  // Student data
  studentFirstName: string
  studentLastName: string
  studentEmail: string
  studentPassword: string
  studentBirthDate: string
  studentDocumentNumber?: string
  studentPhone?: string
  enrollmentNumber: string
  educationalLevelId: string
  courseId?: string
  classGroupIds?: string[]

  // Family data
  createNewFamily: boolean
  existingFamilyId?: string
  
  // Primary contact
  primaryFirstName: string
  primaryLastName: string
  primaryEmail: string
  primaryPassword: string
  primaryPhone: string
  primaryDocumentNumber?: string
  primaryDateOfBirth?: string
  primaryAddress?: string
  primaryOccupation?: string
  relationshipToPrimary: 'father' | 'mother' | 'guardian' | 'other'

  // Secondary contact (optional)
  hasSecondaryContact: boolean
  secondaryFirstName?: string
  secondaryLastName?: string
  secondaryEmail?: string
  secondaryPassword?: string
  secondaryPhone?: string
  secondaryDocumentNumber?: string
  secondaryDateOfBirth?: string
  secondaryAddress?: string
  secondaryOccupation?: string
  relationshipToSecondary?: 'father' | 'mother' | 'guardian' | 'other'
}

const EnrollmentPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm<EnrollmentFormData>()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showManualEnrollment, setShowManualEnrollment] = useState(false)
  const navigate = useNavigate()

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === 'function') {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn('Navigation error:', error, 'Path:', path);
      }
    } else {
      console.warn('Navigate function not available:', path);
    }
  }, [navigate]);

  // Academic data
  const [educationalLevels, setEducationalLevels] = useState<EducationalLevel[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [existingFamilies, setExistingFamilies] = useState<any[]>([])

  // Form data state
  const [formData, setFormData] = useState<Partial<EnrollmentFormData>>({
    createNewFamily: true,
    hasSecondaryContact: false,
    relationshipToPrimary: 'mother',
    relationshipToSecondary: 'father'
  })

  // Draft management
  const [draftSaved, setDraftSaved] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null)
  const [showDraftModal, setShowDraftModal] = useState(false)
  const [draftData, setDraftData] = useState<any>(null)
  const DRAFT_KEY = 'enrollment-draft'

  // Bulk import
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [showSimplifiedBulkImportModal, setShowSimplifiedBulkImportModal] = useState(false)

  // Fetch initial data
  const fetchInitialData = async () => {
    setLoading(true)
    try {
      console.log('🔄 Fetching initial data for enrollment...')
      
      // Fetch educational levels from API (includes cycles and courses)
      const educationalLevelsResponse = await apiClient.get('/educational-levels')
      console.log('📚 Educational levels loaded:', educationalLevelsResponse.data)
      setEducationalLevels(educationalLevelsResponse.data)
      
      // Process courses from educational levels response
      const allCourses = []
      for (const level of educationalLevelsResponse.data) {
        for (const cycle of level.cycles || []) {
          for (const course of cycle.courses || []) {
            allCourses.push({
              id: course.id,
              name: course.name,
              code: course.code,
              order: course.order,
              ageReference: course.ageReference,
              academicYear: course.academicYear,
              educationalLevel: {
                id: level.id,
                name: level.name,
                code: level.code
              },
              cycle: {
                id: cycle.id,
                name: cycle.name,
                order: cycle.order
              }
            })
          }
        }
      }
      
      // Sort courses by educational level and order
      allCourses.sort((a, b) => {
        if (a.educationalLevel.code !== b.educationalLevel.code) {
          const order = { 'INFANTIL': 1, 'PRIMARIA': 2, 'SECUNDARIA': 3 };
          return (order[a.educationalLevel.code] || 999) - (order[b.educationalLevel.code] || 999);
        }
        return a.order - b.order;
      });
      
      console.log('📖 Courses processed:', allCourses)
      setCourses(allCourses)

      // Fetch existing families
      const familiesResponse = await apiClient.get('/families')
      console.log('👨‍👩‍👧‍👦 Families loaded:', familiesResponse.data)
      setExistingFamilies(familiesResponse.data)
      
    } catch (error) {
      message.error('Error al cargar datos iniciales')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInitialData()
    loadDraft()
  }, [])

  // Draft functions
  const saveDraft = () => {
    const currentValues = form.getFieldsValue()
    console.log('💾 Saving draft with values:', currentValues)
    
    const draftData = {
      ...currentValues,
      currentStep,
      savedAt: new Date().toISOString()
    }
    
    console.log('💾 Draft data to save:', draftData)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
    setDraftSaved(true)
    setLastSavedTime(new Date())
    message.success('Borrador guardado exitosamente')
    
    // Reset draft saved indicator after 3 seconds
    setTimeout(() => setDraftSaved(false), 3000)
  }

  const loadDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        const draftData = JSON.parse(savedDraft)
        
        // Convert date strings back to dayjs objects for DatePicker components
        const processedData = { ...draftData }
        if (processedData.studentBirthDate) {
          processedData.studentBirthDate = dayjs(processedData.studentBirthDate)
        }
        if (processedData.primaryDateOfBirth) {
          processedData.primaryDateOfBirth = dayjs(processedData.primaryDateOfBirth)
        }
        if (processedData.secondaryDateOfBirth) {
          processedData.secondaryDateOfBirth = dayjs(processedData.secondaryDateOfBirth)
        }
        
        // Set form values with processed data
        form.setFieldsValue(processedData)
        setFormData(processedData)
        
        // Restore step
        if (typeof draftData.currentStep === 'number') {
          setCurrentStep(draftData.currentStep)
        }
        
        // Set last saved time
        if (draftData.savedAt) {
          setLastSavedTime(new Date(draftData.savedAt))
        }
        
        message.info('Borrador cargado automáticamente')
      }
    } catch (error) {
      console.error('Error loading draft:', error)
    }
  }

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setDraftSaved(false)
    setLastSavedTime(null)
    message.success('Borrador eliminado')
  }

  const hasDraft = () => {
    return localStorage.getItem(DRAFT_KEY) !== null
  }

  const viewDraft = () => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        const parsedDraft = JSON.parse(savedDraft)
        setDraftData(parsedDraft)
        setShowDraftModal(true)
      }
    } catch (error) {
      console.error('Error viewing draft:', error)
      message.error('Error al cargar el borrador')
    }
  }

  const loadDraftFromModal = () => {
    if (draftData) {
      // Convert date strings back to dayjs objects for DatePicker components
      const processedData = { ...draftData }
      if (processedData.studentBirthDate) {
        processedData.studentBirthDate = dayjs(processedData.studentBirthDate)
      }
      if (processedData.primaryDateOfBirth) {
        processedData.primaryDateOfBirth = dayjs(processedData.primaryDateOfBirth)
      }
      if (processedData.secondaryDateOfBirth) {
        processedData.secondaryDateOfBirth = dayjs(processedData.secondaryDateOfBirth)
      }
      
      // Set form values with processed data
      form.setFieldsValue(processedData)
      setFormData(processedData)
      
      // Restore step
      if (typeof draftData.currentStep === 'number') {
        setCurrentStep(draftData.currentStep)
      }
      
      // Set last saved time
      if (draftData.savedAt) {
        setLastSavedTime(new Date(draftData.savedAt))
      }
      
      setShowDraftModal(false)
      message.success('Borrador cargado exitosamente')
    }
  }

  // Filter courses by educational level
  const filteredCourses = courses.filter(course => 
    course.educationalLevel.id === form.getFieldValue('educationalLevelId')
  )

  // Steps configuration
  const steps = [
    {
      title: 'Datos del Estudiante',
      icon: <UserOutlined />,
      description: 'Información personal y académica'
    },
    {
      title: 'Información Familiar',
      icon: <TeamOutlined />,
      description: 'Contactos y datos familiares'
    },
    {
      title: 'Confirmación',
      icon: <CheckCircleOutlined />,
      description: 'Revisar y confirmar inscripción'
    }
  ]

  // Navigation handlers
  const nextStep = async () => {
    try {
      // Validate current step fields
      if (currentStep === 0) {
        const fieldsToValidate = [
          'studentFirstName', 'studentLastName', 'studentEmail', 'studentPassword',
          'studentBirthDate', 'educationalLevelId'
        ]
        
        // Only validate enrollment number if manual mode is enabled
        if (showManualEnrollment) {
          fieldsToValidate.push('enrollmentNumber')
        }
        
        await form.validateFields(fieldsToValidate)
      } else if (currentStep === 1) {
        const createNewFamily = form.getFieldValue('createNewFamily')
        if (createNewFamily) {
          const fieldsToValidate = [
            'primaryFirstName', 'primaryLastName', 'primaryEmail', 'primaryPassword',
            'primaryPhone', 'relationshipToPrimary'
          ]
          
          const hasSecondaryContact = form.getFieldValue('hasSecondaryContact')
          if (hasSecondaryContact) {
            fieldsToValidate.push(
              'secondaryFirstName', 'secondaryLastName', 'secondaryEmail', 
              'secondaryPassword', 'secondaryPhone', 'relationshipToSecondary'
            )
          }
          
          await form.validateFields(fieldsToValidate)
        } else {
          await form.validateFields(['existingFamilyId'])
        }
      }
      
      // Update formData with current form values
      const currentValues = form.getFieldsValue()
      setFormData(currentValues)
      
      // Auto-save draft when moving to next step
      const draftData = {
        ...currentValues,
        currentStep: currentStep + 1,
        savedAt: new Date().toISOString()
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
      
      setCurrentStep(currentStep + 1)
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const prevStep = () => {
    setCurrentStep(currentStep - 1)
  }

  // Submit enrollment
  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      
      // Try validation first, but don't rely on it exclusively
      try {
        await form.validateFields()
      } catch (validationError) {
        console.error('Validation failed:', validationError)
        setSubmitting(false)
        return
      }
      
      // Get values directly - most reliable method
      const values = form.getFieldsValue()
      
      console.log('Form values from getFieldsValue:', values)
      console.log('studentEmail from form:', values.studentEmail)
      console.log('primaryEmail from form:', values.primaryEmail)
      
      // Additional debug: check if form has data
      console.log('Form internal state:', form.getInternalState?.())
      console.log('Form touched fields:', form.isFieldsTouched?.())
      console.log('Current step:', currentStep)
      
      // Validation check: ensure critical fields are present
      if (!values.studentEmail || !values.studentFirstName || !values.studentLastName) {
        console.error('CRITICAL ERROR: Missing required student fields', {
          studentEmail: values.studentEmail,
          studentFirstName: values.studentFirstName,
          studentLastName: values.studentLastName
        })
        
        // Try to get values using form.getFieldValue individually as a fallback
        console.log('FALLBACK: Trying individual field access...')
        const fallbackValues = {
          studentEmail: form.getFieldValue('studentEmail'),
          studentFirstName: form.getFieldValue('studentFirstName'),
          studentLastName: form.getFieldValue('studentLastName'),
          studentPassword: form.getFieldValue('studentPassword'),
          studentBirthDate: form.getFieldValue('studentBirthDate'),
          educationalLevelId: form.getFieldValue('educationalLevelId'),
          courseId: form.getFieldValue('courseId'),
          primaryFirstName: form.getFieldValue('primaryFirstName'),
          primaryLastName: form.getFieldValue('primaryLastName'),
          primaryEmail: form.getFieldValue('primaryEmail'),
          primaryPassword: form.getFieldValue('primaryPassword'),
          primaryPhone: form.getFieldValue('primaryPhone'),
          createNewFamily: form.getFieldValue('createNewFamily'),
          relationshipToPrimary: form.getFieldValue('relationshipToPrimary')
        }
        
        console.log('FALLBACK values:', fallbackValues)
        
        if (fallbackValues.studentEmail && fallbackValues.studentFirstName && fallbackValues.studentLastName) {
          console.log('FALLBACK SUCCESS: Using individual field values')
          Object.assign(values, fallbackValues)
        } else {
          message.error('Por favor, completa todos los campos obligatorios del estudiante')
          setSubmitting(false)
          return
        }
      }
      
      // Prepare enrollment data
      const enrollmentData = {
        student: {
          firstName: values.studentFirstName,
          lastName: values.studentLastName,
          email: values.studentEmail,
          password: values.studentPassword,
          birthDate: dayjs(values.studentBirthDate).format('YYYY-MM-DD'),
          documentNumber: values.studentDocumentNumber,
          phone: values.studentPhone,
          ...(values.enrollmentNumber && { enrollmentNumber: values.enrollmentNumber }),
          educationalLevelId: values.educationalLevelId,
          courseId: values.courseId,
          classGroupIds: values.classGroupIds || []
        },
        family: values.createNewFamily ? {
          primaryContact: {
            firstName: values.primaryFirstName,
            lastName: values.primaryLastName,
            email: values.primaryEmail,
            password: values.primaryPassword,
            phone: values.primaryPhone,
            documentNumber: values.primaryDocumentNumber,
            dateOfBirth: values.primaryDateOfBirth ? dayjs(values.primaryDateOfBirth).format('YYYY-MM-DD') : undefined,
            address: values.primaryAddress,
            occupation: values.primaryOccupation,
          },
          ...(values.hasSecondaryContact && {
            secondaryContact: {
              firstName: values.secondaryFirstName,
              lastName: values.secondaryLastName,
              email: values.secondaryEmail,
              password: values.secondaryPassword,
              phone: values.secondaryPhone,
              documentNumber: values.secondaryDocumentNumber,
              dateOfBirth: values.secondaryDateOfBirth ? dayjs(values.secondaryDateOfBirth).format('YYYY-MM-DD') : undefined,
              address: values.secondaryAddress,
              occupation: values.secondaryOccupation,
            }
          }),
          relationship: values.relationshipToPrimary
        } : {
          existingFamilyId: values.existingFamilyId,
          relationship: values.relationshipToPrimary
        }
      }

      console.log('Sending enrollment data:', enrollmentData)
      console.log('Student email specifically:', enrollmentData.student.email)
      console.log('Primary contact email:', enrollmentData.family.primaryContact?.email)
      console.log('Has secondary contact?:', values.hasSecondaryContact)
      if (values.hasSecondaryContact) {
        console.log('Secondary contact email:', enrollmentData.family.secondaryContact?.email)
        console.log('Secondary contact data:', enrollmentData.family.secondaryContact)
      }

      // Submit enrollment
      await apiClient.post('/enrollment', enrollmentData)
      
      // Clear draft on successful submission
      clearDraft()
      
      message.success('Inscripción completada exitosamente')
      safeNavigate('/admin/students')
      
    } catch (error: any) {
      console.error('Enrollment error:', error)
      message.error(error.response?.data?.message || 'Error al procesar la inscripción')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" tip="Cargando datos de inscripción..." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Title level={2} className="!mb-2">
            Formulario de Inscripción
          </Title>
          <Text type="secondary">
            Registro completo de estudiante y familia en el sistema educativo
          </Text>
        </div>
        
        {/* Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button 
              icon={<TeamOutlined />} 
              onClick={() => {
                console.log('🎯 Simplified bulk import clicked');
                setShowSimplifiedBulkImportModal(true);
              }}
              type="primary"
              size="large"
              style={{ backgroundColor: '#1890ff' }}
            >
              ✨ Subida Simplificada ✨
            </Button>
            
            <Button 
              icon={<CloudUploadOutlined />} 
              onClick={() => setShowBulkImportModal(true)}
              type="default"
              size="large"
            >
              Importación Masiva Completa
            </Button>
            
            <Button 
              icon={<SaveOutlined />} 
              onClick={saveDraft}
              type={draftSaved ? "primary" : "default"}
            >
              {draftSaved ? "Guardado!" : "Guardar Borrador"}
            </Button>
            
            {/* Debug button */}
            <Button 
              onClick={() => {
                const values = form.getFieldsValue()
                console.log('DEBUG - Form values:', values)
                console.log('DEBUG - FormData state:', formData)
              }}
              type="dashed"
            >
              Debug Form
            </Button>
            
            {hasDraft() && (
              <>
                <Button 
                  icon={<EyeOutlined />} 
                  onClick={viewDraft}
                  type="default"
                >
                  Ver Borrador
                </Button>
                <Button 
                  icon={<DeleteOutlined />} 
                  onClick={clearDraft}
                  type="text"
                  danger
                >
                  Limpiar Borrador
                </Button>
              </>
            )}
          </div>
          
          {lastSavedTime && (
            <Text type="secondary" className="text-xs flex items-center gap-1">
              <ClockCircleOutlined />
              Último guardado: {lastSavedTime.toLocaleTimeString()}
            </Text>
          )}
        </div>
      </div>

      {/* Steps */}
      <Card>
        <Steps current={currentStep} items={steps} />
      </Card>

      {/* Draft Info Alert */}
      {hasDraft() && currentStep === 0 && (
        <Alert
          message="Borrador Disponible"
          description="Se han cargado datos de un borrador anterior. Los datos se guardan automáticamente al avanzar entre pasos."
          type="info"
          showIcon
          closable
        />
      )}

      {/* Form Content */}
      <Card>
        <Form
          form={form}
          layout="vertical"
          initialValues={formData}
          onValuesChange={(_, allValues) => {
            setFormData(allValues)
          }}
        >
          {/* Step 0: Student Information */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <Alert
                message="Información del Estudiante"
                description="Complete todos los datos personales y académicos del estudiante que se va a inscribir."
                type="info"
                showIcon
              />

              <div>
                <Title level={4}>Datos Personales</Title>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="studentFirstName"
                      label="Nombre"
                      rules={[{ required: true, message: 'El nombre es requerido' }]}
                    >
                      <Input placeholder="Nombre del estudiante" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="studentLastName"
                      label="Apellidos"
                      rules={[{ required: true, message: 'Los apellidos son requeridos' }]}
                    >
                      <Input placeholder="Apellidos del estudiante" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      name="studentEmail"
                      label="Email"
                      rules={[
                        { required: true, message: 'El email es requerido' },
                        { type: 'email', message: 'Email no válido' }
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="email@ejemplo.com" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="studentPassword"
                      label="Contraseña"
                      rules={[
                        { required: true, message: 'La contraseña es requerida' },
                        { min: 6, message: 'Mínimo 6 caracteres' }
                      ]}
                    >
                      <Input.Password placeholder="Contraseña para el acceso" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item
                      name="studentBirthDate"
                      label="Fecha de Nacimiento"
                      rules={[{ required: true, message: 'La fecha de nacimiento es requerida' }]}
                    >
                      <DatePicker 
                        placeholder="Selecciona fecha" 
                        format="DD/MM/YYYY"
                        className="w-full"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="studentDocumentNumber"
                      label="DNI/NIE"
                    >
                      <Input prefix={<IdcardOutlined />} placeholder="12345678A" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="studentPhone"
                      label="Teléfono"
                    >
                      <Input prefix={<PhoneOutlined />} placeholder="+34 600 000 000" />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              <Divider />

              <div>
                <Title level={4}>Información Académica</Title>
                
                {/* Opción para matriculación manual */}
                <div style={{ marginBottom: 16 }}>
                  <Checkbox 
                    checked={showManualEnrollment}
                    onChange={(e) => {
                      setShowManualEnrollment(e.target.checked)
                      if (!e.target.checked) {
                        form.setFieldValue('enrollmentNumber', undefined)
                      }
                    }}
                  >
                    <Text type="secondary">
                      Asignar número de matrícula manualmente 
                      <Text type="secondary" style={{ fontSize: '12px', marginLeft: 4 }}>
                        (por defecto se genera automáticamente)
                      </Text>
                    </Text>
                  </Checkbox>
                </div>

                <Row gutter={16}>
                  {showManualEnrollment && (
                    <Col span={12}>
                      <Form.Item
                        name="enrollmentNumber"
                        label="Número de Matrícula"
                        rules={[
                          { required: showManualEnrollment, message: 'El número de matrícula es requerido' },
                          { 
                            pattern: /^(MW|MT)-\d{4}-\d{4}$|^(MW|MT)\d+$/,
                            message: 'Formato: MW-2025-0001 o MW123456' 
                          }
                        ]}
                        extra="Formato recomendado: MW-2025-0001"
                      >
                        <Input placeholder="MW-2025-0001" />
                      </Form.Item>
                    </Col>
                  )}
                  <Col span={showManualEnrollment ? 12 : 24}>
                    <Form.Item
                      name="educationalLevelId"
                      label="Nivel Educativo"
                      rules={[{ required: true, message: 'Selecciona un nivel educativo' }]}
                    >
                      <Select placeholder="Seleccionar nivel educativo">
                        {educationalLevels.map(level => (
                          <Option key={level.id} value={level.id}>
                            {level.name}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {form.getFieldValue('educationalLevelId') && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="courseId"
                        label="Curso"
                      >
                        <Select placeholder="Seleccionar curso">
                          {filteredCourses.map(course => (
                            <Option key={course.id} value={course.id}>
                              {course.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Family Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <Alert
                message="Información Familiar"
                description="Configure los contactos familiares que tendrán acceso al seguimiento académico del estudiante."
                type="info"
                showIcon
              />

              {/* Family Selection */}
              <div>
                <Title level={4}>Configuración Familiar</Title>
                <Form.Item name="createNewFamily" valuePropName="checked">
                  <Checkbox
                    checked={formData.createNewFamily}
                    onChange={(e) => {
                      const createNew = e.target.checked
                      form.setFieldValue('createNewFamily', createNew)
                      if (!createNew) {
                        // Clear family creation fields
                        const familyFields = [
                          'primaryFirstName', 'primaryLastName', 'primaryEmail', 'primaryPassword',
                          'primaryPhone', 'primaryDocumentNumber', 'primaryDateOfBirth', 
                          'primaryAddress', 'primaryOccupation', 'hasSecondaryContact'
                        ]
                        familyFields.forEach(field => form.setFieldValue(field as any, undefined))
                      }
                    }}
                  >
                    Crear nueva familia
                  </Checkbox>
                </Form.Item>

                {!formData.createNewFamily && (
                  <Form.Item
                    name="existingFamilyId"
                    label="Seleccionar Familia Existente"
                    rules={[{ required: !formData.createNewFamily, message: 'Selecciona una familia' }]}
                  >
                    <Select placeholder="Buscar y seleccionar familia">
                      {existingFamilies.map(family => (
                        <Option key={family.id} value={family.id}>
                          {family.primaryContact?.profile?.firstName || 'Contacto'} {family.primaryContact?.profile?.lastName || 'Primario'}
                          {family.secondaryContact && (
                            <span> / {family.secondaryContact?.profile?.firstName || 'Contacto'} {family.secondaryContact?.profile?.lastName || 'Secundario'}</span>
                          )}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                )}
              </div>

              {/* Primary Contact */}
              {formData.createNewFamily && (
                <>
                  <div>
                    <Title level={4}>Contacto Principal</Title>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="primaryFirstName"
                          label="Nombre"
                          rules={[{ required: formData.createNewFamily, message: 'El nombre es requerido' }]}
                        >
                          <Input placeholder="Nombre del contacto principal" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="primaryLastName"
                          label="Apellidos"
                          rules={[{ required: formData.createNewFamily, message: 'Los apellidos son requeridos' }]}
                        >
                          <Input placeholder="Apellidos del contacto principal" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          name="primaryEmail"
                          label="Email"
                          rules={formData.createNewFamily ? [
                            { required: true, message: 'El email es requerido' },
                            { type: 'email', message: 'Email no válido' }
                          ] : []}
                        >
                          <Input prefix={<MailOutlined />} placeholder="email@ejemplo.com" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="primaryPassword"
                          label="Contraseña"
                          rules={formData.createNewFamily ? [
                            { required: true, message: 'La contraseña es requerida' },
                            { min: 6, message: 'Mínimo 6 caracteres' }
                          ] : []}
                        >
                          <Input.Password placeholder="Contraseña para el acceso" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="primaryPhone"
                          label="Teléfono"
                          rules={formData.createNewFamily ? [{ required: true, message: 'El teléfono es requerido' }] : []}
                        >
                          <Input prefix={<PhoneOutlined />} placeholder="+34 600 000 000" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          name="relationshipToPrimary"
                          label="Relación con el Estudiante"
                          rules={[{ required: true, message: 'Especifica la relación familiar' }]}
                        >
                          <Select placeholder="Seleccionar relación">
                            <Option value="mother">Madre</Option>
                            <Option value="father">Padre</Option>
                            <Option value="guardian">Tutor/a</Option>
                            <Option value="other">Otro</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item
                          name="primaryDocumentNumber"
                          label="DNI/NIE"
                        >
                          <Input prefix={<IdcardOutlined />} placeholder="12345678A" />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
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
                      </Col>
                    </Row>

                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          name="primaryAddress"
                          label="Dirección"
                        >
                          <Input prefix={<HomeOutlined />} placeholder="Calle Mayor, 123, Madrid" />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="primaryOccupation"
                          label="Ocupación"
                        >
                          <Input placeholder="Profesión o ocupación" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>

                  {/* Secondary Contact Toggle */}
                  <div>
                    <Form.Item name="hasSecondaryContact" valuePropName="checked">
                      <Checkbox
                        checked={formData.hasSecondaryContact}
                        onChange={(e) => {
                          const hasSecondary = e.target.checked
                          form.setFieldValue('hasSecondaryContact', hasSecondary)
                          if (!hasSecondary) {
                            // Clear secondary contact fields
                            const secondaryFields = [
                              'secondaryFirstName', 'secondaryLastName', 'secondaryEmail',
                              'secondaryPassword', 'secondaryPhone', 'secondaryDocumentNumber',
                              'secondaryDateOfBirth', 'secondaryAddress', 'secondaryOccupation',
                              'relationshipToSecondary'
                            ]
                            secondaryFields.forEach(field => form.setFieldValue(field as any, undefined))
                          } else {
                            // Set default relationship for secondary contact
                            const primaryRelationship = form.getFieldValue('relationshipToPrimary')
                            const defaultSecondaryRelationship = primaryRelationship === 'mother' ? 'father' : 'mother'
                            form.setFieldValue('relationshipToSecondary', defaultSecondaryRelationship)
                          }
                        }}
                      >
                        Añadir contacto secundario (doble acceso familiar)
                      </Checkbox>
                    </Form.Item>

                    {formData.hasSecondaryContact && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <Title level={4}>Contacto Secundario</Title>
                        <Alert
                          message="Doble Acceso Familiar"
                          description="El contacto secundario tendrá acceso independiente al sistema para el seguimiento del estudiante."
                          type="success"
                          showIcon
                          className="mb-4"
                        />

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              name="secondaryFirstName"
                              label="Nombre"
                              rules={formData.hasSecondaryContact ? [{ required: true, message: 'El nombre es requerido' }] : []}
                            >
                              <Input placeholder="Nombre del contacto secundario" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name="secondaryLastName"
                              label="Apellidos"
                              rules={formData.hasSecondaryContact ? [{ required: true, message: 'Los apellidos son requeridos' }] : []}
                            >
                              <Input placeholder="Apellidos del contacto secundario" />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item
                              name="secondaryEmail"
                              label="Email"
                              rules={formData.hasSecondaryContact ? [
                                { required: true, message: 'El email es requerido' },
                                { type: 'email', message: 'Email no válido' }
                              ] : []}
                            >
                              <Input prefix={<MailOutlined />} placeholder="email@ejemplo.com" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              name="secondaryPassword"
                              label="Contraseña"
                              rules={formData.hasSecondaryContact ? [
                                { required: true, message: 'La contraseña es requerida' },
                                { min: 6, message: 'Mínimo 6 caracteres' }
                              ] : []}
                            >
                              <Input.Password placeholder="Contraseña para el acceso" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              name="secondaryPhone"
                              label="Teléfono"
                              rules={formData.hasSecondaryContact ? [{ required: true, message: 'El teléfono es requerido' }] : []}
                            >
                              <Input prefix={<PhoneOutlined />} placeholder="+34 600 000 000" />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={8}>
                            <Form.Item
                              name="relationshipToSecondary"
                              label="Relación con el Estudiante"
                              rules={formData.hasSecondaryContact ? [{ required: true, message: 'Especifica la relación familiar' }] : []}
                            >
                              <Select placeholder="Seleccionar relación">
                                <Option value="mother">Madre</Option>
                                <Option value="father">Padre</Option>
                                <Option value="guardian">Tutor/a</Option>
                                <Option value="other">Otro</Option>
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item
                              name="secondaryDocumentNumber"
                              label="DNI/NIE"
                            >
                              <Input prefix={<IdcardOutlined />} placeholder="12345678A" />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
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
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col span={12}>
                            <Form.Item
                              name="secondaryAddress"
                              label="Dirección"
                            >
                              <Input prefix={<HomeOutlined />} placeholder="Calle Mayor, 123, Madrid" />
                            </Form.Item>
                          </Col>
                          <Col span={12}>
                            <Form.Item
                              name="secondaryOccupation"
                              label="Ocupación"
                            >
                              <Input placeholder="Profesión o ocupación" />
                            </Form.Item>
                          </Col>
                        </Row>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Relationship for existing family */}
              {!formData.createNewFamily && (
                <Form.Item
                  name="relationshipToPrimary"
                  label="Relación del Estudiante con la Familia"
                  rules={[{ required: true, message: 'Especifica la relación familiar' }]}
                >
                  <Select placeholder="Seleccionar relación">
                    <Option value="mother">Hijo/a de la madre</Option>
                    <Option value="father">Hijo/a del padre</Option>
                    <Option value="guardian">Bajo tutela</Option>
                    <Option value="other">Otra relación</Option>
                  </Select>
                </Form.Item>
              )}
            </div>
          )}

          {/* Step 2: Confirmation */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Alert
                message="Confirmar Inscripción"
                description="Revise todos los datos antes de completar la inscripción. Una vez confirmada, se crearán las cuentas de acceso."
                type="warning"
                showIcon
              />

              <div>
                <Title level={4}>Resumen de Inscripción</Title>
                
                {/* Student Summary */}
                <Card title="Datos del Estudiante" className="mb-4">
                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Nombre Completo:</Text>
                      <div>{form.getFieldValue('studentFirstName')} {form.getFieldValue('studentLastName')}</div>
                    </Col>
                    <Col span={12}>
                      <Text strong>Email:</Text>
                      <div>{form.getFieldValue('studentEmail')}</div>
                    </Col>
                    <Col span={12}>
                      <Text strong>Número de Matrícula:</Text>
                      <div>{form.getFieldValue('enrollmentNumber')}</div>
                    </Col>
                    <Col span={12}>
                      <Text strong>Nivel Educativo:</Text>
                      <div>{educationalLevels.find(l => l.id === form.getFieldValue('educationalLevelId'))?.name}</div>
                    </Col>
                  </Row>
                </Card>

                {/* Family Summary */}
                <Card title="Datos Familiares" size="small">
                  {form.getFieldValue('createNewFamily') ? (
                    <>
                      <div className="mb-4">
                        <Text strong>Contacto Principal:</Text>
                        <div>{form.getFieldValue('primaryFirstName')} {form.getFieldValue('primaryLastName')}</div>
                        <div>{form.getFieldValue('primaryEmail')} • {form.getFieldValue('primaryPhone')}</div>
                      </div>
                      
                      {form.getFieldValue('hasSecondaryContact') && (
                        <div>
                          <Text strong>Contacto Secundario:</Text>
                          <div>{form.getFieldValue('secondaryFirstName')} {form.getFieldValue('secondaryLastName')}</div>
                          <div>{form.getFieldValue('secondaryEmail')} • {form.getFieldValue('secondaryPhone')}</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div>
                      <Text strong>Familia Existente:</Text>
                      <div>Se asignará a la familia seleccionada</div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            <Button 
              onClick={prevStep} 
              disabled={currentStep === 0}
            >
              Anterior
            </Button>
            
            <div className="flex gap-2">
              <Button onClick={() => safeNavigate('/admin')}>
                Cancelar
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button type="primary" onClick={nextStep}>
                  Siguiente
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  onClick={handleSubmit}
                  loading={submitting}
                >
                  Completar Inscripción
                </Button>
              )}
            </div>
          </div>
        </Form>
      </Card>

      {/* Draft Preview Modal */}
      <Modal
        title="Vista Previa del Borrador"
        open={showDraftModal}
        onCancel={() => setShowDraftModal(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setShowDraftModal(false)}>
            Cancelar
          </Button>,
          <Button key="load" type="primary" onClick={loadDraftFromModal}>
            Cargar Borrador
          </Button>,
        ]}
      >
        {draftData && (
          <div className="space-y-4">
            {/* Draft Info */}
            <Alert
              message="Información del Borrador"
              description={
                <div>
                  <div>Guardado el: {draftData.savedAt ? new Date(draftData.savedAt).toLocaleString() : 'No disponible'}</div>
                  <div>Paso actual: {draftData.currentStep + 1} de {steps.length}</div>
                </div>
              }
              type="info"
              showIcon
            />

            {/* Student Data Preview */}
            <Card title="Datos del Estudiante" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Nombre:</Text>
                  <div>{draftData.studentFirstName || 'No especificado'}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Apellidos:</Text>
                  <div>{draftData.studentLastName || 'No especificado'}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Email:</Text>
                  <div>{draftData.studentEmail || 'No especificado'}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Número de Matrícula:</Text>
                  <div>{draftData.enrollmentNumber || 'No especificado'}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Nivel Educativo:</Text>
                  <div>{educationalLevels.find(l => l.id === draftData.educationalLevelId)?.name || 'No especificado'}</div>
                </Col>
                <Col span={12}>
                  <Text strong>Fecha de Nacimiento:</Text>
                  <div>{draftData.studentBirthDate ? dayjs(draftData.studentBirthDate).format('DD/MM/YYYY') : 'No especificado'}</div>
                </Col>
              </Row>
            </Card>

            {/* Family Data Preview */}
            <Card title="Datos Familiares" size="small">
              <div className="space-y-3">
                <div>
                  <Text strong>Tipo de Familia:</Text>
                  <div>{draftData.createNewFamily ? 'Nueva familia' : 'Familia existente'}</div>
                </div>
                
                {draftData.createNewFamily && (
                  <>
                    <Divider />
                    <div>
                      <Text strong>Contacto Principal:</Text>
                      <div>{draftData.primaryFirstName} {draftData.primaryLastName}</div>
                      <div>{draftData.primaryEmail} • {draftData.primaryPhone}</div>
                    </div>
                    
                    {draftData.hasSecondaryContact && (
                      <div>
                        <Text strong>Contacto Secundario:</Text>
                        <div>{draftData.secondaryFirstName} {draftData.secondaryLastName}</div>
                        <div>{draftData.secondaryEmail} • {draftData.secondaryPhone}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        )}
      </Modal>

      {/* Bulk Import Modal */}
      <BulkImportModal
        visible={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={(result) => {
          console.log('Bulk import successful:', result);
          message.success(`Importación completada: ${result.successfulImports} estudiantes inscritos`);
          setShowBulkImportModal(false);
          // Optionally refresh the page or navigate to students list
          if (result.successfulImports > 0) {
            safeNavigate('/admin/students');
          }
        }}
      />

      {/* Simplified Bulk Import Modal */}
      <SimplifiedBulkImportModal
        visible={showSimplifiedBulkImportModal}
        onClose={() => setShowSimplifiedBulkImportModal(false)}
        onSuccess={(result) => {
          console.log('Simplified bulk import successful:', result);
          message.success(`Subida simplificada completada: ${result.successfulImports} usuarios creados`);
          setShowSimplifiedBulkImportModal(false);
          // Optionally refresh the page or navigate to students list
          if (result.successfulImports > 0) {
            safeNavigate('/admin/students');
          }
        }}
      />
    </div>
  )
}

export default EnrollmentPage