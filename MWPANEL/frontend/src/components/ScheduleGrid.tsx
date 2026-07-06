import React from 'react';
import { Card, Typography, Tag, Tooltip, Empty, List, Space, Row, Col } from 'antd';
import { ClockCircleOutlined, UserOutlined, HomeOutlined, BookOutlined } from '@ant-design/icons';
import { getSubjectStyles } from '../utils/subjectColors';
import { useResponsive } from '../hooks/useResponsive';
import '../styles/print.css';

const { Title, Text } = Typography;

// Tipos para el horario
export interface ScheduleSession {
  id: string;
  dayOfWeek: number;
  timeSlot: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    order: number;
  };
  subjectAssignment: {
    id: string;
    subject: {
      id: string;
      name: string;
    };
    teacher: {
      id: string;
      user: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    };
  };
  classroom: {
    id: string;
    name: string;
    code: string;
  };
  startDate: string;
  endDate: string;
  isActive: boolean;
  notes?: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  section: string;
  courses: Array<{
    id: string;
    name: string;
  }>;
  academicYear: {
    id: string;
    name: string;
  };
}

interface ScheduleGridProps {
  classGroup: ClassGroup;
  sessions: ScheduleSession[];
  loading?: boolean;
}


// Días de la semana
const WEEKDAYS = [
  { key: 1, label: 'Lunes', short: 'L' },
  { key: 2, label: 'Martes', short: 'M' },
  { key: 3, label: 'Miércoles', short: 'X' },
  { key: 4, label: 'Jueves', short: 'J' },
  { key: 5, label: 'Viernes', short: 'V' },
];

const ScheduleGrid: React.FC<ScheduleGridProps> = ({ 
  classGroup, 
  sessions, 
  loading = false 
}) => {
  const { isMobile, isTablet, screenSize } = useResponsive();
  // Agrupar sesiones por día y franja horaria
  const scheduleMatrix = React.useMemo(() => {
    const matrix: Record<number, Record<number, ScheduleSession>> = {};
    
    sessions.forEach(session => {
      if (!matrix[session.dayOfWeek]) {
        matrix[session.dayOfWeek] = {};
      }
      matrix[session.dayOfWeek][session.timeSlot.order] = session;
    });
    
    return matrix;
  }, [sessions]);

  // Obtener todas las franjas horarias únicas y ordenarlas
  const timeSlots = React.useMemo(() => {
    const slots = new Map();
    sessions.forEach(session => {
      slots.set(session.timeSlot.order, session.timeSlot);
    });
    return Array.from(slots.values()).sort((a, b) => a.order - b.order);
  }, [sessions]);

  // Función para renderizar una celda de la clase (modo desktop)
  const renderScheduleCell = (dayOfWeek: number, timeSlotOrder: number) => {
    const session = scheduleMatrix[dayOfWeek]?.[timeSlotOrder];
    
    if (!session) {
      return (
        <div 
          style={{
            height: '80px',
            border: '1px dashed #d9d9d9',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fafafa'
          }}
        >
          <Text type="secondary" style={{ fontSize: '12px' }}>Libre</Text>
        </div>
      );
    }

    const subject = session.subjectAssignment.subject;
    const teacher = session.subjectAssignment.teacher.user.profile;
    const classroom = session.classroom;

    return (
      <Tooltip
        title={
          <div>
            <div><strong>{subject.name}</strong></div>
            <div><UserOutlined /> {teacher.firstName} {teacher.lastName}</div>
            <div><HomeOutlined /> {classroom.name} ({classroom.code})</div>
            <div><ClockCircleOutlined /> {session.timeSlot.startTime} - {session.timeSlot.endTime}</div>
            {session.notes && <div>📝 {session.notes}</div>}
          </div>
        }
        placement="top"
      >
        <div 
          className="schedule-cell"
          style={{
            ...getSubjectStyles(subject.name),
            height: '80px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden'
          }}
        >
          <div style={{ fontWeight: '600', fontSize: '13px', lineHeight: '1.2' }}>
            {subject.name}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8 }}>
            {teacher.firstName} {teacher.lastName.charAt(0)}.
          </div>
          <div style={{ fontSize: '10px', opacity: 0.7 }}>
            {classroom.code}
          </div>
        </div>
      </Tooltip>
    );
  };

  // Renderizado móvil - lista de sesiones por día
  const renderMobileSchedule = () => {
    const sessionsByDay = sessions.reduce((acc, session) => {
      const dayKey = session.dayOfWeek;
      if (!acc[dayKey]) acc[dayKey] = [];
      acc[dayKey].push(session);
      return acc;
    }, {} as Record<number, ScheduleSession[]>);

    return (
      <div className="mobile-schedule">
        {WEEKDAYS.map(day => {
          const daySessions = sessionsByDay[day.key] || [];
          return (
            <Card
              key={day.key}
              size="small"
              title={
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                    {day.short}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    {day.label}
                  </div>
                </div>
              }
              style={{ marginBottom: '16px' }}
              bodyStyle={{ padding: '12px' }}
            >
              {daySessions.length === 0 ? (
                <Empty 
                  image={Empty.PRESENTED_IMAGE_SIMPLE} 
                  description="Sin clases"
                  style={{ margin: '20px 0' }}
                />
              ) : (
                <List
                  dataSource={daySessions.sort((a, b) => a.timeSlot.order - b.timeSlot.order)}
                  renderItem={(session) => {
                    const subject = session.subjectAssignment.subject;
                    const teacher = session.subjectAssignment.teacher.user.profile;
                    const classroom = session.classroom;
                    
                    return (
                      <List.Item
                        style={{
                          padding: '12px',
                          margin: '8px 0',
                          border: '1px solid #f0f0f0',
                          borderRadius: '8px',
                          ...getSubjectStyles(subject.name),
                        }}
                      >
                        <List.Item.Meta
                          avatar={
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(255, 255, 255, 0.9)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 'bold',
                              textAlign: 'center',
                              lineHeight: '1.1'
                            }}>
                              {session.timeSlot.startTime}
                            </div>
                          }
                          title={
                            <div style={{ color: 'inherit', fontWeight: '600' }}>
                              <BookOutlined style={{ marginRight: '6px' }} />
                              {subject.name}
                            </div>
                          }
                          description={
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                              <div style={{ color: 'inherit', opacity: 0.9 }}>
                                <ClockCircleOutlined style={{ marginRight: '6px' }} />
                                {session.timeSlot.startTime} - {session.timeSlot.endTime}
                              </div>
                              <div style={{ color: 'inherit', opacity: 0.9 }}>
                                <UserOutlined style={{ marginRight: '6px' }} />
                                {teacher.firstName} {teacher.lastName}
                              </div>
                              <div style={{ color: 'inherit', opacity: 0.9 }}>
                                <HomeOutlined style={{ marginRight: '6px' }} />
                                {classroom.name} ({classroom.code})
                              </div>
                            </Space>
                          }
                        />
                      </List.Item>
                    );
                  }}
                />
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  // Renderizado tablet - grid compacto
  const renderTabletSchedule = () => {
    return (
      <div className="tablet-schedule">
        <Row gutter={[16, 16]}>
          {WEEKDAYS.map(day => {
            const daySessions = sessions.filter(s => s.dayOfWeek === day.key)
              .sort((a, b) => a.timeSlot.order - b.timeSlot.order);
            
            return (
              <Col key={day.key} xs={24} sm={12} md={8} lg={8} xl={8}>
                <Card
                  size="small"
                  title={
                    <div style={{ textAlign: 'center' }}>
                      <Tag color="blue" style={{ margin: 0 }}>
                        {day.label}
                      </Tag>
                    </div>
                  }
                  bodyStyle={{ padding: '8px' }}
                  style={{ height: '100%' }}
                >
                  <div style={{ minHeight: '300px' }}>
                    {daySessions.length === 0 ? (
                      <Empty 
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Sin clases"
                        style={{ margin: '40px 0' }}
                      />
                    ) : (
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {daySessions.map(session => {
                          const subject = session.subjectAssignment.subject;
                          const teacher = session.subjectAssignment.teacher.user.profile;
                          const classroom = session.classroom;
                          
                          return (
                            <Tooltip
                              key={session.id}
                              title={
                                <div>
                                  <div><strong>{subject.name}</strong></div>
                                  <div><UserOutlined /> {teacher.firstName} {teacher.lastName}</div>
                                  <div><HomeOutlined /> {classroom.name} ({classroom.code})</div>
                                  <div><ClockCircleOutlined /> {session.timeSlot.startTime} - {session.timeSlot.endTime}</div>
                                </div>
                              }
                            >
                              <div
                                style={{
                                  ...getSubjectStyles(subject.name),
                                  padding: '8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  lineHeight: '1.3'
                                }}
                              >
                                <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                                  {session.timeSlot.startTime} - {subject.name}
                                </div>
                                <div style={{ opacity: 0.8 }}>
                                  {teacher.firstName} {teacher.lastName.charAt(0)}.
                                </div>
                                <div style={{ opacity: 0.7 }}>
                                  {classroom.code}
                                </div>
                              </div>
                            </Tooltip>
                          );
                        })}
                      </Space>
                    )}
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    );
  };

  if (!sessions.length) {
    return (
      <Card>
        <Empty 
          description="No hay horarios programados para este grupo"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  // Renderizado adaptativo según dispositivo
  const renderScheduleContent = () => {
    if (isMobile) {
      return renderMobileSchedule();
    } else if (isTablet) {
      return renderTabletSchedule();
    } else {
      // Desktop - renderizado original con tabla
      return (
        <Card 
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <Title level={4} style={{ margin: 0 }}>
                Horario de {classGroup.name}
              </Title>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                <Tag color="blue">{classGroup.academicYear.name}</Tag>
                {classGroup.courses.map(course => (
                  <Tag key={course.id} color="green">{course.name}</Tag>
                ))}
              </div>
            </div>
          }
          loading={loading}
          style={{ marginBottom: '24px' }}
          className="no-print"
        >
          <div className="container-scroll-x">
            <table className="schedule-grid-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '8px', minWidth: '800px' }}>
              <thead>
                <tr>
                  <th style={{ 
                    width: '120px', 
                    textAlign: 'center',
                    padding: '8px',
                    backgroundColor: '#fafafa',
                    borderRadius: '6px',
                    fontWeight: '600'
                  }}>
                    Horario
                  </th>
                  {WEEKDAYS.map(day => (
                    <th 
                      key={day.key}
                      style={{ 
                        textAlign: 'center',
                        padding: '8px',
                        backgroundColor: '#fafafa',
                        borderRadius: '6px',
                        fontWeight: '600',
                        minWidth: '150px'
                      }}
                    >
                      <div>{day.label}</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                        {day.short}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(timeSlot => (
                  <tr key={timeSlot.order}>
                    <td style={{ 
                      textAlign: 'center',
                      padding: '8px',
                      backgroundColor: '#f0f2f5',
                      borderRadius: '6px',
                      verticalAlign: 'middle'
                    }}>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {timeSlot.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {timeSlot.startTime} - {timeSlot.endTime}
                      </div>
                    </td>
                    {WEEKDAYS.map(day => (
                      <td 
                        key={`${day.key}-${timeSlot.order}`}
                        style={{ 
                          verticalAlign: 'top',
                          padding: '4px'
                        }}
                      >
                        {renderScheduleCell(day.key, timeSlot.order)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Leyenda de colores - responsive */}
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '6px' }}>
            <Title level={5} style={{ marginBottom: '12px' }}>Leyenda de Asignaturas:</Title>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
              gap: '8px' 
            }}>
              {[
                { name: 'Matemáticas', color: 'matematicas' },
                { name: 'Lengua', color: 'lengua' },
                { name: 'Ciencias Naturales', color: 'ciencias-naturales' },
                { name: 'Ciencias Sociales', color: 'ciencias-sociales' },
                { name: 'Inglés', color: 'ingles' },
                { name: 'Educación Física', color: 'educacion-fisica' },
                { name: 'Educación Artística', color: 'educacion-artistica' },
                { name: 'Música', color: 'musica' },
              ].map(item => (
                <div 
                  key={item.color}
                  style={{
                    ...getSubjectStyles(item.name),
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    borderRadius: '6px'
                  }}
                >
                  {item.name}
                </div>
              ))}
            </div>
          </div>
        </Card>
      );
    }
  };

  return (
    <div className="schedule-grid-responsive">
      {/* Header adaptativo para móvil y tablet */}
      {(isMobile || isTablet) && (
        <Card
          size="small"
          style={{ marginBottom: '16px', textAlign: 'center' }}
          bodyStyle={{ padding: '12px' }}
        >
          <Title level={isMobile ? 5 : 4} style={{ margin: '0 0 8px 0' }}>
            📅 Horario de {classGroup.name}
          </Title>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '4px' }}>
            <Tag color="blue">{classGroup.academicYear.name}</Tag>
            {classGroup.courses.map(course => (
              <Tag key={course.id} color="green">{course.name}</Tag>
            ))}
          </div>
        </Card>
      )}
      
      {/* Contenido principal */}
      {renderScheduleContent()}
      
      {/* Leyenda compacta para móvil */}
      {isMobile && (
        <Card 
          size="small" 
          title="🎨 Leyenda de Asignaturas"
          bodyStyle={{ padding: '12px' }}
        >
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '6px' 
          }}>
            {[
              { name: 'Matemáticas', color: 'matematicas' },
              { name: 'Lengua', color: 'lengua' },
              { name: 'Ciencias Naturales', color: 'ciencias-naturales' },
              { name: 'Ciencias Sociales', color: 'ciencias-sociales' },
              { name: 'Inglés', color: 'ingles' },
              { name: 'Educación Física', color: 'educacion-fisica' },
              { name: 'Educación Artística', color: 'educacion-artistica' },
              { name: 'Música', color: 'musica' },
            ].map(item => (
              <div 
                key={item.color}
                style={{
                  ...getSubjectStyles(item.name),
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  borderRadius: '6px',
                  fontWeight: '500'
                }}
              >
                {item.name}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ScheduleGrid;