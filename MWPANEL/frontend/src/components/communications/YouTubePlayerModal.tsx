import React, { useEffect } from 'react';
import { Modal, Button } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

interface YouTubePlayerModalProps {
  visible: boolean;
  videoId: string;
  title?: string;
  onClose: () => void;
}

/** Extract YouTube video ID from various URL formats. Returns null if not a YouTube URL. */
export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    // youtube.com/watch?v=ID
    if (
      (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') &&
      u.pathname === '/watch'
    ) {
      return u.searchParams.get('v');
    }
    // youtube.com/embed/ID
    if (
      (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') &&
      u.pathname.startsWith('/embed/')
    ) {
      return u.pathname.split('/embed/')[1]?.split(/[?#]/)[0] || null;
    }
    // youtube.com/shorts/ID
    if (
      (u.hostname === 'www.youtube.com' || u.hostname === 'youtube.com') &&
      u.pathname.startsWith('/shorts/')
    ) {
      return u.pathname.split('/shorts/')[1]?.split(/[?#]/)[0] || null;
    }
    // youtu.be/ID
    if (u.hostname === 'youtu.be') {
      return u.pathname.slice(1).split(/[?#]/)[0] || null;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

const YouTubePlayerModal: React.FC<YouTubePlayerModalProps> = ({
  visible,
  videoId,
  title,
  onClose,
}) => {
  // Keyboard escape
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, onClose]);

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      destroyOnClose
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlayCircleOutlined style={{ color: '#ff0000' }} />
          <span style={{ fontSize: 15 }}>{title || 'Video de YouTube'}</span>
        </div>
      }
      styles={{
        body: { padding: 0 },
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingBottom: '56.25%', // 16:9
          background: '#000',
        }}
      >
        {videoId && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
            title={title || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
        )}
      </div>
      <div style={{ padding: '12px 16px', textAlign: 'right' }}>
        <Button
          type="link"
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir en YouTube
        </Button>
      </div>
    </Modal>
  );
};

export default YouTubePlayerModal;
