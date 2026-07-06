import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Input,
  Select,
  Modal,
  Form,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Tabs,
  Statistic,
  Empty,
  Switch,
  Drawer,
  Avatar,
  List,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  SettingOutlined,
  FileTextOutlined,
  MessageOutlined,
  UserOutlined,
  CalendarOutlined,
  BarChartOutlined,
  SendOutlined,
  CheckOutlined,
  CloseOutlined,
  TagOutlined,
  GlobalOutlined,
  SecurityScanOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import apiClient from '@/services/apiClient';
import { StatCard, NumberCounter } from '@/components/animations';
import BlogRoleManager from '@/components/blog/BlogRoleManager';
import BlogAnalytics from '@/components/blog/BlogAnalytics';
import MediaGallery from '@/components/blog/MediaGallery';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface BlogPost {
  id: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'public' | 'staff_only' | 'students_only' | 'families_only' | 'class_specific' | 'private';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  commentCount?: number;
  featured?: boolean;
  author: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
  category?: {
    id: string;
    name: string;
    color: string;
  };
  excerpt?: string;
}

interface BlogComment {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  author: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
  post: {
    id: string;
    title: string;
    slug?: string;
  };
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  postCount: number;
  isActive: boolean;
  createdAt: string;
}

interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  archivedPosts: number;
  totalComments: number;
  pendingComments: number;
  approvedComments: number;
  rejectedComments: number;
  totalCategories: number;
  monthlyViews: number;
  postsThisMonth: number;
  topCategories: Array<{ name: string; count: number; color: string }>;
}

const BlogManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('posts');
  
  // Posts state
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsFilters, setPostsFilters] = useState({
    search: '',
    status: '',
    visibility: '',
    category: '',
  });

  // Comments state
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentFilters, setCommentFilters] = useState({
    status: '',
    search: '',
  });

  // Categories state
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BlogCategory | null>(null);

  // Stats state
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Forms
  const [categoryForm] = Form.useForm();

  useEffect(() => {
    fetchStats();
    if (activeTab === 'posts') {
      fetchPosts();
    } else if (activeTab === 'comments') {
      fetchComments();
    } else if (activeTab === 'categories') {
      fetchCategories();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await apiClient.get('/blog-posts/blog-statistics');
      
      // Add mock top categories since backend might not have this
      const mockTopCategories = [
        { name: 'Noticias', count: 15, color: '#579172' },
        { name: 'Eventos', count: 8, color: '#52c41a' },
        { name: 'Académico', count: 12, color: '#722ed1' },
      ];

      setStats({
        ...response.data,
        topCategories: response.data.topCategories || mockTopCategories
      });
    } catch (error) {
      console.error('Error fetching blog stats:', error);
      message.error('Error al cargar estadísticas del blog');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setPostsLoading(true);
      const params = new URLSearchParams();
      
      if (postsFilters.search) params.append('search', postsFilters.search);
      if (postsFilters.status) params.append('status', postsFilters.status);
      if (postsFilters.visibility) params.append('visibility', postsFilters.visibility);
      if (postsFilters.category) params.append('categoryId', postsFilters.category);
      
      params.append('limit', '50');
      params.append('sortBy', 'createdAt');
      params.append('sortOrder', 'desc');

      const response = await apiClient.get(`/blog-posts?${params.toString()}`);
      setPosts(response.data.data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      message.error('Error al cargar posts del blog');
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      setCommentsLoading(true);
      const params = new URLSearchParams();
      
      if (commentFilters.status) params.append('status', commentFilters.status);
      if (commentFilters.search) params.append('search', commentFilters.search);
      
      params.append('limit', '50');
      params.append('sortBy', 'createdAt');
      params.append('sortOrder', 'desc');

      const response = await apiClient.get(`/blog-comments?${params.toString()}`);
      setComments(response.data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      message.error('Error al cargar comentarios del blog');
    } finally {
      setCommentsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await apiClient.get('/blog-categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      message.error('Error al cargar categorías del blog');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await apiClient.delete(`/blog/${postId}`);
      message.success('Post eliminado correctamente');
      fetchPosts();
      fetchStats();
    } catch (error) {
      console.error('Error deleting post:', error);
      message.error('Error al eliminar el post');
    }
  };

  const handlePublishPost = async (postId: string) => {
    try {
      await apiClient.post(`/blog/${postId}/publish`);
      message.success('Post publicado correctamente');
      fetchPosts();
      fetchStats();
    } catch (error) {
      console.error('Error publishing post:', error);
      message.error('Error al publicar el post');
    }
  };

  const handleUnpublishPost = async (postId: string) => {
    try {
      await apiClient.post(`/blog/${postId}/unpublish`);
      message.success('Post despublicado correctamente');
      fetchPosts();
      fetchStats();
    } catch (error) {
      console.error('Error unpublishing post:', error);
      message.error('Error al despublicar el post');
    }
  };

  const handleModerateComment = async (commentId: string, action: 'approve' | 'reject') => {
    try {
      await apiClient.patch(`/blog-comments/${commentId}/moderate`, { action });
      message.success(`Comentario ${action === 'approve' ? 'aprobado' : 'rechazado'} correctamente`);
      fetchComments();
      fetchStats();
    } catch (error) {
      console.error('Error moderating comment:', error);
      message.error('Error al moderar el comentario');
    }
  };

  const handleSaveCategory = async (values: any) => {
    try {
      if (editingCategory) {
        await apiClient.put(`/blog-categories/${editingCategory.id}`, values);
        message.success('Categoría actualizada correctamente');
      } else {
        await apiClient.post('/blog-categories', values);
        message.success('Categoría creada correctamente');
      }
      
      setCategoryModalVisible(false);
      setEditingCategory(null);
      categoryForm.resetFields();
      fetchCategories();
      fetchStats();
    } catch (error) {
      console.error('Error saving category:', error);
      message.error('Error al guardar la categoría');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await apiClient.delete(`/blog-categories/${categoryId}`);
      message.success('Categoría eliminada correctamente');
      fetchCategories();
      fetchStats();
    } catch (error) {
      console.error('Error deleting category:', error);
      message.error('Error al eliminar la categoría');
    }
  };

  const getAuthorName = (author: any) => {
    if (author?.profile?.firstName && author?.profile?.lastName) {
      return `${author.profile.firstName} ${author.profile.lastName}`;
    }
    return author?.email?.split('@')[0] || 'Usuario';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'green';
      case 'draft': return 'orange';
      case 'archived': return 'red';
      case 'approved': return 'green';
      case 'pending': return 'orange';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Publicado';
      case 'draft': return 'Borrador';
      case 'archived': return 'Archivado';
      case 'approved': return 'Aprobado';
      case 'pending': return 'Pendiente';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'green';
      case 'staff_only': return 'purple';
      case 'students_only': return 'green';
      case 'families_only': return 'orange';
      case 'class_specific': return 'cyan';
      case 'private': return 'red';
      default: return 'default';
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

  const postsColumns = [
    {
      title: 'Título',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: BlogPost) => (
        <div>
          <Text strong style={{ fontSize: '14px' }}>{title}</Text>
          {record.featured && <Tag color="red" size="small" style={{ marginLeft: '8px' }}>Destacado</Tag>}
          <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
            Por {getAuthorName(record.author)}
          </div>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Visibilidad',
      dataIndex: 'visibility',
      key: 'visibility',
      render: (visibility: string) => (
        <Tag color={getVisibilityColor(visibility)} size="small">
          {getVisibilityText(visibility)}
        </Tag>
      ),
    },
    {
      title: 'Categoría',
      dataIndex: 'category',
      key: 'category',
      render: (category: any) => (
        category ? (
          <Tag color={category.color} size="small">
            {category.name}
          </Tag>
        ) : (
          <Text type="secondary">Sin categoría</Text>
        )
      ),
    },
    {
      title: 'Métricas',
      key: 'metrics',
      render: (record: BlogPost) => (
        <Space size="small">
          <Tooltip title="Vistas">
            <span><EyeOutlined /> {record.viewCount || 0}</span>
          </Tooltip>
          <Tooltip title="Comentarios">
            <span><MessageOutlined /> {record.commentCount || 0}</span>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Fecha',
      key: 'date',
      render: (record: BlogPost) => (
        <div style={{ fontSize: '12px' }}>
          <div>
            <CalendarOutlined /> {record.publishedAt 
              ? formatDistanceToNow(new Date(record.publishedAt), { addSuffix: true, locale: es })
              : 'No publicado'
            }
          </div>
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Creado {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true, locale: es })}
          </Text>
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: BlogPost) => (
        <Space size="small">
          <Tooltip title="Ver">
            <Button 
              icon={<EyeOutlined />} 
              size="small" 
              onClick={() => window.open(`/blog/post/${record.id}`, '_blank')}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button 
              icon={<EditOutlined />} 
              size="small" 
              onClick={() => navigate(`/admin/blog/${record.id}/edit`)}
            />
          </Tooltip>
          {record.status === 'draft' && (
            <Tooltip title="Publicar">
              <Button 
                icon={<SendOutlined />} 
                size="small" 
                type="primary"
                onClick={() => handlePublishPost(record.id)}
              />
            </Tooltip>
          )}
          {record.status === 'published' && (
            <Tooltip title="Despublicar">
              <Button 
                icon={<CloseOutlined />} 
                size="small" 
                onClick={() => handleUnpublishPost(record.id)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="¿Estás seguro de eliminar este post?"
            onConfirm={() => handleDeletePost(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Eliminar">
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const commentsColumns = [
    {
      title: 'Autor',
      key: 'author',
      render: (record: BlogComment) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500 }}>
              {getAuthorName(record.author)}
            </div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {record.author.email}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Contenido',
      dataIndex: 'content',
      key: 'content',
      render: (content: string) => (
        <Text ellipsis={{ rows: 2, expandable: true }}>
          {content}
        </Text>
      ),
    },
    {
      title: 'Post',
      key: 'post',
      render: (record: BlogComment) => (
        <div>
          <Text style={{ fontSize: '13px' }}>{record.post.title}</Text>
        </div>
      ),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: 'Fecha',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Text style={{ fontSize: '12px' }}>
          {formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: BlogComment) => (
        <Space size="small">
          {record.status === 'pending' && (
            <>
              <Tooltip title="Aprobar">
                <Button 
                  icon={<CheckOutlined />} 
                  size="small" 
                  type="primary"
                  onClick={() => handleModerateComment(record.id, 'approve')}
                />
              </Tooltip>
              <Tooltip title="Rechazar">
                <Button 
                  icon={<CloseOutlined />} 
                  size="small" 
                  danger
                  onClick={() => handleModerateComment(record.id, 'reject')}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Ver post">
            <Button 
              icon={<EyeOutlined />} 
              size="small" 
              onClick={() => window.open(`/blog/post/${record.post.slug || record.post.id}`, '_blank')}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const categoriesColumns = [
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: BlogCategory) => (
        <Space>
          <div 
            style={{ 
              width: '12px', 
              height: '12px', 
              backgroundColor: record.color, 
              borderRadius: '2px' 
            }} 
          />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'Slug',
      dataIndex: 'slug',
      key: 'slug',
      render: (slug: string) => <Text code>{slug}</Text>,
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => description || <Text type="secondary">Sin descripción</Text>,
    },
    {
      title: 'Posts',
      dataIndex: 'postCount',
      key: 'postCount',
      render: (count: number) => <Badge count={count} showZero color="green" />,
    },
    {
      title: 'Estado',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Activa' : 'Inactiva'}
        </Tag>
      ),
    },
    {
      title: 'Fecha creación',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Text style={{ fontSize: '12px' }}>
          {formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })}
        </Text>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (record: BlogCategory) => (
        <Space size="small">
          <Tooltip title="Editar">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => {
                setEditingCategory(record);
                categoryForm.setFieldsValue(record);
                setCategoryModalVisible(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title={`¿Eliminar la categoría "${record.name}"?`}
            description={`Esta acción eliminará la categoría y desasignará ${record.postCount} posts.`}
            onConfirm={() => handleDeleteCategory(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Tooltip title="Eliminar">
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Space align="center" style={{ marginBottom: '16px' }}>
          <Title level={2} style={{ margin: 0 }}>
            <SettingOutlined /> Administración del Blog
          </Title>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => navigate('/admin/blog/new')}
          >
            Nuevo Post
          </Button>
        </Space>
        
        {/* Stats Overview */}
        {stats && !statsLoading && (
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={12} sm={6}>
              <StatCard
                title="Total Posts"
                value={<NumberCounter value={stats.totalPosts} delay={0.2} />}
                icon={<FileTextOutlined />}
                trend={stats.postsThisMonth > 0 ? "up" : "neutral"}
                trendValue={stats.postsThisMonth > 0 ? `+${stats.postsThisMonth} este mes` : "Sin nuevos"}
                size="small"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="Publicados"
                value={<NumberCounter value={stats.publishedPosts} delay={0.4} />}
                icon={<EyeOutlined />}
                trend="neutral"
                trendValue={`${stats.draftPosts} borradores`}
                size="small"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="Comentarios"
                value={<NumberCounter value={stats.totalComments} delay={0.6} />}
                icon={<MessageOutlined />}
                trend={stats.pendingComments > 0 ? "down" : "up"}
                trendValue={stats.pendingComments > 0 ? `${stats.pendingComments} pendientes` : "Todo moderado"}
                size="small"
              />
            </Col>
            <Col xs={12} sm={6}>
              <StatCard
                title="Vistas Mes"
                value={<NumberCounter value={stats.monthlyViews} delay={0.8} />}
                icon={<BarChartOutlined />}
                trend="up"
                trendValue="Total del mes"
                size="small"
              />
            </Col>
          </Row>
        )}
      </div>

      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <span>
                <FileTextOutlined />
                Posts
                {stats && stats.draftPosts > 0 && (
                  <Badge count={stats.draftPosts} size="small" style={{ marginLeft: '8px' }} />
                )}
              </span>
            } 
            key="posts"
          >
            <div style={{ marginBottom: '16px' }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={8}>
                  <Search
                    placeholder="Buscar posts..."
                    value={postsFilters.search}
                    onChange={(e) => setPostsFilters({ ...postsFilters, search: e.target.value })}
                    onSearch={fetchPosts}
                    allowClear
                  />
                </Col>
                <Col xs={12} sm={4}>
                  <Select
                    placeholder="Estado"
                    value={postsFilters.status}
                    onChange={(value) => setPostsFilters({ ...postsFilters, status: value })}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="published">Publicado</Option>
                    <Option value="draft">Borrador</Option>
                    <Option value="archived">Archivado</Option>
                  </Select>
                </Col>
                <Col xs={12} sm={4}>
                  <Select
                    placeholder="Visibilidad"
                    value={postsFilters.visibility}
                    onChange={(value) => setPostsFilters({ ...postsFilters, visibility: value })}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="public">Público</Option>
                    <Option value="staff_only">Solo Personal</Option>
                    <Option value="students_only">Solo Estudiantes</Option>
                    <Option value="families_only">Solo Familias</Option>
                  </Select>
                </Col>
                <Col xs={24} sm={8}>
                  <Space>
                    <Button 
                      icon={<SearchOutlined />} 
                      onClick={fetchPosts}
                    >
                      Buscar
                    </Button>
                    <Button 
                      icon={<FilterOutlined />} 
                      onClick={() => {
                        setPostsFilters({ search: '', status: '', visibility: '', category: '' });
                        fetchPosts();
                      }}
                    >
                      Limpiar
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>

            <Table
              columns={postsColumns}
              dataSource={posts}
              rowKey="id"
              loading={postsLoading}
              pagination={{ 
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} posts`
              }}
              scroll={{ x: 800 }}
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <MessageOutlined />
                Comentarios
                {stats && stats.pendingComments > 0 && (
                  <Badge count={stats.pendingComments} size="small" style={{ marginLeft: '8px' }} />
                )}
              </span>
            } 
            key="comments"
          >
            <div style={{ marginBottom: '16px' }}>
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={8}>
                  <Search
                    placeholder="Buscar comentarios..."
                    value={commentFilters.search}
                    onChange={(e) => setCommentFilters({ ...commentFilters, search: e.target.value })}
                    onSearch={fetchComments}
                    allowClear
                  />
                </Col>
                <Col xs={12} sm={4}>
                  <Select
                    placeholder="Estado"
                    value={commentFilters.status}
                    onChange={(value) => setCommentFilters({ ...commentFilters, status: value })}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    <Option value="pending">Pendiente</Option>
                    <Option value="approved">Aprobado</Option>
                    <Option value="rejected">Rechazado</Option>
                  </Select>
                </Col>
                <Col xs={24} sm={12}>
                  <Space>
                    <Button 
                      icon={<SearchOutlined />} 
                      onClick={fetchComments}
                    >
                      Buscar
                    </Button>
                    <Button 
                      icon={<FilterOutlined />} 
                      onClick={() => {
                        setCommentFilters({ search: '', status: '' });
                        fetchComments();
                      }}
                    >
                      Limpiar
                    </Button>
                  </Space>
                </Col>
              </Row>
            </div>

            <Table
              columns={commentsColumns}
              dataSource={comments}
              rowKey="id"
              loading={commentsLoading}
              pagination={{ 
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} comentarios`
              }}
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <TagOutlined />
                Categorías
                {stats && (
                  <Badge count={stats.totalCategories} size="small" style={{ marginLeft: '8px' }} />
                )}
              </span>
            } 
            key="categories"
          >
            <div style={{ marginBottom: '16px' }}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingCategory(null);
                  categoryForm.resetFields();
                  setCategoryModalVisible(true);
                }}
              >
                Nueva Categoría
              </Button>
            </div>

            <Table
              columns={categoriesColumns}
              dataSource={categories}
              rowKey="id"
              loading={categoriesLoading}
              pagination={{ 
                pageSize: 10,
                showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} categorías`
              }}
            />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <SecurityScanOutlined />
                Roles y Permisos
              </span>
            } 
            key="roles"
          >
            <BlogRoleManager />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <BarChartOutlined />
                Analytics
              </span>
            } 
            key="analytics"
          >
            <BlogAnalytics />
          </TabPane>

          <TabPane 
            tab={
              <span>
                <PictureOutlined />
                Galería Multimedia
              </span>
            } 
            key="multimedia"
          >
            <div style={{ padding: '20px 0' }}>
              <Title level={4} style={{ marginBottom: '20px' }}>
                <PictureOutlined /> Gestión de Multimedia
              </Title>
              <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
                Administra archivos de imagen, video, audio y documentos para el blog. 
                Estos archivos pueden ser utilizados en las publicaciones y organizados por categorías.
              </Text>
              <MediaGallery
                showUpload={true}
                selectable={false}
                allowedTypes={['image', 'video', 'audio', 'document']}
                viewMode="grid"
                showFilters={true}
                showStats={true}
                adminMode={true}
              />
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* Category Modal */}
      <Modal
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        open={categoryModalVisible}
        onCancel={() => {
          setCategoryModalVisible(false);
          setEditingCategory(null);
          categoryForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleSaveCategory}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="Nombre"
                rules={[{ required: true, message: 'El nombre es obligatorio' }]}
              >
                <Input placeholder="Ej: Noticias" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="slug"
                label="Slug"
                rules={[{ required: true, message: 'El slug es obligatorio' }]}
              >
                <Input placeholder="ej-noticias" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Descripción"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="Descripción de la categoría..."
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="color"
                label="Color"
                rules={[{ required: true, message: 'Selecciona un color' }]}
              >
                <Select 
                  placeholder="Seleccionar color"
                  optionLabelProp="label"
                >
                  <Option
                    value="#579172"
                    label={
                      <Space>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#579172', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                        Verde
                      </Space>
                    }
                  >
                    <Space>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#579172', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                      Verde
                    </Space>
                  </Option>
                  <Option 
                    value="#52c41a" 
                    label={
                      <Space>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#52c41a', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                        Verde
                      </Space>
                    }
                  >
                    <Space>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#52c41a', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                      Verde
                    </Space>
                  </Option>
                  <Option 
                    value="#fa8c16" 
                    label={
                      <Space>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#fa8c16', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                        Naranja
                      </Space>
                    }
                  >
                    <Space>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#fa8c16', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                      Naranja
                    </Space>
                  </Option>
                  <Option 
                    value="#f5222d" 
                    label={
                      <Space>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#f5222d', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                        Rojo
                      </Space>
                    }
                  >
                    <Space>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#f5222d', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                      Rojo
                    </Space>
                  </Option>
                  <Option 
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
                  </Option>
                  <Option 
                    value="#13c2c2" 
                    label={
                      <Space>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#13c2c2', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                        Cian
                      </Space>
                    }
                  >
                    <Space>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#13c2c2', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                      Cian
                    </Space>
                  </Option>
                  <Option 
                    value="#eb2f96" 
                    label={
                      <Space>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#eb2f96', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                        Magenta
                      </Space>
                    }
                  >
                    <Space>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#eb2f96', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                      Magenta
                    </Space>
                  </Option>
                  <Option 
                    value="#faad14" 
                    label={
                      <Space>
                        <div style={{ width: '12px', height: '12px', backgroundColor: '#faad14', borderRadius: '2px', border: '1px solid #d9d9d9' }} />
                        Amarillo
                      </Space>
                    }
                  >
                    <Space>
                      <div style={{ width: '16px', height: '16px', backgroundColor: '#faad14', borderRadius: '3px', border: '1px solid #d9d9d9' }} />
                      Amarillo
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Estado"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch checkedChildren="Activa" unCheckedChildren="Inactiva" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => {
                setCategoryModalVisible(false);
                setEditingCategory(null);
                categoryForm.resetFields();
              }}>
                Cancelar
              </Button>
              <Button type="primary" htmlType="submit">
                {editingCategory ? 'Actualizar' : 'Crear'} Categoría
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BlogManagement;