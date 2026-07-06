import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  Switch,
  Button,
  Space,
  Typography,
  Divider,
  message,
  Spin,
} from 'antd';
import {
  FileTextOutlined,
  CalendarOutlined,
  TeamOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { coordinationSheetsApi, CoordinationSheet, CreateCoordinationSheetData } from '../../services/coordinationService';
import { usersApi } from '../../services/usersService';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface CoordinationSheetModalProps {
  visible: boolean;
  sheet?: CoordinationSheet | null;
  onClose: () => void;
  userRole?: 'admin' | 'teacher';
}

const CoordinationSheetModal: React.FC<CoordinationSheetModalProps> = ({
  visible,
  sheet,
  onClose,
  userRole = 'admin',
}) => {
  const [form] = Form.useForm();
  const [permissionLevel, setPermissionLevel] = useState<string>('open');
  const queryClient = useQueryClient();

  // Get teachers for restricted permission assignment
  const { data: teachers = [], isLoading: teachersLoading } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => usersApi.getTeachers(),
    enabled: visible, // Load teachers when modal is visible, not just when restricted
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: coordinationSheetsApi.createSheet,
    onSuccess: () => {
      message.success('Hoja de coordinación creada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['coordination-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['coordination-stats'] });
      onClose();
    },
    onError: () => {
      message.error('Error al crear la hoja de coordinación');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateCoordinationSheetData> }) =>
      coordinationSheetsApi.updateSheet(id, data),
    onSuccess: () => {
      message.success('Hoja de coordinación actualizada exitosamente');
      queryClient.invalidateQueries({ queryKey: ['coordination-sheets'] });
      queryClient.invalidateQueries({ queryKey: ['coordination-stats'] });
      onClose();
    },
    onError: () => {
      message.error('Error al actualizar la hoja de coordinación');
    },
  });

  useEffect(() => {
    if (visible) {
      if (sheet) {
        // Edit mode
        form.setFieldsValue({
          title: sheet.title,
          description: sheet.description,
          meeting_date: dayjs(sheet.meeting_date),
          permission_level: sheet.permission_level,
          allowed_editors: sheet.allowed_editors,
          is_editable: sheet.is_editable,
          is_active: sheet.is_active,
        });
        setPermissionLevel(sheet.permission_level);
      } else {
        // Create mode
        form.resetFields();
        form.setFieldsValue({
          permission_level: 'open',
          is_editable: true,
          is_active: true,
          meeting_date: dayjs().add(1, 'week'), // Default to next week
        });
        setPermissionLevel('open');
      }
    }
  }, [visible, sheet, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const data: CreateCoordinationSheetData = {
        title: values.title,
        description: values.description,
        meeting_date: values.meeting_date.format('YYYY-MM-DD'),
        permission_level: values.permission_level,
        allowed_editors: values.permission_level === 'restricted' ? values.allowed_editors : undefined,
        is_editable: values.is_editable,
        is_active: values.is_active,
      };

      if (sheet) {
        updateMutation.mutate({ id: sheet.id, data });
      } else {
        createMutation.mutate(data);
      }
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={
        <div className="flex items-center">
          <FileTextOutlined className="mr-2" />
          {sheet ? 'Editar Hoja de Coordinación' : 'Nueva Hoja de Coordinación'}
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      width={600}
      footer={
        <div className="flex justify-end space-x-2">
          <Button onClick={handleCancel}>
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={isLoading}
            icon={<FileTextOutlined />}
          >
            {sheet ? 'Actualizar' : 'Crear'} Hoja
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
          <Title level={5}>Información Básica</Title>
          
          <Form.Item
            name="title"
            label="Título de la Reunión"
            rules={[
              { required: true, message: 'El título es requerido' },
              { max: 255, message: 'El título no puede exceder 255 caracteres' }
            ]}
          >
            <Input
              placeholder="ej. Reunión Claustro 15/11/2024"
              prefix={<FileTextOutlined />}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Descripción (Opcional)"
          >
            <TextArea
              placeholder="Descripción de la reunión, objetivos, temas a tratar..."
              rows={3}
              maxLength={1000}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="meeting_date"
            label="Fecha de la Reunión"
            rules={[{ required: true, message: 'La fecha es requerida' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              placeholder="Selecciona la fecha"
              prefix={<CalendarOutlined />}
            />
          </Form.Item>

          <Divider />

          {/* Permissions */}
          <Title level={5}>
            <TeamOutlined className="mr-2" />
            Configuración de Permisos
          </Title>

          <Form.Item
            name="permission_level"
            label="Nivel de Permisos"
            rules={[{ required: true, message: 'Selecciona el nivel de permisos' }]}
          >
            <Select
              placeholder="Selecciona el nivel de permisos"
              onChange={setPermissionLevel}
            >
              <Select.Option value="open">
                <div>
                  <Text strong>Abierto</Text>
                  <div className="text-xs text-gray-500">
                    Todos los profesores pueden editar los puntos del día
                  </div>
                </div>
              </Select.Option>
              <Select.Option value="restricted">
                <div>
                  <Text strong>Restringido</Text>
                  <div className="text-xs text-gray-500">
                    Solo usuarios específicos pueden editar
                  </div>
                </div>
              </Select.Option>
              <Select.Option value="readonly">
                <div>
                  <Text strong>Solo Lectura</Text>
                  <div className="text-xs text-gray-500">
                    Solo el administrador puede editar
                  </div>
                </div>
              </Select.Option>
            </Select>
          </Form.Item>

          {permissionLevel === 'restricted' && (
            <Form.Item
              name="allowed_editors"
              label="Profesores con Permisos de Edición"
              rules={[
                { required: true, message: 'Selecciona al menos un profesor' }
              ]}
            >
              <Select
                mode="multiple"
                placeholder="Selecciona los profesores que pueden editar"
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

          <Divider />

          {/* Settings */}
          <Title level={5}>Configuración</Title>

          <Form.Item
            name="is_editable"
            label="Editable"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Sí" 
              unCheckedChildren="No" 
            />
          </Form.Item>

          <Text type="secondary" className="block mb-4">
            <InfoCircleOutlined className="mr-1" />
            Si está desactivado, solo el creador y el administrador pueden editar la hoja
          </Text>

          <Form.Item
            name="is_active"
            label="Activa"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Sí" 
              unCheckedChildren="No" 
            />
          </Form.Item>

          <Text type="secondary" className="block">
            <InfoCircleOutlined className="mr-1" />
            Las hojas inactivas solo son visibles para su creador y el administrador
          </Text>
        </Form>
      </Spin>
    </Modal>
  );
};

export default CoordinationSheetModal;