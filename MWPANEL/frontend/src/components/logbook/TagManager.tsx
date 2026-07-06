/**
 * Componente para gestión de etiquetas de bitácora
 * Permite crear, editar y eliminar etiquetas con selector de color
 */

import React, { useState } from 'react';
import {
  Card,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  Row,
  Col,
  Space,
  Popconfirm,
  message,
  Typography,
  Badge,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BgColorsOutlined } from '@ant-design/icons';
import { LogbookTag, CreateLogbookTagDto, UpdateLogbookTagDto } from '../../types/logbook.types';
import useLogbook from '../../hooks/useLogbook';

const { Title, Text } = Typography;

interface TagManagerProps {
  visible?: boolean;
  onClose?: () => void;
  compact?: boolean;
  showStats?: boolean;
}

// Colores predefinidos para etiquetas
const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#14B8A6', // Teal
  '#F472B6', // Pink Light
];

const TagColorPicker: React.FC<{
  value?: string;
  onChange?: (color: string) => void;
}> = ({ value, onChange }) => {
  const [customColor, setCustomColor] = useState(value || PRESET_COLORS[0]);

  const handlePresetColorClick = (color: string) => {
    setCustomColor(color);
    onChange?.(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onChange?.(color);
  };

  return (
    <div>
      <div className="mb-3">
        <Text className="text-sm text-gray-600 mb-2 block">Colores predefinidos:</Text>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((color) => (
            <div
              key={color}
              className={`w-8 h-8 rounded-full cursor-pointer border-2 ${
                customColor === color ? 'border-gray-900' : 'border-gray-200'
              } hover:border-gray-400 transition-colors`}
              style={{ backgroundColor: color }}
              onClick={() => handlePresetColorClick(color)}
            />
          ))}
        </div>
      </div>

      <div>
        <Text className="text-sm text-gray-600 mb-2 block">Color personalizado:</Text>
        <div className="flex items-center space-x-2">
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="w-10 h-8 rounded border border-gray-300 cursor-pointer"
          />
          <Input
            value={customColor}
            onChange={(e) => handleCustomColorChange(e as any)}
            placeholder="#3B82F6"
            className="font-mono text-sm"
          />
        </div>
      </div>
    </div>
  );
};

const TagManager: React.FC<TagManagerProps> = ({
  visible = true,
  onClose,
  compact = false,
  showStats = true,
}) => {
  const {
    tags,
    tagsLoading,
    createTag,
    updateTag,
    deleteTag,
    getTagUsageStats,
  } = useLogbook();

  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<LogbookTag | null>(null);
  const [tagStats, setTagStats] = useState<{ [key: string]: number }>({});
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  // Cargar estadísticas de uso de etiquetas
  React.useEffect(() => {
    if (showStats && tags.length > 0) {
      getTagUsageStats().then((stats) => {
        const statsMap: { [key: string]: number } = {};
        stats.forEach((stat) => {
          statsMap[stat.tagId] = stat.entryCount;
        });
        setTagStats(statsMap);
      });
    }
  }, [tags, showStats, getTagUsageStats]);

  const handleCreateTag = async (values: CreateLogbookTagDto) => {
    try {
      await createTag(values);
      setIsCreateModalVisible(false);
      createForm.resetFields();
    } catch (error) {
      console.error('Error creating tag:', error);
    }
  };

  const handleEditTag = async (values: UpdateLogbookTagDto) => {
    if (!editingTag) return;

    try {
      await updateTag(editingTag.id, values);
      setIsEditModalVisible(false);
      setEditingTag(null);
      editForm.resetFields();
    } catch (error) {
      console.error('Error updating tag:', error);
    }
  };

  const handleDeleteTag = async (tag: LogbookTag) => {
    try {
      await deleteTag(tag.id);
      message.success(`Etiqueta "${tag.name}" eliminada`);
    } catch (error) {
      console.error('Error deleting tag:', error);
    }
  };

  const openEditModal = (tag: LogbookTag) => {
    setEditingTag(tag);
    editForm.setFieldsValue({
      name: tag.name,
      colorHex: tag.colorHex,
    });
    setIsEditModalVisible(true);
  };

  if (!visible) return null;

  const content = (
    <div className={compact ? 'p-0' : 'p-4'}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <Title level={compact ? 5 : 4} className="mb-1">
            Etiquetas de Bitácora
          </Title>
          <Text type="secondary">
            {tags.length} etiqueta{tags.length !== 1 ? 's' : ''} creada{tags.length !== 1 ? 's' : ''}
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalVisible(true)}
          loading={tagsLoading}
        >
          Nueva Etiqueta
        </Button>
      </div>

      <div className={compact ? 'space-y-2' : 'grid gap-3'}>
        {tagsLoading ? (
          <div className="text-center py-8">
            <Text type="secondary">Cargando etiquetas...</Text>
          </div>
        ) : tags.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <BgColorsOutlined className="text-4xl text-gray-400 mb-2" />
            <Title level={4} type="secondary">
              No hay etiquetas
            </Title>
            <Text type="secondary" className="mb-4 block">
              Crea tu primera etiqueta para organizar las entradas de tu bitácora
            </Text>
            <Button type="primary" onClick={() => setIsCreateModalVisible(true)}>
              Crear Primera Etiqueta
            </Button>
          </div>
        ) : (
          tags.map((tag) => (
            <Card
              key={tag.id}
              size="small"
              className="hover:shadow-md transition-shadow"
              bodyStyle={{ padding: compact ? '12px' : '16px' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: tag.colorHex }}
                  />
                  <div className="flex-1 min-w-0">
                    <Text strong className="block truncate">
                      {tag.name}
                    </Text>
                    {showStats && tagStats[tag.id] !== undefined && (
                      <Text type="secondary" className="text-xs">
                        {tagStats[tag.id]} entrada{tagStats[tag.id] !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </div>
                  {showStats && tagStats[tag.id] !== undefined && (
                    <Badge count={tagStats[tag.id]} showZero color={tag.colorHex} />
                  )}
                </div>

                <Space size="small">
                  <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => openEditModal(tag)}
                    type="text"
                  />
                  <Popconfirm
                    title="¿Eliminar etiqueta?"
                    description={`¿Estás seguro de que quieres eliminar "${tag.name}"?`}
                    onConfirm={() => handleDeleteTag(tag)}
                    okText="Eliminar"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                  >
                    <Button size="small" icon={<DeleteOutlined />} danger type="text" />
                  </Popconfirm>
                </Space>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal para crear etiqueta */}
      <Modal
        title="Nueva Etiqueta"
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateTag}
          initialValues={{ colorHex: PRESET_COLORS[0] }}
        >
          <Form.Item
            label="Nombre de la etiqueta"
            name="name"
            rules={[
              { required: true, message: 'El nombre es obligatorio' },
              { min: 2, message: 'Mínimo 2 caracteres' },
              { max: 50, message: 'Máximo 50 caracteres' },
            ]}
          >
            <Input placeholder="ej. Matemáticas, Ciencias..." />
          </Form.Item>

          <Form.Item label="Color" name="colorHex">
            <TagColorPicker />
          </Form.Item>

          <Form.Item className="mb-0">
            <Row gutter={8}>
              <Col span={12}>
                <Button block onClick={() => setIsCreateModalVisible(false)}>
                  Cancelar
                </Button>
              </Col>
              <Col span={12}>
                <Button type="primary" htmlType="submit" block>
                  Crear Etiqueta
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal para editar etiqueta */}
      <Modal
        title="Editar Etiqueta"
        open={isEditModalVisible}
        onCancel={() => {
          setIsEditModalVisible(false);
          setEditingTag(null);
          editForm.resetFields();
        }}
        footer={null}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={handleEditTag}>
          <Form.Item
            label="Nombre de la etiqueta"
            name="name"
            rules={[
              { required: true, message: 'El nombre es obligatorio' },
              { min: 2, message: 'Mínimo 2 caracteres' },
              { max: 50, message: 'Máximo 50 caracteres' },
            ]}
          >
            <Input placeholder="ej. Matemáticas, Ciencias..." />
          </Form.Item>

          <Form.Item label="Color" name="colorHex">
            <TagColorPicker />
          </Form.Item>

          <Form.Item className="mb-0">
            <Row gutter={8}>
              <Col span={12}>
                <Button block onClick={() => setIsEditModalVisible(false)}>
                  Cancelar
                </Button>
              </Col>
              <Col span={12}>
                <Button type="primary" htmlType="submit" block>
                  Guardar Cambios
                </Button>
              </Col>
            </Row>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Modal
      title="Gestión de Etiquetas"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
      destroyOnClose
    >
      {content}
    </Modal>
  );
};

export default TagManager;