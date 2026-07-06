/**
 * Modal para crear y editar carpetas de rúbricas
 * Interfaz moderna con selección de colores e iconos
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  ColorPicker,
  TreeSelect,
  Switch,
  Space,
  Button,
  Typography,
  Row,
  Col,
  Card,
  message,
  Divider
} from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  FileTextOutlined,
  BookOutlined,
  TagsOutlined,
  StarOutlined,
  HeartOutlined,
  FlagOutlined,
  TagOutlined,
  TrophyOutlined,
  CalculatorOutlined,
  ExperimentOutlined,
  BuildOutlined,
  ReadOutlined,
  EditOutlined
} from '@ant-design/icons';
import { RubricFolder, CreateFolderDto, UpdateFolderDto } from '../../services/rubricFoldersApi';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface FolderModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (folderData: CreateFolderDto | UpdateFolderDto) => Promise<void>;
  editingFolder?: RubricFolder | null;
  availableFolders: RubricFolder[];
  loading?: boolean;
}

// Mapa de iconos disponibles
const ICON_MAP = {
  'folder': <FolderOutlined />,
  'folder-open': <FolderOpenOutlined />,
  'file-text': <FileTextOutlined />,
  'book': <BookOutlined />,
  'tags': <TagsOutlined />,
  'star': <StarOutlined />,
  'heart': <HeartOutlined />,
  'flag': <FlagOutlined />,
  'bookmark': <TagOutlined />,
  'trophy': <TrophyOutlined />,
  'calculator': <CalculatorOutlined />,
  'experiment': <ExperimentOutlined />,
  'build': <BuildOutlined />,
  'read': <ReadOutlined />,
  'edit': <EditOutlined />,
};

const PREDEFINED_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', 
  '#F44336', '#795548', '#607D8B', '#E91E63',
  '#00BCD4', '#FFEB3B', '#8BC34A', '#3F51B5'
];

export const FolderModal: React.FC<FolderModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  editingFolder,
  availableFolders,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [selectedColor, setSelectedColor] = useState('#4CAF50');
  const [selectedIcon, setSelectedIcon] = useState('folder');

  useEffect(() => {
    if (visible) {
      if (editingFolder) {
        // Modo edición - cargar datos existentes
        form.setFieldsValue({
          name: editingFolder.name,
          description: editingFolder.description,
          parentFolderId: editingFolder.parentFolderId,
          isShared: editingFolder.isShared,
          orderIndex: editingFolder.orderIndex
        });
        setSelectedColor(editingFolder.color || '#4CAF50');
        setSelectedIcon(editingFolder.icon || 'folder');
      } else {
        // Modo creación - valores por defecto
        form.resetFields();
        setSelectedColor('#4CAF50');
        setSelectedIcon('folder');
        form.setFieldsValue({
          isShared: false,
          orderIndex: 0
        });
      }
    }
  }, [visible, editingFolder, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const folderData = {
        ...values,
        color: selectedColor,
        icon: selectedIcon,
      };

      await onSubmit(folderData);
      message.success(editingFolder ? 'Carpeta actualizada exitosamente' : 'Carpeta creada exitosamente');
      form.resetFields();
    } catch (error) {
      console.error('Error en formulario:', error);
    }
  };

  // Crear opciones de TreeSelect para carpetas padre
  const getFolderTreeData = (folders: RubricFolder[], excludeId?: string): any[] => {
    return folders
      .filter(folder => folder.id !== excludeId && !folder.isSystemFolder)
      .map(folder => ({
        title: folder.name,
        value: folder.id,
        key: folder.id,
        children: folder.subfolders ? getFolderTreeData(folder.subfolders, excludeId) : []
      }));
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {ICON_MAP[selectedIcon as keyof typeof ICON_MAP]}
          <Title level={4} style={{ margin: 0 }}>
            {editingFolder ? 'Editar Carpeta' : 'Nueva Carpeta'}
          </Title>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={650}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancelar
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading}
          onClick={handleSubmit}
          style={{ backgroundColor: selectedColor, borderColor: selectedColor }}
        >
          {editingFolder ? 'Actualizar' : 'Crear'} Carpeta
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
      >
        {/* Información Básica */}
        <Card title="Información Básica" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Nombre de la carpeta"
                name="name"
                rules={[
                  { required: true, message: 'El nombre es obligatorio' },
                  { max: 255, message: 'Máximo 255 caracteres' }
                ]}
              >
                <Input 
                  placeholder="Ej: Rúbricas de Matemáticas"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Descripción"
                name="description"
              >
                <TextArea 
                  placeholder="Descripción opcional de la carpeta..."
                  rows={3}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Personalización Visual */}
        <Card title="Personalización Visual" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Color">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <ColorPicker
                    value={selectedColor}
                    onChange={(color) => setSelectedColor(color.toHexString())}
                    showText
                    size="large"
                    style={{ width: '100%' }}
                  />
                  <div>
                    <Text type="secondary">Colores sugeridos:</Text>
                    <div style={{ marginTop: 8 }}>
                      {PREDEFINED_COLORS.map(color => (
                        <Button
                          key={color}
                          size="small"
                          style={{
                            backgroundColor: color,
                            border: selectedColor === color ? '2px solid #000' : '1px solid #d9d9d9',
                            width: 24,
                            height: 24,
                            margin: '0 4px 4px 0',
                            padding: 0
                          }}
                          onClick={() => setSelectedColor(color)}
                        />
                      ))}
                    </div>
                  </div>
                </Space>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Icono">
                <Select
                  value={selectedIcon}
                  onChange={setSelectedIcon}
                  size="large"
                  style={{ width: '100%' }}
                >
                  {Object.entries(ICON_MAP).map(([key, icon]) => (
                    <Option key={key} value={key}>
                      <Space>
                        {icon}
                        <span style={{ textTransform: 'capitalize' }}>
                          {key.replace('-', ' ')}
                        </span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Organización */}
        <Card title="Organización" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                label="Carpeta padre"
                name="parentFolderId"
              >
                <TreeSelect
                  placeholder="Seleccionar carpeta padre (opcional)"
                  allowClear
                  treeData={getFolderTreeData(availableFolders, editingFolder?.id)}
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Orden"
                name="orderIndex"
                tooltip="Orden de visualización (número menor aparece primero)"
              >
                <Input
                  type="number"
                  min={0}
                  size="large"
                  placeholder="0"
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* Opciones de Compartir */}
        <Card title="Opciones de Compartir" size="small">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                label="Compartir carpeta"
                name="isShared"
                valuePropName="checked"
                tooltip="Permitir que otros profesores accedan a esta carpeta"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 Las carpetas compartidas permiten colaboración entre profesores. 
              Los permisos específicos se pueden configurar después de crear la carpeta.
            </Text>
          </div>
        </Card>
      </Form>

      {/* Vista previa */}
      <Divider>Vista Previa</Divider>
      <div style={{ textAlign: 'center', padding: 16 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '8px 16px',
            backgroundColor: selectedColor + '20',
            border: `2px solid ${selectedColor}`,
            borderRadius: 8,
            color: selectedColor
          }}
        >
          {ICON_MAP[selectedIcon as keyof typeof ICON_MAP]}
          <Text style={{ marginLeft: 8, color: selectedColor, fontWeight: 'bold' }}>
            {form.getFieldValue('name') || 'Nombre de la carpeta'}
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default FolderModal;