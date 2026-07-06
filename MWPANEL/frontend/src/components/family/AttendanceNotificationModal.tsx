import React, { useState } from 'react';
import {
  Modal,
  Typography,
  Space,
  Tag,
  Avatar,
  Button,
  Row,
  Col,
  Descriptions,
  Alert,
  Timeline,
  Divider,
} from 'antd';
import {
  UserOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { FamilyAlert } from './NotificationBell';

const { Title, Text } = Typography;

interface AttendanceNotificationModalProps {
  visible: boolean;
  onClose: () => void;
  alert: FamilyAlert | null;
  onMarkAsViewed?: (alertId: string) => void;
}

const AttendanceNotificationModal: React.FC<AttendanceNotificationModalProps> = ({
  visible,
  onClose,
  alert,
  onMarkAsViewed,
}) => {
  const [marking, setMarking] = useState(false);

  if (!alert) return null;

  // Get icon for alert type
  const getAlertIcon = () => {
    switch (alert.alertType) {
      case 'student_absent':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />;
      case 'student_late':
        return <ClockCircleOutlined style={{ color: '#faad14', fontSize: 24 }} />;
      case 'pattern_absences':
        return <WarningOutlined style={{ color: '#ff4d4f', fontSize: 24 }} />;
      case 'pattern_tardiness':
        return <WarningOutlined style={{ color: '#fa8c16', fontSize: 24 }} />;
      case 'unjustified_absence':
        return <ExclamationCircleOutlined style={{ color: '#f5222d', fontSize: 24 }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 24 }} />;
    }
  };

  // Get alert type label
  const getAlertTypeLabel = () => {
    switch (alert.alertType) {
      case 'student_absent':
        return 'Ausencia del Día';
      case 'student_late':
        return 'Tardanza del Día';
      case 'pattern_absences':
        return 'Patrón de Ausencias';
      case 'pattern_tardiness':
        return 'Patrón de Tardanzas';
      case 'unjustified_absence':
        return 'Ausencia Sin Justificar';
      case 'pending_tasks':
        return 'Tareas Pendientes';
      case 'low_task_grade':
        return 'Calificación Baja en Tarea';
      case 'low_subject_grade':
        return 'Calificación Baja en Asignatura';
      case 'upcoming_exam':
        return 'Examen Próximo';
      default:
        return 'Notificación';
    }
  };

  // Get priority color
  const getPriorityColor = () => {
    switch (alert.priority) {
      case 'critical':
        return '#ff4d4f';
      case 'high':
        return '#fa8c16';
      case 'medium':
        return '#faad14';
      case 'low':
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  };

  // Get priority label
  const getPriorityLabel = () => {
    switch (alert.priority) {
      case 'critical':
        return 'Crítico';
      case 'high':
        return 'Alto';
      case 'medium':
        return 'Medio';
      case 'low':
        return 'Bajo';
      default:
        return alert.priority;
    }
  };

  // Handle mark as viewed
  const handleMarkAsViewed = async () => {
    if (onMarkAsViewed && !alert.isViewed) {
      setMarking(true);
      try {
        await onMarkAsViewed(alert.id);
      } finally {
        setMarking(false);
      }
    }
  };

  // Get recommendations based on alert type
  const getRecommendations = () => {
    switch (alert.alertType) {
      case 'student_absent':
        return [
          'Contactar con el centro educativo si la ausencia no fue comunicada previamente',
          'Solicitar tareas y material de estudio para ponerse al día',
          'Justificar la ausencia si es necesario',
        ];
      case 'student_late':
        return [
          'Revisar la rutina matutina para identificar posibles mejoras',
          'Considerar salir de casa unos minutos antes',
          'Verificar si hay algún problema de transporte',
        ];
      case 'pattern_absences':
        return [
          'Programar una reunión con el tutor del estudiante',
          'Evaluar si hay problemas de salud recurrentes',
          'Considerar apoyo adicional si hay dificultades académicas',
        ];
      case 'pattern_tardiness':
        return [
          'Establecer una rutina matutina más estructurada',
          'Revisar los horarios de sueño del estudiante',
          'Contactar con el centro para coordinar estrategias',
        ];
      default:
        return [];
    }
  };

  const recommendations = getRecommendations();

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {getAlertIcon()}
          <div>
            <Text strong style={{ fontSize: '16px' }}>
              {getAlertTypeLabel()}
            </Text>
            <div>
              <Tag color={getPriorityColor()} style={{ fontSize: '11px', marginTop: 4 }}>
                Prioridad {getPriorityLabel()}
              </Tag>
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={600}
      footer={[
        !alert.isViewed && (
          <Button
            key="mark-viewed"
            icon={<CheckCircleOutlined />}
            loading={marking}
            onClick={handleMarkAsViewed}
          >
            Marcar como Vista
          </Button>
        ),
        <Button key="close" type="primary" onClick={onClose}>
          Cerrar
        </Button>,
      ].filter(Boolean)}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Student Information */}
        <div>
          <Row gutter={[16, 16]} align="middle">
            <Col flex="auto">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar size={48} icon={<UserOutlined />} />
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {alert.student?.firstName || 'Sin especificar'} {alert.student?.lastName || ''}
                  </Title>
                  <Text type="secondary">
                    Notificación recibida {dayjs(alert.createdAt).fromNow()}
                  </Text>
                </div>
              </div>
            </Col>
            <Col>
              {alert.isViewed ? (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  Vista
                </Tag>
              ) : (
                <Tag icon={<ExclamationCircleOutlined />} color="warning">
                  Sin Ver
                </Tag>
              )}
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Alert Details */}
        <div>
          <Title level={5}>Detalles de la Notificación</Title>
          <Alert
            message={alert.title}
            description={alert.description}
            type={alert.priority === 'critical' || alert.priority === 'high' ? 'warning' : 'info'}
            showIcon
            style={{ marginBottom: 16 }}
          />

          {/* Metadata Information */}
          {alert.metadata && (
            <Descriptions size="small" column={1} bordered>
              {/* Attendance-specific metadata */}
              {alert.metadata.attendanceDate && (
                <Descriptions.Item label="Fecha">
                  <Space>
                    <CalendarOutlined />
                    {dayjs(alert.metadata.attendanceDate).format('DD/MM/YYYY')}
                  </Space>
                </Descriptions.Item>
              )}
              
              {alert.metadata.arrivalTime && (
                <Descriptions.Item label="Hora de Llegada">
                  <Space>
                    <ClockCircleOutlined />
                    {alert.metadata.arrivalTime}
                  </Space>
                </Descriptions.Item>
              )}
              
              {alert.metadata.justification && (
                <Descriptions.Item label="Justificación">
                  {alert.metadata.justification}
                </Descriptions.Item>
              )}

              {/* Pattern-specific metadata */}
              {alert.metadata.absenceCount && (
                <Descriptions.Item label="Número de Ausencias">
                  {alert.metadata.absenceCount} en {alert.metadata.periodDays || 30} días
                </Descriptions.Item>
              )}

              {alert.metadata.lateCount && (
                <Descriptions.Item label="Número de Tardanzas">
                  {alert.metadata.lateCount} en {alert.metadata.periodDays || 30} días
                </Descriptions.Item>
              )}

              {/* Task/Grade metadata */}
              {alert.metadata.pendingCount && (
                <Descriptions.Item label="Tareas Pendientes">
                  {alert.metadata.pendingCount} tarea(s)
                </Descriptions.Item>
              )}

              {alert.metadata.grade && (
                <Descriptions.Item label="Calificación">
                  {alert.metadata.grade}%
                </Descriptions.Item>
              )}

              {alert.metadata.subjectName && (
                <Descriptions.Item label="Asignatura">
                  {alert.metadata.subjectName}
                </Descriptions.Item>
              )}

              {alert.metadata.taskName && (
                <Descriptions.Item label="Tarea">
                  {alert.metadata.taskName}
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <>
            <Divider />
            <div>
              <Title level={5}>Recomendaciones</Title>
              <Timeline
                size="small"
                items={recommendations.map((rec, index) => ({
                  dot: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
                  children: <Text style={{ fontSize: '13px' }}>{rec}</Text>,
                }))}
              />
            </div>
          </>
        )}

        {/* Attendance Request Details - Only for attendance requests */}
        {alert.alertType === 'attendance_request' && alert.metadata && (
          <>
            <Divider />
            <div>
              <Title level={5}>
                📋 Detalles de la Solicitud de Ausencia
              </Title>
              
              <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
                <Descriptions.Item label="Fecha solicitada">
                  <Text strong>{new Date(alert.metadata.date).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</Text>
                </Descriptions.Item>
                
                <Descriptions.Item label="Período">
                  {alert.metadata.timeSlot || 'Todo el día'}
                </Descriptions.Item>
                
                <Descriptions.Item label="Motivo">
                  <Text strong style={{ color: '#1890ff' }}>{alert.metadata.reason}</Text>
                </Descriptions.Item>
                
                {alert.metadata.fullReason && (
                  <Descriptions.Item label="Explicación detallada">
                    <Text>{alert.metadata.fullReason}</Text>
                  </Descriptions.Item>
                )}
                
                <Descriptions.Item label="Familia contacto">
                  {alert.metadata.familyContact}
                  {alert.metadata.familyPhone && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                      📞 {alert.metadata.familyPhone}
                    </div>
                  )}
                  {alert.metadata.familyEmail && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      ✉️ {alert.metadata.familyEmail}
                    </div>
                  )}
                </Descriptions.Item>
                
                <Descriptions.Item label="Fecha de solicitud">
                  {new Date(alert.metadata.requestDate).toLocaleString('es-ES')}
                </Descriptions.Item>
                
                <Descriptions.Item label="Documentación">
                  {alert.metadata.hasDocumentation ? (
                    <span style={{ color: '#52c41a' }}>✅ Adjuntada</span>
                  ) : (
                    <span style={{ color: '#faad14' }}>⚠️ Sin documentación</span>
                  )}
                </Descriptions.Item>
                
                <Descriptions.Item label="Estado actual">
                  <Tag color={
                    alert.metadata.status === 'pending' ? 'orange' :
                    alert.metadata.status === 'approved' ? 'green' : 'red'
                  }>
                    {alert.metadata.status === 'pending' ? '⏳ Pendiente' :
                     alert.metadata.status === 'approved' ? '✅ Aprobada' : '❌ Rechazada'}
                  </Tag>
                </Descriptions.Item>
              </Descriptions>

              {/* Action Buttons - Only show if pending */}
              {alert.metadata.status === 'pending' && (
                <div style={{ marginTop: 16, textAlign: 'center' }}>
                  <Space size="middle">
                    <Button 
                      type="primary" 
                      icon={<CheckCircleOutlined />}
                      style={{ 
                        backgroundColor: '#52c41a', 
                        borderColor: '#52c41a',
                        minWidth: 120 
                      }}
                      onClick={() => {
                        // TODO: Implement approve logic
                        console.log('Aprobar solicitud:', alert.id);
                        alert.metadata.status = 'approved';
                        onMarkAsViewed?.(alert.id);
                        onClose();
                      }}
                    >
                      ✅ Aprobar
                    </Button>
                    
                    <Button 
                      danger 
                      icon={<WarningOutlined />}
                      style={{ minWidth: 120 }}
                      onClick={() => {
                        // TODO: Implement reject logic
                        console.log('Rechazar solicitud:', alert.id);
                        alert.metadata.status = 'rejected';
                        onMarkAsViewed?.(alert.id);
                        onClose();
                      }}
                    >
                      ❌ Rechazar
                    </Button>
                  </Space>
                  
                  <div style={{ marginTop: 12, fontSize: '12px', color: '#666' }}>
                    💡 La familia será notificada automáticamente de tu decisión
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Contact Information */}
        <Divider />
        <Alert
          message="Información de Contacto"
          description={
            <div>
              <Text style={{ fontSize: '13px' }}>
                Si necesita más información o tiene alguna consulta sobre esta notificación, 
                no dude en contactar con el centro educativo o utilizar el sistema de mensajería 
                de la plataforma para comunicarse directamente con el tutor del estudiante.
              </Text>
            </div>
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </Space>
    </Modal>
  );
};

export default AttendanceNotificationModal;