/**
 * @archivo: ReportEditorDrawer.tsx
 * @módulo: Student Reports (Visión 360º)
 * @función: Drawer para redactar/editar reportes de estudiantes
 * @descripción: Editor Rich Text con selector de contexto (asignatura/etiqueta personalizada)
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Drawer,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Divider,
  Switch,
  Slider,
  Tag,
  Alert,
  Spin,
  message,
} from 'antd';
import {
  BookOutlined,
  TagOutlined,
  SaveOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  PlusOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Option, OptGroup } = Select;

// ===== TYPES =====

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  enrollmentNumber: string;
}

interface ReportFormData {
  studentId: string;
  subjectId?: string;
  customTag?: string;
  content: string;
  title?: string;
  priority: number;
  visibleToFamily: boolean;
}

interface ExistingReport extends ReportFormData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportEditorDrawerProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ReportFormData) => Promise<void>;
  student: Student;
  teacherSubjects: Subject[];
  customCategories: string[];
  editingReport?: ExistingReport | null;
  loading?: boolean;
  loadingSubjects?: boolean;
}

// ===== CONSTANTS =====

const PRIORITY_MARKS = {
  1: 'Bajo',
  2: 'Normal',
  3: 'Alto',
  4: 'Urgente',
};

const PRIORITY_COLORS = {
  1: '#52c41a',
  2: '#1890ff',
  3: '#faad14',
  4: '#ff4d4f',
};

// ===== COMPONENT =====

const ReportEditorDrawer: React.FC<ReportEditorDrawerProps> = ({
  open,
  onClose,
  onSave,
  student,
  teacherSubjects,
  customCategories,
  editingReport,
  loading = false,
  loadingSubjects = false,
}) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [contextType, setContextType] = useState<'subject' | 'custom'>('subject');
  const [newCustomTag, setNewCustomTag] = useState('');

  const isEditing = !!editingReport;

  // Inicializar formulario cuando se abre o cambia el reporte
  useEffect(() => {
    if (open) {
      if (editingReport) {
        // Modo edición
        setContextType(editingReport.subjectId ? 'subject' : 'custom');
        form.setFieldsValue({
          content: editingReport.content,
          title: editingReport.title || '',
          priority: editingReport.priority,
          visibleToFamily: editingReport.visibleToFamily,
          subjectId: editingReport.subjectId || undefined,
          customTag: editingReport.customTag || undefined,
        });
      } else {
        // Modo creación
        setContextType(teacherSubjects.length > 0 ? 'subject' : 'custom');
        form.resetFields();
        form.setFieldsValue({
          priority: 2,
          visibleToFamily: false,
        });
      }
    }
  }, [open, editingReport, form, teacherSubjects]);

  // Opciones combinadas para el selector
  const contextOptions = useMemo(() => {
    const options: { label: string; value: string; type: 'subject' | 'custom'; icon: React.ReactNode }[] = [];

    // Agregar asignaturas
    teacherSubjects.forEach((subject) => {
      options.push({
        label: `${subject.name} (${subject.code})`,
        value: `subject:${subject.id}`,
        type: 'subject',
        icon: <BookOutlined />,
      });
    });

    // Agregar categorías predefinidas
    customCategories.forEach((category) => {
      options.push({
        label: category,
        value: `custom:${category}`,
        type: 'custom',
        icon: <TagOutlined />,
      });
    });

    return options;
  }, [teacherSubjects, customCategories]);

  const handleContextChange = (value: string) => {
    const [type, id] = value.split(':');
    setContextType(type as 'subject' | 'custom');

    if (type === 'subject') {
      form.setFieldsValue({
        subjectId: id,
        customTag: undefined,
      });
    } else {
      form.setFieldsValue({
        subjectId: undefined,
        customTag: id,
      });
    }
  };

  const handleAddCustomTag = () => {
    if (newCustomTag.trim()) {
      form.setFieldsValue({
        subjectId: undefined,
        customTag: newCustomTag.trim(),
      });
      setContextType('custom');
      setNewCustomTag('');
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const data: ReportFormData = {
        studentId: student.id,
        content: values.content,
        title: values.title || undefined,
        priority: values.priority,
        visibleToFamily: values.visibleToFamily,
      };

      if (contextType === 'subject' && values.subjectId) {
        data.subjectId = values.subjectId;
      } else if (values.customTag) {
        data.customTag = values.customTag;
      }

      await onSave(data);
      message.success(isEditing ? 'Reporte actualizado correctamente' : 'Reporte creado correctamente');
      onClose();
    } catch (error: any) {
      if (error.errorFields) {
        message.error('Por favor, complete todos los campos requeridos');
      } else {
        message.error(error.message || 'Error al guardar el reporte');
      }
    } finally {
      setSaving(false);
    }
  };

  const currentContextValue = useMemo(() => {
    const subjectId = form.getFieldValue('subjectId');
    const customTag = form.getFieldValue('customTag');

    if (subjectId) {
      return `subject:${subjectId}`;
    } else if (customTag) {
      return `custom:${customTag}`;
    }
    return undefined;
  }, [form]);

  return (
    <Drawer
      title={
        <Space>
          {isEditing ? <SaveOutlined /> : <PlusOutlined />}
          <span>{isEditing ? 'Editar Reporte' : 'Nuevo Reporte'}</span>
        </Space>
      }
      placement="right"
      width={600}
      open={open}
      onClose={onClose}
      destroyOnClose
      extra={
        <Space>
          <Button onClick={onClose} icon={<CloseOutlined />}>
            Cancelar
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={saving}
            icon={<SaveOutlined />}
          >
            {isEditing ? 'Actualizar' : 'Guardar'}
          </Button>
        </Space>
      }
    >
      {/* Student Info */}
      <Alert
        message={
          <Space>
            <Text strong>Estudiante:</Text>
            <Text>{student.firstName} {student.lastName}</Text>
            <Tag>{student.enrollmentNumber}</Tag>
          </Space>
        }
        type="info"
        showIcon
        className="mb-4"
      />

      <Form
        form={form}
        layout="vertical"
        disabled={loading || saving}
      >
        {/* Context Selector */}
        <Form.Item
          label={
            <Space>
              <span>Contexto del Reporte</span>
              <Text type="secondary">(Asignatura o Categoría)</Text>
            </Space>
          }
          required
        >
          {loadingSubjects ? (
            <Spin size="small" />
          ) : (
            <Select
              placeholder="Selecciona una asignatura o categoría"
              onChange={handleContextChange}
              value={currentContextValue}
              style={{ width: '100%' }}
              showSearch
              optionFilterProp="label"
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ padding: '0 8px 4px' }}>
                    <Space.Compact style={{ width: '100%' }}>
                      <Input
                        placeholder="Etiqueta personalizada..."
                        value={newCustomTag}
                        onChange={(e) => setNewCustomTag(e.target.value)}
                        onPressEnter={handleAddCustomTag}
                      />
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddCustomTag}
                      >
                        Añadir
                      </Button>
                    </Space.Compact>
                  </div>
                </>
              )}
            >
              {teacherSubjects.length > 0 && (
                <OptGroup label="Mis Asignaturas">
                  {teacherSubjects.map((subject) => (
                    <Option
                      key={`subject:${subject.id}`}
                      value={`subject:${subject.id}`}
                      label={subject.name}
                    >
                      <Space>
                        <BookOutlined className="text-blue-500" />
                        <span>{subject.name}</span>
                        <Tag color="blue">{subject.code}</Tag>
                      </Space>
                    </Option>
                  ))}
                </OptGroup>
              )}
              <OptGroup label="Categorías Generales">
                {customCategories.map((category) => (
                  <Option
                    key={`custom:${category}`}
                    value={`custom:${category}`}
                    label={category}
                  >
                    <Space>
                      <TagOutlined className="text-orange-500" />
                      <span>{category}</span>
                    </Space>
                  </Option>
                ))}
              </OptGroup>
            </Select>
          )}
        </Form.Item>

        {/* Hidden fields for form values */}
        <Form.Item name="subjectId" hidden>
          <Input />
        </Form.Item>
        <Form.Item name="customTag" hidden>
          <Input />
        </Form.Item>

        {/* Title (optional) */}
        <Form.Item
          name="title"
          label="Título (opcional)"
        >
          <Input
            placeholder="Ej: Informe de seguimiento trimestral"
            maxLength={200}
            showCount
          />
        </Form.Item>

        {/* Content */}
        <Form.Item
          name="content"
          label="Contenido del Reporte"
          rules={[
            { required: true, message: 'El contenido es obligatorio' },
            { min: 10, message: 'El contenido debe tener al menos 10 caracteres' },
          ]}
        >
          <TextArea
            placeholder="Escribe aquí el contenido del reporte..."
            rows={8}
            showCount
            maxLength={5000}
          />
        </Form.Item>

        <Divider />

        {/* Priority */}
        <Form.Item
          name="priority"
          label={
            <Space>
              <ExclamationCircleOutlined />
              <span>Prioridad</span>
            </Space>
          }
        >
          <Slider
            marks={PRIORITY_MARKS}
            min={1}
            max={4}
            step={1}
            tooltip={{
              formatter: (value) => PRIORITY_MARKS[value as keyof typeof PRIORITY_MARKS],
            }}
            styles={{
              track: {
                background: form.getFieldValue('priority')
                  ? PRIORITY_COLORS[form.getFieldValue('priority') as keyof typeof PRIORITY_COLORS]
                  : PRIORITY_COLORS[2],
              },
            }}
          />
        </Form.Item>

        {/* Visibility */}
        <Form.Item
          name="visibleToFamily"
          valuePropName="checked"
          label={
            <Space>
              <TeamOutlined />
              <span>Visibilidad</span>
            </Space>
          }
          extra="Si está activo, las familias podrán ver este reporte"
        >
          <Switch
            checkedChildren="Visible para familias"
            unCheckedChildren="Solo profesores"
          />
        </Form.Item>
      </Form>

      {/* Editing Info */}
      {isEditing && editingReport && (
        <Alert
          message="Información de edición"
          description={
            <Text type="secondary">
              Creado el {new Date(editingReport.createdAt).toLocaleDateString('es-ES')}.
              {editingReport.createdAt !== editingReport.updatedAt && (
                <> Última edición: {new Date(editingReport.updatedAt).toLocaleDateString('es-ES')}.</>
              )}
            </Text>
          }
          type="warning"
          showIcon
          className="mt-4"
        />
      )}
    </Drawer>
  );
};

export default ReportEditorDrawer;
