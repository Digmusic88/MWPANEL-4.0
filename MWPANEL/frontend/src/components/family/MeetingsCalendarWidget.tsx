import React, { useState, useEffect } from 'react';
import {
  Card,
  Calendar,
  Badge,
  Tooltip,
  Typography,
  Button,
  Space,
  message,
  Tag,
  Alert,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { familyMeetingsService, meetingsService } from '../../services/meetingsService';
import {
  MeetingBooking,
  BookingStatus,
} from '../../types/meetings';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/user';

const { Text } = Typography;

interface MeetingsCalendarWidgetProps {
  compact?: boolean;
  showHeader?: boolean;
  height?: number | string;
  onMeetingClick?: (booking: MeetingBooking) => void;
}

export const MeetingsCalendarWidget: React.FC<MeetingsCalendarWidgetProps> = ({
  compact = false,
  showHeader = true,
  height = 'auto',
  onMeetingClick,
}) => {
  const [myBookings, setMyBookings] = useState<MeetingBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    loadMyBookings();
  }, []);

  const loadMyBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📅 Loading meetings for calendar widget...');
      const response = await familyMeetingsService.getMyBookings();
      console.log('📊 Calendar widget bookings response:', response);
      
      if (response?.bookings) {
        setMyBookings(response.bookings);
        console.log('✅ Calendar bookings loaded:', response.bookings.length);
      } else {
        console.log('📝 No bookings in calendar response');
        setMyBookings([]);
      }
    } catch (error: any) {
      console.error('❌ Error loading meetings for calendar:', error);
      
      // Solo mostrar error si es un problema grave (no permisos o conexión)
      if (error.response?.status === 500 || !error.response) {
        setError('Error al cargar las reuniones');
      } else {
        console.log('📝 Non-critical error, using empty bookings');
        setMyBookings([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Renderizar eventos en el calendario
  const renderCalendarCell = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const dayBookings = myBookings.filter(booking => 
      booking.slot.startDatetime.startsWith(dateStr)
    );

    if (dayBookings.length === 0) {
      return null;
    }

    return (
      <div style={{ padding: '2px' }}>
        {dayBookings.map(booking => {
          const statusConfig = {
            [BookingStatus.CONFIRMED]: { color: 'success', text: 'Confirmada' },
            [BookingStatus.CANCELLED]: { color: 'default', text: 'Cancelada' },
            [BookingStatus.PENDING]: { color: 'processing', text: 'Pendiente' },
          };

          const status = statusConfig[booking.status];
          const teacherName = booking.slot.teacher.user.profile
            ? `${booking.slot.teacher.user.profile.firstName} ${booking.slot.teacher.user.profile.lastName}`
            : 'Profesor'; // RGPD: no mostrar email del profesor

          return (
            <Tooltip
              key={booking.id}
              title={
                <div>
                  <div><strong>Reunión con {teacherName}</strong></div>
                  <div>Hora: {meetingsService.formatTime(booking.slot.startDatetime)}</div>
                  <div>Estado: {status.text}</div>
                  {booking.student && (
                    <div>
                      Estudiante: {
                        booking.student.user.profile
                          ? `${booking.student.user.profile.firstName} ${booking.student.user.profile.lastName}`
                          : booking.student.user.email
                      }
                    </div>
                  )}
                  {booking.notes && <div>Notas: {booking.notes}</div>}
                </div>
              }
            >
              <Badge
                status={status.color as any}
                text={
                  compact 
                    ? meetingsService.formatTime(booking.slot.startDatetime)
                    : `${meetingsService.formatTime(booking.slot.startDatetime)} - ${teacherName}`
                }
                style={{ 
                  fontSize: compact ? '10px' : '12px',
                  display: 'block',
                  cursor: onMeetingClick ? 'pointer' : 'default',
                  marginBottom: '2px',
                }}
                onClick={() => {
                  if (onMeetingClick) {
                    onMeetingClick(booking);
                  }
                }}
              />
            </Tooltip>
          );
        })}
      </div>
    );
  };

  const getUpcomingMeetings = () => {
    const now = dayjs();
    return myBookings.filter(booking => 
      dayjs(booking.slot.startDatetime).isAfter(now) &&
      booking.status === BookingStatus.CONFIRMED
    ).slice(0, 3);
  };

  const getRecentMeetings = () => {
    const now = dayjs();
    return myBookings.filter(booking => 
      dayjs(booking.slot.startDatetime).isBefore(now)
    ).slice(0, 3);
  };

  if (error) {
    return (
      <Card title={showHeader ? "Calendario de Reuniones" : undefined}>
        <Alert
          message="Error al cargar reuniones"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadMyBookings}>
              Reintentar
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title={showHeader ? (
        <Space>
          <CalendarOutlined />
          Calendario de Reuniones
          {myBookings.length > 0 && (
            <Tag color="blue">{myBookings.length} reunión(es)</Tag>
          )}
        </Space>
      ) : undefined}
      loading={loading}
      style={{ height }}
    >
      {myBookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <CalendarOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
          <div style={{ marginTop: '12px' }}>
            <Text type="secondary">No tienes reuniones programadas</Text>
          </div>
        </div>
      ) : (
        <div>
          {compact ? (
            // Vista compacta - solo próximas reuniones
            <div>
              <Text strong style={{ fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                Próximas Reuniones
              </Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                {getUpcomingMeetings().map(booking => {
                  const teacherName = booking.slot.teacher.user.profile
                    ? `${booking.slot.teacher.user.profile.firstName} ${booking.slot.teacher.user.profile.lastName}`
                    : 'Profesor'; // RGPD: no mostrar email del profesor

                  return (
                    <div
                      key={booking.id}
                      style={{
                        padding: '8px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        backgroundColor: '#fafafa',
                        cursor: onMeetingClick ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (onMeetingClick) {
                          onMeetingClick(booking);
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <Text strong>{teacherName}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {meetingsService.formatDateTime(booking.slot.startDatetime)}
                          </Text>
                        </div>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      </div>
                    </div>
                  );
                })}
                {getUpcomingMeetings().length === 0 && (
                  <Text type="secondary">No hay reuniones próximas</Text>
                )}
              </Space>
            </div>
          ) : (
            // Vista completa con calendario
            <Calendar
              cellRender={renderCalendarCell}
              mode="month"
              fullscreen={false}
            />
          )}
        </div>
      )}
    </Card>
  );
};

export default MeetingsCalendarWidget;