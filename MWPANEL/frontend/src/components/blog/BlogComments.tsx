import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Avatar,
  Button,
  Form,
  Input,
  message,
  Typography,
  Space,
  Divider,
  Empty,
  Popconfirm,
} from 'antd';
import {
  UserOutlined,
  SendOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/services/apiClient';

const { TextArea } = Input;
const { Text } = Typography;

interface BlogComment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    email: string;
    role: string;
    profile?: {
      firstName: string;
      lastName: string;
    };
  };
  isActive: boolean;
}

interface BlogCommentsProps {
  postId: string;
  commentsEnabled?: boolean;
  onCommentAdded?: () => void;
}

const BlogComments: React.FC<BlogCommentsProps> = ({
  postId,
  commentsEnabled = true,
  onCommentAdded,
}) => {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const { user } = useAuthStore();

  useEffect(() => {
    if (postId) {
      fetchComments();
    }
  }, [postId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/blog-comments/post/${postId}`);
      setComments(response.data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      message.error('Error al cargar los comentarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (values: { content: string }) => {
    if (!user) {
      message.error('Debes iniciar sesión para comentar');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post('/blog-comments', {
        content: values.content,
        postId,
      });

      message.success('Comentario agregado correctamente');
      form.resetFields();
      await fetchComments();
      onCommentAdded?.();
    } catch (error) {
      console.error('Error submitting comment:', error);
      message.error('Error al enviar el comentario');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      await apiClient.patch(`/blog-comments/${commentId}`, {
        content,
      });

      message.success('Comentario actualizado correctamente');
      setEditingComment(null);
      await fetchComments();
    } catch (error) {
      console.error('Error editing comment:', error);
      message.error('Error al actualizar el comentario');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiClient.delete(`/blog-comments/${commentId}`);
      message.success('Comentario eliminado correctamente');
      await fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      message.error('Error al eliminar el comentario');
    }
  };

  const getAuthorName = (author: any) => {
    if (author?.profile?.firstName && author?.profile?.lastName) {
      return `${author.profile.firstName} ${author.profile.lastName}`;
    }
    return author?.email?.split('@')[0] || 'Usuario';
  };

  const getRoleDisplay = (role: string) => {
    const roles = {
      admin: 'Administrador',
      teacher: 'Profesor',
      student: 'Estudiante',
      family: 'Familia',
    };
    return roles[role as keyof typeof roles] || role;
  };

  const canModifyComment = (comment: BlogComment) => {
    if (!user) return false;
    // El autor puede modificar su comentario, o un admin puede modificar cualquier comentario
    return comment.author.id === user.id || user.role === 'admin';
  };

  return (
    <Card title="Comentarios" className="mt-6">
      {/* Formulario para nuevo comentario */}
      {commentsEnabled && user && (
        <div style={{ marginBottom: '24px' }}>
          <Form form={form} onFinish={handleSubmitComment} layout="vertical">
            <Form.Item
              name="content"
              rules={[
                { required: true, message: 'El comentario no puede estar vacío' },
                { min: 10, message: 'El comentario debe tener al menos 10 caracteres' },
                { max: 1000, message: 'El comentario no puede exceder 1000 caracteres' },
              ]}
            >
              <TextArea
                rows={3}
                placeholder="Escribe tu comentario..."
                showCount
                maxLength={1000}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                icon={<SendOutlined />}
              >
                Publicar Comentario
              </Button>
            </Form.Item>
          </Form>
          <Divider />
        </div>
      )}

      {!commentsEnabled && (
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary">Los comentarios están deshabilitados para esta publicación.</Text>
        </div>
      )}

      {!user && commentsEnabled && (
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary">
            <a href="/login">Inicia sesión</a> para poder comentar.
          </Text>
        </div>
      )}

      {/* Lista de comentarios */}
      <List
        loading={loading}
        dataSource={comments}
        locale={{
          emptyText: (
            <Empty
              description="No hay comentarios aún"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
        renderItem={(comment) => (
          <List.Item key={comment.id}>
            <List.Item.Meta
              avatar={
                <Avatar
                  icon={<UserOutlined />}
                  style={{
                    backgroundColor:
                      comment.author.role === 'teacher'
                        ? '#579172'
                        : comment.author.role === 'admin'
                        ? '#722ed1'
                        : comment.author.role === 'family'
                        ? '#52c41a'
                        : '#faad14',
                  }}
                />
              }
              title={
                <Space>
                  <Text strong>{getAuthorName(comment.author)}</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {getRoleDisplay(comment.author.role)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    • {new Date(comment.createdAt).toLocaleString()}
                  </Text>
                  {comment.createdAt !== comment.updatedAt && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      (editado)
                    </Text>
                  )}
                </Space>
              }
              description={
                editingComment === comment.id ? (
                  <Form
                    form={editForm}
                    onFinish={(values) => handleEditComment(comment.id, values.content)}
                    initialValues={{ content: comment.content }}
                  >
                    <Form.Item
                      name="content"
                      rules={[
                        { required: true, message: 'El comentario no puede estar vacío' },
                        { min: 10, message: 'El comentario debe tener al menos 10 caracteres' },
                        { max: 1000, message: 'El comentario no puede exceder 1000 caracteres' },
                      ]}
                    >
                      <TextArea rows={3} showCount maxLength={1000} />
                    </Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" size="small">
                        Guardar
                      </Button>
                      <Button size="small" onClick={() => setEditingComment(null)}>
                        Cancelar
                      </Button>
                    </Space>
                  </Form>
                ) : (
                  <div>
                    <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {comment.content}
                    </Text>
                    {canModifyComment(comment) && (
                      <div style={{ marginTop: '8px' }}>
                        <Space>
                          <Button
                            type="link"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => setEditingComment(comment.id)}
                          >
                            Editar
                          </Button>
                          <Popconfirm
                            title="¿Eliminar comentario?"
                            description="¿Estás seguro de que quieres eliminar este comentario?"
                            okText="Eliminar"
                            cancelText="Cancelar"
                            okType="danger"
                            onConfirm={() => handleDeleteComment(comment.id)}
                          >
                            <Button
                              type="link"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                            >
                              Eliminar
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>
                    )}
                  </div>
                )
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default BlogComments;