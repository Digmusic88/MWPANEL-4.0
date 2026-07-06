import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Tooltip, message as antMessage } from 'antd';
import { AudioOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';

// ─── CSS animations (injected once into <head>) ───────────────────────────────

const VOICE_CSS = `
@keyframes vrPulseDot {
  0%, 100% { transform: scale(1);    opacity: 1;   }
  50%       { transform: scale(1.45); opacity: 0.65; }
}
@keyframes vrBarAnim {
  0%, 100% { height: 3px;  }
  50%       { height: 22px; }
}
@keyframes vrSlideIn {
  from { opacity: 0; transform: translateX(14px); }
  to   { opacity: 1; transform: translateX(0);    }
}
@keyframes vrMicPop {
  0%   { transform: scale(1);    }
  40%  { transform: scale(1.18); }
  100% { transform: scale(1);    }
}
.vr-mic-idle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: background-color 0.15s;
}
.vr-mic-idle:hover:not(:disabled) {
  background-color: #f0faf4;
}
.vr-mic-idle:active:not(:disabled) {
  animation: vrMicPop 0.18s ease-out;
}
.vr-mic-idle:disabled {
  cursor: not-allowed;
}
.vr-recording-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  padding: 6px 8px;
  border-radius: 12px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  animation: vrSlideIn 0.22s ease-out;
  min-width: 0;
  overflow: hidden;
}
.vr-pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ef4444;
  flex-shrink: 0;
  animation: vrPulseDot 0.8s ease-in-out infinite;
}
`;

let cssInjected = false;
function ensureStyles() {
  if (cssInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = VOICE_CSS;
  document.head.appendChild(el);
  cssInjected = true;
}

// ─── Waveform (28 animated SVG bars) ─────────────────────────────────────────

const NUM_BARS = 28;
// Pre-compute animation delays so the bars animate out of phase naturally
const BAR_CONFIG = Array.from({ length: NUM_BARS }, (_, i) => ({
  delay: `${((i * 720) / NUM_BARS).toFixed(0)}ms`,
  duration: `${0.55 + (i % 5) * 0.07}s`,
}));

const Waveform: React.FC = React.memo(() => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '2px',
      height: '28px',
      flex: 1,
      maxWidth: '180px',
      overflow: 'hidden',
    }}
  >
    {BAR_CONFIG.map(({ delay, duration }, i) => (
      <div
        key={i}
        style={{
          width: '3px',
          height: '3px',
          borderRadius: '2px',
          backgroundColor: '#ef4444',
          animation: `vrBarAnim ${duration} ease-in-out infinite`,
          animationDelay: delay,
          alignSelf: 'center',
          flexShrink: 0,
        }}
      />
    ))}
  </div>
));
Waveform.displayName = 'Waveform';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDuration = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

function buildFile(blob: Blob, mimeType: string): File {
  const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm';
  return new File([blob], `nota-de-voz-${Date.now()}.${ext}`, { type: mimeType });
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface VoiceRecorderButtonProps {
  /** Called with the recorded File and its duration in seconds */
  onSend: (file: File, duration: number) => void;
  /** Notifies parent when recording starts / stops */
  onStateChange?: (isRecording: boolean) => void;
  disabled?: boolean;
}

const VoiceRecorderButton: React.FC<VoiceRecorderButtonProps> = ({
  onSend,
  onStateChange,
  disabled = false,
}) => {
  useEffect(() => { ensureStyles(); }, []);

  const {
    state,
    duration,
    error,
    startRecording,
    stopAndGetBlob,
    lockRecording,
    cancelRecording,
    resetRecorder,
  } = useAudioRecorder();

  // Keep stable refs so callbacks don't need to be re-created on every render
  const durationRef = useRef(0);
  const onSendRef = useRef(onSend);
  const stopRef = useRef(stopAndGetBlob);
  const cancelRef = useRef(cancelRecording);

  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { onSendRef.current = onSend; }, [onSend]);
  useEffect(() => { stopRef.current = stopAndGetBlob; }, [stopAndGetBlob]);
  useEffect(() => { cancelRef.current = cancelRecording; }, [cancelRecording]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state === 'recording' || state === 'locked');
  }, [state, onStateChange]);

  // Surface hook errors as Ant notifications
  useEffect(() => {
    if (error) {
      antMessage.error(error);
      resetRecorder();
    }
  }, [error, resetRecorder]);

  // "← cancelar" hint: visible 3 s after recording starts, then fades out
  const [showHint, setShowHint] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    if (disabled || state !== 'idle') return;
    const ok = await startRecording();
    if (ok) {
      lockRecording();           // auto-lock → no need to hold button
      setShowHint(true);
      hintTimer.current = setTimeout(() => setShowHint(false), 3000);
    }
  }, [disabled, state, startRecording, lockRecording]);

  const handleSend = useCallback(async () => {
    if (hintTimer.current) { clearTimeout(hintTimer.current); hintTimer.current = null; }
    setShowHint(false);
    const result = await stopRef.current();
    if (result && result.blob.size > 100) {
      onSendRef.current(buildFile(result.blob, result.mimeType), durationRef.current);
    }
  }, []);

  const handleCancel = useCallback(() => {
    if (hintTimer.current) { clearTimeout(hintTimer.current); hintTimer.current = null; }
    setShowHint(false);
    cancelRef.current();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const isActive = state === 'locked' || state === 'recording';

  if (isActive) {
    return (
      <div className="vr-recording-bar">
        {/* Cancel */}
        <Button
          type="text"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={handleCancel}
          style={{ flexShrink: 0, padding: '0 6px' }}
          title="Cancelar grabación"
        />

        {/* Pulse dot + timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <div className="vr-pulse-dot" />
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 600,
              color: '#ef4444',
              minWidth: '36px',
              userSelect: 'none',
            }}
          >
            {fmtDuration(duration)}
          </span>
        </div>

        {/* Animated waveform */}
        <Waveform />

        {/* Swipe-to-cancel hint (fades after 3 s) */}
        <span
          style={{
            fontSize: '11px',
            color: '#9ca3af',
            flexShrink: 0,
            opacity: showHint ? 1 : 0,
            transition: 'opacity 0.6s ease',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          ← cancelar
        </span>

        {/* Send */}
        <Button
          type="primary"
          size="small"
          icon={<CheckOutlined />}
          onClick={handleSend}
          style={{
            backgroundColor: '#579172',
            borderColor: '#579172',
            flexShrink: 0,
            padding: '0 8px',
          }}
          title="Enviar nota de voz"
        />
      </div>
    );
  }

  // IDLE — mic button
  return (
    <Tooltip title="Grabar nota de voz" placement="top">
      <button
        className="vr-mic-idle"
        type="button"
        disabled={disabled}
        onClick={handleStart}
        aria-label="Grabar nota de voz"
      >
        <AudioOutlined
          style={{
            fontSize: '18px',
            color: disabled ? '#d1d5db' : '#579172',
          }}
        />
      </button>
    </Tooltip>
  );
};

export default VoiceRecorderButton;
