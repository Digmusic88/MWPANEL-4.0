import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Table,
  Tag,
  Typography,
  Space,
  Spin,
  Alert,
  Button,
  DatePicker,
  Select,
  List,
} from 'antd'
import {
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  BarChartOutlined,
  PieChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { Pie } from '@ant-design/plots'
import dayjs from 'dayjs'
import apiClient from '@services/apiClient'
import { useResponsive } from '../../hooks/useResponsive'
import GroupAttendanceStatsModal from '../teacher/GroupAttendanceStatsModal'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

interface AttendanceOverview {
  totalStudents: number
  totalDays: number
  totalRecords: number
  presentCount: number
  absentCount: number
  lateCount: number
  justifiedCount: number
  averageAttendanceRate: number
}

interface ClassAttendanceStats {
  classId: string
  className: string
  totalStudents: number
  averageAttendanceRate: number
  presentCount: number
  absentCount: number
  lateCount: number
  justifiedCount: number
}

interface StudentAttendanceAlert {
  studentId: string
  studentName: string
  attendanceRate: number
  consecutiveAbsences: number
  classGroup: string
  riskLevel: 'low' | 'medium' | 'high'
}

const AdminAttendanceDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs()
  ])
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [overview, setOverview] = useState<AttendanceOverview | null>(null)
  const [classStats, setClassStats] = useState<ClassAttendanceStats[]>([])
  const [attendanceAlerts, setAttendanceAlerts] = useState<StudentAttendanceAlert[]>([])
  const [educationalLevels, setEducationalLevels] = useState<any[]>([])
  const [selectedClassGroup, setSelectedClassGroup] = useState<{id: string, name: string} | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  
  const { isMobile } = useResponsive()

  useEffect(() => {
    fetchAttendanceData()
    fetchEducationalLevels()
  }, [dateRange, selectedLevel])

  const fetchEducationalLevels = async () => {
    try {
      const response = await apiClient.get('/educational-levels')
      setEducationalLevels(response.data)
    } catch (error) {
      console.error('Error fetching educational levels:', error)
    }
  }

  const fetchAttendanceData = async () => {
    setLoading(true)
    try {
      const startDate = dateRange[0].format('YYYY-MM-DD')
      const endDate = dateRange[1].format('YYYY-MM-DD')
      
      // Fetch students and class groups first
      const [studentsResponse, classGroupsResponse] = await Promise.all([
        apiClient.get('/students'),
        apiClient.get('/class-groups?includeStudents=true')
      ])
      
      const students = studentsResponse.data || []
      const classGroups = classGroupsResponse.data || []
      
      console.log('Fetched students:', students.length)
      console.log('Fetched class groups:', classGroups.length)
      
      // Filter students by educational level if selected
      let filteredStudents = students
      if (selectedLevel !== 'all') {
        filteredStudents = students.filter(student => 
          student.educationalLevel?.id === selectedLevel
        )
      }
      
      console.log('Filtered students:', filteredStudents.length)
      
      // Fetch individual student attendance stats for students that have attendance records
      const studentStatsPromises = filteredStudents.map(async (student) => {
        try {
          const response = await apiClient.get(`/attendance/stats/student/${student.id}?days=30`)
          // Los datos vienen en response.data.stats
          const stats = response.data?.stats || response.data || {}

          // Ensure we have valid data with fallback values
          const result = {
            studentId: student.id,
            studentName: `${student.user?.profile?.firstName || ''} ${student.user?.profile?.lastName || ''}`.trim(),
            classGroup: student.classGroups?.[0]?.name || 'Sin clase',
            totalDays: stats.totalDays || 0,
            present: stats.presentDays || stats.present || 0,
            absent: stats.absentDays || stats.absent || 0,
            late: stats.lateDays || stats.late || 0,
            justifiedAbsence: stats.justifiedAbsences || stats.justifiedAbsence || 0,
            attendanceRate: stats.attendanceRate || 0
          }
          
          // Log only students with actual attendance data
          if (result.totalDays > 0) {
            console.log(`Student with attendance: ${result.studentName}`, result)
          }
          
          return result
        } catch (error) {
          console.log(`No attendance data for student: ${student.user?.profile?.firstName} ${student.user?.profile?.lastName}`)
          return {
            studentId: student.id,
            studentName: `${student.user?.profile?.firstName || ''} ${student.user?.profile?.lastName || ''}`.trim(),
            classGroup: student.classGroups?.[0]?.name || 'Sin clase',
            totalDays: 0,
            present: 0,
            absent: 0,
            late: 0,
            justifiedAbsence: 0,
            attendanceRate: 0
          }
        }
      })
      
      const studentStats = await Promise.all(studentStatsPromises)
      
      // Filter to only students with actual attendance data for calculations
      const studentsWithAttendance = studentStats.filter(student => student.totalDays > 0)
      console.log('Students with attendance data:', studentsWithAttendance.length)
      
      // Fetch class group attendance stats for ALL class groups
      const classStatsPromises = classGroups.map(async (classGroup) => {
        try {
          const response = await apiClient.get(
            `/attendance/stats/group/${classGroup.id}?startDate=${startDate}&endDate=${endDate}`
          )
          const groupData = response.data || []
          
          console.log(`Group ${classGroup.name} attendance data:`, groupData.length, 'students with data:', groupData)
          
          // Calculate aggregated stats from group data
          const totalPresent = groupData.reduce((sum, student) => sum + (student.present || 0), 0)
          const totalAbsent = groupData.reduce((sum, student) => sum + (student.absent || 0), 0)
          const totalLate = groupData.reduce((sum, student) => sum + (student.late || 0), 0)
          const totalJustified = groupData.reduce((sum, student) => sum + (student.justifiedAbsence || 0), 0)
          const totalDays = groupData.reduce((sum, student) => sum + (student.totalDays || 0), 0)
          
          // Calculate attendance rate for each student and then average
          const studentsWithAttendance = groupData.filter(student => student.totalDays > 0)
          const avgAttendanceRate = studentsWithAttendance.length > 0 
            ? studentsWithAttendance.map(student => {
                const presentDays = (student.present || 0) + (student.late || 0) // Present + Late = attendance
                return student.totalDays > 0 ? (presentDays / student.totalDays) * 100 : 0
              }).reduce((sum, rate) => sum + rate, 0) / studentsWithAttendance.length
            : 0
          
          return {
            classId: classGroup.id,
            className: classGroup.name,
            totalStudents: classGroup.students?.length || groupData.length,
            averageAttendanceRate: Math.round(avgAttendanceRate * 100) / 100,
            presentCount: totalPresent,
            absentCount: totalAbsent,
            lateCount: totalLate,
            justifiedCount: totalJustified
          }
        } catch (error) {
          console.log(`Error fetching attendance data for group ${classGroup.name}:`, error.response?.status, error.message)
          return {
            classId: classGroup.id,
            className: classGroup.name,
            totalStudents: classGroup.students?.length || 0,
            averageAttendanceRate: 0,
            presentCount: 0,
            absentCount: 0,
            lateCount: 0,
            justifiedCount: 0
          }
        }
      })
      
      const classStatsData = await Promise.all(classStatsPromises)
      
      // Calculate overall statistics from class group stats for more accurate aggregation
      const totalStudents = classStatsData.reduce((sum, cls) => sum + (cls.totalStudents || 0), 0)
      const totalPresent = classStatsData.reduce((sum, cls) => sum + (cls.presentCount || 0), 0)
      const totalAbsent = classStatsData.reduce((sum, cls) => sum + (cls.absentCount || 0), 0)
      const totalLate = classStatsData.reduce((sum, cls) => sum + (cls.lateCount || 0), 0)
      const totalJustified = classStatsData.reduce((sum, cls) => sum + (cls.justifiedCount || 0), 0)
      const totalRecords = totalPresent + totalAbsent + totalLate + totalJustified
      
      // Average from class groups with actual data
      const classGroupsWithData = classStatsData.filter(cls => cls.averageAttendanceRate > 0)
      const avgAttendanceRate = classGroupsWithData.length > 0 
        ? classGroupsWithData.reduce((sum, cls) => sum + (cls.averageAttendanceRate || 0), 0) / classGroupsWithData.length
        : 0
      
      // Calculate total days from the date range
      const totalDays = Math.ceil(dateRange[1].diff(dateRange[0], 'day', true)) + 1
      
      const overviewData = {
        totalStudents,
        totalDays,
        totalRecords,
        presentCount: totalPresent,
        absentCount: totalAbsent,
        lateCount: totalLate,
        justifiedCount: totalJustified,
        averageAttendanceRate: Math.round(avgAttendanceRate * 100) / 100
      }
      
      console.log('Overview data calculated:', overviewData)
      
      setOverview(overviewData)
      setClassStats(classStatsData)
      
      // Identify students with low attendance as alerts
      const alerts = studentsWithAttendance
        .filter(student => student.attendanceRate < 80 && student.totalDays > 0)
        .map(student => ({
          studentId: student.studentId,
          studentName: student.studentName,
          attendanceRate: student.attendanceRate,
          consecutiveAbsences: student.absent || 0,
          classGroup: student.classGroup,
          riskLevel: student.attendanceRate < 60 ? 'high' : 
                     student.attendanceRate < 70 ? 'medium' : 'low'
        }))
        .sort((a, b) => a.attendanceRate - b.attendanceRate)
      
      console.log('Attendance alerts:', alerts)
      
      setAttendanceAlerts(alerts as StudentAttendanceAlert[])

    } catch (error) {
      console.error('Error fetching attendance data:', error)
      setOverview({
        totalStudents: 0,
        totalDays: 0,
        totalRecords: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        justifiedCount: 0,
        averageAttendanceRate: 0
      })
      setClassStats([])
      setAttendanceAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const getPieChartData = () => {
    if (!overview) return []

    const total = overview.totalRecords || 1

    return [
      {
        type: 'Presente',
        value: overview.presentCount,
        percentage: ((overview.presentCount / total) * 100).toFixed(1),
        color: '#16a34a'
      },
      {
        type: 'Ausente',
        value: overview.absentCount,
        percentage: ((overview.absentCount / total) * 100).toFixed(1),
        color: '#ff4d4f'
      },
      {
        type: 'Tardanza',
        value: overview.lateCount,
        percentage: ((overview.lateCount / total) * 100).toFixed(1),
        color: '#fa8c16'
      },
      {
        type: 'Justificado',
        value: overview.justifiedCount,
        percentage: ((overview.justifiedCount / total) * 100).toFixed(1),
        color: '#eb2f96'
      }
    ].filter(item => item.value > 0)
  }

  const pieConfig = {
    data: getPieChartData(),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.4,
    height: 260,
    color: ({ type }: any) => {
      const item = getPieChartData().find(d => d.type === type)
      return item?.color || '#d9d9d9'
    },
    label: false,
    legend: false,
    statistic: {
      title: {
        content: 'Total',
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
        },
      },
      content: {
        content: `${overview?.totalRecords || 0}`,
        style: {
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#1890ff',
        },
      },
    },
    tooltip: {
      formatter: (data: any) => {
        return {
          name: data.type,
          value: `${data.value} registros (${data.percentage}%)`,
        }
      },
    },
  }

  const classColumns = [
    {
      title: 'Clase',
      dataIndex: 'className',
      key: 'className',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: 'Estudiantes',
      dataIndex: 'totalStudents',
      key: 'totalStudents',
      render: (count: number) => (
        <Space>
          <UserOutlined />
          <Text>{count}</Text>
        </Space>
      )
    },
    {
      title: 'Asistencia Promedio',
      dataIndex: 'averageAttendanceRate',
      key: 'averageAttendanceRate',
      render: (rate: number) => (
        <Space>
          <Progress
            percent={rate}
            size="small"
            strokeColor={rate >= 85 ? '#52c41a' : rate >= 70 ? '#faad14' : '#ff4d4f'}
            style={{ width: 100 }}
          />
          <Text>{rate.toFixed(1)}%</Text>
        </Space>
      )
    },
    {
      title: 'Estado',
      key: 'status',
      render: (_: any, record: ClassAttendanceStats) => {
        const rate = record.averageAttendanceRate
        if (rate >= 90) {
          return <Tag color="green" icon={<CheckCircleOutlined />}>Excelente</Tag>
        } else if (rate >= 80) {
          return <Tag color="blue" icon={<ArrowUpOutlined />}>Buena</Tag>
        } else if (rate >= 70) {
          return <Tag color="orange" icon={<ClockCircleOutlined />}>Regular</Tag>
        } else {
          return <Tag color="red" icon={<ExclamationCircleOutlined />}>Preocupante</Tag>
        }
      }
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: ClassAttendanceStats) => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            setSelectedClassGroup({ id: record.classId, name: record.className })
            setModalVisible(true)
          }}
        >
          Ver Detalles
        </Button>
      )
    }
  ]

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'red'
      case 'medium': return 'orange'
      case 'low': return 'yellow'
      default: return 'default'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return <ExclamationCircleOutlined />
      case 'medium': return <ClockCircleOutlined />
      case 'low': return <CheckCircleOutlined />
      default: return <UserOutlined />
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Text strong>Período:</Text>
              <RangePicker
                value={dateRange}
                onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
                format="DD/MM/YYYY"
              />
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Space>
              <Text strong>Nivel:</Text>
              <Select
                value={selectedLevel}
                onChange={setSelectedLevel}
                className="w-full"
              >
                <Option value="all">Todos los niveles</Option>
                {educationalLevels.map(level => (
                  <Option key={level.id} value={level.id}>
                    {level.name}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Overview Statistics */}
      {overview && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderTop: '4px solid #1890ff' }}>
              <Statistic
                title="Total Estudiantes"
                value={overview.totalStudents}
                prefix={<TeamOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderTop: `4px solid ${overview.averageAttendanceRate >= 85 ? '#52c41a' : overview.averageAttendanceRate >= 70 ? '#faad14' : '#ff4d4f'}` }}>
              <Statistic
                title="Asistencia Promedio"
                value={overview.averageAttendanceRate}
                precision={1}
                suffix="%"
                prefix={<BarChartOutlined />}
                valueStyle={{
                  color: overview.averageAttendanceRate >= 85 ? '#52c41a' :
                         overview.averageAttendanceRate >= 70 ? '#faad14' : '#ff4d4f'
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderTop: '4px solid #722ed1' }}>
              <Statistic
                title="Total Registros"
                value={overview.totalRecords}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderTop: '4px solid #13c2c2' }}>
              <Statistic
                title="Días Lectivos"
                value={overview.totalDays}
                prefix={<CalendarOutlined />}
                valueStyle={{ color: '#13c2c2' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Charts and Detailed Stats */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title={<Space><PieChartOutlined />Distribución de Asistencia</Space>}>
            {overview && overview.totalRecords > 0 ? (
              <>
                <Pie {...pieConfig} />
                {/* Leyenda personalizada moderna */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                  {getPieChartData().map((item, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#fafafa',
                        border: '1px solid #f0f0f0',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: item.color,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ fontWeight: 600, fontSize: '13px', color: '#262626' }}>{item.type}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#595959' }}>
                          {item.value} {item.value === 1 ? 'registro' : 'registros'}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: item.color,
                            backgroundColor: `${item.color}18`,
                            padding: '2px 8px',
                            borderRadius: '12px',
                            minWidth: '48px',
                            textAlign: 'center',
                          }}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: '#16a34a' }}></div>
                    Presente
                  </span>
                  <span className="font-medium">{overview?.presentCount ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: '#ff4d4f' }}></div>
                    Ausente
                  </span>
                  <span className="font-medium">{overview?.absentCount ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: '#fa8c16' }}></div>
                    Tardanza
                  </span>
                  <span className="font-medium">{overview?.lateCount ?? 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center">
                    <div className="w-4 h-4 rounded mr-2" style={{ backgroundColor: '#eb2f96' }}></div>
                    Justificado
                  </span>
                  <span className="font-medium">{overview?.justifiedCount ?? 0}</span>
                </div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title={<Space><ExclamationCircleOutlined />Alertas de Asistencia</Space>}>
            <List
              dataSource={attendanceAlerts}
              renderItem={(alert) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Tag color={getRiskColor(alert.riskLevel)} icon={getRiskIcon(alert.riskLevel)}>
                        {alert.riskLevel.toUpperCase()}
                      </Tag>
                    }
                    title={alert.studentName}
                    description={
                      <Space direction="vertical" size="small">
                        <Text type="secondary">{alert.classGroup}</Text>
                        <Space>
                          <Text>Asistencia: {alert.attendanceRate.toFixed(1)}%</Text>
                          <Text type="secondary">•</Text>
                          <Text>Ausencias consecutivas: {alert.consecutiveAbsences}</Text>
                        </Space>
                      </Space>
                    }
                  />
                  <div>
                    <Progress
                      type="circle"
                      size={60}
                      percent={alert.attendanceRate}
                      strokeColor={alert.attendanceRate >= 70 ? '#52c41a' : '#ff4d4f'}
                    />
                  </div>
                </List.Item>
              )}
            />
            {attendanceAlerts.length === 0 && (
              <div className="text-center py-8">
                <CheckCircleOutlined className="text-4xl text-green-500 mb-2" />
                <Text type="secondary">No hay alertas de asistencia</Text>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Class Statistics Table */}
      <Card title={<Space><TeamOutlined />Estadísticas por Clase</Space>}>
        <Table
          columns={classColumns}
          dataSource={classStats}
          rowKey="classId"
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Modal de detalles por clase */}
      {selectedClassGroup && (
        <GroupAttendanceStatsModal
          visible={modalVisible}
          onClose={() => {
            setModalVisible(false)
            setSelectedClassGroup(null)
          }}
          classGroupId={selectedClassGroup.id}
          classGroupName={selectedClassGroup.name}
          startDate={dateRange[0].format('YYYY-MM-DD')}
          endDate={dateRange[1].format('YYYY-MM-DD')}
        />
      )}
    </div>
  )
}

export default AdminAttendanceDashboard