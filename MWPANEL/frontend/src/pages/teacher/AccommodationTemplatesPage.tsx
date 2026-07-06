/**
 * @componente: AccommodationTemplatesPage
 * @módulo: Teacher DUA (Plantillas de Acomodaciones)
 * @función: Página dedicada para navegar y usar plantillas de acomodaciones DUA
 * @crítico: SÍ - Soluciona el problema de navegación de plantillas
 * @dependencias: useAccommodationTemplates, Ant Design, AccommodationSystem
 * @relacionado_con: DuaDashboard, AccommodationSystem
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Button,
  Tag,
  Badge,
  Empty,
  Spin,
  Input,
  Select,
  Divider,
  Modal,
  Form,
  message,
  Tooltip,
  Alert,
} from 'antd';
import {
  CopyOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  BulbOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ToolOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAccommodationTemplates, useCreateDuaAccommodation } from '../../hooks/useDua';
import { useDuaProfiles } from '../../hooks/useDua';
import { DuaPageHeader } from '../../components/dua/DuaPageHeader';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

// Tipos de acomodación con iconos y colores
const ACCOMMODATION_TYPES = {
  PRESENTATION: { label: 'Presentación', color: 'blue', icon: <EyeOutlined /> },
  RESPONSE: { label: 'Respuesta', color: 'green', icon: <EditOutlined /> },
  SETTING: { label: 'Entorno', color: 'orange', icon: <SettingOutlined /> },
  TIMING: { label: 'Tiempo', color: 'purple', icon: <ClockCircleOutlined /> },
  SCHEDULING: { label: 'Programación', color: 'cyan', icon: <CalendarOutlined /> },
  ORGANIZATION: { label: 'Organización', color: 'magenta', icon: <ToolOutlined /> },
  ASSISTIVE_TECHNOLOGY: { label: 'Tecnología Asistiva', color: 'gold', icon: <BulbOutlined /> },
};

const AccommodationTemplatesPage: React.FC = () => {
  const navigate = useNavigate();

  // Safe Navigation: Protección condicional para evitar errores de navegación
  const safeNavigate = useCallback((path: string, options?: any) => {
    if (navigate && typeof navigate === 'function') {
      try {
        navigate(path, options);
      } catch (error) {
        console.warn('Navigation error:', error, 'Path:', path);
      }
    } else {
      console.warn('Navigate function not available:', path);
    }
  }, [navigate]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [useTemplateModalVisible, setUseTemplateModalVisible] = useState(false);
  const [form] = Form.useForm();

  // Hooks
  const { data: templatesData, isLoading: loadingTemplates, refetch: refetchTemplates } = useAccommodationTemplates();
  const { data: profilesData } = useDuaProfiles();
  const createAccommodationMutation = useCreateDuaAccommodation();

  // Filtrar plantillas
  const filteredTemplates = templatesData?.filter((template: any) => {
    const matchesSearch = !searchTerm || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || template.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  // Ver detalles de plantilla
  const handlePreviewTemplate = (template: any) => {
    setSelectedTemplate(template);
    setPreviewModalVisible(true);
  };

  // Usar plantilla para crear nueva acomodación
  const handleUseTemplate = (template: any) => {
    setSelectedTemplate(template);
    setUseTemplateModalVisible(true);
    form.setFieldsValue({
      name: `${template.name} - Nueva`,
      description: template.description,
      type: template.type,
      details: template.details,
      applicableSubjects: template.applicableSubjects,
      applicableActivities: template.applicableActivities,
      justification: template.justification,
      expectedOutcomes: template.expectedOutcomes,
    });
  };

  // Crear acomodación desde plantilla
  const handleCreateFromTemplate = async (values: any) => {
    try {
      const accommodationData = {
        ...values,
        duaProfileId: values.duaProfileId,
        status: 'DRAFT',
        createdFromTemplate: selectedTemplate?.id,
      };

      await createAccommodationMutation.mutateAsync(accommodationData);
      
      message.success('Acomodación creada exitosamente desde plantilla');
      setUseTemplateModalVisible(false);
      form.resetFields();
      
      // Navegar a la página de acomodaciones
      safeNavigate('/teacher/dua/accommodations');
    } catch (error: any) {
      console.error('Error creating accommodation from template:', error);
      message.error(error.response?.data?.message || 'Error al crear acomodación');
    }
  };

  // Limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedType(undefined);
  };

  return (
    <div style={{ padding: '24px' }}>
      <DuaPageHeader
        title="Plantillas de Acomodaciones DUA"
        subtitle="Explora y utiliza plantillas predefinidas para crear acomodaciones rápidamente"
        icon={<FileTextOutlined />}
        actions={
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => safeNavigate('/teacher/dua')}
          >
            Volver al Dashboard DUA
          </Button>
        }
      />

      {/* Información de uso */}
      <Alert
        message="¿Cómo usar las plantillas?"
        description={
          <div>
            <p>Las plantillas de acomodaciones te permiten crear nuevas acomodaciones basadas en casos exitosos y buenas prácticas:</p>
            <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
              <li><strong>Ver detalles:</strong> Haz clic en el ícono del ojo para revisar la plantilla completa</li>
              <li><strong>Usar plantilla:</strong> Haz clic en "Usar plantilla" para crear una nueva acomodación basada en esta plantilla</li>
              <li><strong>Personalizar:</strong> Puedes modificar todos los campos según las necesidades específicas del estudiante</li>
            </ul>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      {/* Filtros */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Buscar plantillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Filtrar por tipo"
              value={selectedType}
              onChange={setSelectedType}
              style={{ width: '100%' }}
              allowClear
            >
              {Object.entries(ACCOMMODATION_TYPES).map(([key, type]) => (
                <Option key={key} value={key}>
                  <Space>
                    {type.icon}
                    {type.label}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space>
              <Button 
                icon={<FilterOutlined />} 
                onClick={handleClearFilters}
              >
                Limpiar filtros
              </Button>
              <Button 
                type="primary"
                icon={<PlusOutlined />} 
                onClick={() => safeNavigate('/teacher/dua/accommodations/new')}
              >
                Nueva Acomodación
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Lista de plantillas */}
      <Row gutter={[16, 16]}>
        {loadingTemplates ? (
          <Col span={24} className="text-center">
            <Spin size="large" />
            <div style={{ marginTop: '16px' }}>
              <Text type="secondary">Cargando plantillas...</Text>
            </div>
          </Col>
        ) : filteredTemplates?.length === 0 ? (
          <Col span={24}>
            <Empty 
              description={
                searchTerm || selectedType 
                  ? "No se encontraron plantillas que coincidan con los filtros"
                  : "No hay plantillas disponibles"
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              {!searchTerm && !selectedType && (
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => safeNavigate('/teacher/dua/accommodations/new')}
                >
                  Crear primera acomodación
                </Button>
              )}
            </Empty>
          </Col>
        ) : (
          filteredTemplates?.map((template: any, index: number) => (
            <Col xs={24} sm={12} lg={8} key={template.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Card
                  hoverable
                  style={{
                    height: '100%',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                  actions={[
                    <Tooltip title="Ver detalles">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => handlePreviewTemplate(template)}
                      >
                        Ver detalles
                      </Button>
                    </Tooltip>,
                    <Tooltip title="Usar esta plantilla">
                      <Button
                        type="primary"
                        icon={<CopyOutlined />}
                        onClick={() => handleUseTemplate(template)}
                      >
                        Usar plantilla
                      </Button>
                    </Tooltip>,
                  ]}
                >
                  <Card.Meta
                    avatar={
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        backgroundColor: `var(--ant-color-${ACCOMMODATION_TYPES[template.type as keyof typeof ACCOMMODATION_TYPES]?.color})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '20px',
                      }}>
                        {ACCOMMODATION_TYPES[template.type as keyof typeof ACCOMMODATION_TYPES]?.icon}
                      </div>
                    }
                    title={
                      <div>
                        <Text strong style={{ fontSize: '16px' }}>
                          {template.name}
                        </Text>
                        <div style={{ marginTop: '4px' }}>
                          <Tag color={ACCOMMODATION_TYPES[template.type as keyof typeof ACCOMMODATION_TYPES]?.color}>
                            {ACCOMMODATION_TYPES[template.type as keyof typeof ACCOMMODATION_TYPES]?.label}
                          </Tag>
                        </div>
                      </div>
                    }
                    description={
                      <div style={{ marginTop: '8px' }}>
                        <Paragraph 
                          ellipsis={{ rows: 3, expandable: false }}
                          style={{ margin: 0, fontSize: '14px', color: '#666' }}
                        >
                          {template.description}
                        </Paragraph>
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Badge 
                            count={template.timesUsedFromTemplate || 0} 
                            showZero
                            style={{ backgroundColor: '#2E7D52' }}
                          >
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                              usos
                            </Text>
                          </Badge>
                          {template.tags && template.tags.length > 0 && (
                            <div style={{ flex: 1, marginLeft: '8px' }}>
                              {template.tags.slice(0, 2).map((tag: string) => (
                                <Tag key={tag} size="small" style={{ margin: '0 2px' }}>
                                  {tag}
                                </Tag>
                              ))}
                              {template.tags.length > 2 && (
                                <Tag size="small" style={{ margin: '0 2px' }}>
                                  +{template.tags.length - 2}
                                </Tag>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    }
                  />
                </Card>
              </motion.div>
            </Col>
          ))
        )}
      </Row>

      {/* Modal de vista previa */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            Vista previa de plantilla
          </Space>
        }
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setPreviewModalVisible(false)}>
            Cerrar
          </Button>,
          <Button 
            key="use" 
            type="primary" 
            icon={<CopyOutlined />}
            onClick={() => {
              setPreviewModalVisible(false);
              handleUseTemplate(selectedTemplate);
            }}
          >
            Usar esta plantilla
          </Button>,
        ]}
      >
        {selectedTemplate && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <Space>
                {ACCOMMODATION_TYPES[selectedTemplate.type as keyof typeof ACCOMMODATION_TYPES]?.icon}
                <Tag color={ACCOMMODATION_TYPES[selectedTemplate.type as keyof typeof ACCOMMODATION_TYPES]?.color}>
                  {ACCOMMODATION_TYPES[selectedTemplate.type as keyof typeof ACCOMMODATION_TYPES]?.label}
                </Tag>
                <Badge count={selectedTemplate.timesUsedFromTemplate || 0} showZero>
                  <Text type="secondary">veces utilizada</Text>
                </Badge>
              </Space>
            </div>
            
            <Title level={4}>{selectedTemplate.name}</Title>
            <Paragraph>{selectedTemplate.description}</Paragraph>
            
            <Divider />
            
            {selectedTemplate.details && (
              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>Detalles de implementación:</Title>
                <Paragraph>{selectedTemplate.details}</Paragraph>
              </div>
            )}
            
            {selectedTemplate.justification && (
              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>Justificación:</Title>
                <Paragraph>{selectedTemplate.justification}</Paragraph>
              </div>
            )}
            
            {selectedTemplate.expectedOutcomes && (
              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>Resultados esperados:</Title>
                <Paragraph>{selectedTemplate.expectedOutcomes}</Paragraph>
              </div>
            )}
            
            {selectedTemplate.applicableSubjects && selectedTemplate.applicableSubjects.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <Title level={5}>Asignaturas aplicables:</Title>
                <Space wrap>
                  {selectedTemplate.applicableSubjects.map((subject: string) => (
                    <Tag key={subject}>{subject}</Tag>
                  ))}
                </Space>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal para usar plantilla */}
      <Modal
        title={
          <Space>
            <CopyOutlined />
            Crear acomodación desde plantilla
          </Space>
        }
        open={useTemplateModalVisible}
        onCancel={() => {
          setUseTemplateModalVisible(false);
          form.resetFields();
        }}
        width={800}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateFromTemplate}
        >
          <Alert
            message="Personalizando plantilla"
            description={`Estás creando una nueva acomodación basada en la plantilla "${selectedTemplate?.name}". Puedes modificar todos los campos según las necesidades específicas del estudiante.`}
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Form.Item
            name="duaProfileId"
            label="Perfil DUA del estudiante"
            rules={[{ required: true, message: 'Selecciona un perfil DUA' }]}
          >
            <Select placeholder="Selecciona el perfil DUA del estudiante">
              {profilesData?.data?.map((profile: any) => (
                <Option key={profile.id} value={profile.id}>
                  {profile.student?.user?.profile?.firstName} {profile.student?.user?.profile?.lastName}
                  {profile.student?.classGroup?.name && ` - ${profile.student.classGroup.name}`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="name"
            label="Nombre de la acomodación"
            rules={[{ required: true, message: 'Ingresa un nombre' }]}
          >
            <Input placeholder="Nombre descriptivo de la acomodación" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Descripción"
            rules={[{ required: true, message: 'Ingresa una descripción' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Descripción detallada de la acomodación"
            />
          </Form.Item>

          <Form.Item
            name="details"
            label="Detalles de implementación"
          >
            <Input.TextArea 
              rows={4} 
              placeholder="Instrucciones específicas sobre cómo implementar esta acomodación"
            />
          </Form.Item>

          <Form.Item
            name="justification"
            label="Justificación"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Justificación pedagógica para esta acomodación"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setUseTemplateModalVisible(false);
                form.resetFields();
              }}>
                Cancelar
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={createAccommodationMutation.isPending}
              >
                Crear acomodación
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AccommodationTemplatesPage;