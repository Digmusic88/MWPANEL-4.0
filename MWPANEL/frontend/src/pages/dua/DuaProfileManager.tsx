/**
 * @archivo: DuaProfileManager.tsx
 * @módulo: Pages/DUA (Gestor de Perfiles DUA)
 * @función: Gestión completa de perfiles DUA para estudiantes
 * @crítico: SÍ - Sistema de accesibilidad educativa
 * @dependencias: duaService, useDua hooks, Ant Design
 * @relacionado_con: Sistema competencial, evaluación formativa
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Select,
  Input,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Steps,
  Switch,
  Checkbox,
  Alert,
  Tooltip,
  Badge,
  Avatar,
  message,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  HeartOutlined,
  BulbOutlined,
  SoundOutlined,
  EyeInvisibleOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import { useDuaProfiles, useCreateDuaProfile, useUpdateDuaProfile } from '../../hooks/useDua';
import { EducationalNeedType, SupportLevel } from '../../services/duaService';
import { DuaPageHeader } from '../../components/dua/DuaPageHeader';
import apiClient from '../../services/apiClient';

interface StudentLite {
  id: string;
  user?: { profile?: { firstName?: string; lastName?: string } };
}

const { Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { Step } = Steps;

const DuaProfileManager: React.FC = () => {
  const [filters, setFilters] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();

  const { data: profilesData, isLoading } = useDuaProfiles(filters);
  const createProfile = useCreateDuaProfile();
  const updateProfile = useUpdateDuaProfile();

  // Alumnos que el docente puede gestionar (el endpoint /students ya viene
  // filtrado por RGPD: tutoría ∪ asignaturas del profesor; admin ve todos).
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/students');
        if (!cancelled) setStudents(res.data || []);
      } catch {
        if (!cancelled) message.error('No se pudieron cargar los alumnos');
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const studentName = (s: StudentLite) => {
    const p = s.user?.profile;
    const full = `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
    return full || 'Alumno sin nombre';
  };

  const steps = [
    { title: 'Información Básica', icon: <UserOutlined /> },
    { title: 'Necesidades Educativas', icon: <HeartOutlined /> },
    { title: 'Representación', icon: <EyeOutlined /> },
    { title: 'Expresión', icon: <SoundOutlined /> },
    { title: 'Implicación', icon: <BulbOutlined /> },
  ];

  const educationalNeeds = [
    { value: EducationalNeedType.DYSLEXIA, label: 'Dislexia', color: 'red' },
    { value: EducationalNeedType.ADHD, label: 'TDAH', color: 'orange' },
    { value: EducationalNeedType.ASD, label: 'TEA', color: 'blue' },
    { value: EducationalNeedType.VISUAL_DISABILITY, label: 'Discapacidad Visual', color: 'purple' },
    { value: EducationalNeedType.HEARING_DISABILITY, label: 'Discapacidad Auditiva', color: 'cyan' },
    { value: EducationalNeedType.GIFTEDNESS, label: 'Altas Capacidades', color: 'gold' },
  ];

  const columns = [
    {
      title: 'Estudiante',
      dataIndex: 'student',
      key: 'student',
      render: (student: any) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{student?.user?.profile?.firstName} {student?.user?.profile?.lastName}</Text>
        </Space>
      ),
    },
    {
      title: 'Necesidades',
      dataIndex: 'educationalNeeds',
      key: 'needs',
      render: (needs: EducationalNeedType[]) => (
        <Space wrap>
          {needs?.slice(0, 3).map(need => {
            const needInfo = educationalNeeds.find(n => n.value === need);
            return needInfo ? (
              <Tag key={need} color={needInfo.color}>{needInfo.label}</Tag>
            ) : null;
          })}
          {needs && needs.length > 3 && <Tag>+{needs.length - 3} más</Tag>}
        </Space>
      ),
    },
    {
      title: 'Nivel de Apoyo',
      dataIndex: 'supportLevel',
      key: 'supportLevel',
      render: (level: SupportLevel) => {
        const colors = {
          LOW: 'green',
          MEDIUM: 'orange',
          HIGH: 'red',
          INTENSIVE: 'purple',
        };
        return <Tag color={colors[level]}>{level}</Tag>;
      },
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'status',
      render: (isActive: boolean) => (
        <Badge status={isActive ? 'success' : 'default'} text={isActive ? 'Activo' : 'Inactivo'} />
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Tooltip title="Ver detalles">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleCreate = () => {
    setSelectedProfile(null);
    setModalMode('create');
    setCurrentStep(0);
    setIsModalVisible(true);
    form.resetFields();
  };

  const handleEdit = (profile: any) => {
    setSelectedProfile(profile);
    setModalMode('edit');
    setCurrentStep(0);
    setIsModalVisible(true);
    form.setFieldsValue(profile);
  };

  const handleView = (profile: any) => {
    setSelectedProfile(profile);
    setModalMode('view');
    setIsModalVisible(true);
  };

  const handleSave = async (values: any) => {
    try {
      if (modalMode === 'create') {
        await createProfile.mutateAsync(values);
      } else if (modalMode === 'edit' && selectedProfile) {
        await updateProfile.mutateAsync({
          id: (selectedProfile as any).id,
          data: values,
        });
      }
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <Alert
              message="Información Básica del Perfil DUA"
              description="Selecciona el estudiante y define el nivel de apoyo necesario."
              type="info"
              showIcon
            />
            <Form.Item name="studentId" label="Estudiante" rules={[{ required: true }]}>
              <Select
                placeholder="Seleccionar estudiante"
                showSearch
                loading={studentsLoading}
                optionFilterProp="label"
                disabled={modalMode === 'view'}
                notFoundContent={studentsLoading ? 'Cargando…' : 'No tienes alumnos asignados'}
                options={students.map((s) => ({ value: s.id, label: studentName(s) }))}
              />
            </Form.Item>
            <Form.Item name="supportLevel" label="Nivel de Apoyo" rules={[{ required: true }]}>
              <Select placeholder="Nivel de apoyo">
                <Option value={SupportLevel.LOW}>
                  <Tag color="green">Bajo</Tag> - Apoyo mínimo
                </Option>
                <Option value={SupportLevel.MEDIUM}>
                  <Tag color="orange">Medio</Tag> - Apoyo regular
                </Option>
                <Option value={SupportLevel.HIGH}>
                  <Tag color="red">Alto</Tag> - Apoyo intensivo
                </Option>
                <Option value={SupportLevel.INTENSIVE}>
                  <Tag color="purple">Intensivo</Tag> - Apoyo especializado
                </Option>
              </Select>
            </Form.Item>
            <Form.Item name="isActive" valuePropName="checked">
              <Space>
                <Switch />
                <Text>Perfil activo</Text>
              </Space>
            </Form.Item>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <Alert
              message="Necesidades Educativas Específicas"
              description="Selecciona las necesidades educativas específicas identificadas."
              type="info"
              showIcon
            />
            <Form.Item name="educationalNeeds" label="Necesidades Educativas">
              <Checkbox.Group>
                <Row gutter={[16, 16]}>
                  {educationalNeeds.map(need => (
                    <Col xs={24} sm={12} key={need.value}>
                      <Checkbox value={need.value}>
                        <Tag color={need.color}>{need.label}</Tag>
                      </Checkbox>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </Form.Item>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Alert
              message="Preferencias de Representación"
              description="Múltiples formas de presentar la información (Principio I del DUA)."
              type="info"
              showIcon
            />
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Form.Item name={['representationPreferences', 'visualPreferred']} valuePropName="checked">
                  <Space><Switch /><Text>Prefiere visual</Text></Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name={['representationPreferences', 'auditoryPreferred']} valuePropName="checked">
                  <Space><Switch /><Text>Prefiere auditivo</Text></Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name={['representationPreferences', 'kinestheticPreferred']} valuePropName="checked">
                  <Space><Switch /><Text>Prefiere kinestésico</Text></Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name={['representationPreferences', 'needsVisualSupports']} valuePropName="checked">
                  <Space><Switch /><Text>Necesita apoyos visuales</Text></Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name={['representationPreferences', 'needsSimplifiedText']} valuePropName="checked">
                  <Space><Switch /><Text>Necesita texto simplificado</Text></Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name={['representationPreferences', 'needsHighContrast']} valuePropName="checked">
                  <Space><Switch /><Text>Necesita alto contraste</Text></Space>
                </Form.Item>
              </Col>
            </Row>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <Alert
              message="Preferencias de Expresión"
              description="Múltiples formas de acción y expresión (Principio II del DUA)."
              type="info"
              showIcon
            />
            <Form.Item name={['expressionPreferences', 'preferredResponseFormat']} label="Formato de respuesta preferido">
              <Select placeholder="Seleccionar formato">
                <Option value="written">Escrito</Option>
                <Option value="oral">Oral</Option>
                <Option value="digital">Digital</Option>
                <Option value="visual">Visual</Option>
                <Option value="mixed">Mixto</Option>
              </Select>
            </Form.Item>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item name={['expressionPreferences', 'needsExtendedTime']} valuePropName="checked">
                  <Space><Switch /><Text>Necesita tiempo extendido</Text></Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name={['expressionPreferences', 'timeExtensionFactor']} label="Factor de extensión">
                  <Select placeholder="Factor">
                    <Option value={1.25}>1.25x (25% más)</Option>
                    <Option value={1.5}>1.5x (50% más)</Option>
                    <Option value={2}>2x (100% más)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Alert
              message="Preferencias de Implicación"
              description="Múltiples formas de implicación y motivación (Principio III del DUA)."
              type="info"
              showIcon
            />
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Form.Item name={['engagementPreferences', 'needsFrequentFeedback']} valuePropName="checked">
                  <Space><Switch /><Text>Necesita feedback frecuente</Text></Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name={['engagementPreferences', 'needsMovementBreaks']} valuePropName="checked">
                  <Space><Switch /><Text>Necesita descansos de movimiento</Text></Space>
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name={['engagementPreferences', 'needsAnxietySupport']} valuePropName="checked">
                  <Space><Switch /><Text>Necesita apoyo para ansiedad</Text></Space>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name={['engagementPreferences', 'preferredGroupSize']} label="Tamaño de grupo preferido">
              <Select placeholder="Tamaño de grupo">
                <Option value="individual">Individual</Option>
                <Option value="small">Grupo pequeño</Option>
                <Option value="large">Grupo grande</Option>
                <Option value="mixed">Mixto</Option>
              </Select>
            </Form.Item>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <DuaPageHeader
        title="Gestión de Perfiles DUA"
        subtitle="Diseño Universal para el Aprendizaje - Perfiles de accesibilidad"
        icon={<ToolOutlined />}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Nuevo Perfil DUA
          </Button>
        }
      />

      {/* Filtros */}
      <Card style={{ marginBottom: 16 }} className="shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Search
              placeholder="Buscar perfiles..."
              allowClear
              onSearch={(value) => setFilters(prev => ({ ...prev, search: value }))}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Nivel de apoyo"
              allowClear
              className="w-full"
              onChange={(value) => setFilters(prev => ({ ...prev, supportLevel: value }))}
            >
              <Option value={SupportLevel.LOW}>Bajo</Option>
              <Option value={SupportLevel.MEDIUM}>Medio</Option>
              <Option value={SupportLevel.HIGH}>Alto</Option>
              <Option value={SupportLevel.INTENSIVE}>Intensivo</Option>
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Necesidad educativa"
              allowClear
              className="w-full"
              onChange={(value) => setFilters(prev => ({ ...prev, educationalNeed: value }))}
            >
              {educationalNeeds.map(need => (
                <Option key={need.value} value={need.value}>
                  {need.label}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Tabla */}
      <Card className="shadow-sm">
        <Table
          columns={columns}
          dataSource={profilesData?.data || []}
          rowKey="id"
          loading={isLoading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} perfiles`,
          }}
        />
      </Card>

      {/* Modal */}
      <Modal
        title={`${modalMode === 'create' ? 'Nuevo' : modalMode === 'edit' ? 'Editar' : 'Ver'} Perfil DUA`}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={modalMode === 'view' ? [
          <Button key="close" onClick={() => setIsModalVisible(false)}>Cerrar</Button>
        ] : [
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>Cancelar</Button>,
          <Button key="save" type="primary" onClick={() => form.submit()}>
            {modalMode === 'create' ? 'Crear' : 'Actualizar'}
          </Button>
        ]}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          disabled={modalMode === 'view'}
        >
          <Steps current={currentStep} className="mb-6" size="small">
            {steps.map((step, index) => (
              <Step key={index} title={step.title} icon={step.icon} />
            ))}
          </Steps>

          {renderStepContent()}

          {modalMode !== 'view' && (
            <div className="mt-6 flex justify-between">
              <Button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
                Anterior
              </Button>
              <Button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} disabled={currentStep === steps.length - 1}>
                Siguiente
              </Button>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default DuaProfileManager;