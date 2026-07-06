/**
 * @componente: DuaDashboard
 * @módulo: DUA (Diseño Universal para el Aprendizaje)
 * @función: Dashboard integrado del sistema DUA
 * @crítico: SÍ - Vista principal del sistema DUA
 * @dependencias: duaService, Charts, Ant Design
 * @relacionado_con: AccommodationSystem, DuaProfileManager
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Progress,
  Tag,
  Table,
  Space,
  Button,
  Avatar,
  List,
  Timeline,
  Select,
  DatePicker,
  Empty,
  Spin,
  Tooltip,
  Badge,
  Segmented,
  message,
  Dropdown,
  Divider,
} from 'antd';
import {
  UserOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  RiseOutlined,
  FallOutlined,
  BulbOutlined,
  TeamOutlined,
  CalendarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  StarOutlined,
  SyncOutlined,
  PlusOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { Line, Column, Pie, Radar } from '@ant-design/plots';
import dayjs from 'dayjs';
import './DuaDashboard.css';
import StaggerContainer, { StaggerItem } from '@components/animations/StaggerContainer';
import HoverCard from '@components/animations/HoverCard';
import {
  useDuaDashboardOverview,
  useDuaTeacherDashboard,
  useAccommodationAnalytics,
  useDuaProfiles,
  useEffectivenessRecords,
} from '../../hooks/useDua';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

interface DuaDashboardProps {
  classGroupId?: string;
  view?: 'overview' | 'teacher' | 'admin';
}

const DuaDashboard: React.FC<DuaDashboardProps> = ({ 
  classGroupId, 
  view = 'teacher' 
}) => {
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

  // Prefijo de navegación según la vista/rol: admin navega bajo /admin/dua,
  // teacher (y overview) bajo /teacher/dua.
  const base = view === 'admin' ? '/admin/dua' : '/teacher/dua';
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [selectedView, setSelectedView] = useState<'stats' | 'profiles' | 'accommodations' | 'effectiveness'>('stats');
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilterVisible, setDateFilterVisible] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [dateFilterApplying, setDateFilterApplying] = useState(false);
  
  // Calcular días del rango de fechas actual
  const dateRangeDays = dateRange[1].diff(dateRange[0], 'days');

  // Queries
  const overviewDashboard = useDuaDashboardOverview({
    startDate: dateRange[0].toDate(),
    endDate: dateRange[1].toDate(),
  });
  
  const teacherDashboard = useDuaTeacherDashboard({
    classGroupId,
    startDate: dateRange[0].toDate(),
    endDate: dateRange[1].toDate(),
  });

  const accommodationAnalytics = useAccommodationAnalytics({
    startDate: dateRange[0].toDate(),
    endDate: dateRange[1].toDate(),
  });

  const duaProfiles = useDuaProfiles({
    isActive: true,
    limit: 10,
  });

  const effectivenessRecords = useEffectivenessRecords({
    startDate: dateRange[0].toDate(),
    endDate: dateRange[1].toDate(),
    limit: 10,
  });

  const dashboard = view === 'admin' ? overviewDashboard.data : teacherDashboard.data;
  const isLoading = overviewDashboard.isLoading || teacherDashboard.isLoading || refreshing;
  const isAnyQueryLoading = overviewDashboard.isLoading || teacherDashboard.isLoading || 
                           accommodationAnalytics.isLoading || duaProfiles.isLoading || 
                           effectivenessRecords.isLoading;

  // Comprehensive refresh function
  const handleRefreshAll = useCallback(async () => {
    try {
      setRefreshing(true);
      
      // Show immediate feedback
      message.loading('Actualizando datos del dashboard...', 0.5);
      
      // Refresh all data sources in parallel
      const refreshPromises = [
        overviewDashboard.refetch(),
        teacherDashboard.refetch(),
        accommodationAnalytics.refetch(),
        duaProfiles.refetch(),
        effectivenessRecords.refetch(),
      ];
      
      // Wait for all refreshes to complete
      await Promise.all(refreshPromises);
      
      // Show success message
      message.success('Datos actualizados correctamente');
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      message.error('Error al actualizar los datos. Inténtalo de nuevo.');
    } finally {
      setRefreshing(false);
    }
  }, [overviewDashboard, teacherDashboard, accommodationAnalytics, duaProfiles, effectivenessRecords]);

  // Keyboard shortcut for refresh (Ctrl+R / Cmd+R)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        handleRefreshAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRefreshAll]);

  // Date validation and filter utilities
  const validateDateRange = (start: dayjs.Dayjs, end: dayjs.Dayjs): { isValid: boolean; message?: string } => {
    if (!start || !end) {
      return { isValid: false, message: 'Ambas fechas son requeridas' };
    }
    
    if (start.isAfter(end)) {
      return { isValid: false, message: 'La fecha de inicio debe ser anterior a la fecha de fin' };
    }
    
    if (start.isAfter(dayjs())) {
      return { isValid: false, message: 'La fecha de inicio no puede ser futura' };
    }
    
    const diffInDays = end.diff(start, 'days');
    if (diffInDays > 365) {
      return { isValid: false, message: 'El rango no puede ser mayor a 1 año (365 días)' };
    }
    
    if (diffInDays < 1) {
      return { isValid: false, message: 'El rango debe ser de al menos 1 día' };
    }
    
    return { isValid: true };
  };

  const getDatePresets = () => {
    const today = dayjs();
    return [
      {
        label: '📅 Últimos 7 días',
        value: [today.subtract(7, 'days'), today] as [dayjs.Dayjs, dayjs.Dayjs],
        key: 'last7days'
      },
      {
        label: '📅 Últimos 15 días',
        value: [today.subtract(15, 'days'), today] as [dayjs.Dayjs, dayjs.Dayjs],
        key: 'last15days'
      },
      {
        label: '📅 Últimos 30 días',
        value: [today.subtract(30, 'days'), today] as [dayjs.Dayjs, dayjs.Dayjs],
        key: 'last30days'
      },
      {
        label: '📅 Últimos 3 meses',
        value: [today.subtract(3, 'months'), today] as [dayjs.Dayjs, dayjs.Dayjs],
        key: 'last3months'
      },
      {
        label: '📅 Este mes',
        value: [today.startOf('month'), today.endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs],
        key: 'thisMonth'
      },
      {
        label: '📅 Mes anterior',
        value: [today.subtract(1, 'month').startOf('month'), today.subtract(1, 'month').endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs],
        key: 'lastMonth'
      },
      {
        label: '📅 Este año',
        value: [today.startOf('year'), today] as [dayjs.Dayjs, dayjs.Dayjs],
        key: 'thisYear'
      },
      {
        label: '📅 Todo el tiempo',
        value: [dayjs('2020-01-01'), today] as [dayjs.Dayjs, dayjs.Dayjs],
        key: 'allTime'
      }
    ];
  };

  const getCurrentDateRangeLabel = () => {
    const presets = getDatePresets();
    const current = dateRange;
    
    // Buscar si coincide con algún preset
    const matchingPreset = presets.find(preset => 
      preset.value[0].format('YYYY-MM-DD') === current[0].format('YYYY-MM-DD') &&
      preset.value[1].format('YYYY-MM-DD') === current[1].format('YYYY-MM-DD')
    );
    
    if (matchingPreset) {
      return matchingPreset.label.replace(/📅\s/, '');
    }
    
    // Si es personalizado
    return `${current[0].format('DD/MM/YYYY')} - ${current[1].format('DD/MM/YYYY')}`;
  };

  const handleDatePresetSelect = (preset: { label: string; value: [dayjs.Dayjs, dayjs.Dayjs]; key: string }) => {
    setDateFilterApplying(true);
    setDateRange(preset.value);
    setDateFilterVisible(false);
    
    setTimeout(() => {
      handleRefreshAll().finally(() => {
        setDateFilterApplying(false);
      });
    }, 100);
    
    message.success({
      content: `Filtro aplicado: ${preset.label.replace(/📅\s/, '')}`,
      duration: 2,
      icon: <CalendarOutlined style={{ color: '#52c41a' }} />
    });
  };

  const renderDateFilterDropdown = () => {
    const presets = getDatePresets();
    
    const menuItems = [
      ...presets.map(preset => ({
        key: preset.key,
        label: (
          <div 
            onClick={() => handleDatePresetSelect(preset)}
            style={{ 
              padding: '8px 12px',
              cursor: 'pointer',
              borderRadius: '4px',
              transition: 'background-color 0.2s'
            }}
          >
            <Space>
              <span>{preset.label}</span>
              <Text type="secondary" style={{ fontSize: 11 }}>
                ({preset.value[1].diff(preset.value[0], 'days')} días)
              </Text>
            </Space>
          </div>
        ),
      })),
      {
        key: 'divider',
        type: 'divider' as const,
      },
      {
        key: 'custom',
        label: (
          <div style={{ padding: '8px 12px' }}>
            <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
              📅 Rango Personalizado
            </Text>
            <RangePicker
              value={customDateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  const validation = validateDateRange(dates[0], dates[1]);
                  if (!validation.isValid) {
                    message.error({
                      content: validation.message,
                      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />
                    });
                    return;
                  }
                  
                  setDateFilterApplying(true);
                  setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs]);
                  setCustomDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs]);
                  setDateFilterVisible(false);
                  
                  setTimeout(() => {
                    handleRefreshAll().finally(() => {
                      setDateFilterApplying(false);
                    });
                  }, 100);
                  
                  message.success({
                    content: `Rango personalizado: ${dates[0].format('DD/MM/YYYY')} - ${dates[1].format('DD/MM/YYYY')}`,
                    duration: 3,
                    icon: <CalendarOutlined style={{ color: '#52c41a' }} />
                  });
                }
              }}
              format="DD/MM/YYYY"
              placeholder={['Fecha inicio', 'Fecha fin']}
              size="small"
              style={{ width: '100%' }}
              disabledDate={(current) => {
                return current && current.isAfter(dayjs().endOf('day'));
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ),
      },
    ];
    
    return { items: menuItems };
  };

  // Chart configurations
  const accommodationTrendConfig = {
    data: dashboard?.accommodationsTrend || [],
    xField: 'date',
    yField: 'count',
    seriesField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'path-in',
        duration: 1000,
      },
    },
  };

  const accommodationByTypeConfig = {
    data: Object.entries(accommodationAnalytics.data?.accommodationsByType || {}).map(
      ([type, count]) => ({ type, count })
    ),
    xField: 'type',
    yField: 'count',
    label: {
      position: 'middle',
      style: {
        fill: '#FFFFFF',
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      type: {
        alias: 'Tipo de Acomodación',
      },
      count: {
        alias: 'Cantidad',
      },
    },
  };

  const effectivenessDistributionConfig = {
    data: dashboard?.effectivenessDistribution || [],
    angleField: 'value',
    colorField: 'rating',
    radius: 0.9,
    label: {
      type: 'inner',
      offset: '-30%',
      content: '{value}',
      style: {
        textAlign: 'center',
        fontSize: 14,
      },
    },
    interactions: [
      {
        type: 'element-selected',
      },
      {
        type: 'element-active',
      },
    ],
  };

  const studentProgressRadarConfig = {
    data: dashboard?.studentProgressMetrics || [],
    xField: 'metric',
    yField: 'value',
    seriesField: 'student',
    meta: {
      value: {
        alias: 'Puntuación',
        min: 0,
        max: 5,
      },
    },
    xAxis: {
      line: null,
      tickLine: null,
      grid: {
        line: {
          style: {
            lineDash: null,
          },
        },
      },
    },
    yAxis: {
      line: null,
      tickLine: null,
      grid: {
        line: {
          type: 'line',
          style: {
            lineDash: null,
          },
        },
        alternateColor: 'rgba(0, 0, 0, 0.04)',
      },
    },
    point: {
      size: 3,
    },
  };

  // Render functions
  const renderDataQualityIndicator = () => {
    const totalProfiles = dashboard?.totalActiveProfiles || 0;
    const totalAccommodations = accommodationAnalytics.data?.totalAccommodations || 0;
    const effectivenessRecordsCount = effectivenessRecords.data?.statistics?.totalRecords || 0;
    
    // Calcular puntuación de calidad de datos
    let qualityScore = 0;
    let maxScore = 0;
    
    // Puntos por perfiles DUA (hasta 30 puntos)
    maxScore += 30;
    if (totalProfiles > 0) qualityScore += Math.min(30, totalProfiles * 3);
    
    // Puntos por acomodaciones (hasta 40 puntos)
    maxScore += 40;
    if (totalAccommodations > 0) qualityScore += Math.min(40, totalAccommodations * 2);
    
    // Puntos por evaluaciones de efectividad (hasta 30 puntos)
    maxScore += 30;
    if (effectivenessRecordsCount > 0) qualityScore += Math.min(30, effectivenessRecordsCount * 1.5);
    
    const qualityPercentage = maxScore > 0 ? Math.round((qualityScore / maxScore) * 100) : 0;
    
    const getQualityStatus = (percentage: number) => {
      if (percentage >= 80) return { color: '#52c41a', text: 'Excelente', icon: '✅' };
      if (percentage >= 60) return { color: '#faad14', text: 'Buena', icon: '⚠️' };
      if (percentage >= 40) return { color: '#ff7875', text: 'Regular', icon: '🛠️' };
      return { color: '#ff4d4f', text: 'Limitada', icon: '⛔' };
    };
    
    const qualityStatus = getQualityStatus(qualityPercentage);
    
    return (
      <Card 
        size="small" 
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Text style={{ fontSize: 13, fontWeight: 500 }}>Calidad de Datos:</Text>
            <Tag color={qualityStatus.color.replace('#', '')} style={{ margin: 0 }}>
              {qualityStatus.icon} {qualityStatus.text}
            </Tag>
          </Space>
          <Space>
            <Progress 
              type="circle" 
              size={28} 
              percent={qualityPercentage}
              strokeColor={qualityStatus.color}
              format={() => `${qualityPercentage}%`}
            />
            <Tooltip 
              title={
                <div>
                  <div>Factores de calidad:</div>
                  <div>• Perfiles DUA: {totalProfiles}</div>
                  <div>• Acomodaciones: {totalAccommodations}</div>
                  <div>• Evaluaciones: {effectivenessRecordsCount}</div>
                  <div style={{ marginTop: 8, fontSize: 11 }}>
                    Datos más completos = métricas más precisas
                  </div>
                </div>
              }
            >
              <Text style={{ fontSize: 11, color: '#8c8c8c', cursor: 'help' }}>
                📊 Info
              </Text>
            </Tooltip>
          </Space>
        </Space>
      </Card>
    );
  };
  const renderStatCards = () => {
    // Calcular métricas reales desde los datos
    const totalProfiles = dashboard?.totalActiveProfiles || 0;
    const totalAccommodations = accommodationAnalytics.data?.totalAccommodations || 0;
    const activeAccommodations = accommodationAnalytics.data?.activeAccommodations || 0;
    const effectivenessRating = accommodationAnalytics.data?.averageEffectiveness || 0;
    const pendingCount = dashboard?.pendingReviews || 0;
    
    // Calcular tasa de implementación real
    const implementationRate = totalAccommodations > 0 
      ? Math.round((activeAccommodations / totalAccommodations) * 100)
      : 0;
    
    // Calcular crecimiento basado en fechas
    const dailyProfileGrowth = totalProfiles > 0 && dateRangeDays > 0 
      ? Math.round((totalProfiles / dateRangeDays) * 100) / 100
      : 0;
    
    return (
      <StaggerContainer staggerDelay={0.12}>
        <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StaggerItem>
          <HoverCard hoverEffect="lift" className="h-full">
          <Card
            className="stat-card stat-card-primary"
            style={{
              background: 'linear-gradient(135deg, #f0f9f4 0%, #e6f1ea 100%)',
              border: '1px solid #a9cdb8',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="stat-card-header">
              <UserOutlined style={{ fontSize: 24, color: '#579172' }} />
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>PERFILES DUA</Text>
            </div>
            <Statistic
              title={null}
              value={totalProfiles}
              valueStyle={{ fontSize: 32, fontWeight: 600, color: '#579172' }}
              suffix={
                totalProfiles > 0 && (
                  <Tooltip title={`Crecimiento promedio: ${dailyProfileGrowth} por día`}>
                    <span style={{ fontSize: 14, color: '#2E7D52', cursor: 'help', marginLeft: 8 }}>
                      📈 +{dailyProfileGrowth}/día
                    </span>
                  </Tooltip>
                )
              }
            />
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: '#8c8c8c' }}>Cobertura Estudiantil</Text>
                <Text style={{ fontSize: 11, fontWeight: 500, color: '#579172' }}>
                  {dashboard?.profileCoverage || 0}%
                </Text>
              </div>
              <Progress
                percent={dashboard?.profileCoverage || 0}
                size="small"
                strokeColor={{
                  '0%': dashboard?.profileCoverage > 75 ? '#2E7D52' : dashboard?.profileCoverage > 50 ? '#B45309' : '#C43030',
                  '100%': dashboard?.profileCoverage > 75 ? '#73d13d' : dashboard?.profileCoverage > 50 ? '#ffc53d' : '#ff7875'
                }}
                showInfo={false}
              />
            </div>
          </Card>
          </HoverCard>
          </StaggerItem>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StaggerItem>
          <HoverCard hoverEffect="lift" className="h-full">
          <Card
            className="stat-card stat-card-success"
            style={{
              background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9f4 100%)',
              border: '1px solid #95de64',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="stat-card-header">
              <BookOutlined style={{ fontSize: 24, color: '#2E7D52' }} />
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>ACOMODACIONES</Text>
            </div>
            <Statistic
              title={null}
              value={activeAccommodations}
              valueStyle={{ fontSize: 32, fontWeight: 600, color: '#2E7D52' }}
              suffix={
                <span style={{ fontSize: 14, color: '#8c8c8c', marginLeft: 4 }}>/ {totalAccommodations}</span>
              }
            />
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: '#8c8c8c' }}>Tasa de Implementación</Text>
                <Tag
                  color={implementationRate > 70 ? 'success' : implementationRate > 40 ? 'warning' : 'error'}
                  style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10 }}
                >
                  {implementationRate}%
                </Tag>
              </div>
              <Progress
                percent={implementationRate}
                size="small"
                strokeColor={{
                  '0%': implementationRate > 70 ? '#2E7D52' : implementationRate > 40 ? '#B45309' : '#C43030',
                  '100%': implementationRate > 70 ? '#73d13d' : implementationRate > 40 ? '#ffc53d' : '#ff7875'
                }}
                showInfo={false}
              />
            </div>
          </Card>
          </HoverCard>
          </StaggerItem>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StaggerItem>
          <HoverCard hoverEffect="lift" className="h-full">
          <Card
            className="stat-card stat-card-warning"
            style={{
              background: 'linear-gradient(135deg, #fffbf0 0%, #fff7e6 100%)',
              border: '1px solid #ffd666',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="stat-card-header">
              <StarOutlined style={{ fontSize: 24, color: '#B45309' }} />
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>EFECTIVIDAD</Text>
            </div>
            <Statistic
              title={null}
              value={effectivenessRating}
              precision={1}
              suffix={<span style={{ fontSize: 18, color: '#8c8c8c' }}>/5.0</span>}
              valueStyle={{
                fontSize: 32,
                fontWeight: 600,
                color: effectivenessRating >= 4 ? '#2E7D52' :
                       effectivenessRating >= 3 ? '#B45309' :
                       effectivenessRating >= 2 ? '#ff7875' : '#C43030',
              }}
            />
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 11, color: '#8c8c8c' }}>Nivel de Calidad</Text>
                <Tag
                  color={
                    effectivenessRating >= 4 ? 'success' :
                    effectivenessRating >= 3 ? 'warning' :
                    effectivenessRating >= 2 ? 'error' : 'default'
                  }
                  style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10 }}
                >
                  {effectivenessRating >= 4 ? 'Excelente' :
                   effectivenessRating >= 3 ? 'Buena' :
                   effectivenessRating >= 2 ? 'Regular' : 'Baja'}
                </Tag>
              </div>
              <Progress
                percent={effectivenessRating * 20}
                size="small"
                strokeColor={{
                  '0%': effectivenessRating >= 4 ? '#2E7D52' : effectivenessRating >= 3 ? '#B45309' : '#C43030',
                  '100%': effectivenessRating >= 4 ? '#73d13d' : effectivenessRating >= 3 ? '#ffc53d' : '#ff7875',
                }}
                showInfo={false}
              />
            </div>
          </Card>
          </HoverCard>
          </StaggerItem>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <StaggerItem>
          <HoverCard hoverEffect="lift" className="h-full">
          <Card
            className={`stat-card ${pendingCount > 10 ? 'stat-card-error' : pendingCount > 5 ? 'stat-card-warning' : 'stat-card-info'}`}
            style={{
              background: pendingCount > 10
                ? 'linear-gradient(135deg, #fff2f0 0%, #ffece6 100%)'
                : pendingCount > 5
                  ? 'linear-gradient(135deg, #fffbf0 0%, #fff7e6 100%)'
                  : 'linear-gradient(135deg, #f0f9f4 0%, #e6f1ea 100%)',
              border: pendingCount > 10
                ? '1px solid #ffadd2'
                : pendingCount > 5
                  ? '1px solid #ffd666'
                  : '1px solid #a9cdb8',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="stat-card-header">
              <Badge
                dot={pendingCount > 0}
                status={pendingCount > 10 ? 'error' : pendingCount > 5 ? 'warning' : 'success'}
              >
                <ClockCircleOutlined style={{
                  fontSize: 24,
                  color: pendingCount > 10 ? '#C43030' : pendingCount > 5 ? '#B45309' : '#579172'
                }} />
              </Badge>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 500 }}>REVISIONES</Text>
            </div>
            <Statistic
              title={null}
              value={pendingCount}
              valueStyle={{
                fontSize: 32,
                fontWeight: 600,
                color: pendingCount > 10 ? '#C43030' : pendingCount > 5 ? '#B45309' : '#579172'
              }}
              suffix={
                <span style={{ fontSize: 14, color: '#8c8c8c' }}>pendientes</span>
              }
            />
            <div style={{ marginTop: 12 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#8c8c8c' }}>Urgentes:</Text>
                  <Tag
                    color={dashboard?.pendingApprovals > 5 ? 'error' : 'processing'}
                    style={{ fontSize: 10, padding: '1px 4px', borderRadius: 8 }}
                  >
                    {dashboard?.pendingApprovals || 0}
                  </Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 11, color: '#8c8c8c' }}>Próximas:</Text>
                  <Tag
                    color={dashboard?.upcomingReviews > 3 ? 'warning' : 'default'}
                    style={{ fontSize: 10, padding: '1px 4px', borderRadius: 8 }}
                  >
                    {dashboard?.upcomingReviews || 0}
                  </Tag>
                </div>
              </Space>
            </div>
          </Card>
          </HoverCard>
          </StaggerItem>
        </Col>
        </Row>
      </StaggerContainer>
    );
  };

  const renderRecentProfiles = () => {
    const profiles = duaProfiles.data?.data || [];
    const hasData = profiles.length > 0;
    
    return (
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>Perfiles DUA Recientes</span>
            <Badge count={profiles.length} showZero style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
        extra={
          <Space>
            {hasData && (
              <Tooltip title="Datos actualizados">
                <Badge status="success" />
              </Tooltip>
            )}
            <Button
              type="link"
              onClick={() => safeNavigate(`${base}/profiles`)}
            >
              Ver todos
            </Button>
          </Space>
        }
      >
        <List
          itemLayout="horizontal"
          dataSource={profiles}
          loading={duaProfiles.isLoading}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" align="center">
                    <Text type="secondary">No hay perfiles DUA en este período</Text>
                    {view !== 'admin' && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => safeNavigate(`${base}/profiles/new`)}
                      >
                        Crear primer perfil
                      </Button>
                    )}
                  </Space>
                }
              />
            )
          }}
          renderItem={(profile) => {
            // Calcular antigüedad del perfil
            const profileAge = dayjs().diff(dayjs(profile.assessmentDate), 'days');
            const isRecentProfile = profileAge <= 7;
            const needsReview = profileAge > 90;

            return (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    size="small"
                    onClick={() => safeNavigate(`${base}/profile/${profile.id}`)}
                  >
                    Ver perfil
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Badge 
                      dot={isRecentProfile} 
                      status={needsReview ? 'warning' : 'success'}
                    >
                      <Avatar style={{ 
                        backgroundColor: needsReview ? '#faad14' : '#579172',
                        border: isRecentProfile ? '2px solid #52c41a' : 'none'
                      }}>
                        {profile.student?.user?.profile?.firstName?.[0] || 'E'}
                      </Avatar>
                    </Badge>
                  }
                  title={
                    <Space>
                      <Text strong>
                        {profile.student?.user?.profile?.firstName} {profile.student?.user?.profile?.lastName}
                      </Text>
                      <Tag color={profile.supportLevel ? '#579172' : 'default'}>
                        {profile.supportLevel || 'Sin definir'}
                      </Tag>
                      {isRecentProfile && (
                        <Tag color="green" size="small">Nuevo</Tag>
                      )}
                      {needsReview && (
                        <Tag color="orange" size="small">Revisar</Tag>
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <Space size="small" wrap>
                        {(profile.educationalNeeds || []).slice(0, 3).map((need) => (
                          <Tag key={need} size="small">
                            {need}
                          </Tag>
                        ))}
                        {(profile.educationalNeeds || []).length > 3 && (
                          <Tag size="small">+{(profile.educationalNeeds || []).length - 3}</Tag>
                        )}
                      </Space>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        📅 Evaluado hace {profileAge} días
                        {profile.assessmentDate && (
                          <span> - {dayjs(profile.assessmentDate).format('DD/MM/YYYY')}</span>
                        )}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            );
          }}
        />
        {hasData && (
          <div style={{ 
            marginTop: 12, 
            padding: '8px 12px', 
            backgroundColor: '#f6ffed', 
            border: '1px solid #b7eb8f',
            borderRadius: '6px'
          }}>
            <Text style={{ fontSize: 11, color: '#389e0d' }}>
              📊 {profiles.length} perfiles en este período | 
              Promedio: {profiles.length > 0 ? Math.round(profiles.reduce((sum, p) => {
                return sum + dayjs().diff(dayjs(p.assessmentDate), 'days');
              }, 0) / profiles.length) : 0} días de antigüedad
            </Text>
          </div>
        )}
      </Card>
    );
  };

  const renderAccommodationTimeline = () => (
    <Card
      title={
        <Space>
          <CalendarOutlined />
          <span>Actividad Reciente</span>
        </Space>
      }
    >
      <Timeline
        items={dashboard?.recentActivity?.map((activity: any) => ({
          color: activity.type === 'approved' ? 'green' : 
                 activity.type === 'rejected' ? 'red' : 
                 activity.type === 'created' ? '#579172' : 'gray',
          children: (
            <Space direction="vertical" size="small">
              <Text>{activity.description}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(activity.date).format('DD/MM/YYYY HH:mm')}
              </Text>
            </Space>
          ),
        })) || []}
      />
    </Card>
  );

  const renderEffectivenessTable = () => {
    const records = effectivenessRecords.data?.data || [];
    const statistics = effectivenessRecords.data?.statistics;
    const hasData = records.length > 0;
    
    return (
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>Evaluaciones de Efectividad</span>
            {statistics && (
              <Badge 
                count={statistics.totalRecords} 
                showZero 
                style={{ backgroundColor: '#579172' }}
              />
            )}
          </Space>
        }
        extra={
          <Space>
            {statistics && (
              <Tooltip title={`Promedio: ${statistics.averageRating}/5`}>
                <Tag color="#579172">
                  ⭐ {statistics.averageRating}
                </Tag>
              </Tooltip>
            )}
            {view !== 'admin' && (
              <Button
                type="link"
                onClick={() => safeNavigate(`${base}/effectiveness`)}
              >
                Ver todas
              </Button>
            )}
          </Space>
        }
      >
        <Table
          dataSource={records}
          loading={effectivenessRecords.isLoading}
          size="small"
          pagination={false}
          locale={{
            emptyText: (
              <Empty 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" align="center">
                    <Text type="secondary">No hay evaluaciones de efectividad</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Las evaluaciones aparecen después de implementar acomodaciones
                    </Text>
                  </Space>
                }
              />
            )
          }}
          columns={[
            {
              title: 'Estudiante',
              dataIndex: ['student', 'user', 'profile'],
              key: 'student',
              render: (profile: any, record: any) => (
                <Space>
                  <Avatar size="small" style={{ backgroundColor: '#579172' }}>
                    {profile?.firstName?.[0] || 'E'}
                  </Avatar>
                  <Text>{profile?.firstName} {profile?.lastName}</Text>
                </Space>
              ),
            },
            {
              title: 'Acomodación',
              dataIndex: ['accommodation', 'name'],
              key: 'accommodation',
              ellipsis: true,
              render: (name: string, record: any) => (
                <Tooltip title={name}>
                  <Text style={{ fontSize: 12 }}>{name}</Text>
                </Tooltip>
              ),
            },
            {
              title: 'Efectividad',
              dataIndex: 'effectivenessRating',
              key: 'rating',
              width: 120,
              render: (rating: number) => {
                const color = rating >= 4 ? '#52c41a' : rating >= 3 ? '#faad14' : '#ff4d4f';
                return (
                  <Space>
                    <Progress 
                      type="circle" 
                      size={32} 
                      percent={rating * 20}
                      format={() => rating}
                      strokeColor={color}
                    />
                    <Text style={{ color, fontSize: 11 }}>
                      {rating >= 4 ? 'Excelente' : rating >= 3 ? 'Buena' : 'Mejorar'}
                    </Text>
                  </Space>
                );
              },
            },
            {
              title: 'Fecha',
              dataIndex: 'evaluationDate',
              key: 'date',
              width: 90,
              render: (date: string) => {
                const daysAgo = dayjs().diff(dayjs(date), 'days');
                return (
                  <Space direction="vertical" size={0}>
                    <Text style={{ fontSize: 11 }}>
                      {dayjs(date).format('DD/MM')}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      {daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? 'Ayer' : `${daysAgo}d`}
                    </Text>
                  </Space>
                );
              },
            },
          ]}
        />
        {hasData && statistics && (
          <div style={{
            marginTop: 12,
            padding: '8px 12px',
            backgroundColor: '#f0f9f4',
            border: '1px solid #a9cdb8',
            borderRadius: '6px'
          }}>
            <Text style={{ fontSize: 11, color: '#3F6E58' }}>
              📈 {statistics.totalRecords} evaluaciones |
              Promedio de efectividad: {statistics.averageRating}/5.0 | 
              Últimos {dayjs().diff(dateRange[0], 'days')} días
            </Text>
          </div>
        )}
      </Card>
    );
  };

  const renderTopTemplates = () => (
    <Card
      title={
        <Space>
          <FileTextOutlined />
          <span>Plantillas Más Utilizadas</span>
        </Space>
      }
    >
      <List
        dataSource={accommodationAnalytics.data?.mostUsedTemplates || []}
        loading={accommodationAnalytics.isLoading}
        renderItem={(template) => (
          <List.Item
            extra={
              <Badge
                count={template.uses}
                style={{ backgroundColor: '#52c41a' }}
              />
            }
          >
            <List.Item.Meta
              avatar={<BulbOutlined style={{ fontSize: 24, color: '#579172' }} />}
              title={template.name}
              description={`Utilizada ${template.uses} veces`}
            />
          </List.Item>
        )}
      />
    </Card>
  );

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Header Controls */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {/* Loading indicator when any query is loading */}
        {(isAnyQueryLoading && !refreshing) || dateFilterApplying ? (
          <Col span={24}>
            <div style={{ 
              textAlign: 'center', 
              padding: '8px 16px', 
              background: dateFilterApplying
                ? 'linear-gradient(135deg, #f0f9f4 0%, #e6f1ea 100%)'
                : '#f0f2f5',
              borderRadius: '8px',
              marginBottom: '12px',
              border: dateFilterApplying ? '1px solid #a9cdb8' : 'none'
            }}>
              <Space>
                <SyncOutlined spin style={{ color: dateFilterApplying ? '#579172' : undefined }} />
                <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500 }}>
                  {dateFilterApplying ? 'Aplicando filtro de fechas...' : 'Cargando datos...'}
                </Text>
                {dateFilterApplying && (
                  <Badge status="processing" text="Actualizando métricas" />
                )}
              </Space>
            </div>
          </Col>
        ) : null}
        
        {/* Período activo indicator */}
        <Col span={24}>
          <div style={{
            padding: '8px 16px',
            background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9f4 100%)',
            border: '1px solid #b7eb8f',
            borderRadius: '8px',
            position: 'relative',
            marginBottom: '8px'
          }}>
            <div style={{
              position: 'absolute',
              top: -6,
              left: 16,
              background: '#52c41a',
              color: 'white',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: 10,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              📊 ANÁLISIS ACTIVO
            </div>
            <Row style={{ marginTop: 8 }}>
              <Col xs={24} sm={12} md={8}>
                <Space>
                  <CalendarOutlined style={{ color: '#52c41a' }} />
                  <Text style={{ fontSize: 12, fontWeight: 500, color: '#389e0d' }}>
                    {getCurrentDateRangeLabel()}
                  </Text>
                </Space>
              </Col>
              <Col xs={24} sm={12} md={8} style={{ textAlign: 'center' }}>
                <Space>
                  <Text style={{ fontSize: 11, color: '#8c8c8c' }}>Duración:</Text>
                  <Badge 
                    count={`${dateRangeDays}d`} 
                    style={{ backgroundColor: '#52c41a', fontSize: 10 }}
                  />
                </Space>
              </Col>
              <Col xs={24} sm={24} md={8} style={{ textAlign: 'right' }}>
                <Text style={{ fontSize: 10, color: '#8c8c8c' }}>
                  {dateRange[0].format('DD/MM/YYYY')} → {dateRange[1].format('DD/MM/YYYY')}
                </Text>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Segmented
            value={selectedView}
            onChange={(value) => {
              setSelectedView(value as 'stats' | 'profiles' | 'accommodations' | 'effectiveness');
              
              // Optional: Navigate to specific pages for better UX
              if (value === 'accommodations') {
                // You can also navigate to dedicated page if needed
                // safeNavigate('/teacher/dua/accommodations');
              }
            }}
            options={[
              { 
                label: 'Estadísticas', 
                value: 'stats', 
                icon: <BarChartOutlined />,
              },
              { 
                label: 'Perfiles', 
                value: 'profiles', 
                icon: <TeamOutlined />,
              },
              { 
                label: 'Acomodaciones', 
                value: 'accommodations', 
                icon: <BookOutlined />,
              },
              { 
                label: 'Efectividad', 
                value: 'effectiveness', 
                icon: <StarOutlined />,
              },
            ]}
          />
        </Col>
        <Col xs={24} md={12} style={{ textAlign: 'right' }}>
          <Space wrap>
            <Dropdown
              menu={renderDateFilterDropdown()}
              trigger={['click']}
              open={dateFilterVisible}
              onOpenChange={setDateFilterVisible}
              placement="bottomRight"
            >
              <Button 
                icon={dateFilterApplying ? <SyncOutlined spin /> : <FilterOutlined />}
                loading={dateFilterApplying}
                className="date-filter-button"
                style={{ 
                  minWidth: 200,
                  textAlign: 'left',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <Space>
                  <CalendarOutlined style={{
                    color: dateFilterApplying ? '#579172' : undefined
                  }} />
                  <span style={{ fontSize: 12 }}>
                    {dateFilterApplying ? 'Aplicando filtro...' : getCurrentDateRangeLabel()}
                  </span>
                </Space>
              </Button>
            </Dropdown>
            
            <Tooltip title="Reiniciar a últimos 30 días">
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setDateFilterApplying(true);
                  const defaultRange: [dayjs.Dayjs, dayjs.Dayjs] = [
                    dayjs().subtract(30, 'days'),
                    dayjs(),
                  ];
                  setDateRange(defaultRange);
                  setCustomDateRange(null);
                  setTimeout(() => {
                    handleRefreshAll().finally(() => {
                      setDateFilterApplying(false);
                    });
                  }, 100);
                  message.success({
                    content: 'Filtro reiniciado a últimos 30 días',
                    icon: <ReloadOutlined style={{ color: '#52c41a' }} />
                  });
                }}
                size="small"
                disabled={dateFilterApplying}
              />
            </Tooltip>
            <Tooltip 
              title={
                <div>
                  <div>Actualizar todos los datos del dashboard</div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    Atajo: Ctrl+R (Cmd+R en Mac)
                  </div>
                </div>
              }
            >
              <Button 
                icon={<SyncOutlined spin={refreshing} />} 
                onClick={handleRefreshAll}
                loading={refreshing}
                disabled={refreshing}
              >
                {refreshing ? 'Actualizando...' : 'Actualizar'}
              </Button>
            </Tooltip>
            {view !== 'admin' && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => safeNavigate(`${base}/accommodations/new`)}
              >
                Nueva Acomodación
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      {/* Data Quality Indicator */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {renderDataQualityIndicator()}
      </motion.div>

      {/* Statistics Cards (animación de entrada aplicada por StaggerContainer/StaggerItem dentro de renderStatCards) */}
      {renderStatCards()}

      {/* Main Content Based on Selected View */}
      <motion.div
        key={selectedView}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginTop: 24 }}
      >
        {selectedView === 'stats' && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={18}>
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Card title="Tendencia de Acomodaciones">
                    <Line {...accommodationTrendConfig} height={300} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Distribución por Tipo">
                    <Column {...accommodationByTypeConfig} height={300} />
                  </Card>
                </Col>
                <Col xs={24} lg={12}>
                  <Card title="Distribución de Efectividad">
                    <Pie {...effectivenessDistributionConfig} height={300} />
                  </Card>
                </Col>
                <Col xs={24}>
                  <Card title="Progreso de Estudiantes">
                    <Radar {...studentProgressRadarConfig} height={300} />
                  </Card>
                </Col>
              </Row>
            </Col>
            <Col xs={24} lg={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card
                  title="Acciones Rápidas"
                  size="small"
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {view !== 'admin' && (
                      <Button
                        type="primary"
                        icon={<BarChartOutlined />}
                        onClick={() => safeNavigate(`${base}/analytics`)}
                        style={{ width: '100%' }}
                      >
                        Analytics Avanzados
                      </Button>
                    )}
                    {view !== 'admin' && (
                      <Button
                        icon={<FileTextOutlined />}
                        onClick={() => safeNavigate(`${base}/reports`)}
                        style={{ width: '100%' }}
                      >
                        Generar Informe
                      </Button>
                    )}
                    <Button
                      icon={<CalendarOutlined />}
                      onClick={() => {
                        // TODO: Export chart data
                        message.info('Función de exportación en desarrollo');
                      }}
                      style={{ width: '100%' }}
                    >
                      Exportar Datos
                    </Button>
                  </Space>
                </Card>
                <Card
                  title="Métricas Clave del Período"
                  size="small"
                  extra={
                    <Tooltip title={`Última actualización: ${dayjs().format('HH:mm')}`}>
                      <Badge status="processing" text="Live" />
                    </Tooltip>
                  }
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Estudiantes con DUA:</Text>
                      <Space>
                        <Badge
                          count={dashboard?.totalActiveProfiles || 0}
                          showZero
                          style={{ backgroundColor: '#579172' }}
                        />
                        {dashboard?.profilesGrowth > 0 && (
                          <Text style={{ fontSize: 10, color: '#52c41a' }}>+{dashboard.profilesGrowth}%</Text>
                        )}
                      </Space>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Acomodaciones Activas:</Text>
                      <Space>
                        <Badge 
                          count={accommodationAnalytics.data?.activeAccommodations || 0} 
                          showZero 
                          style={{ backgroundColor: '#52c41a' }}
                        />
                        <Text style={{ fontSize: 10, color: '#8c8c8c' }}>de {accommodationAnalytics.data?.totalAccommodations || 0}</Text>
                      </Space>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Efectividad Promedio:</Text>
                      <Space>
                        <Progress 
                          type="circle" 
                          size={24} 
                          percent={(accommodationAnalytics.data?.averageEffectiveness || 0) * 20}
                          format={() => `${accommodationAnalytics.data?.averageEffectiveness || 0}`}
                          strokeColor={{
                            '0%': '#ff4d4f',
                            '50%': '#faad14',
                            '100%': '#52c41a',
                          }}
                        />
                        <Text style={{ fontSize: 10 }}>/5.0</Text>
                      </Space>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text type="secondary">Estado del Sistema:</Text>
                      <Tag color={(dashboard?.pendingReviews || 0) === 0 ? 'success' : (dashboard?.pendingReviews || 0) > 10 ? 'error' : 'warning'}>
                        {(dashboard?.pendingReviews || 0) === 0 ? '✅ Al día' : `⏰ ${dashboard?.pendingReviews} pendientes`}
                      </Tag>
                    </div>
                    <div style={{ 
                      marginTop: 12, 
                      padding: '12px', 
                      background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9f4 100%)',
                      border: '1px solid #b7eb8f', 
                      borderRadius: '8px',
                      position: 'relative'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: -6,
                        left: 12,
                        background: '#52c41a',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: 10,
                        fontWeight: 500
                      }}>
                        ANÁLISIS ACTIVO
                      </div>
                      <Space direction="vertical" size={4} style={{ width: '100%', marginTop: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 11, color: '#389e0d', fontWeight: 500 }}>
                            📅 {getCurrentDateRangeLabel()}
                          </Text>
                          <Badge 
                            count={dateRangeDays} 
                            style={{ backgroundColor: '#52c41a', fontSize: 9 }}
                            title="Días analizados"
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 10, color: '#52c41a' }}>
                            📅 {dateRange[0].format('DD/MM/YYYY')}
                          </Text>
                          <Text style={{ fontSize: 10, color: '#8c8c8c' }}>
                            →
                          </Text>
                          <Text style={{ fontSize: 10, color: '#52c41a' }}>
                            {dateRange[1].format('DD/MM/YYYY')}
                          </Text>
                        </div>
                        <Progress 
                          percent={Math.min(100, (dateRangeDays / 365) * 100)}
                          size="small"
                          strokeColor="#52c41a"
                          showInfo={false}
                          style={{ margin: '4px 0' }}
                        />
                        <Text style={{ fontSize: 9, color: '#8c8c8c', textAlign: 'center', display: 'block' }}>
                          {dateRangeDays <= 7 ? '🔥 Vista rápida' : 
                           dateRangeDays <= 30 ? '📊 Vista mensual' :
                           dateRangeDays <= 90 ? '📈 Vista trimestral' : '📆 Vista extendida'}
                        </Text>
                      </Space>
                    </div>
                  </Space>
                </Card>
              </Space>
            </Col>
          </Row>
        )}

        {selectedView === 'profiles' && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              {renderRecentProfiles()}
            </Col>
            <Col xs={24} lg={8}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card
                  title="Acciones Rápidas"
                  size="small"
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {view !== 'admin' && (
                      <Button
                        type="primary"
                        icon={<UserOutlined />}
                        onClick={() => safeNavigate(`${base}/profiles/new`)}
                        style={{ width: '100%' }}
                      >
                        Crear Perfil DUA
                      </Button>
                    )}
                    <Button
                      icon={<TeamOutlined />}
                      onClick={() => safeNavigate(`${base}/profiles`)}
                      style={{ width: '100%' }}
                    >
                      Ver Todos los Perfiles
                    </Button>
                    {view !== 'admin' && (
                      <Button
                        icon={<FileTextOutlined />}
                        onClick={() => safeNavigate(`${base}/templates`)}
                        style={{ width: '100%' }}
                      >
                        Plantillas de Perfiles
                      </Button>
                    )}
                  </Space>
                </Card>
                {renderAccommodationTimeline()}
              </Space>
            </Col>
          </Row>
        )}

        {selectedView === 'accommodations' && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              {renderTopTemplates()}
            </Col>
            <Col xs={24} lg={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card
                  title="Acciones Rápidas"
                  size="small"
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {view !== 'admin' && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => safeNavigate(`${base}/accommodations/new`)}
                        style={{ width: '100%' }}
                      >
                        Nueva Acomodación
                      </Button>
                    )}
                    <Button
                      icon={<BookOutlined />}
                      onClick={() => safeNavigate(`${base}/accommodations`)}
                      style={{ width: '100%' }}
                    >
                      Ver Todas las Acomodaciones
                    </Button>
                    {view !== 'admin' && (
                      <Button
                        icon={<FileTextOutlined />}
                        onClick={() => safeNavigate(`${base}/templates`)}
                        style={{ width: '100%' }}
                      >
                        Plantillas de Acomodaciones
                      </Button>
                    )}
                  </Space>
                </Card>
                <Card title="Acomodaciones por Estado">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Progress
                      percent={dashboard?.accommodationStatusDistribution?.active || 0}
                      strokeColor="#52c41a"
                      format={(percent) => `Activas: ${percent}%`}
                    />
                    <Progress
                      percent={dashboard?.accommodationStatusDistribution?.pending || 0}
                      strokeColor="#faad14"
                      format={(percent) => `Pendientes: ${percent}%`}
                    />
                    <Progress
                      percent={dashboard?.accommodationStatusDistribution?.expired || 0}
                      strokeColor="#ff4d4f"
                      format={(percent) => `Expiradas: ${percent}%`}
                    />
                  </Space>
                </Card>
              </Space>
            </Col>
          </Row>
        )}

        {selectedView === 'effectiveness' && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={18}>
              {renderEffectivenessTable()}
            </Col>
            <Col xs={24} lg={6}>
              <Card
                title="Acciones Rápidas"
                size="small"
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  {view !== 'admin' && (
                    <Button
                      type="primary"
                      icon={<StarOutlined />}
                      onClick={() => safeNavigate(`${base}/effectiveness/new`)}
                      style={{ width: '100%' }}
                    >
                      Nueva Evaluación
                    </Button>
                  )}
                  {view !== 'admin' && (
                    <Button
                      icon={<BarChartOutlined />}
                      onClick={() => safeNavigate(`${base}/effectiveness`)}
                      style={{ width: '100%' }}
                    >
                      Ver Todas las Evaluaciones
                    </Button>
                  )}
                  {view !== 'admin' && (
                    <Button
                      icon={<FileTextOutlined />}
                      onClick={() => safeNavigate(`${base}/reports`)}
                      style={{ width: '100%' }}
                    >
                      Generar Informe
                    </Button>
                  )}
                </Space>
              </Card>
            </Col>
          </Row>
        )}
      </motion.div>

      {/* Alerts and Notifications */}
      {dashboard?.alerts && dashboard.alerts.length > 0 && (
        <Card style={{ marginTop: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            {dashboard.alerts.map((alert: any, index: number) => (
              <Alert
                key={index}
                message={alert.title}
                description={alert.description}
                type={alert.type}
                showIcon
                action={
                  alert.actionLink && (
                    <Button size="small" onClick={() => safeNavigate(alert.actionLink)}>
                      {alert.actionText || 'Ver más'}
                    </Button>
                  )
                }
              />
            ))}
          </Space>
        </Card>
      )}
    </div>
  );
};

// Import Alert component
import { Alert } from 'antd';

export default DuaDashboard;