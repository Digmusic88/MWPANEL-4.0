import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Empty,
  Spin,
  Badge,
  Button,
} from 'antd';
import {
  RightOutlined,
  CalendarOutlined,
  PlayCircleFilled,
  PictureOutlined,
  MessageOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import apiClient from '@/services/apiClient';
import { useUnreadBlogPosts } from '@/hooks/useUnreadBlogPosts';

const { Text } = Typography;

interface BlogMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  driveFileId?: string;
}

interface BlogPost {
  id: string;
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  status: string;
  publishedAt?: string;
  createdAt: string;
  views?: number;
  commentsEnabled: boolean;
  author: {
    id: string;
    email: string;
    profile?: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
  category?: {
    id: string;
    name: string;
    color: string;
  };
  media: BlogMedia[];
  comments: Array<{
    id: string;
  }>;
  featured?: boolean;
}

interface BlogFeedPreviewProps {
  maxPosts?: number;
  title?: string;
  blogRoute?: string;
  showFeatured?: boolean;
  compact?: boolean;
}

// Helper to get proxied media URL
const getProxiedMediaUrl = (media: BlogMedia): string => {
  if (media.driveFileId) {
    return `/api/blog-media/proxy-drive/${media.driveFileId}`;
  }
  if (media.id) {
    return `/api/blog-media/proxy/${media.id}`;
  }
  if (media.url) {
    let fileId: string | null = null;
    if (media.url.includes('drive.google.com/uc')) {
      const match = media.url.match(/[?&]id=([^&]+)/);
      fileId = match ? match[1] : null;
    } else if (media.url.includes('drive.google.com/file/d/')) {
      const match = media.url.match(/\/file\/d\/([^\/]+)/);
      fileId = match ? match[1] : null;
    } else if (media.url.includes('drive.usercontent.google.com')) {
      const match = media.url.match(/[?&]id=([^&]+)/);
      fileId = match ? match[1] : null;
    }
    if (fileId) {
      return `/api/blog-media/proxy-drive/${fileId}`;
    }
  }
  return media.url;
};

// Individual Post Card Component
const PostCard: React.FC<{
  post: BlogPost;
  onClick: () => void;
  compact?: boolean;
}> = ({ post, onClick, compact }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const hasMedia = post.media && post.media.length > 0;
  const firstMedia = hasMedia ? post.media[0] : null;
  const isVideo = firstMedia?.type === 'video';
  // Para vídeos: usar nuestro proxy autenticado que pide el fotograma a Drive
  // con credenciales del bot. La URL directa de Drive (thumbnailUrl) requiere
  // permisos públicos y devuelve 404 en navegador.
  // Para imágenes: comportamiento idéntico al anterior (getProxiedMediaUrl).
  const mediaUrl = firstMedia
    ? (isVideo && firstMedia.id
        ? `/api/blog-media/video-thumbnail/${firstMedia.id}`
        : getProxiedMediaUrl(firstMedia))
    : null;

  const timeAgo = formatDistanceToNow(
    new Date(post.publishedAt || post.createdAt),
    { addSuffix: true, locale: es }
  );

  // Strip HTML from content for preview
  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const contentPreview = post.excerpt || stripHtml(post.content);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300"
      style={{
        display: 'flex',
        flexDirection: compact ? 'row' : 'column',
        height: compact ? '110px' : 'auto',
      }}
    >
      {/* Media Thumbnail */}
      {hasMedia && (
        <div
          className="relative overflow-hidden bg-gray-50 flex-shrink-0"
          style={{
            width: compact ? '110px' : '100%',
            height: compact ? '110px' : '160px',
          }}
        >
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse">
              <PictureOutlined className="text-2xl text-gray-300" />
            </div>
          )}

          {imageError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <PictureOutlined className="text-2xl text-gray-300" />
            </div>
          ) : (
            <img
              src={mediaUrl || ''}
              alt={post.title}
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          )}

          {/* Video Play Indicator */}
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow group-hover:scale-110 transition-transform">
                <PlayCircleFilled className="text-xl text-gray-700 ml-0.5" />
              </div>
            </div>
          )}

          {/* Media Count Badge */}
          {post.media.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
              +{post.media.length - 1}
            </div>
          )}

          {/* Featured Badge */}
          {post.featured && (
            <div className="absolute top-2 left-2">
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                <FireOutlined style={{ fontSize: '10px' }} />
              </span>
            </div>
          )}
        </div>
      )}

      {/* No Media - Show smaller placeholder */}
      {!hasMedia && !compact && (
        <div
          className="relative overflow-hidden bg-gray-50 flex-shrink-0"
          style={{ height: '80px' }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <PictureOutlined className="text-3xl text-gray-200" />
          </div>
          {post.featured && (
            <div className="absolute top-2 left-2">
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                <FireOutlined style={{ fontSize: '10px' }} />
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div
        className="flex-1 p-3"
        style={{
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: compact ? 'center' : 'flex-start',
        }}
      >
        {/* Category Tag */}
        {post.category && (
          <div className="mb-1.5">
            <span
              className="text-xs px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${post.category.color}15` || '#f5f5f5',
                color: post.category.color || '#666',
              }}
            >
              {post.category.name}
            </span>
          </div>
        )}

        {/* Title */}
        <h4
          className="font-medium text-gray-800 mb-1 line-clamp-2 group-hover:text-[#579172] transition-colors m-0"
          style={{
            fontSize: compact ? '13px' : '14px',
            lineHeight: '1.4',
          }}
        >
          {post.title}
        </h4>

        {/* Content Preview - Only in non-compact mode */}
        {!compact && contentPreview && (
          <p
            className="text-gray-500 text-xs mb-2 line-clamp-2 m-0"
            style={{ lineHeight: '1.5' }}
          >
            {contentPreview.length > 80
              ? `${contentPreview.substring(0, 80)}...`
              : contentPreview
            }
          </p>
        )}

        {/* Meta Info */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-auto">
          <span className="flex items-center gap-1">
            <CalendarOutlined style={{ fontSize: '11px' }} />
            {timeAgo}
          </span>
          {post.comments && post.comments.length > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span className="flex items-center gap-1">
                <MessageOutlined style={{ fontSize: '11px' }} />
                {post.comments.length}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const BlogFeedPreview: React.FC<BlogFeedPreviewProps> = ({
  maxPosts = 4,
  title = 'Noticias del Centro',
  blogRoute = '/blog',
  showFeatured = true,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const { unreadCount } = useUnreadBlogPosts();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/blog-posts', {
        params: {
          status: 'published',
          limit: maxPosts,
          sortBy: 'publishDate',
          sortOrder: 'desc',
          includeMedia: true,
        },
      });

      const postsData = response.data?.data || [];
      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching blog posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePostClick = (post: BlogPost) => {
    // Navigate to blog page and scroll to the specific post
    navigate(`/blog#post-${post.id}`);
  };

  const handleViewAll = () => {
    navigate(blogRoute);
  };

  if (loading) {
    return (
      <Card
        style={{ borderRadius: '8px' }}
        bodyStyle={{ padding: '24px' }}
      >
        <div className="flex justify-center items-center py-8">
          <Spin size="default" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <Space>
            <span style={{ fontWeight: 500 }}>{title}</span>
            {unreadCount > 0 && (
              <Badge
                count={unreadCount}
                style={{ backgroundColor: '#579172' }}
                size="small"
              />
            )}
          </Space>
        </div>
      }
      extra={
        <Button
          type="link"
          onClick={handleViewAll}
          style={{ padding: 0 }}
        >
          Ver todo <RightOutlined style={{ fontSize: '11px' }} />
        </Button>
      }
      style={{ borderRadius: '8px' }}
      bodyStyle={{ padding: '16px' }}
    >
      {posts.length > 0 ? (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: compact
              ? '1fr'
              : 'repeat(auto-fill, minmax(260px, 1fr))',
          }}
        >
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => handlePostClick(post)}
              compact={compact}
            />
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text type="secondary">
              No hay publicaciones disponibles
            </Text>
          }
          style={{ padding: '24px 0' }}
        />
      )}

      {/* View All Button - Bottom */}
      {posts.length > 0 && (
        <div className="mt-4 text-center">
          <Button
            type="default"
            onClick={handleViewAll}
          >
            Ver todas las publicaciones
            <RightOutlined />
          </Button>
        </div>
      )}
    </Card>
  );
};

export default BlogFeedPreview;
