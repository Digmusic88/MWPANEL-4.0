/**
 * @archivo: BlogViewPage.tsx
 * @módulo: Admin Blog Viewing
 * @función: Página para visualizar entradas del blog publicadas desde admin
 * @creado: 2025-08-25
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Typography, Tag, Button, Space, Avatar, Spin, Empty, Input, Select, DatePicker } from 'antd';
import { UserOutlined, CalendarOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import BlogPostViewModal from '../../components/blog/BlogPostViewModal';

const { Title, Text, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  status: 'draft' | 'published';
  featured: boolean;
  createdAt: string;
  updatedAt: string;
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
  classGroups: Array<{
    id: string;
    name: string;
  }>;
  media: Array<{
    id: string;
    filename: string;
    url: string;
    type: string;
  }>;
}

const BlogViewPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [featuredFilter, setFeaturedFilter] = useState<string>('all');
  const navigate = useNavigate();

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (featuredFilter !== 'all') params.append('featured', featuredFilter);

      const response = await apiClient.get(`/blog-posts?${params.toString()}`);
      setPosts(response.data.data || response.data || []);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [searchTerm, statusFilter, featuredFilter]);

  const handleViewPost = (post: BlogPost) => {
    setSelectedPost(post);
    setViewModalVisible(true);
  };

  const handleEditPost = (post: BlogPost) => {
    navigate('/admin/blog');
  };

  const getAuthorName = (author: BlogPost['author']) => {
    if (!author) return 'Sin autor';
    if (author.profile) {
      return `${author.profile.firstName} ${author.profile.lastName}`;
    }
    return author.email;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    return status === 'published' ? 'green' : 'orange';
  };

  const getStatusText = (status: string) => {
    return status === 'published' ? 'Publicado' : 'Borrador';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>Ver Blog</Title>
        <Text type="secondary">
          Visualiza todas las entradas del blog publicadas y sus detalles
        </Text>
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={8} md={6}>
            <Search
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              value={statusFilter}
              onChange={setStatusFilter}
              placeholder="Estado"
            >
              <Option value="all">Todos</Option>
              <Option value="published">Publicados</Option>
              <Option value="draft">Borradores</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Select
              style={{ width: '100%' }}
              value={featuredFilter}
              onChange={setFeaturedFilter}
              placeholder="Destacados"
            >
              <Option value="all">Todos</Option>
              <Option value="true">Destacados</Option>
              <Option value="false">No destacados</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Lista de posts */}
      {posts.length === 0 ? (
        <Empty 
          description="No se encontraron entradas del blog"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <Row gutter={[16, 16]}>
          {posts.map((post) => (
            <Col key={post.id} xs={24} sm={12} lg={8} xl={6}>
              <Card
                hoverable
                style={{ height: '100%' }}
                cover={
                  post.media && post.media.length > 0 && post.media[0].type === 'image' ? (
                    <div style={{ height: '200px', overflow: 'hidden' }}>
                      <img 
                        src={post.media[0].url} 
                        alt={post.title}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover' 
                        }}
                      />
                    </div>
                  ) : null
                }
                actions={[
                  <Button 
                    key="view" 
                    type="text" 
                    icon={<EyeOutlined />} 
                    onClick={() => handleViewPost(post)}
                  >
                    Ver
                  </Button>,
                  <Button 
                    key="edit" 
                    type="text" 
                    icon={<EditOutlined />} 
                    onClick={() => handleEditPost(post)}
                  >
                    Editar
                  </Button>
                ]}
              >
                <Card.Meta
                  title={
                    <div>
                      <div style={{ marginBottom: '8px' }}>
                        {post.title}
                        {post.featured && (
                          <Tag color="gold" style={{ marginLeft: '8px' }}>
                            Destacado
                          </Tag>
                        )}
                      </div>
                      <Tag color={getStatusColor(post.status)}>
                        {getStatusText(post.status)}
                      </Tag>
                      {post.category && (
                        <Tag color={post.category.color}>
                          {post.category.name}
                        </Tag>
                      )}
                    </div>
                  }
                  description={
                    <div>
                      <Paragraph 
                        ellipsis={{ rows: 3 }} 
                        style={{ margin: '12px 0' }}
                      >
                        {post.excerpt || 'Sin extracto disponible'}
                      </Paragraph>
                      
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                        <Space>
                          <Avatar size="small" icon={<UserOutlined />} />
                          <span>{getAuthorName(post.author)}</span>
                        </Space>
                        <div style={{ marginTop: '4px' }}>
                          <CalendarOutlined style={{ marginRight: '4px' }} />
                          {formatDate(post.createdAt)}
                        </div>
                      </div>

                      {post.classGroups && post.classGroups.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          {post.classGroups.map(group => (
                            <Tag key={group.id} size="small">
                              {group.name}
                            </Tag>
                          ))}
                        </div>
                      )}

                      {post.media && post.media.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <Tag color="#579172" size="small">
                            {post.media.length} archivo{post.media.length !== 1 ? 's' : ''}
                          </Tag>
                        </div>
                      )}
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Modal de visualización */}
      <BlogPostViewModal
        open={viewModalVisible}
        post={selectedPost}
        onClose={() => {
          setViewModalVisible(false);
          setSelectedPost(null);
        }}
      />
    </div>
  );
};

export default BlogViewPage;