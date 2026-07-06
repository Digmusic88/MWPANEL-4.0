import React, { useState, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Tag,
  Avatar,
  Space,
  Spin,
  message,
  Breadcrumb,
  Divider,
  Share,
  BackTop,
  Affix,
  Anchor,
  Image,
} from 'antd';
import {
  ArrowLeftOutlined,
  UserOutlined,
  CalendarOutlined,
  EyeOutlined,
  ShareAltOutlined,
  PrinterOutlined,
  StarOutlined,
  HomeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import apiClient from '@/services/apiClient';
import { useAuthStore } from '@/store/authStore';
import BlogComments from '@/components/blog/BlogComments';

const { Title, Text, Paragraph } = Typography;
const { Link: AnchorLink } = Anchor;

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
    description: string;
    color: string;
  };
  tags?: string[];
  media?: BlogMedia[];
}

interface BlogMedia {
  id: string;
  filename: string;
  originalName: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'gallery';
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  alt?: string;
}

interface RelatedPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string;
  publishedAt: string;
  author: {
    profile?: {
      firstName: string;
      lastName: string;
    };
    email: string;
  };
}

const BlogDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, [slug]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      
      // Buscar por slug o por ID
      const endpoint = slug?.includes('-') 
        ? `/blog-posts/slug/${slug}` 
        : `/blog-posts/${slug}`;
      
      const response = await apiClient.get(endpoint);
      const postData = response.data;
      
      if (!postData) {
        message.error('Publicación no encontrada');
        navigate('/blog');
        return;
      }

      setPost(postData);
      
      // Incrementar contador de vistas
      incrementViewCount(postData.id);
      
      // Cargar posts relacionados
      fetchRelatedPosts(postData.category?.id, postData.id);
      
    } catch (error: any) {
      console.error('Error fetching post:', error);
      if (error.response?.status === 404) {
        message.error('Publicación no encontrada');
        navigate('/blog');
      } else {
        message.error('Error al cargar la publicación');
      }
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async (postId: string) => {
    try {
      await apiClient.patch(`/blog-posts/${postId}/view`);
    } catch (error) {
      // Silently fail - no es crítico
      console.warn('Could not increment view count:', error);
    }
  };

  const fetchRelatedPosts = async (categoryId?: string, currentPostId?: string) => {
    try {
      const params = new URLSearchParams({
        limit: '4',
        status: 'published',
      });
      
      if (categoryId) {
        params.append('categoryId', categoryId);
      }
      
      const response = await apiClient.get(`/blog-posts?${params.toString()}`);
      const posts = (response.data?.posts || []).filter(
        (p: RelatedPost) => p.id !== currentPostId
      );
      
      setRelatedPosts(posts.slice(0, 3));
    } catch (error) {
      console.error('Error fetching related posts:', error);
    }
  };

  const getAuthorName = (author: BlogPost['author']) => {
    if (author?.profile?.firstName && author?.profile?.lastName) {
      return `${author.profile.firstName} ${author.profile.lastName}`;
    }
    return author?.email?.split('@')[0] || 'Autor';
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = post?.title || 'Blog Educativo';
    
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback - copiar al portapapeles
      try {
        await navigator.clipboard.writeText(url);
        message.success('URL copiada al portapapeles');
      } catch (error) {
        message.error('No se pudo copiar la URL');
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const renderMediaGallery = (media: BlogMedia[]) => {
    const images = media.filter(m => m.type === 'image');
    
    if (images.length === 0) return null;

    return (
      <Card title="Galería de imágenes" style={{ marginBottom: '24px' }}>
        <Image.PreviewGroup>
          <Row gutter={[16, 16]}>
            {images.map((image, index) => (
              <Col key={image.id} xs={12} sm={8} md={6}>
                <Image
                  src={image.url}
                  alt={image.alt || image.caption || `Imagen ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '120px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                  }}
                  placeholder={
                    <div style={{
                      width: '100%',
                      height: '120px',
                      background: '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '8px',
                    }}>
                      <FileTextOutlined style={{ fontSize: '24px', color: '#d9d9d9' }} />
                    </div>
                  }
                />
                {image.caption && (
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '4px' }}>
                    {image.caption}
                  </Text>
                )}
              </Col>
            ))}
          </Row>
        </Image.PreviewGroup>
      </Card>
    );
  };

  const renderRelatedPosts = () => {
    if (relatedPosts.length === 0) return null;

    return (
      <Card title="Artículos relacionados" style={{ marginTop: '24px' }}>
        <Row gutter={[16, 16]}>
          {relatedPosts.map(relatedPost => (
            <Col key={relatedPost.id} xs={24} sm={8}>
              <Card
                size="small"
                hoverable
                cover={
                  relatedPost.featuredImage ? (
                    <img
                      alt={relatedPost.title}
                      src={relatedPost.featuredImage}
                      style={{ height: '120px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      height: '120px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <FileTextOutlined style={{ fontSize: '32px', color: 'white' }} />
                    </div>
                  )
                }
                onClick={() => navigate(`/blog/post/${relatedPost.slug || relatedPost.id}`)}
              >
                <Card.Meta
                  title={
                    <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: '14px' }}>
                      {relatedPost.title}
                    </Title>
                  }
                  description={
                    <div>
                      <Paragraph ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: '12px' }}>
                        {relatedPost.excerpt}
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {formatDistanceToNow(new Date(relatedPost.publishedAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </Text>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!post) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <Title level={3}>Publicación no encontrada</Title>
        <Button type="primary" onClick={() => navigate('/blog')}>
          Volver al blog
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <BackTop />
      
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item href="/">
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item href="/blog">
          Blog
        </Breadcrumb.Item>
        <Breadcrumb.Item>
          {post.title.length > 50 ? `${post.title.substring(0, 50)}...` : post.title}
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* Botón volver */}
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/blog')}
        style={{ marginBottom: '24px' }}
      >
        Volver al blog
      </Button>

      <Row gutter={[24, 24]}>
        {/* Contenido principal */}
        <Col xs={24} lg={18}>
          <Card>
            {/* Header del post */}
            <div style={{ marginBottom: '24px' }}>
              {post.category && (
                <Tag color={post.category.color || 'green'} style={{ marginBottom: '8px' }}>
                  {post.category.name}
                </Tag>
              )}
              
              <Title level={1} style={{ margin: '8px 0 16px 0', lineHeight: '1.3' }}>
                {post.title}
              </Title>

              <Space size="middle" wrap>
                <Space size="small">
                  <Avatar size="small" icon={<UserOutlined />} />
                  <Text strong>{getAuthorName(post.author)}</Text>
                </Space>
                
                <Space size="small">
                  <CalendarOutlined />
                  <Text type="secondary">
                    {format(new Date(post.publishedAt || post.createdAt), 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
                  </Text>
                </Space>

                {post.readTime && (
                  <Text type="secondary">
                    Lectura: ~{post.readTime} min
                  </Text>
                )}

                {post.viewCount && (
                  <Space size="small">
                    <EyeOutlined />
                    <Text type="secondary">{post.viewCount} vistas</Text>
                  </Space>
                )}
              </Space>
            </div>

            {/* Imagen destacada */}
            {post.featuredImage && (
              <div style={{ marginBottom: '24px' }}>
                <Image
                  src={post.featuredImage}
                  alt={post.title}
                  style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px' }}
                />
              </div>
            )}

            {/* Excerpt */}
            {post.excerpt && (
              <Paragraph 
                style={{ 
                  fontSize: '18px', 
                  color: '#666', 
                  fontStyle: 'italic',
                  marginBottom: '24px',
                  padding: '16px',
                  background: '#f9f9f9',
                  borderLeft: '4px solid #579172',
                }}
              >
                {post.excerpt}
              </Paragraph>
            )}

            {/* Contenido */}
            <div 
              style={{ 
                fontSize: '16px', 
                lineHeight: '1.8',
                marginBottom: '24px'
              }}
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <Text type="secondary" style={{ marginRight: '8px' }}>Etiquetas:</Text>
                {post.tags.map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            )}

            {/* Galería multimedia */}
            {post.media && post.media.length > 0 && renderMediaGallery(post.media)}

            <Divider />

            {/* Acciones de compartir */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Space size="large">
                <Button 
                  icon={<ShareAltOutlined />} 
                  onClick={handleShare}
                  size="large"
                >
                  Compartir
                </Button>
                <Button 
                  icon={<PrinterOutlined />} 
                  onClick={handlePrint}
                  size="large"
                >
                  Imprimir
                </Button>
                <Button 
                  icon={<StarOutlined />} 
                  size="large"
                  disabled
                >
                  Guardar
                </Button>
              </Space>
            </div>
          </Card>

          {/* Comentarios */}
          <BlogComments
            postId={post.id}
            commentsEnabled={commentsEnabled}
            onCommentAdded={() => {
              // Opcional: refrescar estadísticas del post
            }}
          />

          {/* Posts relacionados */}
          {renderRelatedPosts()}
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={6}>
          <Affix offsetTop={24}>
            <div>
              {/* Índice del contenido */}
              <Card title="En este artículo" size="small" style={{ marginBottom: '16px' }}>
                <Anchor
                  affix={false}
                  showInkInFixed={true}
                  getContainer={() => document.getElementById('content-area') || window}
                >
                  <AnchorLink href="#contenido" title="Contenido principal" />
                  {post.media && post.media.some(m => m.type === 'image') && (
                    <AnchorLink href="#galeria" title="Galería de imágenes" />
                  )}
                  <AnchorLink href="#comentarios" title="Comentarios" />
                </Anchor>
              </Card>

              {/* Información del autor */}
              <Card title="Sobre el autor" size="small">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <Text strong>{getAuthorName(post.author)}</Text>
                    </div>
                  </Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Miembro del equipo educativo
                  </Text>
                </Space>
              </Card>
            </div>
          </Affix>
        </Col>
      </Row>
    </div>
  );
};

export default BlogDetailPage;