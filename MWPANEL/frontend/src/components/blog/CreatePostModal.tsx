import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Upload,
  Button,
  Switch,
  message,
  Progress,
  Space,
  Tabs,
  Card,
  DatePicker,
  Popconfirm,
  Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import {
  PlusOutlined,
  InboxOutlined,
  DeleteOutlined,
  VideoCameraOutlined,
  PictureOutlined,
  EyeOutlined,
  TagOutlined,
  EditOutlined,
  SaveOutlined,
  ClockCircleOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../services/apiClient';
import { useAuth } from '../../hooks/useAuth';
import InstagramPost from './InstagramPost';

const { TextArea } = Input;
const { Dragger } = Upload;

/**
 * Extrae un fotograma de un fichero de vídeo en el navegador.
 * Hace seek a min(1s, duration*0.1) y dibuja en canvas a max 1280x720.
 * Devuelve Blob JPEG (calidad 0.85) o null si no se puede (codec no soportado, sin metadata, etc).
 */
async function extractVideoFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    const cleanup = () => {
      try { URL.revokeObjectURL(url); } catch {}
      video.removeAttribute('src');
      try { video.load(); } catch {}
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, 15000);

    video.addEventListener('loadedmetadata', () => {
      const seekTo = Math.min(1, (video.duration || 0) * 0.1);
      if (!Number.isFinite(seekTo) || seekTo <= 0) {
        clearTimeout(timer);
        cleanup();
        resolve(null);
        return;
      }
      video.currentTime = seekTo;
    });

    video.addEventListener('seeked', () => {
      try {
        const maxW = 1280;
        const maxH = 720;
        let w = video.videoWidth;
        let h = video.videoHeight;
        if (!w || !h) {
          clearTimeout(timer);
          cleanup();
          resolve(null);
          return;
        }
        const scale = Math.min(1, maxW / w, maxH / h);
        w = Math.floor(w * scale);
        h = Math.floor(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          clearTimeout(timer);
          cleanup();
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            clearTimeout(timer);
            cleanup();
            resolve(blob);
          },
          'image/jpeg',
          0.85,
        );
      } catch {
        clearTimeout(timer);
        cleanup();
        resolve(null);
      }
    });

    video.addEventListener('error', () => {
      clearTimeout(timer);
      cleanup();
      resolve(null);
    });
  });
}

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editPost?: any; // Post existente para editar (borrador o programado)
}

interface BlogCategory {
  id: string;
  name: string;
  color?: string;
}

interface ClassGroup {
  id: string;
  name: string;
}

interface UploadedMedia {
  id?: string;
  file?: File;
  type: 'image' | 'video';
  url: string;           // URL del servidor (para enviar al backend)
  previewUrl: string;    // URL temporal para previsualización (createObjectURL)
  name: string;
  status: 'uploading' | 'done' | 'error';
  progress?: number;
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({
  open,
  onClose,
  onSuccess,
  editPost,
}) => {
  const { user } = useAuth();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('edit');
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<dayjs.Dayjs | null>(null);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const isEditing = !!editPost;
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#579172');

  // Load editPost data when editing
  useEffect(() => {
    if (editPost && open) {
      form.setFieldsValue({
        title: editPost.title,
        content: editPost.content,
        excerpt: editPost.excerpt,
        categoryId: editPost.category?.id,
        classGroupIds: editPost.visibilitySettings?.classGroups || [],
        publishDate: editPost.publishDate ? dayjs(editPost.publishDate) : dayjs(),
        commentsEnabled: editPost.commentsEnabled ?? true,
      });

      // Load existing media
      if (editPost.media && editPost.media.length > 0) {
        const existingMedia: UploadedMedia[] = editPost.media.map((m: any) => ({
          id: m.id,
          type: m.type,
          url: m.url,
          previewUrl: m.url,
          name: m.originalName || m.filename || 'Media',
          status: 'done' as const,
          progress: 100,
        }));
        setUploadedMedia(existingMedia);
      }
    }
  }, [editPost, open, form]);

  // Fetch categories
  const { data: categories = [], refetch: refetchCategories } = useQuery<BlogCategory[]>({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const response = await api.get('/blog/categories');
      // Handle both array response and {data: []} response format
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    },
  });

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const response = await api.post('/blog/categories', data);
      return response.data;
    },
    onSuccess: (newCategory) => {
      refetchCategories();
      form.setFieldValue('categoryId', newCategory.id);
      setShowNewCategoryModal(false);
      setNewCategoryName('');
      message.success('Categoria creada correctamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al crear la categoria');
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const response = await api.delete(`/blog/categories/${categoryId}`);
      return response.data;
    },
    onSuccess: () => {
      refetchCategories();
      // Clear selection if deleted category was selected
      const currentCategoryId = form.getFieldValue('categoryId');
      if (currentCategoryId && !categories.find(c => c.id === currentCategoryId)) {
        form.setFieldValue('categoryId', undefined);
      }
      message.success('Categoria eliminada correctamente');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || 'Error al eliminar la categoria');
    },
  });

  const handleDeleteCategory = (categoryId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteCategoryMutation.mutate(categoryId);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) {
      message.error('El nombre de la categoria es obligatorio');
      return;
    }
    createCategoryMutation.mutate({ name: newCategoryName, color: newCategoryColor });
  };

  // Fetch allowed class groups for teacher
  const { data: allowedGroupsData } = useQuery({
    queryKey: ['blog-permissions-my-groups'],
    queryFn: async () => {
      if (isAdmin) {
        // Admin can access all groups
        const response = await api.get('/class-groups');
        return { allowedGroups: response.data };
      }
      const response = await api.get('/blog/permissions/my-groups');
      return response.data;
    },
    enabled: open,
  });

  const allowedGroups: ClassGroup[] = allowedGroupsData?.allowedGroups || [];

  // Upload media mutation - uses Google Drive upload endpoint
  const uploadMediaMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      // Determine media type from file
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      formData.append('mediaType', mediaType);

      const response = await api.post('/blog-media/upload-with-google-drive', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadedMedia((prev) =>
            prev.map((m) =>
              m.name === file.name ? { ...m, progress: percent } : m
            )
          );
        },
      });

      return response.data;
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/blog-posts', data);
      return response.data;
    },
  });

  // Update post mutation (for editing drafts)
  const updatePostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/blog-posts/${id}`, data);
      return response.data;
    },
  });

  // Schedule post mutation
  const schedulePostMutation = useMutation({
    mutationFn: async ({ id, publishDate }: { id: string; publishDate: string }) => {
      const response = await api.post(`/blog-posts/${id}/schedule`, { publishDate });
      return response.data;
    },
  });

  const handleFileUpload = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      message.error('Solo se permiten imagenes y videos');
      return false;
    }

    // Add to local state - mantener previewUrl separada de url del servidor
    const tempUrl = URL.createObjectURL(file);
    const newMedia: UploadedMedia = {
      file,
      type: isImage ? 'image' : 'video',
      url: tempUrl,
      previewUrl: tempUrl, // URL temporal para preview que NO se sobreescribe
      name: file.name,
      status: 'uploading',
      progress: 0,
    };

    setUploadedMedia((prev) => [...prev, newMedia]);

    try {
      const result = await uploadMediaMutation.mutateAsync(file);

      // Para vídeos: extraer un fotograma y subirlo como portada
      let videoThumbnailUrl: string | undefined;
      if (isVideo && result?.id) {
        try {
          const frameBlob = await extractVideoFrame(file);
          if (frameBlob) {
            const form = new FormData();
            form.append('thumbnail', frameBlob, 'frame.jpg');
            const thumbRes = await api.post(`/blog-media/${result.id}/thumbnail`, form, {
              headers: { 'Content-Type': 'multipart/form-data' },
            });
            videoThumbnailUrl = thumbRes.data?.thumbnailUrl;
          }
        } catch (err) {
          console.warn('Frame extraction/upload failed; falling back to Drive auto-thumbnail', err);
        }
      }

      setUploadedMedia((prev) =>
        prev.map((m) =>
          m.name === file.name
            ? {
                ...m,
                id: result.id,
                // Para vídeos: si conseguimos el frame, lo usamos como URL "lógica" para portada;
                // si no, Drive auto-thumbnail (result.thumbnailUrl) es el fallback.
                url: isVideo
                  ? (videoThumbnailUrl || result.thumbnailUrl || result.url)
                  : (result.url || result.thumbnailUrl),
                // previewUrl se mantiene intacta para la previsualización
                status: 'done',
                progress: 100,
              }
            : m
        )
      );
    } catch (error) {
      setUploadedMedia((prev) =>
        prev.map((m) =>
          m.name === file.name ? { ...m, status: 'error' } : m
        )
      );
      message.error(`Error al subir ${file.name}`);
    }

    return false; // Prevent default upload behavior
  };

  const handleRemoveMedia = (index: number) => {
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  // Helper to prepare post data
  const preparePostData = (values: any, status: string) => {
    const doneMedia = uploadedMedia.filter((m) => m.status === 'done' && m.id);
    const mediaIds = doneMedia.map((m) => m.id);

    // featuredImage = portada del post. Si el primer media es vídeo, usamos su URL
    // efectiva (que para vídeos quedó setada al thumbnailUrl en handleFileUpload).
    // Si el formulario lo aporta explícitamente, prevalece el valor del formulario.
    const inferredFeaturedImage = doneMedia.length > 0 ? doneMedia[0].url : undefined;

    const publishDate = values.publishDate
      ? values.publishDate.toISOString()
      : new Date().toISOString();

    return {
      ...values,
      featuredImage: values.featuredImage || inferredFeaturedImage,
      status,
      visibility: values.classGroupIds?.length > 0 ? 'class_specific' : 'public',
      mediaIds,
      commentsEnabled: values.commentsEnabled ?? true,
      publishDate,
      createdAt: publishDate,
    };
  };

  // Publicar inmediatamente
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      const postData = preparePostData(values, 'published');

      if (isEditing) {
        await updatePostMutation.mutateAsync({ id: editPost.id, data: postData });
        message.success('Publicacion actualizada');
      } else {
        await createPostMutation.mutateAsync(postData);
        message.success('Publicacion creada');
      }

      form.resetFields();
      setUploadedMedia([]);
      onSuccess();
    } catch (error: any) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (!error.errorFields) {
        message.error('Error al crear la publicacion');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Guardar como borrador
  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields(['title']); // Solo titulo obligatorio para borrador
      const allValues = form.getFieldsValue();
      setIsSubmitting(true);

      const postData = preparePostData({ ...allValues, ...values }, 'draft');

      if (isEditing) {
        await updatePostMutation.mutateAsync({ id: editPost.id, data: postData });
        message.success('Borrador actualizado');
      } else {
        await createPostMutation.mutateAsync(postData);
        message.success('Borrador guardado');
      }

      form.resetFields();
      setUploadedMedia([]);
      onSuccess();
    } catch (error: any) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (!error.errorFields) {
        message.error('Error al guardar el borrador');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Programar publicacion
  const handleSchedule = async () => {
    if (!scheduleDate) {
      message.error('Selecciona una fecha para programar');
      return;
    }

    if (scheduleDate.isBefore(dayjs())) {
      message.error('La fecha debe ser en el futuro');
      return;
    }

    try {
      const values = await form.validateFields();
      setIsSubmitting(true);

      const postData = preparePostData(values, 'scheduled');
      postData.publishDate = scheduleDate.toISOString();

      if (isEditing) {
        // Update and then schedule
        await updatePostMutation.mutateAsync({ id: editPost.id, data: postData });
        await schedulePostMutation.mutateAsync({
          id: editPost.id,
          publishDate: scheduleDate.toISOString()
        });
      } else {
        // Create as scheduled
        const newPost = await createPostMutation.mutateAsync(postData);
        await schedulePostMutation.mutateAsync({
          id: newPost.id,
          publishDate: scheduleDate.toISOString()
        });
      }

      message.success(`Publicacion programada para ${scheduleDate.format('DD/MM/YYYY HH:mm')}`);
      setShowScheduleModal(false);
      setScheduleDate(null);
      form.resetFields();
      setUploadedMedia([]);
      onSuccess();
    } catch (error: any) {
      if (error.response?.data?.message) {
        message.error(error.response.data.message);
      } else if (!error.errorFields) {
        message.error('Error al programar la publicacion');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.resetFields();
    setUploadedMedia([]);
    onClose();
  };

  // Preview data for Instagram-style preview
  const getPreviewData = () => {
    const values = form.getFieldsValue();
    // Use the selected publishDate or current date
    const previewDate = values.publishDate
      ? values.publishDate.toISOString()
      : new Date().toISOString();

    return {
      id: 'preview',
      title: values.title || 'Titulo de la publicacion',
      content: values.content || 'Contenido de la publicacion...',
      excerpt: values.excerpt,
      author: {
        id: user?.id || '',
        email: user?.email || '',
        profile: user?.profile,
      },
      media: uploadedMedia
        .filter((m) => m.status === 'done')
        .map((m) => ({
          id: m.id || '',
          type: m.type,
          url: m.previewUrl, // Usar previewUrl para que la vista previa no se rompa
        })),
      comments: [],
      category: categories.find((c) => c.id === values.categoryId),
      classGroups: values.classGroupIds,
      createdAt: previewDate,
      commentsEnabled: values.commentsEnabled ?? true,
    };
  };

  return (
    <Modal
      title="Nueva publicacion"
      open={open}
      onCancel={handleClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'edit',
            label: (
              <span>
                <PictureOutlined /> Editar
              </span>
            ),
            children: (
              <Form form={form} layout="vertical" className="mt-4">
                {/* Title */}
                <Form.Item
                  name="title"
                  label="Titulo"
                  rules={[{ required: true, message: 'El titulo es obligatorio' }]}
                >
                  <Input placeholder="Titulo de la publicacion" maxLength={255} />
                </Form.Item>

                {/* Content */}
                <Form.Item
                  name="content"
                  label="Descripcion"
                  rules={[{ required: true, message: 'La descripcion es obligatoria' }]}
                >
                  <TextArea
                    placeholder="Escribe el contenido de tu publicacion..."
                    rows={4}
                    showCount
                    maxLength={2000}
                  />
                </Form.Item>

                {/* Media Upload */}
                <Form.Item label="Imagenes y Videos">
                  <Dragger
                    multiple
                    showUploadList={false}
                    beforeUpload={handleFileUpload}
                    accept="image/*,video/*"
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Arrastra imagenes o videos aqui
                    </p>
                    <p className="ant-upload-hint">
                      Soporta imagenes (JPG, PNG, GIF) y videos (MP4, WebM)
                    </p>
                  </Dragger>

                  {/* Uploaded Media Preview */}
                  {uploadedMedia.length > 0 && (
                    <div className="mt-4 grid grid-cols-4 gap-3">
                      {uploadedMedia.map((media, index) => (
                        <div
                          key={index}
                          className="relative rounded-lg overflow-hidden border border-gray-200"
                        >
                          {media.type === 'image' ? (
                            <img
                              src={media.previewUrl}
                              alt={media.name}
                              className="w-full h-24 object-cover"
                            />
                          ) : (
                            <div className="w-full h-24 bg-gray-100 flex items-center justify-center">
                              <VideoCameraOutlined className="text-2xl text-gray-400" />
                            </div>
                          )}

                          {media.status === 'uploading' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <Progress
                                type="circle"
                                percent={media.progress}
                                size={40}
                                strokeColor="#fff"
                              />
                            </div>
                          )}

                          <button
                            onClick={() => handleRemoveMedia(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                          >
                            <DeleteOutlined className="text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </Form.Item>

                {/* Category */}
                <Form.Item name="categoryId" label="Categoria">
                  <div className="flex gap-2">
                    <Select
                      placeholder="Selecciona una categoria"
                      allowClear
                      className="flex-1"
                      value={form.getFieldValue('categoryId')}
                      onChange={(value) => form.setFieldValue('categoryId', value)}
                      optionRender={(option) => {
                        const cat = categories.find(c => c.id === option.value);
                        if (!cat) return option.label;
                        return (
                          <div className="flex items-center justify-between w-full">
                            <span className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cat.color || '#579172' }}
                              />
                              {cat.name}
                            </span>
                            <Popconfirm
                              title="Eliminar categoria"
                              description="¿Seguro que deseas eliminar esta categoria?"
                              onConfirm={(e) => handleDeleteCategory(cat.id, e as React.MouseEvent)}
                              onCancel={(e) => e?.stopPropagation()}
                              okText="Eliminar"
                              cancelText="Cancelar"
                              okButtonProps={{ danger: true }}
                            >
                              <Tooltip title="Eliminar categoria">
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={(e) => e.stopPropagation()}
                                  className="ml-2 opacity-60 hover:opacity-100"
                                />
                              </Tooltip>
                            </Popconfirm>
                          </div>
                        );
                      }}
                      options={categories.map((cat) => ({
                        value: cat.id,
                        label: cat.name,
                      }))}
                    />
                    <Button
                      icon={<TagOutlined />}
                      onClick={() => setShowNewCategoryModal(true)}
                    >
                      Nueva
                    </Button>
                  </div>
                </Form.Item>

                {/* Class Groups */}
                <Form.Item
                  name="classGroupIds"
                  label="Grupos de clase (opcional)"
                  extra="Deja vacio para que sea visible para todos. Selecciona grupos para limitar la visibilidad."
                >
                  <Select
                    mode="multiple"
                    placeholder="Selecciona grupos de clase"
                    allowClear
                    options={allowedGroups.map((group) => ({
                      value: group.id,
                      label: group.name,
                    }))}
                  />
                </Form.Item>

                {/* Publication Date */}
                <Form.Item
                  name="publishDate"
                  label="Fecha de publicacion"
                  extra="Por defecto se usara la fecha y hora actual. Puedes seleccionar una fecha pasada si lo deseas."
                  initialValue={dayjs()}
                >
                  <DatePicker
                    showTime={{ format: 'HH:mm' }}
                    format="DD/MM/YYYY HH:mm"
                    style={{ width: '100%' }}
                    placeholder="Selecciona fecha y hora"
                    allowClear={false}
                  />
                </Form.Item>

                {/* Comments Toggle */}
                <Form.Item
                  name="commentsEnabled"
                  label="Permitir comentarios"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Switch />
                </Form.Item>
              </Form>
            ),
          },
          {
            key: 'preview',
            label: (
              <span>
                <EyeOutlined /> Vista previa
              </span>
            ),
            children: (
              <div className="mt-4 max-w-[400px] mx-auto">
                <InstagramPost
                  {...(getPreviewData() as any)}
                  canComment={false}
                  canDelete={false}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Footer */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          {isEditing && editPost?.status === 'draft' && (
            <span className="flex items-center gap-1">
              <SaveOutlined /> Borrador
            </span>
          )}
          {isEditing && editPost?.status === 'scheduled' && (
            <span className="flex items-center gap-1">
              <ClockCircleOutlined /> Programado para {dayjs(editPost.publishDate).format('DD/MM/YYYY HH:mm')}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={handleClose}>Cancelar</Button>
          <Button
            icon={<SaveOutlined />}
            onClick={handleSaveDraft}
            loading={isSubmitting}
            disabled={uploadedMedia.some((m) => m.status === 'uploading')}
          >
            Guardar borrador
          </Button>
          <Button
            icon={<ClockCircleOutlined />}
            onClick={() => setShowScheduleModal(true)}
            disabled={uploadedMedia.some((m) => m.status === 'uploading')}
          >
            Programar
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={uploadedMedia.some((m) => m.status === 'uploading')}
          >
            {isEditing ? 'Actualizar y publicar' : 'Publicar ahora'}
          </Button>
        </div>
      </div>

      {/* New Category Modal */}
      <Modal
        title="Nueva categoria"
        open={showNewCategoryModal}
        onCancel={() => {
          setShowNewCategoryModal(false);
          setNewCategoryName('');
        }}
        onOk={handleCreateCategory}
        okText="Crear"
        cancelText="Cancelar"
        confirmLoading={createCategoryMutation.isPending}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <Input
              placeholder="Nombre de la categoria"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                placeholder="#579172"
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="px-3 py-1 rounded-full text-white text-sm"
              style={{ backgroundColor: newCategoryColor }}
            >
              {newCategoryName || 'Vista previa'}
            </span>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        title={
          <span className="flex items-center gap-2">
            <ClockCircleOutlined /> Programar publicacion
          </span>
        }
        open={showScheduleModal}
        onCancel={() => {
          setShowScheduleModal(false);
          setScheduleDate(null);
        }}
        onOk={handleSchedule}
        okText="Programar"
        cancelText="Cancelar"
        confirmLoading={isSubmitting}
        zIndex={1100}
        styles={{ body: { overflow: 'visible' } }}
      >
        <style>{`
          .schedule-datepicker-popup {
            z-index: 1200 !important;
          }
          .schedule-datepicker-popup .ant-picker-panel-container {
            z-index: 1200 !important;
          }
        `}</style>
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Selecciona la fecha y hora en la que quieres que se publique automaticamente:
          </p>
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="DD/MM/YYYY HH:mm"
            value={scheduleDate}
            onChange={(date) => setScheduleDate(date)}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
            style={{ width: '100%' }}
            placeholder="Selecciona fecha y hora"
            size="large"
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            popupClassName="schedule-datepicker-popup"
          />
          {scheduleDate && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-green-800 text-sm">
                <ClockCircleOutlined className="mr-2" />
                La publicacion se publicara automaticamente el{' '}
                <strong>{scheduleDate.format('dddd, D [de] MMMM [de] YYYY [a las] HH:mm')}</strong>
              </p>
            </div>
          )}
        </div>
      </Modal>
    </Modal>
  );
};

export default CreatePostModal;
