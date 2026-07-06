import { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { useAcademicYear } from '../../contexts/AcademicYearContext'
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Input,
  Modal,
  Form,
  message,
  Tag,
  Tooltip,
  Popconfirm,
  DatePicker,
  Switch,
  Row,
  Col,
  Alert,
  Divider,
  Select,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import apiClient from '@services/apiClient'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

interface AcademicYear {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
  isArchived: boolean
  archivedAt?: string
  createdAt: string
  updatedAt: string
}

const AcademicYearsPage = () => {
  const { refetchCurrent, refetchAll } = useAcademicYear()
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingAcademicYear, setEditingAcademicYear] = useState<AcademicYear | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [cloneTarget, setCloneTarget] = useState<AcademicYear | null>(null)
  const [cloneSourceId, setCloneSourceId] = useState<string | undefined>(undefined)

  // Fetch academic years
  const fetchAcademicYears = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.get('/academic-years')
      setAcademicYears(response.data || [])
    } catch (error: any) {
      console.error('Error fetching academic years:', error)
      const errorMessage = error.response?.data?.message || 'Error al cargar años académicos'
      setError(errorMessage)
      message.error(errorMessage)
      setAcademicYears([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAcademicYears()
  }, [])

  // Handle create academic year
  const handleCreateAcademicYear = async (values: any) => {
    try {
      const dateRange = values.dateRange
      const payload = {
        name: values.name,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        isActive: values.isActive || false,
      }

      await apiClient.post('/academic-years', payload)
      message.success('Año académico creado exitosamente')
      setIsModalVisible(false)
      form.resetFields()
      fetchAcademicYears()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al crear año académico'
      message.error(errorMessage)
      console.error('Error creating academic year:', error)
    }
  }

  // Handle edit academic year
  const handleEditAcademicYear = (academicYear: AcademicYear) => {
    setEditingAcademicYear(academicYear)
    form.setFieldsValue({
      name: academicYear.name,
      dateRange: [dayjs(academicYear.startDate), dayjs(academicYear.endDate)],
      isActive: academicYear.isCurrent,
    })
    setIsModalVisible(true)
  }

  // Handle update academic year
  const handleUpdateAcademicYear = async (values: any) => {
    if (!editingAcademicYear) return
    
    try {
      const dateRange = values.dateRange
      const payload = {
        name: values.name,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        isActive: values.isActive,
      }

      await apiClient.put(`/academic-years/${editingAcademicYear.id}`, payload)
      message.success('Año académico actualizado exitosamente')
      setIsModalVisible(false)
      setEditingAcademicYear(null)
      form.resetFields()
      fetchAcademicYears()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al actualizar año académico'
      message.error(errorMessage)
      console.error('Error updating academic year:', error)
    }
  }

  // Handle activate academic year
  const handleActivateAcademicYear = async (id: string) => {
    try {
      await apiClient.put(`/academic-years/${id}/activate`)
      message.success('Año académico activado exitosamente')
      fetchAcademicYears()
      // Refresh the global academic year context
      await refetchCurrent()
      await refetchAll()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al activar año académico'
      message.error(errorMessage)
      console.error('Error activating academic year:', error)
    }
  }

  // Handle archive academic year
  const handleArchiveAcademicYear = async (id: string) => {
    try {
      await apiClient.put(`/academic-years/${id}/archive`)
      message.success('Año académico archivado')
      fetchAcademicYears()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al archivar año académico'
      message.error(errorMessage)
      console.error('Error archiving academic year:', error)
    }
  }

  // Handle unarchive academic year
  const handleUnarchiveAcademicYear = async (id: string) => {
    try {
      await apiClient.put(`/academic-years/${id}/unarchive`)
      message.success('Año académico desarchivado')
      fetchAcademicYears()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al desarchivar año académico'
      message.error(errorMessage)
      console.error('Error unarchiving academic year:', error)
    }
  }

  // Handle close academic year (build immutable expediente + lock writes)
  const handleCloseAcademicYear = async (id: string) => {
    try {
      const res = await apiClient.put(`/academic-years/${id}/close`)
      message.success(
        `Año cerrado. Expediente: ${res.data?.expediente?.records ?? 0} registros de ${res.data?.expediente?.students ?? 0} alumnos.`
      )
      fetchAcademicYears()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al cerrar año académico'
      message.error(errorMessage)
      console.error('Error closing academic year:', error)
    }
  }

  // Handle clone structure from another academic year
  const handleCloneStructure = async () => {
    if (!cloneTarget || !cloneSourceId) return
    try {
      const res = await apiClient.post(
        `/academic-years/${cloneTarget.id}/clone-structure?sourceYearId=${cloneSourceId}`,
      )
      const d = res.data || {}
      message.success(
        `Estructura clonada: ${d.classGroups ?? 0} grupos, ${d.subjectAssignments ?? 0} asignaciones, ${d.tutoringGroups ?? 0} tutorías.`,
      )
      if (Array.isArray(d.warnings) && d.warnings.length > 0) {
        message.warning(`${d.warnings.length} aviso(s): ${d.warnings.slice(0, 3).join('; ')}`)
      }
      setCloneTarget(null)
      setCloneSourceId(undefined)
      fetchAcademicYears()
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Error al clonar la estructura')
    }
  }

  // Handle delete academic year
  const handleDeleteAcademicYear = async (id: string) => {
    try {
      await apiClient.delete(`/academic-years/${id}`)
      message.success('Año académico eliminado exitosamente')
      fetchAcademicYears()
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al eliminar año académico'
      message.error(errorMessage)
      console.error('Error deleting academic year:', error)
    }
  }

  // Filter academic years based on search
  const filteredAcademicYears = academicYears.filter(academicYear => {
    const searchLower = searchValue.toLowerCase()
    return academicYear.name.toLowerCase().includes(searchLower)
  })

  const columns: ColumnsType<AcademicYear> = [
    {
      title: 'Año Académico',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space>
          <CalendarOutlined style={{ color: record.isCurrent ? '#52c41a' : '#d9d9d9' }} />
          <div>
            <div style={{ fontWeight: record.isCurrent ? 600 : 400 }}>
              {name}
            </div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {dayjs(record.startDate).format('DD/MM/YYYY')} - {dayjs(record.endDate).format('DD/MM/YYYY')}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Periodo',
      key: 'period',
      render: (_, record) => {
        const now = dayjs()
        const start = dayjs(record.startDate)
        const end = dayjs(record.endDate)
        const isCurrentPeriod = now.isAfter(start) && now.isBefore(end)
        
        return (
          <div>
            <div>{start.format('DD/MM/YYYY')} - {end.format('DD/MM/YYYY')}</div>
            <div style={{ marginTop: 4 }}>
              {isCurrentPeriod ? (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Periodo Actual
                </Tag>
              ) : now.isBefore(start) ? (
                <Tag color="blue">Futuro</Tag>
              ) : (
                <Tag color="default">Finalizado</Tag>
              )}
            </div>
          </div>
        )
      },
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_, record) => (
        <div>
          {record.isCurrent ? (
            <Tag color="success" icon={<PlayCircleOutlined />}>Actual</Tag>
          ) : record.isArchived ? (
            <Tag color="default" icon={<PauseCircleOutlined />}>Archivado</Tag>
          ) : (
            <span style={{ color: '#bfbfbf' }}>—</span>
          )}
        </div>
      ),
    },
    {
      title: 'Duración',
      key: 'duration',
      render: (_, record) => {
        const start = dayjs(record.startDate)
        const end = dayjs(record.endDate)
        const months = end.diff(start, 'month')
        const days = end.diff(start, 'day')
        
        return (
          <div>
            <div>{months} meses</div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {days} días
            </Text>
          </div>
        )
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Space>
          {!record.isCurrent && !record.isArchived && (
            <Tooltip title="Activar año académico">
              <Popconfirm
                title="¿Activar este año académico?"
                description="Esto desactivará todos los otros años académicos."
                onConfirm={() => handleActivateAcademicYear(record.id)}
                okText="Sí"
                cancelText="No"
              >
                <Button
                  type="text"
                  icon={<PlayCircleOutlined />}
                  style={{ color: '#52c41a' }}
                />
              </Popconfirm>
            </Tooltip>
          )}
          {record.isArchived ? (
            <Tooltip title="Desarchivar">
              <Popconfirm
                title="¿Desarchivar este año académico?"
                onConfirm={() => handleUnarchiveAcademicYear(record.id)}
                okText="Sí"
                cancelText="No"
              >
                <Button type="text" icon={<CheckCircleOutlined />} style={{ color: '#1677ff' }} />
              </Popconfirm>
            </Tooltip>
          ) : (
            <Tooltip title={record.isCurrent ? 'Activa otro año antes de archivar' : 'Archivar'}>
              <span>
                <Popconfirm
                  title="¿Archivar este año académico?"
                  description="El año quedará archivado y no se podrá usar como activo."
                  onConfirm={() => handleArchiveAcademicYear(record.id)}
                  okText="Sí"
                  cancelText="No"
                  disabled={record.isCurrent}
                >
                  <Button
                    type="text"
                    icon={<PauseCircleOutlined />}
                    disabled={record.isCurrent}
                    style={{ color: record.isCurrent ? undefined : '#faad14' }}
                  />
                </Popconfirm>
              </span>
            </Tooltip>
          )}
          {!record.isCurrent && !record.isArchived && (
            <Tooltip title="Cerrar año">
              <Popconfirm
                title="¿Cerrar el año?"
                description="Se reconstruirá el expediente del año y quedará de solo lectura. ¿Cerrar el año?"
                onConfirm={() => handleCloseAcademicYear(record.id)}
                okText="Sí"
                cancelText="No"
              >
                <Button type="text" icon={<CheckCircleOutlined />} style={{ color: '#8c8c8c' }}>
                  Cerrar año
                </Button>
              </Popconfirm>
            </Tooltip>
          )}
          {!record.isArchived && (
            <Tooltip title="Clonar estructura desde otro año">
              <Button
                type="text"
                icon={<CalendarOutlined />}
                onClick={() => setCloneTarget(record)}
              >
                Clonar estructura
              </Button>
            </Tooltip>
          )}
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditAcademicYear(record)}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Popconfirm
              title="¿Estás seguro de eliminar este año académico?"
              description="Esta acción no se puede deshacer y puede afectar datos relacionados."
              onConfirm={() => handleDeleteAcademicYear(record.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ]

  // Early return for loading state
  if (loading && academicYears.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          </div>
          <Text type="secondary">Cargando años académicos...</Text>
        </div>
      </div>
    )
  }

  // Early return for error state
  if (error && academicYears.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
          </div>
          <Title level={4} type="danger">Error al cargar años académicos</Title>
          <Text type="secondary" className="block mb-4">{error}</Text>
          <Button type="primary" onClick={fetchAcademicYears}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const currentAcademicYear = academicYears.find(year => year.isCurrent)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Title level={2} className="!mb-2">Gestión de Años Académicos</Title>
          <Text type="secondary">
            Administra los periodos académicos del centro educativo
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingAcademicYear(null)
            form.resetFields()
            setIsModalVisible(true)
          }}
        >
          Nuevo Año Académico
        </Button>
      </div>

      {/* Current Academic Year Alert */}
      {currentAcademicYear && (
        <Alert
          message={
            <div className="flex justify-between items-center">
              <span>
                <CalendarOutlined className="mr-2" />
                <strong>Año Académico Activo:</strong> {currentAcademicYear.name}
              </span>
              <Text type="secondary">
                {dayjs(currentAcademicYear.startDate).format('DD/MM/YYYY')} - {dayjs(currentAcademicYear.endDate).format('DD/MM/YYYY')}
              </Text>
            </div>
          }
          type="info"
          showIcon={false}
        />
      )}

      {!currentAcademicYear && (
        <Alert
          message="No hay ningún año académico activo"
          description="Selecciona un año académico para activarlo y que sirva como base para todas las operaciones del sistema."
          type="warning"
          icon={<ExclamationCircleOutlined />}
          showIcon
        />
      )}

      {/* Search */}
      <Card>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={8}>
            <Input
              placeholder="Buscar año académico..."
              prefix={<SearchOutlined />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* Academic Years Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredAcademicYears}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredAcademicYears.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} de ${total} años académicos`,
          }}
        />
      </Card>

      {/* Create/Edit Academic Year Modal */}
      <Modal
        title={editingAcademicYear ? 'Editar Año Académico' : 'Nuevo Año Académico'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          setEditingAcademicYear(null)
          form.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={editingAcademicYear ? handleUpdateAcademicYear : handleCreateAcademicYear}
          initialValues={{ isActive: false }}
        >
          <Form.Item
            name="name"
            label="Nombre del Año Académico"
            rules={[{ required: true, message: 'Ingrese el nombre del año académico' }]}
          >
            <Input placeholder="Curso 2025-2026" />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Periodo"
            rules={[{ required: true, message: 'Seleccione el periodo del año académico' }]}
          >
            <RangePicker 
              style={{ width: '100%' }}
              placeholder={['Fecha de inicio', 'Fecha de fin']}
              format="DD/MM/YYYY"
            />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Estado"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Activo" 
              unCheckedChildren="Inactivo"
              disabled={editingAcademicYear?.isCurrent}
            />
          </Form.Item>

          {editingAcademicYear?.isCurrent && (
            <Alert
              message="Este año académico está actualmente activo"
              description="Para cambiar el estado, utiliza el botón de activar/desactivar en la tabla."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <Divider />

          <div className="flex justify-end space-x-2">
            <Button onClick={() => {
              setIsModalVisible(false)
              setEditingAcademicYear(null)
              form.resetFields()
            }}>
              Cancelar
            </Button>
            <Button type="primary" htmlType="submit">
              {editingAcademicYear ? 'Actualizar' : 'Crear'} Año Académico
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Clone Structure Modal */}
      <Modal
        title={`Clonar estructura → ${cloneTarget?.name ?? ''}`}
        open={!!cloneTarget}
        onOk={handleCloneStructure}
        okButtonProps={{ disabled: !cloneSourceId }}
        onCancel={() => {
          setCloneTarget(null)
          setCloneSourceId(undefined)
        }}
        okText="Clonar"
      >
        <p>Copia grupos, asignaciones y tutorías del año origen a <b>{cloneTarget?.name}</b>, sin alumnos.</p>
        <Select
          style={{ width: '100%' }}
          placeholder="Año origen"
          value={cloneSourceId}
          onChange={setCloneSourceId}
          options={academicYears
            .filter((y) => y.id !== cloneTarget?.id)
            .map((y) => ({ value: y.id, label: y.name + (y.isArchived ? ' (archivado)' : '') }))}
        />
      </Modal>
    </div>
  )
}

export default AcademicYearsPage