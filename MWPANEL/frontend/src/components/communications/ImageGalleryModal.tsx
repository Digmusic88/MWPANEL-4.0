import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Spin, Button, Tooltip } from 'antd';
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

interface GalleryImage {
  id: string;
  filename: string;
  sender: string;
  date: string;
}

interface ImageGalleryModalProps {
  visible: boolean;
  images: GalleryImage[];
  initialIndex: number;
  onClose: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.3;

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  visible,
  images,
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

  const currentImage = images[currentIndex];

  // Reset state when opening or changing image
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [visible, initialIndex]);

  // Load image via authenticated request
  useEffect(() => {
    if (!visible || !currentImage) return;

    let revoked = false;
    setLoading(true);
    setError(false);

    apiClient
      .get(`/communications/attachments/${currentImage.id}/view`, {
        responseType: 'blob',
      })
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
  }, [visible, currentIndex, currentImage?.id]);

  const navigate = useCallback(
    (direction: 'prev' | 'next') => {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setCurrentIndex((prev) => {
        if (direction === 'prev') return prev > 0 ? prev - 1 : images.length - 1;
        return prev < images.length - 1 ? prev + 1 : 0;
      });
    },
    [images.length],
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
          handleZoom(ZOOM_STEP);
          break;
        case '-':
          handleZoom(-ZOOM_STEP);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, navigate, handleZoom, onClose]);

  // Mouse wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      handleZoom(e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
    },
    [handleZoom],
  );

  // Drag to pan when zoomed
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      e.preventDefault();
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = { ...position };
    },
    [zoom, position],
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

  // Download current image
  const handleDownload = useCallback(() => {
    if (!blobUrl || !currentImage) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = currentImage.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [blobUrl, currentImage]);

  if (!visible || images.length === 0) return null;

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
          {currentIndex + 1} de {images.length}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
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

      {/* Image area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          cursor: zoom > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Navigation arrows */}
        {images.length > 1 && (
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

        {/* Image */}
        {loading ? (
          <Spin size="large" />
        ) : error ? (
          <div style={{ color: '#fff', textAlign: 'center' }}>
            <p style={{ fontSize: 16 }}>No se pudo cargar la imagen</p>
          </div>
        ) : (
          blobUrl && (
            <img
              src={blobUrl}
              alt={currentImage?.filename}
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
          )
        )}
      </div>

      {/* Bottom bar */}
      {currentImage && (
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
            <strong>{currentImage.filename}</strong>
          </div>
          <div style={{ opacity: 0.6 }}>
            {currentImage.sender} &middot; {currentImage.date}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGalleryModal;
