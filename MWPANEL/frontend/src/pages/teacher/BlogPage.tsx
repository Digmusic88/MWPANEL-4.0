import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  CommentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/services/apiClient';
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

const TeacherBlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentPost, setCurrentPost] = useState<BlogPost | null>(null);
  // View modal state
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewPost, setViewPost] = useState<BlogPost | null>(null);
  const [form] = Form.useForm();
  const { user } = useAuthStore();

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
          authorId: user?.id, // Solo mostrar posts del profesor actual
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
      const response = await apiClient.get('/blog-posts/blog-statistics', {
        params: {
          authorId: user?.id, // Solo estadísticas del profesor actual
        },
      });
      setStats(response.data || {});
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreatePost = () => {
    setCurrentPost(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'draft',
      visibility: 'staff_only', // Por defecto para profesores
    });
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

  const handleSavePost = async (values: any) => {
    try {
      if (currentPost) {
        // Update existing post
        await apiClient.patch(`/blog-posts/${currentPost.id}`, values);
        message.success('Publicación actualizada correctamente');
      } else {
        // Create new post
        await apiClient.post('/blog-posts', values);
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

  const handleDeletePost = async (postId: string) => {
    try {
      await apiClient.delete(`/blog-posts/${postId}`);
      message.success('Publicación eliminada correctamente');
      fetchPosts();
      fetchStats();
    } catch (error) {
      console.error('Error deleting post:', error);
      message.error('Error al eliminar la publicación');
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
      case 'class_specific': return 'Mis Clases';
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
          <span><EyeOutlined /> {record.views || 0}</span>
          <span><CommentOutlined /> {record.comments?.length || 0}</span>
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
        <Space>
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditPost(record)}
          />
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewPost(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <FileTextOutlined /> Blog del Centro
        </Title>

        {/* Statistics */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Mis Publicaciones"
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
                title="Visualizaciones"
                value={stats.totalViews}
                prefix={<EyeOutlined />}
                valueStyle={{ color: '#579172' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      <Card
        title="Mis Publicaciones"
        extra={
          <Button
            type="primary"
            onClick={handleCreatePost}
            icon={<PlusOutlined />}
          >
            Nueva Publicación
          </Button>
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
          >
            <TextArea 
              rows={8} 
              placeholder="Contenido de la publicación"
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
                initialValue="staff_only"
              >
                <Select>
                  <Select.Option value="public">Público</Select.Option>
                  <Select.Option value="staff_only">Solo Personal</Select.Option>
                  <Select.Option value="students_only">Solo Estudiantes</Select.Option>
                  <Select.Option value="families_only">Solo Familias</Select.Option>
                  <Select.Option value="class_specific">Mis Clases</Select.Option>
                  <Select.Option value="private">Privado</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
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

export default TeacherBlogPage;