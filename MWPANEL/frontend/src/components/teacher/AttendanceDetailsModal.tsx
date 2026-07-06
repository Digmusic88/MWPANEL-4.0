import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Tag,
  Typography,
  Space,
  DatePicker,
  Button,
  Alert,
  Empty,
  Spin,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  UserOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../../services/apiClient';
import { AttendanceRecord, AttendanceStatus } from '../../types/attendance';
import { useResponsive } from '../../hooks/useResponsive';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export interface AttendanceDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  filterType: AttendanceStatus | 'all';
  initialDateRange?: [string, string];
}

interface AttendanceDetail extends AttendanceRecord {
  markedBy?: {
    profile?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

const AttendanceDetailsModal: React.FC<AttendanceDetailsModalProps> = ({
  visible,
  onClose,
  studentId,
  studentName,
  filterType,
  initialDateRange,
}) => {
  const { isMobile, isTablet } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [attendanceDetails, setAttendanceDetails] = useState<AttendanceDetail[]>([]);
  const [dateRange, setDateRange] = useState<[string, string]>(() => {
    if (initialDateRange) {
      return initialDateRange;
    }
    const endDate = dayjs().format('YYYY-MM-DD');
    const startDate = dayjs().subtract(1, 'month').format('YYYY-MM-DD');
    return [startDate, endDate];
  });

  // Cargar detalles de asistencia cuando se abre el modal
  useEffect(() => {
    if (visible && studentId) {
      loadAttendanceDetails();
    }
  }, [visible, studentId, dateRange, filterType]);

  const loadAttendanceDetails = async () => {
    try {
      setLoading(true);
      const [startDate, endDate] = dateRange;
      
      const response = await apiClient.get(
        `/attendance/records/student/${studentId}?startDate=${startDate}&endDate=${endDate}`
      );
      
      // Validar que la respuesta sea un array
      let filteredData = Array.isArray(response.data) ? response.data : [];
      
      // Filtrar por tipo de asistencia si no es 'all'
      if (filterType !== 'all') {
        filteredData = filteredData.filter((record: AttendanceDetail) => record && record.status === filterType);
      }
      
      // Ordenar por fecha (más reciente primero)
      filteredData.sort((a: AttendanceDetail, b: AttendanceDetail) => {
        try {
          if (!a.date || !b.date) return 0;
          return dayjs(b.date).valueOf() - dayjs(a.date).valueOf();
        } catch (error) {
          return 0;
        }
      });
      
      setAttendanceDetails(filteredData);
    } catch (error) {
      console.error('Error loading attendance details:', error);
      setAttendanceDetails([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'success';
      case AttendanceStatus.ABSENT:
        return 'red';
      case AttendanceStatus.LATE:
        return 'orange';
      case AttendanceStatus.JUSTIFIED_LATE:
        return 'purple';
      case AttendanceStatus.EARLY_DEPARTURE:
        return 'blue';
      case AttendanceStatus.JUSTIFIED_ABSENCE:
        return 'magenta';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'Presente';
      case AttendanceStatus.ABSENT:
        return 'Ausente';
      case AttendanceStatus.LATE:
        return 'Tardanza';
      case AttendanceStatus.JUSTIFIED_LATE:
        return 'Retraso Justificado';
      case AttendanceStatus.EARLY_DEPARTURE:
        return 'Salida Anticipada';
      case AttendanceStatus.JUSTIFIED_ABSENCE:
        return 'Falta Justificada';
      default:
        return status;
    }
  };

  const getFilterTypeText = (type: AttendanceStatus | 'all') => {
    if (type === 'all') return 'Todos los registros';
    return getStatusText(type);
  };

  // Calcular estadísticas del período filtrado
  const calculateStats = () => {
    if (!Array.isArray(attendanceDetails)) {
      return { total: 0, present: 0, absent: 0, late: 0, justifiedLate: 0, justifiedAbsence: 0 };
    }

    const total = attendanceDetails.length;
    const present = attendanceDetails.filter(r => r && r.status === AttendanceStatus.PRESENT).length;
    const absent = attendanceDetails.filter(r => r && r.status === AttendanceStatus.ABSENT).length;
    const late = attendanceDetails.filter(r => r && r.status === AttendanceStatus.LATE).length;
    const justifiedLate = attendanceDetails.filter(r => r && r.status === AttendanceStatus.JUSTIFIED_LATE).length;
    const justifiedAbsence = attendanceDetails.filter(r => r && r.status === AttendanceStatus.JUSTIFIED_ABSENCE).length;

    return { total, present, absent, late, justifiedLate, justifiedAbsence };
  };

  const stats = calculateStats();

  // Columnas para móvil - vista compacta tipo tarjeta
  const mobileColumns = [
    {
      title: 'Registro',
      key: 'mobile',
      render: (record: AttendanceDetail) => (
        <div className="py-2">
          {/* Fecha y estado */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CalendarOutlined className="text-gray-400" />
              <span className="font-medium">
                {record.date ? dayjs(record.date).format('DD/MM/YYYY') : '-'}
              </span>
            </div>
            <Tag color={getStatusColor(record.status)}>{getStatusText(record.status)}</Tag>
          </div>

          {/* Horario si existe */}
          {(record.arrivalTime || record.departureTime) && (
            <div className="text-xs text-gray-500 mb-1">
              <ClockCircleOutlined className="mr-1" />
              {record.arrivalTime && `Llegada: ${record.arrivalTime}`}
              {record.arrivalTime && record.departureTime && ' | '}
              {record.departureTime && `Salida: ${record.departureTime}`}
            </div>
          )}

          {/* Justificación si existe */}
          {record.justification && (
            <div className="text-xs text-gray-600 mt-1 italic">
              "{record.justification}"
            </div>
          )}
        </div>
      ),
    },
  ];

  // Columnas para desktop - tabla completa
  const desktopColumns = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => {
        if (!date) return '-';
        try {
          return (
            <Space>
              <CalendarOutlined />
              <span>{dayjs(date).format('DD/MM/YYYY')}</span>
              <Text type="secondary">({dayjs(date).format('dddd')})</Text>
            </Space>
          );
        } catch (error) {
          return <span>{date}</span>;
        }
      },
      sorter: (a: AttendanceDetail, b: AttendanceDetail) => {
        try {
          return dayjs(a.date).valueOf() - dayjs(b.date).valueOf();
        } catch (error) {
          return 0;
        }
      },
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: AttendanceStatus) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
      filters: [
        { text: 'Presente', value: AttendanceStatus.PRESENT },
        { text: 'Ausente', value: AttendanceStatus.ABSENT },
        { text: 'Tardanza', value: AttendanceStatus.LATE },
        { text: 'Retraso Justificado', value: AttendanceStatus.JUSTIFIED_LATE },
        { text: 'Salida Anticipada', value: AttendanceStatus.EARLY_DEPARTURE },
        { text: 'Falta Justificada', value: AttendanceStatus.JUSTIFIED_ABSENCE },
      ],
      onFilter: (value: any, record: AttendanceDetail) => record.status === value,
    },
    {
      title: 'Horario',
      key: 'time',
      render: (record: AttendanceDetail) => {
        const hasTime = record.arrivalTime || record.departureTime;
        if (!hasTime) return '-';

        return (
          <Space direction="vertical" size="small">
            {record.arrivalTime && (
              <div>
                <ClockCircleOutlined className="mr-1" />
                Llegada: {record.arrivalTime}
              </div>
            )}
            {record.departureTime && (
              <div>
                <ClockCircleOutlined className="mr-1" />
                Salida: {record.departureTime}
              </div>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Justificación',
      dataIndex: 'justification',
      key: 'justification',
      render: (justification: string) => justification || '-',
      ellipsis: true,
    },
    {
      title: 'Registrado por',
      key: 'markedBy',
      render: (record: AttendanceDetail) => {
        if (!record.markedBy || !record.markedBy.profile) return '-';

        const firstName = record.markedBy.profile?.firstName || '';
        const lastName = record.markedBy.profile?.lastName || '';
        if (!firstName && !lastName) return '-';

        return (
          <Space>
            <UserOutlined />
            <span>
              {firstName || ''} {lastName || ''}
            </span>
          </Space>
        );
      },
    },
    {
      title: 'Hora de registro',
      dataIndex: 'markedAt',
      key: 'markedAt',
      render: (markedAt: string) => {
        if (!markedAt) return '-';
        try {
          return dayjs(markedAt).format('DD/MM/YYYY HH:mm');
        } catch (error) {
          return '-';
        }
      },
    },
  ];

  // Seleccionar columnas según dispositivo
  const columns = isMobile ? mobileColumns : desktopColumns;

  return (
    <Modal
      title={
        <Space>
          <InfoCircleOutlined />
          <span>{isMobile ? 'Asistencia' : `Detalles de Asistencia - ${studentName}`}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={isMobile ? '95vw' : isTablet ? '90vw' : 1200}
      style={{ top: isMobile ? 20 : undefined }}
      styles={{ body: { padding: isMobile ? '12px' : '24px' } }}
      footer={[
        <Button key="close" onClick={onClose} block={isMobile}>
          Cerrar
        </Button>,
      ]}
    >
      <Space direction="vertical" size={isMobile ? 'middle' : 'large'} style={{ width: '100%' }}>
        {/* Mostrar nombre del estudiante en móvil (no aparece en título) */}
        {isMobile && (
          <div className="text-center mb-2">
            <Text strong className="text-base">{studentName}</Text>
          </div>
        )}

        {/* Filtros y controles */}
        <Row gutter={[16, 16]} className="mb-4">
          <Col xs={24} sm={12}>
            <div className={isMobile ? 'text-center' : ''}>
              <Text strong className="block mb-2">Rango de fechas: </Text>
              <RangePicker
                value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([
                      dates[0].format('YYYY-MM-DD'),
                      dates[1].format('YYYY-MM-DD'),
                    ]);
                  }
                }}
                format="DD/MM/YYYY"
                size={isMobile ? 'middle' : 'middle'}
                style={{ width: isMobile ? '100%' : 'auto' }}
              />
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div className={isMobile ? 'text-center' : ''}>
              <Text strong className="block mb-2">Filtro aplicado: </Text>
              <Tag color={filterType === 'all' ? 'blue' : getStatusColor(filterType as AttendanceStatus)}>
                {getFilterTypeText(filterType)}
              </Tag>
            </div>
          </Col>
        </Row>

        {/* Estadísticas del período */}
        {attendanceDetails.length > 0 && (
          <Alert
            message="Resumen del período"
            description={
              <Row gutter={[16, 8]}>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Total"
                    value={stats.total}
                    valueStyle={{ fontSize: isMobile ? '14px' : '16px' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Presente"
                    value={stats.present}
                    valueStyle={{ color: '#52c41a', fontSize: isMobile ? '14px' : '16px' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Ausente"
                    value={stats.absent}
                    valueStyle={{ color: '#ff4d4f', fontSize: isMobile ? '14px' : '16px' }}
                  />
                </Col>
                <Col xs={12} sm={6}>
                  <Statistic
                    title="Tardanza"
                    value={stats.late}
                    valueStyle={{ color: '#faad14', fontSize: isMobile ? '14px' : '16px' }}
                  />
                </Col>
              </Row>
            }
            type="info"
            className="mb-4"
          />
        )}

        {/* Tabla de detalles */}
        <div>
          <Title level={isMobile ? 5 : 4}>
            Registros detallados ({attendanceDetails.length})
          </Title>

          {loading ? (
            <div className="text-center py-8">
              <Spin size="large" />
              <div className="mt-2">Cargando detalles de asistencia...</div>
            </div>
          ) : attendanceDetails.length > 0 ? (
            <Table
              columns={columns}
              dataSource={attendanceDetails}
              rowKey="id"
              pagination={{
                pageSize: isMobile ? 5 : 10,
                showSizeChanger: !isMobile,
                showQuickJumper: !isMobile,
                showTotal: isMobile
                  ? undefined
                  : (total, range) => `${range[0]}-${range[1]} de ${total} registros`,
                simple: isMobile,
              }}
              size={isMobile ? 'small' : 'middle'}
              scroll={isMobile ? undefined : { x: 1000 }}
            />
          ) : (
            <Empty
              description={
                filterType === 'all'
                  ? "No hay registros de asistencia en el período seleccionado"
                  : `No hay registros de "${getFilterTypeText(filterType)}" en el período seleccionado`
              }
            />
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default AttendanceDetailsModal;