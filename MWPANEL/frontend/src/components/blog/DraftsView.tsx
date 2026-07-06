import React, { useState } from 'react';
import {
  Card,
  Empty,
  Spin,
  Button,
  Tag,
  Modal,
  message,
  Tooltip,
  Popconfirm,
  Space,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  SendOutlined,
  EyeOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import api from '../../services/apiClient';
import CreatePostModal from './CreatePostModal';

dayjs.extend(relativeTime);
dayjs.locale('es');

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  status: 'draft' | 'scheduled' | 'published';
  visibility: string;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
  };
  category?: {
    id: string;
    name: string;
    color?: string;
  };
  media: Array<{
    id: string;
    type: 'image' | 'video';
    url: string;
    thumbnailUrl?: string;
  }>;
}

const DraftsView: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Fetch user drafts and scheduled posts
  const { data: drafts = [], isLoading, refetch } = useQuery<BlogPost[]>({
    queryKey: ['blog-drafts'],
    queryFn: async () => {
      const response = await api.get('/blog-posts/my/drafts');
      return response.data;
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/blog-posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-drafts'] });
      message.success('Publicacion eliminada');
    },
    onError: () => {
      message.error('Error al eliminar la publicacion');
    },
  });

  // Publish now mutation
  const publishNowMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.post(`/blog-posts/${postId}/publish`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      message.success('Publicacion publicada correctamente');
    },
    onError: () => {
      message.error('Error al publicar');
    },
  });

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingPost(null);
    refetch();
  };

  const handleDelete = (postId: string) => {
    deletePostMutation.mutate(postId);
  };

  const handlePublishNow = (postId: string) => {
    publishNowMutation.mutate(postId);
  };

  const getStatusTag = (status: string, publishDate: string) => {
    if (status === 'draft') {
      return (
        <Tag icon={<FileTextOutlined />} color="default">
          Borrador
        </Tag>
      );
    }
    if (status === 'scheduled') {
      return (
        <Tag icon={<ClockCircleOutlined />} color="green">
          Programado para {dayjs(publishDate).format('DD/MM/YYYY HH:mm')}
        </Tag>
      );
    }
    return null;
  };

  const getTimeAgo = (date: string) => {
    return dayjs(date).fromNow();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span className="text-gray-500">
            No tienes borradores ni publicaciones programadas
          </span>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {drafts.map((post) => (
        <Card
          key={post.id}
          className="hover:shadow-md transition-shadow"
          bodyStyle={{ padding: '16px' }}
        >
          <div className="flex items-start gap-4">
            {/* Thumbnail */}
            {post.media && post.media.length > 0 ? (
              <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={post.media[0].thumbnailUrl || post.media[0].url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                <FileTextOutlined className="text-2xl text-gray-400" />
              </div>
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                      {post.excerpt}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {getStatusTag(post.status, post.publishDate)}
                </div>
              </div>

              {/* Meta info */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                {post.category && (
                  <span className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: post.category.color || '#6B7280' }}
                    />
                    {post.category.name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <CalendarOutlined />
                  Editado {getTimeAgo(post.updatedAt)}
                </span>
                {post.media && post.media.length > 0 && (
                  <span>{post.media.length} archivo(s)</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3">
                <Button
                  type="primary"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(post)}
                >
                  Editar
                </Button>

                {post.status === 'draft' && (
                  <Popconfirm
                    title="Publicar ahora"
                    description="¿Seguro que deseas publicar esta publicacion ahora?"
                    onConfirm={() => handlePublishNow(post.id)}
                    okText="Publicar"
                    cancelText="Cancelar"
                  >
                    <Button
                      size="small"
                      icon={<SendOutlined />}
                      loading={publishNowMutation.isPending}
                    >
                      Publicar ahora
                    </Button>
                  </Popconfirm>
                )}

                {post.status === 'scheduled' && (
                  <Tooltip title="Esta publicacion se publicara automaticamente en la fecha programada">
                    <Button size="small" icon={<ClockCircleOutlined />} disabled>
                      {dayjs(post.publishDate).format('DD/MM HH:mm')}
                    </Button>
                  </Tooltip>
                )}

                <Popconfirm
                  title="Eliminar borrador"
                  description="¿Seguro que deseas eliminar este borrador? Esta accion no se puede deshacer."
                  onConfirm={() => handleDelete(post.id)}
                  okText="Eliminar"
                  cancelText="Cancelar"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    loading={deletePostMutation.isPending}
                  >
                    Eliminar
                  </Button>
                </Popconfirm>
              </div>
            </div>
          </div>
        </Card>
      ))}

      {/* Edit Modal */}
      {editingPost && (
        <CreatePostModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingPost(null);
          }}
          onSuccess={handleEditSuccess}
          editPost={editingPost}
        />
      )}
    </div>
  );
};

export default DraftsView;
