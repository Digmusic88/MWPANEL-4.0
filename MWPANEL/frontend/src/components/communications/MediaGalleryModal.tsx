import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Spin, Button, Tooltip } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import apiClient from '../../services/apiClient';

export interface GalleryMediaItem {
  id: string;
  filename: string;
  sender: string;
  date: string;
  type: 'image' | 'video';
}

interface MediaGalleryModalProps {
  visible: boolean;
  media: GalleryMediaItem[];
  initialIndex: number;
  onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.3;

const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
  visible,
  media,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const videoRef = useRef<HTMLVideoElement>(null);

  const currentItem = media[currentIndex];
  const isVideo = currentItem?.type === 'video';

  // Reset state when opening or changing item
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    } else {
      // Pause video when modal closes
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }
  }, [visible, initialIndex]);

  // Load media via authenticated request (images via /view, videos via /stream)
  useEffect(() => {
    if (!visible || !currentItem) return;

    let revoked = false;
    setLoading(true);
    setError(false);

    const endpoint = isVideo
      ? `/communications/attachments/${currentItem.id}/stream`
      : `/communications/attachments/${currentItem.id}/view`;

    apiClient
      .get(endpoint, { responseType: 'blob' })
      .then((res) => {
        if (!revoked) {
          const url = URL.createObjectURL(res.data);
          setBlobUrl(url);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!revoked) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      revoked = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [visible, currentIndex, currentItem?.id]);

  const navigate = useCallback(
    (direction: 'prev' | 'next') => {
      // Pause current video before navigating
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setCurrentIndex((prev) => {
        if (direction === 'prev') return prev > 0 ? prev - 1 : media.length - 1;
        return prev < media.length - 1 ? prev + 1 : 0;
      });
    },
    [media.length],
  );

  const handleZoom = useCallback((delta: number) => {
    setZoom((prev) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta)));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Keyboard handling
  useEffect(() => {
    if (!visible) return;

    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigate('prev');
          break;
        case 'ArrowRight':
          navigate('next');
          break;
        case '+':
        case '=':
          if (!isVideo) handleZoom(ZOOM_STEP);
          break;
        case '-':
          if (!isVideo) handleZoom(-ZOOM_STEP);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, navigate, handleZoom, onClose, isVideo]);

  // Mouse wheel zoom (images only)
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (isVideo) return;
      e.preventDefault();
      handleZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
    },
    [handleZoom, isVideo],
  );

  // Drag to pan when zoomed (images only)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isVideo || zoom <= 1) return;
      e.preventDefault();
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = { ...position };
    },
    [zoom, position, isVideo],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      setPosition({
        x: posStart.current.x + (e.clientX - dragStart.current.x),
        y: posStart.current.y + (e.clientY - dragStart.current.y),
      });
    },
    [dragging],
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Download current item
  const handleDownload = useCallback(async () => {
    if (!currentItem) return;

    // If we already have a blobUrl (images), use it directly
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = currentItem.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // For videos or any media without blobUrl, fetch with auth and download
    try {
      const response = await apiClient.get(
        `/communications/attachments/${currentItem.id}/download`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = currentItem.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }, [blobUrl, currentItem]);

  if (!visible || media.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.92)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          color: '#fff',
        }}
      >
        <span style={{ fontSize: 14, opacity: 0.8 }}>
          {currentIndex + 1} de {media.length}
          {isVideo && ' — Vídeo'}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isVideo && (
            <>
              <Tooltip title="Alejar (-)">
                <Button
                  type="text"
                  icon={<ZoomOutOutlined />}
                  onClick={() => handleZoom(-ZOOM_STEP)}
                  style={{ color: '#fff' }}
                  disabled={zoom <= MIN_ZOOM}
                />
              </Tooltip>
              <Tooltip title={`${Math.round(zoom * 100)}%`}>
                <Button
                  type="text"
                  icon={<ExpandOutlined />}
                  onClick={resetZoom}
                  style={{ color: '#fff', minWidth: 50, fontSize: 12 }}
                >
                  {Math.round(zoom * 100)}%
                </Button>
              </Tooltip>
              <Tooltip title="Acercar (+)">
                <Button
                  type="text"
                  icon={<ZoomInOutlined />}
                  onClick={() => handleZoom(ZOOM_STEP)}
                  style={{ color: '#fff' }}
                  disabled={zoom >= MAX_ZOOM}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Descargar">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              style={{ color: '#fff' }}
            />
          </Tooltip>
          <Tooltip title="Cerrar (Esc)">
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              style={{ color: '#fff', fontSize: 18 }}
            />
          </Tooltip>
        </div>
      </div>

      {/* Media area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          cursor: !isVideo && zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Navigation arrows */}
        {media.length > 1 && (
          <>
            <div
              onClick={() => navigate('prev')}
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <LeftOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div
              onClick={() => navigate('next')}
              style={{
                position: 'absolute',
                right: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 2,
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              <RightOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
          </>
        )}

        {/* Content: Image or Video */}
        {loading ? (
          <Spin size="large" />
        ) : error ? (
          <div style={{ color: '#fff', textAlign: 'center' }}>
            <p style={{ fontSize: 16 }}>No se pudo cargar {isVideo ? 'el vídeo' : 'la imagen'}</p>
          </div>
        ) : blobUrl && isVideo ? (
          <video
            ref={videoRef}
            key={currentItem.id}
            controls
            preload="auto"
            src={blobUrl}
            style={{
              maxWidth: '90vw',
              maxHeight: 'calc(100vh - 140px)',
              borderRadius: '4px',
              outline: 'none',
            }}
          />
        ) : blobUrl ? (
          <img
            src={blobUrl}
            alt={currentItem?.filename}
            draggable={false}
            style={{
              maxWidth: '90vw',
              maxHeight: 'calc(100vh - 140px)',
              objectFit: 'contain',
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transition: dragging ? 'none' : 'transform 0.2s ease',
              userSelect: 'none',
            }}
          />
        ) : null}
      </div>

      {/* Bottom bar */}
      {currentItem && (
        <div
          style={{
            padding: '10px 20px',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: 13,
          }}
        >
          <div style={{ opacity: 0.9 }}>
            <strong>{currentItem.filename}</strong>
          </div>
          <div style={{ opacity: 0.6 }}>
            {currentItem.sender} &middot; {currentItem.date}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGalleryModal;
