/**
 * VoiceNotePlayer — estilo WhatsApp/Telegram
 * Botón circular play/pause + forma de onda real (Web Audio API) + tiempo
 *
 * Cuando el `src` apunta a un endpoint del backend (/api/...) lo descarga
 * como Blob usando fetch() con el JWT en el header Authorization, y usa
 * URL.createObjectURL() como fuente del elemento <audio>.
 * Esto resuelve el problema de CORS/redirecciones de Google Drive.
 */
import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';

interface VoiceNotePlayerProps {
  src: string;
  isOwn: boolean; // true = mensaje propio (burbuja verde), false = recibido (burbuja blanca)
}

const BARS = 32;

function formatTime(secs: number): string {
  if (!secs || isNaN(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Genera alturas de barras pseudo-aleatorias con forma de campana (fallback) */
function makeBarHeights(n: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const x = i / (n - 1);
    const envelope = Math.sin(x * Math.PI) * 0.6 + 0.4; // 0.4–1.0
    const wiggle =
      Math.abs(Math.sin(i * 2.3 + 1.1)) * 0.35 +
      Math.abs(Math.sin(i * 5.7 + 0.4)) * 0.25 +
      0.4;
    return Math.min(1, Math.max(0.12, envelope * wiggle));
  });
}

/** Extrae amplitudes reales de audio usando Web Audio API */
async function extractWaveform(blobUrl: string, bars: number): Promise<number[]> {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return [];

    const audioCtx = new AudioCtx();
    const response = await fetch(blobUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();

    const channelData = audioBuffer.getChannelData(0);
    const samplesPerBar = Math.floor(channelData.length / bars);
    const heights: number[] = [];

    for (let i = 0; i < bars; i++) {
      let sum = 0;
      const start = i * samplesPerBar;
      for (let j = start; j < start + samplesPerBar; j++) {
        sum += Math.abs(channelData[j] ?? 0);
      }
      heights.push(sum / samplesPerBar);
    }

    // Normalize to 0.08–1.0
    const max = Math.max(...heights, 0.001);
    return heights.map(h => Math.max(0.08, Math.min(1, h / max)));
  } catch {
    return [];
  }
}

/** Extrae el access token JWT del localStorage (clave de Zustand persist) */
function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('mw-panel-auth');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({ src, isOwn }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  /** Real waveform heights from Web Audio API. null = use fallback fake bars. */
  const [waveformHeights, setWaveformHeights] = useState<number[] | null>(null);
  const [waveformLoading, setWaveformLoading] = useState(false);
  /** Drag/seek state */
  const isDraggingRef = useRef(false);
  const [dragProgress, setDragProgress] = useState<number | null>(null);

  const fallbackBarHeights = useMemo(() => makeBarHeights(BARS), []);
  const barHeights = waveformHeights ?? fallbackBarHeights;
  const displayProgress = dragProgress !== null ? dragProgress : (duration > 0 ? currentTime / duration : 0);

  // ── Fetch audio bytes from backend API (with JWT) ──────────────────
  useEffect(() => {
    if (!src.startsWith('/api/')) {
      setBlobUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    const fetchAudio = async () => {
      setLoading(true);
      setFetchError(false);
      setWaveformHeights(null);

      try {
        const token = getAccessToken();
        const headers: HeadersInit = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(src, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        if (cancelled) return;

        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAudio();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // When blobUrl is set, update the audio element src and extract real waveform
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (blobUrl) {
      a.src = blobUrl;
      a.load();
      // Extract real waveform asynchronously
      setWaveformLoading(true);
      extractWaveform(blobUrl, BARS).then(heights => {
        if (heights.length > 0) {
          setWaveformHeights(heights);
        }
        setWaveformLoading(false);
      });
    } else if (!src.startsWith('/api/')) {
      a.src = src;
      a.load();
      // For direct URLs, try to extract waveform directly
      setWaveformLoading(true);
      extractWaveform(src, BARS).then(heights => {
        if (heights.length > 0) {
          setWaveformHeights(heights);
        }
        setWaveformLoading(false);
      });
    }
  }, [blobUrl, src]);

  // ── Colores según burbuja ──────────────────────────────────
  const btn = isOwn
    ? { bg: 'rgba(255,255,255,0.22)', icon: '#ffffff' }
    : { bg: '#579172', icon: '#ffffff' };
  const barPlayed  = isOwn ? 'rgba(255,255,255,1)'    : '#579172';
  const barUnplayed = isOwn ? 'rgba(255,255,255,0.38)' : '#b8d9c6';
  const timeColor  = isOwn ? 'rgba(255,255,255,0.75)' : '#6b7280';

  // ── Handlers de audio ─────────────────────────────────────
  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (isPlaying) {
      a.pause();
    } else {
      setLoading(true);
      a.play().catch(() => setLoading(false));
    }
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleDurationChange = () => {
    const a = audioRef.current;
    if (a && isFinite(a.duration) && a.duration > 0) {
      setDuration(a.duration);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setLoading(false);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  // ── Seek helpers ──────────────────────────────────────────
  const seekToRatio = useCallback((clientX: number) => {
    const rect = waveRef.current?.getBoundingClientRect();
    if (!rect || !duration) return;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
    setDragProgress(ratio);
  }, [duration]);

  // ── Mouse seek (click + drag) ─────────────────────────────
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;
    e.preventDefault();
    isDraggingRef.current = true;
    seekToRatio(e.clientX);

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const rect = waveRef.current?.getBoundingClientRect();
      if (!rect || !duration) return;
      const ratio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const newTime = ratio * duration;
      if (audioRef.current) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
      setDragProgress(ratio);
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
      setDragProgress(null);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ── Touch seek ────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!duration) return;
    const touch = e.touches[0];
    if (!touch) return;
    isDraggingRef.current = true;
    seekToRatio(touch.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !duration) return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const rect = waveRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
    setDragProgress(ratio);
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    setDragProgress(null);
  };

  // ── Display time logic (WhatsApp style) ───────────────────
  // Show currentTime while playing or seeking; show duration when stopped at start
  const displayTime = (() => {
    if (duration <= 0) return '0:00';
    if (isPlaying) return formatTime(currentTime);
    if (currentTime > 0) return formatTime(currentTime);
    return formatTime(duration);
  })();

  // Determine the effective src for the audio element
  const audioSrc = src.startsWith('/api/') ? undefined : src;

  // Show spinner in button when loading initial fetch OR waveform extraction
  const showSpinner = loading || (waveformLoading && !isPlaying);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: 232,
        userSelect: 'none',
      }}
    >
      {/* Audio element (oculto) */}
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onLoadedMetadata={handleDurationChange}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
      />

      {/* Botón circular play/pause */}
      <button
        onClick={togglePlay}
        disabled={fetchError || (src.startsWith('/api/') && !blobUrl && loading)}
        style={{
          flexShrink: 0,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: 'none',
          cursor: fetchError ? 'not-allowed' : 'pointer',
          backgroundColor: btn.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          outline: 'none',
          transition: 'opacity 0.15s',
          opacity: fetchError ? 0.4 : 1,
        }}
        onMouseDown={e => !fetchError && (e.currentTarget.style.opacity = '0.75')}
        onMouseUp={e => !fetchError && (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = fetchError ? '0.4' : '1')}
      >
        {showSpinner ? (
          /* Spinner mini */
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="7" stroke={btn.icon} strokeWidth="2" strokeDasharray="30" strokeDashoffset="10" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 9 9" to="360 9 9" dur="0.8s" repeatCount="indefinite" />
            </circle>
          </svg>
        ) : fetchError ? (
          /* Error icon */
          <svg width="16" height="16" viewBox="0 0 16 16" fill={btn.icon}>
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 11a1 1 0 110-2 1 1 0 010 2zm1-4H7V4h2v4z"/>
          </svg>
        ) : isPlaying ? (
          /* Pause */
          <svg width="16" height="16" viewBox="0 0 16 16" fill={btn.icon}>
            <rect x="3" y="2" width="4" height="12" rx="1.5" />
            <rect x="9" y="2" width="4" height="12" rx="1.5" />
          </svg>
        ) : (
          /* Play (desplazado 1px a la derecha para centrado visual) */
          <svg width="16" height="16" viewBox="0 0 16 16" fill={btn.icon} style={{ marginLeft: 2 }}>
            <path d="M4 2.5L13 8L4 13.5V2.5Z" />
          </svg>
        )}
      </button>

      {/* Forma de onda + tiempo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Barras + scrubber */}
        <div
          ref={waveRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: 28,
            cursor: duration > 0 ? (isDraggingRef.current ? 'ew-resize' : 'pointer') : 'default',
            touchAction: 'none',
          }}
        >
          {barHeights.map((h, i) => {
            const played = i / BARS <= displayProgress;
            return (
              <div
                key={i}
                style={{
                  width: 2.5,
                  height: `${Math.round(h * 100)}%`,
                  minHeight: 3,
                  borderRadius: 2,
                  backgroundColor: played ? barPlayed : barUnplayed,
                  flexShrink: 0,
                  transition: 'background-color 0.05s',
                }}
              />
            );
          })}

          {/* Scrubber line shown while dragging */}
          {dragProgress !== null && duration > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: `calc(${dragProgress * 100}% - 1px)`,
                width: 2,
                backgroundColor: isOwn ? 'rgba(255,255,255,0.9)' : '#3a6b52',
                borderRadius: 1,
                pointerEvents: 'none',
              }}
            />
          )}
        </div>

        {/* Tiempo */}
        <span
          style={{
            fontSize: 11,
            lineHeight: 1,
            color: timeColor,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {fetchError ? 'Error' : displayTime}
        </span>
      </div>
    </div>
  );
};

export default VoiceNotePlayer;
