import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Tag,
  Typography,
  Avatar,
  Space,
  Input,
  Select,
  Empty,
  Button,
  Modal,
} from 'antd';
import {
  EyeOutlined,
  UserOutlined,
  SearchOutlined,
  FileTextOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/services/apiClient';
import BlogMediaViewer from '@/components/blog/BlogMediaViewer';

const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

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
  media?: any[];
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

const FamilyBlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [postModalVisible, setPostModalVisible] = useState(false);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchPosts();
    fetchCategories();
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
          includeMedia: true,  // ← Agregado para incluir archivos multimedia
          status: 'published',
          // Solo posts visibles para familias
          visibility: ['public', 'families_only'],
        },
      });
      const posts = response.data.data || [];
      setPosts(posts);
    } catch (error) {
      console.error('Error fetching posts:', error);
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
    }
  };

  const handleViewPost = async (post: BlogPost) => {
    setSelectedPost(post);
    setPostModalVisible(true);
  };

  const getVisibilityText = (visibility: string) => {
    switch (visibility) {
      case 'public': return 'Público';
      case 'staff_only': return 'Solo Personal';
      case 'students_only': return 'Solo Estudiantes';
      case 'families_only': return 'Solo Familias';
      case 'class_specific': return 'Clase Específica';
      default: return visibility;
    }
  };

  const getAuthorName = (author: any) => {
    if (author?.profile?.firstName && author?.profile?.lastName) {
      return `${author.profile.firstName} ${author.profile.lastName}`;
    }
    return 'Centro Educativo'; // RGPD: no mostrar email del autor
  };

  const stripHtml = (html: string, maxLength: number = 160) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchText === '' || 
      post.title.toLowerCase().includes(searchText.toLowerCase()) ||
      post.content.toLowerCase().includes(searchText.toLowerCase()) ||
      (post.excerpt && post.excerpt.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesCategory = !selectedCategory || post.category?.id === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <FileTextOutlined /> Noticias y Comunicados
        </Title>
        <Paragraph>
          Mantente informado sobre las últimas noticias, eventos y comunicaciones importantes del centro educativo.
        </Paragraph>
      </div>

      {/* Filtros */}
      <Card style={{ marginBottom: '24px' }}>
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Search
            placeholder="Buscar noticias y comunicados..."
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="Filtrar por categoría"
            allowClear
            style={{ width: 200 }}
            value={selectedCategory}
            onChange={setSelectedCategory}
          >
            {categories.map(category => (
              <Select.Option key={category.id} value={category.id}>
                <Tag color={category.color}>{category.name}</Tag>
              </Select.Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* Lista de posts */}
      <Card>
        <List
          loading={loading}
          itemLayout="vertical"
          size="large"
          pagination={{
            pageSize: 6,
            showSizeChanger: false,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} de ${total} comunicaciones`,
          }}
          dataSource={filteredPosts}
          locale={{
            emptyText: (
              <Empty
                description="No hay comunicaciones disponibles"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
          renderItem={(post) => (
            <List.Item
              key={post.id}
              actions={[
                <Space key="stats">
                  <span><EyeOutlined /> {post.views || 0} visualizaciones</span>
                </Space>,
                <Button 
                  key="read"
                  type="primary"
                  onClick={() => handleViewPost(post)}
                >
                  Leer comunicado completo
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={<UserOutlined />}
                    style={{ backgroundColor: '#52c41a' }}
                  />
                }
                title={
                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <Space>
                        <Text strong style={{ fontSize: '18px' }}>{post.title}</Text>
                        {post.category && (
                          <Tag color={post.category.color}>{post.category.name}</Tag>
                        )}
                        <Tag color="green">{getVisibilityText(post.visibility)}</Tag>
                      </Space>
                    </div>
                    <Space size="small">
                      <Text type="secondary">
                        Por {getAuthorName(post.author)}
                      </Text>
                      <Text type="secondary">•</Text>
                      <Text type="secondary">
                        <CalendarOutlined /> {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}
                      </Text>
                    </Space>
                  </div>
                }
                description={
                  <div style={{ marginTop: '12px' }}>
                    <Paragraph ellipsis={{ rows: 3 }}>
                      {post.excerpt || stripHtml(post.content)}
                    </Paragraph>
                    
                    {/* Mostrar media directamente en el post */}
                    {post.media && post.media.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <BlogMediaViewer 
                          media={post.media} 
                          compact={true}
                          showTitle={false}
                          maxWidth="500px"
                        />
                      </div>
                    )}
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* Modal de vista de comunicado */}
      <Modal
        title={selectedPost?.title}
        open={postModalVisible}
        onCancel={() => setPostModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {selectedPost && (
          <div>
            <div style={{ marginBottom: '16px', borderBottom: '1px solid #f0f0f0', paddingBottom: '16px' }}>
              <Space>
                <Avatar
                  icon={<UserOutlined />}
                  style={{ backgroundColor: '#52c41a' }}
                />
                <div>
                  <Text strong>{getAuthorName(selectedPost.author)}</Text>
                  <br />
                  <Text type="secondary" size="small">
                    <CalendarOutlined /> {new Date(selectedPost.publishedAt || selectedPost.createdAt).toLocaleDateString()}
                  </Text>
                </div>
                {selectedPost.category && (
                  <Tag color={selectedPost.category.color}>{selectedPost.category.name}</Tag>
                )}
              </Space>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <div 
                style={{ fontSize: '16px', lineHeight: '1.6' }}
                dangerouslySetInnerHTML={{ __html: selectedPost.content || '' }}
              />
            </div>

            {/* Media usando el nuevo componente */}
            {selectedPost.media && selectedPost.media.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <BlogMediaViewer 
                  media={selectedPost.media}
                  showTitle={true}
                  compact={false}
                  maxWidth="100%"
                />
              </div>
            )}

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
              <Space>
                <Text type="secondary">
                  <EyeOutlined /> {selectedPost.views || 0} visualizaciones
                </Text>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FamilyBlogPage;