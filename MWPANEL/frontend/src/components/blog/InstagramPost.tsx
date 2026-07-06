import React, { useState, useRef, useEffect } from 'react';
import { Avatar, Button, Input, Tooltip, Modal, message, Popconfirm, Spin } from 'antd';
import {
  MessageOutlined,
  DeleteOutlined,
  UserOutlined,
  PlayCircleOutlined,
  LeftOutlined,
  RightOutlined,
  EditOutlined,
  FileTextOutlined,
  LoadingOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';

dayjs.extend(relativeTime);
dayjs.locale('es');

interface BlogMedia {
  id: string;
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;
  driveFileId?: string;
  alt?: string;
}

// Helper function to get proxied media URL to avoid CORS issues with Google Drive
const getProxiedMediaUrl = (media: BlogMedia): string => {
  // For videos, prefer using the driveFileId with iframe embedding (handled in renderMedia)
  // For images, use proxy

  // If we have a driveFileId, use the backend proxy with a special endpoint
  if (media.driveFileId) {
    return `/api/blog-media/proxy-drive/${media.driveFileId}`;
  }

  // If we have a media ID (database record), use the backend proxy
  if (media.id) {
    return `/api/blog-media/proxy/${media.id}`;
  }

  // If URL is a Google Drive URL, extract the file ID and use proxy
  if (media.url) {
    // Check for various Google Drive URL formats
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

  // Fallback to original URL for non-Google Drive media
  return media.url;
};

interface BlogComment {
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
}

interface InstagramPostProps {
  id: string;
  title: string;
  content: string;
  excerpt?: string;
  author: {
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
  };
  media: BlogMedia[];
  comments: BlogComment[];
  category?: {
    id: string;
    name: string;
    color?: string;
  };
  classGroups?: string[];
  createdAt: string;
  commentsEnabled: boolean;
  canComment: boolean; // Solo familias pueden comentar
  canDelete: boolean; // Admin o autor del post
  canEdit: boolean; // Admin o autor del post
  currentUserId?: string; // ID del usuario actual para verificar permisos de comentarios
  isAdmin?: boolean; // Si el usuario actual es admin
  onComment?: (content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onDeletePost?: () => Promise<void>;
  onEditPost?: () => void; // Editar el post
  onConvertToDraft?: () => Promise<void>; // Convertir a borrador
}

const InstagramPost: React.FC<InstagramPostProps> = ({
  id,
  title,
  content,
  excerpt,
  author,
  media,
  comments,
  category,
  classGroups,
  createdAt,
  commentsEnabled,
  canComment,
  canDelete,
  canEdit,
  currentUserId,
  isAdmin,
  onComment,
  onDeleteComment,
  onDeletePost,
  onEditPost,
  onConvertToDraft,
}) => {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showAllComments, setShowAllComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedContent, setExpandedContent] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isConvertingToDraft, setIsConvertingToDraft] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<number | null>(null);
  const [isMediaLoading, setIsMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handlePrevMedia = () => {
    setCurrentMediaIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const handleNextMedia = () => {
    setCurrentMediaIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !onComment) return;

    setIsSubmitting(true);
    try {
      await onComment(newComment.trim());
      setNewComment('');
      message.success('Comentario publicado');
    } catch (error) {
      message.error('Error al publicar el comentario');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!onDeletePost) return;

    try {
      await onDeletePost();
      message.success('Publicacion eliminada');
      setShowDeleteModal(false);
    } catch (error) {
      message.error('Error al eliminar la publicacion');
    }
  };

  const handleConvertToDraft = async () => {
    if (!onConvertToDraft) return;

    setIsConvertingToDraft(true);
    try {
      await onConvertToDraft();
      message.success('Publicacion convertida a borrador');
    } catch (error) {
      message.error('Error al convertir a borrador');
    } finally {
      setIsConvertingToDraft(false);
    }
  };

  // Detectar dimensiones de la imagen cuando cambia el media
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setMediaAspectRatio(img.naturalWidth / img.naturalHeight);
    }
    setIsMediaLoading(false);
  };

  // Manejar errores de carga de imagen
  const handleImageError = () => {
    setIsMediaLoading(false);
    setMediaError(true);
  };

  // Detectar dimensiones del video
  const handleVideoLoad = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    if (video.videoWidth && video.videoHeight) {
      setMediaAspectRatio(video.videoWidth / video.videoHeight);
    }
    setIsMediaLoading(false);
  };

  // Manejar errores de carga de video
  const handleVideoError = () => {
    setIsMediaLoading(false);
    setMediaError(true);
  };

  // Reset aspect ratio y loading state cuando cambia el media
  useEffect(() => {
    setMediaAspectRatio(null);
    setIsMediaLoading(true);
    setMediaError(false);
  }, [currentMediaIndex]);

  // Helper to extract Google Drive file ID from URL
  const extractDriveFileId = (url: string): string | null => {
    if (!url) return null;

    let fileId: string | null = null;

    if (url.includes('drive.google.com/uc')) {
      const match = url.match(/[?&]id=([^&]+)/);
      fileId = match ? match[1] : null;
    } else if (url.includes('drive.google.com/file/d/')) {
      const match = url.match(/\/file\/d\/([^\/]+)/);
      fileId = match ? match[1] : null;
    } else if (url.includes('drive.usercontent.google.com')) {
      const match = url.match(/[?&]id=([^&]+)/);
      fileId = match ? match[1] : null;
    }

    return fileId;
  };

  // Skeleton de carga para media
  const MediaSkeleton = () => (
    <div
      className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-3">
        <Spin
          indicator={<LoadingOutlined style={{ fontSize: 32, color: '#9ca3af' }} spin />}
        />
        <span className="text-gray-400 text-sm">Cargando...</span>
      </div>
    </div>
  );

  // Error de carga de media
  const MediaErrorPlaceholder = () => (
    <div
      className="absolute inset-0 bg-gray-100 flex items-center justify-center"
    >
      <div className="flex flex-col items-center gap-2 text-gray-400">
        <PictureOutlined style={{ fontSize: 48 }} />
        <span className="text-sm">No se pudo cargar el contenido</span>
      </div>
    </div>
  );

  const renderMedia = () => {
    if (!media || media.length === 0) return null;

    const currentMedia = media[currentMediaIndex];
    const mediaUrl = getProxiedMediaUrl(currentMedia);

    if (currentMedia.type === 'video') {
      // Usar siempre el proxy del backend para videos (evita problemas de CSP con Google Drive)
      return (
        <div
          className="relative w-full bg-black"
          style={{
            aspectRatio: mediaAspectRatio ? `${mediaAspectRatio}` : '16/9',
            maxHeight: '600px',
            minHeight: '200px'
          }}
        >
          {isMediaLoading && <MediaSkeleton />}
          {mediaError && <MediaErrorPlaceholder />}
          <video
            ref={videoRef}
            src={mediaUrl}
            className={`w-full h-full object-contain transition-opacity duration-300 ${
              isMediaLoading || mediaError ? 'opacity-0' : 'opacity-100'
            }`}
            controls
            playsInline
            onLoadedMetadata={handleVideoLoad}
            onError={handleVideoError}
          />
        </div>
      );
    }

    return (
      <div
        className="relative w-full bg-gray-100"
        style={{
          aspectRatio: mediaAspectRatio ? `${mediaAspectRatio}` : '4/3',
          maxHeight: '600px',
          minHeight: '200px'
        }}
      >
        {isMediaLoading && <MediaSkeleton />}
        {mediaError && <MediaErrorPlaceholder />}
        <img
          ref={imgRef}
          src={mediaUrl}
          alt={currentMedia.alt || title}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            isMediaLoading || mediaError ? 'opacity-0' : 'opacity-100'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </div>
    );
  };

  const displayedComments = showAllComments ? comments : comments.slice(-2);

  return (
    <div
      id={`post-${id}`}
      className="instagram-post bg-white border border-gray-200 rounded-lg mb-6 overflow-hidden"
    >
      {/* Header - Titulo y tiempo */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base truncate">{title}</div>
          <div className="text-xs text-gray-500">
            {dayjs(createdAt).fromNow()}
          </div>
        </div>
        {/* Botones de accion para admin/autor */}
        {canEdit && (
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <Tooltip title="Editar publicacion">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={onEditPost}
              />
            </Tooltip>
            <Popconfirm
              title="Convertir a borrador"
              description="La publicacion dejara de ser visible. Podras editarla y volver a publicarla desde la seccion de borradores."
              onConfirm={handleConvertToDraft}
              okText="Convertir"
              cancelText="Cancelar"
            >
              <Tooltip title="Convertir a borrador">
                <Button
                  type="text"
                  size="small"
                  icon={<FileTextOutlined />}
                  loading={isConvertingToDraft}
                />
              </Tooltip>
            </Popconfirm>
            {canDelete && onDeletePost && (
              <Tooltip title="Eliminar publicacion">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => setShowDeleteModal(true)}
                />
              </Tooltip>
            )}
          </div>
        )}
      </div>

      {/* Media */}
      <div className="relative">
        {renderMedia()}

        {/* Carousel Navigation */}
        {media.length > 1 && (
          <>
            <button
              onClick={handlePrevMedia}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <LeftOutlined />
            </button>
            <button
              onClick={handleNextMedia}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
            >
              <RightOutlined />
            </button>

            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {media.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    index === currentMediaIndex ? 'bg-white' : 'bg-white/60'
                  }`}
                  style={index === currentMediaIndex ? { backgroundColor: '#579172' } : {}}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Actions (sin likes, solo contador de comentarios) */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ backgroundColor: '#f0f5f2', color: '#579172' }}
            style={{
              boxShadow: 'none',
              border: 'none',
              outline: 'none',
              transition: 'none',
              transform: 'none'
            }}
            onClick={() => setShowAllComments(!showAllComments)}
          >
            <MessageOutlined style={{ fontSize: '16px' }} />
            <span className="text-sm font-semibold">{comments.length}</span>
            <span className="text-xs" style={{ color: '#579172' }}>
              {comments.length === 1 ? 'comentario' : 'comentarios'}
            </span>
          </button>
        </div>
      </div>

      {/* Caption - Solo contenido, titulo ya esta en el header */}
      <div className="px-4 pb-2">
        <div
          className="text-sm text-gray-800 blog-content"
          style={{
            whiteSpace: 'pre-line',
          }}
        >
          {expandedContent || (excerpt || content).length <= 150 ? (
            <div
              dangerouslySetInnerHTML={{ __html: content }}
              style={{
                lineHeight: '1.6',
              }}
              className="blog-content-html"
            />
          ) : (
            <>
              <div
                dangerouslySetInnerHTML={{ __html: (excerpt || content).slice(0, 150) }}
                style={{
                  lineHeight: '1.6',
                }}
                className="blog-content-html"
              />
              <span
                onClick={() => setExpandedContent(true)}
                className="ml-1 cursor-pointer transition-colors"
                style={{ color: '#579172' }}
              >
                ... más
              </span>
            </>
          )}
        </div>
      </div>

      {/* Tags */}
      {(category || (classGroups && classGroups.length > 0)) && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {category && (
            <span
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: category.color || '#f3f4f6',
                color: category.color ? '#fff' : '#374151',
              }}
            >
              {category.name}
            </span>
          )}
        </div>
      )}

      {/* Comments */}
      {comments.length > 0 && (
        <div className="px-4 pb-2">
          {comments.length > 2 && !showAllComments && (
            <button
              onClick={() => setShowAllComments(true)}
              className="text-sm text-gray-500 mb-2 hover:text-gray-700"
            >
              Ver los {comments.length} comentarios
            </button>
          )}

          <div className="space-y-2">
            {displayedComments.map((comment) => {
              const commenterName = comment.author.profile
                ? `${comment.author.profile.firstName || ''} ${comment.author.profile.lastName || ''}`.trim()
                : comment.author.email;

              return (
                <div key={comment.id} className="flex items-start gap-2 group">
                  <Avatar
                    size={24}
                    src={comment.author.profile?.avatar}
                    icon={<UserOutlined />}
                  />
                  <div className="flex-1 text-sm">
                    <span className="font-semibold">{commenterName}</span>{' '}
                    <span className="text-gray-700">{comment.content}</span>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {dayjs(comment.createdAt).fromNow()}
                    </div>
                  </div>
                  {/* Solo el admin o el autor del comentario pueden eliminarlo */}
                  {(isAdmin || comment.author.id === currentUserId) && onDeleteComment && (
                    <Tooltip title="Eliminar comentario">
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-all duration-200"
                      >
                        <DeleteOutlined className="text-sm" />
                      </button>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Comment (solo familias) */}
      {commentsEnabled && canComment && (
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Escribe un comentario..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onPressEnter={handleSubmitComment}
              disabled={isSubmitting}
              className="flex-1 border-none bg-transparent focus:ring-0"
            />
            <Button
              type="link"
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || isSubmitting}
              loading={isSubmitting}
              className="font-semibold"
              style={{ color: '#579172' }}
            >
              Publicar
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        title="Eliminar publicacion"
        open={showDeleteModal}
        onOk={handleDeletePost}
        onCancel={() => setShowDeleteModal(false)}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p>¿Estas seguro de que quieres eliminar esta publicacion? Esta accion no se puede deshacer.</p>
      </Modal>
    </div>
  );
};

export default InstagramPost;
