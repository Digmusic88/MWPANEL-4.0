/**
 * @archivo: StaffMeetingCard.tsx
 * @modulo: Staff (Claustro)
 * @funcion: Card de reunion del claustro
 */

import React from 'react';
import { Card, Avatar, Tag, Tooltip, Space, Typography, Badge } from 'antd';
import {
  CalendarOutlined,
  UserOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { StaffMeeting } from '@/types/staff';
import type { MeetingLiveState } from '@/utils/staffMeetingUtils';
import dayjs from 'dayjs';
import { getMeetingLiveState, getLiveStatePresentation, getMeetingCountdownText } from '@/utils/staffMeetingUtils';
import { useNow } from '@/hooks/useNow';

const { Text, Paragraph } = Typography;

interface StaffMeetingCardProps {
  meeting: StaffMeeting;
  onClick?: () => void;
}

const liveStateIcon: Record<MeetingLiveState, React.ReactNode> = {
  scheduled: <ClockCircleOutlined />,
  in_progress: <SyncOutlined spin />,
  pending_close: <WarningOutlined />,
  completed: <CheckCircleOutlined />,
  cancelled: <CloseCircleOutlined />,
};

export const StaffMeetingCard: React.FC<StaffMeetingCardProps> = ({
  meeting,
  onClick,
}) => {
  const now = useNow();
  const liveState = getMeetingLiveState(meeting, now);
  const presentation = getLiveStatePresentation(liveState);
  const countdownText = getMeetingCountdownText(meeting, now);
  const isToday = dayjs(meeting.scheduledDate).isSame(dayjs(), 'day');

  const getUserName = (user: { profile?: { firstName?: string; lastName?: string }; email: string }) => {
    if (user.profile?.firstName || user.profile?.lastName) {
      return `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  const completedAgendaItems = meeting.agendaItems?.filter(item => item.isCompleted).length || 0;
  const totalAgendaItems = meeting.agendaItems?.length || 0;

  return (
    <Card
      hoverable
      onClick={onClick}
      className="staff-meeting-card"
      style={{
        borderLeft: `4px solid ${presentation.accentColor}`,
      }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Header: Title and Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text strong style={{ fontSize: '16px', flex: 1 }}>
            {meeting.title}
          </Text>
          <Tag color={presentation.tagColor} icon={liveStateIcon[liveState]}>
            {presentation.label}
          </Tag>
        </div>

        {/* Description */}
        {meeting.description && (
          <Paragraph
            type="secondary"
            ellipsis={{ rows: 2 }}
            style={{ marginBottom: 0, fontSize: '13px' }}
          >
            {meeting.description}
          </Paragraph>
        )}

        {/* Date and Time */}
        <Space size="small">
          <CalendarOutlined style={{ color: isToday ? '#1890ff' : undefined }} />
          <Text
            style={{
              color: isToday ? '#1890ff' : undefined,
              fontWeight: isToday ? 'bold' : 'normal',
            }}
          >
            {dayjs(meeting.scheduledDate).format('DD/MM/YYYY HH:mm')}
          </Text>
          {isToday && <Tag color="blue">Hoy</Tag>}
        </Space>
        {/* Cuenta atrás contextual en vivo */}
        <Text type="secondary" style={{ fontSize: 12, color: presentation.accentColor }}>
          {liveState === 'in_progress' && <SyncOutlined spin style={{ marginRight: 4 }} />}
          {countdownText}
        </Text>

        {/* Location */}
        {meeting.location && (
          <Space size="small">
            <EnvironmentOutlined />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {meeting.location}
            </Text>
          </Space>
        )}

        {/* Agenda Progress */}
        {totalAgendaItems > 0 && (
          <div style={{ marginTop: 4 }}>
            <Space size="small">
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Agenda: {completedAgendaItems}/{totalAgendaItems} puntos
              </Text>
              {completedAgendaItems === totalAgendaItems && totalAgendaItems > 0 && (
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '12px' }} />
              )}
            </Space>
          </div>
        )}

        {/* Footer: Attendees and Creator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
          }}
        >
          {/* Attendees */}
          <Space size="small">
            {meeting.attendees && meeting.attendees.length > 0 ? (
              <Tooltip
                title={meeting.attendees.map(a => getUserName(a)).join(', ')}
              >
                <Avatar.Group
                  maxCount={3}
                  size="small"
                  maxStyle={{ backgroundColor: '#1890ff' }}
                >
                  {meeting.attendees.map(attendee => (
                    <Tooltip key={attendee.id} title={getUserName(attendee)}>
                      <Avatar
                        size="small"
                        icon={<UserOutlined />}
                        src={attendee.profile?.avatarUrl}
                      />
                    </Tooltip>
                  ))}
                </Avatar.Group>
              </Tooltip>
            ) : (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <TeamOutlined /> Sin asistentes
              </Text>
            )}
          </Space>

          {/* Creator */}
          {meeting.createdBy && (
            <Tooltip title={`Creado por: ${getUserName(meeting.createdBy)}`}>
              <Badge dot color="blue" offset={[-2, 2]}>
                <Avatar
                  size="small"
                  icon={<UserOutlined />}
                  src={meeting.createdBy.profile?.avatarUrl}
                  style={{ backgroundColor: '#1890ff' }}
                />
              </Badge>
            </Tooltip>
          )}
        </div>

        {/* Tasks associated */}
        {meeting.tasks && meeting.tasks.length > 0 && (
          <Text type="secondary" style={{ fontSize: '11px' }}>
            {meeting.tasks.length} tarea{meeting.tasks.length !== 1 ? 's' : ''} asociada{meeting.tasks.length !== 1 ? 's' : ''}
          </Text>
        )}
      </Space>
    </Card>
  );
};

export default StaffMeetingCard;
