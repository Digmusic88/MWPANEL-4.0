import React, { useState, useEffect } from 'react';
import {
  Card,
  Image,
  Typography,
  Space,
  Carousel,
  Button,
  Modal,
} from 'antd';
import {
  PlayCircleOutlined,
  AudioOutlined,
  FileTextOutlined,
  LeftOutlined,
  RightOutlined,
  ExpandOutlined,
  CloseOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  type: 'image' | 'video' | 'audio' | 'document';
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
}

interface BlogMediaViewerProps {
  media: MediaItem[];
  showTitle?: boolean;
  compact?: boolean;
  maxWidth?: string;
}

const BlogMediaViewer: React.FC<BlogMediaViewerProps> = ({
  media,
  showTitle = true,
  compact = false,
  maxWidth = '100%'
}) => {
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [urlFallbacks, setUrlFallbacks] = useState<{[key: string]: number}>({});  // Track fallback attempts
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [images, setImages] = useState<MediaItem[]>([]);

  // Effect para separar las imágenes y configurar navegación por teclado
  useEffect(() => {
    const imageItems = media.filter(m => m.mimeType?.startsWith('image/'));
    setImages(imageItems);
  }, [media]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!galleryVisible || images.length === 0) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          setCurrentImageIndex((prev) => 
            prev > 0 ? prev - 1 : images.length - 1
          );
          break;
        case 'ArrowRight':
          event.preventDefault();
          setCurrentImageIndex((prev) => 
            prev < images.length - 1 ? prev + 1 : 0
          );
          break;
        case 'Escape':
          event.preventDefault();
          setGalleryVisible(false);
          break;
      }
    };

    if (galleryVisible) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [galleryVisible, images.length]);

  // Functions for gallery navigation
  const openGallery = (imageIndex: number) => {
    setCurrentImageIndex(imageIndex);
    setGalleryVisible(true);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev < images.length - 1 ? prev + 1 : 0
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev > 0 ? prev - 1 : images.length - 1
    );
  };

  // Función para usar endpoint proxy del backend
  const useProxyUrl = (mediaItem: MediaItem): string => {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://plataforma.mundoworld.school' 
      : 'http://localhost:3000';
    
    const proxyUrl = `${baseUrl}/api/blog-media/proxy/${mediaItem.id}`;
    console.log(`🔗 Using proxy URL:`, { mediaId: mediaItem.id, proxyUrl });
    return proxyUrl;
  };

  // Función mejorada con múltiples estrategias para URLs de Google Drive
  const fixGoogleDriveUrl = (url: string, type: string): string => {
    console.log(`🔧 fixGoogleDriveUrl - Input:`, { url, type });
    
    // Extraer fileId de diferentes formatos de URL
    let fileId = null;
    
    // Formato: https://drive.google.com/uc?export=download&id=FILEID
    if (url.includes('drive.google.com/uc')) {
      fileId = url.match(/[?&]id=([^&]+)/)?.[1];
    }
    // Formato: https://drive.google.com/file/d/FILEID/view
    else if (url.includes('drive.google.com/file/d/')) {
      fileId = url.match(/\/file\/d\/([^\/]+)/)?.[1];
    }
    
    if (!fileId) {
      console.log(`⚠️ No se pudo extraer fileId de:`, url);
      return url;
    }
    
    console.log(`✅ FileId extraído:`, fileId);
    
    let newUrls: string[] = [];
    
    switch (type) {
      case 'image':
        // Múltiples estrategias para imágenes (ordenadas por probabilidad de éxito)
        newUrls = [
          `https://lh3.googleusercontent.com/d/${fileId}`, // Estrategia principal
          `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`, // Thumbnail
          `https://drive.google.com/uc?export=view&id=${fileId}`, // View mode
          `https://lh3.googleusercontent.com/d/${fileId}=s2000`, // Con tamaño específico
        ];
        break;
      case 'video':
      case 'audio':
        // Múltiples estrategias para audio/video
        newUrls = [
          `https://drive.google.com/uc?id=${fileId}&confirm=t`, // Con confirmación
          `https://docs.google.com/uc?export=download&id=${fileId}`, // Docs endpoint
          `https://drive.usercontent.google.com/download?id=${fileId}&export=download`, // Usercontent
          `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`, // Original con confirm
        ];
        break;
      default:
        newUrls = [url];
    }
    
    // Usar fallback basado en intentos previos
    const fallbackIndex = urlFallbacks[fileId] || 0;
    const selectedUrl = newUrls[Math.min(fallbackIndex, newUrls.length - 1)];
    
    console.log(`🔗 URLs disponibles (${newUrls.length}):`, newUrls);
    console.log(`🔗 URL seleccionada (fallback ${fallbackIndex}):`, { original: url, new: selectedUrl });
    
    return selectedUrl;
  };

  // Función para manejar errores de carga y intentar fallback
  const handleMediaError = (fileId: string, mediaType: string) => {
    const currentAttempts = urlFallbacks[fileId] || 0;
    const MAX_FALLBACK_ATTEMPTS = 4; // Máximo 4 intentos para evitar loop infinito
    
    if (currentAttempts >= MAX_FALLBACK_ATTEMPTS) {
      console.log(`🚫 Max fallback attempts reached for ${fileId} (${currentAttempts}/${MAX_FALLBACK_ATTEMPTS})`);
      return; // No más intentos
    }
    
    console.log(`❌ Error cargando media ${fileId}, probando fallback ${currentAttempts + 1}/${MAX_FALLBACK_ATTEMPTS}...`);
    setUrlFallbacks(prev => ({
      ...prev,
      [fileId]: currentAttempts + 1
    }));
  };

  // Función para extraer fileId de URL
  const extractFileId = (url: string): string | null => {
    if (url.includes('drive.google.com/uc')) {
      return url.match(/[?&]id=([^&]+)/)?.[1] || null;
    }
    if (url.includes('drive.google.com/file/d/')) {
      return url.match(/\/file\/d\/([^\/]+)/)?.[1] || null;
    }
    return null;
  };

  console.log('🔧 BlogMediaViewer - Props recibidas:', { mediaCount: media?.length, showTitle, compact, maxWidth });
  console.log('🔧 BlogMediaViewer - Media data:', media);
  
  if (!media || media.length === 0) {
    console.log('⚠️ BlogMediaViewer - No hay media para mostrar');
    return (
      <div style={{ padding: '10px', border: '1px solid orange', color: 'orange' }}>
        🔧 DEBUG: BlogMediaViewer - No hay media
      </div>
    );
  }

  // Separar por tipo de media
  const imageItems = media.filter(m => m.mimeType?.startsWith('image/'));
  const videoItems = media.filter(m => m.mimeType?.startsWith('video/'));
  const audioItems = media.filter(m => m.mimeType?.startsWith('audio/'));
  const documents = media.filter(m => !m.mimeType?.startsWith('image/') && !m.mimeType?.startsWith('video/') && !m.mimeType?.startsWith('audio/'));

  const renderAudioPlayer = (audio: MediaItem, index: number) => (
    <div key={audio.id} style={{ marginBottom: compact ? '8px' : '16px' }}>
      <Card 
        size={compact ? "small" : "default"}
        style={{ 
          background: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '12px',
          maxWidth: compact ? '100%' : '500px'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          flexDirection: compact ? 'row' : 'column',
          padding: compact ? '8px' : '16px',
          gap: '12px'
        }}>
          {!compact && (
            <AudioOutlined style={{ 
              fontSize: '28px',
              color: '#579172',
            }} />
          )}
          <div style={{ flex: 1, width: '100%' }}>
            <audio 
              key={`${audio.id}-${urlFallbacks[extractFileId(audio.url) || audio.id] || 0}`} // Force re-render on fallback
              controls
              style={{ 
                width: '100%', 
                height: compact ? '32px' : '40px',
                borderRadius: '8px'
              }}
              preload="none" // Changed from "metadata" to "none" for faster page load
              crossOrigin="anonymous"
              onMouseEnter={(e) => {
                // Preload audio on hover for better UX
                const audioElement = e.target as HTMLAudioElement;
                if (audioElement.preload === 'none') {
                  audioElement.preload = 'metadata';
                  console.log(`📥 Preloading audio on hover: ${audio.originalName}`);
                }
              }}
              onError={(e) => {
                console.error(`❌ Audio error for: ${audio.originalName}`, e, audio);
                const fileId = extractFileId(audio.url);
                if (fileId) handleMediaError(fileId, audio.type);
              }}
              onLoadStart={() => {
                console.log(`🎵 Audio load started: ${audio.originalName}`);
              }}
              onCanPlay={() => {
                console.log(`✅ Audio can play: ${audio.originalName}`);
              }}
            >
              {/* Use proxy URL primarily for better reliability */}
              <source src={useProxyUrl(audio)} type={audio.mimeType} />
              Tu navegador no soporta audio HTML5.
            </audio>
          </div>
          {!compact && (
            <Text 
              style={{ 
                color: '#333', 
                fontSize: '12px',
                textAlign: 'center',
                marginTop: '4px'
              }}
            >
              🎵 {audio.originalName || audio.filename}
            </Text>
          )}
        </div>
      </Card>
    </div>
  );

  const renderVideoPlayer = (video: MediaItem, index: number) => (
    <div key={video.id} style={{ marginBottom: compact ? '8px' : '16px' }}>
      <div style={{ 
        background: '#000', 
        borderRadius: '12px', 
        padding: '8px',
        maxWidth: compact ? '100%' : '700px'
      }}>
        <video 
          key={`${video.id}-${urlFallbacks[extractFileId(video.url) || video.id] || 0}`} // Force re-render on fallback
          controls
          style={{ 
            width: '100%', 
            borderRadius: '8px',
            maxHeight: compact ? '200px' : '400px'
          }}
          preload="none" // Changed from "metadata" to "none" for faster initial load
          poster={video.thumbnailUrl}
          crossOrigin="anonymous"
          playsInline
          // Optimizations for faster loading
          muted={false} // Don't auto-mute to avoid autoplay issues
          loading="lazy" // Lazy load videos not immediately visible
          onLoadStart={() => {
            console.log(`🎬 Video load started: ${video.originalName}`);
            // Start preloading metadata only when user interacts
            const videoElement = document.querySelector(`video[key="${video.id}"]`) as HTMLVideoElement;
            if (videoElement) {
              videoElement.preload = 'metadata';
            }
          }}
          onMouseEnter={(e) => {
            // Preload on hover for better UX
            const videoElement = e.target as HTMLVideoElement;
            if (videoElement.preload === 'none') {
              videoElement.preload = 'metadata';
              console.log(`📥 Preloading video on hover: ${video.originalName}`);
            }
          }}
          onCanPlay={() => {
            console.log(`✅ Video can play: ${video.originalName}`);
          }}
          onError={(e) => {
            console.error(`❌ Video error for: ${video.originalName}`, e, video);
            const fileId = extractFileId(video.url);
            if (fileId) handleMediaError(fileId, video.type);
          }}
        >
          {/* Use proxy URL primarily for better reliability */}
          <source src={useProxyUrl(video)} type={video.mimeType} />
          Tu navegador no soporta video HTML5.
        </video>
        {!compact && (
          <div style={{ padding: '8px', textAlign: 'center' }}>
            <Text style={{ color: '#fff', fontSize: '12px' }}>
              <PlayCircleOutlined /> {video.originalName || video.filename}
            </Text>
          </div>
        )}
      </div>
    </div>
  );

  const renderImageGallery = () => {
    if (imageItems.length === 0) return null;

    if (imageItems.length === 1) {
      // Imagen única - mostrar directamente
      const image = imageItems[0];
      return (
        <div style={{ marginBottom: compact ? '8px' : '16px' }}>
          <div 
            style={{ 
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              maxWidth: compact ? '100%' : '600px',
              cursor: 'pointer'
            }}
            onClick={() => !compact && openGallery(0)}
          >
            <img
              key={`${image.id}-${urlFallbacks[extractFileId(image.url) || image.id] || 0}`}
              src={urlFallbacks[extractFileId(image.url) || image.id] >= 1 ? useProxyUrl(image) : fixGoogleDriveUrl(image.url, image.type)}
              alt={image.originalName || image.filename}
              style={{ 
                width: '100%',
                height: 'auto',
                display: 'block',
                maxHeight: compact ? '200px' : '400px',
                objectFit: 'cover'
              }}
              onError={() => {
                const fileId = extractFileId(image.url);
                if (fileId) handleMediaError(fileId, image.type);
              }}
            />
            {!compact && (
              <div style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '6px',
                padding: '4px 8px'
              }}>
                <ExpandOutlined style={{ color: 'white', fontSize: '14px' }} />
              </div>
            )}
          </div>
          {!compact && (
            <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
              📸 {image.originalName || image.filename}
            </Text>
          )}
        </div>
      );
    }

    // Multiple images - gallery with carousel
    return (
      <div style={{ marginBottom: compact ? '8px' : '16px' }}>
        <Card 
          style={{ 
            borderRadius: '12px',
            overflow: 'hidden',
            maxWidth: compact ? '100%' : '600px'
          }}
        >
          <div style={{ position: 'relative' }}>
            <Carousel
              arrows={true}
              dots={true}
              infinite={true}
              prevArrow={<Button icon={<LeftOutlined />} size="small" />}
              nextArrow={<Button icon={<RightOutlined />} size="small" />}
            >
              {imageItems.map((image, idx) => (
                <div key={image.id}>
                  <img
                    key={`${image.id}-carousel-${urlFallbacks[extractFileId(image.url) || image.id] || 0}`}
                    src={fixGoogleDriveUrl(image.url, image.type)}
                    alt={image.originalName || image.filename}
                    style={{ 
                      width: '100%',
                      height: compact ? '200px' : '350px',
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onError={() => {
                      const fileId = extractFileId(image.url);
                      if (fileId) handleMediaError(fileId, image.type);
                    }}
                    onClick={() => !compact && openGallery(idx)}
                  />
                </div>
              ))}
            </Carousel>
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: 'rgba(0,0,0,0.7)',
              borderRadius: '6px',
              padding: '4px 8px',
              color: 'white',
              fontSize: '12px'
            }}>
              📸 {imageItems.length} imágenes
            </div>
          </div>
        </Card>
      </div>
    );
  };

  const renderDocuments = () => {
    if (documents.length === 0) return null;

    return (
      <div style={{ marginBottom: compact ? '8px' : '16px' }}>
        {showTitle && documents.length > 0 && (
          <Title level={5} style={{ marginBottom: '8px', color: '#666' }}>
            📎 Documentos adjuntos
          </Title>
        )}
        {documents.map((doc, index) => (
          <div key={doc.id} style={{ marginBottom: '8px' }}>
            <Card size="small" hoverable style={{ maxWidth: '300px' }}>
              <Space>
                <FileTextOutlined style={{ fontSize: '16px', color: '#579172' }} />
                <div>
                  <Text strong style={{ fontSize: '13px' }}>
                    {doc.originalName || doc.filename}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {doc.mimeType}
                  </Text>
                </div>
              </Space>
            </Card>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ maxWidth }}>
      {/* Imágenes - Mostrar primero como galería principal */}
      {renderImageGallery()}
      
      {/* Videos */}
      {videoItems.map(renderVideoPlayer)}
      
      {/* Audio */}
      {audioItems.map(renderAudioPlayer)}
      
      {/* Documentos */}
      {renderDocuments()}

      {/* Image Gallery Modal - Modern Implementation */}
      <Modal
        open={galleryVisible}
        onCancel={() => setGalleryVisible(false)}
        footer={null}
        width="90vw"
        style={{ maxWidth: '1200px' }}
        centered
        className="gallery-modal"
        styles={{
          body: { 
            padding: 0, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            minHeight: '60vh' 
          }
        }}
      >
        {images.length > 0 && images[currentImageIndex] && (
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Previous Button */}
            {images.length > 1 && (
              <Button
                type="text"
                icon={<LeftOutlined />}
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white hover:bg-opacity-70 border-0"
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              />
            )}

            {/* Image */}
            <img
              src={urlFallbacks[extractFileId(images[currentImageIndex].url) || images[currentImageIndex].id] >= 1 
                ? useProxyUrl(images[currentImageIndex]) 
                : fixGoogleDriveUrl(images[currentImageIndex].url, images[currentImageIndex].type)
              }
              alt={images[currentImageIndex].originalName}
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: '80vh' }}
              onError={() => {
                const fileId = extractFileId(images[currentImageIndex].url);
                if (fileId) handleMediaError(fileId, images[currentImageIndex].type);
              }}
            />

            {/* Next Button */}
            {images.length > 1 && (
              <Button
                type="text"
                icon={<RightOutlined />}
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black bg-opacity-50 text-white hover:bg-opacity-70 border-0"
                style={{ 
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              />
            )}

            {/* Image Info */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
              <p className="text-sm text-center mb-0">
                {images[currentImageIndex].originalName}
              </p>
              {images.length > 1 && (
                <p className="text-xs text-center text-gray-300 mb-0">
                  {currentImageIndex + 1} de {images.length}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Legacy fullscreen image modal (deprecated, keeping for backwards compatibility) */}
      {fullscreenImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          onClick={() => setFullscreenImage(null)}
        >
          <img
            src={fullscreenImage}
            alt="Imagen en pantalla completa"
            style={{
              maxWidth: '95%',
              maxHeight: '95%',
              objectFit: 'contain'
            }}
          />
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer'
          }}>
            ✕
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogMediaViewer;