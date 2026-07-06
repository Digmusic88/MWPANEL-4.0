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
  List,
  Select,
  DatePicker,
  Button
} from 'antd';
import {
  PieChartOutlined,
  TeamOutlined,
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

interface GroupAttendanceStatsModalProps {
  visible: boolean;
  onClose: () => void;
  classGroupId: string;
  classGroupName: string;
  startDate: string;
  endDate: string;
}

interface GroupStats {
  student: {
    id: string;
    name: string;
  };
  totalDays: number;
  present: number;
  absent: number;
  late: number;
  justifiedLate: number;
  justifiedAbsence: number;
  attendanceRate: number;
}

const GroupAttendanceStatsModal: React.FC<GroupAttendanceStatsModalProps> = ({
  visible,
  onClose,
  classGroupId,
  classGroupName,
  startDate: initialStartDate,
  endDate: initialEndDate
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [groupStats, setGroupStats] = useState<GroupStats[]>([]);
  const [dateRangeType, setDateRangeType] = useState<string>('lastMonth');
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs(initialStartDate),
    dayjs(initialEndDate)
  ]);
  const [currentStartDate, setCurrentStartDate] = useState(initialStartDate);
  const [currentEndDate, setCurrentEndDate] = useState(initialEndDate);

  useEffect(() => {
    if (visible && classGroupId) {
      loadGroupStats();
    }
  }, [visible, classGroupId, currentStartDate, currentEndDate]);

  const handleDateRangeTypeChange = (type: string) => {
    setDateRangeType(type);
    
    const now = dayjs();
    let newStartDate = currentStartDate;
    let newEndDate = currentEndDate;
    
    switch (type) {
      case 'lastMonth':
        newStartDate = now.subtract(1, 'month').format('YYYY-MM-DD');
        newEndDate = now.format('YYYY-MM-DD');
        break;
      case 'last3Months':
        newStartDate = now.subtract(3, 'months').format('YYYY-MM-DD');
        newEndDate = now.format('YYYY-MM-DD');
        break;
      case 'lastYear':
        newStartDate = now.subtract(1, 'year').format('YYYY-MM-DD');
        newEndDate = now.format('YYYY-MM-DD');
        break;
      case 'currentAcademicYear':
        // Año académico: septiembre - agosto
        const currentYear = now.year();
        const startAcademic = now.month() >= 8 ? currentYear : currentYear - 1; // Si estamos después de agosto, empezamos este año
        newStartDate = dayjs().year(startAcademic).month(8).date(1).format('YYYY-MM-DD'); // 1 septiembre
        newEndDate = now.format('YYYY-MM-DD');
        break;
      case 'custom':
        // No cambiar las fechas para custom, el usuario las seleccionará
        return;
    }
    
    setCurrentStartDate(newStartDate);
    setCurrentEndDate(newEndDate);
    setCustomDateRange([dayjs(newStartDate), dayjs(newEndDate)]);
  };

  const handleCustomDateRangeChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    if (dates) {
      const [start, end] = dates;
      setCustomDateRange(dates);
      setCurrentStartDate(start.format('YYYY-MM-DD'));
      setCurrentEndDate(end.format('YYYY-MM-DD'));
    }
  };

  const applyCustomDateRange = () => {
    loadGroupStats();
  };

  const loadGroupStats = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/attendance/stats/group/${classGroupId}?startDate=${currentStartDate}&endDate=${currentEndDate}`
      );
      setGroupStats(response.data);
    } catch (error: any) {
      console.error('Error loading group attendance stats:', error);
      message.error(error.response?.data?.message || 'Error al cargar estadísticas del grupo');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate attendance rate for individual student
  const calculateAttendanceRate = (student: GroupStats) => {
    const totalDays = student.totalDays || 0;
    if (totalDays === 0) return 0;

    // Present + Late + Justified Late count as attendance
    const presentDays = (student.present || 0) + (student.late || 0) + (student.justifiedLate || 0);
    return Math.round((presentDays / totalDays) * 100);
  };

  // Helper function to enhance group stats with calculated attendance rates
  const getEnhancedGroupStats = () => {
    return groupStats.map(student => ({
      ...student,
      attendanceRate: student.attendanceRate !== undefined ? student.attendanceRate : calculateAttendanceRate(student)
    }));
  };

  const calculateGlobalStats = () => {
    if (!groupStats.length) return null;

    const enhancedStats = getEnhancedGroupStats();
    
    const totals = enhancedStats.reduce((acc, student) => {
      acc.totalDays += student.totalDays || 0;
      acc.present += student.present || 0;
      acc.absent += student.absent || 0;
      acc.late += student.late || 0;
      acc.justifiedLate += student.justifiedLate || 0;
      acc.justifiedAbsence += student.justifiedAbsence || 0;
      return acc;
    }, {
      totalDays: 0,
      present: 0,
      absent: 0,
      late: 0,
      justifiedLate: 0,
      justifiedAbsence: 0
    });

    // Calcular días presentes sin tardanza para el gráfico
    const presentWithoutLate = totals.present - totals.late;

    return {
      ...totals,
      presentWithoutLate,
      totalStudents: groupStats.length,
      avgAttendanceRate: enhancedStats.length > 0 ? 
        enhancedStats.reduce((acc, s) => acc + (s.attendanceRate || 0), 0) / enhancedStats.length : 0
    };
  };

  const getPieChartData = () => {
    const globalStats = calculateGlobalStats();
    if (!globalStats) return [];

    const data = [
      {
        type: 'Presente',
        value: globalStats.presentWithoutLate,
        percentage: globalStats.totalDays > 0 ?
          ((globalStats.presentWithoutLate / globalStats.totalDays) * 100).toFixed(1) : '0.0',
        color: '#16a34a'
      },
      {
        type: 'Tardanza',
        value: globalStats.late,
        percentage: globalStats.totalDays > 0 ?
          ((globalStats.late / globalStats.totalDays) * 100).toFixed(1) : '0.0',
        color: '#fa8c16'
      },
      {
        type: 'Ausente',
        value: globalStats.absent,
        percentage: globalStats.totalDays > 0 ?
          ((globalStats.absent / globalStats.totalDays) * 100).toFixed(1) : '0.0',
        color: '#ff4d4f'
      },
      {
        type: 'Justificada',
        value: globalStats.justifiedAbsence,
        percentage: globalStats.totalDays > 0 ?
          ((globalStats.justifiedAbsence / globalStats.totalDays) * 100).toFixed(1) : '0.0',
        color: '#eb2f96'
      }
    ].filter(item => item.value > 0);

    return data;
  };

  const globalStats = calculateGlobalStats();

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
        content: globalStats ? `${globalStats.totalDays} días` : '0 días',
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
        };
      },
    },
  };

  const getStatusColor = (attendanceRate: number) => {
    const rate = attendanceRate || 0;
    if (rate >= 95) return 'success';
    if (rate >= 85) return 'warning';
    return 'error';
  };

  const getStatusIcon = (attendanceRate: number) => {
    const rate = attendanceRate || 0;
    if (rate >= 95) return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    if (rate >= 85) return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
  };

  return (
    <Modal
      title={
        <Space>
          <TeamOutlined />
          <span>{isMobile ? 'Estadísticas Grupo' : `Estadísticas Grupales - ${classGroupName}`}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={isMobile ? '95vw' : isTablet ? '90vw' : 900}
      style={{ top: isMobile ? 20 : undefined }}
      styles={{ body: { padding: isMobile ? '12px' : '24px' } }}
      centered={!isMobile}
    >
      {loading ? (
        <div className="flex justify-center items-center py-8">
          <Spin size="large" />
        </div>
      ) : globalStats ? (
        <div className={isMobile ? 'space-y-4' : 'space-y-6'}>
          {/* Nombre del grupo en móvil */}
          {isMobile && (
            <div className="text-center mb-2">
              <Text strong className="text-base">{classGroupName}</Text>
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
                {new Date(currentStartDate).toLocaleDateString('es-ES')} - {new Date(currentEndDate).toLocaleDateString('es-ES')}
              </Text>
            </Space>
          </Card>

          {/* Información general */}
          <Alert
            message={`Análisis de ${globalStats ? globalStats.totalStudents : 0} estudiantes del grupo`}
            description={`Período seleccionado: ${new Date(currentStartDate).toLocaleDateString('es-ES')} - ${new Date(currentEndDate).toLocaleDateString('es-ES')}`}
            type="info"
            showIcon
            icon={<CalendarOutlined />}
          />

          {/* Estadísticas resumidas globales */}
          <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={isMobile ? 'Estudiantes' : 'Total Estudiantes'}
                  value={globalStats.totalStudents}
                  prefix={<TeamOutlined />}
                  valueStyle={{ color: '#1890ff', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title="Presente"
                  value={globalStats.presentWithoutLate}
                  suffix={isMobile ? '' : `(${globalStats.totalDays > 0 ? ((globalStats.presentWithoutLate / globalStats.totalDays) * 100).toFixed(1) : '0.0'}%)`}
                  prefix={<CheckCircleOutlined />}
                  valueStyle={{ color: '#52c41a', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title="Tardanza"
                  value={globalStats.late}
                  suffix={isMobile ? '' : `(${globalStats.totalDays > 0 ? ((globalStats.late / globalStats.totalDays) * 100).toFixed(1) : '0.0'}%)`}
                  prefix={<ClockCircleOutlined />}
                  valueStyle={{ color: '#faad14', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title="Ausente"
                  value={globalStats.absent}
                  suffix={isMobile ? '' : `(${globalStats.totalDays > 0 ? ((globalStats.absent / globalStats.totalDays) * 100).toFixed(1) : '0.0'}%)`}
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
                  value={globalStats.justifiedAbsence}
                  suffix={isMobile ? '' : `(${globalStats.totalDays > 0 ? ((globalStats.justifiedAbsence / globalStats.totalDays) * 100).toFixed(1) : '0.0'}%)`}
                  prefix={<ExclamationCircleOutlined />}
                  valueStyle={{ color: '#1890ff', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={isMobile ? 'Prom. Asist.' : 'Promedio Asistencia'}
                  value={(globalStats.avgAttendanceRate || 0).toFixed(1)}
                  suffix="%"
                  valueStyle={{ color: (globalStats.avgAttendanceRate || 0) >= 85 ? '#52c41a' : '#ff4d4f', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={isMobile ? 'Registros' : 'Total Registros'}
                  value={globalStats.totalDays}
                  valueStyle={{ color: '#1890ff', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={6}>
              <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
                <Statistic
                  title={isMobile ? 'Días Acad.' : 'Días Académicos'}
                  value={Math.round(globalStats.totalDays / globalStats.totalStudents)}
                  suffix={isMobile ? '' : 'días'}
                  valueStyle={{ color: '#722ed1', fontSize: isMobile ? '18px' : '24px' }}
                />
              </Card>
            </Col>
          </Row>

          {/* Gráfico de sectores global */}
          {globalStats.totalDays > 0 && (
            <Card title={isMobile ? 'Distribución' : 'Distribución Global de Asistencia'} size={isMobile ? 'small' : 'default'}>
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
            </Card>
          )}

          {/* Ranking de estudiantes por asistencia */}
          {groupStats.length > 0 && (
            <Card title={isMobile ? 'Ranking' : 'Ranking de Asistencia por Estudiante'} size={isMobile ? 'small' : 'default'}>
              <List
                dataSource={[...getEnhancedGroupStats()].sort((a, b) => (b.attendanceRate || 0) - (a.attendanceRate || 0))}
                size={isMobile ? 'small' : 'default'}
                renderItem={(student, index) => (
                  <List.Item className={isMobile ? 'px-2' : ''}>
                    <div className={`w-full ${isMobile ? 'flex flex-col gap-2' : 'flex justify-between items-center'}`}>
                      <div className={`flex items-center ${isMobile ? 'gap-2' : 'space-x-3'}`}>
                        <div className={`font-bold ${isMobile ? 'text-base' : 'text-lg'} text-gray-500 ${isMobile ? 'w-6' : 'w-8'}`}>
                          #{index + 1}
                        </div>
                        {getStatusIcon(student.attendanceRate || 0)}
                        <div>
                          <Text strong className={isMobile ? 'text-sm' : 'text-base'}>{student.student?.name || 'Nombre no disponible'}</Text>
                          {!isMobile && (
                            <div className="text-sm text-gray-500">
                              {student.totalDays || 0} registros totales
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={isMobile ? 'flex items-center justify-between' : 'text-right'}>
                        <div className={`${isMobile ? 'text-base' : 'text-lg'} font-bold`} style={{
                          color: (student.attendanceRate || 0) >= 95 ? '#52c41a' :
                                 (student.attendanceRate || 0) >= 85 ? '#faad14' : '#ff4d4f'
                        }}>
                          {(student.attendanceRate || 0).toFixed(1)}%
                        </div>
                        <div className={`text-xs text-gray-500 ${isMobile ? 'flex gap-1' : 'space-x-1'}`}>
                          <Tag color="success" style={{ margin: 0 }}>{(student.present || 0) - (student.late || 0)}</Tag>
                          <Tag color="warning" style={{ margin: 0 }}>{student.late || 0}</Tag>
                          <Tag color="error" style={{ margin: 0 }}>{student.absent || 0}</Tag>
                          {!isMobile && <Tag color="default" style={{ margin: 0 }}>{student.justifiedAbsence || 0}</Tag>}
                        </div>
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          )}

          {globalStats.totalDays === 0 && (
            <Alert
              message="Sin datos"
              description="No hay registros de asistencia para este período y grupo."
              type="warning"
              showIcon
            />
          )}
        </div>
      ) : (
        <Alert
          message="Error al cargar datos"
          description="No se pudieron cargar las estadísticas del grupo."
          type="error"
          showIcon
        />
      )}
    </Modal>
  );
};

export default GroupAttendanceStatsModal;