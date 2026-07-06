import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  List,
  Avatar,
  Tag,
  Typography,
  Space,
  Empty,
  Spin,
  message,
  Badge,
  Tooltip,
  Progress,
} from 'antd';
import {
  FileTextOutlined,
  EditOutlined,
  EyeOutlined,
  MessageOutlined,
  PlusOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  BarChartOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import apiClient from '@/services/apiClient';
import { StatCard, NumberCounter } from '@/components/animations';

const { Title, Text } = Typography;

interface BlogStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalComments: number;
  pendingComments: number;
  monthlyViews: number;
  postsThisMonth: number;
  engagementRate: number;
}

interface BlogPost {
  id: string;
  title: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  createdAt: string;
  viewCount?: number;
  commentCount?: number;
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

const AdminBlogWidgets: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [pendingComments, setPendingComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBlogData();
  }, []);

  const fetchBlogData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats, posts, and comments in parallel
      const [statsResponse, postsResponse, commentsResponse] = await Promise.all([
        apiClient.get('/blog-posts/blog-statistics'),
        apiClient.get('/blog-posts?limit=5&sortBy=createdAt&sortOrder=desc'),
        apiClient.get('/blog-comments/pending'),
      ]);

      // Process stats
      const blogStats: BlogStats = {
        totalPosts: statsResponse.data?.totalPosts || 0,
        publishedPosts: statsResponse.data?.publishedPosts || 0,
        draftPosts: statsResponse.data?.draftPosts || 0,
        totalComments: statsResponse.data?.totalComments || 0,
        pendingComments: statsResponse.data?.pendingComments || 0,
        monthlyViews: statsResponse.data?.monthlyViews || 0,
        postsThisMonth: statsResponse.data?.postsThisMonth || 0,
        engagementRate: statsResponse.data?.engagementRate || 0,
      };

      setStats(blogStats);
      setRecentPosts(postsResponse.data?.data || []);
      setPendingComments(commentsResponse.data || []);

    } catch (error) {
      console.error('Error fetching blog data:', error);
      message.error('Error al cargar datos del blog');
    } finally {
      setLoading(false);
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
      case 'pending': return '#579172';
      case 'approved': return 'green';
      case 'rejected': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Publicado';
      case 'draft': return 'Borrador';
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobado';
      case 'rejected': return 'Rechazado';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Empty 
        description="No se pudieron cargar los datos del blog"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <div className="admin-blog-widgets">
      {/* Blog Stats Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Total Posts"
            value={<NumberCounter value={stats.totalPosts} delay={0.2} />}
            icon={<FileTextOutlined />}
            trend={stats.postsThisMonth > 0 ? "up" : "neutral"}
            trendValue={stats.postsThisMonth > 0 ? `+${stats.postsThisMonth} este mes` : "Sin nuevos posts"}
            className="h-full"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Posts Publicados"
            value={<NumberCounter value={stats.publishedPosts} delay={0.4} />}
            icon={<EyeOutlined />}
            trend="neutral"
            trendValue={`${stats.draftPosts} borradores`}
            className="h-full"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Comentarios"
            value={<NumberCounter value={stats.totalComments} delay={0.6} />}
            icon={<MessageOutlined />}
            trend={stats.pendingComments > 0 ? "down" : "up"}
            trendValue={stats.pendingComments > 0 ? `${stats.pendingComments} pendientes` : "Todo moderado"}
            className="h-full"
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title="Vistas Mes"
            value={<NumberCounter value={stats.monthlyViews} delay={0.8} />}
            icon={<BarChartOutlined />}
            trend="up"
            trendValue={`${stats.engagementRate.toFixed(1)}% engagement`}
            className="h-full"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Recent Posts */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>Últimos Posts</span>
                <Badge count={stats.draftPosts} style={{ backgroundColor: '#faad14' }} />
              </Space>
            }
            extra={
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/admin/blog/new')}
                  size="small"
                >
                  Nuevo Post
                </Button>
                <Button 
                  type="link" 
                  onClick={() => navigate('/admin/blog')}
                  size="small"
                >
                  Ver todos
                </Button>
              </Space>
            }
            bodyStyle={{ padding: '12px' }}
          >
            {recentPosts.length > 0 ? (
              <List
                dataSource={recentPosts}
                renderItem={(post) => (
                  <List.Item
                    key={post.id}
                    style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={<FileTextOutlined />} 
                          style={{ 
                            backgroundColor: post.status === 'published' ? '#52c41a' : '#faad14',
                            fontSize: '14px'
                          }} 
                        />
                      }
                      title={
                        <div>
                          <Link 
                            to={`/admin/blog/${post.id}`}
                            style={{ 
                              color: 'inherit', 
                              textDecoration: 'none',
                              fontSize: '14px'
                            }}
                          >
                            <Text ellipsis style={{ maxWidth: '200px' }}>
                              {post.title}
                            </Text>
                          </Link>
                          <div style={{ marginTop: '4px' }}>
                            <Tag 
                              color={getStatusColor(post.status)} 
                              style={{ fontSize: '10px' }}
                            >
                              {getStatusText(post.status)}
                            </Tag>
                            {post.category && (
                              <Tag 
                                color={post.category.color || '#579172'}
                                style={{ fontSize: '10px' }}
                              >
                                {post.category.name}
                              </Tag>
                            )}
                          </div>
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          <div>
                            Por {getAuthorName(post.author)}
                          </div>
                          <div>
                            <CalendarOutlined style={{ marginRight: '4px' }} />
                            {formatDistanceToNow(
                              new Date(post.publishedAt || post.createdAt), 
                              { addSuffix: true, locale: es }
                            )}
                          </div>
                          {(post.viewCount || post.commentCount) && (
                            <div style={{ marginTop: '2px' }}>
                              {post.viewCount && (
                                <span style={{ marginRight: '8px' }}>
                                  <EyeOutlined style={{ marginRight: '2px' }} />
                                  {post.viewCount}
                                </span>
                              )}
                              {post.commentCount && (
                                <span>
                                  <MessageOutlined style={{ marginRight: '2px' }} />
                                  {post.commentCount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      }
                    />
                    <div>
                      <Tooltip title="Editar post">
                        <Button 
                          type="link" 
                          icon={<EditOutlined />} 
                          onClick={() => navigate(`/admin/blog/${post.id}/edit`)}
                          size="small"
                        />
                      </Tooltip>
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="No hay posts aún" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '20px' }}
              >
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/admin/blog/new')}
                >
                  Crear primer post
                </Button>
              </Empty>
            )}
          </Card>
        </Col>

        {/* Pending Comments */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <MessageOutlined />
                <span>Comentarios Pendientes</span>
                {stats.pendingComments > 0 && (
                  <Badge 
                    count={stats.pendingComments} 
                    style={{ backgroundColor: '#f5222d' }} 
                  />
                )}
              </Space>
            }
            extra={
              <Space>
                {stats.pendingComments > 0 && (
                  <Button 
                    type="primary" 
                    danger
                    icon={<ExclamationCircleOutlined />}
                    onClick={() => navigate('/admin/blog/comments?status=pending')}
                    size="small"
                  >
                    Moderar
                  </Button>
                )}
                <Button 
                  type="link" 
                  onClick={() => navigate('/admin/blog/comments')}
                  size="small"
                >
                  Ver todos
                </Button>
              </Space>
            }
            bodyStyle={{ padding: '12px' }}
          >
            {pendingComments.length > 0 ? (
              <List
                dataSource={pendingComments}
                renderItem={(comment) => (
                  <List.Item
                    key={comment.id}
                    style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={<UserOutlined />} 
                          style={{ 
                            backgroundColor: '#fa8c16',
                            fontSize: '12px'
                          }} 
                        />
                      }
                      title={
                        <div>
                          <Text style={{ fontSize: '12px', fontWeight: 500 }}>
                            {getAuthorName(comment.author)}
                          </Text>
                          <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                            En: <Link 
                              to={`/blog/post/${comment.post.slug || comment.post.id}`}
                              style={{ color: '#579172' }}
                            >
                              {comment.post.title.length > 30 
                                ? `${comment.post.title.substring(0, 30)}...` 
                                : comment.post.title
                              }
                            </Link>
                          </div>
                        </div>
                      }
                      description={
                        <div>
                          <Text 
                            style={{ 
                              fontSize: '11px', 
                              color: '#666',
                              display: 'block',
                              marginBottom: '4px'
                            }}
                          >
                            {comment.content.length > 80 
                              ? `${comment.content.substring(0, 80)}...` 
                              : comment.content
                            }
                          </Text>
                          <Text style={{ fontSize: '10px', color: '#999' }}>
                            <ClockCircleOutlined style={{ marginRight: '2px' }} />
                            {formatDistanceToNow(
                              new Date(comment.createdAt), 
                              { addSuffix: true, locale: es }
                            )}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="No hay comentarios pendientes" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '20px' }}
              >
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Todos los comentarios están moderados
                </Text>
              </Empty>
            )}
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Card 
        title="Acciones Rápidas del Blog" 
        style={{ marginTop: '16px' }}
        bodyStyle={{ padding: '16px' }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => navigate('/admin/blog/new')}
              block
            >
              Nuevo Post
            </Button>
          </Col>
          <Col xs={12} sm={6}>
            <Button 
              icon={<EditOutlined />}
              onClick={() => navigate('/admin/blog')}
              block
            >
              Gestionar Posts
            </Button>
          </Col>
          <Col xs={12} sm={6}>
            <Button 
              icon={<MessageOutlined />}
              onClick={() => navigate('/admin/blog/comments')}
              block
            >
              Moderar Comentarios
            </Button>
          </Col>
          <Col xs={12} sm={6}>
            <Button 
              icon={<BarChartOutlined />}
              onClick={() => navigate('/admin/blog/analytics')}
              block
            >
              Ver Analytics
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default AdminBlogWidgets;