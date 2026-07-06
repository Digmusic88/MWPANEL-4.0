/**
 * @archivo: ImportantNotices.tsx
 * @módulo: Family (Componente de Avisos Importantes)
 * @función: Muestra alertas automáticas importantes para familias
 * @características:
 *   - Detección automática de situaciones críticas académicas
 *   - Marcado como visto con persistencia en BD
 *   - Responsive design para desktop y móvil
 *   - Prioridades visuales por tipo de alerta
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Alert, 
  Button, 
  Badge, 
  Typography, 
  Space, 
  Divider,
  Row,
  Col,
  Spin,
  message,
  Modal
} from 'antd';
import { 
  ExclamationCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  ReloadOutlined,
  BookOutlined,
  FileTextOutlined,
  CalendarOutlined,
  UserOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../services/apiClient';

const { Title, Text } = Typography;

// Tipos para TypeScript
interface AlertMetadata {
  subjectId?: string;
  subjectName?: string;
  taskId?: string;
  taskName?: string;
  grade?: number;
  dueDate?: string;
  attendanceDate?: string;
  threshold?: number;
  pendingCount?: number;
  absenceCount?: number;
}

interface FamilyAlert {
  id: string;
  alertType: 'pending_tasks' | 'low_subject_grade' | 'low_task_grade' | 'unjustified_absence' | 'upcoming_exam';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  isViewed: boolean;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
  };
  metadata?: AlertMetadata;
}

interface AlertSummary {
  totalAlerts: number;
  unviewedAlerts: number;
  criticalAlerts: number;
  alertsByType: {
    pending_tasks: number;
    low_subject_grade: number;
    low_task_grade: number;
    unjustified_absence: number;
    upcoming_exam: number;
  };
  alerts: FamilyAlert[];
}

// Configuración de iconos y colores por tipo de alerta
const ALERT_CONFIG = {
  pending_tasks: {
    icon: <FileTextOutlined />,
    color: '#faad14', // warning
    bgColor: '#fff7e6',
    borderColor: '#ffd591'
  },
  low_subject_grade: {
    icon: <BookOutlined />,
    color: '#f5222d', // error
    bgColor: '#fff2f0',
    borderColor: '#ffccc7'
  },
  low_task_grade: {
    icon: <FileTextOutlined />,
    color: '#fa8c16', // warning-dark
    bgColor: '#fff7e6',
    borderColor: '#ffd591'
  },
  unjustified_absence: {
    icon: <CalendarOutlined />,
    color: '#d46b08', // orange
    bgColor: '#fff7e6',
    borderColor: '#ffd591'
  },
  upcoming_exam: {
    icon: <ExclamationCircleOutlined />,
    color: '#722ed1', // purple - más llamativo para exámenes
    bgColor: '#f9f0ff',
    borderColor: '#d3adf7'
  }
};

// Configuración de prioridades
const PRIORITY_CONFIG = {
  low: { color: '#52c41a', text: 'Baja' },
  medium: { color: '#faad14', text: 'Media' },
  high: { color: '#fa8c16', text: 'Alta' },
  critical: { color: '#f5222d', text: 'Crítica' }
};

const ImportantNotices: React.FC = () => {
  const [alertData, setAlertData] = useState<AlertSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingAlerts, setProcessingAlerts] = useState<Set<string>>(new Set());
  const { user } = useAuth();

  // Cargar alertas al montar el componente
  useEffect(() => {
    loadAlerts();
    
    // Actualizar cada 5 minutos
    const interval = setInterval(loadAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      console.log('ImportantNotices: Loading alerts...');
      const response = await apiClient.get('/families/alerts');
      console.log('ImportantNotices: Alerts loaded:', response.data);
      setAlertData(response.data);
    } catch (error) {
      console.error('ImportantNotices: Error loading alerts:', error);
      // Set comprehensive fallback data to ensure component renders safely
      setAlertData({
        alerts: [],
        totalAlerts: 0,
        unviewedAlerts: 0,
        criticalAlerts: 0,
        alertsByType: {
          pending_tasks: 0,
          low_subject_grade: 0,
          low_task_grade: 0,
          unjustified_absence: 0,
          upcoming_exam: 0
        },
        statistics: {
          total: 0,
          low_grade: 0,
          attendance_issue: 0,
          missing_task: 0,
          upcoming_exam: 0
        }
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAlertAsViewed = async (alertId: string) => {
    setProcessingAlerts(prev => new Set(prev).add(alertId));
    
    try {
      await apiClient.post(`/families/alerts/${alertId}/view`);

      // Actualizar estado local
      setAlertData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          alerts: prev.alerts.map(alert => 
            alert.id === alertId 
              ? { ...alert, isViewed: true }
              : alert
          ),
          unviewedAlerts: Math.max(0, prev.unviewedAlerts - 1)
        };
      });
      
      message.success('Aviso marcado como visto');
    } catch (error) {
      console.error('Error marking alert as viewed:', error);
      message.error('Error al marcar el aviso como visto');
    } finally {
      setProcessingAlerts(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const markAllAlertsAsViewed = async () => {
    try {
      await apiClient.post('/families/alerts/view-all');

      setAlertData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          alerts: prev.alerts.map(alert => ({ ...alert, isViewed: true })),
          unviewedAlerts: 0
        };
      });
      
      message.success('Todos los avisos marcados como vistos');
    } catch (error) {
      console.error('Error marking all alerts as viewed:', error);
      message.error('Error al marcar todos los avisos como vistos');
    }
  };

  const refreshAlerts = async () => {
    setRefreshing(true);
    
    try {
      // Forzar actualización
      await apiClient.post('/families/alerts/refresh');
      
      // Recargar alertas
      await loadAlerts();
      message.success('Avisos actualizados');
    } catch (error) {
      console.error('Error refreshing alerts:', error);
      message.error('Error al actualizar los avisos');
      setRefreshing(false);
    }
  };

  const renderAlert = (alert: FamilyAlert) => {
    const config = ALERT_CONFIG[alert.alertType];
    const priorityConfig = PRIORITY_CONFIG[alert.priority];
    const isProcessing = processingAlerts.has(alert.id);

    return (
      <motion.div
        key={alert.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          size="small"
          className="mb-3 shadow-sm"
          style={{
            borderLeft: `4px solid ${config.color}`,
            backgroundColor: alert.isViewed ? '#f9f9f9' : config.bgColor,
            borderColor: alert.isViewed ? '#e8e8e8' : config.borderColor,
          }}
          bodyStyle={{ padding: '12px 16px' }}
        >
          <Row gutter={[16, 8]} align="middle">
            {/* Icono y información principal */}
            <Col flex="1">
              <Space align="start" size={12}>
                <div
                  style={{
                    color: config.color,
                    fontSize: '20px',
                    marginTop: '2px'
                  }}
                >
                  {config.icon}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Text 
                      strong 
                      style={{ 
                        fontSize: '14px',
                        opacity: alert.isViewed ? 0.7 : 1
                      }}
                    >
                      {alert.title}
                    </Text>
                    
                    <Badge 
                      color={priorityConfig.color}
                      text={priorityConfig.text}
                      style={{ fontSize: '11px' }}
                    />
                  </div>
                  
                  <Text 
                    style={{ 
                      fontSize: '13px',
                      color: '#666',
                      opacity: alert.isViewed ? 0.7 : 1,
                      display: 'block',
                      marginBottom: '4px'
                    }}
                  >
                    {alert.description}
                  </Text>
                  
                  <div className="flex items-center gap-3">
                    <Space size={4}>
                      <UserOutlined style={{ fontSize: '11px', color: '#999' }} />
                      <Text style={{ fontSize: '11px', color: '#999' }}>
                        {alert.student.firstName} {alert.student.lastName}
                      </Text>
                    </Space>
                    
                    <Text style={{ fontSize: '11px', color: '#999' }}>
                      {new Date(alert.createdAt).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </div>
                </div>
              </Space>
            </Col>
            
            {/* Botón de acción */}
            <Col>
              {!alert.isViewed && (
                <Button
                  type="text"
                  size="small"
                  icon={<CheckOutlined />}
                  loading={isProcessing}
                  onClick={() => markAlertAsViewed(alert.id)}
                  style={{
                    color: '#52c41a',
                    borderColor: '#52c41a'
                  }}
                  className="hover:bg-green-50"
                >
                  Visto
                </Button>
              )}
            </Col>
          </Row>
        </Card>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <div className="text-center py-8">
          <Spin size="large" />
          <div className="mt-4">
            <Text>Cargando avisos importantes...</Text>
          </div>
        </div>
      </Card>
    );
  }

  // No mostrar el componente si no hay alertas
  if (!alertData || totalAlerts === 0) {
    return null;
  }

  const unviewedAlerts = (alertData?.alerts || []).filter(alert => !alert.isViewed);
  const viewedAlerts = (alertData?.alerts || []).filter(alert => alert.isViewed);
  const totalAlerts = alertData?.totalAlerts || (alertData?.alerts || []).length || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card
        className="mb-6 shadow-md"
        style={{
          borderTop: '4px solid #fa8c16',
          backgroundColor: '#fff',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ExclamationCircleOutlined 
              style={{ 
                fontSize: '24px', 
                color: '#fa8c16' 
              }} 
            />
            <div>
              <Title level={4} className="mb-0">
                Aspectos Importantes
              </Title>
              <Text style={{ fontSize: '13px', color: '#666' }}>
                Situaciones que requieren tu atención
              </Text>
            </div>
          </div>
          
          <Space>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={refreshAlerts}
              disabled={refreshing}
            >
              Actualizar
            </Button>
            
            {(alertData?.unviewedAlerts || 0) > 0 && (
              <Button
                type="primary"
                size="small"
                onClick={markAllAlertsAsViewed}
              >
                Marcar todo como visto
              </Button>
            )}
          </Space>
        </div>

        {/* Estadísticas */}
        <Row gutter={16} className="mb-4">
          <Col xs={12} sm={6} md={4}>
            <div className="text-center p-3 bg-orange-50 rounded">
              <div className="text-2xl font-bold text-orange-600">
                {alertData?.totalAlerts || 0}
              </div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
          </Col>
          
          <Col xs={12} sm={6} md={4}>
            <div className="text-center p-3 bg-red-50 rounded">
              <div className="text-2xl font-bold text-red-600">
                {alertData?.unviewedAlerts || 0}
              </div>
              <div className="text-sm text-gray-600">Sin ver</div>
            </div>
          </Col>
          
          <Col xs={12} sm={6} md={4}>
            <div className="text-center p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">
                {alertData?.alertsByType?.upcoming_exam || 0}
              </div>
              <div className="text-sm text-gray-600">Test Yourself</div>
            </div>
          </Col>
          
          <Col xs={12} sm={6} md={4}>
            <div className="text-center p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">
                {alertData?.alertsByType?.pending_tasks || 0}
              </div>
              <div className="text-sm text-gray-600">Tareas</div>
            </div>
          </Col>
          
          <Col xs={12} sm={6} md={4}>
            <div className="text-center p-3 bg-yellow-50 rounded">
              <div className="text-2xl font-bold text-yellow-600">
                {alertData?.criticalAlerts || 0}
              </div>
              <div className="text-sm text-gray-600">Críticas</div>
            </div>
          </Col>
        </Row>

        <Divider />

        {/* Alertas sin ver */}
        {unviewedAlerts.length > 0 && (
          <>
            <div className="mb-3">
              <Text strong style={{ color: '#fa8c16' }}>
                📢 Nuevos avisos ({unviewedAlerts.length})
              </Text>
            </div>
            
            <AnimatePresence>
              {unviewedAlerts.map(renderAlert)}
            </AnimatePresence>
          </>
        )}

        {/* Alertas vistas */}
        {viewedAlerts.length > 0 && (
          <>
            {unviewedAlerts.length > 0 && <Divider />}
            
            <div className="mb-3">
              <Text style={{ color: '#999' }}>
                ✓ Avisos vistos ({viewedAlerts.length})
              </Text>
            </div>
            
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <AnimatePresence>
                {viewedAlerts.map(renderAlert)}
              </AnimatePresence>
            </div>
          </>
        )}
      </Card>
    </motion.div>
  );
};

export default ImportantNotices;