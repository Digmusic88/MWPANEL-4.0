/**
 * @componente: AccommodationSystem
 * @módulo: DUA (Diseño Universal para el Aprendizaje)
 * @función: Sistema completo de gestión de acomodaciones DUA
 * @crítico: SÍ - Sistema de accesibilidad educativa
 * @dependencias: duaService, useAccommodations hooks, Ant Design
 * @relacionado_con: DuaProfileManager, LearningSituations, FormativeEvaluation
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Tabs,
  Timeline,
  Progress,
  Statistic,
  Alert,
  Tooltip,
  Badge,
  Avatar,
  Dropdown,
  Menu,
  Divider,
  notification,
  Popconfirm,
  Steps,
  Checkbox,
  InputNumber,
  Upload,
  List,
  Empty,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SendOutlined,
  FileTextOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
  StarOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  CopyOutlined,
  HistoryOutlined,
  BulbOutlined,
  SoundOutlined,
  EyeInvisibleOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import { useDuaAccommodations, useCreateDuaAccommodation, useUpdateDuaAccommodation, useApproveAccommodation, useRejectAccommodation, useAccommodationTemplates, useEffectivenessRecords, useCreateEffectiveness } from '../../hooks/useDua';
import { useDuaProfiles } from '../../hooks/useDua';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;
const { RangePicker } = DatePicker;

// Tipos de acomodación
const ACCOMMODATION_TYPES = {
  PRESENTATION: { label: 'Presentación', color: 'blue', icon: <EyeOutlined /> },
  RESPONSE: { label: 'Respuesta', color: 'green', icon: <EditOutlined /> },
  SETTING: { label: 'Entorno', color: 'orange', icon: <SettingOutlined /> },
  TIMING: { label: 'Tiempo', color: 'purple', icon: <ClockCircleOutlined /> },
  SCHEDULING: { label: 'Programación', color: 'cyan', icon: <CalendarOutlined /> },
  ORGANIZATION: { label: 'Organización', color: 'magenta', icon: <ToolOutlined /> },
  ASSISTIVE_TECHNOLOGY: { label: 'Tecnología Asistiva', color: 'gold', icon: <BulbOutlined /> },
};

// Estados de acomodación
const ACCOMMODATION_STATUS = {
  DRAFT: { label: 'Borrador', color: 'default' },
  PENDING_APPROVAL: { label: 'Pendiente Aprobación', color: 'processing' },
  APPROVED: { label: 'Aprobada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
  ACTIVE: { label: 'Activa', color: 'success' },
  SUSPENDED: { label: 'Suspendida', color: 'warning' },
  EXPIRED: { label: 'Expirada', color: 'default' },
};

// Niveles de efectividad
const EFFECTIVENESS_RATINGS = {
  1: { label: 'Muy Inefectiva', color: '#C43030' },
  2: { label: 'Inefectiva', color: '#fa8c16' },
  3: { label: 'Neutral', color: '#fadb14' },
  4: { label: 'Efectiva', color: '#2E7D52' },
  5: { label: 'Muy Efectiva', color: '#579172' },
};

interface AccommodationSystemProps {
  duaProfileId?: string;
  mode?: 'full' | 'compact';
}

const AccommodationSystem: React.FC<AccommodationSystemProps> = ({
  duaProfileId,
  mode = 'full',
}) => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('accommodations');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | 'effectiveness' | 'history'>('create');
  const [selectedAccommodation, setSelectedAccommodation] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [filters, setFilters] = useState<any>({
    duaProfileId,
    page: 1,
    limit: 10,
  });
  const [form] = Form.useForm();
  const [effectivenessForm] = Form.useForm();

  // Hooks de datos
  const { data: accommodationsData, isLoading: loadingAccommodations, refetch: refetchAccommodations } = useDuaAccommodations(filters);
  const { data: templatesData, isLoading: loadingTemplates } = useAccommodationTemplates();
  const { data: effectivenessData, isLoading: loadingEffectiveness } = useEffectivenessRecords({ 
    accommodationId: selectedAccommodation?.id 
  });
  const { data: duaProfiles } = useDuaProfiles({ limit: 100 });

  // Mutations
  const createAccommodation = useCreateDuaAccommodation();
  const updateAccommodation = useUpdateDuaAccommodation();
  const approveAccommodation = useApproveAccommodation();
  const rejectAccommodation = useRejectAccommodation();
  const createEffectiveness = useCreateEffectiveness();

  // Pasos del wizard de creación
  const accommodationSteps = [
    {
      title: 'Información Básica',
      icon: <InfoCircleOutlined />,
      description: 'Datos generales de la acomodación',
    },
    {
      title: 'Detalles Específicos',
      icon: <ToolOutlined />,
      description: 'Configuración según tipo',
    },
    {
      title: 'Aplicación',
      icon: <CalendarOutlined />,
      description: 'Dónde y cuándo aplicar',
    },
    {
      title: 'Justificación',
      icon: <FileTextOutlined />,
      description: 'Razones y resultados esperados',
    },
    {
      title: 'Revisión',
      icon: <CheckCircleOutlined />,
      description: 'Confirmar información',
    },
  ];

  // Estadísticas de acomodaciones
  const stats = useMemo(() => {
    if (!accommodationsData?.data) return null;

    const active = accommodationsData.data.filter((a: any) => a.status === 'ACTIVE').length;
    const pending = accommodationsData.data.filter((a: any) => a.status === 'PENDING_APPROVAL').length;
    const avgEffectiveness = accommodationsData.data
      .filter((a: any) => a.effectivenessRecords?.length > 0)
      .reduce((acc: number, a: any) => {
        const avg = a.effectivenessRecords.reduce((sum: number, e: any) => sum + e.overallRating, 0) / a.effectivenessRecords.length;
        return acc + avg;
      }, 0) / accommodationsData.data.filter((a: any) => a.effectivenessRecords?.length > 0).length || 0;

    return {
      total: accommodationsData.total,
      active,
      pending,
      avgEffectiveness,
    };
  }, [accommodationsData]);

  // Abrir modal de creación
  const handleCreate = () => {
    setModalMode('create');
    setSelectedAccommodation(null);
    setCurrentStep(0);
    setIsModalVisible(true);
    form.resetFields();
  };

  // Abrir modal de edición
  const handleEdit = (accommodation: any) => {
    setModalMode('edit');
    setSelectedAccommodation(accommodation);
    setCurrentStep(0);
    setIsModalVisible(true);
    form.setFieldsValue({
      ...accommodation,
      dateRange: accommodation.startDate && accommodation.endDate
        ? [dayjs(accommodation.startDate), dayjs(accommodation.endDate)]
        : undefined,
    });
  };

  // Ver detalles
  const handleView = (accommodation: any) => {
    setModalMode('view');
    setSelectedAccommodation(accommodation);
    setIsModalVisible(true);
  };

  // Ver historial
  const handleViewHistory = (accommodation: any) => {
    setModalMode('history');
    setSelectedAccommodation(accommodation);
    setIsModalVisible(true);
  };

  // Evaluar efectividad
  const handleEvaluateEffectiveness = (accommodation: any) => {
    setModalMode('effectiveness');
    setSelectedAccommodation(accommodation);
    setIsModalVisible(true);
    effectivenessForm.resetFields();
  };

  // Crear desde plantilla
  const handleCreateFromTemplate = (template: any) => {
    setModalMode('create');
    setSelectedAccommodation(null);
    setCurrentStep(0);
    setIsModalVisible(true);
    form.setFieldsValue({
      name: `${template.name} - Copia`,
      description: template.description,
      type: template.type,
      details: template.details,
      applicableSubjects: template.applicableSubjects,
      applicableActivities: template.applicableActivities,
      justification: template.justification,
      expectedOutcomes: template.expectedOutcomes,
    });
  };

  // Guardar acomodación
  const handleSaveAccommodation = async () => {
    try {
      const values = await form.validateFields();
      
      // Procesar fechas
      if (values.dateRange) {
        values.startDate = values.dateRange[0].format('YYYY-MM-DD');
        values.endDate = values.dateRange[1].format('YYYY-MM-DD');
        delete values.dateRange;
      }

      // Agregar duaProfileId si no está presente
      if (!values.duaProfileId && duaProfileId) {
        values.duaProfileId = duaProfileId;
      }

      if (modalMode === 'create') {
        await createAccommodation.mutateAsync(values);
        notification.success({
          message: 'Acomodación creada',
          description: 'La acomodación se ha creado exitosamente',
        });
      } else if (modalMode === 'edit' && selectedAccommodation) {
        await updateAccommodation.mutateAsync({
          id: selectedAccommodation.id,
          data: values,
        });
        notification.success({
          message: 'Acomodación actualizada',
          description: 'Los cambios se han guardado exitosamente',
        });
      }

      setIsModalVisible(false);
      refetchAccommodations();
    } catch (error) {
      console.error('Error saving accommodation:', error);
      
      // Mejorar feedback de validación para el usuario
      if (error.errorFields && error.errorFields.length > 0) {
        const missingFields = error.errorFields.map(field => field.name[0]).join(', ');
        notification.error({
          message: 'Faltan campos requeridos',
          description: `Por favor complete los siguientes campos: ${missingFields}`,
          duration: 6,
        });
        
        // Navegar al primer paso si hay errores en campos básicos
        const basicFields = ['name', 'type', 'description'];
        const hasBasicFieldErrors = error.errorFields.some(field => 
          basicFields.includes(field.name[0])
        );
        if (hasBasicFieldErrors && currentStep !== 0) {
          setCurrentStep(0);
        }
      } else {
        notification.error({
          message: 'Error al guardar',
          description: 'Ha ocurrido un error. Verifique que todos los campos requeridos estén completos.',
        });
      }
    }
  };

  // Guardar evaluación de efectividad
  const handleSaveEffectiveness = async () => {
    try {
      const values = await effectivenessForm.validateFields();
      
      await createEffectiveness.mutateAsync({
        ...values,
        accommodationId: selectedAccommodation.id,
        studentId: selectedAccommodation.duaProfile.student.id,
        evaluationDate: values.evaluationDate.format('YYYY-MM-DD'),
      });

      notification.success({
        message: 'Evaluación registrada',
        description: 'La evaluación de efectividad se ha registrado exitosamente',
      });

      setIsModalVisible(false);
      refetchAccommodations();
    } catch (error) {
      console.error('Error saving effectiveness:', error);
    }
  };

  // Aprobar acomodación
  const handleApprove = async (accommodationId: string) => {
    Modal.confirm({
      title: '¿Aprobar esta acomodación?',
      content: (
        <Form layout="vertical">
          <Form.Item label="Comentarios de aprobación" name="comments" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Ingrese sus comentarios..." />
          </Form.Item>
        </Form>
      ),
      onOk: async () => {
        const comments = form.getFieldValue('comments');
        await approveAccommodation.mutateAsync({
          id: accommodationId,
          data: { comments },
        });
        refetchAccommodations();
      },
    });
  };

  // Rechazar acomodación
  const handleReject = async (accommodationId: string) => {
    Modal.confirm({
      title: '¿Rechazar esta acomodación?',
      content: (
        <Form layout="vertical">
          <Form.Item label="Razón del rechazo" name="reason" rules={[{ required: true, min: 20 }]}>
            <TextArea rows={4} placeholder="Explique las razones del rechazo..." />
          </Form.Item>
          <Form.Item label="Sugerencias (opcional)" name="suggestions">
            <TextArea rows={3} placeholder="Sugerencias para mejorar la propuesta..." />
          </Form.Item>
        </Form>
      ),
      onOk: async () => {
        const { reason, suggestions } = form.getFieldsValue();
        await rejectAccommodation.mutateAsync({
          id: accommodationId,
          data: { reason, suggestions: suggestions ? [suggestions] : [] },
        });
        refetchAccommodations();
      },
    });
  };

  // Columnas de la tabla de acomodaciones
  const accommodationColumns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <Space>
          {ACCOMMODATION_TYPES[record.type as keyof typeof ACCOMMODATION_TYPES]?.icon}
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 150,
      render: (type: string) => {
        const typeInfo = ACCOMMODATION_TYPES[type as keyof typeof ACCOMMODATION_TYPES];
        return <Tag color={typeInfo?.color}>{typeInfo?.label}</Tag>;
      },
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => {
        const statusInfo = ACCOMMODATION_STATUS[status as keyof typeof ACCOMMODATION_STATUS];
        return <Badge status={statusInfo?.color as any} text={statusInfo?.label} />;
      },
    },
    {
      title: 'Estudiante',
      dataIndex: ['duaProfile', 'student'],
      key: 'student',
      render: (student: any) => (
        <Space>
          <Avatar size="small" icon={<TeamOutlined />} />
          <Text>{student?.user?.profile?.firstName} {student?.user?.profile?.lastName}</Text>
        </Space>
      ),
    },
    {
      title: 'Efectividad',
      key: 'effectiveness',
      width: 120,
      render: (record: any) => {
        if (!record.effectivenessRecords || record.effectivenessRecords.length === 0) {
          return <Text type="secondary">Sin evaluar</Text>;
        }
        const avgRating = record.effectivenessRecords.reduce((sum: number, e: any) => sum + e.overallRating, 0) / record.effectivenessRecords.length;
        const ratingInfo = EFFECTIVENESS_RATINGS[Math.round(avgRating) as keyof typeof EFFECTIVENESS_RATINGS];
        return (
          <Tooltip title={`Promedio: ${avgRating.toFixed(1)}/5`}>
            <Tag color={ratingInfo?.color}>{ratingInfo?.label}</Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Vigencia',
      key: 'validity',
      width: 150,
      render: (record: any) => {
        if (!record.endDate) return <Text type="secondary">Sin límite</Text>;
        const daysLeft = dayjs(record.endDate).diff(dayjs(), 'days');
        if (daysLeft < 0) return <Tag color="error">Expirada</Tag>;
        if (daysLeft < 30) return <Tag color="warning">{daysLeft} días restantes</Tag>;
        return <Tag color="success">Hasta {dayjs(record.endDate).format('DD/MM/YYYY')}</Tag>;
      },
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 150,
      render: (record: any) => {
        const menu = (
          <Menu>
            <Menu.Item key="view" icon={<EyeOutlined />} onClick={() => handleView(record)}>
              Ver detalles
            </Menu.Item>
            {record.status === 'DRAFT' && (
              <>
                <Menu.Item key="edit" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
                  Editar
                </Menu.Item>
                <Menu.Item key="submit" icon={<SendOutlined />}>
                  Enviar para aprobación
                </Menu.Item>
              </>
            )}
            {record.status === 'PENDING_APPROVAL' && user?.role !== 'STUDENT' && (
              <>
                <Menu.Item key="approve" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record.id)}>
                  Aprobar
                </Menu.Item>
                <Menu.Item key="reject" icon={<CloseCircleOutlined />} onClick={() => handleReject(record.id)}>
                  Rechazar
                </Menu.Item>
              </>
            )}
            {record.status === 'ACTIVE' && (
              <Menu.Item key="effectiveness" icon={<BarChartOutlined />} onClick={() => handleEvaluateEffectiveness(record)}>
                Evaluar efectividad
              </Menu.Item>
            )}
            <Menu.Divider />
            <Menu.Item key="history" icon={<HistoryOutlined />} onClick={() => handleViewHistory(record)}>
              Ver historial
            </Menu.Item>
          </Menu>
        );

        return (
          <Dropdown overlay={menu} trigger={['click']}>
            <Button type="text" icon={<SettingOutlined />} />
          </Dropdown>
        );
      },
    },
  ];

  // Renderizar contenido del paso actual
  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Información básica
        return (
          <div className="space-y-4">
            <Alert
              message="Creación de Acomodación"
              description="Puede crear una acomodación desde cero completando los campos requeridos, o usar una plantilla predefinida desde la pestaña 'Plantillas'. Ambas opciones permiten guardar cambios."
              type="info"
              showIcon
              className="mb-4"
            />
            <Form.Item
              name="name"
              label="Nombre de la acomodación *"
              rules={[{ required: true, message: 'Ingrese el nombre' }]}
            >
              <Input placeholder="Ej: Tiempo extendido para evaluaciones" />
            </Form.Item>

            <Form.Item
              name="type"
              label="Tipo de acomodación *"
              rules={[{ required: true, message: 'Seleccione el tipo' }]}
            >
              <Select placeholder="Seleccione el tipo">
                {Object.entries(ACCOMMODATION_TYPES).map(([key, value]) => (
                  <Option key={key} value={key}>
                    <Space>
                      {value.icon}
                      {value.label}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="description"
              label="Descripción *"
              rules={[{ required: true, message: 'Ingrese la descripción' }]}
            >
              <TextArea rows={4} placeholder="Describa detalladamente la acomodación..." />
            </Form.Item>

            {!duaProfileId && (
              <Form.Item
                name="duaProfileId"
                label="Perfil DUA del estudiante"
                rules={[{ required: true, message: 'Seleccione el estudiante' }]}
              >
                <Select
                  placeholder="Seleccione el estudiante"
                  showSearch
                  optionFilterProp="children"
                >
                  {duaProfiles?.data?.map((profile: any) => (
                    <Option key={profile.id} value={profile.id}>
                      {profile.student?.user?.profile?.firstName} {profile.student?.user?.profile?.lastName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            )}
          </div>
        );

      case 1: // Detalles específicos
        return (
          <div className="space-y-4">
            <Alert
              message="Configure los detalles específicos según el tipo de acomodación"
              type="info"
              showIcon
              className="mb-4"
            />

            <Form.Item shouldUpdate>
              {({ getFieldValue }) => {
                const type = getFieldValue('type');
                
                switch (type) {
                  case 'PRESENTATION':
                    return (
                      <>
                        <Form.Item name={['details', 'presentation', 'largeFont']} valuePropName="checked">
                          <Checkbox>Fuente grande</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'presentation', 'fontSize']} label="Tamaño de fuente">
                          <InputNumber min={12} max={32} placeholder="16" />
                        </Form.Item>
                        <Form.Item name={['details', 'presentation', 'highContrast']} valuePropName="checked">
                          <Checkbox>Alto contraste</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'presentation', 'audioSupport']} valuePropName="checked">
                          <Checkbox>Soporte de audio</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'presentation', 'visualSupports']} valuePropName="checked">
                          <Checkbox>Apoyos visuales</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'presentation', 'simplifiedText']} valuePropName="checked">
                          <Checkbox>Texto simplificado</Checkbox>
                        </Form.Item>
                      </>
                    );

                  case 'RESPONSE':
                    return (
                      <>
                        <Form.Item name={['details', 'response', 'alternativeFormat']} label="Formato alternativo">
                          <Select placeholder="Seleccione formato">
                            <Option value="oral">Oral</Option>
                            <Option value="written">Escrito</Option>
                            <Option value="digital">Digital</Option>
                            <Option value="manipulative">Manipulativo</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name={['details', 'response', 'extraTime']} valuePropName="checked">
                          <Checkbox>Tiempo extra</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'response', 'timeFactor']} label="Factor de tiempo">
                          <Select placeholder="Seleccione factor">
                            <Option value={1.25}>1.25x (25% más)</Option>
                            <Option value={1.5}>1.5x (50% más)</Option>
                            <Option value={2}>2x (100% más)</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name={['details', 'response', 'calculator']} valuePropName="checked">
                          <Checkbox>Permitir calculadora</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'response', 'spellChecker']} valuePropName="checked">
                          <Checkbox>Corrector ortográfico</Checkbox>
                        </Form.Item>
                      </>
                    );

                  case 'SETTING':
                    return (
                      <>
                        <Form.Item name={['details', 'setting', 'preferentialSeating']} valuePropName="checked">
                          <Checkbox>Asiento preferencial</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'setting', 'reducedDistractors']} valuePropName="checked">
                          <Checkbox>Reducir distractores</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'setting', 'separateRoom']} valuePropName="checked">
                          <Checkbox>Sala separada</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'setting', 'smallGroup']} valuePropName="checked">
                          <Checkbox>Grupo pequeño</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'setting', 'quietEnvironment']} valuePropName="checked">
                          <Checkbox>Ambiente tranquilo</Checkbox>
                        </Form.Item>
                      </>
                    );

                  case 'TIMING':
                    return (
                      <>
                        <Form.Item name={['details', 'timing', 'extendedTime']} valuePropName="checked">
                          <Checkbox>Tiempo extendido</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'timing', 'timeMultiplier']} label="Multiplicador de tiempo">
                          <Select placeholder="Seleccione">
                            <Option value={1.25}>1.25x</Option>
                            <Option value={1.5}>1.5x</Option>
                            <Option value={2}>2x</Option>
                            <Option value={3}>3x</Option>
                          </Select>
                        </Form.Item>
                        <Form.Item name={['details', 'timing', 'frequentBreaks']} valuePropName="checked">
                          <Checkbox>Descansos frecuentes</Checkbox>
                        </Form.Item>
                        <Form.Item name={['details', 'timing', 'breakDuration']} label="Duración del descanso (min)">
                          <InputNumber min={5} max={30} placeholder="10" />
                        </Form.Item>
                      </>
                    );

                  default:
                    return <Text type="secondary">Seleccione un tipo de acomodación</Text>;
                }
              }}
            </Form.Item>
          </div>
        );

      case 2: // Aplicación
        return (
          <div className="space-y-4">
            <Form.Item name="dateRange" label="Período de vigencia">
              <RangePicker className="w-full" />
            </Form.Item>

            <Form.Item name="applicableSubjects" label="Asignaturas aplicables">
              <Select mode="tags" placeholder="Todas las asignaturas o especifique">
                <Option value="all">Todas las asignaturas</Option>
                <Option value="mathematics">Matemáticas</Option>
                <Option value="language">Lengua</Option>
                <Option value="science">Ciencias</Option>
                <Option value="social">Sociales</Option>
                <Option value="english">Inglés</Option>
              </Select>
            </Form.Item>

            <Form.Item name="applicableActivities" label="Actividades específicas">
              <Select mode="tags" placeholder="Especifique actividades">
                <Option value="exams">Exámenes</Option>
                <Option value="homework">Tareas</Option>
                <Option value="presentations">Presentaciones</Option>
                <Option value="group_work">Trabajo en grupo</Option>
                <Option value="reading">Lectura</Option>
                <Option value="writing">Escritura</Option>
              </Select>
            </Form.Item>

            <Form.Item name="requiresFamilyConsent" valuePropName="checked">
              <Checkbox>Requiere consentimiento familiar</Checkbox>
            </Form.Item>
          </div>
        );

      case 3: // Justificación
        return (
          <div className="space-y-4">
            <Form.Item
              name="justification"
              label="Justificación pedagógica"
              rules={[{ required: true, min: 50, message: 'Mínimo 50 caracteres' }]}
            >
              <TextArea
                rows={5}
                placeholder="Explique por qué esta acomodación es necesaria para el estudiante..."
                showCount
              />
            </Form.Item>

            <Form.Item
              name="expectedOutcomes"
              label="Resultados esperados"
              rules={[{ required: true }]}
            >
              <TextArea
                rows={4}
                placeholder="Describa los resultados que espera obtener con esta acomodación..."
              />
            </Form.Item>

            <Form.Item name="tags" label="Etiquetas">
              <Select mode="tags" placeholder="Agregue etiquetas para organizar">
                <Option value="urgent">Urgente</Option>
                <Option value="temporary">Temporal</Option>
                <Option value="permanent">Permanente</Option>
                <Option value="evaluation">Evaluación</Option>
                <Option value="classroom">Aula</Option>
              </Select>
            </Form.Item>
          </div>
        );

      case 4: // Revisión
        return (
          <div className="space-y-4">
            <Alert
              message="Revise la información antes de guardar"
              description="Asegúrese de que todos los datos sean correctos"
              type="info"
              showIcon
              className="mb-4"
            />

            <Form.Item shouldUpdate>
              {({ getFieldsValue }) => {
                const values = getFieldsValue();
                return (
                  <Card>
                    <Paragraph>
                      <Text strong>Nombre:</Text> {values.name}
                    </Paragraph>
                    <Paragraph>
                      <Text strong>Tipo:</Text> {ACCOMMODATION_TYPES[values.type as keyof typeof ACCOMMODATION_TYPES]?.label}
                    </Paragraph>
                    <Paragraph>
                      <Text strong>Descripción:</Text> {values.description}
                    </Paragraph>
                    {values.dateRange && (
                      <Paragraph>
                        <Text strong>Vigencia:</Text> {values.dateRange[0]?.format('DD/MM/YYYY')} - {values.dateRange[1]?.format('DD/MM/YYYY')}
                      </Paragraph>
                    )}
                    <Paragraph>
                      <Text strong>Asignaturas:</Text> {values.applicableSubjects?.join(', ') || 'Todas'}
                    </Paragraph>
                    <Divider />
                    <Form.Item name="status" label="Estado inicial">
                      <Select defaultValue="DRAFT">
                        <Option value="DRAFT">Guardar como borrador</Option>
                        <Option value="PENDING_APPROVAL">Enviar para aprobación</Option>
                      </Select>
                    </Form.Item>
                  </Card>
                );
              }}
            </Form.Item>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`accommodation-system ${mode}`}>
      {/* Header con estadísticas */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={6}>
          <Card className="text-center">
            <Statistic
              title="Total Acomodaciones"
              value={stats?.total || 0}
              prefix={<ToolOutlined />}
              valueStyle={{ color: '#579172' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="text-center">
            <Statistic
              title="Activas"
              value={stats?.active || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#2E7D52' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="text-center">
            <Statistic
              title="Pendientes"
              value={stats?.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#B45309' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="text-center">
            <Statistic
              title="Efectividad Promedio"
              value={stats?.avgEffectiveness || 0}
              precision={1}
              suffix="/ 5"
              prefix={<StarOutlined />}
              valueStyle={{ color: '#579172' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Tabs principales */}
      <Card>
        <Tabs activeKey={selectedTab} onChange={setSelectedTab}>
          <TabPane tab="Acomodaciones" key="accommodations">
            <div className="mb-4 flex justify-between">
              <Space>
                <Input.Search
                  placeholder="Buscar acomodaciones..."
                  style={{ width: 300 }}
                  onSearch={(value) => setFilters({ ...filters, search: value })}
                />
                <Select
                  placeholder="Filtrar por tipo"
                  allowClear
                  style={{ width: 200 }}
                  onChange={(value) => setFilters({ ...filters, type: value })}
                >
                  {Object.entries(ACCOMMODATION_TYPES).map(([key, value]) => (
                    <Option key={key} value={key}>{value.label}</Option>
                  ))}
                </Select>
                <Select
                  placeholder="Filtrar por estado"
                  allowClear
                  style={{ width: 200 }}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                >
                  {Object.entries(ACCOMMODATION_STATUS).map(([key, value]) => (
                    <Option key={key} value={key}>{value.label}</Option>
                  ))}
                </Select>
              </Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
                Nueva Acomodación
              </Button>
            </div>

            <Table
              columns={accommodationColumns}
              dataSource={accommodationsData?.data || []}
              rowKey="id"
              loading={loadingAccommodations}
              pagination={{
                current: filters.page,
                pageSize: filters.limit,
                total: accommodationsData?.total || 0,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} acomodaciones`,
                onChange: (page, pageSize) => setFilters({ ...filters, page, limit: pageSize }),
              }}
            />
          </TabPane>

          <TabPane tab="Plantillas" key="templates">
            <Alert
              message="Plantillas Predefinidas (Opcional)"
              description="Las plantillas son opcionales. Puede crear acomodaciones nuevas desde cero usando el botón 'Nueva Acomodación' o usar estas plantillas como punto de partida."
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={[16, 16]}>
              {loadingTemplates ? (
                <Col span={24} className="text-center">
                  <Spin size="large" />
                </Col>
              ) : templatesData?.length === 0 ? (
                <Col span={24}>
                  <Empty description="No hay plantillas disponibles" />
                </Col>
              ) : (
                templatesData?.map((template: any) => (
                  <Col xs={24} sm={12} lg={8} key={template.id}>
                    <Card
                      hoverable
                      actions={[
                        <Button
                          type="text"
                          icon={<CopyOutlined />}
                          onClick={() => handleCreateFromTemplate(template)}
                        >
                          Usar plantilla
                        </Button>,
                        <Badge count={template.timesUsedFromTemplate} showZero>
                          <Text type="secondary">usos</Text>
                        </Badge>,
                      ]}
                    >
                      <Card.Meta
                        avatar={ACCOMMODATION_TYPES[template.type as keyof typeof ACCOMMODATION_TYPES]?.icon}
                        title={template.name}
                        description={template.description}
                      />
                      <div className="mt-3">
                        <Tag color={ACCOMMODATION_TYPES[template.type as keyof typeof ACCOMMODATION_TYPES]?.color}>
                          {ACCOMMODATION_TYPES[template.type as keyof typeof ACCOMMODATION_TYPES]?.label}
                        </Tag>
                      </div>
                    </Card>
                  </Col>
                ))
              )}
            </Row>
          </TabPane>

          <TabPane tab="Workflow" key="workflow">
            <Timeline>
              <Timeline.Item color="blue" dot={<SendOutlined />}>
                <Card size="small">
                  <Title level={5}>Creación y Envío</Title>
                  <Text>El profesor crea la acomodación y la envía para aprobación</Text>
                </Card>
              </Timeline.Item>
              <Timeline.Item color="orange" dot={<TeamOutlined />}>
                <Card size="small">
                  <Title level={5}>Revisión del Coordinador</Title>
                  <Text>El coordinador pedagógico revisa la propuesta</Text>
                </Card>
              </Timeline.Item>
              <Timeline.Item color="purple" dot={<BulbOutlined />}>
                <Card size="small">
                  <Title level={5}>Evaluación del Especialista</Title>
                  <Text>El especialista DUA evalúa la pertinencia técnica</Text>
                </Card>
              </Timeline.Item>
              <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
                <Card size="small">
                  <Title level={5}>Aprobación Final</Title>
                  <Text>La acomodación es aprobada y activada</Text>
                </Card>
              </Timeline.Item>
            </Timeline>
          </TabPane>

          <TabPane tab="Analytics" key="analytics">
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card title="Acomodaciones por Tipo">
                  {/* Aquí iría un gráfico de distribución */}
                  <div className="h-64 flex items-center justify-center bg-gray-50">
                    <Text type="secondary">Gráfico de distribución por tipo</Text>
                  </div>
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card title="Tendencia de Efectividad">
                  {/* Aquí iría un gráfico de tendencia */}
                  <div className="h-64 flex items-center justify-center bg-gray-50">
                    <Text type="secondary">Gráfico de tendencia temporal</Text>
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* Modal de creación/edición */}
      <Modal
        title={
          modalMode === 'create' ? 'Nueva Acomodación' :
          modalMode === 'edit' ? 'Editar Acomodación' :
          modalMode === 'effectiveness' ? 'Evaluar Efectividad' :
          modalMode === 'history' ? 'Historial de Acomodación' :
          'Detalles de Acomodación'
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={
          modalMode === 'view' || modalMode === 'history' ? [
            <Button key="close" onClick={() => setIsModalVisible(false)}>
              Cerrar
            </Button>
          ] : modalMode === 'effectiveness' ? [
            <Button key="cancel" onClick={() => setIsModalVisible(false)}>
              Cancelar
            </Button>,
            <Button key="save" type="primary" onClick={handleSaveEffectiveness}>
              Guardar Evaluación
            </Button>
          ] : [
            <Button key="cancel" onClick={() => setIsModalVisible(false)}>
              Cancelar
            </Button>,
            currentStep > 0 && (
              <Button key="prev" onClick={() => setCurrentStep(currentStep - 1)}>
                Anterior
              </Button>
            ),
            <>
              {currentStep < accommodationSteps.length - 1 ? (
                <Button key="next" type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
                  Siguiente
                </Button>
              ) : null}
              <Button key="save" type="primary" onClick={handleSaveAccommodation}>
                {currentStep === accommodationSteps.length - 1 ? 'Guardar' : 'Guardar Cambios'}
              </Button>
            </>,
          ]
        }
        width={modalMode === 'history' ? 1000 : 800}
      >
        {modalMode === 'effectiveness' ? (
          <Form form={effectivenessForm} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="evaluationDate"
                  label="Fecha de evaluación"
                  rules={[{ required: true }]}
                >
                  <DatePicker className="w-full" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="overallRating"
                  label="Calificación general"
                  rules={[{ required: true }]}
                >
                  <Select placeholder="Seleccione">
                    {Object.entries(EFFECTIVENESS_RATINGS).map(([key, value]) => (
                      <Option key={key} value={parseInt(key)}>
                        <Tag color={value.color}>{value.label}</Tag>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider>Métricas Académicas</Divider>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name={['metrics', 'academicProgress', 'preAccommodationPerformance']}
                  label="Rendimiento previo (%)"
                >
                  <InputNumber min={0} max={100} className="w-full" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['metrics', 'academicProgress', 'postAccommodationPerformance']}
                  label="Rendimiento actual (%)"
                >
                  <InputNumber min={0} max={100} className="w-full" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name={['metrics', 'academicProgress', 'improvementPercentage']}
                  label="Mejora (%)"
                >
                  <InputNumber min={-100} max={100} className="w-full" />
                </Form.Item>
              </Col>
            </Row>

            <Divider>Métricas de Participación</Divider>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name={['metrics', 'participation', 'classEngagement']}
                  label="Participación en clase"
                >
                  <Select placeholder="Seleccione">
                    {Object.entries(EFFECTIVENESS_RATINGS).map(([key, value]) => (
                      <Option key={key} value={parseInt(key)}>{value.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name={['metrics', 'participation', 'taskCompletion']}
                  label="Completación de tareas"
                >
                  <Select placeholder="Seleccione">
                    {Object.entries(EFFECTIVENESS_RATINGS).map(([key, value]) => (
                      <Option key={key} value={parseInt(key)}>{value.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="observations" label="Observaciones">
              <TextArea rows={4} placeholder="Observaciones adicionales..." />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="suggestContinuation" valuePropName="checked">
                  <Checkbox>Recomendar continuación</Checkbox>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="suggestModification" valuePropName="checked">
                  <Checkbox>Sugerir modificaciones</Checkbox>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="modificationSuggestions" label="Sugerencias de modificación">
              <TextArea rows={3} placeholder="Si sugiere modificaciones, descríbalas aquí..." />
            </Form.Item>
          </Form>
        ) : modalMode === 'history' ? (
          // Vista de historial
          <div className="space-y-4">
            <div className="mb-4">
              <Text type="secondary">
                Historial completo de la acomodación "{selectedAccommodation?.name}"
              </Text>
            </div>

            {/* Información básica */}
            <Card size="small" title="Información de la Acomodación">
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong>Tipo:</Text>
                  <br />
                  <Tag color={ACCOMMODATION_TYPES[selectedAccommodation?.type as keyof typeof ACCOMMODATION_TYPES]?.color}>
                    {ACCOMMODATION_TYPES[selectedAccommodation?.type as keyof typeof ACCOMMODATION_TYPES]?.label}
                  </Tag>
                </Col>
                <Col span={8}>
                  <Text strong>Estado Actual:</Text>
                  <br />
                  <Badge 
                    status={ACCOMMODATION_STATUS[selectedAccommodation?.status as keyof typeof ACCOMMODATION_STATUS]?.color as any} 
                    text={ACCOMMODATION_STATUS[selectedAccommodation?.status as keyof typeof ACCOMMODATION_STATUS]?.label} 
                  />
                </Col>
                <Col span={8}>
                  <Text strong>Fecha de Creación:</Text>
                  <br />
                  <Text>{selectedAccommodation?.createdAt ? dayjs(selectedAccommodation.createdAt).format('DD/MM/YYYY HH:mm') : 'N/A'}</Text>
                </Col>
              </Row>
              <Divider />
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Vigencia:</Text>
                  <br />
                  <Text>
                    {selectedAccommodation?.startDate ? dayjs(selectedAccommodation.startDate).format('DD/MM/YYYY') : 'Sin fecha'} - {' '}
                    {selectedAccommodation?.endDate ? dayjs(selectedAccommodation.endDate).format('DD/MM/YYYY') : 'Sin límite'}
                  </Text>
                </Col>
                <Col span={12}>
                  <Text strong>Asignaturas:</Text>
                  <br />
                  <Text>{selectedAccommodation?.applicableSubjects?.join(', ') || 'Todas'}</Text>
                </Col>
              </Row>
            </Card>

            {/* Flujo de Aprobación */}
            {selectedAccommodation?.approvalWorkflow && selectedAccommodation.approvalWorkflow.length > 0 && (
              <Card size="small" title="Flujo de Aprobación">
                <Timeline>
                  {selectedAccommodation.approvalWorkflow.map((step: any, index: number) => (
                    <Timeline.Item
                      key={index}
                      color={step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'gray'}
                      dot={
                        step.status === 'approved' ? <CheckCircleOutlined /> :
                        step.status === 'rejected' ? <CloseCircleOutlined /> :
                        <ClockCircleOutlined />
                      }
                    >
                      <div>
                        <Text strong>{step.level}</Text>
                        <br />
                        <Text type="secondary">
                          {step.status === 'pending' ? 'Pendiente' : 
                           step.approvedAt ? dayjs(step.approvedAt).format('DD/MM/YYYY HH:mm') : 
                           step.rejectedAt ? dayjs(step.rejectedAt).format('DD/MM/YYYY HH:mm') : ''}
                        </Text>
                        {step.comments && (
                          <>
                            <br />
                            <Text italic>"{step.comments}"</Text>
                          </>
                        )}
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            )}

            {/* Historial de Efectividad */}
            <Card size="small" title="Evaluaciones de Efectividad">
              {selectedAccommodation?.effectivenessRecords && selectedAccommodation.effectivenessRecords.length > 0 ? (
                <div>
                  <div className="mb-4">
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic
                          title="Total Evaluaciones"
                          value={selectedAccommodation.effectivenessRecords.length}
                          prefix={<BarChartOutlined />}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Efectividad Promedio"
                          value={
                            selectedAccommodation.effectivenessRecords.reduce((sum: number, e: any) => sum + e.overallRating, 0) / 
                            selectedAccommodation.effectivenessRecords.length
                          }
                          precision={1}
                          suffix="/ 5"
                          prefix={<StarOutlined />}
                          valueStyle={{ 
                            color: selectedAccommodation.effectivenessRecords.reduce((sum: number, e: any) => sum + e.overallRating, 0) / 
                                   selectedAccommodation.effectivenessRecords.length >= 4 ? '#2E7D52' :
                                   selectedAccommodation.effectivenessRecords.reduce((sum: number, e: any) => sum + e.overallRating, 0) /
                                   selectedAccommodation.effectivenessRecords.length >= 3 ? '#B45309' : '#C43030'
                          }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="Última Evaluación"
                          value={dayjs(selectedAccommodation.effectivenessRecords[0].evaluationDate).fromNow()}
                          prefix={<CalendarOutlined />}
                        />
                      </Col>
                    </Row>
                  </div>
                  
                  <Timeline>
                    {selectedAccommodation.effectivenessRecords
                      .sort((a: any, b: any) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime())
                      .map((record: any, index: number) => {
                        const ratingInfo = EFFECTIVENESS_RATINGS[record.overallRating as keyof typeof EFFECTIVENESS_RATINGS];
                        return (
                          <Timeline.Item
                            key={index}
                            dot={
                              <Avatar 
                                size="small" 
                                style={{ backgroundColor: ratingInfo?.color }}
                              >
                                {record.overallRating}
                              </Avatar>
                            }
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <Text strong>{dayjs(record.evaluationDate).format('DD/MM/YYYY')}</Text>
                                <Tag color={ratingInfo?.color}>
                                  {ratingInfo?.label}
                                </Tag>
                              </div>
                              
                              {record.metrics && (
                                <div className="mb-2">
                                  <Text type="secondary">Métricas:</Text>
                                  <br />
                                  {record.metrics.academicProgress && (
                                    <Text>
                                      Rendimiento: {record.metrics.academicProgress.preAccommodationPerformance}% → {record.metrics.academicProgress.postAccommodationPerformance}%
                                      {record.metrics.academicProgress.improvementPercentage && (
                                        <span style={{ 
                                          color: record.metrics.academicProgress.improvementPercentage > 0 ? '#2E7D52' : '#C43030',
                                          marginLeft: 8
                                        }}>
                                          ({record.metrics.academicProgress.improvementPercentage > 0 ? '+' : ''}{record.metrics.academicProgress.improvementPercentage}%)
                                        </span>
                                      )}
                                    </Text>
                                  )}
                                </div>
                              )}
                              
                              {record.observations && (
                                <div className="mb-2">
                                  <Text type="secondary">Observaciones:</Text>
                                  <br />
                                  <Text italic>"{record.observations}"</Text>
                                </div>
                              )}
                              
                              <div className="flex gap-2 flex-wrap">
                                {record.suggestContinuation && (
                                  <Tag color="green" icon={<CheckCircleOutlined />}>
                                    Recomienda continuar
                                  </Tag>
                                )}
                                {record.suggestModification && (
                                  <Tag color="orange" icon={<EditOutlined />}>
                                    Sugiere modificaciones
                                  </Tag>
                                )}
                              </div>
                              
                              {record.modificationSuggestions && (
                                <div className="mt-2">
                                  <Text type="secondary">Sugerencias:</Text>
                                  <br />
                                  <Text italic>"{record.modificationSuggestions}"</Text>
                                </div>
                              )}
                            </div>
                          </Timeline.Item>
                        );
                      })}
                  </Timeline>
                </div>
              ) : (
                <Empty 
                  description="No hay evaluaciones de efectividad registradas"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                >
                  <Button 
                    type="primary" 
                    icon={<BarChartOutlined />}
                    onClick={() => {
                      setIsModalVisible(false);
                      setTimeout(() => handleEvaluateEffectiveness(selectedAccommodation), 100);
                    }}
                  >
                    Realizar Primera Evaluación
                  </Button>
                </Empty>
              )}
            </Card>

            {/* Información adicional del historial */}
            <Card size="small" title="Información Adicional">
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Creado por:</Text>
                  <br />
                  <Text>{selectedAccommodation?.requestedBy?.profile?.firstName} {selectedAccommodation?.requestedBy?.profile?.lastName || 'Usuario no especificado'}</Text>
                </Col>
                <Col span={12}>
                  <Text strong>Última modificación:</Text>
                  <br />
                  <Text>
                    {selectedAccommodation?.updatedAt ? 
                      dayjs(selectedAccommodation.updatedAt).format('DD/MM/YYYY HH:mm') : 
                      'Sin modificaciones'
                    }
                  </Text>
                </Col>
              </Row>
              
              {selectedAccommodation?.justification && (
                <>
                  <Divider />
                  <div>
                    <Text strong>Justificación original:</Text>
                    <br />
                    <Paragraph>{selectedAccommodation.justification}</Paragraph>
                  </div>
                </>
              )}
              
              {selectedAccommodation?.expectedOutcomes && (
                <div>
                  <Text strong>Resultados esperados:</Text>
                  <br />
                  <Paragraph>{selectedAccommodation.expectedOutcomes}</Paragraph>
                </div>
              )}
            </Card>
          </div>
        ) : modalMode !== 'view' ? (
          <Form form={form} layout="vertical">
            <Steps current={currentStep} size="small" className="mb-6">
              {accommodationSteps.map((step, index) => (
                <Step key={index} title={step.title} icon={step.icon} />
              ))}
            </Steps>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {renderStepContent()}
              </motion.div>
            </AnimatePresence>
          </Form>
        ) : (
          // Vista de detalles
          <div className="space-y-4">
            <Card size="small">
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Tipo:</Text>
                  <br />
                  <Tag color={ACCOMMODATION_TYPES[selectedAccommodation?.type as keyof typeof ACCOMMODATION_TYPES]?.color}>
                    {ACCOMMODATION_TYPES[selectedAccommodation?.type as keyof typeof ACCOMMODATION_TYPES]?.label}
                  </Tag>
                </Col>
                <Col span={12}>
                  <Text strong>Estado:</Text>
                  <br />
                  <Badge 
                    status={ACCOMMODATION_STATUS[selectedAccommodation?.status as keyof typeof ACCOMMODATION_STATUS]?.color as any} 
                    text={ACCOMMODATION_STATUS[selectedAccommodation?.status as keyof typeof ACCOMMODATION_STATUS]?.label} 
                  />
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Descripción">
              <Paragraph>{selectedAccommodation?.description}</Paragraph>
            </Card>

            {selectedAccommodation?.approvalWorkflow && (
              <Card size="small" title="Flujo de Aprobación">
                <Timeline>
                  {selectedAccommodation.approvalWorkflow.map((step: any, index: number) => (
                    <Timeline.Item
                      key={index}
                      color={step.status === 'approved' ? 'green' : step.status === 'rejected' ? 'red' : 'gray'}
                      dot={
                        step.status === 'approved' ? <CheckCircleOutlined /> :
                        step.status === 'rejected' ? <CloseCircleOutlined /> :
                        <ClockCircleOutlined />
                      }
                    >
                      <Text strong>{step.level}</Text>
                      <br />
                      <Text type="secondary">
                        {step.status === 'pending' ? 'Pendiente' : 
                         step.approvedAt ? dayjs(step.approvedAt).format('DD/MM/YYYY HH:mm') : ''}
                      </Text>
                      {step.comments && (
                        <>
                          <br />
                          <Text>{step.comments}</Text>
                        </>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            )}

            {selectedAccommodation?.effectivenessRecords?.length > 0 && (
              <Card size="small" title="Historial de Efectividad">
                <List
                  dataSource={selectedAccommodation.effectivenessRecords}
                  renderItem={(item: any) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Tag color={EFFECTIVENESS_RATINGS[item.overallRating as keyof typeof EFFECTIVENESS_RATINGS]?.color}>
                            {item.overallRating}/5
                          </Tag>
                        }
                        title={dayjs(item.evaluationDate).format('DD/MM/YYYY')}
                        description={item.observations}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AccommodationSystem;