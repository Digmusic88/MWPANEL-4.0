import React from 'react';
import {
  Modal,
  Typography,
  Space,
  Tag,
  Avatar,
  Divider,
  Row,
  Col,
  Card,
  Empty,
  Image,
} from 'antd';
import {
  UserOutlined,
  EyeOutlined,
  CalendarOutlined,
  FileTextOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { AudioOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface BlogPost {
  id: string;
  title: string;
  content: string;
  summary?: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  views?: number;
  author?: {
    id: string;
    email?: string;
    role?: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
  category?: {
    id: string;
    name: string;
    color?: string;
  };
  media?: Array<{
    id: string;
    filename: string;
    mimetype: string;
    url: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface BlogPostViewModalProps {
  open: boolean;
  post: BlogPost | null;
  onClose: () => void;
}

const BlogPostViewModal: React.FC<BlogPostViewModalProps> = ({
  open,
  post,
  onClose,
}) => {
  if (!post) return null;

  const getAuthorName = () => {
    if (!post.author) return 'Sin autor';
    if (post.author.profile) {
      return `${post.author.profile.firstName} ${post.author.profile.lastName}`;
    }
    if (post.author.email) {
      return post.author.email;
    }
    return 'Sin autor';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'green';
      case 'draft':
        return 'orange';
      case 'archived':
        return 'gray';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Publicado';
      case 'draft':
        return 'Borrador';
      case 'archived':
        return 'Archivado';
      default:
        return status;
    }
  };

  const renderMediaGallery = () => {
    if (!post.media || post.media.length === 0) {
      return null;
    }

    const renderMediaItem = (mediaItem: any) => {
      const { id, filename, mimetype, url } = mediaItem;
      
      if (mimetype.startsWith('image/')) {
        return (
          <Col key={id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              style={{ height: '240px' }}
              cover={
                <div style={{ height: '180px', overflow: 'hidden' }}>
                  <Image
                    src={url}
                    alt={filename}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              }
            >
              <Card.Meta 
                title={
                  <Text ellipsis style={{ fontSize: '12px' }}>
                    {filename}
                  </Text>
                }
              />
            </Card>
          </Col>
        );
      } else if (mimetype.startsWith('video/')) {
        return (
          <Col key={id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              style={{ height: '240px' }}
              cover={
                <div style={{ height: '180px', background: '#000' }}>
                  <video 
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    preload="metadata"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <source src={url} />
                    Tu navegador no soporta video HTML5.
                  </video>
                </div>
              }
            >
              <Card.Meta 
                title={
                  <Text ellipsis style={{ fontSize: '12px' }}>
                    {filename}
                  </Text>
                }
              />
            </Card>
          </Col>
        );
      } else if (mimetype.startsWith('audio/')) {
        return (
          <Col key={id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              style={{ height: '240px' }}
              cover={
                <div style={{
                  height: '180px',
                  background: 'linear-gradient(135deg, #fa8c16 0%, #faad14 100%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '16px'
                }}>
                  <AudioOutlined style={{ fontSize: '48px', color: 'white', marginBottom: '16px' }} />
                  <audio 
                    controls
                    style={{ width: '100%', maxWidth: '250px' }}
                    preload="metadata"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <source src={url} />
                    Tu navegador no soporta audio HTML5.
                  </audio>
                </div>
              }
            >
              <Card.Meta 
                title={
                  <Text ellipsis style={{ fontSize: '12px' }}>
                    {filename}
                  </Text>
                }
              />
            </Card>
          </Col>
        );
      } else {
        return (
          <Col key={id} xs={24} sm={12} md={8} lg={6}>
            <Card
              hoverable
              style={{ height: '240px' }}
              cover={
                <div style={{
                  height: '180px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f5f5f5'
                }}>
                  <Space direction="vertical" align="center">
                    <FileTextOutlined style={{ fontSize: '48px', color: '#bfbfbf' }} />
                    <Text type="secondary">Documento</Text>
                  </Space>
                </div>
              }
            >
              <Card.Meta 
                title={
                  <Text ellipsis style={{ fontSize: '12px' }}>
                    {filename}
                  </Text>
                }
              />
            </Card>
          </Col>
        );
      }
    };

    return (
      <Card size="small" title={<><PictureOutlined /> Galería de Medios</>} style={{ marginTop: '16px' }}>
        <Row gutter={[16, 16]}>
          {post.media.map(mediaItem => renderMediaItem(mediaItem))}
        </Row>
      </Card>
    );
  };

  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          Ver Publicación
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width="80%"
      style={{ top: 20 }}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0 4px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ marginBottom: '8px' }}>
            {post.title}
          </Title>
          
          <Space wrap style={{ marginBottom: '16px' }}>
            <Tag color={getStatusColor(post.status)}>
              {getStatusText(post.status)}
            </Tag>
            
            {post.category && (
              <Tag color={post.category.color || '#579172'}>
                {post.category.name}
              </Tag>
            )}
            
            <Space>
              <EyeOutlined />
              <Text>{post.views || 0} vistas</Text>
            </Space>
          </Space>

          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col span={12}>
              <Space>
                <Avatar icon={<UserOutlined />} size="small" />
                <div>
                  <Text strong>
                    {getAuthorName()}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Autor
                  </Text>
                </div>
              </Space>
            </Col>
            <Col span={12}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <Text type="secondary">
                    Creado: {dayjs(post.createdAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </div>
                {post.publishedAt && (
                  <div>
                    <CalendarOutlined style={{ marginRight: '8px' }} />
                    <Text type="secondary">
                      Publicado: {dayjs(post.publishedAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </div>
                )}
                {post.updatedAt !== post.createdAt && (
                  <div>
                    <CalendarOutlined style={{ marginRight: '8px' }} />
                    <Text type="secondary">
                      Actualizado: {dayjs(post.updatedAt).format('DD/MM/YYYY HH:mm')}
                    </Text>
                  </div>
                )}
              </Space>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Summary */}
        {post.summary && (
          <Card size="small" style={{ marginBottom: '16px', backgroundColor: '#f9f9f9' }}>
            <Paragraph style={{ margin: 0, fontStyle: 'italic' }}>
              <strong>Resumen:</strong> {post.summary}
            </Paragraph>
          </Card>
        )}

        {/* Content */}
        <Card title="Contenido" size="small" style={{ marginBottom: '16px' }}>
          <div 
            style={{ lineHeight: '1.6' }}
            dangerouslySetInnerHTML={{ __html: post.content || '' }}
          />
        </Card>

        {/* Media Gallery */}
        {renderMediaGallery()}
      </div>
    </Modal>
  );
};

export default BlogPostViewModal;