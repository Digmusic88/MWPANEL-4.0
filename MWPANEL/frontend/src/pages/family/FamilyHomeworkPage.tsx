/**
 * FamilyHomeworkPage - Vista familia del sistema de actividades diarias
 * Muestra las asignaturas en que está matriculado el alumno,
 * y dentro de cada una las actividades con su estado de realización.
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  Card, Select, Typography, Space, Spin, Tag, Tooltip, Empty,
  Row, Col, DatePicker, Button,
} from 'antd'
import {
  BookOutlined, SmileOutlined, MehOutlined, FrownOutlined,
  ArrowLeftOutlined, CalendarOutlined, ReloadOutlined,
} from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'
import apiClient from '@services/apiClient'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

type RecordStatus = 'completed' | 'partial' | 'not_done' | null

const STATUS_CFG = {
  completed: { label: 'Realizada',     color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f', icon: <SmileOutlined />, tag: 'success' },
  partial:   { label: 'A medias',      color: '#faad14', bg: '#fffbe6', border: '#ffe58f', icon: <MehOutlined />,   tag: 'warning' },
  not_done:  { label: 'No realizada',  color: '#ff4d4f', bg: '#fff2f0', border: '#ffccc7', icon: <FrownOutlined />, tag: 'error'   },
} as const

interface FamilyChild { id: string; name: string }
interface HSubject { id: string; name: string; color: string; teacherName: string }
interface HDateGroup {
  date: string
  activities: Array<{ id: string; name: string; description: string | null; status: RecordStatus; recordId: string | null }>
}

function StatusBadge({ status }: { status: RecordStatus }) {
  if (!status) return <span style={{ color: '#bfbfbf', fontSize: 18 }}>–</span>
  const cfg = STATUS_CFG[status]
  return (
    <Tooltip title={cfg.label}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        border: `2px solid ${cfg.border}`, background: cfg.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, color: cfg.color, margin: '0 auto',
      }}>
        {cfg.icon}
      </div>
    </Tooltip>
  )
}

export default function FamilyHomeworkPage() {
  const [children, setChildren] = useState<FamilyChild[]>([])
  const [selectedChild, setSelectedChild] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<HSubject[]>([])
  const [activeSubject, setActiveSubject] = useState<HSubject | null>(null)
  const [dates, setDates] = useState<HDateGroup[]>([])
  const [loadingChildren, setLoadingChildren] = useState(true)
  const [loadingSubjects, setLoadingSubjects] = useState(false)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf('isoWeek'), dayjs().endOf('isoWeek'),
  ])

  // Cargar hijos de la familia
  useEffect(() => {
    const loadChildren = async () => {
      setLoadingChildren(true)
      try {
        const res = await apiClient.get('/families/my-children')
        const kids: FamilyChild[] = res.data.map((s: any) => ({
          id: s.id,
          name: s.user?.profile ? `${s.user.profile.firstName} ${s.user.profile.lastName}` : 'Alumno',
        }))
        setChildren(kids)
        if (kids.length === 1) setSelectedChild(kids[0].id)
      } catch {
        // intentar endpoint alternativo
        try {
          const res2 = await apiClient.get('/students/my-children')
          const kids2: FamilyChild[] = res2.data.map((s: any) => ({
            id: s.id,
            name: s.user?.profile ? `${s.user.profile.firstName} ${s.user.profile.lastName}` : 'Alumno',
          }))
          setChildren(kids2)
          if (kids2.length === 1) setSelectedChild(kids2[0].id)
        } catch {}
      } finally { setLoadingChildren(false) }
    }
    loadChildren()
  }, [])

  // Cargar asignaturas cuando cambia el hijo
  useEffect(() => {
    if (!selectedChild) return
    const loadSubjects = async () => {
      setLoadingSubjects(true)
      setActiveSubject(null)
      setDates([])
      try {
        const res = await apiClient.get('/homework/family/subjects', { params: { studentId: selectedChild } })
        setSubjects(res.data)
      } catch { setSubjects([]) }
      finally { setLoadingSubjects(false) }
    }
    loadSubjects()
  }, [selectedChild])

  const loadGrid = useCallback(async (subject: HSubject, range: [Dayjs, Dayjs], studentId: string) => {
    setLoadingGrid(true)
    try {
      const res = await apiClient.get(`/homework/family/subjects/${subject.id}/grid`, {
        params: {
          studentId,
          startDate: range[0].format('YYYY-MM-DD'),
          endDate: range[1].format('YYYY-MM-DD'),
        },
      })
      setDates(res.data.dates ?? [])
    } catch { setDates([]) }
    finally { setLoadingGrid(false) }
  }, [])

  const openSubject = (s: HSubject) => {
    setActiveSubject(s)
    if (selectedChild) loadGrid(s, dateRange, selectedChild)
  }

  const goBack = () => { setActiveSubject(null); setDates([]) }

  const isToday = (d: string) => dayjs(d).isSame(dayjs(), 'day')
  const fmtDate = (d: string) => {
    const dd = dayjs(d)
    return (
      <div style={{ lineHeight: 1.3, textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>{dd.format('DD')}</div>
        <div style={{ fontSize: 10, color: '#8c8c8c', textTransform: 'uppercase' }}>{dd.format('ddd')}</div>
      </div>
    )
  }

  const totalCols = dates.reduce((s, dg) => s + dg.activities.length, 0)

  // ---- RENDER: selector de hijo ----
  const childSelector = children.length > 1 && (
    <Select
      style={{ minWidth: 180 }}
      value={selectedChild}
      onChange={setSelectedChild}
      placeholder="Selecciona alumno"
    >
      {children.map((c) => <Option key={c.id} value={c.id}>{c.name}</Option>)}
    </Select>
  )

  // ---- RENDER: lista de asignaturas ----
  if (!activeSubject) {
    return (
      <div style={{ padding: '20px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <BookOutlined style={{ marginRight: 8, color: '#1890ff' }} />Actividades Diarias
            </Title>
            <Text type="secondary">Seguimiento de actividades por asignatura</Text>
          </div>
          {childSelector}
        </div>

        {loadingChildren || loadingSubjects ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : !selectedChild ? (
          <Empty description="Selecciona un alumno para ver sus asignaturas" />
        ) : subjects.length === 0 ? (
          <Empty description="No hay asignaturas registradas para este alumno" />
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
                  <Tag color={s.color} style={{ marginBottom: 8, fontSize: 13, padding: '2px 10px', fontWeight: 600 }}>
                    {s.name}
                  </Tag>
                  <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 6 }}>
                    Prof. {s.teacherName}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    )
  }

  // ---- RENDER: grid de actividades ----
  return (
    <div style={{ padding: '16px 20px', maxWidth: '100%' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={goBack}>Asignaturas</Button>
        <Tag color={activeSubject.color} style={{ fontSize: 15, padding: '4px 14px', fontWeight: 700 }}>
          {activeSubject.name}
        </Tag>
        {childSelector}
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
                  if (dates && dates[0] && dates[1] && selectedChild) {
                    const r: [Dayjs, Dayjs] = [dates[0], dates[1]]
                    setDateRange(r)
                    loadGrid(activeSubject, r, selectedChild)
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
            <Button icon={<ReloadOutlined />} style={{ marginTop: 18 }} loading={loadingGrid}
              onClick={() => selectedChild && loadGrid(activeSubject, dateRange, selectedChild)} />
          </Col>
        </Row>
      </Card>

      {/* LEYENDA */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CFG).map(([k, c]) => (
          <Tag key={k} icon={c.icon} color={c.tag as any} style={{ fontSize: 12 }}>{c.label}</Tag>
        ))}
        <Tag color="default" style={{ fontSize: 12 }}>– Sin registro</Tag>
      </div>

      {/* GRID */}
      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 8, overflow: 'hidden' }}>
        {loadingGrid ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : totalCols === 0 ? (
          <Empty style={{ padding: 48 }} description="No hay actividades registradas en este período" />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 180 + totalCols * 80 }}>
              <thead>
                {/* FILA 1: fechas */}
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                  <th rowSpan={2} style={{
                    position: 'sticky', left: 0, background: '#fafafa', zIndex: 10,
                    padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 13,
                    minWidth: 120, borderRight: '2px solid #e8e8e8', borderBottom: '2px solid #e8e8e8',
                    color: '#595959',
                  }}>
                    Actividad
                  </th>
                  {dates.map((dg) => (
                    <th key={dg.date} colSpan={dg.activities.length} style={{
                      padding: '6px 8px', textAlign: 'center',
                      background: isToday(dg.date) ? '#e6f4ff' : '#fafafa',
                      borderBottom: isToday(dg.date) ? '2px solid #1890ff' : '1px solid #f0f0f0',
                      borderLeft: '1px solid #e8e8e8',
                    }}>
                      {fmtDate(dg.date)}
                      {isToday(dg.date) && <div style={{ fontSize: 9, color: '#1890ff', fontWeight: 700 }}>HOY</div>}
                    </th>
                  ))}
                </tr>
                {/* FILA 2: nombres de actividades */}
                <tr style={{ background: '#fafafa', borderBottom: '2px solid #e8e8e8' }}>
                  {dates.map((dg) =>
                    dg.activities.map((act, i) => (
                      <th key={act.id} style={{
                        padding: '4px 6px', minWidth: 72, textAlign: 'center',
                        borderLeft: i === 0 ? '1px solid #e8e8e8' : '1px solid #f0f0f0',
                        background: isToday(dg.date) ? '#f0f8ff' : '#fafafa',
                        fontWeight: 500, fontSize: 11, color: '#595959',
                      }}>
                        <Tooltip title={act.description || act.name}>
                          <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                            {act.name}
                          </span>
                        </Tooltip>
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: 'white', borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{
                    position: 'sticky', left: 0, background: 'white', zIndex: 5,
                    padding: '8px 16px', borderRight: '2px solid #e8e8e8',
                    fontWeight: 500, fontSize: 13,
                  }}>
                    {children.find((c) => c.id === selectedChild)?.name ?? 'Tu hijo/a'}
                  </td>
                  {dates.map((dg) =>
                    dg.activities.map((act, i) => (
                      <td key={act.id} style={{
                        textAlign: 'center', padding: '6px 4px',
                        borderLeft: i === 0 ? '1px solid #e8e8e8' : '1px solid #f0f0f0',
                        background: isToday(dg.date) ? '#f0f8ff' : undefined,
                      }}>
                        <StatusBadge status={act.status} />
                      </td>
                    ))
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
