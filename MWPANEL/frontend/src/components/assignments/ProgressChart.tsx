/**
 * @archivo: ProgressChart.tsx
 * @módulo: Assignments - Frontend Components
 * @función: Componente de gráficos de progreso
 * @proyecto: MW Panel 2.0 - Sistema de Asignaciones Rediseñado
 * @fecha: 9 de agosto de 2025
 * @version: 1.0.0
 * 
 * DESCRIPCIÓN:
 * Componente que renderiza diferentes tipos de gráficos para
 * visualizar el progreso de asignaciones y métricas asociadas.
 * 
 * FUNCIONALIDADES:
 * - Múltiples tipos de gráficos (barras, líneas, donut, área)
 * - Gráficos de progreso, tendencias, distribución
 * - Colores adaptativos según datos
 * - Tooltips informativos
 * - Responsive design
 * 
 * ESTADO: NUEVA IMPLEMENTACIÓN - STEP 3.2
 */

import React, { useMemo } from 'react';
import {
  Card,
  Typography,
  Empty,
  Spin
} from 'antd';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';

import { AssignmentProgress } from '../../types/assignments';

const { Title, Text } = Typography;

interface ProgressChartProps {
  data: AssignmentProgress[];
  type: 'completion' | 'trend' | 'distribution' | 'engagement' | 'time' | 'performance';
  title?: string;
  height?: number;
  loading?: boolean;
  className?: string;
}

/**
 * Colores para gráficos
 */
const CHART_COLORS = {
  primary: '#1890ff',
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  purple: '#722ed1',
  cyan: '#13c2c2',
  orange: '#fa8c16',
  pink: '#eb2f96'
};

const STATUS_COLORS = {
  'NOT_STARTED': CHART_COLORS.error,
  'IN_PROGRESS': CHART_COLORS.primary,
  'COMPLETED': CHART_COLORS.success,
  'OVERDUE': CHART_COLORS.warning
};

export const ProgressChart: React.FC<ProgressChartProps> = ({
  data,
  type,
  title,
  height = 300,
  loading = false,
  className = ''
}) => {
  // Procesar datos según el tipo de gráfico
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    switch (type) {
      case 'completion':
        return processCompletionData(data);
      
      case 'trend':
        return processTrendData(data);
      
      case 'distribution':
        return processDistributionData(data);
      
      case 'engagement':
        return processEngagementData(data);
      
      case 'time':
        return processTimeData(data);
      
      case 'performance':
        return processPerformanceData(data);
      
      default:
        return [];
    }
  }, [data, type]);

  // Función para procesar datos de completado
  const processCompletionData = (progressData: AssignmentProgress[]) => {
    const ranges = [
      { name: '0-25%', min: 0, max: 25, color: CHART_COLORS.error },
      { name: '26-50%', min: 26, max: 50, color: CHART_COLORS.warning },
      { name: '51-75%', min: 51, max: 75, color: CHART_COLORS.primary },
      { name: '76-100%', min: 76, max: 100, color: CHART_COLORS.success }
    ];

    return ranges.map(range => {
      const count = progressData.filter(p => {
        const completion = p.completionPercentage || 0;
        return completion >= range.min && completion <= range.max;
      }).length;

      return {
        name: range.name,
        value: count,
        color: range.color,
        percentage: progressData.length > 0 ? Math.round((count / progressData.length) * 100) : 0
      };
    });
  };

  // Función para procesar datos de tendencia
  const processTrendData = (progressData: AssignmentProgress[]) => {
    // Agrupar por fecha de última actividad
    const grouped = progressData.reduce((acc, progress) => {
      if (!progress.lastActivity) return acc;
      
      const date = dayjs(progress.lastActivity).format('YYYY-MM-DD');
      if (!acc[date]) {
        acc[date] = {
          date,
          completion: 0,
          engagement: 0,
          count: 0
        };
      }
      
      acc[date].completion += progress.completionPercentage || 0;
      acc[date].engagement += (progress.engagementScore || 0) * 100;
      acc[date].count++;
      
      return acc;
    }, {} as Record<string, any>);

    // Convertir a array y calcular promedios
    return Object.values(grouped).map((item: any) => ({
      date: dayjs(item.date).format('DD/MM'),
      completion: Math.round(item.completion / item.count),
      engagement: Math.round(item.engagement / item.count),
      activities: item.count
    })).sort((a, b) => dayjs(a.date, 'DD/MM').unix() - dayjs(b.date, 'DD/MM').unix());
  };

  // Función para procesar datos de distribución
  const processDistributionData = (progressData: AssignmentProgress[]) => {
    const statusCount = progressData.reduce((acc, progress) => {
      const status = progress.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(statusCount).map(([status, count]) => ({
      name: getStatusText(status),
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || CHART_COLORS.primary,
      percentage: Math.round((count / progressData.length) * 100)
    }));
  };

  // Función para procesar datos de engagement
  const processEngagementData = (progressData: AssignmentProgress[]) => {
    return progressData.map((progress, index) => ({
      name: progress.userName?.substring(0, 10) || `Usuario ${index + 1}`,
      engagement: Math.round((progress.engagementScore || 0) * 100),
      completion: progress.completionPercentage || 0,
      timeSpent: Math.round((progress.timeSpent || 0) / 60) // convertir a minutos
    })).sort((a, b) => b.engagement - a.engagement).slice(0, 10); // Top 10
  };

  // Función para procesar datos de tiempo
  const processTimeData = (progressData: AssignmentProgress[]) => {
    return progressData.map((progress, index) => ({
      name: progress.userName?.substring(0, 10) || `Usuario ${index + 1}`,
      timeSpent: Math.round((progress.timeSpent || 0) / 60), // minutos
      completion: progress.completionPercentage || 0,
      efficiency: progress.completionPercentage && progress.timeSpent 
        ? Math.round((progress.completionPercentage || 0) / ((progress.timeSpent || 1) / 60))
        : 0
    })).sort((a, b) => b.timeSpent - a.timeSpent).slice(0, 10);
  };

  // Función para procesar datos de rendimiento
  const processPerformanceData = (progressData: AssignmentProgress[]) => {
    return progressData.map((progress, index) => ({
      name: progress.userName?.substring(0, 10) || `Usuario ${index + 1}`,
      score: progress.score || 0,
      completion: progress.completionPercentage || 0,
      engagement: Math.round((progress.engagementScore || 0) * 100)
    })).sort((a, b) => b.score - a.score).slice(0, 10);
  };

  // Función auxiliar para obtener texto de estado
  const getStatusText = (status: string) => {
    const statusTexts = {
      'NOT_STARTED': 'No iniciado',
      'IN_PROGRESS': 'En progreso',
      'COMPLETED': 'Completado',
      'OVERDUE': 'Vencido'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  };

  // Renderizar gráfico según tipo
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <Empty 
          description="No hay datos suficientes para mostrar el gráfico"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      );
    }

    switch (type) {
      case 'completion':
      case 'distribution':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percentage }) => `${name}: ${percentage}%`}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'trend':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="completion"
                stackId="1"
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primary}
                fillOpacity={0.6}
                name="Progreso (%)"
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stackId="2"
                stroke={CHART_COLORS.success}
                fill={CHART_COLORS.success}
                fillOpacity={0.6}
                name="Engagement (%)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'engagement':
      case 'time':
      case 'performance':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Legend />
              
              {type === 'engagement' && (
                <>
                  <Bar dataKey="engagement" fill={CHART_COLORS.primary} name="Engagement %" />
                  <Bar dataKey="completion" fill={CHART_COLORS.success} name="Completado %" />
                </>
              )}
              
              {type === 'time' && (
                <>
                  <Bar dataKey="timeSpent" fill={CHART_COLORS.warning} name="Tiempo (min)" />
                  <Bar dataKey="efficiency" fill={CHART_COLORS.purple} name="Eficiencia" />
                </>
              )}
              
              {type === 'performance' && (
                <>
                  <Bar dataKey="score" fill={CHART_COLORS.success} name="Puntuación" />
                  <Bar dataKey="completion" fill={CHART_COLORS.primary} name="Completado %" />
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke={CHART_COLORS.primary} />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  // Obtener título por defecto
  const getDefaultTitle = () => {
    const titles = {
      'completion': 'Distribución de Progreso',
      'trend': 'Tendencia de Actividad',
      'distribution': 'Distribución por Estado',
      'engagement': 'Top Engagement',
      'time': 'Tiempo por Usuario',
      'performance': 'Rendimiento por Usuario'
    };
    return titles[type] || 'Gráfico de Progreso';
  };

  return (
    <Card 
      title={title || getDefaultTitle()}
      className={className}
    >
      <Spin spinning={loading}>
        {renderChart()}
      </Spin>
      
      {/* Mostrar estadísticas adicionales */}
      {chartData.length > 0 && (
        <div className="mt-4 text-center">
          <Text type="secondary" className="text-sm">
            {data.length} registro{data.length !== 1 ? 's' : ''} analizados
          </Text>
        </div>
      )}
    </Card>
  );
};