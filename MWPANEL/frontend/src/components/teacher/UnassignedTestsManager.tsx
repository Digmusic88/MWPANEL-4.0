/**
 * @archivo: UnassignedTestsManager.tsx
 * @función: Gestión de secciones personalizadas para Test Yourself sin asignatura
 * @crítico: SÍ - Organización libre solo para tab "Sin Asignatura"
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Modal,
  Form,
  Input,
  Select,
  message,
  Dropdown,
  Menu,
  Popconfirm,
  Badge,
  Empty,
  Spin,
  Divider,
  Collapse,
  Tooltip,
  Progress,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  MoreOutlined,
  FolderAddOutlined,
  EditOutlined,
  DeleteOutlined,
  DragOutlined,
  FolderOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import api from '../../services/apiClient';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

interface TestYourselfTask {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  classGroupName: string;
  subjectName: string | null;
  valuationType: string;
  maxScore: number;
  createdAt: string;
  status: 'pending' | 'active' | 'graded';
}

interface TestYourselfSection {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  orderIndex: number;
  taskCount?: number; // Optional, calculated from assignments
  assignments: Array<{
    id: string;
    taskId: string;
    orderIndex: number;
    task: TestYourselfTask;
  }>;
}

interface UnassignedTestsManagerProps {
  unassignedTasks: TestYourselfTask[];
  onTaskSelect: (task: TestYourselfTask) => void;
}

const ICON_OPTIONS = [
  { value: 'FolderOutlined', label: '📁 Carpeta' },
  { value: 'BookOutlined', label: '📚 Libro' },
  { value: 'FileTextOutlined', label: '📄 Documento' },
  { value: 'TagOutlined', label: '🏷️ Etiqueta' },
  { value: 'StarOutlined', label: '⭐ Estrella' },
  { value: 'HeartOutlined', label: '❤️ Corazón' },
  { value: 'ThunderboltOutlined', label: '⚡ Rayo' },
  { value: 'CrownOutlined', label: '👑 Corona' },
];

const COLOR_OPTIONS = [
  '#1890ff', // Azul
  '#52c41a', // Verde
  '#faad14', // Amarillo
  '#f5222d', // Rojo
  '#722ed1', // Morado
  '#fa541c', // Naranja
  '#13c2c2', // Cian
  '#eb2f96', // Rosa
];

export default function UnassignedTestsManager({ unassignedTasks, onTaskSelect }: UnassignedTestsManagerProps) {
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [editingSection, setEditingSection] = useState<TestYourselfSection | null>(null);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const queryClient = useQueryClient();

  // Obtener secciones del profesor
  const { data: sections = [], isLoading: sectionsLoading, error: sectionsError } = useQuery({
    queryKey: ['test-yourself-sections'],
    queryFn: async () => {
      try {
        console.log('🎯🎯🎯 FRONTEND UnassignedTestsManager: Starting API call to /tasks/test-yourself-sections');
        const response = await api.get('/tasks/test-yourself-sections');
        console.log('🎯🎯🎯 FRONTEND UnassignedTestsManager: Raw API Response:', response);
        console.log('🎯🎯🎯 FRONTEND UnassignedTestsManager: Response.data:', response.data);
        console.log('🎯🎯🎯 FRONTEND UnassignedTestsManager: Sections count:', response.data?.length);
        
        if (Array.isArray(response.data)) {
          response.data.forEach((section, index) => {
            console.log(`🎯🎯🎯 FRONTEND UnassignedTestsManager: Section ${index + 1}:`, {
              id: section.id,
              name: section.name,
              color: section.color,
              assignmentsCount: section.assignments?.length || 0
            });
          });
        }
        
        return response.data || [];
      } catch (error) {
        console.error('🔴🔴🔴 FRONTEND UnassignedTestsManager: Error fetching Test Yourself sections:', error);
        
        // Check if it's an authentication error
        if (error.response?.status === 401) {
          console.error('🔴 Authentication error detected. User needs to log in again.');
          throw new Error('AUTH_ERROR');
        }
        
        // For other errors, still throw to show in UI
        throw error;
      }
    },
    enabled: true,
    retry: (failureCount, error) => {
      // Don't retry authentication errors
      if (error?.message === 'AUTH_ERROR') {
        return false;
      }
      return failureCount < 3;
    },
  });

  // Crear nueva sección
  const createSectionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/tasks/test-yourself-sections', data);
      return response.data;
    },
    onSuccess: () => {
      message.success('Sección creada exitosamente');
      setIsCreateModalVisible(false);
      createForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['test-yourself-sections'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al crear la sección');
    },
  });

  // Actualizar sección
  const updateSectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/tasks/test-yourself-sections/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      message.success('Sección actualizada exitosamente');
      setEditingSection(null);
      editForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['test-yourself-sections'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al actualizar la sección');
    },
  });

  // Eliminar sección
  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      await api.delete(`/tasks/test-yourself-sections/${sectionId}`);
    },
    onSuccess: () => {
      message.success('Sección eliminada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['test-yourself-sections'] });
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al eliminar la sección');
    },
  });

  // Asignar tarea a sección
  const assignTaskMutation = useMutation({
    mutationFn: async ({ taskId, sectionId }: { taskId: string; sectionId: string }) => {
      const response = await api.post(`/tasks/test-yourself-sections/assign/${taskId}`, {
        sectionId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      console.log('🎯 ASSIGNMENT SUCCESS:', data);
      message.success('Test Yourself asignado exitosamente');
      
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['test-yourself-sections'] });
      queryClient.invalidateQueries({ queryKey: ['exam-tasks'] }); 
      queryClient.invalidateQueries({ queryKey: ['exam-grading'] });
      
      console.log('🎯 All queries invalidated after assignment');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al asignar el Test Yourself');
    },
  });

  // Remover tarea de sección
  const removeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      await api.delete(`/tasks/test-yourself-sections/unassign/${taskId}`);
    },
    onSuccess: () => {
      message.success('Test Yourself removido de la sección');
      queryClient.invalidateQueries({ queryKey: ['test-yourself-sections'] });
      queryClient.invalidateQueries({ queryKey: ['exam-tasks'] }); // Also invalidate tasks query
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al remover el Test Yourself');
    },
  });

  const handleCreateSection = (values: any) => {
    createSectionMutation.mutate(values);
  };

  const handleUpdateSection = (values: any) => {
    if (editingSection) {
      updateSectionMutation.mutate({ id: editingSection.id, data: values });
    }
  };

  const handleEditSection = (section: TestYourselfSection) => {
    setEditingSection(section);
    editForm.setFieldsValue(section);
  };

  const handleDeleteSection = (sectionId: string) => {
    deleteSectionMutation.mutate(sectionId);
  };

  const handleAssignTask = (taskId: string, sectionId: string) => {
    console.log('🎯 ASSIGNING TASK:', { taskId, sectionId });
    assignTaskMutation.mutate({ taskId, sectionId });
  };

  const getTaskStatusColor = (task: TestYourselfTask) => {
    if (dayjs(task.dueDate).isBefore(dayjs())) {
      return '#ff4d4f'; // Rojo para vencidos
    }
    if (dayjs(task.dueDate).isBefore(dayjs().add(3, 'days'))) {
      return '#faad14'; // Amarillo para próximos a vencer
    }
    return '#52c41a'; // Verde para vigentes
  };

  const renderTaskCard = (task: TestYourselfTask, sectionId?: string) => (
    <Card
      key={task.id}
      size="small"
      style={{ 
        marginBottom: '8px',
        borderLeft: `4px solid ${getTaskStatusColor(task)}`,
      }}
      actions={[
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={() => onTaskSelect(task)}
        >
          Ver/Calificar
        </Button>,
        sectionId ? (
          <Popconfirm
            title="¿Remover de esta sección?"
            description="El Test Yourself volverá a la lista de no asignados"
            onConfirm={() => removeTaskMutation.mutate(task.id)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />}>
              Remover
            </Button>
          </Popconfirm>
        ) : (
          <Dropdown
            trigger={['click']}
            menu={{
              items: sections.map((section: TestYourselfSection) => ({
                key: section.id,
                label: section.name,
                icon: <FolderOutlined style={{ color: section.color }} />,
                onClick: () => handleAssignTask(task.id, section.id),
              })),
            }}
          >
            <Button type="text" size="small" icon={<FolderAddOutlined />}>
              Asignar a Sección
            </Button>
          </Dropdown>
        ),
      ]}
    >
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <Text strong style={{ fontSize: '14px' }}>{task.title}</Text>
          <Tag color={task.valuationType === 'rubric' ? 'purple' : 'blue'} size="small">
            {task.valuationType === 'rubric' ? 'Rúbrica' : 'Numérico'}
          </Tag>
        </div>
        
        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
          {task.description}
        </Text>

        <Space size="small" wrap>
          <Tag icon={<CalendarOutlined />} color="default" size="small">
            {dayjs(task.dueDate).format('DD/MM/YYYY')}
          </Tag>
          <Tag color="blue" size="small">
            {task.classGroupName}
          </Tag>
          {task.valuationType === 'numeric' && (
            <Tag color="green" size="small">
              Max: {task.maxScore} pts
            </Tag>
          )}
        </Space>
      </div>
    </Card>
  );

  const getSectionMenuItems = (section: TestYourselfSection) => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Editar Sección',
      onClick: () => handleEditSection(section),
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Eliminar Sección',
      danger: true,
      onClick: () => handleDeleteSection(section.id),
    },
  ];

  if (sectionsLoading) {
    return (
      <Card title="🗂️ Secciones Personalizadas">
        <Spin size="large" style={{ display: 'block', textAlign: 'center', padding: '40px' }} />
      </Card>
    );
  }

  // Show authentication error
  if (sectionsError?.message === 'AUTH_ERROR') {
    return (
      <Card title="🗂️ Secciones Personalizadas">
        <Alert
          message="Sesión Expirada"
          description={
            <div>
              <p>Tu sesión ha expirado. Por favor, inicia sesión nuevamente para ver las secciones personalizadas.</p>
              <Button 
                type="primary" 
                onClick={() => {
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  localStorage.removeItem('mw-panel-auth');
                  window.location.href = '/login';
                }}
              >
                Ir a Iniciar Sesión
              </Button>
            </div>
          }
          type="warning"
          showIcon
          style={{ margin: '20px 0' }}
        />
      </Card>
    );
  }

  // Show other errors
  if (sectionsError && sectionsError.message !== 'AUTH_ERROR') {
    return (
      <Card title="🗂️ Secciones Personalizadas">
        <Alert
          message="Error al Cargar Secciones"
          description={`No se pudieron cargar las secciones: ${sectionsError.message}`}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={() => queryClient.invalidateQueries({ queryKey: ['test-yourself-sections'] })}>
              Reintentar
            </Button>
          }
          style={{ margin: '20px 0' }}
        />
      </Card>
    );
  }

  return (
    <div>
      {/* Header con botón para crear sección */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            🗂️ Organización por Secciones Personalizadas
          </Title>
          <Text type="secondary">
            Organiza los Test Yourself sin asignatura en secciones personalizadas
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalVisible(true)}
          size="small"
        >
          Nueva Sección
        </Button>
      </div>

      {/* Secciones existentes */}
      {sections.length > 0 ? (
        <div>
          <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px' }}>
            <Text strong style={{ color: '#1890ff' }}>
              🎯 DEBUG: Mostrando {sections.length} secciones encontradas
            </Text>
            <div style={{ marginTop: '8px', fontSize: '12px' }}>
              {sections.map((section: TestYourselfSection, index: number) => (
                <div key={section.id} style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: 'bold' }}>Sección {index + 1}:</span> {section.name} 
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    (ID: {section.id.substring(0, 8)}...)
                  </span>
                  <span style={{ color: '#666', marginLeft: '8px' }}>
                    Tareas: {section.assignments?.length || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <Collapse
            size="small"
            style={{ marginBottom: '16px' }}
            defaultActiveKey={sections.map(section => section.id)}
            items={sections.map((section: TestYourselfSection) => ({
              key: section.id,
              label: (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: section.color, fontSize: '16px' }}>
                    {section.icon === 'FolderOutlined' ? '📁' : 
                     section.icon === 'BookOutlined' ? '📚' :
                     section.icon === 'FileTextOutlined' ? '📄' :
                     section.icon === 'TagOutlined' ? '🏷️' :
                     section.icon === 'StarOutlined' ? '⭐' :
                     section.icon === 'HeartOutlined' ? '❤️' :
                     section.icon === 'ThunderboltOutlined' ? '⚡' :
                     section.icon === 'CrownOutlined' ? '👑' : '📁'}
                  </span>
                  <Text strong>{section.name}</Text>
                  <Badge count={section.assignments?.length || 0} size="small" />
                </div>
              ),
              extra: (
                <Dropdown
                  menu={{ items: getSectionMenuItems(section) }}
                  trigger={['click']}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button type="text" size="small" icon={<MoreOutlined />} />
                </Dropdown>
              ),
              children: (
                <div>
                  {section.description && (
                    <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '12px' }}>
                      {section.description}
                    </Text>
                  )}
                  
                  {section.assignments && section.assignments.length > 0 ? (
                    <div>
                      {section.assignments.map((assignment) => 
                        renderTaskCard(assignment.task, section.id)
                      )}
                    </div>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No hay Test Yourself en esta sección"
                      style={{ margin: '20px 0' }}
                    />
                  )}
                </div>
              ),
            }))}
          />
        </div>
      ) : (
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No hay secciones creadas"
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsCreateModalVisible(true)}
            >
              Crear Primera Sección
            </Button>
          </Empty>
        </Card>
      )}

      {/* Test Yourself sin asignar */}
      <Card 
        title="📋 Test Yourself Sin Asignar" 
        size="small"
        extra={
          <Badge count={unassignedTasks.length} style={{ backgroundColor: '#faad14' }} />
        }
      >
        {unassignedTasks.length > 0 ? (
          <div>
            {unassignedTasks.map(task => renderTaskCard(task))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="Todos los Test Yourself están organizados en secciones"
          />
        )}
      </Card>

      {/* Modal para crear sección */}
      <Modal
        title="Nueva Sección Personalizada"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateSection}
          initialValues={{
            color: '#1890ff',
            icon: 'FolderOutlined',
          }}
        >
          <Form.Item
            name="name"
            label="Nombre de la Sección"
            rules={[{ required: true, message: 'Ingrese el nombre de la sección' }]}
          >
            <Input placeholder="Ej: Evaluaciones Finales" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Descripción (Opcional)"
          >
            <TextArea
              placeholder="Descripción de la sección..."
              rows={3}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="color"
                label="Color"
              >
                <Select>
                  {COLOR_OPTIONS.map(color => (
                    <Select.Option key={color} value={color}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: color,
                            borderRadius: '2px',
                          }}
                        />
                        {color}
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="icon"
                label="Icono"
              >
                <Select>
                  {ICON_OPTIONS.map(option => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={() => setIsCreateModalVisible(false)}>
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createSectionMutation.isPending}
              >
                Crear Sección
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Modal para editar sección */}
      <Modal
        title="Editar Sección"
        open={!!editingSection}
        onCancel={() => {
          setEditingSection(null);
          editForm.resetFields();
        }}
        footer={null}
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleUpdateSection}
        >
          <Form.Item
            name="name"
            label="Nombre de la Sección"
            rules={[{ required: true, message: 'Ingrese el nombre de la sección' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="description"
            label="Descripción (Opcional)"
          >
            <TextArea rows={3} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="color"
                label="Color"
              >
                <Select>
                  {COLOR_OPTIONS.map(color => (
                    <Select.Option key={color} value={color}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: color,
                            borderRadius: '2px',
                          }}
                        />
                        {color}
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="icon"
                label="Icono"
              >
                <Select>
                  {ICON_OPTIONS.map(option => (
                    <Select.Option key={option.value} value={option.value}>
                      {option.label}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', marginTop: '24px' }}>
            <Space>
              <Button onClick={() => setEditingSection(null)}>
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={updateSectionMutation.isPending}
              >
                Actualizar Sección
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
}