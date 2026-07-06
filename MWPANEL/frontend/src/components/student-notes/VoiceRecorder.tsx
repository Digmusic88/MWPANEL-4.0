import React, { useState, useRef, useEffect } from 'react';
import { Button, Progress, Typography, Space, Alert, Tooltip, message } from 'antd';
import {
  AudioOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  DeleteOutlined,
  SaveOutlined,
  MicrophoneIcon
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Text: AntText } = Typography;

interface VoiceRecorderProps {
  onSave: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  maxDuration?: number; // en segundos
  className?: string;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSave,
  onCancel,
  maxDuration = 300, // 5 minutos máximo
  className = ''
}) => {
  const [state, setState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
  });

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [volume, setVolume] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const volumeRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Verificar permisos de micrófono al montar
    checkMicrophonePermission();
    
    return () => {
      // Cleanup
      if (timerRef.current) clearInterval(timerRef.current);
      if (volumeRef.current) clearInterval(volumeRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
      }
    };
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setPermissionGranted(true);
      stream.getTracks().forEach(track => track.stop()); // Cerrar inmediatamente
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setPermissionGranted(false);
      message.error('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      // Setup volume analysis
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setState(prev => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
          isPaused: false,
          duration: prev.currentTime
        }));
      };

      mediaRecorder.start(1000); // Collect data every second
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        currentTime: 0
      }));

      // Start timer
      timerRef.current = setInterval(() => {
        setState(prev => {
          const newTime = prev.currentTime + 1;
          
          // Auto-stop at max duration
          if (newTime >= maxDuration) {
            stopRecording();
            return prev;
          }
          
          return { ...prev, currentTime: newTime };
        });
      }, 1000);

      // Start volume monitoring
      startVolumeMonitoring();
      
      message.success('Grabación iniciada');
    } catch (error) {
      console.error('Error starting recording:', error);
      message.error('Error al iniciar la grabación');
      setPermissionGranted(false);
    }
  };

  const startVolumeMonitoring = () => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateVolume = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedVolume = (average / 255) * 100;
      
      setVolume(normalizedVolume);
    };
    
    volumeRef.current = setInterval(updateVolume, 100);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true }));
      if (timerRef.current) clearInterval(timerRef.current);
      if (volumeRef.current) clearInterval(volumeRef.current);
      setVolume(0);
      message.info('Grabación pausada');
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false }));
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setState(prev => {
          const newTime = prev.currentTime + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            return prev;
          }
          return { ...prev, currentTime: newTime };
        });
      }, 1000);
      
      startVolumeMonitoring();
      message.success('Grabación reanudada');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (timerRef.current) clearInterval(timerRef.current);
      if (volumeRef.current) clearInterval(volumeRef.current);
      setVolume(0);
      
      message.success('Grabación finalizada');
    }
  };

  const playRecording = () => {
    if (state.audioUrl && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const deleteRecording = () => {
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
    
    setState({
      isRecording: false,
      isPaused: false,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
    });
    
    chunksRef.current = [];
    message.info('Grabación eliminada');
  };

  const saveRecording = () => {
    if (state.audioBlob && state.duration > 0) {
      onSave(state.audioBlob, state.duration);
      message.success('Nota de voz guardada');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVolumeColor = (volume: number): string => {
    if (volume < 20) return '#52c41a'; // Verde
    if (volume < 60) return '#faad14'; // Amarillo
    return '#ff4d4f'; // Rojo
  };

  if (permissionGranted === false) {
    return (
      <Alert
        message="Permisos de micrófono requeridos"
        description="Para grabar notas de voz, necesitas permitir el acceso al micrófono en tu navegador."
        type="warning"
        action={
          <Button size="small" onClick={checkMicrophonePermission}>
            Reintentar
          </Button>
        }
        className={className}
      />
    );
  }

  return (
    <div className={`voice-recorder ${className}`}>
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            📱 Grabador de Voz
          </h3>
          <AntText type="secondary">
            Graba notas de voz para tus apuntes (máximo {Math.floor(maxDuration / 60)} minutos)
          </AntText>
        </div>

        {/* Visualizador de tiempo */}
        <div className="text-center mb-6">
          <div className="text-3xl font-mono font-bold text-gray-800 mb-2">
            {formatTime(state.currentTime)}
          </div>
          
          {maxDuration > 0 && (
            <div className="w-full mb-4">
              <Progress
                percent={(state.currentTime / maxDuration) * 100}
                showInfo={false}
                strokeColor={{
                  '0%': '#52c41a',
                  '70%': '#faad14',
                  '90%': '#ff4d4f',
                }}
                className="mb-2"
              />
              <AntText type="secondary" style={{ fontSize: '12px' }}>
                {formatTime(maxDuration - state.currentTime)} restantes
              </AntText>
            </div>
          )}
        </div>

        {/* Visualizador de volumen durante grabación */}
        <AnimatePresence>
          {state.isRecording && !state.isPaused && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="text-center mb-6"
            >
              <div className="flex items-center justify-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <AntText type="danger" className="font-medium">GRABANDO</AntText>
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className="h-2 rounded-full transition-all duration-100"
                  style={{
                    width: `${Math.min(volume, 100)}%`,
                    backgroundColor: getVolumeColor(volume)
                  }}
                />
              </div>
              <AntText type="secondary" style={{ fontSize: '12px' }}>
                Nivel de audio: {Math.round(volume)}%
              </AntText>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controles principales */}
        <div className="flex justify-center space-x-4 mb-6">
          {!state.isRecording && !state.audioBlob && (
            <Tooltip title="Iniciar grabación">
              <Button
                type="primary"
                size="large"
                icon={<AudioOutlined />}
                onClick={startRecording}
                className="bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600"
              >
                Grabar
              </Button>
            </Tooltip>
          )}

          {state.isRecording && !state.isPaused && (
            <>
              <Tooltip title="Pausar grabación">
                <Button
                  size="large"
                  icon={<PauseCircleOutlined />}
                  onClick={pauseRecording}
                />
              </Tooltip>
              <Tooltip title="Finalizar grabación">
                <Button
                  size="large"
                  icon={<StopOutlined />}
                  onClick={stopRecording}
                  type="primary"
                />
              </Tooltip>
            </>
          )}

          {state.isRecording && state.isPaused && (
            <>
              <Tooltip title="Continuar grabación">
                <Button
                  size="large"
                  icon={<AudioOutlined />}
                  onClick={resumeRecording}
                  type="primary"
                  className="bg-red-500 hover:bg-red-600 border-red-500 hover:border-red-600"
                />
              </Tooltip>
              <Tooltip title="Finalizar grabación">
                <Button
                  size="large"
                  icon={<StopOutlined />}
                  onClick={stopRecording}
                />
              </Tooltip>
            </>
          )}
        </div>

        {/* Controles de reproducción y guardado */}
        {state.audioBlob && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t pt-6"
          >
            <div className="text-center mb-4">
              <AntText type="success" className="font-medium">
                ✅ Grabación completada ({formatTime(state.duration)})
              </AntText>
            </div>

            <div className="flex justify-center space-x-3 mb-4">
              <Tooltip title={state.isPlaying ? "Pausar reproducción" : "Reproducir grabación"}>
                <Button
                  icon={state.isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={state.isPlaying ? pausePlayback : playRecording}
                  size="large"
                />
              </Tooltip>
              
              <Tooltip title="Eliminar grabación">
                <Button
                  icon={<DeleteOutlined />}
                  onClick={deleteRecording}
                  danger
                  size="large"
                />
              </Tooltip>
              
              <Tooltip title="Guardar como nota de voz">
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={saveRecording}
                  size="large"
                />
              </Tooltip>
            </div>

            {onCancel && (
              <div className="text-center">
                <Button onClick={onCancel}>
                  Cancelar
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* Audio element para reproducción */}
        {state.audioUrl && (
          <audio
            ref={audioRef}
            src={state.audioUrl}
            onEnded={() => setState(prev => ({ ...prev, isPlaying: false }))}
            style={{ display: 'none' }}
          />
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;