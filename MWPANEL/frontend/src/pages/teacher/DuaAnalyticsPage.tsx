/**
 * @page: DuaAnalyticsPage
 * @module: DUA Advanced Analytics
 * @description: Página de análisis avanzado del sistema DUA para profesores
 * @role: Teacher, Admin
 * @features: Análisis detallado, gráficos avanzados, métricas complejas
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  Typography,
  Space,
  Button,
  Statistic,
  Progress,
  Select,
  DatePicker,
  Table,
  Tag,
  Avatar,
  Empty,
  Spin,
  message,
  Tooltip,
  Badge,
} from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  RiseOutlined,
  FallOutlined,
  UserOutlined,
  BookOutlined,
  CalendarOutlined,
  DownloadOutlined,
  FilterOutlined,
  ReloadOutlined,
  LeftOutlined,
  StarOutlined,
  TeamOutlined,
  BulbOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Line, Column, Pie, Radar, Area } from '@ant-design/plots';
import dayjs from 'dayjs';
import {
  useDuaDashboardOverview,
  useDuaTeacherDashboard,
  useAccommodationAnalytics,
  useDuaProfiles,
  useEffectivenessRecords,
} from '../../hooks/useDua';
import { useAuth } from '../../hooks/useAuth';
import { DuaPageHeader } from '../../components/dua/DuaPageHeader';

const { Text } = Typography;
const { RangePicker } = DatePicker;

const DuaAnalyticsPage: React.FC = () => {
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === "function") {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn("Navigation error:", error, "Path:", path);
      }
    } else {
      console.warn("Navigate function not available:", path);
    }
  }, [navigate]);
  const { user } = useAuth();
  
  // State management
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(90, 'days'),
    dayjs(),
  ]);
  const [selectedMetric, setSelectedMetric] = useState<string>('effectiveness');
  const [loading, setLoading] = useState(false);

  // Data hooks
  const overviewDashboard = useDuaDashboardOverview({
    startDate: dateRange[0].toDate(),
    endDate: dateRange[1].toDate(),
  });
  
  const accommodationAnalytics = useAccommodationAnalytics({
    startDate: dateRange[0].toDate(),
    endDate: dateRange[1].toDate(),
  });

  const duaProfiles = useDuaProfiles({
    isActive: true,
    limit: 50,
  });

  const effectivenessRecords = useEffectivenessRecords({
    startDate: dateRange[0].toDate(),
    endDate: dateRange[1].toDate(),
    limit: 100,
  });

  // Calculate advanced metrics
  const advancedMetrics = React.useMemo(() => {
    const totalProfiles = duaProfiles.data?.data?.length || 0;
    const totalAccommodations = accommodationAnalytics.data?.totalAccommodations || 0;
    const activeAccommodations = accommodationAnalytics.data?.activeAccommodations || 0;
    const averageEffectiveness = accommodationAnalytics.data?.averageEffectiveness || 0;
    const effectivenessData = effectivenessRecords.data?.data || [];

    return {
      adoptionRate: totalProfiles > 0 ? Math.round((totalProfiles / 100) * 100) : 0,
      implementationRate: totalAccommodations > 0 ? Math.round((activeAccommodations / totalAccommodations) * 100) : 0,
      effectivenessScore: Math.round(averageEffectiveness * 20),
      totalEvaluations: effectivenessData.length,
      trendDirection: averageEffectiveness > 3.5 ? 'up' : averageEffectiveness < 2.5 ? 'down' : 'stable',
    };
  }, [duaProfiles.data, accommodationAnalytics.data, effectivenessRecords.data]);

  // Chart configurations
  const effectivenessTrendConfig = {
    data: effectivenessRecords.data?.data?.map((record: any, index: number) => ({
      date: dayjs(record.evaluationDate).format('DD/MM'),
      effectiveness: record.effectivenessRating,
      student: record.student?.user?.profile?.firstName || `Estudiante ${index + 1}`,
    })) || [],
    xField: 'date',
    yField: 'effectiveness',
    seriesField: 'student',
    smooth: true,
    point: {
      size: 3,
      shape: 'circle',
    },
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
    yAxis: {
      min: 0,
      max: 5,
      tickInterval: 1,
    },
  };

  const accommodationDistributionConfig = {
    data: Object.entries(accommodationAnalytics.data?.accommodationsByType || {}).map(
      ([type, count]) => ({ type: type.replace(/_/g, ' '), count })
    ),
    angleField: 'count',
    colorField: 'type',
    radius: 0.8,
    label: false, // Disabled to avoid shape.outer error
    interactions: [
      {
        type: 'element-selected',
      },
      {
        type: 'element-active',
      },
    ],
  };

  const studentProgressConfig = {
    data: duaProfiles.data?.data?.slice(0, 10).map((profile: any) => {
      const needsCount = profile.educationalNeeds?.length || 0;
      const accommodationsCount = profile.accommodations?.length || 0;
      return {
        student: profile.student?.user?.profile?.firstName || 'Estudiante',
        needs: needsCount,
        accommodations: accommodationsCount,
        coverage: accommodationsCount > 0 ? Math.min(100, (accommodationsCount / Math.max(needsCount, 1)) * 100) : 0,
      };
    }) || [],
    xField: 'student',
    yField: 'coverage',
    meta: {
      coverage: {
        alias: 'Cobertura (%)',
      },
    },
    color: ({ coverage }: { coverage: number }) => {
      if (coverage >= 80) return '#52c41a';
      if (coverage >= 60) return '#faad14';
      return '#ff4d4f';
    },
  };

  const monthlyProgressConfig = {
    data: Array.from({ length: 6 }, (_, i) => {
      const month = dayjs().subtract(5 - i, 'month');
      return {
        month: month.format('MMM'),
        profiles: Math.floor(Math.random() * 10) + (i * 2),
        accommodations: Math.floor(Math.random() * 15) + (i * 3),
        effectiveness: 2 + Math.random() * 2.5 + (i * 0.1),
      };
    }),
    xField: 'month',
    yField: ['profiles', 'accommodations'],
    geometryOptions: [
      {
        geometry: 'column',
        color: '#5B8FF9',
      },
      {
        geometry: 'line',
        color: '#5AD8A6',
      },
    ],
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await Promise.all([
        overviewDashboard.refetch(),
        accommodationAnalytics.refetch(),
        duaProfiles.refetch(),
        effectivenessRecords.refetch(),
      ]);
      message.success('Datos actualizados correctamente');
    } catch (error) {
      message.error('Error al actualizar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    message.info('Función de exportación en desarrollo');
  };

  if (overviewDashboard.isLoading || accommodationAnalytics.isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Cargando análisis avanzados...</Text>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <DuaPageHeader
        title="Analytics Avanzados DUA"
        subtitle="Análisis detallado y métricas avanzadas del sistema DUA"
        icon={<BarChartOutlined />}
        actions={
          <>
            <Button
              icon={<LeftOutlined />}
              onClick={() => safeNavigate('/teacher/dua')}
              type="text"
            >
              Volver
            </Button>
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs]);
                }
              }}
              format="DD/MM/YYYY"
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
            >
              Actualizar
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExport}
            >
              Exportar
            </Button>
          </>
        }
      />

      {/* Advanced Metrics Cards */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Tasa de Adopción"
                value={advancedMetrics.adoptionRate}
                suffix="%"
                prefix={<UserOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
              <Progress 
                percent={advancedMetrics.adoptionRate} 
                size="small" 
                showInfo={false}
                strokeColor="#52c41a"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Implementación"
                value={advancedMetrics.implementationRate}
                suffix="%"
                prefix={<BookOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              <Progress 
                percent={advancedMetrics.implementationRate} 
                size="small" 
                showInfo={false}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Puntuación de Efectividad"
                value={advancedMetrics.effectivenessScore}
                suffix="/100"
                prefix={<StarOutlined />}
                valueStyle={{ 
                  color: advancedMetrics.effectivenessScore > 70 ? '#3f8600' : 
                         advancedMetrics.effectivenessScore > 50 ? '#faad14' : '#cf1322' 
                }}
              />
              <Progress 
                percent={advancedMetrics.effectivenessScore} 
                size="small" 
                showInfo={false}
                strokeColor={
                  advancedMetrics.effectivenessScore > 70 ? '#52c41a' : 
                  advancedMetrics.effectivenessScore > 50 ? '#faad14' : '#ff4d4f'
                }
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Evaluaciones"
                value={advancedMetrics.totalEvaluations}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
              <div style={{ marginTop: 8 }}>
                <Space>
                  {advancedMetrics.trendDirection === 'up' && (
                    <RiseOutlined style={{ color: '#3f8600' }} />
                  )}
                  {advancedMetrics.trendDirection === 'down' && (
                    <FallOutlined style={{ color: '#cf1322' }} />
                  )}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {advancedMetrics.trendDirection === 'up' ? 'Tendencia positiva' :
                     advancedMetrics.trendDirection === 'down' ? 'Requiere atención' : 'Estable'}
                  </Text>
                </Space>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Charts Section */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <LineChartOutlined />
                  <span>Tendencia de Efectividad</span>
                </Space>
              }
              extra={
                <Select
                  value={selectedMetric}
                  onChange={setSelectedMetric}
                  style={{ width: 150 }}
                  options={[
                    { value: 'effectiveness', label: 'Efectividad' },
                    { value: 'coverage', label: 'Cobertura' },
                    { value: 'adoption', label: 'Adopción' },
                  ]}
                />
              }
            >
              {effectivenessRecords.data?.data?.length > 0 ? (
                <Line {...effectivenessTrendConfig} height={300} />
              ) : (
                <Empty 
                  description="No hay datos de efectividad disponibles"
                  style={{ padding: '60px 0' }}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <PieChartOutlined />
                  <span>Distribución de Acomodaciones</span>
                </Space>
              }
            >
              {Object.keys(accommodationAnalytics.data?.accommodationsByType || {}).length > 0 ? (
                <Pie {...accommodationDistributionConfig} height={300} />
              ) : (
                <Empty 
                  description="No hay datos de acomodaciones disponibles"
                  style={{ padding: '60px 0' }}
                />
              )}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <BarChartOutlined />
                  <span>Cobertura por Estudiante</span>
                </Space>
              }
            >
              {duaProfiles.data?.data?.length > 0 ? (
                <Column {...studentProgressConfig} height={300} />
              ) : (
                <Empty 
                  description="No hay perfiles DUA disponibles"
                  style={{ padding: '60px 0' }}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <RiseOutlined />
                  <span>Progreso Mensual</span>
                </Space>
              }
            >
              <Area {...monthlyProgressConfig} height={300} />
            </Card>
          </Col>
        </Row>

        {/* Detailed Analysis Table */}
        <Card 
          title={
            <Space>
              <TeamOutlined />
              <span>Análisis Detallado por Estudiante</span>
            </Space>
          }
          extra={
            <Button icon={<FilterOutlined />}>
              Filtros Avanzados
            </Button>
          }
        >
          <Table
            dataSource={duaProfiles.data?.data || []}
            loading={duaProfiles.isLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 800 }}
            columns={[
              {
                title: 'Estudiante',
                key: 'student',
                render: (_, record: any) => (
                  <Space>
                    <Avatar style={{ backgroundColor: '#1890ff' }}>
                      {record.student?.user?.profile?.firstName?.charAt(0) || 'E'}
                    </Avatar>
                    <div>
                      <div>{record.student?.user?.profile?.firstName} {record.student?.user?.profile?.lastName}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.student?.classGroup?.name || 'Sin clase'}
                      </Text>
                    </div>
                  </Space>
                ),
              },
              {
                title: 'Nivel de Apoyo',
                dataIndex: 'supportLevel',
                key: 'supportLevel',
                render: (level: string) => (
                  <Tag color={
                    level === 'high' ? 'red' :
                    level === 'medium' ? 'orange' :
                    level === 'low' ? 'green' : 'default'
                  }>
                    {level === 'high' ? 'Alto' :
                     level === 'medium' ? 'Medio' :
                     level === 'low' ? 'Bajo' : 'No definido'}
                  </Tag>
                ),
              },
              {
                title: 'Necesidades',
                key: 'needs',
                render: (_, record: any) => (
                  <Badge count={record.educationalNeeds?.length || 0} showZero />
                ),
              },
              {
                title: 'Acomodaciones',
                key: 'accommodations',
                render: (_, record: any) => (
                  <Badge 
                    count={record.accommodations?.length || 0} 
                    showZero 
                    style={{ backgroundColor: '#52c41a' }}
                  />
                ),
              },
              {
                title: 'Última Evaluación',
                dataIndex: 'assessmentDate',
                key: 'assessmentDate',
                render: (date: string) => (
                  <div>
                    <div>{dayjs(date).format('DD/MM/YYYY')}</div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Hace {dayjs().diff(dayjs(date), 'days')} días
                    </Text>
                  </div>
                ),
              },
              {
                title: 'Estado',
                key: 'status',
                render: (_, record: any) => {
                  const daysSinceAssessment = dayjs().diff(dayjs(record.assessmentDate), 'days');
                  const needsReview = daysSinceAssessment > 90;
                  return (
                    <Tag color={needsReview ? 'orange' : 'green'}>
                      {needsReview ? 'Requiere revisión' : 'Actualizado'}
                    </Tag>
                  );
                },
              },
            ]}
          />
        </Card>
    </div>
  );
};

export default DuaAnalyticsPage;