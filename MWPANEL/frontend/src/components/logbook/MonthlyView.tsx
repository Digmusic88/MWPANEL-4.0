/**
 * Vista Mensual Mejorada de la Bitácora Docente
 * Muestra entradas por día con colores de etiquetas de manera más compacta
 */

import React from 'react';
import {
  Calendar,
  Badge,
  Tooltip,
  Button,
  Typography,
  Space,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { LogbookEntry } from '../../types/logbook.types';

const { Text } = Typography;

interface MonthlyViewProps {
  entries: { [key: string]: LogbookEntry[] };
  onDateChange: (date: Dayjs) => void;
  onCreateEntry: (date?: string) => void;
  onEditEntry: (entry: LogbookEntry) => void;
}

const MonthlyView: React.FC<MonthlyViewProps> = ({
  entries,
  onDateChange,
  onCreateEntry,
  onEditEntry,
}) => {

  const renderDateCell = (date: Dayjs) => {
    const dateKey = date.format('YYYY-MM-DD');
    const dayEntries = entries[dateKey] || [];
    const isToday = date.isSame(dayjs(), 'day');

    return (
      <div className={`h-full min-h-[60px] sm:min-h-[80px] p-1 ${isToday ? 'bg-blue-50' : ''}`}>
        {/* Número del día */}
        <div className={`text-xs sm:text-sm font-medium mb-1 ${
          isToday ? 'text-blue-600' : 'text-gray-700'
        }`}>
          {date.date()}
        </div>

        {/* Entradas del día */}
        <div className="space-y-1">
          {dayEntries.length > 0 ? (
            <>
              {dayEntries.slice(0, 3).map((entry, index) => (
                <Tooltip
                  key={entry.id}
                  title={
                    <div>
                      <div className="font-medium">{entry.title}</div>
                      <div className="text-xs text-gray-300">
                        {entry.tag?.name || 'Sin etiqueta'}
                      </div>
                      {entry.startedAtLocal && (
                        <div className="text-xs text-gray-300 mt-1">
                          {entry.startedAtLocal.slice(0, 5)}
                          {entry.endedAtLocal && ` - ${entry.endedAtLocal.slice(0, 5)}`}
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
                    className="flex items-center space-x-1 px-1 sm:px-2 py-1 rounded cursor-pointer hover:shadow-sm transition-all duration-200 text-xs"
                    style={{
                      backgroundColor: entry.tag?.colorHex ? `${entry.tag.colorHex}20` : '#f3f4f6',
                    }}
                    onClick={() => onEditEntry(entry)}
                  >
                    {/* Dot de color */}
                    <div
                      className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.tag?.colorHex || '#9ca3af' }}
                    />
                    {/* Título de etiqueta */}
                    <Text className="text-xs truncate flex-1 font-medium hidden sm:block">
                      {entry.tag?.name || 'Sin etiqueta'}
                    </Text>
                  </div>
                </Tooltip>
              ))}

              {/* Indicador si hay más entradas */}
              {dayEntries.length > 3 && (
                <div className="text-xs text-gray-500 px-1 text-center">
                  +{dayEntries.length - 3}
                </div>
              )}
            </>
          ) : (
            /* Botón para agregar cuando no hay entradas */
            <div className="flex items-center justify-center h-6 sm:h-8">
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => onCreateEntry(dateKey)}
                className="text-xs h-5 sm:h-6 px-1 sm:px-2"
                style={{ fontSize: '10px' }}
              >
                <span className="hidden sm:inline">+</span>
              </Button>
            </div>
          )}
        </div>

        {/* Badge con número de entradas */}
        {dayEntries.length > 0 && (
          <div className="absolute top-1 right-1">
            <Badge
              count={dayEntries.length}
              size="small"
              style={{ backgroundColor: '#52c41a' }}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full">
      <Calendar
        cellRender={renderDateCell}
        onPanelChange={onDateChange}
        className="logbook-monthly-calendar"
        style={{
          '.ant-picker-calendar-date-content': {
            height: '80px',
            minHeight: '80px',
          }
        }}
      />

      {/* Leyenda */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex flex-col sm:flex-row items-center justify-center text-xs text-gray-600 space-y-1 sm:space-y-0">
          <Space wrap className="justify-center">
            <span>💡 Vista mensual:</span>
            <span className="hidden sm:inline">• Los colores indican etiquetas</span>
            <span>• Click en entradas para editar</span>
            <span className="hidden sm:inline">• Click en "+" para crear nueva</span>
          </Space>
        </div>
      </div>

      <style jsx>{`
        .logbook-monthly-calendar .ant-picker-calendar-date {
          position: relative;
        }
        .logbook-monthly-calendar .ant-picker-calendar-date-content {
          height: 60px !important;
          min-height: 60px !important;
        }
        .logbook-monthly-calendar .ant-picker-calendar-header {
          position: relative;
          z-index: 10;
        }
        .logbook-monthly-calendar .ant-picker-calendar-header .ant-picker-header-view button {
          z-index: 20 !important;
        }
        /* Fix for month/year picker dropdown visibility */
        :global(.ant-picker-dropdown) {
          z-index: 1050 !important;
        }
        :global(.ant-picker-year-panel),
        :global(.ant-picker-month-panel),
        :global(.ant-picker-decade-panel) {
          z-index: 1060 !important;
        }
        @media (min-width: 640px) {
          .logbook-monthly-calendar .ant-picker-calendar-date-content {
            height: 80px !important;
            min-height: 80px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default MonthlyView;