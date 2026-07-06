import React, { useEffect, useState } from 'react';
import { Spin } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import apiClient from '../../services/apiClient';

interface VideoWithAuthProps {
  attachmentId: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}

/**
 * Muestra el primer frame del vídeo como thumbnail + icono play.
 * Al hacer clic llama onClick (típicamente abre la galería).
 */
const VideoWithAuth: React.FC<VideoWithAuthProps> = ({
  attachmentId,
  style,
  onClick,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const loadThumbnail = async () => {
      try {
        setLoading(true);
        setError(false);

        const response = await apiClient.get(
          `/communications/attachments/${attachmentId}/stream`,
          { responseType: 'blob' }
        );

        if (cancelled) return;

        objectUrl = URL.createObjectURL(response.data);

        await new Promise<void>((resolve) => {
          const video = document.createElement('video');
          video.muted = true;
          video.playsInline = true;
          // No preload='metadata' — necesitamos datos reales para capturar el frame

          let captured = false;

          const captureFrame = () => {
            if (cancelled || captured) return;
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              const canvas = document.createElement('canvas');
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                if (!cancelled) setThumbnailUrl(dataUrl);
              }
            }
            captured = true;
            resolve();
          };

          // Captura tras el seek
          video.addEventListener('seeked', captureFrame);

          // Cuando hay datos del primer frame, hacer seek a 0.1s
          video.addEventListener('loadeddata', () => {
            video.currentTime = 0.1;
            // Fallback: si seeked no dispara en 1s, capturar directamente
            setTimeout(() => { if (!captured) captureFrame(); }, 1000);
          });

          video.addEventListener('error', () => { captured = true; resolve(); });

          // Timeout máximo de 6s
          setTimeout(() => { if (!captured) { if (video.videoWidth > 0) captureFrame(); else resolve(); } }, 6000);

          video.src = objectUrl!;
        });

      } catch (err) {
        if (!cancelled) {
          console.error('Error loading video thumbnail:', err);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }
    };

    loadThumbnail();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId]);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{
          minHeight: '120px',
          backgroundColor: '#1a1a1a',
          borderRadius: '8px',
          cursor: 'pointer',
          ...style,
        }}
        onClick={onClick}
      >
        <Spin />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2"
        style={{
          minHeight: '120px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          color: '#999',
          cursor: 'pointer',
          ...style,
        }}
        onClick={onClick}
      >
        <PlayCircleOutlined style={{ fontSize: 32 }} />
        <span style={{ fontSize: 12 }}>Error al cargar el vídeo</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        cursor: 'pointer',
        borderRadius: '8px',
        overflow: 'hidden',
        maxWidth: '100%',
        ...style,
      }}
      onClick={onClick}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt="Vista previa del vídeo"
          style={{
            maxWidth: '100%',
            maxHeight: style?.maxHeight || '300px',
            display: 'block',
            borderRadius: '8px',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            minHeight: '120px',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
          }}
        />
      )}
      {/* Botón play superpuesto */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.15)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)')}
      >
        <PlayCircleOutlined
          style={{
            fontSize: 48,
            color: 'rgba(255, 255, 255, 0.9)',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
          }}
        />
      </div>
    </div>
  );
};

export default VideoWithAuth;
