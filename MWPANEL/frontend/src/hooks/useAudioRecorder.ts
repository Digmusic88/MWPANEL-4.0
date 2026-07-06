/**
 * @archivo: useAudioRecorder.ts
 * @módulo: Hooks
 * @función: Hook para grabación de audio con MediaRecorder API
 */

import { useState, useRef, useCallback } from 'react';

export type RecorderState = 'idle' | 'recording' | 'locked' | 'error';

interface UseAudioRecorderReturn {
  state: RecorderState;
  duration: number;
  error: string | null;
  startRecording: () => Promise<boolean>;
  stopAndGetBlob: () => Promise<{ blob: Blob; mimeType: string } | null>;
  lockRecording: () => void;
  cancelRecording: () => void;
  resetRecorder: () => void;
}

// MIME preferido según soporte del navegador
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const resolveStopRef = useRef<((result: { blob: Blob; mimeType: string } | null) => void) | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const releaseWakeLock = useCallback(() => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    releaseWakeLock();
  }, [releaseWakeLock]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalMime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalMime });
        chunksRef.current = [];
        cleanup();
        if (resolveStopRef.current) {
          resolveStopRef.current(blob.size > 0 ? { blob, mimeType: finalMime } : null);
          resolveStopRef.current = null;
        } else {
          // El navegador detuvo el grabador por su cuenta (stream terminado, etc.)
          // Resetear estado para que la UI no quede bloqueada en 'locked'
          setState('idle');
        }
      };

      mediaRecorder.start(200);
      startTimeRef.current = Date.now();
      setDuration(0);
      setState('recording');

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      // Mantener pantalla encendida durante la grabación (Wake Lock API)
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch {
          // Wake Lock no disponible en este contexto (no HTTPS o sin soporte) — no es crítico
        }
      }

      return true;
    } catch (err: unknown) {
      const e = err as { name?: string };
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError('Permiso de micrófono denegado. Actívalo en la configuración del navegador.');
      } else if (e.name === 'NotFoundError') {
        setError('No se encontró ningún micrófono.');
      } else {
        setError('No se pudo acceder al micrófono.');
      }
      setState('error');
      return false;
    }
  }, [cleanup]);

  const stopAndGetBlob = useCallback((): Promise<{ blob: Blob; mimeType: string } | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;

      // MediaRecorder ya está inactivo (el navegador detuvo el stream por su cuenta)
      // Intentar recuperar los datos grabados hasta ahora
      if (!mr || mr.state === 'inactive') {
        cleanup();
        setState('idle');
        if (chunksRef.current.length > 0) {
          const mimeType = (mr && mr.mimeType) ? mr.mimeType : (getSupportedMimeType() || 'audio/webm');
          const blob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];
          resolve(blob.size > 0 ? { blob, mimeType } : null);
        } else {
          resolve(null);
        }
        return;
      }

      resolveStopRef.current = resolve;
      mr.stop();
      setState('idle');
    });
  }, [cleanup]);

  const lockRecording = useCallback(() => {
    setState('locked');
  }, []);

  const cancelRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      // Ignorar el resultado del stop
      resolveStopRef.current = () => {};
      mr.stop();
    }
    cleanup();
    chunksRef.current = [];
    setState('idle');
    setDuration(0);
  }, [cleanup]);

  const resetRecorder = useCallback(() => {
    cleanup();
    setState('idle');
    setDuration(0);
    setError(null);
    chunksRef.current = [];
    mediaRecorderRef.current = null;
  }, [cleanup]);

  return {
    state,
    duration,
    error,
    startRecording,
    stopAndGetBlob,
    lockRecording,
    cancelRecording,
    resetRecorder,
  };
}
