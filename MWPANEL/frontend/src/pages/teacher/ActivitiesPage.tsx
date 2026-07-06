import React, { useState, useEffect } from 'react'
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
  Progress,
  Tooltip,
  Row,
  Col,
  Statistic,
  DatePicker,
  Radio,
  InputNumber,
  Switch,
  Drawer,
  List,
  Avatar,
  Badge,
  Spin,
  Popconfirm,
  Checkbox,
  Alert,
  Divider,
  Empty,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  BookOutlined,
  TrophyOutlined,
  SmileOutlined,
  MehOutlined,
  FrownOutlined,
  CalendarOutlined,
  QuestionCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import apiClient from '@services/apiClient'
import { Rubric, useRubrics } from '../../hooks/useRubrics'
import RubricAssessment from '../../components/rubrics/RubricAssessment'
import SectionInfoBanner from '../../components/common/SectionInfoBanner'
import AcademicYearSelector from '../../components/common/AcademicYearSelector'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

interface Activity {
  id: string
  name: string
  description?: string
  assignedDate: string
  reviewDate?: string
  valuationType: 'emoji' | 'score' | 'rubric'
  maxScore?: number
  notifyFamilies: boolean
  isActive: boolean
  createdAt: string
  classGroup: {
    id: string
    name: string
  }
  assessments: ActivityAssessment[]
  rubricId?: string
  rubric?: {
    id: string
    name: string
    maxScore: number
    criteriaCount: number
    levelsCount: number
  }
}

interface ActivityAssessment {
  id: string
  value?: string
  comment?: string
  isAssessed: boolean
  assessedAt?: string
  student: {
    id: string
    user: {
      profile: {
        firstName: string
        lastName: string
      }
    }
  }
}

interface ClassGroup {
  id: string
  name: string
}

interface SubjectAssignment {
  id: string
  subject: {
    id: string
    name: string
    code: string
  }
  classGroup: {
    id: string
    name: string
  }
  academicYear: {
    id: string
    name: string
  }
  weeklyHours: number
  students: Array<{
    id: string
    enrollmentNumber: string
    user: {
      profile: {
        firstName: string
        lastName: string
      }
    }
  }>
}

interface ActivityStatistics {
  activityId: string
  activityName: string
  totalStudents: number
  assessedStudents: number
  pendingStudents: number
  completionPercentage: number
  emojiDistribution?: {
    happy: number
    neutral: number
    sad: number
  }
  scoreStatistics?: {
    average: number
    min: number
    max: number
    maxPossible: number
  }
}

interface TeacherSummary {
  todayActivities: number
  pendingAssessments: number
  weekAssessments: number
  positiveRatio: number
}

const ActivitiesPage: React.FC = () => {
  // Hook de rúbricas
  const { rubrics, fetchRubrics } = useRubrics()
  
  // Estados principales
  const [activities, setActivities] = useState<Activity[]>([])
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([])
  const [subjectAssignments, setSubjectAssignments] = useState<SubjectAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedClassGroup, setSelectedClassGroup] = useState<string>()
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined)
  const [yearIsArchived, setYearIsArchived] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [summary, setSummary] = useState<TeacherSummary | null>(null)
  const [targetStudents, setTargetStudents] = useState<string[]>([])

  // Estados de modales y formularios
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [assessmentDrawerVisible, setAssessmentDrawerVisible] = useState(false)
  const [statisticsModalVisible, setStatisticsModalVisible] = useState(false)
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [statistics, setStatistics] = useState<ActivityStatistics | null>(null)

  // Estados de formularios
  const [createForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [duplicateForm] = Form.useForm()

  // Estados de valoración
  const [bulkAssessmentMode, setBulkAssessmentMode] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [bulkValue, setBulkValue] = useState<string>('')
  const [bulkComment, setBulkComment] = useState<string>('')
  
  // Estados específicos para evaluación con rúbricas
  const [rubricAssessmentModalVisible, setRubricAssessmentModalVisible] = useState(false)
  const [assessingStudent, setAssessingStudent] = useState<any>(null)
  
  // Estados para modal de calificación
  const [gradingModalOpen, setGradingModalOpen] = useState(false)
  const [activityToGrade, setActivityToGrade] = useState<Activity | null>(null)
  const [gradingSubmissions, setGradingSubmissions] = useState<any[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [savingGrade, setSavingGrade] = useState(false)
  const [gradingForm] = Form.useForm()

  // Estados para vista por asignaturas
  const [viewMode, setViewMode] = useState<'list' | 'subjects'>('subjects')
  const [subjectSummaries, setSubjectSummaries] = useState<any[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null)
  const [subjectActivities, setSubjectActivities] = useState<Activity[]>([])

  useEffect(() => {
    if (viewMode === 'list') {
      fetchActivities()
      fetchClassGroups()
    }
    fetchSubjectAssignments()
    fetchTeacherSummary()
    fetchRubrics(true) // Cargar rúbricas incluyendo templates
  }, [selectedClassGroup, dateRange, viewMode, selectedYearId])

  useEffect(() => {
    if (viewMode === 'subjects') {
      fetchSubjectSummaries()
    }
  }, [viewMode, subjectAssignments]) // Agregamos subjectAssignments como dependencia

  // Cargar subjectSummaries inicialmente cuando tenemos subjectAssignments
  useEffect(() => {
    if (subjectAssignments.length > 0 && viewMode === 'subjects') {
      fetchSubjectSummaries()
    }
  }, [subjectAssignments])

  useEffect(() => {
    if (selectedSubjectId) {
      fetchSubjectActivities(selectedSubjectId)
    }
  }, [selectedSubjectId])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (selectedClassGroup) {
        params.append('classGroupId', selectedClassGroup)
      }
      
      if (dateRange) {
        params.append('startDate', dateRange[0].format('YYYY-MM-DD'))
        params.append('endDate', dateRange[1].format('YYYY-MM-DD'))
      }

      if (selectedYearId) {
        params.append('academicYearId', selectedYearId)
      }

      const response = await apiClient.get(`/activities?${params.toString()}`)
      setActivities(response.data)
    } catch (error: any) {
      console.error('Error fetching activities:', error)
      message.error('Error al cargar actividades')
    } finally {
      setLoading(false)
    }
  }

  const fetchClassGroups = async () => {
    try {
      const response = await apiClient.get('/class-groups/my-classes')
      setClassGroups(response.data)
    } catch (error: any) {
      console.error('Error fetching class groups:', error)
    }
  }

  const fetchSubjectAssignments = async () => {
    try {
      const response = await apiClient.get('/activities/teacher/subject-assignments')
      setSubjectAssignments(response.data)
    } catch (error: any) {
      console.error('Error fetching subject assignments:', error)
    }
  }

  const fetchTeacherSummary = async () => {
    try {
      const response = await apiClient.get('/activities/summary')
      setSummary(response.data)
    } catch (error: any) {
      console.error('Error fetching teacher summary:', error)
    }
  }

  const fetchSubjectSummaries = async () => {
    try {
      setLoading(true)
      const summariesPromises = subjectAssignments.map(async (assignment) => {
        try {
          const response = await apiClient.get(`/activities/subject/${assignment.id}/summary`)
          return {
            ...response.data,
            assignment,
          }
        } catch (error) {
          return {
            assignment,
            totalActivities: 0,
            activeActivities: 0,
            archivedActivities: 0,
            templatesCount: 0,
            pendingAssessments: 0,
            weekCompletedAssessments: 0,
            positiveRatio: 0,
          }
        }
      })
      
      const summaries = await Promise.all(summariesPromises)
      setSubjectSummaries(summaries)
    } catch (error: any) {
      console.error('Error fetching subject summaries:', error)
      message.error('Error al cargar resúmenes de asignaturas')
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjectActivities = async (subjectAssignmentId: string) => {
    try {
      setLoading(true)
      const response = await apiClient.get(`/activities/subject/${subjectAssignmentId}`)
      setSubjectActivities(response.data)
    } catch (error: any) {
      console.error('Error fetching subject activities:', error)
      message.error('Error al cargar actividades de la asignatura')
    } finally {
      setLoading(false)
    }
  }

  const fetchActivityStatistics = async (activityId: string) => {
    try {
      const response = await apiClient.get(`/activities/${activityId}/statistics`)
      setStatistics(response.data)
    } catch (error: any) {
      message.error('Error al cargar estadísticas')
    }
  }

  const handleCreateActivity = async (values: any) => {
    try {
      const activityData = {
        ...values,
        assignedDate: values.assignedDate.format('YYYY-MM-DD'),
        reviewDate: values.reviewDate ? values.reviewDate.format('YYYY-MM-DD') : undefined,
        notifyFamilies: values.notifyFamilies ?? true,
        notifyOnHappy: values.notifyOnHappy ?? false,
        notifyOnNeutral: values.notifyOnNeutral ?? true,
        notifyOnSad: values.notifyOnSad ?? true,
        targetStudentIds: targetStudents.length > 0 ? targetStudents : undefined,
      }

      await apiClient.post('/activities', activityData)
      message.success('Actividad creada exitosamente')
      setCreateModalVisible(false)
      createForm.resetFields()
      setTargetStudents([])
      fetchActivities()
      fetchTeacherSummary()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al crear actividad'
      message.error(errorMessage)
    }
  }

  const handleEditActivity = async (values: any) => {
    if (!selectedActivity) return

    try {
      const updateData = {
        ...values,
        assignedDate: values.assignedDate.format('YYYY-MM-DD'),
        reviewDate: values.reviewDate ? values.reviewDate.format('YYYY-MM-DD') : null,
      }

      await apiClient.patch(`/activities/${selectedActivity.id}`, updateData)
      message.success('Actividad actualizada exitosamente')
      setEditModalVisible(false)
      setSelectedActivity(null)
      editForm.resetFields()
      fetchActivities()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al actualizar actividad'
      message.error(errorMessage)
    }
  }

  const handleDuplicateActivity = async (values: any) => {
    if (!selectedActivity) return

    try {
      const duplicateData = {
        ...values,
        assignedDate: values.assignedDate.format('YYYY-MM-DD'),
        reviewDate: values.reviewDate ? values.reviewDate.format('YYYY-MM-DD') : null,
      }

      await apiClient.post(`/activities/${selectedActivity.id}/duplicate`, duplicateData)
      message.success('Actividad duplicada exitosamente')
      setDuplicateModalVisible(false)
      setSelectedActivity(null)
      duplicateForm.resetFields()
      fetchActivities()
      fetchTeacherSummary()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al duplicar actividad'
      message.error(errorMessage)
    }
  }

  const handleDeleteActivity = async (activityId: string) => {
    try {
      await apiClient.delete(`/activities/${activityId}`)
      message.success('Actividad eliminada exitosamente')
      fetchActivities()
      fetchTeacherSummary()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al eliminar actividad'
      message.error(errorMessage)
    }
  }

  const handleAssessStudent = async (studentId: string, value: string, comment?: string) => {
    if (!selectedActivity) return

    try {
      await apiClient.post(`/activities/${selectedActivity.id}/assess/${studentId}`, {
        value,
        comment: comment || undefined,
      })

      message.success('Valoración guardada')
      
      // Actualizar la actividad seleccionada
      const updatedActivity = await apiClient.get(`/activities/${selectedActivity.id}`)
      setSelectedActivity(updatedActivity.data)
      
      // Actualizar la lista de actividades
      fetchActivities()
      fetchTeacherSummary()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al guardar valoración'
      message.error(errorMessage)
    }
  }

  const handleBulkAssessment = async () => {
    if (!selectedActivity || !bulkValue) return

    try {
      const bulkData: any = {
        value: bulkValue,
        comment: bulkComment || undefined,
      }

      if (selectedStudents.length > 0) {
        bulkData.studentIds = selectedStudents
      }

      await apiClient.post(`/activities/${selectedActivity.id}/bulk-assess`, bulkData)
      
      const targetCount = selectedStudents.length > 0 ? selectedStudents.length : selectedActivity.assessments.length
      message.success(`Valoración aplicada a ${targetCount} estudiantes`)
      
      // Resetear estado de valoración masiva
      setBulkAssessmentMode(false)
      setSelectedStudents([])
      setBulkValue('')
      setBulkComment('')
      
      // Actualizar datos
      const updatedActivity = await apiClient.get(`/activities/${selectedActivity.id}`)
      setSelectedActivity(updatedActivity.data)
      fetchActivities()
      fetchTeacherSummary()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error en valoración masiva'
      message.error(errorMessage)
    }
  }

  // Manejar evaluación con rúbrica
  const handleRubricAssessment = (student: any) => {
    if (!selectedActivity || selectedActivity.valuationType !== 'rubric') return
    
    setAssessingStudent(student)
    setRubricAssessmentModalVisible(true)
  }

  // Completar evaluación con rúbrica
  const handleRubricAssessmentComplete = async (assessment: any) => {
    try {
      message.success('Evaluación con rúbrica guardada exitosamente')
      setRubricAssessmentModalVisible(false)
      setAssessingStudent(null)
      
      // Actualizar la actividad seleccionada
      const updatedActivity = await apiClient.get(`/activities/${selectedActivity!.id}`)
      setSelectedActivity(updatedActivity.data)
      
      // Actualizar la lista de actividades
      fetchActivities()
      fetchTeacherSummary()
    } catch (error: any) {
      console.error('Error updating activity after rubric assessment:', error)
    }
  }

  // Abrir modal de calificación para actividades
  const openGradingModal = async (activity: Activity) => {
    setActivityToGrade(activity)
    setLoadingSubmissions(true)
    setGradingModalOpen(true)
    
    try {
      // Cargar assessments que necesitan calificación (evaluados pero sin puntuación)
      const assessmentsToGrade = activity.assessments.filter(a => a.isAssessed && !a.value)
      setGradingSubmissions(assessmentsToGrade)
    } catch (error) {
      console.error('Error loading assessments:', error)
      message.error('Error al cargar las evaluaciones')
      setGradingSubmissions([])
    } finally {
      setLoadingSubmissions(false)
    }
  }

  // Guardar calificación de actividad
  const handleSaveActivityGrade = async (assessmentId: string, values: any) => {
    try {
      setSavingGrade(true)
      await apiClient.patch(`/activities/${activityToGrade!.id}/assess/${assessmentId}`, {
        value: values.score.toString(),
        comment: values.feedback || undefined
      })
      
      message.success('Calificación guardada correctamente')
      
      // Actualizar la lista de evaluaciones
      setGradingSubmissions(prev => 
        prev.filter(sub => sub.id !== assessmentId)
      )
      
      // Si no quedan más evaluaciones, cerrar el modal
      if (gradingSubmissions.length <= 1) {
        setGradingModalOpen(false)
        fetchActivities() // Refrescar el dashboard
        fetchTeacherSummary()
      }
      
      gradingForm.resetFields()
    } catch (error: any) {
      console.error('Error saving activity grade:', error)
      message.error(error.response?.data?.message || 'Error al guardar la calificación')
    } finally {
      setSavingGrade(false)
    }
  }

  const openEditModal = (activity: Activity) => {
    setSelectedActivity(activity)
    editForm.setFieldsValue({
      name: activity.name,
      description: activity.description,
      classGroupId: activity.classGroup.id,
      valuationType: activity.valuationType,
      maxScore: activity.maxScore,
      rubricId: activity.rubricId,
      assignedDate: dayjs(activity.assignedDate),
      reviewDate: activity.reviewDate ? dayjs(activity.reviewDate) : null,
      notifyFamilies: activity.notifyFamilies,
    })
    setEditModalVisible(true)
  }

  const openDuplicateModal = (activity: Activity) => {
    setSelectedActivity(activity)
    const tomorrow = dayjs().add(1, 'day')
    duplicateForm.setFieldsValue({
      name: `${activity.name} - Copia`,
      description: activity.description,
      assignedDate: tomorrow,
      reviewDate: null,
      classGroupId: activity.classGroup.id,
      valuationType: activity.valuationType,
      maxScore: activity.maxScore,
      notifyFamilies: activity.notifyFamilies,
    })
    setDuplicateModalVisible(true)
  }

  const openAssessmentDrawer = (activity: Activity) => {
    setSelectedActivity(activity)
    setAssessmentDrawerVisible(true)
  }

  const openStatisticsModal = async (activity: Activity) => {
    setSelectedActivity(activity)
    setStatisticsModalVisible(true)
    await fetchActivityStatistics(activity.id)
  }

  const getEmojiIcon = (value: string) => {
    switch (value) {
      case 'happy': return <SmileOutlined style={{ color: '#52c41a', fontSize: '16px' }} />
      case 'neutral': return <MehOutlined style={{ color: '#faad14', fontSize: '16px' }} />
      case 'sad': return <FrownOutlined style={{ color: '#ff4d4f', fontSize: '16px' }} />
      default: return <QuestionCircleOutlined style={{ color: '#d9d9d9', fontSize: '16px' }} />
    }
  }

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return '#52c41a'
    if (percentage >= 60) return '#faad14'
    return '#ff4d4f'
  }

  // Filtrar actividades según búsqueda
  const filteredActivities = activities.filter(activity =>
    activity.name.toLowerCase().includes(searchText.toLowerCase()) ||
    activity.description?.toLowerCase().includes(searchText.toLowerCase()) ||
    activity.classGroup.name.toLowerCase().includes(searchText.toLowerCase())
  )

  // Columnas de la tabla
  const columns: ColumnsType<Activity> = [
    {
      title: 'Actividad',
      key: 'name',
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{record.name}</Text>
          {record.description && (
            <Text type="secondary" className="text-sm">
              {record.description}
            </Text>
          )}
          <Space>
            <Tag color="blue">{record.classGroup.name}</Tag>
            <Tag color={record.valuationType === 'emoji' ? 'green' : record.valuationType === 'score' ? 'orange' : 'purple'}>
              {record.valuationType === 'emoji' ? 'Emojis' : 
               record.valuationType === 'score' ? `Puntuación (/${record.maxScore})` :
               `Rúbrica (${record.rubric?.name || 'N/A'})`}
            </Tag>
            {record.rubric && (
              <Tag color="purple" style={{ fontSize: '10px' }}>
                {record.rubric.criteriaCount}C × {record.rubric.levelsCount}N
              </Tag>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'assignedDate',
      key: 'assignedDate',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a, b) => dayjs(a.assignedDate).unix() - dayjs(b.assignedDate).unix(),
    },
    {
      title: 'Progreso',
      key: 'progress',
      render: (_, record) => {
        const assessed = record.assessments.filter(a => a.isAssessed).length
        const total = record.assessments.length
        const percentage = total > 0 ? Math.round((assessed / total) * 100) : 0
        
        return (
          <Space direction="vertical" size="small">
            <Progress 
              percent={percentage} 
              
              strokeColor={getCompletionColor(percentage)}
              format={() => `${assessed}/${total}`}
            />
            <Text type="secondary" className="text-xs">
              {assessed} de {total} valorados
            </Text>
          </Space>
        )
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Ver valoraciones">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              onClick={() => openAssessmentDrawer(record)}
            />
          </Tooltip>
          <Tooltip title="Estadísticas">
            <Button 
              type="text" 
              icon={<BarChartOutlined />}
              onClick={() => openStatisticsModal(record)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
              disabled={yearIsArchived}
            />
          </Tooltip>
          <Tooltip title="Duplicar">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => openDuplicateModal(record)}
              disabled={yearIsArchived}
            />
          </Tooltip>
          <Popconfirm
            title="¿Estás seguro de eliminar esta actividad?"
            onConfirm={() => handleDeleteActivity(record.id)}
            okText="Sí"
            cancelText="No"
            disabled={yearIsArchived}
          >
            <Tooltip title="Eliminar">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                disabled={yearIsArchived}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="activities-page">
      <SectionInfoBanner text="Valoración rápida del día a día en clase (emoji, nota o rúbrica)." />
      {/* Estadísticas del profesor */}
      {summary && (
        <Row gutter={16} className="mb-6">
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Actividades de Hoy"
                value={summary.todayActivities}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Pendientes de Valorar"
                value={summary.pendingAssessments}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Valoraciones esta Semana"
                value={summary.weekAssessments}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="Ratio Positivo"
                value={summary.positiveRatio}
                suffix="%"
                prefix={<TrophyOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Selector de vista y controles */}
      <Card className="mb-4">
        <Row gutter={16} align="middle">
          <Col xs={24} md={4}>
            <Radio.Group 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)}
              buttonStyle="solid"
              className="w-full"
            >
              <Radio.Button value="list" className="w-1/2 text-center">
                Lista
              </Radio.Button>
              <Radio.Button value="subjects" className="w-1/2 text-center">
                Asignaturas
              </Radio.Button>
            </Radio.Group>
          </Col>

          {viewMode === 'list' && (
            <Col xs={24} md={5}>
              <AcademicYearSelector
                value={selectedYearId}
                onChange={setSelectedYearId}
                onYearMetaChange={(m) => setYearIsArchived(m.isArchived)}
              />
            </Col>
          )}

          {viewMode === 'list' && (
            <>
              <Col xs={24} md={6}>
                <Input
                  placeholder="Buscar actividades..."
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </Col>
              <Col xs={24} md={5}>
                <Select
                  placeholder="Filtrar por grupo"
                  allowClear
                  value={selectedClassGroup}
                  onChange={setSelectedClassGroup}
                  className="w-full"
                >
                  {classGroups.map(group => (
                    <Option key={group.id} value={group.id}>
                      {group.name}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} md={5}>
                <DatePicker.RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                  format="DD/MM/YYYY"
                  placeholder={['Fecha inicio', 'Fecha fin']}
                  className="w-full"
                />
              </Col>
            </>
          )}
          
          {viewMode === 'subjects' && selectedSubjectId && (
            <Col xs={24} md={16}>
              <Button
                type="default"
                onClick={() => setSelectedSubjectId(null)}
              >
                ← Volver a asignaturas
              </Button>
            </Col>
          )}
          
          {!yearIsArchived && (
            <Col xs={24} md={4}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalVisible(true)}
                className="w-full"
              >
                Nueva Actividad
              </Button>
            </Col>
          )}
        </Row>
        {yearIsArchived && (
          <Row className="mt-3">
            <Col span={24}>
              <Alert type="info" showIcon message="Año archivado — solo consulta" />
            </Col>
          </Row>
        )}
      </Card>

      {/* Vista por lista */}
      {viewMode === 'list' && (
        <Card>
          <Table
            columns={columns}
            dataSource={filteredActivities}
            rowKey="id"
            loading={loading}
            pagination={{
              total: filteredActivities.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} de ${total} actividades`,
            }}
          />
        </Card>
      )}

      {/* Vista por asignaturas */}
      {viewMode === 'subjects' && !selectedSubjectId && (
        <Row gutter={16}>
          {subjectSummaries.map((summary) => (
            <Col key={summary.assignment.id} xs={24} sm={12} lg={8} xl={6} className="mb-4">
              <Card
                hoverable
                onClick={() => setSelectedSubjectId(summary.assignment.id)}
                className="subject-card h-full"
              >
                <div className="text-center">
                  <Avatar
                    size={64}
                    style={{ 
                      backgroundColor: '#1890ff',
                      fontSize: '24px',
                      marginBottom: '16px'
                    }}
                    icon={<BookOutlined />}
                  />
                  <Title level={4} className="mb-2">
                    {summary.assignment.subject.name}
                  </Title>
                  <Text type="secondary" className="block mb-3">
                    {summary.assignment.subject.code} • {summary.assignment.classGroup.name}
                  </Text>
                  
                  <Row gutter={8} className="text-center">
                    <Col span={12}>
                      <Statistic
                        title="Actividades"
                        value={summary.activeActivities}
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Pendientes"
                        value={summary.pendingAssessments}
                        valueStyle={{ fontSize: '16px', color: '#faad14' }}
                      />
                    </Col>
                  </Row>
                  
                  <div className="mt-3">
                    <Progress
                      percent={Math.round(summary.positiveRatio || 0)}
                      size="small"
                      strokeColor="#52c41a"
                      format={(percent) => `${percent}% positivo`}
                    />
                  </div>
                  
                  {summary.templatesCount > 0 && (
                    <Badge
                      count={`${summary.templatesCount} plantillas`}
                      style={{ backgroundColor: '#722ed1' }}
                      className="mt-2"
                    />
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Vista de actividades de una asignatura específica */}
      {viewMode === 'subjects' && selectedSubjectId && (
        <Card
          title={
            <div className="flex items-center gap-3">
              <BookOutlined />
              <span>
                {subjectSummaries.find(s => s.assignment.id === selectedSubjectId)?.assignment.subject.name}
              </span>
            </div>
          }
        >
          <Table
            columns={columns}
            dataSource={subjectActivities}
            rowKey="id"
            loading={loading}
            pagination={{
              total: subjectActivities.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `${range[0]}-${range[1]} de ${total} actividades`,
            }}
          />
        </Card>
      )}

      {/* Modal crear actividad */}
      <Modal
        title="Nueva Actividad Diaria"
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false)
          createForm.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateActivity}
          initialValues={{
            valuationType: 'emoji',
            notifyFamilies: true,
            notifyOnHappy: false,
            notifyOnNeutral: true,
            notifyOnSad: true,
          }}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="name"
                label="Nombre de la Actividad"
                rules={[{ required: true, message: 'El nombre es requerido' }]}
              >
                <Input placeholder="Ej: Ejercicios de matemáticas" />
              </Form.Item>
            </Col>
            
            <Col span={24}>
              <Form.Item name="description" label="Descripción (opcional)">
                <TextArea 
                  rows={3} 
                  placeholder="Descripción detallada de la actividad..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                name="subjectAssignmentId"
                label="Asignatura"
                rules={[{ required: true, message: 'Selecciona una asignatura' }]}
              >
                <Select 
                  placeholder="Seleccionar asignatura"
                  onChange={(value) => {
                    const assignment = subjectAssignments.find(a => a.id === value)
                    if (assignment) {
                      createForm.setFieldsValue({ classGroupId: assignment.classGroup.id })
                    }
                  }}
                >
                  {subjectAssignments.map(assignment => (
                    <Option key={assignment.id} value={assignment.id}>
                      <div>
                        <strong>{assignment.subject.name}</strong> ({assignment.subject.code})
                        <br />
                        <Text type="secondary">{assignment.classGroup.name}</Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Form.Item name="classGroupId" hidden>
              <Input />
            </Form.Item>

            {/* Campo hidden para maxScore cuando se usa rúbrica */}
            <Form.Item name="maxScore" hidden>
              <InputNumber />
            </Form.Item>

            <Col span={12}>
              <Form.Item
                name="assignedDate"
                label="Fecha de Asignación"
                rules={[{ required: true, message: 'La fecha es requerida' }]}
              >
                <DatePicker 
                  className="w-full" 
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="reviewDate" label="Fecha de Revisión (opcional)">
                <DatePicker 
                  className="w-full" 
                  format="DD/MM/YYYY"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="valuationType"
                label="Tipo de Valoración"
                rules={[{ required: true }]}
              >
                <Radio.Group>
                  <Radio value="emoji">Emojis</Radio>
                  <Radio value="score">Puntuación</Radio>
                  <Radio value="rubric">Rúbrica</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.subjectAssignmentId !== curr.subjectAssignmentId}>
              {({ getFieldValue }) => {
                const assignmentId = getFieldValue('subjectAssignmentId')
                const assignment = subjectAssignments.find(a => a.id === assignmentId)
                
                return assignment && (
                  <Col span={24}>
                    <Form.Item label="Estudiantes (opcional - por defecto todos)">
                      <Checkbox.Group
                        value={targetStudents}
                        onChange={setTargetStudents}
                        className="w-full"
                      >
                        <Row gutter={[8, 8]}>
                          {assignment.students.map(student => (
                            <Col key={student.id} span={12}>
                              <Checkbox value={student.id}>
                                {student.user.profile.firstName} {student.user.profile.lastName}
                              </Checkbox>
                            </Col>
                          ))}
                        </Row>
                      </Checkbox.Group>
                      <div className="mt-2">
                        <Button 
                          
                          onClick={() => setTargetStudents(assignment.students.map(s => s.id))}
                        >
                          Seleccionar todos
                        </Button>
                        <Button 
                          
                          style={{ marginLeft: 8 }}
                          onClick={() => setTargetStudents([])}
                        >
                          Limpiar selección
                        </Button>
                      </div>
                    </Form.Item>
                  </Col>
                )
              }}
            </Form.Item>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.valuationType !== curr.valuationType}>
              {({ getFieldValue }) => {
                const valuationType = getFieldValue('valuationType')
                
                if (valuationType === 'score') {
                  return (
                    <Col span={24}>
                      <Form.Item
                        name="maxScore"
                        label="Puntuación Máxima"
                        rules={[
                          { required: true, message: 'La puntuación máxima es requerida' },
                          { type: 'number', min: 1, max: 100, message: 'Entre 1 y 100' }
                        ]}
                      >
                        <InputNumber 
                          min={1} 
                          max={100} 
                          className="w-full"
                          placeholder="Ej: 10"
                        />
                      </Form.Item>
                    </Col>
                  )
                }
                
                if (valuationType === 'rubric') {
                  // Filtrar rúbricas activas
                  const activeRubrics = rubrics.filter(r => r.status === 'active')
                  
                  return (
                    <Col span={24}>
                      <Form.Item
                        name="rubricId"
                        label="Seleccionar Rúbrica"
                        rules={[{ required: true, message: 'Selecciona una rúbrica' }]}
                      >
                        <Select 
                          placeholder="Seleccionar rúbrica para evaluación"
                          className="w-full"
                          showSearch
                          optionFilterProp="children"
                          onChange={(rubricId) => {
                            // Auto-completar maxScore basado en la rúbrica seleccionada
                            const selectedRubric = activeRubrics.find(r => r.id === rubricId)
                            if (selectedRubric) {
                              createForm.setFieldsValue({ maxScore: selectedRubric.maxScore })
                            }
                          }}
                        >
                          {activeRubrics.map(rubric => (
                            <Option key={rubric.id} value={rubric.id}>
                              <div>
                                <Text strong>{rubric.name}</Text>
                                <br />
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {rubric.criteriaCount} criterios × {rubric.levelsCount} niveles - Máx: {rubric.maxScore} pts
                                </Text>
                                {rubric.description && (
                                  <>
                                    <br />
                                    <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                                      {rubric.description}
                                    </Text>
                                  </>
                                )}
                              </div>
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                      
                      {activeRubrics.length === 0 && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          No hay rúbricas activas disponibles. Puedes crear una desde la sección de Rúbricas.
                        </Text>
                      )}
                    </Col>
                  )
                }
                
                return null
              }}
            </Form.Item>

            <Col span={24}>
              <Form.Item name="notifyFamilies" valuePropName="checked">
                <Switch checkedChildren="Notificar a las familias" unCheckedChildren="No notificar" />
              </Form.Item>
            </Col>

            <Form.Item noStyle shouldUpdate={(prev, curr) => 
              prev.notifyFamilies !== curr.notifyFamilies || prev.valuationType !== curr.valuationType
            }>
              {({ getFieldValue }) => 
                getFieldValue('notifyFamilies') && getFieldValue('valuationType') === 'emoji' && (
                  <Col span={24}>
                    <Card title="Configuración de Notificaciones por Emoji" style={{ backgroundColor: '#f6ffed' }}>
                      <Space direction="vertical" className="w-full">
                        <Typography.Text type="secondary">
                          Selecciona en qué casos se notificará a las familias:
                        </Typography.Text>
                        
                        <Form.Item name="notifyOnHappy" valuePropName="checked" className="mb-2">
                          <Checkbox>
                            <Space>
                              <SmileOutlined style={{ color: '#52c41a' }} />
                              Notificar cuando esté <Typography.Text strong style={{ color: '#52c41a' }}>Feliz</Typography.Text>
                            </Space>
                          </Checkbox>
                        </Form.Item>

                        <Form.Item name="notifyOnNeutral" valuePropName="checked" className="mb-2">
                          <Checkbox>
                            <Space>
                              <MehOutlined style={{ color: '#faad14' }} />
                              Notificar cuando esté <Typography.Text strong style={{ color: '#faad14' }}>Normal</Typography.Text>
                            </Space>
                          </Checkbox>
                        </Form.Item>

                        <Form.Item name="notifyOnSad" valuePropName="checked" className="mb-0">
                          <Checkbox>
                            <Space>
                              <FrownOutlined style={{ color: '#ff4d4f' }} />
                              Notificar cuando esté <Typography.Text strong style={{ color: '#ff4d4f' }}>Triste</Typography.Text>
                            </Space>
                          </Checkbox>
                        </Form.Item>
                      </Space>
                    </Card>
                  </Col>
                )
              }
            </Form.Item>
          </Row>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => {
              setCreateModalVisible(false)
              createForm.resetFields()
            }}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              Crear Actividad
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal editar actividad */}
      <Modal
        title="Editar Actividad"
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false)
          setSelectedActivity(null)
          editForm.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditActivity}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="name"
                label="Nombre de la Actividad"
                rules={[{ required: true, message: 'El nombre es requerido' }]}
              >
                <Input />
              </Form.Item>
            </Col>
            
            <Col span={24}>
              <Form.Item name="description" label="Descripción">
                <TextArea rows={3} maxLength={500} showCount />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="assignedDate"
                label="Fecha de Asignación"
                rules={[{ required: true }]}
              >
                <DatePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="reviewDate" label="Fecha de Revisión">
                <DatePicker className="w-full" format="DD/MM/YYYY" />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="valuationType" label="Tipo de Valoración">
                <Radio.Group disabled>
                  <Radio value="emoji">Emojis</Radio>
                  <Radio value="score">Puntuación</Radio>
                  <Radio value="rubric">Rúbrica</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.valuationType !== curr.valuationType}>
              {({ getFieldValue }) => {
                const valuationType = getFieldValue('valuationType')
                
                if (valuationType === 'score') {
                  return (
                    <Col span={12}>
                      <Form.Item name="maxScore" label="Puntuación Máxima">
                        <InputNumber min={1} max={100} className="w-full" disabled />
                      </Form.Item>
                    </Col>
                  )
                }
                
                if (valuationType === 'rubric') {
                  return (
                    <Col span={12}>
                      <Form.Item name="rubricId" label="Rúbrica Asignada">
                        <Select disabled className="w-full">
                          {rubrics.map(rubric => (
                            <Option key={rubric.id} value={rubric.id}>
                              {rubric.name}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                  )
                }
                
                return null
              }}
            </Form.Item>

            <Col span={24}>
              <Form.Item name="notifyFamilies" valuePropName="checked">
                <Switch checkedChildren="Notificar a las familias" unCheckedChildren="No notificar" />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => {
              setEditModalVisible(false)
              setSelectedActivity(null)
              editForm.resetFields()
            }}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              Guardar Cambios
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal duplicar actividad */}
      <Modal
        title="Duplicar Actividad"
        open={duplicateModalVisible}
        onCancel={() => {
          setDuplicateModalVisible(false)
          setSelectedActivity(null)
          duplicateForm.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={duplicateForm}
          layout="vertical"
          onFinish={handleDuplicateActivity}
        >
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="name"
                label="Nombre de la Actividad"
                rules={[{ required: true, message: 'El nombre es requerido' }]}
              >
                <Input 
                  placeholder="Nombre de la actividad duplicada"
                  maxLength={255}
                  showCount
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                name="description"
                label="Descripción"
              >
                <TextArea 
                  rows={3}
                  placeholder="Descripción detallada de la actividad..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Col>

            <Col span={24}>
              <Form.Item
                name="subjectAssignmentId"
                label="Asignatura"
                rules={[{ required: true, message: 'Selecciona una asignatura' }]}
              >
                <Select 
                  placeholder="Seleccionar asignatura"
                  onChange={(value) => {
                    const assignment = subjectAssignments.find(a => a.id === value)
                    if (assignment) {
                      duplicateForm.setFieldsValue({ classGroupId: assignment.classGroup.id })
                    }
                  }}
                >
                  {subjectAssignments.map(assignment => (
                    <Option key={assignment.id} value={assignment.id}>
                      <div>
                        <strong>{assignment.subject.name}</strong> ({assignment.subject.code})
                        <br />
                        <Text type="secondary">{assignment.classGroup.name}</Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Form.Item name="classGroupId" hidden>
              <Input />
            </Form.Item>

            <Col span={12}>
              <Form.Item
                name="assignedDate"
                label="Fecha de Asignación"
                rules={[{ required: true, message: 'La fecha es requerida' }]}
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="Seleccionar fecha"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="reviewDate"
                label="Fecha de Revisión"
              >
                <DatePicker 
                  style={{ width: '100%' }}
                  format="DD/MM/YYYY"
                  placeholder="Fecha opcional de revisión"
                />
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                name="valuationType"
                label="Tipo de Valoración"
                rules={[{ required: true, message: 'Selecciona el tipo de valoración' }]}
              >
                <Select placeholder="Seleccionar tipo">
                  <Option value="emoji">😊 Emojis</Option>
                  <Option value="score">📊 Puntuación</Option>
                  <Option value="rubric">📋 Rúbrica</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.valuationType !== currentValues.valuationType}
              >
                {({ getFieldValue }) => {
                  const valuationType = getFieldValue('valuationType')
                  
                  if (valuationType === 'score') {
                    return (
                      <Form.Item
                        name="maxScore"
                        label="Puntuación Máxima"
                        rules={[{ required: true, message: 'Ingresa la puntuación máxima' }]}
                      >
                        <InputNumber 
                          min={1} 
                          max={100} 
                          style={{ width: '100%' }}
                          placeholder="10"
                        />
                      </Form.Item>
                    )
                  }
                  return null
                }}
              </Form.Item>
            </Col>

            <Col span={24}>
              <Divider orientation="left">Configuración de Notificaciones</Divider>
              <Row gutter={[16, 8]}>
                <Col span={8}>
                  <Form.Item name="notifyFamilies" valuePropName="checked">
                    <Checkbox>Notificar a familias</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="notifyOnHappy" valuePropName="checked">
                    <Checkbox>Notificar cuando happy 😊</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="notifyOnNeutral" valuePropName="checked">
                    <Checkbox>Notificar cuando neutral 😐</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="notifyOnSad" valuePropName="checked">
                    <Checkbox>Notificar cuando sad 😞</Checkbox>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="isTemplate" valuePropName="checked">
                    <Checkbox>Guardar como plantilla</Checkbox>
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Row>

          <div className="text-right">
            <Space>
              <Button onClick={() => {
                setDuplicateModalVisible(false)
                setSelectedActivity(null)
                duplicateForm.resetFields()
              }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                Duplicar Actividad
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Drawer de valoraciones */}
      <Drawer
        title={
          <Space>
            <BookOutlined />
            {selectedActivity?.name}
            <Tag color="blue">{selectedActivity?.classGroup.name}</Tag>
          </Space>
        }
        open={assessmentDrawerVisible}
        onClose={() => {
          setAssessmentDrawerVisible(false)
          setSelectedActivity(null)
          setBulkAssessmentMode(false)
          setSelectedStudents([])
          setBulkValue('')
          setBulkComment('')
          setRubricAssessmentModalVisible(false)
          setAssessingStudent(null)
        }}
        width={600}
        extra={
          <Space>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => {
                setAssessmentDrawerVisible(false);
                setTimeout(() => openGradingModal(selectedActivity!), 100);
              }}
              disabled={!selectedActivity || selectedActivity.assessments.filter(a => a.isAssessed && !a.value).length === 0}
            >
              Calificar ({selectedActivity?.assessments.filter(a => a.isAssessed && !a.value).length || 0})
            </Button>
            {selectedActivity?.valuationType !== 'rubric' && (
              <Button
                type={bulkAssessmentMode ? 'default' : 'primary'}
                onClick={() => setBulkAssessmentMode(!bulkAssessmentMode)}
              >
                {bulkAssessmentMode ? 'Cancelar Masiva' : 'Valoración Masiva'}
              </Button>
            )}
            {selectedActivity?.valuationType === 'rubric' && (
              <Tag color="purple" style={{ padding: '4px 8px' }}>
                Evaluación por Rúbrica: {selectedActivity.rubric?.name}
              </Tag>
            )}
          </Space>
        }
      >
        {selectedActivity && (
          <div>
            {/* Modo valoración masiva - Solo para emoji y score */}
            {bulkAssessmentMode && selectedActivity.valuationType !== 'rubric' && (
              <Card className="mb-4" style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}>
                <Space direction="vertical" className="w-full">
                  <Text strong>Valoración Masiva</Text>
                  
                  {selectedActivity.valuationType === 'emoji' ? (
                    <Space>
                      <Text>Valor:</Text>
                      <Radio.Group value={bulkValue} onChange={(e) => setBulkValue(e.target.value)}>
                        <Radio.Button value="happy">
                          <SmileOutlined style={{ color: '#52c41a' }} /> Feliz
                        </Radio.Button>
                        <Radio.Button value="neutral">
                          <MehOutlined style={{ color: '#faad14' }} /> Normal
                        </Radio.Button>
                        <Radio.Button value="sad">
                          <FrownOutlined style={{ color: '#ff4d4f' }} /> Triste
                        </Radio.Button>
                      </Radio.Group>
                    </Space>
                  ) : selectedActivity.valuationType === 'score' ? (
                    <Space>
                      <Text>Puntuación:</Text>
                      <InputNumber
                        min={0}
                        max={selectedActivity.maxScore}
                        value={bulkValue ? parseFloat(bulkValue) : undefined}
                        onChange={(value) => setBulkValue(value?.toString() || '')}
                        placeholder="0"
                      />
                      <Text type="secondary">/ {selectedActivity.maxScore}</Text>
                    </Space>
                  ) : (
                    <Text type="secondary">Las rúbricas no soportan valoración masiva</Text>
                  )}

                  <Input.TextArea
                    rows={2}
                    placeholder="Comentario opcional para todos los estudiantes..."
                    value={bulkComment}
                    onChange={(e) => setBulkComment(e.target.value)}
                    maxLength={200}
                    showCount
                  />

                  <div>
                    <Text type="secondary">
                      {selectedStudents.length > 0 
                        ? `Aplicar a ${selectedStudents.length} estudiantes seleccionados`
                        : `Aplicar a todos los ${selectedActivity.assessments.length} estudiantes`
                      }
                    </Text>
                  </div>

                  <Button
                    type="primary"
                    onClick={handleBulkAssessment}
                    disabled={!bulkValue}
                  >
                    Aplicar Valoración Masiva
                  </Button>
                </Space>
              </Card>
            )}

            {/* Información especial para rúbricas */}
            {selectedActivity.valuationType === 'rubric' && (
              <Alert
                message="Evaluación por Rúbrica"
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>
                      Esta actividad utiliza la rúbrica: <Text strong>{selectedActivity.rubric?.name}</Text>
                    </Text>
                    <Text type="secondary">
                      Haz clic en "Evaluar con Rúbrica" para cada estudiante para realizar una evaluación detallada.
                    </Text>
                    {selectedActivity.rubric && (
                      <Space>
                        <Tag color="purple">{selectedActivity.rubric.criteriaCount} criterios</Tag>
                        <Tag color="blue">{selectedActivity.rubric.levelsCount} niveles</Tag>
                        <Tag color="orange">Máx: {selectedActivity.rubric.maxScore} pts</Tag>
                      </Space>
                    )}
                  </Space>
                }
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            {/* Lista de estudiantes */}
            <List
              dataSource={selectedActivity.assessments}
              renderItem={(assessment) => (
                <List.Item
                  style={{
                    backgroundColor: bulkAssessmentMode && selectedStudents.includes(assessment.student.id) 
                      ? '#e6f7ff' : 'transparent'
                  }}
                  onClick={() => {
                    if (bulkAssessmentMode) {
                      const studentId = assessment.student.id
                      setSelectedStudents(prev => 
                        prev.includes(studentId) 
                          ? prev.filter(id => id !== studentId)
                          : [...prev, studentId]
                      )
                    }
                  }}
                  className={bulkAssessmentMode ? 'cursor-pointer' : ''}
                  actions={!bulkAssessmentMode ? [
                    selectedActivity.valuationType === 'emoji' ? (
                      <Space key="emoji-actions">
                        <Button
                          type={assessment.value === 'happy' ? 'primary' : 'default'}
                          icon={<SmileOutlined />}
                          onClick={() => handleAssessStudent(assessment.student.id, 'happy')}
                          size="small"
                          style={{ color: assessment.value === 'happy' ? '#fff' : '#52c41a' }}
                        />
                        <Button
                          type={assessment.value === 'neutral' ? 'primary' : 'default'}
                          icon={<MehOutlined />}
                          onClick={() => handleAssessStudent(assessment.student.id, 'neutral')}
                          size="small"
                          style={{ color: assessment.value === 'neutral' ? '#fff' : '#faad14' }}
                        />
                        <Button
                          type={assessment.value === 'sad' ? 'primary' : 'default'}
                          icon={<FrownOutlined />}
                          onClick={() => handleAssessStudent(assessment.student.id, 'sad')}
                          size="small"
                          style={{ color: assessment.value === 'sad' ? '#fff' : '#ff4d4f' }}
                        />
                      </Space>
                    ) : selectedActivity.valuationType === 'score' ? (
                      <Space key="score-actions">
                        <InputNumber
                          min={0}
                          max={selectedActivity.maxScore}
                          value={assessment.value ? parseFloat(assessment.value) : undefined}
                          onChange={(value) => {
                            if (value !== null && value !== undefined) {
                              handleAssessStudent(assessment.student.id, value.toString())
                            }
                          }}
                          size="small"
                          placeholder="0"
                        />
                        <Text type="secondary">/ {selectedActivity.maxScore}</Text>
                      </Space>
                    ) : selectedActivity.valuationType === 'rubric' ? (
                      <Space key="rubric-actions">
                        <Button
                          type="primary"
                          icon={<EditOutlined />}
                          onClick={() => handleRubricAssessment(assessment.student)}
                          size="small"
                        >
                          {assessment.isAssessed ? 'Editar Rúbrica' : 'Evaluar con Rúbrica'}
                        </Button>
                      </Space>
                    ) : null
                  ] : undefined}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge 
                        dot={assessment.isAssessed} 
                        status={assessment.isAssessed ? 'success' : 'default'}
                      >
                        <Avatar style={{ backgroundColor: '#87d068' }}>
                          {assessment.student?.user?.profile?.firstName?.charAt(0) || 'E'}
                        </Avatar>
                      </Badge>
                    }
                    title={
                      <Space>
                        {`${assessment.student.user.profile.firstName} ${assessment.student.user.profile.lastName}`}
                        {bulkAssessmentMode && selectedStudents.includes(assessment.student.id) && (
                          <CheckCircleOutlined style={{ color: '#1890ff' }} />
                        )}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        {assessment.isAssessed ? (
                          <Space>
                            <Text strong>
                              {selectedActivity.valuationType === 'emoji' ? (
                                getEmojiIcon(assessment.value!)
                              ) : selectedActivity.valuationType === 'score' ? (
                                `${assessment.value}/${selectedActivity.maxScore}`
                              ) : selectedActivity.valuationType === 'rubric' ? (
                                <Space>
                                  <TrophyOutlined style={{ color: '#1890ff' }} />
                                  <span>{assessment.value}/{selectedActivity.maxScore} pts</span>
                                  <Tag color="purple">Rúbrica</Tag>
                                </Space>
                              ) : assessment.value}
                            </Text>
                            <Text type="secondary" className="text-xs">
                              {dayjs(assessment.assessedAt).format('DD/MM/YYYY HH:mm')}
                            </Text>
                          </Space>
                        ) : (
                          <Text type="secondary">Sin valorar</Text>
                        )}
                        {assessment.comment && (
                          <Text className="text-sm" style={{ fontStyle: 'italic' }}>
                            "{assessment.comment}"
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Drawer>

      {/* Modal de estadísticas */}
      <Modal
        title={
          <Space>
            <BarChartOutlined />
            Estadísticas de Actividad
          </Space>
        }
        open={statisticsModalVisible}
        onCancel={() => {
          setStatisticsModalVisible(false)
          setStatistics(null)
          setSelectedActivity(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setStatisticsModalVisible(false)
            setStatistics(null)
            setSelectedActivity(null)
          }}>
            Cerrar
          </Button>
        ]}
        width={600}
      >
        {statistics ? (
          <Space direction="vertical" size="large" className="w-full">
            <div>
              <Title level={4}>{statistics.activityName}</Title>
              <Text type="secondary">Estadísticas detalladas de la actividad</Text>
            </div>

            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Total Estudiantes"
                  value={statistics.totalStudents}
                  prefix={<TeamOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Valorados"
                  value={statistics.assessedStudents}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Pendientes"
                  value={statistics.pendingStudents}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
            </Row>

            <Card>
              <div className="text-center">
                <Progress
                  type="circle"
                  percent={statistics.completionPercentage}
                  strokeColor={getCompletionColor(statistics.completionPercentage)}
                  width={120}
                />
                <div className="mt-2">
                  <Text strong>Progreso de Completado</Text>
                </div>
              </div>
            </Card>

            {statistics.emojiDistribution && (
              <Card title="Distribución de Emojis">
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title={<Space><SmileOutlined style={{ color: '#52c41a' }} />Feliz</Space>}
                      value={statistics.emojiDistribution.happy}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<Space><MehOutlined style={{ color: '#faad14' }} />Normal</Space>}
                      value={statistics.emojiDistribution.neutral}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title={<Space><FrownOutlined style={{ color: '#ff4d4f' }} />Triste</Space>}
                      value={statistics.emojiDistribution.sad}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {statistics.scoreStatistics && (
              <Card title="Estadísticas de Puntuación">
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="Promedio"
                      value={statistics.scoreStatistics.average}
                      precision={1}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Mínimo"
                      value={statistics.scoreStatistics.min}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Máximo"
                      value={statistics.scoreStatistics.max}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Máximo Posible"
                      value={statistics.scoreStatistics.maxPossible}
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </Col>
                </Row>
              </Card>
            )}
          </Space>
        ) : (
          <div className="text-center py-8">
            <Spin size="large" />
          </div>
        )}
      </Modal>

      {/* Modal de evaluación con rúbrica */}
      <Modal
        title={
          <Space>
            <TrophyOutlined style={{ color: '#722ed1' }} />
            Evaluación con Rúbrica
            {assessingStudent && (
              <Tag color="blue">
                {assessingStudent.user.profile.firstName} {assessingStudent.user.profile.lastName}
              </Tag>
            )}
          </Space>
        }
        open={rubricAssessmentModalVisible}
        onCancel={() => {
          setRubricAssessmentModalVisible(false)
          setAssessingStudent(null)
        }}
        width={1200}
        footer={null}
        destroyOnClose
      >
        {selectedActivity && selectedActivity.rubric && assessingStudent && (
          <RubricAssessment
            rubric={selectedActivity.rubric as Rubric}
            studentId={assessingStudent.id}
            studentName={`${assessingStudent.user.profile.firstName} ${assessingStudent.user.profile.lastName}`}
            activityAssessmentId={selectedActivity.assessments.find(a => a.student.id === assessingStudent.id)?.id || ''}
            onAssessmentComplete={handleRubricAssessmentComplete}
            onCancel={() => {
              setRubricAssessmentModalVisible(false)
              setAssessingStudent(null)
            }}
          />
        )}
      </Modal>

      {/* Modal de Calificación de Actividades */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EditOutlined />
            <span>Calificar Actividad: {activityToGrade?.name}</span>
          </div>
        }
        open={gradingModalOpen}
        onCancel={() => {
          setGradingModalOpen(false)
          setActivityToGrade(null)
          setGradingSubmissions([])
          gradingForm.resetFields()
        }}
        footer={null}
        width={800}
        destroyOnClose={true}
      >
        {loadingSubmissions ? (
          <div className="flex justify-center items-center h-40">
            <Spin size="large">
              <div className="mt-4 text-center">
                <Text>Cargando evaluaciones...</Text>
              </div>
            </Spin>
          </div>
        ) : gradingSubmissions.length === 0 ? (
          <Empty 
            description="No hay evaluaciones pendientes de calificar"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <div className="space-y-4">
            <Alert
              message={`${gradingSubmissions.length} evaluaciones pendientes de calificar`}
              type="info"
              showIcon
            />
            
            {gradingSubmissions.map((assessment, index) => (
              <Card
                key={assessment.id}
                title={
                  <div className="flex items-center justify-between">
                    <span>
                      {assessment.student?.user?.profile?.firstName} {assessment.student?.user?.profile?.lastName}
                    </span>
                    <Tag color="blue">Evaluación {index + 1}</Tag>
                  </div>
                }
                size="small"
              >
                <div className="space-y-4">
                  {/* Información de la evaluación */}
                  <div className="bg-gray-50 p-3 rounded">
                    <Text type="secondary">Evaluado el:</Text>
                    <div className="font-medium">
                      {new Date(assessment.assessedAt).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {assessment.comment && (
                      <div className="mt-2">
                        <Text type="secondary">Comentario previo:</Text>
                        <div className="mt-1 p-2 bg-white rounded border text-sm">
                          {assessment.comment}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Formulario de calificación */}
                  <Form
                    form={gradingForm}
                    layout="vertical"
                    onFinish={(values) => handleSaveActivityGrade(assessment.id, values)}
                    className="mt-4"
                  >
                    <Row gutter={16}>
                      <Col span={8}>
                        <Form.Item
                          name={`score_${assessment.id}`}
                          label={`Calificación (0-${activityToGrade?.maxScore || 100})`}
                          rules={[
                            { required: true, message: 'Ingresa una calificación' },
                            { type: 'number', min: 0, max: activityToGrade?.maxScore || 100, message: `Entre 0 y ${activityToGrade?.maxScore || 100}` }
                          ]}
                        >
                          <InputNumber
                            min={0}
                            max={activityToGrade?.maxScore || 100}
                            placeholder={`Ej: ${Math.floor((activityToGrade?.maxScore || 100) * 0.8)}`}
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={16}>
                        <Form.Item
                          name={`feedback_${assessment.id}`}
                          label="Comentario adicional (opcional)"
                        >
                          <Input.TextArea
                            rows={3}
                            placeholder="Comentarios sobre la evaluación..."
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <div className="flex justify-end">
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={savingGrade}
                        icon={<CheckCircleOutlined />}
                      >
                        Guardar Calificación
                      </Button>
                    </div>
                  </Form>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default ActivitiesPage