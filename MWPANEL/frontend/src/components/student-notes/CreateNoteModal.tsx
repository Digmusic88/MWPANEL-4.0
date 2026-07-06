import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Upload,
  Button,
  Radio,
  Switch,
  Space,
  Alert,
  Typography,
  Divider,
  Progress,
} from 'antd';
import {
  FileTextOutlined,
  AudioOutlined,
  PictureOutlined,
  SettingOutlined,
  UploadOutlined,
  InboxOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import type { RcFile, UploadFile, UploadProps } from 'antd/es/upload';
import useSubjects from '../../hooks/useSubjects';
import { useStudentNotes, useFileValidation } from '../../hooks/useStudentNotes';
import {
  CreateNoteModalProps,
  NoteType,
  CreateStudentNoteDto,
  UploadNoteFileDto,
  NoteFormData,
} from '../../types/student-notes';

const { TextArea } = Input;
const { Option } = Select;
const { Text: AntText } = Typography;
const { Dragger } = Upload;

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [form] = Form.useForm<NoteFormData>();
  const [noteType, setNoteType] = useState<NoteType>(initialData?.type || NoteType.TEXT);
  const [uploadedFile, setUploadedFile] = useState<RcFile | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Hooks
  const { subjects, loading: loadingSubjects } = useSubjects();
  const { createNote, uploadFileNote, isCreating, isUploading } = useStudentNotes();
  const { validateFile, formatFileSize } = useFileValidation();

  const isLoading = isCreating || isUploading;

  // Reset form cuando se abre/cierra el modal
  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setNoteType(initialData?.type || NoteType.TEXT);
      setUploadedFile(null);
      setUploadProgress(0);
      
      // Set initial values if provided
      if (initialData) {
        form.setFieldsValue({
          type: initialData.type,
          subjectId: initialData.subjectId,
          tags: initialData.tags || [],
          isPublic: !(initialData.isPrivate ?? true), // Invertir lógica: si isPrivate=true entonces isPublic=false
        });
      }
    }
  }, [isOpen, initialData, form]);

  // Configuración de tipos de notas
  const noteTypeOptions = [
    {
      value: NoteType.TEXT,
      label: 'TEXTO',
      icon: <FileTextOutlined />,
      description: 'Apunte escrito con texto',
    },
    {
      value: NoteType.VOICE,
      label: 'AUDIO',
      icon: <AudioOutlined />,
      description: 'Grabación de audio o archivo de sonido',
    },
    {
      value: NoteType.DRAWING,
      label: 'DIBUJO',
      icon: <PictureOutlined />,
      description: 'Imagen, dibujo o esquema visual',
    },
    {
      value: NoteType.PRESENTATION,
      label: 'PRESENTACIÓN',
      icon: <FileImageOutlined />,
      description: 'Presentación con slides y diapositivas',
    },
    {
      value: NoteType.MIXED,
      label: 'Apunte Mixto',
      icon: <SettingOutlined />,
      description: 'Combinación de texto y archivos',
    },
  ];

  // Validar archivo antes de subir
  const handleBeforeUpload = (file: RcFile): boolean => {
    const validation = validateFile(file, noteType);
    
    if (!validation.isValid) {
      Modal.error({
        title: 'Archivo no válido',
        content: validation.error,
      });
      return false;
    }

    setUploadedFile(file);
    return false; // Prevent automatic upload
  };

  // Remover archivo
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setUploadProgress(0);
  };

  // Configuración de upload
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    beforeUpload: handleBeforeUpload,
    onRemove: handleRemoveFile,
    fileList: uploadedFile ? [{
      uid: '1',
      name: uploadedFile.name,
      status: 'done' as const,
      size: uploadedFile.size,
    }] : [],
    accept: noteType === NoteType.VOICE 
      ? 'audio/*' 
      : noteType === NoteType.DRAWING 
        ? 'image/*' 
        : '*/*',
  };

  // Manejar envío del formulario
  const handleSubmit = async (values: NoteFormData) => {
    try {
      const baseData = {
        title: values.title,
        content: values.content,
        type: noteType,
        subjectId: values.subjectId,
        tags: values.tags,
        isPrivate: !values.isPublic, // Convertir isPublic de vuelta a isPrivate
      };

      if (uploadedFile) {
        // Crear nota con archivo
        const uploadData: UploadNoteFileDto = {
          ...baseData,
          metadata: {
            originalFileName: uploadedFile.name,
            fileSize: uploadedFile.size,
            mimeType: uploadedFile.type,
          },
        };

        await uploadFileNote(
          { file: uploadedFile, data: uploadData },
          {
            onSuccess: (newNote) => {
              onSuccess(newNote);
              form.resetFields();
              setUploadedFile(null);
            },
          }
        );
      } else {
        // Crear nota solo de texto
        const textData: CreateStudentNoteDto = baseData;

        await createNote(textData, {
          onSuccess: (newNote) => {
            onSuccess(newNote);
            form.resetFields();
          },
        });
      }
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  // Renderizar tipo de nota con descripción
  const renderNoteType = (option: typeof noteTypeOptions[0]) => (
    <div className="flex items-center space-x-3 p-2">
      <div className="text-lg" style={{ color: '#1890ff' }}>
        {option.icon}
      </div>
      <div>
        <div className="font-medium">{option.label}</div>
        <div className="text-xs text-gray-500">{option.description}</div>
      </div>
    </div>
  );

  // Renderizar área de upload según el tipo
  const renderUploadArea = () => {
    if (noteType === NoteType.TEXT) {
      return (
        <Alert
          message="Las notas de texto no requieren archivos adjuntos"
          type="info"
          showIcon
        />
      );
    }

    return (
      <Dragger {...uploadProps} className="upload-area">
        <div className="p-6 text-center">
          <p className="ant-upload-drag-icon">
            <InboxOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
          </p>
          <p className="ant-upload-text text-base font-medium">
            {noteType === NoteType.VOICE 
              ? 'Sube tu archivo de audio' 
              : noteType === NoteType.DRAWING 
                ? 'Sube tu imagen o dibujo'
                : 'Sube tu archivo'
            }
          </p>
          <p className="ant-upload-hint text-sm text-gray-500">
            Arrastra y suelta el archivo aquí, o haz clic para seleccionar.
            <br />
            Tamaño máximo: 20MB
          </p>
        </div>
      </Dragger>
    );
  };

  return (
    <Modal
      title={
        <div className="flex items-center space-x-2">
          <FileTextOutlined />
          <span>Crear Nuevo Apunte</span>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      width={700}
      footer={null}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          type: NoteType.TEXT,
          isPublic: false, // Por defecto privado (isPublic = false)
          tags: [],
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Tipo de apunte */}
          <Form.Item
            name="type"
            label="Tipo de Apunte"
            rules={[{ required: true, message: 'Selecciona el tipo de apunte' }]}
          >
            <Radio.Group
              value={noteType}
              onChange={(e) => {
                setNoteType(e.target.value);
                setUploadedFile(null); // Reset file when changing type
              }}
              className="w-full"
            >
              <div className="grid grid-cols-2 gap-3">
                {noteTypeOptions.map((option) => (
                  <Radio.Button
                    key={option.value}
                    value={option.value}
                    className="h-auto border-2"
                  >
                    {renderNoteType(option)}
                  </Radio.Button>
                ))}
              </div>
            </Radio.Group>
          </Form.Item>

          {/* Título */}
          <Form.Item
            name="title"
            label="Título del Apunte"
            rules={[
              { required: true, message: 'El título es obligatorio' },
              { min: 1, max: 255, message: 'El título debe tener entre 1 y 255 caracteres' },
            ]}
          >
            <Input
              placeholder="Escribe un título descriptivo para tu apunte..."
              size="large"
            />
          </Form.Item>

          {/* Contenido */}
          <Form.Item
            name="content"
            label="Contenido"
            rules={[
              { required: true, message: 'El contenido es obligatorio' },
              { min: 1, message: 'El contenido no puede estar vacío' },
            ]}
          >
            <TextArea
              placeholder={
                noteType === NoteType.TEXT
                  ? "Escribe tu apunte aquí..."
                  : noteType === NoteType.VOICE
                    ? "Describe brevemente el contenido de tu audio..."
                    : "Describe tu imagen o dibujo..."
              }
              autoSize={{ minRows: 4, maxRows: 8 }}
            />
          </Form.Item>

          {/* Upload de archivo */}
          <Form.Item label="Archivo Adjunto">
            {renderUploadArea()}
            {uploadedFile && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <FileTextOutlined />
                    <span className="text-sm font-medium">{uploadedFile.name}</span>
                    <span className="text-xs text-gray-500">
                      ({formatFileSize(uploadedFile.size)})
                    </span>
                  </div>
                  <Button size="small" danger onClick={handleRemoveFile}>
                    Eliminar
                  </Button>
                </div>
              </div>
            )}
          </Form.Item>

          <Divider />

          {/* Asignatura */}
          <Form.Item
            name="subjectId"
            label="Asignatura (Opcional)"
          >
            <Select
              placeholder="Selecciona una asignatura..."
              allowClear
              loading={loadingSubjects}
              size="large"
            >
              {subjects?.map((subject) => (
                <Option key={subject.id} value={subject.id}>
                  {subject.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Etiquetas */}
          <Form.Item
            name="tags"
            label="Etiquetas (Opcional)"
          >
            <Select
              mode="tags"
              placeholder="Añade etiquetas para organizar tus apuntes..."
              style={{ width: '100%' }}
              size="large"
            />
          </Form.Item>

          {/* Configuración de privacidad */}
          <Form.Item
            name="isPublic"
            label="Privacidad"
            valuePropName="checked"
          >
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <AntText strong>Apunte público</AntText>
                <br />
                <AntText type="secondary" className="text-sm">
                  Este apunte será visible para compañeros y profesores que elijas compartir
                </AntText>
              </div>
              <Switch />
            </div>
          </Form.Item>

          {/* Botones de acción */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button size="large" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={isLoading}
              icon={<FileTextOutlined />}
            >
              {uploadedFile ? 'Crear con Archivo' : 'Crear Apunte'}
            </Button>
          </div>
        </motion.div>
      </Form>
    </Modal>
  );
};

export default CreateNoteModal;