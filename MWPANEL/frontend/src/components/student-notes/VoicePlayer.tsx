import React, { useState, useRef, useEffect } from 'react';
import { Button, Progress, Typography, Space, Slider, Tooltip, message } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined,
  DownloadOutlined,
  CustomerServiceOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text: AntText } = Typography;

interface VoicePlayerProps {
  audioUrl: string;
  fileName?: string;
  duration?: number;
  onDownload?: () => void;
  className?: string;
  compact?: boolean;
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
  audioUrl,
  fileName = 'audio',
  duration: propDuration,
  onDownload,
  className = '',
  compact = false
}) => {
  // 🔧 FIXED: Usar mismo método de auth que AuthenticatedSharedImageViewer
  const getAccessToken = () => {
    let token = null;
    const authData = localStorage.getItem('mw-panel-auth');
    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        token = state.accessToken;
      } catch (error) {
        console.warn('🎵 Failed to parse auth data:', error);
      }
    }
    return token;
  };
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: propDuration || 0,
    volume: 75,
    isLoading: true,
    error: null
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Validar que tenemos una URL válida
    if (!audioUrl || typeof audioUrl !== 'string') {
      setState(prev => ({
        ...prev,
        error: 'URL de audio no válida',
        isLoading: false
      }));
      return;
    }

    // Validar formato de URL
    try {
      new URL(audioUrl);
    } catch (e) {
      setState(prev => ({
        ...prev,
        error: 'Formato de URL de audio inválido',
        isLoading: false
      }));
      return;
    }

    // Log para debugging
    console.log('🎵 VoicePlayer: Intentando cargar audio desde:', audioUrl);

    const audio = new Audio();
    audioRef.current = audio;

    // Event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('loadstart', () => {
      console.log('🎵 Audio: Iniciando carga...');
    });
    audio.addEventListener('loadend', () => {
      console.log('🎵 Audio: Carga completada');
    });

    // Set initial volume
    audio.volume = state.volume / 100;

    // Para endpoints del backend, necesitamos incluir el token JWT
    if (audioUrl.includes('/api/student-notes/') && audioUrl.includes('/stream')) {
      const accessToken = getAccessToken();

      if (accessToken) {
        // Para streaming con autenticación, necesitamos usar fetch y crear un blob URL
        console.log('🎵 Realizando fetch autenticado a:', audioUrl);
        fetch(audioUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        })
        .then(response => {
          console.log('🎵 Response status:', response.status, 'OK:', response.ok);
          if (!response.ok) {
            if (response.status === 401) {
              // Token expirado o inválido - limpiar localStorage y redirigir al login
              console.warn('🎵 Token expirado - limpiando sesión...');
              localStorage.removeItem('mw-panel-auth');
              window.location.href = '/login';
              return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.blob();
        })
        .then(blob => {
          console.log('🎵 Blob recibido, size:', blob.size, 'type:', blob.type);
          const blobUrl = URL.createObjectURL(blob);
          audio.src = blobUrl;
          console.log('🎵 Audio: Blob URL creada desde backend stream:', blobUrl);
        })
        .catch(fetchError => {
          console.error('🎵 Error al obtener stream autenticado:', fetchError);
          setState(prev => ({
            ...prev,
            error: `Error de autenticación: ${fetchError.message}`,
            isLoading: false
          }));
        });
      } else {
        console.error('🎵 No hay token JWT disponible para streaming autenticado');
        setState(prev => ({
          ...prev,
          error: 'No se encontró token de autenticación',
          isLoading: false
        }));
      }
    } else {
      // Para URLs externas normales
      audio.crossOrigin = 'anonymous';
      audio.src = audioUrl;
    }

    return () => {
      if (progressRef.current) {
        clearInterval(progressRef.current);
      }
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.pause();
      
      // Limpiar blob URLs si las creamos
      if (audio.src && audio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audio.src);
        console.log('🎵 Blob URL limpiada');
      }
    };
  }, [audioUrl]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setState(prev => ({
        ...prev,
        duration: audioRef.current!.duration,
        isLoading: false
      }));
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setState(prev => ({
        ...prev,
        currentTime: audioRef.current!.currentTime
      }));
    }
  };

  const handleEnded = () => {
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0
    }));
    
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleError = (e: Event) => {
    try {
      console.log('🎵 handleError called with event:', e);
      
      const audio = e.target as HTMLAudioElement;
      console.log('🎵 Audio element:', audio);
      
      const error = audio?.error;
      console.log('🎵 Audio error object:', error);
      
      let errorMessage = 'Error al cargar el audio';
      let detailedError = 'Error desconocido';
      
      // Verificar que tanto audio como error existen y que error tiene la propiedad code
      if (error && error !== null && typeof error.code === 'number') {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            detailedError = 'Carga de audio abortada';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            detailedError = 'Error de red al cargar audio';
            errorMessage = 'Error de conexión - verifica tu internet';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            detailedError = 'Error al decodificar audio';
            errorMessage = 'Formato de audio no compatible';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            detailedError = 'Formato de audio no soportado';
            errorMessage = 'Este formato de audio no es compatible';
            break;
          default:
            detailedError = `Error code: ${error.code}`;
        }
      } else {
        // Si no hay error específico, usar información del evento
        detailedError = 'Error al cargar audio - verifique el archivo o conexión';
        if (audio && audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
          errorMessage = 'Fuente de audio no encontrada';
          detailedError = 'La URL del audio no es válida o no está disponible';
        }
      }
      
      console.error('🎵 Audio error:', detailedError, 'URL:', audioUrl, 'Event:', e, 'Audio error object:', error);
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
        isPlaying: false
      }));
      
      message.error(`Error al cargar la nota de voz: ${detailedError}`);
    } catch (handlerError) {
      console.error('🚨 Error in handleError function:', handlerError);
      setState(prev => ({
        ...prev,
        error: 'Error interno del reproductor',
        isLoading: false,
        isPlaying: false
      }));
    }
  };

  const handleCanPlay = () => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      error: null
    }));
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (state.isPlaying) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      audioRef.current.play()
        .then(() => {
          setState(prev => ({ ...prev, isPlaying: true }));
        })
        .catch((playError) => {
          console.error('Play error:', playError);
          message.error('Error al reproducir la nota de voz');
        });
    }
  };

  const handleSeek = (value: number) => {
    if (audioRef.current) {
      const newTime = (value / 100) * state.duration;
      audioRef.current.currentTime = newTime;
      setState(prev => ({ ...prev, currentTime: newTime }));
    }
  };

  const handleVolumeChange = (value: number) => {
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
      setState(prev => ({ ...prev, volume: value }));
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (): number => {
    if (state.duration === 0) return 0;
    return (state.currentTime / state.duration) * 100;
  };

  const downloadAudio = () => {
    if (onDownload) {
      onDownload();
    } else {
      // Crear enlace de descarga directo
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = `${fileName}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Descarga iniciada');
    }
  };

  if (state.error) {
    return (
      <div className={`voice-player-error ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <AntText type="danger">❌ {state.error}</AntText>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`voice-player-compact ${className}`}>
        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Button
            type="primary"
            shape="circle"
            icon={state.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={togglePlay}
            loading={state.isLoading}
            size="small"
          />
          
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>🎵 Nota de voz</span>
              <span>{formatTime(state.duration)}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>

          {onDownload && (
            <Tooltip title="Descargar">
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={downloadAudio}
              />
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`voice-player ${className}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CustomerServiceOutlined className="text-blue-500 text-lg" />
            <AntText strong className="text-gray-800">Nota de Voz</AntText>
          </div>
          
          {onDownload && (
            <Tooltip title="Descargar audio">
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadAudio}
                size="small"
                type="text"
              />
            </Tooltip>
          )}
        </div>

        {/* Main controls */}
        <div className="flex items-center space-x-4 mb-4">
          <Button
            type="primary"
            shape="circle"
            icon={state.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={togglePlay}
            loading={state.isLoading}
            size="large"
          />

          <div className="flex-1">
            {/* Time display */}
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>{formatTime(state.currentTime)}</span>
              <span>{formatTime(state.duration)}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full">
              <Slider
                value={getProgress()}
                onChange={handleSeek}
                tooltip={{ 
                  formatter: (value) => formatTime((value! / 100) * state.duration),
                  placement: 'top'
                }}
                className="mb-0"
                trackStyle={{ backgroundColor: '#3b82f6' }}
                handleStyle={{ borderColor: '#3b82f6' }}
              />
            </div>
          </div>
        </div>

        {/* Volume control */}
        <div className="flex items-center space-x-3">
          <SoundOutlined className="text-gray-500" />
          <div className="flex-1 max-w-32">
            <Slider
              value={state.volume}
              onChange={handleVolumeChange}
              tooltip={{ 
                formatter: (value) => `${value}%`,
                placement: 'top'
              }}
              className="mb-0"
              trackStyle={{ backgroundColor: '#6b7280' }}
              handleStyle={{ borderColor: '#6b7280' }}
            />
          </div>
          <AntText type="secondary" className="text-xs min-w-fit">
            {state.volume}%
          </AntText>
        </div>

        {/* File info */}
        {fileName && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <AntText type="secondary" className="text-xs">
              📁 {fileName} • {formatTime(state.duration)}
            </AntText>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VoicePlayer;