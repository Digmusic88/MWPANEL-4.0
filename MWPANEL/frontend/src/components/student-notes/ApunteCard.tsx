import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Tooltip,
  Dropdown,
  MenuProps,
  Avatar,
  Divider,
  Progress,
} from 'antd';
import {
  HeartOutlined,
  HeartFilled,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  MoreOutlined,
  FileTextOutlined,
  AudioOutlined,
  PictureOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  TagsOutlined,
  LinkOutlined,
  FileImageOutlined,
  ShareAltOutlined,
  BranchesOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/es';
import { StudentNote, NoteType, NoteCardProps } from '../../types/student-notes';
import { useFileValidation } from '../../hooks/useStudentNotes';
import studentNotesApi from '../../services/studentNotesApi';
import VoicePlayer from './VoicePlayer';

dayjs.extend(relativeTime);
dayjs.locale('es');

const { Text: AntText, Paragraph } = Typography;
const { Meta } = Card;

// Componente para manejar imágenes con autenticación
interface DrawingImageComponentProps {
  noteId: string;
  title: string;
  viewMode: 'grid' | 'list';
  onView: () => void;
}

const DrawingImageComponent: React.FC<DrawingImageComponentProps> = ({ noteId, title, viewMode, onView }) => {
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
        
        console.log('🎨 DrawingImageComponent: Realizando fetch autenticado a:', apiUrl);
        
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('🎨 Response status:', response.status, 'OK:', response.ok);

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
        console.log('🎨 Blob recibido, size:', blob.size, 'type:', blob.type);
        
        const blobUrl = URL.createObjectURL(blob);
        setImageUrl(blobUrl);
        console.log('🎨 Image: Blob URL creada desde backend stream:', blobUrl);

      } catch (error) {
        console.error('🎨 Error al obtener imagen autenticada:', error);
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
        console.log('🎨 Blob URL limpiada');
      }
    };
  }, [noteId]);

  if (isLoading) {
    return (
      <div className="relative group cursor-pointer" onClick={() => onView()}>
        <div className="flex items-center justify-center bg-gray-100 rounded-lg border h-32">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
            <div className="text-sm">Cargando imagen...</div>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          <PictureOutlined className="mr-1" />
          DIBUJO
        </div>
      </div>
    );
  }

  if (error || !imageUrl) {
    return (
      <div className="relative group cursor-pointer" onClick={() => onView()}>
        <div className="flex items-center justify-center bg-gray-100 rounded-lg border h-32">
          <div className="text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            <div className="text-sm">Imagen no disponible</div>
            <div className="text-xs">Click para intentar abrir</div>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          <PictureOutlined className="mr-1" />
          DIBUJO
        </div>
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer" onClick={() => onView()}>
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-32 object-cover rounded-lg border hover:opacity-90 transition-opacity"
        style={{ maxHeight: viewMode === 'grid' ? '128px' : '96px' }}
        onError={(e) => {
          console.error('🎨 Error al cargar imagen desde blob URL:', e);
          setError('Error al mostrar imagen');
        }}
      />
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
        <PictureOutlined className="mr-1" />
        DIBUJO
      </div>
    </div>
  );
};

// Componente para manejar presentaciones con vista previa
interface PresentationThumbnailComponentProps {
  note: StudentNote;
  viewMode: 'grid' | 'list';
  onView: () => void;
}

const PresentationThumbnailComponent: React.FC<PresentationThumbnailComponentProps> = ({ 
  note, 
  viewMode, 
  onView 
}) => {
  const [firstSlide, setFirstSlide] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const extractFirstSlide = () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!note.content) {
          setError('No hay contenido de presentación');
          setIsLoading(false);
          return;
        }

        let slides = [];
        
        // Intentar parsear el contenido como JSON
        try {
          const parsed = JSON.parse(note.content);
          slides = parsed.slides || parsed || [];
        } catch {
          // Si no es JSON válido, asumir que es una estructura ya parseada
          if (typeof note.content === 'object' && note.content.slides) {
            slides = note.content.slides;
          } else if (Array.isArray(note.content)) {
            slides = note.content;
          }
        }

        if (slides.length > 0) {
          setFirstSlide(slides[0]);
        } else {
          setError('No hay diapositivas en la presentación');
        }

      } catch (error) {
        console.error('🎨 Error al extraer primera diapositiva:', error);
        setError('Error al procesar la presentación');
      } finally {
        setIsLoading(false);
      }
    };

    extractFirstSlide();
  }, [note.content]);

  if (isLoading) {
    return (
      <div className="relative group cursor-pointer" onClick={() => onView()}>
        <div className="flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border h-32">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-2"></div>
            <div className="text-sm">Cargando presentación...</div>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          <FileImageOutlined className="mr-1" />
          PRESENTACIÓN
        </div>
      </div>
    );
  }

  if (error || !firstSlide) {
    return (
      <div className="relative group cursor-pointer" onClick={() => onView()}>
        <div className="flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg border h-32">
          <div className="text-center text-gray-500">
            <FileImageOutlined className="text-4xl mb-2 text-pink-400" />
            <div className="text-sm">Presentación</div>
            <div className="text-xs">Click para ver</div>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
          <FileImageOutlined className="mr-1" />
          PRESENTACIÓN
        </div>
      </div>
    );
  }

  // Renderizar vista previa de la primera diapositiva
  return (
    <div className="relative group cursor-pointer" onClick={() => onView()}>
      <div className="bg-white rounded-lg border h-32 overflow-hidden shadow-sm">
        {/* Simular una diapositiva con el contenido de la primera */}
        <div className="h-full p-3 bg-gradient-to-br from-white to-gray-50 flex flex-col justify-center">
          <div className="text-center">
            {firstSlide.title && (
              <div className="text-sm font-semibold text-gray-800 mb-1 line-clamp-2">
                {firstSlide.title}
              </div>
            )}
            {firstSlide.content && (
              <div className="text-xs text-gray-600 line-clamp-3">
                {firstSlide.content}
              </div>
            )}
            {!firstSlide.title && !firstSlide.content && (
              <div className="text-xs text-gray-500 italic">
                Diapositiva {firstSlide.id || 1}
              </div>
            )}
          </div>
          
          {/* Indicador de slides */}
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="flex space-x-1">
              <div className="w-2 h-1 bg-pink-500 rounded-full"></div>
              <div className="w-2 h-1 bg-gray-300 rounded-full"></div>
              <div className="w-2 h-1 bg-gray-300 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
        <FileImageOutlined className="mr-1" />
        PRESENTACIÓN
      </div>

      {/* Hover overlay con información */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-white bg-black bg-opacity-70 px-3 py-1 rounded text-sm">
          Click para abrir
        </div>
      </div>
    </div>
  );
};

// Iconos por tipo de nota
const typeIcons = {
  [NoteType.TEXT]: <FileTextOutlined />,
  [NoteType.VOICE]: <AudioOutlined />,
  [NoteType.DRAWING]: <PictureOutlined />,
  [NoteType.PRESENTATION]: <FileImageOutlined />,
  [NoteType.MIXED]: <SettingOutlined />,
  [NoteType.MINDMAP]: <BranchesOutlined />,
};

// Colores por tipo de nota
const typeColors = {
  [NoteType.TEXT]: '#1890ff',
  [NoteType.VOICE]: '#52c41a',
  [NoteType.DRAWING]: '#fa8c16',
  [NoteType.PRESENTATION]: '#eb2f96',
  [NoteType.MIXED]: '#722ed1',
  [NoteType.MINDMAP]: '#9254de',
};

// Etiquetas personalizadas por tipo de nota
const typeLabels = {
  [NoteType.TEXT]: 'TEXTO',
  [NoteType.VOICE]: 'AUDIO',
  [NoteType.DRAWING]: 'DIBUJO',
  [NoteType.PRESENTATION]: 'PRESENTACIÓN',
  [NoteType.MIXED]: 'MIXTO',
  [NoteType.MINDMAP]: 'MIND MAP',
};

const ApunteCard: React.FC<NoteCardProps> = ({
  note,
  viewMode,
  onEdit,
  onDelete,
  onToggleFavorite,
  onView,
  onShare,
}) => {
  // ApunteCard component ready
  
  const { formatFileSize, formatDuration } = useFileValidation();

  // Menú de acciones
  const menuItems: MenuProps['items'] = [
    {
      key: 'view',
      icon: <EyeOutlined />,
      label: 'Ver completo',
      onClick: () => {
        window.console.error('🚨🚨🚨 MENU CLICKED - INDESTRUCTIBLE');
        try {
          onView(note);
        } catch (error) {
          window.console.error('🚨🚨🚨 ERROR EN MENU onView - INDESTRUCTIBLE:', error);
          throw error;
        }
      },
    },
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Editar',
      onClick: () => onEdit(note),
    },
    {
      type: 'divider',
    },
    {
      key: 'share',
      icon: <ShareAltOutlined />,
      label: 'Compartir',
      disabled: !onShare || note.isPrivate,
      onClick: () => {
        if (onShare) {
          const canShare = studentNotesApi.canShareNote(note);
          if (canShare.canShare) {
            onShare(note);
          }
        }
      },
    },
    {
      key: 'download',
      icon: <DownloadOutlined />,
      label: 'Descargar',
      disabled: !note.hasAttachment && !note.driveFileId && !note.webContentLink && note.type !== 'presentation',
      onClick: async () => {
        console.log('🔍 DEBUG DOWNLOAD:', {
          noteId: note.id,
          type: note.type,
          hasAttachment: note.hasAttachment,
          driveFileId: note.driveFileId,
          webContentLink: note.webContentLink,
          fileName: note.fileName
        });
        try {
          // Verificar si tiene archivo para descargar O es una presentación
          if (!note.driveFileId && !note.webContentLink && note.type !== 'presentation') {
            console.warn('No hay archivo para descargar');
            return;
          }

          // Para presentaciones, generar PowerPoint
          if (note.type === 'presentation') {
            console.log('📊 Generating PowerPoint for presentation:', note.id);
            // TODO: Implementar generación de PowerPoint
            const presentationUrl = `${process.env.REACT_APP_API_URL || 'https://plataforma.mundoworld.school/api'}/student-notes/${note.id}/export/powerpoint`;
            
            // Obtener token del localStorage
            let token = null;
            const authData = localStorage.getItem('mw-panel-auth');
            if (authData) {
              try {
                const { state } = JSON.parse(authData);
                token = state.accessToken;
              } catch (error) {
                console.warn('📊 Failed to parse auth data:', error);
              }
            }

            if (!token) {
              console.error('No authentication token found');
              return;
            }

            const response = await fetch(presentationUrl, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (!response.ok) {
              throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${note.title}.pptx`;
            
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            console.log('✅ PowerPoint download completed');
            return;
          }

          // Usar el endpoint de streaming del backend para descarga
          const downloadUrl = `${process.env.REACT_APP_API_URL || 'https://plataforma.mundoworld.school/api'}/student-notes/${note.id}/stream`;
          
          // Obtener token del localStorage (mismo método que DrawingImageComponent)
          let token = null;
          const authData = localStorage.getItem('mw-panel-auth');
          if (authData) {
            try {
              const { state } = JSON.parse(authData);
              token = state.accessToken;
            } catch (error) {
              console.warn('🔍 Failed to parse auth data:', error);
            }
          }

          if (!token) {
            console.error('No authentication token found');
            return;
          }

          // Fetch con autenticación y crear descarga
          const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = note.fileName || `apunte-${note.id}`;
          
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          console.log('✅ Download completed successfully');
          
        } catch (error) {
          console.error('Error al descargar archivo:', error);
        }
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Eliminar',
      danger: true,
      onClick: () => {
        // Delete action initiated
        
        // Validate note ID
        if (!note?.id || typeof note.id !== 'string') {
          alert('Error: ID de nota inválido. No se puede eliminar.');
          return;
        }
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(note.id)) {
          alert('Error: ID de nota no válido.');
          return;
        }
        
        // Calling delete with valid ID
        onDelete(note.id);
      },
    },
  ];

  // Renderizar etiquetas
  const renderTags = () => {
    if (!note.tagsArray?.length) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-2">
        <TagsOutlined className="text-gray-400 mt-1" style={{ fontSize: '12px' }} />
        {note.tagsArray.slice(0, 3).map((tag, index) => (
          <Tag key={index} size="small" color="blue">
            {tag}
          </Tag>
        ))}
        {note.tagsArray.length > 3 && (
          <Tag size="small">+{note.tagsArray.length - 3}</Tag>
        )}
      </div>
    );
  };

  // Renderizar metadata del archivo
  const renderFileMetadata = () => {
    if (!note.hasAttachment) return null;

    return (
      <Space size={4} className="text-xs text-gray-500">
        {note.isAudio && note.duration && (
          <>
            <ClockCircleOutlined />
            <span>{formatDuration(note.duration)}</span>
          </>
        )}
        {note.fileName && (
          <>
            <span>•</span>
            <span>{note.fileName}</span>
          </>
        )}
      </Space>
    );
  };

  // Renderizar reproductor de voz para notas de audio
  const renderVoicePlayer = () => {
    // Para notas de voz, si isAudio es undefined pero type es VOICE, asumir que es audio
    const isVoiceNote = note.type === NoteType.VOICE;
    const hasAudioLink = !!note.webContentLink;
    
    if (!isVoiceNote || !hasAudioLink) {
      console.log('🎵 ApunteCard: No se puede renderizar VoicePlayer:', {
        type: note.type,
        isAudio: note.isAudio,
        isVoiceNote,
        hasWebContentLink: hasAudioLink,
        webContentLink: note.webContentLink
      });
      return null;
    }

    // Usar el endpoint de streaming del backend en lugar de URLs directas de Google Drive
    const audioUrl = `${import.meta.env.VITE_API_BASE_URL || 'https://plataforma.mundoworld.school'}/api/student-notes/${note.id}/stream`;
    
    console.log('🎵 ApunteCard: Renderizando VoicePlayer con streaming proxy:', {
      noteId: note.id,
      streamingUrl: audioUrl,
      originalGoogleDriveUrl: note.webContentLink
    });

    const handleDownload = async () => {
      try {
        // Usar el endpoint de streaming del backend para descargas también
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = note.fileName || `nota-voz-${note.id}.mp3`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Descarga iniciada para nota de voz via streaming proxy:', note.id);
      } catch (error) {
        console.error('Error al descargar nota de voz:', error);
      }
    };

    return (
      <div className="mt-3">
        <VoicePlayer
          audioUrl={audioUrl}
          fileName={note.fileName}
          duration={note.duration}
          onDownload={handleDownload}
          compact={viewMode === 'grid'}
        />
      </div>
    );
  };

  const renderDrawingViewer = () => {
    console.log('🎨 ApunteCard: Intentando renderizar DrawingViewer');
    const isDrawingNote = note.type === NoteType.DRAWING;
    const hasImageLink = !!note.webContentLink;
    
    if (!isDrawingNote || !hasImageLink) {
      console.log('🎨 ApunteCard: No se puede renderizar DrawingViewer:', {
        type: note.type,
        isDrawing: note.isDrawing,
        isDrawingNote,
        hasWebContentLink: hasImageLink,
        webContentLink: note.webContentLink
      });
      return null;
    }

    console.log('🎨 ApunteCard: Renderizando DrawingViewer con streaming proxy:', {
      noteId: note.id,
      originalGoogleDriveUrl: note.webContentLink
    });

    return (
      <div className="mt-3">
        <DrawingImageComponent 
          noteId={note.id}
          title={note.title}
          viewMode={viewMode}
          onView={() => onView(note)}
        />
      </div>
    );
  };

  const renderPresentationViewer = () => {
    console.log('🎨 ApunteCard: Intentando renderizar PresentationViewer');
    const isPresentationNote = note.type === NoteType.PRESENTATION;
    
    if (!isPresentationNote) {
      console.log('🎨 ApunteCard: No se puede renderizar PresentationViewer:', {
        type: note.type,
        isPresentationNote,
      });
      return null;
    }

    console.log('🎨 ApunteCard: Renderizando PresentationViewer:', {
      noteId: note.id,
      content: note.content?.substring(0, 100) + '...'
    });

    return (
      <div className="mt-3">
        <PresentationThumbnailComponent 
          note={note}
          viewMode={viewMode}
          onView={() => onView(note)}
        />
      </div>
    );
  };

  // Renderizar vista en grid
  const renderGridView = () => (
    <motion.div
      whileHover={{ y: -4, shadow: '0 8px 25px rgba(0,0,0,0.15)' }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={`h-full ${note.isFavorite ? 'ring-2 ring-red-200' : ''}`}
        hoverable
        actions={[
          <Tooltip title={note.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
            <Button
              type="text"
              icon={note.isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(note.id);
              }}
            />
          </Tooltip>,
          <Tooltip title="Ver completo">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                onView(note);
              }}
            />
          </Tooltip>,
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <Button
              type="text"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>,
        ]}
        onClick={() => {
          window.console.error('🚨🚨🚨 CARD CLICKED - INDESTRUCTIBLE');
          window.console.log('📋 Note data:', note);
          try {
            onView(note);
          } catch (error) {
            window.console.error('🚨🚨🚨 ERROR EN onView - INDESTRUCTIBLE:', error);
            throw error;
          }
        }}
      >
        {/* Header con tipo y fecha */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${typeColors[note.type]}15` }}
            >
              <span style={{ color: typeColors[note.type], fontSize: '16px' }}>
                {typeIcons[note.type]}
              </span>
            </div>
            <div>
              <Tag color={typeColors[note.type]} size="small">
                {typeLabels[note.type]}
              </Tag>
            </div>
          </div>
          <AntText type="secondary" className="text-xs">
            {dayjs(note.createdAt).fromNow()}
          </AntText>
        </div>

        {/* Título */}
        <AntText strong className="text-base mb-2 block" ellipsis={{ tooltip: note.title }}>
          {note.title}
        </AntText>

        {/* Contenido preview */}
        {note.type === NoteType.VOICE ? (
          // Reproductor de voz para notas de audio
          renderVoicePlayer()
        ) : note.type === NoteType.DRAWING ? (
          // Visor de imagen para dibujos
          renderDrawingViewer()
        ) : note.type === NoteType.PRESENTATION ? (
          // Visor de presentaciones con vista previa
          renderPresentationViewer()
        ) : note.type === NoteType.MINDMAP ? (
          // Preview mejorado para mapas mentales con visualización de estructura
          <div 
            className="text-sm mb-3 p-3 rounded border overflow-hidden bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 cursor-pointer hover:bg-gradient-to-r hover:from-purple-100 hover:to-indigo-100"
            style={{ maxHeight: '80px' }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🧠 Click en preview de Mind Map detectado!');
              console.log('🧠 Nota ID:', note.id);
              console.log('🧠 Nota type:', note.type);
              console.log('🧠 onView function:', typeof onView);
              try {
                onView(note);
                console.log('🧠 onView(note) llamado exitosamente');
              } catch (error) {
                console.error('❌ Error llamando onView:', error);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {(() => {
              // Intentar extraer datos del Mind Map
              let mindMapData = null;
              try {
                mindMapData = note.metadata?.mindMapData?.nodeData || 
                             (note.content ? JSON.parse(note.content) : null);
              } catch (e) {
                console.log('No se pudieron parsear datos del Mind Map para preview');
              }

              if (mindMapData && mindMapData.topic) {
                // Mostrar preview con estructura
                const hasChildren = mindMapData.children && mindMapData.children.length > 0;
                const childrenCount = hasChildren ? mindMapData.children.length : 0;
                
                return (
                  <div className="flex items-center space-x-3 h-full">
                    {/* Nodo central */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                        <BranchesOutlined className="text-white text-sm" />
                      </div>
                    </div>
                    
                    {/* Información del Mind Map */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-purple-700 font-medium truncate">
                        {mindMapData.topic}
                      </div>
                      {hasChildren && (
                        <div className="text-xs text-purple-500 mt-1">
                          {childrenCount} nodo{childrenCount !== 1 ? 's' : ''} hijo{childrenCount !== 1 ? 's' : ''}
                        </div>
                      )}
                      <div className="text-xs text-purple-400">
                        Clic para visualizar
                      </div>
                    </div>
                    
                    {/* Indicador visual de estructura */}
                    {hasChildren && (
                      <div className="flex-shrink-0">
                        <div className="flex space-x-1">
                          {mindMapData.children.slice(0, 3).map((_: any, index: number) => (
                            <div 
                              key={index}
                              className="w-2 h-2 bg-purple-400 rounded-full"
                            />
                          ))}
                          {childrenCount > 3 && (
                            <div className="text-xs text-purple-400">+{childrenCount - 3}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else {
                // Fallback para Mind Maps sin datos parseables
                return (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <BranchesOutlined className="text-2xl text-purple-600 mb-2" />
                      <div className="text-xs text-purple-700 font-medium">
                        Mind Map
                      </div>
                      <div className="text-xs text-purple-500 mt-1">
                        Haz clic para visualizar
                      </div>
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        ) : note.type === NoteType.TEXT && note.content.includes('<') ? (
          // Preview para documentos HTML (creados con TinyMCE)
          <div 
            className="text-sm mb-3 text-gray-600 bg-gray-50 p-3 rounded border overflow-hidden"
            style={{ maxHeight: '80px' }}
          >
            <div 
              className="prose prose-sm max-w-none line-clamp-3"
              dangerouslySetInnerHTML={{ 
                __html: note.content.replace(/<[^>]*>/g, ' ').substring(0, 150) + '...' 
              }}
            />
            <div className="text-xs text-blue-600 mt-1 flex items-center">
              <FileTextOutlined className="mr-1" />
              Documento HTML
            </div>
          </div>
        ) : (
          // Preview para texto simple
          <Paragraph
            type="secondary"
            className="text-sm mb-3"
            ellipsis={{ rows: 3, tooltip: note.content }}
          >
            {note.content}
          </Paragraph>
        )}

        {/* Metadata */}
        <div className="space-y-2">
          {renderFileMetadata()}
          
          {/* Asignatura */}
          {note.subject && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <span>📚</span>
              <span>{note.subject.name}</span>
            </div>
          )}

          {/* Recurso relacionado */}
          {note.relatedResource && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <LinkOutlined />
              <span>Relacionado con: {note.relatedResource.title}</span>
            </div>
          )}

          {/* Etiquetas */}
          {renderTags()}
        </div>

        {/* Footer con estadísticas */}
        <Divider className="my-3" />
        <div className="flex justify-between items-center text-xs text-gray-500">
          <Space size={8}>
            <EyeOutlined />
            <span>{note.viewCount} vistas</span>
          </Space>
          <Space size={4}>
            <CalendarOutlined />
            <span>{dayjs(note.createdAt).format('DD MMM')}</span>
          </Space>
        </div>
      </Card>
    </motion.div>
  );

  // Renderizar vista en lista
  const renderListView = () => (
    <Card
      className={`${note.isFavorite ? 'border-red-200' : ''}`}
      hoverable
      onClick={() => {
        window.console.error('🚨🚨🚨 LIST CARD CLICKED - INDESTRUCTIBLE'); 
        try {
          onView(note);
        } catch (error) {
          window.console.error('🚨🚨🚨 ERROR EN LIST onView - INDESTRUCTIBLE:', error);
          throw error;
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Tipo de nota */}
          <div
            className="p-3 rounded-lg flex-shrink-0"
            style={{ backgroundColor: `${typeColors[note.type]}15` }}
          >
            <span style={{ color: typeColors[note.type], fontSize: '18px' }}>
              {typeIcons[note.type]}
            </span>
          </div>

          {/* Contenido principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <AntText strong className="text-lg" ellipsis>
                {note.title}
              </AntText>
              <Tag color={typeColors[note.type]} size="small">
                {typeLabels[note.type]}
              </Tag>
              {note.isFavorite && (
                <HeartFilled style={{ color: '#ff4d4f' }} />
              )}
            </div>

            {note.type === NoteType.VOICE ? (
              // Reproductor de voz para notas de audio en vista lista
              renderVoicePlayer()
            ) : note.type === NoteType.DRAWING ? (
              // Visor de imagen para dibujos en vista lista
              renderDrawingViewer()
            ) : note.type === NoteType.PRESENTATION ? (
              // Visor de presentaciones en vista lista
              renderPresentationViewer()
            ) : (
              <Paragraph
                type="secondary"
                className="text-sm mb-2"
                ellipsis={{ rows: 2 }}
              >
                {note.content}
              </Paragraph>
            )}

            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <Space size={4}>
                <CalendarOutlined />
                <span>{dayjs(note.createdAt).format('DD/MM/YYYY HH:mm')}</span>
              </Space>

              {note.subject && (
                <Space size={4}>
                  <span>📚</span>
                  <span>{note.subject.name}</span>
                </Space>
              )}

              <Space size={4}>
                <EyeOutlined />
                <span>{note.viewCount} vistas</span>
              </Space>

              {renderFileMetadata()}
            </div>

            {note.tagsArray?.length > 0 && (
              <div className="flex items-center space-x-1 mt-2">
                <TagsOutlined style={{ fontSize: '12px' }} />
                {note.tagsArray.slice(0, 5).map((tag, index) => (
                  <Tag key={index} size="small" color="blue">
                    {tag}
                  </Tag>
                ))}
                {note.tagsArray.length > 5 && (
                  <Tag size="small">+{note.tagsArray.length - 5}</Tag>
                )}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Tooltip title={note.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}>
              <Button
                type="text"
                icon={note.isFavorite ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(note.id);
                }}
              />
            </Tooltip>

            <Tooltip title="Editar">
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(note);
                }}
              />
            </Tooltip>

            <Dropdown menu={{ items: menuItems }} trigger={['click']}>
              <Button
                type="text"
                icon={<MoreOutlined />}
                onClick={(e) => e.stopPropagation()}
              />
            </Dropdown>
          </div>
        </div>
      </div>
    </Card>
  );

  return viewMode === 'grid' ? renderGridView() : renderListView();
};

export default ApunteCard;