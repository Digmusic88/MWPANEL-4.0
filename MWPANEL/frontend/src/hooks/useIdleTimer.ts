import { useState, useEffect, useRef, useCallback } from 'react';

interface UseIdleTimerOptions {
  timeout: number; // Tiempo en milisegundos
  onIdle: () => void; // Función a ejecutar cuando el usuario esté inactivo
  onActive?: () => void; // Función a ejecutar cuando el usuario se vuelva activo
  onWarning?: () => void; // Función a ejecutar para advertencia antes del logout
  warningTime?: number; // Tiempo de advertencia antes del logout (en ms)
  events?: string[]; // Eventos a escuchar para detectar actividad
  enabled?: boolean; // Si el timer está habilitado
}

/**
 * Hook personalizado para detectar inactividad del usuario
 * Implementa auto-logout después de un período de inactividad
 */
export const useIdleTimer = ({
  timeout,
  onIdle,
  onActive,
  onWarning,
  warningTime = 30 * 1000, // 30 segundos de advertencia por defecto
  events = [
    'mousedown',
    'keypress',
    'scroll',
    'touchstart',
    'click',
    'keydown'
  ],
  enabled = true
}: UseIdleTimerOptions) => {
  const [isIdle, setIsIdle] = useState(false);
  const [isWarning, setIsWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(timeout);

  // Refs para los timers
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Refs para callbacks (evitar recrear funciones)
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);
  const onWarningRef = useRef(onWarning);

  // Actualizar refs de callbacks
  useEffect(() => { onIdleRef.current = onIdle; }, [onIdle]);
  useEffect(() => { onActiveRef.current = onActive; }, [onActive]);
  useEffect(() => { onWarningRef.current = onWarning; }, [onWarning]);

  // Limpiar todos los timers
  const clearAllTimers = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  // Formatear tiempo restante
  const formatTime = useCallback((ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Función para reiniciar el timer
  const resetTimer = useCallback(() => {
    if (!enabled) return;

    // Limpiar timers anteriores
    clearAllTimers();

    // Actualizar tiempo de última actividad
    lastActivityRef.current = Date.now();
    setRemainingTime(timeout);

    // Si estaba en warning o idle, volver a activo
    if (isWarning || isIdle) {
      setIsWarning(false);
      setIsIdle(false);
      onActiveRef.current?.();
    }

    const warningDelay = Math.max(0, timeout - warningTime);

    // Timer para mostrar advertencia
    warningTimeoutRef.current = setTimeout(() => {
      console.log('⚠️ Warning triggered!');
      setIsWarning(true);
      onWarningRef.current?.();
    }, warningDelay);

    // Timer principal para logout
    idleTimeoutRef.current = setTimeout(() => {
      console.log('🚪 Idle timeout - logging out!');
      setIsIdle(true);
      setIsWarning(false);
      clearAllTimers();
      onIdleRef.current();
    }, timeout);

    // Countdown para mostrar tiempo restante (solo actualiza cada 5 segundos para evitar spam)
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, timeout - elapsed);
      setRemainingTime(remaining);
    }, 5000);

  }, [enabled, timeout, warningTime, isWarning, isIdle, clearAllTimers]);

  // Efecto principal - configurar event listeners
  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      setIsIdle(false);
      setIsWarning(false);
      return;
    }

    console.log('🔧 useIdleTimer initialized:', { timeout: timeout/1000 + 's', warningTime: warningTime/1000 + 's', enabled });

    // Handler para actividad del usuario
    const handleActivity = () => {
      // Solo resetear si realmente hubo inactividad significativa (más de 1 segundo)
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity > 1000) {
        lastActivityRef.current = Date.now();

        // Solo limpiar y reiniciar timers, no loguear cada evento
        clearAllTimers();
        setRemainingTime(timeout);

        if (isWarning || isIdle) {
          setIsWarning(false);
          setIsIdle(false);
          onActiveRef.current?.();
        }

        const warningDelay = Math.max(0, timeout - warningTime);

        warningTimeoutRef.current = setTimeout(() => {
          console.log('⚠️ Warning triggered!');
          setIsWarning(true);
          onWarningRef.current?.();
        }, warningDelay);

        idleTimeoutRef.current = setTimeout(() => {
          console.log('🚪 Idle timeout - logging out!');
          setIsIdle(true);
          setIsWarning(false);
          clearAllTimers();
          onIdleRef.current();
        }, timeout);
      }
    };

    // Inicializar timers
    lastActivityRef.current = Date.now();
    const warningDelay = Math.max(0, timeout - warningTime);

    warningTimeoutRef.current = setTimeout(() => {
      console.log('⚠️ Warning triggered!');
      setIsWarning(true);
      onWarningRef.current?.();
    }, warningDelay);

    idleTimeoutRef.current = setTimeout(() => {
      console.log('🚪 Idle timeout - logging out!');
      setIsIdle(true);
      setIsWarning(false);
      clearAllTimers();
      onIdleRef.current();
    }, timeout);

    // Countdown cada 5 segundos
    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, timeout - elapsed);
      setRemainingTime(remaining);
    }, 5000);

    // Agregar event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      clearAllTimers();
    };
  }, [enabled, timeout, warningTime]); // Solo dependencias estables

  // Funciones de control
  const pause = useCallback(() => {
    clearAllTimers();
  }, [clearAllTimers]);

  const resume = useCallback(() => {
    if (enabled && !isIdle) {
      resetTimer();
    }
  }, [enabled, isIdle, resetTimer]);

  const restart = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  return {
    isIdle,
    isWarning,
    remainingTime,
    formattedTime: formatTime(remainingTime),
    warningTimeFormatted: formatTime(Math.max(0, remainingTime)),
    pause,
    resume,
    restart,
    isEnabled: enabled
  };
};

export default useIdleTimer;
