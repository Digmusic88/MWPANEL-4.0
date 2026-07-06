import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  Button,
  Switch,
  Tag,
  Card,
  message,
  Upload,
  UploadProps,
  Divider
} from 'antd';
import {
  PictureOutlined,
  SaveOutlined,
  CloseOutlined,
  BookOutlined,
  TagsOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  CloudUploadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload';
import { StudentNote } from '../../types/student-notes';
import useSubjects from '../../hooks/useSubjects';
import apiClient from '../../services/apiClient';

const { Title, Text: AntText, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface DrawingEditModalProps {
  note: StudentNote | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNote: StudentNote) => void;
}

const DrawingEditModal: React.FC<DrawingEditModalProps> = ({
  note,
  isOpen,
  onClose,
  onSave,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [replaceImage, setReplaceImage] = useState(false);
  
  const { subjects = [] } = useSubjects();

  // Inicializar formulario cuando se abre el modal
  useEffect(() => {
    if (note && isOpen) {
      form.setFieldsValue({
        title: note.title,
        content: note.content || '',
        subjectId: note.subjectId || undefined,
        isPrivate: note.isPrivate,
      });
      setNewTags(note.tagsArray || []);
      setReplaceImage(false);
      setFileList([]);
    }
  }, [note, isOpen, form]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      
      if (!note) return;

      // Si hay un nuevo archivo, lo subimos
      if (replaceImage && fileList.length > 0) {
        const file = fileList[0];
        if (file.originFileObj) {
          const formData = new FormData();
          formData.append('file', file.originFileObj);
          formData.append('title', values.title);
          formData.append('content', values.content || '');
          formData.append('isPrivate', values.isPrivate.toString());
          // Para FormData, las tags se envían como JSON string
          formData.append('tags', JSON.stringify(newTags));
          if (values.subjectId) {
            formData.append('subjectId', values.subjectId);
          }

          console.log('🎨 Subiendo nueva imagen para dibujo:', note.id);
          
          // Usar endpoint de upload para reemplazar imagen
          const response = await apiClient.post('/student-notes/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          // Eliminar la nota anterior y usar la nueva
          await apiClient.delete(`/student-notes/${note.id}`);
          
          message.success('Imagen actualizada exitosamente');
          onSave(response.data);
          handleClose();
          return;
        }
      }

      // Si no hay nueva imagen, solo actualizar metadatos
      const updateData = {
        title: values.title,
        content: values.content || '',
        subjectId: values.subjectId || null,
        isPrivate: values.isPrivate,
        tags: newTags,  // Enviar array directamente, no JSON string
      };

      console.log('🎨 Actualizando metadatos de dibujo:', note.id, updateData);

      const response = await apiClient.put(`/student-notes/${note.id}`, updateData);
      
      message.success('Dibujo actualizado exitosamente');
      onSave(response.data);
      handleClose();
      
    } catch (error) {
      console.error('🎨 Error al guardar dibujo:', error);
      message.error('Error al actualizar el dibujo');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setNewTags([]);
    setTagInput('');
    setFileList([]);
    setReplaceImage(false);
    onClose();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !newTags.includes(tagInput.trim())) {
      setNewTags([...newTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setNewTags(newTags.filter(tag => tag !== tagToRemove));
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('Solo se pueden subir archivos de imagen');
        return false;
      }
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('La imagen debe ser menor a 10MB');
        return false;
      }
      setFileList([file as UploadFile]);
      return false; // Prevent auto upload
    },
    fileList,
    onRemove: () => {
      setFileList([]);
    },
    maxCount: 1,
  };

  if (!note) return null;

  return (
    <Modal
      title={
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <PictureOutlined className="text-orange-600 text-lg" />
          </div>
          <div>
            <AntText className="text-lg font-semibold">Editar Dibujo</AntText>
            <br />
            <AntText type="secondary" className="text-sm">
              Modificar información del dibujo
            </AntText>
          </div>
        </div>
      }
      open={isOpen}
      onCancel={handleClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          <CloseOutlined /> Cancelar
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          icon={<SaveOutlined />}
          loading={loading}
          onClick={handleSave}
        >
          Guardar Cambios
        </Button>,
      ]}
      className="drawing-edit-modal"
    >
      <div className="space-y-6">
        {/* Vista previa de la imagen actual */}
        <Card size="small" title="Imagen actual">
          <div className="text-center">
            <PictureOutlined className="text-4xl text-orange-400 mb-2" />
            <Paragraph type="secondary" className="text-sm">
              {note.fileName || 'imagen-dibujo.jpg'}
            </Paragraph>
          </div>
        </Card>

        <Form form={form} layout="vertical" className="space-y-4">
          {/* Título */}
          <Form.Item
            label="Título"
            name="title"
            rules={[{ required: true, message: 'El título es obligatorio' }]}
          >
            <Input 
              placeholder="Título del dibujo"
              maxLength={200}
              showCount
            />
          </Form.Item>

          {/* Descripción */}
          <Form.Item
            label="Descripción"
            name="content"
          >
            <TextArea
              placeholder="Describe tu dibujo (opcional)"
              rows={4}
              maxLength={1000}
              showCount
            />
          </Form.Item>

          {/* Asignatura */}
          <Form.Item label="Asignatura" name="subjectId">
            <Select
              placeholder="Seleccionar asignatura (opcional)"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              {subjects.map((subject) => (
                <Option key={subject.id} value={subject.id}>
                  <Space>
                    <BookOutlined />
                    {subject.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Etiquetas */}
          <Form.Item label="Etiquetas">
            <Space direction="vertical" className="w-full">
              <Space.Compact className="w-full">
                <Input
                  placeholder="Agregar etiqueta"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onPressEnter={handleAddTag}
                  maxLength={50}
                />
                <Button type="primary" onClick={handleAddTag}>
                  <TagsOutlined /> Añadir
                </Button>
              </Space.Compact>
              {newTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {newTags.map((tag, index) => (
                    <Tag
                      key={index}
                      closable
                      onClose={() => handleRemoveTag(tag)}
                      color="purple"
                    >
                      {tag}
                    </Tag>
                  ))}
                </div>
              )}
            </Space>
          </Form.Item>

          {/* Privacidad */}
          <Form.Item label="Visibilidad" name="isPrivate" valuePropName="checked">
            <Space>
              <Switch />
              <AntText>
                {form.getFieldValue('isPrivate') ? (
                  <><EyeInvisibleOutlined /> Privado (solo tú puedes verlo)</>
                ) : (
                  <><EyeOutlined /> Público (visible para profesores)</>
                )}
              </AntText>
            </Space>
          </Form.Item>

          <Divider>Reemplazar imagen (opcional)</Divider>

          {/* Opción para reemplazar imagen */}
          <Form.Item>
            <Space direction="vertical" className="w-full">
              <div className="flex items-center space-x-2">
                <Switch 
                  checked={replaceImage}
                  onChange={setReplaceImage}
                />
                <AntText>Subir nueva imagen</AntText>
              </div>
              
              {replaceImage && (
                <Upload.Dragger
                  {...uploadProps}
                  className="mt-4"
                >
                  <p className="ant-upload-drag-icon">
                    <CloudUploadOutlined className="text-orange-500" />
                  </p>
                  <p className="ant-upload-text">
                    Haz clic o arrastra una imagen aquí
                  </p>
                  <p className="ant-upload-hint">
                    Formatos soportados: JPG, PNG, GIF (máx. 10MB)
                  </p>
                </Upload.Dragger>
              )}
            </Space>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default DrawingEditModal;