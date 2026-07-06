import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  message,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Empty,
  Alert,
  Statistic,
  Popconfirm,
  Tabs,
  List,
} from 'antd';
import {
  CalendarOutlined,
  CheckCircleOutlined,
  UserOutlined,
  EditOutlined,
  BarChartOutlined,
  CheckOutlined,
  CloseOutlined,
  PieChartOutlined,
  MinusCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/authStore';
import apiClient from '../../services/apiClient';
import { useResponsive } from '../../hooks/useResponsive';
import {
  AttendanceRequest,
  AttendanceRecord,
  AttendanceRequestType,
  AttendanceRequestStatus,
  AttendanceStatus,
  CreateAttendanceRecordDto,
  UpdateAttendanceRecordDto,
  ReviewAttendanceRequestDto,
  BulkMarkPresentDto,
  AttendanceStats,
} from '../../types/attendance';
import AttendanceDetailsModal from '../../components/teacher/AttendanceDetailsModal';
import AttendanceStatsModal from '../../components/teacher/AttendanceStatsModal';
import GroupAttendanceStatsModal from '../../components/teacher/GroupAttendanceStatsModal';
import { academiaService, AcademiaGroup, GridStudent } from '@services/academiaService';
import AcademiaGrid, { Palette } from '../../components/teacher/academia/AcademiaGrid';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { TabPane } = Tabs;

// Asistencia de academia (tarde): mismos estados/colores que la sección dedicada
const ACADEMIA_ATT_PALETTE: Palette = {
  presente: { label: 'Presente', color: '#2E7D52' },
  retraso: { label: 'Retraso', color: '#B45309' },
  justificada: { label: 'Justificada', color: '#1677ff' },
  ausente: { label: 'Ausente', color: '#C43030' },
};
const ACADEMIA_ATT_ORDER = ['presente', 'retraso', 'justificada', 'ausente'];
const academiaCycle = (c?: string) => ACADEMIA_ATT_ORDER[(ACADEMIA_ATT_ORDER.indexOf(c || '') + 1) % ACADEMIA_ATT_ORDER.length];

interface ClassGroup {
  id: string;
  name: string;
  students?: Array<{
    id: string;
    enrollmentNumber: string;
    user: {
      profile: {
        firstName: string;
        lastName: string;
      };
    };
  }>;
}


const AttendancePage: React.FC = () => {
  const { } = useAuthStore();
  const { isMobile, isTablet } = useResponsive();

  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceGrid, setAttendanceGrid] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AttendanceRequest[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats[]>([]);
  const [isRecordModalVisible, setIsRecordModalVisible] = useState(false);
  const [isRequestModalVisible, setIsRequestModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AttendanceRequest | null>(null);
  const [form] = Form.useForm();
  const [reviewForm] = Form.useForm();
  
  // Estados para el modal de detalles de asistencia
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedAttendanceFilter, setSelectedAttendanceFilter] = useState<AttendanceStatus | 'all'>('all');
  
  // Estados para el modal de estadísticas individuales
  const [isStatsModalVisible, setIsStatsModalVisible] = useState(false);
  const [selectedStudentForStats, setSelectedStudentForStats] = useState<{
    id: string;
    name: string;
  } | null>(null);
  
  // Estados para el modal de estadísticas grupales
  const [isGroupStatsModalVisible, setIsGroupStatsModalVisible] = useState(false);

  // Grupos de tarde (academia) — se pueden elegir en el mismo selector, además de
  // la sección dedicada. Delegan en el proxy de Secretaría (academiaService).
  const [academiaGroups, setAcademiaGroups] = useState<AcademiaGroup[]>([]);
  const [academiaStudents, setAcademiaStudents] = useState<GridStudent[]>([]);
  const [academiaValue, setAcademiaValue] = useState<Record<string, string>>({});
  const [academiaLoading, setAcademiaLoading] = useState(false);
  const [academiaSaving, setAcademiaSaving] = useState(false);

  const isAcademiaGroup = !!selectedGroup && academiaGroups.some(g => g.id === selectedGroup);

  // Cargar grupos de clase del profesor (+ grupos de academia, fail-soft)
  useEffect(() => {
    loadClassGroups();
    academiaService.myGroups()
      .then(r => setAcademiaGroups(r.groups || []))
      .catch(() => setAcademiaGroups([]));
  }, []);

  // Cargar datos cuando se selecciona un grupo o fecha (según el origen del grupo)
  useEffect(() => {
    if (!selectedGroup) return;
    if (isAcademiaGroup) {
      loadAcademiaAttendance();
    } else {
      loadAttendanceData();
      loadPendingRequests();
      loadAvailableStudents();
    }
  }, [selectedGroup, selectedDate]);

  // Generar grilla cuando tanto availableStudents como attendanceRecords estén listos
  useEffect(() => {
    if (availableStudents.length > 0) {
      generateAttendanceGrid(attendanceRecords);
    }
  }, [availableStudents, attendanceRecords]);

  const loadClassGroups = async () => {
    try {
      setLoading(true);
      // Obtener grupos del profesor actual
      const response = await apiClient.get('/class-groups/teacher/my-groups');
      setClassGroups(response.data);
      
      if (response.data.length > 0) {
        setSelectedGroup(response.data[0].id);
      }
    } catch (error) {
      console.error('Error loading class groups:', error);
      message.error('Error al cargar grupos de clase');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    if (!selectedGroup) return;
    
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/attendance/records/group/${selectedGroup}?date=${selectedDate}`
      );
      setAttendanceRecords(response.data);
      
      // NO generar grilla aquí - se hará cuando availableStudents esté listo
    } catch (error) {
      console.error('Error loading attendance data:', error);
      message.error('Error al cargar datos de asistencia');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRequests = async () => {
    if (!selectedGroup) return;
    
    try {
      const response = await apiClient.get(`/attendance/requests/group/${selectedGroup}/pending`);
      setPendingRequests(response.data);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      message.error('Error al cargar solicitudes pendientes');
    }
  };

  const loadAvailableStudents = async () => {
    if (!selectedGroup) return;
    
    try {
      // Obtener el grupo con sus estudiantes
      const response = await apiClient.get(`/class-groups/${selectedGroup}`);
      const groupData = response.data;
      
      if (groupData && groupData.students) {
        setAvailableStudents(groupData.students);
        // La grilla se generará automáticamente por el useEffect cuando cambien availableStudents
      } else {
        setAvailableStudents([]);
        setAttendanceGrid([]); // Limpiar grilla si no hay estudiantes
      }
    } catch (error) {
      console.error('Error loading available students:', error);
      message.error('Error al cargar estudiantes del grupo');
      setAvailableStudents([]);
      setAttendanceGrid([]); // Limpiar grilla en caso de error
    }
  };

  const generateAttendanceGrid = (records: AttendanceRecord[]) => {
    if (availableStudents.length === 0) return;
    
    const grid = availableStudents.map(student => {
      // Buscar registro existente para este estudiante
      const existingRecord = records.find(record => record.studentId === student.id);
      
      return {
        id: student.id,
        student: student,
        record: existingRecord,
        status: existingRecord?.status || null,
        hasRecord: !!existingRecord,
        justification: existingRecord?.justification || '',
        arrivalTime: existingRecord?.arrivalTime || '',
        departureTime: existingRecord?.departureTime || '',
      };
    });
    
    setAttendanceGrid(grid);
  };

  const loadAcademiaAttendance = async () => {
    if (!selectedGroup) return;
    try {
      setAcademiaLoading(true);
      const g = await academiaService.attendanceGrid(selectedGroup, selectedDate);
      setAcademiaStudents(g.students || []);
      const v: Record<string, string> = {};
      (g.students || []).forEach(s => {
        const val = g.records?.[s.enrollmentId]?.[selectedDate];
        if (val) v[s.enrollmentId] = val;
      });
      setAcademiaValue(v);
    } catch (error) {
      console.error('Error loading academia attendance:', error);
      message.error('No se pudo cargar la asistencia de academia');
      setAcademiaStudents([]);
      setAcademiaValue({});
    } finally {
      setAcademiaLoading(false);
    }
  };

  const saveAcademiaAttendance = async () => {
    if (!selectedGroup) return;
    try {
      setAcademiaSaving(true);
      const records = academiaStudents.map(s => ({
        enrollmentId: s.enrollmentId,
        status: academiaValue[s.enrollmentId] || 'presente',
      }));
      await academiaService.attendanceSave(selectedDate, records);
      message.success('Asistencia de academia guardada');
    } catch (error: any) {
      console.error('Error saving academia attendance:', error);
      message.error(error.response?.data?.message || 'No se pudo guardar la asistencia');
    } finally {
      setAcademiaSaving(false);
    }
  };

  const loadAttendanceStats = async () => {
    if (!selectedGroup) return;

    try {
      setStatsLoading(true);
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(1, 'month').format('YYYY-MM-DD');
      
      const response = await apiClient.get(
        `/attendance/stats/group/${selectedGroup}?startDate=${startDate}&endDate=${endDate}`
      );
      setAttendanceStats(response.data);
    } catch (error) {
      console.error('Error loading attendance stats:', error);
      message.error('Error al cargar estadísticas de asistencia');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleCreateRecord = async (values: any) => {
    try {
      const recordData: CreateAttendanceRecordDto = {
        studentId: values.studentId,
        date: selectedDate,
        status: values.status,
        justification: values.justification,
        arrivalTime: values.arrivalTime?.format('HH:mm'),
        departureTime: values.departureTime?.format('HH:mm'),
      };

      await apiClient.post('/attendance/records', recordData);
      message.success('Registro de asistencia creado exitosamente');
      
      setIsRecordModalVisible(false);
      form.resetFields();
      loadAttendanceData();
    } catch (error: any) {
      console.error('Error creating attendance record:', error);
      message.error(error.response?.data?.message || 'Error al crear registro');
    }
  };

  const handleUpdateRecord = async (values: any) => {
    if (!selectedRecord) return;
    
    try {
      const updateData: UpdateAttendanceRecordDto = {
        status: values.status,
        justification: values.justification,
        arrivalTime: values.arrivalTime?.format('HH:mm'),
        departureTime: values.departureTime?.format('HH:mm'),
      };

      await apiClient.patch(`/attendance/records/${selectedRecord.id}`, updateData);
      message.success('Registro de asistencia actualizado exitosamente');
      
      setIsRecordModalVisible(false);
      setSelectedRecord(null);
      form.resetFields();
      loadAttendanceData();
    } catch (error: any) {
      console.error('Error updating attendance record:', error);
      message.error(error.response?.data?.message || 'Error al actualizar registro');
    }
  };

  const handleReviewRequest = async (values: any) => {
    if (!selectedRequest) return;
    
    try {
      const reviewData: ReviewAttendanceRequestDto = {
        status: values.status,
        reviewNote: values.reviewNote,
      };

      await apiClient.patch(`/attendance/requests/${selectedRequest.id}/review`, reviewData);
      message.success('Solicitud revisada exitosamente');
      
      setIsRequestModalVisible(false);
      setSelectedRequest(null);
      reviewForm.resetFields();
      loadPendingRequests();
      loadAttendanceData();
    } catch (error: any) {
      console.error('Error reviewing request:', error);
      message.error(error.response?.data?.message || 'Error al revisar solicitud');
    }
  };

  const handleQuickAttendance = async (studentId: string, status: AttendanceStatus) => {
    try {
      // Buscar si ya existe un registro para este estudiante
      const existingRecord = attendanceRecords.find(record => record.studentId === studentId);

      let newRecord: AttendanceRecord;

      if (existingRecord) {
        // Actualizar registro existente
        const updateData: UpdateAttendanceRecordDto = { status };
        const response = await apiClient.patch(`/attendance/records/${existingRecord.id}`, updateData);
        newRecord = response.data;
      } else {
        // Crear nuevo registro
        const recordData: CreateAttendanceRecordDto = {
          studentId,
          date: selectedDate,
          status,
        };
        const response = await apiClient.post('/attendance/records', recordData);
        newRecord = response.data;
      }

      // Actualizar estado local sin recargar todos los datos (evita scroll en móvil)
      setAttendanceRecords(prevRecords => {
        if (existingRecord) {
          // Actualizar el registro existente
          return prevRecords.map(record =>
            record.id === existingRecord.id ? { ...record, status } : record
          );
        } else {
          // Añadir nuevo registro
          return [...prevRecords, newRecord];
        }
      });

      // Actualizar la grilla localmente
      setAttendanceGrid(prevGrid =>
        prevGrid.map(item => {
          if (item.student.id === studentId) {
            return {
              ...item,
              status,
              hasRecord: true,
              record: existingRecord ? { ...existingRecord, status } : newRecord,
            };
          }
          return item;
        })
      );

      message.success('Asistencia actualizada');
    } catch (error: any) {
      console.error('Error updating attendance:', error);
      message.error(error.response?.data?.message || 'Error al actualizar asistencia');
    }
  };

  const handleUnmarkAttendance = async (studentId: string) => {
    try {
      // Buscar el registro existente
      const existingRecord = attendanceRecords.find(record => record.studentId === studentId);

      if (!existingRecord) {
        message.warning('No hay registro de asistencia para eliminar');
        return;
      }

      // Eliminar el registro
      await apiClient.delete(`/attendance/records/${existingRecord.id}`);

      // Recargar datos
      loadAttendanceData();
      message.success('Registro de asistencia eliminado exitosamente');
    } catch (error: any) {
      console.error('Error unmarking attendance:', error);
      message.error(error.response?.data?.message || 'Error al eliminar registro');
    }
  };

  const handleBulkMarkPresent = async () => {
    if (!selectedGroup) return;
    
    try {
      const bulkData: BulkMarkPresentDto = {
        classGroupId: selectedGroup,
        date: selectedDate,
        excludeStudentIds: attendanceRecords.map(record => record.studentId),
      };

      const response = await apiClient.post('/attendance/records/bulk-present', bulkData);
      message.success(`${response.data.created} estudiantes marcados como presentes`);
      
      loadAttendanceData();
    } catch (error: any) {
      console.error('Error bulk marking present:', error);
      message.error(error.response?.data?.message || 'Error al marcar presentes');
    }
  };

  // Función para abrir el modal de detalles de asistencia
  const handleOpenDetailsModal = (student: { id: string; name: string }, filterType: AttendanceStatus | 'all') => {
    setSelectedStudentForDetails(student);
    setSelectedAttendanceFilter(filterType);
    setIsDetailsModalVisible(true);
  };

  // Función para cerrar el modal de detalles
  const handleCloseDetailsModal = () => {
    setIsDetailsModalVisible(false);
    setSelectedStudentForDetails(null);
    setSelectedAttendanceFilter('all');
  };

  // Función para abrir el modal de estadísticas individuales
  const handleOpenStatsModal = (student: { id: string; name: string }) => {
    setSelectedStudentForStats(student);
    setIsStatsModalVisible(true);
  };

  // Función para cerrar el modal de estadísticas
  const handleCloseStatsModal = () => {
    setIsStatsModalVisible(false);
    setSelectedStudentForStats(null);
  };

  // Función para abrir el modal de estadísticas grupales
  const handleOpenGroupStatsModal = () => {
    setIsGroupStatsModalVisible(true);
  };

  // Función para cerrar el modal de estadísticas grupales
  const handleCloseGroupStatsModal = () => {
    setIsGroupStatsModalVisible(false);
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return '#16a34a';
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

  const getRequestTypeText = (type: AttendanceRequestType) => {
    switch (type) {
      case AttendanceRequestType.ABSENCE:
        return 'Ausencia';
      case AttendanceRequestType.LATE_ARRIVAL:
        return 'Llegada Tardía';
      case AttendanceRequestType.EARLY_DEPARTURE:
        return 'Salida Anticipada';
      default:
        return type;
    }
  };

  // Columnas adaptativas para móvil
  const attendanceGridColumns = isMobile ? [
    // Vista móvil: Solo estudiante con estado integrado
    {
      title: 'Estudiante',
      key: 'student',
      render: (gridItem: any) => {
        const profile = gridItem.student?.user?.profile;
        const firstName = profile?.firstName || '';
        const lastName = profile?.lastName || '';
        const studentName = `${firstName} ${lastName}`.trim();

        return (
          <div className="py-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <UserOutlined className="text-gray-400" />
                <span className="font-medium text-sm">{firstName} {lastName}</span>
              </div>
              {gridItem.status ? (
                <Tag color={getStatusColor(gridItem.status)} className="text-xs">
                  {getStatusText(gridItem.status)}
                </Tag>
              ) : (
                <Tag color="default" className="text-xs">Sin marcar</Tag>
              )}
            </div>
            {/* Botones de acción rápida en móvil */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                size="small"
                type={gridItem.status === AttendanceStatus.PRESENT ? 'primary' : 'default'}
                icon={<CheckOutlined />}
                onClick={() => handleQuickAttendance(gridItem.student.id, AttendanceStatus.PRESENT)}
                className="flex-1 min-w-[70px]"
                style={gridItem.status === AttendanceStatus.PRESENT ? { backgroundColor: '#16a34a', borderColor: '#15803d', color: 'white' } : {}}
              />
              <Button
                size="small"
                type={gridItem.status === AttendanceStatus.ABSENT ? 'primary' : 'default'}
                danger
                icon={<CloseOutlined />}
                onClick={() => handleQuickAttendance(gridItem.student.id, AttendanceStatus.ABSENT)}
                className="flex-1 min-w-[70px]"
              />
              <Button
                size="small"
                icon={<PieChartOutlined />}
                onClick={() => handleOpenStatsModal({
                  id: gridItem.student.id,
                  name: studentName
                })}
              />
              {gridItem.hasRecord ? (
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => {
                    setSelectedRecord(gridItem.record);
                    form.setFieldsValue({
                      status: gridItem.record.status,
                      justification: gridItem.record.justification,
                      arrivalTime: gridItem.record.arrivalTime ? dayjs(gridItem.record.arrivalTime, 'HH:mm') : null,
                      departureTime: gridItem.record.departureTime ? dayjs(gridItem.record.departureTime, 'HH:mm') : null,
                    });
                    setIsRecordModalVisible(true);
                  }}
                />
              ) : (
                <Button
                  size="small"
                  icon={<UserOutlined />}
                  onClick={() => {
                    setSelectedRecord(null);
                    form.setFieldsValue({
                      studentId: gridItem.student.id,
                    });
                    setIsRecordModalVisible(true);
                  }}
                />
              )}
            </div>
          </div>
        );
      },
    },
  ] : [
    // Vista desktop: Columnas completas
    {
      title: 'Estudiante',
      key: 'student',
      width: 200,
      fixed: 'left' as const,
      render: (gridItem: any) => {
        const profile = gridItem.student?.user?.profile;
        const firstName = profile?.firstName || '';
        const lastName = profile?.lastName || '';
        const enrollmentNumber = gridItem.student?.enrollmentNumber || '';

        return (
          <Space>
            <UserOutlined />
            <div>
              <div>{firstName} {lastName}</div>
              <Text type="secondary" className="text-xs">
                {enrollmentNumber}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Estado',
      key: 'status',
      width: 120,
      render: (gridItem: any) => {
        if (gridItem.status) {
          return <Tag color={getStatusColor(gridItem.status)}>{getStatusText(gridItem.status)}</Tag>;
        }
        return <Tag color="default">Sin marcar</Tag>;
      },
    },
    {
      title: 'Acciones Rápidas',
      key: 'quickActions',
      width: 250,
      render: (gridItem: any) => (
        <Space wrap>
          <Button
            size="small"
            type={gridItem.status === AttendanceStatus.PRESENT ? 'primary' : 'default'}
            icon={<CheckOutlined />}
            onClick={() => handleQuickAttendance(gridItem.student.id, AttendanceStatus.PRESENT)}
            style={gridItem.status === AttendanceStatus.PRESENT ? { backgroundColor: '#16a34a', borderColor: '#15803d', color: 'white' } : {}}
          >
            Presente
          </Button>
          <Button
            size="small"
            type={gridItem.status === AttendanceStatus.ABSENT ? 'primary' : 'default'}
            danger
            icon={<CloseOutlined />}
            onClick={() => handleQuickAttendance(gridItem.student.id, AttendanceStatus.ABSENT)}
          >
            Ausente
          </Button>
          {gridItem.hasRecord && (
            <Popconfirm
              title="¿Dejar sin marcar?"
              description="Se eliminará el registro de asistencia actual"
              onConfirm={() => handleUnmarkAttendance(gridItem.student.id)}
              okText="Sí"
              cancelText="No"
            >
              <Button
                size="small"
                icon={<MinusCircleOutlined />}
                title="Dejar sin marcar"
              >
                Sin marcar
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
    {
      title: 'Justificación',
      key: 'justification',
      width: 150,
      render: (gridItem: any) => gridItem.justification || '-',
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (gridItem: any) => {
        const profile = gridItem.student?.user?.profile;
        const firstName = profile?.firstName || '';
        const lastName = profile?.lastName || '';
        const studentName = `${firstName} ${lastName}`.trim();

        return (
          <Space>
            {gridItem.hasRecord && (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setSelectedRecord(gridItem.record);
                  form.setFieldsValue({
                    status: gridItem.record.status,
                    justification: gridItem.record.justification,
                    arrivalTime: gridItem.record.arrivalTime ? dayjs(gridItem.record.arrivalTime, 'HH:mm') : null,
                    departureTime: gridItem.record.departureTime ? dayjs(gridItem.record.departureTime, 'HH:mm') : null,
                  });
                  setIsRecordModalVisible(true);
                }}
              >
                Editar
              </Button>
            )}
            {!gridItem.hasRecord && (
              <Button
                size="small"
                icon={<UserOutlined />}
                onClick={() => {
                  setSelectedRecord(null);
                  form.setFieldsValue({
                    studentId: gridItem.student.id,
                  });
                  setIsRecordModalVisible(true);
                }}
              >
                Registrar
              </Button>
            )}
            <Button
              size="small"
              icon={<PieChartOutlined />}
              onClick={() => handleOpenStatsModal({
                id: gridItem.student.id,
                name: studentName
              })}
              title="Ver estadísticas de asistencia"
            >
              Estadísticas
            </Button>
          </Space>
        );
      },
    },
  ];

  const requestsColumns = [
    {
      title: 'Estudiante',
      key: 'student',
      width: 180,
      fixed: 'left' as const,
      render: (request: AttendanceRequest) => {
        const profile = request.student?.user?.profile;
        const firstName = profile?.firstName || '';
        const lastName = profile?.lastName || '';
        const enrollmentNumber = request.student?.enrollmentNumber || '';
        
        return (
          <Space>
            <UserOutlined />
            <div>
              <div>{firstName} {lastName}</div>
              <Text type="secondary" className="text-xs">
                {enrollmentNumber}
              </Text>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: AttendanceRequestType) => getRequestTypeText(type),
    },
    {
      title: 'Motivo',
      dataIndex: 'reason',
      key: 'reason',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Familia',
      key: 'requestedBy',
      width: 120,
      render: (request: AttendanceRequest) => {
        const profile = request.requestedBy?.profile;
        if (!profile) return '-';
        
        const firstName = profile?.firstName || '';
        const lastName = profile?.lastName || '';
        
        if (!firstName && !lastName) return '-';
        
        return `${firstName} ${lastName}`.trim();
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 180,
      fixed: 'right' as const,
      render: (request: AttendanceRequest) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => {
              setSelectedRequest(request);
              reviewForm.setFieldsValue({
                status: AttendanceRequestStatus.APPROVED,
                reviewNote: '',
              });
              setIsRequestModalVisible(true);
            }}
          >
            Aprobar
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => {
              setSelectedRequest(request);
              reviewForm.setFieldsValue({
                status: AttendanceRequestStatus.REJECTED,
                reviewNote: '',
              });
              setIsRequestModalVisible(true);
            }}
          >
            Rechazar
          </Button>
        </Space>
      ),
    },
  ];

  const selectedGroupName =
    classGroups.find(g => g.id === selectedGroup)?.name ||
    academiaGroups.find(g => g.id === selectedGroup)?.name ||
    '';

  return (
    <div className={`${isMobile ? 'p-3' : 'p-6'}`}>
      <Row gutter={isMobile ? [12, 12] : [16, 16]}>
        <Col span={24}>
          <Card
            className="rounded-xl shadow-sm"
            bodyStyle={{
              padding: isMobile ? '12px' : '24px'
            }}
          >
            <Space direction="vertical" size={isMobile ? 'middle' : 'large'} style={{ width: '100%' }}>
              {/* Header */}
              <div className={isMobile ? 'text-center' : 'flex justify-between items-center'}>
                <div>
                  <Title
                    level={isMobile ? 4 : 2}
                    style={{ margin: '0 0 4px 0' }}
                  >
                    <CalendarOutlined className="mr-2" />
                    Control de Asistencia
                  </Title>
                  <Text
                    type="secondary"
                    className={`block ${isMobile ? 'text-center text-xs' : 'text-left text-sm'}`}
                  >
                    Gestiona la asistencia diaria y revisa solicitudes
                  </Text>
                </div>
              </div>

              {/* Selectores de grupo y fecha */}
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={12}>
                  <div className={isMobile ? 'mb-2' : ''}>
                    <Text strong className="block mb-2 text-sm">
                      Grupo:
                    </Text>
                    <Select
                      style={{ width: '100%' }}
                      size={isMobile ? 'large' : 'middle'}
                      value={selectedGroup}
                      onChange={setSelectedGroup}
                      placeholder="Seleccionar grupo"
                    >
                      {classGroups.length > 0 && (
                        <Select.OptGroup label="Mis grupos (mañana)">
                          {classGroups.map(group => (
                            <Option key={group.id} value={group.id}>
                              {group.name}
                            </Option>
                          ))}
                        </Select.OptGroup>
                      )}
                      {academiaGroups.length > 0 && (
                        <Select.OptGroup label="Academia (tarde)">
                          {academiaGroups.map(group => (
                            <Option key={group.id} value={group.id}>
                              {group.name}{group.serviceName ? ` · ${group.serviceName}` : ''}
                            </Option>
                          ))}
                        </Select.OptGroup>
                      )}
                    </Select>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div>
                    <Text strong className="block mb-2 text-sm">
                      Fecha:
                    </Text>
                    <DatePicker
                      value={dayjs(selectedDate)}
                      onChange={(date) => setSelectedDate(date?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'))}
                      format="DD/MM/YYYY"
                      size={isMobile ? 'large' : 'middle'}
                      style={{ width: '100%' }}
                      inputReadOnly
                    />
                  </div>
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>

        {selectedGroup && isAcademiaGroup && (
          <Col span={24}>
            <Card
              title={
                <span className={isMobile ? 'text-sm' : ''}>
                  {isMobile
                    ? `${selectedGroupName} (Tarde) - ${dayjs(selectedDate).format('DD/MM')}`
                    : `Asistencia Academia (Tarde) - ${selectedGroupName} - ${dayjs(selectedDate).format('DD/MM/YYYY')}`
                  }
                </span>
              }
              loading={academiaLoading}
              size={isMobile ? 'small' : 'default'}
              bodyStyle={{ padding: isMobile ? '8px' : '24px' }}
            >
              {academiaStudents.length > 0 ? (
                <AcademiaGrid
                  students={academiaStudents}
                  value={academiaValue}
                  palette={ACADEMIA_ATT_PALETTE}
                  cycle={academiaCycle}
                  onChange={(id, next) => setAcademiaValue(v => ({ ...v, [id]: next }))}
                  onSave={saveAcademiaAttendance}
                  onFillAll={() => setAcademiaValue(Object.fromEntries(academiaStudents.map(s => [s.enrollmentId, 'presente'])))}
                  fillAllLabel="Todos presente"
                  saving={academiaSaving}
                />
              ) : (
                <Empty description="Sin alumnos en este grupo de academia" />
              )}
            </Card>
          </Col>
        )}

        {selectedGroup && !isAcademiaGroup && (
          <Col span={24}>
            <Tabs
              defaultActiveKey="attendance"
              onChange={() => loadAttendanceStats()}
              size={isMobile ? 'small' : 'middle'}
              tabBarStyle={{ marginBottom: isMobile ? 8 : 16 }}
            >
              <TabPane tab={isMobile ? 'Asistencia' : 'Asistencia Diaria'} key="attendance">
                <Card
                  title={
                    <span className={isMobile ? 'text-sm' : ''}>
                      {isMobile
                        ? `${selectedGroupName} - ${dayjs(selectedDate).format('DD/MM')}`
                        : `Asistencia - ${selectedGroupName} - ${dayjs(selectedDate).format('DD/MM/YYYY')}`
                      }
                    </span>
                  }
                  loading={loading}
                  size={isMobile ? 'small' : 'default'}
                  bodyStyle={{ padding: isMobile ? '8px' : '24px' }}
                  extra={
                    <Space
                      direction={isMobile ? 'vertical' : 'horizontal'}
                      size="small"
                      className={isMobile ? 'w-full' : ''}
                    >
                      <Popconfirm
                        title="¿Marcar todos como presentes?"
                        onConfirm={handleBulkMarkPresent}
                        okText="Sí"
                        cancelText="No"
                      >
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          size={isMobile ? 'middle' : 'middle'}
                          className={`rounded-lg ${isMobile ? 'w-full' : ''}`}
                          style={{ backgroundColor: '#16a34a', borderColor: '#15803d', color: 'white' }}
                        >
                          {isMobile ? 'Todos ✓' : 'Marcar Resto Presente'}
                        </Button>
                      </Popconfirm>
                      <Button
                        type="primary"
                        icon={<UserOutlined />}
                        size={isMobile ? 'middle' : 'middle'}
                        className={`rounded-lg ${isMobile ? 'w-full' : ''}`}
                        onClick={() => {
                          setSelectedRecord(null);
                          form.resetFields();
                          setIsRecordModalVisible(true);
                        }}
                      >
                        {isMobile ? 'Nuevo' : 'Nuevo Registro'}
                      </Button>
                    </Space>
                  }
                >
                  {attendanceGrid.length > 0 ? (
                    <Table
                      columns={attendanceGridColumns}
                      dataSource={attendanceGrid}
                      rowKey="id"
                      pagination={false}
                      size="small"
                      scroll={isMobile ? undefined : { x: 'max-content' }}
                      className="attendance-table"
                    />
                  ) : (
                    <Empty description="No hay estudiantes en este grupo" />
                  )}
                </Card>
              </TabPane>

              <TabPane tab={`Solicitudes Pendientes (${pendingRequests.length})`} key="requests">
                <Card title="Solicitudes de Justificación Pendientes" loading={loading}>
                  {pendingRequests.length > 0 ? (
                    <Table
                      columns={requestsColumns}
                      dataSource={pendingRequests}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      scroll={{ x: 600 }}
                      style={{ overflowX: 'auto' }}
                    />
                  ) : (
                    <Empty description="No hay solicitudes pendientes" />
                  )}
                </Card>
              </TabPane>

              <TabPane tab={isMobile ? 'Stats' : 'Estadísticas'} key="stats">
                <Card
                  title={isMobile ? 'Estadísticas' : 'Estadísticas de Asistencia (Último Mes)'}
                  loading={statsLoading}
                  size={isMobile ? 'small' : 'default'}
                  bodyStyle={{ padding: isMobile ? '12px' : '24px' }}
                >
                  <Space className="mb-4" direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
                    <Button
                      type="primary"
                      icon={<BarChartOutlined />}
                      onClick={loadAttendanceStats}
                      className={isMobile ? 'w-full' : ''}
                    >
                      {isMobile ? 'Cargar' : 'Cargar Estadísticas'}
                    </Button>
                    <Button
                      type="default"
                      icon={<PieChartOutlined />}
                      onClick={handleOpenGroupStatsModal}
                      disabled={!selectedGroup}
                      className={isMobile ? 'w-full' : ''}
                    >
                      {isMobile ? 'Grupales' : 'Estadísticas Grupales'}
                    </Button>
                  </Space>

                  {attendanceStats.length > 0 ? (
                    <List
                      dataSource={attendanceStats}
                      renderItem={(stat) => (
                        <List.Item className={isMobile ? 'px-0' : ''}>
                          <div className="w-full">
                            <div className="flex justify-between items-center mb-2">
                              <Text strong className={isMobile ? 'text-sm' : ''}>{stat.student.name}</Text>
                              <Text type="secondary" className="text-xs">{stat.totalDays} días</Text>
                            </div>
                            <Row gutter={[8, 8]}>
                              <Col xs={12} sm={6}>
                                <div
                                  className="cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors text-center"
                                  onClick={() => handleOpenDetailsModal(
                                    { id: stat.student.id, name: stat.student.name },
                                    AttendanceStatus.PRESENT
                                  )}
                                >
                                  <Statistic
                                    title={<span className="text-xs">Presente</span>}
                                    value={stat.present}
                                    valueStyle={{ color: '#16a34a', fontSize: isMobile ? '16px' : '14px' }}
                                  />
                                </div>
                              </Col>
                              <Col xs={12} sm={6}>
                                <div
                                  className="cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors text-center"
                                  onClick={() => handleOpenDetailsModal(
                                    { id: stat.student.id, name: stat.student.name },
                                    AttendanceStatus.ABSENT
                                  )}
                                >
                                  <Statistic
                                    title={<span className="text-xs">Ausente</span>}
                                    value={stat.absent}
                                    valueStyle={{ color: '#ff4d4f', fontSize: isMobile ? '16px' : '14px' }}
                                  />
                                </div>
                              </Col>
                              <Col xs={12} sm={6}>
                                <div
                                  className="cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors text-center"
                                  onClick={() => handleOpenDetailsModal(
                                    { id: stat.student.id, name: stat.student.name },
                                    AttendanceStatus.LATE
                                  )}
                                >
                                  <Statistic
                                    title={<span className="text-xs">Tardanza</span>}
                                    value={stat.late}
                                    valueStyle={{ color: '#faad14', fontSize: isMobile ? '16px' : '14px' }}
                                  />
                                </div>
                              </Col>
                              <Col xs={12} sm={6}>
                                <div
                                  className="cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors text-center"
                                  onClick={() => handleOpenDetailsModal(
                                    { id: stat.student.id, name: stat.student.name },
                                    AttendanceStatus.JUSTIFIED_ABSENCE
                                  )}
                                >
                                  <Statistic
                                    title={<span className="text-xs">Justif.</span>}
                                    value={stat.justifiedAbsence}
                                    valueStyle={{ color: '#1890ff', fontSize: isMobile ? '16px' : '14px' }}
                                  />
                                </div>
                              </Col>
                            </Row>
                            <div className="mt-3 text-center">
                              <Button
                                size="small"
                                type="primary"
                                icon={<PieChartOutlined />}
                                onClick={() => handleOpenStatsModal({
                                  id: stat.student.id,
                                  name: stat.student.name
                                })}
                              >
                                {isMobile ? 'Gráfico' : 'Ver Gráfico de Sectores'}
                              </Button>
                            </div>
                          </div>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="No hay estadísticas disponibles" />
                  )}
                </Card>
              </TabPane>
            </Tabs>
          </Col>
        )}
      </Row>

      {/* Modal para crear/editar registro */}
      <Modal
        title={selectedRecord ? (isMobile ? 'Editar' : 'Editar Registro de Asistencia') : (isMobile ? 'Nuevo Registro' : 'Nuevo Registro de Asistencia')}
        open={isRecordModalVisible}
        onCancel={() => {
          setIsRecordModalVisible(false);
          setSelectedRecord(null);
          form.resetFields();
        }}
        footer={null}
        width={isMobile ? '95vw' : 600}
        style={{ top: isMobile ? 20 : undefined }}
        bodyStyle={{ padding: isMobile ? '16px' : '24px' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={selectedRecord ? handleUpdateRecord : handleCreateRecord}
        >
          {!selectedRecord && (
            <Form.Item
              name="studentId"
              label="Estudiante"
              rules={[{ required: true, message: 'Selecciona un estudiante' }]}
            >
              <Select 
                placeholder="Seleccionar estudiante"
                showSearch
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {availableStudents.map(student => {
                  const profile = student.user?.profile;
                  const firstName = profile?.firstName || '';
                  const lastName = profile?.lastName || '';
                  const enrollmentNumber = student.enrollmentNumber || '';
                  
                  return (
                    <Option key={student.id} value={student.id}>
                      {firstName} {lastName} ({enrollmentNumber})
                    </Option>
                  );
                })}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="status"
            label="Estado de Asistencia"
            rules={[{ required: true, message: 'Selecciona el estado' }]}
          >
            <Select placeholder="Seleccionar estado">
              <Option value={AttendanceStatus.PRESENT}>Presente</Option>
              <Option value={AttendanceStatus.ABSENT}>Ausente</Option>
              <Option value={AttendanceStatus.LATE}>Tardanza</Option>
              <Option value={AttendanceStatus.JUSTIFIED_LATE}>Retraso Justificado</Option>
              <Option value={AttendanceStatus.EARLY_DEPARTURE}>Salida Anticipada</Option>
              <Option value={AttendanceStatus.JUSTIFIED_ABSENCE}>Falta Justificada</Option>
            </Select>
          </Form.Item>

          <Form.Item name="justification" label="Justificación">
            <TextArea rows={3} placeholder="Opcional: agregar justificación" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="arrivalTime" label="Hora de Llegada">
                <DatePicker.TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departureTime" label="Hora de Salida">
                <DatePicker.TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {selectedRecord ? 'Actualizar' : 'Crear'} Registro
              </Button>
              <Button onClick={() => {
                setIsRecordModalVisible(false);
                setSelectedRecord(null);
                form.resetFields();
              }}>
                Cancelar
              </Button>
              {selectedRecord && (
                <Popconfirm
                  title="¿Eliminar este registro?"
                  description="El estudiante quedará sin marcar para esta fecha"
                  onConfirm={async () => {
                    try {
                      await apiClient.delete(`/attendance/records/${selectedRecord.id}`);
                      message.success('Registro eliminado exitosamente');
                      setIsRecordModalVisible(false);
                      setSelectedRecord(null);
                      form.resetFields();
                      loadAttendanceData();
                    } catch (error: any) {
                      console.error('Error deleting record:', error);
                      message.error(error.response?.data?.message || 'Error al eliminar registro');
                    }
                  }}
                  okText="Sí, eliminar"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button danger icon={<MinusCircleOutlined />}>
                    Eliminar Registro
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal para revisar solicitud */}
      <Modal
        title={isMobile ? 'Revisar Solicitud' : 'Revisar Solicitud de Justificación'}
        open={isRequestModalVisible}
        onCancel={() => {
          setIsRequestModalVisible(false);
          setSelectedRequest(null);
          reviewForm.resetFields();
        }}
        footer={null}
        width={isMobile ? '95vw' : 600}
        style={{ top: isMobile ? 20 : undefined }}
        bodyStyle={{ padding: isMobile ? '16px' : '24px' }}
      >
        {selectedRequest && (
          <div className="mb-4">
            <Alert
              message="Información de la Solicitud"
              description={
                <div>
                  <p><strong>Estudiante:</strong> {(() => {
                    const profile = selectedRequest.student?.user?.profile;
                    const firstName = profile?.firstName || '';
                    const lastName = profile?.lastName || '';
                    return `${firstName} ${lastName}`.trim() || 'Sin nombre';
                  })()}</p>
                  <p><strong>Tipo:</strong> {getRequestTypeText(selectedRequest.type)}</p>
                  <p><strong>Fecha:</strong> {dayjs(selectedRequest.date).format('DD/MM/YYYY')}</p>
                  <p><strong>Motivo:</strong> {selectedRequest.reason}</p>
                  {selectedRequest.expectedArrivalTime && (
                    <p><strong>Hora Estimada de Llegada:</strong> {selectedRequest.expectedArrivalTime}</p>
                  )}
                  {selectedRequest.expectedDepartureTime && (
                    <p><strong>Hora Estimada de Salida:</strong> {selectedRequest.expectedDepartureTime}</p>
                  )}
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        )}
        
        <Form
          form={reviewForm}
          layout="vertical"
          onFinish={handleReviewRequest}
        >
          <Form.Item
            name="status"
            label="Decisión"
            rules={[{ required: true, message: 'Selecciona una decisión' }]}
          >
            <Select placeholder="Aprobar o rechazar">
              <Option value={AttendanceRequestStatus.APPROVED}>Aprobar</Option>
              <Option value={AttendanceRequestStatus.REJECTED}>Rechazar</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="reviewNote"
            label="Nota de Revisión (Opcional)"
          >
            <TextArea
              rows={4}
              placeholder="Opcional: agregar comentarios adicionales..."
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                Enviar Revisión
              </Button>
              <Button onClick={() => {
                setIsRequestModalVisible(false);
                setSelectedRequest(null);
                reviewForm.resetFields();
              }}>
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal de detalles de asistencia */}
      {selectedStudentForDetails && (
        <AttendanceDetailsModal
          visible={isDetailsModalVisible}
          onClose={handleCloseDetailsModal}
          studentId={selectedStudentForDetails.id}
          studentName={selectedStudentForDetails.name}
          filterType={selectedAttendanceFilter}
          initialDateRange={[
            dayjs().subtract(1, 'month').format('YYYY-MM-DD'),
            dayjs().format('YYYY-MM-DD')
          ]}
        />
      )}

      {/* Modal de estadísticas individuales */}
      {selectedStudentForStats && (
        <AttendanceStatsModal
          visible={isStatsModalVisible}
          onClose={handleCloseStatsModal}
          studentId={selectedStudentForStats.id}
          studentName={selectedStudentForStats.name}
          days={30}
        />
      )}

      {/* Modal de estadísticas grupales */}
      {selectedGroup && !isAcademiaGroup && (
        <GroupAttendanceStatsModal
          visible={isGroupStatsModalVisible}
          onClose={handleCloseGroupStatsModal}
          classGroupId={selectedGroup}
          classGroupName={selectedGroupName}
          startDate={dayjs().subtract(1, 'month').format('YYYY-MM-DD')}
          endDate={dayjs().format('YYYY-MM-DD')}
        />
      )}
    </div>
  );
};

export default AttendancePage;