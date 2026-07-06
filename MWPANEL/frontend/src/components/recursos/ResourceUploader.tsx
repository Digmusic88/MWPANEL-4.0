/**
 * @archivo: ResourceUploader.tsx
 * @módulo: Educational Resources (Componente de Subida de Recursos)
 * @función: Formulario de subida de recursos educativos a Google Drive
 * @crítico: SÍ - Recientemente reparado, funciona al 100%
 * @dependencias: educationalResourcesService, Ant Design Upload
 * @no_modificar: Configuración de tipos MIME sin verificar backend
 * @relacionado_con: educationalResourcesService.ts, ResourceList.tsx
 */

/**
 * COMPONENTE: ResourceUploader
 * UBICACIÓN: /frontend/src/components/recursos/ResourceUploader.tsx
 * FUNCIÓN: Subida de archivos educativos con validación y metadatos
 * NO USAR PARA: Subida de imágenes de perfil o archivos de tareas
 * PROPS CRÍTICAS:
 *   - onUploadSuccess: Callback tras subida exitosa
 *   - subjects: Lista de asignaturas disponibles
 *   - levels: Niveles educativos disponibles
 * SERVICIOS QUE USA: educationalResourcesService.uploadResource
 * COMPONENTES HIJOS: Upload dragger, Form validation, Progress indicators
 *
 * VALIDACIONES IMPLEMENTADAS:
 * - Tamaño máximo: 50MB por archivo
 * - Tipos permitidos: PDF, DOC, PPT, XLS, MP4, MP3, JPG, PNG, GIF
 * - Campos obligatorios: título, tipo, nivel, asignatura
 * - Validación de formulario con Ant Design
 *
 * FLUJO DE SUBIDA:
 * 1. Usuario selecciona archivo y completa metadatos
 * 2. Validación cliente (tamaño, tipo)
 * 3. Envío a /api/recursos/google-drive-upload
 * 4. Backend: Subida automática a Google Drive + BD
 * 5. Respuesta con enlaces directos de Drive
 *
 * ESTADO ACTUAL: ✅ FUNCIONAL 100% (reparado 2025-07-12)
 * - Fix de stream conversion para Google Drive
 * - Validación correcta de MIME types
 * - Manejo de errores mejorado
 */

import React, { useState, useCallback } from 'react';
import {
  Upload,
  Form,
  Input,
  Select,
  Button,
  Card,
  Progress,
  message,
  Spin,
  Tag,
  Space,
  Alert,
  Tabs,
} from 'antd';
import {
  InboxOutlined,
  FileOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  Html5Outlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  AudioOutlined,
  LinkOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import educationalResourcesService, {
  CreateResourceDto,
  ResourceType,
  CreateLinkResourceDto,
  LinkPreviewData,
} from '../../services/educationalResourcesService';
import apiClient from '../../services/apiClient';

const { Dragger } = Upload;
const { TextArea } = Input;

interface ResourceUploaderProps {
  onSuccess?: (resource: any) => void;
  onCancel?: () => void;
  showAuthorField?: boolean; // Para administradores
}

const resourceIcons: Record<keyof ResourceType, React.ReactNode> = {
  PDF: <FilePdfOutlined />,
  VIDEO: <VideoCameraOutlined />,
  IMAGE: <PictureOutlined />,
  INTERACTIVE_HTML: <Html5Outlined />,
  DOCUMENT: <FileOutlined />,
  PRESENTATION: <FilePptOutlined />,
  SPREADSHEET: <FileExcelOutlined />,
  AUDIO: <AudioOutlined />,
};

const ResourceUploader: React.FC<ResourceUploaderProps> = ({
  onSuccess,
  onCancel,
  showAuthorField = false,
}) => {
  const [form] = Form.useForm();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedEducationLevel, setSelectedEducationLevel] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [availableFolders, setAvailableFolders] = useState<any[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [availableAuthors, setAvailableAuthors] = useState<any[]>([]);

  // Link tab state
  const [activeTab, setActiveTab] = useState<'file' | 'link'>('file');
  const [linkForm] = Form.useForm();
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [linkUploading, setLinkUploading] = useState(false);
  const [linkSelectedEducationLevel, setLinkSelectedEducationLevel] = useState<string>('');
  const [linkSelectedSubject, setLinkSelectedSubject] = useState<string>('');
  const [linkAvailableFolders, setLinkAvailableFolders] = useState<any[]>([]);
  const [linkLoadingFolders, setLinkLoadingFolders] = useState(false);

  // Fetch metadata
  const { data: metadata, isLoading: metadataLoading, error: metadataError } = useQuery({
    queryKey: ['resource-metadata-uploader'],
    queryFn: async () => {
      console.log('🔍 UPLOADER: Fetching resource metadata...');
      const result = await educationalResourcesService.getResourceMetadata();
      console.log('📊 UPLOADER: Metadata received:', {
        subjects: result?.subjects?.length || 0,
        levels: result?.levels?.length || 0,
        types: result?.types?.length || 0
      });
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    onError: (error) => {
      console.error('❌ UPLOADER: Error fetching metadata:', error);
    }
  });

  // Fetch authors (teachers and admins) when needed
  const { data: authorsData } = useQuery({
    queryKey: ['resource-authors'],
    queryFn: async () => {
      if (!showAuthorField) return [];

      const [teachersRes, adminsRes] = await Promise.all([
        apiClient.get('/teachers'),
        apiClient.get('/users', { params: { role: 'admin' } })
      ]);

      const authors = [
        ...(teachersRes.data || [])
          .filter((teacher: any) => teacher?.user?.id) // Filter out invalid teachers
          .map((teacher: any) => ({
            id: teacher.user.id,
            name: `${teacher.user?.profile?.firstName || ''} ${teacher.user?.profile?.lastName || ''}`.trim() || 'Usuario sin nombre',
            role: 'Profesor',
            email: teacher.user?.email
          })),
        ...(adminsRes.data || []).map((admin: any) => ({
          id: admin.id,
          name: `${admin.profile.firstName} ${admin.profile.lastName}`,
          role: 'Administrador',
          email: admin.email
        }))
      ];

      return authors;
    },
    enabled: showAuthorField,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Detect resource type from file
  const detectResourceType = (file: File): keyof ResourceType => {
    const mimeType = file.type;

    if (mimeType === 'application/pdf') return 'PDF';
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType.startsWith('image/')) return 'IMAGE';
    if (mimeType === 'text/html' || file.name.endsWith('.html')) return 'INTERACTIVE_HTML';
    if (mimeType.includes('presentation') || file.name.endsWith('.ppt') || file.name.endsWith('.pptx')) return 'PRESENTATION';
    if (mimeType.includes('spreadsheet') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) return 'SPREADSHEET';
    if (mimeType.startsWith('audio/')) return 'AUDIO';

    return 'DOCUMENT';
  };

  // Validate file size
  const validateFileSize = (file: File): boolean => {
    if (!metadata?.limits) return true;

    return file.size <= metadata.limits.maxFileSize;
  };

  const handleFileSelect = (file: File) => {
    const type = detectResourceType(file);

    if (!validateFileSize(file)) {
      const maxSizeMB = metadata?.limits ? (metadata.limits.maxFileSize / 1024 / 1024).toFixed(1) : '50';
      message.error(
        `El archivo excede el tamaño máximo permitido (${maxSizeMB}MB)`
      );
      return false;
    }

    setFile(file);
    form.setFieldsValue({
      type,
      title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    });

    return false; // Prevent auto upload
  };

  const getGradeLevels = () => {
    if (!selectedEducationLevel || !metadata?.levels) return [];

    const level = metadata.levels.find(
      (el: any) => el.id === selectedEducationLevel
    );

    if (!level) return [];

    // Return the grades from the level metadata
    return level.grades || [];
  };

  const getLinkGradeLevels = () => {
    if (!linkSelectedEducationLevel || !metadata?.levels) return [];

    const level = metadata.levels.find(
      (el: any) => el.id === linkSelectedEducationLevel
    );

    if (!level) return [];

    return level.grades || [];
  };

  const loadFoldersForSubject = async (subjectId: string) => {
    if (!subjectId) {
      setAvailableFolders([]);
      return;
    }

    try {
      setLoadingFolders(true);
      const folders = await educationalResourcesService.getFolders(subjectId);

      // Flatten folder hierarchy for easier selection
      const flattenFolders = (folders: any[], level: number = 0): any[] => {
        return folders.reduce((acc: any[], folder: any) => {
          acc.push({
            ...folder,
            level,
            displayName: '  '.repeat(level) + folder.name
          });
          if (folder.subfolders && folder.subfolders.length > 0) {
            acc.push(...flattenFolders(folder.subfolders, level + 1));
          }
          return acc;
        }, []);
      };

      setAvailableFolders(flattenFolders(folders));
    } catch (error) {
      console.error('Error loading folders:', error);
      setAvailableFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  const loadLinkFoldersForSubject = async (subjectId: string) => {
    if (!subjectId) {
      setLinkAvailableFolders([]);
      return;
    }

    try {
      setLinkLoadingFolders(true);
      const folders = await educationalResourcesService.getFolders(subjectId);

      const flattenFolders = (folders: any[], level: number = 0): any[] => {
        return folders.reduce((acc: any[], folder: any) => {
          acc.push({
            ...folder,
            level,
            displayName: '  '.repeat(level) + folder.name
          });
          if (folder.subfolders && folder.subfolders.length > 0) {
            acc.push(...flattenFolders(folder.subfolders, level + 1));
          }
          return acc;
        }, []);
      };

      setLinkAvailableFolders(flattenFolders(folders));
    } catch (error) {
      console.error('Error loading folders for link:', error);
      setLinkAvailableFolders([]);
    } finally {
      setLinkLoadingFolders(false);
    }
  };

  const handleSubmit = async (values: CreateResourceDto) => {
    if (!file) {
      message.error('Por favor selecciona un archivo');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 500);

      const resource = await educationalResourcesService.uploadResource(
        file,
        values
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      message.success('Recurso subido exitosamente');

      if (onSuccess) {
        onSuccess(resource);
      }

      // Reset form
      form.resetFields();
      setFile(null);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Upload error:', error);
      message.error(error.response?.data?.message || 'Error al subir el recurso');
    } finally {
      setUploading(false);
    }
  };

  const fetchLinkPreview = async (url: string) => {
    if (!url || url.length < 10) return;
    setPreviewLoading(true);
    try {
      const preview = await educationalResourcesService.getLinkPreview(url);
      setLinkPreview(preview);
      const currentTitle = linkForm.getFieldValue('title');
      if (!currentTitle && preview.title) {
        linkForm.setFieldsValue({ title: preview.title });
      }
    } catch {
      // silently fail — user fills manually
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleLinkSubmit = async (values: any) => {
    setLinkUploading(true);
    try {
      const dto: CreateLinkResourceDto = {
        title: values.title,
        externalUrl: values.externalUrl.startsWith('http')
          ? values.externalUrl
          : `https://${values.externalUrl}`,
        subjectId: values.subjectId,
        educationalLevelId: values.educationalLevelId,
        gradeLevel: values.gradeLevel,
        description: values.description,
        previewTitle: values.previewTitle || linkPreview?.title || undefined,
        previewDescription: values.previewDescription || linkPreview?.description || undefined,
        previewImage: linkPreview?.image || undefined,
        isPublic: values.isPublic ?? false,
        folderId: values.folderId || undefined,
      };
      const resource = await educationalResourcesService.createLinkResource(dto);
      message.success('Enlace añadido correctamente');
      linkForm.resetFields();
      setLinkPreview(null);
      setLinkSelectedEducationLevel('');
      setLinkSelectedSubject('');
      setLinkAvailableFolders([]);
      if (onSuccess) onSuccess(resource);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Error al añadir el enlace');
    } finally {
      setLinkUploading(false);
    }
  };

  if (metadataLoading) {
    return (
      <Card>
        <Spin size="large" />
      </Card>
    );
  }

  const fileTabContent = (
    <div>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          isPublic: false,
        }}
      >
        <Form.Item
          label="Archivo"
          required
          help={
            file && (
              <Space>
                {resourceIcons[detectResourceType(file)]}
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </Space>
            )
          }
        >
          <Dragger
            accept=".pdf,.mp4,.mpeg,.mov,.avi,.jpg,.jpeg,.png,.gif,.webp,.html,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.mp3,.wav,.ogg"
            beforeUpload={handleFileSelect}
            showUploadList={false}
            disabled={uploading}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Haz clic o arrastra un archivo aquí
            </p>
            <p className="ant-upload-hint">
              Formatos soportados: PDF, Videos, Imágenes, HTML, Documentos Office, Audio
            </p>
          </Dragger>
        </Form.Item>

        {file && (
          <>
            <Form.Item
              name="title"
              label="Título"
              rules={[{ required: true, message: 'El título es requerido' }]}
            >
              <Input placeholder="Título del recurso" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Descripción"
            >
              <TextArea
                rows={3}
                placeholder="Descripción opcional del recurso"
              />
            </Form.Item>

            <Form.Item
              name="type"
              label="Tipo de Recurso"
              rules={[{ required: true }]}
            >
              <Select disabled>
                {metadata?.types?.map((type: any) => (
                  <Select.Option key={type.value} value={type.value}>
                    <Space>
                      {resourceIcons[type.value as keyof ResourceType]}
                      {type.label}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="educationalLevelId"
              label="Nivel Educativo"
              rules={[{ required: true, message: 'Selecciona un nivel educativo' }]}
            >
              <Select
                placeholder="Selecciona el nivel educativo"
                onChange={(value) => {
                  setSelectedEducationLevel(value);
                  form.setFieldsValue({ gradeLevel: undefined, subjectId: undefined });
                }}
              >
                {metadata?.levels?.map((level: any) => (
                  <Select.Option key={level.id} value={level.id}>
                    {level.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="gradeLevel"
              label="Curso"
              rules={[{ required: true, message: 'Selecciona un curso' }]}
            >
              <Select
                placeholder="Selecciona el curso"
                disabled={!selectedEducationLevel}
              >
                {getGradeLevels().map((grade) => (
                  <Select.Option key={grade} value={grade}>
                    {grade}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="subjectId"
              label="Asignatura"
              rules={[{ required: true, message: 'Selecciona una asignatura' }]}
            >
              <Select
                placeholder="Selecciona la asignatura"
                onChange={(value) => {
                  setSelectedSubject(value);
                  form.setFieldsValue({ folderId: undefined });
                  loadFoldersForSubject(value);
                }}
              >
                {metadata?.subjects?.map((subject: any) => (
                  <Select.Option key={subject.id} value={subject.id}>
                    {subject.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="folderId"
              label="Carpeta (Opcional)"
              help="Organiza el recurso en una carpeta dentro de la asignatura"
            >
              <Select
                placeholder="Sin carpeta (raíz de asignatura)"
                allowClear
                disabled={!selectedSubject || loadingFolders}
                loading={loadingFolders}
              >
                {availableFolders.map((folder: any) => (
                  <Select.Option key={folder.id} value={folder.id}>
                    {folder.displayName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="tags"
              label="Etiquetas"
            >
              <Select
                mode="tags"
                placeholder="Añade etiquetas (presiona Enter)"
                tokenSeparators={[',']}
              />
            </Form.Item>

            <Form.Item
              name="isPublic"
              label="Visibilidad"
            >
              <Select>
                <Select.Option value={false}>
                  Privado (solo yo puedo verlo)
                </Select.Option>
                <Select.Option value={true}>
                  Público (otros profesores pueden verlo)
                </Select.Option>
              </Select>
            </Form.Item>

            {showAuthorField && (
              <Form.Item
                name="authorId"
                label="Autor del Recurso"
                rules={[{ required: true, message: 'Selecciona el autor del recurso' }]}
              >
                <Select
                  placeholder="Selecciona el autor"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option: any) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {authorsData?.map((author: any) => (
                    <Select.Option key={author.id} value={author.id}>
                      {author.name} ({author.role}) - {author.email}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Form.Item
              name="academicYear"
              label="Año Académico"
              rules={[{ required: true, message: 'Selecciona un año académico' }]}
            >
              <Select placeholder="Selecciona el año académico">
                {metadata?.academicYears?.map((year: any) => (
                  <Select.Option key={year.id} value={year.name}>
                    {year.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </>
        )}

        {uploading && (
          <div className="mb-4">
            <Progress percent={uploadProgress} status="active" />
            <p className="text-center mt-2">Subiendo recurso a Google Drive...</p>
          </div>
        )}

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={uploading}
              disabled={!file}
            >
              Subir Recurso
            </Button>
            <Button onClick={onCancel} disabled={uploading}>
              Cancelar
            </Button>
          </Space>
        </Form.Item>

        <Alert
          message="Información"
          description="Los archivos se almacenan de forma segura en Google Drive en la unidad compartida '12. Plataforma (Recursos dicácticos compartidos)' organizados por año académico, nivel educativo, curso y asignatura."
          type="info"
          showIcon
        />
      </Form>
    </div>
  );

  const linkTabContent = (
    <Card style={{ margin: '0 0 16px' }}>
      <Form form={linkForm} layout="vertical" onFinish={handleLinkSubmit}>
        <Form.Item
          label="URL del recurso"
          name="externalUrl"
          rules={[{ required: true, message: 'La URL es obligatoria' }]}
        >
          <Input.Search
            placeholder="https://www.ejemplo.com/recurso"
            enterButton={previewLoading ? <Spin size="small" /> : 'Vista previa'}
            onSearch={fetchLinkPreview}
            onBlur={(e) => fetchLinkPreview(e.target.value)}
          />
        </Form.Item>

        {linkPreview && (
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 16 }}>
            {linkPreview.image && (
              <img
                src={linkPreview.image}
                alt="preview"
                style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 4, marginBottom: 8 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {linkPreview.title && <div style={{ fontWeight: 600 }}>{linkPreview.title}</div>}
            {linkPreview.description && <div style={{ fontSize: 12, color: '#888' }}>{linkPreview.description}</div>}
            {!linkPreview.title && !linkPreview.description && (
              <div style={{ color: '#888' }}>No se pudo obtener la vista previa. Rellena el título manualmente.</div>
            )}
          </div>
        )}

        <Form.Item
          label="Título"
          name="title"
          rules={[{ required: true, message: 'El título es obligatorio' }]}
        >
          <Input placeholder="Nombre del recurso" />
        </Form.Item>

        <Form.Item label="Descripción" name="description">
          <Input.TextArea rows={2} placeholder="Descripción opcional" />
        </Form.Item>

        <Form.Item
          name="educationalLevelId"
          label="Nivel Educativo"
          rules={[{ required: true, message: 'Selecciona un nivel educativo' }]}
        >
          <Select
            placeholder="Selecciona el nivel educativo"
            onChange={(value) => {
              setLinkSelectedEducationLevel(value);
              linkForm.setFieldsValue({ gradeLevel: undefined, subjectId: undefined, folderId: undefined });
              setLinkAvailableFolders([]);
              setLinkSelectedSubject('');
            }}
          >
            {metadata?.levels?.map((level: any) => (
              <Select.Option key={level.id} value={level.id}>
                {level.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="gradeLevel"
          label="Curso"
          rules={[{ required: true, message: 'Selecciona un curso' }]}
        >
          <Select
            placeholder="Selecciona el curso"
            disabled={!linkSelectedEducationLevel}
          >
            {getLinkGradeLevels().map((grade) => (
              <Select.Option key={grade} value={grade}>
                {grade}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="subjectId"
          label="Asignatura"
          rules={[{ required: true, message: 'Selecciona una asignatura' }]}
        >
          <Select
            placeholder="Selecciona la asignatura"
            onChange={(value) => {
              setLinkSelectedSubject(value);
              linkForm.setFieldsValue({ folderId: undefined });
              loadLinkFoldersForSubject(value);
            }}
          >
            {metadata?.subjects?.map((subject: any) => (
              <Select.Option key={subject.id} value={subject.id}>
                {subject.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="folderId"
          label="Carpeta (Opcional)"
          help="Organiza el enlace en una carpeta dentro de la asignatura"
        >
          <Select
            placeholder="Sin carpeta (raíz de asignatura)"
            allowClear
            disabled={!linkSelectedSubject || linkLoadingFolders}
            loading={linkLoadingFolders}
          >
            {linkAvailableFolders.map((folder: any) => (
              <Select.Option key={folder.id} value={folder.id}>
                {folder.displayName}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="isPublic" label="Visibilidad">
          <Select defaultValue={false}>
            <Select.Option value={false}>
              Privado (solo yo puedo verlo)
            </Select.Option>
            <Select.Option value={true}>
              Público (otros profesores pueden verlo)
            </Select.Option>
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={linkUploading}
              icon={<LinkOutlined />}
            >
              Añadir enlace
            </Button>
            {onCancel && <Button onClick={onCancel}>Cancelar</Button>}
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => setActiveTab(key as 'file' | 'link')}
      items={[
        {
          key: 'file',
          label: (
            <span>
              <FileOutlined /> Subir archivo
            </span>
          ),
          children: fileTabContent,
        },
        {
          key: 'link',
          label: (
            <span>
              <LinkOutlined /> Enlace externo
            </span>
          ),
          children: linkTabContent,
        },
      ]}
    />
  );
};

export default ResourceUploader;
