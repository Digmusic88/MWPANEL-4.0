/**
 * Vista Semanal de la Bitácora Docente
 * Muestra entradas por día de la semana con colores de etiquetas y títulos
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Typography,
  Space,
  Badge,
  Tooltip,
  Empty,
  Spin,
  Row,
  Col,
} from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { LogbookEntry } from '../../types/logbook.types';

const { Title, Text } = Typography;

interface WeeklyViewProps {
  entries: { [key: string]: LogbookEntry[] };
  loading?: boolean;
  onDateChange: (year: number, month: number) => void;
  onCreateEntry: (date?: string) => void;
  onEditEntry: (entry: LogbookEntry) => void;
}

const WeeklyView: React.FC<WeeklyViewProps> = ({
  entries,
  loading,
  onDateChange,
  onCreateEntry,
  onEditEntry,
}) => {
  const [currentWeek, setCurrentWeek] = useState<Dayjs>(dayjs().startOf('week'));

  // Obtener los 7 días de la semana actual
  const getWeekDays = (weekStart: Dayjs) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.add(i, 'day'));
    }
    return days;
  };

  // Navegar semana
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = currentWeek.add(direction === 'next' ? 1 : -1, 'week');
    setCurrentWeek(newWeek);
    // Notificar cambio de mes si es necesario
    onDateChange(newWeek.year(), newWeek.month() + 1);
  };

  const weekDays = getWeekDays(currentWeek);
  const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const formatDate = (date: Dayjs) => date.format('YYYY-MM-DD');

  const renderDayEntries = (day: Dayjs) => {
    const dateKey = formatDate(day);
    const dayEntries = entries[dateKey] || [];
    const isToday = day.isSame(dayjs(), 'day');
    const isCurrentMonth = day.isSame(currentWeek, 'month');

    return (
      <Card
        key={dateKey}
        className={`h-full min-h-[160px] sm:min-h-[200px] ${
          isToday ? 'ring-2 ring-blue-400 bg-blue-50' : ''
        } ${!isCurrentMonth ? 'opacity-60' : ''}`}
        bodyStyle={{ padding: '8px sm:12px', height: '100%', display: 'flex', flexDirection: 'column' }}
        hoverable
      >
        {/* Header del día */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-center">
            <div className="text-xs text-gray-500 font-medium">
              {weekdayNames[day.day()]}
            </div>
            <div className={`text-lg font-bold ${
              isToday ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {day.date()}
            </div>
          </div>
          <Badge count={dayEntries.length} size="small" />
        </div>

        {/* Entradas del día */}
        <div className="flex-1 space-y-2 overflow-y-auto">
          {dayEntries.length > 0 ? (
            dayEntries.map((entry, index) => (
              <Tooltip
                key={entry.id}
                title={
                  <div>
                    <div className="font-medium">{entry.title}</div>
                    {entry.startedAtLocal && entry.endedAtLocal && (
                      <div className="text-xs">
                        {entry.startedAtLocal.slice(0, 5)} - {entry.endedAtLocal.slice(0, 5)}
                      </div>
                    )}
                    <div className="text-xs mt-1 opacity-75">
                      Click para editar
                    </div>
                  </div>
                }
                placement="right"
              >
                <div
                  className="p-2 rounded-md cursor-pointer hover:shadow-md transition-all duration-200 border-l-4"
                  style={{
                    borderLeftColor: entry.tag?.colorHex || '#e5e7eb',
                    backgroundColor: entry.tag?.colorHex ? `${entry.tag.colorHex}15` : '#f9fafb',
                  }}
                  onClick={() => onEditEntry(entry)}
                >
                  {/* Color y nombre de etiqueta */}
                  <div className="flex items-center space-x-2 mb-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.tag?.colorHex || '#9ca3af' }}
                    />
                    <Text className="text-xs font-medium text-gray-600 truncate">
                      {entry.tag?.name || 'Sin etiqueta'}
                    </Text>
                  </div>

                  {/* Título de la entrada */}
                  <Text className="text-sm font-medium text-gray-900 block truncate">
                    {entry.title}
                  </Text>

                  {/* Hora si está disponible */}
                  {entry.startedAtLocal && (
                    <Text className="text-xs text-gray-500 block mt-1">
                      {entry.startedAtLocal.slice(0, 5)}
                      {entry.endedAtLocal && ` - ${entry.endedAtLocal.slice(0, 5)}`}
                    </Text>
                  )}
                </div>
              </Tooltip>
            ))
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => onCreateEntry(dateKey)}
                className="w-full"
              >
                <span className="text-xs">Agregar entrada</span>
              </Button>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header de navegación semanal */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 p-4 bg-white rounded-lg shadow-sm gap-3">
        <div className="flex items-center space-x-2 sm:space-x-4">
          <Button
            icon={<LeftOutlined />}
            onClick={() => navigateWeek('prev')}
            size="small"
          />
          <div className="flex items-center space-x-2">
            <CalendarOutlined className="text-blue-600" />
            <Title level={4} className="mb-0 text-center sm:text-left text-sm sm:text-base">
              {currentWeek.format('DD MMM')} - {currentWeek.add(6, 'day').format('DD MMM YYYY')}
            </Title>
          </div>
          <Button
            icon={<RightOutlined />}
            onClick={() => navigateWeek('next')}
            size="small"
          />
        </div>

        <Button
          type="primary"
          size="small"
          onClick={() => setCurrentWeek(dayjs().startOf('week'))}
        >
          Hoy
        </Button>
      </div>

      {/* Grid de días de la semana */}
      <div className="flex-1">
        <Spin spinning={loading}>
          <Row gutter={[8, 8]} className="h-full">
            {weekDays.map((day) => (
              <Col
                key={day.format('YYYY-MM-DD')}
                xs={24}
                sm={12}
                md={8}
                lg={24/7}
                className="h-full mb-4 lg:mb-0"
              >
                {renderDayEntries(day)}
              </Col>
            ))}
          </Row>
        </Spin>
      </div>

      {/* Footer con información */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-gray-600 gap-2">
          <span className="text-center sm:text-left">
            Total de entradas esta semana: {
              weekDays.reduce((total, day) => {
                const dateKey = formatDate(day);
                return total + (entries[dateKey]?.length || 0);
              }, 0)
            }
          </span>
          <span className="hidden sm:inline text-center">
            Click en las entradas para editar • Click en "+" para crear nueva
          </span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyView;