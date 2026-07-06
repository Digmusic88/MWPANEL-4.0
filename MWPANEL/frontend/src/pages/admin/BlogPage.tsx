import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Dropdown,
  Modal,
  Form,
  Input,
  Select,
  Upload,
  message,
  Popconfirm,
  Badge,
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  UploadOutlined,
  BarChartOutlined,
  FileTextOutlined,
  CommentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/services/apiClient';
import RichTextEditor from '@/components/common/RichTextEditor';
import useClassGroups from '@/hooks/useClassGroups';
import MediaGallery from '@/components/blog/MediaGallery';
import BlogPostViewModal from '@/components/blog/BlogPostViewModal';

const { TextArea } = Input;
const { Title } = Typography;

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'staff_only' | 'students_only' | 'families_only' | 'class_specific' | 'private';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    email: string;
    role: string;
  };
  category?: {
    id: string;
    name: string;
    color: string;
  };
  media?: any[];
  comments?: any[];
  views?: number;
}

interface BlogCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  slug: string;
  sortOrder: number;
}

const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  const [currentCategory, setCurrentCategory] = useState<BlogCategory | null>(null);
  // View modal state
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewPost, setViewPost] = useState<BlogPost | null>(null);
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const { user } = useAuthStore();
  const { classGroups } = useClassGroups();
  const [selectedVisibility, setSelectedVisibility] = useState('public');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);

  // Callback memoizado para selección de media
  const handleMediaSelect = useCallback((selectedMedia) => {
    const mediaIds = selectedMedia.map(m => m.id);
    setSelectedMediaIds(mediaIds);
    console.log('Media seleccionados:', mediaIds);
  }, []);

  // Statistics
  const [stats, setStats] = useState({
    totalPosts: 0,
    publishedPosts: 0,
    draftPosts: 0,
    totalViews: 0,
  });

  useEffect(() => {
    fetchPosts();
    fetchCategories();
    fetchStats();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/blog-posts', {
        params: {
          page: 1,
          limit: 100,
          includeAuthor: true,
          includeCategory: true,
          includeStats: true,
        },
      });
      setPosts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      message.error('Error al cargar las publicaciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/blog-categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Error al cargar las categorías');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/blog-posts/blog-statistics');
      setStats(response.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreatePost = () => {
    setCurrentPost(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditPost = (post: BlogPost) => {
    setCurrentPost(post);
    form.setFieldsValue({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      status: post.status,
      visibility: post.visibility,
      categoryId: post.category?.id,
    });
    setModalVisible(true);
  };

  const handleViewPost = (post: BlogPost) => {
    setViewPost(post);
    setViewModalVisible(true);
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await apiClient.delete(`/blog-posts/${postId}`);
      message.success('Publicación eliminada correctamente');
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      message.error('Error al eliminar la publicación');
    }
  };

  const handleSavePost = async (values: any) => {
    try {
      // Prepare the data with media and class groups
      const postData = {
        ...values,
        mediaIds: selectedMediaIds,
        classGroupIds: values.visibility === 'class_specific' ? values.classGroupIds : undefined,
      };

      if (currentPost) {
        // Update existing post
        await apiClient.patch(`/blog-posts/${currentPost.id}`, postData);
        message.success('Publicación actualizada correctamente');
      } else {
        // Create new post
        await apiClient.post('/blog-posts', postData);
        message.success('Publicación creada correctamente');
      }
      setModalVisible(false);
      fetchPosts();
      fetchStats();
    } catch (error) {
      console.error('Error saving post:', error);
      message.error('Error al guardar la publicación');
    }
  };

  const handleCreateCategory = () => {
    setCurrentCategory(null);
    categoryForm.resetFields();
    setCategoryModalVisible(true);
  };

  const handleSaveCategory = async (values: any) => {
    try {
      if (currentCategory) {
        await apiClient.put(`/blog-categories/by-id/${currentCategory.id}`, values);
        message.success('Categoría actualizada correctamente');
      } else {
        await apiClient.post('/blog-categories', values);
        message.success('Categoría creada correctamente');
      }
      setCategoryModalVisible(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      message.error('Error al guardar la categoría');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'green';
      case 'draft': return 'orange';
      case 'archived': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Publicado';
      case 'draft': return 'Borrador';
      case 'archived': return 'Archivado';
      default: return status;
    }
  };

  const getVisibilityText = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'Público';
      case 'staff_only': return 'Solo Personal';
      case 'students_only': return 'Solo Estudiantes';
      case 'families_only': return 'Solo Familias';
      case 'class_specific': return 'Clase Específica';
      case 'private': return 'Privado';
      default: return visibility;
    }
  };

  const columns = [
    {
      title: 'Título',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Autor',
      dataIndex: ['author', 'email'],
      key: 'author',
      width: 150,
      render: (email: string, record: BlogPost) => (
        <Space>
          <UserOutlined />
          {email || 'Sin autor'}
        </Space>
      ),
    },
    {
      title: 'Categoría',
      dataIndex: ['category', 'name'],
      key: 'category',
      width: 120,
      render: (name: string, record: BlogPost) => (
        record.category ? (
          <Tag color={record.category.color}>{name}</Tag>
        ) : (
          <Tag>Sin categoría</Tag>
        )
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: 'Visibilidad',
      dataIndex: 'visibility',
      key: 'visibility',
      width: 120,
      render: (visibility: string) => (
        <Tag>{getVisibilityText(visibility)}</Tag>
      ),
    },
    {
      title: 'Estadísticas',
      key: 'stats',
      width: 120,
      render: (_, record: BlogPost) => (
        <Space>
          <Badge count={record.views || 0} showZero color="green">
            <EyeOutlined />
          </Badge>
          <Badge count={record.comments?.length || 0} showZero color="green">
            <CommentOutlined />
          </Badge>
        </Space>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Acciones',
      key: 'actions',
      width: 120,
      render: (_, record: BlogPost) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: 'Ver',
                onClick: () => handleViewPost(record),
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Editar',
                onClick: () => handleEditPost(record),
              },
              {
                type: 'divider',
              },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Eliminar',
                danger: true,
                onClick: () => {
                  Modal.confirm({
                    title: '¿Eliminar publicación?',
                    content: '¿Estás seguro de que quieres eliminar esta publicación?',
                    okText: 'Eliminar',
                    okType: 'danger',
                    cancelText: 'Cancelar',
                    onOk: () => handleDeletePost(record.id),
                  });
                },
              },
            ],
          }}
          trigger={['click']}
        >
          <Button icon={<MoreOutlined />} size="small" />
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <FileTextOutlined /> Gestión de Blog
        </Title>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Publicaciones"
                value={stats.totalPosts}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Publicadas"
                value={stats.publishedPosts}
                prefix={<EyeOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Borradores"
                value={stats.draftPosts}
                prefix={<EditOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Visualizaciones"
                value={stats.totalViews}
                prefix={<BarChartOutlined />}
                valueStyle={{ color: '#579172' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card
        title="Publicaciones del Blog"
        extra={
          <Space>
            <Button
              onClick={handleCreateCategory}
              icon={<PlusOutlined />}
            >
              Nueva Categoría
            </Button>
            <Button
              type="primary"
              onClick={handleCreatePost}
              icon={<PlusOutlined />}
            >
              Nueva Publicación
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={posts}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} de ${total} publicaciones`,
          }}
        />
      </Card>

      {/* Post Modal */}
      <Modal
        title={currentPost ? 'Editar Publicación' : 'Nueva Publicación'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSavePost}
        >
          <Form.Item
            name="title"
            label="Título"
            rules={[{ required: true, message: 'El título es obligatorio' }]}
          >
            <Input placeholder="Título de la publicación" />
          </Form.Item>

          <Form.Item
            name="excerpt"
            label="Resumen"
          >
            <TextArea 
              rows={2} 
              placeholder="Breve resumen de la publicación (opcional)"
            />
          </Form.Item>

          <Form.Item
            name="content"
            label="Contenido"
            rules={[{ required: true, message: 'El contenido es obligatorio' }]}
            getValueFromEvent={(content) => content}
            valuePropName="content"
          >
            <RichTextEditor
              height="300px"
              placeholder="Escriba el contenido de la publicación..."
              showToolbar={true}
              showEmojis={true}
            />
          </Form.Item>

          {/* Multimedia Gallery Section */}
          <Form.Item
            name="multimedia"
            label="Archivos Multimedia"
          >
            <MediaGallery
              showUpload={true}
              selectable={true}
              onSelect={handleMediaSelect}
              initialSelection={selectedMediaIds}
              allowedTypes={['image', 'video', 'audio', 'document']}
              viewMode="grid"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="categoryId"
                label="Categoría"
              >
                <Select
                  placeholder="Seleccionar categoría"
                  allowClear
                >
                  {categories.map(cat => (
                    <Select.Option key={cat.id} value={cat.id}>
                      <Tag color={cat.color}>{cat.name}</Tag>
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="status"
                label="Estado"
                initialValue="draft"
              >
                <Select>
                  <Select.Option value="draft">Borrador</Select.Option>
                  <Select.Option value="published">Publicado</Select.Option>
                  <Select.Option value="archived">Archivado</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="visibility"
                label="Visibilidad"
                initialValue="public"
              >
                <Select
                  onChange={(value) => {
                    setSelectedVisibility(value);
                    if (value !== 'class_specific') {
                      form.setFieldsValue({ classGroupIds: undefined });
                    }
                  }}
                >
                  <Select.Option value="public">Público</Select.Option>
                  <Select.Option value="staff_only">Solo Personal</Select.Option>
                  <Select.Option value="students_only">Solo Estudiantes</Select.Option>
                  <Select.Option value="families_only">Solo Familias</Select.Option>
                  <Select.Option value="class_specific">Clase Específica</Select.Option>
                  <Select.Option value="private">Privado</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Class-specific selector */}
          {selectedVisibility === 'class_specific' && (
            <Form.Item
              name="classGroupIds"
              label="Seleccionar Clases"
              rules={[{ required: true, message: 'Debe seleccionar al menos una clase' }]}
            >
              <Select
                mode="multiple"
                placeholder="Seleccione las clases"
                loading={loading}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                }
              >
                {classGroups.map((classGroup) => (
                  <Select.Option key={classGroup.id} value={classGroup.id}>
                    {classGroup.name}
                    {classGroup.courses && classGroup.courses.length > 0 && (
                      <span className="text-gray-500 ml-2">
                        ({classGroup.courses[0].name})
                      </span>
                    )}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Category Modal */}
      <Modal
        title={currentCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        open={categoryModalVisible}
        onCancel={() => setCategoryModalVisible(false)}
        onOk={() => categoryForm.submit()}
        destroyOnClose
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleSaveCategory}
        >
          <Form.Item
            name="name"
            label="Nombre"
            rules={[{ required: true, message: 'El nombre es obligatorio' }]}
          >
            <Input placeholder="Nombre de la categoría" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Descripción"
          >
            <TextArea rows={3} placeholder="Descripción de la categoría" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Color"
            initialValue="#579172"
          >
            <Select 
              placeholder="Seleccionar color"
              optionLabelProp="label"
            >
              <Select.Option 
                value="#f50" 
                label={
                  <Space>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#f50', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                    Rojo Coral
                  </Space>
                }
              >
                <Space>
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#f50', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                  Rojo Coral
                </Space>
              </Select.Option>
              <Select.Option 
                value="#2db7f5" 
                label={
                  <Space>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#2db7f5', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                    Azul Claro
                  </Space>
                }
              >
                <Space>
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#2db7f5', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                  Azul Claro
                </Space>
              </Select.Option>
              <Select.Option 
                value="#87d068" 
                label={
                  <Space>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#87d068', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                    Verde Lima
                  </Space>
                }
              >
                <Space>
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#87d068', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                  Verde Lima
                </Space>
              </Select.Option>
              <Select.Option 
                value="#108ee9" 
                label={
                  <Space>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#108ee9', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                    Azul Medio
                  </Space>
                }
              >
                <Space>
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#108ee9', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                  Azul Medio
                </Space>
              </Select.Option>
              <Select.Option
                value="#579172"
                label={
                  <Space>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#579172', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                    Verde Principal
                  </Space>
                }
              >
                <Space>
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#579172', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                  Verde Principal
                </Space>
              </Select.Option>
              <Select.Option 
                value="#722ed1" 
                label={
                  <Space>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#722ed1', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                    Púrpura
                  </Space>
                }
              >
                <Space>
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#722ed1', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                  Púrpura
                </Space>
              </Select.Option>
              <Select.Option 
                value="#eb2f96" 
                label={
                  <Space>
                    <div style={{ width: '12px', height: '12px', backgroundColor: '#eb2f96', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                    Rosa Fuerte
                  </Space>
                }
              >
                <Space>
                  <div style={{ width: '16px', height: '16px', backgroundColor: '#eb2f96', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                  Rosa Fuerte
                </Space>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="sortOrder"
            label="Orden"
            initialValue={0}
          >
            <Input type="number" placeholder="Orden de clasificación" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Blog Post View Modal */}
      <BlogPostViewModal
        open={viewModalVisible}
        post={viewPost}
        onClose={() => {
          setViewModalVisible(false);
          setViewPost(null);
        }}
      />
    </div>
  );
};

export default BlogPage;