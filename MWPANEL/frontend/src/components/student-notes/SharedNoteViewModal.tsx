import React, { useState, useEffect } from 'react';
import {
  Modal,
  Typography,
  Space,
  Tag,
  Avatar,
  Divider,
  Button,
  Input,
  List,
  Card,
  message,
  Row,
  Col,
  Spin,
} from 'antd';
import {
  UserOutlined,
  CommentOutlined,
  SendOutlined,
  EyeOutlined,
  FileTextOutlined,
  AudioOutlined,
  PictureOutlined,
  FileImageOutlined,
  BookOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { SharedNote, NoteType } from '../../types/student-notes';
import studentNotesApi from '../../services/studentNotesApi';
import VoicePlayer from './VoicePlayer';
import PresentationViewer from './PresentationViewer';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// Componente para mostrar imagen compartida con autenticación
interface AuthenticatedSharedImageViewerProps {
  sharedNoteId: string;
  title: string;
  onFullscreen?: () => void;
}

const AuthenticatedSharedImageViewer: React.FC<AuthenticatedSharedImageViewerProps> = ({ 
  sharedNoteId, 
  title, 
  onFullscreen 
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadImage = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Obtener token del localStorage (mismo método que VoicePlayer)
        let token = null;
        const authData = localStorage.getItem('mw-panel-auth');
        if (authData) {
          try {
            const { state } = JSON.parse(authData);
            token = state.accessToken;
          } catch (error) {
            console.warn('🎨 Failed to parse auth data:', error);
          }
        }

        if (!token) {
          setError('No se encontró token de autenticación');
          setIsLoading(false);
          return;
        }

        // Hacer fetch autenticado a endpoint de shared streaming
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/shared/${sharedNoteId}/stream`;
        
        console.log('🎨 AuthenticatedSharedImageViewer: Realizando fetch autenticado a:', apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('🎨 AuthenticatedSharedImageViewer Response status:', response.status, 'OK:', response.ok);

        if (!response.ok) {
          if (response.status === 401) {
            console.warn('🎨 Token expirado - limpiando sesión...');
            localStorage.removeItem('mw-panel-auth');
            window.location.href = '/login';
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const blob = await response.blob();
        console.log('🎨 AuthenticatedSharedImageViewer Blob recibido, size:', blob.size, 'type:', blob.type);
        
        const blobUrl = URL.createObjectURL(blob);
        setImageUrl(blobUrl);
        console.log('🎨 AuthenticatedSharedImageViewer: Blob URL creada desde shared stream:', blobUrl);

      } catch (error) {
        console.error('🎨 AuthenticatedSharedImageViewer Error al obtener imagen autenticada:', error);
        setError(`Error de autenticación: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadImage();

    // Cleanup blob URL on unmount
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
        console.log('🎨 AuthenticatedSharedImageViewer Blob URL limpiada');
      }
    };
  }, [sharedNoteId]);

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="flex items-center justify-center bg-gray-100 rounded-lg border h-64">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
            <div className="text-sm">Cargando imagen compartida...</div>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          <PictureOutlined className="mr-1" />
          Autenticando y cargando imagen...
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="text-center">
        <div className="flex items-center justify-center bg-gray-100 rounded-lg border h-64">
          <div className="text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <div className="text-lg">Imagen no disponible</div>
            <div className="text-sm text-gray-400">Error: {error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <img
        src={imageUrl}
        alt={title}
        className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
        style={{ maxHeight: '400px' }}
        onClick={onFullscreen}
        onError={(e) => {
          console.error('🎨 AuthenticatedSharedImageViewer Error al cargar imagen desde blob URL:', e);
          setError('Error al mostrar imagen');
        }}
      />
      <div className="mt-3 text-sm text-gray-600">
        <PictureOutlined className="mr-1" />
        {onFullscreen && 'Click en la imagen para ver en pantalla completa'}
      </div>
    </div>
  );
};

// Iconos por tipo de nota
const typeIcons: Record<NoteType, React.ReactNode> = {
  [NoteType.TEXT]: <FileTextOutlined />,
  [NoteType.VOICE]: <AudioOutlined />,
  [NoteType.DRAWING]: <PictureOutlined />,
  [NoteType.PRESENTATION]: <FileImageOutlined />,
  [NoteType.MIXED]: <BookOutlined />,
};

// Colores por tipo de nota
const typeColors: Record<NoteType, string> = {
  [NoteType.TEXT]: '#1890ff',
  [NoteType.VOICE]: '#52c41a',
  [NoteType.DRAWING]: '#fa8c16',
  [NoteType.PRESENTATION]: '#eb2f96',
  [NoteType.MIXED]: '#722ed1',
};

interface SharedNoteViewModalProps {
  visible: boolean;
  sharedNote: SharedNote | null;
  onClose: () => void;
  type: 'received' | 'sent';
}

interface Comment {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

const SharedNoteViewModal: React.FC<SharedNoteViewModalProps> = ({
  visible,
  sharedNote,
  onClose,
  type,
}) => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);

  // Cargar comentarios cuando se abre el modal
  useEffect(() => {
    if (visible && sharedNote && canComment) {
      loadComments();
    }
  }, [visible, sharedNote]);

  if (!sharedNote || !sharedNote.note) {
    return null;
  }

  const { note } = sharedNote;
  const sharedByName = sharedNote.sharedBy 
    ? studentNotesApi.formatFullName(sharedNote.sharedBy.firstName, sharedNote.sharedBy.lastName)
    : 'Usuario desconocido';

  const canComment = sharedNote.permissions?.comment || false;
  const canView = sharedNote.permissions?.view || false;

  // Función para cargar comentarios
  const loadComments = async () => {
    if (!sharedNote) return;
    
    try {
      setLoadingComments(true);
      const fetchedComments = await studentNotesApi.getComments(sharedNote.id);
      setComments(fetchedComments || []);
    } catch (error) {
      console.error('Error loading comments:', error);
      message.error('Error al cargar comentarios');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      message.warning('Por favor escribe un comentario');
      return;
    }

    try {
      setSubmittingComment(true);
      
      // Usar API real para comentarios
      const newComment = await studentNotesApi.addComment(sharedNote.id, commentText);
      
      // Agregar comentario a la lista local
      setComments([...comments, newComment]);
      setCommentText('');
      message.success('Comentario agregado exitosamente');
    } catch (error) {
      console.error('Error adding comment:', error);
      message.error('Error al agregar comentario');
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderNoteContent = () => {
    // Debug: mostrar qué datos tenemos
    console.log('🔍 SharedNoteViewModal DEBUG:', {
      noteType: note.type,
      hasContent: !!note.content,
      contentLength: note.content?.length || 0,
      contentPreview: note.content?.substring(0, 100) + '...',
      hasFileUrl: !!note.fileUrl,
      fileUrl: note.fileUrl,
      metadata: note.metadata,
      fileName: note.fileName,
      fileMimeType: note.fileMimeType,
      driveFileId: note.metadata?.driveFileId,
      note: note
    });

    switch (note.type) {
      case NoteType.VOICE:
        // Para notas de voz compartidas, usar endpoint de streaming autenticado
        console.log('🎵 VOICE Note Debug - Using shared streaming endpoint:', { 
          noteId: note.id, 
          sharedNoteId: sharedNote.id,
          fileName: note.fileName, 
          metadata: note.metadata 
        });
        
        const audioStreamUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/shared/${sharedNote.id}/stream`;
        
        return (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>
              <AudioOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              Nota de Voz Compartida
            </Title>
            <Card className="bg-gradient-to-r from-blue-50 to-green-50">
              <VoicePlayer
                audioUrl={audioStreamUrl}
                fileName={note.fileName || 'audio.mp3'}
                duration={note.metadata?.duration}
                compact={false}
              />
            </Card>
          </div>
        );
        break;

      case NoteType.PRESENTATION:
        // Para presentaciones, usar el PresentationViewer
        if (note.content) {
          return (
            <div style={{ marginTop: 16 }}>
              <PresentationViewer 
                content={note.content} 
                title={note.title} 
                readOnly={true} 
              />
            </div>
          );
        }
        break;

      case NoteType.TEXT:
        // Para notas de texto, mostrar el contenido
        console.log('📝 TEXT Note Debug:', { 
          hasContent: !!note.content, 
          contentLength: note.content?.length || 0,
          contentPreview: note.content?.substring(0, 200)
        });
        if (note.content) {
          return (
            <div style={{ marginTop: 16 }}>
              <Title level={5}>
                <FileTextOutlined style={{ color: '#1890ff', marginRight: 8 }} />
                Contenido del Texto
              </Title>
              <div 
                style={{ 
                  marginTop: 12, 
                  padding: 16, 
                  background: '#fafafa', 
                  borderRadius: 8,
                  border: '1px solid #d9d9d9',
                  maxHeight: 600, // Aumentado de 400 a 600
                  overflow: 'auto',
                  lineHeight: '1.6',
                  fontSize: '14px'
                }}
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            </div>
          );
        } else {
          return (
            <div style={{ marginTop: 16, textAlign: 'center', padding: '40px 20px', color: '#999' }}>
              <FileTextOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
              <div style={{ fontSize: '16px', marginBottom: '8px' }}>Contenido de texto no disponible</div>
              <Text type="secondary">
                El contenido del texto no está disponible para mostrar.
              </Text>
            </div>
          );
        }
        break;

      case NoteType.DRAWING:
        // Para dibujos compartidos, usar endpoint de streaming autenticado
        console.log('🎨 DRAWING Note Debug - Using shared streaming endpoint:', { 
          noteId: note.id,
          sharedNoteId: sharedNote.id,
          fileName: note.fileName,
          metadata: note.metadata 
        });
        
        return (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>
              <PictureOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
              Dibujo Compartido
            </Title>
            <Card className="bg-gradient-to-r from-orange-50 to-yellow-50">
              <AuthenticatedSharedImageViewer 
                sharedNoteId={sharedNote.id}
                title={note.title}
                onFullscreen={async () => {
                  console.log('🎨 Fullscreen requested for shared image');
                  try {
                    // Fetch the image to create a fullscreen blob URL
                    // Obtener token del auth store (mismo método que AuthenticatedSharedImageViewer)
                    let token = null;
                    const authData = localStorage.getItem('mw-panel-auth');
                    if (authData) {
                      try {
                        const { state } = JSON.parse(authData);
                        token = state.accessToken;
                      } catch (error) {
                        console.warn('🎨 Failed to parse auth data:', error);
                      }
                    }
                    
                    if (!token) {
                      message.error('No se encontró token de autenticación');
                      return;
                    }
                    
                    console.log('🎨 Using token for fullscreen:', token ? 'Token found' : 'No token');

                    const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/shared/${sharedNote.id}/stream`;
                    
                    const response = await fetch(apiUrl, {
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                    });

                    console.log('🎨 Fullscreen fetch response:', response.status, response.ok);
                    if (!response.ok) {
                      throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const blob = await response.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    setFullscreenImageUrl(blobUrl);
                    console.log('🎨 Fullscreen image URL created:', blobUrl);
                  } catch (error) {
                    console.error('🎨 Error loading fullscreen image:', error);
                    message.error('Error al cargar imagen en pantalla completa');
                  }
                }}
              />
            </Card>
          </div>
        );
        break;

      case NoteType.MIXED:
        // Para notas mixtas, mostrar tanto contenido como archivo
        return (
          <div style={{ marginTop: 16 }}>
            <Title level={5}>
              <BookOutlined style={{ color: '#722ed1', marginRight: 8 }} />
              Contenido Mixto
            </Title>
            {note.content && (
              <div 
                style={{ 
                  marginTop: 12, 
                  padding: 16, 
                  background: '#fafafa', 
                  borderRadius: 8,
                  border: '1px solid #d9d9d9',
                  maxHeight: 300,
                  overflow: 'auto'
                }}
                dangerouslySetInnerHTML={{ __html: note.content }}
              />
            )}
            {note.fileUrl && (
              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <Button 
                  type="primary" 
                  icon={<EyeOutlined />}
                  href={note.fileUrl}
                  target="_blank"
                >
                  Ver Archivo Adjunto
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div style={{ marginTop: 16, textAlign: 'center', color: '#999' }}>
            <Text type="secondary">Tipo de contenido no compatible para vista previa</Text>
          </div>
        );
    }

    return (
      <div style={{ marginTop: 16, textAlign: 'center', color: '#999' }}>
        <Text type="secondary">No hay contenido disponible para mostrar</Text>
      </div>
    );
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {typeIcons[note.type as NoteType]}
          <span>{note.title}</span>
          <Tag 
            color={typeColors[note.type as NoteType]} 
            style={{ marginLeft: 'auto' }}
          >
            {note.type.toUpperCase()}
          </Tag>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      style={{ top: 20 }}
    >
      <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
        {/* Información del apunte */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Space>
                <Avatar 
                  src={sharedNote.sharedBy?.photoUrl} 
                  icon={<UserOutlined />} 
                  size="small"
                />
                <div>
                  <Text strong>{sharedByName}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {dayjs(sharedNote.sharedAt).format('DD/MM/YYYY HH:mm')}
                  </Text>
                </div>
              </Space>
            </Col>
            <Col span={12}>
              <div style={{ textAlign: 'right' }}>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Permisos: 
                  {sharedNote.permissions?.view && ' Ver'}
                  {sharedNote.permissions?.comment && ' • Comentar'}
                  {sharedNote.permissions?.download && ' • Descargar'}
                </Text>
                {sharedNote.accessCount > 0 && (
                  <div>
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      Visto {sharedNote.accessCount} {sharedNote.accessCount === 1 ? 'vez' : 'veces'}
                    </Text>
                  </div>
                )}
              </div>
            </Col>
          </Row>

          {sharedNote.message && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <div>
                <Text strong style={{ fontSize: '13px' }}>Mensaje:</Text>
                <Paragraph 
                  style={{ 
                    fontSize: '13px', 
                    fontStyle: 'italic',
                    margin: '8px 0 0 0',
                    padding: '8px 12px',
                    background: '#f0f8ff',
                    borderRadius: '6px',
                    borderLeft: '3px solid #1890ff'
                  }}
                >
                  💬 {sharedNote.message}
                </Paragraph>
              </div>
            </>
          )}
        </Card>

        {/* Contenido del apunte */}
        {canView && renderNoteContent()}

        {/* Sección de comentarios */}
        {canComment && (
          <>
            <Divider>
              <CommentOutlined /> Comentarios
            </Divider>

            {/* Lista de comentarios */}
            <div style={{ marginBottom: 16 }}>
              {loadingComments ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Spin size="small" />
                  <div style={{ marginTop: 8, color: '#666' }}>Cargando comentarios...</div>
                </div>
              ) : comments.length > 0 ? (
                <List
                  dataSource={comments}
                  renderItem={(comment) => (
                    <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
                      <List.Item.Meta
                        avatar={<Avatar icon={<UserOutlined />} size="small" />}
                        title={
                          <Space>
                            <Text strong style={{ fontSize: '13px' }}>{comment.authorName}</Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {dayjs(comment.createdAt).format('DD/MM/YYYY HH:mm')}
                            </Text>
                          </Space>
                        }
                        description={comment.content}
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#999' }}>
                  <CommentOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
                  <div>No hay comentarios aún</div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Sé el primero en comentar este apunte
                  </Text>
                </div>
              )}
            </div>

            {/* Formulario para agregar comentario */}
            <div style={{ display: 'flex', gap: 8 }}>
              <TextArea
                placeholder="Escribe tu comentario..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                maxLength={500}
                showCount
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmitComment}
                loading={submittingComment}
                disabled={!commentText.trim()}
                style={{ alignSelf: 'flex-end' }}
              >
                Enviar
              </Button>
            </div>
          </>
        )}

        {!canView && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#999' }}>
            <EyeOutlined style={{ fontSize: '48px', marginBottom: '16px' }} />
            <div style={{ fontSize: '16px', marginBottom: '8px' }}>Sin permisos de visualización</div>
            <Text type="secondary">
              No tienes permisos para ver el contenido de este apunte
            </Text>
          </div>
        )}
      </div>

      {/* Modal Fullscreen para imágenes */}
      <Modal
        open={!!fullscreenImageUrl}
        onCancel={() => {
          if (fullscreenImageUrl) {
            URL.revokeObjectURL(fullscreenImageUrl);
            setFullscreenImageUrl(null);
          }
        }}
        footer={null}
        width="95vw"
        style={{ top: 20, maxWidth: '95vw' }}
        bodyStyle={{ 
          padding: '10px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#000',
          minHeight: '80vh'
        }}
        className="fullscreen-image-modal"
      >
        {fullscreenImageUrl && (
          <img
            src={fullscreenImageUrl}
            alt={note.title}
            style={{
              maxWidth: '100%',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onClick={() => {
              // Click en imagen para cerrar fullscreen
              if (fullscreenImageUrl) {
                URL.revokeObjectURL(fullscreenImageUrl);
                setFullscreenImageUrl(null);
              }
            }}
          />
        )}
      </Modal>
    </Modal>
  );
};

export default SharedNoteViewModal;