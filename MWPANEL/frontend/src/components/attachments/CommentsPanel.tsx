import React, { useState, useCallback } from 'react';
import {
  Card,
  List,
  Avatar,
  Button,
  Input,
  Space,
  Typography,
  Divider,
  Tooltip,
  Modal,
  notification,
  Spin,
  Empty,
} from 'antd';
import {
  CommentOutlined,
  RetweetOutlined,
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { taskAttachmentsApiService } from '../../services/taskAttachmentsApiService';
import { AttachmentComment, CreateCommentDto, UpdateCommentDto } from '../../types/attachments';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface CommentsPanelProps {
  attachmentId: string;
  attachmentName: string;
  visible: boolean;
  onClose: () => void;
  currentUserId?: string;
  readOnly?: boolean;
}

interface CommentItemProps {
  comment: AttachmentComment;
  onReply: (parentId: string) => void;
  onEdit: (comment: AttachmentComment) => void;
  onDelete: (commentId: string) => void;
  currentUserId?: string;
  readOnly?: boolean;
  level?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onReply,
  onEdit,
  onDelete,
  currentUserId,
  readOnly = false,
  level = 0,
}) => {
  const [showReplies, setShowReplies] = useState(false);
  const isOwner = comment.userId === currentUserId;
  const maxLevel = 3; // Maximum nesting level

  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: es,
      });
    } catch {
      return 'Hace tiempo';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${level > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}
    >
      <div className="flex space-x-3">
        <Avatar
          size={level > 0 ? 'small' : 'default'}
          src={comment.user?.profile?.avatar}
        >
          {comment.user?.profile?.firstName?.charAt(0) || 'U'}
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <Text strong className="text-sm">
              {comment.user?.profile?.firstName} {comment.user?.profile?.lastName}
            </Text>
            <Text type="secondary" className="text-xs">
              {formatTime(comment.createdAt)}
            </Text>
            {comment.isEdited && (
              <Text type="secondary" className="text-xs italic">
                (editado)
              </Text>
            )}
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3 mb-2">
            <Text className="whitespace-pre-wrap text-sm">{comment.content}</Text>
          </div>
          
          <Space size="small">
            {!readOnly && level < maxLevel && (
              <Button
                type="text"
                size="small"
                icon={<RetweetOutlined />}
                onClick={() => onReply(comment.id)}
              >
                Responder
              </Button>
            )}
            
            {isOwner && !readOnly && (
              <>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(comment)}
                >
                  Editar
                </Button>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete(comment.id)}
                  danger
                >
                  Eliminar
                </Button>
              </>
            )}
            
            {comment.replies && comment.replies.length > 0 && (
              <Button
                type="text"
                size="small"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? 'Ocultar' : 'Ver'} {comment.replies.length} respuesta
                {comment.replies.length !== 1 ? 's' : ''}
              </Button>
            )}
          </Space>
          
          {/* Nested replies */}
          <AnimatePresence>
            {showReplies && comment.replies && comment.replies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
              >
                {comment.replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    currentUserId={currentUserId}
                    readOnly={readOnly}
                    level={level + 1}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  attachmentId,
  attachmentName,
  visible,
  onClose,
  currentUserId,
  readOnly = false,
}) => {
  const queryClient = useQueryClient();
  
  // State
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<AttachmentComment | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);

  // Queries
  const {
    data: comments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['comments', attachmentId],
    queryFn: () => Promise.resolve([]),
    enabled: !!attachmentId && visible,
  });

  // Mutations
  const addCommentMutation = useMutation({
    mutationFn: (data: CreateCommentDto) =>
      Promise.resolve({ id: Date.now().toString(), content: data.content, createdAt: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', attachmentId] });
      setNewComment('');
      setReplyToId(null);
      setReplyContent('');
      notification.success({
        message: 'Comentario añadido',
        description: 'Tu comentario se ha añadido correctamente',
      });
    },
    onError: (error) => {
      notification.error({
        message: 'Error al añadir comentario',
        description: error.message,
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateCommentDto }) =>
      Promise.resolve({ id: commentId, content: data.content, updatedAt: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', attachmentId] });
      setEditingComment(null);
      setEditContent('');
      notification.success({
        message: 'Comentario actualizado',
        description: 'Tu comentario se ha actualizado correctamente',
      });
    },
    onError: (error) => {
      notification.error({
        message: 'Error al actualizar comentario',
        description: error.message,
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => Promise.resolve({ message: 'Comment deleted' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', attachmentId] });
      setDeleteCommentId(null);
      notification.success({
        message: 'Comentario eliminado',
        description: 'El comentario se ha eliminado correctamente',
      });
    },
    onError: (error) => {
      notification.error({
        message: 'Error al eliminar comentario',
        description: error.message,
      });
    },
  });

  // Handlers
  const handleAddComment = useCallback(() => {
    if (!newComment.trim()) return;

    addCommentMutation.mutate({
      content: newComment.trim(),
    });
  }, [newComment, addCommentMutation]);

  const handleReply = useCallback(
    (parentId: string) => {
      if (!replyContent.trim()) return;

      addCommentMutation.mutate({
        content: replyContent.trim(),
        parentCommentId: parentId,
      });
    },
    [replyContent, addCommentMutation]
  );

  const handleEdit = useCallback(
    (comment: AttachmentComment) => {
      setEditingComment(comment);
      setEditContent(comment.content);
    },
    []
  );

  const handleUpdateComment = useCallback(() => {
    if (!editingComment || !editContent.trim()) return;

    updateCommentMutation.mutate({
      commentId: editingComment.id,
      data: { content: editContent.trim() },
    });
  }, [editingComment, editContent, updateCommentMutation]);

  const handleDelete = useCallback((commentId: string) => {
    setDeleteCommentId(commentId);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteCommentId) return;
    deleteCommentMutation.mutate(deleteCommentId);
  }, [deleteCommentId, deleteCommentMutation]);

  // Organize comments into tree structure
  const organizeComments = (comments: AttachmentComment[]) => {
    const commentMap = new Map<string, AttachmentComment>();
    const rootComments: AttachmentComment[] = [];

    // First pass: create map and initialize replies arrays
    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into tree
    comments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!;
      
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const organizedComments = organizeComments(comments);

  return (
    <Modal
      title={
        <Space>
          <CommentOutlined />
          <span>Comentarios - {attachmentName}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
    >
      <div className="space-y-4">
        {/* Add new comment */}
        {!readOnly && (
          <Card size="small">
            <TextArea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe tu comentario..."
              rows={3}
              maxLength={500}
              showCount
            />
            <div className="flex justify-end mt-3">
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleAddComment}
                loading={addCommentMutation.isPending}
                disabled={!newComment.trim()}
              >
                Comentar
              </Button>
            </div>
          </Card>
        )}

        {/* Comments list */}
        <div>
          <Spin spinning={isLoading}>
            {organizedComments.length > 0 ? (
              <div className="space-y-4">
                {organizedComments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    onReply={(parentId) => {
                      setReplyToId(parentId);
                      setReplyContent('');
                    }}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    currentUserId={currentUserId}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No hay comentarios aún"
              >
                {!readOnly && (
                  <Text type="secondary">
                    Sé el primero en comentar este archivo
                  </Text>
                )}
              </Empty>
            )}
          </Spin>
        </div>

        {/* Reply modal */}
        <Modal
          title="Responder comentario"
          open={!!replyToId}
          onOk={() => handleReply(replyToId!)}
          onCancel={() => {
            setReplyToId(null);
            setReplyContent('');
          }}
          okText="Responder"
          cancelText="Cancelar"
          okButtonProps={{
            disabled: !replyContent.trim(),
            loading: addCommentMutation.isPending,
          }}
        >
          <TextArea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Escribe tu respuesta..."
            rows={3}
            maxLength={500}
            showCount
          />
        </Modal>

        {/* Edit modal */}
        <Modal
          title="Editar comentario"
          open={!!editingComment}
          onOk={handleUpdateComment}
          onCancel={() => {
            setEditingComment(null);
            setEditContent('');
          }}
          okText="Guardar"
          cancelText="Cancelar"
          okButtonProps={{
            disabled: !editContent.trim(),
            loading: updateCommentMutation.isPending,
          }}
        >
          <TextArea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Edita tu comentario..."
            rows={3}
            maxLength={500}
            showCount
          />
        </Modal>

        {/* Delete confirmation */}
        <Modal
          title="Eliminar comentario"
          open={!!deleteCommentId}
          onOk={handleConfirmDelete}
          onCancel={() => setDeleteCommentId(null)}
          okText="Eliminar"
          cancelText="Cancelar"
          okButtonProps={{
            danger: true,
            loading: deleteCommentMutation.isPending,
          }}
        >
          <p>¿Estás seguro de que quieres eliminar este comentario?</p>
          <p>
            <Text type="secondary">
              Esta acción no se puede deshacer.
            </Text>
          </p>
        </Modal>
      </div>
    </Modal>
  );
};

export default CommentsPanel;