import React, { useState, useEffect } from 'react';
import { Modal, Typography, Tag, Space, Button, Card, Divider, Switch, message } from 'antd';
import {
  PictureOutlined,
  CalendarOutlined,
  TagsOutlined,
  HeartFilled,
  HeartOutlined,
  DownloadOutlined,
  EditOutlined,
  BookOutlined,
  ExpandOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import { StudentNote } from '../../types/student-notes';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Title, Text: AntText, Paragraph } = Typography;

// Componente para mostrar imagen con autenticación
interface AuthenticatedImageViewerProps {
  noteId: string;
  title: string;
  onFullscreen: () => void;
}

const AuthenticatedImageViewer: React.FC<AuthenticatedImageViewerProps> = ({ noteId, title, onFullscreen }) => {
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

        // Hacer fetch autenticado y crear blob URL (como VoicePlayer)
        const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/${noteId}/stream`;
        
        console.log('🎨 AuthenticatedImageViewer: Realizando fetch autenticado a:', apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('🎨 AuthenticatedImageViewer Response status:', response.status, 'OK:', response.ok);

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
        console.log('🎨 AuthenticatedImageViewer Blob recibido, size:', blob.size, 'type:', blob.type);
        
        const blobUrl = URL.createObjectURL(blob);
        setImageUrl(blobUrl);
        console.log('🎨 AuthenticatedImageViewer: Blob URL creada desde backend stream:', blobUrl);

      } catch (error) {
        console.error('🎨 AuthenticatedImageViewer Error al obtener imagen autenticada:', error);
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
        console.log('🎨 AuthenticatedImageViewer Blob URL limpiada');
      }
    };
  }, [noteId]);

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="flex items-center justify-center bg-gray-100 rounded-lg border h-64">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
            <div className="text-sm">Cargando imagen...</div>
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
          console.error('🎨 AuthenticatedImageViewer Error al cargar imagen desde blob URL:', e);
          setError('Error al mostrar imagen');
        }}
      />
      <div className="mt-3 text-sm text-gray-600">
        <PictureOutlined className="mr-1" />
        Click en la imagen para ver en pantalla completa
      </div>
    </div>
  );
};

interface DrawingNoteModalProps {
  note: StudentNote | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (note: StudentNote) => void;
  onToggleFavorite: (noteId: string) => void;
  onUpdateNote?: (note: StudentNote) => Promise<void>;
}

const DrawingNoteModal: React.FC<DrawingNoteModalProps> = ({
  note,
  isOpen,
  onClose,
  onEdit,
  onToggleFavorite,
  onUpdateNote,
}) => {
  if (!note) return null;

  const handleDownload = async () => {
    try {
      if (!note.webContentLink) {
        console.error('No hay URL de descarga disponible');
        return;
      }

      // Usar el endpoint de streaming del backend
      const imageUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/${note.id}/stream`;

      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = note.fileName || `dibujo-${note.id}.jpg`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Descarga iniciada via streaming proxy:', note.id);
    } catch (error) {
      console.error('Error al descargar dibujo:', error);
    }
  };

  const handleFullscreen = async () => {
    try {
      // Obtener token del localStorage (mismo método que AuthenticatedImageViewer)
      let token = null;
      const authData = localStorage.getItem('mw-panel-auth');
      if (authData) {
        try {
          const { state } = JSON.parse(authData);
          token = state.accessToken;
        } catch (error) {
          console.warn('🎨 Failed to parse auth data for fullscreen:', error);
        }
      }

      if (!token) {
        console.error('🎨 No se encontró token para pantalla completa');
        return;
      }

      // Hacer fetch autenticado
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/${note.id}/stream`;
      
      console.log('🎨 Fullscreen: Realizando fetch autenticado a:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('🎨 Token expirado en fullscreen - limpiando sesión...');
          localStorage.removeItem('mw-panel-auth');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      console.log('🎨 Fullscreen: Blob URL creada para pantalla completa:', blobUrl);
      
      // Abrir imagen en nueva ventana usando blob URL
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head>
              <title>${note.title} - Pantalla Completa</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  background: #000; 
                  display: flex; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 100vh;
                  font-family: Arial, sans-serif;
                }
                img { 
                  max-width: 100%; 
                  max-height: 100vh; 
                  object-fit: contain;
                  border-radius: 8px;
                  box-shadow: 0 4px 20px rgba(255,255,255,0.1);
                }
                .title {
                  position: absolute;
                  top: 20px;
                  left: 20px;
                  color: white;
                  background: rgba(0,0,0,0.7);
                  padding: 10px 20px;
                  border-radius: 8px;
                  font-size: 16px;
                  font-weight: bold;
                }
              </style>
            </head>
            <body>
              <div class="title">${note.title}</div>
              <img src="${blobUrl}" alt="${note.title}" />
              <script>
                // Limpiar blob URL cuando se cierre la ventana
                window.addEventListener('beforeunload', () => {
                  URL.revokeObjectURL('${blobUrl}');
                });
              </script>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
      
    } catch (error) {
      console.error('🎨 Error al abrir imagen en pantalla completa:', error);
    }
  };

  return (
    <Modal
      title={
        <div className="flex items-center justify-between" style={{ paddingRight: '40px' }}>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <PictureOutlined className="text-orange-600 text-lg" />
            </div>
            <div>
              <AntText className="text-lg font-semibold">Dibujo</AntText>
              <br />
              <AntText type="secondary" className="text-sm">
                {dayjs(note.createdAt).format('DD/MM/YYYY HH:mm')}
              </AntText>
            </div>
          </div>
          <Space>
            <AntText type="secondary" style={{ fontSize: '12px', marginRight: 8 }}>
              {note.isPrivate ? 'Privado' : 'Público'}
            </AntText>
            <Switch
              checked={!note.isPrivate}
              onChange={async (checked) => {
                if (onUpdateNote) {
                  try {
                    const updatedNote = {
                      ...note,
                      isPrivate: !checked
                    };
                    await onUpdateNote(updatedNote);
                    message.success(`Nota cambiada a ${checked ? 'pública' : 'privada'}`);
                  } catch (error) {
                    console.error('Error updating privacy:', error);
                    message.error('Error al cambiar privacidad');
                  }
                }
              }}
              checkedChildren="Público"
              unCheckedChildren="Privado"
              size="small"
            />
          </Space>
        </div>
      }
      open={isOpen}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="edit" icon={<EditOutlined />} onClick={() => onEdit(note)}>
          Editar
        </Button>,
        <Button
          key="favorite"
          icon={note.isFavorite ? <HeartFilled /> : <HeartOutlined />}
          type={note.isFavorite ? 'primary' : 'default'}
          danger={note.isFavorite}
          onClick={() => onToggleFavorite(note.id)}
        >
          {note.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        </Button>,
        <Button 
          key="fullscreen" 
          icon={<ExpandOutlined />} 
          onClick={handleFullscreen}
        >
          Pantalla completa
        </Button>,
        <Button 
          key="download" 
          icon={<DownloadOutlined />} 
          onClick={handleDownload}
          disabled={!note.webContentLink}
        >
          Descargar
        </Button>,
        <Button key="close" onClick={onClose}>
          Cerrar
        </Button>,
      ]}
      className="drawing-note-modal"
    >
      <div className="space-y-6">
        {/* Título de la nota */}
        <div>
          <Title level={3} className="mb-2">
            {note.title}
          </Title>
          
          {/* Badges de estado */}
          <Space wrap>
            <Tag color="orange" icon={<PictureOutlined />}>
              DIBUJO
            </Tag>
            {note.isFavorite && (
              <Tag color="red" icon={<HeartFilled />}>
                FAVORITO
              </Tag>
            )}
            {note.isPrivate ? (
              <Tag color="orange">PRIVADO</Tag>
            ) : (
              <Tag color="blue">PÚBLICO</Tag>
            )}
          </Space>
        </div>

        {/* Visor de imagen principal */}
        {note.webContentLink ? (
          <Card className="bg-gradient-to-r from-orange-50 to-yellow-50">
            <AuthenticatedImageViewer 
              noteId={note.id}
              title={note.title}
              onFullscreen={handleFullscreen}
            />
          </Card>
        ) : (
          <Card className="bg-red-50 border-red-200">
            <div className="text-center py-8">
              <PictureOutlined className="text-4xl text-red-400 mb-4" />
              <AntText type="danger" className="block text-lg mb-2">
                ⚠️ Imagen no disponible
              </AntText>
              <AntText type="secondary" className="text-sm">
                Es posible que el archivo haya sido eliminado o movido
              </AntText>
            </div>
          </Card>
        )}

        {/* Contenido y descripción */}
        <div>
          <Title level={5} className="mb-2">Descripción</Title>
          <Paragraph className="bg-gray-50 p-4 rounded-lg border">
            {note.content || 'Sin descripción adicional'}
          </Paragraph>
        </div>

        {/* Información del archivo */}
        <Card size="small" title="Información del archivo">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <AntText strong>Archivo:</AntText>
              <br />
              <AntText type="secondary">{note.fileName || 'Sin nombre'}</AntText>
            </div>
            <div>
              <AntText strong>Tipo:</AntText>
              <br />
              <AntText type="secondary">Imagen/Dibujo</AntText>
            </div>
            <div>
              <AntText strong>Creado:</AntText>
              <br />
              <AntText type="secondary">
                {dayjs(note.createdAt).format('DD/MM/YYYY HH:mm')}
              </AntText>
            </div>
            <div>
              <AntText strong>Vistas:</AntText>
              <br />
              <AntText type="secondary">{note.viewCount} visualizaciones</AntText>
            </div>
          </div>
        </Card>

        {/* Metadata adicional */}
        <div className="space-y-3">
          {/* Asignatura */}
          {note.subject && (
            <div className="flex items-center space-x-2">
              <BookOutlined className="text-blue-500" />
              <AntText strong>Asignatura:</AntText>
              <Tag color="blue">{note.subject.name}</Tag>
            </div>
          )}

          {/* Etiquetas */}
          {note.tagsArray && note.tagsArray.length > 0 && (
            <div className="flex items-start space-x-2">
              <TagsOutlined className="text-gray-500 mt-1" />
              <div>
                <AntText strong className="block mb-1">Etiquetas:</AntText>
                <Space wrap>
                  {note.tagsArray.map((tag, index) => (
                    <Tag key={index} color="purple">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          )}

          {/* Fechas */}
          <div className="flex items-center space-x-2">
            <CalendarOutlined className="text-gray-500" />
            <AntText strong>Última actualización:</AntText>
            <AntText type="secondary">
              {dayjs(note.updatedAt).fromNow()}
            </AntText>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default DrawingNoteModal;