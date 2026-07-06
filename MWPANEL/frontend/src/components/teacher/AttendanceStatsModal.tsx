import React, { useState, useEffect } from 'react';
import {
  Modal,
  Card,
  Typography,
  Row,
  Col,
  Statistic,
  Spin,
  message,
  Alert,
  Space,
  Tag,
  Select,
  DatePicker,
  Button
} from 'antd';
import {
  PieChartOutlined,
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Pie } from '@ant-design/plots';
import dayjs from 'dayjs';
import apiClient from '../../services/apiClient';
import { useResponsive } from '../../hooks/useResponsive';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface AttendanceStatsModalProps {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  days?: number;
}

interface AttendanceStats {
  studentId: string;
  period: string;
  stats: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    justifiedAbsences: number;
    attendanceRate: number;
    punctualityRate: number;
    attendanceDays: string;
  };
  recentRecords: Array<{
    date: string;
    status: string;
    justification?: string;
    markedBy: string;
  }>;
}

const AttendanceStatsModal: React.FC<AttendanceStatsModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
  days = 30
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [dateRangeType, setDateRangeType] = useState<string>('lastMonth');
  const [currentDays, setCurrentDays] = useState(days);
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(1, 'month'),
    dayjs()
  ]);

  useEffect(() => {
    if (visible && studentId) {
      loadStats();
    }
  }, [visible, studentId, currentDays]);

  const handleDateRangeTypeChange = (type: string) => {
    setDateRangeType(type);
    
    const now = dayjs();
    let newDays = currentDays;
    
    switch (type) {
      case 'lastMonth':
        newDays = 30;
        break;
      case 'last3Months':
        newDays = 90;
        break;
      case 'lastYear':
        newDays = 365;
        break;
      case 'currentAcademicYear':
        // Calcular días desde inicio del curso académico
        const currentYear = now.year();
        const startAcademic = now.month() >= 8 ? currentYear : currentYear - 1;
        const academicStartDate = dayjs().year(startAcademic).month(8).date(1);
        newDays = now.diff(academicStartDate, 'days');
        break;
      case 'custom':
        // Para custom usaremos días basados en el rango seleccionado
        return;
    }
    
    setCurrentDays(newDays);
  };

  const handleCustomDateRangeChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    if (dates) {
      const [start, end] = dates;
      setCustomDateRange(dates);
      // Calcular días entre las fechas seleccionadas
      const daysDiff = end.diff(start, 'days') + 1;
      setCurrentDays(daysDiff);
    }
  };

  const applyCustomDateRange = () => {
    loadStats();
  };

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/attendance/stats/student/${studentId}?days=${currentDays}`);
      setStats(response.data);
    } catch (error: any) {
      console.error('Error loading attendance stats:', error);
      message.error(error.response?.data?.message || 'Error al cargar estadísticas de asistencia');
    } finally {
      setLoading(false);
    }
  };

  const getPieChartData = () => {
    if (!stats) return [];

    const { presentDays, absentDays, lateDays, justifiedAbsences } = stats.stats;
    
    // Calcular días presentes sin tardanza
    const presentWithoutLate = presentDays - lateDays;

    const data = [
      {
        type: 'Presente',
        value: presentWithoutLate,
        percentage: stats.stats.totalDays > 0 ? ((presentWithoutLate / stats.stats.totalDays) * 100).toFixed(1) : '0.0',
        color: '#16a34a'
      },
      {
        type: 'Tardanza',
        value: lateDays,
        percentage: stats.stats.totalDays > 0 ? ((lateDays / stats.stats.totalDays) * 100).toFixed(1) : '0.0',
        color: '#fa8c16'
      },
      {
        type: 'Ausente',
        value: absentDays,
        percentage: stats.stats.totalDays > 0 ? ((absentDays / stats.stats.totalDays) * 100).toFixed(1) : '0.0',
        color: '#ff4d4f'
      },
      {
        type: 'Justificada',
        value: justifiedAbsences,
        percentage: stats.stats.totalDays > 0 ? ((justifiedAbsences / stats.stats.totalDays) * 100).toFixed(1) : '0.0',
        color: '#eb2f96'
      }
    ].filter(item => item.value > 0); // Solo mostrar categorías con valores > 0

    return data;
  };

  const pieConfig = {
    data: getPieChartData(),
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.4,
    color: ({ type }: any) => {
      const item = getPieChartData().find(d => d.type === type);
      return item?.color || '#d9d9d9';
    },
    label: false,
    legend: false,
    statistic: {
      title: {
        content: 'Total',
        style: {
          fontSize: '16px',
          fontWeight: 'bold',
        },
      },
      content: {
        content: `${stats?.stats.totalDays || 0} días`,
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
          value: `${data.value} días (${data.percentage}%)`,
        };
      },
    },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'success';
      case 'ABSENT':
        return 'red';
      case 'LATE':
        return 'orange';
      case 'JUSTIFIED_LATE':
        return 'purple';
      case 'EARLY_DEPARTURE':
        return 'blue';
      case 'JUSTIFIED_ABSENCE':
        return 'magenta';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return 'Presente';
      case 'ABSENT':
        return 'Ausente';
      case 'LATE':
        return 'Tardanza';
      case 'JUSTIFIED_ABSENCE':
        return 'Falta Justificada';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'ABSENT':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'LATE':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'JUSTIFIED_ABSENCE':
        return <ExclamationCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <UserOutlined />;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <PieChartOutlined />
          <span>{isMobile ? 'Estadísticas' : `Estadísticas de Asistencia - ${studentName}`}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '95vw' : isTablet ? '90vw' : 800}
      style={{ top: isMobile ? 20 : undefined }}
      styles={{ body: { padding: isMobile ? '12px' : '24px' } }}
      centered={!isMobile}
    >
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      ) : stats ? (
        <div className={isMobile ? 'space-y-4' : 'space-y-6'}>
          {/* Nombre del estudiante en móvil */}
          {isMobile && (
            <div className="text-center mb-2">
              <Text strong className="text-base">{studentName}</Text>
            </div>
          )}

          {/* Selector de fechas */}
          <Card title="Período de Análisis" size="small">
            <Space wrap className="w-full" direction={isMobile ? 'vertical' : 'horizontal'}>
              <Select
                value={dateRangeType}
                onChange={handleDateRangeTypeChange}
                style={{ width: isMobile ? '100%' : 200 }}
              >
                <Option value="lastMonth">Último mes</Option>
                <Option value="last3Months">Últimos 3 meses</Option>
                <Option value="lastYear">Último año</Option>
                <Option value="currentAcademicYear">Curso actual</Option>
                <Option value="custom">Personalizado</Option>
              </Select>

              {dateRangeType === 'custom' && (
                <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
                  <RangePicker
                    value={customDateRange}
                    onChange={handleCustomDateRangeChange}
                    format="DD/MM/YYYY"
                    style={{ width: isMobile ? '100%' : 'auto' }}
                  />
                  <Button
                    type="primary"
                    onClick={applyCustomDateRange}
                    loading={loading}
                    block={isMobile}
                  >
                    Aplicar
                  </Button>
                </Space>
              )}

              <Text type="secondary" className={isMobile ? 'text-center block' : ''}>
                Analizando últimos {currentDays} días
              </Text>
            </Space>
          </Card>

          {/* Información general */}
          <Alert
            message={`Período analizado: ${stats.period} (${currentDays} días)`}
            type="info"
            showIcon
            icon={<CalendarOutlined />}
          />

          {/* Estadísticas resumidas */}
          <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title="Total Días"
                  value={stats.stats.totalDays}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: '#1890ff', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title="Presente"
                  value={stats.stats.presentDays - stats.stats.lateDays}
                  suffix={isMobile ? '' : `(${stats.stats.totalDays > 0 ? (((stats.stats.presentDays - stats.stats.lateDays) / stats.stats.totalDays) * 100).toFixed(1) : '0.0'}%)`}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title="Tardanza"
                  value={stats.stats.lateDays}
                  suffix={isMobile ? '' : `(${stats.stats.totalDays > 0 ? ((stats.stats.lateDays / stats.stats.totalDays) * 100).toFixed(1) : '0.0'}%)`}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title="Ausente"
                  value={stats.stats.absentDays}
                  suffix={isMobile ? '' : `(${stats.stats.totalDays > 0 ? ((stats.stats.absentDays / stats.stats.totalDays) * 100).toFixed(1) : '0.0'}%)`}
                  prefix={<CloseCircleOutlined />}
                  valueStyle={{ color: '#ff4d4f', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title="Justificada"
                  value={stats.stats.justifiedAbsences}
                  suffix={isMobile ? '' : `(${stats.stats.totalDays > 0 ? ((stats.stats.justifiedAbsences / stats.stats.totalDays) * 100).toFixed(1) : '0.0'}%)`}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: '#1890ff', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title="Tasa Asistencia"
                  value={stats.stats.attendanceRate}
                  suffix="%"
                  valueStyle={{ color: stats.stats.attendanceRate >= 80 ? '#52c41a' : '#ff4d4f', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title="Puntualidad"
                  value={stats.stats.punctualityRate}
                  suffix="%"
                  valueStyle={{ color: stats.stats.punctualityRate >= 80 ? '#52c41a' : '#faad14', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={isMobile ? 'Días Asist.' : 'Días Asistencia'}
                  value={stats.stats.attendanceDays}
                  valueStyle={{ color: '#1890ff', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Gráfico de sectores */}
          {stats.stats.totalDays > 0 && (
            <Card title="Distribución de Asistencia" size={isMobile ? 'small' : 'default'}>
              <div style={{ height: isMobile ? 250 : 320 }}>
                <Pie {...pieConfig} />
              </div>
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
                        {item.value} {item.value === 1 ? 'día' : 'días'}
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
            </Card>
          )}

          {/* Registros recientes */}
          {stats.recentRecords.length > 0 && (
            <Card title={isMobile ? 'Recientes' : 'Registros Recientes (Últimos 10)'} size={isMobile ? 'small' : 'default'}>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {stats.recentRecords.map((record, index) => (
                  <div key={index} className={`${isMobile ? 'flex-col' : 'flex justify-between items-center'} p-2 bg-gray-50 rounded`}>
                    <div className={`flex items-center ${isMobile ? 'flex-wrap gap-2' : 'space-x-2'}`}>
                      {getStatusIcon(record.status)}
                      <span className="font-medium text-sm">
                        {new Date(record.date).toLocaleDateString('es-ES')}
                      </span>
                      <Tag color={getStatusColor(record.status)}>
                        {getStatusText(record.status)}
                      </Tag>
                    </div>
                    {record.justification && (
                      <Text type="secondary" className={`text-xs ${isMobile ? 'block mt-1' : ''}`}>
                        {record.justification}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {stats.stats.totalDays === 0 && (
            <Alert
              message="Sin datos"
              description="No hay registros de asistencia para este período."
              type="warning"
              showIcon
            />
          )}
        </div>
      ) : (
        <Alert
          message="Error al cargar datos"
          description="No se pudieron cargar las estadísticas de asistencia."
          type="error"
          showIcon
        />
      )}
    </Modal>
  );
};

export default AttendanceStatsModal;