import React from 'react';
import { Typography, Progress } from 'antd';
import { ClockCircleOutlined, CheckCircleTwoTone } from '@ant-design/icons';
import type { StaffMeeting } from '@/types/staff';
import { getCurrentAgendaIndex, getMeetingLiveState } from '@/utils/staffMeetingUtils';

const { Text } = Typography;

interface AgendaTimelineProps {
  meeting: StaffMeeting;
  now?: Date;
}

/**
 * Mini-timeline del orden del día con la duración de cada punto.
 * Durante "En curso", resalta el punto que debería estar tratándose según la hora.
 * Solo presentación: no modifica isCompleted (marcado manual del acta).
 */
export const AgendaTimeline: React.FC<AgendaTimelineProps> = ({ meeting, now = new Date() }) => {
  const items = [...(meeting.agendaItems || [])].sort((a, b) => a.orderIndex - b.orderIndex);
  if (items.length === 0) return null;

  const liveState = getMeetingLiveState(meeting, now);
  const totalMinutes = items.reduce((acc, it) => acc + (Number(it.durationMinutes) > 0 ? Number(it.durationMinutes) : 0), 0);
  const currentIndex = liveState === 'in_progress'
    ? getCurrentAgendaIndex(items, meeting.scheduledDate, now)
    : -1;

  // Progreso estimado por hora (solo informativo) durante la reunión.
  const elapsedMin = (now.getTime() - new Date(meeting.scheduledDate).getTime()) / 60000;
  const estimatedPercent = totalMinutes > 0 && liveState === 'in_progress'
    ? Math.min(100, Math.max(0, Math.round((elapsedMin / totalMinutes) * 100)))
    : 0;

  return (
    <div style={{ marginTop: 8 }}>
      {items.map((item, index) => {
        const isCurrent = index === currentIndex;
        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '6px 8px',
              borderRadius: 6,
              marginBottom: 4,
              background: isCurrent ? '#f6ffed' : undefined,
              border: isCurrent ? '1px solid #b7eb8f' : '1px solid transparent',
            }}
          >
            <div style={{ minWidth: 18, textAlign: 'center', color: '#8c8c8c' }}>
              {item.isCompleted ? <CheckCircleTwoTone twoToneColor="#52c41a" /> : index + 1}
            </div>
            <div style={{ flex: 1 }}>
              <Text strong={isCurrent}>{item.title || 'Punto'}</Text>
              {item.durationMinutes ? (
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  <ClockCircleOutlined /> {item.durationMinutes} min
                </Text>
              ) : null}
              {isCurrent && (
                <Text style={{ marginLeft: 8, fontSize: 12, color: '#52c41a' }}>· ahora</Text>
              )}
            </div>
          </div>
        );
      })}
      {liveState === 'in_progress' && totalMinutes > 0 && (
        <Progress percent={estimatedPercent} size="small" status="active" style={{ marginTop: 4 }} />
      )}
    </div>
  );
};
