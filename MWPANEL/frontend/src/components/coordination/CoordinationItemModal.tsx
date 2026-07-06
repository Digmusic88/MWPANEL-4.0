import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Typography,
  Divider,
  message,
  Spin,
  ColorPicker,
  Space,
  Tag,
} from 'antd';
import {
  PlusOutlined,
  CalendarOutlined,
  TeamOutlined,
  InfoCircleOutlined,
  TagOutlined,
  BgColorsOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { coordinationItemsApi, CoordinationItem, CreateCoordinationItemData } from '../../services/coordinationService';
import { usersApi } from '../../services/usersService';
import { DEPARTMENTS } from '../../constants/departments';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface CoordinationItemModalProps {
  visible: boolean;
  item?: CoordinationItem | null;
  sheetId: string | null;
  onClose: () => void;
  userRole?: 'admin' | 'teacher';
}

const CoordinationItemModal: React.FC<CoordinationItemModalProps> = ({
  visible,
  item,
  sheetId,
  onClose,
  userRole = 'admin',
}) => {
  const [form] = Form.useForm();
  const [assignmentType, setAssignmentType] = useState<string>('all');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('#1890ff');
  const queryClient = useQueryClient();

  // Get teachers for individual assignment
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => usersApi.getTeachers(),
    enabled: visible, // Load teachers when modal is visible, not just when individual assignment
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: coordinationItemsApi.createItem,
    onSuccess: () => {
      message.success('Item de coordinación creado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['coordination-items'] });
      queryClient.invalidateQueries({ queryKey: ['coordination-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['coordination-stats'] });
      onClose();
    },
    onError: () => {
      message.error('Error al crear el item de coordinación');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCoordinationItemData> }) =>
      coordinationItemsApi.updateItem(id, data),
    onSuccess: () => {
      message.success('Item de coordinación actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['coordination-items'] });
      queryClient.invalidateQueries({ queryKey: ['coordination-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['coordination-stats'] });
      onClose();
    },
    onError: () => {
      message.error('Error al actualizar el item de coordinación');
    },
  });

  useEffect(() => {
    if (visible) {
      if (item) {
        // Edit mode
        form.setFieldsValue({
          item_title: item.item_title,
          item_description: item.item_description,
          due_date: item.due_date ? dayjs(item.due_date) : null,
          assignment_type: item.assignment_type,
          priority: item.priority,
          assigned_users: item.assigned_users?.map(u => u.id),
        });
        setAssignmentType(item.assignment_type);
        setTags(item.tags || []);
        setSelectedColor(item.color || '#1890ff');
      } else {
        // Create mode
        form.resetFields();
        form.setFieldsValue({
          assignment_type: 'all',
          priority: 'medium',
        });
        setAssignmentType('all');
        setTags([]);
        setSelectedColor('#1890ff');
      }
    }
  }, [visible, item, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const data: CreateCoordinationItemData = {
        item_title: values.item_title,
        item_description: values.item_description,
        due_date: values.due_date?.format('YYYY-MM-DD'),
        assignment_type: values.assignment_type,
        priority: values.priority,
        assigned_user_ids: values.assignment_type === 'individual' ? values.assigned_users : undefined,
        assigned_departments: values.assignment_type === 'department' ? values.assigned_departments : undefined,
        tags: tags.length > 0 ? tags : undefined,
        color: selectedColor !== '#1890ff' ? selectedColor : undefined,
        sheet_id: sheetId!,
      };

      if (item) {
        updateMutation.mutate({ id: item.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setTags([]);
    setSelectedColor('#1890ff');
    onClose();
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const getPriorityDescription = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'Requiere atención inmediata y debe completarse cuanto antes';
      case 'medium':
        return 'Importancia normal, debe completarse según el cronograma';
      case 'low':
        return 'Baja prioridad, puede completarse cuando sea conveniente';
      default:
        return '';
    }
  };

  const getAssignmentDescription = (type: string) => {
    switch (type) {
      case 'all':
        return 'Todos los profesores pueden ver y completar este item';
      case 'individual':
        return 'Solo los profesores seleccionados pueden completar este item';
      case 'department':
        return 'Asignado por departamento según las asignaturas que imparten';
      default:
        return '';
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={
        <div className="flex items-center">
          <PlusOutlined className="mr-2" />
          {item ? 'Editar Item de Coordinación' : 'Nuevo Item de Coordinación'}
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      width={700}
      footer={
        <div className="flex justify-end space-x-2">
          <Button onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={isLoading}
            icon={<PlusOutlined />}
          >
            {item ? 'Actualizar' : 'Crear'} Item
          </Button>
        </div>
      }
    >
      <Spin spinning={isLoading}>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
        >
          {/* Basic Information */}
          <Title level={5}>Información del Acuerdo</Title>
          
          <Form.Item
            name="item_title"
            label="Título del Acuerdo"
            rules={[
              { required: true, message: 'El título es requerido' },
              { max: 255, message: 'El título no puede exceder 255 caracteres' }
            ]}
          >
            <Input
              placeholder="ej. Preparar festival de Navidad"
            />
          </Form.Item>

          <Form.Item
            name="item_description"
            label="Descripción (Soporta Markdown)"
          >
            <TextArea
              placeholder="Descripción detallada del acuerdo o compromiso... 

Puedes usar **texto en negrita**, *cursiva*, listas:
- Punto 1
- Punto 2

Y enlaces [ejemplo](https://ejemplo.com)"
              rows={4}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="due_date"
            label="Fecha Límite (Opcional)"
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Selecciona la fecha límite"
              prefix={<CalendarOutlined />}
            />
          </Form.Item>

          <Divider />

          {/* Assignment Configuration */}
          <Title level={5}>
            <TeamOutlined className="mr-2" />
            Configuración de Asignación
          </Title>

          <Form.Item
            name="assignment_type"
            label="Tipo de Asignación"
            rules={[{ required: true, message: 'Selecciona el tipo de asignación' }]}
          >
            <Select
              placeholder="Selecciona cómo se asigna este item"
              onChange={setAssignmentType}
            >
              <Select.Option value="all">
                <div>
                  <Text strong>Todos los Profesores</Text>
                  <div className="text-xs text-gray-500">
                    {getAssignmentDescription('all')}
                  </div>
                </div>
              </Select.Option>
              <Select.Option value="individual">
                <div>
                  <Text strong>Asignación Individual</Text>
                  <div className="text-xs text-gray-500">
                    {getAssignmentDescription('individual')}
                  </div>
                </div>
              </Select.Option>
              <Select.Option value="department">
                <div>
                  <Text strong>Por Departamento</Text>
                  <div className="text-xs text-gray-500">
                    {getAssignmentDescription('department')}
                  </div>
                </div>
              </Select.Option>
            </Select>
          </Form.Item>

          {assignmentType === 'individual' && (
            <Form.Item
              name="assigned_users"
              label="Profesores Asignados"
              rules={[
                { required: true, message: 'Selecciona al menos un profesor' }
              ]}
            >
              <Select
                mode="multiple"
                placeholder="Selecciona los profesores responsables"
                loading={teachersLoading}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {teachers.map((teacher: any) => (
                  <Select.Option key={teacher.id} value={teacher.user?.id || teacher.id}>
                    {teacher.user?.profile?.firstName} {teacher.user?.profile?.lastName} ({teacher.user?.email})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {assignmentType === 'department' && (
            <Form.Item
              name="assigned_departments"
              label="Departamentos Asignados"
              rules={[
                { required: true, message: 'Selecciona al menos un departamento' }
              ]}
            >
              <Select
                mode="multiple"
                placeholder="Selecciona los departamentos responsables"
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {DEPARTMENTS.map(dept => (
                  <Select.Option key={dept.value} value={dept.label}>
                    {dept.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Divider />

          {/* Priority and Metadata */}
          <Title level={5}>Prioridad y Categorización</Title>

          <Form.Item
            name="priority"
            label="Prioridad"
            rules={[{ required: true, message: 'Selecciona la prioridad' }]}
          >
            <Select placeholder="Selecciona la prioridad del item">
              <Select.Option value="high">
                <div>
                  <Text strong style={{ color: '#ff4d4f' }}>Alta Prioridad</Text>
                  <div className="text-xs text-gray-500">
                    {getPriorityDescription('high')}
                  </div>
                </div>
              </Select.Option>
              <Select.Option value="medium">
                <div>
                  <Text strong style={{ color: '#faad14' }}>Prioridad Media</Text>
                  <div className="text-xs text-gray-500">
                    {getPriorityDescription('medium')}
                  </div>
                </div>
              </Select.Option>
              <Select.Option value="low">
                <div>
                  <Text strong style={{ color: '#52c41a' }}>Baja Prioridad</Text>
                  <div className="text-xs text-gray-500">
                    {getPriorityDescription('low')}
                  </div>
                </div>
              </Select.Option>
            </Select>
          </Form.Item>

          {/* Tags */}
          <Form.Item label="Etiquetas">
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  placeholder="Agregar etiqueta"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onPressEnter={handleAddTag}
                  suffix={
                    <Button
                      type="text"
                      icon={<TagOutlined />}
                      onClick={handleAddTag}
                      disabled={!newTag}
                    />
                  }
                />
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, index) => (
                    <Tag
                      key={index}
                      closable
                      onClose={() => handleRemoveTag(tag)}
                    >
                      {tag}
                    </Tag>
                  ))}
                </div>
              )}
            </div>
          </Form.Item>

          {/* Color */}
          <Form.Item label="Color de Destacado (Opcional)">
            <div className="flex items-center space-x-2">
              <ColorPicker
                value={selectedColor}
                onChange={(color) => setSelectedColor(color.toHexString())}
                showText={(color) => (
                  <span style={{ color: color.toHexString() }}>
                    {color.toHexString()}
                  </span>
                )}
              />
              <Text type="secondary">
                <InfoCircleOutlined className="mr-1" />
                Color para destacar visualmente este item en la lista
              </Text>
            </div>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  );
};

export default CoordinationItemModal;