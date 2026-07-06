import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Input,
  Select,
  Tag,
  Avatar,
  Space,
  Pagination,
  Spin,
  Empty,
  message,
  Breadcrumb,
} from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  CalendarOutlined,
  EyeOutlined,
  MessageOutlined,
  HomeOutlined,
  FileTextOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '@/services/apiClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  slug: string;
  featuredImage?: string;
  status: 'draft' | 'published';
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  readTime?: number;
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
  tags?: string[];
  viewCount?: number;
  commentCount?: number;
}

interface BlogCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  postCount: number;
}

const BlogListPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parámetros de filtro y paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalPosts, setTotalPosts] = useState(0);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'publishedAt');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [currentPage, searchTerm, selectedCategory, sortBy]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/blog-categories');
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        status: 'published',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory) params.append('categoryId', selectedCategory);
      if (sortBy) params.append('sortBy', sortBy);

      const response = await apiClient.get(`/blog-posts?${params.toString()}`);
      setPosts(response.data?.posts || []);
      setTotalPosts(response.data?.total || 0);

      // Actualizar URL con parámetros de búsqueda
      const newSearchParams = new URLSearchParams();
      if (searchTerm) newSearchParams.set('search', searchTerm);
      if (selectedCategory) newSearchParams.set('category', selectedCategory);
      if (sortBy !== 'publishedAt') newSearchParams.set('sort', sortBy);
      
      setSearchParams(newSearchParams);
    } catch (error) {
      console.error('Error fetching posts:', error);
      message.error('Error al cargar las publicaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  const getAuthorName = (author: BlogPost['author']) => {
    if (author.profile?.firstName && author.profile?.lastName) {
      return `${author.profile.firstName} ${author.profile.lastName}`;
    }
    return author.email?.split('@')[0] || 'Autor';
  };

  const stripHtml = (html: string, maxLength: number = 160) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const text = tmp.textContent || tmp.innerText || '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const renderPostCard = (post: BlogPost) => (
    <Col xs={24} sm={12} md={8} lg={6} key={post.id}>
      <Card
        hoverable
        className="h-full"
        cover={
          post.featuredImage ? (
            <div style={{ height: '200px', overflow: 'hidden' }}>
              <img
                alt={post.title}
                src={post.featuredImage}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : (
            <div
              style={{
                height: '200px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileTextOutlined style={{ fontSize: '48px', color: 'white' }} />
            </div>
          )
        }
        actions={[
          <Button
            key="read"
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/blog/post/${post.slug || post.id}`)}
          >
            Leer más
          </Button>,
          <Space key="stats" size="small">
            {post.viewCount && (
              <Text type="secondary">
                <EyeOutlined /> {post.viewCount}
              </Text>
            )}
            {post.commentCount && (
              <Text type="secondary">
                <MessageOutlined /> {post.commentCount}
              </Text>
            )}
          </Space>,
        ]}
      >
        <Card.Meta
          title={
            <Link
              to={`/blog/post/${post.slug || post.id}`}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: 0 }}>
                {post.title}
              </Title>
            </Link>
          }
          description={
            <div>
              <Paragraph
                ellipsis={{ rows: 3, expandable: false }}
                type="secondary"
                style={{ marginBottom: '12px' }}
              >
                {post.excerpt || stripHtml(post.content)}
              </Paragraph>
              
              <div style={{ marginBottom: '8px' }}>
                {post.category && (
                  <Tag color={post.category.color || 'green'}>
                    {post.category.name}
                  </Tag>
                )}
                {post.tags?.slice(0, 2).map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>

              <Space size="small" style={{ fontSize: '12px', color: '#999' }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text type="secondary">{getAuthorName(post.author)}</Text>
                <CalendarOutlined />
                <Text type="secondary">
                  {formatDistanceToNow(new Date(post.publishedAt || post.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </Text>
              </Space>
            </div>
          }
        />
      </Card>
    </Col>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>Blog</Breadcrumb.Item>
      </Breadcrumb>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Title level={1}>Blog Educativo</Title>
        <Paragraph type="secondary" style={{ fontSize: '16px', maxWidth: '600px', margin: '0 auto 16px' }}>
          Descubre artículos, recursos y noticias sobre educación, metodologías de enseñanza 
          y las últimas novedades de nuestra institución educativa.
        </Paragraph>
        <Space size="middle">
          <Link to="/blog/galeria">
            <Button type="primary" icon={<PictureOutlined />} size="large">
              Ver Galería Multimedia
            </Button>
          </Link>
        </Space>
      </div>

      {/* Filtros y búsqueda */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8}>
            <Input.Search
              placeholder="Buscar en el blog..."
              allowClear
              enterButton={<SearchOutlined />}
              size="large"
              defaultValue={searchTerm}
              onSearch={handleSearch}
              onChange={(e) => !e.target.value && handleSearch('')}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Select
              placeholder="Todas las categorías"
              style={{ width: '100%' }}
              size="large"
              allowClear
              value={selectedCategory || undefined}
              onChange={handleCategoryChange}
            >
              {categories.map(category => (
                <Option key={category.id} value={category.id}>
                  <Space>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      backgroundColor: category.color,
                      borderRadius: '50%',
                      display: 'inline-block'
                    }} />
                    {category.name}
                  </Space>
                </Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={6}>
            <Select
              value={sortBy}
              size="large"
              style={{ width: '100%' }}
              onChange={handleSortChange}
            >
              <Option value="publishedAt">Más recientes</Option>
              <Option value="viewCount">Más leídos</Option>
              <Option value="commentCount">Más comentados</Option>
              <Option value="title">Alfabético</Option>
            </Select>
          </Col>
          <Col xs={24} sm={4}>
            <Text type="secondary">
              {totalPosts} publicaciones
            </Text>
          </Col>
        </Row>
      </Card>

      {/* Lista de posts */}
      <Spin spinning={loading}>
        {posts.length > 0 ? (
          <>
            <Row gutter={[24, 24]}>
              {posts.map(renderPostCard)}
            </Row>
            
            {/* Paginación */}
            {totalPosts > pageSize && (
              <div style={{ textAlign: 'center', marginTop: '40px' }}>
                <Pagination
                  current={currentPage}
                  total={totalPosts}
                  pageSize={pageSize}
                  onChange={setCurrentPage}
                  showSizeChanger={false}
                  showQuickJumper
                  showTotal={(total, range) =>
                    `${range[0]}-${range[1]} de ${total} publicaciones`
                  }
                />
              </div>
            )}
          </>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              searchTerm || selectedCategory
                ? "No se encontraron publicaciones con los filtros aplicados"
                : "No hay publicaciones disponibles"
            }
          >
            {(searchTerm || selectedCategory) && (
              <Button onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
                setCurrentPage(1);
              }}>
                Limpiar filtros
              </Button>
            )}
          </Empty>
        )}
      </Spin>
    </div>
  );
};

export default BlogListPage;