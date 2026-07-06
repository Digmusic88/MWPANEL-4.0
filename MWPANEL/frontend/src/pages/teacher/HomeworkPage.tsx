/**
 * HomeworkPage - Sistema de seguimiento de actividades por asignatura
 * Profesor crea asignaturas (tags con color), asigna alumnos de todo el colegio,
 * crea actividades por fecha, y registra su realización en un grid con sub-columnas.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, Button, Typography, Space, Spin, message, Tag, Tooltip,
  Modal, Form, Input, Select, DatePicker, Empty, Transfer, Avatar,
  Popconfirm, Row, Col, Badge,
} from 'antd'
import {
  PlusOutlined, BookOutlined, TeamOutlined, ArrowLeftOutlined,
  EditOutlined, DeleteOutlined, UserOutlined, SmileOutlined,
  MehOutlined, FrownOutlined, CheckCircleOutlined, ReloadOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import apiClient from '@services/apiClient'
import SectionInfoBanner from '../../components/common/SectionInfoBanner'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

// ==================== TIPOS ====================
type RecordStatus = 'completed' | 'partial' | 'not_done' | null

const COLORS = [
  { value: '#1890ff', label: 'Azul' },
  { value: '#52c41a', label: 'Verde' },
  { value: '#faad14', label: 'Naranja' },
  { value: '#ff4d4f', label: 'Rojo' },
  { value: '#722ed1', label: 'Morado' },
  { value: '#13c2c2', label: 'Turquesa' },
  { value: '#eb2f96', label: 'Rosa' },
  { value: '#fa8c16', label: 'Ámbar' },
]

const STATUS_CFG = {
  completed: { label: 'Realizada', color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f', icon: <SmileOutlined /> },
  partial:   { label: 'A medias',  color: '#faad14', bg: '#fffbe6', border: '#ffe58f', icon: <MehOutlined /> },
  not_done:  { label: 'No realizada', color: '#ff4d4f', bg: '#fff2f0', border: '#ffccc7', icon: <FrownOutlined /> },
} as const

const CYCLE: RecordStatus[] = ['completed', 'partial', 'not_done']
function nextStatus(s: RecordStatus): RecordStatus {
  if (s === null) return 'completed'
  if (s === 'not_done') return null
  return CYCLE[CYCLE.indexOf(s) + 1]
}

interface HSubject { id: string; name: string; color: string; studentCount: number }
interface HStudent { id: string; name: string; enrollmentNumber: string; classGroupName?: string | null }
interface HActivity { id: string; name: string; description: string | null; date?: string }
interface HDateGroup {
  date: string
  activities: Array<{
    id: string; name: string; description: string | null
    records: Record<string, { recordId: string | null; status: RecordStatus; notes: string | null }>
  }>
}
interface GridData {
  subject: { id: string; name: string; color: string }
  students: Array<{ id: string; name: string; enrollmentNumber: string }>
  dates: HDateGroup[]
}

// ==================== CELDA STATUS ====================
function StatusCell({ status, saving, onClick }: { status: RecordStatus; saving?: boolean; onClick: () => void }) {
  const cfg = status ? STATUS_CFG[status] : null
  return (
    <Tooltip title={cfg ? `${cfg.label} · clic para cambiar` : 'Sin registro · clic para marcar'}>
      <div
        role="button" tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick() }}
        style={{
          width: 36, height: 36, borderRadius: '50%', cursor: 'pointer',
          border: `2px solid ${cfg ? cfg.border : '#d9d9d9'}`,
          background: cfg ? cfg.bg : '#fafafa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, color: cfg ? cfg.color : '#bfbfbf',
          transition: 'all 0.12s', position: 'relative',
        }}
      >
        {saving ? <Spin size="small" /> : cfg ? cfg.icon : '–'}
      </div>
    </Tooltip>
  )
}

// ==================== COMPONENTE PRINCIPAL ====================
export default function HomeworkPage() {
  const [view, setView] = useState<'subjects' | 'grid'>('subjects')
  const [subjects, setSubjects] = useState<HSubject[]>([])
  const [activeSubject, setActiveSubject] = useState<HSubject | null>(null)
  const [grid, setGrid] = useState<GridData | null>(null)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({})

  // Date range for grid
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek'),
  ])

  // Modals
  const [subjectModal, setSubjectModal] = useState<{ open: boolean; editing?: HSubject }>({ open: false })
  const [studentModal, setStudentModal] = useState(false)
  const [activityModal, setActivityModal] = useState<{ open: boolean; date?: string }>({ open: false })
  const [editActivityModal, setEditActivityModal] = useState<{ open: boolean; activity?: HActivity }>({ open: false })

  // Student transfer data
  const [allStudents, setAllStudents] = useState<HStudent[]>([])
  const [enrolledIds, setEnrolledIds] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [loadingStudents, setLoadingStudents] = useState(false)

  const [subjectForm] = Form.useForm()
  const [activityForm] = Form.useForm()
  const [editActivityForm] = Form.useForm()

  useEffect(() => { loadSubjects() }, [])

  const loadSubjects = async () => {
    setLoadingSubjects(true)
    try {
      const res = await apiClient.get('/homework/subjects')
      setSubjects(res.data)
    } catch { message.error('Error al cargar asignaturas') }
    finally { setLoadingSubjects(false) }
  }

  const loadGrid = useCallback(async (subject: HSubject, range: [Dayjs, Dayjs]) => {
    setLoadingGrid(true)
    try {
      const res = await apiClient.get(`/homework/subjects/${subject.id}/grid`, {
        params: { startDate: range[0].format('YYYY-MM-DD'), endDate: range[1].format('YYYY-MM-DD') },
      })
      setGrid(res.data)
    } catch { message.error('Error al cargar el registro') }
    finally { setLoadingGrid(false) }
  }, [])

  const openSubject = (subject: HSubject) => {
    setActiveSubject(subject)
    setView('grid')
    loadGrid(subject, dateRange)
  }

  const goBack = () => {
    setView('subjects')
    setActiveSubject(null)
    setGrid(null)
    loadSubjects()
  }

  // ---- SUBJECT CRUD ----
  const saveSubject = async (values: { name: string; color: string }) => {
    try {
      if (subjectModal.editing) {
        await apiClient.patch(`/homework/subjects/${subjectModal.editing.id}`, values)
        message.success('Asignatura actualizada')
      } else {
        await apiClient.post('/homework/subjects', values)
        message.success('Asignatura creada')
      }
      setSubjectModal({ open: false })
      subjectForm.resetFields()
      loadSubjects()
    } catch { message.error('Error al guardar') }
  }

  const deleteSubject = async (id: string) => {
    try {
      await apiClient.delete(`/homework/subjects/${id}`)
      message.success('Asignatura eliminada')
      loadSubjects()
    } catch { message.error('Error al eliminar') }
  }

  // ---- STUDENT MANAGEMENT ----
  const openStudentModal = async () => {
    if (!activeSubject) return
    setStudentModal(true)
    setLoadingStudents(true)
    try {
      const [allRes, enrolledRes] = await Promise.all([
        apiClient.get('/homework/students/search', { params: { q: studentSearch } }),
        apiClient.get(`/homework/subjects/${activeSubject.id}/students`),
      ])
      setAllStudents(allRes.data)
      setEnrolledIds(enrolledRes.data.map((s: HStudent) => s.id))
    } catch { message.error('Error al cargar alumnos') }
    finally { setLoadingStudents(false) }
  }

  const searchStudents = async (q: string) => {
    setStudentSearch(q)
    try {
      const res = await apiClient.get('/homework/students/search', { params: { q } })
      setAllStudents(res.data)
    } catch {}
  }

  const saveStudents = async () => {
    if (!activeSubject) return
    try {
      await apiClient.post(`/homework/subjects/${activeSubject.id}/students`, { studentIds: enrolledIds })
      message.success(`${enrolledIds.length} alumnos asignados`)
      setStudentModal(false)
      // Refresh grid + subject count
      const updated = { ...activeSubject, studentCount: enrolledIds.length }
      setActiveSubject(updated)
      loadGrid(updated, dateRange)
    } catch { message.error('Error al guardar alumnos') }
  }

  // ---- ACTIVITY CRUD ----
  const saveActivity = async (values: { name: string; date: any; description?: string }) => {
    if (!activeSubject) return
    try {
      await apiClient.post(`/homework/subjects/${activeSubject.id}/activities`, {
        name: values.name,
        date: values.date.format('YYYY-MM-DD'),
        description: values.description ?? null,
      })
      message.success('Actividad creada')
      setActivityModal({ open: false })
      activityForm.resetFields()
      loadGrid(activeSubject, dateRange)
    } catch { message.error('Error al crear actividad') }
  }

  const saveEditActivity = async (values: { name: string; description?: string }) => {
    if (!editActivityModal.activity) return
    try {
      await apiClient.patch(`/homework/activities/${editActivityModal.activity.id}`, values)
      message.success('Actividad actualizada')
      setEditActivityModal({ open: false })
      loadGrid(activeSubject!, dateRange)
    } catch { message.error('Error al actualizar') }
  }

  const deleteActivity = async (activityId: string) => {
    try {
      await apiClient.delete(`/homework/activities/${activityId}`)
      message.success('Actividad eliminada')
      loadGrid(activeSubject!, dateRange)
    } catch { message.error('Error al eliminar actividad') }
  }

  // ---- RECORD MANAGEMENT ----
  const handleCellClick = async (activityId: string, studentId: string, current: { recordId: string | null; status: RecordStatus }) => {
    const ns = nextStatus(current.status)
    const cellKey = `${activityId}_${studentId}`
    setSavingCells((p) => ({ ...p, [cellKey]: true }))

    // Optimistic update
    setGrid((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        dates: prev.dates.map((dg) => ({
          ...dg,
          activities: dg.activities.map((act) => {
            if (act.id !== activityId) return act
            return {
              ...act,
              records: {
                ...act.records,
                [studentId]: { recordId: ns === null ? null : act.records[studentId]?.recordId ?? null, status: ns, notes: null },
              },
            }
          }),
        })),
      }
    })

    try {
      if (ns === null) {
        if (current.recordId) await apiClient.delete(`/homework/activity-records/${current.recordId}`)
      } else {
        await apiClient.post(`/homework/activities/${activityId}/records/${studentId}`, { status: ns })
        // Refresh just to get the real recordId
        loadGrid(activeSubject!, dateRange)
      }
    } catch {
      message.error('Error al guardar')
      loadGrid(activeSubject!, dateRange)
    } finally {
      setSavingCells((p) => ({ ...p, [cellKey]: false }))
    }
  }

  const isToday = (d: string) => dayjs(d).isSame(dayjs(), 'day')
  const fmtDate = (d: string) => {
    const dd = dayjs(d)
    return (
      <div style={{ lineHeight: 1.3 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{dd.format('DD')}</div>
        <div style={{ fontSize: 10, color: '#8c8c8c', textTransform: 'uppercase' }}>{dd.format('ddd')}</div>
      </div>
    )
  }

  // ==================== RENDER: SUBJECT LIST ====================
  if (view === 'subjects') {
    return (
      <div style={{ padding: '20px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <BookOutlined style={{ marginRight: 8, color: '#1890ff' }} />Actividades Diarias
            </Title>
            <Text type="secondary">Crea asignaturas, asigna alumnos y registra actividades</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { subjectForm.resetFields(); setSubjectModal({ open: true }) }}>
            Nueva asignatura
          </Button>
        </div>

        {loadingSubjects ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : subjects.length === 0 ? (
          <Empty
            image={<BookOutlined style={{ fontSize: 60, color: '#d9d9d9' }} />}
            description={<span>Aún no tienes asignaturas.<br />Crea una para empezar a registrar actividades.</span>}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setSubjectModal({ open: true })}>
              Crear primera asignatura
            </Button>
          </Empty>
        ) : (
          <Row gutter={[16, 16]}>
            {subjects.map((s) => (
              <Col key={s.id} xs={24} sm={12} md={8}>
                <Card
                  hoverable
                  style={{ borderRadius: 12, borderTop: `4px solid ${s.color}`, cursor: 'pointer' }}
                  bodyStyle={{ padding: '16px' }}
                  onClick={() => openSubject(s)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Tag color={s.color} style={{ margin: 0, fontSize: 13, padding: '2px 10px', fontWeight: 600 }}>
                          {s.name}
                        </Tag>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <TeamOutlined style={{ color: '#8c8c8c' }} />
                        <Text style={{ fontSize: 12, color: '#8c8c8c' }}>{s.studentCount} alumnos</Text>
                      </div>
                    </div>
                    <Space size={4} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Editar">
                        <Button size="small" icon={<EditOutlined />} onClick={() => {
                          subjectForm.setFieldsValue({ name: s.name, color: s.color })
                          setSubjectModal({ open: true, editing: s })
                        }} />
                      </Tooltip>
                      <Popconfirm title="¿Eliminar esta asignatura?" onConfirm={() => deleteSubject(s.id)} okText="Sí" cancelText="No">
                        <Button size="small" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
                    </Space>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Modal crear/editar asignatura */}
        <Modal
          title={subjectModal.editing ? 'Editar asignatura' : 'Nueva asignatura'}
          open={subjectModal.open}
          onOk={() => subjectForm.submit()}
          onCancel={() => setSubjectModal({ open: false })}
          okText={subjectModal.editing ? 'Guardar' : 'Crear'}
        >
          <Form form={subjectForm} layout="vertical" onFinish={saveSubject} initialValues={{ color: '#1890ff' }}>
            <Form.Item name="name" label="Nombre de la asignatura" rules={[{ required: true, message: 'Escribe un nombre' }]}>
              <Input placeholder="Ej: Lengua Castellana, Matemáticas..." maxLength={120} />
            </Form.Item>
            <Form.Item name="color" label="Color">
              <Select>
                {COLORS.map((c) => (
                  <Option key={c.value} value={c.value}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, background: c.value }} />
                      {c.label}
                    </div>
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    )
  }

  // ==================== RENDER: GRID VIEW ====================
  const totalCols = grid?.dates.reduce((sum, dg) => sum + dg.activities.length, 0) ?? 0

  return (
    <div style={{ padding: '16px 20px', maxWidth: '100%' }}>
      <SectionInfoBanner text="Deberes del día; el alumno los marca como hechos." />
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={goBack}>Mis asignaturas</Button>
        {activeSubject && (
          <Tag color={activeSubject.color} style={{ fontSize: 15, padding: '4px 14px', fontWeight: 700 }}>
            {activeSubject.name}
          </Tag>
        )}
        <Badge count={activeSubject?.studentCount ?? 0} showZero style={{ backgroundColor: '#52c41a' }}>
          <Button icon={<TeamOutlined />} onClick={openStudentModal}>Gestionar alumnos</Button>
        </Badge>
      </div>

      {/* FILTROS */}
      <Card bodyStyle={{ padding: '10px 16px' }} style={{ marginBottom: 12, borderRadius: 8 }}>
        <Row gutter={[12, 8]} align="middle">
          <Col xs={24} sm={14} md={10}>
            <Space direction="vertical" style={{ width: '100%' }} size={2}>
              <Text style={{ fontSize: 12, color: '#8c8c8c' }}>Rango de fechas</Text>
              <RangePicker
                style={{ width: '100%' }}
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    const r: [Dayjs, Dayjs] = [dates[0], dates[1]]
                    setDateRange(r)
                    if (activeSubject) loadGrid(activeSubject, r)
                  }
                }}
                format="DD/MM/YYYY"
                allowClear={false}
                presets={[
                  { label: 'Esta semana', value: [dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek')] },
                  { label: 'Semana pasada', value: [dayjs().subtract(1,'week').startOf('isoWeek'), dayjs().subtract(1,'week').endOf('isoWeek')] },
                  { label: 'Este mes', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                ]}
              />
            </Space>
          </Col>
          <Col>
            <Button
              icon={<PlusOutlined />} type="primary"
              style={{ marginTop: 18 }}
              onClick={() => { activityForm.resetFields(); setActivityModal({ open: true }) }}
            >
              Añadir actividad
            </Button>
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} style={{ marginTop: 18 }} loading={loadingGrid}
              onClick={() => activeSubject && loadGrid(activeSubject, dateRange)} />
          </Col>
        </Row>
      </Card>

      {/* LEYENDA */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CFG).map(([k, c]) => (
          <Tag key={k} icon={c.icon} color={k === 'completed' ? 'success' : k === 'partial' ? 'warning' : 'error'}
            style={{ fontSize: 12 }}>{c.label}</Tag>
        ))}
        <Tag color="default" style={{ fontSize: 12 }}>– Sin registro</Tag>
      </div>

      {/* GRID */}
      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 8, overflow: 'hidden' }}>
        {loadingGrid ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : !grid || grid.students.length === 0 ? (
          <Empty style={{ padding: 48 }}
            description={
              <span>
                {grid?.students.length === 0
                  ? <>No hay alumnos. <Button type="link" onClick={openStudentModal}>Añadir alumnos</Button></>
                  : 'No hay actividades en este período. Pulsa "Añadir actividad" para crear una.'}
              </span>
            }
          />
        ) : totalCols === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <CalendarOutlined style={{ fontSize: 40, color: '#d9d9d9', display: 'block', marginBottom: 12 }} />
            <Text type="secondary">No hay actividades en este período.</Text>
            <br />
            <Button type="primary" icon={<PlusOutlined />} style={{ marginTop: 12 }}
              onClick={() => setActivityModal({ open: true })}>
              Añadir actividad
            </Button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 160 + totalCols * 110 }}>
              {/* FILA 1: FECHAS */}
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                  <th rowSpan={2} style={{
                    position: 'sticky', left: 0, background: '#fafafa', zIndex: 10,
                    padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13,
                    color: '#595959', width: 160, minWidth: 160, maxWidth: 160, borderRight: '2px solid #e8e8e8',
                    borderBottom: '2px solid #e8e8e8',
                  }}>
                    Alumno/a
                  </th>
                  {grid.dates.map((dg) => (
                    <th key={dg.date} colSpan={dg.activities.length} style={{
                      padding: '6px 8px', textAlign: 'center',
                      background: isToday(dg.date) ? '#e6f4ff' : '#fafafa',
                      borderBottom: isToday(dg.date) ? '2px solid #1890ff' : '1px solid #f0f0f0',
                      borderLeft: '1px solid #e8e8e8',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        {fmtDate(dg.date)}
                        {isToday(dg.date) && <span style={{ fontSize: 9, color: '#1890ff', fontWeight: 700 }}>HOY</span>}
                      </div>
                    </th>
                  ))}
                </tr>
                {/* FILA 2: ACTIVIDADES */}
                <tr style={{ background: '#fafafa', borderBottom: '2px solid #e8e8e8' }}>
                  {grid.dates.map((dg) =>
                    dg.activities.map((act, i) => (
                      <th key={act.id} style={{
                        padding: '4px 6px', minWidth: 110, textAlign: 'center',
                        borderLeft: i === 0 ? '1px solid #e8e8e8' : '1px solid #f0f0f0',
                        background: isToday(dg.date) ? '#f0f8ff' : '#fafafa',
                        fontWeight: 500, fontSize: 11, color: '#595959',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <Tooltip title={act.description || act.name}>
                            <span style={{
                              maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', display: 'block',
                            }}>{act.name}</span>
                          </Tooltip>
                          <Space size={2}>
                            <Tooltip title="Editar actividad">
                              <Button size="small" type="text" icon={<EditOutlined style={{ fontSize: 10 }} />}
                                style={{ width: 20, height: 20, minWidth: 20 }}
                                onClick={() => {
                                  editActivityForm.setFieldsValue({ name: act.name, description: act.description ?? '' })
                                  setEditActivityModal({ open: true, activity: act })
                                }} />
                            </Tooltip>
                            <Popconfirm title="¿Eliminar esta actividad?" onConfirm={() => deleteActivity(act.id)} okText="Sí" cancelText="No">
                              <Button size="small" type="text" danger icon={<DeleteOutlined style={{ fontSize: 10 }} />}
                                style={{ width: 20, height: 20, minWidth: 20 }} />
                            </Popconfirm>
                          </Space>
                        </div>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              {/* BODY */}
              <tbody>
                {grid.students.map((student, si) => (
                  <tr key={student.id} style={{
                    background: si % 2 === 0 ? 'white' : '#fafafa',
                    borderBottom: '1px solid #f0f0f0',
                  }}>
                    <td style={{
                      position: 'sticky', left: 0, background: si % 2 === 0 ? 'white' : '#fafafa',
                      zIndex: 5, padding: '8px 12px', borderRight: '2px solid #e8e8e8',
                      width: 160, minWidth: 160, maxWidth: 160,
                    }}>
                      <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{student.name}</div>
                      <div style={{ fontSize: 11, color: '#bfbfbf' }}>{student.enrollmentNumber}</div>
                    </td>
                    {grid.dates.map((dg) =>
                      dg.activities.map((act, i) => {
                        const rec = act.records[student.id] ?? { recordId: null, status: null, notes: null }
                        const cellKey = `${act.id}_${student.id}`
                        return (
                          <td key={act.id} style={{
                            textAlign: 'center', padding: '6px 4px',
                            borderLeft: i === 0 ? '1px solid #e8e8e8' : '1px solid #f0f0f0',
                            background: isToday(dg.date)
                              ? si % 2 === 0 ? '#f0f8ff' : '#e6f4ff'
                              : undefined,
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <StatusCell
                                status={rec.status}
                                saving={savingCells[cellKey]}
                                onClick={() => handleCellClick(act.id, student.id, rec)}
                              />
                            </div>
                          </td>
                        )
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODAL: GESTIONAR ALUMNOS */}
      <Modal
        title={<><TeamOutlined /> Gestionar alumnos — {activeSubject?.name}</>}
        open={studentModal}
        onOk={saveStudents}
        onCancel={() => setStudentModal(false)}
        okText="Guardar"
        width={680}
      >
        {loadingStudents ? <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div> : (
          <>
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              Busca alumnos de todo el colegio y arrástralos a la lista de asignados.
            </Text>
            <Transfer
              dataSource={allStudents.map((s) => ({
                key: s.id,
                title: s.name,
                description: `${s.enrollmentNumber}${s.classGroupName ? ` · ${s.classGroupName}` : ''}`,
              }))}
              targetKeys={enrolledIds}
              onChange={(keys) => setEnrolledIds(keys as string[])}
              showSearch
              onSearch={(_, value) => searchStudents(value)}
              filterOption={(input, item) =>
                item.title?.toLowerCase().includes(input.toLowerCase()) ||
                item.description?.toLowerCase().includes(input.toLowerCase()) ||
                false
              }
              render={(item) => (
                <div>
                  <div style={{ fontWeight: 500 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>{item.description}</div>
                </div>
              )}
              listStyle={{ width: 280, height: 360 }}
              titles={['Todos los alumnos', 'Asignados']}
              locale={{ itemUnit: 'alumno', itemsUnit: 'alumnos', searchPlaceholder: 'Buscar...' }}
            />
          </>
        )}
      </Modal>

      {/* MODAL: NUEVA ACTIVIDAD */}
      <Modal
        title={<><PlusOutlined /> Nueva actividad</>}
        open={activityModal.open}
        onOk={() => activityForm.submit()}
        onCancel={() => setActivityModal({ open: false })}
        okText="Crear"
      >
        <Form form={activityForm} layout="vertical" onFinish={saveActivity}>
          <Form.Item name="name" label="Nombre de la actividad" rules={[{ required: true, message: 'Escribe un nombre' }]}>
            <Input placeholder="Ej: Ejercicio 1, Lectura comprensiva, Dictado..." maxLength={150} />
          </Form.Item>
          <Form.Item name="date" label="Fecha" rules={[{ required: true, message: 'Selecciona una fecha' }]}
            initialValue={activityModal.date ? dayjs(activityModal.date) : dayjs()}>
            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item name="description" label="Descripción (opcional)">
            <Input.TextArea rows={2} maxLength={300} placeholder="Añade más detalles..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL: EDITAR ACTIVIDAD */}
      <Modal
        title={<><EditOutlined /> Editar actividad</>}
        open={editActivityModal.open}
        onOk={() => editActivityForm.submit()}
        onCancel={() => setEditActivityModal({ open: false })}
        okText="Guardar"
      >
        <Form form={editActivityForm} layout="vertical" onFinish={saveEditActivity}>
          <Form.Item name="name" label="Nombre" rules={[{ required: true }]}>
            <Input maxLength={150} />
          </Form.Item>
          <Form.Item name="description" label="Descripción (opcional)">
            <Input.TextArea rows={2} maxLength={300} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
