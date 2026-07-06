import React from 'react';
import { Card, Typography, Space, Breadcrumb } from 'antd';
import { HomeOutlined, PictureOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import MediaGallery from '@/components/blog/MediaGallery';

const { Title, Paragraph } = Typography;

const MediaGalleryPage: React.FC = () => {
  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Breadcrumb Navigation */}
        <Breadcrumb style={{ marginBottom: '24px' }}>
          <Breadcrumb.Item>
            <Link to="/">
              <HomeOutlined /> Inicio
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/blog">Blog</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <PictureOutlined /> Galería Multimedia
          </Breadcrumb.Item>
        </Breadcrumb>

        {/* Header Section */}
        <Card style={{ marginBottom: '24px' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Title level={1} style={{ margin: 0, color: '#579172' }}>
              <PictureOutlined /> Galería Multimedia
            </Title>
            <Paragraph style={{ fontSize: '16px', margin: 0, color: '#666' }}>
              Descubre las actividades, eventos y momentos especiales de nuestro centro educativo 
              a través de nuestra galería de fotos y videos.
            </Paragraph>
          </Space>
        </Card>

        {/* Media Gallery Component */}
        <Card>
          <MediaGallery
            showUpload={false}
            selectable={false}
            viewMode="grid"
            allowedTypes={['image', 'video', 'audio']}
          />
        </Card>
      </div>
    </div>
  );
};

export default MediaGalleryPage;