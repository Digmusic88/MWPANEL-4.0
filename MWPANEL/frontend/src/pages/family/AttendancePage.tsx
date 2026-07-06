import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  TimePicker,
  Input,
  message,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Empty,
  Tooltip,
  Alert,
} from 'antd';
import AcademicYearSelector from '@components/common/AcademicYearSelector';
import {
  PlusOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../services/apiClient';
import {
  AttendanceRequest,
  AttendanceRecord,
  AttendanceRequestType,
  AttendanceRequestStatus,
  AttendanceStatus,
  CreateAttendanceRequestDto,
} from '../../types/attendance';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Student {
  id: string;
  enrollmentNumber: string;
  user: {
    profile: {
      firstName: string;
      lastName: string;
    };
  };
}

const AttendancePage: React.FC = () => {
  const { } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<string | undefined>(undefined);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceRequest[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Cargar estudiantes relacionados con la familia
  useEffect(() => {
    loadStudents();
  }, []);

  // Cargar registros cuando se selecciona un estudiante o cambia el año
  useEffect(() => {
    if (selectedStudent) {
      loadAttendanceData(selectedStudent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent, selectedYearId]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      // Usar endpoint específico para estudiantes de la familia (seguro)
      const response = await apiClient.get('/attendance/family/my-children');
      // Transformar el formato de respuesta para mantener compatibilidad
      const transformedStudents = response.data.map((child: any) => ({
        id: child.id,
        enrollmentNumber: '', // No disponible en el nuevo endpoint
        user: {
          profile: {
            firstName: child.firstName,
            lastName: child.lastName,
          }
        }
      }));
      setStudents(transformedStudents);
      
      if (transformedStudents.length > 0) {
        setSelectedStudent(transformedStudents[0].id);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      message.error('Error al cargar estudiantes');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = async (studentId: string) => {
    try {
      setLoading(true);
      
      // Cargar registros de asistencia del último mes
      const endDate = dayjs().format('YYYY-MM-DD');
      const startDate = dayjs().subtract(1, 'month').format('YYYY-MM-DD');
      
      const attendanceQuery = selectedYearId
        ? `?academicYearId=${selectedYearId}`
        : `?startDate=${startDate}&endDate=${endDate}`;
      const [recordsResponse, requestsResponse] = await Promise.all([
        apiClient.get(`/attendance/family/child/${studentId}/attendance${attendanceQuery}`),
        apiClient.get(`/attendance/family/child/${studentId}/requests`)
      ]);
      
      setAttendanceRecords(recordsResponse.data);
      setAttendanceRequests(requestsResponse.data);
    } catch (error) {
      console.error('Error loading attendance data:', error);
      message.error('Error al cargar datos de asistencia');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (values: any) => {
    try {
      const requestData: CreateAttendanceRequestDto = {
        studentId: selectedStudent!,
        type: values.type,
        date: values.date.format('YYYY-MM-DD'),
        reason: values.reason,
        expectedArrivalTime: values.expectedArrivalTime?.format('HH:mm'),
        expectedDepartureTime: values.expectedDepartureTime?.format('HH:mm'),
      };

      await apiClient.post('/attendance/requests', requestData);
      message.success('Solicitud de asistencia creada exitosamente');
      
      setIsModalVisible(false);
      form.resetFields();
      
      // Recargar datos
      if (selectedStudent) {
        loadAttendanceData(selectedStudent);
      }
    } catch (error: any) {
      console.error('Error creating attendance request:', error);
      message.error(error.response?.data?.message || 'Error al crear solicitud');
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
      case AttendanceStatus.EARLY_DEPARTURE:
        return 'Salida Anticipada';
      case AttendanceStatus.JUSTIFIED_ABSENCE:
        return 'Falta Justificada';
      default:
        return status;
    }
  };

  const getRequestStatusIcon = (status: AttendanceRequestStatus) => {
    switch (status) {
      case AttendanceRequestStatus.PENDING:
        return <SyncOutlined spin />;
      case AttendanceRequestStatus.APPROVED:
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case AttendanceRequestStatus.REJECTED:
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <ExclamationCircleOutlined />;
    }
  };

  const getRequestStatusColor = (status: AttendanceRequestStatus) => {
    switch (status) {
      case AttendanceRequestStatus.PENDING:
        return 'processing';
      case AttendanceRequestStatus.APPROVED:
        return 'success';
      case AttendanceRequestStatus.REJECTED:
        return 'error';
      case AttendanceRequestStatus.CANCELLED:
        return 'default';
      default:
        return 'default';
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

  const recordsColumns = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a: AttendanceRecord, b: AttendanceRecord) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: AttendanceStatus) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: 'Justificación',
      dataIndex: 'justification',
      key: 'justification',
      render: (justification: string) => justification || '-',
    },
    {
      title: 'Hora Llegada',
      dataIndex: 'arrivalTime',
      key: 'arrivalTime',
      render: (time: string) => time || '-',
    },
    {
      title: 'Hora Salida',
      dataIndex: 'departureTime',
      key: 'departureTime',
      render: (time: string) => time || '-',
    },
  ];

  const requestsColumns = [
    {
      title: 'Fecha',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a: AttendanceRequest, b: AttendanceRequest) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: AttendanceRequestType) => getRequestTypeText(type),
    },
    {
      title: 'Motivo',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: {
        showTitle: false,
      },
      render: (reason: string) => (
        <Tooltip placement="topLeft" title={reason}>
          {reason}
        </Tooltip>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: AttendanceRequestStatus) => (
        <Space>
          {getRequestStatusIcon(status)}
          <Tag color={getRequestStatusColor(status)}>
            {status === AttendanceRequestStatus.PENDING ? 'Pendiente' :
             status === AttendanceRequestStatus.APPROVED ? 'Aprobada' :
             status === AttendanceRequestStatus.REJECTED ? 'Rechazada' : 'Cancelada'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Nota de Revisión',
      dataIndex: 'reviewNote',
      key: 'reviewNote',
      render: (note: string) => note || '-',
    },
    {
      title: 'Fecha Creación',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
  ];


  return (
    <div className="p-6">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div className="flex justify-between items-center">
                <div>
                  <Title level={2}>
                    <CalendarOutlined className="mr-2" />
                    Control de Asistencia
                  </Title>
                  <Text type="secondary">
                    Consulta la asistencia y envía solicitudes de justificación
                  </Text>
                </div>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  size="large"
                  style={{
                    height: '44px',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: '500'
                  }}
                  onClick={() => setIsModalVisible(true)}
                  disabled={!selectedStudent}
                >
                  Nueva Solicitud
                </Button>
              </div>

              {students.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <Text strong style={{ display: 'block', marginBottom: '8px' }}>
                    Estudiante:
                  </Text>
                  <Select
                    style={{
                      width: '100%',
                      minWidth: '200px'
                    }}
                    size="large"
                    value={selectedStudent}
                    onChange={(v) => { setSelectedStudent(v); setSelectedYearId(undefined); }}
                    placeholder="Seleccionar estudiante"
                    dropdownStyle={{
                      fontSize: '16px'
                    }}
                  >
                    {students.map(student => (
                      <Option key={student.id} value={student.id}>
                        <div style={{
                          padding: '4px 0',
                          fontSize: '16px'
                        }}>
                          {student.user.profile.firstName} {student.user.profile.lastName}
                        </div>
                      </Option>
                    ))}
                  </Select>
                  {selectedStudent && (
                    <AcademicYearSelector
                      key={selectedStudent}
                      studentId={selectedStudent}
                      value={selectedYearId}
                      onChange={setSelectedYearId}
                    />
                  )}
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {selectedStudent && (
          <>
            <Col span={24}>
              <Card title="Solicitudes de Justificación" loading={loading}>
                {attendanceRequests.length > 0 ? (
                  <Table
                    columns={requestsColumns}
                    dataSource={attendanceRequests}
                    rowKey="id"
                    pagination={{
                      pageSize: window.innerWidth < 768 ? 5 : 10,
                      showSizeChanger: false,
                      showQuickJumper: false,
                      simple: window.innerWidth < 768
                    }}
                    scroll={{
                      x: 'max-content',
                      scrollToFirstRowOnChange: true
                    }}
                    size={window.innerWidth < 768 ? 'small' : 'middle'}
                    style={{
                      marginTop: '12px'
                    }}
                  />
                ) : (
                  <Empty description="No hay solicitudes de justificación" />
                )}
              </Card>
            </Col>

            <Col span={24}>
              <Card title="Historial de Asistencia" loading={loading}>
                {attendanceRecords.length > 0 ? (
                  <Table
                    columns={recordsColumns}
                    dataSource={attendanceRecords}
                    rowKey="id"
                    pagination={{
                      pageSize: window.innerWidth < 768 ? 5 : 10,
                      showSizeChanger: false,
                      showQuickJumper: false,
                      simple: window.innerWidth < 768
                    }}
                    scroll={{
                      x: 'max-content',
                      scrollToFirstRowOnChange: true
                    }}
                    size={window.innerWidth < 768 ? 'small' : 'middle'}
                    style={{
                      marginTop: '12px'
                    }}
                  />
                ) : (
                  <Empty description="No hay registros de asistencia" />
                )}
              </Card>
            </Col>
          </>
        )}
      </Row>

      <Modal
        title="Nueva Solicitud de Justificación"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={window.innerWidth < 768 ? '95%' : 600}
        style={{
          top: window.innerWidth < 768 ? 20 : undefined
        }}
        bodyStyle={{
          padding: window.innerWidth < 768 ? '16px' : '24px'
        }}
      >
        <Alert
          message="Información"
          description="Las solicitudes deben tener un mínimo de 10 caracteres en el motivo y serán revisadas por el profesor."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateRequest}
          style={{ marginTop: '16px' }}
        >
          <Form.Item
            name="type"
            label={
              <Text strong style={{ fontSize: '15px' }}>
                Tipo de Solicitud
              </Text>
            }
            rules={[{ required: true, message: 'Selecciona el tipo de solicitud' }]}
          >
            <Select
              placeholder="Seleccionar tipo"
              size="large"
              style={{
                fontSize: '16px'
              }}
              dropdownStyle={{
                fontSize: '16px'
              }}
            >
              <Option value={AttendanceRequestType.ABSENCE}>
                <div style={{ padding: '4px 0', fontSize: '16px' }}>Ausencia</div>
              </Option>
              <Option value={AttendanceRequestType.LATE_ARRIVAL}>
                <div style={{ padding: '4px 0', fontSize: '16px' }}>Llegada Tardía</div>
              </Option>
              <Option value={AttendanceRequestType.EARLY_DEPARTURE}>
                <div style={{ padding: '4px 0', fontSize: '16px' }}>Salida Anticipada</div>
              </Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="date"
            label={
              <Text strong style={{ fontSize: '15px' }}>
                Fecha
              </Text>
            }
            rules={[{ required: true, message: 'Selecciona la fecha' }]}
          >
            <DatePicker
              style={{
                width: '100%',
                fontSize: '16px'
              }}
              size="large"
              format="DD/MM/YYYY"
              disabledDate={(current) => {
                // No permitir fechas muy pasadas (más de 7 días) o muy futuras (más de 30 días)
                const today = dayjs();
                return current < today.subtract(7, 'day') || current > today.add(30, 'day');
              }}
            />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.type !== currentValues.type}
          >
            {({ getFieldValue }) => {
              const type = getFieldValue('type');
              return (
                <>
                  {type === AttendanceRequestType.LATE_ARRIVAL && (
                    <Form.Item
                      name="expectedArrivalTime"
                      label={
                        <Text strong style={{ fontSize: '15px' }}>
                          Hora Estimada de Llegada
                        </Text>
                      }
                    >
                      <TimePicker
                        style={{ width: '100%' }}
                        size="large"
                        format="HH:mm"
                        placeholder="Seleccionar hora"
                        inputReadOnly
                      />
                    </Form.Item>
                  )}

                  {type === AttendanceRequestType.EARLY_DEPARTURE && (
                    <Form.Item
                      name="expectedDepartureTime"
                      label={
                        <Text strong style={{ fontSize: '15px' }}>
                          Hora Estimada de Salida
                        </Text>
                      }
                    >
                      <TimePicker
                        style={{ width: '100%' }}
                        size="large"
                        format="HH:mm"
                        placeholder="Seleccionar hora"
                        inputReadOnly
                      />
                    </Form.Item>
                  )}
                </>
              );
            }}
          </Form.Item>

          <Form.Item
            name="reason"
            label={
              <Text strong style={{ fontSize: '15px' }}>
                Motivo de la Solicitud
              </Text>
            }
            rules={[
              { required: true, message: 'Ingresa el motivo' },
              { min: 10, message: 'El motivo debe tener al menos 10 caracteres' }
            ]}
          >
            <TextArea
              rows={window.innerWidth < 768 ? 3 : 4}
              placeholder="Describe el motivo de la solicitud (mínimo 10 caracteres)"
              showCount
              maxLength={500}
              style={{
                fontSize: '16px',
                lineHeight: '1.5'
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: '24px', marginBottom: '0' }}>
            <Space style={{ width: '100%' }} direction={window.innerWidth < 768 ? 'vertical' : 'horizontal'}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                style={{
                  width: window.innerWidth < 768 ? '100%' : 'auto',
                  height: '44px',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '500'
                }}
              >
                Enviar Solicitud
              </Button>
              <Button
                onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                }}
                size="large"
                style={{
                  width: window.innerWidth < 768 ? '100%' : 'auto',
                  height: '44px',
                  borderRadius: '8px',
                  fontSize: '15px'
                }}
              >
                Cancelar
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AttendancePage;