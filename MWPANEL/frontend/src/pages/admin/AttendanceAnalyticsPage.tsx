import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  DatePicker,
  Statistic,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Alert,
  Spin,
  Empty,
  Select,
  Space,
  Tooltip,
  Progress,
  message,
  Typography,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import apiClient from '@services/apiClient';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;
const { Option } = Select;

interface AttendanceOverview {
  period: { startDate: string; endDate: string };
  totalRecords: number;
  uniqueStudents: number;
  uniqueDates: number;
  byStatus: {
    present: number;
    absent: number;
    late: number;
    earlyDeparture: number;
    justifiedAbsence: number;
  };
  rates: {
    attendance: number;
    punctuality: number;
  };
}

interface TeacherStats {
  teacher: {
    id: string;
    name: string;
    email: string;
  };
  totalRecords: number;
  recordsByStatus: {
    present: number;
    absent: number;
    late: number;
    earlyDeparture: number;
    justifiedAbsence: number;
  };
  uniqueStudents: number;
  uniqueDates: number;
  lastActivityDate: string;
}

interface AttendanceAlert {
  student?: {
    id: string;
    name: string;
    enrollmentNumber: string;
  };
  teacher?: {
    id: string;
    name: string;
    email: string;
  };
  alertType: 'critical' | 'warning' | 'info';
  reason: string;
  attendanceRate?: number;
  totalDays?: number;
  present?: number;
  absent?: number;
  late?: number;
  consecutiveAbsences?: number;
}

interface AlertsResponse {
  period: { startDate: string; endDate: string; days: number };
  summary: {
    totalStudentAlerts: number;
    criticalStudents: number;
    totalTeacherAlerts: number;
  };
  studentAlerts: AttendanceAlert[];
  teacherAlerts: AttendanceAlert[];
}

export const AttendanceAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // State para Overview
  const [overview, setOverview] = useState<AttendanceOverview | null>(null);

  // State para Teacher Stats
  const [teacherStats, setTeacherStats] = useState<TeacherStats[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [teacherRecords, setTeacherRecords] = useState<any[]>([]);

  // State para Alerts
  const [alerts, setAlerts] = useState<AlertsResponse | null>(null);
  const [alertDays, setAlertDays] = useState(30);

  useEffect(() => {
    if (activeTab === 'overview') {
      loadOverview();
    } else if (activeTab === 'teachers') {
      loadTeacherStats();
    } else if (activeTab === 'alerts') {
      loadAlerts();
    }
  }, [activeTab, dateRange, alertDays]);

  const loadOverview = async () => {
    try {
      setLoading(true);
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const response = await apiClient.get<AttendanceOverview>(
        `/attendance/admin/overview?startDate=${startDate}&endDate=${endDate}`
      );

      setOverview(response.data);
    } catch (error) {
      console.error('Error loading overview:', error);
      message.error('Error al cargar vista general');
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherStats = async () => {
    try {
      setLoading(true);
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const response = await apiClient.get<{ teachers: TeacherStats[] }>(
        `/attendance/admin/teacher-stats?startDate=${startDate}&endDate=${endDate}`
      );

      setTeacherStats(response.data.teachers);
    } catch (error) {
      console.error('Error loading teacher stats:', error);
      message.error('Error al cargar estadísticas de profesores');
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherRecords = async (teacherId: string) => {
    try {
      setLoading(true);
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');

      const response = await apiClient.get(
        `/attendance/admin/by-teacher/${teacherId}?startDate=${startDate}&endDate=${endDate}&limit=100`
      );

      setTeacherRecords(response.data.records || []);
      setSelectedTeacherId(teacherId);
    } catch (error) {
      console.error('Error loading teacher records:', error);
      message.error('Error al cargar registros del profesor');
    } finally {
      setLoading(false);
    }
  };

  const loadAlerts = async () => {
    try {
      setLoading(true);

      const response = await apiClient.get<AlertsResponse>(
        `/attendance/admin/alerts?days=${alertDays}`
      );

      setAlerts(response.data);
    } catch (error) {
      console.error('Error loading alerts:', error);
      message.error('Error al cargar alertas');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      present: 'green',
      absent: 'red',
      late: 'orange',
      early_departure: 'blue',
      justified_absence: 'purple',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      present: 'Presente',
      absent: 'Ausente',
      late: 'Tardanza',
      early_departure: 'Salida Anticipada',
      justified_absence: 'Ausencia Justificada',
    };
    return labels[status] || status;
  };

  const getAlertIcon = (alertType: string) => {
    if (alertType === 'critical') return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    if (alertType === 'warning') return <WarningOutlined style={{ color: '#faad14' }} />;
    return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
  };

  // Columnas para tabla de profesores
  const teacherColumns: ColumnsType<TeacherStats> = [
    {
      title: 'Profesor',
      dataIndex: ['teacher', 'name'],
      key: 'teacherName',
      render: (name, record) => (
        <Space>
          <UserOutlined />
          <div>
            <div><strong>{name}</strong></div>
            <Text type="secondary" style={{ fontSize: '12px' }}>{record.teacher.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Total Registros',
      dataIndex: 'totalRecords',
      key: 'totalRecords',
      sorter: (a, b) => a.totalRecords - b.totalRecords,
      render: (value) => <strong>{value}</strong>,
    },
    {
      title: 'Estudiantes',
      dataIndex: 'uniqueStudents',
      key: 'uniqueStudents',
      sorter: (a, b) => a.uniqueStudents - b.uniqueStudents,
    },
    {
      title: 'Días Activos',
      dataIndex: 'uniqueDates',
      key: 'uniqueDates',
      sorter: (a, b) => a.uniqueDates - b.uniqueDates,
    },
    {
      title: 'Última Actividad',
      dataIndex: 'lastActivityDate',
      key: 'lastActivityDate',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a, b) => dayjs(a.lastActivityDate).unix() - dayjs(b.lastActivityDate).unix(),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => loadTeacherRecords(record.teacher.id)}
        >
          Ver Detalles
        </Button>
      ),
    },
  ];

  // Columnas para tabla de registros del profesor
  const teacherRecordsColumns: ColumnsType<any> = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Estudiante',
      key: 'student',
      render: (_, record) => (
        <div>
          <div>{record.student?.user?.profile?.firstName} {record.student?.user?.profile?.lastName}</div>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.student?.enrollmentNumber}
          </Text>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {getStatusLabel(status)}
        </Tag>
      ),
      filters: [
        { text: 'Presente', value: 'present' },
        { text: 'Ausente', value: 'absent' },
        { text: 'Tardanza', value: 'late' },
        { text: 'Salida Anticipada', value: 'early_departure' },
        { text: 'Ausencia Justificada', value: 'justified_absence' },
      ],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Registrado',
      dataIndex: 'markedAt',
      key: 'markedAt',
      render: (markedAt) => dayjs(markedAt).format('HH:mm'),
    },
  ];

  // Columnas para tabla de alertas de estudiantes
  const studentAlertsColumns: ColumnsType<AttendanceAlert> = [
    {
      title: 'Estudiante',
      key: 'student',
      render: (_, record) => (
        <Space>
          {getAlertIcon(record.alertType)}
          <div>
            <div><strong>{record.student?.name}</strong></div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.student?.enrollmentNumber}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Tasa Asistencia',
      dataIndex: 'attendanceRate',
      key: 'attendanceRate',
      render: (rate) => (
        <Tag color={rate < 70 ? 'red' : rate < 85 ? 'orange' : 'green'}>
          {rate?.toFixed(1)}%
        </Tag>
      ),
      sorter: (a, b) => (a.attendanceRate || 0) - (b.attendanceRate || 0),
    },
    {
      title: 'Presente/Total',
      key: 'attendance',
      render: (_, record) => (
        <span>{record.present}/{record.totalDays}</span>
      ),
    },
    {
      title: 'Ausencias',
      dataIndex: 'absent',
      key: 'absent',
      sorter: (a, b) => (a.absent || 0) - (b.absent || 0),
    },
    {
      title: 'Consecutivas',
      dataIndex: 'consecutiveAbsences',
      key: 'consecutiveAbsences',
      render: (value) => value >= 3 ? <Tag color="red">{value}</Tag> : value,
      sorter: (a, b) => (a.consecutiveAbsences || 0) - (b.consecutiveAbsences || 0),
    },
    {
      title: 'Motivo Alerta',
      dataIndex: 'reason',
      key: 'reason',
    },
  ];

  // Columnas para tabla de alertas de profesores
  const teacherAlertsColumns: ColumnsType<AttendanceAlert> = [
    {
      title: 'Profesor',
      key: 'teacher',
      render: (_, record) => (
        <Space>
          <WarningOutlined style={{ color: '#faad14' }} />
          <div>
            <div><strong>{record.teacher?.name}</strong></div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.teacher?.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Motivo',
      dataIndex: 'reason',
      key: 'reason',
    },
  ];

  return (
    <div style={{ padding: '24px', background: 'linear-gradient(135deg, #f0f5ff 0%, #f9f0ff 100%)', minHeight: '100vh' }}>
      <Title level={2}>
        <FileTextOutlined /> Análisis de Asistencia
      </Title>
      <Text type="secondary">
        Panel completo de administración para revisar asistencias por profesor, grupo y alumno
      </Text>

      <Card style={{ marginTop: '24px' }}>
        <Space style={{ marginBottom: '16px' }}>
          <RangePicker
            value={dateRange}
            onChange={(dates) => dates && setDateRange([dates[0]!, dates[1]!])}
            format="DD/MM/YYYY"
          />
        </Space>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* TAB 1: OVERVIEW */}
          <TabPane
            tab={
              <span>
                <TeamOutlined /> Vista General
              </span>
            }
            key="overview"
          >
            <Spin spinning={loading}>
              {overview && (
                <>
                  <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                    <Col xs={24} sm={12} md={6}>
                      <Card style={{ borderTop: '4px solid #1890ff' }}>
                        <Statistic
                          title="Total Registros"
                          value={overview.totalRecords}
                          prefix={<FileTextOutlined />}
                          valueStyle={{ color: '#1890ff' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card style={{ borderTop: '4px solid #13c2c2' }}>
                        <Statistic
                          title="Estudiantes"
                          value={overview.uniqueStudents}
                          prefix={<UserOutlined />}
                          valueStyle={{ color: '#13c2c2' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card style={{ borderTop: `4px solid ${overview.rates.attendance >= 85 ? '#52c41a' : '#ff4d4f'}` }}>
                        <Statistic
                          title="Tasa Asistencia"
                          value={overview.rates.attendance}
                          precision={1}
                          suffix="%"
                          prefix={<CheckCircleOutlined />}
                          valueStyle={{ color: overview.rates.attendance >= 85 ? '#3f8600' : '#cf1322' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                      <Card style={{ borderTop: `4px solid ${overview.rates.punctuality >= 90 ? '#52c41a' : '#ff4d4f'}` }}>
                        <Statistic
                          title="Puntualidad"
                          value={overview.rates.punctuality}
                          precision={1}
                          suffix="%"
                          prefix={<ClockCircleOutlined />}
                          valueStyle={{ color: overview.rates.punctuality >= 90 ? '#3f8600' : '#cf1322' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Card title="Distribución por Estado">
                    {(() => {
                      const total = overview.totalRecords || 1;
                      const statuses = [
                        { label: 'Presentes', value: overview.byStatus.present, color: '#52c41a', tagColor: 'green' },
                        { label: 'Ausentes', value: overview.byStatus.absent, color: '#ff4d4f', tagColor: 'red' },
                        { label: 'Tardanzas', value: overview.byStatus.late, color: '#faad14', tagColor: 'orange' },
                        { label: 'Salidas Anticipadas', value: overview.byStatus.earlyDeparture, color: '#1890ff', tagColor: 'blue' },
                        { label: 'Justificadas', value: overview.byStatus.justifiedAbsence, color: '#722ed1', tagColor: 'purple' },
                      ];
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {statuses.map(s => (
                            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <Tag color={s.tagColor} style={{ minWidth: '52px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
                                {s.value}
                              </Tag>
                              <div style={{ flex: 1 }}>
                                <Progress
                                  percent={Math.round((s.value / total) * 100)}
                                  strokeColor={s.color}
                                  size="small"
                                  format={(p) => `${p}%`}
                                />
                              </div>
                              <Text style={{ minWidth: '130px', color: '#595959', fontSize: '13px' }}>{s.label}</Text>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </Card>
                </>
              )}
            </Spin>
          </TabPane>

          {/* TAB 2: TEACHERS */}
          <TabPane
            tab={
              <span>
                <UserOutlined /> Por Profesor
              </span>
            }
            key="teachers"
          >
            <Spin spinning={loading}>
              <Card title="Estadísticas por Profesor" style={{ marginBottom: '16px' }}>
                <Alert
                  message="Revisa la actividad de cada profesor"
                  description="Aquí puedes ver cuántos registros ha hecho cada profesor, identificar si están registrando asistencia correctamente y detectar posibles problemas."
                  type="info"
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                <Table
                  columns={teacherColumns}
                  dataSource={teacherStats}
                  rowKey={(record) => record.teacher.id}
                  pagination={{ pageSize: 10 }}
                />
              </Card>

              {selectedTeacherId && teacherRecords.length > 0 && (
                <Card
                  title="Detalles de Registros"
                  extra={
                    <Button onClick={() => setSelectedTeacherId(null)}>
                      Cerrar
                    </Button>
                  }
                >
                  <Table
                    columns={teacherRecordsColumns}
                    dataSource={teacherRecords}
                    rowKey={(record) => record.id}
                    pagination={{ pageSize: 20 }}
                  />
                </Card>
              )}
            </Spin>
          </TabPane>

          {/* TAB 3: ALERTS */}
          <TabPane
            tab={
              <span>
                <WarningOutlined /> Alertas
              </span>
            }
            key="alerts"
          >
            <Space style={{ marginBottom: '16px' }}>
              <Text>Analizar últimos:</Text>
              <Select value={alertDays} onChange={setAlertDays} style={{ width: '120px' }}>
                <Option value={7}>7 días</Option>
                <Option value={15}>15 días</Option>
                <Option value={30}>30 días</Option>
                <Option value={60}>60 días</Option>
              </Select>
            </Space>

            <Spin spinning={loading}>
              {alerts && (
                <>
                  <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                    <Col xs={24} sm={8}>
                      <Card>
                        <Statistic
                          title="Alertas Estudiantes"
                          value={alerts.summary.totalStudentAlerts}
                          prefix={<ExclamationCircleOutlined />}
                          valueStyle={{ color: alerts.summary.totalStudentAlerts > 0 ? '#cf1322' : '#3f8600' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card>
                        <Statistic
                          title="Estudiantes Críticos"
                          value={alerts.summary.criticalStudents}
                          prefix={<CloseCircleOutlined />}
                          valueStyle={{ color: '#cf1322' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                      <Card>
                        <Statistic
                          title="Profesores Sin Actividad"
                          value={alerts.summary.totalTeacherAlerts}
                          prefix={<WarningOutlined />}
                          valueStyle={{ color: alerts.summary.totalTeacherAlerts > 0 ? '#fa8c16' : '#3f8600' }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  <Card title="Alertas de Estudiantes" style={{ marginBottom: '16px' }}>
                    {alerts.studentAlerts.length > 0 ? (
                      <Table
                        columns={studentAlertsColumns}
                        dataSource={alerts.studentAlerts}
                        rowKey={(record) => record.student!.id}
                        pagination={{ pageSize: 10 }}
                      />
                    ) : (
                      <Empty description="No hay alertas de estudiantes" />
                    )}
                  </Card>

                  <Card title="Alertas de Profesores">
                    {alerts.teacherAlerts.length > 0 ? (
                      <Table
                        columns={teacherAlertsColumns}
                        dataSource={alerts.teacherAlerts}
                        rowKey={(record) => record.teacher!.id}
                        pagination={{ pageSize: 10 }}
                      />
                    ) : (
                      <Empty description="No hay alertas de profesores" />
                    )}
                  </Card>
                </>
              )}
            </Spin>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};
