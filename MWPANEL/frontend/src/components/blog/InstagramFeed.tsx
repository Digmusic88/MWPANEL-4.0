import React, { useState, useCallback, useEffect } from 'react';
import { Spin, Empty, Select, Button, message, Tabs, Badge } from 'antd';
import { PlusOutlined, FilterOutlined, ReloadOutlined, FileTextOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import InstagramPost from './InstagramPost';
import CreatePostModal from './CreatePostModal';
import DraftsView from './DraftsView';
import api from '../../services/apiClient';
import { useAuth } from '../../hooks/useAuth';
import { useUnreadBlogPosts } from '../../hooks/useUnreadBlogPosts';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  status: string;
  visibility: string;
  featured: boolean;
  visibilitySettings?: {
    classGroups?: string[];
    educationalLevels?: string[];
    subjects?: string[];
  };
  publishDate: string;
  createdAt: string;
  views: number;
  commentsEnabled: boolean;
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
    driveFileId?: string;
    alt?: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: {
      id: string;
      email: string;
      profile?: {
        firstName?: string;
        lastName?: string;
        avatar?: string;
      };
    };
  }>;
}

interface BlogCategory {
  id: string;
  name: string;
  color?: string;
}

interface InstagramFeedProps {
  onPostsLoaded?: (posts: BlogPost[]) => void;
  activePostId?: string;
}

const InstagramFeed: React.FC<InstagramFeedProps> = ({
  onPostsLoaded,
  activePostId,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('feed');
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Hook for tracking unread posts
  const { markAllAsRead, unreadCount } = useUnreadBlogPosts();

  const isFamily = user?.role === 'family';
  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const canPost = isAdmin || isTeacher;

  // Fetch categories
  const { data: categories = [] } = useQuery<BlogCategory[]>({
    queryKey: ['blog-categories'],
    queryFn: async () => {
      const response = await api.get('/blog/categories');
      // Handle both array response and {data: []} response format
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    },
  });

  // Fetch posts
  const {
    data: postsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['blog-posts', selectedCategory],
    queryFn: async () => {
      const params: Record<string, any> = {
        status: 'published',
        limit: 50,
        sortBy: 'publishDate',
        sortOrder: 'desc',
        includeMedia: true,
      };

      if (selectedCategory) {
        params.categoryId = selectedCategory;
      }

      const response = await api.get('/blog-posts', { params });
      return response.data;
    },
  });

  // Fetch drafts count for badge (only for users who can post)
  const { data: draftsData } = useQuery({
    queryKey: ['blog-drafts'],
    queryFn: async () => {
      const response = await api.get('/blog-posts/my/drafts');
      return response.data;
    },
    enabled: canPost,
  });

  const draftsCount = Array.isArray(draftsData) ? draftsData.length : 0;

  const posts: BlogPost[] = postsData?.data || [];

  // Scroll to specific post when URL has a hash (e.g., /blog#post-123)
  useEffect(() => {
    if (posts.length > 0 && location.hash) {
      const postId = location.hash.substring(1); // Remove the '#'
      const element = document.getElementById(postId);
      if (element) {
        // Small delay to ensure the DOM is ready
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }, [posts.length, location.hash]);

  // Notify parent component when posts are loaded
  useEffect(() => {
    if (posts.length > 0 && onPostsLoaded) {
      onPostsLoaded(posts);
    }
  }, [posts, onPostsLoaded]);

  // Mark all posts as read when user visits the blog feed
  useEffect(() => {
    if (posts.length > 0 && unreadCount > 0) {
      // Small delay to ensure UI loads first
      const timer = setTimeout(() => {
        markAllAsRead().catch(console.error);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [posts.length, unreadCount, markAllAsRead]);

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const response = await api.post('/blog-comments', {
        postId,
        content,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(`/blog-comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
    },
  });

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await api.delete(`/blog/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      message.success('Publicacion eliminada correctamente');
    },
  });

  // Convert to draft mutation
  const convertToDraftMutation = useMutation({
    mutationFn: async (postId: string) => {
      const response = await api.patch(`/blog-posts/${postId}`, { status: 'draft' });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
      queryClient.invalidateQueries({ queryKey: ['blog-drafts'] });
      refetch();
    },
  });

  const handleComment = useCallback(
    async (postId: string, content: string) => {
      await addCommentMutation.mutateAsync({ postId, content });
    },
    [addCommentMutation]
  );

  const handleDeleteComment = useCallback(
    async (commentId: string) => {
      await deleteCommentMutation.mutateAsync(commentId);
    },
    [deleteCommentMutation]
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      await deletePostMutation.mutateAsync(postId);
    },
    [deletePostMutation]
  );

  const handleEditPost = useCallback(
    (post: BlogPost) => {
      setEditingPost(post);
      setShowEditModal(true);
    },
    []
  );

  const handleConvertToDraft = useCallback(
    async (postId: string) => {
      await convertToDraftMutation.mutateAsync(postId);
    },
    [convertToDraftMutation]
  );

  const handlePostCreated = () => {
    setShowCreateModal(false);
    // Refrescar ambas listas (posts publicados y borradores)
    refetch();
    queryClient.invalidateQueries({ queryKey: ['blog-drafts'] });
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setEditingPost(null);
    // Refrescar ambas listas (posts publicados y borradores)
    refetch();
    queryClient.invalidateQueries({ queryKey: ['blog-drafts'] });
  };

  return (
    <div className="instagram-feed max-w-[614px] mx-auto px-4 py-6">
      {/* Header with action buttons */}
      <div className="flex items-center justify-end mb-4 gap-2">
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={isLoading}
        >
          Actualizar
        </Button>

        {canPost && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowCreateModal(true)}
          >
            Nueva publicacion
          </Button>
        )}
      </div>

      {/* Tabs for Feed and Drafts */}
      {canPost ? (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'feed',
              label: (
                <span className="flex items-center gap-2">
                  <AppstoreOutlined />
                  Publicaciones
                </span>
              ),
              children: (
                <>
                  {/* Category filter */}
                  <div className="flex items-center gap-3 mb-4">
                    <FilterOutlined className="text-gray-500" />
                    <Select
                      placeholder="Todas las categorias"
                      allowClear
                      value={selectedCategory}
                      onChange={setSelectedCategory}
                      className="min-w-[200px]"
                      options={[
                        { value: null, label: 'Todas las categorias' },
                        ...(Array.isArray(categories) ? categories : []).map((cat) => ({
                          value: cat.id,
                          label: cat.name,
                        })),
                      ]}
                    />
                  </div>

                  {/* Posts Feed */}
                  {isLoading ? (
                    <div className="flex justify-center py-12">
                      <Spin size="large" />
                    </div>
                  ) : posts.length === 0 ? (
                    <Empty
                      description="No hay publicaciones"
                      className="py-12"
                    />
                  ) : (
                    <div className="space-y-6">
                      {posts.map((post) => (
                        <InstagramPost
                          key={post.id}
                          id={post.id}
                          title={post.title}
                          content={post.content}
                          excerpt={post.excerpt}
                          author={post.author}
                          media={post.media || []}
                          comments={post.comments || []}
                          category={post.category}
                          classGroups={post.visibilitySettings?.classGroups}
                          createdAt={post.createdAt}
                          commentsEnabled={post.commentsEnabled}
                          canComment={isFamily || isAdmin}
                          canDelete={isAdmin || post.author.id === user?.id}
                          canEdit={isAdmin || post.author.id === user?.id}
                          currentUserId={user?.id}
                          isAdmin={isAdmin}
                          onComment={(content) => handleComment(post.id, content)}
                          onDeleteComment={handleDeleteComment}
                          onDeletePost={() => handleDeletePost(post.id)}
                          onEditPost={() => handleEditPost(post)}
                          onConvertToDraft={() => handleConvertToDraft(post.id)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ),
            },
            {
              key: 'drafts',
              label: (
                <span className="flex items-center gap-2">
                  <FileTextOutlined />
                  Borradores
                  {draftsCount > 0 && (
                    <Badge count={draftsCount} size="small" />
                  )}
                </span>
              ),
              children: <DraftsView />,
            },
          ]}
        />
      ) : (
        <>
          {/* Category filter for non-posting users */}
          <div className="flex items-center gap-3 mb-4">
            <FilterOutlined className="text-gray-500" />
            <Select
              placeholder="Todas las categorias"
              allowClear
              value={selectedCategory}
              onChange={setSelectedCategory}
              className="min-w-[200px]"
              options={[
                { value: null, label: 'Todas las categorias' },
                ...(Array.isArray(categories) ? categories : []).map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                })),
              ]}
            />
          </div>

          {/* Posts Feed */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spin size="large" />
            </div>
          ) : posts.length === 0 ? (
            <Empty
              description="No hay publicaciones"
              className="py-12"
            />
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <InstagramPost
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  content={post.content}
                  excerpt={post.excerpt}
                  author={post.author}
                  media={post.media || []}
                  comments={post.comments || []}
                  category={post.category}
                  classGroups={post.visibilitySettings?.classGroups}
                  createdAt={post.createdAt}
                  commentsEnabled={post.commentsEnabled}
                  canComment={isFamily || isAdmin}
                  canDelete={isAdmin || post.author.id === user?.id}
                  canEdit={isAdmin || post.author.id === user?.id}
                  currentUserId={user?.id}
                  isAdmin={isAdmin}
                  onComment={(content) => handleComment(post.id, content)}
                  onDeleteComment={handleDeleteComment}
                  onDeletePost={() => handleDeletePost(post.id)}
                  onEditPost={() => handleEditPost(post)}
                  onConvertToDraft={() => handleConvertToDraft(post.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Post Modal */}
      {canPost && (
        <CreatePostModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handlePostCreated}
        />
      )}

      {/* Edit Post Modal */}
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

export default InstagramFeed;
