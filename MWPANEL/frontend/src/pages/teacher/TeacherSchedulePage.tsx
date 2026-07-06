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
} from 'antd';
import {
  ClockCircleOutlined,
  HomeOutlined,
  BookOutlined,
  TeamOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import apiClient from '@services/apiClient';
import { academiaService, AcademiaSlot } from '@services/academiaService';
import AcademiaScheduleCalendar from '../../components/teacher/academia/AcademiaScheduleCalendar';
import { useResponsive } from '../../hooks/useResponsive';

dayjs.locale('es');

const { Title, Text } = Typography;

interface ScheduleSession {
  id: string;
  dayOfWeek: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  notes?: string;
  subjectAssignment: {
    id: string;
    weeklyHours: number;
    subject: {
      id: string;
      name: string;
      code: string;
    };
    classGroup: {
      id: string;
      name: string;
      section: string;
    };
  };
  classroom: {
    id: string;
    name: string;
    code: string;
    capacity: number;
    type: string;
    building?: string;
    floor?: number;
  };
  timeSlot: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    order: number;
    isBreak: boolean;
  };
  academicYear: {
    id: string;
    name: string;
    isCurrent: boolean;
  };
}

interface Teacher {
  id: string;
  employeeNumber: string;
  specialties: string[];
  user: {
    id: string;
    email: string;
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

const TeacherSchedulePage: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const [schedule, setSchedule] = useState<ScheduleSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [academiaSlots, setAcademiaSlots] = useState<AcademiaSlot[]>([]);

  // Días de la semana en español
  const daysOfWeek = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
  };

  // Fetch teacher data and schedule
  const fetchTeacherSchedule = async () => {
    try {
      setLoading(true);

      // Get current user info
      const userResponse = await apiClient.get('/auth/me');
      const currentUser = userResponse.data;

      if (currentUser.role !== 'teacher') {
        message.error('Acceso denegado: Solo profesores pueden acceder a este horario');
        return;
      }

      // Find teacher record
      const teachersResponse = await apiClient.get('/teachers');
      const teachers = teachersResponse.data;
      const currentTeacher = teachers.find(
        (t: Teacher) => t.user.id === currentUser.id
      );

      if (!currentTeacher) {
        message.error('No se encontró el registro de profesor para este usuario');
        return;
      }

      setTeacher(currentTeacher);

      // Get teacher's schedule
      const scheduleResponse = await apiClient.get(`/schedules/sessions/by-teacher/${currentTeacher.id}`);
      setSchedule(scheduleResponse.data);

    } catch (error) {
      console.error('Error fetching teacher schedule:', error);
      message.error('Error al cargar el horario del profesor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherSchedule();
    // Franjas de tarde (academia), fail-soft: si no tiene academia o Secretaría no responde → sin bloque de tarde
    academiaService.schedule().then(setAcademiaSlots).catch(() => setAcademiaSlots([]));
  }, []);

  // Group schedule by day of week
  const scheduleByDay = schedule.reduce((acc, session) => {
    const day = session.dayOfWeek;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(session);
    return acc;
  }, {} as Record<number, ScheduleSession[]>);

  // Sort sessions by time slot order
  Object.keys(scheduleByDay).forEach(day => {
    scheduleByDay[Number(day)].sort((a, b) => a.timeSlot.order - b.timeSlot.order);
  });

  // Table columns for mobile - compact view
  const mobileColumns: ColumnsType<ScheduleSession> = [
    {
      title: 'Sesión',
      key: 'mobile',
      render: (_, session) => (
        <div className="py-1">
          {/* Header: Día y hora */}
          <div className="flex items-center justify-between mb-1">
            <Tag color="blue" className="text-xs m-0">
              {daysOfWeek[session.dayOfWeek as keyof typeof daysOfWeek]}
            </Tag>
            <span className="text-xs text-gray-500">
              {session.timeSlot.startTime.slice(0, 5)} - {session.timeSlot.endTime.slice(0, 5)}
            </span>
          </div>
          {/* Asignatura */}
          <div className="font-medium text-sm text-blue-700 mb-1">
            {session.subjectAssignment.subject.name}
          </div>
          {/* Grupo y Aula */}
          <div className="flex flex-wrap gap-2 text-xs text-gray-600">
            <span><TeamOutlined className="mr-1" />{session.subjectAssignment.classGroup.name}</span>
            <span><HomeOutlined className="mr-1" />{session.classroom.name}</span>
          </div>
        </div>
      ),
    },
  ];

  // Table columns for detailed view - desktop
  const desktopColumns: ColumnsType<ScheduleSession> = [
    {
      title: 'Día',
      dataIndex: 'dayOfWeek',
      key: 'dayOfWeek',
      render: (day: number) => (
        <Tag color="blue">{daysOfWeek[day as keyof typeof daysOfWeek]}</Tag>
      ),
      sorter: (a, b) => a.dayOfWeek - b.dayOfWeek,
    },
    {
      title: 'Hora',
      dataIndex: 'timeSlot',
      key: 'timeSlot',
      render: (timeSlot) => (
        <div>
          <div className="font-medium">{timeSlot.name}</div>
          <div className="text-sm text-gray-500">
            {timeSlot.startTime.slice(0, 5)} - {timeSlot.endTime.slice(0, 5)}
          </div>
        </div>
      ),
      sorter: (a, b) => a.timeSlot.order - b.timeSlot.order,
    },
    {
      title: 'Asignatura',
      dataIndex: ['subjectAssignment', 'subject'],
      key: 'subject',
      render: (subject) => (
        <div>
          <div className="font-medium">{subject.name}</div>
          <div className="text-sm text-gray-500">{subject.code}</div>
        </div>
      ),
    },
    {
      title: 'Grupo',
      dataIndex: ['subjectAssignment', 'classGroup'],
      key: 'classGroup',
      render: (classGroup) => (
        <Tag color="green">{classGroup.name}</Tag>
      ),
    },
    {
      title: 'Aula',
      dataIndex: 'classroom',
      key: 'classroom',
      render: (classroom) => (
        <div>
          <div className="font-medium flex items-center gap-1">
            <HomeOutlined className="text-blue-500" />
            {classroom.name}
          </div>
          <div className="text-sm text-gray-500">
            {classroom.building && `${classroom.building}, `}
            {classroom.floor !== null && `Planta ${classroom.floor}, `}
            Capacidad: {classroom.capacity}
          </div>
        </div>
      ),
    },
    {
      title: 'Notas',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes) => notes || '-',
    },
  ];

  const columns = isMobile ? mobileColumns : desktopColumns;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className={`text-center ${isMobile ? 'p-4' : 'p-8'}`}>
        <Empty description="No se pudo cargar la información del profesor" />
      </div>
    );
  }

  // Calcular horas totales
  const totalHours = schedule.reduce((total, session) => {
    const startTime = dayjs(`2000-01-01 ${session.timeSlot.startTime}`, 'YYYY-MM-DD HH:mm:ss');
    const endTime = dayjs(`2000-01-01 ${session.timeSlot.endTime}`, 'YYYY-MM-DD HH:mm:ss');
    return total + endTime.diff(startTime, 'hour', true);
  }, 0).toFixed(1);

  return (
    <div className={isMobile ? 'space-y-3 px-2 py-3' : 'space-y-6'}>
      {/* Header */}
      <div>
        <Title level={isMobile ? 4 : 2} className="!mb-1">
          <CalendarOutlined className="mr-2" />
          {isMobile ? 'Mi Horario' : 'Mi Horario de Clases'}
        </Title>
        <Text type="secondary" style={{ fontSize: isMobile ? '12px' : '14px' }}>
          {isMobile
            ? schedule[0]?.academicYear?.name || '2024-2025'
            : `Horario académico del curso ${schedule[0]?.academicYear?.name || '2024-2025'}`
          }
        </Text>
      </div>

      {/* Teacher Info */}
      <Card size={isMobile ? 'small' : 'default'} bodyStyle={{ padding: isMobile ? '12px' : '24px' }}>
        {isMobile ? (
          /* Vista móvil: Información compacta */
          <div>
            <div className="flex items-center justify-between mb-2">
              <Text strong style={{ fontSize: '14px' }}>
                {teacher.user.profile.firstName} {teacher.user.profile.lastName}
              </Text>
              <Tag color="blue" className="text-xs">{teacher.employeeNumber}</Tag>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {teacher.specialties.map((specialty, index) => (
                <Tag key={index} color="purple" className="text-xs">{specialty}</Tag>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{schedule.length} sesiones</span>
              <span>{totalHours} h/semana</span>
            </div>
          </div>
        ) : (
          /* Vista desktop: Descripción completa */
          <Descriptions title="Información del Profesor" bordered column={isTablet ? 1 : 2}>
            <Descriptions.Item label="Nombre">
              {teacher.user.profile.firstName} {teacher.user.profile.lastName}
            </Descriptions.Item>
            <Descriptions.Item label="Número de Empleado">
              {teacher.employeeNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Especialidades" span={isTablet ? 1 : 2}>
              <div className="flex gap-1 flex-wrap">
                {teacher.specialties.map((specialty, index) => (
                  <Tag key={index} color="purple">{specialty}</Tag>
                ))}
              </div>
            </Descriptions.Item>
            <Descriptions.Item label="Total de Clases">
              {schedule.length} sesiones semanales
            </Descriptions.Item>
            <Descriptions.Item label="Horas Lectivas">
              {totalHours} horas/semana
            </Descriptions.Item>
          </Descriptions>
        )}
      </Card>

      {/* Weekly Schedule Grid */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <CalendarOutlined />
            <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
              {isMobile ? 'Semanal' : 'Horario Semanal'}
            </span>
          </div>
        }
        size={isMobile ? 'small' : 'default'}
        bodyStyle={{ padding: isMobile ? '8px' : '24px' }}
      >
        {schedule.length === 0 ? (
          <Empty description={isMobile ? 'Sin clases' : 'No tienes clases asignadas aún'} />
        ) : isMobile ? (
          /* Vista móvil: Lista por días con scroll horizontal */
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
              {[1, 2, 3, 4, 5].map(day => (
                <div
                  key={day}
                  className="flex-shrink-0"
                  style={{ width: '140px' }}
                >
                  <div className="text-center mb-2">
                    <Tag color="blue" className="text-xs">
                      {daysOfWeek[day as keyof typeof daysOfWeek].slice(0, 3)}
                    </Tag>
                  </div>
                  {scheduleByDay[day] ? (
                    <div className="space-y-1">
                      {scheduleByDay[day].map(session => (
                        <div
                          key={session.id}
                          className="p-2 border border-gray-200 rounded bg-gray-50"
                        >
                          <div className="text-xs text-gray-500 mb-1">
                            {session.timeSlot.startTime.slice(0, 5)}
                          </div>
                          <div className="font-medium text-xs text-blue-700 truncate">
                            {session.subjectAssignment.subject.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {session.subjectAssignment.classGroup.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 text-gray-400 text-xs">
                      -
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Vista desktop: Grid completo */
          <Row gutter={[16, 16]}>
            {[1, 2, 3, 4, 5].map(day => (
              <Col key={day} xs={24} sm={12} md={8} lg={4.8} xl={4.8}>
                <Card
                  size="small"
                  title={
                    <div className="text-center">
                      <Text strong>{daysOfWeek[day as keyof typeof daysOfWeek]}</Text>
                    </div>
                  }
                  className="h-full"
                >
                  {scheduleByDay[day] ? (
                    <div className="space-y-2">
                      {scheduleByDay[day].map(session => (
                        <div
                          key={session.id}
                          className="p-2 border border-gray-200 rounded-md bg-gray-50 hover:bg-blue-50 transition-colors"
                        >
                          <div className="text-xs text-gray-500 mb-1">
                            <ClockCircleOutlined className="mr-1" />
                            {session.timeSlot.startTime.slice(0, 5)} - {session.timeSlot.endTime.slice(0, 5)}
                          </div>
                          <div className="font-medium text-sm text-blue-700">
                            {session.subjectAssignment.subject.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            <TeamOutlined className="mr-1" />
                            {session.subjectAssignment.classGroup.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            <HomeOutlined className="mr-1" />
                            {session.classroom.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-400">
                      <Text type="secondary">Sin clases</Text>
                    </div>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Horario de Tarde (Academia) — vista calendario (diseño de Secretaría). Solo si tiene franjas. */}
      {academiaSlots.length > 0 && (
        <Card
          title={
            <div className="flex items-center gap-2">
              <ClockCircleOutlined style={{ color: '#B45309' }} />
              <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
                {isMobile ? 'Tarde (Academia)' : 'Horario de Tarde (Academia)'}
              </span>
            </div>
          }
          size={isMobile ? 'small' : 'default'}
          bodyStyle={{ padding: isMobile ? '8px' : '16px' }}
        >
          <AcademiaScheduleCalendar slots={academiaSlots} />
        </Card>
      )}

      {/* Detailed Schedule Table */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <BookOutlined />
            <span style={{ fontSize: isMobile ? '14px' : '16px' }}>
              {isMobile ? 'Detalle' : 'Horario Detallado'}
            </span>
          </div>
        }
        size={isMobile ? 'small' : 'default'}
        bodyStyle={{ padding: isMobile ? '8px' : '24px' }}
      >
        <Table
          columns={columns}
          dataSource={schedule}
          rowKey="id"
          size={isMobile ? 'small' : 'middle'}
          scroll={isMobile ? undefined : { x: 800 }}
          pagination={{
            pageSize: isMobile ? 5 : 10,
            showSizeChanger: !isMobile,
            showQuickJumper: !isMobile,
            showTotal: isMobile ? undefined : (total, range) =>
              `${range[0]}-${range[1]} de ${total} sesiones`,
            simple: isMobile,
          }}
          className="w-full"
        />
      </Card>
    </div>
  );
};

export default TeacherSchedulePage;