import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Typography,
  Row,
  Col,
  Tag,
  Empty,
  Spin,
  message,
  Descriptions,
  Avatar,
} from 'antd';
import {
  ClockCircleOutlined,
  BookOutlined,
  TeamOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import apiClient from '@services/apiClient';
import { getSubjectColor } from '@utils/subjectColors';

dayjs.locale('es');

const { Title, Text } = Typography;

interface ScheduleSession {
  id: string;
  dayOfWeek: number;
  classroom: {
    id: string;
    name: string;
    code: string;
  };
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
      code: string;
    };
    teacher: {
      user: {
        profile: {
          firstName: string;
          lastName: string;
        };
      };
    };
    classGroup: {
      id: string;
      name: string;
      section: string;
    };
  };
}

interface WeeklySchedule {
  [key: number]: ScheduleSession[];
}

const StudentSchedulePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleSession[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});

  const daysOfWeek = [
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  ];

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  useEffect(() => {
    fetchStudentSchedule();
  }, []);

  const fetchStudentSchedule = async () => {
    try {
      setLoading(true);
      
      // First get current user info to find the student's class groups
      const userResponse = await apiClient.get('/auth/me');
      const studentId = userResponse.data.studentId;
      
      if (!studentId) {
        throw new Error('No se encontró información del estudiante');
      }
      
      // Get student details to find class groups
      const studentResponse = await apiClient.get(`/students/${studentId}`);
      const classGroups = studentResponse.data.classGroups || [];
      
      if (classGroups.length === 0) {
        setSchedule([]);
        return;
      }
      
      // Get schedule for the first class group (students usually belong to one main group)
      const classGroupId = classGroups[0].id;
      const response = await apiClient.get(`/schedules/sessions/by-class-group/${classGroupId}`);
      const scheduleData = response.data || [];
      setSchedule(scheduleData);
      
      // Organize schedule by day of week
      const organized: WeeklySchedule = {};
      scheduleData.forEach((session: ScheduleSession) => {
        const day = session.dayOfWeek;
        if (!organized[day]) {
          organized[day] = [];
        }
        organized[day].push(session);
      });
      
      // Sort sessions by start time for each day
      Object.keys(organized).forEach(day => {
        organized[parseInt(day)].sort((a, b) => 
          a.timeSlot.startTime.localeCompare(b.timeSlot.startTime)
        );
      });
      
      setWeeklySchedule(organized);
    } catch (error: any) {
      console.error('Error fetching student schedule:', error);
      message.error('Error al cargar el horario');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    return dayjs(time, 'HH:mm:ss').format('HH:mm');
  };

  const getSessionForTimeSlot = (day: number, timeSlot: string) => {
    const daySessions = weeklySchedule[day] || [];
    return daySessions.find(session => {
      if (!session?.timeSlot?.startTime || !session?.timeSlot?.endTime) {
        return false;
      }
      
      const sessionStart = dayjs(session.timeSlot.startTime, 'HH:mm:ss');
      const sessionEnd = dayjs(session.timeSlot.endTime, 'HH:mm:ss');
      const slotTime = dayjs(timeSlot, 'HH:mm');
      
      // Use valueOf() to compare timestamps instead of plugins
      return slotTime.valueOf() >= sessionStart.valueOf() && slotTime.valueOf() < sessionEnd.valueOf();
    });
  };

  const tableColumns: ColumnsType<any> = [
    {
      title: 'Hora',
      dataIndex: 'time',
      key: 'time',
      width: 100,
      render: (time: string) => (
        <Text strong>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          {time}
        </Text>
      ),
    },
    ...daysOfWeek.slice(0, 5).map((day, index) => ({
      title: day,
      dataIndex: `day${index}`,
      key: `day${index}`,
      render: (session: ScheduleSession) => {
        if (!session) {
          return <div style={{ height: 60, backgroundColor: '#f5f5f5', borderRadius: 4 }} />;
        }
        
        // Defensive programming - check all nested properties
        const subjectName = session?.subjectAssignment?.subject?.name || 'Sin asignatura';
        const subjectColors = getSubjectColor(subjectName);
        const teacherFirstName = session?.subjectAssignment?.teacher?.user?.profile?.firstName || '';
        const teacherLastName = session?.subjectAssignment?.teacher?.user?.profile?.lastName || '';
        const classroomName = session?.classroom?.name || '';
        const startTime = session?.timeSlot?.startTime || '';
        const endTime = session?.timeSlot?.endTime || '';
        
        return (
          <Card 
            size="small" 
            style={{ 
              backgroundColor: subjectColors.background,
              border: `2px solid ${subjectColors.border}`,
              margin: 0,
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
            bodyStyle={{ padding: 8 }}
          >
            <div>
              <Text strong style={{ color: subjectColors.text, fontSize: 12 }}>
                {subjectName}
              </Text>
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {teacherFirstName} {teacherLastName}
              </Text>
            </div>
            {classroomName && (
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  <EnvironmentOutlined /> {classroomName}
                </Text>
              </div>
            )}
            <div>
              <Text type="secondary" style={{ fontSize: 10 }}>
                {startTime && endTime ? `${formatTime(startTime)} - ${formatTime(endTime)}` : 'Sin horario'}
              </Text>
            </div>
          </Card>
        );
      },
    })),
  ];

  const tableData = timeSlots.map(timeSlot => {
    const row: any = { time: timeSlot, key: timeSlot };
    
    for (let day = 0; day < 5; day++) { // Monday to Friday
      row[`day${day}`] = getSessionForTimeSlot(day, timeSlot);
    }
    
    return row;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large">
          <div style={{ paddingTop: 20 }}>Cargando horario...</div>
        </Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <CalendarOutlined style={{ marginRight: 12 }} />
          Mi Horario
        </Title>
        <Text type="secondary">
          Consulta tu horario semanal de clases
        </Text>
      </div>

      {schedule.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No tienes horario asignado"
          />
        </Card>
      ) : (
        <>
          {/* Schedule Grid */}
          <Card title="Horario Semanal" style={{ marginBottom: 24 }}>
            <Table
              columns={tableColumns}
              dataSource={tableData}
              pagination={false}
              size="middle"
              bordered
              scroll={{ x: 800 }}
            />
          </Card>

          {/* Summary Information */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="Resumen del Horario">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Total de clases semanales">
                    {schedule.length}
                  </Descriptions.Item>
                  <Descriptions.Item label="Asignaturas">
                    {new Set(schedule.map(s => s?.subjectAssignment?.subject?.id).filter(Boolean)).size}
                  </Descriptions.Item>
                  <Descriptions.Item label="Grupo">
                    {schedule[0]?.subjectAssignment?.classGroup?.name || ''} {schedule[0]?.subjectAssignment?.classGroup?.section || ''}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            
            <Col xs={24} lg={12}>
              <Card title="Asignaturas">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Array.from(new Set(schedule.map(s => s?.subjectAssignment?.subject?.id).filter(Boolean)))
                    .map(subjectId => {
                      const subject = schedule.find(s => s?.subjectAssignment?.subject?.id === subjectId)?.subjectAssignment?.subject;
                      const subjectColors = getSubjectColor(subject?.name || '');
                      const sessionCount = schedule.filter(s => s?.subjectAssignment?.subject?.id === subjectId).length;
                      
                      if (!subject) return null;
                      
                      return (
                        <div key={subjectId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar 
                            size="small" 
                            style={{ 
                              backgroundColor: subjectColors.border,
                              color: 'white',
                              fontWeight: 'bold'
                            }}
                          >
                            {subject?.code?.slice(0, 2) || 'AS'}
                          </Avatar>
                          <Text>{subject?.name || 'Sin nombre'}</Text>
                          <Tag style={{ 
                            backgroundColor: subjectColors.background,
                            borderColor: subjectColors.border,
                            color: subjectColors.text 
                          }}>
                            {sessionCount} clases/semana
                          </Tag>
                        </div>
                      );
                    }).filter(Boolean)
                  }
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default StudentSchedulePage;