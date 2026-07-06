/**
 * @archivo: TeacherTodoWidget.tsx
 * @módulo: Teacher (Widget TODO)
 * @función: Widget compacto de tareas pendientes para dashboard principal
 * @características:
 *   - Contador total con color dinámico
 *   - Clic para filtrar urgentes
 *   - Indicadores visuales
 *   - Responsive design
 */

import React, { useCallback } from 'react';
import { Card, Badge, Typography, Button, Row, Col, Spin, Tooltip } from 'antd';
import { 
  CheckSquareOutlined, 
  ExclamationCircleOutlined, 
  ClockCircleOutlined,
  ArrowRightOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTeacherTodo } from '@hooks/useTeacherTodo';

const { Text, Title } = Typography;

interface TeacherTodoWidgetProps {
  compact?: boolean;
}

const TeacherTodoWidget: React.FC<TeacherTodoWidgetProps> = ({ compact = false }) => {
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
  const { 
    quickStats, 
    loading, 
    hasUrgentItems, 
    hasOverdueItems, 
    hasPendingItems 
  } = useTeacherTodo();

  const handleHeaderClick = () => {
    if (hasUrgentItems || hasOverdueItems) {
      // Si hay urgentes, ir directo a filtro de urgentes
      safeNavigate('/teacher/todo?urgentOnly=true');
    } else {
      // Si no hay urgentes, ir al dashboard normal
      safeNavigate('/teacher/todo');
    }
  };

  const handleViewAll = () => {
    safeNavigate('/teacher/todo');
  };

  if (loading) {
    return (
      <Card size="small" className="w-full">
        <div className="flex justify-center items-center h-24">
          <Spin size="small" />
        </div>
      </Card>
    );
  }

  const headerColor = hasUrgentItems ? '#f5222d' : 
                     hasOverdueItems ? '#fa8c16' : 
                     hasPendingItems ? '#faad14' : '#52c41a';

  const headerIcon = hasUrgentItems ? <ExclamationCircleOutlined /> :
                    hasOverdueItems ? <ClockCircleOutlined /> :
                    <CheckSquareOutlined />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        size="small"
        className="w-full hover:shadow-md transition-shadow duration-200"
        bodyStyle={{ padding: compact ? '12px' : '16px' }}
      >
        {/* Header clickeable */}
        <div 
          className="cursor-pointer mb-3"
          onClick={handleHeaderClick}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ color: headerColor, fontSize: '18px' }}>
                {headerIcon}
              </span>
              <Text strong className={compact ? 'text-sm' : 'text-base'}>
                Tareas Pendientes
              </Text>
            </div>
            
            <Badge 
              count={quickStats.totalPending} 
              showZero 
              style={{ 
                backgroundColor: headerColor,
                fontSize: '12px',
              }}
            >
              <div style={{ width: '24px', height: '24px' }} />
            </Badge>
          </div>
        </div>

        {/* Estadísticas detalladas */}
        <Row gutter={[8, 8]} className="mb-3">
          <Col span={8}>
            <div className="text-center p-2 bg-red-50 rounded">
              <div 
                className={`font-bold text-red-600 ${compact ? 'text-lg' : 'text-xl'}`}
              >
                {quickStats.urgentCount}
              </div>
              <div className="text-xs text-gray-600">Urgentes</div>
            </div>
          </Col>
          
          <Col span={8}>
            <div className="text-center p-2 bg-orange-50 rounded">
              <div 
                className={`font-bold text-orange-600 ${compact ? 'text-lg' : 'text-xl'}`}
              >
                {quickStats.overdueCount}
              </div>
              <div className="text-xs text-gray-600">Vencidas</div>
            </div>
          </Col>
          
          <Col span={8}>
            <div className="text-center p-2 bg-blue-50 rounded">
              <div 
                className={`font-bold text-blue-600 ${compact ? 'text-lg' : 'text-xl'}`}
              >
                {quickStats.totalPending}
              </div>
              <div className="text-xs text-gray-600">Total</div>
            </div>
          </Col>
        </Row>

        {/* Mensajes de estado */}
        {hasUrgentItems && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-center"
          >
            <Text type="danger" className="text-xs">
              <ExclamationCircleOutlined className="mr-1" />
              ¡Hay tareas urgentes que requieren atención!
            </Text>
          </motion.div>
        )}

        {hasOverdueItems && !hasUrgentItems && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded text-center"
          >
            <Text style={{ color: '#fa8c16' }} className="text-xs">
              <ClockCircleOutlined className="mr-1" />
              Hay tareas vencidas pendientes de revisión
            </Text>
          </motion.div>
        )}

        {!hasPendingItems && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-center"
          >
            <Text type="success" className="text-xs">
              <CheckSquareOutlined className="mr-1" />
              ¡Todas las tareas están al día!
            </Text>
          </motion.div>
        )}

        {/* Botón de acción */}
        <Button
          type={hasPendingItems ? 'primary' : 'default'}
          size="small"
          block
          icon={<ArrowRightOutlined />}
          onClick={handleViewAll}
          style={hasPendingItems ? { 
            backgroundColor: headerColor, 
            borderColor: headerColor 
          } : undefined}
        >
          {hasPendingItems ? 'Gestionar Tareas' : 'Ver Dashboard'}
        </Button>
      </Card>
    </motion.div>
  );
};

export default TeacherTodoWidget;