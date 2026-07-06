import React, { useEffect, useState } from 'react';
import { Skeleton } from 'antd';
import { PlayCircleFilled, LinkOutlined } from '@ant-design/icons';
import apiClient from '../../services/apiClient';
import { extractYouTubeId } from './YouTubePlayerModal';

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
  favicon: string | null;
}

interface LinkPreviewCardProps {
  url: string;
  onYouTubeClick: (videoId: string, title: string) => void;
}

// Module-level cache so previews persist across re-renders
const previewCache = new Map<string, LinkPreviewData>();

const LinkPreviewCard: React.FC<LinkPreviewCardProps> = ({ url, onYouTubeClick }) => {
  const [data, setData] = useState<LinkPreviewData | null>(previewCache.get(url) || null);
  const [loading, setLoading] = useState(!previewCache.has(url));
  const [failed, setFailed] = useState(false);

  const youtubeId = extractYouTubeId(url);

  useEffect(() => {
    if (previewCache.has(url)) {
      setData(previewCache.get(url)!);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiClient
      .get('/communications/link-preview', { params: { url } })
      .then((res) => {
        if (!cancelled) {
          const preview = res.data as LinkPreviewData;
          previewCache.set(url, preview);
          setData(preview);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  const handleClick = () => {
    if (youtubeId) {
      onYouTubeClick(youtubeId, data?.title || 'Video de YouTube');
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (failed && !youtubeId) {
    // Simple fallback link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          color: '#1890ff',
          fontSize: 12,
          marginTop: 4,
        }}
      >
        <LinkOutlined /> {new URL(url).hostname}
      </a>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          marginTop: 8,
          padding: '10px 12px',
          borderRadius: 8,
          border: '1px solid #e8e8e8',
          background: '#fafafa',
          maxWidth: 360,
        }}
      >
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
      </div>
    );
  }

  if (!data) return null;

  const hasImage = data.image || youtubeId;
  const thumbnailUrl = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
    : data.image;

  return (
    <div
      onClick={handleClick}
      style={{
        marginTop: 8,
        display: 'flex',
        borderRadius: 8,
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#fafafa',
        maxWidth: 380,
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Thumbnail */}
      {hasImage && thumbnailUrl && (
        <div
          style={{
            width: youtubeId ? 160 : 100,
            minHeight: youtubeId ? 90 : 80,
            flexShrink: 0,
            position: 'relative',
            background: '#e0e0e0',
          }}
        >
          <img
            src={thumbnailUrl}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {youtubeId && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.3)',
              }}
            >
              <PlayCircleFilled style={{ fontSize: 36, color: '#ff0000' }} />
            </div>
          )}
        </div>
      )}

      {/* Text content */}
      <div
        style={{
          padding: '8px 12px',
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        {data.title && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#1a1a1a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {data.title}
          </div>
        )}
        {data.description && (
          <div
            style={{
              fontSize: 12,
              color: '#666',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              lineHeight: '1.4',
            }}
          >
            {data.description}
          </div>
        )}
        <div
          style={{
            fontSize: 11,
            color: '#999',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            marginTop: 2,
          }}
        >
          {data.favicon && (
            <img
              src={data.favicon}
              alt=""
              style={{ width: 14, height: 14 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          {data.siteName || new URL(url).hostname}
        </div>
      </div>
    </div>
  );
};

export default LinkPreviewCard;

/** Extract all URLs from HTML message content. Max 3 per message. */
export function extractUrls(htmlContent: string): string[] {
  const urls = new Set<string>();

  // Extract from href attributes
  const hrefRegex = /href=["']((https?:\/\/[^"']+))["']/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(htmlContent)) !== null) {
    urls.add(match[1]);
  }

  // Extract bare URLs from text (strip HTML tags first)
  const text = htmlContent.replace(/<[^>]+>/g, ' ');
  const urlRegex = /https?:\/\/[^\s<>"')\]]+/gi;
  while ((match = urlRegex.exec(text)) !== null) {
    urls.add(match[0].replace(/[.,;:!?)]+$/, '')); // trim trailing punctuation
  }

  return Array.from(urls).slice(0, 3);
}
