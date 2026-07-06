import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
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
  Button,
} from 'antd';
import {
  FileTextOutlined,
  EyeOutlined,
  PlusOutlined,
  BookOutlined,
  BellOutlined,
  CalendarOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import apiClient from '@/services/apiClient';
import { StatCard, NumberCounter } from '@/components/animations';

const { Title, Text } = Typography;

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
  visibility: 'public' | 'staff_only' | 'students_only' | 'families_only' | 'class_specific' | 'private';
}

interface BlogStats {
  teacherPosts: number;
  publishedPosts: number;
  draftPosts: number;
  totalViews: number;
  avgViewsPerPost: number;
}

const TeacherBlogWidgets: React.FC = () => {
  const navigate = useNavigate();
  const [teacherPosts, setTeacherPosts] = useState<BlogPost[]>([]);
  const [recentPosts, setRecentPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<BlogStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeacherBlogData();
  }, []);

  const fetchTeacherBlogData = async () => {
    try {
      setLoading(true);
      
      // Get current teacher info
      const userResponse = await apiClient.get('/auth/me');
      const currentUser = userResponse.data;

      // Fetch teacher's own posts and recent published posts in parallel
      const [teacherPostsResponse, recentPostsResponse] = await Promise.all([
        apiClient.get(`/blog-posts?authorId=${currentUser.id}&limit=5&sortBy=createdAt&sortOrder=desc`),
        apiClient.get('/blog-posts?status=published&limit=5&sortBy=publishedAt&sortOrder=desc'),
      ]);

      const teacherPostsData = teacherPostsResponse.data?.data || [];
      const recentPostsData = recentPostsResponse.data?.data || [];

      setTeacherPosts(teacherPostsData);
      setRecentPosts(recentPostsData);

      // Calculate stats
      const publishedCount = teacherPostsData.filter((post: BlogPost) => post.status === 'published').length;
      const draftCount = teacherPostsData.filter((post: BlogPost) => post.status === 'draft').length;
      const totalViews = teacherPostsData.reduce((total: number, post: BlogPost) => total + (post.viewCount || 0), 0);

      const statsData: BlogStats = {
        teacherPosts: teacherPostsData.length,
        publishedPosts: publishedCount,
        draftPosts: draftCount,
        totalViews: totalViews,
        avgViewsPerPost: teacherPostsData.length > 0 ? Math.round(totalViews / teacherPostsData.length) : 0,
      };

      setStats(statsData);

    } catch (error) {
      console.error('Error fetching teacher blog data:', error);
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
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return 'Publicado';
      case 'draft': return 'Borrador';
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

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'public': return '#579172';
      case 'staff_only': return 'purple';
      case 'students_only': return 'green';
      case 'families_only': return 'orange';
      case 'class_specific': return 'cyan';
      case 'private': return 'red';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="teacher-blog-widgets" style={{ marginBottom: '24px' }}>
      {/* Teacher Blog Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={12} sm={6}>
            <StatCard
              title="Mis Posts"
              value={<NumberCounter value={stats.teacherPosts} delay={0.2} />}
              icon={<FileTextOutlined />}
              trend={stats.draftPosts > 0 ? "neutral" : "up"}
              trendValue={stats.draftPosts > 0 ? `${stats.draftPosts} borradores` : "Todo publicado"}
              className="h-full"
              size="small"
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              title="Publicados"
              value={<NumberCounter value={stats.publishedPosts} delay={0.4} />}
              icon={<EyeOutlined />}
              trend="up"
              trendValue="Visibles"
              className="h-full"
              size="small"
            />
          </Col>
          <Col xs={12} sm={6}>
            <StatCard
              title="Total Vistas"
              value={<NumberCounter value={stats.totalViews} delay={0.6} />}
              icon={<EyeOutlined />}
              trend="up"
              trendValue={`${stats.avgViewsPerPost} promedio`}
              className="h-full"
              size="small"
            />
          </Col>
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
        </Row>
      )}

      <Row gutter={[16, 16]}>
        {/* Teacher's Posts */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <FileTextOutlined />
                <span>Mis Publicaciones</span>
                {stats && stats.draftPosts > 0 && (
                  <Badge count={stats.draftPosts} style={{ backgroundColor: '#faad14' }} />
                )}
              </Space>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/admin/blog')}
                size="small"
              >
                Ver todos
              </Button>
            }
            size="small"
          >
            {teacherPosts.length > 0 ? (
              <List
                dataSource={teacherPosts}
                renderItem={(post) => (
                  <List.Item
                    key={post.id}
                    style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={<FileTextOutlined />} 
                          style={{ 
                            backgroundColor: post.status === 'published' ? '#52c41a' : '#faad14',
                            fontSize: '12px'
                          }} 
                          size="small"
                        />
                      }
                      title={
                        <div>
                          <Link 
                            to={`/admin/blog/${post.id}`}
                            style={{ fontSize: '13px', color: 'inherit', textDecoration: 'none' }}
                          >
                            <Text ellipsis style={{ maxWidth: '180px' }}>
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
                            <Tag 
                              color={getVisibilityColor(post.visibility)} 
                              style={{ fontSize: '10px' }}
                            >
                              {getVisibilityText(post.visibility)}
                            </Tag>
                          </div>
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          <CalendarOutlined style={{ marginRight: '4px' }} />
                          {formatDistanceToNow(
                            new Date(post.publishedAt || post.createdAt), 
                            { addSuffix: true, locale: es }
                          )}
                          {post.viewCount && (
                            <span style={{ marginLeft: '8px' }}>
                              <EyeOutlined style={{ marginRight: '2px' }} />
                              {post.viewCount}
                            </span>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="No tienes publicaciones aún" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '20px 0' }}
              >
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={() => navigate('/admin/blog/new')}
                  size="small"
                >
                  Crear tu primer post
                </Button>
              </Empty>
            )}
          </Card>
        </Col>

        {/* Recent Published Posts */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <BookOutlined />
                <span>Últimas Publicaciones</span>
              </Space>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/blog')}
                size="small"
              >
                Ver blog público
              </Button>
            }
            size="small"
          >
            {recentPosts.length > 0 ? (
              <List
                dataSource={recentPosts}
                renderItem={(post) => (
                  <List.Item
                    key={post.id}
                    style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={<BookOutlined />} 
                          style={{ 
                            backgroundColor: '#579172',
                            fontSize: '12px'
                          }} 
                          size="small"
                        />
                      }
                      title={
                        <div>
                          <Link 
                            to={`/blog/post/${post.id}`}
                            style={{ fontSize: '13px', color: 'inherit', textDecoration: 'none' }}
                          >
                            <Text ellipsis style={{ maxWidth: '180px' }}>
                              {post.title}
                            </Text>
                          </Link>
                          {post.category && (
                            <div style={{ marginTop: '4px' }}>
                              <Tag 
                                color={post.category.color || '#579172'}
                                style={{ fontSize: '10px' }}
                              >
                                {post.category.name}
                              </Tag>
                            </div>
                          )}
                        </div>
                      }
                      description={
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          <span>Por {getAuthorName(post.author)}</span>
                          <div style={{ marginTop: '2px' }}>
                            <CalendarOutlined style={{ marginRight: '4px' }} />
                            {formatDistanceToNow(
                              new Date(post.publishedAt || post.createdAt), 
                              { addSuffix: true, locale: es }
                            )}
                            {post.viewCount && (
                              <span style={{ marginLeft: '8px' }}>
                                <EyeOutlined style={{ marginRight: '2px' }} />
                                {post.viewCount}
                              </span>
                            )}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="No hay publicaciones recientes" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '20px 0' }}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherBlogWidgets;