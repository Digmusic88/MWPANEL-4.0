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
  Button,
} from 'antd';
import {
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  NotificationOutlined,
  FileTextOutlined,
  EyeOutlined,
  PictureOutlined,
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
  excerpt?: string;
  featured?: boolean;
}

interface FamilyBlogStats {
  totalAnnouncements: number;
  unreadPosts: number;
  thisWeekPosts: number;
}

const FamilyBlogWidgets: React.FC = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<BlogPost[]>([]);
  const [recentNews, setRecentNews] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<FamilyBlogStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFamilyBlogData();
  }, []);

  const fetchFamilyBlogData = async () => {
    try {
      setLoading(true);
      
      // Fetch posts visible to families and recent published posts
      const [familyPostsResponse, recentPostsResponse] = await Promise.all([
        apiClient.get('/blog-posts?visibility=families_only,public&status=published&limit=5&sortBy=publishedAt&sortOrder=desc'),
        apiClient.get('/blog-posts?status=published&featured=true&limit=4&sortBy=publishedAt&sortOrder=desc'),
      ]);

      const familyPosts = familyPostsResponse.data?.data || [];
      const featuredPosts = recentPostsResponse.data?.data || [];

      setAnnouncements(familyPosts);
      setRecentNews(featuredPosts);

      // Calculate stats for families
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const thisWeekPosts = familyPosts.filter((post: BlogPost) => 
        new Date(post.publishedAt || post.createdAt) >= oneWeekAgo
      ).length;

      const statsData: FamilyBlogStats = {
        totalAnnouncements: familyPosts.length,
        unreadPosts: familyPosts.length, // Simplified - assume all are "new" for families
        thisWeekPosts: thisWeekPosts,
      };

      setStats(statsData);

    } catch (error) {
      console.error('Error fetching family blog data:', error);
      message.error('Error al cargar noticias del centro');
    } finally {
      setLoading(false);
    }
  };

  const getAuthorName = (author: any) => {
    if (author?.profile?.firstName && author?.profile?.lastName) {
      return `${author.profile.firstName} ${author.profile.lastName}`;
    }
    return author?.email?.split('@')[0] || 'Centro Educativo';
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'families_only': return <NotificationOutlined style={{ color: '#fa8c16' }} />;
      case 'public': return <InfoCircleOutlined style={{ color: '#579172' }} />;
      default: return <FileTextOutlined style={{ color: '#666' }} />;
    }
  };

  const getVisibilityText = (visibility: string) => {
    switch (visibility) {
      case 'families_only': return 'Solo Familias';
      case 'public': return 'Noticia General';
      case 'class_specific': return 'Clase Específica';
      default: return 'Comunicado';
    }
  };

  const getPriorityColor = (post: BlogPost) => {
    if (post.visibility === 'families_only') return '#fa8c16'; // Orange for family-specific
    if (post.featured) return '#f5222d'; // Red for featured/urgent
    return '#579172'; // Green for general
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="family-blog-widgets" style={{ marginBottom: '24px' }}>
      {/* Family Blog Stats */}
      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={8} sm={8}>
            <StatCard
              title="Comunicados"
              value={<NumberCounter value={stats.totalAnnouncements} delay={0.2} />}
              icon={<BellOutlined />}
              trend="up"
              trendValue="Disponibles"
              className="h-full"
              size="small"
            />
          </Col>
          <Col xs={8} sm={8}>
            <StatCard
              title="Esta Semana"
              value={<NumberCounter value={stats.thisWeekPosts} delay={0.4} />}
              icon={<CalendarOutlined />}
              trend={stats.thisWeekPosts > 0 ? "up" : "neutral"}
              trendValue={stats.thisWeekPosts > 0 ? "Nuevos" : "Sin nuevos"}
              className="h-full"
              size="small"
            />
          </Col>
          <Col xs={8} sm={8}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                icon={<BookOutlined />}
                onClick={() => navigate('/family/blog')}
                block
                size="small"
              >
                Ver Blog
              </Button>
              <Button 
                icon={<PictureOutlined />}
                onClick={() => navigate('/galeria-multimedia')}
                block
                size="small"
              >
                Galería
              </Button>
            </Space>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]}>
        {/* Important Announcements */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <BellOutlined style={{ color: '#fa8c16' }} />
                <span>Comunicados del Centro</span>
                {stats && stats.thisWeekPosts > 0 && (
                  <Badge count={stats.thisWeekPosts} style={{ backgroundColor: '#f5222d' }} />
                )}
              </Space>
            }
            extra={
              <Button 
                type="link" 
                onClick={() => navigate('/family/blog')}
                size="small"
              >
                Ver todos
              </Button>
            }
            size="small"
          >
            {announcements.length > 0 ? (
              <List
                dataSource={announcements}
                renderItem={(post) => (
                  <List.Item
                    key={post.id}
                    style={{ 
                      padding: '12px 0', 
                      borderBottom: '1px solid #f0f0f0',
                      borderLeft: `4px solid ${getPriorityColor(post)}`,
                      paddingLeft: '12px'
                    }}
                  >
                    <List.Item.Meta
                      avatar={getVisibilityIcon(post.visibility)}
                      title={
                        <div>
                          <Link 
                            to={`/blog/post/${post.id}`}
                            style={{ 
                              fontSize: '14px', 
                              color: 'inherit', 
                              textDecoration: 'none',
                              fontWeight: post.featured ? 600 : 400
                            }}
                          >
                            <Text ellipsis={{ rows: 1, expandable: false }} style={{ maxWidth: '300px' }}>
                              {post.title}
                            </Text>
                          </Link>
                          <div style={{ marginTop: '4px' }}>
                            <Tag 
                              color={getPriorityColor(post)} 
                              style={{ fontSize: '10px' }}
                            >
                              {getVisibilityText(post.visibility)}
                            </Tag>
                            {post.category && (
                              <Tag 
                                color={post.category.color || '#579172'}
                                style={{ fontSize: '10px' }}
                              >
                                {post.category.name}
                              </Tag>
                            )}
                            {post.featured && (
                              <Tag 
                                color="red" 
                                style={{ fontSize: '10px' }}
                              >
                                Destacado
                              </Tag>
                            )}
                          </div>
                        </div>
                      }
                      description={
                        <div>
                          {post.excerpt && (
                            <Text 
                              style={{ 
                                fontSize: '12px', 
                                color: '#666',
                                display: 'block',
                                marginBottom: '4px'
                              }}
                            >
                              {post.excerpt.length > 80 
                                ? `${post.excerpt.substring(0, 80)}...` 
                                : post.excerpt
                              }
                            </Text>
                          )}
                          <div style={{ fontSize: '11px', color: '#999' }}>
                            <span>Por {getAuthorName(post.author)}</span>
                            <span style={{ margin: '0 8px' }}>•</span>
                            <CalendarOutlined style={{ marginRight: '4px' }} />
                            {formatDistanceToNow(
                              new Date(post.publishedAt || post.createdAt), 
                              { addSuffix: true, locale: es }
                            )}
                            {post.viewCount && (
                              <>
                                <span style={{ margin: '0 8px' }}>•</span>
                                <EyeOutlined style={{ marginRight: '2px' }} />
                                {post.viewCount} vistas
                              </>
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
                description="No hay comunicados disponibles" 
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                style={{ padding: '30px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* Featured News */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <BookOutlined style={{ color: '#579172' }} />
                <span>Noticias Destacadas</span>
              </Space>
            }
            size="small"
          >
            {recentNews.length > 0 ? (
              <List
                dataSource={recentNews}
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
                            backgroundColor: post.featured ? '#f5222d' : '#579172',
                            fontSize: '12px'
                          }} 
                          size="small"
                        />
                      }
                      title={
                        <Link 
                          to={`/blog/post/${post.id}`}
                          style={{ fontSize: '13px', color: 'inherit', textDecoration: 'none' }}
                        >
                          <Text ellipsis={{ rows: 2, expandable: false }} style={{ maxWidth: '200px' }}>
                            {post.title}
                          </Text>
                        </Link>
                      }
                      description={
                        <div style={{ fontSize: '11px', color: '#999' }}>
                          <CalendarOutlined style={{ marginRight: '4px' }} />
                          {formatDistanceToNow(
                            new Date(post.publishedAt || post.createdAt), 
                            { addSuffix: true, locale: es }
                          )}
                          {post.category && (
                            <>
                              <span style={{ margin: '0 4px' }}>•</span>
                              {post.category.name}
                            </>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty 
                description="No hay noticias destacadas" 
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

export default FamilyBlogWidgets;